import { db } from './firebase';
import {
  collection, getDocs, query, where, doc,
  updateDoc, addDoc, deleteDoc, serverTimestamp, writeBatch
} from 'firebase/firestore';
import organizeJson from '../../organize_v2.json';

// ── Strict exact match only ──
const findExact = (title, items, field = 'title') => {
  return items.find(i => i[field] === title) || null;
};
const findExactCI = (title, items, field = 'title') => {
  const exact = items.find(i => i[field] === title);
  if (exact) return exact;
  return items.find(i => i[field]?.toLowerCase() === title.toLowerCase()) || null;
};

/**
 * PHASE 0: Create a complete backup snapshot of all data for this diploma.
 * Returns the snapshot object (pure read).
 */
export const createBackupSnapshot = async () => {
  // Find diploma
  const diplomaSnap = await getDocs(collection(db, 'diplomas'));
  const allDiplomas = diplomaSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const diploma = findExactCI(organizeJson.program_name, allDiplomas, 'name');
  if (!diploma) return { success: false, error: `Diploma "${organizeJson.program_name}" not found` };

  const diplomaId = diploma.id;

  // Modules
  const modSnap = await getDocs(query(collection(db, 'modules'), where('diplomaId', '==', diplomaId)));
  const modules = modSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // ALL lectures (we need all to find references)
  const lectSnap = await getDocs(collection(db, 'lectures'));
  const allLectures = lectSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const diplomaLectures = allLectures.filter(l =>
    l.diplomaIds?.includes(diplomaId) || l.diplomaId === diplomaId || l.primaryDiplomaId === diplomaId
  );

  // ALL assets
  const assetSnap = await getDocs(collection(db, 'lectureAssets'));
  const allAssets = assetSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const diplomaAssets = allAssets.filter(a => a.diplomaIds?.includes(diplomaId));

  const snapshot = {
    timestamp: new Date().toISOString(),
    diplomaId,
    diplomaName: diploma.name,
    modules,
    lectures: diplomaLectures,
    allLectures,
    assets: diplomaAssets,
    allAssets,
    moduleCount: modules.length,
    lectureCount: diplomaLectures.length,
    assetCount: diplomaAssets.length,
  };

  return { success: true, snapshot };
};

/**
 * Build the complete 3-phase execution plan.
 * Returns { plan } with phase0/phase1/phase2 actions. No writes.
 */
