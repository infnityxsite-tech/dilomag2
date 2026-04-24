import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Video, FileText, Target, Download, ExternalLink, ChevronRight,
  Clock, Calendar, Play, BookOpen, StickyNote, Link2
} from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.03 } }
};
const itemVariants = {
  hidden: { y: 8, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 140, damping: 20 } }
};

const TAB_CONFIG = [
  { key: 'lectures', label: 'Lectures', icon: Video, color: 'indigo' },
  { key: 'materials', label: 'Materials', icon: FileText, color: 'blue' },
  { key: 'homework', label: 'Homework', icon: Target, color: 'amber' },
];

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  try {
    const d = timestamp.toDate ? timestamp.toDate() :
              (typeof timestamp === 'string' ? new Date(timestamp) :
              new Date(timestamp.seconds * 1000));
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
};

const getDisplayDate = (item) => {
  if (item.date) return item.date;
  if (item.createdAt) return formatDate(item.createdAt);
  return '';
};

const LegacyDiplomaView = ({ lectures = [], materials = [], homework = [] }) => {
  const [activeTab, setActiveTab] = useState('lectures');

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-[#121214] rounded-xl sm:rounded-2xl border border-white/5">
        {TAB_CONFIG.map(tab => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'lectures' ? lectures.length :
                        tab.key === 'materials' ? materials.length :
                        homework.length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-5 py-2 sm:py-3 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-200 whitespace-nowrap flex-1 justify-center
                ${isActive
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
            >
              <tab.icon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
              <span className="hidden xs:inline sm:inline">{tab.label}</span>
              <Badge className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 min-w-[18px] ${isActive ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-white/5 text-slate-500 border-white/10'}`}>
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Lectures Tab */}
      {activeTab === 'lectures' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-2 sm:gap-3">
          {lectures.length === 0 ? (
            <EmptyState icon={Video} text="No lectures available yet." />
          ) : (
            lectures.map((lect, idx) => (
              <motion.div key={lect.id} variants={itemVariants}>
                <Link to={`/dashboard/lecture/${lect.id}`}
                  className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl bg-[#121214] border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/20 transition-all duration-200 group active:scale-[0.99]"
                >
                  {/* Index */}
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-white/5 group-hover:bg-indigo-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                    <span className="text-[10px] sm:text-xs font-black text-slate-500 group-hover:text-indigo-400">{idx + 1}</span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] sm:text-base font-bold text-white group-hover:text-indigo-300 transition-colors mb-0.5 leading-snug break-words">{lect.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      {lect.duration && (
                        <span className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />{lect.duration}
                        </span>
                      )}
                      {getDisplayDate(lect) && (
                        <span className="text-[10px] sm:text-xs text-slate-500 flex items-center gap-1 font-medium">
                          <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />{getDisplayDate(lect)}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 flex-shrink-0 transition-colors" />
                </Link>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Materials Tab */}
      {activeTab === 'materials' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-2 sm:gap-3">
          {materials.length === 0 ? (
            <EmptyState icon={FileText} text="No materials available yet." />
          ) : (
            materials.map((mat) => (
              <motion.div key={mat.id} variants={itemVariants}>
                <div className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl bg-[#121214] border border-white/5 hover:bg-blue-500/5 hover:border-blue-500/15 transition-all duration-200 group">
                  {/* Icon */}
                  <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/10 text-blue-400 flex-shrink-0">
                    <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] sm:text-sm font-semibold text-white leading-snug break-words line-clamp-2">{mat.title}</p>
                    {mat.description && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{mat.description}</p>}
                    {getDisplayDate(mat) && <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">{getDisplayDate(mat)}</p>}
                  </div>

                  {/* Action */}
                  {mat.url && (
                    <a href={mat.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.1] text-slate-300">
                        <Download className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">Open</span>
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}

      {/* Homework Tab */}
      {activeTab === 'homework' && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid gap-2 sm:gap-3">
          {homework.length === 0 ? (
            <EmptyState icon={Target} text="No homework assignments yet." />
          ) : (
            homework.map((hw) => (
              <motion.div key={hw.id} variants={itemVariants}>
                <div className="flex items-center gap-2.5 sm:gap-4 p-3 sm:p-4 rounded-xl bg-[#121214] border border-white/5 border-l-2 border-l-amber-500/50 hover:bg-amber-500/5 hover:border-amber-500/15 transition-all duration-200 group">
                  {/* Icon */}
                  <div className="p-2 sm:p-2.5 rounded-lg bg-amber-500/10 text-amber-400 flex-shrink-0">
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] sm:text-sm font-bold text-white leading-snug break-words line-clamp-2">{hw.title}</p>
                    {hw.description && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">{hw.description}</p>}
                    {hw.dueDate && <p className="text-[9px] sm:text-[10px] text-amber-400/80 mt-0.5 flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />Due: {hw.dueDate}</p>}
                    {!hw.dueDate && getDisplayDate(hw) && <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">{getDisplayDate(hw)}</p>}
                  </div>

                  {/* Action */}
                  {hw.url && (
                    <a href={hw.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                      <Button size="sm" className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-amber-600 hover:bg-amber-700 text-white">
                        <ExternalLink className="w-3 h-3 sm:mr-1" /><span className="hidden sm:inline">View</span>
                      </Button>
                    </a>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
};

const EmptyState = ({ icon: Icon, text }) => (
  <div className="text-center py-10 sm:py-14 bg-[#121214] rounded-xl sm:rounded-2xl border border-white/5">
    <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-slate-600 mx-auto mb-2 sm:mb-3 opacity-50" />
    <p className="text-slate-400 font-medium text-xs sm:text-sm">{text}</p>
  </div>
);

export default LegacyDiplomaView;
