// Google Drive API integration
// Note: This requires Google Drive API credentials and proper setup

const GOOGLE_DRIVE_API_KEY = process.env.REACT_APP_GOOGLE_DRIVE_API_KEY;
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

// Initialize Google Drive API
export const initializeGoogleDriveAPI = async () => {
  try {
    if (!window.gapi) {
      console.warn('Google API not loaded');
      return false;
    }

    await window.gapi.load('client', async () => {
      await window.gapi.client.init({
        apiKey: GOOGLE_DRIVE_API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
      });
    });

    return true;
  } catch (error) {
    console.error('Error initializing Google Drive API:', error);
    return false;
  }
};

// Get files from a specific Google Drive folder
export const getFilesFromFolder = async (folderId) => {
  try {
    if (!window.gapi || !window.gapi.client) {
      console.warn('Google Drive API not initialized');
      return [];
    }

    const response = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id,name,mimeType,webViewLink,webContentLink,thumbnailLink,createdTime,size)',
      orderBy: 'createdTime desc'
    });

    return response.result.files || [];
  } catch (error) {
    console.error('Error fetching files from Google Drive:', error);
    return [];
  }
};

// Get video files specifically
export const getVideoFiles = async (folderId) => {
  try {
    const files = await getFilesFromFolder(folderId);
    return files.filter(file => 
      file.mimeType.startsWith('video/') || 
      file.mimeType === 'application/vnd.google-apps.video'
    );
  } catch (error) {
    console.error('Error fetching video files:', error);
    return [];
  }
};

// Get document files (PDFs, Google Docs, etc.)
export const getDocumentFiles = async (folderId) => {
  try {
    const files = await getFilesFromFolder(folderId);
    return files.filter(file => 
      file.mimeType === 'application/pdf' ||
      file.mimeType === 'application/vnd.google-apps.document' ||
      file.mimeType === 'application/vnd.google-apps.presentation' ||
      file.mimeType === 'application/vnd.google-apps.spreadsheet'
    );
  } catch (error) {
    console.error('Error fetching document files:', error);
    return [];
  }
};

// Convert Google Drive file to embeddable URL
export const getEmbeddableUrl = (file) => {
  if (!file || !file.id) return null;

  // For videos, use the webViewLink
  if (file.mimeType.startsWith('video/')) {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }

  // For Google Docs, Sheets, Slides
  if (file.mimeType.includes('google-apps')) {
    return `https://docs.google.com/document/d/${file.id}/preview`;
  }

  // For PDFs
  if (file.mimeType === 'application/pdf') {
    return `https://drive.google.com/file/d/${file.id}/preview`;
  }

  return file.webViewLink;
};

// Format file size
export const formatFileSize = (bytes) => {
  if (!bytes) return 'Unknown size';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

// Format file type for display
export const getFileTypeDisplay = (mimeType) => {
  const typeMap = {
    'application/pdf': 'PDF',
    'application/vnd.google-apps.document': 'Google Doc',
    'application/vnd.google-apps.presentation': 'Google Slides',
    'application/vnd.google-apps.spreadsheet': 'Google Sheets',
    'video/mp4': 'MP4 Video',
    'video/avi': 'AVI Video',
    'video/mov': 'MOV Video',
    'video/wmv': 'WMV Video'
  };

  return typeMap[mimeType] || 'File';
};

// Sync Google Drive content with Firebase
export const syncGoogleDriveContent = async (folderId, contentType = 'lectures') => {
  try {
    const files = await getFilesFromFolder(folderId);
    
    const formattedContent = files.map(file => ({
      id: file.id,
      title: file.name,
      description: `${getFileTypeDisplay(file.mimeType)} - ${formatFileSize(file.size)}`,
      url: getEmbeddableUrl(file),
      type: getFileTypeDisplay(file.mimeType),
      date: new Date(file.createdTime).toLocaleDateString(),
      duration: file.mimeType.startsWith('video/') ? 'Video' : undefined,
      thumbnail: file.thumbnailLink,
      source: 'google-drive'
    }));

    return formattedContent;
  } catch (error) {
    console.error('Error syncing Google Drive content:', error);
    return [];
  }
};

// Configuration for different folder types
export const DRIVE_FOLDER_CONFIG = {
  lectures: {
    folderId: process.env.REACT_APP_LECTURES_FOLDER_ID,
    name: 'Lectures',
    description: 'Video lectures and recordings'
  },
  materials: {
    folderId: process.env.REACT_APP_MATERIALS_FOLDER_ID,
    name: 'Materials',
    description: 'PDFs, documents, and study materials'
  },
  resources: {
    folderId: process.env.REACT_APP_RESOURCES_FOLDER_ID,
    name: 'Resources',
    description: 'Additional resources and references'
  }
};

