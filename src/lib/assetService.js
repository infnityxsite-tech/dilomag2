import { db } from './firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { notifyStudentsForContent } from './notificationService';

const COLLECTION_NAME = 'lectureAssets';

/**
 * Create a new asset and optionally trigger notifications
 * @param {string} type - 'material' | 'homework' | 'link' | 'note' | 'tip'
 * @param {object} data - The asset payload
 * @param {object} assignments - { lectureIds: [], moduleIds: [], diplomaIds: [] }
 */
export const createAsset = async (type, data, { lectureIds = [], moduleIds = [], diplomaIds = [] } = {}) => {
  try {
    const assetsRef = collection(db, COLLECTION_NAME);
    const docRef = await addDoc(assetsRef, {
      ...data,
      type,
      lectureIds,
      moduleIds,
      diplomaIds,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Notify students
    if (diplomaIds.length > 0 && data.title && type !== 'note') {
      const typeDisplay = type.charAt(0).toUpperCase() + type.slice(1);
      // Fire and forget
      notifyStudentsForContent(diplomaIds, data.title, typeDisplay).catch(console.error);
    }
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating asset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update an existing asset
 */
export const updateAsset = async (id, data) => {
  try {
    const assetRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(assetRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating asset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete an asset
 */
export const deleteAsset = async (id) => {
  try {
    const assetRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(assetRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting asset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reassign an asset by updating its arrays and triggering notifications if visibility expands
 */
export const reassignAsset = async (id, { diplomaIds, moduleIds, lectureIds }) => {
  try {
    const assetRef = doc(db, COLLECTION_NAME, id);
    const docSnap = await getDoc(assetRef);
    if (!docSnap.exists()) throw new Error('Asset not found');
    
    const oldData = docSnap.data();
    const oldDiplomaIds = oldData.diplomaIds || [];
    
    const updates = { updatedAt: serverTimestamp() };
    if (diplomaIds !== undefined) updates.diplomaIds = diplomaIds;
    if (moduleIds !== undefined) updates.moduleIds = moduleIds;
    if (lectureIds !== undefined) updates.lectureIds = lectureIds;
    
    await updateDoc(assetRef, updates);
    
    // Check if new diplomas were added
    if (diplomaIds !== undefined) {
      const newDiplomas = diplomaIds.filter(id => !oldDiplomaIds.includes(id));
      if (newDiplomas.length > 0 && oldData.title && oldData.type !== 'note') {
        const typeDisplay = oldData.type.charAt(0).toUpperCase() + oldData.type.slice(1);
        // Notify ONLY the new diplomas
        notifyStudentsForContent(newDiplomas, oldData.title, typeDisplay).catch(console.error);
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error reassigning asset:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all assets for a specific lecture
 */
export const getAssetsForLecture = async (lectureId) => {
  try {
    const assetsRef = collection(db, COLLECTION_NAME);
    const q = query(assetsRef, where('lectureIds', 'array-contains', lectureId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting assets for lecture:', error);
    return [];
  }
};

/**
 * Get all assets for a specific module (direct assignment)
 */
export const getAssetsForModule = async (moduleId) => {
  try {
    const assetsRef = collection(db, COLLECTION_NAME);
    const q = query(assetsRef, where('moduleIds', 'array-contains', moduleId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting assets for module:', error);
    return [];
  }
};

/**
 * Get all assets of a certain type
 */
export const getAllAssetsByType = async (type) => {
  try {
    const assetsRef = collection(db, COLLECTION_NAME);
    const q = query(assetsRef, where('type', '==', type));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Error getting all assets for type ${type}:`, error);
    return [];
  }
};

/**
 * Get ALL assets
 */
export const getAllAssets = async () => {
  try {
    const assetsRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(assetsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all assets:', error);
    return [];
  }
};
