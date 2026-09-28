import React, { useState } from 'react';
import { 
  FolderArchive, 
  X, 
  Search, 
  Gavel, 
  FileText, 
  Scale, 
  ShieldCheck, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Award, 
  CheckCircle2, 
  Eye, 
  RotateCcw, 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldAlert, 
  Fingerprint, 
  Microscope, 
  Users, 
  MapPin, 
  Building2,
  FileCheck
} from 'lucide-react';
import { ArchivedCaseFile } from '../types/game';

interface CaseArchiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  archivedCases: ArchivedCaseFile[];
  onReopenCase: (caseId: string) => void;
  selectedCaseId?: string | null;
}

export const CaseArchiveModal: React.FC<CaseArchiveModalProps> = ({
  isOpen,
  onClose,
  archivedCases,
  onReopenCase,
  selectedCaseId = null
}) => {
  const [activeCaseId, setActiveCaseId] = useState<string | null>(selectedCaseId);
  const [viewMode, setViewMode] = useState<'list' | 'summary'>(selectedCaseId ? 'summary' : 'list');
  const [activeStageTab, setActiveStageTab] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [verdictFilter, setVerdictFilter] = useState<'all' | 'conviction' | 'partial' | 'acquittal'>('all');
  const [confirmReopenCase, setConfirmReopenCase] = useState<ArchivedCaseFile | null>(null);
  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Sync if selectedCaseId changes from parent
  React.useEffect(() => {
    if (selectedCaseId) {
      setActiveCaseId(selectedCaseId);
      setViewMode('summary');
    }
  }, [selectedCaseId]);

  if (!isOpen) return null;

  const activeCase = archivedCases.find(c => c.id === activeCaseId) || archivedCases[0] || null;

  // Filtered cases for list mode
  const filteredCases = archivedCases.filter(c => {
    const matchesSearch = 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.caseNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.classification.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.summary.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (verdictFilter === 'all') return true;
    if (verdictFilter === 'conviction') {
      return c.verdict === 'Conviction' || c.verdict === 'Guilty - Federal Grand Jury';
    }
    if (verdictFilter === 'partial') return c.verdict === 'Partial';
    if (verdictFilter === 'acquittal') return c.verdict === 'Acquittal';
    return true;
  });

  const totalConvictions = archivedCases.filter(c => c.verdict === 'Conviction' || c.verdict === 'Guilty - Federal Grand Jury').length;
  const totalPartials = archivedCases.filter(c => c.verdict === 'Partial').length;
  const totalAcquittals = archivedCases.filter(c => c.verdict === 'Acquittal').length;

  const handleCopySummary = (c: ArchivedCaseFile) => {
    const text = `METRO CRIME BRANCH // CASE ARCHIVE SUMMARY\n` +
      `Case №: ${c.caseNumber} - ${c.title}\n` +
      `Verdict: ${c.verdict.toUpperCase()}\n` +
      `Sentence: ${c.sentence}\n` +
      `Court: ${c.courtName}\n` +
      `Performance: ${c.performanceSummary.standingScore}% Standing, ${c.performanceSummary.evidentiaryWeight} Admissible Pts\n\n` +
      `EXECUTIVE SUMMARY:\n${c.summary}\n\n` +
      `JUDGMENT:\n${c.courtJudgment}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2200);
  };

  const handleTriggerReopen = (c: ArchivedCaseFile) => {
    setConfirmReopenCase(c);
  };

  const executeReopen = () => {
    if (!confirmReopenCase) return;
    const target = confirmReopenCase;
    setConfirmReopenCase(null);
    onReopenCase(target.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b0f17] border border-amber-500/30 w-full max-w-6xl max-h-[92vh] flex flex-col rounded-lg shadow-2xl overflow-hidden font-sans-body">
        
        {/* ========================================================================= */}
        {/* MODAL HEADER                                                             */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-[#121826] to-slate-950 border-b border-amber-500/20 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-serif-header font-bold text-slate-100 tracking-wider">
                  CASE ARCHIVE &amp; JUDICIAL REPOSITORY
                </span>
                <span className="text-[10px] font-mono-tactical px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                  BNSS §193(9) REOPENING DESK
                </span>
              </div>
              <p className="text-[11px] font-mono-tactical text-slate-400">
                Preserved judicial trial records, panchnama registries &amp; statutory revision summaries
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {viewMode === 'summary' && (
              <button
                onClick={() => {
                  setViewMode('list');
                }}
                className="flex items-center space-x-1 px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono-tactical border border-slate-700 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Cases List</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:text-rose-400 flex items-center justify-center text-slate-400 transition"
              title="Close Archive Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* REOPEN CONFIRMATION DIALOG OVERLAY                                        */}
        {/* ========================================================================= */}
        {confirmReopenCase && (
          <div className="absolute inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-[#121926] border-2 border-amber-500/60 rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center space-x-3 text-amber-400">
                <ShieldAlert className="w-7 h-7 shrink-0 text-amber-400" />
                <h3 className="text-base font-serif-header font-bold text-slate-100">
                  AUTHORIZE CASE REOPENING &amp; SUPPLEMENTARY INQUIRY
                </h3>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded text-xs font-mono-tactical text-slate-300 space-y-2">
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Case Identifier:</span>
                  <span className="text-amber-300 font-bold">{confirmReopenCase.caseNumber}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Title:</span>
                  <span className="text-slate-200">{confirmReopenCase.title}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-2">
                  <span className="text-slate-400">Statutory Authority:</span>
                  <span className="text-emerald-400">Section 193(9) BNSS (Supplementary Report)</span>
                </div>
                <div className="text-[11px] text-amber-200/90 pt-1 leading-relaxed">
                  Notice: All original FIR particulars, crime scene exhibits, witness statements, and forensic reports will remain 100% intact. The case investigation desk will be reactivated so you can conduct supplementary inquiry or revise charges.
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setConfirmReopenCase(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono-tactical transition"
                >
                  Cancel
                </button>
                <button
                  onClick={executeReopen}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono-tactical font-bold text-xs rounded shadow-lg transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Confirm Reopen Investigation</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STATS OVERVIEW RIBBON                                                    */}
        {/* ========================================================================= */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0 text-xs font-mono-tactical">
          <div className="flex items-center space-x-4">
            <span className="text-slate-400">
              ARCHIVE FILES: <strong className="text-slate-100">{archivedCases.length}</strong>
            </span>
            <span className="text-emerald-400 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{totalConvictions} CONVICTIONS</span>
            </span>
            {totalPartials > 0 && (
              <span className="text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{totalPartials} PARTIAL</span>
              </span>
            )}
            {totalAcquittals > 0 && (
              <span className="text-rose-400 flex items-center space-x-1">
                <Scale className="w-3.5 h-3.5" />
                <span>{totalAcquittals} ACQUITTALS</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Evidentiary Integrity Standard: BNSS §103 &amp; BSA §63 Hash Certified</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW MODE 1: CLOSED CASES LIST                                           */}
        {/* ========================================================================= */}
        {viewMode === 'list' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Search and Verdict Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#111724] p-3 rounded-lg border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by case #, title, or offence..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 font-mono-tactical focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                <span className="text-[11px] font-mono-tactical text-slate-400 mr-1">VERDICT:</span>
                {(['all', 'conviction', 'partial', 'acquittal'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setVerdictFilter(tab)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono-tactical capitalize transition ${
                      verdictFilter === tab
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Cases Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCases.map(c => {
                const isConviction = c.verdict === 'Conviction' || c.verdict === 'Guilty - Federal Grand Jury';
                const isAcquittal = c.verdict === 'Acquittal';
                const isPartial = c.verdict === 'Partial';

                return (
                  <div
                    key={c.id}
                    className="bg-[#121826] border border-slate-800 hover:border-amber-500/50 rounded-lg p-5 flex flex-col justify-between space-y-4 transition shadow-lg relative group"
                  >
                    {/* Top Row: Case No and Verdict Badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono-tactical text-amber-400 font-bold">
                            CASE № {c.caseNumber}
                          </span>
                          <span className="text-[10px] font-mono-tactical px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-400 uppercase">
                            {c.classification}
                          </span>
                        </div>
                        <h3 className="text-base font-serif-header font-bold text-slate-100 group-hover:text-amber-300 transition mt-1">
                          {c.title}
                        </h3>
                      </div>

                      <div className="shrink-0">
                        <span className={`text-[10px] font-mono-tactical px-2.5 py-1 rounded font-bold uppercase tracking-wider flex items-center space-x-1 ${
                          isConviction
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                            : isAcquittal
                            ? 'bg-rose-950/80 text-rose-300 border border-rose-500/40'
                            : 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                        }`}>
                          <Gavel className="w-3 h-3" />
                          <span>{c.verdict.toUpperCase()}</span>
                        </span>
                      </div>
                    </div>

                    {/* Incident Summary */}
                    <p className="text-xs font-sans-body text-slate-300 line-clamp-3 leading-relaxed bg-slate-950/40 p-3 rounded border border-slate-800/80">
                      {c.summary}
                    </p>

                    {/* Metadata & Performance scorecard */}
                    <div className="grid grid-cols-3 gap-2 font-mono-tactical text-[11px] bg-slate-950/70 p-2.5 rounded border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[9px]">CLOSED DATE</span>
                        <span className="text-slate-300">{c.closedDate}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">EVIDENTIARY WEIGHT</span>
                        <span className="text-amber-400 font-semibold">{c.performanceSummary.evidentiaryWeight} PTS</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px]">RATING</span>
                        <span className="text-emerald-400 font-semibold">{c.performanceSummary.investigationRating}</span>
                      </div>
                    </div>

                    {/* Actions: View Summary and Reopen Case */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setActiveCaseId(c.id);
                          setViewMode('summary');
                        }}
                        className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 rounded text-xs font-mono-tactical font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Inspect 5-Stage Summary</span>
                      </button>

                      <button
                        onClick={() => handleTriggerReopen(c)}
                        className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:border-amber-400 rounded text-xs font-mono-tactical font-bold transition"
                        title="Reopen Case under BNSS §193(9)"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reopen</span>
                      </button>
                    </div>

                  </div>
                );
              })}

              {filteredCases.length === 0 && (
                <div className="col-span-2 py-16 text-center font-mono-tactical text-slate-500 border border-dashed border-slate-800 rounded-lg">
                  No archived files match the current query or filter criteria.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW MODE 2: EXHAUSTIVE 5-STAGE SUMMARY (FIR TO TRIAL)                    */}
        {/* ========================================================================= */}
        {viewMode === 'summary' && activeCase && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            
            {/* Top Case Identity & Action Strip */}
            <div className="bg-[#111724] border-b border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono-tactical px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                  CASE № {activeCase.caseNumber}
                </span>
                <div>
                  <h2 className="text-base font-serif-header font-bold text-slate-100 flex items-center space-x-2">
                    <span>{activeCase.title}</span>
                  </h2>
                  <span className="text-[11px] font-mono-tactical text-slate-400">
                    Lead: {activeCase.leadInvestigator} · Closed: {activeCase.closedDate}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className="text-xs font-mono-tactical px-2.5 py-1 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 font-bold flex items-center space-x-1.5">
                  <Gavel className="w-3.5 h-3.5" />
                  <span>VERDICT: {activeCase.verdict.toUpperCase()}</span>
                </span>

                <button
                  onClick={() => handleTriggerReopen(activeCase)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono-tactical font-bold text-xs rounded shadow transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reopen Case (BNSS §193(9))</span>
                </button>
              </div>
            </div>

            {/* 5 Stage Navigation Tabs */}
            <div className="bg-slate-950 border-b border-slate-800 px-5 py-2 flex items-center space-x-2 overflow-x-auto shrink-0 font-mono-tactical text-xs">
              {[
                { stage: 1, label: 'Stage 1: FIR Registration (BNSS §173)', icon: FileText },
                { stage: 2, label: 'Stage 2: Scene & Panchnama (BNSS §103)', icon: Fingerprint },
                { stage: 3, label: 'Stage 3: Interrogation & BSA §23 Disclosures', icon: Users },
                { stage: 4, label: 'Stage 4: Police Final Report (BNSS §193)', icon: FileCheck },
                { stage: 5, label: 'Stage 5: Court Trial & Judgment', icon: Gavel }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeStageTab === tab.stage;
                return (
                  <button
                    key={tab.stage}
                    onClick={() => setActiveStageTab(tab.stage)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded transition shrink-0 whitespace-nowrap ${
                      isActive 
                        ? 'bg-amber-500 text-slate-950 font-bold shadow'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Stage Body Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* ------------------------------------------------------------- */}
              {/* STAGE 1: FIRST INFORMATION REPORT (BNSS §173)                 */}
              {/* ------------------------------------------------------------- */}
              {activeStageTab === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-[#121826] border border-slate-800 p-5 rounded-lg space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-mono-tactical text-xs font-bold">
                        <FileText className="w-4 h-4" />
                        <span>STATUTORY FIRST INFORMATION REPORT // BNSS §173</span>
                      </div>
                      <span className="text-xs font-mono-tactical text-slate-400">
                        FIR № MCB/{activeCase.caseNumber}/1001
                      </span>
                    </div>

                    {/* Occurrence Parameters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-tactical text-xs">
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">PLACE OF OCCURRENCE</span>
                        <span className="text-slate-200">{activeCase.location}</span>
                      </div>
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">DATE &amp; TIME</span>
                        <span className="text-slate-200">{activeCase.incidentTime}</span>
                      </div>
                      <div className="bg-slate-950/80 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">COGNIZANCE</span>
                        <span className="text-emerald-400 font-semibold">Cognizable under Schedule I BNSS</span>
                      </div>
                    </div>

                    {/* Sections Attracted */}
                    <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        PENAL PROVISIONS INVOKED IN COMPLAINT:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {['BNS §303 (Theft)', 'BNS §309 (Robbery with Hurt)', 'BNS §115 (Voluntarily Causing Hurt)', 'BNS §61 (Conspiracy)'].map(sec => (
                          <span key={sec} className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono-tactical font-semibold">
                            {sec}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Complaint Narrative */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        COMPLAINT NARRATIVE RECORDED UNDER OATH:
                      </span>
                      <div className="bg-slate-950 p-4 rounded border border-slate-800 font-sans-body text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                        {activeCase.firDetails?.narrative || activeCase.summary}
                      </div>
                    </div>

                    {/* Statutory Ingredients Audit */}
                    <div className="bg-slate-950/60 p-4 rounded border border-slate-800 space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        STATUTORY INGREDIENTS AUDIT (BNS CHAPTER XVII):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono-tactical">
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Dishonest removal of movable property from lawful custody</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Use of physical force and infliction of hurt during commission</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Pre-concert of minds and inside coordination established</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>Jurisdiction verified: Incident locus within Police Station territorial limits</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STAGE 2: CRIME SCENE & PANCHNAMA (BNSS §103/105)              */}
              {/* ------------------------------------------------------------- */}
              {activeStageTab === 2 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-[#121826] border border-slate-800 p-5 rounded-lg space-y-5">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-mono-tactical text-xs font-bold">
                        <Fingerprint className="w-4 h-4" />
                        <span>CRIME SCENE EXAMINATION &amp; SEIZURE PANCHNAMA (BNSS §103, 105, 176)</span>
                      </div>
                      <span className="text-xs font-mono-tactical text-emerald-400 font-semibold">
                        Chain of Custody Intact
                      </span>
                    </div>

                    {/* Standard Protocol Execution */}
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono-tactical text-[11px]">
                      {[
                        { label: 'Cordoned', status: 'Secured' },
                        { label: 'Walkthrough', status: 'Completed' },
                        { label: 'Videography', status: 'BNSS §105' },
                        { label: 'Rough Sketch', status: 'Scale 1:50' },
                        { label: 'Canvassing', status: 'Executed' },
                        { label: 'Malkhana Seal', status: 'Brass Seal' }
                      ].map(step => (
                        <div key={step.label} className="bg-slate-950/80 p-2.5 rounded border border-slate-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                          <span className="text-slate-400 block text-[10px]">{step.label}</span>
                          <span className="text-slate-200 font-semibold">{step.status}</span>
                        </div>
                      ))}
                    </div>

                    {/* Exhibits Table */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        ADMITTED SEIZURE PANCHNAMA EXHIBITS:
                      </span>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left font-mono-tactical text-xs border border-slate-800 rounded">
                          <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase border-b border-slate-800">
                            <tr>
                              <th className="p-3">Ex. №</th>
                              <th className="p-3">Exhibit Description</th>
                              <th className="p-3">Type</th>
                              <th className="p-3">Independent Witnesses (BNSS §103)</th>
                              <th className="p-3">Chain of Custody / Lab</th>
                              <th className="p-3 text-right">Admissibility</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                            {activeCase.admittedExhibits.map((ex, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/50 transition">
                                <td className="p-3 font-bold text-amber-400">
                                  {String.fromCharCode(65 + idx)}
                                </td>
                                <td className="p-3 font-semibold text-slate-200">
                                  {ex.name}
                                </td>
                                <td className="p-3 text-slate-400">
                                  {ex.type}
                                </td>
                                <td className="p-3 text-slate-300 text-[11px]">
                                  Suresh Kadam &amp; Anita Fernandes
                                </td>
                                <td className="p-3 text-slate-300 text-[11px]">
                                  {ex.chainOfCustody}
                                </td>
                                <td className="p-3 text-right text-emerald-400 font-semibold">
                                  +{ex.weight} PTS
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Forensic Lab Compliance Memo */}
                    <div className="bg-slate-950/80 p-3.5 rounded border border-slate-800 flex items-start space-x-3 text-xs font-mono-tactical">
                      <Microscope className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-slate-300 font-bold block mb-1">
                          BSA §63 &amp; FSL SCIENTIFIC AUTHENTICATION COMPLIANCE:
                        </span>
                        <p className="text-slate-400 text-[11px] leading-relaxed">
                          All electronic exhibits, CCTV DVR dumps, and telecom CDR tower extractions are accompanied by dual-signed Section 63 BSA certificates and SHA-256 hash manifests. No evidence was subjected to custodial contamination or seal tampering.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STAGE 3: INTERROGATIONS & BSA §23 DISCLOSURES                 */}
              {/* ------------------------------------------------------------- */}
              {activeStageTab === 3 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-[#121826] border border-slate-800 p-5 rounded-lg space-y-5">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-mono-tactical text-xs font-bold">
                        <Users className="w-4 h-4" />
                        <span>EXAMINATIONS, CUSTODIAL STATEMENTS &amp; BSA §23 RECOVERIES</span>
                      </div>
                      <span className="text-xs font-mono-tactical text-amber-300 font-semibold">
                        Strict BSA §23 Mandate Enforced
                      </span>
                    </div>

                    {/* Legal Explanation Box */}
                    <div className="bg-slate-950/90 border border-amber-500/20 p-3.5 rounded text-xs font-mono-tactical space-y-1.5">
                      <div className="flex items-center space-x-2 text-amber-400 font-bold">
                        <Scale className="w-4 h-4" />
                        <span>STATUTORY MANDATE: BSA SECTION 23 (FORMER IEA SECTION 27)</span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Under Indian criminal jurisprudence, custodial confessions made to police officers are strictly inadmissible. Only so much of the accused's statement that distinctly leads to the discovery of a tangible physical fact (weapon, cash, stolen article) is provable in the Sessions Court, provided an independent panchnama is executed at the site of recovery.
                      </p>
                    </div>

                    {/* Persons Examined and Convicted Suspects */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        EXAMINED SUSPECTS &amp; ATTRIBUTED ACTS:
                      </span>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {activeCase.convictedSuspects.map(s => (
                          <div key={s.id} className="bg-slate-950 p-4 rounded border border-slate-800 space-y-3">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-bold text-slate-100">{s.name}</h4>
                                <span className="text-xs text-amber-400 font-mono-tactical">{s.role}</span>
                              </div>
                              <span className="text-[10px] font-mono-tactical px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                GUILTY
                              </span>
                            </div>

                            <div className="space-y-1.5 font-mono-tactical text-xs">
                              <span className="text-slate-500 text-[10px] block">CHARGES PROVED:</span>
                              <div className="flex flex-wrap gap-1.5">
                                {s.chargesProved.map(ch => (
                                  <span key={ch} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">
                                    {ch}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {s.disclosedIntel && (
                              <div className="bg-[#0b0f17] p-2.5 rounded border border-amber-500/20 text-[11px] font-mono-tactical text-amber-300/90">
                                <span className="text-slate-500 text-[9px] block uppercase">BSA §23 PROVABLE DISCOVERY:</span>
                                &ldquo;{s.disclosedIntel}&rdquo;
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Physical Recovery Panchnamas */}
                    <div className="bg-slate-950/70 p-4 rounded border border-slate-800 space-y-2 font-mono-tactical text-xs">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                        CORROBORATING RECOVERY MEMORANDA (BSA §23):
                      </span>
                      <ul className="space-y-1.5 text-slate-300 text-[11px]">
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Black iron crowbar recovered behind Ambewadi water tank pursuant to accused's disclosure memo.</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Part-strap of ₹28,000 cash notes wrapped in newspaper seized from beneath charpai before 2 witnesses.</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Dual-SIM mobile phone holding coordination numbers seized intact with unbroken malkhana ledger seals.</span>
                        </li>
                      </ul>
                    </div>

                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STAGE 4: POLICE FINAL REPORT / CHARGE-SHEET (BNSS §193)       */}
              {/* ------------------------------------------------------------- */}
              {activeStageTab === 4 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-[#121826] border border-slate-800 p-5 rounded-lg space-y-5">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-mono-tactical text-xs font-bold">
                        <FileCheck className="w-4 h-4" />
                        <span>POLICE FINAL REPORT UNDER SECTION 193 BNSS (CHARGE-SHEET)</span>
                      </div>
                      <span className="text-xs font-mono-tactical text-slate-400">
                        Committal to Sessions Court
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-tactical text-xs">
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">REPORT FILING DATE</span>
                        <span className="text-slate-200">{activeCase.closedDate}</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">COGNIZANCE COURT</span>
                        <span className="text-slate-200">{activeCase.courtName}</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">PRIMARY ACCUSED</span>
                        <span className="text-amber-400 font-semibold">{activeCase.convictedSuspects.map(s => s.name).join(', ')}</span>
                      </div>
                    </div>

                    {/* Prosecution Pillars */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        THREE PILLARS OF PROSECUTION CASE:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono-tactical text-xs">
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                          <span className="text-amber-400 font-bold block">1. Direct Eyewitness</span>
                          <p className="text-slate-400 text-[11px]">
                            Complainant testimony, stall keeper corroboration, and identification memos executed lawfully.
                          </p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                          <span className="text-amber-400 font-bold block">2. Circumstantial Chain</span>
                          <p className="text-slate-400 text-[11px]">
                            CDR co-location at the culvert, motive of diesel debt shortfall, and pre-departure route manipulation.
                          </p>
                        </div>
                        <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
                          <span className="text-amber-400 font-bold block">3. Forensic Corroboration</span>
                          <p className="text-slate-400 text-[11px]">
                            Recovered crowbar trace analysis, tyre impression cast comparison, and blood group verification.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Brief Facts Box */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        BRIEF FACTS SUBMITTED UNDER SECTION 193(3) BNSS:
                      </span>
                      <div className="bg-slate-950 p-4 rounded border border-slate-800 text-xs font-sans-body text-slate-300 leading-relaxed">
                        The prosecution charges that the accused persons in concert planned, ambushed, and looted the payroll van of M/s Sunrise Logistics on Marol Depot Road. Upon completion of investigation, sufficient evidence having been collected under BNSS s.173-183, the accused are placed before this Hon&apos;ble Court for trial under BNS ss. 309, 115, and 61.
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ------------------------------------------------------------- */}
              {/* STAGE 5: SESSIONS COURT TRIAL & JUDGMENT                      */}
              {/* ------------------------------------------------------------- */}
              {activeStageTab === 5 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="bg-[#121826] border border-slate-800 p-5 rounded-lg space-y-5">
                    
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                      <div className="flex items-center space-x-2 text-amber-400 font-mono-tactical text-xs font-bold">
                        <Gavel className="w-4 h-4" />
                        <span>SESSIONS COURT ADJUDICATION &amp; FINAL JUDGMENT</span>
                      </div>
                      <span className="text-xs font-mono-tactical px-2.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        VERDICT: {activeCase.verdict.toUpperCase()}
                      </span>
                    </div>

                    {/* Sentence Box */}
                    <div className="bg-slate-950 border border-amber-500/40 p-4 rounded-lg flex items-start space-x-3">
                      <Gavel className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                          FINAL SENTENCE &amp; PENAL ORDER:
                        </span>
                        <div className="text-sm font-mono-tactical font-bold text-amber-300 mt-0.5">
                          {activeCase.sentence}
                        </div>
                      </div>
                    </div>

                    {/* Full Judgment Text */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                        CERTIFIED SESSIONS COURT JUDGMENT TRANSCRIPT:
                      </span>
                      <pre className="bg-slate-950 p-4 rounded border border-slate-800 text-xs font-mono-tactical text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {activeCase.courtJudgment}
                      </pre>
                    </div>

                    {/* Judicial Remarks */}
                    {activeCase.judicialRemarks && activeCase.judicialRemarks.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono-tactical text-slate-400 uppercase tracking-wider block">
                          BENCH OBSERVATIONS ON INVESTIGATIVE INTEGRITY:
                        </span>
                        <div className="space-y-2">
                          {activeCase.judicialRemarks.map((rem, idx) => (
                            <div key={idx} className="bg-slate-950/80 p-3 rounded border border-slate-800 flex items-start space-x-3 text-xs font-mono-tactical">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <div>
                                <span className="text-slate-200 font-bold block">{rem.issue}</span>
                                <p className="text-slate-400 text-[11px] mt-0.5">{rem.detail}</p>
                                {rem.statute && (
                                  <span className="text-[10px] text-amber-400/80 block mt-1">
                                    Statutory Reference: {rem.statute}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              )}

            </div>

            {/* Bottom Action Footer */}
            <div className="bg-slate-950 border-t border-slate-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono-tactical transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Archived Files</span>
                </button>

                <button
                  onClick={() => handleCopySummary(activeCase)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 rounded text-xs font-mono-tactical transition"
                >
                  {copiedNotification ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNotification ? 'Summary Copied!' : 'Copy Summary'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleTriggerReopen(activeCase)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-mono-tactical font-bold text-xs rounded shadow-lg transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reopen This Investigation (BNSS §193(9))</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
