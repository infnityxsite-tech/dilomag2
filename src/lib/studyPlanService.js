/**
 * Study Plan Service
 * Manages studyPlans and studentProgress collections.
 * Additive-only: never deletes student progress.
 */
import { db } from './firebase';
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, limit,
  serverTimestamp, arrayUnion, arrayRemove
} from 'firebase/firestore';

// ──────────────────────────────────────────────────────────
// Study Plans
// ──────────────────────────────────────────────────────────

/**
 * Get the latest published study plan for a diploma.
 * Fetches all plans, sorts client-side (avoids composite index requirement).
 */
export const getStudyPlanForDiploma = async (diplomaId) => {
  try {
    const all = await getAllStudyPlansForDiploma(diplomaId);
    if (all.length === 0) return null;
    // getAllStudyPlansForDiploma already sorts by version desc
    return all[0];
  } catch (error) {
    console.error('Error getting study plan:', error);
    return null;
  }
};

/**
 * Get all study plans for a diploma (for version history).
 * No orderBy — sorts client-side to avoid composite index requirement.
 */
export const getAllStudyPlansForDiploma = async (diplomaId) => {
  try {
    const plansRef = collection(db, 'studyPlans');
    // Single-field where() — no composite index needed
    const q = query(plansRef, where('diplomaId', '==', diplomaId));
    const snap = await getDocs(q);
    const plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort client-side: newest version first
    return plans.sort((a, b) => (b.version || 0) - (a.version || 0));
  } catch (error) {
    console.error('Error getting study plans:', error);
    return [];
  }
};

/**
 * Save (publish) a new study plan to Firestore.
 * Auto-increments version number.
 */
export const saveStudyPlan = async (planData) => {
  try {
    // Find existing max version
    const existing = await getAllStudyPlansForDiploma(planData.diplomaId);
    const nextVersion = existing.length > 0 ? (existing[0].version || 1) + 1 : 1;

    const plansRef = collection(db, 'studyPlans');
    const docRef = await addDoc(plansRef, {
      ...planData,
      version: nextVersion,
      publishedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    });
    return { success: true, id: docRef.id, version: nextVersion };
  } catch (error) {
    console.error('Error saving study plan:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a specific study plan by ID.
 */
export const getStudyPlanById = async (planId) => {
  try {
    const snap = await getDoc(doc(db, 'studyPlans', planId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('Error getting study plan by ID:', error);
    return null;
  }
};

// ──────────────────────────────────────────────────────────
// Student Progress
// ──────────────────────────────────────────────────────────

const progressDocId = (studentId, planId) => `${studentId}_${planId}`;

/**
 * Get student progress for a specific plan.
 */
export const getStudentProgress = async (studentId, planId) => {
  try {
    const docRef = doc(db, 'studentProgress', progressDocId(studentId, planId));
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return {
        studentId,
        planId,
        completedSteps: [],
        completedModules: [],
        notes: {},
        completionPercent: 0,
        updatedAt: null,
      };
    }
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('Error getting student progress:', error);
    return null;
  }
};

/**
 * Get progress for ALL students on a plan (admin view).
 */
export const getAllProgressForPlan = async (planId) => {
  try {
    const progressRef = collection(db, 'studentProgress');
    const q = query(progressRef, where('planId', '==', planId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting all progress for plan:', error);
    return [];
  }
};

/**
 * Toggle a step as complete or incomplete for a student.
 * Uses setDoc with merge:true — works for both new and existing progress docs.
 */
export const toggleStepComplete = async (studentId, planId, stepId, totalSteps) => {
  try {
    const docRef = doc(db, 'studentProgress', progressDocId(studentId, planId));
    const snap = await getDoc(docRef);

    const currentCompleted = snap.exists() ? (snap.data().completedSteps || []) : [];
    const isCompleted = currentCompleted.includes(stepId);

    // Compute new completion percent
    const newCount = isCompleted ? currentCompleted.length - 1 : currentCompleted.length + 1;
    const newPercent = totalSteps > 0 ? Math.round((newCount / totalSteps) * 100) : 0;

    // setDoc with merge:true supports arrayUnion/arrayRemove on both new and existing docs
    const { setDoc: _setDoc } = await import('firebase/firestore');
    await _setDoc(docRef, {
      studentId,
      planId,
      completedSteps: isCompleted ? arrayRemove(stepId) : arrayUnion(stepId),
      completionPercent: newPercent,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true, isNowCompleted: !isCompleted };
  } catch (error) {
    console.error('Error toggling step:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Save a note for a specific module.
 */
export const saveModuleNote = async (studentId, planId, moduleId, noteText) => {
  try {
    const docRef = doc(db, 'studentProgress', progressDocId(studentId, planId));
    const { setDoc: _setDoc } = await import('firebase/firestore');
    await _setDoc(docRef, {
      studentId,
      planId,
      notes: { [moduleId]: noteText },
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error saving note:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete a specific study plan version by document ID.
 * NOTE: Student progress records (studentProgress collection) are NOT deleted.
 */
export const deleteStudyPlan = async (planId) => {
  try {
    await deleteDoc(doc(db, 'studyPlans', planId));
    return { success: true };
  } catch (error) {
    console.error('Error deleting study plan:', error);
    return { success: false, error: error.message };
  }
};
