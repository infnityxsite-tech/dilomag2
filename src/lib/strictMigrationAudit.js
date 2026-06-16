/**
 * strictMigrationAudit.js
 *
 * Deterministic audit + apply engine — AI Mastery Group 2 only.
 *
 * WRITES: NONE in audit functions. Only applyStrictMigration() writes.
 *
 * Matching priority:
 *  1. Existing DB assignment (lecture already in target module → CORRECT)
 *  2. exactDBTitle — user-confirmed mapping, highest confidence
 *  3. Exact title match (case-insensitive, stripped)
 *  4. titleAlternatives exact match
 *  5. Contains match (score >= 0.85)
 *  6. Fuzzy (Jaccard)
 *     - score >= 0.90 → FOUND_FUZZY
 *     - score 0.55–0.89 → REVIEW_REQUIRED
 *     - score < 0.55   → NOT_FOUND
 *
 * Flags:
 *  lectureOnlyMove  = true → add moduleId to lecture ONLY; skip all material/homework writes
 *  preserveExisting = true → do not overwrite existing lectureId links on assets
 */

import { db } from './firebase';
import {
  collection, getDocs, getDoc, addDoc, updateDoc,
  doc, query, where, serverTimestamp, arrayUnion,
} from 'firebase/firestore';
import { STRICT_PLAN } from './strictCurriculumPlan.js';

const LEGACY_DIPLOMA_NAME = 'AI Mastery Group 2';

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** Strip emoji, lowercase, collapse punctuation/whitespace */
const norm = (s) => {
  if (!s) return '';
  return s
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[^\x00-\x7F]/g, '')        // non-ASCII
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/** Jaccard similarity on word sets */
const jaccard = (a, b) => {
  const wa = new Set(norm(a).split(' ').filter(Boolean));
  const wb = new Set(norm(b).split(' ').filter(Boolean));
  if (wa.size === 0 && wb.size === 0) return 0;
  const inter = [...wa].filter(w => wb.has(w)).length;
  const union = new Set([...wa, ...wb]).size;
  return inter / union;
};

/**
 * Match a target title against a candidate list.
 * Returns { item, method, score }
 *
 * @param {string}   targetTitle
 * @param {object[]} candidates
 * @param {string}   titleField
 * @param {string}   [exactDBTitle]   - user-confirmed DB title (highest priority)
 * @param {string[]} [alternatives]   - additional title aliases to try
 */
const bestMatch = (targetTitle, candidates, titleField = 'title', exactDBTitle = null, alternatives = []) => {
  const normTarget = norm(targetTitle);

  // ── Priority 0: exactDBTitle (user-confirmed) ──────────────────
  if (exactDBTitle) {
    const normExact = norm(exactDBTitle);
    // Full exact match
    const m0 = candidates.find(c => norm(c[titleField]) === normExact);
    if (m0) return { item: m0, method: 'EXACT_DB_CONFIRMED', score: 1.0 };
    // Leading-token match (first 30 chars of normalized title)
    const lead = normExact.slice(0, 30);
    const m0b = candidates.find(c => norm(c[titleField]).startsWith(lead));
    if (m0b) return { item: m0b, method: 'EXACT_DB_PARTIAL', score: 0.97 };
  }

  // ── Priority 1: Exact title match ─────────────────────────────
  const m1 = candidates.find(c => norm(c[titleField]) === normTarget);
  if (m1) return { item: m1, method: 'EXACT', score: 1.0 };

  // ── Priority 2: titleAlternatives exact ───────────────────────
  for (const alt of alternatives) {
    const normAlt = norm(alt);
    const m2 = candidates.find(c => norm(c[titleField]) === normAlt);
    if (m2) return { item: m2, method: 'ALT_EXACT', score: 0.98 };
  }

  // ── Priority 3: Contains match ────────────────────────────────
  const m3 = candidates.find(c => {
    const nc = norm(c[titleField]);
    return nc.includes(normTarget) || normTarget.includes(nc);
  });
  if (m3) {
    const sc = jaccard(targetTitle, m3[titleField]);
    return { item: m3, method: 'CONTAINS', score: Math.max(0.85, sc) };
  }

  // ── Priority 4: Fuzzy (Jaccard) ───────────────────────────────
  let best = null, bestScore = 0;
  for (const c of candidates) {
    const s = jaccard(targetTitle, c[titleField]);
    if (s > bestScore) { bestScore = s; best = c; }
  }

  // Also try alternatives for fuzzy
  for (const alt of alternatives) {
    for (const c of candidates) {
      const s = jaccard(alt, c[titleField]);
      if (s > bestScore) { bestScore = s; best = c; }
    }
  }

  if (bestScore >= 0.90) return { item: best, method: 'FUZZY_HIGH', score: bestScore };
  if (bestScore >= 0.55) return { item: best, method: 'REVIEW_REQUIRED', score: bestScore };
  return { item: null, method: 'NOT_FOUND', score: 0 };
};

