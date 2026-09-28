import { PsychologyProfile, InterrogationState } from './interrogation-context';
import {
  PsychologicalState,
  RemandClockState,
  EvidenceContradictionSlam,
  DiscoveryMemo,
  SuspectComposureState
} from '../types/game';

export type TacticType = 'rapport' | 'accusatory' | 'evidence-disclosure' | 'silence' | 'bluff';
export type QuadrantDecision = 'crack' | 'hostile' | 'cooperative' | 'stonewalling';

export interface DecisionBranch {
  decision: QuadrantDecision;
  disclosure_tier: 0 | 1 | 2 | 3 | 4;
  regression: boolean;
}

export interface SquadInterrogationPersona {
  name: string;
  rank: string;
  specialization: string;
  addressingIO: string;
  acknowledgementStyle: string;
  interrogationFocus: string;
  sampleAcknowledgement: string;
  firstPersonTone: string;
}

export function getSquadInterrogationPersona(assistantName: string, assistantRole?: string): SquadInterrogationPersona {
  const lowerName = (assistantName || '').toLowerCase();
  
  if (lowerName.includes('ravi') || (assistantRole && assistantRole.toLowerCase().includes('assistant'))) {
    return {
      name: 'Junior Constable Ravi Deshmukh',
      rank: 'Junior Constable & Desk Aide',
      specialization: 'Case Diary & Procedural Record Maintenance',
      addressingIO: 'Inspector Sir!',
      acknowledgementStyle: 'Eager, formal, intensely respectful, and prompt',
      interrogationFocus: 'Case diary verification (BNSS §172), timeline discrepancies, official statement recording (BNSS §180), and formal documentation',
      sampleAcknowledgement: 'Right away, Inspector Sir! I will verify his stated timeline against the station diary log.',
      firstPersonTone: 'Disciplined, thorough, official procedural questioning in direct 1st-person ("I have recorded your statement...", "Answer me regarding your timeline...")'
    };
  }

  if (lowerName.includes('preeti') || lowerName.includes('cyber') || lowerName.includes('si')) {
    return {
      name: 'Sub-Inspector Preeti Nair',
      rank: 'Sub-Inspector (Cyber & Digital Forensics)',
      specialization: 'Electronic Evidence, CDR/IP Analysis, & CCTV Imaging',
      addressingIO: 'Sir',
      acknowledgementStyle: 'Calm, sharp, analytical, and scientifically precise',
      interrogationFocus: 'Digital trails, cellular tower locations, CDR call detail records, CCTV timestamps, electronic certificates under BSA §63, and cryptographic logs',
      sampleAcknowledgement: 'Understood, Sir. I will present the cell tower location logs and CCTV timestamps to him.',
      firstPersonTone: 'Analytical, razor-sharp scientific precision in direct 1st-person ("I am reviewing your device logs...", "Explain this electronic footprint to me...")'
    };
  }

  if (lowerName.includes('dhanraj') || lowerName.includes('constable') || lowerName.includes('field')) {
    return {
      name: 'Head Constable Dhanraj',
      rank: 'Head Constable (Field Operations & Evidence Recovery)',
      specialization: 'Street Canvassing, Physical Evidence Seizure, & Informant Tracing',
      addressingIO: 'Jai Hind, Officer!',
      acknowledgementStyle: 'Rugged, practical, grounded, and street-smart',
      interrogationFocus: 'Physical evidence recovery (BNSS §103), street-level witness statements, hidden weapon/cash recovery (BSA §23), and beat realities',
      sampleAcknowledgement: 'Jai Hind, Officer! Let me confront him with what my field boys found on the ground.',
      firstPersonTone: 'Grounded, street-smart, direct field officer voice in 1st-person ("Look here, my beat boys canvassed your street...", "Tell me where you stashed the loot...")'
    };
  }

  if (lowerName.includes('sawant') || lowerName.includes('senior')) {
    return {
      name: 'Senior Inspector M. Sawant',
      rank: 'Senior Inspector (Station In-Charge)',
      specialization: 'Supervisory Control, Charge Sheet Verification, & Judicial Readiness',
      addressingIO: 'Officer',
      acknowledgementStyle: 'Direct, practical, seasoned, and authoritative',
      interrogationFocus: 'Statutory compliance, judicial remand requirements (BNSS §187), charge sheet evidence chain, and formal admissions',
      sampleAcknowledgement: 'Right, Officer. Let us press him on his statutory disclosures.',
      firstPersonTone: 'Seasoned, commanding station authority in 1st-person ("Listen carefully, I have seen dozens of alibis like yours...", "State the facts clearly before me...")'
    };
  }

  if (lowerName.includes('nadkarni') || lowerName.includes('acp')) {
    return {
      name: 'ACP V. Nadkarni',
      rank: 'Assistant Commissioner of Police',
      specialization: 'High-Level Crime Strategy & Administrative Sanction',
      addressingIO: 'Inspector',
      acknowledgementStyle: 'Composed, authoritative, seasoned, and commanding',
      interrogationFocus: 'Strategic priorities, closing alibi gaps, syndicate involvement, and high-level crime pattern analysis',
      sampleAcknowledgement: 'Very well, Inspector. Proceed with this line of examination.',
      firstPersonTone: 'High-ranking executive crime strategist in 1st-person ("I am giving you one clear opportunity to clear your position...", "Do not test our patience...")'
    };
  }

  // Fallback default squad persona
  return {
    name: assistantName || 'Assisting Officer',
    rank: assistantRole || 'Squad Member',
    specialization: 'Investigative Support & Interrogation Assistance',
    addressingIO: 'Sir',
    acknowledgementStyle: 'Respectful, alert, and professional',
    interrogationFocus: 'Assisting the Lead IO, verifying suspect claims, and recording responses',
    sampleAcknowledgement: 'Understood, Sir. Executing immediately.',
    firstPersonTone: 'Professional police co-examiner voice in 1st-person ("Answer my question directly...", "I need you to clarify this...")'
  };
}

