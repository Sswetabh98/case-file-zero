import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Award, ShieldAlert, CheckCircle2, FileText, Send } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DeductionHypothesis, Suspect } from '../types/game';
import { sound } from '../lib/audio';

interface WarrantModalProps {
  isOpen: boolean;
  onClose: () => void;
  hypothesis: DeductionHypothesis | null;
  suspect: Suspect | null;
  onExecuteArrest: (suspectId: string) => void;
}

export const WarrantModal: React.FC<WarrantModalProps> = ({
  isOpen,
  onClose,
  hypothesis,
  suspect,
  onExecuteArrest
}) => {
  useEffect(() => {
    if (isOpen) {
      sound.playDeductionSuccess();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#10B981', '#E2E8F0']
        });
      } catch {}
    }
  }, [isOpen]);

  const handleArrest = () => {
    sound.playDispatchRadio();
    if (suspect) {
      onExecuteArrest(suspect.id);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && hypothesis && suspect && (
        <motion.div
          key="warrant-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
        >
          <motion.div
            key="warrant-modal-dialog"
            initial={{ opacity: 0, y: -35, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="bg-[#121826] border-2 border-amber-500/80 w-full max-w-lg rounded p-6 space-y-5 shadow-2xl relative"
          >
        
        {/* Close */}
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Warrant Header */}
        <div className="text-center space-y-1 border-b border-slate-800 pb-4">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/40 text-amber-400 font-mono-tactical text-[11px] uppercase font-bold tracking-widest">
            <Award className="w-3.5 h-3.5" />
            <span>METROPOLITAN CIRCUIT COURT // DISTRICT 4</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif-header font-bold text-slate-100 tracking-wide mt-2">
            JUDICIAL WARRANT FOR IMMEDIATE ARREST
          </h2>
          <p className="font-mono-tactical text-xs text-slate-400">
            WARRANT NUMBER: WR-2026-{Math.floor(1000 + Math.random() * 9000)} // PROBABLE CAUSE VERIFIED
          </p>
        </div>

        {/* Suspect & Charge Details */}
        <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-3 font-mono-tactical text-xs">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800/80">
            <img 
              src={suspect.mugshotUrl} 
              alt={suspect.name} 
              className="w-14 h-14 object-cover rounded bg-slate-900 border border-slate-700 shrink-0"
            />
            <div>
              <span className="text-[10px] text-slate-500 uppercase block">SUBJECT IDENTIFIER</span>
              <h3 className="font-serif-header text-base font-bold text-slate-100">
                {suspect.name} ({suspect.alias})
              </h3>
              <p className="text-[11px] text-amber-400">{suspect.role}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-slate-500 text-[10px] uppercase">STATUTORY INDICTMENTS:</div>
            <div className="text-slate-200 font-semibold">
              First-Degree Evidentiary Homicide, Wire Fraud ($84,000,000), Chemical Facilitation, and Conspiracy to Destroy Federal Evidence.
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="text-slate-500 text-[10px] uppercase">EVIDENTIARY BASIS ESTABLISHED:</div>
            <div className="text-emerald-400 text-xs font-sans-body">
              {hypothesis.proofExplanation}
            </div>
          </div>
        </div>

        {/* Tactical Action Button */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleArrest}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-lg"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>DISPATCH SWAT BREACHERS // APPREHEND SUSPECT</span>
          </button>
          <p className="text-[10px] font-mono-tactical text-slate-500 text-center">
            Execution triggers immediate custody transfer and closes out active warrant metrics.
          </p>
        </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
