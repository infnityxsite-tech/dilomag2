import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Link as LinkIcon, Video, StickyNote, BookOpen, Lightbulb,
  AlertTriangle, CheckCircle, RefreshCcw, Database, ShieldAlert,
  Layers, GraduationCap, ChevronRight, Loader2, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle 
} from "@/components/ui/dialog";

import { getAllAssets } from '../lib/assetService';
import { runAssetMigration } from '../lib/assetMigration';
import { getLecturesByModule, getLecturesByDiploma } from '../lib/lectureService';
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

  useEffect(() => {
    loadDiagnostics();
  }, []);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const allAssets = await getAllAssets();
      setAssets(allAssets);

      const lecturesRef = collection(db, 'lectures');
      const lecSnap = await getDocs(lecturesRef);
      const allLectures = lecSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLectures(allLectures);

      // Check legacy dashboard
      const dashRef = collection(db, 'content');
      const dashSnap = await getDocs(dashRef);
      const dashDoc = dashSnap.docs.find(d => d.id === 'dashboard');
      if (dashDoc && dashDoc.exists()) {
        const d = dashDoc.data();
        if (!d.migratedToAssets) {
          setLegacyLecturesCount(d.lectures?.length || 0);
          setLegacyAssetsCount(
            (d.materials?.length || 0) + (d.links?.length || 0) + 
            (d.homeworks?.length || 0) + (d.notes?.length || 0) + (d.tips?.length || 0)
          );
        } else {
          setLegacyLecturesCount(0);
          setLegacyAssetsCount(0);
        }
      }
    } catch (err) {
      console.error('Error loading diagnostics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDryRun = async () => {
    setMigrationRunning(true);
    const result = await runAssetMigration(true); // dry run = true
    setMigrationReport(result);
    setMigrationRunning(false);
    setShowMigrationModal(true);
  };

  const handleExecuteMigration = async () => {
    setMigrationRunning(true);
    const result = await runAssetMigration(false); // dry run = false
    setMigrationReport(result);
    await loadDiagnostics();
    setMigrationRunning(false);
    setShowMigrationModal(true);
  };

  // Diagnostics calculations
  const unassignedAssets = assets.filter(a => (!a.diplomaIds || a.diplomaIds.length === 0) && (!a.moduleIds || a.moduleIds.length === 0));
  const unassignedLectures = lectures.filter(l => (!l.diplomaIds || l.diplomaIds.length === 0) && (!l.moduleIds || l.moduleIds.length === 0));

  // Legacy lectures with embedded arrays
  const lecturesWithEmbeddedArrays = lectures.filter(l => 
    (l.materials && l.materials.length > 0) || 
    (l.links && l.links.length > 0) || 
    (l.homeworks && l.homeworks.length > 0)
  );

  if (loading) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500">Running diagnostic queries...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none" />
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg border-b border-gray-100">
          <CardTitle className="flex items-center space-x-2 text-gray-800">
            <ShieldAlert className="w-5 h-5 text-indigo-600" />
            <span>Platform Diagnostics & Audit</span>
          </CardTitle>
          <CardDescription>
            Monitor data integrity, orphan content, and migration readiness.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50 flex flex-col">
              <span className="text-rose-600 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Unassigned Assets
              </span>
              <span className="text-3xl font-black text-rose-700">{unassignedAssets.length}</span>
              <span className="text-xs text-rose-500 mt-1">Requires module assignment</span>
            </div>
            
            <div className="p-4 rounded-xl border border-orange-100 bg-orange-50 flex flex-col">
              <span className="text-orange-600 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Unassigned Lectures
              </span>
              <span className="text-3xl font-black text-orange-700">{unassignedLectures.length}</span>
              <span className="text-xs text-orange-500 mt-1">Orphaned from curriculum</span>
            </div>

            <div className="p-4 rounded-xl border border-amber-100 bg-amber-50 flex flex-col">
              <span className="text-amber-600 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" /> Legacy Arrays
              </span>
              <span className="text-3xl font-black text-amber-700">{lecturesWithEmbeddedArrays.length}</span>
              <span className="text-xs text-amber-500 mt-1">Lectures with embedded content</span>
            </div>

            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50 flex flex-col">
              <span className="text-indigo-600 text-sm font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" /> Dashboard Flat
              </span>
              <span className="text-3xl font-black text-indigo-700">{legacyLecturesCount + legacyAssetsCount}</span>
              <span className="text-xs text-indigo-500 mt-1">Items trapped in dashboard</span>
            </div>
          </div>

          {/* Migration Action Section */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-indigo-500" />
              Legacy Content Migration
            </h3>
            <p className="text-slate-500 mb-6 text-sm">
              Use this tool to extract trapped legacy content (embedded arrays and dashboard library) into the new relational `lectureAssets` and `lectures` architecture.
            </p>
            
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={handleDryRun} 
                disabled={migrationRunning}
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                {migrationRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}
                Dry Run Preview
              </Button>
              <Button 
                onClick={handleExecuteMigration} 
                disabled={migrationRunning || (legacyLecturesCount === 0 && legacyAssetsCount === 0 && lecturesWithEmbeddedArrays.length === 0)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {migrationRunning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                Execute Migration
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Migration Report Modal */}
      <Dialog open={showMigrationModal} onOpenChange={setShowMigrationModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {migrationReport?.dryRun ? <ShieldAlert className="text-amber-500" /> : <CheckCircle className="text-emerald-500" />}
              {migrationReport?.dryRun ? 'Migration Dry Run Report' : 'Migration Execution Successful'}
            </DialogTitle>
            <DialogDescription>
              {migrationReport?.dryRun 
                ? 'This is a preview of the changes that will occur. No data has been modified.' 
                : 'The following assets and lectures have been successfully extracted and migrated.'}
            </DialogDescription>
          </DialogHeader>
          
          {migrationReport && (
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                  <div className="text-2xl font-black text-indigo-600">{migrationReport.report?.assetsExtractedFromLectures || 0}</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Embedded Assets</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                  <div className="text-2xl font-black text-purple-600">{migrationReport.report?.lecturesExtractedFromDashboard || 0}</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Dashboard Lectures</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-center">
                  <div className="text-2xl font-black text-emerald-600">{migrationReport.report?.assetsExtractedFromDashboard || 0}</div>
                  <div className="text-xs text-slate-500 mt-1 uppercase font-semibold">Dashboard Assets</div>
                </div>
              </div>
              
              <div className="mt-6 border rounded-lg bg-slate-50 p-4 max-h-[300px] overflow-y-auto">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Action Log</h4>
                {migrationReport.report?.actions?.length > 0 ? (
                  <ul className="space-y-2 text-xs text-slate-600 font-mono">
                    {migrationReport.report.actions.map((act, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <ArrowRight className="w-3 h-3 mt-0.5 shrink-0 text-indigo-400" /> {act}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">No actions required. System is fully migrated.</p>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowMigrationModal(false)}>Close Report</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiagnosticsConsoleTab;
