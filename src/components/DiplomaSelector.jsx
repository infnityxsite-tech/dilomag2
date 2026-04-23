import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getDiplomas } from '../lib/diplomaService';
import { GraduationCap, ChevronDown, Check } from 'lucide-react';

const DiplomaSelector = () => {
  const { classIds, activeDiplomaId, switchDiploma } = useAuth();
  const [diplomas, setDiplomas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDiplomas = async () => {
      if (!classIds || classIds.length === 0) {
        setLoading(false);
        return;
      }
      try {
        const allDiplomas = await getDiplomas();
        const enrolled = allDiplomas.filter(d => classIds.includes(d.id));
        setDiplomas(enrolled);
      } catch (error) {
        console.error('Error loading diplomas:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDiplomas();
  }, [classIds]);

  // Don't show if only one or zero classes
  if (loading || diplomas.length <= 1) return null;

  const activeDiploma = diplomas.find(d => d.id === activeDiplomaId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] hover:border-white/[0.15] transition-all duration-200 group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <div className="text-left">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold leading-none mb-0.5">Active Diploma</p>
          <p className="text-sm font-bold text-white leading-tight">{activeDiploma?.name || 'Select Diploma'}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 rounded-xl bg-slate-800/95 backdrop-blur-xl border border-white/[0.1] shadow-2xl shadow-black/50 z-50 overflow-hidden">
            <div className="p-2">
              {diplomas.map((diploma) => (
                <button
                  key={diploma.id}
                  onClick={() => {
                    switchDiploma(diploma.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 text-left group
                    ${diploma.id === activeDiplomaId 
                      ? 'bg-indigo-500/15 border border-indigo-500/30' 
                      : 'hover:bg-white/[0.06] border border-transparent'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                    ${diploma.id === activeDiplomaId 
                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20' 
                      : 'bg-white/[0.06]'}`}>
                    {diploma.id === activeDiplomaId 
                      ? <Check className="w-4 h-4 text-white" />
                      : <GraduationCap className="w-4 h-4 text-slate-400" />
                    }
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-semibold truncate ${diploma.id === activeDiplomaId ? 'text-indigo-300' : 'text-slate-200'}`}>
                      {diploma.name}
                    </p>
                    {diploma.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">{diploma.description}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DiplomaSelector;