// ─────────────────────────────────────────────
// Status derivation
// ─────────────────────────────────────────────

const deriveLectStatus = (method, score) => {
  if (!method || method === 'NOT_FOUND') return 'NOT_FOUND';
  if (method === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED';
  if (method === 'EXACT' || method === 'EXACT_DB_CONFIRMED' || method === 'ALT_EXACT') return 'FOUND';
  if (method === 'EXACT_DB_PARTIAL') return 'FOUND'; // user-confirmed partial
  if (score >= 0.85) return 'FOUND_CONTAINS';
  if (score >= 0.90) return 'FOUND_FUZZY';
  return 'FOUND_FUZZY';
};

// ─────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────

const fetchDiplomaId = async () => {
  const snap = await getDocs(collection(db, 'diplomas'));
  for (const d of snap.docs) if (d.data().name === LEGACY_DIPLOMA_NAME) return d.id;
  return null;
};

const fetchAllLectures = async (diplomaId) => {
  const ref = collection(db, 'lectures');
  const map = new Map();
  const qs  = [
    query(ref, where('diplomaIds', 'array-contains', diplomaId)),
    query(ref, where('diplomaId', '==', diplomaId)),
    query(ref, where('primaryDiplomaId', '==', diplomaId)),
  ];
  for (const q of qs) {
    const snap = await getDocs(q);
    snap.forEach(d => { if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() }); });
  }
  return Array.from(map.values()).filter(l => !l._archived);
};

const fetchAllAssets = async (diplomaId) => {
  const snap = await getDocs(
    query(collection(db, 'lectureAssets'), where('diplomaIds', 'array-contains', diplomaId))
  );
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.status !== 'merged');
};

