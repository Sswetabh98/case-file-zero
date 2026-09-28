// src/server/intentPipeline.ts
// Hybrid Semantic-Keyword Extraction, Spirit Modulation & Intent Classification Engine

export interface ExtractedEntities {
  targetPerson?: {
    id: number;
    name: string;
    role: string;
    isAccused: boolean;
    summoned?: boolean;
    arrested?: boolean;
    inChamber?: boolean;
    alibi?: string;
    statement?: string;
    interviewSummary?: {
      tension?: number;
      credibility?: number;
      emotional_state?: string;
      locatable_disclosures?: string[];
      recentTranscript?: string[];
    };
  };
  targetExhibit?: {
    id: string;
    code: string;
    title: string;
    seized?: boolean;
    labTested?: boolean;
    labResult?: string;
    locationFound?: string;
  };
  targetLocation?: string;
  interrogationMentioned?: boolean;
  legalSections: string[];
  actionKeywords: string[];
  negationDetected: boolean;
  isQuestion: boolean;
  urgencyKeywords: string[];
}

export type IntentCategory = 
  | 'ORDER_INTERROGATION_SUMMON'
  | 'ORDER_FIELD_DIRECTIVE'
  | 'ORDER_LAB_REQUISITION'
  | 'ORDER_CANCEL_TASK'
  | 'INQUIRY_STATUS'
  | 'INQUIRY_EVIDENCE_LEGAL'
  | 'ADVISORY_SEEK_ADVICE'
  | 'SOCIAL_GREETING'
  | 'SOCIAL_ACK'
  | 'GENERAL_CONVERSATION';

export interface OperationalSpirit {
  urgency: 'routine' | 'high' | 'critical';
  tone: 'formal' | 'imperative' | 'inquisitive' | 'cautious' | 'casual';
  polarity: 'affirmative' | 'negative' | 'inquiry';
  confidence: number;
}

export interface IntentAnalysisResult {
  intent: IntentCategory;
  spirit: OperationalSpirit;
  entities: ExtractedEntities;
  hasSocialIntent?: boolean;
  hasStatusIntent?: boolean;
  hasAdvisoryIntent?: boolean;
  suggestedActionPayload?: {
    type: 'SUMMON_INTERROGATION' | 'SEIZE_EXHIBIT' | 'LAB_REQUISITION' | 'VERIFY_ALIBI' | 'SCENE_STEP' | 'CANCEL_TASK';
    targetId?: string | number;
    targetName?: string;
    targetScope?: string;
    timeCostDays?: number;
    description: string;
    legalReference?: string;
  };
}

/**
 * Tier 1: Entity & Lexical Tagger
 * Deterministically scans input against active case entities and procedural taxonomy.
 */
