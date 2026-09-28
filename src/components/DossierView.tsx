import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  MapPin, 
  Target, 
  CheckCircle2, 
  AlertCircle, 
  FolderArchive,
  FolderOpen,
  ChevronRight,
  ShieldCheck,
  Calendar,
  Gavel,
  Award,
  Scale,
  Search,
  BookOpen,
  Filter,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Lock,
  ExternalLink,
  Clock,
  UserCheck
} from 'lucide-react';
import { CaseFile, ArchivedCaseFile } from '../types/game';
import { sound } from '../lib/audio';
import { 
  getArchivedCases, 
  saveArchivedCases, 
  INITIAL_ARCHIVED_CASES 
} from '../data/archivedCases';
import { CaseArchiveModal } from './CaseArchiveModal';

interface DossierViewProps {
  currentCase: CaseFile;
  allCases: CaseFile[];
  onSelectCase: (caseId: string) => void;
  unlockedEvidenceCount: number;
  totalEvidenceCount: number;
  solvedHypothesesCount: number;
  totalHypothesesCount: number;
  onReopenCase?: (caseId: string) => void;
}

export const DossierView: React.FC<DossierViewProps> = ({
  currentCase,
  allCases,
  onSelectCase,
  unlockedEvidenceCount,
  totalEvidenceCount,
  solvedHypothesesCount,
  totalHypothesesCount,
  onReopenCase
}) => {
  // Mode: 'active' (active dossier) or 'archive' (case archive)
  const [activeMode, setActiveMode] = useState<'active' | 'archive'>('active');
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState<boolean>(false);
  
  // Archival State (loaded from localStorage)
  const [archivedCases, setArchivedCases] = useState<ArchivedCaseFile[]>(() => getArchivedCases());
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>(() => {
    const list = getArchivedCases();
    return list.length > 0 ? list[0].id : '';
  });

  // Archive Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'Conviction' | 'Grand Jury' | 'Partial'>('ALL');
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Sync with localStorage
  useEffect(() => {
    const list = getArchivedCases();
    setArchivedCases(list);
    if (!selectedArchiveId && list.length > 0) {
      setSelectedArchiveId(list[0].id);
    }
  }, []);

  // Filter only active or registered cases for the active selector
  const activeCasesList = useMemo(() => {
    return allCases.filter(c => c.status !== 'closed' && c.status !== 'convicted');
  }, [allCases]);

  // Selected archived case
  const selectedArchive = useMemo(() => {
    return archivedCases.find(c => c.id === selectedArchiveId) || archivedCases[0] || null;
  }, [archivedCases, selectedArchiveId]);

  // Filtered archive list
  const filteredArchivedCases = useMemo(() => {
    return archivedCases.filter(c => {
      const matchSearch = 
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.convictedSuspects.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchVerdict = 
        verdictFilter === 'ALL' ? true :
        verdictFilter === 'Grand Jury' ? c.verdict.includes('Grand Jury') :
        c.verdict === verdictFilter;

      return matchSearch && matchVerdict;
    });
  }, [archivedCases, searchQuery, verdictFilter]);

  // Total Archival Stats
  const archiveStats = useMemo(() => {
    const total = archivedCases.length;
    const convictions = archivedCases.filter(c => c.verdict === 'Conviction' || c.verdict.includes('Grand Jury')).length;
    const totalWeight = archivedCases.reduce((acc, c) => acc + (c.performanceSummary.evidentiaryWeight || 0), 0);
    const totalMerit = archivedCases.reduce((acc, c) => acc + (c.performanceSummary.meritBonus || 0), 0);
    const totalCluesRecovered = archivedCases.reduce((acc, c) => acc + (c.performanceSummary.cluesRecovered || 0), 0);
    const totalClues = archivedCases.reduce((acc, c) => acc + (c.performanceSummary.totalClues || 0), 0);

    return {
      total,
      convictions,
      rate: total > 0 ? Math.round((convictions / total) * 100) : 100,
      totalWeight,
      totalMerit,
      totalCluesRecovered,
      totalClues
    };
  }, [archivedCases]);

  // Copy formal court transcript / summary
  const handleCopySummary = (arch: ArchivedCaseFile) => {
    const text = `=====================================================
OFFICIAL CASE ARCHIVE // SESSIONS & SPECIAL COURT RECORD
=====================================================
CASE FILE: ${arch.caseNumber} - ${arch.title}
STATUS: ${arch.status.toUpperCase()} // VERDICT: ${arch.verdict.toUpperCase()}
SENTENCE: ${arch.sentence}
COURT: ${arch.courtName}
CLOSED DATE: ${arch.closedDate}
LEAD INVESTIGATOR: ${arch.leadInvestigator}

--- PERFORMANCE SUMMARY ---
Clues Recovered: ${arch.performanceSummary.cluesRecovered} / ${arch.performanceSummary.totalClues}
Hypotheses Solved: ${arch.performanceSummary.hypothesesSolved} / ${arch.performanceSummary.totalHypotheses}
Evidentiary Weight: ${arch.performanceSummary.evidentiaryWeight}
Merit Score Awarded: +${arch.performanceSummary.meritBonus} XP
Procedural Compliance: ${arch.performanceSummary.statutoryCompliance}
Investigation Rating: ${arch.performanceSummary.investigationRating}

--- CONVICTED ACCUSED ---
${arch.convictedSuspects.map(s => `- ${s.name} (${s.alias}) [${s.role}]\n  Charges Proved: ${s.chargesProved.join(', ')}`).join('\n')}

--- ADMITTED EXHIBITS ---
${arch.admittedExhibits.map(e => `- ${e.name} (Weight: ${e.weight}) - ${e.chainOfCustody}`).join('\n')}

--- JUDICIAL FINDINGS ---
${arch.courtJudgment}
=====================================================`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      sound.playClick();
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    }
  };

  // Reset to default archive
  const handleResetArchive = () => {
    if (window.confirm('Reset Case Archive to initial certified court records?')) {
      saveArchivedCases(INITIAL_ARCHIVED_CASES);
      setArchivedCases(INITIAL_ARCHIVED_CASES);
      setSelectedArchiveId(INITIAL_ARCHIVED_CASES[0]?.id || '');
      sound.playClick();
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Dossier Header & Mode Toggle Bar */}
      <div className="bg-[#121826] border border-slate-800 p-4 sm:p-5 rounded shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          {/* Left: Mode Title & Breadcrumb */}
          <div>
            <div className="flex items-center space-x-2 text-amber-500 font-mono-tactical text-xs tracking-widest uppercase mb-1">
              <Scale className="w-3.5 h-3.5" />
              <span>
                {activeMode === 'active' 
                  ? `ACTIVE INVESTIGATION DOSSIER // CLASSIFICATION: ${currentCase.classification}` 
                  : 'BUREAU CASE ARCHIVE // CLOSED COURT OUTCOMES'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif-header font-bold text-slate-100 tracking-tight flex items-center space-x-3">
              <span>{activeMode === 'active' ? currentCase.title : 'Judicial Case Archive'}</span>
              {activeMode === 'archive' && (
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono-tactical bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {archiveStats.convictions} CONVICTIONS RECORDED
                </span>
              )}
            </h1>
            <p className="font-mono-tactical text-xs text-slate-400 mt-1">
              {activeMode === 'active' ? (
                <>FILE REF: <span className="text-slate-200 font-semibold">{currentCase.caseNumber}</span> // LEAD: {currentCase.leadInvestigator}</>
              ) : (
                <>CENTRAL RECORDS DIVISION // PERSISTED LOCAL STORAGE ARCHIVE // SESSIONS COURT RATIFIED</>
              )}
            </p>
          </div>

          {/* Right: Master Switcher (Active vs Archive) & Case Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded p-1">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveMode('active');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono-tactical transition-all ${
                  activeMode === 'active'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>ACTIVE DOSSIER</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveMode('archive');
                }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-mono-tactical transition-all ${
                  activeMode === 'archive'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>CASE ARCHIVE ({archivedCases.length})</span>
              </button>
            </div>

            {/* Launch Full Archive Modal Button */}
            {activeMode === 'archive' && (
              <button
                onClick={() => {
                  sound.playClick();
                  setIsArchiveModalOpen(true);
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-mono-tactical font-semibold transition"
              >
                <FolderArchive className="w-3.5 h-3.5" />
                <span>Open Full Case Archive Modal</span>
              </button>
            )}

            {/* Active Case Selector (filtered to active/registered cases) */}
            {activeMode === 'active' && activeCasesList.length > 0 && (
              <div className="flex items-center space-x-2">
                <select
                  value={currentCase.id}
                  onChange={(e) => {
                    sound.playClick();
                    onSelectCase(e.target.value);
                  }}
                  className="bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono-tactical rounded px-3 py-2 focus:border-amber-500 focus:outline-none"
                >
                  {activeCasesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.caseNumber}: {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Quick Metrics Bar for Active Mode */}
        {activeMode === 'active' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/80 font-mono-tactical text-xs">
            <div className="bg-slate-900/80 p-2.5 border border-slate-800/80 rounded">
              <span className="text-slate-500 block text-[10px] uppercase">INCIDENT DATE / TIME</span>
              <span className="text-slate-200 font-medium">
                {new Date(currentCase.incidentTime).toLocaleString()}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 border border-slate-800/80 rounded">
              <span className="text-slate-500 block text-[10px] uppercase">PRIMARY JURISDICTION</span>
              <span className="text-slate-200 font-medium truncate block">
                {currentCase.location}
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 border border-slate-800/80 rounded">
              <span className="text-slate-500 block text-[10px] uppercase">EVIDENCE CHAIN DISCOVERED</span>
              <span className="text-amber-400 font-medium">
                {unlockedEvidenceCount} of {totalEvidenceCount} Clues Recovered
              </span>
            </div>
            <div className="bg-slate-900/80 p-2.5 border border-slate-800/80 rounded">
              <span className="text-slate-500 block text-[10px] uppercase">WARRANT DEDUCTIONS</span>
              <span className="text-emerald-400 font-medium">
                {solvedHypothesesCount} of {totalHypothesesCount} Hypotheses Validated
              </span>
            </div>
          </div>
        )}

        {/* Archival Banner in Active Mode */}
        {activeMode === 'active' && (
          <div className="mt-3 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded flex items-center justify-between text-xs font-mono-tactical text-amber-300">
            <div className="flex items-center space-x-2">
              <FolderArchive className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Reviewing Active Duty Cases. Closed and convicted files are stored in the Case Archive.</span>
            </div>
            <button
              onClick={() => {
                sound.playClick();
                setActiveMode('archive');
              }}
              className="text-amber-400 hover:text-amber-200 underline text-xs font-semibold flex items-center space-x-1"
            >
              <span>View Archive ({archivedCases.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: CASE ARCHIVE VIEW                                                */}
      {/* ========================================================================= */}
      {activeMode === 'archive' && (
        <div className="space-y-6">
          
          {/* Archival Aggregate Performance Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono-tactical text-xs">
            <div className="bg-[#121826] border border-slate-800 p-3.5 rounded">
              <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase mb-1">
                <Gavel className="w-3 h-3 text-emerald-400" />
                <span>CONVICTIONS RATIFIED</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                {archiveStats.convictions} <span className="text-xs text-slate-400 font-normal">/ {archiveStats.total} Cases ({archiveStats.rate}%)</span>
              </div>
            </div>

            <div className="bg-[#121826] border border-slate-800 p-3.5 rounded">
              <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase mb-1">
                <Scale className="w-3 h-3 text-amber-400" />
                <span>ADMISSIBLE WEIGHT</span>
              </div>
              <div className="text-lg font-bold text-amber-300">
                {archiveStats.totalWeight} <span className="text-xs text-slate-400 font-normal">pts (BSA Compliant)</span>
              </div>
            </div>

            <div className="bg-[#121826] border border-slate-800 p-3.5 rounded">
              <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase mb-1">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>CLUES RECOVERED</span>
              </div>
              <div className="text-lg font-bold text-cyan-300">
                {archiveStats.totalCluesRecovered} <span className="text-xs text-slate-400 font-normal">/ {archiveStats.totalClues} Items</span>
              </div>
            </div>

            <div className="bg-[#121826] border border-slate-800 p-3.5 rounded">
              <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase mb-1">
                <Award className="w-3 h-3 text-amber-500" />
                <span>MERIT BONUS ACCRUED</span>
              </div>
              <div className="text-lg font-bold text-amber-400">
                +{archiveStats.totalMerit.toLocaleString()} <span className="text-xs text-slate-400 font-normal">XP</span>
              </div>
            </div>

            <div className="bg-[#121826] border border-slate-800 p-3.5 rounded">
              <div className="flex items-center space-x-1 text-slate-500 text-[10px] uppercase mb-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>STATUTORY INTEGRITY</span>
              </div>
              <div className="text-lg font-bold text-emerald-400">
                100% <span className="text-[10px] text-slate-400 font-normal block">BNSS/BSA Verified</span>
              </div>
            </div>
          </div>

          {/* Search, Filter & Quick Action Bar */}
          <div className="bg-[#121826] border border-slate-800 p-3.5 rounded flex flex-col sm:flex-row items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search case №, title, suspect..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs font-mono-tactical rounded pl-9 pr-3 py-2 focus:border-amber-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1.5 self-start sm:self-auto font-mono-tactical text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-500 mr-1" />
              {(['ALL', 'Conviction', 'Grand Jury'] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  onClick={() => {
                    sound.playClick();
                    setVerdictFilter(filterVal);
                  }}
                  className={`px-2.5 py-1 rounded transition-colors text-[11px] ${
                    verdictFilter === filterVal
                      ? 'bg-slate-700 text-amber-300 font-semibold border border-amber-500/40'
                      : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {filterVal === 'ALL' ? 'ALL ARCHIVED' : filterVal.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Reset Defaults Control */}
            <button
              onClick={handleResetArchive}
              title="Reset Archival Seed Cases"
              className="text-slate-500 hover:text-slate-300 text-xs font-mono-tactical flex items-center space-x-1 px-2 py-1 bg-slate-900 border border-slate-800 rounded self-end sm:self-auto"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Seed</span>
            </button>
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Archived Case File List (4 Cols) */}
            <div className="lg:col-span-4 space-y-3">
              <div className="text-xs font-mono-tactical text-slate-400 uppercase tracking-wider flex items-center justify-between pb-1">
                <span>CONVICTED CASE FILES ({filteredArchivedCases.length})</span>
                <span className="text-emerald-400">STORED IN LOCAL STORAGE</span>
              </div>

              <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
                {filteredArchivedCases.map((arch) => {
                  const isSelected = selectedArchive && selectedArchive.id === arch.id;
                  const isConviction = arch.verdict === 'Conviction' || arch.verdict.includes('Grand Jury');

                  return (
                    <div
                      key={arch.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedArchiveId(arch.id);
                      }}
                      className={`p-4 rounded border transition-all cursor-pointer font-mono-tactical relative overflow-hidden ${
                        isSelected
                          ? 'bg-[#151c2e] border-amber-500 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-[#121826] border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                      }`}
                    >
                      {/* Top Row: Case Ref & Closed Date */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>CASE № {arch.caseNumber}</span>
                        <span className="flex items-center space-x-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          <span>CLOSED {arch.closedDate}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-serif-header text-sm font-bold text-slate-100 leading-snug mb-2">
                        {arch.title}
                      </h3>

                      {/* Summary Snippet */}
                      <p className="text-xs font-sans-body text-slate-400 line-clamp-2 leading-relaxed mb-3">
                        {arch.summary}
                      </p>

                      {/* Verdict Badge & Performance Tag */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] flex items-center space-x-1 ${
                          isConviction
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          <Gavel className="w-2.5 h-2.5" />
                          <span>{arch.verdict.toUpperCase()}</span>
                        </span>

                        <span className="text-amber-400/90 text-[10px]">
                          WEIGHT: {arch.performanceSummary.evidentiaryWeight} PTS
                        </span>
                      </div>
                    </div>
                  );
                })}

                {filteredArchivedCases.length === 0 && (
                  <div className="bg-[#121826] border border-dashed border-slate-800 p-8 rounded text-center font-mono-tactical text-xs text-slate-500">
                    No archived cases matching query.
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Selected Archived Case Detail Record (8 Cols) */}
            <div className="lg:col-span-8">
              {selectedArchive ? (
                <div className="bg-[#121826] border border-slate-800 rounded p-5 sm:p-6 space-y-6">
                  
                  {/* Top Bar: Court & Adjudication Verdict Banner */}
                  <div className="bg-slate-900/90 border border-emerald-500/40 p-4 sm:p-5 rounded relative overflow-hidden">
                    <div className="absolute top-3 right-3 rotate-6 border border-emerald-500/60 text-emerald-400 font-mono-tactical text-[10px] font-bold px-2 py-0.5 tracking-widest uppercase pointer-events-none bg-slate-950/80">
                      OFFICIALLY RATIFIED // CASE CLOSED
                    </div>

                    <div className="flex items-center space-x-2 text-emerald-400 font-mono-tactical text-xs uppercase mb-1 font-semibold">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span>{selectedArchive.courtName}</span>
                    </div>

                    <h2 className="text-2xl font-serif-header font-bold text-slate-100 flex items-center space-x-3 mt-1">
                      <span>VERDICT: {selectedArchive.verdict.toUpperCase()}</span>
                    </h2>

                    {/* Sentence Box */}
                    <div className="mt-3 p-3 bg-slate-950/90 border border-slate-800 rounded font-mono-tactical text-xs text-amber-300 flex items-start space-x-2.5">
                      <Gavel className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase block">JUDICIAL SENTENCE / ORDER:</span>
                        <span className="font-semibold">{selectedArchive.sentence}</span>
                      </div>
                    </div>
                  </div>

                  {/* Investigation Performance Scorecard */}
                  <div className="bg-slate-950/60 border border-slate-800/90 p-4 rounded space-y-3">
                    <h3 className="text-xs font-mono-tactical text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800 pb-2">
                      <Award className="w-4 h-4 text-amber-500" />
                      <span>INVESTIGATIVE PERFORMANCE SCORECARD</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-tactical text-xs">
                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">CLUES RECOVERED</span>
                        <span className="text-amber-300 font-semibold text-sm">
                          {selectedArchive.performanceSummary.cluesRecovered} / {selectedArchive.performanceSummary.totalClues}
                        </span>
                        <div className="w-full bg-slate-800 h-1 rounded mt-1.5 overflow-hidden">
                          <div 
                            className="bg-amber-400 h-full" 
                            style={{ width: `${(selectedArchive.performanceSummary.cluesRecovered / (selectedArchive.performanceSummary.totalClues || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">HYPOTHESES PROVED</span>
                        <span className="text-emerald-400 font-semibold text-sm">
                          {selectedArchive.performanceSummary.hypothesesSolved} / {selectedArchive.performanceSummary.totalHypotheses}
                        </span>
                        <div className="w-full bg-slate-800 h-1 rounded mt-1.5 overflow-hidden">
                          <div 
                            className="bg-emerald-400 h-full" 
                            style={{ width: `${(selectedArchive.performanceSummary.hypothesesSolved / (selectedArchive.performanceSummary.totalHypotheses || 1)) * 100}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">EVIDENTIARY WEIGHT</span>
                        <span className="text-amber-400 font-semibold text-sm">
                          {selectedArchive.performanceSummary.evidentiaryWeight} PTS
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">Full Statutory Weight</span>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">OFFICER RATING</span>
                        <span className="text-cyan-300 font-semibold text-sm">
                          {selectedArchive.performanceSummary.investigationRating}
                        </span>
                        <span className="text-[10px] text-emerald-400 block mt-1">
                          +{selectedArchive.performanceSummary.meritBonus} Merit XP
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 flex items-center justify-between text-xs font-mono-tactical text-slate-400">
                      <span className="flex items-center space-x-1.5 text-emerald-400">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Compliance Audit: {selectedArchive.performanceSummary.statutoryCompliance}</span>
                      </span>
                      <span>Standing Score: {selectedArchive.performanceSummary.standingScore} / 100</span>
                    </div>
                  </div>

                  {/* Sessions Court Judgment & Legal Rationale */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-mono-tactical text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-amber-500" />
                      <span>OFFICIAL JUDGMENT & FINDINGS OF THE SESSIONS COURT</span>
                    </h3>
                    <div className="p-4 bg-slate-950/80 border border-slate-800 rounded font-mono-tactical text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {selectedArchive.courtJudgment}
                    </div>
                  </div>

                  {/* Convicted Persons of Interest / Accused */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono-tactical text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-rose-500" />
                      <span>CONVICTED PERSONS OF INTEREST ({selectedArchive.convictedSuspects.length})</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedArchive.convictedSuspects.map(suspect => (
                        <div 
                          key={suspect.id} 
                          className="bg-slate-900/90 border border-slate-800 p-3.5 rounded flex items-start space-x-3"
                        >
                          <img 
                            src={suspect.mugshotUrl} 
                            alt={suspect.name} 
                            className="w-14 h-14 object-cover rounded bg-slate-950 border border-slate-700 shrink-0 grayscale"
                          />
                          <div className="min-w-0 font-mono-tactical flex-1">
                            <h4 className="font-serif-header text-sm font-bold text-slate-100 truncate">
                              {suspect.name}
                            </h4>
                            <p className="text-[11px] text-amber-400 font-semibold">{suspect.alias}</p>
                            <p className="text-[10px] text-slate-400 mb-1.5">{suspect.role}</p>
                            
                            <div className="space-y-1">
                              {suspect.chargesProved.map((ch, idx) => (
                                <div key={idx} className="text-[10px] px-1.5 py-0.5 bg-rose-950/40 text-rose-300 border border-rose-800/40 rounded inline-block mr-1">
                                  {ch}
                                </div>
                              ))}
                            </div>
                            
                            {suspect.disclosedIntel && (
                              <p className="text-[10px] text-slate-400 mt-2 italic border-t border-slate-800/60 pt-1">
                                "{suspect.disclosedIntel}"
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Admitted Exhibits & Chain of Custody */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-mono-tactical text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>ADMITTED EXHIBITS & CHAIN OF CUSTODY (BSA s.57 / BNSS s.103)</span>
                    </h3>

                    <div className="overflow-x-auto border border-slate-800 rounded">
                      <table className="w-full text-left font-mono-tactical text-xs">
                        <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                          <tr>
                            <th className="p-2.5">Exhibit Description</th>
                            <th className="p-2.5">Classification</th>
                            <th className="p-2.5 text-center">Evidentiary Weight</th>
                            <th className="p-2.5">Chain of Custody Protocol</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-950/50">
                          {selectedArchive.admittedExhibits.map((ex, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/40">
                              <td className="p-2.5 font-semibold text-slate-200">{ex.name}</td>
                              <td className="p-2.5 text-amber-400 text-[11px]">{ex.type}</td>
                              <td className="p-2.5 text-center text-emerald-400 font-bold">+{ex.weight}</td>
                              <td className="p-2.5 text-slate-400 text-[11px]">{ex.chainOfCustody}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Judicial Remarks on Investigation */}
                  {selectedArchive.judicialRemarks && selectedArchive.judicialRemarks.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-xs font-mono-tactical text-slate-300 font-bold uppercase tracking-wider">
                        JUDICIAL REMARKS & STATUTORY GUIDANCE
                      </h3>
                      <div className="space-y-2 font-mono-tactical text-xs">
                        {selectedArchive.judicialRemarks.map((rem, idx) => (
                          <div key={idx} className="p-3 bg-slate-900/80 border border-slate-800 rounded flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold text-slate-200">{rem.issue}</div>
                              <div className="text-slate-400 text-[11px] mt-0.5">{rem.detail}</div>
                            </div>
                            {rem.statute && (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/30 rounded shrink-0">
                                {rem.statute}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions & Export Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleCopySummary(selectedArchive)}
                        className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono-tactical transition-colors"
                      >
                        {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedNotification ? 'Court Record Copied!' : 'Copy Summary'}</span>
                      </button>

                      <button
                        onClick={() => {
                          sound.playClick();
                          setIsArchiveModalOpen(true);
                        }}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 rounded text-xs font-mono-tactical font-semibold transition-colors"
                      >
                        <FolderArchive className="w-3.5 h-3.5" />
                        <span>Inspect 5-Stage Modal</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {onReopenCase && (
                        <button
                          onClick={() => {
                            sound.playClick();
                            onReopenCase(selectedArchive.id);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded text-xs font-mono-tactical transition-colors shadow"
                          title="Reopen case investigation under Section 193(9) BNSS"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen Investigation (BNSS §193(9))</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          sound.playClick();
                          setActiveMode('active');
                        }}
                        className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded text-xs font-mono-tactical transition-colors"
                      >
                        <span>Return to Active Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-[#121826] border border-slate-800 p-12 rounded text-center font-mono-tactical text-slate-400">
                  Select an archived case file to inspect court outcomes and performance summaries.
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: ACTIVE DOSSIER VIEW (Default)                                     */}
      {/* ========================================================================= */}
      {activeMode === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Incident Narrative & Chronology */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Executive Incident Memo */}
            <div className="bg-[#121826] border border-slate-800 p-5 rounded relative overflow-hidden">
              {/* Stamp */}
              <div className="absolute top-4 right-4 rotate-12 border-2 border-rose-600/40 text-rose-500/70 font-mono-tactical text-[11px] font-bold px-2.5 py-1 tracking-widest uppercase pointer-events-none">
                RESTRICTED EVIDENCE
              </div>

              <h2 className="text-lg font-serif-header font-bold text-slate-100 mb-3 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-amber-500" />
                <span>OFFICIAL INCIDENT NARRATIVE</span>
              </h2>

              <div className="text-sm font-sans-body text-slate-300 leading-relaxed space-y-3 bg-slate-950/50 p-4 border border-slate-800/80 rounded font-normal">
                <p>{currentCase.summary}</p>
              </div>

              {/* Tactical Timeline Breakdown */}
              <div className="mt-5 border-t border-slate-800/80 pt-4">
                <h3 className="text-xs font-mono-tactical text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>CRITICAL CHRONOLOGY (TIMESTAMP RECONSTRUCTION)</span>
                </h3>
                <div className="space-y-2 text-xs font-mono-tactical">
                  <div className="flex items-start space-x-3 p-2 bg-slate-900/60 rounded border border-slate-800/50">
                    <span className="text-amber-400 font-semibold w-20 shrink-0">02:10 UTC</span>
                    <span className="text-slate-300">Black executive sedan observed turning off headlights at Pier 17 cargo gates.</span>
                  </div>
                  <div className="flex items-start space-x-3 p-2 bg-slate-900/60 rounded border border-slate-800/50">
                    <span className="text-amber-400 font-semibold w-20 shrink-0">02:14 UTC</span>
                    <span className="text-slate-300">Three suppressed acoustic impulses detected by harbor sensor array. Courier collapses.</span>
                  </div>
                  <div className="flex items-start space-x-3 p-2 bg-slate-900/60 rounded border border-slate-800/50">
                    <span className="text-amber-400 font-semibold w-20 shrink-0">02:22 UTC</span>
                    <span className="text-slate-300">Emergency SWIFT ledger transfer initiated from Arlington Maritime corporate IP.</span>
                  </div>
                  <div className="flex items-start space-x-3 p-2 bg-slate-900/60 rounded border border-slate-800/50">
                    <span className="text-amber-400 font-semibold w-20 shrink-0">02:45 UTC</span>
                    <span className="text-slate-300">Project Blackwatch tactical command assumes direct operational authority.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Persons of Interest Snapshot */}
            <div className="bg-[#121826] border border-slate-800 p-5 rounded">
              <h2 className="text-base font-serif-header font-bold text-slate-100 mb-3 flex items-center justify-between">
                <span>PERSONS OF INTEREST / TARGET DOSSIERS</span>
                <span className="text-xs font-mono-tactical text-slate-400">
                  {currentCase.suspects.length} SUBJECTS REGISTERED
                </span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {currentCase.suspects.map(suspect => (
                  <div 
                    key={suspect.id} 
                    className="bg-slate-900/90 border border-slate-800 p-3 rounded flex flex-col justify-between hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <img 
                        src={suspect.mugshotUrl} 
                        alt={suspect.name} 
                        className="w-12 h-12 object-cover rounded bg-slate-950 border border-slate-700 shrink-0 grayscale hover:grayscale-0 transition-all"
                      />
                      <div className="min-w-0">
                        <h4 className="font-serif-header text-sm font-bold text-slate-200 truncate">
                          {suspect.name}
                        </h4>
                        <p className="font-mono-tactical text-[10px] text-amber-400">
                          {suspect.alias}
                        </p>
                        <p className="font-mono-tactical text-[10px] text-slate-400 truncate">
                          {suspect.role}
                        </p>
                      </div>
                    </div>
                    <div className="text-[11px] font-mono-tactical text-slate-400 border-t border-slate-800/80 pt-2 flex items-center justify-between">
                      <span>STRESS: {suspect.stressLevel}%</span>
                      <span className="text-amber-400 uppercase text-[9px] px-1 py-0.5 bg-slate-950 rounded">
                        {suspect.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Col: Mission Objectives & Command Protocols */}
          <div className="space-y-6">
            
            {/* Operational Directive Card */}
            <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-4">
              <h3 className="text-sm font-serif-header font-bold text-slate-100 flex items-center space-x-2 border-b border-slate-800 pb-2">
                <Target className="w-4 h-4 text-amber-500" />
                <span>COMMAND DIRECTIVES</span>
              </h3>

              {/* Primary */}
              <div className="bg-slate-900/80 border border-amber-500/30 p-3 rounded space-y-1">
                <div className="flex items-center space-x-1.5 text-amber-400 text-xs font-mono-tactical font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>PRIMARY DIRECTIVE</span>
                </div>
                <p className="text-xs font-sans-body text-slate-200">
                  {currentCase.primaryObjective}
                </p>
              </div>

              {/* Secondary */}
              <div className="bg-slate-900/80 border border-slate-800 p-3 rounded space-y-1">
                <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-mono-tactical font-semibold">
                  <Target className="w-3.5 h-3.5 text-slate-400" />
                  <span>SECONDARY DIRECTIVE</span>
                </div>
                <p className="text-xs font-sans-body text-slate-300">
                  {currentCase.secondaryObjective}
                </p>
              </div>

              {/* Tactical Workflow Guide */}
              <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs font-mono-tactical space-y-2 text-slate-400">
                <div className="text-slate-300 font-semibold text-[11px] uppercase tracking-wider">
                  INVESTIGATIVE PROCEDURE:
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">1.</span>
                  <span>Deploy tactical units on the <strong>Dispatch Map</strong> to uncover latent clues.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">2.</span>
                  <span>Examine recovered items in the <strong>Evidence Vault</strong> and run Forensic Lab analysis.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">3.</span>
                  <span>Confront subjects in the <strong>Interrogation Room</strong> using hard proof to break alibis.</span>
                </div>
                <div className="flex items-start space-x-2">
                  <span className="text-amber-500 font-bold">4.</span>
                  <span>Connect facts on the <strong>Corkboard</strong> to issue an airtight Federal Arrest Warrant.</span>
                </div>
              </div>
            </div>

            {/* Active Duty Case Files */}
            <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-3">
              <h3 className="text-sm font-serif-header font-bold text-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span>ACTIVE DUTY CASES</span>
                </div>
                <span className="text-[10px] font-mono-tactical text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded">
                  {activeCasesList.length} REGISTERED
                </span>
              </h3>

              <div className="space-y-2 font-mono-tactical text-xs">
                {activeCasesList.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      sound.playClick();
                      onSelectCase(c.id);
                    }}
                    className={`w-full text-left p-2.5 rounded border transition-all flex items-center justify-between ${
                      c.id === currentCase.id 
                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="truncate pr-2">
                      <div className="font-semibold text-slate-200 truncate">{c.title}</div>
                      <div className="text-[10px] text-slate-500">{c.caseNumber} // {c.classification}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 shrink-0 text-slate-500" />
                  </button>
                ))}
              </div>

              {/* Link to Archive */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    sound.playClick();
                    setActiveMode('archive');
                  }}
                  className="w-full py-2 px-3 bg-slate-900/80 hover:bg-slate-900 border border-slate-700 rounded text-amber-400 text-xs font-mono-tactical flex items-center justify-center space-x-2 transition-colors"
                >
                  <FolderArchive className="w-3.5 h-3.5" />
                  <span>Open Case Archive ({archivedCases.length} Closed)</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* Case Archive Modal */}
      <CaseArchiveModal
        isOpen={isArchiveModalOpen}
        onClose={() => setIsArchiveModalOpen(false)}
        archivedCases={archivedCases}
        onReopenCase={(id) => {
          if (onReopenCase) onReopenCase(id);
          setIsArchiveModalOpen(false);
        }}
        selectedCaseId={selectedArchiveId}
      />

    </div>
  );
};