export const buildHardResetPlan = async () => {
  const backupResult = await createBackupSnapshot();
  if (!backupResult.success) return backupResult;

  const { snapshot } = backupResult;
  const diplomaId = snapshot.diplomaId;

  const plan = {
    diplomaId,
    diplomaName: snapshot.diplomaName,
    backup: {
      moduleCount: snapshot.moduleCount,
      lectureCount: snapshot.lectureCount,
      assetCount: snapshot.assetCount,
    },
    phase1: {
      description: 'DELETE all existing modules for this diploma. CLEAR moduleIds from all lectures.',
      modulesToDelete: snapshot.modules.map(m => ({ id: m.id, name: m.name })),
      lecturesToClearModules: snapshot.lectures.filter(l => l.moduleIds?.length > 0 || l.moduleId).map(l => ({
        id: l.id, title: l.title,
        currentModuleIds: l.moduleIds || (l.moduleId ? [l.moduleId] : []),
      })),
      archivedToRestore: snapshot.allLectures.filter(l => l._archived).map(l => ({ id: l.id, title: l.title })),
    },
    phase2: {
      description: 'CREATE modules from organize_v2.json. ASSIGN lectures. LINK assets.',
      modulesToCreate: [],
      lectureAssignments: [],
      lecturesToCreate: [],
      materialLinks: [],
      homeworkLinks: [],
      missingMaterials: [],
      missingHomework: [],
    },
    stats: {
      phase1_modulesDelete: 0,
      phase1_lecturesClear: 0,
      phase1_archivedRestore: 0,
      phase2_modulesCreate: 0,
      phase2_lecturesAssign: 0,
      phase2_lecturesCreate: 0,
      phase2_materialsLink: 0,
      phase2_homeworkLink: 0,
      missingMaterials: 0,
      missingHomework: 0,
    },
  };

  // Phase 1 stats
  plan.stats.phase1_modulesDelete = plan.phase1.modulesToDelete.length;
  plan.stats.phase1_lecturesClear = plan.phase1.lecturesToClearModules.length;
  plan.stats.phase1_archivedRestore = plan.phase1.archivedToRestore.length;

  // Phase 2: Build from JSON
  for (let mi = 0; mi < organizeJson.modules.length; mi++) {
    const tMod = organizeJson.modules[mi];
    plan.phase2.modulesToCreate.push({ name: tMod.module_name, order: mi + 1 });
    plan.stats.phase2_modulesCreate++;

    for (let li = 0; li < tMod.lectures.length; li++) {
      const tLect = tMod.lectures[li];
      const order = li + 1;

      // Find lecture in ALL lectures (including archived)
      const dbLect = findExactCI(tLect.lecture, snapshot.allLectures, 'title');

      if (!dbLect) {
        plan.phase2.lecturesToCreate.push({
          title: tLect.lecture,
          moduleName: tMod.module_name, moduleIndex: mi, order
        });
        plan.stats.phase2_lecturesCreate++;
      } else {
        plan.phase2.lectureAssignments.push({
          lectureId: dbLect.id,
          lectureTitle: dbLect.title,
          moduleName: tMod.module_name, moduleIndex: mi, order,
          isArchived: !!dbLect._archived,
        });
        plan.stats.phase2_lecturesAssign++;

        // Materials
        for (const matTitle of (tLect.materials || [])) {
          const asset = findExactCI(matTitle, snapshot.allAssets, 'title');
          if (!asset) {
            plan.phase2.missingMaterials.push({ title: matTitle, forLecture: tLect.lecture });
            plan.stats.missingMaterials++;
          } else {
            plan.phase2.materialLinks.push({
              assetId: asset.id, assetTitle: asset.title,
              lectureId: dbLect.id, lectureTitle: dbLect.title,
            });
            plan.stats.phase2_materialsLink++;
          }
        }

        // Homework
        for (const hwTitle of (tLect.homework || [])) {
          const asset = findExactCI(hwTitle, snapshot.allAssets, 'title');
          if (!asset) {
            plan.phase2.missingHomework.push({ title: hwTitle, forLecture: tLect.lecture });
            plan.stats.missingHomework++;
          } else {
            plan.phase2.homeworkLinks.push({
              assetId: asset.id, assetTitle: asset.title,
              lectureId: dbLect.id, lectureTitle: dbLect.title,
            });
            plan.stats.phase2_homeworkLink++;
          }
        }
      }
    }
  }

  return { success: true, plan, snapshot };
};

/**
 * EXECUTE the hard reset plan. This performs actual Firestore writes.
 */
