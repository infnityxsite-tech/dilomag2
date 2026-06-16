/**
 * contentRelationshipMigration.js
 *
 * Content Relationship Migration (CRM) engine for AI Mastery Group 2.
 *
 * Scope:  STRICTLY limited to the diploma named "AI Mastery Group 2".
 *         No other diploma, module, lecture, or asset is touched.
 *
 * Policy: Archive-only. Nothing is deleted.
 *         Duplicates receive { status: "merged", canonicalId }.
 *         All relationship writes use arrayUnion — never overwrite.
 *
 * Workflow:
 *   runCRMAudit()   → read-only scan, returns audit report
 *   buildCRMPlan()  → computes Phase 1/2/3 plan from audit, no writes
 *   applyCRMPlan()  → executes only the items the admin approved
 */

import { db } from './firebase';
import {
  collection, getDocs, getDoc, addDoc, updateDoc,
  doc, query, where, serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import organizeJson from '../../organize_v2.json';

// ─────────────────────────────────────────────
// Constants & Helpers
// ─────────────────────────────────────────────

const LEGACY_DIPLOMA_NAME = 'AI Mastery Group 2';

/** Normalize a title for fuzzy-but-safe deduplication comparisons. */
const norm = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
};

/** Build a safe arrayUnion update object, omitting fields with empty arrays. */
const safeUnionUpdates = (fields) => {
  const updates = {};
  for (const [key, arr] of Object.entries(fields)) {
    if (Array.isArray(arr) && arr.length > 0) {
      updates[key] = arrayUnion(...arr);
    }
  }
  return updates;
};

// ─────────────────────────────────────────────
// Internal — find the scoped diploma ID
// ─────────────────────────────────────────────

const findLegacyDiplomaId = async () => {
  const snap = await getDocs(collection(db, 'diplomas'));
  for (const d of snap.docs) {
    if (d.data().name === LEGACY_DIPLOMA_NAME) return d.id;
  }
  return null;
};

// ─────────────────────────────────────────────
// Internal — fetch all lectures for this diploma
// ─────────────────────────────────────────────

const fetchDiplomaLectures = async (diplomaId) => {
  const lecturesRef = collection(db, 'lectures');
  const map = new Map();

  const snap1 = await getDocs(query(lecturesRef, where('diplomaIds', 'array-contains', diplomaId)));
  snap1.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));

  const snap2 = await getDocs(query(lecturesRef, where('diplomaId', '==', diplomaId)));
  snap2.forEach(d => { if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() }); });

  const snap3 = await getDocs(query(lecturesRef, where('primaryDiplomaId', '==', diplomaId)));
  snap3.forEach(d => { if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() }); });

  return Array.from(map.values()).filter(l => !l._archived);
};

// ─────────────────────────────────────────────
// Internal — fetch all lectureAssets for this diploma
// ─────────────────────────────────────────────

