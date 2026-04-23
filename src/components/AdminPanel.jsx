import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase'; // Import db from firebase
import { collection, getDocs } from 'firebase/firestore'; // Import firestore functions
import {
  getAuthorizedEmails,
  addAuthorizedStudent,
  removeAuthorizedEmail,
  getDashboardContent,
  updateDashboardContent,
  updateStudentEvaluation,
  addPartialScore, // Import the add partial score function
  deletePartialScore, // Import the delete partial score function
  deletePartialScoreFromAll, // Import the bulk delete function
  getAllFeedback,
  deleteSubmission,
  updateStudentClasses,
  getPendingStudents,
  approvePendingStudent,
  rejectPendingStudent
} from '../lib/auth';
import { getDiplomas, createDiploma, updateDiploma, archiveDiploma, deleteDiplomaSafe } from '../lib/diplomaService';
import { getModulesByDiploma, createModule, updateModule, deleteModuleSafe } from '../lib/moduleService';
import { getLecturesByDiploma, createLecture, updateLecture, deleteLectureSafe } from '../lib/lectureService';
import { getAllAssets, createAsset, deleteAsset, reassignAsset } from '../lib/assetService';
import { runMigration, isMigrationComplete } from '../lib/migrateLegacyData';
import { runAssetMigration } from '../lib/assetMigration';
import { runRedistributionDryRun, applyRedistribution } from '../lib/contentRedistribution';
import { runInferenceDryRun, applyInference } from '../lib/legacyInference';
import AdminContentStudio from './AdminContentStudio';
import GoogleDriveSync from './GoogleDriveSync';
import ContentLibraryTab from './ContentLibraryTab';
import AdminProgressCampaignTab from './AdminProgressCampaignTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  LogOut,
  Users,
  Video,
  FileText,
  ExternalLink,
  StickyNote,
  Plus,
  Trash2,
  Edit,
  Save,
  Shield,
  Settings,
  Database,
  Loader2,
  Cloud,
  Award, // New Icon for Evaluations
  Briefcase, // Icon for Submissions
  MessageSquare,
  Star,
  Upload, // NEW: Icon for bulk upload
  Calendar,
  Target,
  X,
  BookOpen,
  Download,
  Lightbulb, // NEW: Icon for Tips & Shorts
  GraduationCap,
  Layers,
  Play,
  Search,
  CheckCircle,
  UserCheck
} from 'lucide-react';
import Papa from 'papaparse'; // Import PapaParse

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('diplomas');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // Diploma management state
  const [diplomas, setDiplomas] = useState([]);
  const [newDiplomaName, setNewDiplomaName] = useState('');
  const [newDiplomaDesc, setNewDiplomaDesc] = useState('');
  const [selectedDiplomaId, setSelectedDiplomaId] = useState(null);
  const [diplomaModules, setDiplomaModules] = useState([]);
  const [diplomaLectures, setDiplomaLectures] = useState([]);
  const [newModuleName, setNewModuleName] = useState('');
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [assetMigrationRunning, setAssetMigrationRunning] = useState(false);
  const [migrationRunning, setMigrationRunning] = useState(false);
  
  // Enhanced evaluation dialog state
  const [isEvalDialogOpen, setIsEvalDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [currentEvaluation, setCurrentEvaluation] = useState(null);
  const [newPartialScore, setNewPartialScore] = useState({
    name: '',
    score: '',
    feedback: '' 
  });
  
  // Bulk CSV upload dialog state
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [bulkEvaluationName, setBulkEvaluationName] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  
  // Bulk delete dialog state
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkDeleteScoreName, setBulkDeleteScoreName] = useState('');
  
  const [submissions, setSubmissions] = useState([]); // New state for submissions
  const [feedback, setFeedback] = useState([]); // New state for feedback
  // Student management state
  const [authorizedEmails, setAuthorizedEmails] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newStudentClassIds, setNewStudentClassIds] = useState([]);
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [editingStudentClassIds, setEditingStudentClassIds] = useState([]);
  const [adminScopeDiplomaId, setAdminScopeDiplomaId] = useState('all'); // NEW: Diploma-scoped context
  const [pendingStudents, setPendingStudents] = useState([]);
  const [approvingStudentId, setApprovingStudentId] = useState(null);
  const [approvingStudentClassIds, setApprovingStudentClassIds] = useState([]);
  // Evaluations state
  const [evaluations, setEvaluations] = useState([]);
  
  // Content management state
  const [content, setContent] = useState({
    lectures: [],
    materials: [],
    links: [],
    notes: [],
    homeworks: [], // NEW: Add homeworks array
    tips: [] // NEW: Add tips array for Tips & Shorts
  });
  
  // Form states for adding new content
  const [newLecture, setNewLecture] = useState({ title: '', description: '', url: '', duration: '', date: '', videoSource: 'youtube' });
  const [newMaterial, setNewMaterial] = useState({ title: '', description: '', url: '', type: 'PDF' });
  
  // Redistribution states
  const [redistributionMoves, setRedistributionMoves] = useState([]);
  const [isRedistributing, setIsRedistributing] = useState(false);
  const [redistributionApplied, setRedistributionApplied] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', description: '', url: '' });
  const [newNote, setNewNote] = useState({ title: '', content: '', date: '' });
  const [newHomework, setNewHomework] = useState({ title: '', description: '', url: '', dueDate: '', category: 'Python' }); // NEW: Homework form state
  const [editingHomeworkId, setEditingHomeworkId] = useState(null);
  const [editHomeworkData, setEditHomeworkData] = useState(null);
  const [newTip, setNewTip] = useState({ title: '', description: '', videoUrl: '' }); // NEW: Tips form state

  // Inference state
  const [inferenceReport, setInferenceReport] = useState(null);
  const [inferenceRunning, setInferenceRunning] = useState(false);
  const [inferenceApplied, setInferenceApplied] = useState(false);

  const fileInputRef = useRef(null); // Ref for the hidden file input

  useEffect(() => {
    loadData();
    loadDiplomas();
    checkMigration();
  }, []);

  const checkMigration = async () => {
    const done = await isMigrationComplete();
    setMigrationStatus(done ? 'complete' : 'pending');
  };

  const handleRunMigration = async () => {
    if (!window.confirm('This will migrate all existing data to the new multi-diploma structure. Continue?')) return;
    setMigrationRunning(true);
    const result = await runMigration();
    if (result.success) {
      showMessage(result.skipped ? 'Migration already complete.' : `Migration successful! ${result.stats?.lecturesCreated || 0} lectures migrated.`);
      setMigrationStatus('complete');
      await loadDiplomas();
    } else {
      showMessage('Migration failed: ' + (result.error || 'Unknown error'), true);
    }
    setMigrationRunning(false);
  };

  const handleRunAssetMigration = async () => {
    if (!window.confirm('This will migrate all embedded lecture content into the new lectureAssets collection. Continue?')) return;
    try {
      setAssetMigrationRunning(true);
      const result = await runAssetMigration();
      if (result.success) {
        showMessage(`Successfully migrated ${result.count} content items to the new lectureAssets structure!`);
      } else {
        showMessage('Asset migration failed: ' + result.error, true);
      }
    } catch (error) {
      showMessage('Error running asset migration: ' + error.message, true);
    } finally {
      setAssetMigrationRunning(false);
    }
  };

  const loadDiplomas = async () => {
    const d = await getDiplomas(true);
    setDiplomas(d);
    if (d.length > 0 && !selectedDiplomaId) {
      setSelectedDiplomaId(d[0].id);
      await loadDiplomaContent(d[0].id);
    }
  };

  const loadDiplomaContent = async (diplomaId) => {
    if (!diplomaId) return;
    const mods = await getModulesByDiploma(diplomaId);
    const lects = await getLecturesByDiploma(diplomaId);
    setDiplomaModules(mods);
    setDiplomaLectures(lects);
  };

  const handleCreateDiploma = async (e) => {
    e.preventDefault();
    if (!newDiplomaName.trim()) return;
    setLoading(true);
    const id = await createDiploma(newDiplomaName, newDiplomaDesc);
    if (id) {
      showMessage('Diploma created!');
      setNewDiplomaName('');
      setNewDiplomaDesc('');
      await loadDiplomas();
    } else {
      showMessage('Failed to create diploma.', true);
    }
    setLoading(false);
  };

  const handleCreateModule = async (e) => {
    e.preventDefault();
    if (!newModuleName.trim() || !selectedDiplomaId) return;
    setLoading(true);
    const id = await createModule(selectedDiplomaId, newModuleName, diplomaModules.length + 1);
    if (id) {
      showMessage('Module created!');
      setNewModuleName('');
      await loadDiplomaContent(selectedDiplomaId);
    } else {
      showMessage('Failed to create module.', true);
    }
    setLoading(false);
  };

  const handleDeleteDiploma = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete the diploma "${name}"? This action cannot be undone.`)) {
      return;
    }
    setLoading(true);
    const result = await deleteDiplomaSafe(id);
    if (result.success) {
      showMessage(`Diploma "${name}" deleted successfully.`);
      if (selectedDiplomaId === id) setSelectedDiplomaId(null);
      await loadDiplomas();
    } else {
      showMessage(result.error, true);
    }
    setLoading(false);
  };

  const handleDeleteModule = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete the module "${name}"? This action cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteModuleSafe(id);
    if (result.success) {
      showMessage(`Module "${name}" deleted successfully.`);
      await loadDiplomaContent(selectedDiplomaId);
    } else {
      showMessage(result.error, true);
    }
    setLoading(false);
  };

  const handleDeleteLecture = async (id, title, e) => {
    e.stopPropagation();
    if (!window.confirm(`WARNING: Are you sure you want to permanently delete the lecture "${title}"? This action cannot be undone.`)) return;
    setLoading(true);
    const result = await deleteLectureSafe(id);
    if (result.success) {
      showMessage(`Lecture "${title}" deleted successfully.`);
      await loadDiplomaContent(selectedDiplomaId);
    } else {
      showMessage(result.error, true);
    }
    setLoading(false);
  };

  const handleSelectDiploma = async (id) => {
    setSelectedDiplomaId(id);
    await loadDiplomaContent(id);
  };

  const handleDryRunRedistribution = async () => {
    if (!selectedDiplomaId) return;
    setIsRedistributing(true);
    const result = await runRedistributionDryRun(selectedDiplomaId);
    if (result.success) {
      setRedistributionMoves(result.moves);
      if (result.moves.length === 0) {
        showMessage('No redistribution moves proposed. Everything looks good!');
      } else {
        showMessage(`Found ${result.moves.length} proposed content redistributions.`);
      }
    } else {
      showMessage('Error running dry run: ' + result.error, true);
    }
    setIsRedistributing(false);
  };

  const handleApplyRedistribution = async () => {
    if (!window.confirm(`Are you sure you want to apply these ${redistributionMoves.length} moves?`)) return;
    setIsRedistributing(true);
    const result = await applyRedistribution(redistributionMoves);
    if (result.success) {
      showMessage(`Successfully applied changes to ${result.count} lectures!`);
      setRedistributionMoves([]);
      setRedistributionApplied(true);
      await loadDiplomaContent(selectedDiplomaId);
    } else {
      showMessage('Error applying redistribution: ' + result.error, true);
    }
    setIsRedistributing(false);
  };

  // Inference handlers
  const handleRunInference = async () => {
    if (!selectedDiplomaId) return;
    setInferenceRunning(true);
    setInferenceReport(null);
    setInferenceApplied(false);
    const result = await runInferenceDryRun(selectedDiplomaId);
    if (result.success) {
      setInferenceReport(result);
      showMessage(`Inference complete: ${result.proposedModuleCount} modules proposed from ${result.totalLegacyItems} legacy items.`);
    } else {
      showMessage('Inference failed: ' + result.error, true);
    }
    setInferenceRunning(false);
  };

  const handleApplyInference = async () => {
    if (!inferenceReport || !selectedDiplomaId) return;
    if (!window.confirm('This will create the proposed modules and attach lectures to this diploma. Existing data will NOT be modified. Continue?')) return;
    setInferenceRunning(true);
    const result = await applyInference(selectedDiplomaId, inferenceReport.report);
    if (result.success) {
      showMessage(`Migration applied! ${result.stats.modulesCreated} modules, ${result.stats.lecturesCreated} lectures, ${result.stats.contentAttached} content items.`);
      setInferenceReport(null);
      setInferenceApplied(true);
      await loadDiplomaContent(selectedDiplomaId);
    } else {
      showMessage('Apply failed: ' + result.error, true);
    }
    setInferenceRunning(false);
  };

  // UPDATED: The loadData function now also fetches evaluations
const loadData = async () => {
  setLoading(true);
  try {
    const [emails, dashboardContent, evalsSnapshot, subsSnapshot, feedbackData, pendingStudentsData] = await Promise.all([
      getAuthorizedEmails(),
      getDashboardContent(),
      getDocs(collection(db, "evaluations")),
      getDocs(collection(db, "submissions")),
      getAllFeedback(), // Fetch feedback
      getPendingStudents()
    ]);

    setAuthorizedEmails(emails);
    setContent(dashboardContent);
    setPendingStudents(pendingStudentsData);

    const evalsData = evalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEvaluations(evalsData);

    const subsData = subsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setSubmissions(subsData);

    setFeedback(feedbackData); // Set feedback state

  } catch (error) {
    console.error('Error loading data:', error);
    setMessage('Error loading data. Please try again.');
  } finally {
    setLoading(false);
  }
};
  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Student management functions
  const handleAddEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) return;

    setLoading(true);
    const success = await addAuthorizedStudent(newEmail, newPassword, newStudentClassIds);
    if (success) {
      setNewEmail('');
      setNewPassword('');
      setNewStudentClassIds([]);
      await loadData();
      showMessage('Student added successfully!');
    } else {
      showMessage('Failed to add student. Please try again.', true);
    }
    setLoading(false);
  };

  const handleRemoveEmail = async (emailId) => {
    setLoading(true);
    const success = await removeAuthorizedEmail(emailId);
    if (success) {
      await loadData();
      showMessage('Email removed successfully!');
    } else {
      showMessage('Failed to remove email. Please try again.', true);
    }
    setLoading(false);
  };
  
  const handleUpdateStudentClasses = async (emailId) => {
    setLoading(true);
    const success = await updateStudentClasses(emailId, editingStudentClassIds);
    if (success) {
      await loadData();
      setEditingStudentId(null);
      showMessage('Student diplomas updated successfully!');
    } else {
      showMessage('Failed to update student diplomas. Please try again.', true);
    }
    setLoading(false);
  };
  
  const handleApproveStudent = async (pendingId, email) => {
    setLoading(true);
    const success = await approvePendingStudent(pendingId, email, approvingStudentClassIds);
    if (success) {
      await loadData();
      setApprovingStudentId(null);
      setApprovingStudentClassIds([]);
      showMessage('Student approved and assigned successfully!');
    } else {
      showMessage('Failed to approve student. Please try again.', true);
    }
    setLoading(false);
  };

  const handleRejectStudent = async (pendingId) => {
    if (!window.confirm("Are you sure you want to reject this request?")) return;
    setLoading(true);
    const success = await rejectPendingStudent(pendingId);
    if (success) {
      await loadData();
      showMessage('Student request rejected.');
    } else {
      showMessage('Failed to reject request. Please try again.', true);
    }
    setLoading(false);
  };
  
  // NEW: Enhanced function to open the evaluation dialog
  const handleEditEvaluation = (email) => {
    const student = authorizedEmails.find(e => e.email === email);
    const existingEval = evaluations.find(e => e.studentEmail === email);
    
    setCurrentStudent(student);
    setCurrentEvaluation(existingEval || {
      studentEmail: email,
      totalScore: 0,
      partialScores: []
    });
    setNewPartialScore({ name: '', score: '' });
    setIsEvalDialogOpen(true);
  };

const handleAddPartialScore = async (e) => {
    e.preventDefault();
    if (!newPartialScore.name || !newPartialScore.score) {
      showMessage('Please fill in both evaluation name and score.', true);
      return;
    }

    const score = parseFloat(newPartialScore.score);
    if (isNaN(score) || score < 0 || score > 100) {
      showMessage('Please enter a valid score between 0 and 100.', true);
      return;
    }

    setLoading(true);
    
    // UPDATED: Pass the new feedback text to the function
    const success = await addPartialScore(
      currentEvaluation.studentEmail, 
      newPartialScore.name, 
      score, 
      newPartialScore.feedback // Pass feedback from state
    );
    
    if (success) {
      await loadData();
      // Refresh current evaluation data after a short delay to ensure data consistency
      setTimeout(() => {
        const updatedEval = evaluations.find(e => e.studentEmail === currentEvaluation.studentEmail);
        setCurrentEvaluation(updatedEval || currentEvaluation);
      }, 500);
      
      // UPDATED: Reset the feedback field as well
      setNewPartialScore({ name: '', score: '', feedback: '' });
      showMessage('Partial score added successfully!');
    } else {
      showMessage('Failed to add partial score. Please try again.', true);
    }
    setLoading(false);
  };

  // NEW: Handle deleting a partial score
  const handleDeletePartialScore = async (partialScoreId) => {
    if (!window.confirm('Are you sure you want to delete this partial score?')) {
      return;
    }

    setLoading(true);
    const success = await deletePartialScore(currentEvaluation.studentEmail, partialScoreId);
    
    if (success) {
      await loadData();
      // Refresh current evaluation data
      const updatedEval = evaluations.find(e => e.studentEmail === currentEvaluation.studentEmail);
      setCurrentEvaluation(updatedEval || { ...currentEvaluation, partialScores: [] });
      showMessage('Partial score deleted successfully!');
    } else {
      showMessage('Failed to delete partial score. Please try again.', true);
    }
    setLoading(false);
  };

  // NEW: Handle bulk CSV upload
  const handleBulkUploadSubmit = async () => {
    if (!csvFile || !bulkEvaluationName.trim()) {
      showMessage('Please select a CSV file and enter an evaluation name.', true);
      return;
    }

    setLoading(true);
    
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        let successCount = 0;
        let errorCount = 0;

        for (const row of results.data) {
          const studentEmail = row.email;
          const scoreValue = parseFloat(row.score);

          if (studentEmail && !isNaN(scoreValue)) {
            const success = await addPartialScore(studentEmail, bulkEvaluationName, scoreValue);
            if (success) {
              successCount++;
            } else {
              errorCount++;
            }
          } else {
            errorCount++;
          }
        }
        
        await loadData();
        setLoading(false);
        setIsBulkUploadDialogOpen(false);
        setCsvFile(null);
        setBulkEvaluationName('');
        showMessage(`Bulk upload complete: ${successCount} scores added, ${errorCount} errors.`, errorCount > 0);
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        showMessage('Error parsing CSV file.', true);
        setLoading(false);
      },
    });
  };

  // NEW: Handle bulk delete
  const handleBulkDeleteSubmit = async () => {
    if (!bulkDeleteScoreName.trim()) {
      showMessage('Please enter the evaluation name to delete.', true);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${bulkDeleteScoreName}" from ALL students? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const result = await deletePartialScoreFromAll(bulkDeleteScoreName);
    
    if (result.success) {
      await loadData();
      setIsBulkDeleteDialogOpen(false);
      setBulkDeleteScoreName('');
      showMessage(`Successfully deleted "${bulkDeleteScoreName}" from ${result.updatedCount} students.`);
    } else {
      showMessage('Failed to delete scores. Please try again.', true);
    }
    setLoading(false);
  };

  // Content management functions
  const handleAddLecture = async (e) => {
    e.preventDefault();
    if (!newLecture.title) return;

    const updatedContent = {
      ...content,
      lectures: [...(content.lectures || []), { ...newLecture, id: Date.now().toString() }]
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setNewLecture({ title: '', description: '', url: '', duration: '', date: '' });
      showMessage('Lecture added successfully!');
    } else {
      showMessage('Failed to add lecture. Please try again.', true);
    }
    setLoading(false);
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterial.title) return;

    const updatedContent = {
      ...content,
      materials: [...(content.materials || []), { ...newMaterial, id: Date.now().toString() }]
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setNewMaterial({ title: '', description: '', url: '', type: 'PDF' });
      showMessage('Material added successfully!');
    } else {
      showMessage('Failed to add material. Please try again.', true);
    }
    setLoading(false);
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newLink.title || !newLink.url) return;

    const updatedContent = {
      ...content,
      links: [...(content.links || []), { ...newLink, id: Date.now().toString() }]
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setNewLink({ title: '', description: '', url: '' });
      showMessage('Link added successfully!');
    } else {
      showMessage('Failed to add link. Please try again.', true);
    }
    setLoading(false);
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.title || !newNote.content) return;

    const updatedContent = {
      ...content,
      notes: [...(content.notes || []), { ...newNote, id: Date.now().toString(), date: new Date().toLocaleDateString() }]
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setNewNote({ title: '', content: '', date: '' });
      showMessage('Note added successfully!');
    } else {
      showMessage('Failed to add note. Please try again.', true);
    }
    setLoading(false);
  };

  // NEW: Handle adding homework
  const handleAddHomework = async (e) => {
    e.preventDefault();
    if (!newHomework.title || !newHomework.description || !newHomework.url || !newHomework.dueDate) return;

    const updatedContent = {
      ...content,
      homeworks: [...(content.homeworks || []), { 
        ...newHomework, 
        id: Date.now().toString()
      }]
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setNewHomework({ title: '', description: '', url: '', dueDate: '', category: 'Python' });
      showMessage('Homework added successfully!');
    } else {
      showMessage('Failed to add homework. Please try again.', true);
    }
    setLoading(false);
  };

  const handleBeginEditHomework = (homework) => {
    setEditingHomeworkId(homework.id);
    setEditHomeworkData({ ...homework, category: homework.category || 'Python' });
  };

  const handleCancelEditHomework = () => {
    setEditingHomeworkId(null);
    setEditHomeworkData(null);
  };

  const handleSaveEditHomework = async () => {
    if (!editHomeworkData.title || !editHomeworkData.description) return;
    
    const updatedHomeworks = content.homeworks.map(hw => 
      hw.id === editingHomeworkId ? editHomeworkData : hw
    );
    
    const updatedContent = {
      ...content,
      homeworks: updatedHomeworks
    };
    
    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setEditingHomeworkId(null);
      setEditHomeworkData(null);
      showMessage('Homework updated successfully!');
    } else {
      showMessage('Failed to update homework. Please try again.', true);
    }
    setLoading(false);
  };

  // NEW: Handle adding tip
  const handleAddTip = async (e) => {
    e.preventDefault();
    if (!newTip.title || !newTip.description || !newTip.videoUrl) return;

    const updatedContent = {
      ...content,
      tips: [...(content.tips || []), { 
        ...newTip, 
        id: Date.now().toString()
      }]
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      setNewTip({ title: '', description: '', videoUrl: '' });
      showMessage('Tip added successfully!');
    } else {
      showMessage('Failed to add tip. Please try again.', true);
    }
    setLoading(false);
  };

  const handleRemoveItem = async (type, itemId) => {
    const updatedContent = {
      ...content,
      [type]: content[type].filter(item => item.id !== itemId)
    };

    setLoading(true);
    const success = await updateDashboardContent(updatedContent);
    if (success) {
      setContent(updatedContent);
      showMessage(`${type.slice(0, -1)} removed successfully!`);
    } else {
      showMessage(`Failed to remove ${type.slice(0, -1)}. Please try again.`, true);
    }
    setLoading(false);
  };
  
  const handleDeleteSubmission = async (submissionId) => {
  if (window.confirm("Are you sure you want to delete this submission?")) {
    setLoading(true);
    const success = await deleteSubmission(submissionId);
    if (success) {
      showMessage('Submission deleted successfully!');
      await loadData(); // Reload the list
    } else {
      showMessage('Failed to delete submission.', true);
    }
    setLoading(false);
  }
};

  // Custom Tab Button Component
  const TabButton = ({ value, isActive, onClick, icon: Icon, children, colorScheme = 'blue' }) => {
    // Premium Dark Mode SaaS Tab Styling
    const colorClasses = {
      blue: isActive ? 'bg-blue-500/20 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      yellow: isActive ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      green: isActive ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      purple: isActive ? 'bg-purple-500/20 border-purple-500/30 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      red: isActive ? 'bg-rose-500/20 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      indigo: isActive ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      teal: isActive ? 'bg-teal-500/20 border-teal-500/30 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      amber: isActive ? 'bg-amber-500/20 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      cyan: isActive ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      orange: isActive ? 'bg-orange-500/20 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200',
      violet: isActive ? 'bg-violet-500/20 border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-200'
    };

    return (
      <button
        onClick={() => onClick(value)}
        className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border transition-all duration-300 font-semibold text-sm ${colorClasses[colorScheme]}`}
      >
        <Icon className="w-4 h-4" />
        <span>{children}</span>
      </button>
    );
  };

  const renderTabContent = () => {
    const scopedEmails = adminScopeDiplomaId === 'all' 
      ? authorizedEmails 
      : authorizedEmails.filter(e => e.classIds && e.classIds.includes(adminScopeDiplomaId));

    switch (activeTab) {
        case 'students':
          return (
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center space-x-2 text-gray-800">
                      <Users className="w-5 h-5 text-blue-600" />
                      <span>Authorized Students</span>
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Manage student email addresses that can access the platform
                    </CardDescription>
                  </div>
                  
                  {/* Scope Selector */}
                  <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <span className="text-sm font-medium text-slate-500 pl-2">Scope:</span>
                    <select
                      className="text-sm border-0 bg-transparent py-1.5 pl-2 pr-8 text-slate-700 focus:ring-0 font-medium"
                      value={adminScopeDiplomaId}
                      onChange={(e) => setAdminScopeDiplomaId(e.target.value)}
                    >
                      <option value="all">All Students Globally</option>
                      {diplomas.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={handleAddEmail} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    required
                  />
                </div>
                {diplomas.length > 0 && (
                  <div className="space-y-2 mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Assign Diplomas (Optional)</p>
                    <div className="flex flex-wrap gap-3">
                      {diplomas.map(d => (
                        <label key={d.id} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newStudentClassIds.includes(d.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewStudentClassIds([...newStudentClassIds, d.id]);
                              } else {
                                setNewStudentClassIds(newStudentClassIds.filter(id => id !== d.id));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{d.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Student</span>
                </Button>
              </form>

                <div className="space-y-3">
                  {scopedEmails.map((emailObj) => (
                    <div key={emailObj.id} className="flex flex-col p-4 bg-gray-50/80 rounded-lg border border-gray-200 hover:bg-gray-100/80 transition-colors">
                      <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-medium text-gray-800 break-all">{emailObj.email}</span>
                        <Badge variant="outline" className="ml-3 text-xs">{emailObj.password}</Badge>
                        {emailObj.classIds && emailObj.classIds.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {emailObj.classIds.map(cid => {
                              const d = diplomas.find(dip => dip.id === cid);
                              return d ? <Badge key={cid} variant="secondary" className="text-[10px]">{d.name}</Badge> : null;
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => {
                            if (editingStudentId === emailObj.id) {
                              setEditingStudentId(null);
                            } else {
                              setEditingStudentId(emailObj.id);
                              setEditingStudentClassIds(emailObj.classIds || []);
                            }
                          }}
                          variant="outline"
                          size="sm"
                          disabled={loading}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleRemoveEmail(emailObj.id)}
                          variant="destructive"
                          size="sm"
                          disabled={loading}
                          className="flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {editingStudentId === emailObj.id && (
                      <div className="mt-4 p-3 bg-white border border-gray-200 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Update Assigned Diplomas</p>
                        <div className="flex flex-wrap gap-3 mb-3">
                          {diplomas.map(d => (
                            <label key={d.id} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={editingStudentClassIds.includes(d.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setEditingStudentClassIds([...editingStudentClassIds, d.id]);
                                  } else {
                                    setEditingStudentClassIds(editingStudentClassIds.filter(id => id !== d.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span>{d.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingStudentId(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleUpdateStudentClasses(emailObj.id)} disabled={loading}>Save</Button>
                        </div>
                      </div>
                    )}
                  </div>
                  ))}
                  {scopedEmails.length === 0 && (
                    <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No authorized emails yet</p>
                    <p className="text-gray-400 text-sm">Add student emails to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'pending-approvals':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <UserCheck className="w-5 h-5 text-amber-600" />
                <span>Pending Approvals</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Review and approve students who signed in via Google
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {pendingStudents.map((student) => (
                  <div key={student.id} className="flex flex-col p-4 bg-gray-50/80 rounded-lg border border-gray-200 hover:bg-gray-100/80 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">{student.name || 'Unknown Name'}</span>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-xs text-gray-500 mt-1">Requested: {student.createdAt?.toDate ? student.createdAt.toDate().toLocaleString() : 'Recently'}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => {
                            if (approvingStudentId === student.id) {
                              setApprovingStudentId(null);
                            } else {
                              setApprovingStudentId(student.id);
                              setApprovingStudentClassIds([]);
                            }
                          }}
                          className="bg-amber-500 hover:bg-amber-600 text-white"
                          size="sm"
                          disabled={loading}
                        >
                          Review
                        </Button>
                        <Button
                          onClick={() => handleRejectStudent(student.id)}
                          variant="destructive"
                          size="sm"
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {approvingStudentId === student.id && (
                      <div className="mt-4 p-3 bg-white border border-amber-200 rounded-lg">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Assign Diplomas & Approve</p>
                        <div className="flex flex-wrap gap-3 mb-3">
                          {diplomas.map(d => (
                            <label key={d.id} className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={approvingStudentClassIds.includes(d.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setApprovingStudentClassIds([...approvingStudentClassIds, d.id]);
                                  } else {
                                    setApprovingStudentClassIds(approvingStudentClassIds.filter(id => id !== d.id));
                                  }
                                }}
                                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                              />
                              <span>{d.name}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setApprovingStudentId(null)}>Cancel</Button>
                          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleApproveStudent(student.id, student.email)} disabled={loading || approvingStudentClassIds.length === 0}>
                            Approve Access
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {pendingStudents.length === 0 && (
                  <div className="text-center py-12">
                    <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No pending approvals</p>
                    <p className="text-gray-400 text-sm">All student requests have been processed</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'evaluations':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center space-x-2 text-gray-800">
                    <Award className="w-5 h-5 text-yellow-600" />
                    <span>Student Evaluations</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    View and manage student evaluations and scores.
                  </CardDescription>
                </div>
                
                {/* Scope Selector */}
                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-500 pl-2">Scope:</span>
                  <select
                    className="text-sm border-0 bg-transparent py-1.5 pl-2 pr-8 text-slate-700 focus:ring-0 font-medium"
                    value={adminScopeDiplomaId}
                    onChange={(e) => setAdminScopeDiplomaId(e.target.value)}
                  >
                    <option value="all">All Students Globally</option>
                    {diplomas.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-4">
                <Button
                  onClick={() => setIsBulkUploadDialogOpen(true)}
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                  disabled={loading}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Add Scores
                </Button>
                <Button
                  onClick={() => setIsBulkDeleteDialogOpen(true)}
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                  disabled={loading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Bulk Delete a Score
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                {scopedEmails.map((emailObj) => {
                  const evaluation = evaluations.find(e => e.studentEmail === emailObj.email);
                  return (
                    <div key={emailObj.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200 hover:bg-gray-100/80 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800 break-all mb-1">{emailObj.email}</div>
                        <div className="text-sm text-gray-600">
                          {evaluation ? (
                            <div className="flex items-center space-x-4">
                              <span>Total Score: <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">{evaluation.totalScore}</Badge></span>
                              <span>Partial Scores: {evaluation.partialScores?.length || 0}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">No evaluation yet</span>
                          )}
                        </div>
                      </div>
                      <Button
                        onClick={() => handleEditEvaluation(emailObj.email)}
                        variant="outline"
                        size="sm"
                        disabled={loading}
                        className="mt-2 sm:mt-0 ml-0 sm:ml-2 flex-shrink-0"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Manage Scores
                      </Button>
                    </div>
                  );
                })}
                {scopedEmails.length === 0 && (
                  <div className="text-center py-12">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No students found</p>
                    <p className="text-gray-400 text-sm">Add authorized emails first or change the scope</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'content-library':
        return <ContentLibraryTab />;

      case 'lectures':
      case 'materials':
      case 'links':
      case 'notes':
      case 'homework':
      case 'tips':
        return <AdminContentStudio activeTab={activeTab} diplomas={diplomas} modules={diplomaModules} lectures={diplomaLectures} onLectureChange={loadData} />;

      case 'drive-sync':
        return <GoogleDriveSync />;

      case 'progress-campaign':
        return <AdminProgressCampaignTab adminScopeDiplomaId={adminScopeDiplomaId} scopedEmails={scopedEmails} />;

      case 'submissions':
        const scopedSubmissions = adminScopeDiplomaId === 'all'
          ? submissions
          : submissions.filter(s => scopedEmails.some(emailObj => emailObj.email === s.studentEmail));

        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center space-x-2 text-gray-800">
                    <Briefcase className="w-5 h-5 text-orange-600" />
                    <span>Student Submissions</span>
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    View and manage student project submissions
                  </CardDescription>
                </div>
                
                {/* Scope Selector */}
                <div className="flex items-center space-x-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-sm font-medium text-slate-500 pl-2">Scope:</span>
                  <select
                    className="text-sm border-0 bg-transparent py-1.5 pl-2 pr-8 text-slate-700 focus:ring-0 font-medium"
                    value={adminScopeDiplomaId}
                    onChange={(e) => setAdminScopeDiplomaId(e.target.value)}
                  >
                    <option value="all">All Students Globally</option>
                    {diplomas.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {scopedSubmissions.length > 0 ? (
                  scopedSubmissions.map((submission) => (
                    <div key={submission.id} className="p-4 bg-orange-50/50 rounded-lg border border-orange-200 hover:bg-orange-100/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800 mb-1">{submission.projectName || 'Untitled Project'}</h3>
                          <p className="text-sm text-gray-600">Student: {submission.studentEmail}</p>
                          <p className="text-xs text-gray-500">Submitted: {submission.submittedAt ? new Date(submission.submittedAt.toDate()).toLocaleString() : 'Unknown'}</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
                          <a href={submission.fileUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="flex items-center space-x-1">
                              <Download className="w-4 h-4" />
                              <span>Download</span>
                            </Button>
                          </a>
                          <Button
                            onClick={() => handleDeleteSubmission(submission.id)}
                            variant="destructive"
                            size="sm"
                            disabled={loading}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {submission.description && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Description:</h4>
                          <p className="text-sm text-gray-600">{submission.description}</p>
                        </div>
                      )}
                      
                      {submission.githubUrl && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">GitHub Repository:</h4>
                          <a 
                            href={submission.githubUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            {submission.githubUrl}
                          </a>
                        </div>
                      )}
                      
                      {submission.liveUrl && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Live Demo:</h4>
                          <a 
                            href={submission.liveUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            {submission.liveUrl}
                          </a>
                        </div>
                      )}
                      
                      {submission.technologies && submission.technologies.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Technologies Used:</h4>
                          <div className="flex flex-wrap gap-1">
                            {submission.technologies.map((tech, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No submissions yet</p>
                    <p className="text-gray-400 text-sm">Student submissions will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'feedback':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <MessageSquare className="w-5 h-5 text-pink-600" />
                <span>Student Feedback</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                View feedback submitted by students
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {feedback.length > 0 ? (
                  feedback.map((feedbackItem) => (
                    <div key={feedbackItem.id} className="p-4 bg-pink-50/50 rounded-lg border border-pink-200 hover:bg-pink-100/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-medium text-gray-800">{feedbackItem.type || 'General Feedback'}</h3>
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < (feedbackItem.rating || 0)
                                      ? 'text-yellow-400 fill-current'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">From: {feedbackItem.studentEmail}</p>
                          <p className="text-xs text-gray-500 mb-3">
                            Submitted: {feedbackItem.submittedAt ? new Date(feedbackItem.submittedAt.toDate()).toLocaleString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {feedbackItem.feedback && (
                        <div className="mb-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Feedback:</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{feedbackItem.feedback}</p>
                        </div>
                      )}
                    
                      {feedbackItem.suggestions && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-1">Suggestions:</h4>
                          <p className="text-sm text-gray-600 whitespace-pre-wrap">{feedbackItem.suggestions}</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No feedback yet</p>
                    <p className="text-gray-400 text-sm">Student feedback will appear here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'diplomas':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Diploma & Class Management</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Create and manage diplomas, modules, and lectures for your platform.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Migration Banner */}
              {migrationStatus === 'pending' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-amber-800">Legacy Content Migration Needed</h4>
                    <p className="text-sm text-amber-600">Migrate existing embedded content to the new high-performance architecture.</p>
                  </div>
                  <Button onClick={handleRunAssetMigration} disabled={assetMigrationRunning} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {assetMigrationRunning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Migrating...</> : 'Migrate Assets'}
                  </Button>
                </div>
              )}
              {migrationStatus === 'pending' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-amber-800">Data Migration Available</h4>
                    <p className="text-sm text-amber-600">Migrate your existing single-course data to the new multi-diploma structure.</p>
                  </div>
                  <Button onClick={handleRunMigration} disabled={migrationRunning} className="bg-amber-600 hover:bg-amber-700 text-white">
                    {migrationRunning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Migrating...</> : 'Run Migration'}
                  </Button>
                </div>
              )}
              {migrationStatus === 'complete' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                  Legacy data migration complete.
                </div>
              )}

              {/* Create Diploma Form */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest mb-3">Create New Diploma</h3>
                <form onSubmit={handleCreateDiploma} className="space-y-3">
                  <Input placeholder="Diploma name (e.g., AI Mastery Batch 3)" value={newDiplomaName} onChange={e => setNewDiplomaName(e.target.value)} className="border-gray-300" required />
                  <Input placeholder="Description (optional)" value={newDiplomaDesc} onChange={e => setNewDiplomaDesc(e.target.value)} className="border-gray-300" />
                  <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Create Diploma
                  </Button>
                </form>
              </div>

              {/* Diplomas List */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Existing Diplomas</h3>
                {diplomas.length > 0 ? diplomas.map(d => (
                  <div key={d.id}
                    onClick={() => handleSelectDiploma(d.id)}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      selectedDiplomaId === d.id
                        ? 'bg-indigo-50 border-indigo-300 shadow-md'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedDiplomaId === d.id ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800">{d.name}</h4>
                        <p className="text-xs text-gray-500">{d.description || 'No description'} · {d.status}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={d.status === 'active' ? 'default' : 'secondary'}>{d.status}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8 w-8"
                        onClick={(e) => handleDeleteDiploma(d.id, d.name, e)}
                        title="Delete Diploma"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8">
                    <GraduationCap className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No diplomas yet. Create one above or run migration.</p>
                  </div>
                )}
              </div>

              {/* Modules for selected diploma */}
              {selectedDiplomaId && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Modules in Selected Diploma
                  </h3>
                  <form onSubmit={handleCreateModule} className="flex gap-3">
                    <Input placeholder="New module name" value={newModuleName} onChange={e => setNewModuleName(e.target.value)} className="border-gray-300 flex-1" required />
                    <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                      <Plus className="w-4 h-4 mr-1" /> Add Module
                    </Button>
                  </form>
                  {diplomaModules.length > 0 ? diplomaModules.map((mod, idx) => {
                    const modLectures = diplomaLectures.filter(l => l.moduleId === mod.id);
                    return (
                      <div key={mod.id} className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">{idx + 1}</span>
                            <h4 className="font-semibold text-gray-800">{mod.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{modLectures.length} lectures</Badge>
                            <Button
                              variant="ghost" size="sm" className="h-6 w-6 p-1 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={(e) => handleDeleteModule(mod.id, mod.name, e)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {modLectures.length > 0 && (
                          <div className="ml-6 space-y-1">
                            {modLectures.map(lect => (
                              <div key={lect.id} className="flex items-center gap-2 text-sm text-gray-600 py-1">
                                <Play className="w-3 h-3 text-gray-400" />
                                <div className="flex-1 flex items-center gap-2">
                                  <span>{lect.title}</span>
                                  <span className="text-xs text-gray-400">{lect.duration}</span>
                                </div>
                                <Button
                                  variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                                  onClick={(e) => handleDeleteLecture(lect.id, lect.title, e)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }) : (
                    <p className="text-sm text-gray-400 text-center py-4">No modules yet.</p>
                  )}
                </div>
              )}

              {/* Data Diagnostics (Redistribution) */}
              {selectedDiplomaId && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-orange-800 uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Data Diagnostics
                      </h3>
                      <p className="text-xs text-orange-600 mt-1">Run a scan to detect legacy content that should be redistributed among lectures.</p>
                    </div>
                    <Button onClick={handleDryRunRedistribution} disabled={isRedistributing} className="bg-orange-600 hover:bg-orange-700 text-white">
                      {isRedistributing && redistributionMoves.length === 0 ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                      Scan Content
                    </Button>
                  </div>
                  
                  {redistributionMoves.length > 0 && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-orange-200">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold text-orange-800">Proposed Corrections ({redistributionMoves.length})</h4>
                        <Button onClick={handleApplyRedistribution} disabled={isRedistributing} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                           {isRedistributing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                           Apply All
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto space-y-2 text-sm">
                        {redistributionMoves.map((move, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row justify-between p-2 bg-gray-50 border border-gray-100 rounded">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-800">[{move.category.toUpperCase()}] {move.item.title || move.item.name || 'Unnamed'}</span>
                              <span className="text-xs text-gray-500">Move from: <span className="text-red-500">{move.sourceTitle}</span></span>
                              <span className="text-xs text-gray-500">Move to: <span className="text-emerald-500">{move.targetTitle}</span></span>
                            </div>
                            <div className="mt-2 sm:mt-0 flex items-center">
                              <Badge variant={move.confidence === 'High' ? 'default' : 'secondary'} className={move.confidence === 'High' ? 'bg-emerald-500' : ''}>
                                {move.confidence} Match
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {redistributionApplied && redistributionMoves.length === 0 && (
                     <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                       <CheckCircle className="w-4 h-4" />
                       Content redistribution applied successfully.
                     </div>
                  )}
                </div>
              )}

              {/* Intelligent Module Inference */}
              {selectedDiplomaId && (
                <div className="p-4 bg-violet-50 rounded-lg border border-violet-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-violet-800 uppercase tracking-widest flex items-center gap-2">
                        <Layers className="w-4 h-4" /> Intelligent Module Inference
                      </h3>
                      <p className="text-xs text-violet-600 mt-1">Analyze legacy content titles and auto-group them into logical modules using keyword patterns.</p>
                    </div>
                    <Button onClick={handleRunInference} disabled={inferenceRunning} className="bg-violet-600 hover:bg-violet-700 text-white">
                      {inferenceRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                      Analyze Content
                    </Button>
                  </div>

                  {inferenceReport && inferenceReport.report && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-violet-200">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <h4 className="font-semibold text-violet-800">
                            Proposed Grouping: {inferenceReport.proposedModuleCount} Modules from {inferenceReport.totalLegacyItems} Items
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">Review the proposed modules below, then click "Apply" to create them.</p>
                        </div>
                        <Button onClick={handleApplyInference} disabled={inferenceRunning} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          {inferenceRunning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Apply Grouping
                        </Button>
                      </div>
                      <div className="max-h-80 overflow-y-auto space-y-3">
                        {inferenceReport.report.map((group, idx) => (
                          <div key={idx} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-violet-500 bg-violet-100 px-2 py-0.5 rounded">{idx + 1}</span>
                                <h5 className="font-semibold text-gray-800">{group.moduleName}</h5>
                              </div>
                              <Badge variant="outline" className="text-xs">{group.totalItems} items</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                              {group.lectureCount > 0 && <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{group.lectureCount} lectures</span>}
                              {group.materialCount > 0 && <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">{group.materialCount} materials</span>}
                              {group.homeworkCount > 0 && <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">{group.homeworkCount} homework</span>}
                              {group.linkCount > 0 && <span className="bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded">{group.linkCount} links</span>}
                              {group.noteCount > 0 && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{group.noteCount} notes</span>}
                              {group.tipCount > 0 && <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">{group.tipCount} tips</span>}
                            </div>
                            {/* Show first few lecture titles */}
                            {group.items.lectures.length > 0 && (
                              <div className="mt-2 ml-4 space-y-1">
                                {group.items.lectures.slice(0, 5).map((lec, li) => (
                                  <div key={li} className="text-xs text-gray-500 flex items-center gap-1">
                                    <Video className="w-3 h-3 text-gray-400" /> {lec.title}
                                  </div>
                                ))}
                                {group.items.lectures.length > 5 && (
                                  <p className="text-xs text-gray-400 italic">...and {group.items.lectures.length - 5} more lectures</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {inferenceApplied && !inferenceReport && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Module inference applied successfully. Check the modules list above.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-50 font-['Inter'] selection:bg-rose-500/30">
      {/* Header */}
      <div className="bg-[#050505]/80 backdrop-blur-xl shadow-xl border-b border-white/5 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 border border-white/10">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tight">Infinity X EdTech</h1>
                <p className="text-xs text-slate-400 font-medium">Admin: {user?.email}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline" className="flex items-center space-x-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border-rose-500/20 font-semibold rounded-xl">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Alert className="bg-emerald-500/10 border-emerald-500/20 rounded-xl">
            <AlertDescription className="text-emerald-400 font-medium">{message}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 bg-[#121214] backdrop-blur-xl rounded-2xl border border-white/5 shadow-2xl">
          <TabButton value="diplomas" isActive={activeTab === 'diplomas'} onClick={setActiveTab} icon={GraduationCap} colorScheme="indigo">
            Diplomas
          </TabButton>
          <TabButton value="students" isActive={activeTab === 'students'} onClick={setActiveTab} icon={Users} colorScheme="blue">
            Students
          </TabButton>
          <TabButton value="pending-approvals" isActive={activeTab === 'pending-approvals'} onClick={setActiveTab} icon={UserCheck} colorScheme="amber">
            Pending Approvals
          </TabButton>
          <TabButton value="evaluations" isActive={activeTab === 'evaluations'} onClick={setActiveTab} icon={Award} colorScheme="yellow">
            Evaluations
          </TabButton>
          <TabButton value="lectures" isActive={activeTab === 'lectures'} onClick={setActiveTab} icon={Video} colorScheme="purple">
            Lectures
          </TabButton>
          <TabButton value="materials" isActive={activeTab === 'materials'} onClick={setActiveTab} icon={FileText} colorScheme="green">
            Materials
          </TabButton>
          <TabButton value="links" isActive={activeTab === 'links'} onClick={setActiveTab} icon={ExternalLink} colorScheme="cyan">
            Links
          </TabButton>
          <TabButton value="notes" isActive={activeTab === 'notes'} onClick={setActiveTab} icon={StickyNote} colorScheme="indigo">
            Notes
          </TabButton>
          <TabButton value="homework" isActive={activeTab === 'homework'} onClick={setActiveTab} icon={BookOpen} colorScheme="amber">
            Homework
          </TabButton>
          <TabButton value="tips" isActive={activeTab === 'tips'} onClick={setActiveTab} icon={Lightbulb} colorScheme="orange">
            Tips & Shorts
          </TabButton>
          <TabButton value="content-library" isActive={activeTab === 'content-library'} onClick={setActiveTab} icon={Database} colorScheme="violet">
            Diagnostics & Audit
          </TabButton>
          <TabButton value="drive-sync" isActive={activeTab === 'drive-sync'} onClick={setActiveTab} icon={Cloud} colorScheme="teal">
            Drive Sync
          </TabButton>
          <TabButton value="submissions" isActive={activeTab === 'submissions'} onClick={setActiveTab} icon={Briefcase} colorScheme="red">
            Submissions
          </TabButton>
          <TabButton value="feedback" isActive={activeTab === 'feedback'} onClick={setActiveTab} icon={MessageSquare} colorScheme="cyan">
            Feedback
          </TabButton>
          <TabButton value="progress-campaign" isActive={activeTab === 'progress-campaign'} onClick={setActiveTab} icon={Target} colorScheme="indigo">
            Progress Tracking
          </TabButton>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>

      {/* Individual Student Evaluation Dialog */}
      <Dialog open={isEvalDialogOpen} onOpenChange={setIsEvalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Award className="w-5 h-5 text-yellow-600" />
              <span>Manage Scores - {currentStudent?.email}</span>
            </DialogTitle>
            <DialogDescription>
              Manage partial scores and view total evaluation for this student.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Current Total Score */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Current Total Score</h3>
              <div className="text-3xl font-bold text-yellow-600">
                {currentEvaluation?.totalScore || 0}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Based on {currentEvaluation?.partialScores?.length || 0} partial score(s)
              </p>
            </div>

            {/* Add New Partial Score */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Partial Score</h3>
              <form onSubmit={handleAddPartialScore} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Evaluation name (e.g., Quiz 1, Project A)"
                    value={newPartialScore.name}
                    onChange={(e) => setNewPartialScore({ ...newPartialScore, name: e.target.value })}
                    className="border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                  />
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    placeholder="Score (0-100)"
                    value={newPartialScore.score}
                    onChange={(e) => setNewPartialScore({ ...newPartialScore, score: e.target.value })}
                    className="border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                  />
                </div>
                <Textarea
                  placeholder="Feedback (optional)"
                  value={newPartialScore.feedback}
                  onChange={(e) => setNewPartialScore({ ...newPartialScore, feedback: e.target.value })}
                  className="border-gray-300 focus:border-yellow-500 focus:ring-yellow-500"
                  rows={3}
                />
                <Button type="submit" disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                  Add Partial Score
                </Button>
              </form>
            </div>

            {/* Existing Partial Scores */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Existing Partial Scores</h3>
              <div className="space-y-3">
                {currentEvaluation?.partialScores && currentEvaluation.partialScores.length > 0 ? (
                  currentEvaluation.partialScores.map((score) => (
                    <div key={score.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium text-gray-800">{score.name}</h4>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {score.score}
                          </Badge>
                        </div>
                        {score.feedback && (
                          <p className="text-sm text-gray-600">{score.feedback}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Added: {score.createdAt ? new Date(score.createdAt.toDate()).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeletePartialScore(score.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                        className="mt-2 sm:mt-0 ml-0 sm:ml-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Award className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No partial scores yet</p>
                    <p className="text-gray-400 text-sm">Add the first partial score above</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEvalDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-green-600" />
              <span>Bulk Add Scores</span>
            </DialogTitle>
            <DialogDescription>
              Upload a CSV file to add scores for multiple students at once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluation Name
              </label>
              <Input
                placeholder="e.g., Midterm Exam"
                value={bulkEvaluationName}
                onChange={(e) => setBulkEvaluationName(e.target.value)}
                className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                required
              />
            </div>
            
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200">
              <strong>CSV Format:</strong> The file should have columns "email" and "score". Example:
              <br />
              <code className="text-xs">email,score<br />student1@example.com,85<br />student2@example.com,92</code>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleBulkUploadSubmit} 
              disabled={loading || !csvFile || !bulkEvaluationName.trim()}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Scores
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              <span>Bulk Delete Scores</span>
            </DialogTitle>
            <DialogDescription>
              Remove a specific evaluation from all students who have it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Evaluation Name to Delete
              </label>
              <Input
                placeholder="e.g., Quiz 1"
                value={bulkDeleteScoreName}
                onChange={(e) => setBulkDeleteScoreName(e.target.value)}
                className="border-gray-300 focus:border-red-500 focus:ring-red-500"
                required
              />
            </div>
            
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              <strong>Warning:</strong> This will remove the specified evaluation from ALL students who have it. This action cannot be undone.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleBulkDeleteSubmit} 
              disabled={loading || !bulkDeleteScoreName.trim()}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete From All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPanel;

