import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { uploadFileToCloudinary, saveSubmissionToFirestore } from '../lib/submissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';
import { ArrowLeft, UploadCloud, Loader2, FileCheck2, X } from 'lucide-react';

const SubmitProjectPage = () => {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [projectName, setProjectName] = useState('');
  const [projectFile, setProjectFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProjectFile(file);
    }
  };

  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) { setProjectFile(file); }};

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectName || !projectFile) {
      setError('Please provide a project name and select a file.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const fileUrl = await uploadFileToCloudinary(projectFile);

      if (fileUrl) {
        const submissionDetails = {
          studentEmail: user.email,
          projectName: projectName,
          fileUrl: fileUrl,
        };
        const success = await saveSubmissionToFirestore(submissionDetails);
        
        if (success) {
          setMessage('Your project has been submitted successfully!');
          setProjectName('');
          setProjectFile(null);
          // Use the ref to safely clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        } else {
          setError('Failed to save your submission details. Please try again.');
        }
      } else {
        setError('Failed to upload your file. Please try again.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setError('An unexpected error occurred. Please try again.');
    }

    setLoading(false);
  };

  const aiBackgroundStyle = {
    backgroundColor: '#020617',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231e293b' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
  };

  return (
    <div style={aiBackgroundStyle} className="min-h-screen text-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
        <Link to="/dashboard" className="inline-flex items-center text-slate-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        
        <Card className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 text-white">
          <CardHeader className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-600 to-teal-600 rounded-lg mb-4 shadow-lg">
                <UploadCloud className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl text-white">Submit Your Project</CardTitle>
            <CardDescription className="text-slate-400">Upload your completed project for review.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <label htmlFor="projectName" className="font-medium text-slate-300">Project Name</label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Final AI Model Submission"
                  disabled={loading}
                  className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-green-400 focus:ring-green-400"
                />
              </div>

              <div 
                className={`space-y-2 animate-in fade-in slide-in-from-bottom-6 duration-500`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <label htmlFor="projectFile" className="font-medium text-slate-300">Project File</label>
                {!projectFile ? (
                    <label htmlFor="projectFile" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${isDragging ? 'bg-green-900/30 border-green-400' : 'bg-slate-800/50 border-slate-600 hover:bg-slate-800'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-8 h-8 mb-2 text-slate-400"/>
                            <p className="mb-2 text-sm text-slate-400"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-slate-500">PDF, ZIP, DOCX, etc.</p>
                        </div>
                        <Input ref={fileInputRef} id="projectFile" type="file" className="hidden" onChange={handleFileChange} disabled={loading} />
                    </label>
                ) : (
                    <div className="flex items-center justify-between w-full p-4 border-2 border-solid border-green-500 bg-green-900/30 rounded-lg">
                        <div className="flex items-center space-x-2">
                            <FileCheck2 className="w-6 h-6 text-green-400" />
                            <span className="text-sm text-slate-300">{projectFile.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => { setProjectFile(null); if (fileInputRef.current) { fileInputRef.current.value = ''; } }} disabled={loading}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}
              </div>

              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              {message && <Alert className="bg-green-100 border-green-200 text-green-800"><AlertDescription>{message}</AlertDescription></Alert>}

              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : 'Submit Project'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SubmitProjectPage;