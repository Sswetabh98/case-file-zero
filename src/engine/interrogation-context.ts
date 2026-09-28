export interface PsychologyProfile {
  temper: number;
  resilience: number;
  compliance: number;
  transparency: number;
  defensiveness: number;
  suggestibility: number;
  consistency: number;
}

export interface InterrogationTurn {
  speaker?: string;
  tactic?: string;
  statement?: string;
  reply?: string;
  arousal_before?: number;
  arousal_after?: number;
  resistance_before?: number;
  resistance_after?: number;
  decision?: string;
  disclosure_unlocked?: number;
  contradiction_found?: boolean;
  regression?: boolean;
}

export interface InterrogationState {
  arousal: number;
  resistance: number;
  rapport: number;
  belief: number;
  police_credibility: number;
  coercion: number;
  disclosure_tier: 0 | 1 | 2 | 3 | 4;
  session_turn: number;
  psychology: PsychologyProfile;
  contradictions_found: number;
  session_no?: number;
  fatigue_level?: number; // 0 to 100 physical/mental exhaustion
  advocate_present?: boolean;
  advocate_interventions_count?: number;
}

/**
 * 1. suspectStateNarrative
 * Returns a label and plain English description of the suspect's current quadrant.
 */
export function suspectStateNarrative(state: Partial<InterrogationState>): string {
  const arousal = state.arousal ?? 20;
  const resistance = state.resistance ?? 65;

  if (arousal >= 60 && resistance < 50) {
    return "CRACKING: You are panicking and overwhelmed. Your resistance is crumbling under the pressure, and you feel the urge to spill partial truths.";
  }
  if (arousal >= 60 && resistance >= 50) {
    return "HOSTILE: You are angry, cornered, and combative. The officer's pressure triggers your fight response; you push back aggressively.";
  }
  if (arousal < 60 && resistance < 50) {
    return "COOPERATIVE: You are calm, measured, and open. You want to de-escalate and find a reasonable way out through conversation.";
  }
  return "STONEWALLING: You are cold, detached, and guarded. You give nothing away and intend to wait the officer out in resolute silence.";
}

/**
 * 2. strategicPosition
 * Explains what the suspect believes about police evidence and their own survival odds.
 */
export function strategicPosition(state: Partial<InterrogationState>, beliefOverride?: number): string {
  const belief = beliefOverride ?? state.belief ?? 30;

  if (belief < 30) {
    return "You believe the police are fishing with virtually no hard evidence. Your survival strategy is absolute denial.";
  }
  if (belief < 55) {
    return "You believe the police have only fragmented circumstantial leads. You are gambling on evading specific timeline questions.";
  }
  if (belief < 75) {
    return "You believe the police have substantive evidence placing you near the scene. You are hedging and minimizing your direct involvement.";
  }
  return "You believe the police possess overwhelming proof. Outright denial is no longer viable; you are shifting into urgent damage control.";
}

/**
 * 3. pressureGauge
 * Warns if tactics are repeating and how resistance responds to that pattern.
 */
export function pressureGauge(state: Partial<InterrogationState>, priorTurns: InterrogationTurn[] = []): string {
  if (!priorTurns || priorTurns.length < 2) {
    return "Interrogation pacing is measured. No repetitive tactic pressure detected.";
  }

  const lastTurn = priorTurns[priorTurns.length - 1];
  const prevTurn = priorTurns[priorTurns.length - 2];

  if (lastTurn?.tactic && prevTurn?.tactic && lastTurn.tactic === prevTurn.tactic) {
    return `Repeated pressure detected: The officer has used the "${lastTurn.tactic}" approach multiple times consecutively. Your resistance is entrenching against this predictable pattern.`;
  }

  return "The officer is varying their approach. Suspect composure remains under dynamic observation.";
}

/**
 * 4. emotionalMoment
 * Returns a prose description of current physical and emotional state based on arousal & psychology.
 */
export function emotionalMoment(state: Partial<InterrogationState>, psychology?: Partial<PsychologyProfile>): string {
  const arousal = state.arousal ?? 20;
  const resistance = state.resistance ?? 65;
  const psych = psychology || state.psychology || { temper: 40, defensiveness: 70, resilience: 65 };

  if (arousal >= 75) {
    if ((psych.defensiveness ?? 50) >= 60) {
      return "Your pulse is racing and your fists are clenched. You feel trapped and defensive, glaring directly at the officer with barely restrained fury.";
    }
    return "You are trembling with high anxiety. Your breathing is shallow, sweat is beading on your forehead, and your composure is fracturing.";
  }

  if (arousal >= 50) {
    return "You are visibly on edge, shifting uncomfortably in your chair and carefully weighing every word before speaking.";
  }

  if (resistance >= 65) {
    return "You are eerily still and composed. Your arms are folded, your expression is blank, and you project complete indifference.";
  }

  return "You appear relaxed and compliant, maintaining steady eye contact and speaking in a calm, conversational tone.";
}

/**
 * 5. beliefDecoder
 * Translates the belief percentage into concrete suspect behavioral guidance.
 */
export function beliefDecoder(beliefInput?: number): string {
  const belief = beliefInput ?? 30;

  if (belief <= 25) {
    return "You think the police know almost nothing (belief under 25%). Stick firmly to your alibi and concede nothing.";
  }
  if (belief <= 50) {
    return `You suspect the police hold incomplete records or witness sightings (belief ~${belief}%). Avoid specific times or locations but maintain innocence.`;
  }
  if (belief <= 75) {
    return `You realize the police have solid corroborating leads (belief ~${belief}%). Acknowledge only what they can prove while deflecting criminal intent.`;
  }
  return `You recognize that the police have you completely cornered (belief ~${belief}%). Full denial has collapsed; self-preservation dictates cooperating on key details.`;
}

/**
 * 6. tacticResonance
 * Describes how the officer's current tactic lands given the suspect's current state and psychology.
 */
