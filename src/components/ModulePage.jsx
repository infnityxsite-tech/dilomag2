import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getModuleById } from '../lib/moduleService';
import { getLecturesByModule } from '../lib/lectureService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Play, Clock, Calendar, FileText, Video, ChevronRight, Layers } from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100 } }
};

const ModulePage = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [moduleData, setModuleData] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const mod = await getModuleById(moduleId);
        setModuleData(mod);
        
        if (mod) {
          const lects = await getLecturesByModule(moduleId);
          setLectures(lects);
        }
      } catch (error) {
        console.error('Error loading module data:', error);
      } finally {
        setLoading(false);
      }
    };
    if (moduleId) loadData();
  }, [moduleId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-['Inter']">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="mt-6 text-slate-400 text-sm tracking-widest uppercase font-bold">Loading Module</p>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center font-['Inter'] text-slate-50 px-4">
        <Layers className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Module Not Found</h2>
        <p className="text-slate-400 mb-6 text-center">This module may have been removed or does not exist.</p>
        <Button onClick={() => navigate('/dashboard')} variant="outline" className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-50 font-['Inter'] selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-2xl border-b border-white/5 shadow-xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-14 sm:h-20 gap-3 sm:gap-4">
            <Button onClick={() => navigate('/dashboard')} variant="ghost" size="icon" className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex-shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-indigo-400 font-bold tracking-widest uppercase mb-0.5">Module Overview</p>
              <h1 className="text-sm sm:text-xl font-black text-white tracking-tight truncate">{moduleData.name}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 relative z-10">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 sm:space-y-8">
          
          {/* Module info header */}
          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs sm:text-sm font-semibold mb-4 sm:mb-6">
              <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{lectures.length} Lectures</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2 sm:mb-4">
              {moduleData.name}
            </h2>
            {moduleData.description && (
              <p className="text-slate-400 text-sm sm:text-lg leading-relaxed max-w-3xl">
                {moduleData.description}
              </p>
            )}
          </motion.div>

          {/* Lecture list */}
          <motion.div variants={itemVariants} className="grid gap-3 sm:gap-4 mt-4 sm:mt-8">
            {lectures.length > 0 ? (
              lectures.map((lect, idx) => (
                <Link key={lect.id} to={`/dashboard/lecture/${lect.id}`}
                  className="flex items-center gap-3 sm:gap-5 p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-[#121214] border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all duration-300 group/lect shadow-lg active:scale-[0.99]">
                  
                  {/* Index number */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white/5 group-hover/lect:bg-indigo-500/20 flex items-center justify-center flex-shrink-0 transition-colors shadow-inner relative overflow-hidden">
                     <div className="absolute inset-0 bg-indigo-500/20 scale-0 group-hover/lect:scale-100 rounded-lg sm:rounded-xl transition-transform duration-500 origin-center"></div>
                     <span className="relative z-10 text-xs sm:text-sm font-black text-slate-500 group-hover/lect:text-indigo-400">{idx + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm sm:text-lg font-bold text-white group-hover/lect:text-indigo-300 transition-colors mb-1 line-clamp-2 leading-snug">{lect.title}</p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      {lect.duration && <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium"><Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{lect.duration}</span>}
                      {lect.date && <span className="text-[10px] sm:text-xs text-slate-400 flex items-center gap-1 font-medium"><Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />{lect.date}</span>}
                    </div>
                  </div>
                  
                  {/* CTA chevron (always visible on mobile as a subtle indicator) */}
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600 group-hover/lect:text-indigo-400 flex-shrink-0 transition-colors" />
                </Link>
              ))
            ) : (
              <div className="text-center py-12 sm:py-16 bg-[#121214] rounded-2xl sm:rounded-3xl border border-white/5">
                <Video className="w-10 h-10 sm:w-12 sm:h-12 text-slate-600 mx-auto mb-3 sm:mb-4 opacity-50" />
                <h3 className="text-lg sm:text-xl font-bold text-white mb-2">No Lectures Available</h3>
                <p className="text-slate-400 font-medium max-w-sm mx-auto text-sm px-4">This module doesn't have any published lectures yet. Check back soon.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default ModulePage;
