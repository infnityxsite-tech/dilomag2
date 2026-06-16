/**
 * Learning Sheet Generator
 * Inspects curriculum (lectures, assets, modules) and builds a structured StudyPlan.
 * No hardcoded content — derives everything from Firestore data.
 */
import { db } from './firebase';
import { collection, getDocs, getDocsFromServer, query, where, orderBy } from 'firebase/firestore';
import { STRICT_PLAN } from './strictCurriculumPlan';

// ── Duration parser ─────────────────────────────────────────────────────────
// Handles: "45 min", "1h 30m", "120", "2:30", "45m", undefined
const parseDurationMinutes = (dur) => {
  if (!dur) return 30;
  if (typeof dur === 'number') return Math.max(5, dur);
  const s = String(dur).toLowerCase().trim();
  // h:mm or hh:mm
  const colonMatch = s.match(/^(\d+):(\d{2})$/);
  if (colonMatch) return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  let mins = 0;
  const hMatch = s.match(/(\d+)\s*h/);
  const mMatch = s.match(/(\d+)\s*m/);
  if (hMatch) mins += parseInt(hMatch[1]) * 60;
  if (mMatch) mins += parseInt(mMatch[1]);
  if (!hMatch && !mMatch) {
    const numOnly = s.match(/^(\d+)$/);
    if (numOnly) {
      const n = parseInt(numOnly[1]);
      mins = n > 5 ? n : n * 60; // treat small numbers as hours
    }
  }
  return Math.max(5, mins || 30);
};

// ── Step type helpers ────────────────────────────────────────────────────────
const makeStep = (overrides) => ({
  id: '',
  title: '',
  type: 'watch',
  lectureIds: [],
  materialIds: [],
  homeworkIds: [],
  externalTasks: [],
  checklist: [],
  order: 1,
  estimatedMinutes: 30,
  ...overrides,
});

// ── Main generator ───────────────────────────────────────────────────────────
/**
 * Generate a study plan by reading all curriculum data for a diploma.
 * @param {string} diplomaId
 * @param {string} diplomaName
 * @returns {Promise<StudyPlan>}
 */