const fetchModules = async (diplomaId) => {
  const snap = await getDocs(query(collection(db, 'modules'), where('diplomaId', '==', diplomaId)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const getModuleName = async (id, cache) => {
  if (!id) return null;
  if (cache.has(id)) return cache.get(id);
  const snap = await getDoc(doc(db, 'modules', id));
  const name = snap.exists() ? (snap.data().name || null) : null;
  cache.set(id, name);
  return name;
};

// ─────────────────────────────────────────────
// Main audit — pure read, zero writes
// ─────────────────────────────────────────────

export const runStrictAudit = async () => {
  const diplomaId = await fetchDiplomaId();
  if (!diplomaId) return { success: false, error: `Diploma "${LEGACY_DIPLOMA_NAME}" not found.` };

  const [dbLectures, dbAssets, dbModules] = await Promise.all([
    fetchAllLectures(diplomaId),
    fetchAllAssets(diplomaId),
    fetchModules(diplomaId),
  ]);

  // Module name lookup cache
  const modNameCache = new Map(dbModules.map(m => [m.id, m.name]));
  const dbModByNorm  = new Map(dbModules.map(m => [norm(m.name), m]));

  // Build lecture → current module name map
  const lectureModuleNameMap = new Map();
  for (const lect of dbLectures) {
    const modIds = [...(lect.moduleIds || []), lect.moduleId, lect.primaryModuleId].filter(Boolean);
    const name   = modIds.length ? await getModuleName(modIds[0], modNameCache) : null;
    lectureModuleNameMap.set(lect.id, name);
  }

  const summary = {
    modules: 0, modulesToCreate: 0,
    lectures: 0, lecturesFound: 0, lecturesNotFound: 0, lecturesReviewRequired: 0,
    materials: 0, materialsFound: 0, materialsNotFound: 0,
    homework: 0, homeworkFound: 0, homeworkNotFound: 0,
    relationshipsToAdd: 0, relationshipsAlreadyExist: 0,
    lectureOnlyMoves: 0,
  };

  const usedLectureIds = new Set();
  const auditModules   = [];

  for (const planMod of STRICT_PLAN.modules) {
    summary.modules++;

    const existingMod = dbModByNorm.get(norm(planMod.name));
    let modStatus = existingMod ? 'EXISTS' : 'WILL_CREATE';
    if (!existingMod) summary.modulesToCreate++;

    const auditLectures = [];

    for (const planLect of planMod.lectures) {
      summary.lectures++;

      // ── Match lecture ─────────────────────────────────────────
      const { item: dbLect, method, score } = bestMatch(
        planLect.title,
        dbLectures,
        'title',
        planLect.exactDBTitle  || null,
        planLect.alts || planLect.titleAlternatives || [],
      );

      const lectStatus = deriveLectStatus(method, score);
      const isFound    = dbLect !== null;

      if (isFound) {
        usedLectureIds.add(dbLect.id);
        if (lectStatus === 'REVIEW_REQUIRED') summary.lecturesReviewRequired++;
        else summary.lecturesFound++;
      } else {
        summary.lecturesNotFound++;
      }

      const currentModuleName = dbLect ? lectureModuleNameMap.get(dbLect.id) : null;
      let moduleAction = 'ASSIGN';
      if (dbLect && existingMod && (dbLect.moduleIds || []).includes(existingMod.id)) {
        moduleAction = 'CORRECT';
      } else if (dbLect && currentModuleName && currentModuleName !== planMod.name) {
        moduleAction = 'REASSIGN';
      }

      // lectureOnlyMove: add module assignment but skip all asset writes
      const isLectureOnlyMove = !!planLect.lectureOnlyMove;
      if (isLectureOnlyMove && isFound) summary.lectureOnlyMoves++;

      // ── Match materials (skip if lectureOnlyMove) ─────────────
      const auditMaterials = [];

      if (!isLectureOnlyMove) {
        // Support both field names: mats (new plan) and materials (legacy)
        let targetMaterials = [...(planLect.mats || planLect.materials || [])];

        // Expand pattern-based materials
        if (planLect.materialsPattern) {
          for (const pat of planLect.materialsPattern) {
            const patNorm = norm(pat);
            for (const asset of dbAssets) {
              if (
                norm(asset.title).includes(patNorm) &&
                asset.type === 'material' &&
                !targetMaterials.includes(asset.title)
              ) {
                targetMaterials.push(asset.title);
              }
            }
          }
        }

        for (const matTitle of targetMaterials) {
          summary.materials++;
          const { item: dbAsset, method: mMethod, score: mScore } = bestMatch(matTitle, dbAssets);
          const matStatus = dbAsset
            ? (mMethod === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : mMethod === 'NOT_FOUND' ? 'NOT_FOUND' : 'FOUND')
            : 'NOT_FOUND';

          if (dbAsset) summary.materialsFound++;
          else summary.materialsNotFound++;

          let action = 'NO_ACTION';
          if (dbAsset && dbLect) {
            if ((dbAsset.lectureIds || []).includes(dbLect.id)) {
              action = 'ALREADY_LINKED';
              summary.relationshipsAlreadyExist++;
            } else {
              action = 'WILL_LINK';
              summary.relationshipsToAdd++;
            }
          } else if (!dbAsset) {
            action = 'MISSING_ASSET';
          }

          auditMaterials.push({
            targetTitle: matTitle,
            status:      matStatus,
            matchMethod: mMethod,
            matchScore:  mScore,
            dbId:        dbAsset?.id   || null,
            dbTitle:     dbAsset?.title || null,
            currentLectureIds: dbAsset?.lectureIds || [],
            action,
          });
        }
      }

      // ── Match homework / labs (skip if lectureOnlyMove) ───────
      const auditHomework = [];

      if (!isLectureOnlyMove) {
        // Support both field names: hw (new plan) and homework (legacy)
        for (const hwTitle of (planLect.hw || planLect.homework || [])) {
          summary.homework++;
          const { item: dbAsset, method: hMethod, score: hScore } = bestMatch(hwTitle, dbAssets);
          const hwStatus = dbAsset
            ? (hMethod === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'FOUND')
            : 'NOT_FOUND';

          if (dbAsset) summary.homeworkFound++;
          else summary.homeworkNotFound++;

          let action = 'NO_ACTION';
          if (dbAsset && dbLect) {
            if ((dbAsset.lectureIds || []).includes(dbLect.id)) {
              action = 'ALREADY_LINKED';
              summary.relationshipsAlreadyExist++;
            } else {
              action = 'WILL_LINK';
              summary.relationshipsToAdd++;
            }
          } else if (!dbAsset) {
            action = 'MISSING_ASSET';
          }

          auditHomework.push({
            targetTitle: hwTitle,
            status:      hwStatus,
            matchMethod: hMethod,
            matchScore:  hScore,
            dbId:        dbAsset?.id   || null,
            dbTitle:     dbAsset?.title || null,
            currentLectureIds: dbAsset?.lectureIds || [],
            action,
          });
        }
      }

      auditLectures.push({
        targetTitle:      planLect.title,
        exactDBTitle:     planLect.exactDBTitle || null,
        order:            planLect.order,
        status:           lectStatus,
        matchMethod:      method,
        matchScore:       score,
        dbId:             dbLect?.id    || null,
        dbTitle:          dbLect?.title || null,
        currentModuleName,
        moduleAction,
        lectureOnlyMove:  isLectureOnlyMove,
        preserveExisting: !!planLect.preserveExisting,
        materials:        auditMaterials,
        homework:         auditHomework,
      });
    }

    auditModules.push({
      name:     planMod.name,
      order:    planMod.order,
      status:   modStatus,
      dbId:     existingMod?.id   || null,
      dbName:   existingMod?.name || null,
      lectures: auditLectures,
      notes:    planMod.notes || [],
    });
  }

  // Lectures in DB that weren't matched to any plan entry
  const unmatchedLectures = dbLectures.filter(l => !usedLectureIds.has(l.id));

  return {
    success: true,
    diplomaId,
    dbLectures:  dbLectures.length,
    dbAssets:    dbAssets.length,
    dbModules:   dbModules.length,
    unmatchedLectures,
    modules:     auditModules,
    summary,
  };
};

// ─────────────────────────────────────────────
// Apply (called ONLY after explicit user approval)
// ─────────────────────────────────────────────

/**
 * Write the approved strict migration to Firestore.
 *
 * Rules enforced:
 *  - No deletions, no archives, no hard resets
 *  - All writes use arrayUnion (additive only)
 *  - lectureOnlyMove lectures: only moduleId updated on lecture document, all asset writes skipped
 *  - preserveExisting lectures: asset writes use arrayUnion (existing links never removed)
 *  - REVIEW_REQUIRED items are skipped and logged — must be manually resolved
 *  - NOT_FOUND items are skipped and logged
 */
export const applyStrictMigration = async (auditResult) => {
  const log = [];
  let skippedReview = 0, skippedNotFound = 0;
  const { diplomaId, modules } = auditResult;
  const moduleIdByName = {};

  try {
    // ── Phase 1: Scaffold missing modules ─────────────────────────
    log.push('═══ PHASE 1: MODULE SCAFFOLDING ═══');
    for (const mod of modules) {
      if (mod.status === 'WILL_CREATE') {
        const ref = await addDoc(collection(db, 'modules'), {
          diplomaId,
          name:      mod.name,
          order:     mod.order,
          source:    'strict_migration',
          createdAt: serverTimestamp(),
        });
        moduleIdByName[mod.name] = ref.id;
        log.push(`✅ Created module: "${mod.name}" → ${ref.id}`);
      } else if (mod.dbId) {
        moduleIdByName[mod.name] = mod.dbId;
        // Ensure module order is correct (additive metadata update only)
        await updateDoc(doc(db, 'modules', mod.dbId), {
          order:     mod.order,
          updatedAt: serverTimestamp(),
        });
        log.push(`✔ Module order set: "${mod.name}" → order ${mod.order}`);
      }
    }

    // ── Phase 2: Assign lectures + link assets ─────────────────────
    log.push('═══ PHASE 2: LECTURES & ASSETS ═══');

    for (const mod of modules) {
      const modId = moduleIdByName[mod.name];
      if (!modId) { log.push(`⚠ No module ID for "${mod.name}" — skipping`); continue; }

      log.push(`── Module: "${mod.name}" (${modId}) ──`);

      for (const lect of mod.lectures) {

        // Skip REVIEW_REQUIRED — require manual intervention
        if (lect.status === 'REVIEW_REQUIRED') {
          skippedReview++;
          log.push(`⚠ REVIEW_REQUIRED — skipped: "${lect.targetTitle}" (match: "${lect.dbTitle}", score: ${(lect.matchScore*100).toFixed(0)}%)`);
          continue;
        }

        // Skip NOT_FOUND — cannot act without a real lecture ID
        if (lect.status === 'NOT_FOUND' || !lect.dbId) {
          skippedNotFound++;
          log.push(`✗ NOT_FOUND — skipped: "${lect.targetTitle}"`);
          continue;
        }

        // ── Assign lecture to module ───────────────────────────
        if (lect.moduleAction !== 'CORRECT') {
          const lectSnap = await getDoc(doc(db, 'lectures', lect.dbId));
          const existing = lectSnap.exists() ? lectSnap.data() : {};

          const lectUpdates = {
            moduleIds:  arrayUnion(modId),
            diplomaIds: arrayUnion(diplomaId),
            order:      lect.order,
            updatedAt:  serverTimestamp(),
          };
          // Only set primaryModuleId if not already populated
          if (!existing.primaryModuleId) lectUpdates.primaryModuleId = modId;

          await updateDoc(doc(db, 'lectures', lect.dbId), lectUpdates);
          log.push(`📎 [${lect.moduleAction}] "${lect.dbTitle}" → "${mod.name}" (order ${lect.order})`);
        } else {
          log.push(`✔ CORRECT: "${lect.dbTitle}" already in "${mod.name}"`);
        }

        // ── lectureOnlyMove: stop here — do not touch assets ──
        if (lect.lectureOnlyMove) {
          log.push(`   ↳ lectureOnlyMove=true — material & homework links untouched`);
          continue;
        }

        // ── Link materials ────────────────────────────────────
        for (const mat of lect.materials) {
          if (mat.status === 'REVIEW_REQUIRED') {
            skippedReview++;
            log.push(`   ⚠ REVIEW_REQUIRED [material]: "${mat.targetTitle}"`);
            continue;
          }
          if (!mat.dbId || mat.action === 'MISSING_ASSET') {
            log.push(`   ✗ NOT_FOUND [material]: "${mat.targetTitle}"`);
            continue;
          }
          if (mat.action === 'ALREADY_LINKED') {
            log.push(`   ✔ LINKED: [material] "${mat.dbTitle}"`);
            continue;
          }
          // WILL_LINK — use arrayUnion (never overwrites)
          await updateDoc(doc(db, 'lectureAssets', mat.dbId), {
            lectureIds: arrayUnion(lect.dbId),
            moduleIds:  arrayUnion(modId),
            diplomaIds: arrayUnion(diplomaId),
            updatedAt:  serverTimestamp(),
          });
          log.push(`   🔗 LINKED [material]: "${mat.dbTitle}" → "${lect.dbTitle}"`);
        }

        // ── Link homework / labs ──────────────────────────────
        for (const hw of lect.homework) {
          if (hw.status === 'REVIEW_REQUIRED') {
            skippedReview++;
            log.push(`   ⚠ REVIEW_REQUIRED [homework]: "${hw.targetTitle}"`);
            continue;
          }
          if (!hw.dbId || hw.action === 'MISSING_ASSET') {
            log.push(`   ✗ NOT_FOUND [homework]: "${hw.targetTitle}"`);
            continue;
          }
          if (hw.action === 'ALREADY_LINKED') {
            log.push(`   ✔ LINKED: [homework] "${hw.dbTitle}"`);
            continue;
          }
          await updateDoc(doc(db, 'lectureAssets', hw.dbId), {
            lectureIds: arrayUnion(lect.dbId),
            moduleIds:  arrayUnion(modId),
            diplomaIds: arrayUnion(diplomaId),
            updatedAt:  serverTimestamp(),
          });
          log.push(`   🔗 LINKED [homework]: "${hw.dbTitle}" → "${lect.dbTitle}"`);
        }
      }
    }

    const trailer = skippedReview > 0 || skippedNotFound > 0
      ? ` | ⚠ ${skippedReview} REVIEW_REQUIRED, ${skippedNotFound} NOT_FOUND — manual review needed`
      : '';
    log.push(`═══ STRICT MIGRATION COMPLETE${trailer} ═══`);
    return { success: true, log, skippedReview, skippedNotFound };

  } catch (err) {
    console.error('Strict migration apply error:', err);
    log.push(`❌ ERROR: ${err.message}`);
    return { success: false, error: err.message, log };
  }
};
