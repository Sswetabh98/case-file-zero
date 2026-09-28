export type EvidenceType = 
  | 'ballistics'
  | 'cryptography'
  | 'financial'
  | 'surveillance'
  | 'forensics'
  | 'document'
  | 'audio_log';

export interface EvidenceItem {
  id: string;
  code: string;
  title: string;
  type: EvidenceType;
  dateDiscovered: string;
  isUnlocked: boolean;
  isAnalyzed: boolean;
  summary: string;
  fullDescription: string;
  chainOfCustody: string;
  forensicAnalysis?: {
    method: string;
    report: string;
    confidence: number;
    revealedLead?: string;
  };
  tags: string[];
  locationFound: string;
  relatedSuspectId?: string;
}

export type AdvocatePosture = 
  | 'observing'
  | 'taking_notes'
  | 'advising_client'
  | 'formal_objection'
  | 'demanding_recess';

export interface AdvocateProfile {
  id: string;
  name: string;
  barCouncilNumber: string;
  specialization: string;
  demeanor: 'constitutionalist' | 'proceduralist' | 'aggressive_defense' | 'legal_aid_guardian';
  alertnessLevel: number; // 0 to 100
  currentPosture: AdvocatePosture;
  postureDescription?: string;
  notesLogged?: string[];
}

export interface Suspect {
  id: string;
  name: string;
  alias: string;
  role: string;
  status: 'person_of_interest' | 'under_surveillance' | 'interrogated' | 'warrant_issued' | 'apprehended';
  mugshotUrl: string;
  age: number;
  alibi: string;
  psychologicalProfile: string;
  stressLevel: number; // 0 to 100
  deceitIndex: number; // 0 to 100
  vulnerabilities: string[]; // Evidence IDs that crack this suspect
  revealedIntel: string[];
  advocate?: AdvocateProfile;
  testimony: Array<{
    id: string;
    sender: 'detective' | 'suspect' | 'assistant' | 'advocate' | string;
    text: string;
    timestamp: string;
    stressAtTime?: number;
    speakerName?: string;
    technique?: string;
    notes?: string;
    statute?: string;
    interventionType?: 'objection' | 'warning' | 'advisory' | 'recess_demand' | string;
    actionHint?: string;
    coercionPenalty?: number;
  }>;
}

export type UnitSpecialty = 'Crime Scene & Ballistics' | 'Covert Surveillance & Wiretap' | 'Tactical Breach & SWAT' | 'Cybernetics & Ledger Audit';

export interface TacticalUnit {
  id: string;
  callsign: string;
  unitCode: string;
  specialty: UnitSpecialty;
  status: 'standby' | 'deployed' | 'in_transit' | 'recovering';
  currentSectorId: string;
  deploymentTimeRemaining: number; // in seconds
  cost: number;
  activeMission?: {
    sectorId: string;
    actionType: 'recon' | 'search' | 'wiretap' | 'breach';
    targetDescription: string;
  };
}

export interface MapSector {
  id: string;
  code: string;
  name: string;
  threatLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  gridCoord: string; // e.g. "D-4"
  posX: number; // 0-100%
  posY: number; // 0-100%
  description: string;
  unlockedClueId?: string;
  assignedUnitId?: string;
  isScanned: boolean;
  searchCost: number;
}

export interface DeductionHypothesis {
  id: string;
  code: string;
  title: string;
  description: string;
  requiredEvidenceIds: string[];
  targetSuspectId: string;
  isSolved: boolean;
  warrantUnlocked: boolean;
  proofExplanation: string;
}

