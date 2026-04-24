import { db } from './firebase';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

const LEGACY_DIPLOMA_NAME = 'AI Mastery Group 2';

// ── Cache ──
let _legacyDiplomaIds = null; // Set<string> of diploma IDs that are legacy

/**
 * Check if a diploma is the legacy special-case.
 * Result is cached after first call.
 */
export const isLegacyDiploma = async (diplomaId) => {
  if (_legacyDiplomaIds !== null) {
    return _legacyDiplomaIds.has(diplomaId);
  }

  try {
    const diplomasRef = collection(db, 'diplomas');
    const snapshot = await getDocs(diplomasRef);
    _legacyDiplomaIds = new Set();
    snapshot.forEach((d) => {
      const data = d.data();
      if (data.name === LEGACY_DIPLOMA_NAME) {
        _legacyDiplomaIds.add(d.id);
      }
    });
    return _legacyDiplomaIds.has(diplomaId);
  } catch (error) {
    console.error('Error checking legacy diploma:', error);
    return false;
  }
};

/**
 * Extract a comparable timestamp from a record.
 * Priority: date string → createdAt → publishedAt → order → 0
 */
const getTimestamp = (item) => {
  // 1. Try the `date` string field (e.g. "2026-01-17" or "2025-12-09")
  if (item.date) {
    const parsed = new Date(item.date);
    if (!isNaN(parsed.getTime())) return parsed.getTime();
  }
  // 2. Try dueDate (homework items)
  if (item.dueDate) {
    const parsed = new Date(item.dueDate);
    if (!isNaN(parsed.getTime())) return parsed.getTime();
  }
  // 3. Try createdAt (Firestore Timestamp)
  if (item.createdAt?.seconds) return item.createdAt.seconds * 1000;
  if (item.createdAt?.toDate) return item.createdAt.toDate().getTime();
  // 4. Try publishedAt
  if (item.publishedAt?.seconds) return item.publishedAt.seconds * 1000;
  // 5. Use order as a rough proxy (lower order = earlier)
  if (item.order > 0) return item.order;
  return 0;
};

/**
 * Sort ascending by date (oldest first → newest last).
 */
const legacySort = (a, b) => getTimestamp(a) - getTimestamp(b);

/**
 * Get ALL lectures for a legacy diploma, flat (no module dependency).
 * Queries both `diplomaIds` array-contains AND legacy `diplomaId` field.
 * Deduplicates and sorts by order/createdAt.
 */
export const getLegacyLectures = async (diplomaId) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const map = new Map();

    // Query 1: diplomaIds array-contains
    const q1 = query(lecturesRef, where('diplomaIds', 'array-contains', diplomaId));
    const snap1 = await getDocs(q1);
    snap1.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));

    // Query 2: legacy diplomaId field
    const q2 = query(lecturesRef, where('diplomaId', '==', diplomaId));
    const snap2 = await getDocs(q2);
    snap2.forEach(d => { if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() }); });

    // Query 3: primaryDiplomaId field
    const q3 = query(lecturesRef, where('primaryDiplomaId', '==', diplomaId));
    const snap3 = await getDocs(q3);
    snap3.forEach(d => { if (!map.has(d.id)) map.set(d.id, { id: d.id, ...d.data() }); });

    // Filter out archived
    const all = Array.from(map.values()).filter(l => !l._archived);
    return all.sort(legacySort);
  } catch (error) {
    console.error('Error getting legacy lectures:', error);
    return [];
  }
};

/**
 * Get ALL materials for a legacy diploma, flat (no lecture dependency).
 */
export const getLegacyMaterials = async (diplomaId) => {
  try {
    const assetsRef = collection(db, 'lectureAssets');
    const q = query(assetsRef, where('diplomaIds', 'array-contains', diplomaId));
    const snap = await getDocs(q);
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.type === 'material');
    return all.sort(legacySort);
  } catch (error) {
    console.error('Error getting legacy materials:', error);
    return [];
  }
};

/**
 * Get ALL homework for a legacy diploma, flat (no lecture dependency).
 */
export const getLegacyHomework = async (diplomaId) => {
  try {
    const assetsRef = collection(db, 'lectureAssets');
    const q = query(assetsRef, where('diplomaIds', 'array-contains', diplomaId));
    const snap = await getDocs(q);
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.type === 'homework');
    return all.sort(legacySort);
  } catch (error) {
    console.error('Error getting legacy homework:', error);
    return [];
  }
};

/**
 * Get ALL links for a legacy diploma.
 */
export const getLegacyLinks = async (diplomaId) => {
  try {
    const assetsRef = collection(db, 'lectureAssets');
    const q = query(assetsRef, where('diplomaIds', 'array-contains', diplomaId));
    const snap = await getDocs(q);
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.type === 'link');
    return all.sort(legacySort);
  } catch (error) {
    console.error('Error getting legacy links:', error);
    return [];
  }
};

/**
 * Get ALL notes for a legacy diploma.
 */
export const getLegacyNotes = async (diplomaId) => {
  try {
    const assetsRef = collection(db, 'lectureAssets');
    const q = query(assetsRef, where('diplomaIds', 'array-contains', diplomaId));
    const snap = await getDocs(q);
    const all = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(a => a.type === 'note');
    return all.sort(legacySort);
  } catch (error) {
    console.error('Error getting legacy notes:', error);
    return [];
  }
};