export function tacticResonance(
  state: Partial<InterrogationState>,
  currentTactic?: string,
  priorTactic?: string
): string {
  const tactic = currentTactic || "rapport";
  const psych = state.psychology || { compliance: 35, defensiveness: 70 };

  switch (tactic) {
    case "rapport":
      if ((psych.compliance ?? 35) >= 50) {
        return "The officer's empathetic tone lowers your guard slightly, making you more willing to explain your perspective.";
      }
      return "The officer is attempting to build rapport, but you view this friendliness as a transparent interrogation tactic.";

    case "accusatory":
      if ((psych.defensiveness ?? 70) >= 60) {
        return "The direct accusation directly attacks your pride, instantly triggering your defensive instincts to wall up.";
      }
      return "The forceful accusation increases your stress levels, making you hesitant and guarded.";

    case "evidence-disclosure":
      if ((state.belief ?? 30) >= 50) {
        return "The exhibit presented directly threatens your narrative, forcing you to reconsider what else the police already possess.";
      }
      return "The evidence shown seems circumstantial; you remain skeptical of whether they have anything concrete.";

    case "silence":
      return "The heavy silence in the room builds psychological tension, but allows you a brief moment to regain mental composure.";

    case "bluff":
      return "The officer makes a high-stakes claim. You are searching their demeanor to determine if they are bluffing.";

    default:
      return "The officer's question lands neutrally, prompting a cautious response.";
  }
}

/**
 * 7. Interrogation Session Ledger & Established Disclosures Tracker
 */
export interface InterrogationSessionLedger {
  concessions: Array<{ turn: number; topic: string; summary: string }>;
  namedAccomplices: string[];
  disclosedLocations: string[];
  disclosedArticles: string[];
  recantedAlibis: string[];
  confrontedExhibitsList: string[];
  courtesyState: {
    waterOffered: boolean;
    teaOffered: boolean;
    waterAccepted: boolean;
    recessGranted: boolean;
  };
  ledgerSummary: string;
}

/**
 * Extracts and maintains the full established admissions and disclosures ledger
 * across ALL turns of the interrogation room transcript.
 */
export function extractInterrogationRoomLedger(
  transcript: any[] = [],
  state?: Partial<InterrogationState>,
  snap?: any
): InterrogationSessionLedger {
  const concessions: Array<{ turn: number; topic: string; summary: string }> = [];
  const namedAccomplices: string[] = [];
  const disclosedLocations: string[] = [];
  const disclosedArticles: string[] = [];
  const recantedAlibis: string[] = [];
  const confrontedExhibitsList: string[] = [];

  let waterOffered = false;
  let teaOffered = false;
  let waterAccepted = false;
  let recessGranted = false;

  const confronted = getConfrontedEvidenceContext(transcript, snap);
  if (confronted.confrontedCount > 0) {
    confronted.confrontedSummary.split('\n').slice(1).forEach(line => {
      const cleanLine = line.replace(/^-\s*/, '').trim();
      if (cleanLine && !confrontedExhibitsList.includes(cleanLine)) {
        confrontedExhibitsList.push(cleanLine);
      }
    });
  }

  // Scan every turn in chronological order
  transcript.forEach((t: any, idx: number) => {
    const text = t.text || '';
    const turnNo = t.turn || idx + 1;
    const lower = text.toLowerCase();

    // Check officer courtesy gestures
    if (t.speaker === 'officer' || t.speaker === 'assistant') {
      if (lower.includes('water') || lower.includes('paani')) waterOffered = true;
      if (lower.includes('tea') || lower.includes('chai') || lower.includes('coffee')) teaOffered = true;
      if (lower.includes('recess') || lower.includes('rest') || lower.includes('break')) recessGranted = true;
    }

    // Check suspect replies for admissions & concessions
    if (t.speaker === 'suspect') {
      if (lower.includes('thank') && (lower.includes('water') || lower.includes('tea') || lower.includes('sip'))) {
        waterAccepted = true;
      }

      // Check semantic tags: [[alibi:...]], [[evidence:...]], [[person:...]], [[contradiction:...]], [[location:...]]
      const tagRegex = /\[\[(alibi|evidence|person|contradiction|location):([^|\]]+)\|([^|\]]+)\|([^\]]+)\]\]/g;
      let match: RegExpExecArray | null;
      while ((match = tagRegex.exec(text)) !== null) {
        const tagType = match[1];
        const tagNote = match[4].trim();

        if (tagType === 'person') {
          if (!namedAccomplices.includes(tagNote)) namedAccomplices.push(tagNote);
          concessions.push({ turn: turnNo, topic: 'Accomplice Disclosed', summary: tagNote });
        } else if (tagType === 'location') {
          if (!disclosedLocations.includes(tagNote)) disclosedLocations.push(tagNote);
          concessions.push({ turn: turnNo, topic: 'Physical Stash Locus Disclosed', summary: tagNote });
        } else if (tagType === 'evidence') {
          if (!disclosedArticles.includes(tagNote)) disclosedArticles.push(tagNote);
          concessions.push({ turn: turnNo, topic: 'Weapon / Stolen Article Disclosed', summary: tagNote });
        } else if (tagType === 'contradiction' || tagType === 'alibi') {
          if (!recantedAlibis.includes(tagNote)) recantedAlibis.push(tagNote);
          concessions.push({ turn: turnNo, topic: 'Alibi Recanted / Modified', summary: tagNote });
        }
      }

      // Contextual admission detection if tags were not used
      if (lower.includes('nitin') || lower.includes('bhosale')) {
        const note = 'Named Nitin Bhosale (Sunrise Logistics) as co-conspirator who paid bribe';
        if (!namedAccomplices.includes(note)) {
          namedAccomplices.push(note);
          concessions.push({ turn: turnNo, topic: 'Accomplice Disclosed', summary: note });
        }
      }

      if (lower.includes('transformer') || (lower.includes('water tank') && lower.includes('shed'))) {
        const note = 'Concealment location behind transformer shed near municipal water tank under concrete slabs';
        if (!disclosedLocations.includes(note)) {
          disclosedLocations.push(note);
          concessions.push({ turn: turnNo, topic: 'Stash Location Disclosed (BSA §23)', summary: note });
        }
      }

      if (lower.includes('duffel') || lower.includes('lock-cutter') || lower.includes('bolt cutter') || lower.includes('cash box')) {
        const note = 'Disclosed handling grey duffel bag with iron lock-cutter and stolen cash';
        if (!disclosedArticles.includes(note)) {
          disclosedArticles.push(note);
          concessions.push({ turn: turnNo, topic: 'Crime Articles Disclosed', summary: note });
        }
      }

      if (lower.includes('desk bottom drawer') || lower.includes('duplicate register')) {
        const note = 'Disclosed duplicate register extract and cash envelope hidden in desk bottom drawer';
        if (!disclosedLocations.includes(note)) {
          disclosedLocations.push(note);
          concessions.push({ turn: turnNo, topic: 'Document Location Disclosed', summary: note });
        }
      }

      if (lower.includes('lied about') || lower.includes('short on money') || lower.includes('only agreed to hold') || lower.includes('cut the lock')) {
        const note = 'Recanted initial innocent alibi; admitted presence/involvement as paid participant';
        if (!recantedAlibis.includes(note)) {
          recantedAlibis.push(note);
          concessions.push({ turn: turnNo, topic: 'Prior Alibi Recanted', summary: note });
        }
      }
    }
  });

  // Build Comprehensive Ledger Summary String
  const summaryLines: string[] = [];

  if (concessions.length > 0) {
    summaryLines.push("1. CONCESSIONS & ADMISSIONS ALREADY RECORDED IN THIS ROOM:");
    concessions.forEach(c => {
      summaryLines.push(`   - [Turn ${c.turn}] ${c.topic}: "${c.summary}"`);
    });
  } else {
    summaryLines.push("1. CONCESSIONS & ADMISSIONS: None recorded yet (maintaining initial cover alibi).");
  }

  if (confrontedExhibitsList.length > 0) {
    summaryLines.push("\n2. EXPLICITLY CONFRONTED POLICE EVIDENCE ON THE TABLE:");
    confrontedExhibitsList.forEach(ex => {
      summaryLines.push(`   - ${ex}`);
    });
  } else {
    summaryLines.push("\n2. CONFRONTED EVIDENCE: General questioning only; no physical exhibits placed on table yet.");
  }

  summaryLines.push("\n3. ROOM COURTESY & SESSION STATE:");
  summaryLines.push(`   - Refreshments: ${waterAccepted ? 'Water accepted and consumed by suspect' : waterOffered ? 'Water offered by officers' : teaOffered ? 'Tea offered by officers' : 'None yet'}`);
  summaryLines.push(`   - Defense Advocate: ${state?.advocate_present ? 'Present in room under BNSS §41D' : 'No advocate seated in room'}`);
  summaryLines.push(`   - Custody Fatigue: ${state?.fatigue_level ? `${state.fatigue_level}%` : 'Normal alertness'}`);

  return {
    concessions,
    namedAccomplices,
    disclosedLocations,
    disclosedArticles,
    recantedAlibis,
    confrontedExhibitsList,
    courtesyState: {
      waterOffered,
      teaOffered,
      waterAccepted,
      recessGranted
    },
    ledgerSummary: summaryLines.join('\n')
  };
}