export interface ArchivedCaseFile {
  id: string;
  caseNumber: string;
  title: string;
  classification: string;
  incidentTime: string;
  location: string;
  summary: string;
  leadInvestigator: string;
  closedDate: string;
  status: 'closed' | 'convicted' | 'settled';
  verdict: 'Conviction' | 'Partial' | 'Acquittal' | 'Guilty - Federal Grand Jury';
  sentence: string;
  courtName: string;
  courtJudgment: string;
  performanceSummary: {
    cluesRecovered: number;
    totalClues: number;
    hypothesesSolved: number;
    totalHypotheses: number;
    evidentiaryWeight: number;
    meritBonus: number;
    standingScore: number;
    statutoryCompliance: string;
    investigationRating: 'Distinguished (A+)' | 'Exemplary' | 'Competent' | 'Commended';
  };
  admittedExhibits: Array<{
    name: string;
    type: string;
    weight: number;
    chainOfCustody: string;
  }>;
  convictedSuspects: Array<{
    id: string;
    name: string;
    alias: string;
    role: string;
    mugshotUrl: string;
    chargesProved: string[];
    disclosedIntel?: string;
  }>;
  judicialRemarks: Array<{
    issue: string;
    severity: string;
    detail: string;
    statute?: string;
  }>;
  // Exhaustive 5-Stage FIR to Trial summary details
  firDetails?: {
    firNo?: string;
    narrative?: string;
    informant?: string;
    informantType?: string;
    place?: string;
    date?: string;
    sections?: Array<{ act?: string; section: string }>;
    ingredients?: string[];
  };
  crimeSceneDetails?: {
    location?: string;
    layoutKey?: string;
    cordoned?: boolean;
    walkthrough?: boolean;
    photographed?: boolean;
    diagrammed?: boolean;
    canvassed?: boolean;
    sealed?: boolean;
    exhibits?: Array<{
      exhibitNo: string;
      name: string;
      category: string;
      significance?: string;
      weight: number;
      admissibility: string;
      witnessA?: string;
      witnessB?: string;
      custodyIntact?: boolean;
      s63Certified?: boolean;
      labStatus?: string;
      labReport?: string;
      hash?: string | null;
    }>;
  };
  interrogationDetails?: {
    personsExamined?: Array<{
      name: string;
      role: string;
      statementSummary: string;
      alibiVerified: boolean;
      arrested: boolean;
    }>;
    recoveriesBSA23?: Array<{
      item: string;
      location: string;
      witnesses: string;
      significance: string;
    }>;
  };
  chargeSheetDetails?: {
    chargeSheetNo?: string;
    dateFiled?: string;
    accusedArrayed?: string[];
    sectionsCharged?: string[];
    prosecutionPillars?: string[];
    briefFacts?: string;
  };
  trialDetails?: {
    court?: string;
    trialCaseNo?: string;
    verdict?: string;
    sentence?: string;
    strategy?: {
      focus?: string;
      pillar?: string;
      witnessTactic?: string;
    };
    judgmentSummary?: string;
    reasonableDoubts?: string[];
    remarks?: Array<{ issue: string; severity: string; detail: string; statute?: string }>;
  };
}

export interface CaseFile {
  id: string;
  caseNumber: string;
  title: string;
  classification: string;
  incidentTime: string;
  location: string;
  summary: string;
  leadInvestigator: string;
  primaryObjective: string;
  secondaryObjective: string;
  rewardBudget: number;
  evidence: EvidenceItem[];
  suspects: Suspect[];
  sectors: MapSector[];
  hypotheses: DeductionHypothesis[];
  status?: 'active' | 'registered' | 'closed' | 'convicted';
  verdict?: string;
  sentence?: string;
  courtJudgment?: string;
}

export interface OperationalLog {
  id: string;
  timestamp: string;
  type: 'DISPATCH' | 'EVIDENCE' | 'DEDUCTION' | 'INTERROGATION' | 'SYSTEM' | 'ALERT';
  message: string;
  severity: 'info' | 'warning' | 'critical' | 'success';
}

export interface OfficerCareerStats {
  hypothesesFormulated: number;
  hypothesesConfirmed: number;
  interrogationsConducted: number;
  deceitsExposed: number;
  evidenceDiscovered: number;
  evidenceAnalyzed: number;
  unitsDispatched: number;
  budgetSpent: number;
  peakSuspicion: number;
  warrantsIssued: number;
  arrestsExecuted: number;
}

export interface TacticalRibbon {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt?: string;
  category: 'operational' | 'deduction' | 'forensics' | 'interrogation' | 'stealth';
  unlocked: boolean;
}

export interface TacticalPerk {
  id: string;
  title: string;
  description: string;
  requiredClearance: number;
  unlocked: boolean;
  effect: string;
}

export interface OfficerProfile {
  uid: string;
  callsign: string;
  displayName: string;
  badgeNumber: string;
  clearanceLevel: number;
  casesClosed: number;
  meritScore: number;
  isAnonymous: boolean;
  loginId?: string;
  division?: string;
  avatarUrl?: string; // Base64 data URL or external asset URL
  presetAvatarId?: string;
  bio?: string;
  rankTitle?: string;
  motto?: string;
  careerStats?: OfficerCareerStats;
  ribbons?: TacticalRibbon[];
  perks?: TacticalPerk[];
  joinedDate?: string;
}

export type TacticalTheme = 'blackwatch' | 'amber' | 'matrix' | 'stealth';

export interface GameSettingsState {
  theme: TacticalTheme;
  scanlines: boolean;
  glitchFx: boolean;
  textDensity: 'compact' | 'expanded';
  typingSpeed: 'instant' | 'teletype';
  aiModel: 'gemini-2.5-flash' | 'gemini-2.5-pro';
  interrogationWingman: 'co_examiner_wingman' | 'strict_legalist' | 'autonomous_lead' | 'good_cop';
  responseTone: 'concise' | 'detailed';
  audioMasterVolume: number;
  audioSfxVolume: number;
  audioProfile: 'relay' | 'cyber' | 'stealth';
  audioCues: {
    radar: boolean;
    clues: boolean;
    warning: boolean;
    mission: boolean;
  };
  showBriefingOnStartup: boolean;
  confirmHighSpend: boolean;
  autoTagClues: boolean;
  suspicionBrakes: boolean;
}

