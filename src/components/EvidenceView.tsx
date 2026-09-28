import React, { useState } from 'react';
import { 
  Search, 
  Lock, 
  CheckCircle, 
  FlaskConical, 
  FileSearch, 
  Tag, 
  MapPin, 
  Calendar, 
  Fingerprint, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  LayoutGrid,
  Clock
} from 'lucide-react';
import { EvidenceItem, EvidenceType } from '../types/game';
import { sound } from '../lib/audio';
import { EvidenceTimeline } from './EvidenceTimeline';

interface EvidenceViewProps {
  evidenceList: EvidenceItem[];
  onAnalyzeEvidence: (evidenceId: string) => Promise<void>;
  isAnalyzing: boolean;
  budget: number;
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({
  evidenceList,
  onAnalyzeEvidence,
  isAnalyzing,
  budget
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(
    evidenceList.find(e => e.isUnlocked) || null
  );
  const [filterQuery, setFilterQuery] = useState('');

  const types: { id: string; label: string }[] = [
    { id: 'all', label: 'All Evidence' },
    { id: 'ballistics', label: 'Ballistics' },
    { id: 'financial', label: 'Financial' },
    { id: 'cryptography', label: 'Cryptography' },
    { id: 'surveillance', label: 'Surveillance' },
    { id: 'forensics', label: 'Lab & Tox' },
    { id: 'audio_log', label: 'SIGINT Audio' },
  ];

  const filteredEvidence = evidenceList.filter(item => {
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesQuery = filterQuery === '' || 
      item.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(filterQuery.toLowerCase()) ||
      item.tags.some(t => t.toLowerCase().includes(filterQuery.toLowerCase()));
    return matchesType && matchesQuery;
  });

  const handleSelect = (item: EvidenceItem) => {
    if (!item.isUnlocked) {
      sound.playAlertWarning();
      return;
    }
    sound.playClick();
    setSelectedEvidence(item);
  };

  const handleTriggerAnalysis = async (evidenceId: string) => {
    sound.playClick();
    await onAnalyzeEvidence(evidenceId);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Controls: View Toggle, Search & Category Filter */}
      <div className="bg-[#121826] border border-slate-800 p-4 rounded flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        
        {/* View Mode Toggle: Grid vs Chronological Timeline */}
        <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded border border-slate-800 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setViewMode('grid');
            }}
            className={`px-3 py-1.5 text-xs font-mono-tactical rounded flex items-center space-x-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>CARD GRID</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setViewMode('timeline');
            }}
            className={`px-3 py-1.5 text-xs font-mono-tactical rounded flex items-center space-x-1.5 transition-colors ${
              viewMode === 'timeline'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>EVIDENCE TIMELINE</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {types.map(t => (
            <button
              key={t.id}
              onClick={() => {
                sound.playClick();
                setSelectedType(t.id);
              }}
              className={`px-3 py-1.5 text-xs font-mono-tactical rounded-full whitespace-nowrap transition-colors ${
                selectedType === t.id
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-semibold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Search Field */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search tags, codes, titles..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono-tactical rounded pl-8 pr-3 py-1.5 focus:border-amber-500 focus:outline-none"
          />
        </div>

      </div>

      {/* Main Grid: Either Evidence Cards List or Evidence Timeline, plus Selected Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Evidence Cards Grid OR Evidence Timeline */}
        <div className="lg:col-span-2">
          {viewMode === 'timeline' ? (
            <EvidenceTimeline
              evidenceList={filteredEvidence}
              selectedEvidenceId={selectedEvidence?.id}
              onSelectEvidence={handleSelect}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredEvidence.map(item => {
                const isSelected = selectedEvidence?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`p-4 rounded border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      !item.isUnlocked
                        ? 'bg-slate-950/60 border-slate-800/80 opacity-60 hover:opacity-75'
                        : isSelected
                        ? 'bg-[#161F33] border-amber-500/70 shadow-md ring-1 ring-amber-500/40'
                        : 'bg-[#121826] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top Bar: Code & Status */}
                      <div className="flex items-center justify-between text-xs font-mono-tactical mb-2">
                        <span className="text-amber-400 font-semibold">{item.code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-mono-tactical ${
                          !item.isUnlocked
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/60'
                            : item.isAnalyzed
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {!item.isUnlocked ? 'CLASSIFIED / UNRECOVERED' : item.isAnalyzed ? 'LAB CERTIFIED' : 'INTAKE COMPLETE'}
                        </span>
                      </div>

                      {/* Title & Summary */}
                      <h3 className="font-serif-header text-sm sm:text-base font-bold text-slate-100 mb-2 leading-snug">
                        {item.title}
                      </h3>
                      <p className="text-xs font-sans-body text-slate-300 line-clamp-3 mb-3">
                        {item.isUnlocked ? item.summary : 'Item is awaiting recovery by tactical field teams or suspect confession. Dispatch teams to relevant sectors.'}
                      </p>
                    </div>

                    {/* Bottom Footer: Tags & Location */}
                    <div className="border-t border-slate-800/80 pt-2.5 mt-2 flex items-center justify-between text-[11px] font-mono-tactical text-slate-400">
                      <div className="flex items-center space-x-1 truncate max-w-[70%]">
                        <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                        <span className="truncate">{item.locationFound}</span>
                      </div>
                      <div>
                        {!item.isUnlocked ? (
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                        ) : item.isAnalyzed ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="text-amber-400 text-[10px]">ANALYSIS READY</span>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Deep Inspection & Forensic Lab Workspace */}
        <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-4">
          <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-serif-header font-bold text-slate-100 flex items-center space-x-2">
              <Fingerprint className="w-4 h-4 text-amber-500" />
              <span>FORENSIC EXAMINATION BENCH</span>
            </h3>
            {selectedEvidence && (
              <span className="text-[11px] font-mono-tactical text-amber-400 font-semibold">
                {selectedEvidence.code}
              </span>
            )}
          </div>

          {selectedEvidence ? (
            <div className="space-y-4">
              
              {/* Evidence Title & Type */}
              <div>
                <span className="text-[10px] font-mono-tactical uppercase text-slate-400 tracking-wider">
                  CLASSIFICATION: {selectedEvidence.type.toUpperCase()}
                </span>
                <h2 className="text-lg font-serif-header font-bold text-slate-100 mt-0.5">
                  {selectedEvidence.title}
                </h2>
              </div>

              {/* Technical Description */}
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs font-sans-body text-slate-300 leading-relaxed">
                <p>{selectedEvidence.fullDescription}</p>
              </div>

              {/* Chain of Custody */}
              <div className="bg-slate-900/80 p-3 rounded border border-slate-800 text-xs font-mono-tactical space-y-1">
                <div className="text-slate-500 text-[10px] uppercase">LEGAL CHAIN OF CUSTODY</div>
                <div className="text-slate-300">{selectedEvidence.chainOfCustody}</div>
                <div className="text-slate-500 text-[10px] pt-1">RECOVERED AT: {selectedEvidence.locationFound}</div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedEvidence.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-mono-tactical bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-slate-400">
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Forensic Lab Analysis Section (Gemini AI API) */}
              <div className="border-t border-slate-800 pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono-tactical text-slate-300 font-semibold flex items-center space-x-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-amber-400" />
                    <span>LAB SPECTROMETRY & ANALYSIS</span>
                  </span>
                  <span className="text-[10px] font-mono-tactical text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                    GEMINI CO-PROCESSOR
                  </span>
                </div>

                {selectedEvidence.forensicAnalysis ? (
                  <div className="bg-slate-950 p-3.5 rounded border border-emerald-500/40 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono-tactical text-emerald-400">
                      <span>STATUS: SPECTRAL MATCH CONFIRMED</span>
                      <span>CONFIDENCE: {selectedEvidence.forensicAnalysis.confidence}%</span>
                    </div>
                    <p className="text-xs font-sans-body text-slate-300 leading-relaxed">
                      {selectedEvidence.forensicAnalysis.report}
                    </p>
                    {selectedEvidence.forensicAnalysis.revealedLead && (
                      <div className="mt-2 pt-2 border-t border-slate-800 text-xs font-mono-tactical text-amber-300">
                        <span className="font-bold">UNCOVERED ACTIONABLE LEAD:</span> {selectedEvidence.forensicAnalysis.revealedLead}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-900/60 p-3 rounded border border-slate-800 space-y-3">
                    <p className="text-xs font-sans-body text-slate-400">
                      Submit this specimen to the Automated Crime Lab for advanced spectroscopic, ballistic striation, or cryptographic decryption.
                    </p>
                    <button
                      disabled={isAnalyzing || budget < 350}
                      onClick={() => handleTriggerAnalysis(selectedEvidence.id)}
                      className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                          <span>SYNTHESIZING FORENSIC DATA...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>RUN CRIME LAB ANALYSIS ($350)</span>
                        </>
                      )}
                    </button>
                    {budget < 350 && (
                      <p className="text-[10px] font-mono-tactical text-rose-400 text-center">
                        Insufficient operational funds for forensic scan.
                      </p>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 font-mono-tactical text-xs">
              <FileSearch className="w-8 h-8 mx-auto mb-2 opacity-50 text-slate-600" />
              SELECT AN UNLOCKED EVIDENCE FILE TO INSPECT
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