/**
 * 7. sessionContinuity
 * Summarizes prior key admissions, contradiction exposure, and the active disclosure ceiling.
 */
export function sessionContinuity(
  turns: InterrogationTurn[] = [],
  disclosureTierInput?: number,
  ledger?: InterrogationSessionLedger
): string {
  const tier = disclosureTierInput ?? 0;
  const lines: string[] = [];

  if (ledger && ledger.concessions.length > 0) {
    lines.push("ESTABLISHED INTERROGATION ROOM CONCESSIONS (YOU CANNOT UN-SAY THESE):");
    ledger.concessions.slice(-5).forEach(c => {
      lines.push(`- [Turn ${c.turn}] ${c.topic}: ${c.summary}`);
    });
  } else if (turns.length > 0) {
    const recent = turns.slice(-3);
    lines.push("SESSION RECAP (Maintain consistency with prior statements):");
    recent.forEach((t) => {
      if (t.statement && t.reply) {
        lines.push(`- Previous Exchange: Officer asked about "${t.statement.substring(0, 60)}..." -> You stated: "${t.reply.substring(0, 80)}..."`);
      }
    });
  } else {
    lines.push("SESSION INITIATION: No prior exchanges recorded in this session. Maintain your initial stated alibi.");
  }

  lines.push(`DISCLOSURE CEILING: Tier ${tier} maximum. Under no circumstances may you reveal facts beyond Tier ${tier} in this turn.`);

  return lines.join("\n");
}

/**
 * 8. getConfrontedEvidenceContext
 * Scans the interrogation transcript to determine which specific exhibits,
 * CCTV locations, cell towers, or witness claims officers have explicitly presented in the room.
 * Ensures secret unpresented police evidence remains completely hidden from the suspect's prompt.
 */
