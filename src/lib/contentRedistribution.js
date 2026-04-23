import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';

// Basic string similarity (Jaccard index on words)
function getSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const s2 = str2.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  
  const intersection = s1.filter(word => s2.includes(word));
  const union = new Set([...s1, ...s2]);
  
  // Extra weight for exact numbers matching (e.g. "Lecture 2" matches "Homework 2")
  const num1 = str1.match(/\d+/g);
  const num2 = str2.match(/\d+/g);
  let numBonus = 0;
  if (num1 && num2 && num1.some(n => num2.includes(n))) {
    numBonus = 0.5; // High confidence bonus
  }
  
  return (intersection.length / (union.size || 1)) + numBonus;
}

export const runRedistributionDryRun = async (diplomaId) => {
  try {
    const lecturesRef = collection(db, 'lectures');
    const snapshot = await getDocs(lecturesRef);
    
    // Filter lectures by diploma
    const allLectures = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (!diplomaId || data.diplomaId === diplomaId) {
        allLectures.push({ id: doc.id, ...data });
      }
    });

    if (allLectures.length === 0) return { success: false, error: "No lectures found" };

    // Sort by order
    allLectures.sort((a, b) => a.order - b.order);

    // Assume the first lecture has all the dumped content
    // Actually, let's scan all lectures for content that might belong elsewhere
    const proposedMoves = [];
    
    for (const sourceLect of allLectures) {
      const categories = ['materials', 'homeworks', 'links', 'tips', 'notes'];
      
      for (const cat of categories) {
        const items = sourceLect[cat] || [];
        
        for (const item of items) {
          let bestMatch = null;
          let highestScore = 0;
          
          for (const targetLect of allLectures) {
            if (targetLect.id === sourceLect.id) continue;
            
            // Score based on title similarity
            let score = getSimilarity(item.title || item.name || '', targetLect.title);
            
            // Score based on date matching
            if (item.date && targetLect.date && item.date === targetLect.date) {
              score += 0.8;
            } else if (item.dueDate && targetLect.date && item.dueDate.includes(targetLect.date)) {
              score += 0.5;
            }
            
            if (score > highestScore) {
              highestScore = score;
              bestMatch = targetLect;
            }
          }
          
          // If we found a good match (threshold 0.4)
          if (bestMatch && highestScore >= 0.4) {
            proposedMoves.push({
              item,
              category: cat,
              sourceId: sourceLect.id,
              sourceTitle: sourceLect.title,
              targetId: bestMatch.id,
              targetTitle: bestMatch.title,
              confidence: highestScore > 0.8 ? 'High' : 'Medium'
            });
          }
        }
      }
    }
    
    return { success: true, moves: proposedMoves };
  } catch (error) {
    console.error("Dry run error:", error);
    return { success: false, error: error.message };
  }
};

export const applyRedistribution = async (moves) => {
  try {
    // Process moves per source/target to minimize writes
    // moves is an array from the dry run
    const updates = {}; // { lectureId: { category: [items] } }
    
    // Read all involved lectures first
    const lectureIds = [...new Set(moves.flatMap(m => [m.sourceId, m.targetId]))];
    const lectureData = {};
    
    for (const id of lectureIds) {
      const docSnap = await getDoc(doc(db, 'lectures', id));
      if (docSnap.exists()) {
        lectureData[id] = docSnap.data();
      }
    }
    
    // Apply moves to memory objects
    for (const move of moves) {
      const { item, category, sourceId, targetId } = move;
      
      // Remove from source
      if (lectureData[sourceId] && lectureData[sourceId][category]) {
        lectureData[sourceId][category] = lectureData[sourceId][category].filter(i => 
          (i.id && i.id !== item.id) || (i.title !== item.title)
        );
      }
      
      // Add to target
      if (lectureData[targetId]) {
        if (!lectureData[targetId][category]) lectureData[targetId][category] = [];
        lectureData[targetId][category].push(item);
      }
    }
    
    // Write back to Firestore
    let count = 0;
    for (const id of lectureIds) {
      if (lectureData[id]) {
        await updateDoc(doc(db, 'lectures', id), lectureData[id]);
        count++;
      }
    }
    
    return { success: true, count };
  } catch (error) {
    console.error("Apply error:", error);
    return { success: false, error: error.message };
  }
};