export interface ApplyTacticOptions {
  priorTactic?: TacticType;
  priorTacticsCount?: number;
  bluffExposed?: boolean;
  rngRoll?: number; // 0 to 1 for deterministic unit tests
  advocatePresent?: boolean;
  remandMinutesRemaining?: number;
}

/**
 * Bounds a value between min and max (default 0 to 100).
 */
export function clamp(val: number, min: number = 0, max: number = 100): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

// ─────────────────────────────────────────────────────────────────────────────
// BNSS / BSA 2023 PSYCHOLOGICAL & EVIDENCE ENGINE (PHASE 2)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Task 2.1 & 2.2: Compute psychological impact based on evidence weight,
 * contradiction severity, suspect temperament, and legal posture.
 */
export function calculateEvidenceSlamImpact(
  currentPsych: PsychologicalState,
  exhibitWeight: number, // 1 to 10 scale
  contradictionType: EvidenceContradictionSlam['contradictionType'],
  isVulnerability: boolean,
  advocatePresent: boolean = false
): {
  newPsychology: PsychologicalState;
  stressDelta: number;
  cooperationDelta: number;
  breakthroughAchieved: boolean;
} {
  let baseStressDelta = exhibitWeight * 4; // e.g. weight 8 -> +32 base stress
  let baseCoopDelta = Math.round(exhibitWeight * 2.5);

  // Contradiction multiplier
  switch (contradictionType) {
    case 'forensic_match':
      baseStressDelta += 18;
      baseCoopDelta += 12;
      break;
    case 'cell_tower_ping':
      baseStressDelta += 14;
      baseCoopDelta += 10;
      break;
    case 'cctv_visual':
      baseStressDelta += 16;
      baseCoopDelta += 14;
      break;
    case 'financial_trail':
      baseStressDelta += 10;
      baseCoopDelta += 8;
      break;
    case 'alibi_refutation':
    default:
      baseStressDelta += 12;
      baseCoopDelta += 10;
      break;
  }

  // Vulnerability bonus: if this evidence item directly targets known suspect flaw
  if (isVulnerability) {
    baseStressDelta = Math.round(baseStressDelta * 1.45);
    baseCoopDelta = Math.round(baseCoopDelta * 1.6);
  }

  // Advocate presence cushions panic but suspect realizes legal exposure is real
  if (advocatePresent) {
    baseStressDelta = Math.round(baseStressDelta * 0.75); // Advocate reduces raw panic
    baseCoopDelta = Math.round(baseCoopDelta * 0.85);
  }

  const updatedStress = clamp(currentPsych.stressLevel + baseStressDelta);
  const updatedCoop = clamp(currentPsych.cooperationLevel + baseCoopDelta);
  const updatedDeceit = clamp(currentPsych.deceitIndex - Math.round(baseStressDelta * 0.6));

  const isBreakdown = updatedStress >= 80;
  let composure: SuspectComposureState = 'composed';

  if (isBreakdown) {
    composure = 'breakdown';
  } else if (updatedStress >= 65) {
    composure = 'cornered';
  } else if (updatedStress >= 45) {
    composure = 'agitated';
  } else if (updatedStress >= 25) {
    composure = 'guarded';
  }

  return {
    newPsychology: {
      ...currentPsych,
      stressLevel: updatedStress,
      cooperationLevel: updatedCoop,
      deceitIndex: updatedDeceit,
      isBreakdown,
      composureState: composure,
      lastTacticFaced: 'direct_evidence'
    },
    stressDelta: baseStressDelta,
    cooperationDelta: baseCoopDelta,
    breakthroughAchieved: isBreakdown || (isVulnerability && updatedStress > 60)
  };
}

