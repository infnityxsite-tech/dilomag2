/**
 * exportFirestoreAudit.js
 *
 * Run: node scripts/exportFirestoreAudit.js
 *
 * Connects to Firestore via Firebase Admin SDK using the service account
 * in .env, fetches all lectures/assets/modules for "AI Mastery Group 2",
 * and writes curriculum_audit/strict_audit_live.json.
 *
 * No writes to Firestore. Read-only.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load env manually (no dotenv dependency needed) ───────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const root  = resolve(__dir, '..');

const envRaw = readFileSync(resolve(root, '.env'), 'utf-8');
const env = {};
for (const line of envRaw.split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

// Parse the service account JSON from FIREBASE_SERVICE_ACCOUNT_KEY
// It spans multiple lines in the .env file — re-join from raw parse
let serviceAccountRaw = '';
let inBlock = false;
for (const line of envRaw.split('\n')) {
  if (line.startsWith('FIREBASE_SERVICE_ACCOUNT_KEY=')) {
    serviceAccountRaw = line.replace('FIREBASE_SERVICE_ACCOUNT_KEY=', '').trim();
    inBlock = true;
    if (serviceAccountRaw.endsWith('}')) { inBlock = false; break; }
    continue;
  }
  if (inBlock) {
    serviceAccountRaw += '\n' + line;
    if (line.trim().endsWith('}')) { inBlock = false; break; }
  }
}
const serviceAccount = JSON.parse(serviceAccountRaw);

// ── Firebase Admin init ───────────────────────────────────────────────
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// ── Helpers ───────────────────────────────────────────────────────────
const DIPLOMA_NAME = 'AI Mastery Group 2';

const norm = (s) => {
  if (!s) return '';
  return s
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, '')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const jaccard = (a, b) => {
  const wa = new Set(norm(a).split(' ').filter(Boolean));
  const wb = new Set(norm(b).split(' ').filter(Boolean));
  if (!wa.size && !wb.size) return 0;
  const inter = [...wa].filter(w => wb.has(w)).length;
  return inter / new Set([...wa, ...wb]).size;
};

const bestMatch = (target, candidates, field = 'title', exactDBTitle = null, alts = []) => {
  const nt = norm(target);

  if (exactDBTitle) {
    const ne = norm(exactDBTitle);
    const m = candidates.find(c => norm(c[field]) === ne);
    if (m) return { item: m, method: 'EXACT_DB_CONFIRMED', score: 1.0 };
    const lead = ne.slice(0, 30);
    const mp = candidates.find(c => norm(c[field]).startsWith(lead));
    if (mp) return { item: mp, method: 'EXACT_DB_PARTIAL', score: 0.97 };
  }

  const exact = candidates.find(c => norm(c[field]) === nt);
  if (exact) return { item: exact, method: 'EXACT', score: 1.0 };

  for (const alt of alts) {
    const na = norm(alt);
    const m = candidates.find(c => norm(c[field]) === na);
    if (m) return { item: m, method: 'ALT_EXACT', score: 0.98 };
  }

  const contains = candidates.find(c => {
    const nc = norm(c[field]);
    return nc.includes(nt) || nt.includes(nc);
  });
  if (contains) return { item: contains, method: 'CONTAINS', score: 0.9 };

  let best = null, bs = 0;
  for (const c of candidates) {
    const s = jaccard(target, c[field]);
    if (s > bs) { bs = s; best = c; }
  }
  for (const alt of alts) {
    for (const c of candidates) {
      const s = jaccard(alt, c[field]);
      if (s > bs) { bs = s; best = c; }
    }
  }

  if (bs >= 0.90) return { item: best, method: 'FUZZY_HIGH',        score: bs };
  if (bs >= 0.55) return { item: best, method: 'REVIEW_REQUIRED',   score: bs };
  return { item: null, method: 'NOT_FOUND', score: 0 };
};

// ── Target curriculum (matches strictCurriculumPlan.js exactly) ───────
// Import inline so this script has no src/ dependencies
const PLAN = {
  modules: [
    {
      name: 'Python Foundations', order: 1,
      lectures: [
        { title: 'Master Python Basics: Variables, Math & Logic in One Lesson', order: 1,
          alts: ['Master Python Basics: Variables, Math & Logic in One Lesson! 🐍'],
          mats: ['Python Fundamentals: Lecture Notes & Examples'],
          hw: ['Python Practical Labs: 20 Hands-on Tasks'] },
        { title: 'Python Data Structures: Lists, Dictionaries & Advanced Looping', order: 2,
          mats: ['Python Fundamentals: Lecture Notes & Examples'],
          hw: ['Python Practical Labs: 20 Hands-on Tasks', 'Python Data Structures & Loops: 20 Practical Challenges'] },
        { title: 'Python Functions Essentials: From Basics to Advanced Scope', order: 3,
          mats: ['Source Code: Python Functions & Modular Programming'],
          hw: ['Python Functions Masterclass: 30 Practical Challenges', 'OOP & FUNCTION (LIGHT)'] },
        { title: 'From Functions to Objects: Smart Student Project & OOP Basics', order: 4,
          alts: ['From Functions to Objects'], mats: [], hw: [] },
        { title: 'OOP in Python Part 2', order: 5,
          mats: ['Mastering OOP in Python: The Complete Source Code & Guide'], hw: ['Python Functions Masterclass: 30 Practical Challenges'] },
        { title: 'OOP in Python Part 3 + Final Project', order: 6,
          mats: ['Library Management System (OOP Tutorial) Final Project'], hw: [] },
      ]
    },
    {
      name: 'Mathematics & Data Analysis', order: 2,
      lectures: [
        { title: 'Mathematics for Data Science P1', order: 1,
          mats: ['Mathematics for Data Science Book',
                 'Numpy & Pandas (Complete Tutorial)'], hw: [] },
        { title: 'Mathematics for Data Science P2 + NumPy', order: 2,
          alts: ['Mathematics for Data Science P2 + Numpy'],
          mats: ['Mathematics for Data Science Book',
                 'Numpy & Pandas (Complete Tutorial)'], hw: [] },
        { title: "Pandas: Python's Foundation for Data Manipulation", order: 3,
          mats: ['Pandas', 'Pandas Advanced', 'Data File (Pokemon Data)'],
          hw: ['Pandas Homework'] },
        { title: 'Master Data Visualization with Matplotlib & Seaborn | Beginner to Pro', order: 4,
          // "Visualization Notes (Matplotlib & Seaborn)" does NOT exist in 71 assets.
          // Actual DB titles confirmed:
          mats: ['Master Data Visualization with Matplotlib & Seaborn | Beginner to Pro',
                 'Mathematic & Visualization Quick Revision Session'],
          hw: [], matPattern: ['Matplotlib', 'Seaborn', 'Visualization'] },
        { title: 'Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn', order: 5,
          alts: ['📊 Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn',
                 'Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn'],
          mats: ['Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn'],
          // CONFIRMED: Capstone Labs are separate from Final Project Labs.
          // DB has no assets titled "Capstone Project Lab N" — they use Final Project Lab IDs
          // but those are DIFFERENT assets.  No lab assignment to Capstone lecture unless
          // user explicitly confirms mapping.
          hw: [] },
      ]
    },
    {
      name: 'Data Preprocessing', order: 3,
      lectures: [
        { title: 'Data Preprocessing P1', order: 1, preserve: true,
          mats: ['Data Preprocessing P1 Notebook', 'Comprehensive Guide to Data Preprocessing in Machine Learning'], hw: [] },
        { title: 'Data Preprocessing P2', order: 2, preserve: true,
          mats: ['Comprehensive Guide to Data Preprocessing in Machine Learning'], hw: [] },
        { title: 'Data Preprocessing P3', order: 3, preserve: true,
          mats: ['Comprehensive Guide to Data Preprocessing in Machine Learning'], hw: [] },
        { title: 'Data Preprocessing P4', order: 4, preserve: true,
          mats: ['Comprehensive Guide to Data Preprocessing in Machine Learning'], hw: [] },
        // NOTE: Guide has P5 — user spec has 4 lectures — P5 stays in DB, no reassignment
      ]
    },
    {
      name: 'Machine Learning', order: 4,
      lectures: [
        { title: 'Regression Analysis in Machine Learning: From Basics to Applications P1', order: 1,
          // DB title confirmed: "Regression Analysis in Machine Learning: NoteBook - Data - Slides"
          // (id: vh2GnnKTMMfGzCO0LmNV)
          mats: ['Regression Analysis in Machine Learning: NoteBook - Data - Slides'],
          hw: ['Lap 1'] },
        { title: 'Classification Models in Machine Learning: A Deep Dive', order: 2,
          alts: ['Classification Models in Machine Learning A Deep Dive'],
          mats: ['Classification Models in Machine Learning 4 A Deep Dive (Notebook)'], hw: ['Lap 2'] },
        { title: 'SVM Model and Application', order: 3,
          alts: ['SVM Model and Applicaton'],
          mats: ['Classification Models in Machine Learning'], hw: ['Lap 3'] },
        { title: 'State-of-the-Art Boosting Algorithms: A Professional Guide to Modern Ensemble Learning', order: 4,
          alts: ['State-of-the-Art Boosting Algorithms AProfessional Guide to Modern Ensemble Learning',
                 'State-of-the-ArtBoostingAlgorithmsAProfessionalGuidetoModernEnsemble Learning'],
          mats: ['State-of-the-Art Boosting Algorithms AProfessional Guide to Modern Ensemble Learning'], hw: ['Lap 4'] },
        { title: 'ML Application', order: 5,
          alts: ['ML Applicattion'],
          // DB title confirmed: "Unsupervised Machine Learning Notebook" (id: oqQUI3CX9K92rrBNOnMr)
          mats: ['Unsupervised Machine Learning Notebook'], hw: ['Lap 5'] },
        { title: 'Unsupervised Machine Learning: Practical Understanding beyond Classification', order: 6,
          exactDBTitle: 'Unsupervised Machine Learning Practical Understanding A clear, intuitive guide beyond classification and regression.',
          alts: ['Unsupervised Machine Learning Practical Understanding'],
          // DB asset confirmed: "Unsupervised Machine Learning Notebook" (shared)
          // Also: "2N5MQ6Fs5iOsRPBp5xqM | Unsupervised Machine Learning Practical Understanding..."
          mats: ['Unsupervised Machine Learning Notebook',
                 'Unsupervised Machine Learning Practical Understanding A clear, intuitive guide beyond classification and regression.'],
          hw: [] },
        { title: 'Full Machine Learning Project 1', order: 7,
          alts: ['Full Machine learning Project 1'],
          lectureOnlyMove: true,        // ← Do NOT touch material/hw links
          mats: [], hw: [] },
      ]
    },
    {
      name: 'Deep Learning', order: 5,
      lectures: [
        // ── Core DL ──
        { title: 'Deep Learning Part 1',  order: 1,
          // Curriculum Guide says: "Deep Learning Part1" (no space before 1)
          alts: ['Deep Learning Part1'],
          mats: ['Deep Learning Notebook Part1', 'Deep Learning Part1'], hw: ['DL Lab 1', 'DL Lab 2'] },
        { title: 'Deep Learning Part 2',  order: 2,
          // DB has NO "Deep Learning Part 2 Notebook" — only "Deep Learning Part 4 Notebook".
          // Part 2 notebook does not exist as a separate asset. Remove to avoid blocking.
          mats: [], hw: ['DL Lab 3', 'DL Lab 4', 'DL Lab 5'] },
        { title: 'Deep Learning Part 4',  order: 4,
          mats: ['Deep Learning Part 4 Notebook'], hw: ['DL Lab 8', 'DL Lab 9', 'DL Lab 10'] },
        // ── Transfer Learning ── (user-confirmed DB titles)
        { title: 'Transfer Learning: Fine-Tuning Pretrained Models', order: 5,
          exactDBTitle: 'Transfer Learning, Fine-Tuning Pretrained Models Fine-tune ResNet/VGG on data Custom dataset tuning Part 1',
          mats: [], hw: [] },
        { title: 'Transfer Learning Application', order: 6,
          exactDBTitle: 'Transfer learning Application',
          alts: ['Transfer learning Application'],
          mats: ['CNN Exercise Notebook'], hw: [] },
        // ── Image Fundamentals ──
        { title: 'Image Fundamentals: Preprocessing, Convolution, Filters & Exercises', order: 7,
          exactDBTitle: 'Image Fundamentals, Preprocessing, Convolution & Filters Image processing & filter application Convolution exercises',
          mats: ['CNN Fundamental'], hw: [] },
        // ── From old Computer Vision module ──
        { title: 'Computer Vision Object Detection: YOLO Basics', order: 8,
          alts: ['Computer Vision Object Detection Yolo Basics'],
          mats: ['Computer Vision Object Detection Yolo Basics'], hw: [] },
        { title: 'YOLO Application', order: 9,
          mats: ['CNN Application'], hw: [] },
        { title: 'Computer Vision Image Segmentation U-Net', order: 10,
          alts: ['Computer Vision Image Segmentation U net', 'Computer Vision Image Segmentation Unet'],
          mats: ['CNN Fundamental'], hw: [] },
        { title: 'CNN App', order: 11,
          exactDBTitle: 'CNN App',
          mats: ['CNN Application'], hw: [] },
        // ── From old Advanced Sequence Models module ──
        { title: 'Transformers', order: 12,
          exactDBTitle: 'Transformers',
          // Material confirmed in DB as "Sequence model Lab" (lowercase 'm')
          // Asset title: "Sequence Model (Transformers)" — DB shows NOT_FOUND.
          // DB asset id for Sequence Model lab: 0qQZayYdtzvWO88iSijU — FOUND.
          // No "Sequence Model (Transformers)" material found in 71 assets — remove from mats.
          mats: [],
          hw: ['Sequence Model Lab', 'Sequence model Lab'] },
        // Vision Transformers — CORRECTED:
        // DB has two relevant lecture records:
        //   KkxNwNIf4BUMXKK4k2Wb: "vison transformers lecture " (unmatched, no moduleIds)
        //   Nwtc4DKHxVl0uKOJswEK: "Transformers" (matched to Transformers above)
        // The correct lecture for Vision Transformers is KkxNwNIf4BUMXKK4k2Wb.
        { title: 'Vision Transformers Lecture', order: 13,
          exactDBTitle: 'vison transformers lecture',   // DB typo: "vison" not "vision"
          alts: ['Vision Transformer Lecture', 'vision transformers lecture'],
          mats: [
            'Hugging face pdf',   // confirmed exact DB title (id: ixv2paOj0WfgL8scZI2O)
            'vison transformers  code',  // confirmed exact DB title (id: hWqjiGonq2KZm1Kx2EXQ) — two spaces, typo in DB
          ],
          hw: [] },
        // ── RCNN LSTM ──
        { title: 'RCNN LSTM', order: 14,
          mats: ['RNN Notebook (RCNN LSTM)'], hw: [] },
      ]
    },
  ]
};

// ── Main audit ────────────────────────────────────────────────────────
async function main() {
  console.log('🔍 Fetching diploma…');

  // 1. Find diploma
  const dipSnap = await db.collection('diplomas').get();
  let diplomaId = null;
  for (const d of dipSnap.docs) {
    if (d.data().name === DIPLOMA_NAME) { diplomaId = d.id; break; }
  }
  if (!diplomaId) { console.error('❌ Diploma not found'); process.exit(1); }
  console.log(`✅ Diploma: ${diplomaId}`);

  // 2. Fetch all lectures (3 query patterns)
  const lectMap = new Map();
  const lPatterns = [
    db.collection('lectures').where('diplomaIds', 'array-contains', diplomaId),
    db.collection('lectures').where('diplomaId',  '==', diplomaId),
    db.collection('lectures').where('primaryDiplomaId', '==', diplomaId),
  ];
  for (const q of lPatterns) {
    const s = await q.get();
    s.forEach(d => { if (!lectMap.has(d.id)) lectMap.set(d.id, { id: d.id, ...d.data() }); });
  }
  const lectures = Array.from(lectMap.values()).filter(l => !l._archived);
  console.log(`📚 Lectures found: ${lectures.length}`);

  // 3. Fetch assets
  const assetSnap = await db.collection('lectureAssets')
    .where('diplomaIds', 'array-contains', diplomaId).get();
  const assets = assetSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(a => a.status !== 'merged');
  console.log(`📦 Assets found: ${assets.length}`);

  // 4. Fetch modules
  const modSnap = await db.collection('modules').where('diplomaId', '==', diplomaId).get();
  const modules = modSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`🗂  Modules found: ${modules.length}`);

  // Module name lookup
  const modByNorm = new Map(modules.map(m => [norm(m.name), m]));

  // Lecture → current module name
  const modCache = new Map(modules.map(m => [m.id, m.name]));
  const lectModMap = new Map();
  for (const l of lectures) {
    const ids = [...(l.moduleIds || []), l.moduleId, l.primaryModuleId].filter(Boolean);
    lectModMap.set(l.id, ids.length ? (modCache.get(ids[0]) || null) : null);
  }

  // ── Run per-plan matching ─────────────────────────────────────────
  const summary = {
    modulesToCreate: 0, modulesExist: 0,
    lecturesTotal: 0, found: 0, notFound: 0, reviewRequired: 0,
    materialsTotal: 0, matFound: 0, matMissing: 0,
    hwTotal: 0, hwFound: 0, hwMissing: 0,
    relToAdd: 0, relExist: 0,
    lectureOnlyMoves: 0,
  };

  const usedLectIds = new Set();
  const auditModules = [];

  for (const pm of PLAN.modules) {
    const existMod = modByNorm.get(norm(pm.name));
    const modStatus = existMod ? 'EXISTS' : 'WILL_CREATE';
    if (!existMod) summary.modulesToCreate++; else summary.modulesExist++;

    const auditLects = [];

    for (const pl of pm.lectures) {
      summary.lecturesTotal++;
      const { item: dbL, method, score } = bestMatch(
        pl.title, lectures, 'title', pl.exactDBTitle || null, pl.alts || []
      );

      let status = 'NOT_FOUND';
      if (dbL) {
        if (method === 'REVIEW_REQUIRED') { status = 'REVIEW_REQUIRED'; summary.reviewRequired++; }
        else { status = 'FOUND'; summary.found++; }
        usedLectIds.add(dbL.id);
      } else {
        summary.notFound++;
      }

      const curMod = dbL ? lectModMap.get(dbL.id) : null;
      let moduleAction = 'ASSIGN';
      if (dbL && existMod && (dbL.moduleIds || []).includes(existMod.id)) moduleAction = 'CORRECT';
      else if (dbL && curMod && curMod !== pm.name) moduleAction = 'REASSIGN';


      if (pl.lectureOnlyMove && dbL) summary.lectureOnlyMoves++;

      // Match materials
      const auditMats = [];
      if (!pl.lectureOnlyMove) {
        // Expand pattern
        let mTitles = [...(pl.mats || [])];
        if (pl.matPattern) {
          for (const pat of pl.matPattern) {
            const pn = norm(pat);
            for (const a of assets) {
              if (norm(a.title).includes(pn) && !mTitles.includes(a.title)) mTitles.push(a.title);
            }
          }
        }
        // Deduplicate
        mTitles = [...new Set(mTitles)];

        for (const mt of mTitles) {
          summary.materialsTotal++;
          const { item: dbA, method: mm, score: ms } = bestMatch(mt, assets);
          const mStatus = dbA ? (mm === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'FOUND') : 'NOT_FOUND';
          if (dbA) summary.matFound++; else summary.matMissing++;

          let action = 'NO_ACTION';
          if (dbA && dbL) {
            if ((dbA.lectureIds || []).includes(dbL.id)) { action = 'ALREADY_LINKED'; summary.relExist++; }
            else { action = 'WILL_LINK'; summary.relToAdd++; }
          } else if (!dbA) { action = 'MISSING_ASSET'; }

          auditMats.push({ target: mt, status: mStatus, method: mm, score: ms,
            dbId: dbA?.id || null, dbTitle: dbA?.title || null,
            currentLectureIds: dbA?.lectureIds || [], action });
        }
      }

      // Match homework/labs
      const auditHw = [];
      if (!pl.lectureOnlyMove) {
        for (const ht of (pl.hw || [])) {
          summary.hwTotal++;
          const { item: dbA, method: hm, score: hs } = bestMatch(ht, assets);
          const hwStatus = dbA ? (hm === 'REVIEW_REQUIRED' ? 'REVIEW_REQUIRED' : 'FOUND') : 'NOT_FOUND';
          if (dbA) summary.hwFound++; else summary.hwMissing++;

          let action = 'NO_ACTION';
          if (dbA && dbL) {
            if ((dbA.lectureIds || []).includes(dbL.id)) { action = 'ALREADY_LINKED'; summary.relExist++; }
            else { action = 'WILL_LINK'; summary.relToAdd++; }
          } else if (!dbA) { action = 'MISSING_ASSET'; }

          auditHw.push({ target: ht, status: hwStatus, method: hm, score: hs,
            dbId: dbA?.id || null, dbTitle: dbA?.title || null,
            currentLectureIds: dbA?.lectureIds || [], action });
        }
      }

      auditLects.push({
        targetTitle: pl.title, exactDBTitle: pl.exactDBTitle || null,
        order: pl.order, status, matchMethod: method, matchScore: score,
        dbId: dbL?.id || null, dbTitle: dbL?.title || null,
        currentModule: curMod, moduleAction,
        lectureOnlyMove: !!pl.lectureOnlyMove,
        preserveExisting: !!pl.preserve,
        materials: auditMats,
        homework: auditHw,
      });
    }

    auditModules.push({
      name: pm.name, order: pm.order, status: modStatus,
      dbId: existMod?.id || null, dbName: existMod?.name || null,
      lectures: auditLects,
    });
  }

  const unmatched = lectures.filter(l => !usedLectIds.has(l.id));

  // ── Safety gate ───────────────────────────────────────────────────
  const blocked = summary.reviewRequired > 0 || summary.notFound > 0;
  const verdict = blocked ? 'BLOCKED_WITH_ISSUES' : 'SAFE_TO_APPLY';

  const report = {
    generated: new Date().toISOString(),
    diplomaId,
    verdict,
    blockers: {
      reviewRequired: summary.reviewRequired,
      notFound:       summary.notFound,
    },
    summary: {
      ...summary,
      dbLectures: lectures.length,
      dbAssets:   assets.length,
      dbModules:  modules.length,
      unmatchedLectures: unmatched.length,
    },
    unmatchedLectures: unmatched.map(l => ({ id: l.id, title: l.title,
      moduleIds: l.moduleIds || [], createdAt: l.createdAt?.toDate?.()?.toISOString() || null })),
    modules: auditModules,
    // Raw DB dumps for cross-check
    _raw: {
      lectures: lectures.map(l => ({
        id: l.id, title: l.title, moduleIds: l.moduleIds || [],
        diplomaIds: l.diplomaIds || [], order: l.order || null,
        createdAt: l.createdAt?.toDate?.()?.toISOString() || null,
      })),
      assets: assets.map(a => ({
        id: a.id, title: a.title, type: a.type || null,
        lectureIds: a.lectureIds || [], moduleIds: a.moduleIds || [],
        diplomaIds: a.diplomaIds || [], status: a.status || null,
      })),
      modules: modules.map(m => ({
        id: m.id, name: m.name, order: m.order || null,
        diplomaId: m.diplomaId, source: m.source || null,
      })),
    },
  };

  // ── Write output ──────────────────────────────────────────────────
  const outDir  = resolve(root, 'curriculum_audit');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'strict_audit_live.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');

  console.log('\n' + '═'.repeat(60));
  console.log(`VERDICT: ${verdict}`);
  console.log('═'.repeat(60));
  console.log(`Lectures:   ${summary.found} found / ${summary.notFound} NOT_FOUND / ${summary.reviewRequired} REVIEW`);
  console.log(`Materials:  ${summary.matFound} found / ${summary.matMissing} missing`);
  console.log(`Homework:   ${summary.hwFound} found / ${summary.hwMissing} missing`);
  console.log(`Rel to add: ${summary.relToAdd} (${summary.relExist} already exist)`);
  console.log(`Unmatched:  ${unmatched.length} DB lectures not in plan`);
  console.log(`\n📄 Report written to: ${outPath}`);
  if (blocked) {
    console.log('\n⛔ APPLY BLOCKED. Resolve all REVIEW_REQUIRED and NOT_FOUND items first.');
  } else {
    console.log('\n✅ SAFE_TO_APPLY — all items resolved. Proceed with Apply Migration.');
  }
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e); process.exit(1); });