export interface CorkboardConnection {
  id: string;
  sourceId: string;
  sourceType: 'evidence' | 'suspect';
  targetId: string;
  targetType: 'evidence' | 'suspect' | 'hypothesis';
}

export type InterrogationOperationalMode = 
  | 'autonomous_lead'
  | 'co_examiner_wingman'
  | 'silent_scribe'
  | 'good_cop'
  | 'bad_cop'
  | 'technical_specialist';

export interface DirectiveSubstantiveNote {
  id: string;
  timestamp: string;
  gameTime?: string;
  author: string;
  category: 'admission' | 'contradiction' | 'timeline' | 'lead' | 'demeanor';
  text: string;
  relevance: string;
}

export interface InterrogationDirective {
  id: string;
  assignedMember: string;
  originalInstruction: string;
  operationalMode: InterrogationOperationalMode;
  questionBudget: number | null;
  remainingQuestions: number | null;
  gametimeMinutesBudget: number | null;
  remainingGameMinutes: number | null;
  targetEntities: {
    exhibits?: string[];
    persons?: string[];
    timeWindows?: string[];
    locations?: string[];
  };
  tacticalPosture: string;
  stopConditions: string[];
  backgroundTasks: string[];
  substantiveNotes: DirectiveSubstantiveNote[];
  status: 'active' | 'paused' | 'completed';
  acknowledgement: string;
  completedReason?: string;
  createdAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// BNSS / BSA 2023 INTERROGATION CHAMBER TYPES (PHASE 1)
// ─────────────────────────────────────────────────────────────────────────────

export type SuspectComposureState = 'composed' | 'guarded' | 'agitated' | 'cornered' | 'breakdown';

export interface PsychologicalState {
  stressLevel: number; // 0 to 100
  cooperationLevel: number; // 0 to 100 (high = cooperative, low = defiant/stonewalling)
  composureState: SuspectComposureState;
  isBreakdown: boolean; // Triggers when stress > 80
  deceitIndex: number; // 0 to 100
  vulnerabilitiesShattered: string[]; // IDs of exhibits successfully slammed
  coercionPenalty: number; // Accumulated judicial risk if intimidation is used
  lastTacticFaced?: 'direct_evidence' | 'empathy' | 'provocation' | 'procedural_pressure' | 'bluff';
}

export interface RemandClockState {
  remandMinutesRemaining: number; // Total custody limit (max 1440 min = 24h as per BNSS s.58/187)
  remandDeadlineISO: string;
  isExpired: boolean;
  advocatePresent: boolean; // BNSS s.41D/s.180 counsel presence toggle
  lastMedicalCheckMinutesAgo: number;
  medicalFitnessStatus: 'fit' | 'requires_attention' | 'critical_evaluation_needed'; // BNSS s.53/54
  magistrateNoticeIssued: boolean;
}

export interface EvidenceContradictionSlam {
  id: string;
  exhibitCode: string; // e.g. "EX-01" or "DIG-02"
  exhibitTitle: string;
  targetStatementSnippet: string;
  contradictionType: 'alibi_refutation' | 'forensic_match' | 'cell_tower_ping' | 'financial_trail' | 'cctv_visual';
  stressDelta: number;
  cooperationDelta: number;
  breakthroughAchieved: boolean;
  timestamp: string;
}

export interface DiscoveryMemo {
  id: string;
  memoNumber: string; // e.g., "DISC-BSA23/2026/01"
  suspectId: string;
  suspectName: string;
  statutoryAct: 'BSA_2023_S23' | 'BNSS_2023_S180';
  exactVoluntaryStatement: string; // "I have hidden the weapon/proceeds of crime at..."
  revealedLocation: string;
  recoveryItemDescription: string;
  associatedExhibitCode?: string;
  panchaWitnesses: Array<{
    name: string;
    occupation: string;
    signatureVerified: boolean;
  }>;
  investigatingOfficerRank: string;
  admissibilityConfirmed: boolean;
  mapCoordinates?: { x: number; y: number };
  createdAt: string;
}

export interface ChamberSessionState {
  suspectId: string;
  psychology: PsychologicalState;
  remandClock: RemandClockState;
  slammedExhibits: EvidenceContradictionSlam[];
  discoveryMemos: DiscoveryMemo[];
  activeModelTier: 'light_flash_lite' | 'main_flash' | 'pro_reasoning';
}