export function getConfrontedEvidenceContext(transcript: any[] = [], snap: any = {}): {
  confrontedSummary: string;
  confrontedCount: number;
} {
  if (!transcript || transcript.length === 0) {
    return {
      confrontedSummary: "No police evidence, CCTV feeds, or witness statements have been explicitly presented or confronted in the room yet.",
      confrontedCount: 0
    };
  }

  // Combine all dialogue spoken by officers or assistants
  const officerStatements = transcript
    .filter((t: any) => t.speaker === 'officer' || t.speaker === 'assistant' || (t.text && t.text.includes('(')))
    .map((t: any) => (t.text || '').toLowerCase());

  const officerTextBlob = officerStatements.join(' ');

  // Match known exhibits
  const exhibits = snap.exhibits || [];
  const confrontedExhibits = exhibits.filter((ex: any) => {
    const nameLower = (ex.name || '').toLowerCase();
    const codeLower = (ex.code || '').toLowerCase();
    const descLower = (ex.description || '').toLowerCase();
    return (nameLower && officerTextBlob.includes(nameLower)) ||
           (codeLower && officerTextBlob.includes(codeLower)) ||
           (descLower && descLower.split(/\s+/).some((word: string) => word.length > 5 && officerTextBlob.includes(word)));
  });

  // Check for common investigative triggers mentioned by officers
  const triggers: string[] = [];
  if (officerTextBlob.includes('cctv') || officerTextBlob.includes('camera') || officerTextBlob.includes('footage')) {
    triggers.push("CCTV / Video Surveillance Feeds");
  }
  if (officerTextBlob.includes('cell tower') || officerTextBlob.includes('cdr') || officerTextBlob.includes('mobile tower') || officerTextBlob.includes('phone record')) {
    triggers.push("Cell Tower Pings & Mobile CDR Logs");
  }
  if (officerTextBlob.includes('witness') || officerTextBlob.includes('shopkeeper') || officerTextBlob.includes('watchman') || officerTextBlob.includes('vendor')) {
    triggers.push("Eyewitness / Beat Canvassing Statements");
  }
  if (officerTextBlob.includes('duffel') || officerTextBlob.includes('grey bag') || officerTextBlob.includes('lock cutter') || officerTextBlob.includes('cutter') || officerTextBlob.includes('cash')) {
    triggers.push("Physical Articles / Seized Exhibits");
  }

  const itemsList: string[] = [];
  confrontedExhibits.forEach((ex: any) => itemsList.push(`- Exhibit ${ex.code || ''}: ${ex.name} (${ex.short_desc || ex.type || 'Physical Exhibit'})`));
  triggers.forEach((tr: string) => {
    if (!itemsList.some(item => item.includes(tr))) {
      itemsList.push(`- ${tr} (explicitly cited by questioning officers)`);
    }
  });

  if (itemsList.length === 0) {
    return {
      confrontedSummary: "Officers have engaged in general questioning, but have not yet explicitly produced or cited specific physical exhibits or forensic reports in the room.",
      confrontedCount: 0
    };
  }

  return {
    confrontedSummary: `The questioning officers have explicitly confronted you with the following evidence/facts in this room:\n${itemsList.join('\n')}`,
    confrontedCount: itemsList.length
  };
}

/**
 * 9. getCustodyFatigueContext
 * Calculates physical/mental exhaustion based on total detention time (Remand Clock),
 * consecutive turns, and time since last mandatory medical examination under BNSS §54.
 */
export function getCustodyFatigueContext(
  remandMinutesRemaining: number = 1440,
  sessionTurn: number = 1,
  advocatePresent: boolean = false
): {
  fatigueScore: number; // 0 to 100
  fatigueLabel: string;
  fatigueDescription: string;
} {
  // Total detention elapsed in hours (out of 24h / 1440 mins)
  const elapsedMinutes = Math.max(0, 1440 - remandMinutesRemaining);
  const elapsedHours = elapsedMinutes / 60;

  // Base fatigue increases with hours in custody + turns
  let fatigue = Math.min(100, Math.floor(elapsedHours * 3.5 + sessionTurn * 2.5));

  // Advocate presence mitigates emotional panic and prevents illegal pressure fatigue spikes
  if (advocatePresent) {
    fatigue = Math.max(0, fatigue - 15);
  }

  let label = "RESTED & ALERT";
  let desc = "You have been in custody for a short duration. You feel physically alert, mentally sharp, and ready to handle questioning.";

  if (fatigue >= 75) {
    label = "SEVERE EXHAUSTION (CUSTODY FATIGUE)";
    desc = `You have been detained for over ${Math.floor(elapsedHours)} hours under intense interrogation. Your eyes are bloodshot, your body aches, and fatigue makes it difficult to maintain complex lies.`;
  } else if (fatigue >= 50) {
    label = "MODERATE FATIGUE";
    desc = `You have spent ${Math.floor(elapsedHours)} hours in police custody. Weariness is setting in, making you irritable and prone to slip-ups if pressed repeatedly.`;
  } else if (fatigue >= 25) {
    label = "MILD STRAIN";
    desc = "The police station atmosphere and ongoing questioning are taking a mild toll on your focus.";
  }

  return {
    fatigueScore: fatigue,
    fatigueLabel: label,
    fatigueDescription: desc
  };
}

import { AdvocateProfile, AdvocatePosture } from '../types/game';

export interface AdvocateIntervention {
  advocateName: string;
  statute: string;
  type: 'objection' | 'warning' | 'advisory' | 'recess_demand';
  statement: string;
  coercionPenalty: number;
  actionHint?: string;
}

export const DEFAULT_ADVOCATES: Record<string, AdvocateProfile> = {
  sharma: {
    id: 'adv-sharma',
    name: 'Adv. Rajeshwar Sharma',
    barCouncilNumber: 'BCI/D/2011/5820',
    specialization: 'Senior Constitutional & Criminal Defense Counsel',
    demeanor: 'constitutionalist',
    alertnessLevel: 45,
    currentPosture: 'observing',
    postureDescription: 'Seated within visual range under BNSS §41D, scrutinizing questioning protocol.',
    notesLogged: []
  },
  sen: {
    id: 'adv-sen',
    name: 'Adv. Meera Sen',
    barCouncilNumber: 'BCI/MH/2016/9412',
    specialization: 'Legal Aid Counsel & Human Rights Advocate',
    demeanor: 'legal_aid_guardian',
    alertnessLevel: 55,
    currentPosture: 'observing',
    postureDescription: 'Monitoring custodial wellness and physical stamina under BNSS §54/§58.',
    notesLogged: []
  },
  merchant: {
    id: 'adv-merchant',
    name: 'Adv. Farhan Merchant',
    barCouncilNumber: 'BCI/K/2014/3391',
    specialization: 'Trial Strategist & Financial/Cyber Crime Specialist',
    demeanor: 'aggressive_defense',
    alertnessLevel: 60,
    currentPosture: 'taking_notes',
    postureDescription: 'Maintaining contemporaneous notes of exhibit chains and officer assertions.',
    notesLogged: []
  }
};

/**
 * Returns an assigned advocate profile for a given suspect based on background or custom override.
 */