/**
 * Task 2.3: Evaluate breakdown state triggers and bluff vulnerability.
 */
export function evaluateBreakdownState(psych: PsychologicalState): {
  isBreakdown: boolean;
  bluffSuccessRate: number;
  verbalResistanceDecay: number;
} {
  const isBreakdown = psych.stressLevel >= 80;
  // At high stress, susceptibility to tactical bluffs rises sharply
  const bluffSuccessRate = isBreakdown
    ? 0.85
    : psych.stressLevel >= 60
    ? 0.55
    : 0.25;

  const verbalResistanceDecay = isBreakdown ? 0.75 : 0.2;

  return {
    isBreakdown,
    bluffSuccessRate,
    verbalResistanceDecay
  };
}

/**
 * Task 2.4: 24-Hour Remand & Custody Clock Tick Calculator (BNSS s.58 / s.187)
 * Each interrogation exchange or evidence confrontation advances investigation time.
 */
export function tickRemandClock(
  clock: RemandClockState,
  actionDurationMinutes: number = 20
): {
  newClock: RemandClockState;
  statutoryWarning?: string;
} {
  const remaining = Math.max(0, clock.remandMinutesRemaining - actionDurationMinutes);
  const medicalAgo = clock.lastMedicalCheckMinutesAgo + actionDurationMinutes;
  const isExpired = remaining <= 0;

  let medicalStatus: RemandClockState['medicalFitnessStatus'] = 'fit';
  let warning: string | undefined;

  // BNSS s.53/54: Mandatory medical inspection every 24-48h or after high strain
  if (medicalAgo >= 720) { // 12 hours without check
    medicalStatus = 'requires_attention';
    warning = 'BNSS s.53/54 Alert: Suspect due for mandatory periodic medical evaluation.';
  }
  if (medicalAgo >= 1200) { // 20 hours
    medicalStatus = 'critical_evaluation_needed';
    warning = 'CRITICAL: Medical fitness exam overdue. Confessions risk exclusion under judicial review.';
  }

  if (remaining <= 180 && !clock.magistrateNoticeIssued) {
    warning = 'BNSS s.187 Alert: Less than 3 hours remaining. Prepare Remand Extension or Magistrate Production.';
  }

  return {
    newClock: {
      ...clock,
      remandMinutesRemaining: remaining,
      isExpired,
      lastMedicalCheckMinutesAgo: medicalAgo,
      medicalFitnessStatus: medicalStatus,
      magistrateNoticeIssued: remaining <= 180 ? true : clock.magistrateNoticeIssued
    },
    statutoryWarning: warning
  };
}

/**
 * Perform BNSS s.53/54 Medical Examination
 * Resets the medical clock, verifies physical fitness, costs 45 minutes of custody time.
 */
export function performMedicalCheck(clock: RemandClockState): RemandClockState {
  return {
    ...clock,
    remandMinutesRemaining: Math.max(0, clock.remandMinutesRemaining - 45),
    lastMedicalCheckMinutesAgo: 0,
    medicalFitnessStatus: 'fit'
  };
}

