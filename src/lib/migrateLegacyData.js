import { db } from './firebase';
import { doc, collection, getDocs, getDoc, setDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { createDiploma } from './diplomaService';
import { createModule } from './moduleService';
import { createLecture } from './lectureService';

const MIGRATION_LOG_ID = 'legacy_to_multi_diploma';
const DEFAULT_DIPLOMA_NAME = 'AI Mastery Group 2';
const DEFAULT_MODULE_NAME = 'Module 1 — Foundations';

/**
 * Check if migration has already been run
 */
export const isMigrationComplete = async () => {
  try {
    const migrationRef = doc(db, 'migrations', MIGRATION_LOG_ID);
    const migrationDoc = await getDoc(migrationRef);
    return migrationDoc.exists();
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Run the full legacy-to-multi-diploma migration.
 * This is IDEMPOTENT — safe to run multiple times.
 * It is ADDITIVE ONLY — never deletes or overwrites existing data.
 */
export const runMigration = async () => {
  try {
    // 1. Check if already migrated
    const alreadyDone = await isMigrationComplete();
    if (alreadyDone) {
      console.log('[Migration] Already completed. Skipping.');
      return { success: true, skipped: true, message: 'Migration already completed.' };
    }

    console.log('[Migration] Starting legacy-to-multi-diploma migration...');
    const stats = { studentsUpdated: 0, lecturesCreated: 0, evaluationsUpdated: 0, progressUpdated: 0, submissionsUpdated: 0, campaignsUpdated: 0 };

    // 2. Create default diploma
    const diplomaId = await createDiploma(DEFAULT_DIPLOMA_NAME, 'Default diploma migrated from legacy single-course platform.');
    if (!diplomaId) {
      throw new Error('Failed to create default diploma');
    }
    console.log(`[Migration] Created diploma: ${DEFAULT_DIPLOMA_NAME} (${diplomaId})`);

    // 3. Create default module under the diploma
    const moduleId = await createModule(diplomaId, DEFAULT_MODULE_NAME, 1);
    if (!moduleId) {
      throw new Error('Failed to create default module');
    }
    console.log(`[Migration] Created module: ${DEFAULT_MODULE_NAME} (${moduleId})`);

    // 4. Copy content/dashboard items into lectures collection
    const contentRef = doc(db, 'content', 'dashboard');
    const contentDoc = await getDoc(contentRef);
    
    if (contentDoc.exists()) {
      const content = contentDoc.data();
      const existingLectures = content.lectures || [];
      
      // Create a lecture doc for each existing lecture, bundling related content
      for (let i = 0; i < existingLectures.length; i++) {
        const lecture = existingLectures[i];
        const lectureId = await createLecture(diplomaId, moduleId, {
          title: lecture.title,
          description: lecture.description || '',
          url: lecture.url || '',
          duration: lecture.duration || '',
          date: lecture.date || '',
          order: i + 1,
          // Attach all existing content to each lecture initially
          // (Admin can reorganize later)
          materials: i === 0 ? (content.materials || []) : [],
          links: i === 0 ? (content.links || []) : [],
          tips: i === 0 ? (content.tips || []) : [],
          notes: i === 0 ? (content.notes || []) : [],
          homeworks: i === 0 ? (content.homeworks || []) : [],
        });
        if (lectureId) stats.lecturesCreated++;
      }

      // If there are no lectures but there IS content, create a placeholder lecture to hold the content
      if (existingLectures.length === 0 && (
        (content.materials && content.materials.length > 0) ||
        (content.links && content.links.length > 0) ||
        (content.tips && content.tips.length > 0) ||
        (content.notes && content.notes.length > 0) ||
        (content.homeworks && content.homeworks.length > 0)
      )) {
        const lectureId = await createLecture(diplomaId, moduleId, {
          title: 'Course Materials',
          description: 'Migrated materials from the legacy platform',
          order: 1,
          materials: content.materials || [],
          links: content.links || [],
          tips: content.tips || [],
          notes: content.notes || [],
          homeworks: content.homeworks || [],
        });
        if (lectureId) stats.lecturesCreated++;
      }
      
      console.log(`[Migration] Migrated ${stats.lecturesCreated} lectures`);
    }

    // 5. Update authorizedEmails to include classIds
    const emailsSnapshot = await getDocs(collection(db, 'authorizedEmails'));
    for (const emailDoc of emailsSnapshot.docs) {
      const data = emailDoc.data();
      if (!data.classIds) {
        await updateDoc(doc(db, 'authorizedEmails', emailDoc.id), {
          classIds: [diplomaId],
          migratedAt: new Date().toISOString()
        });
        stats.studentsUpdated++;
      }
    }
    console.log(`[Migration] Updated ${stats.studentsUpdated} students with classIds`);

    // 6. Update evaluations with diplomaId
    const evalsSnapshot = await getDocs(collection(db, 'evaluations'));
    for (const evalDoc of evalsSnapshot.docs) {
      const data = evalDoc.data();
      if (!data.diplomaId) {
        await updateDoc(doc(db, 'evaluations', evalDoc.id), {
          diplomaId: diplomaId,
          migratedAt: new Date().toISOString()
        });
        stats.evaluationsUpdated++;
      }
    }
    console.log(`[Migration] Updated ${stats.evaluationsUpdated} evaluations`);

    // 7. Update student_progress with diplomaId
    const progressSnapshot = await getDocs(collection(db, 'student_progress'));
    for (const progressDoc of progressSnapshot.docs) {
      const data = progressDoc.data();
      if (!data.diplomaId) {
        await updateDoc(doc(db, 'student_progress', progressDoc.id), {
          diplomaId: diplomaId,
          migratedAt: new Date().toISOString()
        });
        stats.progressUpdated++;
      }
    }
    console.log(`[Migration] Updated ${stats.progressUpdated} progress records`);

    // 8. Update submissions with diplomaId
    const subsSnapshot = await getDocs(collection(db, 'submissions'));
    for (const subDoc of subsSnapshot.docs) {
      const data = subDoc.data();
      if (!data.diplomaId) {
        await updateDoc(doc(db, 'submissions', subDoc.id), {
          diplomaId: diplomaId,
          migratedAt: new Date().toISOString()
        });
        stats.submissionsUpdated++;
      }
    }
    console.log(`[Migration] Updated ${stats.submissionsUpdated} submissions`);

    // 9. Update progress_campaigns with diplomaId
    const campaignsSnapshot = await getDocs(collection(db, 'progress_campaigns'));
    for (const campDoc of campaignsSnapshot.docs) {
      const data = campDoc.data();
      if (!data.diplomaId) {
        await updateDoc(doc(db, 'progress_campaigns', campDoc.id), {
          diplomaId: diplomaId,
          migratedAt: new Date().toISOString()
        });
        stats.campaignsUpdated++;
      }
    }
    console.log(`[Migration] Updated ${stats.campaignsUpdated} campaigns`);

    // 10. Write migration log
    await setDoc(doc(db, 'migrations', MIGRATION_LOG_ID), {
      completedAt: serverTimestamp(),
      defaultDiplomaId: diplomaId,
      defaultModuleId: moduleId,
      stats,
      version: '1.0'
    });

    console.log('[Migration] ✅ Migration completed successfully!', stats);
    return { success: true, skipped: false, diplomaId, moduleId, stats };

  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get the default diploma ID from the migration log
 */
export const getDefaultDiplomaId = async () => {
  try {
    const migrationRef = doc(db, 'migrations', MIGRATION_LOG_ID);
    const migrationDoc = await getDoc(migrationRef);
    if (migrationDoc.exists()) {
      return migrationDoc.data().defaultDiplomaId;
    }
    return null;
  } catch (error) {
    console.error('Error getting default diploma ID:', error);
    return null;
  }
};
