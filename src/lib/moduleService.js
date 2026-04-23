import { db } from './firebase';
import { doc, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore';

/**
 * Create a module within a diploma
 */
export const createModule = async (diplomaId, name, order = 1) => {
  try {
    const modulesRef = collection(db, 'modules');
    const docRef = await addDoc(modulesRef, {
      diplomaId,
      name,
      order,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating module:', error);
    return null;
  }
};

/**
 * Get all modules for a diploma, sorted by order
 */
export const getModulesByDiploma = async (diplomaId) => {
  try {
    const modulesRef = collection(db, 'modules');
    const q = query(modulesRef, where('diplomaId', '==', diplomaId));
    const snapshot = await getDocs(q);
    const modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return modules.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting modules:', error);
    return [];
  }
};

/**
 * Get a single module by ID
 */
export const getModuleById = async (id) => {
  try {
    const moduleRef = doc(db, 'modules', id);
    const moduleDoc = await getDoc(moduleRef);
    if (moduleDoc.exists()) {
      return { id: moduleDoc.id, ...moduleDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting module:', error);
    return null;
  }
};

/**
 * Update a module
 */
export const updateModule = async (id, data) => {
  try {
    const moduleRef = doc(db, 'modules', id);
    await updateDoc(moduleRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating module:', error);
    return false;
  }
};

/**
 * Delete a module
 */
export const deleteModule = async (id) => {
  try {
    const moduleRef = doc(db, 'modules', id);
    await deleteDoc(moduleRef);
    return true;
  } catch (error) {
    console.error('Error deleting module:', error);
    return false;
  }
};

/**
 * Hard-delete a module ONLY if it has no lectures
 */
export const deleteModuleSafe = async (id) => {
  try {
    // 1. Check lectures
    const lecturesRef = collection(db, 'lectures');
    const lecturesQuery = query(lecturesRef, where('moduleId', '==', id));
    const lectureDocs = await getDocs(lecturesQuery);
    if (!lectureDocs.empty) {
      return { success: false, error: `Cannot delete: This module contains ${lectureDocs.size} lecture(s). Please delete them first.` };
    }

    // 2. Clean up assignments
    const assignmentsRef = collection(db, 'assignments');
    const assignQuery = query(assignmentsRef, where('targetId', '==', id));
    const assignDocs = await getDocs(assignQuery);
    
    // If safe, delete
    const moduleRef = doc(db, 'modules', id);
    
    const { writeBatch } = await import('firebase/firestore');
    const batch = writeBatch(db);
    assignDocs.forEach(d => batch.delete(d.ref));
    batch.delete(moduleRef);
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error safe deleting module:', error);
    return { success: false, error: error.message };
  }
};
