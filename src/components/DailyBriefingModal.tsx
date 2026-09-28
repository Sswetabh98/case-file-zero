import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ShieldAlert, 
  FileText, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  Users, 
  Compass, 
  Fingerprint, 
  ArrowRight
} from 'lucide-react';
import { CaseFile, TacticalUnit, OperationalLog, OfficerProfile } from '../types/game';
import { sound } from '../lib/audio';

interface DailyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: CaseFile;
  officer: OfficerProfile;
  budget: number;
  suspicionIndex: number;
  gameClock: string;
  units: TacticalUnit[];
  logs: OperationalLog[];
  showOnStartup: boolean;
  onToggleShowOnStartup: (show: boolean) => void;
}

export const DailyBriefingModal: React.FC<DailyBriefingModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  officer,
  budget,
  suspicionIndex,
  gameClock,
  units,
  logs,
  showOnStartup,
  onToggleShowOnStartup
}) => {
  const evidenceList = currentCase?.evidence || [];
  const hypothesesList = currentCase?.hypotheses || [];
  const unitsList = units || [];
  const logsList = logs || [];

  const unlockedEvidence = evidenceList.filter(e => e?.isUnlocked);
  const analyzedEvidence = unlockedEvidence.filter(e => e?.isAnalyzed);
  const solvedHypotheses = hypothesesList.filter(h => h?.isSolved);
  const pendingHypotheses = hypothesesList.filter(h => !h?.isSolved);
  const deployedUnits = unitsList.filter(u => u?.status === 'deployed');
  const criticalLogs = logsList.filter(l => l && (l.severity === 'critical' || l.severity === 'warning')).slice(0, 3);

  const handleDismiss = () => {
    sound.playClick();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="daily-briefing-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
        >
          <motion.div
            key="daily-briefing-dialog"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="bg-[#0B0F19] border-2 border-amber-500/50 rounded shadow-2xl max-w-3xl w-full overflow-hidden text-slate-200"
          >
        
        {/* Top Bureau Classification Header */}
        <div className="bg-[#121A2B] px-5 py-3.5 border-b border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif-header text-sm sm:text-base font-bold text-slate-100 tracking-wider">
                  METRO CRIME BRANCH // DAILY OPERATIONAL BRIEFING
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono-tactical tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase rounded-xs">
                  EYES ONLY
                </span>
              </div>
              <p className="font-mono-tactical text-[10px] text-slate-400">
                OFFICER: {officer.callsign} &middot; CLEARANCE LEVEL {officer.clearanceLevel} &middot; CLOCK: {gameClock}
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-100 p-1 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">

          {/* Banner Summary of Active Case */}
          <div className="bg-slate-950/80 p-4 rounded border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-mono-tactical text-amber-400 tracking-wider uppercase">
                ACTIVE ASSIGNMENT // {currentCase?.caseNumber || 'N/A'}
              </div>
              <h2 className="text-lg font-serif-header font-bold text-slate-100 mt-0.5">
                {currentCase?.title || 'Case File'}
              </h2>
              <p className="text-xs font-sans-body text-slate-300 mt-1 line-clamp-2 max-w-xl">
                {currentCase?.summary || ''}
              </p>
            </div>
            
            {/* Quick Metrics */}
            <div className="flex sm:flex-col gap-2 sm:gap-1 text-right shrink-0 border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
              <div>
                <span className="text-[10px] font-mono-tactical text-slate-400">BUDGET: </span>
                <span className="text-xs font-mono-tactical font-semibold text-emerald-400">${budget.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono-tactical text-slate-400">ALERT INDEX: </span>
                <span className={`text-xs font-mono-tactical font-semibold ${suspicionIndex > 60 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {suspicionIndex}%
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono-tactical text-slate-400">CLASSIFICATION: </span>
                <span className="text-xs font-mono-tactical text-slate-200">{(currentCase?.classification || 'RESTRICTED').split('//')[0]}</span>
              </div>
            </div>
          </div>

          {/* Section 1: Current Case Progress */}
          <div>
            <div className="text-xs font-mono-tactical font-semibold text-slate-300 flex items-center space-x-2 mb-2.5">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>1. CURRENT INVESTIGATION PROGRESS</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Evidence Progress */}
              <div className="bg-[#121826] p-3 rounded border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono-tactical text-slate-400 mb-1">
                  <span>EVIDENCE SEIZED</span>
                  <span className="text-amber-400 font-bold">{unlockedEvidence.length} / {evidenceList.length}</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-xs overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${(unlockedEvidence.length / Math.max(1, evidenceList.length)) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono-tactical text-slate-400 mt-2">
                  {analyzedEvidence.length} certified via forensic lab analysis.
                </p>
              </div>

              {/* Hypotheses / Deductions Progress */}
              <div className="bg-[#121826] p-3 rounded border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono-tactical text-slate-400 mb-1">
                  <span>LEGAL THEORIES</span>
                  <span className="text-emerald-400 font-bold">{solvedHypotheses.length} / {hypothesesList.length}</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-xs overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(solvedHypotheses.length / Math.max(1, hypothesesList.length)) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono-tactical text-slate-400 mt-2">
                  {pendingHypotheses.length} hypotheses pending corroboration.
                </p>
              </div>

              {/* Tactical Units Status */}
              <div className="bg-[#121826] p-3 rounded border border-slate-800">
                <div className="flex items-center justify-between text-xs font-mono-tactical text-slate-400 mb-1">
                  <span>FIELD SQUADS</span>
                  <span className="text-cyan-400 font-bold">{deployedUnits.length} DEPLOYED</span>
                </div>
                <div className="w-full bg-slate-900 h-1.5 rounded-xs overflow-hidden border border-slate-700">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-300"
                    style={{ width: `${(deployedUnits.length / Math.max(1, unitsList.length)) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] font-mono-tactical text-slate-400 mt-2">
                  {Math.max(0, unitsList.length - deployedUnits.length)} standby units ready at HQ.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Outstanding Objectives */}
          <div>
            <div className="text-xs font-mono-tactical font-semibold text-slate-300 flex items-center space-x-2 mb-2.5">
              <Target className="w-3.5 h-3.5 text-amber-400" />
              <span>2. OUTSTANDING STRATEGIC DIRECTIVES</span>
            </div>

            <div className="space-y-2">
              {/* Primary Objective */}
              <div className="bg-slate-950/80 p-3 rounded border border-amber-500/30 flex items-start space-x-2.5">
                <div className="mt-0.5 p-1 bg-amber-500/10 rounded text-amber-400 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono-tactical font-bold text-amber-400 tracking-wider">
                    PRIMARY OBJECTIVE
                  </div>
                  <div className="text-xs font-sans-body text-slate-200 mt-0.5">
                    {currentCase?.primaryObjective || 'Conduct procedural investigation according to law.'}
                  </div>
                </div>
              </div>

              {/* Secondary Objective */}
              <div className="bg-slate-950/80 p-3 rounded border border-slate-800 flex items-start space-x-2.5">
                <div className="mt-0.5 p-1 bg-slate-800 rounded text-slate-300 shrink-0">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] font-mono-tactical font-bold text-slate-400 tracking-wider">
                    SECONDARY OBJECTIVE
                  </div>
                  <div className="text-xs font-sans-body text-slate-300 mt-0.5">
                    {currentCase?.secondaryObjective || 'Maintain evidence chain of custody and minimize suspicion.'}
                  </div>
                </div>
              </div>

              {/* Next Actionable Proof Checklist */}
              <div className="bg-[#121826] p-3 rounded border border-slate-800">
                <div className="text-[10px] font-mono-tactical text-slate-400 uppercase mb-2">
                  PENDING DEDUCTIVE MILESTONES:
                </div>
                <div className="space-y-1.5">
                  {hypothesesList.map(hyp => (
                    <div key={hyp.id} className="flex items-center justify-between text-xs font-mono-tactical py-0.5">
                      <div className="flex items-center space-x-2">
                        {hyp.isSolved ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                        )}
                        <span className={hyp.isSolved ? 'text-slate-400 line-through' : 'text-slate-200'}>
                          [{hyp.code}] {hyp.title}
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase ${hyp.isSolved ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {hyp.isSolved ? 'VERIFIED' : 'UNPROVEN'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Pending Alerts & Tactical Watch */}
          <div>
            <div className="text-xs font-mono-tactical font-semibold text-slate-300 flex items-center space-x-2 mb-2.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>3. PENDING ALERTS & TACTICAL TELEMETRY</span>
            </div>

            <div className="space-y-1.5">
              {criticalLogs.length > 0 ? (
                criticalLogs.map(log => (
                  <div 
                    key={log.id}
                    className={`p-2.5 rounded border text-xs font-mono-tactical flex items-start space-x-2 ${
                      log.severity === 'critical'
                        ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                        : 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    }`}
                  >
                    <span className="text-[10px] px-1 py-0.5 bg-black/40 rounded shrink-0">
                      {log.timestamp}
                    </span>
                    <span className="leading-snug">{log.message}</span>
                  </div>
                ))
              ) : (
                <div className="bg-slate-950/80 p-3 rounded border border-slate-800 text-xs font-mono-tactical text-slate-400">
                  NO CRITICAL BREACHES RECORDED. PROCEED WITH RECON AND FORENSIC INTAKE.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Controls */}
        <div className="bg-[#121A2B] px-5 sm:px-6 py-3.5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center space-x-2 text-xs font-mono-tactical text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showOnStartup}
              onChange={(e) => onToggleShowOnStartup(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
            />
            <span>Show daily briefing on console launch</span>
          </label>

          <button
            onClick={handleDismiss}
            className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <span>ACKNOWLEDGE DIRECTIVE & ACCESS CONSOLE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
