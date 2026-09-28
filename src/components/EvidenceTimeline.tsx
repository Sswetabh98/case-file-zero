import React from 'react';
import { 
  Clock, 
  MapPin, 
  CheckCircle2, 
  Lock, 
  Sparkles, 
  FlaskConical, 
  FileText, 
  Activity,
  Shield,
  Search
} from 'lucide-react';
import { EvidenceItem, EvidenceType } from '../types/game';
import { sound } from '../lib/audio';

interface EvidenceTimelineProps {
  evidenceList: EvidenceItem[];
  selectedEvidenceId?: string;
  onSelectEvidence: (item: EvidenceItem) => void;
}

const TYPE_COLORS: Record<EvidenceType, { bg: string; text: string; border: string }> = {
  ballistics: { bg: 'bg-rose-950/40', text: 'text-rose-300', border: 'border-rose-800/60' },
  cryptography: { bg: 'bg-indigo-950/40', text: 'text-indigo-300', border: 'border-indigo-800/60' },
  financial: { bg: 'bg-emerald-950/40', text: 'text-emerald-300', border: 'border-emerald-800/60' },
  surveillance: { bg: 'bg-cyan-950/40', text: 'text-cyan-300', border: 'border-cyan-800/60' },
  forensics: { bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-800/60' },
  document: { bg: 'bg-slate-900', text: 'text-slate-300', border: 'border-slate-700' },
  audio_log: { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-800/60' },
};

export const EvidenceTimeline: React.FC<EvidenceTimelineProps> = ({
  evidenceList,
  selectedEvidenceId,
  onSelectEvidence,
}) => {
  // Sort chronologically:
  // Recovered items sorted by their dateDiscovered/recovered timestamp
  // Followed by unrecovered items
  const sortedEvidence = [...evidenceList].sort((a, b) => {
    if (a.isUnlocked && !b.isUnlocked) return -1;
    if (!a.isUnlocked && b.isUnlocked) return 1;
    return a.dateDiscovered.localeCompare(b.dateDiscovered);
  });

  return (
    <div className="bg-[#121826] border border-slate-800 rounded p-4 sm:p-5">
      
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800 mb-5">
        <div>
          <h3 className="font-serif-header text-sm sm:text-base font-bold text-slate-100 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>CHRONOLOGICAL CHAIN-OF-CUSTODY & ANALYSIS TIMELINE</span>
          </h3>
          <p className="font-mono-tactical text-[11px] text-slate-400">
            TIMESTAMPED SEQUENCE OF PHYSICAL RECOVERY AND CRIME LAB SPECTROMETRY
          </p>
        </div>
        <div className="flex items-center space-x-2 font-mono-tactical text-[10px]">
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
            ● ANALYZED
          </span>
          <span className="px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/80">
            ● RECOVERED
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
            ○ PENDING RECON
          </span>
        </div>
      </div>

      {/* Chronological Vertical Milestones */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-amber-500 before:via-cyan-600 before:to-slate-800">
        
        {sortedEvidence.map((item, idx) => {
          const isSelected = selectedEvidenceId === item.id;
          const typeStyle = TYPE_COLORS[item.type] || TYPE_COLORS.document;

          return (
            <div 
              key={item.id}
              onClick={() => {
                sound.playClick();
                onSelectEvidence(item);
              }}
              className={`relative group cursor-pointer transition-all duration-150 rounded border p-3.5 ${
                isSelected
                  ? 'bg-[#18233A] border-amber-500/80 ring-1 ring-amber-500/40 shadow-lg'
                  : item.isUnlocked
                  ? 'bg-slate-950/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                  : 'bg-slate-950/30 border-slate-900 opacity-60 hover:opacity-80'
              }`}
            >
              {/* Timeline Marker Node */}
              <div 
                className={`absolute -left-[27px] sm:-left-[35px] top-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 ${
                  !item.isUnlocked
                    ? 'bg-slate-950 border-slate-700 text-slate-600'
                    : item.isAnalyzed
                    ? 'bg-emerald-950 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-amber-950 border-amber-400 text-amber-300 ring-2 ring-amber-500/20'
                }`}
              >
                {!item.isUnlocked ? (
                  <Lock className="w-2.5 h-2.5" />
                ) : item.isAnalyzed ? (
                  <CheckCircle2 className="w-2.5 h-2.5" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </div>

              {/* Card Header: Timestamp & Code */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center space-x-2">
                  <span className="font-mono-tactical text-xs font-bold text-amber-400">
                    {item.code}
                  </span>
                  <span className={`text-[10px] font-mono-tactical px-2 py-0.5 rounded border uppercase ${typeStyle.bg} ${typeStyle.text} ${typeStyle.border}`}>
                    {item.type}
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] font-mono-tactical text-slate-400">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>{item.dateDiscovered}</span>
                </div>
              </div>

              {/* Title & Narrative Summary */}
              <h4 className="font-serif-header text-sm sm:text-base font-bold text-slate-100 group-hover:text-amber-200 transition-colors">
                {item.title}
              </h4>
              <p className="text-xs font-sans-body text-slate-300 mt-1 line-clamp-2">
                {item.isUnlocked ? item.summary : 'Awaiting tactical unit dispatch and physical intake.'}
              </p>

              {/* Chain-of-Custody & Discovery Location */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tactical text-slate-400">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                  <span className="truncate max-w-[240px]">{item.locationFound}</span>
                </div>

                <div className="flex items-center space-x-1.5 text-slate-400">
                  <Shield className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[240px]">{item.chainOfCustody}</span>
                </div>
              </div>

              {/* Forensic Analysis Milestone (If Completed) */}
              {item.isAnalyzed && item.forensicAnalysis && (
                <div className="mt-2.5 p-2.5 rounded bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono-tactical text-emerald-400">
                    <span className="flex items-center space-x-1">
                      <FlaskConical className="w-3 h-3 text-emerald-400" />
                      <strong>CRIME LAB CERTIFIED</strong> ({item.forensicAnalysis.method})
                    </span>
                    <span>CONFIDENCE: {item.forensicAnalysis.confidence}%</span>
                  </div>
                  <p className="text-xs font-sans-body text-slate-300">
                    {item.forensicAnalysis.report}
                  </p>
                  {item.forensicAnalysis.revealedLead && (
                    <div className="text-[11px] font-mono-tactical text-amber-300 pt-1 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                      <span><strong>LEAD:</strong> {item.forensicAnalysis.revealedLead}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Action Hint if Unanalyzed */}
              {item.isUnlocked && !item.isAnalyzed && (
                <div className="mt-2 p-2 rounded bg-amber-950/20 border border-amber-800/40 text-[11px] font-mono-tactical text-amber-300 flex items-center justify-between">
                  <span>SPECIMEN AWAITING FORENSIC SPECTROMETRY</span>
                  <span className="text-[10px] underline font-bold">CLICK TO EXAMINE &rarr;</span>
                </div>
              )}

            </div>
          );
        })}

      </div>

    </div>
  );
};
