import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  syncGoogleDriveContent, 
  initializeGoogleDriveAPI, 
  DRIVE_FOLDER_CONFIG 
} from '../lib/googleDrive';
import { updateDashboardContent, getDashboardContent } from '../lib/auth';
import { 
  RefreshCw, 
  FolderOpen, 
  Link, 
  CheckCircle, 
  AlertCircle,
  Cloud,
  Loader2
} from 'lucide-react';

const GoogleDriveSync = ({ onContentUpdate }) => {
  const [isApiReady, setIsApiReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [folderIds, setFolderIds] = useState({
    lectures: '',
    materials: '',
    resources: ''
  });
  const [lastSync, setLastSync] = useState({
    lectures: null,
    materials: null,
    resources: null
  });

  useEffect(() => {
    initializeAPI();
    loadSavedFolderIds();
  }, []);

  const initializeAPI = async () => {
    const ready = await initializeGoogleDriveAPI();
    setIsApiReady(ready);
    if (!ready) {
      setMessage('Google Drive API not available. Please check your configuration.');
    }
  };

  const loadSavedFolderIds = () => {
    const saved = localStorage.getItem('googleDriveFolderIds');
    if (saved) {
      setFolderIds(JSON.parse(saved));
    }
  };

  const saveFolderIds = (newFolderIds) => {
    localStorage.setItem('googleDriveFolderIds', JSON.stringify(newFolderIds));
    setFolderIds(newFolderIds);
  };

  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const syncFolder = async (folderType) => {
    const folderId = folderIds[folderType];
    if (!folderId) {
      showMessage(`Please enter a folder ID for ${folderType}`, true);
      return;
    }

    setLoading(true);
    try {
      // Get current content
      const currentContent = await getDashboardContent();
      
      // Sync from Google Drive
      const driveContent = await syncGoogleDriveContent(folderId, folderType);
      
      if (driveContent.length === 0) {
        showMessage(`No files found in ${folderType} folder or folder is not accessible`, true);
        setLoading(false);
        return;
      }

      // Merge with existing content (keep manual entries, add/update Drive entries)
      const existingContent = currentContent[folderType] || [];
      const manualContent = existingContent.filter(item => item.source !== 'google-drive');
      const mergedContent = [...manualContent, ...driveContent];

      // Update content
      const updatedContent = {
        ...currentContent,
        [folderType]: mergedContent
      };

      const success = await updateDashboardContent(updatedContent);
      
      if (success) {
        setLastSync({
          ...lastSync,
          [folderType]: new Date().toLocaleString()
        });
        showMessage(`Successfully synced ${driveContent.length} items from ${folderType} folder`);
        if (onContentUpdate) {
          onContentUpdate(updatedContent);
        }
      } else {
        showMessage(`Failed to update ${folderType} content`, true);
      }
    } catch (error) {
      console.error(`Error syncing ${folderType}:`, error);
      showMessage(`Error syncing ${folderType}: ${error.message}`, true);
    }
    setLoading(false);
  };

  const syncAllFolders = async () => {
    setLoading(true);
    let successCount = 0;
    
    for (const folderType of ['lectures', 'materials', 'resources']) {
      if (folderIds[folderType]) {
        try {
          await syncFolder(folderType);
          successCount++;
        } catch (error) {
          console.error(`Error syncing ${folderType}:`, error);
        }
      }
    }
    
    if (successCount > 0) {
      showMessage(`Successfully synced ${successCount} folder(s)`);
    } else {
      showMessage('No folders were synced. Please check your folder IDs.', true);
    }
    
    setLoading(false);
  };

  const extractFolderIdFromUrl = (url) => {
    // Extract folder ID from Google Drive URL
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : url;
  };

  const handleFolderIdChange = (folderType, value) => {
    const folderId = extractFolderIdFromUrl(value);
    const newFolderIds = {
      ...folderIds,
      [folderType]: folderId
    };
    saveFolderIds(newFolderIds);
  };

  if (!isApiReady) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Cloud className="w-5 h-5" />
            <span>Google Drive Integration</span>
          </CardTitle>
          <CardDescription>
            Sync content directly from your Google Drive folders
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Google Drive API is not configured. To enable this feature:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Create a Google Cloud Project</li>
                <li>Enable the Google Drive API</li>
                <li>Create an API key</li>
                <li>Add the API key to your environment variables</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Cloud className="w-5 h-5" />
          <span>Google Drive Integration</span>
        </CardTitle>
        <CardDescription>
          Sync content directly from your Google Drive folders
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert className={message.includes('Error') || message.includes('Failed') ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
            <AlertDescription className={message.includes('Error') || message.includes('Failed') ? 'text-red-800' : 'text-green-800'}>
              {message}
            </AlertDescription>
          </Alert>
        )}

        {/* Folder Configuration */}
        <div className="space-y-4">
          <h4 className="font-medium">Configure Google Drive Folders</h4>
          
          {Object.entries(DRIVE_FOLDER_CONFIG).map(([key, config]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium capitalize">
                {config.name} Folder ID or URL
              </label>
              <div className="flex space-x-2">
                <Input
                  placeholder={`Enter ${config.name} folder ID or share URL`}
                  value={folderIds[key]}
                  onChange={(e) => handleFolderIdChange(key, e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={() => syncFolder(key)}
                  disabled={loading || !folderIds[key]}
                  size="sm"
                  variant="outline"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {lastSync[key] && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <CheckCircle className="w-3 h-3" />
                  <span>Last synced: {lastSync[key]}</span>
                </div>
              )}
              <p className="text-xs text-slate-500">{config.description}</p>
            </div>
          ))}
        </div>

        {/* Sync Actions */}
        <div className="flex space-x-2 pt-4 border-t">
          <Button
            onClick={syncAllFolders}
            disabled={loading || Object.values(folderIds).every(id => !id)}
            className="flex items-center space-x-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            <span>Sync All Folders</span>
          </Button>
          
          <Badge variant="outline" className="flex items-center space-x-1">
            <FolderOpen className="w-3 h-3" />
            <span>{Object.values(folderIds).filter(id => id).length} configured</span>
          </Badge>
        </div>

        {/* Instructions */}
        <div className="text-xs text-slate-500 space-y-1">
          <p><strong>How to get folder ID:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open your Google Drive folder</li>
            <li>Copy the URL from your browser</li>
            <li>Paste the full URL here (the folder ID will be extracted automatically)</li>
            <li>Make sure the folder is shared publicly or with the service account</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleDriveSync;

