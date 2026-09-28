import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Gavel, CheckCircle2, ShieldAlert, FileText, Clock, Building2, AlertTriangle } from 'lucide-react';
import { RemandClockState } from '../types/game';
import { sound } from '../lib/audio';

interface RemandExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  clock: RemandClockState;
  suspectName: string;
  onConfirmExtension: (updatedClock: RemandClockState, judicialOrderNotes: string) => void;
}

export const RemandExtensionModal: React.FC<RemandExtensionModalProps> = ({
  isOpen,
  onClose,
  clock,
  suspectName,
  onConfirmExtension
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedGround, setSelectedGround] = useState<string>('forensic_pending');
  const [justification, setJustification] = useState<string>(
    `Interrogation of accused ${suspectName} remains incomplete due to pending forensic analysis of seized exhibits and critical timeline verification under BSA s.23.`
  );
  const [judicialOrder, setJudicialOrder] = useState<{
    orderNumber: string;
    magistrateName: string;
    courtName: string;
    extensionHours: number;
    notes: string;
  } | null>(null);

  const handleApplyExtension = async () => {
    setIsSubmitting(true);
    sound.playAlertWarning();

    try {
      const res = await fetch('/api/interrogation/remand-extension', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentClock: clock,
          ground: selectedGround,
          justification
        })
      });

      if (res.ok) {
        const data = await res.json();
        setJudicialOrder({
          orderNumber: data.orderNumber || `JM-REMAND/${Date.now()}`,
          magistrateName: data.magistrateName || 'Hon. Magistrate V. K. Deshmukh (Chief Judicial Magistrate)',
          courtName: 'District Judicial Court No. 03',
          extensionHours: 24,
          notes: data.notes || `Judicial Order granted under Section 187 BNSS 2023. Police custody extended by 24 hours. Directed IO to produce suspect with fresh medical certificate under Section 54 BNSS upon expiry.`
        });
        if (data.clock) {
          onConfirmExtension(data.clock, data.notes || 'Police remand extended by 24 hours under BNSS s.187');
        }
      } else {
        // Fallback calculation
        const updated: RemandClockState = {
          ...clock,
          remandMinutesRemaining: clock.remandMinutesRemaining + 1440, // +24 hours
          magistrateNoticeIssued: true
        };
        const orderNotes = `Judicial Order issued by Chief Judicial Magistrate under Section 187 BNSS 2023. Police remand extended by 24 hours (+1440 minutes) for investigative recovery.`;
        setJudicialOrder({
          orderNumber: `JM-REMAND/${Date.now()}`,
          magistrateName: 'Hon. Magistrate V. K. Deshmukh (CJM Court No. 03)',
          courtName: 'Metropolitan Magistrate Court',
          extensionHours: 24,
          notes: orderNotes
        });
        onConfirmExtension(updated, orderNotes);
      }
    } catch {
      const updated: RemandClockState = {
        ...clock,
        remandMinutesRemaining: clock.remandMinutesRemaining + 1440,
        magistrateNoticeIssued: true
      };
      const orderNotes = `Judicial Order issued under Section 187 BNSS 2023. Police remand extended by 24 hours (+1440 minutes).`;
      setJudicialOrder({
        orderNumber: `JM-REMAND/${Date.now()}`,
        magistrateName: 'Hon. Magistrate V. K. Deshmukh',
        courtName: 'District Judicial Court No. 03',
        extensionHours: 24,
        notes: orderNotes
      });
      onConfirmExtension(updated, orderNotes);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="remand-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
        >
          <motion.div
            key="remand-modal-dialog"
            initial={{ opacity: 0, y: -25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="w-full max-w-lg bg-[#0F172A] border-2 border-amber-500/60 rounded shadow-2xl p-5 space-y-4 font-mono-tactical text-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Gavel className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  POLICE REMAND EXTENSION PETITION (BNSS s.187)
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Custody Clock Info */}
            <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1 text-xs">
              <div className="text-slate-400 flex items-center justify-between">
                <span>SUBJECT IN CUSTODY: <strong className="text-slate-200">{suspectName}</strong></span>
                <span className="text-amber-400 font-bold">BNSS s.187 PETITION</span>
              </div>
              <div className="text-slate-400 flex items-center space-x-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>REMAINING CUSTODY CLOCK: <strong className="text-amber-300">{Math.floor(clock.remandMinutesRemaining / 60)}h {clock.remandMinutesRemaining % 60}m</strong></span>
              </div>
              <div className="text-[11px] text-slate-400/90 pt-1">
                Statutory Rule: Section 187 BNSS forbids police custody beyond 24 hours without a formal extension order from the Judicial Magistrate.
              </div>
            </div>

            {!judicialOrder ? (
              <div className="space-y-3.5 text-xs">
                {/* Grounds Selection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    Primary Statutory Ground for Extension:
                  </label>
                  <select
                    value={selectedGround}
                    onChange={(e) => setSelectedGround(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:border-amber-500 focus:outline-none"
                  >
                    <option value="forensic_pending">
                      1. Pending Malkhana Forensic Analysis & Ballistics Matching (BSA s.23)
                    </option>
                    <option value="recovery_pending">
                      2. Recovery of Concealed Weapon / Stolen Asset based on Disclosure
                    </option>
                    <option value="co_accused">
                      3. Inter-state Co-Accused Confrontation & Financial Trail Audit
                    </option>
                    <option value="medical_delay">
                      4. Interrogation Delay due to Mandatory Medical Checks & Defense Presence
                    </option>
                  </select>
                </div>

                {/* Justification Box */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase">
                    IO Application Narrative for Judicial Record:
                  </label>
                  <textarea
                    rows={3}
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-sans-body p-2.5 rounded focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                  >
                    CANCEL
                  </button>
                  <button
                    onClick={handleApplyExtension}
                    disabled={isSubmitting || !justification.trim()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>{isSubmitting ? 'PETITIONING MAGISTRATE...' : 'SUBMIT PETITION TO MAGISTRATE (+24H)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-950/20 border border-amber-500/50 p-4 rounded space-y-3 text-xs">
                <div className="flex items-center space-x-2 text-amber-400 font-bold border-b border-amber-500/30 pb-2">
                  <Gavel className="w-4 h-4 text-amber-400" />
                  <span>JUDICIAL REMAND EXTENSION ORDER GRANTED (BNSS s.187)</span>
                </div>

                <div className="space-y-1.5 text-slate-300 text-[11px]">
                  <div><span className="text-slate-500">ISSUING COURT:</span> {judicialOrder.courtName}</div>
                  <div><span className="text-slate-500">PRESIDING MAGISTRATE:</span> {judicialOrder.magistrateName}</div>
                  <div><span className="text-slate-500">ORDER NO:</span> {judicialOrder.orderNumber}</div>
                  <div><span className="text-slate-500">EXTENSION GRANTED:</span> +{judicialOrder.extensionHours} HOURS (+1440 MIN)</div>
                  <div className="text-amber-200 p-2 bg-black/40 rounded border border-amber-500/20 italic mt-1">
                    "{judicialOrder.notes}"
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-xs cursor-pointer"
                  >
                    RECORD JUDICIAL ORDER & CONTINUE
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
