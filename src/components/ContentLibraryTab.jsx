import React, { useState, useEffect } from 'react';
import {
  AlertTriangle, CheckCircle, RefreshCcw, Database, ShieldAlert,
  Loader2, ArrowRight, Wrench, Play, Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

import { getAllAssets } from '../lib/assetService';
import { runAssetMigration } from '../lib/assetMigration';
import { buildHardResetPlan, executeHardReset } from '../lib/restructureService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const DiagnosticsConsoleTab = () => {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [legacyLecturesCount, setLegacyLecturesCount] = useState(0);
  const [legacyAssetsCount, setLegacyAssetsCount] = useState(0);
  const [migrationRunning, setMigrationRunning] = useState(false);
  const [migrationReport, setMigrationReport] = useState(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // Hard Reset
  const [planRunning, setPlanRunning] = useState(false);
  const [resetPlan, setResetPlan] = useState(null);
  const [resetSnapshot, setResetSnapshot] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [executeLog, setExecuteLog] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => { loadDiagnostics(); }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const allAssets = await getAllAssets();
      setAssets(allAssets);
      const lecSnap = await getDocs(collection(db, 'lectures'));
      setLectures(lecSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      const dashSnap = await getDocs(collection(db, 'content'));
      const dashDoc = dashSnap.docs.find(d => d.id === 'dashboard');
      if (dashDoc?.exists()) {
        const d = dashDoc.data();
        if (!d.migratedToAssets) {
          setLegacyLecturesCount(d.lectures?.length || 0);
          setLegacyAssetsCount((d.materials?.length || 0) + (d.links?.length || 0) + (d.homeworks?.length || 0) + (d.notes?.length || 0) + (d.tips?.length || 0));
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDryRun = async () => { setMigrationRunning(true); const r = await runAssetMigration(true); setMigrationReport(r); setMigrationRunning(false); setShowMigrationModal(true); };
  const handleExecuteMigration = async () => { setMigrationRunning(true); const r = await runAssetMigration(false); setMigrationReport(r); await loadDiagnostics(); setMigrationRunning(false); setShowMigrationModal(true); };

  // ── Hard Reset ──
  const handleBuildPlan = async () => {
    setPlanRunning(true);
    const result = await buildHardResetPlan();
    if (result.success) {
      setResetPlan(result.plan);
      setResetSnapshot(result.snapshot);
    } else {
      setResetPlan(null);
      alert('Error: ' + result.error);
    }
    setShowPlanModal(true);
    setPlanRunning(false);
  };

  const handleDownloadBackup = () => {
    if (!resetSnapshot) return;
    const blob = new Blob([JSON.stringify(resetSnapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `backup_${resetSnapshot.diplomaName}_${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleExecuteReset = async () => {
    if (!resetPlan) return;
    if (!window.confirm('⚠️ HARD RESET: This will DELETE all existing modules and rebuild from organize_v2.json. This cannot be undone. Continue?')) return;
    setExecuting(true);
    const result = await executeHardReset(resetPlan);
    setExecuteLog(result);
    setShowPlanModal(false);
    setShowLogModal(true);
    setExecuting(false);
    await loadDiagnostics();
  };

  const unassignedAssets = assets.filter(a => (!a.diplomaIds?.length) && (!a.moduleIds?.length));
  const unassignedLectures = lectures.filter(l => (!l.diplomaIds?.length) && (!l.moduleIds?.length));
  const lecturesWithEmbeddedArrays = lectures.filter(l => (l.materials?.length > 0) || (l.links?.length > 0) || (l.homeworks?.length > 0));

  if (loading) return (<Card className="shadow-xl border-0 bg-white/80"><CardContent className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" /><p className="text-gray-500">Loading...</p></CardContent></Card>);

  const p = resetPlan;

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg overflow-hidden relative">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg border-b border-gray-100">
          <CardTitle className="flex items-center space-x-2 text-gray-800"><ShieldAlert className="w-5 h-5 text-indigo-600" /><span>Platform Diagnostics & Audit</span></CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50"><span className="text-rose-600 text-xs font-bold uppercase">Unassigned Assets</span><div className="text-3xl font-black text-rose-700">{unassignedAssets.length}</div></div>
            <div className="p-4 rounded-xl border border-orange-100 bg-orange-50"><span className="text-orange-600 text-xs font-bold uppercase">Unassigned Lectures</span><div className="text-3xl font-black text-orange-700">{unassignedLectures.length}</div></div>
            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50"><span className="text-amber-600 text-xs font-bold uppercase">Legacy Arrays</span><div className="text-3xl font-black text-amber-700">{lecturesWithEmbeddedArrays.length}</div></div>
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50"><span className="text-indigo-600 text-xs font-bold uppercase">Dashboard Flat</span><div className="text-3xl font-black text-indigo-700">{legacyLecturesCount + legacyAssetsCount}</div></div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm mb-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2"><RefreshCcw className="w-5 h-5 text-indigo-500" />Legacy Migration</h3>
            <div className="flex items-center gap-4 mt-4">
              <Button variant="outline" onClick={handleDryRun} disabled={migrationRunning} className="border-indigo-200 text-indigo-700">{migrationRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}Dry Run</Button>
              <Button onClick={handleExecuteMigration} disabled={migrationRunning || (legacyLecturesCount === 0 && legacyAssetsCount === 0 && lecturesWithEmbeddedArrays.length === 0)} className="bg-indigo-600 hover:bg-indigo-700 text-white">{migrationRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}Execute</Button>
            </div>
          </div>

          {/* HARD RESET */}
          <div className="rounded-xl border-2 border-red-300 bg-red-50/50 p-6 shadow-sm">
            <h3 className="text-lg font-bold text-red-800 mb-2 flex items-center gap-2"><Wrench className="w-5 h-5 text-red-600" />Hard Reset — Rebuild from organize_v2.json</h3>
            <p className="text-red-700/70 mb-4 text-sm">Deletes ALL current modules, clears lecture assignments, and rebuilds the entire curriculum strictly from organize_v2.json. Downloads backup first.</p>
            <Button onClick={handleBuildPlan} disabled={planRunning} className="bg-red-600 hover:bg-red-700 text-white">
              {planRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
              Build Reset Plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Migration Modal */}
      <Dialog open={showMigrationModal} onOpenChange={setShowMigrationModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{migrationReport?.dryRun ? 'Dry Run' : 'Migration Complete'}</DialogTitle></DialogHeader>
          {migrationReport && (<div className="grid grid-cols-3 gap-4 my-4">
            <div className="p-4 bg-slate-50 rounded-lg border text-center"><div className="text-2xl font-black text-indigo-600">{migrationReport.report?.assetsExtractedFromLectures || 0}</div><div className="text-xs text-slate-500 mt-1">Embedded</div></div>
            <div className="p-4 bg-slate-50 rounded-lg border text-center"><div className="text-2xl font-black text-purple-600">{migrationReport.report?.lecturesExtractedFromDashboard || 0}</div><div className="text-xs text-slate-500 mt-1">Lectures</div></div>
            <div className="p-4 bg-slate-50 rounded-lg border text-center"><div className="text-2xl font-black text-emerald-600">{migrationReport.report?.assetsExtractedFromDashboard || 0}</div><div className="text-xs text-slate-500 mt-1">Assets</div></div>
          </div>)}
          <DialogFooter><Button onClick={() => setShowMigrationModal(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* HARD RESET Plan Modal */}
      <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700"><Wrench />Hard Reset Execution Plan</DialogTitle>
            <DialogDescription>Review every action. Download backup. Then execute.</DialogDescription>
          </DialogHeader>

          {p && (<div className="space-y-5 my-4 text-sm">
            {/* Backup bar */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-800 font-semibold">📦 Backup: {p.backup.moduleCount} modules, {p.backup.lectureCount} lectures, {p.backup.assetCount} assets</span>
              <Button size="sm" variant="outline" onClick={handleDownloadBackup} className="border-blue-300 text-blue-700"><Download className="w-4 h-4 mr-1" />Download Backup</Button>
            </div>

            {/* Phase 1 */}
            <div className="border-2 border-red-200 rounded-lg p-4 bg-red-50">
              <h4 className="font-bold text-red-800 mb-3">PHASE 1 — WIPE</h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-red-600">{p.stats.phase1_modulesDelete}</div><div className="text-[9px] uppercase font-bold text-slate-500">Modules Delete</div></div>
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-orange-600">{p.stats.phase1_lecturesClear}</div><div className="text-[9px] uppercase font-bold text-slate-500">Lectures Clear</div></div>
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-blue-600">{p.stats.phase1_archivedRestore}</div><div className="text-[9px] uppercase font-bold text-slate-500">Archived Restore</div></div>
              </div>
              <details className="text-xs"><summary className="cursor-pointer font-semibold text-red-700">Modules to delete ({p.phase1.modulesToDelete.length})</summary>
                <ul className="mt-2 space-y-1">{p.phase1.modulesToDelete.map((m, i) => <li key={i}>🗑️ {m.name} ({m.id})</li>)}</ul>
              </details>
            </div>

            {/* Phase 2 */}
            <div className="border-2 border-emerald-200 rounded-lg p-4 bg-emerald-50">
              <h4 className="font-bold text-emerald-800 mb-3">PHASE 2 — REBUILD</h4>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-emerald-600">{p.stats.phase2_modulesCreate}</div><div className="text-[9px] uppercase font-bold text-slate-500">Create Mod</div></div>
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-blue-600">{p.stats.phase2_lecturesAssign}</div><div className="text-[9px] uppercase font-bold text-slate-500">Assign Lect</div></div>
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-purple-600">{p.stats.phase2_lecturesCreate}</div><div className="text-[9px] uppercase font-bold text-slate-500">Create Lect</div></div>
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-cyan-600">{p.stats.phase2_materialsLink}</div><div className="text-[9px] uppercase font-bold text-slate-500">Link Mat</div></div>
                <div className="p-2 bg-white rounded border text-center"><div className="text-lg font-black text-amber-600">{p.stats.phase2_homeworkLink}</div><div className="text-[9px] uppercase font-bold text-slate-500">Link HW</div></div>
              </div>

              <details className="text-xs mb-2"><summary className="cursor-pointer font-semibold text-emerald-700">Modules to create ({p.phase2.modulesToCreate.length})</summary>
                <ul className="mt-2 space-y-1">{p.phase2.modulesToCreate.map((m, i) => <li key={i}>📁 {m.name} (order {m.order})</li>)}</ul>
              </details>
              <details className="text-xs mb-2"><summary className="cursor-pointer font-semibold text-blue-700">Lecture assignments ({p.phase2.lectureAssignments.length})</summary>
                <ul className="mt-2 space-y-1">{p.phase2.lectureAssignments.map((l, i) => <li key={i}>📎 "{l.lectureTitle}" → "{l.moduleName}" (order {l.order}){l.isArchived ? ' [was archived]' : ''}</li>)}</ul>
              </details>
              {p.phase2.lecturesToCreate.length > 0 && (
                <details className="text-xs mb-2"><summary className="cursor-pointer font-semibold text-purple-700">Lectures to create ({p.phase2.lecturesToCreate.length})</summary>
                  <ul className="mt-2 space-y-1">{p.phase2.lecturesToCreate.map((l, i) => <li key={i}>➕ "{l.title}" → "{l.moduleName}"</li>)}</ul>
                </details>
              )}
            </div>

            {/* Missing (non-blocking) */}
            {(p.stats.missingMaterials > 0 || p.stats.missingHomework > 0) && (
              <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
                <h4 className="text-xs font-bold text-amber-800 mb-2 uppercase">Missing Assets (non-blocking, {p.stats.missingMaterials + p.stats.missingHomework})</h4>
                <ul className="text-xs space-y-1">
                  {p.phase2.missingMaterials.map((m, i) => <li key={`m${i}`}>📄 "{m.title}" → "{m.forLecture}"</li>)}
                  {p.phase2.missingHomework.map((h, i) => <li key={`h${i}`}>📝 "{h.title}" → "{h.forLecture}"</li>)}
                </ul>
              </div>
            )}
          </div>)}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPlanModal(false)}>Cancel</Button>
            {p && (
              <Button onClick={handleExecuteReset} disabled={executing} className="bg-red-600 hover:bg-red-700 text-white">
                {executing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Execute Hard Reset
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution Log */}
      <Dialog open={showLogModal} onOpenChange={setShowLogModal}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {executeLog?.success ? <CheckCircle className="text-emerald-500" /> : <AlertTriangle className="text-red-500" />}
              {executeLog?.success ? 'Hard Reset Complete' : 'Reset Failed'}
            </DialogTitle>
          </DialogHeader>
          {executeLog && (
            <div className="border rounded-lg bg-slate-50 p-4 max-h-[400px] overflow-y-auto">
              <ul className="space-y-1 text-xs font-mono">{executeLog.log?.map((line, i) => <li key={i}>{line}</li>)}</ul>
              {executeLog.error && <p className="mt-4 text-red-600 font-semibold">Error: {executeLog.error}</p>}
            </div>
          )}
          <DialogFooter><Button onClick={() => setShowLogModal(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticsConsoleTab;