export const executeHardReset = async (plan) => {
  const log = [];
  const diplomaId = plan.diplomaId;

  try {
    // ════════════════════════════════════════════
    // PHASE 1: WIPE — Delete modules, clear lecture assignments, restore archived
    // ════════════════════════════════════════════
    log.push('═══ PHASE 1: WIPE ═══');

    // 1a. Restore archived lectures (remove _archived flag)
    for (const item of plan.phase1.archivedToRestore) {
      await updateDoc(doc(db, 'lectures', item.id), {
        _archived: false, _archivedReason: '', updatedAt: serverTimestamp()
      });
      log.push(`🔄 Restored archived lecture: "${item.title}"`);
    }

    // 1b. Clear moduleIds from ALL lectures for this diploma
    for (const item of plan.phase1.lecturesToClearModules) {
      await updateDoc(doc(db, 'lectures', item.id), {
        moduleIds: [], moduleId: '', primaryModuleId: '', order: 0,
        updatedAt: serverTimestamp()
      });
      log.push(`🧹 Cleared module assignment: "${item.title}"`);
    }

    // 1c. Delete ALL modules for this diploma
    for (const mod of plan.phase1.modulesToDelete) {
      await deleteDoc(doc(db, 'modules', mod.id));
      log.push(`🗑️ Deleted module: "${mod.name}" (${mod.id})`);
    }

    log.push(`✅ Phase 1 complete: ${plan.phase1.modulesToDelete.length} modules deleted, ${plan.phase1.lecturesToClearModules.length} lectures cleared`);

    // ════════════════════════════════════════════
    // PHASE 2: REBUILD — Create modules, assign lectures, link assets
    // ════════════════════════════════════════════
    log.push('═══ PHASE 2: REBUILD ═══');

    // 2a. Create all modules
    const createdModuleIds = [];
    for (const mod of plan.phase2.modulesToCreate) {
      const ref = await addDoc(collection(db, 'modules'), {
        name: mod.name, order: mod.order, diplomaId,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      createdModuleIds.push(ref.id);
      log.push(`📁 Created module: "${mod.name}" (order ${mod.order}) → ${ref.id}`);
    }

    // 2b. Create missing lectures
    const createdLectureMap = {};
    for (const lect of plan.phase2.lecturesToCreate) {
      const moduleId = createdModuleIds[lect.moduleIndex];
      const ref = await addDoc(collection(db, 'lectures'), {
        title: lect.title, order: lect.order,
        moduleIds: [moduleId], primaryModuleId: moduleId,
        diplomaIds: [diplomaId], primaryDiplomaId: diplomaId,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      });
      createdLectureMap[lect.title] = ref.id;
      log.push(`➕ Created lecture: "${lect.title}" → ${ref.id}`);
    }

    // 2c. Assign existing lectures to their correct modules
    for (const assign of plan.phase2.lectureAssignments) {
      const moduleId = createdModuleIds[assign.moduleIndex];
      const updates = {
        moduleIds: [moduleId],
        primaryModuleId: moduleId,
        diplomaIds: [diplomaId],
        primaryDiplomaId: diplomaId,
        order: assign.order,
        updatedAt: serverTimestamp(),
      };
      // Remove archived flag if present
      if (assign.isArchived) {
        updates._archived = false;
        updates._archivedReason = '';
      }
      await updateDoc(doc(db, 'lectures', assign.lectureId), updates);
      log.push(`📎 Assigned: "${assign.lectureTitle}" → "${assign.moduleName}" (order ${assign.order})`);
    }

    // 2d. Link materials
    for (const link of plan.phase2.materialLinks) {
      const lectureId = createdLectureMap[link.lectureTitle] || link.lectureId;
      await updateDoc(doc(db, 'lectureAssets', link.assetId), {
        lectureIds: [lectureId],
        diplomaIds: [diplomaId],
        updatedAt: serverTimestamp()
      });
      log.push(`🔗 Linked material: "${link.assetTitle}" → "${link.lectureTitle}"`);
    }

    // 2e. Link homework
    for (const link of plan.phase2.homeworkLinks) {
      const lectureId = createdLectureMap[link.lectureTitle] || link.lectureId;
      await updateDoc(doc(db, 'lectureAssets', link.assetId), {
        lectureIds: [lectureId],
        diplomaIds: [diplomaId],
        updatedAt: serverTimestamp()
      });
      log.push(`🔗 Linked homework: "${link.assetTitle}" → "${link.lectureTitle}"`);
    }

    log.push(`✅ Phase 2 complete: ${createdModuleIds.length} modules, ${plan.phase2.lectureAssignments.length} lectures assigned, ${plan.phase2.lecturesToCreate.length} created`);
    log.push('═══ HARD RESET COMPLETE ═══');

    return { success: true, log, createdModuleIds };
  } catch (error) {
    console.error('Hard reset execution error:', error);
    log.push(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message, log };
  }
};
