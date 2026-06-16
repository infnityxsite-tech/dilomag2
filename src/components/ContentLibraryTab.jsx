import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, CheckCircle, RefreshCcw, Database, ShieldAlert,
  Loader2, Download, GitMerge, Eye, CheckSquare, Square,
  Play, ChevronDown, ChevronRight, Info, Layers, Link2, FileText,
  BookOpen, AlertCircle, Zap, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';

import { getAllAssets } from '../lib/assetService';
import { runAssetMigration } from '../lib/assetMigration';
import { buildCRMPlan, applyCRMPlan } from '../lib/contentRelationshipMigration';
import { bustModuleAwareCache } from '../lib/legacyDiplomaService';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import StrictMigrationPanel from './StrictMigrationPanel';

// ─────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────

const Stat = ({ label, value, color = 'slate' }) => (
  <div className={`p-3 rounded-xl border border-${color}-100 bg-${color}-50 text-center`}>
    <div className={`text-2xl font-black text-${color}-700`}>{value}</div>
    <div className={`text-[10px] uppercase font-bold text-${color}-500 mt-0.5`}>{label}</div>
  </div>
);

const Section = ({ title, icon: Icon, color = 'slate', children }) => (
  <div className={`rounded-xl border-2 border-${color}-200 bg-${color}-50/40 p-4`}>
    <h4 className={`font-bold text-${color}-800 mb-3 flex items-center gap-2 text-sm`}>
      <Icon className={`w-4 h-4 text-${color}-600`} /> {title}
    </h4>
    {children}
  </div>
);