export function getAdvocateProfileForSuspect(suspect?: { id?: string; name?: string; role?: string; advocate?: AdvocateProfile }): AdvocateProfile {
  if (suspect?.advocate) {
    return { ...suspect.advocate };
  }

  const role = (suspect?.role || '').toLowerCase();
  const name = (suspect?.name || '').toLowerCase();

  if (role.includes('finance') || role.includes('accountant') || role.includes('cyber') || role.includes('tech') || name.includes('merchant')) {
    return { ...DEFAULT_ADVOCATES.merchant };
  }
  if (role.includes('driver') || role.includes('courier') || role.includes('helper') || role.includes('clerk') || role.includes('guard')) {
    return { ...DEFAULT_ADVOCATES.sen };
  }
  return { ...DEFAULT_ADVOCATES.sharma };
}

/**
 * Evaluates live advocate alertness level, posture, and description
 */
export function computeAdvocatePosture(
  advocate: AdvocateProfile,
  suspectStress: number,
  fatigueScore: number,
  coercionPenalty: number,
  lastIntervention?: AdvocateIntervention | null
): { alertnessLevel: number; currentPosture: AdvocatePosture; postureDescription: string } {
  let alertness = 30;

  if (suspectStress >= 75) alertness += 30;
  else if (suspectStress >= 50) alertness += 15;

  if (fatigueScore >= 80) alertness += 35;
  else if (fatigueScore >= 50) alertness += 20;

  if (coercionPenalty > 20) alertness += 25;
  else if (coercionPenalty > 0) alertness += 10;

  alertness = Math.min(100, Math.max(10, alertness));

  let posture: AdvocatePosture = 'observing';
  let desc = `${advocate.name} is seated within visual range under BNSS §41D, observing calmly.`;

  if (lastIntervention?.type === 'recess_demand' || fatigueScore >= 80) {
    posture = 'demanding_recess';
    desc = `${advocate.name} is on their feet, citing BNSS §54 to demand an immediate medical recess for the exhausted suspect.`;
  } else if (lastIntervention?.type === 'objection' || alertness >= 85) {
    posture = 'formal_objection';
    desc = `${advocate.name} has raised a formal objection against procedural/coercive overreach under Article 20(3).`;
  } else if (lastIntervention?.type === 'advisory' || (suspectStress >= 70 && alertness >= 60)) {
    posture = 'advising_client';
    desc = `${advocate.name} leans in, quietly advising the client to answer only proven facts and refrain from speculation.`;
  } else if (alertness >= 45) {
    posture = 'taking_notes';
    desc = `${advocate.name} is actively taking contemporaneous notes on a legal pad for the Case Diary record.`;
  }

  return {
    alertnessLevel: alertness,
    currentPosture: posture,
    postureDescription: desc
  };
}

/**
 * 10. getAdvocateIntervention
 * Evaluates whether the defense advocate intervenes or raises a formal statutory objection
 * under BNSS §41D / Article 20(3) of Constitution of India based on the officer's tactic,
 * coercion level, and custody fatigue.
 */
