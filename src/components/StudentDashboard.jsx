import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getModulesByDiploma } from '../lib/moduleService';
import { getLecturesByModule } from '../lib/lectureService';
import { getDiplomaById } from '../lib/diplomaService';

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
  GraduationCap, ChevronRight, Layers, Layout, ArrowRight, X
} from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger,
} from "@/components/ui/sheet";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      } else {
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

  /* ─── Navigation menu items (shared between Sheet and desktop) ─── */
  const navItems = [
    { to: '/submit-project', label: 'Submit Project', icon: UploadCloud, accent: 'indigo' },
    { to: '/my-progress', label: 'My Progress', icon: TrendingUp, accent: 'emerald' },
    { to: '/my-evaluation', label: 'My Evaluation', icon: Award, accent: 'amber' },
    { to: '/feedback', label: 'Submit Feedback', icon: MessageSquare, accent: 'slate' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-50 selection:bg-indigo-500/30 font-['Inter'] overflow-x-hidden">
      {/* Ambient Premium Glow — constrained so it never causes overflow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-violet-600/10 blur-[120px] rounded-full" />
      </div>

      {/* ───────── Header ───────── */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Left: Brand */}
            <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0 border border-white/10">
                <Layout className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-xl font-black text-white tracking-tight truncate">Infinity X EdTech</h1>
                <p className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium">
                  <Sparkles className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                  <span className="truncate">Premium Learning Workspace</span>
                </p>
              </div>
              {/* Desktop diploma selector */}
              <div className="hidden sm:block ml-4"><DiplomaSelector /></div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Desktop-only user pill */}
              <div className="hidden md:flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-default">
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                <span className="text-sm text-slate-200 font-semibold truncate max-w-48">{user?.email}</span>
              </div>

              {/* Mobile menu trigger → Sheet drawer */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 p-0">
                    <Menu className="h-5 w-5 text-slate-300" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-[#0c0c0e] border-white/10 text-slate-50 w-[85vw] max-w-[320px] p-0">
                  <SheetHeader className="p-5 pb-3 border-b border-white/5">
                    <SheetTitle className="text-white text-lg font-black tracking-tight flex items-center gap-2">
                      <Layout className="w-5 h-5 text-indigo-400" /> Navigation
                    </SheetTitle>
                    <SheetDescription className="text-slate-400 text-xs">Quick access to your workspace.</SheetDescription>
                  </SheetHeader>

                  {/* User info (mobile) */}
                  <div className="px-5 py-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <User className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{user?.email}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Student</p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile diploma selector inside sheet */}
                  <div className="px-5 py-4 border-b border-white/5">
                    <DiplomaSelector />
                  </div>

                  {/* Nav links */}
                  <nav className="flex flex-col gap-1 p-3">
                    {navItems.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3.5 rounded-xl text-slate-200 hover:bg-white/5 active:bg-white/10 transition-colors"
                      >
                        <item.icon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <span className="font-semibold text-sm">{item.label}</span>
                      </Link>
                    ))}
                  </nav>

                  {/* Logout at bottom */}
                  <div className="mt-auto p-4 border-t border-white/5">
                    <Button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20 font-semibold rounded-xl h-12">
                      <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Desktop logout */}
              <Button onClick={logout} variant="ghost" className="hidden sm:flex h-10 px-4 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 border border-rose-500/20 font-semibold transition-colors">
                <LogOut className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
          {/* Mobile diploma selector (below header on small screens — only when menu is closed) */}
          <div className="sm:hidden pb-3"><DiplomaSelector /></div>
        </div>
      </header>

      {/* ───────── Diploma Selection Screen ───────── */}
      {!activeDiplomaId && classIds && classIds.length > 1 ? (
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-32 relative z-10 text-center">
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-8 border border-white/10">
                <Layout className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">Select Workspace</h2>
              <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto font-medium">
                You are enrolled in multiple active programs. Please select the diploma workspace you wish to access today.
              </p>
            </motion.div>
            <motion.div variants={itemVariants} className="flex justify-center mt-10">
              <div className="max-w-md w-full mx-auto inline-block text-left bg-[#121214]/80 border border-white/10 backdrop-blur-2xl p-6 sm:p-8 rounded-3xl shadow-2xl">
                <DiplomaSelector />
              </div>
            </motion.div>
          </motion.div>
        </main>
      ) : (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 relative z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 sm:space-y-10">
          
          {/* ── Welcome Banner ── */}
          <motion.div variants={itemVariants} className="relative overflow-hidden rounded-2xl sm:rounded-3xl p-5 sm:p-12 border border-white/10 bg-[#121214] shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 via-violet-600/10 to-transparent" />
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
            <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-4 sm:mb-6">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Active Diploma Workspace
              </div>
              <h2 className="text-2xl sm:text-5xl font-black text-white tracking-tight mb-2 sm:mb-4">
                Welcome back, {user?.email?.split('@')[0] || 'Student'}!
              </h2>
              <p className="text-slate-400 text-sm sm:text-lg max-w-2xl font-medium leading-relaxed">
                {diplomaName && <span className="text-indigo-400 font-bold">{diplomaName}</span>}
                {diplomaName && ' — '}Continue your learning journey. Access your modules, track your progress, and submit your latest assignments below.
              </p>
            </div>
          </motion.div>

          {/* ── Quick Stats Grid ── */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            {[
              { label: 'Total Modules', value: modules.length, icon: Layers, color: 'indigo' },
              { label: 'Total Lectures', value: totalLectures, icon: Video, color: 'violet' },
              { label: 'My Progress', value: 'View Stats', link: '/my-progress', icon: TrendingUp, color: 'emerald' },
              { label: 'Evaluation', value: 'View Grades', link: '/my-evaluation', icon: Award, color: 'amber' },
            ].map((stat, i) => (
              <div key={i} className="relative group p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-[#121214] border border-white/5 hover:border-white/10 hover:bg-white/[0.02] transition-all duration-300 overflow-hidden shadow-xl">
                <div className={`absolute -right-8 -top-8 w-32 h-32 bg-${stat.color}-500/10 blur-[40px] rounded-full group-hover:bg-${stat.color}-500/20 transition-all duration-500`} />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-6">
                    <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-400 ring-1 ring-${stat.color}-500/20`}>
                      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-[9px] sm:text-[11px] uppercase tracking-widest text-slate-400 font-bold leading-tight">{stat.label}</span>
                  </div>
                  {stat.link ? (
                    <Link to={stat.link} className={`text-sm sm:text-xl font-black text-white group-hover:text-${stat.color}-400 transition-colors flex items-center gap-1`}>
                      {stat.value} <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 opacity-50" />
                    </Link>
                  ) : (
                    <p className="text-2xl sm:text-4xl font-black text-white tracking-tight">{stat.value}</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Curriculum Map (Module Cards) ── */}
          {modules.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4 sm:space-y-6 pt-2 sm:pt-4">
              <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3 mb-4 sm:mb-8">
                <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" /> Curriculum Map
              </h3>
              {/* Mobile: single column stack · Tablet: 2 cols · Desktop: 3 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {modules.map((mod, mIdx) => {
                  const lectures = moduleLectures[mod.id] || [];
                  return (
                    <motion.div key={mod.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: mIdx * 0.1 }}>
                      <Link to={`/dashboard/module/${mod.id}`} className="block h-full">
                        <Card className="h-full bg-[#121214] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.02] shadow-xl hover:shadow-indigo-500/10 rounded-2xl sm:rounded-[32px] overflow-hidden transition-all duration-300 relative group flex flex-col">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/0 via-indigo-500/50 to-indigo-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          
                          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-4 flex-1">
                            <div className="flex items-center justify-between mb-3 sm:mb-4">
                              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                                <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
                              </div>
                              <Badge className="bg-white/5 text-slate-300 border-white/10 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors text-xs">
                                {lectures.length} Lectures
                              </Badge>
                            </div>
                            <CardTitle className="text-base sm:text-xl font-bold text-white tracking-tight mb-1 sm:mb-2 line-clamp-2 group-hover:text-indigo-300 transition-colors">{mod.name}</CardTitle>
                            {mod.description && (
                              <CardDescription className="text-xs sm:text-sm text-slate-400 font-medium line-clamp-2">
                                {mod.description}
                              </CardDescription>
                            )}
                          </CardHeader>

                          <CardContent className="p-4 sm:p-6 pt-0 mt-auto">
                            <div className="mb-4 sm:mb-5 space-y-2">
                              <div className="flex justify-between text-xs font-semibold">
                                <span className="text-slate-400">Progress</span>
                                <span className="text-indigo-400">0%</span>
                              </div>
                              <Progress value={0} className="h-1.5 sm:h-2 bg-white/5 [&>div]:bg-gradient-to-r [&>div]:from-indigo-500 [&>div]:to-violet-500" />
                            </div>
                            
                            <Button className="w-full bg-white/5 hover:bg-indigo-600 text-white border border-white/10 hover:border-indigo-500 rounded-xl font-bold transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] h-10 sm:h-11 text-sm">
                              Open Module <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </CardContent>
                        </Card>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Empty state */}
          {modules.length === 0 && (
            <motion.div variants={itemVariants} className="text-center py-16 sm:py-24 bg-[#121214] rounded-2xl sm:rounded-[32px] border border-white/5 shadow-2xl">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/5 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <GraduationCap className="w-8 h-8 sm:w-10 sm:h-10 text-slate-500" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white mb-2 sm:mb-3">Workspace Empty</h3>
              <p className="text-slate-400 max-w-md mx-auto font-medium text-sm sm:text-base px-4">Your curriculum modules and lectures will appear here once your instructor sets them up.</p>
            </motion.div>
          )}
        </motion.div>
      </main>
      )}
    </div>
  );
};

export default StudentDashboard;
