import { db } from './firebase';
import { doc, collection, getDocs, setDoc, getDoc, updateDoc, addDoc, deleteDoc, serverTimestamp, query, where, Timestamp } from 'firebase/firestore';

import { getDashboardContent } from './auth';

/**
 * DYNAMIC LABS (Now from Homework)
 */
export const getHomeworkLabs = async () => {
  try {
    const content = await getDashboardContent();
    return content.homeworks || [];
  } catch (error) {
    console.error('Error getting homework labs:', error);
    return [];
  }
};

/**
 * CAMPAIGNS
 */
export const createCampaign = async (campaignData) => {
  try {
    const campaignsRef = collection(db, 'progress_campaigns');
    await addDoc(campaignsRef, {
      ...campaignData,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error creating campaign:', error);
    return false;
  }
};

export const getCampaigns = async () => {
  try {
    const campaignsRef = collection(db, 'progress_campaigns');
    const snapshot = await getDocs(campaignsRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting campaigns:', error);
    return [];
  }
};

export const updateCampaign = async (id, updatedData) => {
  try {
    const campaignRef = doc(db, 'progress_campaigns', id);
    await updateDoc(campaignRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating campaign:', error);
    return false;
  }
};

export const deleteCampaign = async (id) => {
  try {
    const campaignRef = doc(db, 'progress_campaigns', id);
    await deleteDoc(campaignRef);
    return true;
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return false;
  }
};

/**
 * STUDENT PROGRESS
 */
export const getStudentProgress = async (email) => {
  try {
    if (!email) return null;
    const progressRef = doc(db, 'student_progress', email);
    const progressDoc = await getDoc(progressRef);
    
    if (progressDoc.exists()) {
      return progressDoc.data();
    }
    // Return empty state
    return {
      email,
      labs: {}, // { labId: { status, completionDate, score, delay } }
      progressPercent: 0,
      completedCount: 0
    };
  } catch (error) {
    console.error('Error getting student progress:', error);
    return null;
  }
};

export const updateLabStatus = async (email, labId, status, score = null) => {
  try {
    const progressRef = doc(db, 'student_progress', email);
    const progressDoc = await getDoc(progressRef);
    
    let data = progressDoc.exists() ? progressDoc.data() : { email, labs: {} };
    
    let completionDate = null;
    let delay = 0;
    
    if (status === 'Completed' || status === 'Submitted') {
      completionDate = new Date().toISOString();
    }
    
    // Preserve old completion date if going from Submitted -> Completed
    if (status === 'Completed' && data.labs[labId]?.completionDate) {
      completionDate = data.labs[labId].completionDate;
    }
    
    data.labs[labId] = {
      ...data.labs[labId],
      status,
      completionDate,
      score: score !== null ? score : data.labs[labId]?.score || null,
      delay,
      updatedAt: new Date().toISOString()
    };
    
    // Recalculate percent and completed count dynamically against all labs
    const labsCollection = await getHomeworkLabs();
    const totalLabs = labsCollection.length || 1; // avoid division by zero
    
    // Completed labs metric typically only counts fully 'Completed', but 'Submitted' might partially count. We will only count 'Completed' directly.
    const completedLabs = Object.values(data.labs).filter(l => l.status === 'Completed').length;
    data.completedCount = completedLabs;
    data.progressPercent = Math.round((completedLabs / totalLabs) * 100);
    
    await setDoc(progressRef, data);
    return true;
  } catch (error) {
    console.error('Error updating lab status:', error);
    return false;
  }
};

export const getAllStudentsProgress = async () => {
  try {
    const progressRef = collection(db, 'student_progress');
    const snapshot = await getDocs(progressRef);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all student progress:', error);
    return [];
  }
};

export const getLeaderboard = async () => {
  try {
    const allProgress = await getAllStudentsProgress();
    // Sort by completed count, then by progress percent (descending)
    return allProgress
      .sort((a, b) => b.completedCount - a.completedCount || b.progressPercent - a.progressPercent)
      .slice(0, 5);
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
};