export const generateStudyPlan = async (diplomaId, diplomaName) => {
  // 1. Fetch lectures
  const lecSnap = await getDocsFromServer(
    query(collection(db, 'lectures'), where('diplomaIds', 'array-contains', diplomaId))
  );
  const lectures = lecSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 2. Fetch modules
  const modSnap = await getDocs(
    query(collection(db, 'modules'), where('diplomaId', '==', diplomaId))
  );
  let modules = modSnap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  // If this diploma is covered by STRICT_PLAN, filter + reorder to plan modules only
  if (diplomaName === STRICT_PLAN.programName) {
    const planModules = STRICT_PLAN.modules;
    const planNameToOrder = new Map(planModules.map(m => [m.name.trim().toLowerCase(), m.order]));
    const filtered = modules.filter(m => planNameToOrder.has(m.name?.trim().toLowerCase()));
    if (filtered.length > 0) {
      // Reorder to match STRICT_PLAN order
      modules = filtered.sort((a, b) =>
        (planNameToOrder.get(a.name?.trim().toLowerCase()) ?? 99) -
        (planNameToOrder.get(b.name?.trim().toLowerCase()) ?? 99)
      );
    }
  }

  // 3. Fetch assets (materials, homework, labs)
  const assetSnap = await getDocs(
    query(collection(db, 'lectureAssets'), where('diplomaIds', 'array-contains', diplomaId))
  );
  const assets = assetSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const materials  = assets.filter(a => a.type === 'material');
  const homeworks  = assets.filter(a => a.type === 'homework');
  const tips       = assets.filter(a => a.type === 'tip');

  // 4. Helper: get assets linked to a lecture
  const lectureMaterials = (lecId) => materials.filter(m => m.lectureIds?.includes(lecId));
  const lectureHomeworks = (lecId) => homeworks.filter(h => h.lectureIds?.includes(lecId));
  const lectureTips      = (lecId) => tips.filter(t => t.lectureIds?.includes(lecId));

  // 5. Build plan modules
  const planModules = [];
  const assignedLectureIds = new Set();

  for (const mod of modules) {
    const modLectures = lectures
      .filter(l => l.moduleIds?.includes(mod.id) || l.moduleId === mod.id)
      .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

    if (modLectures.length === 0) continue;

    const steps = [];
    let stepOrder = 1;

    for (const lec of modLectures) {
      assignedLectureIds.add(lec.id);
      const lecMins = parseDurationMinutes(lec.duration);

      // Watch step
      steps.push(makeStep({
        id: `watch_${lec.id}`,
        title: `Watch: ${lec.title}`,
        type: 'watch',
        lectureIds: [lec.id],
        order: stepOrder++,
        estimatedMinutes: lecMins,
        checklist: lec.description ? [{ label: lec.description.slice(0, 120), url: null }] : [],
      }));

      // Read step — materials
      const mats = lectureMaterials(lec.id);
      if (mats.length > 0) {
        steps.push(makeStep({
          id: `read_${lec.id}`,
          title: `Read: ${lec.title} Materials`,
          type: 'read',
          lectureIds: [lec.id],
          materialIds: mats.map(m => m.id),
          order: stepOrder++,
          estimatedMinutes: Math.max(15, mats.length * 12),
          checklist: mats.map(m => ({ label: m.title, url: m.url || null })),
        }));
      }

      // Solve step — homework
      const hws = lectureHomeworks(lec.id);
      if (hws.length > 0) {
        steps.push(makeStep({
          id: `solve_${lec.id}`,
          title: `Solve: ${lec.title} Homework`,
          type: 'solve',
          lectureIds: [lec.id],
          homeworkIds: hws.map(h => h.id),
          order: stepOrder++,
          estimatedMinutes: Math.max(30, hws.length * 35),
          checklist: hws.map(h => ({ label: h.title, url: h.url || null })),
        }));
      }

      // Tips step — video shorts
      const ts = lectureTips(lec.id);
      if (ts.length > 0) {
        steps.push(makeStep({
          id: `tips_${lec.id}`,
          title: `Watch Shorts: ${lec.title}`,
          type: 'watch',
          lectureIds: [lec.id],
          order: stepOrder++,
          estimatedMinutes: Math.max(10, ts.length * 8),
          checklist: ts.map(t => ({ label: t.title, url: t.videoUrl || null })),
        }));
      }
    }

    // Revise step — always last in each module
    steps.push(makeStep({
      id: `revise_${mod.id}`,
      title: `Revise: ${mod.name}`,
      type: 'revise',
      lectureIds: modLectures.map(l => l.id),
      order: stepOrder++,
      estimatedMinutes: 30,
      checklist: [
        { label: 'Review key concepts from each lecture', url: null },
        { label: 'Re-watch any unclear sections', url: null },
        { label: 'Complete any skipped exercises', url: null },
      ],
      externalTasks: [
        { label: 'Search YouTube for extra explanations if needed', url: null },
        { label: 'Read supplementary documentation online', url: null },
      ],
    }));

    const totalModMins = steps.reduce((s, st) => s + st.estimatedMinutes, 0);

    planModules.push({
      id: `mod_${mod.id}`,
      sourceModuleId: mod.id,
      title: mod.name,
      objective: `Master ${mod.name} through structured video learning, reading, and practice exercises.`,
      estimatedDays: Math.max(1, Math.ceil(totalModMins / 120)), // 2 hrs/day
      steps,
    });
  }

  // 6. Handle unassigned lectures → "Additional Content" module
  const unassigned = lectures
    .filter(l => !assignedLectureIds.has(l.id))
    .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  if (unassigned.length > 0) {
    const steps = unassigned.map((lec, i) => makeStep({
      id: `watch_extra_${lec.id}`,
      title: `Watch: ${lec.title}`,
      type: 'watch',
      lectureIds: [lec.id],
      order: i + 1,
      estimatedMinutes: parseDurationMinutes(lec.duration),
    }));

    planModules.push({
      id: 'mod_extra',
      sourceModuleId: null,
      title: 'Additional Content',
      objective: 'Supplementary lectures and bonus material.',
      estimatedDays: 1,
      steps,
    });
  }

  const totalSteps   = planModules.reduce((s, m) => s + m.steps.length, 0);
  const totalMinutes = planModules.reduce((s, m) => m.steps.reduce((s2, st) => s2 + st.estimatedMinutes, s), 0);
  const totalDays    = planModules.reduce((s, m) => s + m.estimatedDays, 0);

  return {
    diplomaId,
    generatedBy: 'agent',
    title: `${diplomaName} — Learning Sheet`,
    version: 1,
    modules: planModules,
    meta: {
      totalSteps,
      totalMinutes,
      totalDays,
      lectureCount: lectures.length,
      moduleCount: planModules.length,
      generatedAt: new Date().toISOString(),
    },
  };
};
