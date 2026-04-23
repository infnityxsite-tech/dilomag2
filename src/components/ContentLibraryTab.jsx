import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Link as LinkIcon, Video, StickyNote, BookOpen, Lightbulb,
  Settings, Search, Layers, GraduationCap, ChevronRight, Loader2,
  ArrowUpDown, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";

import { 
  getAssignmentsForContent,
  assignContent,
  unassignContent
} from '../lib/contentService';
import { getDiplomas } from '../lib/diplomaService';
import { getModulesByDiploma } from '../lib/moduleService';
import { getLecturesByDiploma } from '../lib/lectureService';
import { getDashboardContent } from '../lib/auth';

/**
 * ContentLibraryTab — Orchestration Layer
 * 
 * This component does NOT replace the individual content creation tabs.
 * Instead, it provides a unified read-only view of ALL content across 
 * the platform (legacy + relational) and allows admins to manage 
 * assignments (which lecture/module/diploma each item belongs to).
 */
const ContentLibraryTab = () => {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Hierarchy data for assignment
  const [diplomas, setDiplomas] = useState([]);
  const [modules, setModules] = useState({});
  const [lectures, setLectures] = useState({});

  // Assignment modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeAssignItem, setActiveAssignItem] = useState(null);
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);

  useEffect(() => {
    loadEverything();
  }, []);

  const loadEverything = async () => {
    setLoading(true);
    try {
      // 1. Load legacy content from content/dashboard
      const legacyContent = await getDashboardContent();
      
      // 2. Build unified list from legacy arrays
      const unified = [];
      
      if (legacyContent.lectures) {
        legacyContent.lectures.forEach(item => {
          unified.push({ ...item, _type: 'lecture', _source: 'legacy' });
        });
      }
      if (legacyContent.materials) {
        legacyContent.materials.forEach(item => {
          unified.push({ ...item, _type: 'material', _source: 'legacy' });
        });
      }
      if (legacyContent.homeworks) {
        legacyContent.homeworks.forEach(item => {
          unified.push({ ...item, _type: 'homework', _source: 'legacy' });
        });
      }
      if (legacyContent.links) {
        legacyContent.links.forEach(item => {
          unified.push({ ...item, _type: 'link', _source: 'legacy' });
        });
      }
      if (legacyContent.notes) {
        legacyContent.notes.forEach(item => {
          unified.push({ ...item, _type: 'note', _source: 'legacy' });
        });
      }
      if (legacyContent.tips) {
        legacyContent.tips.forEach(item => {
          unified.push({ ...item, _type: 'tip', _source: 'legacy' });
        });
      }

      setAllItems(unified);

      // 3. Load hierarchy for assignment UI
      const dips = await getDiplomas(false);
      setDiplomas(dips);
      
      const modsMap = {};
      const lecsMap = {};
      for (const d of dips) {
        modsMap[d.id] = await getModulesByDiploma(d.id);
        lecsMap[d.id] = await getLecturesByDiploma(d.id);
      }
      setModules(modsMap);
      setLectures(lecsMap);
    } catch (err) {
      console.error('Error loading content library:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filtered + searched items
  const filteredItems = useMemo(() => {
    let items = allItems;
    if (filterType !== 'all') {
      items = items.filter(i => i._type === filterType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => 
        (i.title || '').toLowerCase().includes(q) || 
        (i.description || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [allItems, filterType, searchQuery]);

  const openAssignModal = async (item) => {
    setActiveAssignItem(item);
    setAssignLoading(true);
    // Try to fetch existing assignments for this item
    try {
      const assigns = await getAssignmentsForContent(item.id);
      setCurrentAssignments(assigns);
    } catch {
      setCurrentAssignments([]);
    }
    setAssignLoading(false);
    setIsAssignModalOpen(true);
  };

  const toggleAssignment = async (targetId, targetType) => {
    if (!activeAssignItem) return;
    setAssignLoading(true);
    
    const exists = currentAssignments.find(a => a.targetId === targetId);
    if (exists) {
      await unassignContent(activeAssignItem.id, targetId);
    } else {
      await assignContent(activeAssignItem.id, targetId, targetType);
    }
    
    const assigns = await getAssignmentsForContent(activeAssignItem.id);
    setCurrentAssignments(assigns);
    setAssignLoading(false);
  };

  const getIcon = (type) => {
    switch(type) {
      case 'lecture': return <Video className="w-4 h-4 text-purple-500" />;
      case 'material': return <FileText className="w-4 h-4 text-green-500" />;
      case 'homework': return <BookOpen className="w-4 h-4 text-amber-500" />;
      case 'link': return <LinkIcon className="w-4 h-4 text-cyan-500" />;
      case 'note': return <StickyNote className="w-4 h-4 text-indigo-500" />;
      case 'tip': return <Lightbulb className="w-4 h-4 text-orange-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      lecture: 'bg-purple-100 text-purple-700 border-purple-200',
      material: 'bg-green-100 text-green-700 border-green-200',
      homework: 'bg-amber-100 text-amber-700 border-amber-200',
      link: 'bg-cyan-100 text-cyan-700 border-cyan-200',
      note: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      tip: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Count stats
  const stats = useMemo(() => {
    const counts = { lecture: 0, material: 0, homework: 0, link: 0, note: 0, tip: 0 };
    allItems.forEach(item => { counts[item._type] = (counts[item._type] || 0) + 1; });
    return counts;
  }, [allItems]);

  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading content across all sources...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader className="bg-gradient-to-r from-violet-50 to-indigo-50 rounded-t-lg">
          <CardTitle className="flex items-center space-x-2 text-gray-800">
            <Layers className="w-5 h-5 text-violet-600" />
            <span>Content Library — Orchestration View</span>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Unified view of all platform content. Use the individual tabs (Lectures, Materials, etc.) to create content, then use this view to manage assignments across diplomas and modules.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {/* Stats Row */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
            {[
              { label: 'Lectures', count: stats.lecture, color: 'purple' },
              { label: 'Materials', count: stats.material, color: 'green' },
              { label: 'Homework', count: stats.homework, color: 'amber' },
              { label: 'Links', count: stats.link, color: 'cyan' },
              { label: 'Notes', count: stats.note, color: 'indigo' },
              { label: 'Tips', count: stats.tip, color: 'orange' },
            ].map(s => (
              <div 
                key={s.label} 
                onClick={() => setFilterType(filterType === s.label.toLowerCase().replace('s','') ? 'all' : s.label.toLowerCase().replace(/s$/,''))}
                className={`p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  filterType === s.label.toLowerCase().replace(/s$/, '') 
                    ? `bg-${s.color}-100 border-${s.color}-300 ring-2 ring-${s.color}-200` 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="text-2xl font-bold text-gray-800">{s.count}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Search + Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search all content..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                className="pl-10 border-gray-300"
              />
            </div>
            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="all">All Types</option>
              <option value="lecture">Lectures</option>
              <option value="material">Materials</option>
              <option value="homework">Homework</option>
              <option value="link">Links</option>
              <option value="note">Notes</option>
              <option value="tip">Tips</option>
            </select>
            {filterType !== 'all' && (
              <Button variant="ghost" size="sm" onClick={() => setFilterType('all')} className="text-gray-500">
                Clear filter
              </Button>
            )}
          </div>

          {/* Content List */}
          <div className="space-y-2">
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id || idx} 
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex-shrink-0 p-1.5 bg-gray-50 rounded-md group-hover:bg-gray-100 transition-colors">
                    {getIcon(item._type)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-800 text-sm truncate">{item.title}</span>
                      <Badge variant="outline" className={`text-[10px] uppercase px-1.5 py-0 ${getTypeColor(item._type)}`}>
                        {item._type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] uppercase px-1.5 py-0 bg-gray-50 text-gray-500 border-gray-200">
                        {item._source}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">{item.description}</p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={() => openAssignModal(item)} 
                  variant="outline" 
                  size="sm" 
                  className="flex-shrink-0 ml-4 bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 text-xs"
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" /> Assign
                </Button>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="text-center py-12">
                <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No content matches your filter.</p>
                <p className="text-gray-400 text-sm mt-1">Use the individual tabs to create content first.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Assignment Modal */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-violet-500" />
              Manage Assignments
            </DialogTitle>
            <DialogDescription>
              Choose where <strong className="text-gray-800">{activeAssignItem?.title}</strong> should appear in the student view.
            </DialogDescription>
          </DialogHeader>
          
          {assignLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
            </div>
          ) : (
            <div className="space-y-5 mt-4">
              {diplomas.map(dip => (
                <div key={dip.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Diploma Level */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-500" />
                      <span className="font-semibold text-gray-800 text-sm">{dip.name}</span>
                    </div>
                    <Button 
                      size="sm" 
                      className="h-7 text-xs"
                      variant={currentAssignments.some(a => a.targetId === dip.id) ? "default" : "outline"}
                      onClick={() => toggleAssignment(dip.id, 'diploma')}
                    >
                      {currentAssignments.some(a => a.targetId === dip.id) ? '✓ Assigned' : 'Assign'}
                    </Button>
                  </div>
                  
                  {/* Modules & Lectures */}
                  <div className="p-3 space-y-3">
                    {modules[dip.id]?.map(mod => (
                      <div key={mod.id} className="pl-3 border-l-2 border-indigo-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-sm font-medium text-gray-700">{mod.name}</span>
                          </div>
                          <Button 
                            size="sm" className="h-6 text-[11px] px-2" 
                            variant={currentAssignments.some(a => a.targetId === mod.id) ? "default" : "outline"}
                            onClick={() => toggleAssignment(mod.id, 'module')}
                          >
                            {currentAssignments.some(a => a.targetId === mod.id) ? '✓' : 'Assign'}
                          </Button>
                        </div>
                        
                        <div className="space-y-1.5 ml-2">
                          {lectures[dip.id]?.filter(l => l.moduleId === mod.id).map(lec => (
                            <div key={lec.id} className="flex items-center justify-between bg-gray-50 p-2 rounded border border-gray-100">
                              <div className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                                <Video className="w-3 h-3 text-gray-400 flex-shrink-0" /> 
                                <span className="truncate">{lec.title}</span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={currentAssignments.some(a => a.targetId === lec.id)}
                                onChange={() => toggleAssignment(lec.id, 'lecture')}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer flex-shrink-0"
                              />
                            </div>
                          ))}
                          {(!lectures[dip.id] || lectures[dip.id]?.filter(l => l.moduleId === mod.id).length === 0) && (
                            <p className="text-xs text-gray-400 italic py-1">No lectures in this module</p>
                          )}
                        </div>
                      </div>
                    ))}
                    {(!modules[dip.id] || modules[dip.id].length === 0) && (
                      <p className="text-xs text-gray-400 italic py-2">No modules in this diploma</p>
                    )}
                  </div>
                </div>
              ))}
              {diplomas.length === 0 && (
                <p className="text-center text-gray-500 py-6">No diplomas found. Create one in the Diplomas tab first.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentLibraryTab;
