import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getModulesByDiploma } from '../lib/moduleService';
import { getLecturesByModule } from '../lib/lectureService';
import { getDiplomaById } from '../lib/diplomaService';
import { getDashboardContent } from '../lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Link } from 'react-router-dom';
import DiplomaSelector from './DiplomaSelector';
import {
  LogOut, Video, FileText, ExternalLink, StickyNote, User,
  Calendar, Clock, Play, BookOpen, Brain, Sparkles, Award,
  UploadCloud, Menu, MessageSquare, Target, Lightbulb, TrendingUp,
  GraduationCap, ChevronRight, Layers, Layout
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

const StudentDashboard = () => {
  const { user, logout, activeDiplomaId, classIds } = useAuth();
  const [modules, setModules] = useState([]);
  const [moduleLectures, setModuleLectures] = useState({});
  const [diplomaName, setDiplomaName] = useState('');
  const [loading, setLoading] = useState(true);
  const [legacyContent, setLegacyContent] = useState(null);

  useEffect(() => {
    loadContent();
  }, [activeDiplomaId]);

  const loadContent = async () => {
    setLoading(true);
    try {
      if (activeDiplomaId) {
        const diploma = await getDiplomaById(activeDiplomaId);
        setDiplomaName(diploma?.name || 'My Diploma');
        const mods = await getModulesByDiploma(activeDiplomaId);
        setModules(mods);
        const lectMap = {};
        for (const mod of mods) {
          lectMap[mod.id] = await getLecturesByModule(mod.id);
        }
        setModuleLectures(lectMap);
        setLegacyContent(null);
      } else {
        // Fallback to legacy single-course content
        const content = await getDashboardContent();
        setLegacyContent(content);
        setModules([]);
        setModuleLectures({});
        setDiplomaName('AI Diploma');
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalLectures = Object.values(moduleLectures).reduce((acc, arr) => acc + arr.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-['Inter']">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="mt-6 text-slate-400 text-sm tracking-widest uppercase font-bold">Loading Workspace</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-50 selection:bg-indigo-500/30 font-['Inter']">
      {/* Ambient Premium Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Modern Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4 sm:gap-6 min-w-0 flex-1">
              <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 border border-white/10">
                <Layout className="w-6 h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate">Infinity X EdTech</h1>
                <p className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">Premium Learning Workspace</span>
                </p>
              </div>
              <div className="hidden sm:block ml-4"><DiplomaSelector /></div>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-sm text-slate-200 font-semibold truncate max-w-48">{user?.email}</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 p-0">
                    <Menu className="h-5 w-5 text-slate-300" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-[#121214] border-white/10 text-slate-50 rounded-xl shadow-2xl p-2" align="end">
                  <DropdownMenuItem asChild className="rounded-lg focus:bg-indigo-500/20 focus:text-indigo-300 cursor-pointer p-3">
                    <Link to="/submit-project" className="flex items-center"><UploadCloud className="mr-3 h-4 w-4" /><span className="font-semibold">Submit Project</span></Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg focus:bg-emerald-500/20 focus:text-emerald-400 cursor-pointer p-3 mt-1">
                    <Link to="/my-progress" className="flex items-center"><TrendingUp className="mr-3 h-4 w-4" /><span className="font-semibold">My Progress</span></Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg focus:bg-amber-500/20 focus:text-amber-400 cursor-pointer p-3 mt-1">
                    <Link to="/my-evaluation" className="flex items-center"><Award className="mr-3 h-4 w-4" /><span className="font-semibold">My Evaluation</span></Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-lg focus:bg-white/10 cursor-pointer p-3 mt-1">
                    <Link to="/feedback" className="flex items-center"><MessageSquare className="mr-3 h-4 w-4" /><span className="font-semibold">Submit Feedback</span></Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={logout} variant="ghost" className="h-10 px-4 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20 font-semibold transition-colors">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          {/* Mobile diploma selector */}
          <div className="sm:hidden pb-4"><DiplomaSelector /></div>
        </div>
      </header>

      {/* Diploma Selection Screen */}
      {!activeDiplomaId && classIds && classIds.length > 1 ? (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32 relative z-10 text-center">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-8 border border-white/10">
                <Layout className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Select Workspace</h2>
              <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium">
                You are enrolled in multiple active programs. Please select the diploma workspace you wish to access today.
              </p>
            </motion.div>
            <motion.div variants={itemVariants} className="flex justify-center mt-10">
              <div className="max-w-md w-full mx-auto inline-block text-left bg-[#121214]/80 border border-white/10 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl">
                <DiplomaSelector />
              </div>
            </motion.div>
          </motion.div>
        </main>
      ) : (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-10">
          
          {/* Premium Dynamic Welcome Banner */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-3xl p-8 sm:p-12 border border-white/10 bg-[#121214] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-transparent" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Active Diploma Workspace
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4">
                Welcome back, {user?.email?.split('@')[0] || 'Student'}!
              </h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-2xl font-medium leading-relaxed">
                {diplomaName && <span className="text-indigo-400 font-bold">{diplomaName}</span>}
                {diplomaName && ' — '}Continue your learning journey. Access your modules, track your progress, and submit your latest assignments below.
              </p>
            </div>
          </motion.div>

          {/* Premium Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { label: 'Total Modules', value: modules.length, icon: Layers, color: 'indigo' },
              { label: 'Total Lectures', value: totalLectures, icon: Video, color: 'violet' },
              { label: 'My Progress', value: 'View Stats', link: '/my-progress', icon: TrendingUp, color: 'emerald' },
              { label: 'Evaluation', value: 'View Grades', link: '/my-evaluation', icon: Award, color: 'amber' },
            ].map((stat, i) => (
              <div key={i} className="relative group p-6 rounded-3xl bg-[#121214] border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 overflow-hidden shadow-xl">
                <div className={`absolute -right-8 -top-8 w-32 h-32 bg-${stat.color}-500/10 blur-[40px] rounded-full group-hover:bg-${stat.color}-500/20 transition-all duration-500`} />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 ring-1 ring-${stat.color}-500/20`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] uppercase tracking-widest text-slate-400 font-bold">{stat.label}</span>
                  </div>
                  {stat.link ? (
                    <Link to={stat.link} className={`text-lg sm:text-xl font-black text-white group-hover:text-${stat.color}-400 transition-colors flex items-center gap-1`}>
                      {stat.value} <ChevronRight className="w-5 h-5 opacity-50" />
                    </Link>
                  ) : (
                    <p className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stat.value}</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Module-based content (Premium hierarchical view) */}
          {modules.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-6 pt-4">
              <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-8">
                <BookOpen className="w-7 h-7 text-indigo-400" /> Curriculum Map
              </h3>
              <div className="grid gap-6">
                {modules.map((mod, mIdx) => {
                  const lectures = moduleLectures[mod.id] || [];
                  return (
                    <motion.div key={mod.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mIdx * 0.1 }}>
                      <Card className="bg-[#121214] border-white/5 hover:border-white/10 shadow-2xl rounded-[32px] overflow-hidden transition-all duration-300 relative group/card">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"></div>
                        <CardHeader className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.01]">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                                <span className="text-xl font-black text-indigo-400">{mIdx + 1}</span>
                              </div>
                              <div>
                                <CardTitle className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-1">{mod.name}</CardTitle>
                                <CardDescription className="text-sm text-slate-400 font-medium">
                                  {lectures.length} lecture{lectures.length !== 1 ? 's' : ''} inside this module
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6 sm:p-8">
                          {lectures.length > 0 ? (
                            <div className="grid gap-3">
                              {lectures.map((lect, lIdx) => (
                                <Link key={lect.id} to={`/dashboard/lecture/${lect.id}`}
                                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 group/lect shadow-sm">
                                  
                                  <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-white/5 group-hover/lect:bg-indigo-500/20 flex items-center justify-center flex-shrink-0 transition-colors shadow-inner">
                                      <Play className="w-4 h-4 text-slate-400 group-hover/lect:text-indigo-400 transition-colors group-hover/lect:fill-indigo-400" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-base font-bold text-white truncate group-hover/lect:text-indigo-300 transition-colors mb-1">{lect.title}</p>
                                      <div className="flex flex-wrap items-center gap-3">
                                        {lect.duration && <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium"><Clock className="w-3 h-3" />{lect.duration}</span>}
                                        {lect.date && <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium"><Calendar className="w-3 h-3" />{lect.date}</span>}
                                        {(lect.materials?.length > 0 || lect.homeworks?.length > 0) && (
                                          <span className="text-xs text-indigo-400/80 flex items-center gap-1.5 font-bold">
                                            <FileText className="w-3 h-3" />
                                            {(lect.materials?.length || 0) + (lect.homeworks?.length || 0)} resources
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-slate-300 text-sm font-semibold group-hover/lect:bg-indigo-500/20 group-hover/lect:text-indigo-300 transition-colors">
                                    Access <ChevronRight className="w-4 h-4" />
                                  </div>
                                </Link>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-10 bg-white/[0.01] rounded-2xl border border-white/[0.02]">
                              <Video className="w-10 h-10 text-slate-600 mx-auto mb-3 opacity-50" />
                              <p className="text-slate-400 text-sm font-medium">No lectures have been published in this module yet.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Legacy flat content fallback */}
          {legacyContent && modules.length === 0 && (
            <LegacyContentView content={legacyContent} />
          )}

          {/* Empty state */}
          {!legacyContent && modules.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-24 bg-[#121214] rounded-[32px] border border-white/5 shadow-2xl">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-2xl font-black text-white mb-3">Workspace Empty</h3>
              <p className="text-slate-400 max-w-md mx-auto font-medium">Your curriculum modules and lectures will appear here once your instructor sets them up.</p>
            </motion.div>
          )}
        </motion.div>
      </main>
      )}
    </div>
  );
};

// Backward-compatible flat content view for legacy data
const LegacyContentView = ({ content }) => {
  const { lectures = [], materials = [], links = [], notes = [], homeworks = [], tips = [] } = content;
  const sections = [
    { title: 'Recorded Lectures', icon: Video, items: lectures, color: 'indigo', render: (item, i) => (
      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1a1a1d] border border-white/5 hover:border-indigo-500/30 transition-colors">
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-white truncate">{item.title}</p><p className="text-sm text-slate-400 mt-1 truncate">{item.description}</p></div>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"><Play className="w-4 h-4 mr-2" />Watch Video</Button></a>}
      </div>
    )},
    { title: 'Materials', icon: FileText, items: materials, color: 'blue', render: (item, i) => (
      <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-[#1a1a1d] border border-white/5 hover:border-blue-500/30 transition-colors">
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-white truncate">{item.title}</p></div>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="border-white/10 hover:bg-white/10 font-bold rounded-xl"><ExternalLink className="w-4 h-4 mr-2" />Open File</Button></a>}
      </div>
    )},
    { title: 'Homework', icon: Target, items: homeworks, color: 'amber', render: (item, i) => (
      <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1a1a1d] border border-white/5 hover:border-amber-500/30 transition-colors">
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-white truncate">{item.title}</p>{item.dueDate && <p className="text-sm font-semibold text-amber-500 mt-1">Deadline: {item.dueDate}</p>}</div>
        {item.url && <a href={item.url} target="_blank" rel="noopener noreferrer"><Button className="w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"><ExternalLink className="w-4 h-4 mr-2" />View Assignment</Button></a>}
      </div>
    )},
    { title: 'Tips & Shorts', icon: Lightbulb, items: tips, color: 'orange', render: (item, i) => (
      <div key={i} className="flex items-center justify-between p-5 rounded-2xl bg-[#1a1a1d] border border-white/5 hover:border-orange-500/30 transition-colors">
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-white truncate">{item.title}</p></div>
        {item.videoUrl && <a href={item.videoUrl} target="_blank" rel="noopener noreferrer"><Button className="bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-xl"><Play className="w-4 h-4 mr-2" />Watch</Button></a>}
      </div>
    )},
    { title: 'Important Links', icon: ExternalLink, items: links, color: 'cyan', render: (item, i) => (
      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 rounded-2xl bg-[#1a1a1d] border border-white/5 hover:border-cyan-500/30 transition-colors">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
          <ExternalLink className="w-5 h-5 text-cyan-400" />
        </div>
        <div className="min-w-0 flex-1"><p className="text-base font-bold text-white truncate">{item.title}</p></div>
      </a>
    )},
    { title: 'Instructor Notes', icon: StickyNote, items: notes, color: 'violet', render: (item, i) => (
      <div key={i} className="p-6 rounded-2xl bg-[#1a1a1d] border border-white/5">
        <div className="flex justify-between items-center mb-3"><p className="text-lg font-bold text-white">{item.title}</p>{item.date && <span className="px-3 py-1 bg-white/5 rounded-full text-xs font-semibold text-slate-400">{item.date}</span>}</div>
        <p className="text-base text-slate-300 whitespace-pre-wrap leading-relaxed">{item.content}</p>
      </div>
    )},
  ];

  return (
    <div className="space-y-8 pt-4">
      <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-6">
        <BookOpen className="w-7 h-7 text-indigo-400" /> Legacy Content
      </h3>
      {sections.filter(s => s.items.length > 0).map((section, sIdx) => (
        <Card key={sIdx} className="bg-[#121214] border-white/5 shadow-2xl rounded-[32px] overflow-hidden">
          <CardHeader className="p-6 sm:p-8 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl bg-${section.color}-500/10 text-${section.color}-400 ring-1 ring-${section.color}-500/20`}>
                <section.icon className="w-6 h-6" />
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-white tracking-tight">{section.title}</CardTitle>
              <Badge className={`bg-${section.color}-500/10 text-${section.color}-400 border-${section.color}-500/20 text-sm font-bold px-3 py-1 ml-auto`}>
                {section.items.length} items
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 sm:p-8 space-y-3 bg-[#0a0a0b]/50">
            {section.items.map(section.render)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StudentDashboard;
