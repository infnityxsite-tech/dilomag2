import { db } from './firebase';
import { doc, getDoc, collection, getDocs, addDoc, updateDoc, serverTimestamp, query, where, writeBatch } from 'firebase/firestore';

/**
 * legacyInference.js — Intelligent Module Grouping for Legacy Content
 * 
 * Analyzes flat legacy content arrays from the `content/dashboard` document
 * and proposes logical module groupings based on keyword patterns in titles.
 * 
 * This script is NON-DESTRUCTIVE until explicitly approved.
 * It produces a dry-run report first, which must be reviewed by the admin.
 */

// ─── Keyword Patterns ────────────────────────────────────────────────
// Each entry defines a module name and the keywords that should match.
// Order matters: first match wins.
const MODULE_PATTERNS = [
  {
    name: 'Python Foundations',
    keywords: ['python', 'variable', 'loop', 'function', 'string', 'list', 'dict', 'tuple', 'oop', 'class', 'object', 'exception', 'file handling', 'basics', 'introduction to programming', 'syntax'],
  },
  {
    name: 'Data Analysis & Preprocessing',
    keywords: ['pandas', 'numpy', 'data analysis', 'data cleaning', 'preprocessing', 'csv', 'excel', 'dataframe', 'data manipulation', 'eda', 'exploratory', 'statistics', 'visualization', 'matplotlib', 'seaborn', 'plotly'],
  },
  {
    name: 'Machine Learning Fundamentals',
    keywords: ['machine learning', 'ml', 'regression', 'classification', 'clustering', 'decision tree', 'random forest', 'svm', 'knn', 'k-nearest', 'naive bayes', 'logistic regression', 'linear regression', 'model evaluation', 'cross validation', 'scikit', 'sklearn', 'feature engineering', 'overfitting', 'underfitting', 'train test', 'accuracy', 'precision', 'recall'],
  },
  {
    name: 'Deep Learning',
    keywords: ['deep learning', 'neural network', 'cnn', 'rnn', 'lstm', 'gru', 'transformer', 'attention', 'backpropagation', 'gradient', 'activation function', 'keras', 'tensorflow', 'pytorch', 'epoch', 'batch', 'optimizer', 'loss function', 'perceptron', 'dense layer', 'dropout', 'batch norm'],
  },
  {
    name: 'Computer Vision',
    keywords: ['computer vision', 'image', 'opencv', 'object detection', 'yolo', 'cnn', 'convolutional', 'image classification', 'segmentation', 'face detection', 'face recognition', 'transfer learning', 'resnet', 'vgg', 'augmentation', 'image processing'],
  },
  {
    name: 'Natural Language Processing',
    keywords: ['nlp', 'natural language', 'text', 'tokenization', 'stemming', 'lemmatization', 'word embedding', 'word2vec', 'bert', 'gpt', 'sentiment', 'text classification', 'ner', 'named entity', 'chatbot', 'language model'],
  },
  {
    name: 'Projects & Capstone',
    keywords: ['project', 'capstone', 'final', 'portfolio', 'deployment', 'flask', 'fastapi', 'streamlit', 'web app', 'api', 'production', 'demo'],
  },
];

// ─── Inference Engine ────────────────────────────────────────────────

/**
 * Classify a single content item into a module name based on title keywords.
 * Returns the matched module name, or 'General / Uncategorized' if no match.
 */
function inferModule(title) {
  if (!title) return 'General / Uncategorized';
  const lower = title.toLowerCase();
  
  for (const pattern of MODULE_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (lower.includes(keyword)) {
        return pattern.name;
      }
    }
  }
  
  return 'General / Uncategorized';
}

/**
 * Run a DRY-RUN analysis of the legacy content/dashboard document.
 * Returns a structured report of proposed module groupings.
 * NO DATABASE WRITES.
 */
