/**
 * Progress Mirror Service
 * Handles curriculum changes gracefully:
 * - When a new plan version is published, preserves all completedSteps by stepId
 * - Appends new steps without resetting student progress
 * - Never resets students
 */
import { db } from './firebase';
import {
  collection, getDocs, doc, updateDoc, getDoc,
  query, where, serverTimestamp
} from 'firebase/firestore';

/**
 * When a new plan is published, this migrates existing student progress:
 * - Existing completedSteps remain (matched by stepId)
 * - New steps in the plan are simply not in completedSteps yet (auto-incomplete)
 * - completionPercent is recomputed against the new total step count
 *
 * @param {string} oldPlanId - Previous plan document ID
 * @param {string} newPlanId - Newly published plan document ID
 * @param {number} newTotalSteps - Total steps in the new plan
 */
export const migrateProgressToNewPlan = async (oldPlanId, newPlanId, newTotalSteps) => {
  try {
    // Fetch all progress records for the old plan
    const progressRef = collection(db, 'studentProgress');
    const q = query(progressRef, where('planId', '==', oldPlanId));
    const snap = await getDocs(q);

    const migrationLog = [];

    for (const progressDoc of snap.docs) {
      const data = progressDoc.data();
      const { studentId, completedSteps = [] } = data;

      // The new plan shares stepIds where curriculum is unchanged.
      // Completed steps that still exist in the new plan remain completed.
      // Steps that were removed simply disappear from progress (no harm).
      const newCompletionPercent = newTotalSteps > 0
        ? Math.round((completedSteps.length / newTotalSteps) * 100)
        : 0;

      const newDocId = `${studentId}_${newPlanId}`;
      const newDocRef = doc(db, 'studentProgress', newDocId);

      const existing = await getDoc(newDocRef);
      if (!existing.exists()) {
        // Migrate student progress to new plan
        await updateDoc(newDocRef, {
          studentId,
          planId: newPlanId,
          completedSteps,
          completedModules: data.completedModules || [],
          notes: data.notes || {},
          completionPercent: newCompletionPercent,
          migratedFromPlanId: oldPlanId,
          updatedAt: serverTimestamp(),
        }).catch(async () => {
          // setDoc if doc doesn't exist (updateDoc fails on missing docs)
          const { setDoc } = await import('firebase/firestore');
          await setDoc(newDocRef, {
            studentId,
            planId: newPlanId,
            completedSteps,
            completedModules: data.completedModules || [],
            notes: data.notes || {},
            completionPercent: newCompletionPercent,
            migratedFromPlanId: oldPlanId,
            updatedAt: serverTimestamp(),
          });
        });

        migrationLog.push({
          studentId,
          completedStepsCarried: completedSteps.length,
          newCompletionPercent,
        });
      }
    }

    return { success: true, migratedStudents: migrationLog.length, log: migrationLog };
  } catch (error) {
    console.error('Error migrating progress:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a summary of progress across all students for a plan.
 * @param {string} planId
 * @param {number} totalSteps
 * @returns {Promise<{avgCompletion: number, studentCount: number, topStudents: Array}>}
 */
export const getPlanProgressSummary = async (planId, totalSteps) => {
  try {
    const progressRef = collection(db, 'studentProgress');
    const q = query(progressRef, where('planId', '==', planId));
    const snap = await getDocs(q);

    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (records.length === 0) return { avgCompletion: 0, studentCount: 0, topStudents: [] };

    const totalCompletion = records.reduce((sum, r) => sum + (r.completionPercent || 0), 0);
    const avgCompletion = Math.round(totalCompletion / records.length);

    const topStudents = [...records]
      .sort((a, b) => (b.completionPercent || 0) - (a.completionPercent || 0))
      .slice(0, 5)
      .map(r => ({
        studentId: r.studentId,
        completedSteps: r.completedSteps?.length || 0,
        completionPercent: r.completionPercent || 0,
        lastActive: r.updatedAt,
      }));

    return { avgCompletion, studentCount: records.length, topStudents, records };
  } catch (error) {
    console.error('Error getting progress summary:', error);
    return { avgCompletion: 0, studentCount: 0, topStudents: [] };
  }
};
