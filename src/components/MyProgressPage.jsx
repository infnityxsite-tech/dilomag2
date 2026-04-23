import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStudentProgress, updateLabStatus, getLeaderboard, getHomeworkLabs, getCampaigns } from '../lib/progress';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from "@/components/ui/progress";
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import {
  TrendingUp, BookOpen, Target, Award, CheckCircle2, Clock, ArrowLeft, Loader2, Play
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { type: "spring", stiffness: 100 }
  }
};

const MyProgressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [progressData, setProgressData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [labs, setLabs] = useState([]);
  const [activeCampaigns, setActiveCampaigns] = useState([]);
  const [endedCampaigns, setEndedCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const fetchedLabs = await getHomeworkLabs();
      setLabs(fetchedLabs);

      const camps = await getCampaigns();
      // Filter out any campaigns that aren't properly configured or have no labs
      const validCamps = camps.filter(c => c.selectedLabs && c.selectedLabs.length > 0);
      setActiveCampaigns(validCamps.filter(c => c.status !== 'ended'));
      setEndedCampaigns(validCamps.filter(c => c.status === 'ended'));

      const pData = await getStudentProgress(user.email);
      setProgressData(pData);
      
      const lbData = await getLeaderboard();
      setLeaderboard(lbData);
    } catch (error) {
      console.error("Error loading progress data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInProgress = async (labId) => {
    if (!user?.email) return;
    setUpdatingId(labId);
    
    const success = await updateLabStatus(user.email, labId, 'In Progress');
    if (success) {
      const pData = await getStudentProgress(user.email);
      setProgressData(pData);
    }
    setUpdatingId(null);
  };

  const navigateToSubmit = (labId, labTitle) => {
    navigate(`/submit-project?labId=${labId}&labTitle=${encodeURIComponent(labTitle)}`);
  };

  const getTotalLabsCount = () => labs.length;
  
  // Generate Chart Data Dynamically based on Campaigns
  const chartData = [...activeCampaigns, ...endedCampaigns].map(camp => {
    const total = camp.selectedLabs?.length || 0;
    const completed = (camp.selectedLabs || []).filter(labId => progressData?.labs?.[labId]?.status === 'Completed').length;
    return {
      name: camp.title.split(' ').map(w => w[0]).join('') || camp.title,
      fullName: camp.title,
      completed,
      total
    };
  });

  const lineChartData = [
    { week: 'W1', progress: 5 },
    { week: 'W2', progress: 15 },
    { week: 'W3', progress: 25 },
    { week: 'W4', progress: progressData?.progressPercent || 30 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0b] flex flex-col items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping"></div>
          </div>
        </div>
        <p className="mt-6 text-slate-400 text-sm tracking-widest uppercase font-medium">Synchronizing Curriculum Data</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-slate-50 pb-20 relative selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[20%] w-[60%] h-[60%] bg-blue-900/5 blur-[150px] rounded-full pointer-events-none"></div>
      </div>

      <header className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/[0.05] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-20">
            <div className="flex items-center gap-3 sm:gap-6">
              <Link to="/dashboard">
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center p-0.5 shadow-lg shadow-indigo-500/20">
                  <div className="w-full h-full bg-[#0a0a0b] rounded-[10px] flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-indigo-400" />
                  </div>
                </div>
                <h1 className="text-base sm:text-xl font-bold tracking-tight text-white">Performance Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 relative z-10">
        
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <motion.div variants={itemVariants}>
              <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-xl shadow-2xl hover:bg-white/[0.04] transition-colors rounded-2xl overflow-hidden group relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3 text-slate-400 font-medium">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                      <Target className="w-5 h-5"/>
                    </div>
                    <span>Global Completion</span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 pt-4">
                  <div className="flex items-baseline justify-between mb-4">
                    <h3 className="text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 tracking-tight">
                      {progressData?.progressPercent || 0}%
                    </h3>
                    <p className="text-slate-400 text-sm font-medium">{progressData?.completedCount || 0} / {getTotalLabsCount()} Modules</p>
                  </div>
                  <Progress value={progressData?.progressPercent || 0} className="h-2.5 bg-slate-800/50" indicatorClassName="bg-gradient-to-r from-indigo-500 to-purple-500" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-xl shadow-2xl hover:bg-white/[0.04] transition-colors rounded-2xl overflow-hidden group relative flex flex-col justify-center h-full">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                <CardContent className="p-6">
                  <div className="flex flex-col h-full justify-center space-y-4">
                     <div className="flex items-center gap-3 text-slate-400 font-medium">
                        <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <span>Status</span>
                     </div>
                     <div>
                       <h3 className="text-3xl font-black text-white tracking-tight">On Track</h3>
                       <p className="text-slate-400 mt-1">Active progression detected.</p>
                     </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-xl shadow-2xl hover:bg-white/[0.04] transition-colors rounded-2xl overflow-hidden group relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="absolute -right-6 -bottom-6 opacity-5 rotate-12 pointer-events-none transition-transform group-hover:rotate-6 duration-500 scale-150">
                  <Award className="w-48 h-48" />
                </div>

                <CardContent className="p-6 relative z-10 flex flex-col h-full justify-center">
                  <div className="flex items-center gap-3 text-slate-400 font-medium mb-4">
                    <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                      <Award className="w-5 h-5"/>
                    </div>
                    <span>Leaderboard Rank</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl text-amber-500 font-bold">#</span>
                      <h3 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 tracking-tight">
                        {leaderboard.findIndex(s => s.email === user?.email) !== -1 ? leaderboard.findIndex(s => s.email === user?.email) + 1 : '-'}
                      </h3>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
                      Top {leaderboard.length > 0 ? Math.round(( (leaderboard.findIndex(s => s.email === user?.email) + 1) / leaderboard.length) * 100) || 1 : 0}% 
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 pt-2 sm:pt-4">
            
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <BookOpen className="w-6 h-6 text-indigo-400"/>
                  Syllabus Tracks
                </h2>
              </div>
              
              {activeCampaigns.length === 0 && endedCampaigns.length === 0 ? (
                 <div className="text-center py-16 bg-white/[0.02] border border-white/[0.05] rounded-2xl">
                    <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No campaigns have been assigned to you yet.</p>
                 </div>
              ) : (
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="bg-white/[0.03] border border-white/[0.05] p-1 sm:p-1.5 rounded-xl mb-4 sm:mb-6 w-full flex flex-wrap h-auto gap-1">
                     <TabsTrigger value="active" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-xl py-2 flex-1 min-w-[120px] whitespace-nowrap">
                       Current Campaigns
                     </TabsTrigger>
                     <TabsTrigger value="ended" className="rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-xl py-2 flex-1 min-w-[120px] whitespace-nowrap">
                       Previous Campaigns
                     </TabsTrigger>
                  </TabsList>
                  
                  <AnimatePresence mode="wait">
                    <TabsContent value="active" className="space-y-8 focus-visible:outline-none focus:outline-none">
                      {activeCampaigns.length === 0 && <p className="text-slate-400 text-center py-8">No current campaigns in progress.</p>}
                      {activeCampaigns.map((camp, cIndex) => (
                        <div key={camp.id} className="space-y-4">
                          <div className="flex items-center gap-3 px-2">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                             <h3 className="text-xl font-bold text-white tracking-tight">{camp.title}</h3>
                          </div>
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.05 }} className="space-y-4">
                            {camp.selectedLabs?.map((labId, index) => {
                              const lab = labs.find(l => l.id === labId);
                              if (!lab) return null;
                              
                              const labStatus = progressData?.labs?.[lab.id]?.status || 'Not Started';
                              const isCompleted = labStatus === 'Completed';
                              const isSubmitted = labStatus === 'Submitted';
                              const isInProgress = labStatus === 'In Progress';
                              const isUpdating = updatingId === lab.id;
                              
                              return (
                                <motion.div key={lab.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                                <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-sm hover:bg-white/[0.04] hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden cursor-default group relative">
                                  {isCompleted && <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500"></div>}
                                  {isSubmitted && <div className="absolute top-0 left-0 h-full w-1 bg-blue-500"></div>}
                                  {isInProgress && <div className="absolute top-0 left-0 h-full w-1 bg-amber-500"></div>}
                                  
                                  <div className="flex flex-col md:flex-row items-center border-l-4 border-transparent pl-1 transition-all">
                                    <div className="p-6 w-full flex items-center justify-between">
                                      <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-inner
                                          ${isCompleted ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' : 
                                            isSubmitted ? 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30' :
                                            isInProgress ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30' : 
                                            'bg-slate-800/80 text-slate-500 ring-1 ring-white/5'}`}>
                                          {isCompleted ? <CheckCircle2 className="w-6 h-6"/> : 
                                           isSubmitted ? <CheckCircle2 className="w-6 h-6 opacity-75"/> :
                                           isInProgress ? <Play className="w-5 h-5 ml-0.5" fill="currentColor"/> : <Target className="w-6 h-6"/>}
                                        </div>
                                        <div>
                                          <div className="flex gap-2 items-center"><span className="text-[10px] uppercase font-black text-indigo-400 tracking-wider mix-blend-screen">{lab.category}</span></div>
                                          <h4 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight mt-0.5">{lab.title}</h4>
                                          <p className="text-sm text-slate-400 mt-1 flex flex-col sm:flex-row gap-2 font-medium">
                                            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> 
                                            {isCompleted ? `Verified & Completed` : 
                                             isSubmitted ? `Submitted for Review` :
                                             isInProgress ? 'In Progress' : 'Not Started'}
                                            </span>
                                          </p>
                                        </div>
                                      </div>
                                      <div className="hidden sm:flex items-center gap-3">
                                        {isCompleted && <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">Completed</span>}
                                        {isSubmitted && <span className="text-xs font-bold px-3 py-1 bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20">Pending Review</span>}
                                        {isInProgress && <span className="text-xs font-bold px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">Working</span>}
                                        
                                        {!isCompleted && !isSubmitted && (
                                           <Button 
                                             size="sm" 
                                             onClick={() => isInProgress ? navigateToSubmit(lab.id, lab.title) : handleMarkInProgress(lab.id)}
                                             disabled={isUpdating}
                                             className={`rounded-lg font-semibold shadow-lg transition-all
                                                ${isInProgress 
                                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0" 
                                                    : "bg-white/[0.05] hover:bg-white/[0.1] text-white border border-white/10 hover:border-white/20"
                                                }`}
                                           >
                                             {isUpdating ? <Loader2 className="w-4 h-4 animate-spin"/> : 
                                              isInProgress ? "Submit Work" : "Initiate Lab"}
                                           </Button>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="w-full sm:hidden p-4 border-t border-white/[0.05] bg-black/20 flex justify-end">
                                       {!isCompleted && !isSubmitted && (
                                           <Button 
                                             size="sm" 
                                             onClick={() => isInProgress ? navigateToSubmit(lab.id, lab.title) : handleMarkInProgress(lab.id)}
                                             disabled={isUpdating}
                                             className={`w-full rounded-lg font-semibold shadow-lg transition-all
                                                ${isInProgress 
                                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                                                    : "bg-white/[0.05] hover:bg-white/[0.1]"
                                                }`}
                                           >
                                             {isUpdating ? <Loader2 className="w-4 h-4 animate-spin"/> : 
                                              isInProgress ? "Submit Work" : "Initiate Lab"}
                                           </Button>
                                        )}
                                    </div>
                                  </div>
                                </Card>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </div>
                      ))}
                    </TabsContent>

                    <TabsContent value="ended" className="space-y-8 focus-visible:outline-none focus:outline-none">
                      {endedCampaigns.length === 0 && <p className="text-slate-400 text-center py-8">No previous campaigns found.</p>}
                      {endedCampaigns.map((camp, cIndex) => (
                        <div key={camp.id} className="space-y-4 opacity-75 hover:opacity-100 transition-opacity">
                          <div className="flex items-center gap-3 px-2">
                             <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                             <h3 className="text-xl font-bold text-slate-300 tracking-tight">{camp.title} <span className="text-xs font-bold px-2 py-0.5 ml-2 bg-slate-800/80 rounded border border-slate-700">ENDED</span></h3>
                          </div>
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ staggerChildren: 0.05 }} className="space-y-4">
                            {camp.selectedLabs?.map((labId, index) => {
                              const lab = labs.find(l => l.id === labId);
                              if (!lab) return null;
                              
                              const labStatus = progressData?.labs?.[lab.id]?.status || 'Not Started';
                              const isCompleted = labStatus === 'Completed';
                              
                              return (
                                <motion.div key={lab.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}>
                                <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-sm rounded-2xl overflow-hidden cursor-default group relative">
                                  {isCompleted && <div className="absolute top-0 left-0 h-full w-1 bg-emerald-500/50"></div>}
                                  
                                  <div className="flex flex-col md:flex-row items-center border-l-4 border-transparent pl-1 transition-all">
                                    <div className="p-6 w-full flex items-center justify-between">
                                      <div className="flex items-center gap-5">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-inner
                                          ${isCompleted ? 'bg-emerald-500/10 text-emerald-400/50 ring-1 ring-emerald-500/30' : 'bg-slate-800/80 text-slate-500 ring-1 ring-white/5'}`}>
                                          {isCompleted ? <CheckCircle2 className="w-5 h-5"/> : <Target className="w-5 h-5"/>}
                                        </div>
                                        <div>
                                          <div className="flex gap-2 items-center"><span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{lab.category}</span></div>
                                          <h4 className="text-sm sm:text-base font-bold text-slate-300 tracking-tight leading-tight mt-0.5">{lab.title}</h4>
                                        </div>
                                      </div>
                                      <div className="hidden sm:flex items-center gap-3">
                                        {isCompleted ? <span className="text-xs font-bold px-3 py-1 bg-emerald-500/10 text-emerald-500/80 rounded-full border border-emerald-500/20">Completed</span> : <span className="text-xs font-bold px-3 py-1 bg-slate-800 text-slate-500 rounded-full border border-slate-700">Archived</span>}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                                </motion.div>
                              );
                            })}
                          </motion.div>
                        </div>
                      ))}
                    </TabsContent>
                  </AnimatePresence>
                </Tabs>
              )}
            </motion.div>

            {/* ANALYTICS (RIGHT COLUMN) */}
            <motion.div variants={itemVariants} className="space-y-6">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                <TrendingUp className="w-6 h-6 text-indigo-400"/>
                Data Insights
              </h2>
              
              <Card className="bg-white/[0.02] border-white/[0.05] backdrop-blur-xl shadow-2xl rounded-2xl overflow-hidden p-6 space-y-8 h-fit">
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Velocity</h4>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <div className="h-40 w-full pt-2">
                   <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                      <XAxis dataKey="week" stroke="#94a3b8" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                      <YAxis stroke="#94a3b8" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                      <Tooltip 
                         contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'}}
                         itemStyle={{color: '#818cf8', fontWeight: 'bold'}}
                      />
                      <Line type="monotone" dataKey="progress" stroke="#818cf8" strokeWidth={3} dot={{r: 4, fill: '#0f172a', strokeWidth: 2, stroke: '#818cf8'}} activeDot={{r: 8, fill: '#818cf8', stroke: '#0f172a'}} />
                    </LineChart>
                  </ResponsiveContainer>
                  </div>
                </div>

                <div className="w-full h-[1px] bg-white/[0.05]"></div>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest">Campaign Density</h4>
                  <div className="h-48 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="name" stroke="#94a3b8" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#ffffff05'}}
                          contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px'}}
                          itemStyle={{color: '#c084fc', fontWeight: 'bold'}}
                        />
                        <Bar dataKey="completed" stackId="a" fill="url(#colorCompleted)" radius={[0, 0, 4, 4]} barSize={32} />
                        <Bar dataKey="total" stackId="a" fill="#1e293b" radius={[4, 4, 0, 0]} barSize={32} />
                        
                        <defs>
                          <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#818cf8" stopOpacity={1}/>
                            <stop offset="95%" stopColor="#c084fc" stopOpacity={1}/>
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </Card>
            </motion.div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MyProgressPage;
