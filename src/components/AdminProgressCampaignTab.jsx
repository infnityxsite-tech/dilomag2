import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  createCampaign, getCampaigns, getAllStudentsProgress, getHomeworkLabs, updateCampaign, deleteCampaign
} from '../lib/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, Plus, Users, Target, Activity, Zap, CheckCircle2, Award, BookOpen, Edit2, Trash2, Power } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { motion } from 'framer-motion';

const AdminProgressCampaignTab = ({ adminScopeDiplomaId, scopedEmails }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [allStudentProgress, setAllStudentProgress] = useState([]);
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Campaign Form State
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [newCampaign, setNewCampaign] = useState({
    title: '', startDate: '', endDate: '', dailyPace: 1, assignedTo: 'all', selectedLabs: [], status: 'active'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const campData = await getCampaigns();
      const progData = await getAllStudentsProgress();
      const labsData = await getHomeworkLabs();
      
      setCampaigns(campData);
      setAllStudentProgress(progData);
      setLabs(labsData);
    } catch (error) {
      console.error("Error loading progress data", error);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleSaveCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.title || !newCampaign.startDate || !newCampaign.endDate) return;

    setFormLoading(true);
    let success = false;

    if (editingCampaignId) {
       success = await updateCampaign(editingCampaignId, newCampaign);
    } else {
       success = await createCampaign(newCampaign);
    }

    if (success) {
      showMessage(`Campaign ${editingCampaignId ? 'updated' : 'created'} successfully!`);
      setNewCampaign({ title: '', startDate: '', endDate: '', dailyPace: 1, assignedTo: 'all', selectedLabs: [], status: 'active' });
      setEditingCampaignId(null);
      loadData();
    } else {
      showMessage(`Failed to ${editingCampaignId ? 'update' : 'create'} campaign.`);
    }
    setFormLoading(false);
  };

  const handleEditCampaignClick = (camp) => {
    setEditingCampaignId(camp.id);
    setNewCampaign({
      title: camp.title || '',
      startDate: camp.startDate || '',
      endDate: camp.endDate || '',
      dailyPace: camp.dailyPace || 1,
      assignedTo: camp.assignedTo || 'all',
      selectedLabs: camp.selectedLabs || [],
      status: camp.status || 'active'
    });
  };

  const handleToggleCampaignStatus = async (camp) => {
    setFormLoading(true);
    const newStatus = camp.status === 'ended' ? 'active' : 'ended';
    const success = await updateCampaign(camp.id, { ...camp, status: newStatus });
    if (success) {
      showMessage(`Campaign marked as ${newStatus}.`);
      loadData();
    } else {
      showMessage("Failed to update campaign status.");
    }
    setFormLoading(false);
  };

  const handleDeleteCampaign = async (campId) => {
    if (!window.confirm("Are you sure you want to delete this campaign?")) return;
    setFormLoading(true);
    const success = await deleteCampaign(campId);
    if (success) {
      showMessage("Campaign deleted successfully.");
      loadData();
      if (editingCampaignId === campId) {
         setEditingCampaignId(null);
         setNewCampaign({ title: '', startDate: '', endDate: '', dailyPace: 1, assignedTo: 'all', selectedLabs: [], status: 'active' });
      }
    } else {
      showMessage("Failed to delete campaign.");
    }
    setFormLoading(false);
  };

  const handleToggleLab = (labId) => {
    setNewCampaign(prev => {
      const selected = prev.selectedLabs.includes(labId)
        ? prev.selectedLabs.filter(id => id !== labId)
        : [...prev.selectedLabs, labId];
      return { ...prev, selectedLabs: selected };
    });
  };

  // Filter progress based on scopedEmails
  const studentProgress = adminScopeDiplomaId === 'all' || !scopedEmails
    ? allStudentProgress
    : allStudentProgress.filter(s => scopedEmails.some(emailObj => emailObj.email === s.email));

  // Dashboard Stats
  const totalStudents = studentProgress.length;
  const activeStudents = studentProgress.filter(s => s.completedCount > 0).length;
  
  const getCompletionDistribution = () => {
    const bins = { '0-20%': 0, '21-40%': 0, '41-60%': 0, '61-80%': 0, '81-100%': 0 };
    studentProgress.forEach(s => {
      const p = s.progressPercent || 0;
      if (p <= 20) bins['0-20%']++;
      else if (p <= 40) bins['21-40%']++;
      else if (p <= 60) bins['41-60%']++;
      else if (p <= 80) bins['61-80%']++;
      else bins['81-100%']++;
    });
    return Object.keys(bins).map(k => ({ range: k, count: bins[k] }));
  };

  const COLORS = ['#334155', '#475569', '#6366f1', '#10b981', '#fbbf24'];
  const distData = getCompletionDistribution();

  if (loading && !campaigns.length) {
    return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500 w-8 h-8" /></div>;
  }

  return (
    <div className="bg-slate-50 min-h-[500px] p-2 rounded-2xl">
      <Card className="shadow-2xl border-0 bg-white rounded-2xl overflow-hidden">
        <CardHeader className="bg-white border-b border-gray-100 py-6 px-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <CardTitle className="flex items-center space-x-3 text-gray-900 text-2xl font-black tracking-tight">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 shadow-sm">
               <TrendingUp className="w-5 h-5" />
            </div>
            <span>Progress & Module Settings</span>
          </CardTitle>
          <CardDescription className="text-gray-500 text-base mt-2">
            Monitor, orchestrate, and manage dynamic curriculum modules.
          </CardDescription>
          {message && <div className="text-sm font-semibold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg mt-4 border border-emerald-100 shadow-sm inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4"/> {message}</div>}
        </CardHeader>
        
        <Tabs defaultValue="dashboard" className="px-8 pb-8 pt-6">
          <TabsList className="mb-8 bg-slate-100/50 p-1.5 rounded-xl inline-flex flex-wrap gap-1 h-auto border border-slate-200/60 shadow-inner">
            <TabsTrigger value="dashboard" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm py-2 px-6 font-semibold transition-all">Command Center</TabsTrigger>
            <TabsTrigger value="campaigns" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm py-2 px-6 font-semibold transition-all">Sprints & Hub</TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm py-2 px-6 font-semibold transition-all">Leaderboard</TabsTrigger>
          </TabsList>
          
          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-8 mt-2 focus-visible:outline-none">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Users className="w-24 h-24"/></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-4 rounded-xl bg-blue-50 text-blue-500">
                     <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Engaged Students</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tight">{activeStudents} <span className="text-lg text-gray-400 font-medium tracking-normal">/ {totalStudents}</span></p>
                  </div>
                </div>
              </div>
              </motion.div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><Activity className="w-24 h-24"/></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-4 rounded-xl bg-indigo-50 text-indigo-500">
                     <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Velocity</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tight">
                      {totalStudents > 0 ? Math.round(studentProgress.reduce((acc, curr) => acc + (curr.progressPercent || 0), 0) / totalStudents) : 0}%
                    </p>
                  </div>
                </div>
              </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform"><BookOpen className="w-24 h-24"/></div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-4 rounded-xl bg-emerald-50 text-emerald-500">
                     <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-1">Dynamic Modules</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tight">{labs.length}</p>
                  </div>
                </div>
              </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>
               <Card className="p-6 border-gray-100 shadow-xl shadow-slate-200/40 rounded-2xl h-full">
                 <div className="flex items-center justify-between mb-8">
                   <h3 className="text-base font-bold text-gray-800">Completion Distribution</h3>
                   <div className="px-3 py-1 bg-slate-50 text-slate-500 text-xs font-semibold rounded-full border border-slate-200">Across Cohort</div>
                 </div>
                 <div className="h-64">
                   <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distData} margin={{ top: 0, right: 0, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10}/>
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}}/>
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                       <Bar dataKey="count" radius={[6,6,0,0]} barSize={40}>
                         {
                           distData.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))
                         }
                       </Bar>
                      </BarChart>
                   </ResponsiveContainer>
                 </div>
               </Card>
               </motion.div>

               <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 }}>
               <Card className="p-6 border-gray-100 shadow-xl shadow-slate-200/40 rounded-2xl h-full flex flex-col">
                 <div className="flex items-center justify-between mb-6">
                   <h3 className="text-base font-bold text-gray-800">Top Performers Map</h3>
                 </div>
                 <div className="flex-1 flex flex-col gap-3 justify-center">
                   {studentProgress.sort((a,b) => (b.progressPercent || 0) - (a.progressPercent || 0)).slice(0,5).map((student, i) => (
                     <div key={i} className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl border border-slate-100">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-xs font-bold text-slate-600">{i+1}</div>
                         <div>
                            <span className="text-sm font-semibold text-slate-700 block">{student.email.split('@')[0]}</span>
                            <span className="text-xs text-slate-400 font-medium">#{student.email}</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${student.progressPercent || 0}%`}}></div>
                         </div>
                         <span className="text-sm font-black text-indigo-600 w-10 text-right">{student.progressPercent || 0}%</span>
                       </div>
                     </div>
                   ))}
                 </div>
               </Card>
               </motion.div>
            </div>
          </TabsContent>



          {/* Campaigns / Sprints */}
          <TabsContent value="campaigns">
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2 focus-visible:outline-none">
               <Card className="lg:col-span-1 border-gray-100 shadow-xl shadow-slate-200/40 p-6 rounded-2xl h-fit sticky top-24">
                 <h3 className="text-lg font-bold mb-6 text-gray-800">{editingCampaignId ? 'Edit Campaign' : 'Draft New Campaign'}</h3>
                 <form onSubmit={handleSaveCampaign} className="space-y-5">
                   <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Campaign Identifier</label>
                     <Input value={newCampaign.title} onChange={e => setNewCampaign({...newCampaign, title: e.target.value})} placeholder="e.g. Q3 ML Acceleration" className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 h-11" />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Kickoff</label>
                       <Input type="date" value={newCampaign.startDate} onChange={e => setNewCampaign({...newCampaign, startDate: e.target.value})} className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 h-11" />
                     </div>
                     <div className="space-y-1.5">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Deadline</label>
                       <Input type="date" value={newCampaign.endDate} onChange={e => setNewCampaign({...newCampaign, endDate: e.target.value})} className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 h-11" />
                     </div>
                   </div>
                   <div className="space-y-3">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Modules (Homeworks)</label>
                     <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-1">
                       {labs.length === 0 ? <p className="text-sm text-slate-400 p-2">No homeworks available</p> : 
                         labs.map(lab => (
                           <label key={lab.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded cursor-pointer">
                             <input 
                               type="checkbox" 
                               checked={newCampaign.selectedLabs.includes(lab.id)}
                               onChange={() => handleToggleLab(lab.id)}
                               className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                             />
                             <div className="flex flex-col">
                               <span className="text-sm font-medium text-slate-700">{lab.title}</span>
                               <span className="text-[10px] text-slate-500">{lab.category}</span>
                             </div>
                           </label>
                         ))
                       }
                     </div>
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trajectory (Labs/day)</label>
                     <Input type="number" min="0.1" step="0.1" value={newCampaign.dailyPace} onChange={e => setNewCampaign({...newCampaign, dailyPace: parseFloat(e.target.value)})} className="bg-slate-50 border-slate-200 focus-visible:ring-indigo-500 h-11" />
                   </div>
                   <div className="pt-2 flex gap-3">
                     <Button type="submit" disabled={formLoading} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] h-12">
                       {formLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2"/> : <Plus className="w-5 h-5 mr-2"/>} {editingCampaignId ? 'Update Campaign' : 'Launch Campaign'}
                     </Button>
                     {editingCampaignId && (
                       <Button type="button" variant="outline" onClick={() => { setEditingCampaignId(null); setNewCampaign({ title: '', startDate: '', endDate: '', dailyPace: 1, assignedTo: 'all', selectedLabs: [], status: 'active' }); }} className="rounded-xl border-slate-200 h-12">
                         Cancel
                       </Button>
                     )}
                   </div>
                 </form>
               </Card>

               <div className="lg:col-span-2 space-y-4">
                 {campaigns.length === 0 ? (
                   <div className="text-center py-20 bg-slate-50 border border-slate-200 border-dashed rounded-2xl">
                     <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
                       <Target className="w-8 h-8 text-slate-300" />
                     </div>
                     <p className="text-slate-500 font-medium">No campaigns currently active.</p>
                     <p className="text-slate-400 text-sm mt-1">Draft one to start tracking cohort sprints.</p>
                   </div>
                 ) : (
                   campaigns.map(camp => (
                     <Card key={camp.id} className="p-6 border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all rounded-2xl group cursor-pointer bg-white">
                       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                         <div>
                           <div className="flex items-center gap-3 mb-2">
                             <div className={`w-2 h-2 rounded-full ${camp.status === 'ended' ? 'bg-slate-400' : 'bg-emerald-500'}`}></div>
                             <h4 className={`text-xl font-bold ${camp.status === 'ended' ? 'text-slate-500' : 'text-slate-800'}`}>{camp.title}</h4>
                             {camp.status === 'ended' && (
                               <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-widest border border-slate-200">Ended</span>
                             )}
                           </div>
                           <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                             <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100"><span className="text-slate-400">Launch:</span> {camp.startDate}</span>
                             <span className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100"><span className="text-slate-400">Target:</span> {camp.endDate}</span>
                           </div>
                         </div>
                         <div className="flex items-center gap-3">
                           <div className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-sm tracking-wide text-center shrink-0">
                             <span className="block text-[10px] uppercase text-indigo-400/80 mb-0.5">Labs Included</span>
                             {camp.selectedLabs?.length || 0} Modules
                           </div>
                           <div className="flex flex-col gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                             <Button size="icon" variant={camp.status === 'ended' ? 'outline' : 'secondary'} onClick={(e) => { e.stopPropagation(); handleToggleCampaignStatus(camp); }} className={`h-7 w-7 sm:h-8 sm:w-8 shadow-sm ${camp.status === 'ended' ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200' : 'text-slate-600 hover:text-amber-600'}`} title={camp.status === 'ended' ? "Reactivate Campaign" : "End Campaign"}>
                                <Power className="w-3 h-3 sm:w-4 sm:h-4" />
                             </Button>
                             <Button size="icon" variant="outline" onClick={(e) => { e.stopPropagation(); handleEditCampaignClick(camp); }} className="h-7 w-7 sm:h-8 sm:w-8 shadow-sm">
                                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600" />
                             </Button>
                             <Button size="icon" variant="destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCampaign(camp.id); }} className="h-7 w-7 sm:h-8 sm:w-8 shadow-sm bg-red-500/10 hover:bg-red-500/20 text-red-600 border-0">
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                             </Button>
                           </div>
                         </div>
                       </div>
                     </Card>
                   ))
                 )}
               </div>
             </div>
          </TabsContent>

          <TabsContent value="leaderboard">
            <Card className="mt-2 overflow-hidden border border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl">
              <div className="bg-slate-50 p-6 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><Award className="w-5 h-5"/></div> 
                  Global Rankings View
                </h3>
              </div>
              <div className="p-0 overflow-x-auto">
                 <table className="w-full text-left text-sm text-gray-600 whitespace-nowrap">
                   <thead className="bg-white border-b border-slate-100">
                     <tr>
                       <th className="px-8 py-4 font-bold text-slate-400 text-xs uppercase tracking-widest">Rank</th>
                       <th className="px-8 py-4 font-bold text-slate-400 text-xs uppercase tracking-widest">Student Identify</th>
                       <th className="px-8 py-4 font-bold text-slate-400 text-xs uppercase tracking-widest">Total Sprints</th>
                       <th className="px-8 py-4 font-bold text-slate-400 text-xs uppercase tracking-widest">Global Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50 bg-white">
                     {studentProgress.sort((a,b) => (b.progressPercent || 0) - (a.progressPercent || 0)).map((student, idx) => (
                       <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                         <td className="px-8 py-5">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black shadow-sm text-xs border
                            ${idx === 0 ? 'bg-amber-100 text-amber-600 border-amber-200' : 
                              idx === 1 ? 'bg-slate-200 text-slate-600 border-slate-300' : 
                              idx === 2 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-400 border-slate-200'}`}>
                             {idx + 1}
                           </div>
                         </td>
                         <td className="px-8 py-5 font-semibold text-slate-700">{student.email}</td>
                         <td className="px-8 py-5">
                           <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full font-bold text-xs">{student.completedCount || 0} Modules</span>
                         </td>
                         <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                             <div className="w-full bg-slate-100 rounded-full h-2.5 max-w-[120px] overflow-hidden shadow-inner">
                               <div className="bg-indigo-500 h-full rounded-full transition-all duration-1000" style={{ width: `${student.progressPercent || 0}%` }}></div>
                             </div>
                             <span className="font-black text-slate-700">{student.progressPercent || 0}%</span>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </Card>
          </TabsContent>
          
        </Tabs>
      </Card>
    </div>
  );
};

export default AdminProgressCampaignTab;
