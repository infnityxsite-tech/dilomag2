import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { generateStudyPlan } from '../lib/learningSheetGenerator';
import {
  getStudyPlanForDiploma, getAllStudyPlansForDiploma, saveStudyPlan,
  getAllProgressForPlan, deleteStudyPlan,
} from '../lib/studyPlanService';
import { migrateProgressToNewPlan, getPlanProgressSummary } from '../lib/progressMirrorService';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtMins = (m) => {
  if (!m) return '—';
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
};

const StepTypeBadge = ({ type }) => {
  const colors = {
    watch:    'bg-violet-100 text-violet-700',
    read:     'bg-blue-100 text-blue-700',
    solve:    'bg-amber-100 text-amber-700',
    build:    'bg-emerald-100 text-emerald-700',
    revise:   'bg-rose-100 text-rose-700',
    external: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${colors[type] || colors.external}`}>
      {type}
    </span>
  );
};

// ── Section: Plan Generator ───────────────────────────────────────────────────
const PlanGenerator = ({ diplomas, onPlanPublished }) => {
  const [selectedDiplomaId, setSelectedDiplomaId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [publishedMsg, setPublishedMsg] = useState('');

  const selectedDiploma = diplomas.find(d => d.id === selectedDiplomaId);

  const handleGenerate = async () => {
    if (!selectedDiplomaId) return;
    setGenerating(true);
    setError('');
    setPreview(null);
    setPublishedMsg('');
    try {
      const plan = await generateStudyPlan(selectedDiplomaId, selectedDiploma?.name || 'Diploma');
      setPreview(plan);
    } catch (err) {
      setError('Generation failed: ' + err.message);
    }
    setGenerating(false);
  };

  const handlePublish = async () => {
    if (!preview) return;
    setPublishing(true);
    try {
      // Get old plan to migrate progress
      const oldPlan = await getStudyPlanForDiploma(selectedDiplomaId);

      const result = await saveStudyPlan(preview);
      if (result.success) {
        // Migrate existing student progress to new plan
        if (oldPlan) {
          const totalSteps = preview.meta?.totalSteps || 0;
          await migrateProgressToNewPlan(oldPlan.id, result.id, totalSteps);
        }
        setPublishedMsg(`✅ Plan v${result.version} published! Student progress preserved.`);
        setPreview(null);
        if (onPlanPublished) onPlanPublished();
      } else {
        setError('Publish failed: ' + result.error);
      }
    } catch (err) {
      setError('Publish failed: ' + err.message);
    }
    setPublishing(false);
  };

  return (
    <div className="space-y-5">
      {/* Diploma selector */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-48">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase">Select Diploma</label>
          <select
            value={selectedDiplomaId}
            onChange={e => { setSelectedDiplomaId(e.target.value); setPreview(null); setPublishedMsg(''); }}
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="">Choose a diploma…</option>
            {diplomas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={!selectedDiplomaId || generating}
          className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          {generating ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating…</> : '🤖 Generate Plan'}
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
      {publishedMsg && <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">{publishedMsg}</div>}

      {/* Preview */}
      {preview && (
        <div className="border border-violet-200 rounded-xl overflow-hidden">
          <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-4 border-b border-violet-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-violet-900">{preview.title}</h3>
                <div className="flex gap-4 mt-1.5 text-xs text-violet-600">
                  <span>📚 {preview.meta?.moduleCount} modules</span>
                  <span>✅ {preview.meta?.totalSteps} steps</span>
                  <span>⏱ {fmtMins(preview.meta?.totalMinutes)} total</span>
                  <span>📅 ~{preview.meta?.totalDays} days</span>
                </div>
              </div>
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2 flex-shrink-0"
              >
                {publishing ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Publishing…</> : '🚀 Publish Plan'}
              </button>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {preview.modules.map((mod, mi) => (
              <details key={mod.id} className="group">
                <summary className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 list-none">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-black flex items-center justify-center flex-shrink-0">{mi + 1}</span>
                  <span className="font-semibold text-gray-800 text-sm flex-1">{mod.title}</span>
                  <span className="text-xs text-gray-400">{mod.steps.length} steps · ~{mod.estimatedDays}d</span>
                  <svg className="w-3.5 h-3.5 text-gray-400 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 14 14"><path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </summary>
                <div className="px-5 pb-3 space-y-1.5 bg-gray-50/50">
                  <p className="text-xs text-gray-500 italic py-1">{mod.objective}</p>
                  {mod.steps.map(step => (
                    <div key={step.id} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                      <StepTypeBadge type={step.type} />
                      <span className="flex-1 truncate">{step.title}</span>
                      <span className="text-gray-400 flex-shrink-0">{fmtMins(step.estimatedMinutes)}</span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Section: Student Progress Grid ────────────────────────────────────────────
const StudentProgressGrid = ({ plan, scopedEmails }) => {
  const [progressRecords, setProgressRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedStudent, setExpandedStudent] = useState(null);

  useEffect(() => {
    if (!plan) return;
    loadProgress();
  }, [plan]);

  const loadProgress = async () => {
    if (!plan) return;
    setLoading(true);
    const records = await getAllProgressForPlan(plan.id);
    setProgressRecords(records);
    setLoading(false);
  };

  const totalSteps = plan?.meta?.totalSteps || plan?.modules?.reduce((s, m) => s + m.steps.length, 0) || 0;

  if (!plan) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📋</div>
        <p className="text-gray-500 text-sm">No published plan for this diploma yet.</p>
        <p className="text-gray-400 text-xs mt-1">Generate and publish a plan in the Generator tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">{plan.title}</h3>
          <p className="text-xs text-gray-500">v{plan.version} · {totalSteps} steps · {progressRecords.length} students tracked</p>
        </div>
        <button onClick={loadProgress} disabled={loading} className="text-xs text-violet-600 hover:text-violet-800 border border-violet-200 px-3 py-1.5 rounded-lg">
          {loading ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      {/* Class average */}
      {progressRecords.length > 0 && (() => {
        const avg = Math.round(progressRecords.reduce((s, r) => s + (r.completionPercent || 0), 0) / progressRecords.length);
        return (
          <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 flex items-center gap-4">
            <div className="text-3xl font-black text-violet-700">{avg}%</div>
            <div>
              <p className="text-sm font-semibold text-violet-800">Class Average Completion</p>
              <p className="text-xs text-violet-500">{progressRecords.length} of {scopedEmails?.length || '?'} students have started</p>
            </div>
          </div>
        );
      })()}

      {/* Student rows */}
      <div className="space-y-2">
        {scopedEmails?.map(emailObj => {
          const record = progressRecords.find(r => r.studentId === emailObj.id || r.studentId === emailObj.email);
          const pct = record?.completionPercent || 0;
          const completed = record?.completedSteps?.length || 0;
          const isExpanded = expandedStudent === emailObj.email;

          return (
            <div key={emailObj.id} className="rounded-lg border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedStudent(isExpanded ? null : emailObj.email)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {emailObj.email?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{emailObj.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">{completed}/{totalSteps} steps</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`text-sm font-black ${pct >= 80 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-gray-500'}`}>{pct}%</span>
                </div>
              </button>

              {isExpanded && record && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/50 pt-3 space-y-3">
                  {/* Completed module analysis */}
                  {plan.modules?.map(mod => {
                    const modSteps = mod.steps.map(s => s.id);
                    const modCompleted = modSteps.filter(sid => record.completedSteps?.includes(sid)).length;
                    const modPct = modSteps.length > 0 ? Math.round((modCompleted / modSteps.length) * 100) : 0;
                    return (
                      <div key={mod.id}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-semibold text-gray-700">{mod.title}</span>
                          <span className="text-gray-500">{modCompleted}/{modSteps.length}</span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-400 rounded-full" style={{ width: `${modPct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  {/* Notes */}
                  {record.notes && Object.keys(record.notes).length > 0 && (
                    <div className="mt-2">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase mb-1">Student Notes</p>
                      {Object.entries(record.notes).map(([modId, note]) => {
                        const mod = plan.modules?.find(m => m.id === modId);
                        return (
                          <div key={modId} className="text-xs text-gray-600 bg-white rounded p-2 border border-gray-100 mb-1">
                            <span className="font-semibold text-gray-400">{mod?.title || modId}: </span>{note}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {!scopedEmails?.length && (
          <p className="text-sm text-gray-400 text-center py-6">No students in scope.</p>
        )}
      </div>
    </div>
  );
};

// ── Section: Version History ──────────────────────────────────────────────────
const VersionHistory = ({ diplomaId }) => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const loadPlans = () => {
    if (!diplomaId) return;
    setLoading(true);
    getAllStudyPlansForDiploma(diplomaId).then(p => { setPlans(p); setLoading(false); });
  };

  useEffect(() => { loadPlans(); }, [diplomaId]);

  const handleDelete = async (plan) => {
    const isActive = plan.version === plans[0]?.version;
    const msg = isActive
      ? `⚠️ This is the ACTIVE plan (v${plan.version}). Students can no longer load their sheet if deleted. Continue?`
      : `Delete plan v${plan.version}? Student progress records are preserved.`;
    if (!window.confirm(msg)) return;
    setDeleting(plan.id);
    await deleteStudyPlan(plan.id);
    setDeleting(null);
    loadPlans();
  };

  if (loading) return <div className="text-sm text-gray-400 py-4">Loading versions…</div>;

  return (
    <div className="space-y-3">
      {plans.length === 0
        ? <p className="text-sm text-gray-400 text-center py-6">No plans published yet.</p>
        : plans.map(plan => (
          <div key={plan.id} className="p-4 rounded-xl border border-gray-200 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">v{plan.version}</span>
                <p className="text-sm font-semibold text-gray-800 mt-1">{plan.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {plan.meta?.totalSteps} steps · {plan.meta?.moduleCount} modules · ~{plan.meta?.totalDays} days
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {plan.publishedAt?.toDate ? plan.publishedAt.toDate().toLocaleDateString() : (plan.meta?.generatedAt ? new Date(plan.meta.generatedAt).toLocaleDateString() : 'Unknown date')}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {plan.version === plans[0]?.version && (
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Active</span>
                )}
                <button
                  onClick={() => handleDelete(plan)}
                  disabled={deleting === plan.id}
                  title="Delete this version"
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 border border-transparent hover:border-red-200 transition-all disabled:opacity-40"
                >
                  {deleting === plan.id
                    ? <span className="w-3.5 h-3.5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 14 14"><path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M3.5 3.5l.75 8a1 1 0 001 .9h3.5a1 1 0 001-.9l.75-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  }
                </button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const AdminLearningSheet = ({ diplomas = [], scopedEmails = [], adminScopeDiplomaId }) => {
  const [activeSection, setActiveSection] = useState('generator');
  const [activePlan, setActivePlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [selectedDiplomaForProgress, setSelectedDiplomaForProgress] = useState(adminScopeDiplomaId || '');

  const sectionTabs = [
    { id: 'generator', label: '🤖 Generator', desc: 'Create & publish plans' },
    { id: 'progress',  label: '📊 Student Progress', desc: 'View per-student status' },
    { id: 'history',   label: '🗂 Version History', desc: 'All published versions' },
  ];

  // Load active plan for selected diploma
  useEffect(() => {
    if (!selectedDiplomaForProgress) return;
    setLoadingPlan(true);
    getStudyPlanForDiploma(selectedDiplomaForProgress).then(p => {
      setActivePlan(p);
      setLoadingPlan(false);
    });
  }, [selectedDiplomaForProgress]);

  const handlePlanPublished = () => {
    // Reload active plan
    if (selectedDiplomaForProgress) {
      getStudyPlanForDiploma(selectedDiplomaForProgress).then(setActivePlan);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white shadow-xl shadow-violet-500/20">
        <h2 className="text-2xl font-black">📋 Learning Sheet System</h2>
        <p className="text-violet-200 text-sm mt-1">Generate AI-powered study plans from your curriculum. Students get structured roadmaps with checkable steps.</p>
        {activePlan && (
          <div className="mt-4 flex flex-wrap gap-3">
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-semibold">Active: v{activePlan.version}</span>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">{activePlan.meta?.totalSteps} steps</span>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full">~{activePlan.meta?.totalDays} days</span>
          </div>
        )}
      </div>

      {/* Diploma selector for progress/history */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700 flex-shrink-0">Viewing Diploma:</label>
        <select
          value={selectedDiplomaForProgress}
          onChange={e => setSelectedDiplomaForProgress(e.target.value)}
          className="flex-1 max-w-xs bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-violet-500"
        >
          <option value="">Select diploma…</option>
          {diplomas.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        {loadingPlan && <span className="text-xs text-gray-400">Loading plan…</span>}
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 flex-wrap">
        {sectionTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeSection === tab.id
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        {activeSection === 'generator' && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Generate Study Plan</h3>
            <p className="text-sm text-gray-500 mb-5">
              The agent reads your lectures, materials, and homework from Firestore and derives a fully structured study plan automatically. No hardcoded content.
            </p>
            <PlanGenerator diplomas={diplomas} onPlanPublished={handlePlanPublished} />
          </div>
        )}

        {activeSection === 'progress' && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Student Progress</h3>
            {!selectedDiplomaForProgress
              ? <p className="text-sm text-gray-400">Select a diploma above to view student progress.</p>
              : <StudentProgressGrid plan={activePlan} scopedEmails={scopedEmails} />
            }
          </div>
        )}

        {activeSection === 'history' && (
          <div className="space-y-2">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Published Plan Versions</h3>
            {!selectedDiplomaForProgress
              ? <p className="text-sm text-gray-400">Select a diploma above to view version history.</p>
              : <VersionHistory diplomaId={selectedDiplomaForProgress} />
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLearningSheet;
