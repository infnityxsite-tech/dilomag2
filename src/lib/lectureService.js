import { db } from './firebase';
import { doc, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { notifyStudentsForContent } from './notificationService';

/**
 * Create a lecture within a module
 */
export const createLecture = async (diplomaId, moduleId, lectureData) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const docRef = await addDoc(lecturesRef, {
      diplomaId,
      moduleId,
      title: lectureData.title || '',
      description: lectureData.description || '',
      url: lectureData.url || '',
      duration: lectureData.duration || '',
      date: lectureData.date || '',
      order: lectureData.order || 1,
      // Embedded relational sub-content
      materials: lectureData.materials || [],
      links: lectureData.links || [],
      tips: lectureData.tips || [],
      notes: lectureData.notes || [],
      homeworks: lectureData.homeworks || [],
      createdAt: serverTimestamp()
    });
    
    // Notify students enrolled in this diploma
    if (diplomaId) {
      // Intentionally not awaiting to avoid blocking the UI return
      notifyStudentsForContent([diplomaId], lectureData.title, 'Lecture');
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating lecture:', error);
    return null;
  }
};

/**
 * Get all lectures for a module (hierarchical + assigned)
 */
export const getLecturesByModule = async (moduleId) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const q = query(lecturesRef, where('moduleId', '==', moduleId));
    const snapshot = await getDocs(q);
    const hierarchicalLectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Fetch assigned lectures (N:M support)
    const assignmentsRef = collection(db, 'assignments');
    const assignQ = query(assignmentsRef, 
      where('targetId', '==', moduleId),
      where('sourceType', '==', 'lecture')
    );
    const assignSnap = await getDocs(assignQ);
    
    const assignedLectureIds = assignSnap.docs.map(d => d.data().contentId);
    let assignedLectures = [];
    if (assignedLectureIds.length > 0) {
      const itemPromises = assignedLectureIds.map(async (id) => {
        const docRef = doc(db, 'lectures', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
      });
      const resolved = await Promise.all(itemPromises);
      assignedLectures = resolved.filter(l => l !== null);
    }

    // Combine and deduplicate
    const allLecturesMap = new Map();
    [...hierarchicalLectures, ...assignedLectures].forEach(l => {
      allLecturesMap.set(l.id, l);
    });

    const finalLectures = Array.from(allLecturesMap.values());
    return finalLectures.sort((a, b) => (a.order || 0) - (b.order || 0));
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
    const q = query(lecturesRef, where('diplomaId', '==', diplomaId));
    const snapshot = await getDocs(q);
    const lectures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return lectures.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting lectures by diploma:', error);
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
 * Update a lecture (including all sub-content)
 */
export const updateLecture = async (id, data) => {
  try {
    const lectureRef = doc(db, 'lectures', id);
    await updateDoc(lectureRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
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

// ==============================
// Embedded sub-content helpers
// ==============================

/**
 * Add a material to a lecture's embedded materials array
 */
export const addLectureMaterial = async (lectureId, material) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const materials = data.materials || [];
    materials.push({ ...material, id: Date.now().toString() });
    
    await updateDoc(lectureRef, { materials, updatedAt: serverTimestamp() });
    
    // Notify students
    if (data.diplomaId && material.title) {
      notifyStudentsForContent([data.diplomaId], material.title, 'Material');
    }
    
    return true;
  } catch (error) {
    console.error('Error adding lecture material:', error);
    return false;
  }
};

/**
 * Remove a material from a lecture
 */
export const removeLectureMaterial = async (lectureId, materialId) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const materials = (data.materials || []).filter(m => m.id !== materialId);
    
    await updateDoc(lectureRef, { materials, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error removing lecture material:', error);
    return false;
  }
};

/**
 * Add a homework to a lecture
 */
export const addLectureHomework = async (lectureId, homework) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const homeworks = data.homeworks || [];
    homeworks.push({ ...homework, id: Date.now().toString() });
    
    await updateDoc(lectureRef, { homeworks, updatedAt: serverTimestamp() });

    // Notify students
    if (data.diplomaId && homework.title) {
      notifyStudentsForContent([data.diplomaId], homework.title, 'Homework Assignment');
    }

    return true;
  } catch (error) {
    console.error('Error adding lecture homework:', error);
    return false;
  }
};

