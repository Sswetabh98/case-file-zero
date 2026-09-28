import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquareWarning, 
  Send, 
  UserCheck, 
  AlertOctagon, 
  Sparkles, 
  ShieldAlert, 
  FileText,
  CornerDownRight,
  Clock,
  HeartPulse,
  Scale,
  Stethoscope,
  ShieldCheck,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Package,
  Gavel,
  ChevronDown,
  ChevronUp,
  X,
  Flame,
  Search,
  BookOpen
} from 'lucide-react';
import { 
  Suspect, 
  EvidenceItem, 
  PsychologicalState, 
  RemandClockState, 
  DiscoveryMemo, 
  EvidenceContradictionSlam,
  AdvocateProfile,
  AdvocatePosture
} from '../types/game';
import { sound } from '../lib/audio';
import { renderInteractiveLeadsHtml, stripLeadTags } from '../engine/lead-parser';
import { getCustodyFatigueContext, getAdvocateProfileForSuspect, computeAdvocatePosture } from '../engine/interrogation-context';
import { MedicalCheckModal } from './MedicalCheckModal';
import { DiscoveryMemoModal } from './DiscoveryMemoModal';
import { InterrogationRealismGuideModal } from './InterrogationRealismGuideModal';
import { RemandExtensionModal } from './RemandExtensionModal';

interface InterrogationViewProps {
  suspects: Suspect[];
  unlockedEvidence: EvidenceItem[];
  onSendMessage: (suspectId: string, question: string, tactic?: string) => Promise<void>;
  isInterrogating: boolean;
  onNavigateView?: (view: string) => void;
  // Optional active session state passed from parent or managed locally
  initialPsychology?: PsychologicalState;
  initialClock?: RemandClockState;
  onMemoRecorded?: (memo: DiscoveryMemo) => void;
}

type TacticKey = 'rapport' | 'alibi_audit' | 'exhibit_confrontation' | 'accusatory' | 'bluff';

interface TacticalPostureDef {
  id: TacticKey;
  label: string;
  shortLabel: string;
  statute: string;
  description: string;
  riskBadge: string;
  riskColor: string;
  coercionPenalty: number;
}

const TACTICAL_POSTURES: TacticalPostureDef[] = [
  {
    id: 'rapport',
    label: 'RAPPORT (BNSS §179)',
    shortLabel: 'RAPPORT',
    statute: 'BNSS 2023 §179',
    description: 'Soft empathetic questioning to lower defensiveness and establish narrative baseline.',
    riskBadge: 'SAFE',
    riskColor: 'text-emerald-400 bg-emerald-950/80 border-emerald-700',
    coercionPenalty: 0
  },
  {
    id: 'alibi_audit',
    label: 'ALIBI AUDIT (BSA §11)',
    shortLabel: 'ALIBI AUDIT',
    statute: 'BSA 2023 §11',
    description: 'Methodical chronological check of timestamps, CDRs, and location claims to isolate contradictions.',
    riskBadge: 'AUDIT MODE',
    riskColor: 'text-cyan-400 bg-cyan-950/80 border-cyan-700',
    coercionPenalty: 0
  },
  {
    id: 'exhibit_confrontation',
    label: 'EXHIBIT CONFRONTATION (BSA §23)',
    shortLabel: 'EXHIBIT CONFRONT',
    statute: 'BSA 2023 §23',
    description: 'Direct confrontation using certified Malkhana forensic evidence. High stress impact.',
    riskBadge: 'EVIDENCE GROUNDED',
    riskColor: 'text-amber-400 bg-amber-950/80 border-amber-700',
    coercionPenalty: 0
  },
  {
    id: 'accusatory',
    label: 'DIRECT ACCUSATION (BNSS §180)',
    shortLabel: 'ACCUSATORY',
    statute: 'BNSS 2023 §180',
    description: 'Sharp high-pressure inquiry directly challenging suspect statements.',
    riskBadge: 'ELEVATED RISK',
    riskColor: 'text-orange-400 bg-orange-950/80 border-orange-700',
    coercionPenalty: 15
  },
  {
    id: 'bluff',
    label: 'BLUFF TRAP (Art. 20(3))',
    shortLabel: 'BLUFF TRAP',
    statute: 'BNSS §41D / Art. 20(3)',
    description: 'Asserting unverified claims. High breakdown chance if unrepresented, BUT triggers immediate Advocate Objection & +20 Coercion Penalty if counsel is seated!',
    riskBadge: 'CRITICAL OBJECTION RISK',
    riskColor: 'text-rose-400 bg-rose-950/80 border-rose-700',
    coercionPenalty: 20
  }
];

