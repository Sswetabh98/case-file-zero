import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Stethoscope, CheckCircle2, ShieldAlert, HeartPulse, FileCheck, Clock } from 'lucide-react';
import { RemandClockState } from '../types/game';
import { sound } from '../lib/audio';

interface MedicalCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  clock: RemandClockState;
  suspectName: string;
  onConfirmExamination: (updatedClock: RemandClockState) => void;
}

export const MedicalCheckModal: React.FC<MedicalCheckModalProps> = ({
  isOpen,
  onClose,
  clock,
  suspectName,
  onConfirmExamination
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medicalReport, setMedicalReport] = useState<{
    cmoName: string;
    certificateNo: string;
    bp: string;
    pulse: string;
    status: string;
    notes: string;
  } | null>(null);

  const handleRunExamination = async () => {
    setIsSubmitting(true);
    sound.playAlertWarning();
    try {
      const res = await fetch('/api/interrogation/medical-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentClock: clock })
      });

      if (res.ok) {
        const data = await res.json();
        setMedicalReport({
          cmoName: data.medicalMemo?.doctorName || 'Dr. A. Verma (Chief Medical Officer, District Hospital)',
          certificateNo: data.medicalMemo?.certificateNo || `MED-BNSS54/${Date.now()}`,
          bp: data.medicalMemo?.bp || '126/82 mmHg',
          pulse: data.medicalMemo?.pulse || '78 bpm',
          status: 'CERTIFIED MEDICALLY FIT (BNSS s.53/54)',
          notes: 'No external injuries, contusions, or sign of physical coercion observed. Subject is fit for continued inquiry.'
        });
        if (data.clock) {
          onConfirmExamination(data.clock);
        }
      } else {
        // Local fallback
        const updated: RemandClockState = {
          ...clock,
          remandMinutesRemaining: Math.max(0, clock.remandMinutesRemaining - 45),
          lastMedicalCheckMinutesAgo: 0,
          medicalFitnessStatus: 'fit'
        };
        setMedicalReport({
          cmoName: 'Dr. A. Verma (CMO District Hospital)',
          certificateNo: `MED-BNSS54/${Date.now()}`,
          bp: '124/80 mmHg',
          pulse: '80 bpm',
          status: 'CERTIFIED MEDICALLY FIT (BNSS s.53/54)',
          notes: 'Standard vital signs recorded. Custodial fitness certificate issued under Section 54 BNSS 2023.'
        });
        onConfirmExamination(updated);
      }
    } catch {
      const updated: RemandClockState = {
        ...clock,
        remandMinutesRemaining: Math.max(0, clock.remandMinutesRemaining - 45),
        lastMedicalCheckMinutesAgo: 0,
        medicalFitnessStatus: 'fit'
      };
      setMedicalReport({
        cmoName: 'Dr. A. Verma (CMO District Hospital)',
        certificateNo: `MED-BNSS54/${Date.now()}`,
        bp: '124/80 mmHg',
        pulse: '80 bpm',
        status: 'CERTIFIED MEDICALLY FIT (BNSS s.53/54)',
        notes: 'Vital signs stable. Examination completed under Section 54 BNSS 2023.'
      });
      onConfirmExamination(updated);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="medical-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
        >
          <motion.div
            key="medical-modal-dialog"
            initial={{ opacity: 0, y: -25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="w-full max-w-lg bg-[#0F172A] border-2 border-emerald-500/50 rounded shadow-2xl p-5 space-y-4 font-mono-tactical text-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  MANDATORY MEDICAL EXAMINATION (BNSS s.53 / s.54)
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Subject Context */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400">
                SUBJECT UNDER CUSTODY: <span className="font-bold text-slate-200">{suspectName}</span>
              </div>
              <div className="text-slate-400 flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>TIME SINCE LAST EVALUATION: {Math.floor(clock.lastMedicalCheckMinutesAgo / 60)}h {clock.lastMedicalCheckMinutesAgo % 60}m</span>
              </div>
              <div className="text-[11px] text-amber-400/90 pt-1">
                Statutory Mandate: Section 54 BNSS requires independent medical inspection to ensure procedural admissibility and prevent custodial coercion claims.
              </div>
            </div>

            {/* Examination Output or Prompt */}
            {!medicalReport ? (
              <div className="space-y-3 py-2">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Summon the District Medical Officer to conduct an on-site physical fitness check and record vital parameters.
                  <br />
                  <span className="text-amber-400 font-bold">Note:</span> Performing this examination deducts 45 minutes from the 24-hour statutory custody clock but fully restores procedural compliance.
                </p>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleRunExamination}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>{isSubmitting ? 'CONDUCTING EXAM...' : 'CONDUCT EXAMINATION (45 MIN)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-950/20 border border-emerald-500/40 p-4 rounded space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <FileCheck className="w-4 h-4" />
                  <span>OFFICIAL MEDICAL FITNESS CERTIFICATE</span>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div><span className="text-slate-500">EXAMINING OFFICER:</span> {medicalReport.cmoName}</div>
                  <div><span className="text-slate-500">CERTIFICATE REF:</span> {medicalReport.certificateNo}</div>
                  <div><span className="text-slate-500">BLOOD PRESSURE:</span> {medicalReport.bp} | <span className="text-slate-500">PULSE:</span> {medicalReport.pulse}</div>
                  <div><span className="text-slate-500">FINDINGS:</span> {medicalReport.notes}</div>
                  <div className="text-emerald-400 font-bold pt-1">STATUS: {medicalReport.status}</div>
                </div>

                <div className="flex justify-end pt-2 border-t border-emerald-800/40">
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs cursor-pointer"
                  >
                    ATTACH TO CASE DIARY & CLOSE
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