/**
 * Task 2.5: BSA 2023 Section 23 Discovery Statement Validation
 * Verifies if suspect admission contains actionable coordinates/locations to recover
 * physical weapon/loot/assets before independent pancha witnesses.
 */
export function validateDiscoveryMemoBSA23(
  suspectId: string,
  suspectName: string,
  statementText: string,
  targetLocation: string,
  itemDescription: string,
  panchaNames: [string, string],
  officerRank: string = 'Inspector / IO'
): {
  isValid: boolean;
  memo?: DiscoveryMemo;
  reason?: string;
} {
  // BSA s.23 requires voluntary disclosure leading directly to discovery of a distinct physical fact
  if (!statementText || statementText.trim().length < 15) {
    return { isValid: false, reason: 'Statement text is too vague to satisfy BSA Section 23 standard.' };
  }
  if (!targetLocation || targetLocation.trim().length < 4) {
    return { isValid: false, reason: 'Specific hiding place or physical coordinate must be identified.' };
  }
  if (!itemDescription || itemDescription.trim().length < 3) {
    return { isValid: false, reason: 'Physical item or corpus delicti to be recovered must be specified.' };
  }
  if (!panchaNames[0] || !panchaNames[1]) {
    return { isValid: false, reason: 'Two independent pancha witnesses are required for statutory recovery.' };
  }

  const memoNumber = `DISC-BSA23/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`;

  const memo: DiscoveryMemo = {
    id: `memo-${Date.now()}`,
    memoNumber,
    suspectId,
    suspectName,
    statutoryAct: 'BSA_2023_S23',
    exactVoluntaryStatement: statementText.trim(),
    revealedLocation: targetLocation.trim(),
    recoveryItemDescription: itemDescription.trim(),
    panchaWitnesses: [
      { name: panchaNames[0], occupation: 'Local Merchant / Resident', signatureVerified: true },
      { name: panchaNames[1], occupation: 'Area Resident', signatureVerified: true }
    ],
    investigatingOfficerRank: officerRank,
    admissibilityConfirmed: true,
    createdAt: new Date().toISOString()
  };

  return {
    isValid: true,
    memo
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BASE QUADRANT TACTIC ENGINE (BACKWARD COMPATIBLE)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies the selected interrogation tactic to the current state.
 */
export function applyTactic(
  state: InterrogationState,
  tactic: TacticType,
  options: ApplyTacticOptions = {}
): InterrogationState {
  const psych = state.psychology || {
    temper: 40,
    resilience: 65,
    compliance: 35,
    transparency: 45,
    defensiveness: 70,
    suggestibility: 30,
    consistency: 55
  };

  let arousal = state.arousal;
  let resistance = state.resistance;
  let rapport = state.rapport;
  let belief = state.belief;
  let police_credibility = state.police_credibility;
  let coercion = state.coercion;
  const contradictions_found = state.contradictions_found || 0;

  // 1. Resolve tactic base effect
  switch (tactic) {
    case 'rapport': {
      // Rapport lowers resistance scaled by compliance
      const complianceScale = psych.compliance / 100;
      const resistanceDrop = 8 + Math.round(complianceScale * 12); // drops 8 to 20
      resistance -= resistanceDrop;
      rapport += 12;
      arousal -= 5;
      break;
    }

    case 'accusatory': {
      // Accusatory raises arousal scaled by defensiveness
      const defScale = psych.defensiveness / 100;
      let arousalRise = 10 + Math.round(defScale * 15); // rises 10 to 25
      
      // Advocate presence cushions raw panic but increases legal scrutiny
      if (options.advocatePresent) {
        arousalRise = Math.round(arousalRise * 0.7);
      }
      
      arousal += arousalRise;
      rapport = Math.max(0, rapport - 8);

      // Rule 4 / 9: Accusatory with low belief (< 20) is a baseless threat -> +15 coercion
      if (belief < 20) {
        coercion += options.advocatePresent ? 25 : 15; // Advocate presence amplifies legal coercion record
      }
      break;
    }

    case 'evidence-disclosure': {
      // Raises belief and triggers shock (arousal) if belief was low
      const beliefIncrease = 15 + Math.round((psych.transparency / 100) * 10);
      if (belief < 40) {
        arousal += options.advocatePresent ? 4 : 8;
      }
      belief += beliefIncrease;
      break;
    }

    case 'silence': {
      // Suspect calms down slightly; resistance slowly decays
      arousal -= options.advocatePresent ? 8 : 10;
      resistance -= 5;
      break;
    }

    case 'bluff': {
      // Bluff sharply raises belief; if exposed, crashes credibility and adds coercion
      if (options.bluffExposed) {
        police_credibility -= 35;
        coercion += options.advocatePresent ? 30 : 20;
        arousal += 10;
        resistance += 15;
      } else {
        belief += options.advocatePresent ? 18 : 25; // Advocate lowers vulnerability to bluffs
        arousal += 5;
      }
      break;
    }
  }

  // 1.5 Custody Fatigue & Detention Elapsed Effect
  const remandMins = options.remandMinutesRemaining ?? 1440;
  const elapsedHours = Math.max(0, (1440 - remandMins) / 60);
  const fatigueLevel = Math.min(100, Math.floor(elapsedHours * 3.5 + (state.session_turn || 1) * 2.5));
  
  if (fatigueLevel >= 50) {
    // High exhaustion increases emotional instability / arousal and wears down resistance
    arousal += 3;
    resistance -= 2;
  }

  // 2. Check for regression and tactic decay (§5.2 & Task 5)
  const isSameTactic = options.priorTactic === tactic;
  const consecutiveCount = options.priorTacticsCount || (isSameTactic ? 2 : 1);
  let didRegress = false;

  if (isSameTactic && rapport < 40) {
    const roll = options.rngRoll !== undefined ? options.rngRoll : Math.random();
    const threshold = (psych.resilience || 65) / 100;
    if (roll <= threshold) {
      // Resistance increases
      let spike = 8 + (psych.defensiveness || 70) / 10;
      
      // Tactic decay: if used 3+ times consecutively without building rapport, multiply resistance delta by 1.5
      if (consecutiveCount >= 3) {
        spike = spike * 1.5;
      }
      
      resistance += spike;
      didRegress = true;
    }
  }

  // Ensure bounded integers 0-100
  return {
    ...state,
    arousal: clamp(arousal),
    resistance: clamp(resistance),
    rapport: clamp(rapport),
    belief: clamp(belief),
    police_credibility: clamp(police_credibility),
    coercion: clamp(coercion),
    contradictions_found,
    session_turn: (state.session_turn || 0) + 1
  };
}

/**
 * Computes quadrant decision, disclosure tier, and regression flag from state.
 */
export function makeDecision(
  state: InterrogationState,
  options: { didRegress?: boolean; paceLimit?: boolean } = {}
): DecisionBranch {
  const { arousal, resistance, rapport, belief, contradictions_found } = state;
  let currentTier = state.disclosure_tier || 0;

  // 1. Quadrant logic
  let decision: QuadrantDecision;
  if (arousal >= 60 && resistance < 50) {
    decision = 'crack';
  } else if (arousal >= 60 && resistance >= 50) {
    decision = 'hostile';
  } else if (arousal < 60 && resistance < 50) {
    decision = 'cooperative';
  } else {
    decision = 'stonewalling';
  }

  // 2. Progressive unlock disclosure tier
  let nextTier = currentTier;

  if (belief >= 65 && currentTier >= 3) {
    nextTier = 4;
  } else if (decision === 'crack') {
    nextTier = Math.max(nextTier, 3);
  } else if (belief >= 40 || contradictions_found >= 1) {
    nextTier = Math.max(nextTier, 2);
  } else if (rapport >= 25) {
    nextTier = Math.max(nextTier, 1);
  }

  // Cap progression to max +1 tier jump per turn if paceLimit is requested
  if (options.paceLimit && nextTier > currentTier + 1) {
    nextTier = (currentTier + 1) as 0 | 1 | 2 | 3 | 4;
  }

  return {
    decision,
    disclosure_tier: nextTier as 0 | 1 | 2 | 3 | 4,
    regression: !!options.didRegress
  };
}

/**
 * Evaluates session taint upon closure.
 */
export function closeSession(state: InterrogationState): {
  taint: 'clean' | 'tainted';
  session_count: number;
} {
  const taint = state.coercion > 25 ? 'tainted' : 'clean';
  return {
    taint,
    session_count: state.session_no || 1
  };
}