const TypewriterText: React.FC<{ text: string; speed?: number }> = ({ text, speed = 18 }) => {
  const [displayedText, setDisplayedText] = React.useState('');
  const cleanText = stripLeadTags(text);

  React.useEffect(() => {
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      if (i < cleanText.length) {
        setDisplayedText(cleanText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [cleanText, speed]);

  if (displayedText.length < cleanText.length) {
    return <span>{displayedText} ▌</span>;
  }

  // Once typing completes, render full rich interactive HTML
  return (
    <span 
      dangerouslySetInnerHTML={{ 
        __html: renderInteractiveLeadsHtml(text) 
      }} 
    />
  );
};

export const InterrogationView: React.FC<InterrogationViewProps> = ({
  suspects,
  unlockedEvidence,
  onSendMessage,
  isInterrogating,
  onNavigateView,
  initialPsychology,
  initialClock,
  onMemoRecorded
}) => {
  const [selectedSuspectId, setSelectedSuspectId] = useState<string>(suspects[0]?.id || '');
  const [inputText, setInputText] = useState<string>('');
  const [selectedClueToConfront, setSelectedClueToConfront] = useState<string>('');
  
  // Phase 5: Malkhana Evidence Drawer & Slam Animation States
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [activeSlamAnimation, setActiveSlamAnimation] = useState<string | null>(null);
  const [pinnedExhibit, setPinnedExhibit] = useState<EvidenceItem | null>(null);
  const [isSlamming, setIsSlamming] = useState<boolean>(false);
  const [slammedExhibitsLog, setSlammedExhibitsLog] = useState<EvidenceContradictionSlam[]>([]);

  // Phase 3: Tactical Questioning Posture State
  const [selectedTactic, setSelectedTactic] = useState<TacticKey>('alibi_audit');
  const currentPostureDef = TACTICAL_POSTURES.find(p => p.id === selectedTactic) || TACTICAL_POSTURES[1];

  // Phase 6 & Phase 4: Legal Action Modals State
  const [isMedicalModalOpen, setIsMedicalModalOpen] = useState<boolean>(false);
  const [isRemandExtensionModalOpen, setIsRemandExtensionModalOpen] = useState<boolean>(false);
  const [isDiscoveryMemoModalOpen, setIsDiscoveryMemoModalOpen] = useState<boolean>(false);
  const [isRealismGuideOpen, setIsRealismGuideOpen] = useState<boolean>(false);
  const [isAdmissibilityAuditOpen, setIsAdmissibilityAuditOpen] = useState<boolean>(false);
  const [lodgedMemos, setLodgedMemos] = useState<DiscoveryMemo[]>([]);

  // Phase 4: Grant Stamina & Refreshment Recess
  const handleGrantStaminaRecess = () => {
    sound.playClick();
    setRemandClock(prev => ({
      ...prev,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit'
    }));
    setPsychology(prev => ({
      ...prev,
      stressLevel: Math.max(10, prev.stressLevel - 15),
      coercionPenalty: Math.max(0, (prev.coercionPenalty || 0) - 10)
    }));
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    activeSuspect.testimony.push({
      id: `recess-${Date.now()}`,
      sender: 'detective',
      text: `☕ [STAMINA RECESS GRANTED // BNSS §54] IO grants 30-minute refreshment and medical rest for ${activeSuspect.name}. Restores subject stamina and resets 12-hour evaluation clock.`,
      timestamp: now
    });
  };

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Remand & Statutory Clock State (24h custody limit: 1440 minutes max)
  const [remandClock, setRemandClock] = useState<RemandClockState>(initialClock || {
    remandMinutesRemaining: 1120, // ~18h 40m remaining
    remandDeadlineISO: new Date(Date.now() + 67200000).toISOString(),
    isExpired: false,
    advocatePresent: false,
    lastMedicalCheckMinutesAgo: 180,
    medicalFitnessStatus: 'fit',
    magistrateNoticeIssued: false
  });

  // Suspect Psychological State
  const [psychology, setPsychology] = useState<PsychologicalState>(initialPsychology || {
    stressLevel: 35,
    cooperationLevel: 25,
    composureState: 'guarded',
    isBreakdown: false,
    deceitIndex: 65,
    vulnerabilitiesShattered: [],
    coercionPenalty: 0
  });

  const activeSuspect = suspects.find(s => s.id === selectedSuspectId) || suspects[0];

  const custodyTurns = activeSuspect?.testimony?.length ? Math.floor(activeSuspect.testimony.length / 2) : 0;
  const custodyFatigue = getCustodyFatigueContext(
    remandClock.remandMinutesRemaining,
    custodyTurns,
    remandClock.advocatePresent
  );

  const advocateProfile = getAdvocateProfileForSuspect(activeSuspect);
  const advocatePosture = computeAdvocatePosture(
    advocateProfile,
    psychology.stressLevel,
    custodyFatigue.fatigueScore,
    psychology.coercionPenalty || 0
  );

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSuspect?.testimony, isInterrogating, isSlamming]);

  // Phase 2: Audio Cue Trigger for Advocate Interventions in Transcript
  const lastProcessedAdvocateMsgRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeSuspect?.testimony?.length) return;
    const lastMsg = activeSuspect.testimony[activeSuspect.testimony.length - 1];
    if (lastMsg && lastMsg.sender === 'advocate' && lastMsg.id !== lastProcessedAdvocateMsgRef.current) {
      lastProcessedAdvocateMsgRef.current = lastMsg.id || `${lastMsg.timestamp}-${activeSuspect.testimony.length}`;
      if (lastMsg.technique === 'advisory' || (lastMsg.text && lastMsg.text.toLowerCase().includes('advises'))) {
        sound.playAdvisory();
      } else {
        sound.playObjection();
        setTimeout(() => sound.playStenographerChime(), 180);
      }
    }
  }, [activeSuspect?.testimony]);

  // Sync suspect stress level into local psychological meter if suspect changes
  useEffect(() => {
    if (activeSuspect) {
      const stress = activeSuspect.stressLevel || 30;
      setPsychology(prev => ({
        ...prev,
        stressLevel: stress,
        isBreakdown: stress >= 80,
        composureState: stress >= 80 ? 'breakdown' : stress >= 60 ? 'cornered' : stress >= 40 ? 'agitated' : 'guarded'
      }));
    }
  }, [selectedSuspectId, activeSuspect?.stressLevel]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isInterrogating || !activeSuspect) return;
    
    let question = inputText.trim();
    const activeTactic = pinnedExhibit ? 'exhibit_confrontation' : selectedTactic;
    if (pinnedExhibit) {
      question = `[CONFRONTATION WITH ${pinnedExhibit.code}: ${pinnedExhibit.title}] ${question}`;
      setPinnedExhibit(null);
    }
    
    setInputText('');
    sound.playTeletype();
    
    // Decrement custody clock by 20 minutes for each thorough round of interrogation
    setRemandClock(prev => {
      const remaining = Math.max(0, prev.remandMinutesRemaining - 20);
      const medicalAgo = prev.lastMedicalCheckMinutesAgo + 20;
      return {
        ...prev,
        remandMinutesRemaining: remaining,
        isExpired: remaining <= 0,
        lastMedicalCheckMinutesAgo: medicalAgo,
        medicalFitnessStatus: medicalAgo >= 720 ? 'requires_attention' : 'fit'
      };
    });

    await onSendMessage(activeSuspect.id, question, activeTactic);
  };

  // Phase 5: Slam Exhibit Directly into the Chamber
  const handleSlamExhibit = async (exhibit: EvidenceItem) => {
    if (isSlamming || isInterrogating || !activeSuspect) return;
    setIsSlamming(true);
    setActiveSlamAnimation(exhibit.code);
    sound.playMissionCompleted();

    try {
      const res = await fetch('/api/interrogation/slam-evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPsychology: psychology,
          currentClock: remandClock,
          exhibit: {
            id: exhibit.id,
            code: exhibit.code,
            title: exhibit.title,
            summary: exhibit.summary,
            weight: exhibit.forensicAnalysis ? 9 : 7
          },
          contradictionType: exhibit.type === 'surveillance' 
            ? 'cctv_visual' 
            : exhibit.type === 'financial' 
            ? 'financial_trail' 
            : 'alibi_refutation',
          suspectInfo: {
            id: activeSuspect.id,
            name: activeSuspect.name,
            vulnerabilities: activeSuspect.vulnerabilities || []
          }
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.impact?.newPsychology) {
          setPsychology(data.impact.newPsychology);
          activeSuspect.stressLevel = data.impact.newPsychology.stressLevel;
        }
        if (data.clock) setRemandClock(data.clock);

        // Record suspect testimony & detective slam entry
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        activeSuspect.testimony.push({
          id: `slam-io-${Date.now()}`,
          sender: 'detective',
          text: `💥 [EXHIBIT SLAMMED: ${exhibit.code}] IO confronts ${activeSuspect.name} with ${exhibit.title}: "${exhibit.summary}"`,
          timestamp: now
        });

        if (data.suspectReaction) {
          activeSuspect.testimony.push({
            id: `slam-react-${Date.now()}`,
            sender: 'suspect',
            text: data.suspectReaction,
            timestamp: now,
            stressAtTime: data.impact?.newPsychology?.stressLevel
          });
        }

        // Add to slammed exhibits list
        setSlammedExhibitsLog(prev => [
          ...prev,
          {
            id: `slam-${Date.now()}`,
            exhibitCode: exhibit.code,
            exhibitTitle: exhibit.title,
            targetStatementSnippet: exhibit.summary,
            contradictionType: 'alibi_refutation',
            stressDelta: data.impact?.stressDelta || 25,
            cooperationDelta: data.impact?.cooperationDelta || 15,
            breakthroughAchieved: Boolean(data.impact?.breakthroughAchieved),
            timestamp: now
          }
        ]);
      }
    } catch {
      // Fallback local calculation
      const updatedStress = Math.min(100, psychology.stressLevel + 28);
      const isBreakdown = updatedStress >= 80;
      setPsychology(prev => ({
        ...prev,
        stressLevel: updatedStress,
        cooperationLevel: Math.min(100, prev.cooperationLevel + 20),
        isBreakdown,
        composureState: isBreakdown ? 'breakdown' : 'cornered'
      }));
      activeSuspect.stressLevel = updatedStress;
    } finally {
      setIsSlamming(false);
      setTimeout(() => setActiveSlamAnimation(null), 1200);
      setIsDrawerOpen(false);
    }
  };

  const handleInsertClue = (clueId: string) => {
    const clue = unlockedEvidence.find(e => e.id === clueId);
    if (!clue) return;
    sound.playClick();
    setPinnedExhibit(clue);
    setSelectedTactic('exhibit_confrontation');
    setInputText(prev => `${prev ? prev + ' ' : ''}Explain the contradiction regarding ${clue.title}.`);
    setSelectedClueToConfront('');
  };

  // Toggle Advocate Presence (BNSS s.41D / s.180)
  const toggleAdvocatePresence = async () => {
    sound.playClick();
    const nextStatus = !remandClock.advocatePresent;
    setRemandClock(prev => ({
      ...prev,
      advocatePresent: nextStatus
    }));

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (activeSuspect) {
      activeSuspect.testimony.push({
        id: `adv-entry-${Date.now()}`,
        sender: 'advocate',
        speakerName: `${advocateProfile.name} [${advocateProfile.barCouncilNumber}]`,
        text: nextStatus 
          ? `${advocateProfile.name} (${advocateProfile.specialization}) has entered Interrogation Chamber 04 and is seated within visual range under BNSS §41D.`
          : `${advocateProfile.name} has stepped out of the chamber. Custodial questioning continues under standard BNSS protocol.`,
        timestamp: now,
        statute: 'BNSS 2023 §41D'
      });
    }

    try {
      await fetch('/api/interrogation/advocate-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          advocatePresent: nextStatus,
          personId: activeSuspect?.id
        })
      });
    } catch {
      // Non-blocking sync
    }
  };

  // Perform BNSS s.53/54 Medical Examination
  const handleMedicalCheck = async () => {
    sound.playAlertWarning();
    try {
      const res = await fetch('/api/interrogation/medical-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentClock: remandClock })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.clock) setRemandClock(data.clock);
      } else {
        setRemandClock(prev => ({
          ...prev,
          remandMinutesRemaining: Math.max(0, prev.remandMinutesRemaining - 45),
          lastMedicalCheckMinutesAgo: 0,
          medicalFitnessStatus: 'fit'
        }));
      }
    } catch {
      setRemandClock(prev => ({
        ...prev,
        remandMinutesRemaining: Math.max(0, prev.remandMinutesRemaining - 45),
        lastMedicalCheckMinutesAgo: 0,
        medicalFitnessStatus: 'fit'
      }));
    }
  };

  // Format minutes into HH:MM
  const formatRemandTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  };

  // Handle Discovery Memo recording (BSA Section 23)
  const handleMemoRecorded = (memo: DiscoveryMemo) => {
    sound.playDeductionSuccess();
    setLodgedMemos(prev => [...prev, memo]);
    
    // Add disclosure into suspect's revealedIntel
    if (!activeSuspect.revealedIntel) activeSuspect.revealedIntel = [];
    activeSuspect.revealedIntel.push(`[${memo.memoNumber}] Recovery of ${memo.recoveryItemDescription} at ${memo.revealedLocation} (BSA s.23)`);
    
    // Append to transcript
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    activeSuspect.testimony.push({
      id: `memo-trans-${Date.now()}`,
      sender: 'detective',
      text: `📜 [BSA s.23 DISCOVERY MEMO LODGED // ${memo.memoNumber}] Accused ${activeSuspect.name} voluntarily discloses location of physical evidence before independent pancha witnesses: "${memo.exactVoluntaryStatement}"`,
      timestamp: now
    });

    // Reward cooperation boost
    setPsychology(prev => ({
      ...prev,
      cooperationLevel: Math.min(100, prev.cooperationLevel + 30),
      deceitIndex: Math.max(0, prev.deceitIndex - 25)
    }));

    // Trigger cross-app synchronization handler
    onMemoRecorded?.(memo);
  };

  return (
    <div className="space-y-4 pb-20 relative">
      
      {/* Visual Slam Animation Flash Overlay */}
      {activeSlamAnimation && (
        <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center bg-rose-500/10 backdrop-blur-[1px] animate-pulse">
          <div className="bg-rose-950/90 border-2 border-rose-500 text-rose-200 px-6 py-4 rounded shadow-2xl font-mono-tactical text-center space-y-1 transform scale-105 transition-all">
            <div className="text-2xl font-black tracking-widest text-rose-400">💥 EXHIBIT SLAMMED</div>
            <div className="text-xs text-slate-300 uppercase">
              CONFRONTING SUBJECT WITH [{activeSlamAnimation}] FORENSIC CONTRADICTION
            </div>
          </div>
        </div>
      )}

      {/* Top Banner: Interrogation Protocol Header & Statutory Clock */}
      <div className="bg-[#121826] border border-slate-800 p-4 sm:p-5 rounded flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <MessageSquareWarning className="w-4 h-4 text-amber-500" />
            <h2 className="text-base sm:text-lg font-serif-header font-bold text-slate-100">
              INTERROGATION CHAMBER // BNSS & BSA 2023 PROTOCOL
            </h2>
          </div>
          <p className="text-xs font-mono-tactical text-slate-400 mt-0.5">
            CONFRONT SUSPECTS WITH VERIFIED EXHIBITS • 24-HOUR STATUTORY CUSTODY COUNTDOWN (BNSS s.58/187)
          </p>
        </div>

        {/* 24-Hour Remand Clock HUD */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Remand Countdown Badge & Direct Petition Action Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsRemandExtensionModalOpen(true);
            }}
            title="File Police Remand Extension Petition before Judicial Magistrate (BNSS s.187)"
            className={`flex items-center space-x-2 px-3 py-1.5 rounded border font-mono-tactical text-xs transition-colors cursor-pointer hover:border-amber-400 ${
              remandClock.remandMinutesRemaining <= 180 
                ? 'bg-rose-950/60 border-rose-600 text-rose-300 animate-pulse' 
                : remandClock.remandMinutesRemaining <= 480
                ? 'bg-amber-950/40 border-amber-600/60 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] text-slate-400 uppercase">CUSTODY:</span>
            <span className="font-bold text-amber-300">{formatRemandTime(remandClock.remandMinutesRemaining)}</span>
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/20 text-amber-200 rounded border border-amber-500/40 font-bold uppercase shrink-0">
              + EXTEND (BNSS §187)
            </span>
          </button>

          {/* Judicial Remand Extension Petition Button (BNSS s.187) */}
          <button
            onClick={() => {
              sound.playClick();
              setIsRemandExtensionModalOpen(true);
            }}
            title="File Police Remand Extension Petition before Judicial Magistrate (BNSS s.187)"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-[11px] font-mono-tactical bg-amber-500/20 border-amber-500/60 text-amber-200 hover:bg-amber-500/30 transition-colors cursor-pointer"
          >
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span>+ PETITION MAGISTRATE (BNSS §187)</span>
          </button>

          {/* Medical Fitness Status Badge (BNSS s.53/54) */}
          <button
            onClick={() => {
              sound.playClick();
              setIsMedicalModalOpen(true);
            }}
            title="Open Mandatory Medical Exam under BNSS s.53/54"
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-[11px] font-mono-tactical transition-colors cursor-pointer ${
              remandClock.medicalFitnessStatus === 'critical_evaluation_needed'
                ? 'bg-rose-900/40 border-rose-500 text-rose-300 animate-pulse'
                : remandClock.medicalFitnessStatus === 'requires_attention'
                ? 'bg-amber-900/30 border-amber-500 text-amber-300'
                : 'bg-emerald-950/40 border-emerald-800 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>{remandClock.medicalFitnessStatus === 'fit' ? 'BNSS s.54: FIT' : 'MEDICAL DUE (EXAMINE)'}</span>
          </button>

          {/* Stamina & Refreshment Recess Button (BNSS s.54) */}
          <button
            onClick={handleGrantStaminaRecess}
            title="Grant 30-Minute Medical / Refreshment Recess to restore suspect stamina and reset medical clock"
            className="flex items-center space-x-1.5 px-2 py-1.5 rounded border text-[11px] font-mono-tactical bg-slate-900 border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600 transition-colors cursor-pointer"
          >
            <span>☕ STAMINA RECESS</span>
          </button>

          {/* Advocate Presence Toggle (BNSS s.41D) */}
          <button
            onClick={toggleAdvocatePresence}
            title="Toggle Advocate Presence (BNSS s.41D / s.180)"
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-[11px] font-mono-tactical transition-colors cursor-pointer ${
              remandClock.advocatePresent
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{remandClock.advocatePresent ? `${advocateProfile.name.split(' ')[1] || 'ADVOCATE'} SEATED` : '+ CALL COUNSEL'}</span>
          </button>

          {/* Realism & SOP Guide Button */}
          <button
            onClick={() => {
              sound.playClick();
              setIsRealismGuideOpen(true);
            }}
            title="Open Realism & Interrogation SOP Guide"
            className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border text-[11px] font-mono-tactical bg-slate-900 border-slate-800 text-slate-300 hover:text-slate-100 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>SOP GUIDE</span>
          </button>
        </div>
      </div>

      {/* Remand Expiry Warning Banner (BNSS s.187 / Const Art. 22(2)) */}
      {remandClock.remandMinutesRemaining <= 360 && (
        <div className="bg-rose-950/80 border border-rose-600/80 rounded p-2.5 px-3.5 flex items-center justify-between text-xs font-mono-tactical text-rose-200 animate-pulse shadow-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold tracking-wider">
              🚨 STATUTORY CUSTODY REMAND EXPIRING: ONLY {formatRemandTime(remandClock.remandMinutesRemaining)} REMAINING UNDER BNSS §187 / ART. 22(2)!
            </span>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              setIsRemandExtensionModalOpen(true);
            }}
            className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] shrink-0 cursor-pointer"
          >
            FILE REMAND EXTENSION PETITION NOW
          </button>
        </div>
      )}

      {/* Phase 1: Defense Counsel Active Chamber Station HUD */}
      {remandClock.advocatePresent ? (
        <div className="bg-[#0f172a] border border-cyan-500/40 rounded p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono-tactical shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded bg-cyan-950/80 border border-cyan-500/50 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-cyan-200">{advocateProfile.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded">
                  {advocateProfile.barCouncilNumber}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 bg-slate-800 text-slate-300 rounded uppercase">
                  {advocateProfile.demeanor.replace('_', ' ')}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans-body">
                {advocateProfile.specialization} • <span className="text-emerald-400">BNSS §41D Sight-Line Compliant</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Live Posture */}
            <div className="text-right">
              <div className="text-[9px] text-slate-500 uppercase">CURRENT POSTURE:</div>
              <div className={`font-bold uppercase text-[11px] ${
                advocatePosture.currentPosture === 'formal_objection' || advocatePosture.currentPosture === 'demanding_recess'
                  ? 'text-rose-400 animate-pulse'
                  : advocatePosture.currentPosture === 'advising_client'
                  ? 'text-amber-400'
                  : 'text-cyan-300'
              }`}>
                {advocatePosture.currentPosture.replace('_', ' ')}
              </div>
            </div>

            {/* Alertness Meter */}
            <div className="w-28 space-y-1">
              <div className="flex justify-between text-[9px]">
                <span className="text-slate-400">ALERTNESS:</span>
                <span className="font-bold text-cyan-400">{advocatePosture.alertnessLevel}%</span>
              </div>
              <div className="w-full bg-slate-900 h-1.5 rounded border border-slate-700 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-300 ${
                    advocatePosture.alertnessLevel >= 75 
                      ? 'bg-rose-500' 
                      : advocatePosture.alertnessLevel >= 50 
                      ? 'bg-amber-500' 
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${advocatePosture.alertnessLevel}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#10141f] border border-slate-800/80 rounded px-3.5 py-2 flex items-center justify-between text-xs font-mono-tactical text-slate-400">
          <div className="flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-slate-600" />
            <span>UNREPRESENTED CUSTODIAL SESSION // Suspect {activeSuspect.name} is answering directly without defense counsel present.</span>
          </div>
          <button
            onClick={toggleAdvocatePresence}
            className="text-[10px] px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-bold transition-colors cursor-pointer"
          >
            + SEAT {advocateProfile.name.toUpperCase()} (BNSS §41D)
          </button>
        </div>
      )}

      {/* Suspect Selector & Malkhana Drawer Toggle Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {suspects.map(s => (
            <button
              key={s.id}
              onClick={() => {
                sound.playClick();
                setSelectedSuspectId(s.id);
              }}
              className={`px-3 py-1.5 text-xs font-mono-tactical rounded border transition-colors shrink-0 ${
                s.id === activeSuspect?.id
                  ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.name} ({s.role})
            </button>
          ))}
        </div>

        {/* Phase 5: Toggle Malkhana Evidence Drawer Button */}
        <button
          onClick={() => {
            sound.playClick();
            setIsDrawerOpen(!isDrawerOpen);
          }}
          className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono-tactical rounded transition-colors cursor-pointer shrink-0"
        >
          <Package className="w-4 h-4 text-amber-400" />
          <span>MALKHANA EVIDENCE DRAWER ({unlockedEvidence.length})</span>
          {isDrawerOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

            {/* PHASE 5: INTERACTIVE MALKHANA EVIDENCE DRAWER MODAL / TRAY */}
      {isDrawerOpen && (
        <div className="bg-[#0B101B] border-2 border-amber-500/40 p-4 rounded shadow-2xl space-y-3 font-mono-tactical animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                MALKHANA SEIZED EXHIBITS VAULT // CONFRONTATION READY
              </h3>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-400">
            Select an exhibit to directly slam onto the interrogation table or pin to your next question to shatter false alibis.
          </p>

          {/* Slammed Exhibits History Counter */}
          {slammedExhibitsLog.length > 0 && (
            <div className="bg-amber-950/30 border border-amber-500/40 p-2.5 rounded text-[11px] text-amber-300 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>FORENSIC CONTRADICTIONS LODGED AGAINST {activeSuspect.name} ({slammedExhibitsLog.length}):</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {slammedExhibitsLog.map((s, idx) => (
                  <span key={s.id || idx} className="px-2 py-0.5 bg-black/50 border border-amber-500/30 rounded text-[10px] text-amber-200">
                    [{s.exhibitCode}] {s.exhibitTitle} (+{s.stressDelta}% STRESS)
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-72 overflow-y-auto pr-1">
            {unlockedEvidence.map(ex => {
              const isVuln = Boolean(
                activeSuspect.vulnerabilities?.includes(ex.id) || 
                activeSuspect.vulnerabilities?.includes(ex.code)
              );
              return (
                <div 
                  key={ex.id} 
                  className={`p-3 rounded border text-xs flex flex-col justify-between space-y-2 transition-all ${
                    isVuln 
                      ? 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]' 
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold rounded text-[10px]">
                        {ex.code}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        {ex.type}
                      </span>
                    </div>
                    <div className="font-bold text-slate-200 line-clamp-1">{ex.title}</div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                      {ex.summary}
                    </p>
                    {isVuln && (
                      <div className="flex items-center space-x-1 text-[10px] text-amber-400 font-bold mt-1.5">
                        <Flame className="w-3 h-3 text-amber-500 animate-pulse" />
                        <span>SUSPECT CRITICAL VULNERABILITY</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => handleSlamExhibit(ex)}
                      disabled={isSlamming}
                      className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold text-[11px] rounded flex items-center justify-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Flame className="w-3.5 h-3.5" />
                      <span>SLAM EXHIBIT</span>
                    </button>
                    <button
                      onClick={() => {
                        sound.playClick();
                        setPinnedExhibit(ex);
                        setIsDrawerOpen(false);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] rounded transition-colors cursor-pointer"
                      title="Pin Exhibit to Question Input"
                    >
                      PIN
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Interrogation Split: Suspect Dossier / Psychological Metrics & Live Chat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Suspect Dossier & Dual Biometric Gauges */}
        <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-4">
          <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
            <img 
              src={activeSuspect.mugshotUrl} 
              alt={activeSuspect.name} 
              className="w-16 h-16 object-cover rounded bg-slate-950 border border-slate-700 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h3 className="font-serif-header text-base font-bold text-slate-100 truncate">
                  {activeSuspect.name}
                </h3>
                {psychology.isBreakdown && (
                  <span className="px-1.5 py-0.5 bg-rose-500 text-slate-950 font-mono-tactical text-[9px] font-bold rounded animate-pulse">
                    BREAKDOWN
                  </span>
                )}
              </div>
              <p className="font-mono-tactical text-xs text-amber-400">
                {activeSuspect.alias}
              </p>
              <p className="font-mono-tactical text-[11px] text-slate-400 truncate">
                {activeSuspect.role}
              </p>
            </div>
          </div>

          {/* DUAL BIOMETRIC GAUGES: STRESS PULSE & COOPERATION */}
          <div className="space-y-3.5 font-mono-tactical text-xs">
            
            {/* 1. Psychological Stress Pulse Gauge */}
            <div className={`p-3 rounded border transition-all ${
              psychology.stressLevel >= 80 
                ? 'bg-rose-950/30 border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                : psychology.stressLevel >= 50
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <HeartPulse className={`w-4 h-4 ${psychology.stressLevel > 70 ? 'text-rose-500 animate-ping' : 'text-amber-400'}`} />
                  <span className="font-bold text-[11px]">PSYCHOLOGICAL STRESS:</span>
                </div>
                <span className={`font-bold ${psychology.stressLevel >= 80 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                  {psychology.stressLevel}% [{psychology.composureState.toUpperCase()}]
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded border border-slate-700 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    psychology.stressLevel >= 80 
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600' 
                      : psychology.stressLevel >= 50 
                      ? 'bg-gradient-to-r from-cyan-500 to-amber-500' 
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, psychology.stressLevel)}%` }}
                />
              </div>
              {psychology.isBreakdown && (
                <p className="text-[10px] text-rose-400 font-mono-tactical mt-1.5 flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>Suspect composure collapsed. Vulnerable to confession & discovery memos.</span>
                </p>
              )}
            </div>

            {/* 2. Cooperation / Defiance Gauge */}
            <div className="p-3 bg-slate-950 rounded border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-[11px]">COOPERATION GAUGE:</span>
                </div>
                <span className={`font-bold ${psychology.cooperationLevel >= 70 ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {psychology.cooperationLevel}% {psychology.cooperationLevel >= 70 ? '(WILLING)' : '(GUARDED)'}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2.5 rounded border border-slate-700 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-slate-600 via-amber-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, psychology.cooperationLevel)}%` }}
                />
              </div>
            </div>

            {/* 3. Custody Detention Fatigue Gauge (BNSS §54 / §58) */}
            <div className={`p-3 rounded border transition-all ${
              custodyFatigue.fatigueScore >= 80
                ? 'bg-rose-950/40 border-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
                : custodyFatigue.fatigueScore >= 50
                ? 'bg-amber-950/25 border-amber-500/50'
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Clock className={`w-4 h-4 ${custodyFatigue.fatigueScore >= 80 ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                  <span className="font-bold text-[11px]">CUSTODY FATIGUE:</span>
                </div>
                <span className={`font-bold text-[11px] ${
                  custodyFatigue.fatigueScore >= 80 
                    ? 'text-rose-400 animate-pulse' 
                    : custodyFatigue.fatigueScore >= 50 
                    ? 'text-amber-400' 
                    : 'text-cyan-400'
                }`}>
                  {custodyFatigue.fatigueScore}% [{custodyFatigue.fatigueLabel.toUpperCase()}]
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 rounded border border-slate-700 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    custodyFatigue.fatigueScore >= 80 
                      ? 'bg-gradient-to-r from-amber-500 to-rose-600' 
                      : custodyFatigue.fatigueScore >= 50 
                      ? 'bg-gradient-to-r from-cyan-500 to-amber-500' 
                      : 'bg-cyan-500'
                  }`}
                  style={{ width: `${Math.min(100, custodyFatigue.fatigueScore)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 font-mono-tactical mt-1.5 italic">
                {custodyFatigue.fatigueDescription}
              </p>
              {custodyFatigue.fatigueScore >= 80 && (
                <div className="mt-1.5 p-1 bg-rose-900/30 border border-rose-500/40 rounded text-[9px] text-rose-300 font-mono-tactical flex items-center space-x-1">
                  <AlertTriangle className="w-3 h-3 shrink-0 text-rose-400" />
                  <span>Mandatory medical recess required under BNSS §54 to avoid legal exclusion.</span>
                </div>
              )}
            </div>

            {/* 4. Defense Counsel Presence Card (BNSS §41D) */}
            <div className={`p-2.5 rounded border transition-all ${
              remandClock.advocatePresent 
                ? 'bg-cyan-950/40 border-cyan-500/50' 
                : 'bg-slate-950 border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Scale className={`w-3.5 h-3.5 ${remandClock.advocatePresent ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className={`text-[11px] font-bold ${remandClock.advocatePresent ? 'text-cyan-300' : 'text-slate-400'}`}>
                    {remandClock.advocatePresent ? `${advocateProfile.name.toUpperCase()}` : 'UNREPRESENTED CUSTODY'}
                  </span>
                </div>
                <button
                  onClick={toggleAdvocatePresence}
                  className={`text-[9px] px-2 py-0.5 rounded font-mono-tactical font-bold transition-colors cursor-pointer ${
                    remandClock.advocatePresent 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {remandClock.advocatePresent ? 'DISMISS' : '+ SEAT COUNSEL'}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                {remandClock.advocatePresent 
                  ? advocatePosture.postureDescription
                  : `Suspect ${activeSuspect.name} is answering directly without legal representation.`}
              </p>
              {remandClock.advocatePresent && (
                <div className="mt-1.5 pt-1.5 border-t border-cyan-900/50 flex items-center justify-between text-[9px] font-mono-tactical text-slate-400">
                  <span>REG: {advocateProfile.barCouncilNumber}</span>
                  <span className="text-cyan-400 font-bold uppercase">{advocateProfile.demeanor.replace('_', ' ')}</span>
                </div>
              )}
            </div>

          </div>

          {/* Subject Claimed Alibi */}
          <div className="bg-slate-950 p-3 rounded border border-slate-800 space-y-1">
            <span className="text-[10px] font-mono-tactical text-slate-500 uppercase block">
              OFFICIAL RECORDED ALIBI (BNSS s.180)
            </span>
            <p className="text-xs font-sans-body text-slate-300 italic">
              "{activeSuspect.alibi}"
            </p>
          </div>

          {/* Behavioral Profile */}
          <div className="bg-slate-900/80 p-3 rounded border border-slate-800 space-y-1 text-xs">
            <span className="text-[10px] font-mono-tactical text-slate-500 uppercase block">
              BUREAU PSYCHIATRIC EVALUATION
            </span>
            <p className="font-sans-body text-slate-400 text-xs">
              {activeSuspect.psychologicalProfile}
            </p>
          </div>

          {/* Lodged Disclosures & Intel Section */}
          <div className="bg-[#0D1424] p-3 rounded border border-emerald-500/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono-tactical text-emerald-400 font-bold uppercase tracking-wider flex items-center space-x-1">
                <span>LODGED DISCOVERIES (BSA s.23)</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => {
                    sound.playClick();
                    setIsDiscoveryMemoModalOpen(true);
                  }}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[9px] font-mono-tactical transition-colors cursor-pointer"
                  title="Draft Admissible Recovery Memo under BSA 2023 Section 23"
                >
                  + DRAFT MEMO
                </button>
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40 font-mono-tactical">
                  {(activeSuspect.revealedIntel?.length || 0) + lodgedMemos.filter(m => m.suspectId === activeSuspect.id).length} RECORDED
                </span>
              </div>
            </div>
            {(activeSuspect.revealedIntel && activeSuspect.revealedIntel.length > 0) || lodgedMemos.filter(m => m.suspectId === activeSuspect.id).length > 0 ? (
              <ul className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {activeSuspect.revealedIntel?.map((intel, idx) => (
                  <li key={idx} className="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded text-[11px] font-mono-tactical text-emerald-200 leading-snug">
                    <span className="text-emerald-400 font-bold mr-1">►</span>
                    {intel}
                  </li>
                ))}
                {lodgedMemos.filter(m => m.suspectId === activeSuspect.id).map((memo) => (
                  <li key={memo.id} className="p-2 bg-emerald-950/60 border border-emerald-500/50 rounded text-[11px] font-mono-tactical text-emerald-100 leading-snug space-y-0.5">
                    <div className="flex items-center justify-between text-[9px] text-emerald-400 font-bold">
                      <span>[{memo.memoNumber}]</span>
                      <span>BSA s.23 PANCHNAMA</span>
                    </div>
                    <div><span className="text-slate-400">Recovery:</span> {memo.recoveryItemDescription}</div>
                    <div><span className="text-slate-400">Location:</span> {memo.revealedLocation}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] font-mono-tactical text-slate-500 italic">
                No formal locatable disclosures lodged yet. Present contradictory exhibits to force admissions.
              </p>
            )}
          </div>

        </div>

        {/* Right 2 Cols: Live Interrogation Console & Transcript */}
        <div className="lg:col-span-2 bg-[#121826] border border-slate-800 p-5 rounded flex flex-col justify-between h-[600px]">
          
          {/* Transcript Log Area */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 font-mono-tactical text-xs">
            <div className="text-center py-2 text-[10px] text-slate-500 uppercase tracking-widest border-b border-slate-800/80">
              AUDIO / VIDEO RECORDING COMMENCED // SECURE CHAMBER 04 • BNSS COMPLIANT
            </div>

            {activeSuspect.testimony.map((msg, index) => {
              const isDetective = msg.sender === 'detective';
              const isAssistant = msg.sender === 'assistant' || (msg.text && msg.text.startsWith('(') && msg.text.includes(')'));
              const isAdvocate = msg.sender === 'advocate';
              
              // Extract in-room acknowledgement if present, e.g. "(Right away, Inspector Sir!) Sameer..."
              let ackText = '';
              let mainQuestionText = msg.text;
              
              if (isAssistant || isDetective) {
                const ackMatch = msg.text.match(/^\(([^)]+)\)\s*([\s\S]*)$/);
                if (ackMatch) {
                  ackText = ackMatch[1];
                  mainQuestionText = ackMatch[2];
                }
              }

              let speakerLabel = 'INVESTIGATING OFFICER (IO)';
              if (isAdvocate) {
                speakerLabel = msg.speakerName || 'DEFENSE ADVOCATE (ADV. SHARMA)';
              } else if (msg.sender === 'assistant' || isAssistant) {
                const nameInMatch = msg.text.match(/^\((?:Officer\s+)?([^)]+)\s+maintains/i);
                speakerLabel = msg.speakerName 
                  ? `ASSISTANT: ${msg.speakerName.toUpperCase()}` 
                  : nameInMatch 
                  ? `ASSISTANT: ${nameInMatch[1].toUpperCase()}`
                  : 'CO-EXAMINER';
              } else if (!isDetective) {
                speakerLabel = activeSuspect.name;
              }

              if (isAdvocate) {
                const isAdvisory = msg.technique === 'advisory' || (msg.text && msg.text.toLowerCase().includes('advises'));
                const isRecessDemand = msg.technique === 'recess_demand' || (msg.statute && msg.statute.includes('54'));

                if (isAdvisory) {
                  return (
                    <div key={msg.id || index} className="flex flex-col items-center my-2 w-full animate-in fade-in duration-200">
                      <div className="w-full max-w-[95%] p-3.5 rounded bg-[#0b1329] border border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)] text-cyan-200 font-mono-tactical">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-cyan-500/30 text-[10px]">
                          <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                            <Scale className="w-3.5 h-3.5 text-cyan-400" />
                            <span>💬 [COUNSEL ADVISORY // BNSS §41D]</span>
                            <span className="px-1.5 py-0.2 bg-cyan-950 text-cyan-300 rounded border border-cyan-700 text-[9px]">
                              {msg.statute || 'BNSS 2023 §41D'}
                            </span>
                          </div>
                          <span className="text-slate-400">{msg.timestamp}</span>
                        </div>
                        <div className="text-xs font-sans-body text-cyan-100 italic flex items-start space-x-2">
                          <span className="text-cyan-400 font-bold not-italic shrink-0">({speakerLabel} whispers to {activeSuspect.name}):</span>
                          <span>"{msg.text}"</span>
                        </div>
                        {msg.actionHint && (
                          <div className="mt-2.5 p-2 bg-cyan-950/80 border border-cyan-700/60 rounded text-[10px] text-cyan-300 flex items-center space-x-2">
                            <span className="font-bold text-cyan-400 shrink-0">COUNSEL NOTE:</span>
                            <span>{msg.actionHint}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={msg.id || index} className="flex flex-col items-center my-2.5 w-full animate-in fade-in duration-200">
                    <div className={`w-full max-w-[95%] p-3.5 rounded shadow-lg text-slate-100 font-mono-tactical border ${
                      isRecessDemand 
                        ? 'bg-[#221015] border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.2)]'
                        : 'bg-[#20180d] border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    }`}>
                      {/* Banner Header */}
                      <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-500/30 text-[10px]">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className={`w-4 h-4 ${isRecessDemand ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`} />
                          <span className={`font-bold tracking-wider ${isRecessDemand ? 'text-rose-300' : 'text-amber-300'}`}>
                            {isRecessDemand ? '🚨 [MANDATORY MEDICAL RECESS DEMAND]' : '⚖️ [FORMAL ADVOCATE OBJECTION // BNSS §41D]'}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-500/20 text-amber-200 rounded border border-amber-500/40 font-bold text-[9px]">
                            {msg.statute || 'BNSS §41D / ART. 20(3)'}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono">{msg.timestamp}</span>
                      </div>

                      {/* Advocate Identification & Spoken Text */}
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-amber-400 flex items-center justify-between">
                          <span>{speakerLabel}</span>
                          <span className="text-[9px] text-slate-400 font-normal">STATIONED WITHIN SIGHT-LINE</span>
                        </div>
                        <div className="text-xs font-sans-body text-amber-100 font-medium leading-relaxed bg-black/30 p-2.5 rounded border border-amber-500/20 italic">
                          "{msg.text}"
                        </div>
                      </div>

                      {/* Action Guidance & Legal Penalty Callouts */}
                      <div className="mt-2.5 pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px]">
                        <div className="flex items-center space-x-1.5 text-amber-300 font-bold">
                          <span>{msg.actionHint || '⚠️ IO ACTION REQUIRED: Rephrase inquiry without unverified assertions or present certified exhibit.'}</span>
                        </div>
                        {(msg.coercionPenalty || 0) > 0 && (
                          <span className="px-2 py-0.5 bg-rose-950 border border-rose-600/80 text-rose-300 font-bold rounded shrink-0">
                            +{msg.coercionPenalty || 15} COERCION PENALTY
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={msg.id || index} 
                  className={`flex flex-col ${isDetective || isAssistant ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 mb-1">
                    <span className={`font-bold uppercase ${isAssistant ? 'text-cyan-400' : isDetective ? 'text-slate-400' : 'text-amber-400'}`}>
                      {speakerLabel}
                    </span>
                    <span>•</span>
                    <span>{msg.timestamp}</span>
                    {!isDetective && !isAssistant && msg.stressAtTime !== undefined && (
                      <span className="text-amber-400">STRESS: {msg.stressAtTime}%</span>
                    )}
                  </div>
                  <div className={`p-3 rounded max-w-[85%] text-xs font-sans-body leading-relaxed ${
                    isAssistant
                      ? 'bg-[#131F37] text-cyan-100 border border-cyan-800/60'
                      : isDetective 
                      ? 'bg-[#18233C] text-slate-100 border border-slate-700' 
                      : 'bg-slate-950 text-slate-200 border border-slate-800'
                  }`}>
                    {(mainQuestionText.includes('[CONFRONTATION WITH') || mainQuestionText.includes('EXHIBIT SLAMMED')) && (
                      <div className="mb-2 p-1.5 bg-amber-950/80 border border-amber-500/50 rounded text-[10px] font-mono-tactical text-amber-300 font-bold flex items-center space-x-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                        <span>💥 [BSA 2023 §23 FORENSIC EXHIBIT CONFRONTATION]</span>
                      </div>
                    )}
                    {ackText && (
                      <div className="mb-2 p-1.5 bg-cyan-950/60 border border-cyan-500/30 rounded text-[11px] font-mono-tactical text-cyan-300 italic flex items-center space-x-1.5">
                        <span className="text-cyan-400 font-bold not-italic">► IN-ROOM TO IO:</span>
                        <span>"{ackText}"</span>
                      </div>
                    )}
                    {index === activeSuspect.testimony.length - 1 ? (
                      <TypewriterText text={mainQuestionText} />
                    ) : (
                      <span dangerouslySetInnerHTML={{ __html: renderInteractiveLeadsHtml(mainQuestionText) }} />
                    )}

                    {/* Phase 6: Custodial Confession Inadmissibility Safeguard (BSA §23) */}
                    {!isDetective && !isAssistant && (
                      mainQuestionText.toLowerCase().includes('admit') || 
                      mainQuestionText.toLowerCase().includes('confess') || 
                      mainQuestionText.toLowerCase().includes('hid') || 
                      mainQuestionText.toLowerCase().includes('conceal') || 
                      mainQuestionText.toLowerCase().includes('handled') || 
                      mainQuestionText.toLowerCase().includes('did it')
                    ) && (
                      <div className="mt-2.5 p-2 bg-rose-950/70 border border-rose-500/60 rounded text-[10.5px] font-mono-tactical text-rose-200 space-y-1">
                        <div className="font-bold flex items-center space-x-1.5 text-rose-300">
                          <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>🚫 [CUSTODIAL CONFESSION BARRED // BSA 2023 §23 INADMISSIBLE]</span>
                        </div>
                        <p className="text-[10px] text-slate-300 font-sans-body">
                          Oral admission under police custody is legally inadmissible in court per se. Draft a formal Section 23 Discovery Memo before Panch witnesses to make recovered facts 100% admissible proof.
                        </p>
                        <button
                          onClick={() => {
                            sound.playClick();
                            setIsDiscoveryMemoModalOpen(true);
                          }}
                          className="mt-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded text-[10px] flex items-center space-x-1 transition-colors cursor-pointer"
                        >
                          <FileText className="w-3 h-3" />
                          <span>📜 DRAFT SECTION 23 BSA DISCOVERY MEMO (PANCHNAMA)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {(isInterrogating || isSlamming) && (
              <div className="flex items-center space-x-2 text-xs font-mono-tactical text-amber-400 py-2">
                <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
                <span>
                  {isSlamming ? 'SLAMMING FORENSIC EXHIBIT AGAINST SUSPECT TESTIMONY...' : 'SUBJECT IS COMPUTING RESPONSE UNDER PSYCHOLOGICAL STRESS...'}
                </span>
              </div>
            )}

            <div ref={transcriptEndRef} />
          </div>

          {/* Bottom Bar: Tactical Posture Selector, Pinned Clue Badge & Message Input */}
          <div className="border-t border-slate-800 pt-3 space-y-3">
            
            {/* Phase 3: Tactical Questioning Posture & Technique Selector Bar */}
            <div className="bg-[#0b101c] border border-slate-800 rounded p-3 space-y-2.5 font-mono-tactical">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-slate-800/80">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                  <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>TACTICAL QUESTIONING POSTURE (BNSS / BSA 2023 PROTOCOL)</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  STATUTORY STATUTE: <span className="text-cyan-400 font-bold">{currentPostureDef.statute}</span>
                </div>
              </div>

              {/* Selector Tabs */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {TACTICAL_POSTURES.map((p) => {
                  const isSelected = selectedTactic === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        setSelectedTactic(p.id);
                      }}
                      className={`p-2 rounded text-left flex flex-col justify-between transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                          : 'bg-slate-900/90 border-slate-800/90 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="text-[10px] font-bold tracking-tight uppercase truncate">
                          {p.shortLabel}
                        </span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
                      </div>
                      <span className={`text-[8.5px] px-1 py-0.2 rounded border font-semibold inline-block truncate ${p.riskColor}`}>
                        {p.riskBadge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Live Posture Impact & Advocate Risk Banner */}
              <div className={`p-2.5 rounded border text-xs flex items-start space-x-2.5 transition-colors ${
                selectedTactic === 'bluff' && remandClock.advocatePresent
                  ? 'bg-rose-950/40 border-rose-600/80 text-rose-200'
                  : selectedTactic === 'accusatory' && remandClock.advocatePresent
                  ? 'bg-amber-950/40 border-amber-600/80 text-amber-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-300'
              }`}>
                <div className="shrink-0 mt-0.5">
                  {selectedTactic === 'bluff' && remandClock.advocatePresent ? (
                    <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                  ) : selectedTactic === 'accusatory' && remandClock.advocatePresent ? (
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-[11px] font-bold mb-0.5">
                    <span className="uppercase text-amber-300">{currentPostureDef.label}</span>
                    {remandClock.advocatePresent && selectedTactic === 'bluff' && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-rose-600 text-slate-950 font-bold rounded uppercase">
                        +20 COERCION PENALTY RISK
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-sans-body text-slate-300 leading-normal">
                    {remandClock.advocatePresent && selectedTactic === 'bluff'
                      ? `⚠️ ADVOCATE PRESENT: ${advocateProfile.name} is seated. Asserting unverified bluffs will trigger an immediate statutory objection under BNSS §41D and +20 Coercion Penalty.`
                      : remandClock.advocatePresent && selectedTactic === 'accusatory'
                      ? `⚠️ ADVOCATE PRESENT: High accusatory pressure without pinned exhibits may trigger a caution warning under BNSS §180 & Art. 20(3).`
                      : currentPostureDef.description}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Pinned Exhibit Badge */}
            {pinnedExhibit && (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/40 px-3 py-1.5 rounded text-xs font-mono-tactical text-amber-300">
                <div className="flex items-center space-x-2 truncate">
                  <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="font-bold">ATTACHED EVIDENCE: [{pinnedExhibit.code}] {pinnedExhibit.title}</span>
                </div>
                <button
                  onClick={() => setPinnedExhibit(null)}
                  className="text-slate-400 hover:text-slate-200 ml-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Quick Clue Insertion Bar */}
            <div className="flex items-center space-x-2 text-xs font-mono-tactical">
              <span className="text-slate-500 text-[11px] whitespace-nowrap">CONFRONT WITH EXHIBIT:</span>
              <select
                value={selectedClueToConfront}
                onChange={(e) => {
                  if (e.target.value) handleInsertClue(e.target.value);
                }}
                className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded px-2.5 py-1 focus:border-amber-500 focus:outline-none flex-1 truncate font-mono-tactical"
              >
                <option value="">-- Choose Malkhana Seized Exhibit to Pin --</option>
                {unlockedEvidence.map(clue => (
                  <option key={clue.id} value={clue.id}>
                    [{clue.code}] {clue.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="flex items-center space-x-2">
              <input
                type="text"
                placeholder={`Cross-examine ${activeSuspect.name} or confront with specific timeline / exhibit...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isInterrogating || isSlamming}
                className="flex-1 bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono-tactical rounded px-3 py-2.5 focus:border-amber-500 focus:outline-none placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={isInterrogating || isSlamming || !inputText.trim()}
                className="py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <span>EXAMINE</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

        </div>

      </div>

      {/* Phase 6 & Phase 4: Legal Action Modals */}
      <MedicalCheckModal
        isOpen={isMedicalModalOpen}
        onClose={() => setIsMedicalModalOpen(false)}
        clock={remandClock}
        suspectName={activeSuspect.name}
        onConfirmExamination={(updatedClock) => {
          setRemandClock(updatedClock);
          setIsMedicalModalOpen(false);
        }}
      />

      <RemandExtensionModal
        isOpen={isRemandExtensionModalOpen}
        onClose={() => setIsRemandExtensionModalOpen(false)}
        clock={remandClock}
        suspectName={activeSuspect.name}
        onConfirmExtension={(updatedClock, judicialOrderNotes) => {
          setRemandClock(updatedClock);
          setIsRemandExtensionModalOpen(false);
          const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          activeSuspect.testimony.push({
            id: `remand-order-${Date.now()}`,
            sender: 'detective',
            text: `⚖️ [JUDICIAL MAGISTRATE ORDER // BNSS §187] ${judicialOrderNotes}`,
            timestamp: now
          });
        }}
      />

      <DiscoveryMemoModal
        isOpen={isDiscoveryMemoModalOpen}
        onClose={() => setIsDiscoveryMemoModalOpen(false)}
        suspectId={activeSuspect.id}
        suspectName={activeSuspect.name}
        onMemoRecorded={handleMemoRecorded}
      />

      <InterrogationRealismGuideModal
        isOpen={isRealismGuideOpen}
        onClose={() => setIsRealismGuideOpen(false)}
      />

    </div>
  );
};


