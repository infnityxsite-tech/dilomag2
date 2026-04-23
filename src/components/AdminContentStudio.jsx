import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, ExternalLink, Video, FileText, Link as LinkIcon, StickyNote, BookOpen, Lightbulb, Edit, Save, X } from 'lucide-react';
import { getAllAssets, createAsset, deleteAsset, updateAsset, reassignAsset } from '../lib/assetService';
import { createLecture, deleteLectureSafe, updateLecture, getAllLectures } from '../lib/lectureService';

const AdminContentStudio = ({ activeTab, diplomas = [], modules = [], onLectureChange }) => {
  const [csDiplomaId, setCsDiplomaId] = useState('');
  const [csModuleId, setCsModuleId] = useState('');
  const [csLectureId, setCsLectureId] = useState('');
  
  const [assets, setAssets] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Form states
  const [newLecture, setNewLecture] = useState({ title: '', description: '', url: '', duration: '', date: '', videoSource: 'youtube' });
  const [newAsset, setNewAsset] = useState({ title: '', description: '', url: '', type: 'PDF', content: '', videoUrl: '', dueDate: '', category: 'Python' });

  // Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      const allAssets = await getAllAssets();
      setAssets(allAssets);
      const allLectures = await getAllLectures();
      setLectures(allLectures);
    };
    fetchData();
  }, [refreshKey]);

  const availableModules = modules.filter(m => !csDiplomaId || m.diplomaId === csDiplomaId);
  const availableLectures = lectures.filter(l => !csModuleId || l.moduleIds?.includes(csModuleId) || l.moduleId === csModuleId);

  const handleAddLecture = async (e) => {
    e.preventDefault();
    setLoading(true);
    const diplomaIds = csDiplomaId ? [csDiplomaId] : [];
    const moduleIds = csModuleId ? [csModuleId] : [];
    
    await createLecture(newLecture, { diplomaIds, moduleIds });
    setNewLecture({ title: '', description: '', url: '', duration: '', date: '', videoSource: 'youtube' });
    setLoading(false);
    setRefreshKey(k => k + 1);
    if (onLectureChange) onLectureChange();
  };

  const handleUpdateLecture = async (e) => {
    e.preventDefault();
    setLoading(true);
    await updateLecture(editingItem.id, editForm);
    setEditingItem(null);
    setLoading(false);
    setRefreshKey(k => k + 1);
    if (onLectureChange) onLectureChange();
  };

  const handleAddAsset = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    
    const diplomaIds = csDiplomaId ? [csDiplomaId] : [];
    const moduleIds = csModuleId ? [csModuleId] : [];
    const lectureIds = csLectureId ? [csLectureId] : [];
    
    // Construct payload based on type
    const payload = {
      title: newAsset.title,
      description: newAsset.description,
    };
    if (['material', 'link', 'homework'].includes(type)) payload.url = newAsset.url;
    if (type === 'material') payload.fileType = newAsset.type;
    if (type === 'homework') {
      payload.dueDate = newAsset.dueDate;
      payload.category = newAsset.category;
    }
    if (type === 'note') payload.content = newAsset.content;
    if (type === 'tip') payload.videoUrl = newAsset.videoUrl;

    await createAsset(type, payload, { diplomaIds, moduleIds, lectureIds });
    
    setNewAsset({ title: '', description: '', url: '', type: 'PDF', content: '', videoUrl: '', dueDate: '', category: 'Python' });
    setRefreshKey(k => k + 1);
    setLoading(false);
  };

  const handleUpdateAsset = async (e, type) => {
    e.preventDefault();
    setLoading(true);
    
    // If assignments changed
    if (editForm.diplomaIds !== editingItem.diplomaIds || editForm.moduleIds !== editingItem.moduleIds || editForm.lectureIds !== editingItem.lectureIds) {
      await reassignAsset(editingItem.id, {
        diplomaIds: editForm.diplomaIds,
        moduleIds: editForm.moduleIds,
        lectureIds: editForm.lectureIds
      });
    }

    const payload = {
      title: editForm.title,
      description: editForm.description,
    };
    if (['material', 'link', 'homework'].includes(type)) payload.url = editForm.url;
    if (type === 'material') payload.fileType = editForm.type;
    if (type === 'homework') {
      payload.dueDate = editForm.dueDate;
      payload.category = editForm.category;
    }
    if (type === 'note') payload.content = editForm.content;
    if (type === 'tip') payload.videoUrl = editForm.videoUrl;

    await updateAsset(editingItem.id, payload);
    setEditingItem(null);
    setRefreshKey(k => k + 1);
    setLoading(false);
  };

  const handleDeleteAsset = async (id) => {
    setLoading(true);
    await deleteAsset(id);
    setRefreshKey(k => k + 1);
    setLoading(false);
  };

  const startEdit = (item, isLecture = false) => {
    const editData = { ...item, isLecture };
    // Normalize: legacy lectures may use videoUrl instead of url
    if (isLecture && !editData.url && editData.videoUrl) {
      editData.url = editData.videoUrl;
    }
    setEditingItem(item);
    setEditForm(editData);
  };

  const renderContextBar = () => (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center">
      <div className="text-sm font-semibold text-gray-700 mr-2">Target Context:</div>
      <select value={csDiplomaId} onChange={e => setCsDiplomaId(e.target.value)} className="bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2 text-sm">
        <option value="">No Diploma Selected</option>
        {diplomas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <select value={csModuleId} onChange={e => setCsModuleId(e.target.value)} className="bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2 text-sm" disabled={!csDiplomaId && availableModules.length === 0}>
        <option value="">No Module Selected</option>
        {availableModules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
      {activeTab !== 'lectures' && (
        <select value={csLectureId} onChange={e => setCsLectureId(e.target.value)} className="bg-white border border-gray-300 text-gray-800 rounded-lg px-3 py-2 text-sm" disabled={!csModuleId && availableLectures.length === 0}>
          <option value="">All Lectures (Module Level)</option>
          {availableLectures.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
        </select>
      )}
      <div className="text-xs text-gray-500 w-full mt-1 ml-2">
        Any new content created below will automatically be assigned to the selected context.
      </div>
    </div>
  );

  const renderAssetList = (type) => {
    const typeAssets = assets.filter(a => a.type === type);
    return (
      <div className="space-y-3 mt-8">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Existing {type.charAt(0).toUpperCase() + type.slice(1)}s</h3>
        {typeAssets.length === 0 ? (
          <p className="text-gray-500 text-sm">No items found.</p>
        ) : (
          typeAssets.map(asset => {
            const isEditing = editingItem?.id === asset.id;
            
            if (isEditing) {
              return (
                <form key={asset.id} onSubmit={(e) => handleUpdateAsset(e, type)} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <Input placeholder="Title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
                     {type === 'material' && (
                       <select value={editForm.type || editForm.fileType} onChange={e => setEditForm({ ...editForm, type: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-white">
                         <option value="PDF">PDF</option><option value="DOC">DOC</option><option value="PPT">PPT</option><option value="Other">Other</option>
                       </select>
                     )}
                     {type === 'homework' && (
                        <>
                          <Input type="date" value={editForm.dueDate} onChange={e => setEditForm({ ...editForm, dueDate: e.target.value })} />
                          <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-3 py-2 border rounded-md bg-white">
                            <option value="Python">Python</option><option value="Data Processing">Data Processing</option><option value="Machine Learning">Machine Learning</option><option value="Deep Learning">Deep Learning</option><option value="Final Project">Final Project</option>
                          </select>
                        </>
                     )}
                  </div>
                  {['material', 'link', 'homework'].includes(type) && (
                    <Input placeholder="URL" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} required />
                  )}
                  {type === 'tip' && (
                    <Input placeholder="Video URL" value={editForm.videoUrl} onChange={e => setEditForm({ ...editForm, videoUrl: e.target.value })} required />
                  )}
                  {type === 'note' ? (
                    <Textarea placeholder="Content" value={editForm.content} onChange={e => setEditForm({ ...editForm, content: e.target.value })} required rows={4} />
                  ) : (
                    <Textarea placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                  )}
                  
                  {/* Reassignment Logic */}
                  <div className="bg-white p-3 rounded-md border border-gray-200 space-y-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Reassign Context</div>
                    <div className="flex flex-col gap-2">
                      <select 
                        value={editForm.diplomaIds?.[0] || ''} 
                        onChange={e => setEditForm({ ...editForm, diplomaIds: e.target.value ? [e.target.value] : [] })} 
                        className="bg-gray-50 border border-gray-300 text-gray-800 rounded-md px-3 py-1.5 text-sm"
                      >
                        <option value="">Unassigned Diploma</option>
                        {diplomas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                      <select 
                        value={editForm.moduleIds?.[0] || ''} 
                        onChange={e => setEditForm({ ...editForm, moduleIds: e.target.value ? [e.target.value] : [] })} 
                        className="bg-gray-50 border border-gray-300 text-gray-800 rounded-md px-3 py-1.5 text-sm"
                      >
                        <option value="">Unassigned Module</option>
                        {modules.filter(m => !editForm.diplomaIds?.[0] || m.diplomaId === editForm.diplomaIds[0]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white"><Save className="w-4 h-4 mr-2" />Save</Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}><X className="w-4 h-4 mr-2" />Cancel</Button>
                  </div>
                </form>
              );
            }

            return (
            <div key={asset.id} className="flex justify-between items-center p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-indigo-200 transition-colors">
              <div>
                <h4 className="font-semibold text-gray-800">{asset.title}</h4>
                <p className="text-sm text-gray-500 max-w-2xl">{asset.description || asset.content}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {asset.diplomaIds?.map(id => {
                    const d = diplomas.find(x => x.id === id);
                    return d ? <Badge key={id} variant="outline" className="text-xs bg-indigo-50 text-indigo-700">{d.name}</Badge> : null;
                  })}
                  {asset.moduleIds?.map(id => {
                    const m = modules.find(x => x.id === id);
                    return m ? <Badge key={id} variant="outline" className="text-xs bg-purple-50 text-purple-700">{m.name}</Badge> : null;
                  })}
                  {asset.lectureIds?.map(id => {
                    const l = lectures.find(x => x.id === id);
                    return l ? <Badge key={id} variant="outline" className="text-xs bg-blue-50 text-blue-700">{l.title}</Badge> : null;
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(asset.url || asset.videoUrl) && (
                  <a href={asset.url || asset.videoUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={() => startEdit(asset)}><Edit className="w-4 h-4" /></Button>
                <Button variant="destructive" size="sm" onClick={() => handleDeleteAsset(asset.id)} disabled={loading}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        }))}
      </div>
    );
  };

  switch (activeTab) {
    case 'lectures':
      return (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-gray-800"><Video className="w-5 h-5 text-purple-600" /><span>Lectures Studio</span></CardTitle>
            <CardDescription className="text-gray-600">Create and manage core lecture videos.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {renderContextBar()}
            <form onSubmit={handleAddLecture} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Lecture title" value={newLecture.title} onChange={e => setNewLecture({ ...newLecture, title: e.target.value })} required />
                <Input placeholder="Duration (e.g. 45 min)" value={newLecture.duration} onChange={e => setNewLecture({ ...newLecture, duration: e.target.value })} />
              </div>
              <Textarea placeholder="Description" value={newLecture.description} onChange={e => setNewLecture({ ...newLecture, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Video URL" value={newLecture.url} onChange={e => setNewLecture({ ...newLecture, url: e.target.value })} />
                <Input type="date" placeholder="Date" value={newLecture.date} onChange={e => setNewLecture({ ...newLecture, date: e.target.value })} />
              </div>
              <Button type="submit" disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white"><Plus className="w-4 h-4 mr-2" />Create Lecture</Button>
            </form>
            <div className="mt-8 space-y-3">
              <h3 className="text-lg font-semibold text-gray-800">Existing Lectures</h3>
              {lectures.map(l => {
                const isEditing = editingItem?.id === l.id && editingItem?.isLecture;

                if (isEditing) {
                  return (
                    <form key={l.id} onSubmit={handleUpdateLecture} className="p-4 bg-purple-50 border border-purple-200 rounded-lg shadow-sm space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Lecture title" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} required />
                        <Input placeholder="Duration (e.g. 45 min)" value={editForm.duration} onChange={e => setEditForm({ ...editForm, duration: e.target.value })} />
                      </div>
                      <Textarea placeholder="Description" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} />
                      <div className="grid grid-cols-2 gap-4">
                        <Input placeholder="Video URL" value={editForm.url} onChange={e => setEditForm({ ...editForm, url: e.target.value })} />
                        <Input type="date" placeholder="Date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} />
                      </div>
                      
                      {/* Reassignment Logic */}
                      <div className="bg-white p-3 rounded-md border border-gray-200 space-y-3">
                        <div className="text-xs font-semibold text-gray-500 uppercase">Reassign Context</div>
                        <div className="flex flex-col gap-2">
                          <select 
                            value={editForm.diplomaIds?.[0] || ''} 
                            onChange={e => setEditForm({ ...editForm, diplomaIds: e.target.value ? [e.target.value] : [] })} 
                            className="bg-gray-50 border border-gray-300 text-gray-800 rounded-md px-3 py-1.5 text-sm"
                          >
                            <option value="">Unassigned Diploma</option>
                            {diplomas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                          <select 
                            value={editForm.moduleIds?.[0] || ''} 
                            onChange={e => setEditForm({ ...editForm, moduleIds: e.target.value ? [e.target.value] : [] })} 
                            className="bg-gray-50 border border-gray-300 text-gray-800 rounded-md px-3 py-1.5 text-sm"
                          >
                            <option value="">Unassigned Module</option>
                            {modules.filter(m => !editForm.diplomaIds?.[0] || m.diplomaId === editForm.diplomaIds[0]).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={loading} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white"><Save className="w-4 h-4 mr-2" />Save</Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setEditingItem(null)}><X className="w-4 h-4 mr-2" />Cancel</Button>
                      </div>
                    </form>
                  );
                }

                const lectureVideoUrl = l.url || l.videoUrl;
                return (
                <div key={l.id} className="p-4 bg-white border border-gray-200 shadow-sm rounded-lg hover:border-purple-200 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-800 flex items-center gap-2"><Video className="w-4 h-4 text-purple-500" /> {l.title}</div>
                      <div className="text-xs text-gray-500 mt-1">{l.duration} • {l.date}</div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {l.diplomaIds?.map(id => {
                          const d = diplomas.find(x => x.id === id);
                          return d ? <Badge key={id} variant="outline" className="text-xs bg-indigo-50 text-indigo-700">{d.name}</Badge> : null;
                        })}
                        {l.moduleIds?.map(id => {
                          const m = modules.find(x => x.id === id);
                          return m ? <Badge key={id} variant="outline" className="text-xs bg-purple-50 text-purple-700">{m.name}</Badge> : null;
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 ml-4">
                       {lectureVideoUrl && (
                          <a href={lectureVideoUrl} target="_blank" rel="noreferrer">
                            <Button variant="outline" size="sm"><ExternalLink className="w-4 h-4" /></Button>
                          </a>
                        )}
                       <Button variant="outline" size="sm" onClick={() => startEdit(l, true)}><Edit className="w-4 h-4" /></Button>
                       <Button variant="destructive" size="sm" onClick={async () => { await deleteLectureSafe(l.id); setRefreshKey(k => k + 1); if (onLectureChange) onLectureChange(); }}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                  {lectureVideoUrl && (() => {
                    // Extract YouTube embed URL
                    const url = lectureVideoUrl;
                    let embedUrl = null;
                    const ytMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|live\/))([\w-]+)/);
                    if (ytMatch) {
                      embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
                    } else if (url.includes('drive.google.com')) {
                      const driveMatch = url.match(/\/d\/([\w-]+)/);
                      if (driveMatch) embedUrl = `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
                    }
                    return embedUrl ? (
                      <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50" style={{ aspectRatio: '16/9', maxHeight: '220px' }}>
                        <iframe src={embedUrl} title={l.title} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                      </div>
                    ) : (
                      <div className="mt-3 p-3 rounded-lg bg-purple-50 border border-purple-200 text-sm text-purple-700 flex items-center gap-2">
                        <Video className="w-4 h-4" />
                        <a href={url} target="_blank" rel="noreferrer" className="underline hover:text-purple-900 truncate">{url}</a>
                      </div>
                    );
                  })()}
                </div>
              )})}
            </div>
          </CardContent>
        </Card>
      );
    case 'materials':
      return (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-gray-800"><FileText className="w-5 h-5 text-green-600" /><span>Materials Studio</span></CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {renderContextBar()}
            <form onSubmit={e => handleAddAsset(e, 'material')} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <Input placeholder="Material title" value={newAsset.title} onChange={e => setNewAsset({ ...newAsset, title: e.target.value })} required />
                 <select value={newAsset.type} onChange={e => setNewAsset({ ...newAsset, type: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                   <option value="PDF">PDF</option><option value="DOC">DOC</option><option value="PPT">PPT</option><option value="Other">Other</option>
                 </select>
              </div>
              <Textarea placeholder="Description" value={newAsset.description} onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} />
              <Input placeholder="Download URL" value={newAsset.url} onChange={e => setNewAsset({ ...newAsset, url: e.target.value })} required />
              <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Material</Button>
            </form>
            {renderAssetList('material')}
          </CardContent>
        </Card>
      );
    case 'links':
      return (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-gray-800"><LinkIcon className="w-5 h-5 text-cyan-600" /><span>Links Studio</span></CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             {renderContextBar()}
             <form onSubmit={e => handleAddAsset(e, 'link')} className="space-y-4">
              <Input placeholder="Link title" value={newAsset.title} onChange={e => setNewAsset({ ...newAsset, title: e.target.value })} required />
              <Input placeholder="URL" value={newAsset.url} onChange={e => setNewAsset({ ...newAsset, url: e.target.value })} required />
              <Textarea placeholder="Description" value={newAsset.description} onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} />
              <Button type="submit" disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Link</Button>
            </form>
            {renderAssetList('link')}
          </CardContent>
        </Card>
      );
    case 'notes':
      return (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-gray-800"><StickyNote className="w-5 h-5 text-indigo-600" /><span>Notes Studio</span></CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             {renderContextBar()}
             <form onSubmit={e => handleAddAsset(e, 'note')} className="space-y-4">
              <Input placeholder="Note title" value={newAsset.title} onChange={e => setNewAsset({ ...newAsset, title: e.target.value })} required />
              <Textarea placeholder="Content (Markdown supported)" value={newAsset.content} onChange={e => setNewAsset({ ...newAsset, content: e.target.value })} required rows={4} />
              <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Note</Button>
            </form>
            {renderAssetList('note')}
          </CardContent>
        </Card>
      );
    case 'homework':
      return (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-gray-800"><BookOpen className="w-5 h-5 text-amber-600" /><span>Homework Studio</span></CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             {renderContextBar()}
             <form onSubmit={e => handleAddAsset(e, 'homework')} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Title" value={newAsset.title} onChange={e => setNewAsset({ ...newAsset, title: e.target.value })} required />
                <select value={newAsset.category} onChange={e => setNewAsset({ ...newAsset, category: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                  <option value="Python">Python</option>
                  <option value="Data Processing">Data Processing</option>
                  <option value="Machine Learning">Machine Learning</option>
                  <option value="Deep Learning">Deep Learning</option>
                  <option value="Final Project">Final Project</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" placeholder="Due Date" value={newAsset.dueDate} onChange={e => setNewAsset({ ...newAsset, dueDate: e.target.value })} />
                <Input placeholder="Assignment URL" value={newAsset.url} onChange={e => setNewAsset({ ...newAsset, url: e.target.value })} required />
              </div>
              <Textarea placeholder="Description" value={newAsset.description} onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} />
              <Button type="submit" disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Homework</Button>
            </form>
            {renderAssetList('homework')}
          </CardContent>
        </Card>
      );
    case 'tips':
      return (
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-gray-800"><Lightbulb className="w-5 h-5 text-orange-600" /><span>Tips & Shorts Studio</span></CardTitle>
          </CardHeader>
          <CardContent className="p-6">
             {renderContextBar()}
             <form onSubmit={e => handleAddAsset(e, 'tip')} className="space-y-4">
              <Input placeholder="Tip title" value={newAsset.title} onChange={e => setNewAsset({ ...newAsset, title: e.target.value })} required />
              <Input placeholder="Video URL" value={newAsset.videoUrl} onChange={e => setNewAsset({ ...newAsset, videoUrl: e.target.value })} required />
              <Textarea placeholder="Description" value={newAsset.description} onChange={e => setNewAsset({ ...newAsset, description: e.target.value })} />
              <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Tip</Button>
            </form>
            {renderAssetList('tip')}
          </CardContent>
        </Card>
      );
    default:
      return null;
  }
};

export default AdminContentStudio;
