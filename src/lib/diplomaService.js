import { db } from './firebase';
import { doc, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';

/**
 * Create a new diploma/class
 */
export const createDiploma = async (name, description = '') => {
  try {
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const diplomasRef = collection(db, 'diplomas');
    const docRef = await addDoc(diplomasRef, {
      name,
      slug,
      description,
      status: 'active',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating diploma:', error);
    return null;
  }
};

/**
 * Get all diplomas (active only by default)
 */
export const getDiplomas = async (includeArchived = false) => {
  try {
    const diplomasRef = collection(db, 'diplomas');
    const snapshot = await getDocs(diplomasRef);
    const diplomas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (!includeArchived) {
      return diplomas.filter(d => d.status !== 'archived');
    }
    return diplomas;
  } catch (error) {
    console.error('Error getting diplomas:', error);
    return [];
  }
};

/**
 * Get a single diploma by ID
 */
export const getDiplomaById = async (id) => {
  try {
    const diplomaRef = doc(db, 'diplomas', id);
    const diplomaDoc = await getDoc(diplomaRef);
    if (diplomaDoc.exists()) {
      return { id: diplomaDoc.id, ...diplomaDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting diploma:', error);
    return null;
  }
};

/**
 * Update a diploma
 */
export const updateDiploma = async (id, data) => {
  try {
    const diplomaRef = doc(db, 'diplomas', id);
    await updateDoc(diplomaRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating diploma:', error);
    return false;
  }
};

/**
 * Soft-delete a diploma (set status to archived)
 */
export const archiveDiploma = async (id) => {
  try {
    const diplomaRef = doc(db, 'diplomas', id);
    await updateDoc(diplomaRef, {
      status: 'archived',
      archivedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error archiving diploma:', error);
    return false;
  }
};

/**
 * Hard-delete a diploma ONLY if it has no dependencies
 * (no students enrolled, no modules, no lectures, no evaluations)
 */
export const deleteDiplomaSafe = async (id) => {
  try {
    // 1. Check students
    const studentsRef = collection(db, 'authorizedEmails');
    const studentQuery = query(studentsRef, where('classIds', 'array-contains', id));
    const studentDocs = await getDocs(studentQuery);
    if (!studentDocs.empty) {
      return { success: false, error: `Cannot delete: ${studentDocs.size} student(s) are enrolled in this diploma.` };
    }

    // 2. Check modules
    const modulesRef = collection(db, 'modules');
    const modulesQuery = query(modulesRef, where('diplomaId', '==', id));
    const moduleDocs = await getDocs(modulesQuery);
    if (!moduleDocs.empty) {
      return { success: false, error: `Cannot delete: This diploma contains ${moduleDocs.size} module(s). Please delete them first.` };
    }

    // 3. Check lectures
    const lecturesRef = collection(db, 'lectures');
    const lecturesQuery = query(lecturesRef, where('diplomaId', '==', id));
    const lectureDocs = await getDocs(lecturesQuery);
    if (!lectureDocs.empty) {
      return { success: false, error: `Cannot delete: This diploma contains ${lectureDocs.size} lecture(s). Please delete them first.` };
    }

    // 4. Clean up assignments
    const assignmentsRef = collection(db, 'assignments');
    const assignQuery = query(assignmentsRef, where('targetId', '==', id));
    const assignDocs = await getDocs(assignQuery);
    
    // If safe, delete
    const diplomaRef = doc(db, 'diplomas', id);
    
    // Batch delete assignments and diploma
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    assignDocs.forEach(d => batch.delete(d.ref));
    batch.delete(diplomaRef);
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error safe deleting diploma:', error);
    return { success: false, error: error.message };
  }
};