export function tagEntities(userText: string, activeCase: any, threadHistory?: any[]): ExtractedEntities {
  const text = (userText || '').trim();
  const lower = text.toLowerCase();

  const entities: ExtractedEntities = {
    legalSections: [],
    actionKeywords: [],
    negationDetected: false,
    isQuestion: false,
    urgencyKeywords: []
  };

  // Helper to extract person interview dossier
  const buildInterviewSummary = (personId: number) => {
    const pIvs = (activeCase?.interviews || []).filter((i: any) => i.person_id === personId);
    const curIv = pIvs[pIvs.length - 1];
    if (!curIv) return undefined;
    const turns = curIv.turns || [];
    const recent = turns.slice(-5).map((t: any) => {
      const q = t.question_framed || t.input || '';
      const a = t.suspect_reply || '';
      return `Q: ${q}\nA: ${a}`;
    });
    const locDisclosures = (curIv.disclosures || []).map((d: any) => `${d.item || 'Article'} at ${d.location || 'Location'}`);
    return {
      tension: curIv.tension,
      credibility: curIv.credibility,
      emotional_state: curIv.emotional_state,
      locatable_disclosures: locDisclosures,
      recentTranscript: recent
    };
  };

  // 1. Negation detection
  entities.negationDetected = /\b(don'?t|do\s+not|never|cancel|abort|halt|stop|refrain|avoid|hold\s+off|wait|stand\s+down)\b/i.test(lower);

  // 2. Question / Inquiry / Status Request detection
  const hasQuestionMark = lower.includes('?');
  const isQuestionPattern = /\b(what|where|who|which|why|how|when|did|is|are|was|were|has|have|can|could|should|would|do\s+you|any\s+updates|status|tell\s+me|show|list|brief|overview|summary|update|report|present\s+(?:me\s+)?(?:the\s+)?case\s+status)\b/i.test(lower);
  const isStatusInquiry = /\b(case\s*status|status\s*update|case\s*update|brief\s*me|briefing|overview|summary|progress|where\s+(?:are\s+we|do\s+we\s+stand)|how\s+are\s+we\s+doing|give\s+(?:me\s+)?(?:an?\s+)?update|tell\s+me\s+(?:the\s+)?status|present\s+(?:me\s+)?(?:the\s+)?(?:case\s+)?status)\b/i.test(lower);
  entities.isQuestion = hasQuestionMark || isQuestionPattern || isStatusInquiry;

  // 3. Urgency detection
  if (/\b(immediately|right\s+now|urgent|asap|priority|emergency|stat|fast|rush)\b/i.test(lower)) {
    entities.urgencyKeywords.push('urgent');
  }

  // 4. Match Persons / Suspects from active case
  if (activeCase && Array.isArray(activeCase.persons)) {
    for (const p of activeCase.persons) {
      const pName = (p.name || '').toLowerCase();
      const pRole = (p.role || '').toLowerCase();
      const pAlias = (p.alias || '').toLowerCase();

      // Check full name or significant name parts (first or last name with len >= 3)
      const nameParts = pName.split(/\s+/).filter((part: string) => part.length >= 3);
      const isMatch = (pName && lower.includes(pName)) ||
        (pAlias && lower.includes(pAlias)) ||
        nameParts.some((part: string) => new RegExp(`\\b${part}\\b`, 'i').test(lower)) ||
        (pRole && pRole !== 'witness' && pRole !== 'suspect' && lower.includes(pRole));

      if (isMatch) {
        entities.targetPerson = {
          id: p.id,
          name: p.name,
          role: p.role,
          isAccused: !!(p.isAccused || p.isCulprit || p.role === 'suspect'),
          summoned: !!p.summoned,
          arrested: !!p.arrested,
          inChamber: !!p.in_chamber,
          alibi: p.alibi || p.alibi_statement,
          statement: p.statement,
          interviewSummary: buildInterviewSummary(p.id)
        };
        break;
      }
    }
  }

  // Pronoun or generic person reference if no specific person named: resolve from thread history
  if (!entities.targetPerson && /\b(him|her|them|he|she|they|suspect|accused|culprit|witness|alibi|statement|confession|interrogat|questioning|perpetrator|person\s+of\s+interest|poi)\b/i.test(lower)) {
    let resolvedPerson: any = null;

    // Scan previous messages in reverse for the most recently discussed person
    if (threadHistory && Array.isArray(threadHistory) && activeCase?.persons) {
      for (let i = threadHistory.length - 1; i >= 0; i--) {
        const histBody = (threadHistory[i]?.body || '').toLowerCase();
        for (const p of activeCase.persons) {
          const pName = (p.name || '').toLowerCase();
          const nameParts = pName.split(/\s+/).filter((part: string) => part.length >= 3);
          if (histBody.includes(pName) || nameParts.some((part: string) => new RegExp(`\\b${part}\\b`, 'i').test(histBody))) {
            resolvedPerson = p;
            break;
          }
        }
        if (resolvedPerson) break;
      }
    }

    if (!resolvedPerson && activeCase?.persons) {
      resolvedPerson = activeCase.persons.find((p: any) => p.in_chamber) ||
        activeCase.persons.find((p: any) => p.role === 'suspect' || p.isAccused || p.isCulprit) ||
        activeCase.persons[0];
    }

    if (resolvedPerson) {
      entities.targetPerson = {
        id: resolvedPerson.id,
        name: resolvedPerson.name,
        role: resolvedPerson.role,
        isAccused: !!(resolvedPerson.isAccused || resolvedPerson.isCulprit || resolvedPerson.role === 'suspect'),
        summoned: !!resolvedPerson.summoned,
        arrested: !!resolvedPerson.arrested,
        inChamber: !!resolvedPerson.in_chamber,
        alibi: resolvedPerson.alibi || resolvedPerson.alibi_statement,
        statement: resolvedPerson.statement,
        interviewSummary: buildInterviewSummary(resolvedPerson.id)
      };
    }
  }

  entities.interrogationMentioned = /\b(interrogat|interview|question|statement|alibi|confess|disclosure|chamber|room\s*0?4|said|claimed|admit)\b/i.test(lower);

  // 5. Match Exhibits / Evidence
  if (activeCase && Array.isArray(activeCase.exhibits)) {
    for (const ex of activeCase.exhibits) {
      const code = (ex.code || '').toLowerCase();
      const title = (ex.title || '').toLowerCase();
      const cat = (ex.category || '').toLowerCase();

      const isMatch = (code && lower.includes(code)) ||
        (title && lower.includes(title)) ||
        (title && title.split(/\s+/).some((part: string) => part.length >= 4 && new RegExp(`\\b${part}\\b`, 'i').test(lower)));

      if (isMatch) {
        entities.targetExhibit = {
          id: ex.id,
          code: ex.code,
          title: ex.title,
          seized: !!ex.seized,
          labTested: !!(ex.labStatus === 'completed' || ex.tested),
          labResult: ex.labResult || ex.result || ex.analysis || '',
          locationFound: ex.location || ex.found_at || ''
        };
        break;
      }
    }

    // Multi-turn exhibit resolution from thread history
    if (!entities.targetExhibit && /\b(it|this|that|exhibit|evidence|item|weapon|recovery|report|test|fsl)\b/i.test(lower) && threadHistory && Array.isArray(threadHistory)) {
      for (let i = threadHistory.length - 1; i >= 0; i--) {
        const histBody = (threadHistory[i]?.body || '').toLowerCase();
        for (const ex of activeCase.exhibits) {
          const code = (ex.code || '').toLowerCase();
          const title = (ex.title || '').toLowerCase();
          if ((code && histBody.includes(code)) || (title && histBody.includes(title))) {
            entities.targetExhibit = {
              id: ex.id,
              code: ex.code,
              title: ex.title,
              seized: !!ex.seized,
              labTested: !!(ex.labStatus === 'completed' || ex.tested),
              labResult: ex.labResult || ex.result || ex.analysis || '',
              locationFound: ex.location || ex.found_at || ''
            };
            break;
          }
        }
        if (entities.targetExhibit) break;
      }
    }
  }

  // Generic exhibit matchers
  if (!entities.targetExhibit) {
    if (/\b(weapon|gun|knife|revolver|pistol|casing|bullet)\b/i.test(lower)) {
      const wep = (activeCase?.exhibits || []).find((e: any) => /weapon|gun|knife|casing/i.test(e.title || ''));
      if (wep) entities.targetExhibit = { id: wep.id, code: wep.code, title: wep.title, seized: !!wep.seized };
    } else if (/\b(cctv|footage|dvr|camera|video)\b/i.test(lower)) {
      const vid = (activeCase?.exhibits || []).find((e: any) => /cctv|camera|dvr/i.test(e.title || ''));
      if (vid) entities.targetExhibit = { id: vid.id, code: vid.code, title: vid.title, seized: !!vid.seized };
    } else if (/\b(phone|mobile|cdr|call\s*detail|sim)\b/i.test(lower)) {
      const ph = (activeCase?.exhibits || []).find((e: any) => /phone|mobile|cdr/i.test(e.title || ''));
      if (ph) entities.targetExhibit = { id: ph.id, code: ph.code, title: ph.title, seized: !!ph.seized };
    }
  }

  // 6. Match Legal Sections
  const statutoryMatches = text.match(/\b(BNSS|BSA|BNS|CrPC|IPC)\s*(?:s\.|section)?\s*(\d+[A-Z]?)/gi);
  if (statutoryMatches) {
    entities.legalSections = statutoryMatches.map(m => m.trim());
  }
  if (/\b(section\s*35|s\.?\s*35|notice\s*of\s*appearance)\b/i.test(lower)) entities.legalSections.push('BNSS s.35 (Summons/Notice)');
  if (/\b(section\s*180|s\.?\s*180|statement)\b/i.test(lower)) entities.legalSections.push('BNSS s.180 (Witness Examination)');
  if (/\b(section\s*103|s\.?\s*103|panchanama|seizure\s*memo)\b/i.test(lower)) entities.legalSections.push('BNSS s.103 (Seizure & Panchanama)');
  if (/\b(section\s*63|s\.?\s*63|electronic\s*cert)\b/i.test(lower)) entities.legalSections.push('BSA s.63 (Electronic Admissibility)');
  if (/\b(section\s*23|s\.?\s*23|disclosure\s*memo)\b/i.test(lower)) entities.legalSections.push('BSA s.23 (Recovery upon Disclosure)');

  // 7. Action verbs
  const actionRegex = /\b(bring\s+in|summon|call\s+in|interrogate|question|interview|examine|detain|arrest|escort|seize|confiscate|recover|malkhana|panch|send\s+to\s+lab|lab|test|fsl|analyze|cordon|walkthrough|grid|canvass|search|cancel|abort|stop|halt)\b/gi;
  const matchedActions = text.match(actionRegex);
  if (matchedActions) {
    entities.actionKeywords = Array.from(new Set(matchedActions.map(a => a.toLowerCase())));
  }

  return entities;
}

/**
 * Tier 2: Spirit & Intent Synthesizer
 * Evaluates semantic mood, urgency, polarity, and assigns a strict intent category.
 */
export function classifySpiritAndIntent(
  userText: string, 
  activeCase: any, 
  senderKind: string, 
  senderName: string,
  threadHistory?: any[]
): IntentAnalysisResult {
  const text = (userText || '').trim();
  const lower = text.toLowerCase();
  const entities = tagEntities(text, activeCase, threadHistory);

  // Default Spirit
  const spirit: OperationalSpirit = {
    urgency: entities.urgencyKeywords.length > 0 ? 'high' : 'routine',
    tone: 'formal',
    polarity: entities.negationDetected ? 'negative' : entities.isQuestion ? 'inquiry' : 'affirmative',
    confidence: 0.85
  };

  if (/!{2,}/.test(text) || entities.urgencyKeywords.length > 0) {
    spirit.urgency = 'critical';
    spirit.tone = 'imperative';
  }

  // --- Classification Hierarchy ---

  // 1. Social Greetings, Camaraderie & Acknowledgments (including Chai / Coffee / Casual conversation)
  const isChaiOrCoffee = /\b(chai|tea|coffee|water|snack|lunch|dinner|breakfast|biscuit|drink|break|tired|relax|how\s+are\s+you|how\s+is\s+it\s+going|how's\s+it\s+going|what's\s+up|sup)\b/i.test(lower);
  const isGreeting = /^(\b(hi|hello|hey|good\s*morning|good\s*afternoon|good\s*evening|namaste|sir)\b[!.]?)$/i.test(lower) || lower === 'hi' || lower === 'hello' || lower === 'hey';
  const isAck = /^(\b(ok|okay|thanks|thank\s*you|got\s*it|great|noted|understood|roger|fine)\b[!.]?)$/i.test(lower);

  // Status & Inquiry patterns
  const isStatusInquiry = /\b(case\s*status|status\s*update|case\s*update|brief\s*me|briefing|overview|summary|progress|where\s+(?:are\s+we|do\s+we\s+stand)|how\s+are\s+we\s+doing|give\s+(?:me\s+)?(?:an?\s+)?update|tell\s+me\s+(?:the\s+)?status|present\s+(?:me\s+)?(?:the\s+)?(?:case\s+)?status|what\s+is\s+the\s+status|current\s+status|latest\s+update)\b/i.test(lower);

  // Advisory / Guidance Inquiry patterns (handles "what to do next", "next steps", etc.)
  const isAdvisoryInquiry = /\b(advice|guide|what\s+should|what\s+do\s+you\s+think|recommend|strategy|suggest|opinion|help|assist|guidance|what\s+next|what\s+(?:to\s+)?(?:do\s+)?next|next\s+steps?|what\s+is\s+the\s+next\s+step)\b/i.test(lower);

  // Extract multi-intent flags for hybrid engagement
  const hasSocialIntent = isChaiOrCoffee || isGreeting || isAck || /\b(coffee|tea|chai|water|lunch|break|hello|hi|hey)\b/i.test(lower);
  const hasStatusIntent = isStatusInquiry || (entities.isQuestion && /\b(working\s+on|doing|current\s+task|your\s+status|status\s+update|what\s+task|are\s+you\s+busy|progress|where\s+are\s+we|suspect|accused|culprit|interrogat|witness|statement|person|who|which|how\s+many|pending|yet\s+to|brief|summary|overview|fir)\b/i.test(lower));
  const hasAdvisoryIntent = isAdvisoryInquiry;

  const multiFlags = {
    hasSocialIntent,
    hasStatusIntent,
    hasAdvisoryIntent
  };

  // Pure small talk / Chai / Coffee without explicit status or advisory request
  if (isChaiOrCoffee && !isStatusInquiry && !isAdvisoryInquiry) {
    spirit.tone = 'casual';
    spirit.confidence = 0.98;
    return { intent: 'GENERAL_CONVERSATION', spirit, entities, ...multiFlags };
  }

  if (isGreeting && !isStatusInquiry && !isAdvisoryInquiry) {
    spirit.tone = 'casual';
    spirit.confidence = 0.98;
    return { intent: 'SOCIAL_GREETING', spirit, entities, ...multiFlags };
  }

  if (isAck && !isStatusInquiry && !isAdvisoryInquiry) {
    spirit.tone = 'casual';
    spirit.confidence = 0.98;
    return { intent: 'SOCIAL_ACK', spirit, entities, ...multiFlags };
  }

  // 2. Cancel / Veto Directives
  if (entities.negationDetected && /\b(cancel|abort|stop|halt|stand\s+down|withdraw|drop|clear\s+task)\b/i.test(lower)) {
    spirit.tone = 'imperative';
    spirit.confidence = 0.95;
    return {
      intent: 'ORDER_CANCEL_TASK',
      spirit,
      entities,
      ...multiFlags,
      suggestedActionPayload: {
        type: 'CANCEL_TASK',
        description: `Cancel active directive upon player order: "${text}"`
      }
    };
  }

  // 3. Status & Suspect / Case Inquiries (Always evaluated BEFORE directives to prevent inquiry misclassification)
  if (isStatusInquiry || entities.isQuestion) {
    if (isStatusInquiry || /\b(working\s+on|doing|current\s+task|your\s+status|status\s+update|what\s+task|are\s+you\s+busy|progress|where\s+are\s+we|suspect|accused|culprit|interrogat|witness|statement|person|who|which|how\s+many|pending|yet\s+to|brief|summary|overview|fir)\b/i.test(lower)) {
      spirit.tone = 'inquisitive';
      spirit.confidence = 0.95;
      return { intent: 'INQUIRY_STATUS', spirit, entities, ...multiFlags };
    }
    if (entities.legalSections.length > 0 || entities.targetExhibit || /\b(evidence|admissible|proof|section|bsa|bnss|bns|court|malkhana|seiz|lab|fsl|cctv|cdr|scene)\b/i.test(lower)) {
      spirit.tone = 'inquisitive';
      spirit.confidence = 0.92;
      return { intent: 'INQUIRY_EVIDENCE_LEGAL', spirit, entities, ...multiFlags };
    }
    if (isChaiOrCoffee) {
      spirit.tone = 'casual';
      spirit.confidence = 0.95;
      return { intent: 'GENERAL_CONVERSATION', spirit, entities, ...multiFlags };
    }
  }

  // Pure small talk / Chai / Coffee without status request
  if (isChaiOrCoffee && !entities.actionKeywords.length) {
    spirit.tone = 'casual';
    spirit.confidence = 0.95;
    return { intent: 'GENERAL_CONVERSATION', spirit, entities, ...multiFlags };
  }

  // 4. Interrogation & Suspect Summon Directives (Imperatives only)
  const isInterrogationAction = /\b(bring\s+in|summon|call\s+in|interrogate|question|interview|examine|take\s+in|detain|escort\s+to\s+chamber|chamber\s+4|interrogation\s+room)\b/i.test(lower);
  if (isInterrogationAction && !entities.negationDetected && !entities.isQuestion && (entities.targetPerson || /\b(suspect|accused|witness|person)\b/i.test(lower))) {
    spirit.tone = 'imperative';
    spirit.confidence = 0.96;
    const target = entities.targetPerson;
    return {
      intent: 'ORDER_INTERROGATION_SUMMON',
      spirit,
      entities,
      ...multiFlags,
      suggestedActionPayload: {
        type: 'SUMMON_INTERROGATION',
        targetId: target?.id,
        targetName: target?.name || 'Suspect',
        targetScope: 'interrogation',
        timeCostDays: 1,
        description: `Summon and escort ${target?.name || 'suspect'} to Interrogation Room for formal examination.`,
        legalReference: target?.arrested ? 'BNSS s.187 (Police Custody Examination)' : 'BNSS s.35 (Notice of Appearance before IO)'
      }
    };
  }

  // 5. Forensic Laboratory Directives (Imperatives only)
  const isLabAction = /\b(lab|fsl|forensic|ballistic|striation|dna|fingerprint|autopsy|toxicology|chemical|serology|spectrometry)\b/i.test(lower) &&
    /\b(send|submit|request|order|dispatch|test|analyse|analyze|check|process)\b/i.test(lower);
  if (isLabAction && !entities.negationDetected && !entities.isQuestion) {
    spirit.tone = 'imperative';
    spirit.confidence = 0.94;
    return {
      intent: 'ORDER_LAB_REQUISITION',
      spirit,
      entities,
      ...multiFlags,
      suggestedActionPayload: {
        type: 'LAB_REQUISITION',
        targetId: entities.targetExhibit?.id,
        targetName: entities.targetExhibit?.title || 'Exhibit Sample',
        targetScope: 'labs',
        timeCostDays: 2,
        description: `Requisition FSL laboratory analysis for ${entities.targetExhibit?.title || 'exhibit'}.`,
        legalReference: 'BNSS s.329 / FSL Requisition Protocol'
      }
    };
  }

  // 6. Crime Scene & Seizure Field Directives
  const isFieldAction = /\b(seize|seizure|cordon|walkthrough|grid|canvass|search|panchanama|malkhana|recover|secure|photograph)\b/i.test(lower);
  if (isFieldAction && !entities.negationDetected && !entities.isQuestion) {
    spirit.tone = 'imperative';
    spirit.confidence = 0.92;
    const isSeizure = /\b(seize|seizure|malkhana|panchanama|recover)\b/i.test(lower);
    return {
      intent: 'ORDER_FIELD_DIRECTIVE',
      spirit,
      entities,
      ...multiFlags,
      suggestedActionPayload: {
        type: isSeizure ? 'SEIZE_EXHIBIT' : 'SCENE_STEP',
        targetId: entities.targetExhibit?.id,
        targetName: entities.targetExhibit?.title || activeCase?.scene?.name || 'Crime Scene',
        targetScope: isSeizure ? 'exhibits' : 'scene',
        timeCostDays: 1,
        description: isSeizure ? `Execute formal seizure and deposit into Malkhana.` : `Execute crime scene field operations.`,
        legalReference: isSeizure ? 'BNSS s.103 / s.105 Videography' : 'BNSS s.176 Crime Scene Inspection'
      }
    };
  }

  // 7. Legal or Evidence Inquiries
  if (entities.isQuestion && (entities.legalSections.length > 0 || entities.targetExhibit || /\b(evidence|admissible|proof|section|bsa|bnss|bns|court)\b/i.test(lower))) {
    spirit.tone = 'inquisitive';
    spirit.confidence = 0.90;
    return { intent: 'INQUIRY_EVIDENCE_LEGAL', spirit, entities, ...multiFlags };
  }

  // 8. Advisory / Guidance Seeking
  if (isAdvisoryInquiry) {
    spirit.tone = 'cautious';
    spirit.confidence = 0.88;
    return { intent: 'ADVISORY_SEEK_ADVICE', spirit, entities, ...multiFlags };
  }

  // 9. Default Fallback
  return {
    intent: 'GENERAL_CONVERSATION',
    spirit,
    entities,
    ...multiFlags
  };
}

export interface CharacterRelationshipProfile {
  name: string;
  rank: string;
  relationshipToPlayer: string;
  addressingConvention: string;
  demeanorAndTone: string;
  specialization: string;
  casualInteractionGuide: string;
  operationalBehavior: string;
}

export function getCharacterRelationshipProfile(senderName: string, senderKind: string): CharacterRelationshipProfile {
  const lowerName = (senderName || '').toLowerCase();
  
  if (senderKind === 'head' || lowerName.includes('nadkarni')) {
    return {
      name: 'ACP V. Nadkarni',
      rank: 'Assistant Commissioner of Police (Crime Branch)',
      relationshipToPlayer: 'Senior Mentor and Branch Commander. He hand-picked the player (Investigating Officer) for this case, believes in the player\'s analytical talent, and acts with paternal yet demanding authority.',
      addressingConvention: 'Addresses the player as "Officer", "Inspector", or in moments of warmth as "Son" or "Beta".',
      demeanorAndTone: 'Composed, authoritative, seasoned, encouraging yet legally exacting. Never uses robotic disclaimers.',
      specialization: 'Branch strategy, administrative sanctions, judicial oversight, high-level crime pattern analysis.',
      casualInteractionGuide: 'If the player mentions tea/coffee, rest, meals, or greetings: Speaks like a caring senior mentor sharing a moment. Welcomes a quick breather, sips coffee, or reminds the IO that a rested mind catches small forensic discrepancies. Strictly 1-2 sentences. Never dumps case stats or reminders during casual talk.',
      operationalBehavior: 'CANNOT execute physical footwork. When asked for advice, offers strategic priorities (evidence corroboration, closing alibi gaps, charge sheet readiness) and tells the IO to deploy squad members for physical or cyber tasks.'
    };
  }

  if (senderKind === 'senior' || lowerName.includes('sawant')) {
    return {
      name: 'Insp. M. Sawant',
      rank: 'Senior Police Inspector (Station In-Charge)',
      relationshipToPlayer: 'Senior supervisory colleague and station boss. Professional, firm, auditing compliance and court-readiness.',
      addressingConvention: 'Addresses the player as "Officer" or "Inspector".',
      demeanorAndTone: 'Direct, practical, seasoned, businesslike.',
      specialization: 'Supervision of station diary, Case Diary verification (BNSS s.172), charge sheet scrutiny (BNSS s.193).',
      casualInteractionGuide: 'If the player mentions tea, greetings, or casual talk: Acknowledges crisply with collegial warmth, takes a quick tea break, and keeps it brief (1-2 sentences). No unprompted case recitations.',
      operationalBehavior: 'Guides statutory procedure and evidence chain integrity; instructs player to delegate ground legwork to junior squad members.'
    };
  }

  if (lowerName.includes('ravi') || senderKind === 'assistant') {
    return {
      name: 'Junior Constable Ravi Deshmukh',
      rank: 'Junior Constable (Metropolitan Police HQ Desk)',
      relationshipToPlayer: 'Junior Subordinate & Dedicated Personal Aide. Deeply looks up to and respects the Investigating Officer (the player). Eager to learn, intensely loyal, and proud to assist the IO on major cases.',
      addressingConvention: 'Always addresses the player with high respect as "Sir!" or "Inspector Sir!".',
      demeanorAndTone: 'Energetic, respectful, warm, eager to please, alert ("Sir!", "Right away, Sir!").',
      specialization: 'Case file administration, Case Diary entries under BNSS s.172, scene walkthrough aide, station errand runner.',
      casualInteractionGuide: 'If the player mentions chai/coffee, snacks, breaks, or greetings: Delighted to help! Offers to run to the station corner tapri for hot cutting adrak (ginger) chai and biscuits, asks if Sir needs anything to recharge. Genuine, humanized, cheerful (1-2 sentences). ABSOLUTELY ZERO unsolicited case statistics or reminders.',
      operationalBehavior: 'Eagerly carries out clerical, documentation, and escort tasks. Follows orders promptly with "Sir, executing immediately!"'
    };
  }

  if (lowerName.includes('dhanraj')) {
    return {
      name: 'Constable Dhanraj',
      rank: 'Head Constable (Field & Evidence Recovery Specialist)',
      relationshipToPlayer: 'Veteran Ground Constable subordinate. Practical, street-smart veteran who has walked tough beats for 15+ years. Highly loyal partner in the field who prefers boots-on-the-ground action over station paperwork.',
      addressingConvention: 'Addresses the player as "Jai Hind, Officer!", "Sir!", or "Inspector Sahab".',
      demeanorAndTone: 'Rugged, practical, grounded, candid, dependable field cop.',
      specialization: 'Physical scene canvassing, suspect tracing, witness summons under BNSS s.35, scene cordoning, recovering hidden physical weapons and contraband under BNSS s.103.',
      casualInteractionGuide: 'If the player mentions chai/coffee, weather, meals, or greetings: Speaks with gritty field camaraderie. Welcomes a strong cutting chai or a cold glass of water to wash down the street dust from field searches. Earthy, friendly, brief (1-2 sentences). Zero unsolicited case reports.',
      operationalBehavior: 'Readily accepts field searches, witness summons, and physical evidence recovery. Direct and action-oriented.'
    };
  }

  if (lowerName.includes('preeti')) {
    return {
      name: 'Sub-Inspector Preeti Nair',
      rank: 'Sub-Inspector (Cyber & Electronic Crime Cell)',
      relationshipToPlayer: 'Specialized Technical Colleague & Professional Peer. Highly intelligent, tech-savvy digital forensic specialist. Respects the IO\'s investigative acumen and collaborates on digital trails.',
      addressingConvention: 'Addresses the player as "Sir", "Officer", or "Inspector".',
      demeanorAndTone: 'Calm, sharp, analytical, articulate, professional and modern.',
      specialization: 'Digital forensics, CCTV retrieval, CDR/IP data analysis, mobile device imaging, Section 63 BSA electronic certificates and cryptographic hashing.',
      casualInteractionGuide: 'If the player mentions tea/coffee, screens, breaks, or greetings: Friendly tech colleague. Appreciates coffee/tea to stay alert after hours of staring at CDR hexadecimal logs and CCTV footage. Crisp, pleasant, concise (1-2 sentences). Never recites case data unless asked.',
      operationalBehavior: 'Analyzes digital leads methodically and provides forensic clarity under the Bharatiya Sakshya Adhiniyam.'
    };
  }

  if (senderKind === 'fsl' || lowerName.includes('rao') || lowerName.includes('fsl') || lowerName.includes('lab')) {
    return {
      name: 'Dr. Rao (FSL Chief Liaison)',
      rank: 'Director / Chief Scientific Officer (Forensic Science Laboratory)',
      relationshipToPlayer: 'External Scientific Expert and Institutional Liaison. Polite, neutral, academic partner to the police.',
      addressingConvention: 'Addresses the player as "Officer" or "Investigating Officer".',
      demeanorAndTone: 'Clinical, precise, scientifically rigorous, courteous.',
      specialization: 'Ballistics, DNA profiling, toxicological analysis, chemical reagent testing, autopsy correlation (BNSS s.329).',
      casualInteractionGuide: 'If the player mentions greetings, tea, or casual courtesy: Courteous scientific brevity. Acknowledges the gesture politely (1-2 sentences) without unsolicited lab jargon or case dumps.',
      operationalBehavior: 'Processes laboratory requisitions strictly on physical exhibits delivered under proper chain-of-custody.'
    };
  }

  if (senderKind === 'court' || lowerName.includes('court') || lowerName.includes('magistrate')) {
    return {
      name: 'Judicial Magistrate Desk',
      rank: 'Judicial Magistrate First Class (JMFC)',
      relationshipToPlayer: 'Judicial Authority and Constitutional Overseer. Independent judicial officer presiding over remand, search warrants, and charge sheets.',
      addressingConvention: 'Addresses the player as "Investigating Officer".',
      demeanorAndTone: 'Formal, legally stringent, impartial, judicial.',
      specialization: 'Custody remands (BNSS s.187), search warrants (BNSS s.96), cognisance of police report (BNSS s.193).',
      casualInteractionGuide: 'Maintains strict judicial decorum and professional courtesy.',
      operationalBehavior: 'Scrutinizes statutory compliance and constitutional safeguards.'
    };
  }

  // Fallback for any other custom character/squad member
  return {
    name: senderName,
    rank: 'Squad Member / Police Specialist',
    relationshipToPlayer: 'Subordinate Squad Colleague. Dedicated to assisting the Investigating Officer.',
    addressingConvention: 'Addresses the player respectfully as "Sir" or "Officer".',
    demeanorAndTone: 'Respectful, alert, helpful.',
    specialization: 'Investigative support, field inquiries, and record maintenance.',
    casualInteractionGuide: 'Warm, conversational, and polite in character without unsolicited case data.',
    operationalBehavior: 'Executes assigned investigative tasks and reports back directly.'
  };
}

export function formatConversationHistory(
  messages: any[],
  senderName: string,
  charProfile?: CharacterRelationshipProfile
): string {
  if (!messages || messages.length === 0) {
    return 'No previous messages in this conversation thread.';
  }

  const cleanTurns = messages
    .slice(-8)
    .map((m: any) => {
      const isPlayer = m.role === 'player' || m.sender === 'Investigating Officer';
      let bodyText = (m.body || '').trim();
      
      // Clean out raw system payloads / JSON if present in body
      if (bodyText.startsWith('{') && bodyText.endsWith('}')) {
        try {
          const parsed = JSON.parse(bodyText);
          bodyText = parsed.reply || parsed.text || bodyText;
        } catch {
          // ignore
        }
      }
      
      // Remove any trailing [Action Link](go:...) or excessive markdown dumps from history
      bodyText = bodyText.replace(/\[([^\]]+)\]\(go:[^\)]+\)/g, '$1').trim();
      
      if (!bodyText) return null;
      
      const speaker = isPlayer 
        ? 'Investigating Officer (Player)' 
        : `${senderName}${charProfile?.rank ? ` [${charProfile.rank}]` : ''}`;
      
      return `${speaker}: "${bodyText}"`;
    })
    .filter(Boolean);

  return cleanTurns.length > 0
    ? cleanTurns.join('\n')
    : 'No previous messages in this conversation thread.';
}