export function getAdvocateIntervention(
  advocatePresent: boolean,
  tactic: string,
  questionText: string,
  state: Partial<InterrogationState>,
  fatigueScore: number = 0,
  advocateProfile?: AdvocateProfile
): AdvocateIntervention | null {
  if (!advocatePresent) return null;

  const counselName = advocateProfile?.name 
    ? `${advocateProfile.name} (${advocateProfile.specialization || 'Defense Counsel'})`
    : "Adv. Rajeshwar Sharma (Senior Defense Counsel)";

  const textLower = (questionText || '').toLowerCase();
  const coercion = state.coercion ?? 0;
  const arousal = state.arousal ?? 20;

  // 1. Extreme custody fatigue intervention
  if (fatigueScore >= 75) {
    return {
      advocateName: counselName,
      statute: "BNSS 2023 §54 & §58",
      type: "recess_demand",
      statement: "Objection, Officer! My client has been subjected to prolonged interrogation and is visibly physically exhausted. We demand a formal medical recess under Section 54 BNSS before any further questions are put.",
      coercionPenalty: 15,
      actionHint: "⚠️ IO MANDATE: Grant immediate medical/stamina recess or offer refreshments to preserve admissibility."
    };
  }

  // 2. Coercive threats, third-degree, or intimidating language
  const hasThreat = /jail|prison|rot in|lock you up|hang|beat|third degree|destroy you|suffer|confess now|no choice/i.test(textLower);
  if (hasThreat) {
    return {
      advocateName: counselName,
      statute: "BNSS 2023 §41D & BSA 2023 §22",
      type: "objection",
      statement: "Objection! Officer, threats of punishment or duress are strictly illegal under Section 41D BNSS and render any statement void under Section 22 of the Bharatiya Sakshya Adhiniyam. Strike that threat from the record.",
      coercionPenalty: 25,
      actionHint: "⚠️ STATUTORY VIOLATION: Threatening the accused incurs +25 Coercion penalty and invalidates confessions under BSA §22."
    };
  }

  // 3. Objection against bluff / deception tactics
  if (tactic === 'bluff' || textLower.includes('i already know') || textLower.includes('you are lying') || textLower.includes('everybody saw you') || textLower.includes('we know everything')) {
    return {
      advocateName: counselName,
      statute: "BNSS 2023 §41D & Constitution Art. 20(3)",
      type: "objection",
      statement: "Objection! Officer, you cannot introduce unverified assertions or intimidate my client with speculative claims. If you have tangible exhibited evidence under Section 23 BSA, place it on record formally.",
      coercionPenalty: 20,
      actionHint: "⚠️ IO MANDATE: Rephrase question without unverified bluffs or pin a certified Malkhana Exhibit."
    };
  }

  // 4. Objection against hostile accusatory bullying or high coercion
  if (tactic === 'accusatory' && (coercion >= 20 || arousal >= 60 || textLower.includes('admit') || textLower.includes('you did it') || textLower.includes('guilty'))) {
    return {
      advocateName: counselName,
      statute: "BNSS 2023 §180 & Constitution Art. 20(3)",
      type: "warning",
      statement: "I must caution the Investigating Officer: under Section 180 BNSS and Article 20(3), my client cannot be coerced or compelled to answer self-incriminating inquiries under duress. Please maintain proper procedure.",
      coercionPenalty: 15,
      actionHint: "⚠️ IO MANDATE: Adopt neutral rapport technique to prevent statement exclusion under Art. 20(3)."
    };
  }

  // 5. Advisory on legal warning / rights
  if (tactic === 'legal-warning' && coercion > 15) {
    return {
      advocateName: counselName,
      statute: "BNSS 2023 §41D",
      type: "advisory",
      statement: "Counsel advises the accused: you are only required to speak to genuine facts and you retain full protection against coerced statements.",
      coercionPenalty: 5,
      actionHint: "💬 COUNSEL ADVISORY: Defense counsel whispering instructions to POI regarding constitutional protections."
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. QUESTION INTENT PARSER & MULTI-PART DECONSTRUCTION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

export interface InterrogationQuestionIntents {
  rawQuestion: string;
  hasCourtesyIntent: boolean;
  courtesySubject?: 'water' | 'tea' | 'refreshment' | 'health_check' | 'calm_down';
  courtesyDetails?: string;

  hasPersonalBackgroundIntent: boolean;
  personalSubject?: 'vacation_travel' | 'family' | 'health_medical' | 'employment_routine';
  personalDetails?: string;

  hasAlibiTimelineIntent: boolean;
  timelineDetails?: string;

  hasEvidenceConfrontationIntent: boolean;
  evidenceItems: string[];

  hasAccompliceOrPaymentIntent: boolean;
  accompliceDetails?: string;

  hasConcealmentLocationIntent: boolean;
  concealmentDetails?: string;

  hasDirectAccusationIntent: boolean;
  isMultiPart: boolean;
  parts: Array<{ type: string; label: string; textSummary: string }>;
  intentSummary: string;
  sequentialAnswerInstruction: string;
}

export function parseInterrogationIntents(
  officerStatement: string,
  personInfo?: { name?: string; role?: string; occupation?: string; stated_alibi?: string; alias?: string },
  state?: Partial<InterrogationState>
): InterrogationQuestionIntents {
  const raw = (officerStatement || '').trim();
  // Strip any leading assistant acknowledgement in parentheses: "(Understood, Sir!) Spoken question..."
  const cleanSpoken = raw.replace(/^\([^)]+\)\s*/, '').trim();
  const lower = cleanSpoken.toLowerCase();

  const parts: Array<{ type: string; label: string; textSummary: string }> = [];

  // 1. Courtesy Intent Detection (Tea, Water, Refreshments, Calm Down)
  let hasCourtesyIntent = false;
  let courtesySubject: InterrogationQuestionIntents['courtesySubject'];
  let courtesyDetails: string | undefined;

  if (/\b(water|paani|glass of water)\b/i.test(lower)) {
    hasCourtesyIntent = true;
    courtesySubject = 'water';
    courtesyDetails = 'Offered a glass of water / refreshment';
    parts.push({ type: 'courtesy_water', label: 'Offer of Water', textSummary: 'Officer offered water / refreshment to subject' });
  } else if (/\b(tea|chai|coffee|cup of tea)\b/i.test(lower)) {
    hasCourtesyIntent = true;
    courtesySubject = 'tea';
    courtesyDetails = 'Offered hot tea / coffee';
    parts.push({ type: 'courtesy_tea', label: 'Offer of Tea/Chai', textSummary: 'Officer offered hot tea / beverage' });
  } else if (/\b(snack|biscuit|breakfast|food|refreshment|eat)\b/i.test(lower)) {
    hasCourtesyIntent = true;
    courtesySubject = 'refreshment';
    courtesyDetails = 'Offered food / snacks / refreshments';
    parts.push({ type: 'courtesy_food', label: 'Offer of Refreshments', textSummary: 'Officer offered food or snacks' });
  } else if (/\b(take a breath|breathe|calm down|compose yourself|relax|easy|take it easy)\b/i.test(lower)) {
    hasCourtesyIntent = true;
    courtesySubject = 'calm_down';
    courtesyDetails = 'Invited to breathe, compose, and calm down';
    parts.push({ type: 'courtesy_calm', label: 'De-escalation / Calm Gesture', textSummary: 'Officer urged subject to calm down and compose oneself' });
  }

  // 2. Personal / Background Intent Detection (Vacations, Family, Medical/Health, Employment)
  let hasPersonalBackgroundIntent = false;
  let personalSubject: InterrogationQuestionIntents['personalSubject'];
  let personalDetails: string | undefined;

  if (/\b(vacation|holiday|travel|trip|leave|out of town|resort|hotel|goa|manali|shimla|visited|tour)\b/i.test(lower)) {
    hasPersonalBackgroundIntent = true;
    personalSubject = 'vacation_travel';
    personalDetails = 'Inquired about personal vacations, travel history, or trips out of town';
    parts.push({ type: 'background_vacation', label: 'Travel & Vacation Inquiries', textSummary: 'Officer asked about vacations, trips, or travel history' });
  } else if (/\b(family|wife|husband|child|children|kid|kids|parents|mother|father|brother|sister|son|daughter|household|residence with you)\b/i.test(lower)) {
    hasPersonalBackgroundIntent = true;
    personalSubject = 'family';
    personalDetails = 'Inquired about family members, spouse, children, or household situation';
    parts.push({ type: 'background_family', label: 'Family & Domestic Inquiries', textSummary: 'Officer asked about family background or household members' });
  } else if (/\b(health|sick|ill|doctor|hospital|medicine|medical|prescription|bp|headache|chest pain|ailment)\b/i.test(lower)) {
    hasPersonalBackgroundIntent = true;
    personalSubject = 'health_medical';
    personalDetails = 'Inquired about physical health, illness, or medical needs under BNSS §54';
    parts.push({ type: 'background_health', label: 'Health & Medical Condition', textSummary: 'Officer inquired into suspect health or medical condition' });
  } else if (/\b(daily routine|job background|salary|employer|regular work|how do you earn|hobbies)\b/i.test(lower)) {
    hasPersonalBackgroundIntent = true;
    personalSubject = 'employment_routine';
    personalDetails = 'Inquired about daily occupation, routine, or personal livelihood';
    parts.push({ type: 'background_routine', label: 'Occupation & Daily Routine', textSummary: 'Officer asked about work routine or daily background' });
  }

  // 3. Alibi & Timeline Inquiry Intent
  let hasAlibiTimelineIntent = false;
  let timelineDetails: string | undefined;

  if (/\b(where were you|timeline|whereabouts|account for|what time|08:00|08:15|08:20|08:30|08:45|09:00|8 am|8:15 am|8:30 am|9 am|morning|at that hour|movement|between 8|market alley|culvert)\b/i.test(lower)) {
    hasAlibiTimelineIntent = true;
    timelineDetails = 'Questioning suspect on whereabouts, movements, and timeline during the incident window';
    parts.push({ type: 'alibi_timeline', label: 'Alibi & Timeline Examination', textSummary: 'Officer questioned movements, timeline, or location claims' });
  }

  // 4. Evidence Confrontation Intent
  let hasEvidenceConfrontationIntent = false;
  const evidenceItems: string[] = [];

  if (/\b(cctv|camera|footage|recording|surveillance|facial recognition)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('CCTV Camera Footage & Visual Sightings');
  }
  if (/\b(cell tower|tower|cdr|call detail|mobile ping|handset logs|electronic proof)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('Cell Tower CDR Logs (BSA §63 certified)');
  }
  if (/\b(fingerprint|friction ridge|latch|als|finger print)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('Latent Fingerprint on Van Latch (ALS Examination)');
  }
  if (/\b(footwear|shoe|boot|lug cut|impression|mud|tread)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('Footwear Impression with 3.2mm Lug Cut');
  }
  if (/\b(blood|serology|dna|spatter|stain|wiped track|chemiluminescen|luminol|drag mark)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('Bloodstain Serology & Wiped Drag Track');
  }
  if (/\b(kerchief|handkerchief|mask|cotton cloth)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('White Cotton Face Kerchief (UV 365nm)');
  }
  if (/\b(lock-cutter|bolt cutter|iron rod|weapon|tool|heavy grey bag|duffel bag|cash box|money box|dispatch|tags|register)\b/i.test(lower)) {
    hasEvidenceConfrontationIntent = true;
    evidenceItems.push('Offence Weapon / Stolen Property Articles / Dispatch Tags');
  }

  if (hasEvidenceConfrontationIntent) {
    parts.push({
      type: 'evidence_confrontation',
      label: 'Evidence Confrontation',
      textSummary: `Confronted with physical/digital exhibits: ${evidenceItems.join(', ')}`
    });
  }

  // 5. Accomplice / Direct Payment / Runners Intent
  let hasAccompliceOrPaymentIntent = false;
  let accompliceDetails: string | undefined;
  if (/\b(who paid|who gave|who ordered|who hired|nitin|bhosale|accomplice|partner|co-conspirator|boss|who gave you the bag|how much money|cut|runners|runner|names|exact names)\b/i.test(lower)) {
    hasAccompliceOrPaymentIntent = true;
    accompliceDetails = 'Questioned on identity of co-conspirators, runners, payment source, or mastermind directives';
    parts.push({ type: 'accomplice_payment', label: 'Accomplice & Money Trail Inquiry', textSummary: 'Officer demanded accomplice/runner names or payment source' });
  }

  // 6. Concealment / Stash Recovery Intent (BSA §23)
  let hasConcealmentLocationIntent = false;
  let concealmentDetails: string | undefined;
  if (/\b(where is it|where is the bag|where did you hide|where did you stash|where is the cash|where is the weapon|concealed|transformer shed|water tank|concrete slabs|recovery|location|neighborhood|turn.*upside down)\b/i.test(lower)) {
    hasConcealmentLocationIntent = true;
    concealmentDetails = 'Pressed for exact physical location coordinates of concealed crime articles or persons under BSA §23';
    parts.push({ type: 'concealment_location', label: 'Concealment Location Locus (BSA §23)', textSummary: 'Officer demanded recovery location of tools/loot/associates' });
  }

  // 7. Direct Accusation Intent
  const hasDirectAccusationIntent = /\b(you did it|you stole|admit it|confess|you broke in|you robbed|robbery|burglary|guilty)\b/i.test(lower);
  if (hasDirectAccusationIntent && !hasAlibiTimelineIntent && !hasEvidenceConfrontationIntent) {
    parts.push({ type: 'direct_accusation', label: 'Direct Accusatory Challenge', textSummary: 'Officer issued a direct accusatory challenge' });
  }

  const isMultiPart = parts.length >= 2;

  // Build Human-Readable Intent Summary
  let intentSummary = '';
  if (parts.length === 0) {
    intentSummary = 'General conversational inquiry in interrogation room.';
  } else {
    intentSummary = parts.map((p, idx) => `[Part ${idx + 1}: ${p.label}] -> ${p.textSummary}`).join('; ');
  }

  // Build Sequential Guidance Instruction for AI Model
  let sequentialAnswerInstruction = '';
  if (hasCourtesyIntent && (hasAlibiTimelineIntent || hasEvidenceConfrontationIntent || hasAccompliceOrPaymentIntent || hasConcealmentLocationIntent)) {
    sequentialAnswerInstruction = `1. FIRST address the courtesy gesture (${courtesyDetails || 'tea/water'}) in character (e.g. accept gratefully if cooperative/weary, or decline guardedly/skeptically if stonewalling/hostile).\n2. THEN directly answer the investigative question according to your disclosure tier and psychological stance.`;
  } else if (hasPersonalBackgroundIntent && (hasAlibiTimelineIntent || hasEvidenceConfrontationIntent)) {
    sequentialAnswerInstruction = `1. FIRST answer the personal/background inquiry (${personalDetails}) truthfully in accordance with your personal background.\n2. THEN address the timeline/evidence question according to your alibi and psychological stance.`;
  } else if (hasCourtesyIntent) {
    sequentialAnswerInstruction = `The officer is offering a courtesy/refreshment (${courtesyDetails}). Respond directly to the refreshment/tea/water offer. DO NOT blurt out irrelevant crime denials or talk about break-ins/robberies.`;
  } else if (hasPersonalBackgroundIntent) {
    sequentialAnswerInstruction = `The officer asked a personal/background question (${personalDetails}). Answer the specific personal topic directly and naturally. DO NOT blurt out canned crime denials.`;
  } else if (hasEvidenceConfrontationIntent) {
    sequentialAnswerInstruction = `The officer confronted you with specific case evidence (${evidenceItems.join(', ')}). React to this specific proof in accordance with your evidence belief level and disclosure tier.`;
  } else {
    sequentialAnswerInstruction = `Address the officer's specific question directly in accordance with your stated alibi, disclosure tier, and primary psychological stance.`;
  }

  return {
    rawQuestion: raw,
    hasCourtesyIntent,
    courtesySubject,
    courtesyDetails,
    hasPersonalBackgroundIntent,
    personalSubject,
    personalDetails,
    hasAlibiTimelineIntent,
    timelineDetails,
    hasEvidenceConfrontationIntent,
    evidenceItems,
    hasAccompliceOrPaymentIntent,
    accompliceDetails,
    hasConcealmentLocationIntent,
    concealmentDetails,
    hasDirectAccusationIntent,
    isMultiPart,
    parts,
    intentSummary,
    sequentialAnswerInstruction
  };
}

/**
 * 12. buildInterrogationRoomChatSummary
 * Generates an executive, topic-by-topic interrogation room summary for this individual suspect,
 * tracking claims asserted, concessions made, evidence presented, and emotional arc.
 */
export function buildInterrogationRoomChatSummary(
  transcript: any[] = [],
  personInfo?: { name?: string; role?: string; occupation?: string; stated_alibi?: string },
  interview?: any,
  state?: Partial<InterrogationState>
): string {
  const pName = personInfo?.name || interview?.person_name || 'Suspect';
  const totalTurns = transcript.length;

  if (!transcript || transcript.length === 0) {
    return `- Session Status: Interrogation room session newly initiated for ${pName}.
- Initial Claim: Stated alibi is "${personInfo?.stated_alibi || 'Unspecified duty/whereabouts'}".
- Prior Concessions: None yet. Suspect begins in baseline psychological state.`;
  }

  const officerTurns = transcript.filter((t: any) => t.speaker === 'officer' || t.speaker === 'assistant');
  const suspectTurns = transcript.filter((t: any) => t.speaker === 'suspect' || t.speaker === 'person' || t.speaker === 'accused');

  const topicsCovered: string[] = [];
  const textBlob = transcript.map((t: any) => (t.text || '').toLowerCase()).join(' ');

  if (textBlob.includes('tea') || textBlob.includes('chai') || textBlob.includes('water') || textBlob.includes('food') || textBlob.includes('refreshment')) {
    topicsCovered.push('Hospitality / Physical Refreshments (BNSS §54/180)');
  }
  if (textBlob.includes('where were you') || textBlob.includes('alibi') || textBlob.includes('timeline') || textBlob.includes('clock') || textBlob.includes('morning')) {
    topicsCovered.push('Timeline & Physical Movements at incident window');
  }
  if (textBlob.includes('cctv') || textBlob.includes('tower') || textBlob.includes('fingerprint') || textBlob.includes('blood') || textBlob.includes('lug') || textBlob.includes('casing')) {
    topicsCovered.push('Confrontation with Forensic & Digital Exhibits');
  }
  if (textBlob.includes('nitin') || textBlob.includes('bhosale') || textBlob.includes('runner') || textBlob.includes('accomplice') || textBlob.includes('partner') || textBlob.includes('paid')) {
    topicsCovered.push('Co-conspirators, Runners & Financial Bribe Trail');
  }
  if (textBlob.includes('bag') || textBlob.includes('shed') || textBlob.includes('transformer') || textBlob.includes('culvert') || textBlob.includes('cash box') || textBlob.includes('recovery')) {
    topicsCovered.push('Physical Location & Recovery Locus (BSA §23)');
  }

  const admissions = interview?.admitted || interview?.disclosures || [];
  const admissionsList = admissions.length > 0
    ? admissions.map((a: any) => typeof a === 'string' ? a : (a.text || a.title || JSON.stringify(a))).join('; ')
    : 'No formal statutory admissions recorded yet';

  const lastSuspectUtterance = suspectTurns.length > 0 ? suspectTurns[suspectTurns.length - 1].text : 'None';
  const lastOfficerUtterance = officerTurns.length > 0 ? officerTurns[officerTurns.length - 1].text : 'None';

  return `- Suspect Identity: ${pName} (${personInfo?.occupation || personInfo?.role || 'Citizen under examination'})
- Examination Progress: ${transcript.length} transcript exchange(s) recorded across Session #${interview?.session_no || 1}.
- Primary Stated Alibi: "${personInfo?.stated_alibi || interview?.stated_alibi || 'Maintains innocence on duty'}"
- Topics Examined in this Room: ${topicsCovered.length > 0 ? topicsCovered.join('; ') : 'Initial baseline questions'}
- Recorded Concessions / Admissions: ${admissionsList}
- Suspect Psychological Arc: Arousal/Stress: ${state?.arousal ?? interview?.arousal ?? interview?.tension ?? 20}%, Resistance: ${state?.resistance ?? interview?.resistance ?? 65}%, Police Credibility: ${state?.police_credibility ?? interview?.credibility ?? 60}%, Disclosure Tier: ${state?.disclosure_tier ?? interview?.disclosure_tier ?? 0}/4.
- Legal Counsel Status: ${state?.advocate_present || interview?.advocatePresent ? 'Adv. Sharma present in room (BNSS §41D)' : 'No advocate present'}
- Immediate Prior Exchange:
  * Officer/Assistant asked: "${lastOfficerUtterance}"
  * ${pName} answered: "${lastSuspectUtterance}"`;
}


