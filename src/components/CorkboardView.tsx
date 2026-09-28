import React, { useState } from 'react';
import { 
  GitBranch, 
  Check, 
  AlertCircle, 
  FileCheck, 
  HelpCircle, 
  Link as LinkIcon, 
  Sparkles,
  ShieldAlert,
  Award,
  Lock
} from 'lucide-react';
import { DeductionHypothesis, EvidenceItem, Suspect } from '../types/game';
import { sound } from '../lib/audio';

interface CorkboardViewProps {
  hypotheses: DeductionHypothesis[];
  evidenceList: EvidenceItem[];
  suspects: Suspect[];
  onSolveHypothesis: (hypothesisId: string, selectedEvidenceIds: string[]) => { success: boolean; message: string };
  onOpenWarrantModal: (hypothesis: DeductionHypothesis) => void;
}

export const CorkboardView: React.FC<CorkboardViewProps> = ({
  hypotheses,
  evidenceList,
  suspects,
  onSolveHypothesis,
  onOpenWarrantModal
}) => {
  const [selectedHypothesisId, setSelectedHypothesisId] = useState<string>(hypotheses[0]?.id || '');
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const activeHypothesis = hypotheses.find(h => h.id === selectedHypothesisId) || hypotheses[0];
  const targetSuspect = suspects.find(s => s.id === activeHypothesis?.targetSuspectId);

  const toggleEvidenceSelect = (id: string) => {
    sound.playClick();
    setFeedback({ type: null, message: '' });
    setSelectedEvidenceIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleValidateDeduction = () => {
    if (!activeHypothesis) return;
    if (selectedEvidenceIds.length === 0) {
      sound.playAlertWarning();
      setFeedback({
        type: 'error',
        message: 'Select at least one unlocked evidence file to substantiate this deduction.'
      });
      return;
    }

    const result = onSolveHypothesis(activeHypothesis.id, selectedEvidenceIds);
    if (result.success) {
      sound.playDeductionSuccess();
      setFeedback({ type: 'success', message: result.message });
      setSelectedEvidenceIds([]);
    } else {
      sound.playAlertWarning();
      setFeedback({ type: 'error', message: result.message });
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner: Investigative Corkboard Header */}
      <div className="bg-[#121826] border border-slate-800 p-4 sm:p-5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-lg font-serif-header font-bold text-slate-100 flex items-center space-x-2">
            <GitBranch className="w-4 h-4 text-amber-500" />
            <span>EVIDENTIARY DEDUCTION MATRIX (CORKBOARD)</span>
          </h2>
          <p className="text-xs font-mono-tactical text-slate-400">
            CONNECT PROVEN ARTIFACTS TO ESTABLISH LEGAL CERTAINTY FOR ARREST WARRANTS
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono-tactical text-xs">
          <span className="text-slate-400">SOLVED HYPOTHESES:</span>
          <span className="text-emerald-400 font-bold px-2 py-0.5 bg-slate-900 border border-slate-700 rounded">
            {hypotheses.filter(h => h.isSolved).length} / {hypotheses.length} COMPLETE
          </span>
        </div>
      </div>

      {/* Main Deduction Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Available Unlocked Evidence Picker */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-serif-header font-bold text-slate-100">
                1. SELECT CLUES TO BIND TO HYPOTHESIS
              </h3>
              <span className="text-xs font-mono-tactical text-amber-400">
                {selectedEvidenceIds.length} CLUES ATTACHED
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {evidenceList.map(item => {
                const isSelected = selectedEvidenceIds.includes(item.id);
                const isUnlocked = item.isUnlocked;

                return (
                  <button
                    key={item.id}
                    disabled={!isUnlocked}
                    onClick={() => toggleEvidenceSelect(item.id)}
                    className={`p-3 rounded border text-left transition-all flex flex-col justify-between ${
                      !isUnlocked 
                        ? 'bg-slate-950/60 border-slate-800/80 opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-[#19243B] border-amber-500 ring-2 ring-amber-500/40'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs font-mono-tactical mb-1.5">
                        <span className="text-amber-400 font-semibold">{item.code}</span>
                        {isSelected && (
                          <span className="text-[10px] font-mono-tactical bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-bold">
                            ATTACHED
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif-header text-xs sm:text-sm font-bold text-slate-200 line-clamp-1 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-[11px] font-sans-body text-slate-400 line-clamp-2">
                        {isUnlocked ? item.summary : 'Encrypted or unrecovered. Run recon in district sectors.'}
                      </p>
                    </div>

                    <div className="border-t border-slate-800/80 pt-2 mt-2 flex items-center justify-between text-[10px] font-mono-tactical text-slate-500">
                      <span>TYPE: {item.type.toUpperCase()}</span>
                      <span>{isUnlocked ? 'READY' : 'LOCKED'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Red-Thread Connection Diagram */}
          <div className="bg-[#0D131F] border border-slate-800 p-4 rounded text-xs font-mono-tactical text-slate-400 flex items-center justify-between bg-tactical-grid">
            <div className="flex items-center space-x-2">
              <LinkIcon className="w-4 h-4 text-rose-500" />
              <span>ACTIVE THREAD: BINDING TO [{activeHypothesis?.code}]</span>
            </div>
            <span className="text-slate-500 text-[11px]">
              ANTI-GUESSING SANCTION ENFORCED (+10% SUSPICION ON FALSE HYPOTHESIS)
            </span>
          </div>

        </div>

        {/* Col 3: Deduction Hypotheses & Legal Validation */}
        <div className="space-y-4">
          
          <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-4">
            <h3 className="text-sm font-serif-header font-bold text-slate-100 border-b border-slate-800 pb-2">
              2. SELECT TARGET HYPOTHESIS
            </h3>

            <div className="space-y-2.5">
              {hypotheses.map(hyp => {
                const isSelected = hyp.id === selectedHypothesisId;
                return (
                  <button
                    key={hyp.id}
                    onClick={() => {
                      sound.playClick();
                      setSelectedHypothesisId(hyp.id);
                      setFeedback({ type: null, message: '' });
                    }}
                    className={`w-full text-left p-3 rounded border transition-all ${
                      isSelected
                        ? 'bg-[#182236] border-amber-500/70 ring-1 ring-amber-500/30'
                        : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono-tactical mb-1">
                      <span className="text-amber-400 font-semibold">{hyp.code}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono-tactical uppercase ${
                        hyp.isSolved ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {hyp.isSolved ? 'CONFIRMED' : 'PENDING PROOF'}
                      </span>
                    </div>
                    <h4 className="font-serif-header text-xs font-bold text-slate-200 mb-1">
                      {hyp.title}
                    </h4>
                    <p className="text-[11px] font-sans-body text-slate-400 line-clamp-2">
                      {hyp.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Target Hypothesis Detail Card */}
            {activeHypothesis && (
              <div className="bg-slate-950 p-3.5 rounded border border-slate-800 text-xs space-y-2.5">
                <div className="font-mono-tactical text-[10px] text-slate-500 uppercase">
                  LEGAL PROOF BURDEN // REQUIRES {activeHypothesis.requiredEvidenceIds.length} PIECES OF CONVERGENT EVIDENCE
                </div>
                <p className="font-sans-body text-slate-300 text-xs leading-relaxed">
                  {activeHypothesis.proofExplanation}
                </p>

                {activeHypothesis.isSolved ? (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="flex items-center space-x-1.5 text-emerald-400 font-mono-tactical text-xs font-bold">
                      <FileCheck className="w-4 h-4" />
                      <span>EVIDENTIARY CHAIN ESTABLISHED</span>
                    </div>
                    <button
                      onClick={() => {
                        sound.playClick();
                        onOpenWarrantModal(activeHypothesis);
                      }}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      <Award className="w-4 h-4" />
                      <span>VIEW OFFICIAL ARREST WARRANT</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <button
                      onClick={handleValidateDeduction}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>VALIDATE EVIDENTIARY PROOF</span>
                    </button>
                  </div>
                )}

                {/* Feedback Notification */}
                {feedback.message && (
                  <div className={`p-2 rounded text-xs font-mono-tactical border ${
                    feedback.type === 'success' 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}>
                    {feedback.message}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

    </div>
  );
};
