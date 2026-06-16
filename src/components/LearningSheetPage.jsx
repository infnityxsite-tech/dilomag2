import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getStudyPlanForDiploma, getStudentProgress, toggleStepComplete, saveModuleNote } from '../lib/studyPlanService';

// ── Icon maps ──────────────────────────────────────────────────────────────
const STEP_ICONS = {
  watch:    '🎬',
  read:     '📖',
  solve:    '✏️',
  build:    '🔨',
  revise:   '🔁',
  external: '🔗',
};

const STEP_COLORS = {
  watch:    { bg: 'from-violet-500/20 to-purple-500/10', border: 'border-violet-500/20', tag: 'bg-violet-500/20 text-violet-300' },
  read:     { bg: 'from-blue-500/20 to-cyan-500/10',    border: 'border-blue-500/20',    tag: 'bg-blue-500/20 text-blue-300'    },
  solve:    { bg: 'from-amber-500/20 to-yellow-500/10', border: 'border-amber-500/20',   tag: 'bg-amber-500/20 text-amber-300'  },
  build:    { bg: 'from-emerald-500/20 to-green-500/10',border: 'border-emerald-500/20', tag: 'bg-emerald-500/20 text-emerald-300'},
  revise:   { bg: 'from-rose-500/20 to-pink-500/10',    border: 'border-rose-500/20',    tag: 'bg-rose-500/20 text-rose-300'    },
  external: { bg: 'from-slate-500/20 to-gray-500/10',   border: 'border-slate-500/20',   tag: 'bg-slate-500/20 text-slate-300'  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmtMins = (mins) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const estimatedFinishDate = (remainingMins) => {
  const daysNeeded = Math.ceil(remainingMins / 120); // 2 hrs/day
  const d = new Date();
  d.setDate(d.getDate() + daysNeeded);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── Sub-components ───────────────────────────────────────────────────────────

const ProgressRing = ({ percent, size = 80, stroke = 6, color = '#a78bfa' }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
    </svg>
  );
};

const StepCard = ({ step, isCompleted, onToggle, saving }) => {
  const col = STEP_COLORS[step.type] || STEP_COLORS.external;
  return (
    <div className={`rounded-xl border bg-gradient-to-r ${col.bg} ${col.border} p-4 transition-all duration-300 ${isCompleted ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          disabled={saving}
          className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all duration-200 flex items-center justify-center
            ${isCompleted
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-white/30 hover:border-emerald-400 hover:bg-emerald-500/20'}`}
        >
          {isCompleted && <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg leading-none">{STEP_ICONS[step.type] || '📌'}</span>
            <span className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${col.tag}`}>{step.type}</span>
            <span className="text-[11px] text-white/40 ml-auto">{fmtMins(step.estimatedMinutes)}</span>
          </div>
          <p className={`mt-1.5 text-sm font-semibold text-white/90 ${isCompleted ? 'line-through text-white/40' : ''}`}>{step.title}</p>
          {step.checklist?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {step.checklist.map((item, i) => (
                <li key={i} className="text-xs text-white/50 flex items-start gap-1.5">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-white/30 flex-shrink-0" />
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-violet-300 hover:text-violet-200 underline truncate">{item.label}</a>
                  ) : (
                    <span className="truncate">{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {step.externalTasks?.length > 0 && (
            <ul className="mt-2 space-y-1">
              {step.externalTasks.map((task, i) => (
                <li key={i} className="text-xs text-white/40 flex items-start gap-1.5 italic">
                  <span className="mt-0.5">🔗</span>
                  <span>{task.label}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const ModuleSection = ({ mod, completedSteps, onToggle, savingStep, notes, onSaveNote, moduleIndex }) => {
  const [expanded, setExpanded] = useState(moduleIndex < 2); // first 2 modules open by default
  const [noteText, setNoteText] = useState(notes?.[mod.id] || '');
  const [noteSaved, setNoteSaved] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const noteTimer = useRef(null);

  const completedCount = mod.steps.filter(s => completedSteps.includes(s.id)).length;
  const totalCount = mod.steps.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const modMins = mod.steps.reduce((s, st) => s + st.estimatedMinutes, 0);

  const handleNoteChange = (val) => {
    setNoteText(val);
    setNoteSaved(false);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => handleSaveNote(val), 2000);
  };

  const handleSaveNote = async (val) => {
    const text = val ?? noteText;
    setSavingNote(true);
    await onSaveNote(mod.id, text);
    setSavingNote(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm overflow-hidden">
      {/* Module Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-lg shadow-violet-500/20">
          {moduleIndex + 1}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-base">{mod.title}</h3>
          <p className="text-xs text-white/40 mt-0.5">{totalCount} steps · {fmtMins(modMins)} · ~{mod.estimatedDays} day{mod.estimatedDays > 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm font-black text-white">{pct}%</div>
            <div className="text-[10px] text-white/40">{completedCount}/{totalCount}</div>
          </div>
          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-white/40 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </span>
        </div>
      </button>

      {/* Module Body */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-white/5">
          <p className="text-xs text-white/40 italic pt-3">{mod.objective}</p>
          <div className="space-y-2.5">
            {mod.steps.map(step => (
              <StepCard
                key={step.id}
                step={step}
                isCompleted={completedSteps.includes(step.id)}
                onToggle={() => onToggle(step.id)}
                saving={savingStep === step.id}
              />
            ))}
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="block text-[11px] font-semibold text-white/40 uppercase mb-1.5">Notes for this module</label>
            <textarea
              value={noteText}
              onChange={e => handleNoteChange(e.target.value)}
              rows={3}
              placeholder="Write your notes, key takeaways, questions..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition"
            />
            <div className="flex items-center justify-end gap-2 mt-1.5">
              {noteSaved && <span className="text-[11px] text-emerald-400 flex items-center gap-1">✓ Saved</span>}
              <button
                onClick={() => handleSaveNote()}
                disabled={savingNote}
                className="text-[11px] font-semibold px-3 py-1 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/20 transition disabled:opacity-50"
              >
                {savingNote ? 'Saving…' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const LearningSheetPage = () => {
  const { user, activeDiplomaId } = useAuth();
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingStep, setSavingStep] = useState(null);
  const [error, setError] = useState(null);

  const diplomaId = activeDiplomaId || user?.classIds?.[0];
  const studentId = user?.email; // auth system uses email as identity

  useEffect(() => {
    if (!user || !diplomaId) return;
    loadPlanAndProgress();
  }, [user, diplomaId]);

  const loadPlanAndProgress = async () => {
    setLoading(true);
    setError(null);
    try {
      const planData = await getStudyPlanForDiploma(diplomaId);

      if (!planData) {
        setError('no_plan');
        setLoading(false);
        return;
      }

      setPlan(planData);
      const prog = await getStudentProgress(studentId, planData.id);
      setProgress(prog);
    } catch (err) {
      console.error(err);
      setError('load_failed');
    }
    setLoading(false);
  };

  const handleToggleStep = useCallback(async (stepId) => {
    if (!plan || !progress || !studentId) return;
    const totalSteps = plan.meta?.totalSteps || plan.modules?.reduce((s, m) => s + m.steps.length, 0) || 1;

    setSavingStep(stepId);
    const isCurrentlyCompleted = progress.completedSteps?.includes(stepId);
    
    // Optimistic update
    const newCompleted = isCurrentlyCompleted
      ? (progress.completedSteps || []).filter(s => s !== stepId)
      : [...(progress.completedSteps || []), stepId];
    
    setProgress(prev => ({
      ...prev,
      completedSteps: newCompleted,
      completionPercent: Math.round((newCompleted.length / totalSteps) * 100),
    }));

    await toggleStepComplete(studentId, plan.id, stepId, totalSteps);
    setSavingStep(null);
  }, [plan, progress, studentId]);

  const handleSaveNote = useCallback(async (moduleId, text) => {
    if (!plan || !studentId) return;
    await saveModuleNote(studentId, plan.id, moduleId, text);
    setProgress(prev => ({
      ...prev,
      notes: { ...(prev?.notes || {}), [moduleId]: text },
    }));
  }, [plan, studentId]);

  // ── Computed ──────────────────────────────────────────────────────────────
  const totalSteps = plan?.meta?.totalSteps || plan?.modules?.reduce((s, m) => s + m.steps.length, 0) || 0;
  const completedCount = progress?.completedSteps?.length || 0;
  const completionPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;
  const totalMins = plan?.meta?.totalMinutes || 0;
  const completedMins = plan?.modules?.flatMap(m => m.steps).filter(s => progress?.completedSteps?.includes(s.id)).reduce((s, st) => s + st.estimatedMinutes, 0) || 0;
  const remainingMins = Math.max(0, totalMins - completedMins);

  // Find resume point — first incomplete step across all modules
  const resumeStep = plan?.modules?.flatMap(m => m.steps).find(s => !progress?.completedSteps?.includes(s.id));

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading your learning sheet…</p>
        </div>
      </div>
    );
  }

  if (error === 'no_plan') {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-center px-4">
        <div>
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-black text-white mb-2">No Learning Sheet Yet</h2>
          <p className="text-white/40 text-sm max-w-sm">Your instructor hasn't published a learning sheet for your diploma yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  if (error === 'load_failed') {
    return (
      <div className="min-h-screen bg-[#050508] flex items-center justify-center text-center px-4">
        <div>
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-black text-white mb-2">Couldn't Load</h2>
          <button onClick={loadPlanAndProgress} className="mt-4 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050508] font-['Inter'] text-white">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-[#050508]/90 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-white leading-tight">{plan?.title || 'Learning Sheet'}</h1>
            <p className="text-xs text-white/40 mt-0.5">v{plan?.version} · {plan?.meta?.moduleCount} modules · {plan?.meta?.totalSteps} steps</p>
          </div>
          <a href="/dashboard" className="text-sm text-white/40 hover:text-white transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 16 16"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Dashboard
          </a>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* ── Hero Progress ──────────────────────────────────── */}
        <div className="relative rounded-3xl overflow-hidden border border-white/8 bg-gradient-to-br from-violet-900/30 via-indigo-900/20 to-[#050508] p-8">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/5 to-indigo-600/5" />
          <div className="relative flex flex-col sm:flex-row items-center gap-8">
            {/* Ring */}
            <div className="relative flex-shrink-0">
              <ProgressRing percent={completionPercent} size={120} stroke={8} color="#a78bfa" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{completionPercent}%</span>
                <span className="text-[10px] text-white/40 font-semibold uppercase">Done</span>
              </div>
            </div>
            {/* Stats */}
            <div className="flex-1 space-y-4 text-center sm:text-left">
              <div>
                <p className="text-3xl font-black text-white">{completedCount}<span className="text-white/30 font-normal text-xl"> / {totalSteps}</span></p>
                <p className="text-sm text-white/40 mt-1">steps completed</p>
              </div>
              <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
                <div className="text-center">
                  <p className="text-lg font-black text-violet-300">{fmtMins(remainingMins)}</p>
                  <p className="text-[10px] text-white/30 uppercase font-semibold">Remaining</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-emerald-300">{remainingMins > 0 ? estimatedFinishDate(remainingMins) : '🎉 Done!'}</p>
                  <p className="text-[10px] text-white/30 uppercase font-semibold">Est. Finish</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-blue-300">{plan?.meta?.totalDays || '—'}d</p>
                  <p className="text-[10px] text-white/30 uppercase font-semibold">Total Plan</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resume banner */}
          {resumeStep && completionPercent < 100 && (
            <div className="relative mt-6 flex items-center gap-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <span className="text-xl">{STEP_ICONS[resumeStep.type] || '📌'}</span>
              <div>
                <p className="text-xs font-semibold text-violet-300">Continue from where you left off</p>
                <p className="text-sm text-white/70">{resumeStep.title}</p>
              </div>
            </div>
          )}

          {completionPercent === 100 && (
            <div className="relative mt-6 flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center justify-center">
              <span className="text-3xl">🎓</span>
              <div>
                <p className="text-lg font-black text-emerald-300">Diploma Complete!</p>
                <p className="text-sm text-white/50">You've finished the entire learning sheet. Congratulations!</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Module Cards ───────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-white/80 uppercase tracking-widest text-sm">Your Modules</h2>
          {plan?.modules?.map((mod, idx) => (
            <ModuleSection
              key={mod.id}
              mod={mod}
              moduleIndex={idx}
              completedSteps={progress?.completedSteps || []}
              onToggle={handleToggleStep}
              savingStep={savingStep}
              notes={progress?.notes || {}}
              onSaveNote={handleSaveNote}
            />
          ))}
        </div>

        {/* ── Footer ─────────────────────────────────────────── */}
        <div className="text-center py-6 text-xs text-white/20">
          Generated automatically · v{plan?.version} · Last updated {plan?.meta?.generatedAt ? new Date(plan.meta.generatedAt).toLocaleDateString() : '—'}
        </div>
      </div>
    </div>
  );
};

export default LearningSheetPage;
