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
  deleteSubmission
} from '../lib/auth';
import GoogleDriveSync from './GoogleDriveSync';
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
  Lightbulb // NEW: Icon for Tips & Shorts
} from 'lucide-react';
import Papa from 'papaparse'; // Import PapaParse

const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
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
  const [newLecture, setNewLecture] = useState({ title: '', description: '', url: '', duration: '', date: '' });
  const [newMaterial, setNewMaterial] = useState({ title: '', description: '', url: '', type: 'PDF' });
  const [newLink, setNewLink] = useState({ title: '', description: '', url: '' });
  const [newNote, setNewNote] = useState({ title: '', content: '', date: '' });
  const [newHomework, setNewHomework] = useState({ title: '', description: '', url: '', dueDate: '' }); // NEW: Homework form state
  const [newTip, setNewTip] = useState({ title: '', description: '', videoUrl: '' }); // NEW: Tips form state

  const fileInputRef = useRef(null); // Ref for the hidden file input

  useEffect(() => {
    loadData();
  }, []);

  // UPDATED: The loadData function now also fetches evaluations
const loadData = async () => {
  setLoading(true);
  try {
    const [emails, dashboardContent, evalsSnapshot, subsSnapshot, feedbackData] = await Promise.all([
      getAuthorizedEmails(),
      getDashboardContent(),
      getDocs(collection(db, "evaluations")),
      getDocs(collection(db, "submissions")),
      getAllFeedback() // Fetch feedback
    ]);

    setAuthorizedEmails(emails);
    setContent(dashboardContent);

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
    const success = await addAuthorizedStudent(newEmail, newPassword);
    if (success) {
      setNewEmail('');
      setNewPassword('');
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
      setNewHomework({ title: '', description: '', url: '', dueDate: '' });
      showMessage('Homework added successfully!');
    } else {
      showMessage('Failed to add homework. Please try again.', true);
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
    const colorClasses = {
      blue: isActive ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      yellow: isActive ? 'bg-yellow-100 border-yellow-300 text-yellow-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      green: isActive ? 'bg-green-100 border-green-300 text-green-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      purple: isActive ? 'bg-purple-100 border-purple-300 text-purple-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      red: isActive ? 'bg-red-100 border-red-300 text-red-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      indigo: isActive ? 'bg-indigo-100 border-indigo-300 text-indigo-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      teal: isActive ? 'bg-teal-100 border-teal-300 text-teal-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      amber: isActive ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      cyan: isActive ? 'bg-cyan-100 border-cyan-300 text-cyan-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
      orange: isActive ? 'bg-orange-100 border-orange-300 text-orange-700 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
    };

    return (
      <button
        onClick={() => onClick(value)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border-2 transition-all duration-200 font-medium text-sm ${colorClasses[colorScheme]}`}
      >
        <Icon className="w-4 h-4" />
        <span>{children}</span>
      </button>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'students':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Users className="w-5 h-5 text-blue-600" />
                <span>Authorized Students</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage student email addresses that can access the platform
              </CardDescription>
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
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Student</span>
                </Button>
              </form>

              <div className="space-y-3">
                {authorizedEmails.map((emailObj) => (
                  <div key={emailObj.id} className="flex items-center justify-between p-4 bg-gray-50/80 rounded-lg border border-gray-200 hover:bg-gray-100/80 transition-colors">
                    <div className="flex-1">
                      <span className="font-medium text-gray-800 break-all">{emailObj.email}</span>
                      <Badge variant="outline" className="ml-3 text-xs">{emailObj.password}</Badge>
                    </div>
                    <Button
                      onClick={() => handleRemoveEmail(emailObj.id)}
                      variant="destructive"
                      size="sm"
                      disabled={loading}
                      className="ml-2 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {authorizedEmails.length === 0 && (
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

      case 'evaluations':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Award className="w-5 h-5 text-yellow-600" />
                <span>Student Evaluations</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                View and manage student evaluations and scores.
              </CardDescription>
              
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
                {authorizedEmails.map((emailObj) => {
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
                {authorizedEmails.length === 0 && (
                  <div className="text-center py-12">
                    <Award className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No students to evaluate</p>
                    <p className="text-gray-400 text-sm">Add authorized emails first</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'lectures':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Video className="w-5 h-5 text-purple-600" />
                <span>Lectures</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage recorded lectures and video content
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddLecture} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Lecture title"
                    value={newLecture.title}
                    onChange={(e) => setNewLecture({ ...newLecture, title: e.target.value })}
                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <Input
                    placeholder="Duration (e.g., 45 min)"
                    value={newLecture.duration}
                    onChange={(e) => setNewLecture({ ...newLecture, duration: e.target.value })}
                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <Textarea
                  placeholder="Lecture description"
                  value={newLecture.description}
                  onChange={(e) => setNewLecture({ ...newLecture, description: e.target.value })}
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Video URL"
                    value={newLecture.url}
                    onChange={(e) => setNewLecture({ ...newLecture, url: e.target.value })}
                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                  <Input
                    type="date"
                    placeholder="Date"
                    value={newLecture.date}
                    onChange={(e) => setNewLecture({ ...newLecture, date: e.target.value })}
                    className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Lecture</span>
                </Button>
              </form>

              <div className="space-y-3">
                {content.lectures && content.lectures.map((lecture) => (
                  <div key={lecture.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-purple-50/50 rounded-lg border border-purple-200 hover:bg-purple-100/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-1">{lecture.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{lecture.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Duration: {lecture.duration || 'N/A'}</span>
                        <span>Date: {lecture.date || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      {lecture.url && (
                        <a href={lecture.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        onClick={() => handleRemoveItem('lectures', lecture.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!content.lectures || content.lectures.length === 0) && (
                  <div className="text-center py-12">
                    <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No lectures yet</p>
                    <p className="text-gray-400 text-sm">Add your first lecture above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'materials':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <FileText className="w-5 h-5 text-green-600" />
                <span>Materials</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage course materials and documents
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddMaterial} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Material title"
                    value={newMaterial.title}
                    onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                  <select
                    value={newMaterial.type}
                    onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:border-green-500 focus:ring-green-500"
                  >
                    <option value="PDF">PDF</option>
                    <option value="DOC">DOC</option>
                    <option value="PPT">PPT</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <Textarea
                  placeholder="Material description"
                  value={newMaterial.description}
                  onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                <Input
                  placeholder="Download URL"
                  value={newMaterial.url}
                  onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Material</span>
                </Button>
              </form>

              <div className="space-y-3">
                {content.materials && content.materials.map((material) => (
                  <div key={material.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-green-50/50 rounded-lg border border-green-200 hover:bg-green-100/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium text-gray-800">{material.title}</h3>
                        <Badge variant="outline" className="border-green-300 text-green-700 text-xs">
                          {material.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{material.description}</p>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      {material.url && (
                        <a href={material.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        onClick={() => handleRemoveItem('materials', material.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!content.materials || content.materials.length === 0) && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No materials yet</p>
                    <p className="text-gray-400 text-sm">Add your first material above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'links':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <ExternalLink className="w-5 h-5 text-cyan-600" />
                <span>Important Links</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage important links and resources
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddLink} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Link title"
                    value={newLink.title}
                    onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                    className="border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                  <Input
                    placeholder="URL"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    className="border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                  />
                </div>
                <Textarea
                  placeholder="Link description"
                  value={newLink.description}
                  onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                  className="border-gray-300 focus:border-cyan-500 focus:ring-cyan-500"
                />
                <Button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Link</span>
                </Button>
              </form>

              <div className="space-y-3">
                {content.links && content.links.map((link) => (
                  <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-cyan-50/50 rounded-lg border border-cyan-200 hover:bg-cyan-100/50 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800 mb-1">{link.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{link.description}</p>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-600 hover:text-cyan-700 break-all">
                        {link.url}
                      </a>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button
                        onClick={() => handleRemoveItem('links', link.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!content.links || content.links.length === 0) && (
                  <div className="text-center py-12">
                    <ExternalLink className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No links yet</p>
                    <p className="text-gray-400 text-sm">Add your first link above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'notes':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <StickyNote className="w-5 h-5 text-indigo-600" />
                <span>Instructor Notes</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage instructor notes and announcements
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddNote} className="space-y-4 mb-6">
                <Input
                  placeholder="Note title"
                  value={newNote.title}
                  onChange={(e) => setNewNote({ ...newNote, title: e.target.value })}
                  className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                />
                <Textarea
                  placeholder="Note content"
                  value={newNote.content}
                  onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                  className="border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                  rows={4}
                />
                <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Note</span>
                </Button>
              </form>

              <div className="space-y-3">
                {content.notes && content.notes.map((note) => (
                  <div key={note.id} className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-200 hover:bg-indigo-100/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 mb-1">{note.title}</h3>
                        <p className="text-xs text-gray-500 mb-2">Posted: {note.date}</p>
                      </div>
                      <Button
                        onClick={() => handleRemoveItem('notes', note.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                        className="mt-2 sm:mt-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{note.content}</p>
                  </div>
                ))}
                {(!content.notes || content.notes.length === 0) && (
                  <div className="text-center py-12">
                    <StickyNote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No notes yet</p>
                    <p className="text-gray-400 text-sm">Add your first note above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'homework':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <span>Homework Assignments</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage homework assignments and due dates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleAddHomework} className="space-y-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    placeholder="Assignment title"
                    value={newHomework.title}
                    onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
                    className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                    required
                  />
                  <Input
                    type="date"
                    placeholder="Due date"
                    value={newHomework.dueDate}
                    onChange={(e) => setNewHomework({ ...newHomework, dueDate: e.target.value })}
                    className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                    required
                  />
                </div>
                <Textarea
                  placeholder="Assignment description"
                  value={newHomework.description}
                  onChange={(e) => setNewHomework({ ...newHomework, description: e.target.value })}
                  className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  required
                />
                <Input
                  placeholder="Assignment URL or file link"
                  value={newHomework.url}
                  onChange={(e) => setNewHomework({ ...newHomework, url: e.target.value })}
                  className="border-gray-300 focus:border-amber-500 focus:ring-amber-500"
                  required
                />
                <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Homework</span>
                </Button>
              </form>

              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Existing Homeworks</h3>
                {content.homeworks && content.homeworks.map((homework) => (
                  <div key={homework.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-amber-50/50 rounded-lg border border-amber-200 hover:bg-amber-100/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1">{homework.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{homework.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Due: {homework.dueDate}</span>
                        {homework.url && (
                          <a href={homework.url} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-700">
                            View Assignment
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      {homework.url && (
                        <a href={homework.url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        onClick={() => handleRemoveItem('homeworks', homework.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!content.homeworks || content.homeworks.length === 0) && (
                  <div className="text-center py-12">
                    <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No homework assignments yet</p>
                    <p className="text-gray-400 text-sm">Add your first homework assignment above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      // NEW: Tips & Shorts Tab
      case 'tips':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Lightbulb className="w-5 h-5 text-orange-600" />
                <span>Tips & Shorts</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Manage quick tips and short video content
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* Add New Tip Form */}
              <form onSubmit={handleAddTip} className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Add New Tip</h3>
                <Input
                  placeholder="Tip title (e.g., Quick Tip: Solving the Python Loop Problem)"
                  value={newTip.title}
                  onChange={(e) => setNewTip({ ...newTip, title: e.target.value })}
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
                <Textarea
                  placeholder="Tip description (e.g., A 2-minute video explaining a common error in for-loops.)"
                  value={newTip.description}
                  onChange={(e) => setNewTip({ ...newTip, description: e.target.value })}
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
                <Input
                  placeholder="Video URL (e.g., https://youtube.com/shorts/your-video-id)"
                  value={newTip.videoUrl}
                  onChange={(e) => setNewTip({ ...newTip, videoUrl: e.target.value })}
                  className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  required
                />
                <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  <span className="ml-2">Add Tip</span>
                </Button>
              </form>

              <Separator className="my-6" />

              {/* Existing Tips List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Existing Tips</h3>
                {content.tips && content.tips.map((tip) => (
                  <div key={tip.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-orange-50/50 rounded-lg border border-orange-200 hover:bg-orange-100/50 transition-colors">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800 mb-1">{tip.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{tip.description}</p>
                      {tip.videoUrl && (
                        <a href={tip.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-orange-600 hover:text-orange-700 break-all">
                          {tip.videoUrl}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                      {tip.videoUrl && (
                        <a href={tip.videoUrl} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                      <Button
                        onClick={() => handleRemoveItem('tips', tip.id)}
                        variant="destructive"
                        size="sm"
                        disabled={loading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {(!content.tips || content.tips.length === 0) && (
                  <div className="text-center py-12">
                    <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No tips yet</p>
                    <p className="text-gray-400 text-sm">Add your first tip above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'drive-sync':
        return <GoogleDriveSync />;

      case 'submissions':
        return (
          <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 rounded-t-lg">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Briefcase className="w-5 h-5 text-orange-600" />
                <span>Student Submissions</span>
              </CardTitle>
              <CardDescription className="text-gray-600">
                View and manage student project submissions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {submissions.length > 0 ? (
                  submissions.map((submission) => (
                    <div key={submission.id} className="p-4 bg-orange-50/50 rounded-lg border border-orange-200 hover:bg-orange-100/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-800 mb-1">{submission.projectTitle || 'Untitled Project'}</h3>
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

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-600">Welcome, {user?.email}</p>
              </div>
            </div>
            <Button onClick={logout} variant="outline" className="flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-800">{message}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-white/60 backdrop-blur-lg rounded-xl border border-gray-200/50 shadow-lg">
          <TabButton value="students" isActive={activeTab === 'students'} onClick={setActiveTab} icon={Users} colorScheme="blue">
            Students
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
          <TabButton value="drive-sync" isActive={activeTab === 'drive-sync'} onClick={setActiveTab} icon={Cloud} colorScheme="teal">
            Drive Sync
          </TabButton>
          <TabButton value="submissions" isActive={activeTab === 'submissions'} onClick={setActiveTab} icon={Briefcase} colorScheme="red">
            Submissions
          </TabButton>
          <TabButton value="feedback" isActive={activeTab === 'feedback'} onClick={setActiveTab} icon={MessageSquare} colorScheme="cyan">
            Feedback
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