const fetchDiplomaAssets = async (diplomaId) => {
  const assetsRef = collection(db, 'lectureAssets');
  const snap = await getDocs(query(assetsRef, where('diplomaIds', 'array-contains', diplomaId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ─────────────────────────────────────────────
// Internal — detect duplicate asset groups
// ─────────────────────────────────────────────

const detectDuplicateGroups = (activeAssets) => {
  // Group by normalized title
  const byTitle = new Map();
  for (const asset of activeAssets) {
    const key = norm(asset.title);
    if (key) {
      if (!byTitle.has(key)) byTitle.set(key, []);
      byTitle.get(key).push(asset);
    }
  }

  // Group by exact URL (if set)
  const byUrl = new Map();
  for (const asset of activeAssets) {
    if (asset.url) {
      const key = asset.url.trim();
      if (!byUrl.has(key)) byUrl.set(key, []);
      byUrl.get(key).push(asset);
    }
  }

  const processedIds = new Set();
  const groups = [];

  const addGroup = (key, type, assets) => {
    if (assets.length < 2) return;
    if (assets.some(a => processedIds.has(a.id))) return;
    groups.push({ key, type, assets });
    assets.forEach(a => processedIds.add(a.id));
  };

  for (const [key, assets] of byTitle) addGroup(key, 'title', assets);
  for (const [url, assets] of byUrl) addGroup(url, 'url', assets);

  return groups;
};

// ─────────────────────────────────────────────
// Internal — elect canonical from a duplicate group
// ─────────────────────────────────────────────

const electCanonical = (assets) => {
  return [...assets].sort((a, b) => {
    // Most lectureIds first (most connected)
    const diff = (b.lectureIds || []).length - (a.lectureIds || []).length;
    if (diff !== 0) return diff;
    // Then oldest createdAt
    const aT = a.createdAt?.seconds || 0;
    const bT = b.createdAt?.seconds || 0;
    return aT - bT;
  });
};

// ─────────────────────────────────────────────
// Phase 0 — AUDIT (read-only)
// ─────────────────────────────────────────────

/**
 * Scan AI Mastery Group 2 and produce a full audit report.
 * Pure read — zero writes.
 */
export const runCRMAudit = async () => {
  const diplomaId = await findLegacyDiplomaId();
  if (!diplomaId) {
    return { success: false, error: `Diploma "${LEGACY_DIPLOMA_NAME}" not found in Firestore.` };
  }

  const [allLectures, allAssets, modSnap] = await Promise.all([
    fetchDiplomaLectures(diplomaId),
    fetchDiplomaAssets(diplomaId),
    getDocs(query(collection(db, 'modules'), where('diplomaId', '==', diplomaId))),
  ]);

  const existingModules = modSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const activeAssets   = allAssets.filter(a => a.status !== 'merged');
  const archivedAssets = allAssets.filter(a => a.status === 'merged');

  // Lectures that still carry embedded content arrays (old style)
  const lecturesWithEmbedded = allLectures.filter(l =>
    (l.materials?.length > 0) || (l.homeworks?.length > 0) ||
    (l.links?.length > 0)     || (l.notes?.length > 0)     || (l.tips?.length > 0)
  );

  const duplicateGroups = detectDuplicateGroups(activeAssets);

  // Cross-reference with organize_v2.json
  const activeLectureByNorm = new Map(allLectures.map(l => [norm(l.title), l]));
  const activeAssetByNorm   = new Map(activeAssets.map(a => [norm(a.title), a]));

  const missingLectures = [];
  const missingAssets   = [];

  for (const tMod of organizeJson.modules) {
    for (const tLect of tMod.lectures) {
      if (!activeLectureByNorm.has(norm(tLect.lecture))) {
        missingLectures.push({ title: tLect.lecture, module: tMod.module_name });
      }
      for (const matTitle of (tLect.materials || [])) {
        if (!activeAssetByNorm.has(norm(matTitle))) {
          const existing = missingAssets.find(m => m.title === matTitle);
          if (existing) existing.usedIn.push(tLect.lecture);
          else missingAssets.push({ title: matTitle, type: 'material', usedIn: [tLect.lecture] });
        }
      }
      for (const hwTitle of (tLect.homework || [])) {
        if (!activeAssetByNorm.has(norm(hwTitle))) {
          const existing = missingAssets.find(m => m.title === hwTitle);
          if (existing) existing.usedIn.push(tLect.lecture);
          else missingAssets.push({ title: hwTitle, type: 'homework', usedIn: [tLect.lecture] });
        }
      }
    }
  }

  return {
    success: true,
    diplomaId,
    stats: {
      totalLectures:       allLectures.length,
      activeAssets:        activeAssets.length,
      archivedAssets:      archivedAssets.length,
      existingModules:     existingModules.length,
      lecturesWithEmbedded: lecturesWithEmbedded.length,
      duplicateGroups:     duplicateGroups.length,
      missingAssets:       missingAssets.length,
      missingLectures:     missingLectures.length,
    },
    lectures:             allLectures,
    assets:               activeAssets,
    existingModules,
    lecturesWithEmbedded,
    duplicateGroups,
    missingLectures,
    missingAssets,
  };
};

// ─────────────────────────────────────────────
// Build Plan (Phase 1 + 2 + 3 computation)
// ─────────────────────────────────────────────

/**
 * Compute the full CRM plan from the audit.
 * Pure computation — zero writes.
 * Returns { success, audit, plan }
 */
export const buildCRMPlan = async () => {
  const audit = await runCRMAudit();
  if (!audit.success) return audit;

  const {
    diplomaId, lectures, assets,
    existingModules, duplicateGroups,
  } = audit;

  // ── Phase 1: Module scaffolding ──────────────────────────────────
  const existingModByNorm = new Map(existingModules.map(m => [norm(m.name), m]));

  const modulePlan = organizeJson.modules.map((tMod, idx) => {
    const existing = existingModByNorm.get(norm(tMod.module_name));
    return {
      _planIndex: idx,
      id:         existing?.id || `__new__${idx}`,
      name:       tMod.module_name,
      order:      idx + 1,
      isNew:      !existing,
    };
  });

  // ── Phase 2: Asset consolidation ─────────────────────────────────
  const assetMergeOps = duplicateGroups.map((group, idx) => {
    const sorted          = electCanonical(group.assets);
    const canonical       = sorted[0];
    const duplicates      = sorted.slice(1);
    const mergedLectureIds = [...new Set(group.assets.flatMap(a => a.lectureIds || []))];
    const mergedModuleIds  = [...new Set(group.assets.flatMap(a => a.moduleIds  || []))];
    const mergedDiplomaIds = [...new Set(group.assets.flatMap(a => a.diplomaIds || []))];

    return {
      _planIndex:      idx,
      canonical,
      duplicates,
      mergedLectureIds,
      mergedModuleIds,
      mergedDiplomaIds,
      reason: group.type === 'title'
        ? `Duplicate title: "${canonical.title}"`
        : `Duplicate URL (${group.assets.length} copies)`,
    };
  });

  // ── Phase 3: Relationship linking ────────────────────────────────
  const assetByNorm   = new Map(assets.map(a => [norm(a.title), a]));
  const lectureByNorm = new Map(lectures.map(l => [norm(l.title), l]));

  const relationshipLinks = [];
  let linkIdx = 0;

  for (let mi = 0; mi < organizeJson.modules.length; mi++) {
    const tMod     = organizeJson.modules[mi];
    const planMod  = modulePlan[mi];

    for (const tLect of tMod.lectures) {
      const dbLecture = lectureByNorm.get(norm(tLect.lecture));
      if (!dbLecture) continue;

      // Lecture → Module assignment (only if module is existing/real already)
      if (!planMod.isNew && !(dbLecture.moduleIds || []).includes(planMod.id)) {
        const order = tMod.lectures.indexOf(tLect) + 1;
        relationshipLinks.push({
          _planIndex:   linkIdx++,
          action:       'assign_module',
          lectureId:    dbLecture.id,
          lectureTitle: dbLecture.title,
          moduleId:     planMod.id,
          moduleName:   planMod.name,
          order,
        });
      }

      // Material links
      for (const matTitle of (tLect.materials || [])) {
        const dbAsset = assetByNorm.get(norm(matTitle));
        if (!dbAsset) continue;
        if ((dbAsset.lectureIds || []).includes(dbLecture.id)) continue;
        relationshipLinks.push({
          _planIndex:   linkIdx++,
          action:       'add_lecture_link',
          assetId:      dbAsset.id,
          assetTitle:   dbAsset.title,
          lectureId:    dbLecture.id,
          lectureTitle: dbLecture.title,
          moduleId:     planMod.id,
          moduleName:   planMod.name,
          assetType:    'material',
        });
      }

      // Homework links
      for (const hwTitle of (tLect.homework || [])) {
        const dbAsset = assetByNorm.get(norm(hwTitle));
        if (!dbAsset) continue;
        if ((dbAsset.lectureIds || []).includes(dbLecture.id)) continue;
        relationshipLinks.push({
          _planIndex:   linkIdx++,
          action:       'add_lecture_link',
          assetId:      dbAsset.id,
          assetTitle:   dbAsset.title,
          lectureId:    dbLecture.id,
          lectureTitle: dbLecture.title,
          moduleId:     planMod.id,
          moduleName:   planMod.name,
          assetType:    'homework',
        });
      }
    }
  }

  return {
    success: true,
    audit,
    plan: {
      diplomaId,
      modulePlan,
      assetMergeOps,
      relationshipLinks,
    },
  };
};

// ─────────────────────────────────────────────
// Apply Plan (Firestore writes — approved items only)
// ─────────────────────────────────────────────

/**
 * Execute the approved CRM plan against Firestore.
 *
 * @param {object}   plan                 - output of buildCRMPlan().plan
 * @param {number[]} approvedModuleIndices - _planIndex values of modules to create
 * @param {number[]} approvedMergeIndices  - _planIndex values of merge ops to apply
 * @param {number[]} approvedLinkIndices   - _planIndex values of relationship links to apply
 */
export const applyCRMPlan = async (
  plan,
  approvedModuleIndices,
  approvedMergeIndices,
  approvedLinkIndices,
) => {
  const log = [];
  const { diplomaId, modulePlan, assetMergeOps, relationshipLinks } = plan;

  // Map placeholder IDs → real Firestore IDs (populated in Phase 1)
  const moduleIdMap = {};

  try {
    // ── Phase 1: Create approved NEW modules ──────────────────────
    log.push('═══ PHASE 1: MODULE SCAFFOLDING ═══');

    for (const idx of approvedModuleIndices) {
      const mod = modulePlan.find(m => m._planIndex === idx);
      if (!mod || !mod.isNew) continue;

      const ref = await addDoc(collection(db, 'modules'), {
        diplomaId,
        name:      mod.name,
        order:     mod.order,
        source:    'crm_migration',
        createdAt: serverTimestamp(),
      });

      moduleIdMap[mod.id] = ref.id; // map __new__N → real ID
      log.push(`✅ Created module: "${mod.name}" (order ${mod.order}) → ${ref.id}`);
    }

    // Map existing (non-new) modules too, so Phase 3 can resolve them
    for (const mod of modulePlan) {
      if (!mod.isNew) moduleIdMap[mod.id] = mod.id;
    }

    // ── Phase 2: Archive duplicates, update canonical arrays ──────
    log.push('═══ PHASE 2: ASSET CONSOLIDATION ═══');

    for (const idx of approvedMergeIndices) {
      const op = assetMergeOps.find(o => o._planIndex === idx);
      if (!op) continue;

      // Update canonical with merged arrays (additive only)
      const canonicalUpdates = {
        updatedAt: serverTimestamp(),
        ...safeUnionUpdates({
          lectureIds: op.mergedLectureIds,
          moduleIds:  op.mergedModuleIds,
          diplomaIds: op.mergedDiplomaIds,
        }),
      };
      await updateDoc(doc(db, 'lectureAssets', op.canonical.id), canonicalUpdates);
      log.push(`🔗 Canonical updated: "${op.canonical.title}" — merged ${op.mergedLectureIds.length} lecture link(s)`);

      // Archive each duplicate
      for (const dup of op.duplicates) {
        await updateDoc(doc(db, 'lectureAssets', dup.id), {
          status:      'merged',
          canonicalId: op.canonical.id,
          mergedAt:    serverTimestamp(),
          updatedAt:   serverTimestamp(),
        });
        log.push(`📦 Archived duplicate: "${dup.title}" (${dup.id})`);
      }
    }

    // ── Phase 3: Relationship linking ─────────────────────────────
    log.push('═══ PHASE 3: RELATIONSHIP LINKING ═══');

    for (const idx of approvedLinkIndices) {
      const link = relationshipLinks.find(l => l._planIndex === idx);
      if (!link) continue;

      const resolvedModuleId = link.moduleId
        ? (moduleIdMap[link.moduleId] || link.moduleId)
        : null;
      const moduleIsReal = resolvedModuleId && !resolvedModuleId.startsWith('__new__');

      if (link.action === 'add_lecture_link') {
        const updates = {
          lectureIds: arrayUnion(link.lectureId),
          updatedAt:  serverTimestamp(),
        };
        if (moduleIsReal) {
          updates.moduleIds  = arrayUnion(resolvedModuleId);
          updates.diplomaIds = arrayUnion(diplomaId);
        }
        await updateDoc(doc(db, 'lectureAssets', link.assetId), updates);
        log.push(`🔗 Linked [${link.assetType}] "${link.assetTitle}" → "${link.lectureTitle}"`);
      }

      if (link.action === 'assign_module' && moduleIsReal) {
        const lectSnap = await getDoc(doc(db, 'lectures', link.lectureId));
        if (!lectSnap.exists()) continue;

        const existing = lectSnap.data();
        const updates  = {
          moduleIds: arrayUnion(resolvedModuleId),
          updatedAt: serverTimestamp(),
        };
        // Only set primaryModuleId if the lecture doesn't already have one
        if (!existing.primaryModuleId) updates.primaryModuleId = resolvedModuleId;
        // Only set order if lecture has none
        if (!existing.order && link.order) updates.order = link.order;

        await updateDoc(doc(db, 'lectures', link.lectureId), updates);
        log.push(`📎 Assigned lecture: "${link.lectureTitle}" → module "${link.moduleName}" (order ${link.order})`);
      }
    }

    log.push(`═══ CRM COMPLETE: ${approvedModuleIndices.length} modules | ${approvedMergeIndices.length} merges | ${approvedLinkIndices.length} links ═══`);
    return { success: true, log };

  } catch (error) {
    console.error('CRM apply error:', error);
    log.push(`❌ ERROR: ${error.message}`);
    return { success: false, error: error.message, log };
  }
};