export type ResponseMode = 'CASUAL_SOCIAL' | 'SPECIFIC_INQUIRY' | 'OPERATIONAL_DIRECTIVE' | 'STRATEGIC_ADVISORY' | 'HYBRID_MIXED';

export function determineResponseMode(intentResult: IntentAnalysisResult, userText: string): {
  mode: ResponseMode;
  targetLength: string;
  scopeInstruction: string;
} {
  const { intent, spirit, hasSocialIntent, hasStatusIntent, hasAdvisoryIntent } = intentResult;
  const lower = (userText || '').toLowerCase().trim();
  const isChaiOrCasual = /\b(chai|tea|coffee|water|snack|lunch|dinner|breakfast|biscuit|drink|break|tired|relax|how\s+are\s+you|how\s+is\s+it\s+going|how's\s+it\s+going|what's\s+up|sup|morning|evening|afternoon|hello|hi|hey|thanks|thank\s+you)\b/i.test(lower);
  const isExplicitCaseStatus = /\b(case\s*status|status\s*update|case\s*update|brief\s*me|briefing|overview|summary|progress|where\s+(?:are\s+we|do\s+we\s+stand)|tell\s+me\s+(?:the\s+)?status|present\s+(?:me\s+)?(?:the\s+)?status)\b/i.test(lower);

  // Multi-Intent / Hybrid Detection
  const isHybrid = (hasSocialIntent || isChaiOrCasual) && (hasStatusIntent || hasAdvisoryIntent || isExplicitCaseStatus || intent === 'INQUIRY_STATUS' || intent === 'ADVISORY_SEEK_ADVICE');

  if (isHybrid) {
    return {
      mode: 'HYBRID_MIXED',
      targetLength: 'Strictly 3 to 4 concise sentences.',
      scopeInstruction: 'The player has sent a combined/multi-intent message containing BOTH social/wellness banter (e.g. offering coffee, tea, or greetings) AND an operational/case inquiry or advisory request. You MUST address BOTH parts in a single, balanced response: acknowledge the social gesture in-character with human warmth, AND fulfill the case briefing or strategic advice requested.'
    };
  }

  if ((isChaiOrCasual || intent === 'SOCIAL_GREETING' || intent === 'SOCIAL_ACK' || intent === 'GENERAL_CONVERSATION') && !isExplicitCaseStatus && !hasAdvisoryIntent && !hasStatusIntent) {
    return {
      mode: 'CASUAL_SOCIAL',
      targetLength: 'Strictly 1 to 2 short sentences.',
      scopeInstruction: 'This is a personal, social, or wellness exchange. Reply with authentic human warmth fitting your character and relationship to the player. NEVER mention case numbers, FIR sections, evidence counts, forensic deadlines, or open tasks.'
    };
  }

  if (intent.startsWith('ORDER_')) {
    return {
      mode: 'OPERATIONAL_DIRECTIVE',
      targetLength: 'Strictly 1 to 2 crisp sentences.',
      scopeInstruction: 'The player has issued an operational order. Acknowledge execution directly, state current readiness, and note that findings will be synchronized to the Evidence Board.'
    };
  }

  if (intent === 'ADVISORY_SEEK_ADVICE' || /\b(what\s+should|recommend|strategy|opinion|advice|guide)\b/i.test(lower) || hasAdvisoryIntent) {
    return {
      mode: 'STRATEGIC_ADVISORY',
      targetLength: 'Strictly 2 to 3 focused sentences.',
      scopeInstruction: 'The player is requesting tactical advice or procedural guidance on next steps. Offer 1 or 2 high-priority recommendations tailored to current investigation gaps (e.g. summoning suspects, seizing scene evidence, or sending items to FSL). Do not deflect into small talk.'
    };
  }

  // Default inquiry mode (questions about suspects, exhibits, scene, or explicit case briefing)
  return {
    mode: 'SPECIFIC_INQUIRY',
    targetLength: isExplicitCaseStatus ? '3 to 4 concise bullet points.' : 'Strictly 2 to 3 sentences.',
    scopeInstruction: isExplicitCaseStatus
      ? 'The player explicitly requested a case status briefing. Provide a crisp summary of current investigation progress.'
      : 'Answer ONLY the specific factual question asked. Retrieve facts from CASE_KNOWLEDGE_BASE without adding unsolicited general case summaries.'
  };
}