const ToggleAll = ({ label, checked, onChange }) => (
  <button
    onClick={onChange}
    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mb-2"
  >
    {checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
    {label}
  </button>
);

const CheckRow = ({ checked, onChange, children }) => (
  <label className="flex items-start gap-2 cursor-pointer py-1 px-2 rounded hover:bg-black/5 transition-colors">
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className="mt-0.5 accent-indigo-600 w-3.5 h-3.5 flex-shrink-0"
    />
    <span className="text-xs text-slate-700 leading-snug">{children}</span>
  </label>
);

// ─────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────

const DiagnosticsConsoleTab = () => {
  // ── Diagnostics state ──────────────────────────────────────────────
  const [loading, setLoading]                       = useState(true);
  const [assets, setAssets]                         = useState([]);
  const [lectures, setLectures]                     = useState([]);
  const [legacyLecturesCount, setLegacyLecturesCount] = useState(0);
  const [legacyAssetsCount, setLegacyAssetsCount]   = useState(0);

  // ── Legacy migration state ─────────────────────────────────────────
  const [migrationRunning, setMigrationRunning]     = useState(false);
  const [migrationReport, setMigrationReport]       = useState(null);
  const [showMigrationModal, setShowMigrationModal] = useState(false);

  // ── CRM Wizard state ───────────────────────────────────────────────
  const [crmBuilding, setCrmBuilding]               = useState(false);
  const [crmPlanResult, setCrmPlanResult]           = useState(null); // { success, audit, plan }

  // Approve selections — sets of _planIndex
  const [selModules, setSelModules]   = useState(new Set());
  const [selMerges, setSelMerges]     = useState(new Set());
  const [selLinks, setSelLinks]       = useState(new Set());

  // Modal visibility
  const [showPreview, setShowPreview]     = useState(false);
  const [showApprove, setShowApprove]     = useState(false);
  const [showLog, setShowLog]             = useState(false);

  const [applying, setApplying]           = useState(false);
  const [applyResult, setApplyResult]     = useState(null);

  // ── Load diagnostics ──────────────────────────────────────────────
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
          setLegacyAssetsCount(
            (d.materials?.length || 0) + (d.links?.length || 0) +
            (d.homeworks?.length || 0) + (d.notes?.length || 0) + (d.tips?.length || 0)
          );
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Legacy migration handlers ──────────────────────────────────────
  const handleDryRun = async () => {
    setMigrationRunning(true);
    const r = await runAssetMigration(true);
    setMigrationReport(r);
    setMigrationRunning(false);
    setShowMigrationModal(true);
  };

  const handleExecuteMigration = async () => {
    setMigrationRunning(true);
    const r = await runAssetMigration(false);
    setMigrationReport(r);
    await loadDiagnostics();
    setMigrationRunning(false);
    setShowMigrationModal(true);
  };

  // ── CRM Wizard: Step 1 — Preview ──────────────────────────────────
  const handleCRMPreview = async () => {
    setCrmBuilding(true);
    setCrmPlanResult(null);
    try {
      const result = await buildCRMPlan();
      setCrmPlanResult(result);
      if (result.success) {
        // Pre-select everything by default
        const { modulePlan, assetMergeOps, relationshipLinks } = result.plan;
        setSelModules(new Set(modulePlan.filter(m => m.isNew).map(m => m._planIndex)));
        setSelMerges(new Set(assetMergeOps.map(o => o._planIndex)));
        setSelLinks(new Set(relationshipLinks.map(l => l._planIndex)));
        setShowPreview(true);
      }
    } catch (err) {
      console.error('CRM build error:', err);
      setCrmPlanResult({ success: false, error: err.message });
    }
    setCrmBuilding(false);
  };

  // ── CRM Wizard: Step 2 — Approve (move from Preview to Approve modal)
  const handleOpenApprove = () => {
    setShowPreview(false);
    setShowApprove(true);
  };

  // ── CRM Wizard: Step 3 — Apply ────────────────────────────────────
  const handleApply = async () => {
    if (!crmPlanResult?.success) return;
    setApplying(true);
    const result = await applyCRMPlan(
      crmPlanResult.plan,
      [...selModules],
      [...selMerges],
      [...selLinks],
    );
    setApplyResult(result);
    bustModuleAwareCache();
    await loadDiagnostics();
    setApplying(false);
    setShowApprove(false);
    setShowLog(true);
  };

  // ── Download CRM plan as JSON ──────────────────────────────────────
  const handleDownloadPlan = () => {
    if (!crmPlanResult) return;
    const blob = new Blob([JSON.stringify(crmPlanResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crm_plan_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Toggle helpers ─────────────────────────────────────────────────
  const toggleItem = (set, setFn, idx) => {
    setFn(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAll = (items, key, set, setFn) => {
    const allIdx = items.map(i => i[key]);
    const allSelected = allIdx.every(i => set.has(i));
    setFn(allSelected ? new Set() : new Set(allIdx));
  };

  // ── Derived diagnostics ────────────────────────────────────────────
  const unassignedAssets   = assets.filter(a => !a.diplomaIds?.length && !a.moduleIds?.length);
  const unassignedLectures = lectures.filter(l => !l.diplomaIds?.length && !l.moduleIds?.length);
  const embeddedLectures   = lectures.filter(l =>
    (l.materials?.length > 0) || (l.links?.length > 0) || (l.homeworks?.length > 0)
  );
  const archivedAssets     = assets.filter(a => a.status === 'merged');

  if (loading) return (
    <Card className="shadow-xl border-0 bg-white/80">
      <CardContent className="p-12 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
        <p className="text-gray-500">Loading diagnostics…</p>
      </CardContent>
    </Card>
  );

  const plan  = crmPlanResult?.plan;
  const audit = crmPlanResult?.audit;

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Diagnostics Overview ───────────────────────────────────── */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <BarChart3 className="w-5 h-5 text-indigo-600" /> Platform Diagnostics
          </CardTitle>
          <CardDescription>Global health snapshot across all diplomas.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Unassigned Assets"   value={unassignedAssets.length}   color="rose"   />
            <Stat label="Unassigned Lectures" value={unassignedLectures.length} color="orange" />
            <Stat label="Legacy Arrays"       value={embeddedLectures.length}   color="amber"  />
            <Stat label="Archived (Merged)"   value={archivedAssets.length}     color="indigo" />
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" size="sm" onClick={loadDiagnostics} className="text-slate-600 border-slate-200">
              <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Legacy Migration ───────────────────────────────────────── */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-t-lg border-b border-gray-100">
          <CardTitle className="flex items-center gap-2 text-gray-800 text-base">
            <RefreshCcw className="w-4 h-4 text-indigo-500" /> Legacy Array Migration
          </CardTitle>
          <CardDescription>
            Extracts embedded content arrays from lecture documents into the relational
            <code className="text-xs bg-slate-100 px-1 rounded mx-1">lectureAssets</code>
            collection. Run this once per diploma when onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDryRun} disabled={migrationRunning}
              className="border-indigo-200 text-indigo-700">
              {migrationRunning
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Eye className="w-4 h-4 mr-2" />}
              Dry Run
            </Button>
            <Button onClick={handleExecuteMigration}
              disabled={migrationRunning || (legacyLecturesCount === 0 && legacyAssetsCount === 0 && embeddedLectures.length === 0)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {migrationRunning
                ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                : <Database className="w-4 h-4 mr-2" />}
              Execute
            </Button>
            {(legacyLecturesCount + legacyAssetsCount + embeddedLectures.length) === 0 && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> No legacy arrays detected
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── CRM Wizard ─────────────────────────────────────────────── */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-indigo-100">
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <GitMerge className="w-5 h-5 text-indigo-600" />
            Content Relationship Migration
            <Badge className="ml-1 bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
              AI Mastery Group 2 only
            </Badge>
          </CardTitle>
          <CardDescription className="text-indigo-700/70">
            Scaffolds modules, consolidates duplicate assets (archive-only), and repairs
            lecture–material relationships from the Official Curriculum Guide.
            <strong className="block mt-1 text-indigo-800">
              Nothing is deleted. Uses a 3-step Preview → Approve → Apply workflow.
            </strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">
              <Eye className="w-3 h-3" /> 1 Preview
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-100 text-violet-700">
              <CheckSquare className="w-3 h-3" /> 2 Approve
            </span>
            <ChevronRight className="w-3 h-3" />
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <Zap className="w-3 h-3" /> 3 Apply
            </span>
          </div>

          <Button
            onClick={handleCRMPreview}
            disabled={crmBuilding}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20"
          >
            {crmBuilding
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building plan…</>
              : <><Eye className="w-4 h-4 mr-2" /> Preview Migration Plan</>}
          </Button>

          {crmPlanResult && !crmPlanResult.success && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {crmPlanResult.error}
            </div>
          )}

          {applyResult && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border ${applyResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'}`}>
              {applyResult.success
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {applyResult.success ? 'Migration applied successfully.' : `Error: ${applyResult.error}`}
              <button
                onClick={() => setShowLog(true)}
                className="ml-auto text-xs underline font-semibold"
              >
                View log
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ════════════════════════════════════════════════════════════
          MODAL 1 — PREVIEW
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-800">
              <Eye className="w-5 h-5" /> Migration Preview — AI Mastery Group 2
            </DialogTitle>
            <DialogDescription>
              Read-only scan results. No data has been changed. Review, then click
              <strong> "Review & Approve Items"</strong> to select what to apply.
            </DialogDescription>
          </DialogHeader>

          {audit && plan && (
            <div className="space-y-4 my-2 text-sm">

              {/* Audit stats */}
              <div className="grid grid-cols-4 gap-2">
                <Stat label="Lectures Found" value={audit.stats.totalLectures}        color="indigo" />
                <Stat label="Active Assets"  value={audit.stats.activeAssets}         color="blue"   />
                <Stat label="Dup Groups"     value={audit.stats.duplicateGroups}       color="amber"  />
                <Stat label="Existing Mods"  value={audit.stats.existingModules}       color="emerald"/>
              </div>

              {/* Modules to create */}
              <Section title={`Module Scaffolding — ${plan.modulePlan.filter(m => m.isNew).length} to create`}
                       icon={Layers} color="emerald">
                {plan.modulePlan.filter(m => m.isNew).length === 0
                  ? <p className="text-xs text-emerald-700">All modules already exist.</p>
                  : plan.modulePlan.filter(m => m.isNew).map(m => (
                    <div key={m._planIndex} className="text-xs py-0.5">
                      📁 <strong>{m.name}</strong> (order {m.order})
                    </div>
                  ))}
                {plan.modulePlan.filter(m => !m.isNew).length > 0 && (
                  <div className="text-xs text-emerald-600 mt-1">
                    ✅ Already present: {plan.modulePlan.filter(m => !m.isNew).map(m => m.name).join(', ')}
                  </div>
                )}
              </Section>

              {/* Asset merge ops */}
              <Section title={`Asset Consolidation — ${plan.assetMergeOps.length} duplicate group(s)`}
                       icon={GitMerge} color="amber">
                {plan.assetMergeOps.length === 0
                  ? <p className="text-xs text-amber-700">No duplicate asset groups detected.</p>
                  : plan.assetMergeOps.map(op => (
                    <details key={op._planIndex} className="mb-1">
                      <summary className="cursor-pointer text-xs font-semibold text-amber-800">
                        🔀 {op.canonical.title}
                        <span className="ml-1 font-normal text-amber-600">
                          ({op.duplicates.length} duplicate{op.duplicates.length > 1 ? 's' : ''} → archive)
                        </span>
                      </summary>
                      <ul className="ml-4 mt-1 text-xs text-slate-600 space-y-0.5">
                        <li>✅ Canonical: {op.canonical.id}</li>
                        {op.duplicates.map(d => <li key={d.id}>📦 Archive: {d.id}</li>)}
                        <li className="text-amber-700">Merged lectureIds: {op.mergedLectureIds.length}</li>
                      </ul>
                    </details>
                  ))}
              </Section>

              {/* Relationship links */}
              <Section title={`Relationship Links — ${plan.relationshipLinks.length} to add`}
                       icon={Link2} color="blue">
                {plan.relationshipLinks.length === 0
                  ? <p className="text-xs text-blue-700">All relationships already in place.</p>
                  : (
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {plan.relationshipLinks.map(l => (
                        <div key={l._planIndex} className="text-xs py-0.5">
                          {l.action === 'assign_module'
                            ? <>📎 <strong>{l.lectureTitle}</strong> → module <em>{l.moduleName}</em></>
                            : <>[{l.assetType}] <strong>{l.assetTitle}</strong> → <em>{l.lectureTitle}</em></>}
                        </div>
                      ))}
                    </div>
                  )}
              </Section>

              {/* Missing assets (informational) */}
              {audit.missingAssets.length > 0 && (
                <Section title={`Missing Assets (${audit.missingAssets.length}) — not in database`}
                         icon={AlertTriangle} color="rose">
                  <p className="text-xs text-rose-700 mb-1">
                    These assets are referenced in the Curriculum Guide but have no matching
                    document in Firestore. They will be listed only — no action taken.
                  </p>
                  {audit.missingAssets.map((a, i) => (
                    <div key={i} className="text-xs py-0.5">
                      ❌ [{a.type}] <strong>{a.title}</strong>
                    </div>
                  ))}
                </Section>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={handleDownloadPlan} size="sm">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Plan JSON
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            <Button onClick={handleOpenApprove}
              className="bg-violet-600 hover:bg-violet-700 text-white">
              <CheckSquare className="w-4 h-4 mr-2" /> Review &amp; Approve Items →
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          MODAL 2 — APPROVE (itemised checkboxes)
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={showApprove} onOpenChange={setShowApprove}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-800">
              <CheckSquare className="w-5 h-5" /> Approve Items to Apply
            </DialogTitle>
            <DialogDescription>
              Select exactly which items you want written to Firestore. Deselect anything
              you want to skip. Click <strong>"Apply Selected"</strong> when ready.
            </DialogDescription>
          </DialogHeader>

          {plan && (
            <div className="space-y-4 my-2 text-sm">

              {/* Selected counts */}
              <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-lg">
                <Info className="w-4 h-4 text-violet-600 flex-shrink-0" />
                <span className="text-xs text-violet-800 font-medium">
                  Selected: <strong>{selModules.size}</strong> modules ·&nbsp;
                  <strong>{selMerges.size}</strong> merge ops ·&nbsp;
                  <strong>{selLinks.size}</strong> relationship links
                </span>
              </div>

              {/* Module selection */}
              {plan.modulePlan.filter(m => m.isNew).length > 0 && (
                <Section title="Phase 1 — Module Scaffolding" icon={Layers} color="emerald">
                  <ToggleAll
                    label="Select / Deselect all modules"
                    checked={plan.modulePlan.filter(m => m.isNew).every(m => selModules.has(m._planIndex))}
                    onChange={() => toggleAll(plan.modulePlan.filter(m => m.isNew), '_planIndex', selModules, setSelModules)}
                  />
                  {plan.modulePlan.filter(m => m.isNew).map(m => (
                    <CheckRow
                      key={m._planIndex}
                      checked={selModules.has(m._planIndex)}
                      onChange={() => toggleItem(selModules, setSelModules, m._planIndex)}
                    >
                      Create module: <strong>{m.name}</strong> (order {m.order})
                    </CheckRow>
                  ))}
                </Section>
              )}

              {/* Merge op selection */}
              {plan.assetMergeOps.length > 0 && (
                <Section title="Phase 2 — Asset Consolidation" icon={GitMerge} color="amber">
                  <ToggleAll
                    label="Select / Deselect all merge operations"
                    checked={plan.assetMergeOps.every(o => selMerges.has(o._planIndex))}
                    onChange={() => toggleAll(plan.assetMergeOps, '_planIndex', selMerges, setSelMerges)}
                  />
                  {plan.assetMergeOps.map(op => (
                    <CheckRow
                      key={op._planIndex}
                      checked={selMerges.has(op._planIndex)}
                      onChange={() => toggleItem(selMerges, setSelMerges, op._planIndex)}
                    >
                      Archive {op.duplicates.length} duplicate(s) of&nbsp;
                      <strong>"{op.canonical.title}"</strong>&nbsp;
                      → merge {op.mergedLectureIds.length} lecture link(s) into canonical
                    </CheckRow>
                  ))}
                </Section>
              )}

              {/* Relationship link selection */}
              {plan.relationshipLinks.length > 0 && (
                <Section title="Phase 3 — Relationship Links" icon={Link2} color="blue">
                  <ToggleAll
                    label="Select / Deselect all relationship links"
                    checked={plan.relationshipLinks.every(l => selLinks.has(l._planIndex))}
                    onChange={() => toggleAll(plan.relationshipLinks, '_planIndex', selLinks, setSelLinks)}
                  />
                  <div className="max-h-56 overflow-y-auto border border-blue-200 rounded-lg p-1 bg-white">
                    {plan.relationshipLinks.map(l => (
                      <CheckRow
                        key={l._planIndex}
                        checked={selLinks.has(l._planIndex)}
                        onChange={() => toggleItem(selLinks, setSelLinks, l._planIndex)}
                      >
                        {l.action === 'assign_module'
                          ? <>Assign lecture "<strong>{l.lectureTitle}</strong>" → module <em>{l.moduleName}</em></>
                          : <>Link [{l.assetType}] "<strong>{l.assetTitle}</strong>" → "<em>{l.lectureTitle}</em>"</>}
                      </CheckRow>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => { setShowApprove(false); setShowPreview(true); }}>
              ← Back to Preview
            </Button>
            <Button variant="outline" onClick={() => setShowApprove(false)}>Cancel</Button>
            <Button
              onClick={handleApply}
              disabled={applying || (selModules.size + selMerges.size + selLinks.size === 0)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {applying
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying…</>
                : <><Zap className="w-4 h-4 mr-2" /> Apply {selModules.size + selMerges.size + selLinks.size} Items</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          MODAL 3 — EXECUTION LOG
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {applyResult?.success
                ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                : <AlertTriangle className="w-5 h-5 text-red-500" />}
              {applyResult?.success ? 'Migration Applied' : 'Migration Failed'}
            </DialogTitle>
          </DialogHeader>

          {applyResult && (
            <div className="border rounded-lg bg-slate-950 p-4 max-h-[420px] overflow-y-auto">
              <ul className="space-y-0.5 text-xs font-mono">
                {applyResult.log?.map((line, i) => (
                  <li key={i} className={
                    line.startsWith('═') ? 'text-indigo-400 font-bold' :
                    line.startsWith('✅') ? 'text-emerald-400' :
                    line.startsWith('📦') ? 'text-amber-400' :
                    line.startsWith('🔗') || line.startsWith('📎') ? 'text-blue-400' :
                    line.startsWith('❌') ? 'text-red-400' :
                    'text-slate-300'
                  }>{line}</li>
                ))}
              </ul>
              {applyResult.error && (
                <p className="mt-3 text-red-400 font-semibold text-xs">Error: {applyResult.error}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowLog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          Legacy Migration Report Modal (unchanged)
      ════════════════════════════════════════════════════════════ */}
      <Dialog open={showMigrationModal} onOpenChange={setShowMigrationModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{migrationReport?.dryRun ? 'Dry Run Results' : 'Migration Complete'}</DialogTitle>
          </DialogHeader>
          {migrationReport && (
            <div className="grid grid-cols-3 gap-4 my-4">
              <Stat label="From Lectures"  value={migrationReport.report?.assetsExtractedFromLectures || 0}  color="indigo" />
              <Stat label="From Dashboard" value={migrationReport.report?.assetsExtractedFromDashboard || 0} color="purple" />
              <Stat label="Lectures"       value={migrationReport.report?.lecturesExtractedFromDashboard || 0} color="emerald" />
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowMigrationModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════
          STRICT CURRICULUM MIGRATION
      ════════════════════════════════════════════════════════════ */}
      <StrictMigrationPanel />

    </div>
  );
};

export default DiagnosticsConsoleTab;
