import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, CheckCircle2, ShieldAlert, MapPin, Users, Award, CornerDownRight } from 'lucide-react';
import { DiscoveryMemo } from '../types/game';
import { sound } from '../lib/audio';

interface DiscoveryMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  suspectId: string;
  suspectName: string;
  onMemoRecorded: (memo: DiscoveryMemo) => void;
}

export const DiscoveryMemoModal: React.FC<DiscoveryMemoModalProps> = ({
  isOpen,
  onClose,
  suspectId,
  suspectName,
  onMemoRecorded
}) => {
  const [statementText, setStatementText] = useState(
    'I have concealed the weapon used in the incident behind the abandoned brick kiln near Sector 4. I can lead police to the exact spot and recover it.'
  );
  const [targetLocation, setTargetLocation] = useState('Abandoned Brick Kiln, Sector 4');
  const [itemDescription, setItemDescription] = useState('Country-made pistol with 2 live cartridges');
  const [witnessA, setWitnessA] = useState('Rameshwar Sharma (Local Merchant, Panch 1)');
  const [witnessB, setWitnessB] = useState('Anil Gupta (Area Resident, Panch 2)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statementText.trim() || !targetLocation.trim() || !itemDescription.trim()) {
      setErrorMsg('All fields are mandatory to satisfy BSA Section 23 legal admissibility.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    sound.playDeductionSuccess();

    try {
      const res = await fetch('/api/interrogation/generate-memo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspectId,
          suspectName,
          statementText,
          targetLocation,
          itemDescription,
          panchaWitnesses: [witnessA, witnessB],
          officerRank: 'Inspector / Investigating Officer'
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.memo) {
          onMemoRecorded(data.memo);
          onClose();
          return;
        }
      }
    } catch {
      // Local fallback
    }

    // Fallback memo generation
    const fallbackMemo: DiscoveryMemo = {
      id: `memo-${Date.now()}`,
      memoNumber: `DISC-BSA23/2026/${Math.floor(1000 + Math.random() * 9000)}`,
      suspectId,
      suspectName,
      statutoryAct: 'BSA_2023_S23',
      exactVoluntaryStatement: statementText.trim(),
      revealedLocation: targetLocation.trim(),
      recoveryItemDescription: itemDescription.trim(),
      panchaWitnesses: [
        { name: witnessA, occupation: 'Independent Witness 1', signatureVerified: true },
        { name: witnessB, occupation: 'Independent Witness 2', signatureVerified: true }
      ],
      investigatingOfficerRank: 'Inspector & IO',
      admissibilityConfirmed: true,
      createdAt: new Date().toISOString()
    };

    onMemoRecorded(fallbackMemo);
    setIsSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="discovery-memo-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
        >
          <motion.div
            key="discovery-memo-dialog"
            initial={{ opacity: 0, y: -25, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.96 }}
            className="w-full max-w-xl bg-[#0B1220] border-2 border-emerald-500/60 rounded shadow-2xl p-5 space-y-4 font-mono-tactical text-slate-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                  BSA 2023 SECTION 23 // DISCOVERY & RECOVERY MEMO
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-emerald-950/20 border border-emerald-500/30 p-2.5 rounded text-[11px] text-emerald-300 leading-snug">
              ⚖️ <span className="font-bold">Statutory Admissibility Rule:</span> Under Section 23 BSA 2023, only that distinct portion of a suspect's confession which leads directly to the recovery of a physical object or concealed fact before Pancha witnesses is admissible in Court.
            </div>

            {errorMsg && (
              <div className="bg-rose-950/40 border border-rose-500/60 p-2.5 rounded text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Accused Name */}
              <div>
                <label className="text-slate-400 text-[11px] uppercase block mb-1">
                  EXAMINED ACCUSED PERSON:
                </label>
                <input
                  type="text"
                  value={suspectName}
                  disabled
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-1.5 rounded text-slate-300 font-bold"
                />
              </div>

              {/* Exact Confession Statement */}
              <div>
                <label className="text-slate-400 text-[11px] uppercase block mb-1">
                  EXACT VOLUNTARY DISCLOSURE STATEMENT (IN FIRST PERSON):
                </label>
                <textarea
                  rows={3}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded text-slate-100 text-xs focus:border-emerald-500 focus:outline-none"
                  placeholder="Record exact disclosure leading to recovery..."
                />
              </div>

              {/* Recovery Coordinates & Item Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 text-[11px] uppercase block mb-1 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>CONCEALED RECOVERY LOCATION:</span>
                  </label>
                  <input
                    type="text"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded text-slate-100 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 text-[11px] uppercase block mb-1 flex items-center space-x-1">
                    <Award className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PHYSICAL OBJECT TO RECOVER:</span>
                  </label>
                  <input
                    type="text"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 px-3 py-1.5 rounded text-slate-100 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pancha Witnesses */}
              <div>
                <label className="text-slate-400 text-[11px] uppercase block mb-1 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>INDEPENDENT PANCHA WITNESSES (MANDATORY FOR ADMISSIBILITY):</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={witnessA}
                    onChange={(e) => setWitnessA(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded text-slate-300 text-[11px]"
                  />
                  <input
                    type="text"
                    value={witnessB}
                    onChange={(e) => setWitnessB(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 px-2.5 py-1.5 rounded text-slate-300 text-[11px]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>EXECUTE & RECORD PANCHNAMA MEMO</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