/**
 * Remove a homework from a lecture
 */
export const removeLectureHomework = async (lectureId, homeworkId) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const homeworks = (data.homeworks || []).filter(h => h.id !== homeworkId);
    
    await updateDoc(lectureRef, { homeworks, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error removing lecture homework:', error);
    return false;
  }
};

/**
 * Add a link to a lecture
 */
export const addLectureLink = async (lectureId, link) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const links = data.links || [];
    links.push({ ...link, id: Date.now().toString() });
    
    await updateDoc(lectureRef, { links, updatedAt: serverTimestamp() });

    // Notify students
    if (data.diplomaId && link.title) {
      notifyStudentsForContent([data.diplomaId], link.title, 'Useful Link');
    }

    return true;
  } catch (error) {
    console.error('Error adding lecture link:', error);
    return false;
  }
};

/**
 * Remove a link from a lecture
 */
export const removeLectureLink = async (lectureId, linkId) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const links = (data.links || []).filter(l => l.id !== linkId);
    
    await updateDoc(lectureRef, { links, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error removing lecture link:', error);
    return false;
  }
};

/**
 * Add a tip to a lecture
 */
export const addLectureTip = async (lectureId, tip) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const tips = data.tips || [];
    tips.push({ ...tip, id: Date.now().toString() });
    
    await updateDoc(lectureRef, { tips, updatedAt: serverTimestamp() });

    // Notify students
    if (data.diplomaId && tip.title) {
      notifyStudentsForContent([data.diplomaId], tip.title, 'Pro Tip');
    }

    return true;
  } catch (error) {
    console.error('Error adding lecture tip:', error);
    return false;
  }
};

/**
 * Remove a tip from a lecture
 */
export const removeLectureTip = async (lectureId, tipId) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const tips = (data.tips || []).filter(t => t.id !== tipId);
    
    await updateDoc(lectureRef, { tips, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error removing lecture tip:', error);
    return false;
  }
};

/**
 * Add a note to a lecture
 */
export const addLectureNote = async (lectureId, note) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const notes = data.notes || [];
    notes.push({ ...note, id: Date.now().toString(), date: new Date().toLocaleDateString() });
    
    await updateDoc(lectureRef, { notes, updatedAt: serverTimestamp() });

    // Notify students
    if (data.diplomaId && note.title) {
      notifyStudentsForContent([data.diplomaId], note.title, 'Lecture Note');
    }

    return true;
  } catch (error) {
    console.error('Error adding lecture note:', error);
    return false;
  }
};

/**
 * Remove a note from a lecture
 */
export const removeLectureNote = async (lectureId, noteId) => {
  try {
    const lectureRef = doc(db, 'lectures', lectureId);
    const lectureDoc = await getDoc(lectureRef);
    if (!lectureDoc.exists()) return false;
    
    const data = lectureDoc.data();
    const notes = (data.notes || []).filter(n => n.id !== noteId);
    
    await updateDoc(lectureRef, { notes, updatedAt: serverTimestamp() });
    return true;
  } catch (error) {
    console.error('Error removing lecture note:', error);
    return false;
  }
};

/**
 * Hard-delete a lecture and its assignments
 */
export const deleteLectureSafe = async (id) => {
  try {
    // Clean up assignments pointing to this lecture
    const assignmentsRef = collection(db, 'assignments');
    const assignQuery = query(assignmentsRef, where('targetId', '==', id));
    const assignDocs = await getDocs(assignQuery);
    
    // Also clean up assignments where this lecture is the source (if it's assigned to other modules)
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
