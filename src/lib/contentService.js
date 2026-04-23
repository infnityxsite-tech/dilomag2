import { db } from './firebase';
import { 
  doc, 
  collection, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';

/**
 * ==========================================
 * CONTENT ITEMS CRUD
 * ==========================================
 */

export const createContentItem = async (data) => {
  try {
    const itemsRef = collection(db, 'contentItems');
    const docRef = await addDoc(itemsRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating content item:', error);
    return { success: false, error: error.message };
  }
};

export const updateContentItem = async (id, data) => {
  try {
    const itemRef = doc(db, 'contentItems', id);
    await updateDoc(itemRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating content item:', error);
    return { success: false, error: error.message };
  }
};

export const deleteContentItemSafe = async (id) => {
  try {
    // Check assignments
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('contentId', '==', id));
    const snapshot = await getDocs(q);
    
    // Use a batch to delete all assignments and the item itself
    const batch = writeBatch(db);
    
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    const itemRef = doc(db, 'contentItems', id);
    batch.delete(itemRef);
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error safely deleting content item:', error);
    return { success: false, error: error.message };
  }
};

export const getAllContentItems = async () => {
  try {
    const itemsRef = collection(db, 'contentItems');
    const snapshot = await getDocs(itemsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting content items:', error);
    return [];
  }
};

/**
 * ==========================================
 * ASSIGNMENT MANAGEMENT
 * ==========================================
 */

export const assignContent = async (contentId, targetId, targetType) => {
  try {
    // Check if already assigned
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, 
      where('contentId', '==', contentId),
      where('targetId', '==', targetId)
    );
    const existing = await getDocs(q);
    if (!existing.empty) return { success: true }; // Already assigned

    await addDoc(assignmentsRef, {
      contentId,
      targetId,
      targetType,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error assigning content:', error);
    return { success: false, error: error.message };
  }
};

export const unassignContent = async (contentId, targetId) => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, 
      where('contentId', '==', contentId),
      where('targetId', '==', targetId)
    );
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error unassigning content:', error);
    return { success: false, error: error.message };
  }
};

export const getAssignmentsForContent = async (contentId) => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('contentId', '==', contentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting assignments for content:', error);
    return [];
  }
};

/**
 * Fetch all content items assigned to a specific target (e.g., a lecture)
 */
export const getContentForContext = async (targetId) => {
  try {
    const assignmentsRef = collection(db, 'assignments');
    const q = query(assignmentsRef, where('targetId', '==', targetId));
    const assignmentDocs = await getDocs(q);
    
    if (assignmentDocs.empty) return [];

    const contentIds = assignmentDocs.docs.map(d => d.data().contentId);
    
    // Fetch items individually using Promise.all to avoid the 'in' 30-item limit
    const itemPromises = contentIds.map(async (id) => {
      const docRef = doc(db, 'contentItems', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    });

    const items = await Promise.all(itemPromises);
    return items.filter(item => item !== null);
  } catch (error) {
    console.error('Error getting content for context:', error);
    return [];
  }
};
