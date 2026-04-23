import React, { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmbeddedViewer = ({ url, title, type = 'video' }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Helper to get embeddable URL
  const getEmbedUrl = (rawUrl) => {
    if (!rawUrl) return null;
    
    // YouTube
    if (rawUrl.includes('youtube.com/watch') || rawUrl.includes('youtu.be/')) {
      const videoId = rawUrl.includes('youtu.be/') 
        ? rawUrl.split('youtu.be/')[1].split('?')[0]
        : new URL(rawUrl).searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Google Drive
    if (rawUrl.includes('drive.google.com/file/d/')) {
      const fileId = rawUrl.split('/d/')[1].split('/')[0];
      return `https://drive.google.com/file/d/${fileId}/preview`;
    }

    // Google Drive Folder
    if (rawUrl.includes('drive.google.com/drive/folders/')) {
      const folderId = rawUrl.split('/folders/')[1].split('?')[0];
      return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    }

    // Return original if we don't know how to embed, but we will fallback to a button
    return null;
  };

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl || error) {
    // Fallback to standard external link
    return (
      <a href={url} target="_blank" rel="noopener noreferrer">
        <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">
          <ExternalLink className="w-4 h-4 mr-2" /> Open {title || (type === 'video' ? 'Video' : 'Material')}
        </Button>
      </a>
    );
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 aspect-video">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="flex flex-col items-center gap-2">
             <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
             <span className="text-sm text-slate-400 font-medium">Loading {type}...</span>
          </div>
        </div>
      )}
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoading(false)}
        onError={() => setError(true)}
        title={title || "Embedded Content"}
      />
    </div>
  );
};

export default EmbeddedViewer;