export async function runInferenceDryRun(diplomaId) {
  try {
    // 1. Load legacy content
    const contentRef = doc(db, 'content', 'dashboard');
    const contentDoc = await getDoc(contentRef);
    
    if (!contentDoc.exists()) {
      return { success: false, error: 'No legacy content/dashboard document found.' };
    }
    
    const data = contentDoc.data();
    
    // 2. Classify each content item
    const proposedModules = {}; // moduleName -> { lectures: [], materials: [], homeworks: [], ... }
    
    const classify = (items, type) => {
      if (!items || !Array.isArray(items)) return;
      items.forEach(item => {
        const moduleName = inferModule(item.title);
        if (!proposedModules[moduleName]) {
          proposedModules[moduleName] = { lectures: [], materials: [], homeworks: [], links: [], notes: [], tips: [] };
        }
        proposedModules[moduleName][type].push({
          id: item.id,
          title: item.title,
          description: item.description || '',
          url: item.url || item.videoUrl || '',
          date: item.date || item.dueDate || '',
          originalType: type,
        });
      });
    };
    
    classify(data.lectures, 'lectures');
    classify(data.materials, 'materials');
    classify(data.homeworks, 'homeworks');
    classify(data.links, 'links');
    classify(data.notes, 'notes');
    classify(data.tips, 'tips');
    
    // 3. Build the report
    const report = Object.entries(proposedModules).map(([moduleName, contents]) => ({
      moduleName,
      lectureCount: contents.lectures.length,
      materialCount: contents.materials.length,
      homeworkCount: contents.homeworks.length,
      linkCount: contents.links.length,
      noteCount: contents.notes.length,
      tipCount: contents.tips.length,
      totalItems: contents.lectures.length + contents.materials.length + contents.homeworks.length + contents.links.length + contents.notes.length + contents.tips.length,
      items: contents,
    }));
    
    // Sort by total items descending
    report.sort((a, b) => b.totalItems - a.totalItems);
    
    return { 
      success: true, 
      report, 
      diplomaId,
      totalLegacyItems: report.reduce((sum, r) => sum + r.totalItems, 0),
      proposedModuleCount: report.length,
    };
  } catch (error) {
    console.error('Inference dry-run error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * APPLY the inference: create modules and lectures in Firestore.
 * This uses the approved report from the dry-run to create the actual structure.
 * 
 * @param {string} diplomaId — The diploma to attach modules to.
 * @param {Array} approvedReport — The report from runInferenceDryRun().
 */
export async function applyInference(diplomaId, approvedReport) {
  try {
    let modulesCreated = 0;
    let lecturesCreated = 0;
    let contentAttached = 0;
    
    for (let i = 0; i < approvedReport.length; i++) {
      const group = approvedReport[i];
      
      // 1. Create the module
      const moduleRef = await addDoc(collection(db, 'modules'), {
        diplomaId,
        name: group.moduleName,
        order: i + 1,
        createdAt: serverTimestamp(),
      });
      modulesCreated++;
      
      // 2. Create lectures from the grouped legacy lectures
      for (let j = 0; j < group.items.lectures.length; j++) {
        const legacyLecture = group.items.lectures[j];
        
        const lectureRef = await addDoc(collection(db, 'lectures'), {
          diplomaId,
          moduleId: moduleRef.id,
          title: legacyLecture.title,
          description: legacyLecture.description,
          url: legacyLecture.url,
          date: legacyLecture.date,
          order: j + 1,
          // Attach sub-content directly as embedded arrays (preserving legacy format)
          materials: [],
          homeworks: [],
          links: [],
          notes: [],
          tips: [],
          createdAt: serverTimestamp(),
        });
        lecturesCreated++;
      }
      
      // 3. Attach materials, homeworks, links, notes, tips as relational assignments
      // to the first lecture in the module (or to the module itself if no lectures)
      const targetId = moduleRef.id; // Attach to module level for now
      
      const attachItems = async (items, contentType) => {
        for (const item of items) {
          await addDoc(collection(db, 'contentItems'), {
            contentType,
            title: item.title,
            description: item.description,
            url: item.url,
            createdAt: serverTimestamp(),
          }).then(async (contentRef) => {
            await addDoc(collection(db, 'assignments'), {
              contentId: contentRef.id,
              targetId,
              targetType: 'module',
              createdAt: serverTimestamp(),
            });
          });
          contentAttached++;
        }
      };
      
      await attachItems(group.items.materials, 'material');
      await attachItems(group.items.homeworks, 'homework');
      await attachItems(group.items.links, 'link');
      await attachItems(group.items.notes, 'note');
      await attachItems(group.items.tips, 'tip');
    }
    
    return {
      success: true,
      stats: { modulesCreated, lecturesCreated, contentAttached },
    };
  } catch (error) {
    console.error('Inference apply error:', error);
    return { success: false, error: error.message };
  }
}
