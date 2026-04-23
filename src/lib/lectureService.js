import { db } from './firebase';
import { doc, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { notifyStudentsForContent } from './notificationService';

/**
 * Create a lecture with multi-diploma and multi-module support
 */
export const createLecture = async (lectureData, { diplomaIds = [], moduleIds = [] } = {}) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const docRef = await addDoc(lecturesRef, {
      title: lectureData.title || '',
      description: lectureData.description || '',
      url: lectureData.url || '',
      duration: lectureData.duration || '',
      date: lectureData.date || '',
      order: lectureData.order || 1,
      // Store arrays for many-to-many relationships
      diplomaIds,
      moduleIds,
      // Keep primary ids for backwards compatibility if needed
      primaryDiplomaId: diplomaIds[0] || null,
      primaryModuleId: moduleIds[0] || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Notify students enrolled in these diplomas
    if (diplomaIds.length > 0 && lectureData.title) {
      // Fire and forget
      notifyStudentsForContent(diplomaIds, lectureData.title, 'Lecture').catch(console.error);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating lecture:', error);
    return null;
  }
};

/**
 * Get all lectures for a module
 */
export const getLecturesByModule = async (moduleId) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    // Using array-contains for N:M mapping
    const q = query(lecturesRef, where('moduleIds', 'array-contains', moduleId));
    const snapshot = await getDocs(q);
    const lectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fallback: Also query primaryModuleId/moduleId for unmigrated legacy lectures
    const legacyQ = query(lecturesRef, where('moduleId', '==', moduleId));
    const legacySnapshot = await getDocs(legacyQ);
    const legacyLectures = legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Merge and deduplicate
    const allLecturesMap = new Map();
    [...legacyLectures, ...lectures].forEach(l => {
      allLecturesMap.set(l.id, l);
    });

    return Array.from(allLecturesMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting lectures by module:', error);
    return [];
  }
};

/**
 * Get all lectures for a diploma
 */
export const getLecturesByDiploma = async (diplomaId) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const q = query(lecturesRef, where('diplomaIds', 'array-contains', diplomaId));
    const snapshot = await getDocs(q);
    const lectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Fallback: Also query primaryDiplomaId/diplomaId for unmigrated legacy lectures
    const legacyQ = query(lecturesRef, where('diplomaId', '==', diplomaId));
    const legacySnapshot = await getDocs(legacyQ);
    const legacyLectures = legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Merge and deduplicate
    const allLecturesMap = new Map();
    [...legacyLectures, ...lectures].forEach(l => {
      allLecturesMap.set(l.id, l);
    });

    return Array.from(allLecturesMap.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting lectures by diploma:', error);
    return [];
  }
};

/**
 * Get all lectures
 */
export const getAllLectures = async () => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const snapshot = await getDocs(lecturesRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all lectures:', error);
    return [];
  }
};

/**
 * Get a single lecture by ID
 */
export const getLectureById = async (id) => {
  try {
    const lectureRef = doc(db, 'lectures', id);
    const lectureDoc = await getDoc(lectureRef);
    if (lectureDoc.exists()) {
      return { id: lectureDoc.id, ...lectureDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting lecture:', error);
    return null;
  }
};

/**
 * Update a lecture (metadata + assignment arrays)
 */
export const updateLecture = async (id, data) => {
  try {
    const lectureRef = doc(db, 'lectures', id);
    const docSnap = await getDoc(lectureRef);
    if (!docSnap.exists()) return false;
    
    const oldData = docSnap.data();
    const oldDiplomaIds = oldData.diplomaIds || [];
    
    await updateDoc(lectureRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    
    // Check if new diplomas were added
    if (data.diplomaIds !== undefined) {
      const newDiplomas = data.diplomaIds.filter(did => !oldDiplomaIds.includes(did));
      if (newDiplomas.length > 0 && (data.title || oldData.title)) {
        // Notify ONLY the new diplomas
        notifyStudentsForContent(newDiplomas, data.title || oldData.title, 'Lecture').catch(console.error);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating lecture:', error);
    return false;
  }
};

/**
 * Delete a lecture
 */
export const deleteLecture = async (id) => {
  try {
    const lectureRef = doc(db, 'lectures', id);
    await deleteDoc(lectureRef);
    return true;
  } catch (error) {
    console.error('Error deleting lecture:', error);
    return false;
  }
};

/**
 * Hard-delete a lecture and its legacy assignments
 */
export const deleteLectureSafe = async (id) => {
  try {
    // Clean up assignments pointing to this lecture (legacy)
    const assignmentsRef = collection(db, 'assignments');
    const assignQuery = query(assignmentsRef, where('targetId', '==', id));
    const assignDocs = await getDocs(assignQuery);
    
    const sourceAssignQuery = query(assignmentsRef, where('contentId', '==', id));
    const sourceAssignDocs = await getDocs(sourceAssignQuery);

    const lectureRef = doc(db, 'lectures', id);
    
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    
    assignDocs.forEach(d => batch.delete(d.ref));
    sourceAssignDocs.forEach(d => batch.delete(d.ref));
    batch.delete(lectureRef);
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error safe deleting lecture:', error);
    return { success: false, error: error.message };
  }
};