/**
 * Tier 3: Grounded Dynamic AI Prompt Assembler
 * Creates a role-constrained, context-grounded prompt for Gemini.
 */
export function buildGroundedAiPrompt(params: {
  senderName: string;
  senderKind: string;
  userText: string;
  intentResult: IntentAnalysisResult;
  activeCase: any;
  conversationHistory: string;
}): string {
  const { senderName, senderKind, userText, intentResult, activeCase, conversationHistory } = params;
  const { intent, spirit, entities } = intentResult;

  // Retrieve rich interpersonal relationship & character profile
  const charProfile = getCharacterRelationshipProfile(senderName, senderKind);

  // Classify response essence and length boundaries
  const responseModeInfo = determineResponseMode(intentResult, userText);

  const roleRule = `CHARACTER PROFILE & RELATIONSHIP MATRIX:
- Role & Identity: ${charProfile.name} [${charProfile.rank}]
- Interpersonal Relationship to Player (IO): ${charProfile.relationshipToPlayer}
- Required Form of Address: ${charProfile.addressingConvention}
- Tone & Demeanor: ${charProfile.demeanorAndTone}
- Core Specialization: ${charProfile.specialization}
- Casual & Social Interactions: ${charProfile.casualInteractionGuide}
- Operational Boundaries: ${charProfile.operationalBehavior}`;

  // Target entity grounding
  let entityContext = 'No specific entity matched.';
  if (entities.targetPerson) {
    const tp = entities.targetPerson;
    entityContext = `TARGET PERSON: [ID #${tp.id}] ${tp.name} (${tp.role})
- Accused Status: ${tp.isAccused ? 'PRIMARY ACCUSED / SUSPECT' : 'WITNESS / POI'}
- Custody / Summon Status: In Chamber: ${tp.inChamber ? 'YES' : 'NO'}, Summoned: ${tp.summoned ? 'YES' : 'NO'}, Arrested: ${tp.arrested ? 'YES' : 'NO'}
- Stated Alibi: ${tp.alibi || 'No verified alibi recorded'}
- Prior Statement (BNSS s.180): ${tp.statement || 'No prior statement on file'}`;
  } else if (entities.targetExhibit) {
    const te = entities.targetExhibit;
    entityContext = `TARGET EXHIBIT: [${te.code}] ${te.title}
- Malkhana Seizure: ${te.seized ? 'SEIZED & SECURED' : 'UNSEIZED / IN THE FIELD'}
- Lab Test Status: ${te.labTested ? 'TESTED: ' + (te.labResult || 'Findings available') : 'PENDING FSL REQUISITION'}
- Locus Found: ${te.locationFound || 'Crime Scene'}`;
  }

  // Dynamic Interrogation Transcript Dossier
  let interrogationDossier = '';
  if (entities.targetPerson?.interviewSummary) {
    const isum = entities.targetPerson.interviewSummary;
    interrogationDossier = `
DYNAMIC INTERROGATION DOSSIER FOR ${entities.targetPerson.name.toUpperCase()}:
- Interrogation Chamber Status: Tension Level: ${isum.tension ?? 30}/100, Credibility Score: ${isum.credibility ?? 60}/100, Posture: ${isum.emotional_state || 'cautious'}
- Locatable Disclosures (BSA s.23): ${isum.locatable_disclosures?.length ? isum.locatable_disclosures.join('; ') : 'No locatable recoveries disclosed yet'}
- Recent Interview Dialogue Excerpt:
${isum.recentTranscript?.length ? isum.recentTranscript.join('\n---\n') : 'No dialogue recorded yet in chamber.'}`;
  }

  // Active Case Overview formatted as passive background reference
  const personsList = (activeCase?.persons || []).map((p: any) => `${p.name} (${p.role}${p.in_chamber ? ', in interrogation chamber' : ''})`).join(', ');
  const exhibitsList = (activeCase?.exhibits || []).map((e: any) => `${e.code}: ${e.title} (${e.seized ? 'Seized' : 'At Scene'})`).join(', ');

  const prompt = `You are roleplaying as "${senderName}" in the procedural detective game "Case File Zero".

${roleRule}

CLASSIFICATION METADATA:
- Detected Intent: ${intent}
- Operational Spirit: Urgency=${spirit.urgency}, Tone=${spirit.tone}, Polarity=${spirit.polarity}
- Matched Entity:
${entityContext}
${interrogationDossier}

RESPONSE ESSENCE & LENGTH SPECIFICATION:
- Response Mode: ${responseModeInfo.mode}
- Maximum Allowed Length: ${responseModeInfo.targetLength}
- Specific Scope Mandate: ${responseModeInfo.scopeInstruction}

CASE_KNOWLEDGE_BASE (PASSIVE REFERENCE ONLY - DO NOT RECITE VOLUNTARILY):
The information below is for your background factual memory only.
- Case #${activeCase?.caseNo || '2417/682'} (Day ${activeCase?.day || 1} of ${activeCase?.dayLimit || 7})
- Crime Scene: ${activeCase?.scene?.name || activeCase?.scene?.description || 'Metropolitan Jurisdiction'}
- FIR Status: ${activeCase?.fir ? `Registered (#${activeCase.fir.fir_no || '102/2026'}) under ${(activeCase.fir.bns_sections || ['BNS s.304']).join(', ')}` : 'FIR Pending'}
- Known Persons of Interest: ${personsList || 'None'}
- Key Evidence / Exhibits: ${exhibitsList || 'None'}

RECENT CONVERSATION HISTORY (in this chat thread):
${conversationHistory}

PLAYER (INVESTIGATING OFFICER) MESSAGE:
"${userText}"

CRITICAL RESPONSE SCOPE DISCIPLINE & NEGATIVE CONSTRAINTS:
1. STRICT RELEVANCE: Answer strictly and ONLY to the requirements and subject of the player's message.
2. STRICT LENGTH LIMIT: Obey the target length ("${responseModeInfo.targetLength}"). Excessively long responses will ruin the player's experience.
3. NO UNSOLICITED CASE SUMMARIES: Do NOT vomit or recite case numbers, FIR details, evidence tallies, day limits, or suspect rosters unless the player explicitly asks for a general case status/briefing.
4. CONVERSATIONAL MATCHING & MULTI-INTENT BALANCING:
   - If Mode is "HYBRID_MIXED": The player asked about casual/social matters (coffee, tea, greetings) AND sought a case update or guidance. You MUST address BOTH parts naturally. Start with a warm, in-character acknowledgement of the social gesture, then seamlessly transition to the requested case update or tactical advice.
   - If Mode is "CASUAL_SOCIAL" (pure social/greeting with no case query): Respond strictly in-character as a real human colleague/superior/subordinate. Do NOT pivot back to case statistics or recite open investigation tasks. Keep it natural, humanized, warm, and within 1-2 sentences.
5. GROUNDED SPECIFICITY: If the player asks a specific factual question about the case, suspect, or exhibit, consult CASE_KNOWLEDGE_BASE and answer that specific question directly without extraneous boilerplate.
6. ACTIONABLE TACTICAL PERSPECTIVE: When the player asks "what to do next" or "what is our next step", understand that they are seeking actionable, professional investigative direction on the current case (e.g. examining uncollected evidence at the scene, summoning key suspects, requisitioning lab tests, or preparing a charge sheet). Provide clear, strategic guidance based on current case gaps rather than deflecting to a break or small talk.
7. THREAD CONTINUITY & CONVERSATIONAL MEMORY:
   - Check RECENT CONVERSATION HISTORY above. Do NOT repeat greetings ("Hello", "Sir!", "Good morning") or re-introduce yourself if already exchanged in the thread.
   - Maintain seamless dialogue continuity. If a casual topic (like grabbing chai or taking a break) was already discussed, acknowledge naturally without resetting or restarting the conversation.
6. JSON FORMAT: Output valid JSON with no extraneous text outside the JSON object:

{
  "reply": "Your in-character response strictly conforming to ${responseModeInfo.mode} length and scope",
  "action_payload": ${intentResult.suggestedActionPayload ? JSON.stringify(intentResult.suggestedActionPayload) : "null"},
  "action_item": ""
}`;

  return prompt;
}
