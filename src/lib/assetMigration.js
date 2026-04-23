import { db } from './firebase';
import { collection, getDocs, doc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { getDashboardContent } from './auth';

/**
 * Smart migration that extracts embedded content arrays from lectures
 * and flat content from dashboard into the new relational architecture.
 * Supports a dry-run mode for auditing before execution.
 */
export const runAssetMigration = async (dryRun = false) => {
  try {
    const batch = writeBatch(db);
    let migratedAssetsCount = 0;
    let migratedLecturesCount = 0;
    const report = {
      assetsExtractedFromLectures: 0,
      assetsExtractedFromDashboard: 0,
      lecturesExtractedFromDashboard: 0,
      actions: []
    };
    
    // 1. Migrate Embedded Arrays in Lectures
    const lecturesRef = collection(db, 'lectures');
    const lectureDocs = await getDocs(lecturesRef);
    
    for (const lectureDoc of lectureDocs.docs) {
      const lectureId = lectureDoc.id;
      const data = lectureDoc.data();
      const diplomaIds = data.diplomaIds || (data.diplomaId ? [data.diplomaId] : []);
      const moduleIds = data.moduleIds || (data.moduleId ? [data.moduleId] : []);
      
      const createAssetFromLegacy = (item, type) => {
        const newRef = doc(collection(db, 'lectureAssets'));
        const payload = {
          type,
          title: item.title || '',
          description: item.description || '',
          lectureIds: [lectureId],
          moduleIds,
          diplomaIds,
          migrated: true,
          migratedFrom: 'lecture_embedded',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        if (['material', 'link', 'homework'].includes(type)) payload.url = item.url || '';
        if (type === 'material') payload.fileType = item.type || 'PDF';
        if (type === 'homework') {
          payload.dueDate = item.dueDate || '';
          payload.category = item.category || 'Python';
        }
        if (type === 'note') payload.content = item.content || '';
        if (type === 'tip') payload.videoUrl = item.videoUrl || '';
        
        if (!dryRun) batch.set(newRef, payload);
        migratedAssetsCount++;
        report.assetsExtractedFromLectures++;
        report.actions.push(`Extract ${type} '${payload.title}' from lecture '${data.title}'`);
      };

      if (data.materials) data.materials.forEach(m => createAssetFromLegacy(m, 'material'));
      if (data.links) data.links.forEach(l => createAssetFromLegacy(l, 'link'));
      if (data.homeworks) data.homeworks.forEach(h => createAssetFromLegacy(h, 'homework'));
      if (data.notes) data.notes.forEach(n => createAssetFromLegacy(n, 'note'));
      if (data.tips) data.tips.forEach(t => createAssetFromLegacy(t, 'tip'));
      
      // Also ensure moduleIds/diplomaIds are saved as arrays if they weren't
      if (!dryRun && (!data.moduleIds || !data.diplomaIds || data.materials || data.links)) {
        batch.update(lectureDoc.ref, {
          materials: [],
          links: [],
          homeworks: [],
          notes: [],
          tips: [],
          diplomaIds,
          moduleIds
        });
      }
    }

    // 2. Migrate Flat Content from Dashboard
    const dashboardContent = await getDashboardContent();
    if (dashboardContent) {
      
      // 2a. Extract isolated legacy lectures trapped in the dashboard
      if (dashboardContent.lectures && dashboardContent.lectures.length > 0) {
        for (const item of dashboardContent.lectures) {
          const newLectureRef = doc(collection(db, 'lectures'));
          const payload = {
            title: item.title || 'Legacy Lecture',
            description: item.description || '',
            url: item.url || '',
            duration: item.duration || '',
            date: item.date || '',
            videoSource: item.videoSource || 'youtube',
            diplomaIds: [], // Dashboard content is unassigned
            moduleIds: [],
            migrated: true,
            migratedFrom: 'dashboard_flat',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          if (!dryRun) batch.set(newLectureRef, payload);
          migratedLecturesCount++;
          report.lecturesExtractedFromDashboard++;
          report.actions.push(`Extract lecture '${payload.title}' from dashboard library`);
        }
      }

      // 2b. Extract isolated legacy assets trapped in the dashboard
      const createAssetFromDashboard = (item, type) => {
        const newRef = doc(collection(db, 'lectureAssets'));
        const payload = {
          type,
          title: item.title || '',
          description: item.description || '',
          lectureIds: [], // Unassigned
          moduleIds: [],
          diplomaIds: [],
          migrated: true,
          migratedFrom: 'dashboard_flat',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        if (['material', 'link', 'homework'].includes(type)) payload.url = item.url || '';
        if (type === 'material') payload.fileType = item.type || 'PDF';
        if (type === 'homework') {
          payload.dueDate = item.dueDate || '';
          payload.category = item.category || 'Python';
        }
        if (type === 'note') payload.content = item.content || '';
        if (type === 'tip') payload.videoUrl = item.videoUrl || '';
        
        if (!dryRun) batch.set(newRef, payload);
        migratedAssetsCount++;
        report.assetsExtractedFromDashboard++;
        report.actions.push(`Extract ${type} '${payload.title}' from dashboard library`);
      };

      if (dashboardContent.materials) dashboardContent.materials.forEach(m => createAssetFromDashboard(m, 'material'));
      if (dashboardContent.links) dashboardContent.links.forEach(l => createAssetFromDashboard(l, 'link'));
      if (dashboardContent.homeworks) dashboardContent.homeworks.forEach(h => createAssetFromDashboard(h, 'homework'));
      if (dashboardContent.notes) dashboardContent.notes.forEach(n => createAssetFromDashboard(n, 'note'));
      if (dashboardContent.tips) dashboardContent.tips.forEach(t => createAssetFromDashboard(t, 'tip'));
      
      // Update dashboard doc to indicate it was migrated
      if (!dryRun) {
        const dashboardRef = doc(db, 'content', 'dashboard');
        batch.update(dashboardRef, {
          migratedToAssets: true,
          migratedAt: new Date(),
          lectures: [],
          materials: [],
          links: [],
          homeworks: [],
          notes: [],
          tips: []
        });
      }
    }

    if (!dryRun) {
      await batch.commit();
    }
    
    return { 
      success: true, 
      dryRun,
      totalMigratedAssets: migratedAssetsCount,
      totalMigratedLectures: migratedLecturesCount,
      report
    };
  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
};
