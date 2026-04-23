import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAssetsForLecture } from '../lib/assetService';
import { useAuth } from '../contexts/AuthContext';
import { getLectureById } from '../lib/lectureService';
import { getModuleById } from '../lib/moduleService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Play, Download, ExternalLink, BookOpen, FileText,
  Lightbulb, StickyNote, Target, Calendar, Clock, Video, Link2, ChevronRight
} from 'lucide-react';
import { motion } from 'framer-motion';
import EmbeddedViewer from './EmbeddedViewer';

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, type: 'spring', stiffness: 100 }
  })
};

const LecturePage = () => {
  const { lectureId } = useParams();
  const { user } = useAuth();
  const [lecture, setLecture] = useState(null);
  const [moduleName, setModuleName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLecture = async () => {
      if (!lectureId) return;
      try {
        const lectureData = await getLectureById(lectureId);
        
        // Fetch relational assigned content for this lecture from the new assetService
        const assignedItems = await getAssetsForLecture(lectureId);
        
        // Merge assigned items with legacy embedded arrays (if they haven't been migrated yet)
        const mergedLecture = { ...lectureData };
        if (assignedItems.length > 0) {
          assignedItems.forEach(item => {
            const arrName = item.type + 's'; // e.g. material -> materials, homework -> homeworks
            if (!mergedLecture[arrName]) mergedLecture[arrName] = [];
            mergedLecture[arrName].push(item);
          });
        }
        
        setLecture(mergedLecture);
        
        if (lectureData?.moduleId) {
          const moduleData = await getModuleById(lectureData.moduleId);
          setModuleName(moduleData?.name || 'Module');
        }
      } catch (error) {
        console.error('Error loading lecture:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLecture();
  }, [lectureId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="mt-6 text-slate-400 text-sm tracking-widest uppercase font-medium">Loading Lecture...</p>
        </div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center">
        <div className="text-center">
          <Video className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Lecture Not Found</h2>
          <p className="text-slate-400 mb-6">This lecture may have been removed or doesn't exist.</p>
          <Link to="/dashboard">
            <Button variant="outline" className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasContent = (arr) => arr && arr.length > 0;
  let sectionIndex = 0;

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-50 selection:bg-indigo-500/30">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/8 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-purple-600/8 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link to="/dashboard">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-slate-400 hover:text-white hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2 text-sm text-slate-400 min-w-0 overflow-hidden">
              <span className="truncate">{moduleName}</span>
              <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="text-white font-medium truncate">{lecture.title}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 space-y-8">
        {/* Lecture Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {lecture.duration && (
              <Badge variant="outline" className="border-indigo-500/30 text-indigo-300 bg-indigo-500/10 text-xs font-semibold">
                <Clock className="w-3 h-3 mr-1" /> {lecture.duration}
              </Badge>
            )}
            {lecture.date && (
              <Badge variant="outline" className="border-slate-600 text-slate-300 bg-white/[0.03] text-xs">
                <Calendar className="w-3 h-3 mr-1" /> {lecture.date}
              </Badge>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">{lecture.title}</h1>
          {lecture.description && (
            <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-3xl">{lecture.description}</p>
          )}
        </motion.div>

        {/* Video Section */}
        {(lecture.url || lecture.videoUrl) && (
          <motion.div custom={sectionIndex++} variants={sectionVariants} initial="hidden" animate="visible">
            <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden group hover:border-indigo-500/20 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Video className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Lecture Recording</h2>
                </div>
                <EmbeddedViewer url={lecture.url || lecture.videoUrl} title={lecture.title} type="video" />
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Materials Section */}
        {hasContent(lecture.materials) && (
          <motion.div custom={sectionIndex++} variants={sectionVariants} initial="hidden" animate="visible">
            <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Lecture Materials</h2>
                  <Badge className="bg-blue-500/10 text-blue-300 border-blue-500/20 text-xs">{lecture.materials.length}</Badge>
                </div>
                <div className="space-y-3">
                  {lecture.materials.map((material, idx) => (
                    <div key={material.id || idx} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors group/item">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <BookOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{material.title}</p>
                          {material.description && <p className="text-xs text-slate-400 truncate mt-0.5">{material.description}</p>}
                        </div>
                        {material.type && (
                          <Badge variant="outline" className="border-slate-600 text-slate-400 text-[10px] flex-shrink-0">{material.type}</Badge>
                        )}
                      </div>
                      {material.url && (
                        <a href={material.url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.1] text-slate-300 ml-3">
                            <Download className="w-3.5 h-3.5 mr-1.5" /> Download
                          </Button>
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Homework Section */}
        {hasContent(lecture.homeworks) && (
          <motion.div custom={sectionIndex++} variants={sectionVariants} initial="hidden" animate="visible">
            <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden border-l-4 border-l-amber-500/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                    <Target className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Homework Assignments</h2>
                  <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-xs">{lecture.homeworks.length}</Badge>
                </div>
                <div className="space-y-3">
                  {lecture.homeworks.map((hw, idx) => (
                    <div key={hw.id || idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-bold text-white">{hw.title}</p>
                            {hw.category && (
                              <Badge variant="outline" className="border-amber-500/30 text-amber-300 text-[10px]">{hw.category}</Badge>
                            )}
                          </div>
                          {hw.description && <p className="text-xs text-slate-400 mt-1">{hw.description}</p>}
                          {hw.dueDate && (
                            <p className="text-xs text-amber-400/80 mt-2 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Due: {hw.dueDate}
                            </p>
                          )}
                        </div>
                        {hw.url && (
                          <a href={hw.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0">
                              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Links Section */}
        {hasContent(lecture.links) && (
          <motion.div custom={sectionIndex++} variants={sectionVariants} initial="hidden" animate="visible">
            <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Important Links</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lecture.links.map((link, idx) => (
                    <a key={link.id || idx} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-cyan-500/5 hover:border-cyan-500/20 transition-all duration-200 group/link"
                    >
                      <ExternalLink className="w-4 h-4 text-cyan-400 flex-shrink-0 group-hover/link:scale-110 transition-transform" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{link.title}</p>
                        {link.description && <p className="text-xs text-slate-400 truncate mt-0.5">{link.description}</p>}
                      </div>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tips Section */}
        {hasContent(lecture.tips) && (
          <motion.div custom={sectionIndex++} variants={sectionVariants} initial="hidden" animate="visible">
            <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400">
                    <Lightbulb className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Tips & Shorts</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {lecture.tips.map((tip, idx) => (
                    <div key={tip.id || idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-orange-500/5 hover:border-orange-500/20 transition-colors">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-4 h-4 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white">{tip.title}</p>
                          {tip.description && <p className="text-xs text-slate-400 mt-1">{tip.description}</p>}
                          {tip.videoUrl && (
                            <div className="mt-3">
                              <EmbeddedViewer url={tip.videoUrl} title={tip.title} type="video" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Notes Section */}
        {hasContent(lecture.notes) && (
          <motion.div custom={sectionIndex++} variants={sectionVariants} initial="hidden" animate="visible">
            <Card className="bg-white/[0.02] border-white/[0.06] backdrop-blur-sm rounded-2xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <StickyNote className="w-5 h-5" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Instructor Notes</h2>
                </div>
                <div className="space-y-4">
                  {lecture.notes.map((note, idx) => (
                    <div key={note.id || idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-bold text-white">{note.title}</h3>
                        {note.date && <span className="text-[10px] text-slate-500 flex-shrink-0">{note.date}</span>}
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default LecturePage;
