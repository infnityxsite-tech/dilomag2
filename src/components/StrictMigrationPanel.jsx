import React, { useState } from 'react';
import {
  Eye, Zap, Loader2, CheckCircle, AlertTriangle, AlertCircle,
  ChevronDown, ChevronRight, Download, RefreshCcw, FileText,
  BookOpen, Target, Layers, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { runStrictAudit, applyStrictMigration } from '../lib/strictMigrationAudit';
import { bustModuleAwareCache } from '../lib/legacyDiplomaService';

// ── Status colours ───────────────────────────────────────────────────

const STATUS_BADGE = {
  FOUND:                { label: 'FOUND',          cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  FOUND_CONTAINS:       { label: 'FOUND ~',        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  FOUND_FUZZY:          { label: 'FOUND ≈',        cls: 'bg-yellow-100  text-yellow-800  border-yellow-200'  },
  EXACT_DB_CONFIRMED:   { label: '✓ CONFIRMED',    cls: 'bg-teal-100    text-teal-800    border-teal-300'     },
  REVIEW_REQUIRED:      { label: '⚠ REVIEW',       cls: 'bg-rose-100    text-rose-700    border-rose-300'     },
  NOT_FOUND:            { label: 'NOT FOUND',      cls: 'bg-red-100     text-red-700     border-red-200'      },
  EXISTS:               { label: 'EXISTS',         cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  WILL_CREATE:          { label: 'WILL CREATE',    cls: 'bg-blue-100    text-blue-800    border-blue-200'     },
  WILL_RENAME:          { label: 'WILL RENAME',    cls: 'bg-amber-100   text-amber-800   border-amber-200'    },
};

const STATUS_ACTION = {
  CORRECT:         { label: '✔ already in module',   cls: 'text-emerald-600' },
  ASSIGN:          { label: '→ will assign',          cls: 'text-blue-600'   },
  REASSIGN:        { label: '⚠ will reassign',        cls: 'text-amber-600'  },
  WILL_LINK:       { label: '→ will link',            cls: 'text-blue-500'   },
  ALREADY_LINKED:  { label: '✔ linked',               cls: 'text-emerald-500'},
  MISSING_ASSET:   { label: '✗ asset missing',        cls: 'text-red-500'    },
  NO_ACTION:       { label: '—',                      cls: 'text-slate-400'  },
};

const SBadge = ({ status }) => {
  const cfg = STATUS_BADGE[status] || { label: status, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Expandable lecture row ───────────────────────────────────────────

const LectureRow = ({ lect, idx }) => {
  const [open, setOpen] = useState(false);
  const hasMaterials = lect.materials?.length > 0;
  const hasHomework  = lect.homework?.length > 0;
  const hasIssues = lect.status === 'NOT_FOUND'
    || lect.materials?.some(m => m.status === 'NOT_FOUND')
    || lect.homework?.some(h => h.status === 'NOT_FOUND');

  return (
    <div className={`border rounded-lg mb-1 ${hasIssues ? 'border-amber-200' : 'border-slate-100'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors ${hasIssues ? 'bg-amber-50/40' : ''}`}
      >
        {open ? <ChevronDown className="w-3 h-3 text-slate-400 flex-shrink-0" />
               : <ChevronRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
        <span className="text-[11px] font-bold text-slate-500 w-5 flex-shrink-0">{String(idx).padStart(2,'0')}</span>
        <span className="text-xs font-semibold text-slate-800 flex-1 truncate">{lect.targetTitle}</span>
        <SBadge status={lect.status} />
        {lect.dbTitle && lect.dbTitle !== lect.targetTitle && (
          <span className="text-[10px] text-slate-400 italic truncate max-w-[140px]">→ "{lect.dbTitle}"</span>
        )}
        <span className={`text-[10px] font-semibold ml-1 ${STATUS_ACTION[lect.moduleAction]?.cls}`}>
          {STATUS_ACTION[lect.moduleAction]?.label}
        </span>
        {lect.lectureOnlyMove && (
          <span className="text-[10px] font-bold text-violet-600 ml-1">LECTURE-ONLY</span>
        )}
      </button>

      {open && (
        <div className="px-8 pb-3 space-y-2">
          {lect.dbId && (
            <p className="text-[10px] text-slate-400 font-mono">
              DB ID: {lect.dbId} | match: {lect.matchMethod} ({(lect.matchScore*100).toFixed(0)}%)
            </p>
          )}
          {lect.exactDBTitle && (
            <p className="text-[10px] text-teal-700 font-semibold">✓ Confirmed DB title: "{lect.exactDBTitle}"</p>
          )}
          {lect.currentModuleName && (
            <p className="text-[10px] text-slate-500">Currently in: <em>{lect.currentModuleName}</em></p>
          )}
          {lect.preserveExisting && (
            <p className="text-[10px] text-blue-600 font-semibold">⚑ preserveExisting — will NOT archive old materials</p>
          )}

          {hasMaterials && (
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Materials</p>
              {lect.materials.map((m, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <FileText className="w-2.5 h-2.5 text-blue-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-700 flex-1 truncate">{m.targetTitle}</span>
                  <SBadge status={m.status} />
                  <span className={`text-[10px] font-semibold ${STATUS_ACTION[m.action]?.cls}`}>
                    {STATUS_ACTION[m.action]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {hasHomework && (
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Homework / Labs</p>
              {lect.homework.map((h, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5">
                  <Target className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />
                  <span className="text-[11px] text-slate-700 flex-1 truncate">{h.targetTitle}</span>
                  <SBadge status={h.status} />
                  <span className={`text-[10px] font-semibold ${STATUS_ACTION[h.action]?.cls}`}>
                    {STATUS_ACTION[h.action]?.label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {!hasMaterials && !hasHomework && (
            <p className="text-[10px] text-slate-400 italic">No materials or homework specified for this lecture.</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Module section ───────────────────────────────────────────────────

const ModuleSection = ({ mod }) => {
  const [open, setOpen] = useState(true);
  const missingLectures = mod.lectures.filter(l => l.status === 'NOT_FOUND').length;
  const missingMaterials = mod.lectures.flatMap(l => l.materials).filter(m => m.status === 'NOT_FOUND').length;
  const totalLinks = mod.lectures.flatMap(l => [...l.materials, ...l.homework]).filter(a => a.action === 'WILL_LINK').length;

  return (
    <div className={`border-2 rounded-xl mb-3 overflow-hidden ${
      mod.status === 'WILL_CREATE' ? 'border-blue-200' :
      mod.status === 'WILL_RENAME' ? 'border-amber-200' :
      'border-emerald-200'
    }`}>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left font-bold transition-colors ${
          mod.status === 'WILL_CREATE' ? 'bg-blue-50 hover:bg-blue-100' :
          mod.status === 'WILL_RENAME' ? 'bg-amber-50 hover:bg-amber-100' :
          'bg-emerald-50 hover:bg-emerald-100'
        }`}
      >
        {open ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        <Layers className="w-4 h-4 flex-shrink-0 text-slate-600" />
        <span className="text-sm flex-1">{mod.name}</span>
        <SBadge status={mod.status} />
        <div className="flex items-center gap-2 ml-2">
          <span className="text-[10px] text-slate-500">{mod.lectures.length} lects</span>
          {missingLectures > 0 && <span className="text-[10px] text-red-600 font-bold">{missingLectures} missing</span>}
          {missingMaterials > 0 && <span className="text-[10px] text-amber-600 font-bold">{missingMaterials} mat missing</span>}
          {totalLinks > 0 && <span className="text-[10px] text-blue-600 font-bold">{totalLinks} to link</span>}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 bg-white">
          {mod.notes?.length > 0 && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-700 space-y-0.5">
              {mod.notes.map((n, i) => <div key={i}>ℹ {n}</div>)}
            </div>
          )}
          {mod.lectures.map((lect, i) => (
            <LectureRow key={i} lect={lect} idx={lect.order} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main panel ───────────────────────────────────────────────────────

const StrictMigrationPanel = () => {
  const [auditing, setAuditing]       = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [showConfirmApply, setShowConfirmApply] = useState(false);
  const [applying, setApplying]       = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [showLog, setShowLog]         = useState(false);

  const handleRunAudit = async () => {
    setAuditing(true);
    setAuditResult(null);
    setApplyResult(null);
    const result = await runStrictAudit();
    setAuditResult(result);
    setAuditing(false);
  };

  const handleDownloadDiff = () => {
    if (!auditResult) return;
    const blob = new Blob([JSON.stringify(auditResult, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `strict_migration_diff_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleApply = async () => {
    if (!auditResult?.success) return;
    setShowConfirmApply(false);
    setApplying(true);
    const result = await applyStrictMigration(auditResult);
    bustModuleAwareCache();
    setApplyResult(result);
    setApplying(false);
    setShowLog(true);
  };

  const s = auditResult?.summary;

  return (
    <div className="space-y-4">
      {/* Header card */}
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-lg overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-rose-500 via-orange-400 to-amber-400" />
        <CardHeader className="bg-gradient-to-r from-rose-50 to-orange-50 border-b border-rose-100">
          <CardTitle className="flex items-center gap-2 text-rose-900 text-base">
            ⚡ Strict Curriculum Migration
            <Badge className="bg-rose-100 text-rose-800 border-rose-200 text-[10px]">
              AI Mastery Group 2 — DETERMINISTIC
            </Badge>
          </CardTitle>
          <CardDescription className="text-rose-800/70 text-xs">
            Audits existing Firestore data against the exact user-defined curriculum structure.
            <strong className="block mt-1">
              No writes occur until you explicitly approve. No content is deleted or archived.
            </strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleRunAudit}
              disabled={auditing}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {auditing
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Running Audit…</>
                : <><Eye className="w-4 h-4 mr-2" />Run Curriculum Audit</>}
            </Button>

            {auditResult?.success && (
              <>
                <Button variant="outline" size="sm" onClick={handleDownloadDiff}
                  className="border-slate-300 text-slate-700">
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Download Diff JSON
                </Button>

                <Button variant="outline" size="sm" onClick={handleRunAudit}
                  className="border-slate-300 text-slate-600">
                  <RefreshCcw className="w-3.5 h-3.5 mr-1.5" /> Re-run
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {auditResult && !auditResult.success && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {auditResult.error}
        </div>
      )}

      {/* Summary */}
      {auditResult?.success && (
        <>
          {/* Counts grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: 'Modules',          v: s.modules,           sub: `${s.modulesToCreate} to create`, c: 'indigo' },
              { label: 'Lectures',         v: s.lectures,          sub: `${s.lecturesFound} found`,       c: 'emerald' },
              { label: 'Not Found Lects',  v: s.lecturesNotFound,  sub: 'missing in DB',                  c: s.lecturesNotFound > 0 ? 'red' : 'slate' },
              { label: 'Materials',        v: s.materials,         sub: `${s.materialsFound} found`,      c: 'blue' },
              { label: 'Homework',         v: s.homework,          sub: `${s.homeworkFound} found`,       c: 'amber' },
              { label: 'Links to Add',     v: s.relationshipsToAdd,sub: `${s.relationshipsAlreadyExist} exist`, c: 'violet' },
            ].map(({ label, v, sub, c }) => (
              <div key={label} className={`p-3 rounded-xl border border-${c}-100 bg-${c}-50 text-center`}>
                <div className={`text-2xl font-black text-${c}-700`}>{v}</div>
                <div className={`text-[9px] font-bold uppercase text-${c}-500`}>{label}</div>
                <div className="text-[9px] text-slate-400">{sub}</div>
              </div>
            ))}
          </div>

          {/* DB scan stats */}
          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            Scanned: <strong>{auditResult.dbLectures}</strong> lectures &nbsp;·&nbsp;
            <strong>{auditResult.dbAssets}</strong> assets &nbsp;·&nbsp;
            <strong>{auditResult.dbModules}</strong> modules &nbsp;·&nbsp;
            <strong>{auditResult.unmatchedLectures?.length}</strong> unmatched lectures (not in plan)
          </div>

          {/* REVIEW_REQUIRED warning */}
          {auditResult.summary.lecturesReviewRequired > 0 && (
            <div className="border border-rose-300 bg-rose-50 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-rose-800">
                  {auditResult.summary.lecturesReviewRequired} lecture(s) marked REVIEW_REQUIRED — fuzzy match below 90% confidence.
                </p>
                <p className="text-[10px] text-rose-700 mt-0.5">
                  These will be skipped during Apply. Expand each module to identify and resolve manually.
                </p>
              </div>
            </div>
          )}

          {/* Unmatched lectures warning */}
          {auditResult.unmatchedLectures?.length > 0 && (
            <div className="border border-amber-200 rounded-lg bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-800 mb-1 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {auditResult.unmatchedLectures.length} DB lecture(s) NOT in the curriculum plan (no action — preserved as-is)
              </p>
              <ul className="text-[10px] text-amber-700 space-y-0.5 max-h-28 overflow-y-auto">
                {auditResult.unmatchedLectures.map((l, i) => (
                  <li key={i}>• {l.title} <span className="text-amber-500">({l.id})</span></li>
                ))}
              </ul>
            </div>
          )}

          {/* Module diff */}
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Curriculum Diff — {STRICT_PLAN_LABEL}
            </h3>
            {auditResult.modules.map((mod, i) => (
              <ModuleSection key={i} mod={mod} />
            ))}
          </div>

          {/* ── SAFETY GATE ───────────────────────────── */}
          {(() => {
            const blocked =
              (s.lecturesReviewRequired || 0) > 0 ||
              (s.lecturesNotFound || 0) > 0 ||
              (s.materialsNotFound || 0) > 0;

            if (blocked) return (
              <div className="border-2 border-red-400 rounded-xl bg-red-50 p-4 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-black text-red-800 text-sm">⛔ APPLY BLOCKED</p>
                  <p className="text-xs text-red-700 mt-0.5">
                    Resolve all issues before applying:
                    {(s.lecturesReviewRequired || 0) > 0 && <span className="ml-2 font-bold">{s.lecturesReviewRequired} REVIEW_REQUIRED</span>}
                    {(s.lecturesNotFound || 0) > 0 && <span className="ml-2 font-bold">{s.lecturesNotFound} NOT_FOUND lectures</span>}
                    {(s.materialsNotFound || 0) > 0 && <span className="ml-2 font-bold">{s.materialsNotFound} missing materials</span>}
                  </p>
                </div>
              </div>
            );

            return (
              <div className="border-2 border-emerald-400 rounded-xl bg-emerald-50 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-black text-emerald-800 text-sm">✅ SAFE_TO_APPLY — All items resolved</p>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    {s.modulesToCreate} module(s) to create&nbsp;·&nbsp;
                    {s.relationshipsToAdd} new relationship(s)&nbsp;·&nbsp;
                    0 deletions · 0 archives · additive-only writes.
                  </p>
                </div>
                <Button
                  id="btn-apply-strict-migration"
                  onClick={() => setShowConfirmApply(true)}
                  disabled={applying}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white flex-shrink-0 shadow-lg shadow-emerald-500/20 font-bold"
                >
                  {applying
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Applying…</>
                    : <><Zap className="w-4 h-4 mr-2" />Apply Migration</>}
                </Button>
              </div>
            );
          })()}

          {applyResult && (
            <div className={`flex items-center gap-2 text-sm p-3 rounded-lg border cursor-pointer ${
              applyResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`} onClick={() => setShowLog(true)}>
              {applyResult.success
                ? <CheckCircle className="w-4 h-4 flex-shrink-0" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {applyResult.success ? 'Migration applied.' : `Error: ${applyResult.error}`}
              <span className="ml-auto text-xs underline font-semibold">View log</span>
            </div>
          )}
        </>
      )}

      {/* Confirm apply dialog */}
      <Dialog open={showConfirmApply} onOpenChange={setShowConfirmApply}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <Zap className="w-5 h-5" /> Confirm Migration Apply
            </DialogTitle>
            <DialogDescription>
              This will write to Firestore: create {s?.modulesToCreate} module(s),
              assign {s?.lectures} lecture(s), and add {s?.relationshipsToAdd} relationship link(s).
              <strong className="block mt-2 text-slate-800">
                Nothing will be deleted, renamed without approval, or archived.
                All writes use arrayUnion (additive only).
              </strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowConfirmApply(false)}>Cancel</Button>
            <Button onClick={handleApply} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Zap className="w-4 h-4 mr-2" /> Confirm Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execution log dialog */}
      <Dialog open={showLog} onOpenChange={setShowLog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {applyResult?.success
                ? <CheckCircle className="w-5 h-5 text-emerald-500" />
                : <AlertTriangle className="w-5 h-5 text-red-500" />}
              {applyResult?.success ? 'Migration Complete' : 'Migration Failed'}
            </DialogTitle>
          </DialogHeader>
          {applyResult && (
            <div className="border rounded-lg bg-slate-950 p-4 max-h-[420px] overflow-y-auto">
              <ul className="space-y-0.5 text-xs font-mono">
                {applyResult.log?.map((line, i) => (
                  <li key={i} className={
                    line.startsWith('═') ? 'text-indigo-400 font-bold' :
                    line.startsWith('✅') || line.startsWith('✔')  ? 'text-emerald-400' :
                    line.startsWith('🔗') || line.startsWith('📎') ? 'text-blue-400' :
                    line.startsWith('⚠') ? 'text-amber-400' :
                    line.startsWith('✏') ? 'text-violet-400' :
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
    </div>
  );
};

// Validated plan stats (exportFirestoreAudit.js — 2026-06-16)
// Diploma: AI Mastery Group 2 | 5 modules | 35 plan lectures | 47 DB lectures
const STRICT_PLAN_LABEL = '5 Modules / 35 Lectures';

export default StrictMigrationPanel;
