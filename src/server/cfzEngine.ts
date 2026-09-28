import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { DEFAULT_GEMINI_MODEL, isGeminiQuotaBlocked, reportGeminiQuotaError, generateCaseWithAI, classifyTaskComplexity, generateWithFallback, type GenerationResult } from './geminiHandler.js';
import { classifySpiritAndIntent, buildGroundedAiPrompt, formatConversationHistory, tagEntities, type IntentAnalysisResult } from './intentPipeline.js';
import { applyTactic, makeDecision, closeSession, getSquadInterrogationPersona, calculateEvidenceSlamImpact, validateDiscoveryMemoBSA23, evaluateBreakdownState, clamp, type TacticType, type QuadrantDecision, type SquadInterrogationPersona } from '../engine/interrogation.js';
import { type InterrogationState, type InterrogationTurn, getConfrontedEvidenceContext, getCustodyFatigueContext, getAdvocateIntervention, getAdvocateProfileForSuspect, type AdvocateIntervention, parseInterrogationIntents, type InterrogationQuestionIntents, extractInterrogationRoomLedger, type InterrogationSessionLedger, buildInterrogationRoomChatSummary } from '../engine/interrogation-context.js';
import { buildInterrogationPrompt } from '../prompts/interrogation.js';
import { extractLeads } from '../engine/lead-parser.js';
import { profileFor, breakingPointFor } from '../data/case_seed.js';

const DATA_DIR = path.resolve(process.cwd(), 'src/data/cfz');
const PERSISTED_STATE_PATH = path.resolve(process.cwd(), 'src/data/cfz/persisted_state.json');

function loadJson<T>(filename: string, fallback: T): T {
  try {
    const fullPath = path.join(DATA_DIR, filename);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Failed to load ${filename}:`, err);
  }
  return fallback;
}

export class CfzEngine {
  private bootstrapData: any;
  private player: any;
  private cases: any[];
  private team: any[];
  private threads: any[];
  private legalRefs: any[];
  private forms: any[];
  private candidates: any[];
  private snapshots: Map<number, any> = new Map();
  private chatThreads: Map<number, any> = new Map();
  private guideData: any;
  private legalBns: any;
  private legalBnss: any;
  private legalBsa: any;
  private legalAllied: any;
  private applyQuestions: any;
  private applySubjective: any;
  private labCatalogue: any[];
  private rev: number = Date.now();
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    this.bootstrapData = loadJson('bootstrap.json', {});
    this.player = this.bootstrapData.player || {
      id: 1,
      handle: 'io',
      fullName: 'Investigating Officer',
      rank: 'PSI (Direct)',
      reputation: 'Result-oriented, by the book',
      integrity: 52,
      competence: 84,
      standing: 86,
      casesClosed: 1,
      convictions: 1,
      acquittals: 0,
      applicationState: 'inducted',
      badgeNo: 'MCB-4512',
      posting: 'Crime Branch, Malhar Division',
      activeCaseId: 2,
      settings: {
        language: 'en',
        legalGuidance: true,
        procedureCoach: true,
        onDemandHelp: true,
        interrogationAid: true,
        evidenceAid: true,
        chargeAid: true,
        ingredientHighlight: true,
        consequencePreview: true,
        notepadSuggestions: true,
        presentation: {
          textScale: 1,
          dyslexicFont: false,
          reducedMotion: false,
          monoDossier: false,
          colourSafeTags: true,
          typewriter: true,
          ambience: 13,
          stringDensity: 'normal'
        },
        ai: {
          tier: 'balanced',
          streaming: false,
          suspectTemperature: 0.7,
          neverInventFacts: true
        }
      }
    };

    const casesFile = loadJson<any>('cases.json', { cases: [] });
    this.cases = casesFile.cases || this.bootstrapData.cases || [];

    this.team = this.bootstrapData.team || [];
    this.threads = this.bootstrapData.threads || [];
    this.legalRefs = this.bootstrapData.legalRefs || [];
    this.forms = this.bootstrapData.forms || [];
    this.candidates = this.bootstrapData.candidates || [];

    // Load snapshots
    const snap2 = this.bootstrapData.snapshot || loadJson<any>('case2.json', {}).snapshot;
    if (snap2) {
      this.recalculateCaseReadiness(snap2);
      this.snapshots.set(2, snap2);
    }

    const case1File = loadJson<any>('case1.json', {});
    if (case1File.snapshot) {
      this.recalculateCaseReadiness(case1File.snapshot);
      this.snapshots.set(1, case1File.snapshot);
    }

    // Load chats
    for (let i = 1; i <= 9; i++) {
      const chatFile = loadJson<any>(`chat_${i}.json`, null);
      if (chatFile) this.chatThreads.set(i, chatFile);
    }

    this.guideData = loadJson('guide.json', { guide: [] });
    this.legalBns = loadJson('legal_bns.json', { total: 350, rows: [] });
    this.legalBnss = loadJson('legal_bnss.json', { total: 531, rows: [] });
    this.legalBsa = loadJson('legal_bsa.json', { total: 170, rows: [] });
    this.legalAllied = loadJson('legal_allied.json', { total: 12, rows: [] });
    this.applyQuestions = loadJson('apply_q.json', { questions: [] });
    this.applySubjective = loadJson('apply_subj.json', { questions: [] });
    this.labCatalogue = loadJson<any>('lab_cat.json', { catalogue: [] }).catalogue || [];

    // Load persisted real-time game state (chat history, directives, cases) from disk
    this.loadPersistedState();

    if (process.env.GEMINI_API_KEY) {
      try {
        this.geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      } catch (e) {
        console.warn('Gemini client init skipped:', e);
      }
    }
  }

  public saveState(): void {
    try {
      const serializedSnapshots: Record<string, any> = {};
      this.snapshots.forEach((val, key) => {
        serializedSnapshots[String(key)] = val;
      });

      const serializedChatThreads: Record<string, any> = {};
      this.chatThreads.forEach((val, key) => {
        serializedChatThreads[String(key)] = val;
      });

      const dataToSave = {
        savedAt: new Date().toISOString(),
        rev: this.rev,
        player: this.player,
        cases: this.cases,
        team: this.team,
        threads: this.threads,
        candidates: this.candidates,
        snapshots: serializedSnapshots,
        chatThreads: serializedChatThreads
      };

      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      fs.writeFileSync(PERSISTED_STATE_PATH, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save state to disk:', err);
    }
  }

  public loadPersistedState(): boolean {
    try {
      if (fs.existsSync(PERSISTED_STATE_PATH)) {
        const raw = fs.readFileSync(PERSISTED_STATE_PATH, 'utf-8');
        const data = JSON.parse(raw);
        if (data) {
          if (data.player) this.player = { ...this.player, ...data.player };
          if (data.cases && Array.isArray(data.cases) && data.cases.length) this.cases = data.cases;
          if (data.team && Array.isArray(data.team) && data.team.length) this.team = data.team;
          if (data.threads && Array.isArray(data.threads) && data.threads.length) this.threads = data.threads;
          if (data.candidates && Array.isArray(data.candidates) && data.candidates.length) this.candidates = data.candidates;
          if (data.rev) this.rev = data.rev;

          if (data.snapshots && typeof data.snapshots === 'object') {
            Object.keys(data.snapshots).forEach(caseIdStr => {
              const snap = data.snapshots[caseIdStr];
              if (snap) {
                this.ensureLocalityResidents(snap, Number(caseIdStr));
                if (Array.isArray(snap.directiveQueue)) {
                  snap.directiveQueue.forEach((d: any) => {
                    if (d.status === 'completed') {
                      this.applyDirectiveCompletionEffects(snap, d, d.memberName || 'Squad Member');
                    }
                  });
                }
                this.recalculateCaseReadiness(snap);
                this.snapshots.set(Number(caseIdStr), snap);
              }
            });
          }

          if (data.chatThreads && typeof data.chatThreads === 'object') {
            Object.keys(data.chatThreads).forEach(threadIdStr => {
              const thread = data.chatThreads[threadIdStr];
              if (thread) {
                if (thread.messages) {
                  thread.messages = this.sanitizeThreadMessages(thread.messages);
                }
                this.chatThreads.set(Number(threadIdStr), thread);
              }
            });
          }
          return true;
        }
      }
    } catch (err) {
      console.warn('Failed to load persisted state:', err);
    }
    return false;
  }

  public ensureLocalityResidents(snap: any, caseId: number = 2): void {
    if (!snap) return;
    snap.persons = snap.persons || [];
    snap.consentedWitnesses = snap.consentedWitnesses || [];

    const defaultResidentsCase2 = [
      // NORTH SECTOR
      {
        id: 101,
        name: 'Firoz Khan',
        role: 'witness',
        age: 42,
        occupation: 'Taxi Driver',
        direction: 'north',
        directionLabel: 'North (Highway Approach & Stand)',
        location: 'Marol Highway Taxi Stand (80m)',
        disposition: 'willing',
        acceptanceChance: 0.95,
        portrait_key: 'gen_witness1',
        canvassQuote: 'I had parked my taxi near the junction. Three men rushed into a vehicle and sped off towards the highway link road.',
        observation: 'I saw three men rush into a white sedan with partial registration ending in 84 and speed off towards the Western Express Highway link road at extreme velocity.',
        respectableStatement: 'I have been driving a licensed taxi at this stand for 14 years. No police record, no interest or bias regarding either party.',
        consentResponse: 'Yes, Officer. As a licensed taxi operator and law-abiding citizen, I will gladly sign the panchnama and seizure memo under BNSS §103.'
      },
      {
        id: 12,
        name: 'Imran Chauhan',
        role: 'witness',
        age: 40,
        occupation: 'Chemist & Pharmacy Owner',
        direction: 'north',
        directionLabel: 'North (Highway Approach & Stand)',
        location: 'Chauhan Medicals, Shop 4',
        disposition: 'hesitant',
        acceptanceChance: 0.65,
        portrait_key: 'gen_witness1',
        canvassQuote: 'I was at the chemist counter. Someone came in asking for first-aid bandages and antiseptic in a hurry with hand abrasions.',
        observation: 'A young man in a dark hooded jacket entered around 8:40 AM asking for sterile gauze and tincture iodine. He was breathing heavily and had fresh grazed knuckles.',
        respectableStatement: 'I run a licensed retail pharmacy here. I pay GST, maintain official drug registers, and have zero bias or connection with the parties.',
        consentResponse: 'Officer, running a pharmacy alone is hectic, but if it is my statutory duty under BNSS §103 to witness the recovery, I will cooperate and sign.'
      },
      {
        id: 102,
        name: 'Deepak Rathod',
        role: 'witness',
        age: 29,
        occupation: 'Night Dhaba Assistant',
        direction: 'north',
        directionLabel: 'North (Highway Approach & Stand)',
        location: 'Highway Dhaba, Near Petrol Pump',
        disposition: 'reluctant',
        acceptanceChance: 0.2,
        portrait_key: 'gen_witness2',
        canvassQuote: 'I work late night shifts and was cleaning tables. Saw a bike idling near the culvert before the commotion.',
        observation: 'A black 150cc motorcycle was idling with lights switched off near the bridge 15 minutes before the cash van arrived.',
        respectableStatement: 'I am a worker from Raigad district. I have no quarrel with anyone and just earn daily wages.',
        consentResponse: 'Sahab, my employer will fire me if I get tangled in court hearings and police stations. Please do not make me sign as a court witness!'
      },

      // EAST SECTOR
      {
        id: 103,
        name: 'Sunita Patil',
        role: 'witness',
        age: 48,
        occupation: 'Tea Stall Proprietress',
        direction: 'east',
        directionLabel: 'East (Tea Stall & Chawl Corridor)',
        location: 'Anand Tea Stall, Opposite Bus Stop (25m)',
        disposition: 'willing',
        acceptanceChance: 0.95,
        portrait_key: 'gen_witness2',
        canvassQuote: 'I was preparing tea when I heard tyres screeching loudly and shouting near the cash van. A white getaway vehicle raced past immediately after.',
        observation: 'I was boiling morning milk when I heard tyres screeching. Two masked men struck the guard and grabbed the green currency bag. One dropped an iron rod near the rear wheel.',
        respectableStatement: 'I have run Anand Tea Stall for 22 years. Local police and all shopkeepers know me as an honest, respectable resident without any criminal history or bias.',
        consentResponse: 'Yes, Inspector Sahab. I am ready to stand as an independent panch witness and sign the seizure memo under BNSS §103 according to law.'
      },
      {
        id: 13,
        name: 'Rukhsana Fernandes',
        role: 'witness',
        age: 51,
        occupation: 'Grocery Storekeeper',
        direction: 'east',
        directionLabel: 'East (Tea Stall & Chawl Corridor)',
        location: 'Fernandes General Store, Shop 2',
        disposition: 'hesitant',
        acceptanceChance: 0.7,
        portrait_key: 'gen_witness2',
        canvassQuote: 'I saw suspicious movement behind the transformer shed. Someone dropped an object near the drain.',
        observation: 'I saw a man hastily toss a heavy metallic object into the weeds behind the drainage culvert before leaping into the getaway car.',
        respectableStatement: 'I operate a registered grocery shop and have resided here for 18 years. Completely impartial and neutral.',
        consentResponse: 'If the police ensure I won\'t face repeated court adjournments during shop hours, I am prepared to sign the seizure memo.'
      },
      {
        id: 104,
        name: 'Baban Kadam',
        role: 'witness',
        age: 52,
        occupation: 'Electrician & Resident',
        direction: 'east',
        directionLabel: 'East (Tea Stall & Chawl Corridor)',
        location: 'Room 12, Chawl No. 9',
        disposition: 'reluctant',
        acceptanceChance: 0.15,
        portrait_key: 'gen_witness1',
        canvassQuote: 'I heard shouting while fixing a meter box. Did not step out because these things get dangerous.',
        observation: 'I heard loud shouting from the road. I peeked through the window and saw two men running with a duffel bag, then quickly bolted my door.',
        respectableStatement: 'I am a peaceful resident of Room 12 living with my family.',
        consentResponse: 'Sahab, I have small grandchildren. I am terrified of criminal retaliation. I will tell you what I saw, but please do not make me sign panchnamas in court.'
      },
      {
        id: 105,
        name: 'Shailesh Gupta',
        role: 'witness',
        age: 34,
        occupation: 'Kiosk Vendor',
        direction: 'east',
        directionLabel: 'East (Tea Stall & Chawl Corridor)',
        location: 'Gupta Corner Kiosk',
        disposition: 'willing',
        acceptanceChance: 0.85,
        portrait_key: 'gen_witness1',
        canvassQuote: 'I was setting up my kiosk at 8:30 AM. Observed two individuals loitering near the bus shelter for half an hour.',
        observation: 'Two men in caps were pacing back and forth looking at their wristwatches and watching the bank road before the van pulled up.',
        respectableStatement: 'I have operated this kiosk for 8 years. Neutral independent vendor with valid municipal trade license.',
        consentResponse: 'Yes, Sir. I will witness the seizure and put my signature on the memo.'
      },

      // WEST SECTOR
      {
        id: 106,
        name: 'Mahesh Shinde',
        role: 'witness',
        age: 44,
        occupation: 'Auto Garage Owner',
        direction: 'west',
        directionLabel: 'West (Market Alley & Auto Garage)',
        location: 'Shinde Motor Works, Lane 3 (40m)',
        disposition: 'willing',
        acceptanceChance: 0.9,
        portrait_key: 'gen_witness1',
        canvassQuote: 'A white sedan came in early morning asking for immediate puncture repair; driver seemed extremely agitated.',
        observation: 'A white sedan with scuffed wheel rims pulled in at 7:50 AM asking to check tire pressure in a hurry. The driver had mud on his trousers and was constantly watching the main junction.',
        respectableStatement: 'I am a registered automotive mechanic with a licensed commercial workshop. Independent and impartial inhabitant.',
        consentResponse: 'I am an independent tradesman. I will act as a respectable panch witness under BNSS §103.'
      },
      {
        id: 107,
        name: 'Kishore Jadhav',
        role: 'witness',
        age: 56,
        occupation: 'Hardware Merchant',
        direction: 'west',
        directionLabel: 'West (Market Alley & Auto Garage)',
        location: 'Jadhav Hardware & Tools',
        disposition: 'hesitant',
        acceptanceChance: 0.6,
        portrait_key: 'gen_witness1',
        canvassQuote: 'Someone purchased a heavy 340mm hexagonal iron rod from my shop two days prior to the incident.',
        observation: 'A stocky man matching suspect Imran Pawar bought a reinforced hexagonal iron crowbar and paid in cash without taking a receipt.',
        respectableStatement: 'I have owned Jadhav Hardware for 30 years. Impartial business owner in this market.',
        consentResponse: 'If you record my statement properly and minimize court delays, I will sign the panchnama.'
      },
      {
        id: 108,
        name: 'Latika Gaikwad',
        role: 'witness',
        age: 39,
        occupation: 'Tailoring Boutique Owner',
        direction: 'west',
        directionLabel: 'West (Market Alley & Auto Garage)',
        location: 'Latika Creations, West Alley',
        disposition: 'willing',
        acceptanceChance: 0.85,
        portrait_key: 'gen_witness2',
        canvassQuote: 'Saw two men abandon a motorbike in the back lane and quickly walk through the market corridor towards the bus stop.',
        observation: 'They were wearing dark windcheaters despite the morning heat and walking briskly with heavy gym bags towards the market exit.',
        respectableStatement: 'I run my boutique peacefully. No connections or bias regarding any party.',
        consentResponse: 'Yes Officer, citizens must help the police maintain community safety. I will sign as a panch witness.'
      },

      // SOUTH SECTOR
      {
        id: 109,
        name: 'Ganesh Tandel',
        role: 'witness',
        age: 47,
        occupation: 'Municipal Water Pump Operator',
        direction: 'south',
        directionLabel: 'South (Culvert & Transformer Shed)',
        location: 'BMC Pump House, South Culvert (50m)',
        disposition: 'willing',
        acceptanceChance: 0.95,
        portrait_key: 'gen_witness1',
        canvassQuote: 'I was checking the drainage sluice valve when I spotted tire skid marks leading towards the overgrown culvert bank.',
        observation: 'Found fresh tire tread impressions in the wet mud along the culvert path and a discarded cloth with dark stains near Grid F4.',
        respectableStatement: 'I am a permanent municipal pump operator with the Municipal Corporation. Neutral, respectable public servant.',
        consentResponse: 'Being a public servant, I understand my civic duty. I will gladly sign the seizure panchnama under BNSS §103.'
      },
      {
        id: 110,
        name: 'Rafiq Ansari',
        role: 'witness',
        age: 53,
        occupation: 'Scrap & Metal Dealer',
        direction: 'south',
        directionLabel: 'South (Culvert & Transformer Shed)',
        location: 'Ansari Scrap Yard, Behind Drain',
        disposition: 'reluctant',
        acceptanceChance: 0.1,
        portrait_key: 'gen_witness1',
        canvassQuote: 'I only buy scrap metal. I heard some thud near the boundary wall around 8:40 AM but did not investigate.',
        observation: 'Saw someone toss something heavy wrapped in a rag over the boundary fence into the tall weeds near Grid F4.',
        respectableStatement: 'I run a licensed scrap yard here.',
        consentResponse: 'Babu, I beg you, do not make me a court witness! The local goons will burn down my scrap yard. I cannot sign court papers!'
      },
      {
        id: 111,
        name: 'Santosh Salvi',
        role: 'witness',
        age: 36,
        occupation: 'Electric Substation Watchman',
        direction: 'south',
        directionLabel: 'South (Culvert & Transformer Shed)',
        location: 'MSEDCL Substation Cabin',
        disposition: 'willing',
        acceptanceChance: 0.85,
        portrait_key: 'gen_witness1',
        canvassQuote: 'Was on guard duty at the transformer gate. Noticed two men running past the fence towards the main road at 8:36 AM.',
        observation: 'One of them had a bleeding scrape on his right wrist and was carrying a black duffel bag.',
        respectableStatement: 'I am an authorized security guard with verified credentials. Neutral and independent.',
        consentResponse: 'Yes, Inspector. I was on official duty and witnessed the movements. I will sign the panchnama.'
      },

      // CENTRAL SECTOR (Accused / Suspects / Complainant / Victim)
      {
        id: 8,
        name: 'Nitin Bhosale',
        role: 'complainant',
        age: 46,
        occupation: 'Accounts Cashier, Sunrise Logistics',
        direction: 'central',
        directionLabel: 'Central (Crime Epicenter)',
        location: 'Sunrise Logistics Payroll Van (0m)',
        disposition: 'accused',
        acceptanceChance: 0,
        portrait_key: 'gen_victim',
        canvassQuote: 'We were waylaid right here opposite Anand Tea stall while transporting ₹4,18,000 cash wages.',
        observation: 'Two armed men intercepted our vehicle and attacked Ramzan before fleeing with the cash bag.',
        respectableStatement: 'I am the complainant in this case.',
        consentResponse: 'Officer, I am the complainant. Under BNSS §103, I cannot act as an independent panch witness.'
      },
      {
        id: 112,
        name: 'Ramzan Sheikh',
        role: 'victim',
        age: 38,
        occupation: 'Armed Security Escort',
        direction: 'central',
        directionLabel: 'Central (Crime Epicenter)',
        location: 'Sunrise Logistics Payroll Van (0m)',
        disposition: 'accused',
        acceptanceChance: 0,
        portrait_key: 'gen_victim',
        canvassQuote: 'I was struck on the head with an iron weapon as soon as we slowed down near the culvert.',
        observation: 'Assailant struck me with an iron weapon before I could cock my escort weapon.',
        respectableStatement: 'I am the injured victim.',
        consentResponse: 'Officer, I am the injured victim. My statement is on record under BNSS §180.'
      },
      {
        id: 9,
        name: 'Imran Pawar',
        alias: 'Baba',
        role: 'suspect',
        age: 33,
        occupation: 'Unemployed / Odd Jobs',
        direction: 'central',
        directionLabel: 'Central (Crime Epicenter)',
        location: 'Central Sector',
        disposition: 'accused',
        acceptanceChance: 0,
        is_culprit: 1,
        portrait_key: 'gen_suspect1',
        canvassQuote: 'I was at home nowhere near the place. I don\'t know anything about any cash van.',
        observation: 'Claims complete ignorance of the occurrence.',
        respectableStatement: 'I am a named suspect.',
        consentResponse: 'I am being questioned as a suspect. Under BNSS §103, I cannot be a panch witness.'
      },
      {
        id: 10,
        name: 'Sneha Naik',
        role: 'suspect',
        age: 38,
        occupation: 'Logistics Desk Coordinator',
        direction: 'central',
        directionLabel: 'Central (Crime Epicenter)',
        location: 'Central Sector',
        disposition: 'accused',
        acceptanceChance: 0,
        is_culprit: 1,
        portrait_key: 'gen_suspect2',
        canvassQuote: 'I was on duty at the depot office the entire morning.',
        observation: 'Claims official presence inside office during occurrence.',
        respectableStatement: 'I am an employee under inquiry.',
        consentResponse: 'Accused persons cannot act as panchas under BNSS §103.'
      },
      {
        id: 11,
        name: 'Rukhsana Khan',
        role: 'suspect',
        age: 28,
        occupation: 'Matching Vehicle Owner',
        direction: 'central',
        directionLabel: 'Central (Crime Epicenter)',
        location: 'Central Sector',
        disposition: 'accused',
        acceptanceChance: 0,
        portrait_key: 'gen_suspect3',
        canvassQuote: 'I lent my vehicle to a cousin; I had no idea it was used near Shivaji Market.',
        observation: 'Claims vehicle was borrowed by others during occurrence.',
        respectableStatement: 'I am a vehicle owner under investigation.',
        consentResponse: 'Accused persons cannot act as panchas under BNSS §103.'
      }
    ];

    const targetList = defaultResidentsCase2;

    targetList.forEach((defP: any) => {
      let existing = snap.persons.find((p: any) => 
        (p.id && (p.id === defP.id || String(p.id) === String(defP.id))) ||
        (p.name && defP.name && p.name.toLowerCase().trim() === defP.name.toLowerCase().trim())
      );

      if (!existing) {
        existing = { ...defP, canvassed: false, consented: false, statements: [] };
        snap.persons.push(existing);
      } else {
        existing.direction = existing.direction || defP.direction;
        existing.directionLabel = existing.directionLabel || defP.directionLabel;
        existing.location = existing.location || defP.location;
        existing.disposition = existing.disposition || defP.disposition;
        existing.acceptanceChance = existing.acceptanceChance != null ? existing.acceptanceChance : defP.acceptanceChance;
        existing.occupation = existing.occupation || defP.occupation;
        existing.age = existing.age || defP.age;
        existing.portrait_key = existing.portrait_key || defP.portrait_key;
        existing.canvassQuote = existing.canvassQuote || defP.canvassQuote;
        existing.observation = existing.observation || defP.observation;
        existing.respectableStatement = existing.respectableStatement || defP.respectableStatement;
        existing.consentResponse = existing.consentResponse || defP.consentResponse;
        if (defP.is_culprit != null && existing.is_culprit == null) existing.is_culprit = defP.is_culprit;
      }

      if (existing.canvassed && existing.consented && existing.name && !snap.consentedWitnesses.includes(existing.name)) {
        snap.consentedWitnesses.push(existing.name);
      }
    });

    // Ensure direction set for any remaining dynamic AI persons
    const dirs = ['north', 'east', 'west', 'south', 'central'];
    snap.persons.forEach((p: any, idx: number) => {
      if (!p.direction) {
        const isAcc = p.role === 'suspect' || p.role === 'accused' || p.is_culprit;
        p.direction = isAcc ? 'central' : dirs[idx % dirs.length];
        p.directionLabel = `${p.direction.toUpperCase()} Sector`;
        p.location = p.location || 'Locality Vicinity';
        p.disposition = isAcc ? 'accused' : (idx % 3 === 0 ? 'hesitant' : idx % 4 === 0 ? 'reluctant' : 'willing');
        p.acceptanceChance = isAcc ? 0 : p.disposition === 'willing' ? 0.9 : p.disposition === 'hesitant' ? 0.6 : 0.15;
      }
    });
  }

  private bumpRev(): number {
    this.rev = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);
    this.saveState();
    return this.rev;
  }

  public getActiveCaseSnapshot(): any | null {
    const activeId = this.player.activeCaseId || 2;
    return this.snapshots.get(activeId) || this.snapshots.get(2) || null;
  }

  private ensureCaseExhibits(snap: any): void {
    if (!snap || !snap.exhibits) return;
    snap.exhibits.forEach((e: any) => {
      const name = (e.name || '').toLowerCase();
      const cat = (e.category || '').toLowerCase();

      // Determine required optical light spectrum
      if (!e.requiredLight) {
        if (/blood|dna|spatter|biological|stain|tissue|fluid|saliva/i.test(name) || cat === 'biological') {
          e.requiredLight = 'uv';
        } else if (/fingerprint|ridge|sebum|latch|vault/i.test(name)) {
          e.requiredLight = 'als';
        } else if (/tyre|footwear|impression|shoe|tread|lug|cut|mark/i.test(name)) {
          e.requiredLight = 'oblique';
        } else if (/drag|track|luminol|chemiluminescence|wiped/i.test(name)) {
          e.requiredLight = 'chemical';
        } else {
          e.requiredLight = 'ordinary';
        }
      }

      // Check if this is one of the 2-3 designated basic exhibits present on the crime scene initially:
      // 1) Bloodstained Hexagonal Iron Rod (Ordinary white light)
      // 2) RBI ₹500 Currency Note (Ordinary white light)
      // 3) Latent Blood Spatter (Escort Impact) (UV 365nm light)
      const isDesignatedBasic = (
        e.isBasic === true ||
        name.includes('hexagonal iron rod') ||
        name.includes('iron rod') ||
        name.includes('currency note') ||
        name.includes('₹500') ||
        (name.includes('blood spatter') && name.includes('escort'))
      );

      if (isDesignatedBasic) {
        e.isBasic = true;
        e.requiresDisclosure = false;
        e.unlockedByDisclosure = true;
        e.disclosed = true;
      } else {
        e.isBasic = false;
        e.requiresDisclosure = true;
        // Check if unlocked by interrogation statement / disclosure
        if (e.disclosed || e.status === 'disclosed_pending_recovery' || e.unlockedByDisclosure === true) {
          e.unlockedByDisclosure = true;
          e.disclosed = true;
        } else {
          e.unlockedByDisclosure = false;
          e.disclosed = false;
          // Hide undisclosed evidence from scene until interrogation disclosure
          e.found = false;
          e.seized = false;
          if (e.admissibility === 'admissible' || e.admissibility === 'tainted') {
            e.admissibility = 'unseized';
          }
        }
      }
    });
  }

  public unlockExhibitsFromDialogue(snap: any, text: string, person?: any): any[] {
    if (!snap || !snap.exhibits || !text) return [];
    const textLower = text.toLowerCase();
    const newlyUnlocked: any[] = [];

    // Match rules for crime scene physical evidence that can be disclosed by witnesses or suspects:
    // 1. Latent Fingerprint on Van Latch (Grid E4, ALS light)
    // 2. Footwear Impression with 3.2mm Lug Cut (Grid H4, Oblique light)
    // 3. Wiped Chemiluminescent Drag Track (Grid G5, Chemical/Luminol light)
    // 4. Stained Cotton Kerchief (Suspect DNA) (Grid H6, UV light)
    // 5. Concealed lock-cutter & grey duffel bag (Grid F4, Oblique light)
    snap.exhibits.forEach((e: any) => {
      if (!e.requiresDisclosure || e.unlockedByDisclosure) return;

      const nameLower = (e.name || '').toLowerCase();
      const grid = (e.gridRef || '').toUpperCase();
      let matched = false;

      if (grid === 'E4' || nameLower.includes('fingerprint') || nameLower.includes('latch')) {
        if (/latch|fingerprint|vault|handle|rear door|bare hands|un-gloved|touched|grip/i.test(textLower)) {
          matched = true;
        }
      } else if (grid === 'H4' || nameLower.includes('footwear') || nameLower.includes('lug cut')) {
        if (/footwear|shoe|boot|combat|lug cut|tread|mud|slipped|culvert mud|embankment|footprint|impression/i.test(textLower)) {
          matched = true;
        }
      } else if (grid === 'G5' || nameLower.includes('drag track') || nameLower.includes('chemiluminescent') || nameLower.includes('drag')) {
        if (/drag|track|trail|wiped|wipe|blood wipe|dragged|tea stall|chemiluminescent|luminol/i.test(textLower)) {
          matched = true;
        }
      } else if (grid === 'H6' || nameLower.includes('kerchief') || nameLower.includes('suspect dna')) {
        if (/kerchief|handkerchief|face cover|mask|dropped cloth|sweat|cotton cloth|culvert ditch|verge/i.test(textLower)) {
          matched = true;
        }
      } else if (nameLower.includes('lock-cutter') || nameLower.includes('duffel')) {
        if (/duffel|lock-cutter|cutter|transformer|water tank|concrete slabs|stashed|hidden bag/i.test(textLower)) {
          matched = true;
        }
      } else {
        // Generic keyword matching for any other case evidence
        const keywords = nameLower.split(/[\s,&/]+/).filter((w: string) => w.length > 3);
        if (keywords.length > 0 && keywords.some((kw: string) => textLower.includes(kw))) {
          matched = true;
        }
      }

      if (matched) {
        e.requiresDisclosure = false;
        e.unlockedByDisclosure = true;
        e.disclosed = true;
        e.status = 'disclosed_pending_recovery';
        e.disclosed_by = person ? (person.name || person.full_name) : 'Interrogation Disclosure';
        newlyUnlocked.push(e);

        // Add to diary
        snap.diary = snap.diary || [];
        snap.diary.unshift({
          id: Date.now() + Math.floor(Math.random() * 1000),
          case_id: snap.caseId,
          day: snap.day || 1,
          time: new Date().toISOString().substring(11, 16),
          entry_type: 'procedural',
          author: 'Investigating Officer',
          body: `[CRIME SCENE DISCLOSURE] ${person ? (person.role === 'witness' ? 'Witness ' : 'Accused ') + (person.name || person.full_name) : 'Deponent'} disclosed locatable physical clue: "${e.name}" at Grid ${e.gridRef || 'Scene'}. Physical trace is now discoverable and visible under suitable light (${e.requiredLight ? e.requiredLight.toUpperCase() : 'forensic optics'}).`,
          tag: 'DISCLOSURE'
        });

        // Add to operational logs
        snap.logs = snap.logs || [];
        snap.logs.unshift({
          id: 'log-disc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
          type: 'DISCLOSURE',
          message: `EVIDENCE DISCLOSED: "${e.name}" at Grid ${e.gridRef} is now visible under ${e.requiredLight || 'suitable'} light.`,
          severity: 'good'
        });

        // Add to recoveries if not already present
        snap.recoveries = snap.recoveries || [];
        const existingRec = snap.recoveries.find((r: any) => (r.item && r.item.toLowerCase() === e.name.toLowerCase()) || (r.gridRef && r.gridRef === e.gridRef));
        if (!existingRec) {
          snap.recoveries.push({
            id: 'rec-' + Date.now() + '-' + Math.floor(Math.random() * 100),
            item: e.name,
            location: (e.gridRef ? `Grid ${e.gridRef} — ` : '') + (e.described || 'Crime Scene'),
            exhibit_id: e.id,
            gridRef: e.gridRef,
            status: 'disclosed_pending_recovery',
            s23_valid: false,
            witness_a: null,
            witness_b: null,
            witnesses: [],
            accused_name: person ? person.name : 'Suspect',
            description: e.described || e.name
          });
        }
      }
    });

    if (newlyUnlocked.length > 0) {
      this.recalculateCaseReadiness(snap);
      this.bumpRev();
    }
    return newlyUnlocked;
  }

  public getFullBundle(caseId?: number): any {
    const targetId = caseId || this.player.activeCaseId || 2;
    const snapshot = this.snapshots.get(targetId) || this.getActiveCaseSnapshot();
    if (snapshot) {
      this.ensureLocalityResidents(snapshot, Number(snapshot.caseId || targetId));
      this.ensureCaseExhibits(snapshot);
      this.checkAssignmentsAndLabs(snapshot);
      if (snapshot.trial && snapshot.trial.verdict && !snapshot.trial.analysis) {
        snapshot.trial.analysis = this.buildTrialAnalysis(
          snapshot,
          snapshot.trial.verdict,
          snapshot.trial.sentence,
          snapshot.trial.judgment_summary || snapshot.trial.judgment,
          snapshot.trial.acquittal_risk,
          snapshot.trial.argument_recorded
        );
        snapshot.trial.events = snapshot.trial.analysis;
        snapshot.trial.events_json = JSON.stringify(snapshot.trial.analysis);
      }
    }

    return {
      player: this.player,
      cases: this.cases,
      caseList: this.cases,
      team: this.team,
      threads: this.threads,
      legalRefs: this.legalRefs,
      legalCounts: {
        BNS: this.legalBns.total || (this.legalBns.rows || []).length || 350,
        BNSS: this.legalBnss.total || (this.legalBnss.rows || []).length || 531,
        BSA: this.legalBsa.total || (this.legalBsa.rows || []).length || 170,
        ALLIED: this.legalAllied.total || (this.legalAllied.rows || []).length || 12
      },
      forms: this.forms,
      candidates: this.candidates,
      snapshot,
      rev: this.rev
    };
  }

  public getCasesList(): any {
    return { cases: this.cases };
  }

  public async generateNewCase(options: { prompt?: string; genre?: string; difficulty?: string; apiKey?: string }): Promise<any> {
    const rawCase = await generateCaseWithAI(options);
    const newCaseId = this.cases.reduce((max, c) => Math.max(max, Number(c.id) || 0), 2) + 1;
    const caseNo = `${String(newCaseId).padStart(2, '0')}/2026`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const firNo = `MCB/${caseNo}/${Math.floor(1000 + Math.random() * 9000)}`;
    const initialFIR = {
      id: newCaseId,
      case_id: newCaseId,
      fir_no: firNo,
      narrative: rawCase.fir?.narrative || rawCase.incident || 'Procedural case initiated under modern statutory codes.',
      informant: rawCase.fir?.complainant || (rawCase.persons && rawCase.persons[0]?.name) || 'Complainant',
      informant_type: 'complainant',
      place_of_occurrence: rawCase.fir?.place_of_occurrence || 'Metropolitan Jurisdiction',
      date_of_occurrence: rawCase.fir?.date_of_occurrence || '14 Jan 2026',
      cognizable: 1,
      preliminary_inquiry: 0,
      bns_sections: rawCase.fir?.bns_sections || rawCase.statutes || ['BNS 309', 'BNS 115'],
      ingredients: { present: ['theft', 'weapon'], missing: [] },
      filed_day: 1,
      created_at: nowStr
    };

    const formattedPersons = (rawCase.persons || []).map((p: any, idx: number) => ({
      id: idx + 1,
      name: p.name || `Person ${idx + 1}`,
      role: p.role || 'suspect',
      age: p.age || 35,
      occupation: p.occupation || 'Resident',
      alibi: p.alibi || 'States no involvement.',
      alibiVerified: false,
      motive: p.motive || 'Material interest.',
      phone: p.phone || '+91 98000 00000',
      address: p.address || 'Metro Area',
      statement: null,
      statementRecorded: false,
      statementSigned: false,
      statement_audio: null,
      arrested: false,
      custodyRemandDays: 0
    }));

    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const formattedExhibits = (rawCase.exhibits || []).map((e: any, idx: number) => ({
      id: idx + 1,
      exhibitNo: e.exhibitNo || alphabet[idx % alphabet.length],
      name: e.name || `Physical Trace #${idx + 1}`,
      category: e.category || 'physical',
      gridRef: e.gridRef || 'F4',
      found: false,
      described: e.described || 'Physical item located at crime scene locus.',
      significance: e.significance || 'Material physical link.',
      seized: false,
      seizureValid: false,
      witnessA: null,
      witnessB: null,
      custodyIntact: true,
      custody: [],
      taintReasons: [],
      isDigital: e.isDigital || e.category === 'digital',
      hash: null,
      s63Certified: false,
      s63SignerA: null,
      s63SignerB: null,
      labStatus: 'none',
      admissibility: 'unseized',
      weight: 0,
      gearReq: e.gearReq || '',
      why: 'Discovered in situ during scene processing. Requires seizure memo under BNSS s.103.'
    }));

    const snapshot: any = {
      caseId: newCaseId,
      caseNo,
      title: rawCase.title || `Case File #${newCaseId}`,
      incident: rawCase.incident || 'Procedural investigation opened.',
      day: 1,
      maxDays: 7,
      status: 'fir',
      statutes: rawCase.statutes || ['BNS s.309', 'BNS s.115'],
      fir: initialFIR,
      scene: {
        cordoned: 0,
        walkthrough: 0,
        photographed: 0,
        diagrammed: 0,
        canvassed: 0,
        sealed: 0,
        scene_type: 'highway',
        description: rawCase.scene_description || 'Crime scene locus.'
      },
      persons: formattedPersons,
      exhibits: formattedExhibits,
      acts: [
        { id: 1, name: 'Act 1: First Information & Verification', state: 'active', done: 0, total: 2, pct: 0 },
        { id: 2, name: 'Act 2: Crime Scene Processing & Seizure', state: 'locked', done: 0, total: 6, pct: 0 },
        { id: 3, name: 'Act 3: Field Investigation & Interrogation', state: 'locked', done: 0, total: 4, pct: 0 },
        { id: 4, name: 'Act 4: Forensics & Section 63 Certification', state: 'locked', done: 0, total: 3, pct: 0 },
        { id: 5, name: 'Act 5: Final Police Report & Trial', state: 'locked', done: 0, total: 2, pct: 0 }
      ],
      diary: [
        {
          id: Date.now(),
          case_id: newCaseId,
          day: 1,
          entry_type: 'milestone',
          body: `Case File № ${caseNo} opened. FIR drafted under ${(initialFIR.bns_sections || []).join(', ')}.`,
          auto: 1,
          created_at: nowStr
        }
      ],
      readiness: {
        overall: 10,
        procedural_integrity: 100,
        proof_beyond_reasonable_doubt: 0,
        elements_satisfied: 0,
        taint_free_evidence: 100,
        statutory_compliance: 100
      }
    };

    this.recalculateCaseReadiness(snapshot);
    this.snapshots.set(newCaseId, snapshot);

    const caseListItem = {
      id: newCaseId,
      caseNo,
      title: snapshot.title,
      summary: snapshot.incident,
      status: 'Active',
      tags: snapshot.statutes,
      difficulty: options.difficulty || 'Medium',
      aiGenerated: true
    };
    this.cases.push(caseListItem);

    this.player.activeCaseId = newCaseId;
    this.bumpRev();

    return {
      ok: true,
      caseId: newCaseId,
      bundle: this.getFullBundle(newCaseId),
      generatedByAI: rawCase.generatedByAI,
      usedByok: rawCase.usedByok
    };
  }

  public activateCase(caseId: number): any {
    this.player.activeCaseId = caseId;
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public reopenCase(caseId: number): any {
    let snap = this.snapshots.get(caseId);
    if (!snap) {
      try {
        const fallback = loadJson<any>(`case${caseId}.json`, {});
        if (fallback && fallback.snapshot) {
          snap = fallback.snapshot;
          this.snapshots.set(caseId, snap);
        }
      } catch (e) {}
    }
    if (!snap) throw new Error(`Case #${caseId} not found`);

    // 1. Restore status to active
    snap.status = 'active';

    // 2. Ensure acts are open so desks (desk, scene, labs, board, pois, interrogation, charge, court) are functional
    if (snap.acts && Array.isArray(snap.acts)) {
      snap.acts.forEach((act: any, idx: number) => {
        if (idx < 6) {
          act.state = 'completed';
        } else if (idx === 6) {
          act.state = 'active'; // Charge sheet draft active for review/modification
        } else {
          act.state = 'pending'; // Court trial ready for hearing
        }
      });
    }

    // 3. Keep original FIR, exhibits, persons, interviews, and recoveries intact!
    snap.daysLeft = Math.max(snap.daysLeft || 0, 25);
    snap.dayLimit = Math.max(snap.dayLimit || 60, (snap.day || 1) + 25);
    snap.resumePoint = 'Supplementary Investigation — All files intact under BNSS §193(9)';

    // 4. Update case in this.cases array
    const cObj = this.cases.find((c: any) => c.id === caseId || c.case_no === snap.caseNo);
    if (cObj) {
      cObj.status = 'active';
      cObj.verdict = null; // Reopened for supplementary inquiry
    }

    // 5. Add case diary entry
    snap.diary = snap.diary || [];
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day || 1,
      entry_type: 'milestone',
      body: `INVESTIGATION REOPENED: Order for Supplementary Inquiry recorded under Section 193(9) BNSS. Previous FIR, crime scene seizure memos, lab reports, witness statements, and forensic exhibits preserved intact. Case desk active.`,
      auto: 1,
      created_at: nowStr
    });

    // 6. Set as active case
    this.player.activeCaseId = caseId;
    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      success: true,
      caseId,
      message: `Case № ${snap.caseNo} successfully reopened. All records intact.`,
      bundle: this.getFullBundle(caseId)
    };
  }

  public getCaseSummary(caseId: number): any {
    let snap = this.snapshots.get(caseId);
    if (!snap) {
      try {
        const fallback = loadJson<any>(`case${caseId}.json`, {});
        if (fallback && fallback.snapshot) {
          snap = fallback.snapshot;
        }
      } catch (e) {}
    }
    if (!snap) throw new Error(`Case #${caseId} not found`);

    const cObj = this.cases.find((c: any) => c.id === caseId || c.case_no === snap.caseNo) || {};

    return {
      caseId: snap.caseId || caseId,
      caseNo: snap.caseNo || cObj.case_no,
      title: snap.title || cObj.title,
      status: snap.status || cObj.status,
      verdict: snap.verdict || (snap.trial && snap.trial.verdict) || cObj.verdict || 'Closed',
      tier: snap.tier || cObj.tier || 1,
      offenceClass: snap.offenceClass || cObj.offence_class || 'General Crime',
      summary: snap.summary || cObj.summary,
      // Stage 1: FIR
      fir: snap.fir || null,
      // Stage 2: Scene & Exhibits
      scene: snap.scene || null,
      exhibits: (snap.exhibits || []).map((e: any) => ({
        id: e.id,
        exhibitNo: e.exhibitNo,
        name: e.name,
        category: e.category,
        significance: e.significance,
        seized: e.seized,
        seizureValid: e.seizureValid,
        witnessA: e.witnessA,
        witnessB: e.witnessB,
        custodyIntact: e.custodyIntact,
        isDigital: e.isDigital,
        s63Certified: e.s63Certified,
        labStatus: e.labStatus,
        admissibility: e.admissibility,
        weight: e.weight,
        why: e.why,
        hash: e.hash
      })),
      labRequests: snap.labRequests || [],
      // Stage 3: Interrogations & Persons
      persons: (snap.persons || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        role: p.role,
        occupation: p.occupation,
        profile: p.profile,
        alibi_verified: p.alibi_verified,
        arrested: p.arrested,
        statements: p.statements || []
      })),
      interviews: snap.interviews || [],
      leads: (snap.leads || []).filter((l: any) => l.locatable || l.followed),
      // Stage 4: Charge Sheet
      chargesheet: snap.chargesheet || null,
      // Stage 5: Trial & Judgment
      trial: snap.trial || null,
      readiness: snap.readiness || null
    };
  }

  // --- Reactive Cascade Handlers ---

  public registerFIR(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const firNo = snap.fir?.fir_no || `MCB/${snap.caseNo}/${Math.floor(1000 + Math.random() * 9000)}`;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    snap.fir = {
      id: snap.caseId,
      case_id: snap.caseId,
      fir_no: firNo,
      narrative: body.narrative || snap.fir?.narrative || 'Detailed first information report filed.',
      informant: body.informant || 'Informant',
      informant_type: body.informant_type || 'complainant',
      place_of_occurrence: body.place_of_occurrence || 'Scene location',
      date_of_occurrence: body.date_of_occurrence || 'Reported date',
      cognizable: body.cognizable ?? 1,
      preliminary_inquiry: body.preliminary_inquiry ?? 0,
      bns_sections: typeof body.bns_sections === 'string' 
        ? body.bns_sections.split(',').map((s: string) => s.trim()) 
        : (body.bns_sections || ['BNS 309', 'BNS 115']),
      ingredients: { present: ['theft', 'weapon'], missing: [] },
      filed_day: snap.day || 1,
      created_at: nowStr
    };

    snap.status = 'scene';

    // Update Act 1 to 100%
    if (snap.acts && snap.acts[0]) {
      snap.acts[0].done = 1;
      snap.acts[0].pct = 100;
      snap.acts[0].state = 'complete';
    }
    if (snap.acts && snap.acts[1]) {
      snap.acts[1].state = 'active';
    }

    // Append Case Diary entry (BNSS s.185)
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day || 1,
      entry_type: 'milestone',
      body: `FIR No. ${firNo} registered under ${(snap.fir.bns_sections || []).join(', ')} on the complaint of ${snap.fir.informant}.`,
      auto: 1,
      created_at: nowStr
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public crossSyncPlayerManualAction(caseId: number, actionType: string, details?: any): void {
    const snap = this.snapshots.get(caseId);
    if (!snap) return;

    snap.directiveQueue = snap.directiveQueue || [];
    let updatedAny = false;

    for (const dir of snap.directiveQueue) {
      if (dir.status === 'completed' || dir.status === 'cancelled') continue;

      for (const sub of (dir.subTasks || [])) {
        if (sub.status === 'completed' || sub.status === 'completed_by_player') continue;

        let matched = false;
        const scope = (sub.targetScope || '').toLowerCase();
        const descLower = (sub.description || sub.title || '').toLowerCase();

        if (actionType === 'scene_step') {
          const step = (details?.step || '').toLowerCase();
          if (scope === 'scene' || descLower.includes(step) || descLower.includes('walkthrough') || descLower.includes('cordon') || descLower.includes('scene')) {
            matched = true;
          }
        } else if (actionType === 'exhibit_seize') {
          if (scope === 'exhibits' || scope === 'malkhana' || descLower.includes('seiz') || descLower.includes('malkhana') || descLower.includes('exhibit')) {
            matched = true;
          }
        } else if (actionType === 'lab_request') {
          if (scope === 'labs' || descLower.includes('lab') || descLower.includes('forensic') || descLower.includes('cctv') || descLower.includes('cdr') || descLower.includes('fingerprint') || descLower.includes('ballistic')) {
            matched = true;
          }
        } else if (actionType === 's63_cert' || actionType === 'image_digital') {
          if (scope === 'cyber' || scope === 'labs' || descLower.includes('s.63') || descLower.includes('cert') || descLower.includes('electronic') || descLower.includes('image')) {
            matched = true;
          }
        } else if (actionType === 'statement' || actionType === 'alibi' || actionType === 'interrogate') {
          if (scope === 'witnesses' || descLower.includes('witness') || descLower.includes('statement') || descLower.includes('alibi') || descLower.includes('interrogat') || descLower.includes('suspect')) {
            matched = true;
          }
        } else if (actionType === 'recovery') {
          if (scope === 'exhibits' || descLower.includes('recover') || descLower.includes('seiz') || descLower.includes('s.23')) {
            matched = true;
          }
        }

        if (matched) {
          sub.status = 'completed_by_player';
          updatedAny = true;
        }
      }

      // Check if all subtasks in this directive are now done
      const allDone = dir.subTasks && dir.subTasks.length > 0 && dir.subTasks.every((s: any) => s.status === 'completed' || s.status === 'completed_by_player');
      if (allDone && dir.status !== 'completed') {
        dir.status = 'completed';
        
        // Free team member if busy on this directive
        const tm = this.team.find((m: any) => m.name === dir.memberName || m.id === dir.memberId);
        if (tm) {
          tm.busy_until_day = null;
          tm.current_task = null;
        }

        // Mark corresponding active assignment as completed
        if (snap.assignments && Array.isArray(snap.assignments)) {
          const matchingAssign = snap.assignments.find((a: any) => (a.member === dir.memberName || a.member_id === dir.memberId) && a.status === 'running');
          if (matchingAssign) {
            matchingAssign.status = 'completed';
          }
        }
      }
    }

    if (updatedAny) {
      this.bumpRev();
    }
  }

  public completeSceneStep(caseId: number, step: string): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    snap.scene = snap.scene || {};
    snap.scene[step] = 1;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Append diary
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: `Scene step completed: ${step}.`,
      auto: 1,
      created_at: nowStr
    });

    // Update Act 2 progress
    const steps = ['cordoned', 'walkthrough', 'photographed', 'diagrammed', 'canvassed', 'sealed'];
    const doneCount = steps.filter(s => snap.scene[s] === 1).length;
    if (snap.acts && snap.acts[1]) {
      snap.acts[1].done = Math.min(doneCount, snap.acts[1].total);
      snap.acts[1].pct = Math.round((snap.acts[1].done / snap.acts[1].total) * 100);
      if (snap.acts[1].done >= snap.acts[1].total) {
        snap.acts[1].state = 'complete';
        if (snap.acts[2]) snap.acts[2].state = 'active';
      }
    }

    this.recalculateCaseReadiness(snap);
    this.crossSyncPlayerManualAction(caseId, 'scene_step', { step });
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public getExhibitBaseWeight(exhibit: any): number {
    if (!exhibit) return 25;
    if (exhibit.baseWeight && exhibit.baseWeight > 0) return exhibit.baseWeight;
    const cat = (exhibit.category || '').toLowerCase();
    const name = (exhibit.name || '').toLowerCase();
    if (cat === 'biological' || /blood|dna|stain|saliva|tissue|hair|fluid/i.test(name)) return 35;
    if (exhibit.isDigital || cat === 'digital' || /cctv|video|footage|phone|mobile|call|dvr|drive|laptop/i.test(name)) return 35;
    if (cat === 'financial' || /financial|money|bank|account|cash|ledger|trail/i.test(name)) return 30;
    if (cat === 'physical' && /tool|weapon|rod|gun|knife|instrument|pistol|bullet|cartridge/i.test(name)) return 30;
    if (/impression|tyre|tread|shoe|footprint|cast|skid|mark/i.test(name)) return 25;
    if (/cdr|tower|telecom|dump/i.test(name)) return 25;
    return 25;
  }

  public examineExhibit(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const exhibitId = Number(body.exhibitId);
    let exhibit = (snap.exhibits || []).find((e: any) => 
      (body.exhibitId != null && (e.id === exhibitId || String(e.id) === String(body.exhibitId))) ||
      (body.gridRef && e.gridRef && String(e.gridRef).toUpperCase() === String(body.gridRef).toUpperCase()) ||
      (body.name && e.name && String(e.name).toLowerCase().includes(String(body.name).toLowerCase()))
    );

    // 1. Check if exhibit requires interrogation disclosure first
    if (exhibit && exhibit.requiresDisclosure && !exhibit.unlockedByDisclosure) {
      return {
        ...this.getFullBundle(caseId),
        found: false,
        error: 'This exhibit is hidden and must first be disclosed through interrogation or lead discovery under BSA §23 before it can be examined at the crime scene.'
      };
    }

    // 2. Check optical spectrum light requirement
    const reqLight = (exhibit?.requiredLight || body.gearReq || '').toLowerCase();
    const usedLight = (body.gear || 'ordinary').toLowerCase();

    const isLightMatch = (req: string, used: string) => {
      if (!req || req === 'white' || req === 'ordinary' || req === 'none') {
        return !used || used === 'ordinary' || used === 'white' || used === 'none';
      }
      if (req === 'uv') return used === 'uv' || used === 'chemical' || used === 'luminol';
      if (req === 'chemical' || req === 'luminol') return used === 'chemical' || used === 'luminol' || used === 'uv';
      if (req === 'als') return used === 'als';
      if (req === 'oblique') return used === 'oblique';
      return req === used;
    };

    if (reqLight && !isLightMatch(reqLight, usedLight)) {
      const reqName = reqLight === 'uv' ? 'UV 365nm' : reqLight === 'als' ? 'ALS 450nm' : reqLight === 'oblique' ? 'Oblique 15°' : reqLight === 'chemical' ? 'Luminol Bio' : 'Ordinary Light';
      const usedName = usedLight === 'uv' ? 'UV 365nm' : usedLight === 'als' ? 'ALS 450nm' : usedLight === 'oblique' ? 'Oblique 15°' : usedLight === 'chemical' ? 'Luminol Bio' : 'Ordinary Light';
      return {
        ...this.getFullBundle(caseId),
        found: false,
        error: `Optical spectrum mismatch: This trace is invisible under ${usedName}. Switch forensic optical spectrum to ${reqName} to illuminate and photograph this trace.`
      };
    }

    if (!exhibit) {
      if (body.name || body.gridRef) {
        // Auto-lodge dynamic AI/in-situ discovered evidence for the case
        const nextId = (snap.exhibits || []).reduce((max: number, x: any) => Math.max(max, Number(x.id) || 0), 20) + 1;
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nextNo = alphabet[(snap.exhibits || []).length % alphabet.length] || String(nextId);
        
        exhibit = {
          id: nextId,
          exhibitNo: body.exhibitNo || nextNo,
          name: body.name || `Latent physical evidence (Grid ${body.gridRef || 'Scene'})`,
          category: body.category || 'physical',
          gridRef: body.gridRef || 'G3',
          found: true,
          described: body.described || `Recovered in-situ during forensic light sweep of the scene.`,
          significance: body.significance || `Relevant forensic link discovered at the scene under ${body.gear || 'ordinary'} light.`,
          seized: false,
          seizureValid: false,
          witnessA: null,
          witnessB: null,
          custodyIntact: true,
          custody: [],
          taintReasons: [],
          isDigital: body.isDigital || body.category === 'digital' || /cctv|dvr|phone|video/i.test(body.name || ''),
          hash: null,
          s63Certified: false,
          s63SignerA: null,
          s63SignerB: null,
          labStatus: 'none',
          admissibility: 'unseized',
          weight: 0,
          why: 'Discovered and examined in situ at the crime scene. Complete seizure memo with two independent witnesses under BNSS s.103.'
        };
        snap.exhibits = snap.exhibits || [];
        snap.exhibits.push(exhibit);
      } else {
        return { ...this.getFullBundle(caseId), found: false, error: 'Exhibit not found at this position' };
      }
    }

    exhibit.found = true;
    exhibit.examined_gear = body.gear || 'ordinary';
    exhibit.examined_day = snap.day;
    if (!exhibit.weight || exhibit.weight === 0) {
      exhibit.weight = this.getExhibitBaseWeight(exhibit);
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: `Examined grid ${exhibit.gridRef || 'area'} under ${body.gear || 'ordinary'} light: ${exhibit.name} identified and catalogued for seizure under BNSS s.103.`,
      auto: 1,
      created_at: nowStr
    });

    const gear = (body.gear || '').toLowerCase();
    const isBio = exhibit.category === 'biological' || /blood|dna|stain|saliva|tissue|hair|fluid/i.test(exhibit.name);
    const isDigital = exhibit.isDigital || exhibit.category === 'digital' || /cctv|phone|mobile|call|dvr|drive|laptop/i.test(exhibit.name);
    const isImpression = /tyre|tread|shoe|footprint|cast|skid|mark/i.test(exhibit.name);

    let modalityName = 'Ordinary Light (Macroscopic Survey)';
    let obsText = `Visual macroscopic survey of Grid ${exhibit.gridRef || 'area'}: ${exhibit.name} observed and catalogued in situ. ${exhibit.described || ''}`;
    let cautionText = 'Ensure item is packed and sealed with unique evidence tag in the presence of independent respectable panchas.';
    let conf = 85;

    if (gear === 'uv') {
      modalityName = 'UV 365nm Ultraviolet Lamp (Fluorescence Excitation)';
      conf = 92;
      obsText = `Narrowband 365nm UV excitation reveals distinct greenish-white fluorescence and characteristic dark absorption spots consistent with biological stains and organic residues. Substrate fibers around ${exhibit.name} illuminated without thermal degradation.`;
      cautionText = 'Biological specimens require sterile packaging and rapid cold-chain dispatch to prevent enzymatic DNA degradation.';
    } else if (gear === 'oblique') {
      modalityName = 'Oblique Raking Light (Low-Angle Shadow Relief)';
      conf = 88;
      obsText = `Directional 15-degree raking illumination casts pronounced micro-shadows along the ground surface, highlighting tread depth, groove pitch, and distinct wear patterns on ${exhibit.name}.`;
      cautionText = 'Cast or photograph impressions immediately with a millimeter scale before weather or footsteps distort the substrate.';
    } else if (gear === 'als') {
      modalityName = 'ALS 450nm Alternate Light Source (Barrier Filter Enhanced)';
      conf = 94;
      obsText = `450nm high-intensity blue excitation viewed through 529nm orange barrier goggles highlights latent sebaceous ridge details, synthetic polymer transfers, and particulate residue adhering to ${exhibit.name}.`;
      cautionText = 'Do not handle surfaces with bare hands; preserve latent print ridge friction skin oils for cyanoacrylate fuming.';
    } else if (gear === 'chemical') {
      modalityName = 'Chemiluminescence / Luminol Reaction Assay';
      conf = 96;
      obsText = `Reagent application triggers catalytic iron-peroxidase reaction, producing intense bluish-green chemiluminescent glow along perimeter of ${exhibit.name}, confirming presence of diluted/wiped hemoglobin traces.`;
      cautionText = 'Luminol is presumptive; sample the perimeter with sterile cotton swab for confirmatory DNA/ABO laboratory typing.';
    }

    const examination = {
      modality: modalityName,
      observation: obsText,
      confidence: conf,
      latent_clues: [
        {
          clue: exhibit.significance || 'Key physical link connecting the place of occurrence with suspect and victim movements.',
          strength: (exhibit.weight || 25) > 30 ? 'strong' : 'moderate',
          how_to_confirm: isBio ? 'Dispatch to FSL Serology/DNA wing for STR profiling' : isDigital ? 'Dual-signed Section 63 BSA certificate with SHA-256 hash' : isImpression ? 'Cast reproduction & tyre tread comparison' : 'Comparative forensic laboratory assay'
        }
      ],
      leads_generated: [
        `Exhibit ${exhibit.exhibitNo || '—'} (${exhibit.name}): Prepared for seizure memo with two independent witnesses under BNSS s.103.`
      ],
      requires: {
        gear: isBio ? 'UV 365nm / ALS / Sterile Swab Kit' : isDigital ? 'Faraday pouch & Write-blocker' : isImpression ? 'Oblique scale & Dental stone casting' : 'Specimen container & tamper-evident seal',
        expert: isBio ? 'Serology & DNA Division' : isDigital ? 'Cyber Forensics Division' : isImpression ? 'Physical Impressions Division' : 'Physical & Ballistics Division'
      },
      caution: cautionText
    };

    this.recalculateCaseReadiness(snap);
    this.bumpRev();

    return {
      ...this.getFullBundle(caseId),
      found: true,
      examination
    };
  }

  public resetExhibitSeizure(caseId: number, exhibitId: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const exId = Number(exhibitId);
    const exhibit = (snap.exhibits || []).find((e: any) => e.id === exId || String(e.id) === String(exhibitId) || e.hash === exhibitId);
    if (!exhibit) {
      throw new Error('Exhibit not found');
    }

    const baseWeight = this.getExhibitBaseWeight(exhibit);

    // Reset seizure fields
    exhibit.seized = false;
    exhibit.seizureValid = false;
    exhibit.admissibility = 'unseized';
    exhibit.manuallyReset = true;
    exhibit.manuallyEntered = false;
    exhibit.confirmedWitnesses = [];
    exhibit.witness1 = null;
    exhibit.witness2 = null;
    exhibit.witnessA = null;
    exhibit.witnessB = null;
    exhibit.seizure_location = null;
    exhibit.seizure_memo = null;
    exhibit.tainted = 0;
    exhibit.taintReasons = [];
    exhibit.defects = [];
    exhibit.weight = baseWeight;
    exhibit.why = 'Seizure memo cleared. Ready for lawful re-examination and seizure under BNSS s.103.';

    // Reset linked recovery records as well
    (snap.recoveries || []).forEach((r: any) => {
      if (
        (r.item && exhibit.name && r.item.toLowerCase().includes(exhibit.name.toLowerCase())) ||
        (r.description && exhibit.name && r.description.toLowerCase().includes(exhibit.name.toLowerCase())) ||
        exhibit.category === 'others' || exhibit.isDisclosure
      ) {
        r.s23_valid = false;
        r.witness_a = null;
        r.witness_b = null;
        r.witnesses = [];
        r.confirmedWitnesses = [];
        r.manuallyReset = true;
        r.manuallyEntered = false;
        r.status = 'disclosed_pending_panchnama';
      }
    });

    // Clear any defective seizure blockers from this exhibit
    snap.blockers = (snap.blockers || []).filter((b: any) => b.id !== `taint_${exhibit.id}` && b.id !== `taint_${exhibit.exhibitNo}`);
    snap.alerts = (snap.alerts || []).filter((a: any) => !a.text?.includes(`Exhibit ${exhibit.exhibitNo || exhibit.name || exhibit.id}`));

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary = snap.diary || [];
    snap.diary = snap.diary.filter((d: any) => !(d.entry_type === 'deficiency' && d.body?.includes(exhibit.name)));
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: `Seizure memo for Exhibit ${exhibit.exhibitNo || '—'} (${exhibit.name}) cleared. Item is returned to unseized state for re-examination and fresh seizure recording under BNSS s.103.`,
      auto: 1,
      created_at: nowStr
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      ...this.getFullBundle(caseId),
      ok: true,
      reset: true,
      exhibitId: exhibit.id,
      exhibit
    };
  }

  public recordCanvassConsent(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const person = (snap.persons || []).find((p: any) => p.id === personId);
    if (!person) throw new Error('Person not found');

    const consent = !!body.consent;
    person.canvassed = true;
    person.consented = consent;
    person.canvassConsent = consent;
    person.status = consent ? 'canvassed' : (person.status || 'identified');

    snap.consentedWitnesses = snap.consentedWitnesses || [];
    const name = person.name || person.full_name;
    if (consent && name && !snap.consentedWitnesses.includes(name)) {
      snap.consentedWitnesses.push(name);
    } else if (!consent && name) {
      snap.consentedWitnesses = snap.consentedWitnesses.filter((w: string) => w !== name);
    }

    if (body.statementText) {
      person.statements = person.statements || [];
      person.statements.unshift({
        day: snap.day,
        statement: body.statementText,
        recorded_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        officer: 'Investigating Officer',
        signed: true
      });
      person.statement = body.statementText;
      person.statement_recorded = true;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: consent
        ? `CANVASS & PANCH ASSENT RECORDED (BNSS s.103): ${name} (${person.occupation || 'Local Resident'}) examined in locality and consented to act as an independent panch witness.`
        : `CANVASS INQUIRY: ${name} (${person.occupation || 'Local Resident'}) questioned; declined/unable to stand as panch witness.`,
      auto: 1,
      created_at: nowStr
    });

    if (snap.scene && consent) {
      snap.scene.canvassed = true;
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();
    return {
      ...this.getFullBundle(caseId),
      ok: true,
      person,
      consentedWitnesses: snap.consentedWitnesses
    };
  }

  public seizeExhibit(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const exhibitId = Number(body.exhibitId);
    const exhibit = (snap.exhibits || []).find((e: any) => e.id === exhibitId || e.hash === body.exhibitId);

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary = snap.diary || [];

    const w1 = (body.witness1 || body.witnessA || '').trim();
    const w2 = (body.witness2 || body.witnessB || '').trim();

    const isSuspect = (name: string) => {
      if (!name) return false;
      const lower = name.toLowerCase().trim();
      return (snap.persons || []).some((p: any) =>
        (p.role === 'suspect' || p.role === 'accused' || p.is_culprit) &&
        (p.name || '').toLowerCase().trim().includes(lower)
      );
    };

    const hasTwoWitnesses = w1.length > 2 && w2.length > 2 && w1.toLowerCase() !== w2.toLowerCase();
    const suspectWitnessFound = isSuspect(w1) || isSuspect(w2);
    const isLawful = hasTwoWitnesses && !suspectWitnessFound;

    if (exhibit) {
      exhibit.manuallyReset = false;
      exhibit.manuallyEntered = true;
      exhibit.confirmedWitnesses = exhibit.confirmedWitnesses || [];
      if (w1 && !exhibit.confirmedWitnesses.includes(w1)) exhibit.confirmedWitnesses.push(w1);
      if (w2 && !exhibit.confirmedWitnesses.includes(w2)) exhibit.confirmedWitnesses.push(w2);
      exhibit.seized = true;
      exhibit.seized_day = snap.day;
      exhibit.seizure_location = body.location || exhibit.seizure_location;
      exhibit.seizure_memo = body.memo || `Seized at ${body.location || 'scene'}.`;
      exhibit.witness1 = w1;
      exhibit.witness2 = w2;
      exhibit.witnessA = w1;
      exhibit.witnessB = w2;
      exhibit.seizureValid = isLawful;
      exhibit.admissibility = isLawful ? 'admissible' : 'tainted';

      // Sync linked recoveries
      (snap.recoveries || []).forEach((r: any) => {
        if (
          (r.item && exhibit && r.item.toLowerCase().includes(exhibit.name.toLowerCase())) ||
          (r.description && exhibit && r.description.toLowerCase().includes(exhibit.name.toLowerCase())) ||
          exhibit.category === 'others' || exhibit.isDisclosure
        ) {
          r.manuallyReset = false;
          r.manuallyEntered = true;
          r.witness_a = w1;
          r.witness_b = w2;
          r.witnesses = [w1, w2];
          r.confirmedWitnesses = r.confirmedWitnesses || [];
          if (w1 && !r.confirmedWitnesses.includes(w1)) r.confirmedWitnesses.push(w1);
          if (w2 && !r.confirmedWitnesses.includes(w2)) r.confirmedWitnesses.push(w2);
          r.s23_valid = isLawful;
          r.status = isLawful ? 'witnessed_recovery_completed' : 'disclosed_pending_panchnama';
        }
      });

      const baseW = this.getExhibitBaseWeight(exhibit);

      if (!isLawful) {
        exhibit.tainted = 1;
        exhibit.weight = 0;
        const reasons: string[] = [];
        const defects: string[] = [];

        if (!hasTwoWitnesses) {
          reasons.push('Seizure memo recorded without two distinct respectable local inhabitants (BNSS s.103 statutory requirement breached).');
          defects.push('Major Procedural Defect: Missing required two distinct independent panch witnesses under BNSS s.103.');
        }
        if (suspectWitnessFound) {
          reasons.push('Accused / suspect listed as panch witness (violates BNSS s.103 statutory requirement of independent inhabitants).');
          defects.push('Major Procedural Defect: Accused cannot be an independent panch witness under BNSS s.103.');
        }
        defects.push('Exhibit is TAINTED (0 PTS). Use the redo button to clear and record fresh independent witnesses after canvassing.');

        exhibit.taintReasons = reasons;
        exhibit.defects = defects;
        exhibit.why = `Major Procedural Defect under BNSS s.103: ${reasons.join(' ')} (0 PTS — Redo to correct).`;

        snap.diary.unshift({
          id: Date.now(),
          case_id: snap.caseId,
          day: snap.day,
          entry_type: 'deficiency',
          body: `Seizure of ${exhibit.title || exhibit.name || exhibit.label} has a MAJOR PROCEDURAL DEFECT under BNSS s.103: ${reasons.join(' ')} (0 PTS - Redo to correct).`,
          auto: 1,
          created_at: nowStr
        });
      } else {
        exhibit.tainted = 0;
        exhibit.weight = baseW;
        exhibit.defects = [];
        exhibit.taintReasons = [];
        exhibit.why = `Lawfully seized before two independent witnesses (${w1}, ${w2}) under BNSS s.103.`;

        // Remove any defective blocker
        snap.blockers = (snap.blockers || []).filter((b: any) => b.id !== `taint_${exhibit.id}` && b.id !== `taint_${exhibit.exhibitNo}`);
        snap.alerts = (snap.alerts || []).filter((a: any) => !a.text?.includes(`Exhibit ${exhibit.exhibitNo || exhibit.name || exhibit.id}`));

        snap.diary.unshift({
          id: Date.now(),
          case_id: snap.caseId,
          day: snap.day,
          entry_type: 'procedural',
          body: `Seizure of ${exhibit.title || exhibit.name || exhibit.label} completed lawfully before independent respectable witnesses (${w1}, ${w2}) under BNSS s.103 (${baseW} pts).`,
          auto: 1,
          created_at: nowStr
        });
      }
    }

    this.recalculateCaseReadiness(snap);
    this.crossSyncPlayerManualAction(caseId, 'exhibit_seize', body);
    this.bumpRev();
    this.saveState();
    const bundle = this.getFullBundle(caseId);
    return {
      ...bundle,
      valid: isLawful,
      ok: isLawful,
      problems: isLawful ? [] : (exhibit?.defects || ['Major Procedural Defect under BNSS s.103. Click Redo to correct.'])
    };
  }

  public imageDigitalExhibit(caseId: number, exhibitId: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const exId = Number(exhibitId);
    const exhibit = (snap.exhibits || []).find((e: any) => e.id === exId || e.hash === exhibitId);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (exhibit) {
      exhibit.forensic_imaged = 1;
      exhibit.hash = crypto.randomBytes(16).toString('hex');
      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'procedural',
        body: `Forensic image of ${exhibit.title || exhibit.label} taken. SHA-256 ${exhibit.hash} recorded for integrity.`,
        auto: 1,
        created_at: nowStr
      });
    }

    this.crossSyncPlayerManualAction(caseId, 'image_digital', { exhibitId });
    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public certificateS63(caseId: number, exhibitId: any, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const exId = Number(exhibitId);
    const exhibit = (snap.exhibits || []).find((e: any) => e.id === exId || e.hash === exhibitId);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const sigA = (body.person_in_charge || body.signerA || '').trim();
    const sigB = (body.expert_signature || body.signerB || '').trim();
    const hasPersonInCharge = sigA.length > 2;
    const hasExpert = sigB.length > 2;
    const isDualSigned = hasPersonInCharge && hasExpert && sigA.toLowerCase() !== sigB.toLowerCase();

    if (exhibit) {
      if (isDualSigned) {
        exhibit.s63_certified = 1;
        exhibit.s63Certified = true;
        exhibit.s63_defect = null;
        exhibit.admissibility = 'admissible';
        snap.diary.unshift({
          id: Date.now(),
          case_id: snap.caseId,
          day: snap.day,
          entry_type: 'procedural',
          body: `BSA s.63 electronic evidence certificate for ${exhibit.title || exhibit.name || exhibit.label} submitted with valid dual signatures (${sigA} & ${sigB}).`,
          auto: 1,
          created_at: nowStr
        });
      } else {
        exhibit.s63_certified = 0;
        exhibit.s63Certified = false;
        exhibit.s63_defect = 'The certificate lacks dual independent signatures as required by BSA s.63.';
        snap.diary.unshift({
          id: Date.now(),
          case_id: snap.caseId,
          day: snap.day,
          entry_type: 'deficiency',
          body: `BSA s.63 certificate for ${exhibit.title || exhibit.name || exhibit.label} is defective: Lacks required dual signatures.`,
          auto: 1,
          created_at: nowStr
        });
      }
    }

    this.crossSyncPlayerManualAction(caseId, 's63_cert', { exhibitId, isDualSigned });
    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    const bundle = this.getFullBundle(caseId);
    return {
      ...bundle,
      ok: isDualSigned,
      valid: isDualSigned,
      problems: isDualSigned ? [] : ['BSA s.63 requires dual signatures from both the person in charge and a qualified cyber/forensic expert.']
    };
  }

  public getLabCatalogue(): any {
    return { catalogue: this.labCatalogue };
  }

  public requestLabTest(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const catItem = this.labCatalogue.find(c => c.code === body.testCode);
    const turnaround = catItem ? catItem.turnaround : 5;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    snap.labRequests = snap.labRequests || [];
    const newReq = {
      id: Date.now(),
      case_id: snap.caseId,
      exhibit_id: body.exhibitId,
      test_code: body.testCode,
      test_name: catItem ? catItem.name : body.testCode,
      requested_day: snap.day,
      expected_day: snap.day + turnaround,
      status: 'pending',
      findings: null
    };
    snap.labRequests.push(newReq);

    // Advance 1 day for lab dispatch procedure
    snap.day = Math.min(snap.day + 1, snap.dayLimit);
    snap.daysLeft = Math.max(0, snap.dayLimit - snap.day);
    snap.clockPct = Math.round((snap.day / snap.dayLimit) * 100);

    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: `Exhibit sent for ${newReq.test_name}. Expected on day ${newReq.expected_day}.`,
      auto: 1,
      created_at: nowStr
    });

    this.recalculateCaseReadiness(snap);
    this.crossSyncPlayerManualAction(caseId, 'lab_request', body);
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public collectLabResult(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const req = (snap.labRequests || []).find((r: any) => r.id === Number(body.requestId));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    let resultObj: any = null;

    if (req) {
      req.status = 'collected';
      const exhibit = (snap.exhibits || []).find((e: any) => e.id === req.exhibit_id);
      const catItem = this.labCatalogue.find(c => c.code === req.test_code);
      const isRushed = !!req.rushed;
      const isTainted = exhibit && exhibit.admissibility === 'tainted';

      let findingText = req.findings;
      if (!findingText) {
        if (req.test_code === 'dna') {
          findingText = 'Autosomal STR DNA typing profile generated from biological swab. Allelic match obtained with single source profile corresponding to reference standard (probability > 99.998%).';
        } else if (req.test_code === 'ballistics') {
          findingText = 'Comparison microscope examination reveals matching 6-groove right-hand rifling striations on fired slug, matching the recovered firearm chamber.';
        } else if (req.test_code === 'trace') {
          findingText = 'Pyrolysis gas chromatography and microscopic cross-section comparison confirms identical chemical composition and layer thickness with control paint and synthetic fibre samples.';
        } else if (req.test_code === 'cyber') {
          findingText = 'Physical extraction and hash verification completed. Corroborating timestamps, call detail records, and cell-tower geolocation records extracted under clean cryptographic hash.';
        } else if (req.test_code === 'serology') {
          findingText = 'Kastle-Meyer and Takayama crystal tests positive for human hemoglobin. ABO typing confirmed Group O positive blood group.';
        } else if (req.test_code === 'toxicology') {
          findingText = 'Systematic toxicological screen via GC-MS detects concentrated chemical compound; negative for foreign adulterants.';
        } else {
          findingText = 'Forensic laboratory analysis completed under standard operating procedures. Consistent positive match established with crime scene physical evidence.';
        }
      }

      const conf = isRushed ? 58 : isTainted ? 65 : 94;
      const conclusionStrength = isRushed ? 'probable' : isTainted ? 'indicative' : 'conclusive';

      resultObj = {
        test: req.test_name || (catItem ? catItem.name : 'Forensic Analysis'),
        exhibit: exhibit ? (exhibit.exhibitNo ? `Ex. ${exhibit.exhibitNo} — ` : '') + exhibit.name : 'Exhibit',
        conclusion_strength: conclusionStrength,
        confidence: conf,
        finding: findingText,
        limitations: isRushed
          ? 'Rushed analysis protocol applied; incubation period shortened. Evidentiary weight indicative rather than absolute.'
          : isTainted
          ? 'Exhibit handling defects prior to laboratory dispatch limit definitive statutory certainty.'
          : 'Analyzed in triplicate using calibrated spectrometers and reference control blanks.',
        expert_opinion: `The scientific data establishes positive correlation with scene exhibits, admissible under BSA Section 39 / Section 45.`,
        supports: 'Prosecution case theory and charge sheet readiness under BNSS s.193'
      };

      req.result = resultObj;
      req.findings = findingText;
      req.confidence = conf;

      // Handshake 1: Boost exhibit evidentiary weight & forensic status
      if (exhibit) {
        exhibit.weight = Math.min(100, (exhibit.weight || 20) + (isRushed ? 15 : 30));
        exhibit.forensic_status = 'analyzed';
        exhibit.forensic_report_id = req.id;
        if (exhibit.admissibility !== 'tainted') {
          exhibit.admissibility = 'admissible';
        }
      }

      // Handshake 2: Auto-link contradictions to suspect dossiers
      const suspects = (snap.persons || []).filter((p: any) => p.role === 'suspect');
      suspects.forEach((s: any) => {
        s.contradictions = s.contradictions || [];
        const contraTitle = `FSL ${req.test_name} corroborates physical presence`;
        if (!s.contradictions.some((c: any) => c.against.includes(req.test_name))) {
          s.contradictions.push({
            against: `FSL report (${req.test_name}) matches crime scene forensic exhibits`,
            detail: `Scientific analysis contradicts the subject's denial and connects evidence found in situ with prosecution facts.`
          });
        }
      });

      // Handshake 3: Auto-add admissible provable fact to interview transcripts
      if (snap.interviews && snap.interviews.length) {
        snap.interviews.forEach((iv: any) => {
          iv.admissible = iv.admissible || [];
          const factTitle = `Forensic Proof: ${req.test_name} match confirmed`;
          if (!iv.admissible.some((a: any) => (typeof a === 'string' && a === factTitle) || (a && a.disclosed_fact === factTitle))) {
            iv.admissible.push({
              disclosed_fact: factTitle,
              recovery: `Forensic Science Laboratory Report (${req.test_name})`,
              weight: conf,
              discovery_witnessed: true
            });
          }
        });
      }

      // Handshake 4: Case Diary entry
      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'procedural',
        body: `Forensic Science Laboratory report received for ${req.test_name}. Conclusion: ${resultObj.conclusion_strength.toUpperCase()} (${conf}% confidence). ${findingText}`,
        auto: 1,
        created_at: nowStr
      });
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    const bundle = this.getFullBundle(caseId);
    return { ...bundle, result: resultObj, ok: true };
  }

  public recordStatement(caseId: number, personId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const person = (snap.persons || []).find((p: any) => p.id === personId);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (person) {
      person.examined = 1;
      person.statement = body.statement;
      person.statement_signed = body.signed ? 1 : 0;

      // Unlock any exhibits mentioned in the statement under BSA s.23
      if (body.statement) {
        this.unlockExhibitsFromDialogue(snap, body.statement, person);
      }

      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'procedural',
        body: `Statement of ${person.full_name || person.name} recorded under BNSS s.180.${person.statement_signed ? ' Signed by deponent.' : ''}`,
        auto: 1,
        created_at: nowStr
      });
    }

    this.crossSyncPlayerManualAction(caseId, 'statement', { personId });
    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public verifyAlibi(caseId: number, personId: number): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const person = (snap.persons || []).find((p: any) => p.id === personId);
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (person) {
      person.alibi_verified = 1;
      person.alibi_status = person.is_suspect ? 'refuted_by_cctv' : 'confirmed';

      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'procedural',
        body: `Alibi verification for ${person.full_name || person.name}: Checked mobile tower records and CCTV footage. Outcome: ${person.alibi_status}.`,
        auto: 1,
        created_at: nowStr
      });
    }

    this.crossSyncPlayerManualAction(caseId, 'alibi', { personId });
    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public arrestPerson(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const person = (snap.persons || []).find((p: any) => p.id === Number(body.personId));
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    if (person) {
      person.status = 'in_custody';
      person.arrest_grounds = body.grounds;
      person.arrest_day = snap.day;

      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'milestone',
        body: `Arrest of ${person.full_name || person.name} effected under BNSS s.35 on grounds: ${body.grounds}. Intimation sent to relative and medical exam conducted pursuant to BNSS s.53.`,
        auto: 1,
        created_at: nowStr
      });
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    const bundle = this.getFullBundle(caseId);
    return {
      ...bundle,
      ok: true,
      valid: true,
      problems: []
    };
  }

  public startInterview(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const person = (snap.persons || []).find((p: any) => p.id === personId);

    snap.interviews = snap.interviews || [];
    let interview = snap.interviews.find((iv: any) => iv.person_id === personId);
    let resumed = false;

    if (interview) {
      resumed = true;
      interview.phase = 'open';
      if (!interview.transcript) interview.transcript = [];
      
      // Maintain prior session metrics for re-examination continuity (§9 TASK 9)
      if (interview.arousal == null) interview.arousal = interview.tension != null ? interview.tension : 20;
      if (interview.resistance == null) interview.resistance = 65;
      if (interview.rapport == null) interview.rapport = 0;
      if (interview.belief == null) interview.belief = 30;
      if (interview.police_credibility == null) interview.police_credibility = interview.credibility != null ? interview.credibility : 60;
      if (interview.coercion == null) interview.coercion = 0;
      if (interview.disclosure_tier == null) interview.disclosure_tier = 0;
      if (interview.session_no == null) interview.session_no = 1;
      if (!interview.psychology && person) {
        interview.psychology = person.psychology_json || profileFor(person.role || 'suspect', person.name);
      }
      
      if (interview.tension == null) interview.tension = interview.arousal;
      if (interview.credibility == null) interview.credibility = interview.police_credibility;
      if (!interview.emotional_state) interview.emotional_state = 'guarded and defensive';
      if (!interview.admissible) interview.admissible = [];
      if (!interview.inadmissible) interview.inadmissible = [];
      if (!interview.tactics_used) interview.tactics_used = [];

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      snap.diary = snap.diary || [];
      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'procedural',
        body: `Re-examination of ${interview.person_name} commenced (Session #${interview.session_no}). State and prior statements maintained.`,
        auto: 1,
        created_at: nowStr
      });
    } else {
      const psych = (person && person.psychology_json) || profileFor(person?.role || 'suspect', person?.name || 'Suspect');
      interview = {
        id: Date.now(),
        case_id: snap.caseId,
        person_id: personId,
        person_name: person?.full_name || person?.name || 'Suspect',
        phase: 'open',
        start_day: snap.day,
        end_day: null,
        arousal: 20,
        resistance: 65,
        rapport: 0,
        belief: 30,
        police_credibility: 60,
        coercion: 0,
        disclosure_tier: 0,
        session_no: 1,
        session_turn: 0,
        regressions: 0,
        psychology: psych,
        tension: 20,
        credibility: 60,
        emotional_state: 'guarded and defensive',
        transcript: [],
        admitted: [],
        admissible: [],
        inadmissible: [],
        tactics_used: [],
        bluff_used: 0,
        disclosures: [],
        state_json: { turns: [], current_decision: 'stonewalling' },
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
      };
      snap.interviews.push(interview);

      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      snap.diary = snap.diary || [];
      snap.diary.unshift({
        id: Date.now(),
        case_id: snap.caseId,
        day: snap.day,
        entry_type: 'procedural',
        body: `Examination of ${interview.person_name} commenced in the Interrogation Suite under BNSS provisions.`,
        auto: 1,
        created_at: nowStr
      });
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    return {
      interviewId: interview.id,
      interview,
      resumed,
      ...this.getFullBundle(caseId)
    };
  }

  private getCleanStatedAlibi(person: any): string {
    const raw = (person?.stated_alibi || person?.alibi || '').trim();
    if (!raw || /^(statement\s+of|examination|formal\s+statement|recorded\s+under|bnss\s+s\.180)/i.test(raw)) {
      const name = (person?.name || '').toLowerCase();
      if (name.includes('prakash') || name.includes('gaikwad')) {
        return 'the depot dispatch office supervising vehicle dispatches';
      }
      if (name.includes('deepak') || name.includes('tandel')) {
        return 'the maintenance bay checking vehicle repair logs';
      }
      if (name.includes('salim') || name.includes('ansari')) {
        return 'attending my sister\'s wedding in Vasai';
      }
      if (name.includes('imran') || name.includes('pawar')) {
        return 'the wholesale timber market stall';
      }
      if (name.includes('sneha') || name.includes('naik')) {
        return 'the administrative terminal desk';
      }
      if (name.includes('nitin') || name.includes('bhosale')) {
        return 'the main gate security reception';
      }
      return 'my regular workplace on duty';
    }
    return raw.replace(/^['"]|['"]$/g, '').trim();
  }

  private async frameAssistantQuestion(
    assistName: string,
    rawInstruction: string,
    person: any,
    snap: any,
    interview: any,
    apiKey?: string
  ): Promise<string> {
    const transcript = interview?.transcript || [];
    const pName = (person.name || '').toLowerCase();
    const cleanInst = rawInstruction.replace(/^(\([^)]+\):\s*)/, '').trim();
    const lowerInst = cleanInst.toLowerCase();

    // Check if this is a general/directive command vs a specific topic or request
    const isGeneric = /^(you\s*)?(interrogate|ask|question)(\s*(him|her|them))?(\s*(now|more|further|again|please))?[\.?!]?$/i.test(lowerInst) ||
      /^(take\s*over|start\s*questioning|go\s*ahead|begin|continue|follow\s*up|carry\s*on)[\.?!]?$/i.test(lowerInst) ||
      lowerInst === 'you interrogate' || lowerInst === 'interrogate' || lowerInst === 'ask' || lowerInst === 'you ask' || lowerInst === 'take over' ||
      lowerInst.includes("based on suspect's previous answer") || lowerInst.includes("follow-up interrogation") || lowerInst === 'continue follow-up';

    // Gather all previously asked questions by officer/assistant to strictly prevent repetition
    const previousQuestions: string[] = transcript
      .filter((t: any) => t.speaker === 'officer' || t.speaker === 'assistant')
      .map((t: any) => (t.text || '').trim());
    const previousQuestionsLower = previousQuestions.map(q => q.toLowerCase());

    const hasQuestionBeenAsked = (candidate: string) => {
      const cLower = candidate.toLowerCase();
      return previousQuestionsLower.some(prev => {
        if (prev === cLower) return true;
        const cWords = cLower.split(/\s+/).filter(w => w.length > 3);
        const matchCount = cWords.filter(w => prev.includes(w)).length;
        return cWords.length > 5 && (matchCount / cWords.length) > 0.8;
      });
    };

    // Find the suspect's most recent reply
    const lastSuspectTurn = [...transcript].reverse().find((t: any) => t.speaker === 'suspect');
    const lastReply = (lastSuspectTurn?.text || '').trim();
    const lastReplyLower = lastReply.toLowerCase();

    // Assistant details for role-specific interrogation perspective
    const member = (this.team || []).find((m: any) => m.name?.toLowerCase().includes(assistName.toLowerCase())) ||
      (snap.team || []).find((m: any) => m.name?.toLowerCase().includes(assistName.toLowerCase())) || {
        name: assistName,
        role: 'field',
        speciality: 'Investigation & Evidence Recovery'
      };

    const squadPersona = getSquadInterrogationPersona(assistName, member.role || member.designation);

    // Comprehensive helper to clean any suspect name prefix, titles, or 3rd-person meta-framing from questions
    const cleanPrefix = (str: string) => {
      if (!str) return '';
      let c = str.trim().replace(/^```[\s\S]*?```$/g, '').replace(/^["']|["']$/g, '').trim();
      // Remove any assistant preamble addressing the IO
      c = c.replace(/^(understood|yes|certainly|alright|right away|on it|sure)[,.]?\s*(io|sir|officer|investigating officer)?[,.!:\n\s]*/i, '').trim();
      c = c.replace(/^(following (the )?io'?s? directive|as directed|based on the directive|as the io requested)[,.:\n\s]*/i, '').trim();
      c = c.replace(/^(the investigating officer wants you to (state|answer|clarify|explain|know):?\s*)/i, '').trim();
      c = c.replace(/^(the (lead )?io (wants|orders|asked) you to:?\s*)/i, '').trim();
      c = c.replace(/^(on behalf of (the )?(lead )?io:?\s*)/i, '').trim();
      c = c.replace(/^["']|["']$/g, '').trim();

      const pNameParts = (person.name || '').split(/\s+/).filter(Boolean);
      const namePatterns = [
        person.name,
        ...pNameParts,
        'Imran Pawar', 'Imran', 'Pawar',
        'Sneha Naik', 'Sneha', 'Naik',
        'Nitin Bhosale', 'Nitin', 'Bhosale',
        'Suspect', 'Accused', 'Mr\\.?\\s+[A-Za-z]+', 'Ms\\.?\\s+[A-Za-z]+'
      ].filter(Boolean);

      const regex = new RegExp(`^(${namePatterns.join('|')})[,\\:\\s\\-]+`, 'i');
      while (regex.test(c)) {
        c = c.replace(regex, '').trim();
      }
      c = c.replace(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*[,\\:]\s*/, '').trim();
      c = c.replace(/^Listen to me[,\\:\s]+/i, '').trim();
      c = c.replace(/^Look here[,\\:\s]+/i, '').trim();
      if (c.length > 0) c = c.charAt(0).toUpperCase() + c.slice(1);
      return c;
    };

    // Try Gemini AI first
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (keyToUse) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: keyToUse });
        const recentDialogue = (interview.transcript || []).slice(-4).map((t: any) => `${t.speaker === 'officer' ? 'Investigating Officer' : t.speaker === 'assistant' ? t.assistant_name || 'Co-Examiner' : 'Suspect'}: ${t.text}`).join('\n');
        
        const activeDir = interview?.activeDirective;
        let directiveContext = `Directive from Investigating Officer: "${cleanInst}"`;
        if (activeDir && activeDir.status === 'active') {
          directiveContext += `\nOperational Posture: ${activeDir.tacticalPosture || 'focused questioning'}. Mode: ${activeDir.operationalMode || 'co_examiner'}.`;
          if (activeDir.targetEntities) {
            if (activeDir.targetEntities.exhibits?.length) directiveContext += `\nTarget Exhibits to press on: ${activeDir.targetEntities.exhibits.join(', ')}`;
            if (activeDir.targetEntities.persons?.length) directiveContext += `\nTarget Accomplices/Persons: ${activeDir.targetEntities.persons.join(', ')}`;
            if (activeDir.targetEntities.locations?.length) directiveContext += `\nTarget Locations/Concealment: ${activeDir.targetEntities.locations.join(', ')}`;
            if (activeDir.targetEntities.timeWindows?.length) directiveContext += `\nTarget Time Window: ${activeDir.targetEntities.timeWindows.join(', ')}`;
          }
          if (typeof activeDir.remainingQuestions === 'number') {
            directiveContext += `\nQuestions quota remaining: ${activeDir.remainingQuestions} of ${activeDir.questionBudget || activeDir.remainingQuestions}. Make this question count.`;
          }
        }

        const cleanAlibiNarrative = this.getCleanStatedAlibi(person);

        const aiPrompt = `You are roleplaying as ${squadPersona.name} [${squadPersona.rank}], an assisting police officer under the command of the Lead Investigating Officer (Lead IO) in an interrogation room.
The Lead IO has given you this command/directive: "${cleanInst}"

SQUAD MEMBER PERSONA & MATRIX:
- Role & Identity: ${squadPersona.name} (${squadPersona.rank})
- Specialization: ${squadPersona.specialization}
- Interrogation Focus: ${squadPersona.interrogationFocus}
- Tone in Room: ${squadPersona.firstPersonTone}

CASE SNAPSHOT:
- FIR: ${snap.fir?.incident_type || 'Crime'} (${snap.fir?.short_summary || ''})
- Suspect: ${person.name} (${person.occupation || person.role || 'Suspect'})
- Stated Alibi: ${cleanAlibiNarrative}
- Current Tension: ${interview.tension || 30}/100, Credibility: ${interview.credibility || 70}/100

RECENT INTERROGATION TRANSCRIPT:
${recentDialogue}

The suspect just said: "${lastReply || 'None yet'}"

CRITICAL MANDATORY FIRST-PERSON SPEAKING RULES:
1. Speak DIRECTLY to the suspect (${person.name}) in the FIRST PERSON ("I", "my", "we", "our").
2. DO NOT include any acknowledgements or confirmations to the Lead IO. NO "Jai Hind", NO "Right away sir", NO "(Understood, Sir)", NO bracketed "[ ]" or parenthetical "( )" text!
3. DO NOT repeat or echo the Lead IO's directive back into the room.
4. Translate the Lead IO's directive naturally into spoken interrogation dialogue and action (e.g. if the Lead IO ordered you to offer chai/water and interrogate alibi: "${person.name.split(' ')[0]}, take this cup of hot cutting chai, drink it and steady yourself. Now answer me directly: where were you between 08:00 and 08:30 AM on the day of the incident?").
5. Keep it crisp, authoritative, authentic, and realistic.

List of already asked questions (DO NOT REPEAT ANY):
${previousQuestions.slice(-10).map((q, idx) => `${idx + 1}. "${q}"`).join('\n')}

Output JSON format:
{
  "spokenQuestion": "Your direct 1st-person dialogue spoken to the suspect"
}`;

        const genPromise = ai.models.generateContent({
          model: DEFAULT_GEMINI_MODEL,
          contents: aiPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 8500));
        const res: any = await Promise.race([genPromise, timeoutPromise]);
        if (res && res.text) {
          try {
            const parsed = JSON.parse(res.text.trim());
            let framedQ = cleanPrefix(parsed.spokenQuestion || parsed.framedQuestionToPoi || parsed.question || res.text);
            framedQ = framedQ.replace(/^[\(\[][^\]\)]+[\)\]]\s*/, '').trim();
            if (framedQ.length > 10 && !hasQuestionBeenAsked(framedQ)) {
              return framedQ;
            }
          } catch {
            let cleanQ = cleanPrefix(res.text);
            cleanQ = cleanQ.replace(/^[\(\[][^\]\)]+[\)\]]\s*/, '').trim();
            if (cleanQ.length > 12 && !hasQuestionBeenAsked(cleanQ)) {
              return cleanQ;
            }
          }
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }

    // High fidelity procedural fallback tailored to assistant persona in authentic direct 1st-person voice
    const pFirst = (person.name || '').split(' ')[0] || 'Suspect';

    // If player gave a custom directive
    if (!isGeneric && cleanInst && cleanInst.length > 2) {
      const lowerInst = cleanInst.toLowerCase();

      // Courtesy: Tea / Water / Refreshment
      if (lowerInst.includes('tea') || lowerInst.includes('chai') || lowerInst.includes('water') || lowerInst.includes('coffee') || lowerInst.includes('drink') || lowerInst.includes('snack') || lowerInst.includes('biscuit') || lowerInst.includes('refreshment') || lowerInst.includes('breakfast') || lowerInst.includes('food')) {
        if (lowerInst.includes('where') || lowerInst.includes('alibi') || lowerInst.includes('8 am') || lowerInst.includes('timeline') || lowerInst.includes('market') || lowerInst.includes('interrogate') || lowerInst.includes('question') || lowerInst.includes('ask')) {
          return `${pFirst}, take this cup of hot cutting chai, drink it and steady yourself. Now answer me directly: where were you between 08:00 and 08:30 AM on the day of the incident?`;
        }
        return `${pFirst}, here is a hot cup of tea and a glass of water for you. Drink it, take a breath, and steady yourself before we proceed further.`;
      }

      // Vacation / Travel
      if (lowerInst.includes('vacation') || lowerInst.includes('holiday') || lowerInst.includes('travel') || lowerInst.includes('trip') || lowerInst.includes('leave')) {
        return `I'm asking you directly: when was the last time you went on vacation or traveled out of town, and where did you stay?`;
      }

      // Family Background
      if (lowerInst.includes('family') || lowerInst.includes('wife') || lowerInst.includes('husband') || lowerInst.includes('child') || lowerInst.includes('parent') || lowerInst.includes('relative')) {
        return `Tell me about your family background and who was present with you at your residence during the critical timeline of the incident.`;
      }

      // Health / Medical
      if (lowerInst.includes('health') || lowerInst.includes('sick') || lowerInst.includes('ill') || lowerInst.includes('doctor') || lowerInst.includes('hospital') || lowerInst.includes('medicine')) {
        return `Tell me honestly: are you currently suffering from any medical condition, or taking prescribed medications we need to record?`;
      }

      // Calm / Relax
      if (lowerInst.includes('calm') || lowerInst.includes('relax') || lowerInst.includes('easy')) {
        return `Take a deep breath and compose yourself. We are giving you a fair opportunity to state your side of the story truthfully.`;
      }

      // Truth / Confession Pressure
      if (lowerInst.includes('truth') || lowerInst.includes('honest')) {
        return `Tell me the truth right now. Evading our questions and giving false alibis is only worsening your legal standing under the law.`;
      }

      // Alibi / Whereabouts
      if (lowerInst.includes('alibi') || lowerInst.includes('where') || lowerInst.includes('location') || lowerInst.includes('timeline')) {
        return `I want you to account for your exact movements and whereabouts minute by minute during the occurrence window.`;
      }

      // Bag / Tools / Stolen items
      if (lowerInst.includes('bag') || lowerInst.includes('tool') || lowerInst.includes('stolen') || lowerInst.includes('cash') || lowerInst.includes('item') || lowerInst.includes('cutter')) {
        return `I am asking you directly: disclose where the physical articles and tools connected to this incident are concealed!`;
      }

      // Accomplice / Payment / Contact
      if (lowerInst.includes('who') || lowerInst.includes('accomplice') || lowerInst.includes('paid') || lowerInst.includes('partner') || lowerInst.includes('boss')) {
        return `Tell me right now: who instructed you to participate, and who paid you for this job?`;
      }

      // Convert natural language command into professional 1st-person interrogation question
      let topic = cleanInst
        .replace(/^(ask|tell|order|demand|request|question)\s+(him|her|them|the suspect)\s+(to\s+|if\s+|about\s+|where\s+|why\s+|for\s+)?/i, '')
        .replace(/^(ask|tell|question)\s+(about\s+)?/i, '')
        .trim();

      topic = topic
        .replace(/\bhe was\b/gi, 'you were')
        .replace(/\bshe was\b/gi, 'you were')
        .replace(/\bhe is\b/gi, 'you are')
        .replace(/\bshe is\b/gi, 'you are')
        .replace(/\bhe has\b/gi, 'you have')
        .replace(/\bshe has\b/gi, 'you have')
        .replace(/\bhe had\b/gi, 'you had')
        .replace(/\bshe had\b/gi, 'you had')
        .replace(/\bhis\b/gi, 'your')
        .replace(/\bher\b/gi, 'your')
        .replace(/\btheir\b/gi, 'your')
        .replace(/\bhim\b/gi, 'you')
        .replace(/\bthem\b/gi, 'you')
        .replace(/\bhe\b/gi, 'you')
        .replace(/\bshe\b/gi, 'you')
        .trim();

      if (topic.length > 2) {
        if (!topic.endsWith('?') && !topic.endsWith('.')) {
          return `Answer me directly: what can you tell us regarding ${topic}?`;
        } else {
          return `I want you to answer me directly: ${topic}`;
        }
      }
    }

    // 1. Direct follow-up addressing suspect's latest reply in 1st person:
    if (pName.includes('imran') || pName.includes('pawar')) {
      if (lastReplyLower.includes('tea vendor') || lastReplyLower.includes('market corner') || lastReplyLower.includes('8 am')) {
        const q = cleanPrefix(`Our beat constable already canvassed that tea vendor at the market corner. He stated his stall was shuttered until 8:45 AM and he never served you. Who were you really waiting for near the alleyway at 8:20 AM?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('delivery') || lastReplyLower.includes('main road') || lastReplyLower.includes('rounds')) {
        const q = cleanPrefix(`We cross-checked your delivery manifest with logistics dispatch. You had zero registered deliveries scheduled near Shivaji Market before 10 AM. Why were you carrying that heavy grey bag into the rear alley?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('short on money') || lastReplyLower.includes('pin the whole burglary')) {
        const q = cleanPrefix(`Being short on money explains why you accepted the job, but it won't save you in court. Tell me who handed you the lock-cutter, and where you stashed it after cutting the market latch!`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('electronic proof') || lastReplyLower.includes('show it to me')) {
        const q = cleanPrefix(`Sector 4 cell tower CDR logs show your mobile device pinging 120 meters from the broken shutter between 08:10 and 08:30 AM. How do you explain that electronic footprint while claiming you were elsewhere?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('hold the bag') || lastReplyLower.includes('held the bag') || lastReplyLower.includes('carry')) {
        const q = cleanPrefix(`You admitted carrying that heavy grey bag. Where did you take it after leaving the market alley, and where is it hidden right now?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('transformer') || lastReplyLower.includes('shed') || lastReplyLower.includes('water tank')) {
        if (!lastReplyLower.includes('nitin') && !lastReplyLower.includes('paid')) {
          const q = cleanPrefix(`We have cordoned off the transformer shed. Who paid you to stash the duffel bag there, and what was your agreed cut from the stolen cash?`);
          if (!hasQuestionBeenAsked(q)) return q;
        } else {
          const q = cleanPrefix(`How did you gain access through the back entrance of the market? Did Nitin Bhosale provide a duplicate key, or was the latch left open for you?`);
          if (!hasQuestionBeenAsked(q)) return q;
        }
      }
      if (lastReplyLower.includes('nitin') || lastReplyLower.includes('bhosale')) {
        const q = cleanPrefix(`Where did Nitin Bhosale instruct you to hand over the stolen goods, and what vehicle did he drive to the handover point?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
    } else if (pName.includes('sneha') || pName.includes('naik')) {
      if (lastReplyLower.includes('glitch') || lastReplyLower.includes('system') || lastReplyLower.includes('routine')) {
        const q = cleanPrefix(`Immutable server logs certified under BSA s.63 prove an administrative override was manually triggered from your terminal login at 08:12 AM. Who stood at your desk and authorized that override?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('loan') || lastReplyLower.includes('family') || lastReplyLower.includes('account')) {
        const q = cleanPrefix(`Bank deposit slips confirm that structured cash was deposited immediately after the depot gate tampering. Where is the duplicate register extract that Nitin Bhosale handed you?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
      if (lastReplyLower.includes('drawer') || lastReplyLower.includes('desk')) {
        const q = cleanPrefix(`Who else at Sunrise Logistics had access to that desk drawer, and what other gate logs were tampered with during the past fortnight?`);
        if (!hasQuestionBeenAsked(q)) return q;
      }
    }

    // 2. Role-specific candidate questions in 1st-person without any suspect name prefixes:
    const candidateQuestions: string[] = [];

    if (assistName.includes('Preeti') || assistName.includes('Cyber')) {
      candidateQuestions.push(
        `Our digital forensic audit revealed cell tower co-location and digital messaging records linked to your handset around the time of the incident. Explain your exact movements and communications during those critical minutes to me.`,
        `Device imaging shows multiple deleted incoming voice calls on your handset between 8:05 and 8:20 AM. Who ordered you to wipe those call logs?`,
        `CCTV footage from the junction camera shows a timestamp discrepancy with your stated arrival. We are running facial recognition against that feed — do you wish to clarify your presence before the report is certified?`,
        `Search logs extracted from your mobile handset show queries for shop shutter locks and security alarm bypasses three days prior to the incident. Why were you searching for those methods?`,
        `Forensic hash verification under BSA Section 63 confirms digital timestamps cannot be forged. Where did you hide the mobile device or SIM card you used to coordinate the entry?`,
        `Banking logs show suspicious structured cash deposits credited right after the occurrence. Where did that money originate from?`
      );
    } else if (assistName.includes('Ravi') || assistName.includes('JC')) {
      candidateQuestions.push(
        `According to the beat constable patrol log and local shopkeeper canvassing, a person matching your description was seen near the alleyway at 08:20 AM. Who were you meeting there and what was in the package you were carrying?`,
        `Local shopkeepers reported seeing you arrive on a motorcycle and park behind the market compound. Where is that vehicle parked right now, and what was inside the storage compartment?`,
        `The market watchman found the back entrance latch cut with an industrial cutter. When you entered through that gate, who held the door open for you?`,
        `Witnesses near the market gate saw you leaving in a hurry with a weighted sack around 8:25 AM. Where did you transport that sack immediately after leaving Shivaji Market?`,
        `Multiple witnesses saw you carrying a heavy grey bag near the back alley at 08:22 AM. Tell me where that bag and the lock-cutting tools are stashed!`,
        `Under BSA Section 23, talk alone protects nobody. If you want this court to record your cooperation, disclose the exact location where the stolen property and lock-cutting tools are concealed.`,
        `An inventory of the shop confirmed missing cash boxes and branded merchandise. Describe the exact container or wrapping used to take those items out of the premises.`,
        `Your timeline has a 45-minute blackout between 8:15 AM and 9:00 AM. Name one respectable person in the locality who can swear to your whereabouts during those critical minutes.`
      );
    } else if (assistName.includes('Dhanraj') || assistName.includes('Constable')) {
      candidateQuestions.push(
        `We have canvassed commercial establishments along the approach road. Three separate eyewitnesses confirmed seeing you pacing near the market gate. Who accompanied you?`,
        `Traffic surveillance cameras at Shivaji Chowk captured your jacket at 08:18 AM heading directly towards the crime scene. Where did you ride immediately following that?`,
        `The beat constable noticed tyre marks matching your scooter tread behind the transformer enclosure. What were you loading or unloading at that spot?`,
        `Local residents saw two men loading a bulky parcel into an auto-rickshaw near the market exit. Were you one of those men, and where did the rickshaw drop that cargo?`,
        `Every statement you make is being verified door-to-door right now. If your alibi collapses before the Magistrate, your bail prospects are zero. Tell me where the stolen goods were dropped.`
      );
    } else if (assistName.includes('Sawant') || assistName.includes('Insp')) {
      candidateQuestions.push(
        `Under BNSS provisions, you are bound to state the truth. Your stated alibi directly contradicts witness statements recorded under s.180 BNSS. Tell me where the proceeds and tools of crime were deposited before we execute formal search warrants.`,
        `You are facing charges under BNS sections carrying severe penal consequences. The Investigating Officer has already assembled physical evidence. Your only mitigation is leading us to the recovery of the concealed articles under BSA s.23.`,
        `Look at this case diary. We have independent panch witnesses ready. If you disclose the spot where the goods are hidden now, your statement will be recorded lawfully. Where is the property concealed?`,
        `Playing innocent will not stand in Sessions Court. The chain of custody is established. Who gave the directive for this burglary, and where was the stolen cash taken?`
      );
    } else {
      candidateQuestions.push(
        `Clarify your exact timeline between 8:00 AM and 9:00 AM on the day of the incident, and specify where any related physical items are currently concealed.`,
        `We are preparing search warrants for multiple locations. Disclose where the tools and stolen property were stashed before formal seizures are executed.`,
        `Witness statements recorded in the case diary directly challenge your version of events. Who was with you during the occurrence?`,
        `Under BSA Section 23, only locatable facts leading to physical discovery are admissible in court. Where are the proceeds of this offence hidden?`
      );
    }

    // Pick first unasked question from candidate pool
    for (const rawCq of candidateQuestions) {
      const cq = cleanPrefix(rawCq);
      if (!hasQuestionBeenAsked(cq)) {
        return cq;
      }
    }

    // Dynamic unasked fallback incorporating case exhibits or general discovery mandate
    const exhibits = (snap.exhibits || []).filter((e: any) => e.found || e.seized);
    const exhibitRef = exhibits[transcript.length % Math.max(1, exhibits.length)];
    const fallbackQ = exhibitRef
      ? cleanPrefix(`Regarding Exhibit ${exhibitRef.code || ''} (${exhibitRef.name}): explain how this recovered evidence connects to your statements, and state where the remaining items are hidden.`)
      : cleanPrefix(`You have avoided answering key questions about your whereabouts. State clearly where the tools and stolen items were placed so they can be lawfully recovered under BSA Section 23.`);

    return fallbackQ;
  }

  public getSnapshot(caseId: number): any {
    return this.snapshots.get(caseId);
  }

  public getMicroLiesForSuspect(snap: any, person: any): any[] {
    if (!person) return [];
    if (person.micro_lies && Array.isArray(person.micro_lies) && person.micro_lies.length > 0) {
      return person.micro_lies;
    }

    const lies: any[] = [];
    const pName = (person.name || '').toLowerCase();

    // 1. Alibi Refutation
    if (person.true_alibi && String(person.true_alibi).length > 5) {
      lies.push({
        id: `lie-${person.id}-alibi-core`,
        personId: person.id,
        type: 'alibi',
        categoryLabel: 'False Alibi Refutation',
        icon: '🛡️',
        title: 'Alibi Refutation & Crime Scene Presence',
        suspectClaim: person.stated_alibi || 'Maintains innocence and claims complete absence from scene.',
        truthFact: String(person.true_alibi),
        evidenceProof: 'Corroborated Forensic Timestamps & Surveillance Records',
        suggestedTactic: 'contradiction-trap',
        confrontationPrompt: `You stated: "${person.stated_alibi || 'I was elsewhere'}", but case evidence establishes: "${person.true_alibi}". How do you reconcile this direct contradiction?`,
        statuteRef: 'BSA §145 / §146 (Impeachment by Contradiction)',
        confronted: false
      });
    }

    // 2. Character-specific tailored micro-lies
    if (pName.includes('prakash') || pName.includes('gaikwad')) {
      lies.push({
        id: `lie-${person.id}-tower`,
        personId: person.id,
        type: 'timeline',
        categoryLabel: 'Cell Tower Mismatch',
        icon: '⏰',
        title: 'Depot Presence vs. Marol Sector Tower Dump',
        suspectClaim: 'Claimed to have been stationed inside the logistics depot all morning on routine dispatch duty.',
        truthFact: 'Cellular tower logs (Sector 4 Marol tower) place mobile 98xxx11223 active along Marol Depot Road between 08:20 and 09:50 AM.',
        evidenceProof: 'Exhibit E — Call Detail Records & Tower Location Dump (BSA §63 certified)',
        suggestedTactic: 'contradiction-trap',
        confrontationPrompt: 'Prakash, you insist you were at the depot all morning, but Exhibit E proves your mobile was registered on the Marol Depot Road tower between 08:20 and 09:50 AM. Why were you on that stretch during the robbery?',
        statuteRef: 'BSA §63 & BSA §145',
        confronted: false
      });

      lies.push({
        id: `lie-${person.id}-calls`,
        personId: person.id,
        type: 'accomplice',
        categoryLabel: 'Clandestine Communications',
        icon: '📞',
        title: 'Denied Association with Loader Deepak Tandel',
        suspectClaim: 'Claimed to have no personal contact with loader Deepak Tandel or any heist participants.',
        truthFact: 'Outgoing call at 08:12 AM (18 mins before robbery) and incoming call at 09:41 AM with Deepak Tandel\'s active number 98xxx77045.',
        evidenceProof: 'Exhibit E & Exhibit H — Mobile Handsets & Symmetric CDR Log',
        suggestedTactic: 'evidence-disclosure',
        confrontationPrompt: 'You claim you had no contact with Deepak Tandel, yet your call log shows a call with him at 08:12 AM before the ambush and another at 09:41 AM! What instructions did you give him?',
        statuteRef: 'BSA §8 (Motive, Preparation & Conduct)',
        confronted: false
      });

      lies.push({
        id: `lie-${person.id}-shortfall`,
        personId: person.id,
        type: 'financial',
        categoryLabel: 'Financial Motive Concealment',
        icon: '💰',
        title: 'Hidden ₹6.4 Lakh Depot Account Shortfall',
        suspectClaim: 'Stated he had no financial troubles and was merely managing ordinary payroll transit.',
        truthFact: 'Internal audit confirmed a ₹6.4 lakh diesel account shortfall under his direct signature with an impending audit query.',
        evidenceProof: 'Exhibit I — Depot Audit Ledger & Diesel Reconciliation Statement',
        suggestedTactic: 'contradiction-trap',
        confrontationPrompt: 'You told us you have no motive, but company records reveal a ₹6.4 lakh diesel shortfall under your personal charge. The payroll cash was taken to plug your debt, wasn\'t it?',
        statuteRef: 'BSA §8 (Motive)',
        confronted: false
      });
    } else if (pName.includes('deepak') || pName.includes('tandel') || pName.includes('dips')) {
      lies.push({
        id: `lie-${person.id}-blood`,
        personId: person.id,
        type: 'forensic',
        categoryLabel: 'Biological Evidence Match',
        icon: '🩸',
        title: 'Culvert Road-Shoulder Bloodstain Serology',
        suspectClaim: 'Denies being present at the culvert embankment and claims no injuries were sustained on the day of the robbery.',
        truthFact: 'White cotton kerchief recovered in the road gravel contains B-positive bloodstains matching Deepak Tandel, whereas the security guard is O-positive.',
        evidenceProof: 'Exhibit C — Bloodstained Cotton Kerchief (FSL Serology Report)',
        suggestedTactic: 'contradiction-trap',
        confrontationPrompt: 'Deepak, you swore you were never at the culvert, but the bloody kerchief found on the road-shoulder has B-positive blood matching your exact blood group! How did your blood get on that road?',
        statuteRef: 'BSA §45 (Expert Scientific Opinion)',
        confronted: false
      });

      lies.push({
        id: `lie-${person.id}-pickup`,
        personId: person.id,
        type: 'vehicle',
        categoryLabel: 'Vehicle Sight & Tyres',
        icon: '🛻',
        title: 'Denied Operation of Blue Mahindra Pickup',
        suspectClaim: 'Claims he did not operate or ride in any pickup truck on the morning of the occurrence.',
        truthFact: 'Tyre cast at the culvert embankment matches the distinct 3.2mm shoulder wear of his cousin\'s blue Mahindra pickup, and tea stall CCTV captures him.',
        evidenceProof: 'Exhibit D & F — CCTV Video & Culvert Tyre Impression Cast',
        suggestedTactic: 'evidence-disclosure',
        confrontationPrompt: 'CCTV footage from the tea stall and tyre casts at the culvert match the blue Mahindra pickup you borrowed from your cousin. You were seen at the wheel at 08:15 AM!',
        statuteRef: 'BSA §9 & §63',
        confronted: false
      });

      lies.push({
        id: `lie-${person.id}-cash`,
        personId: person.id,
        type: 'financial',
        categoryLabel: 'Sudden Cash Influx',
        icon: '💵',
        title: 'Unexplained Cash Expenditure in Ambewadi',
        suspectClaim: 'Claims he has been penniless since his dismissal and had no access to funds.',
        truthFact: 'Informant reports and local merchant receipts confirm Deepak was buying rounds and paying off an old ₹15,000 cash debt in crisp ₹500 notes two days later.',
        evidenceProof: 'Informant Report #5 & Bank Wrapper Corroboration',
        suggestedTactic: 'contradiction-trap',
        confrontationPrompt: 'You claim you had no money, yet two days after ₹4.18 lakh vanished, you settled a ₹15,000 debt in Ambewadi using fresh ₹500 notes. Where did that cash come from?',
        statuteRef: 'BSA §8',
        confronted: false
      });
    } else if (pName.includes('salim') || pName.includes('ansari')) {
      lies.push({
        id: `lie-${person.id}-alibi`,
        personId: person.id,
        type: 'alibi',
        categoryLabel: 'Exculpatory Alibi Corroboration',
        icon: '🛡️',
        title: 'Vasai Sister\'s Wedding Corroboration',
        suspectClaim: 'Claims he was attending his sister\'s wedding in Vasai from 06:00 to late evening and lent his truck to Deepak in good faith.',
        truthFact: '40+ wedding guests and caterer\'s receipt corroborate Salim was genuinely in Vasai; his vehicle was misused by Deepak.',
        evidenceProof: 'Vasai Marriage Hall Register & Caterer Bill Verification',
        suggestedTactic: 'rapport',
        confrontationPrompt: 'Salim, we have verified your presence in Vasai. Tell us honestly: exactly when and under what pretext did Deepak take your pickup?',
        statuteRef: 'BNSS §180 / BSA §11',
        confronted: false
      });
    } else {
      if (person.role === 'suspect') {
        lies.push({
          id: `lie-${person.id}-time-proc`,
          personId: person.id,
          type: 'timeline',
          categoryLabel: 'Timeline Discrepancy',
          icon: '⏰',
          title: 'Unverified Stated Timeline vs. Forensic Clock',
          suspectClaim: person.stated_alibi || 'Insisted on total absence during the critical crime window.',
          truthFact: 'Physical scene exhibits and CCTV sight-lines indicate movement inconsistent with complete absence.',
          evidenceProof: 'Corroborated Case Exhibits & Surveillance Log',
          suggestedTactic: 'contradiction-trap',
          confrontationPrompt: `You claim: "${person.stated_alibi || 'I was elsewhere'}", but case exhibits place an individual of your exact description at the scene! How do you account for this?`,
          statuteRef: 'BSA §145',
          confronted: false
        });
      }
    }

    person.micro_lies = lies;
    return lies;
  }

  public async turnInterview(caseId: number, body: any, apiKey?: string): Promise<any> {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const interviewId = Number(body.interviewId);
    const personId = Number(body.personId);
    const interview = (snap.interviews || []).find((iv: any) => (interviewId && iv.id === interviewId) || (personId && iv.person_id === personId)) || (snap.interviews || [])[0];
    if (!interview) throw new Error('No active interrogation found');

    const person = (snap.persons || []).find((p: any) => p.id === interview.person_id) || { name: interview.person_name || 'Suspect', role: 'suspect' };
    const userText = (body.input || '').trim();
    const technique = body.technique || 'open-question';

    let isAssistantTurn = false;
    let assistName = body.assistantName || snap.interrogation_assistant || '';
    let questionText = userText;

    if (assistName) {
      snap.interrogation_assistant = assistName;
    }

    if (userText.startsWith('(') && userText.includes('asks on IO directive')) {
      isAssistantTurn = true;
      const matchName = userText.match(/\(([^)]+)\s+asks/);
      if (matchName && matchName[1]) assistName = matchName[1];
      questionText = userText.replace(/^\([^)]+\):\s*/, '');
      if (assistName) snap.interrogation_assistant = assistName;
    } else if (body.assistantName) {
      isAssistantTurn = true;
      snap.interrogation_assistant = body.assistantName;
    }

    let isSilentScribeActive = !!(interview.activeDirective && interview.activeDirective.status === 'active' && interview.activeDirective.operationalMode === 'silent_scribe');

    if (isAssistantTurn) {
      if (isSilentScribeActive) {
        questionText = `(Officer ${assistName || 'Co-Examiner'} maintains silent observation and records notes)`;
      } else {
        questionText = await this.frameAssistantQuestion(assistName || 'Co-Examiner', questionText, person, snap, interview, apiKey);
      }
    }

    let replyText = '';
    let evasionType = 'defensive';
    let tensionDelta = 0;
    let credDelta = 0;
    let emotionalState = 'anxious';
    let locatableDisclosure: any = { available: false };
    let contradictionNoted: string | null = null;
    let officerNote: string | null = null;
    let isConfession = false;

    // --- TASK 4: DETERMINISTIC INTERROGATION ENGINE & 8-LAYER PROMPT ---
    // 1. Map incoming technique to TacticType
    const rawTactic = (technique || 'rapport').toLowerCase();
    let mappedTactic: TacticType = 'rapport';
    if (rawTactic.includes('accus') || rawTactic.includes('trap') || rawTactic.includes('confront')) {
      mappedTactic = 'accusatory';
    } else if (rawTactic.includes('exhibit') || rawTactic.includes('evidence') || rawTactic.includes('disclosure')) {
      mappedTactic = 'evidence-disclosure';
    } else if (rawTactic.includes('silence')) {
      mappedTactic = 'silence';
    } else if (rawTactic.includes('bluff')) {
      mappedTactic = 'bluff';
    } else {
      mappedTactic = 'rapport';
    }

    // 2. Ensure suspect psychology exists
    if (!person.psychology_json) {
      person.psychology_json = profileFor(person.role || 'suspect', person.name);
      person.breaking_point = person.breaking_point || breakingPointFor(person.role || 'suspect', person.name);
    }

    // 3. Assemble current state
    const advocatePresent = Boolean(body.advocatePresent ?? interview.advocatePresent ?? snap.remand_clock?.advocatePresent);
    const remandMinutesRemaining = typeof body.remandMinutesRemaining === 'number' 
      ? body.remandMinutesRemaining 
      : (snap.remand_clock?.remandMinutesRemaining ?? snap.remand_clock?.minutes_remaining ?? 1440);

    const priorState: InterrogationState = {
      arousal: typeof interview.arousal === 'number' ? interview.arousal : (interview.tension || 20),
      resistance: typeof interview.resistance === 'number' ? interview.resistance : 65,
      rapport: typeof interview.rapport === 'number' ? interview.rapport : (interview.credibility > 60 ? 10 : 0),
      belief: typeof interview.belief === 'number' ? interview.belief : 30,
      police_credibility: typeof interview.police_credibility === 'number' ? interview.police_credibility : (interview.credibility || 60),
      coercion: typeof interview.coercion === 'number' ? interview.coercion : 0,
      disclosure_tier: (interview.disclosure_tier || 0) as (0 | 1 | 2 | 3 | 4),
      session_turn: (interview.session_turn || 0) + 1,
      psychology: person.psychology_json,
      contradictions_found: interview.contradictions_found || 0,
      session_no: interview.session_no || 1,
      advocate_present: advocatePresent
    };

    // 4. Compute state transition deterministically
    const priorTactic = interview.last_tactic;
    const newState = applyTactic(priorState, mappedTactic, { priorTactic, advocatePresent, remandMinutesRemaining });
    const decisionBranch = makeDecision(newState, { didRegress: newState.resistance > priorState.resistance });

    // Milestone 2: Psychological Breakdown & Tactical Bluff Dynamics
    const breakdownEval = evaluateBreakdownState({
      stressLevel: newState.arousal,
      cooperationLevel: 100 - newState.resistance,
      composureState: newState.arousal >= 80 ? 'breakdown' : newState.arousal >= 65 ? 'cornered' : newState.arousal >= 45 ? 'agitated' : 'guarded',
      isBreakdown: newState.arousal >= 80,
      deceitIndex: Math.max(10, 100 - newState.belief),
      vulnerabilitiesShattered: [],
      coercionPenalty: newState.coercion
    });

    if (mappedTactic === 'bluff') {
      if (breakdownEval.isBreakdown) {
        // In breakdown, suspect believes the bluff and spills concessions
        newState.belief = Math.min(100, newState.belief + 25);
        newState.resistance = Math.max(0, newState.resistance - 25);
        decisionBranch.decision = 'crack';
      } else if (advocatePresent || Math.random() > breakdownEval.bluffSuccessRate) {
        // Bluff exposed: credibility crashes, coercion penalty added
        newState.police_credibility = Math.max(0, newState.police_credibility - 35);
        newState.coercion = Math.min(100, newState.coercion + (advocatePresent ? 30 : 20));
        newState.resistance = Math.min(100, newState.resistance + 15);
      }
    }

    // Custody Fatigue & Advocate Intervention Processing (BNSS 2023 §41D & §54)
    const fatigueContext = getCustodyFatigueContext(remandMinutesRemaining, newState.session_turn, advocatePresent);
    newState.fatigue_level = fatigueContext.fatigueScore;

    // Real Remand Clock & Custody Time Deductions (BNSS §187 / Art. 22(2))
    snap.remand_clock = snap.remand_clock || {
      remandMinutesRemaining: 1440,
      elapsedMinutes: 0,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: advocatePresent,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false,
      remandOrdersCount: 0,
      remandHistory: []
    };

    // Deduct 20 minutes of custody clock per interrogation turn
    const turnCustodyMinutes = 20;
    snap.remand_clock.elapsedMinutes = (snap.remand_clock.elapsedMinutes || 0) + turnCustodyMinutes;
    snap.remand_clock.remandMinutesRemaining = Math.max(0, (snap.remand_clock.remandMinutesRemaining ?? 1440) - turnCustodyMinutes);
    snap.remand_clock.lastMedicalCheckMinutesAgo = (snap.remand_clock.lastMedicalCheckMinutesAgo || 0) + turnCustodyMinutes;
    snap.remand_clock.advocatePresent = advocatePresent;

    if (snap.remand_clock.remandMinutesRemaining <= 0) {
      snap.remand_clock.isExpired = true;
    }

    // Medical fitness escalation under fatigue & time
    if (snap.remand_clock.lastMedicalCheckMinutesAgo >= 1440 || (fatigueContext && fatigueContext.fatigueScore >= 80)) {
      snap.remand_clock.medicalFitnessStatus = 'critical_evaluation_needed';
    } else if (snap.remand_clock.lastMedicalCheckMinutesAgo >= 900 || (fatigueContext && fatigueContext.fatigueScore >= 55)) {
      snap.remand_clock.medicalFitnessStatus = 'requires_attention';
    } else {
      snap.remand_clock.medicalFitnessStatus = 'fit';
    }

    // Retrieve and audit micro-lies for this suspect
    const lies = this.getMicroLiesForSuspect(snap, person);
    interview.micro_lies = lies;

    // Real-Time Micro-Lie Audit Matcher
    let confrontedLie: any = null;
    const lowerQ = (questionText || userText || '').toLowerCase();
    for (const lie of lies) {
      if (!lie.confronted) {
        const keywords = [
          ...(lie.title || '').toLowerCase().split(/[\s,&/-]+/).filter((w: string) => w.length > 4),
          ...(lie.evidenceProof || '').toLowerCase().split(/[\s,&/-]+/).filter((w: string) => w.length > 4)
        ];
        const hit = keywords.some((kw: string) => lowerQ.includes(kw)) ||
          (lowerQ.includes('tower') && (lie.title.includes('Tower') || lie.categoryLabel.includes('Tower'))) ||
          (lowerQ.includes('blood') && (lie.title.includes('Blood') || lie.evidenceProof.includes('Blood'))) ||
          (lowerQ.includes('kerch') && (lie.title.includes('Blood') || lie.evidenceProof.includes('Kerchief'))) ||
          (lowerQ.includes('pickup') && (lie.title.includes('Pickup') || lie.categoryLabel.includes('Vehicle'))) ||
          (lowerQ.includes('call') && (lie.title.includes('Communications') || lie.categoryLabel.includes('Communications'))) ||
          (lowerQ.includes('shortfall') && lie.title.includes('Shortfall')) ||
          (lowerQ.includes('vasai') && (lie.title.includes('Vasai') || lie.categoryLabel.includes('Vasai'))) ||
          (lowerQ.includes('cctv') && (lie.title.includes('CCTV') || lie.evidenceProof.includes('CCTV')));

        if (hit || technique === 'contradiction-trap') {
          if (hit || lowerQ.length > 10) {
            lie.confronted = true;
            lie.confrontedTurn = (interview.transcript || []).length + 1;
            confrontedLie = lie;
            break;
          }
        }
      }
    }

    if (confrontedLie) {
      // Evidence Contradiction Slam: Stress Spikes, Resistance Collapses
      newState.arousal = Math.min(100, newState.arousal + 22);
      newState.resistance = Math.max(5, newState.resistance - 20);
      newState.belief = Math.min(100, newState.belief + 25);
      contradictionNoted = `Confronted with ${confrontedLie.evidenceProof}: ${confrontedLie.title}`;
      officerNote = `[CONTRADICTION IMPEACHED] Confronted under BSA §145 with ${confrontedLie.evidenceProof}. Resistance dropped to ${newState.resistance}%.`;

      // Log in Case Diary
      snap.diary = snap.diary || [];
      snap.diary.unshift({
        day: snap.day || 1,
        time: new Date().toISOString().substring(11, 16),
        author: 'Investigating Officer',
        text: `[CONTRADICTION IMPEACHED §145 BSA] Accused ${person.name} confronted with ${confrontedLie.evidenceProof}. Discrepancy formally put to witness.`,
        tag: 'INTERROGATION'
      });
    }

    let advocateIntervention = getAdvocateIntervention(
      advocatePresent,
      mappedTactic,
      questionText,
      newState,
      fatigueContext.fatigueScore
    );

    if (advocateIntervention) {
      newState.coercion = Math.min(100, (newState.coercion || 0) + advocateIntervention.coercionPenalty);
      interview.advocate_interventions_count = (interview.advocate_interventions_count || 0) + 1;
    }

    // Map quadrant decision to emotional state description
    switch (decisionBranch.decision) {
      case 'crack':
        emotionalState = 'broken';
        evasionType = 'cooperating';
        break;
      case 'hostile':
        emotionalState = 'defiant';
        evasionType = 'denial';
        break;
      case 'cooperative':
        emotionalState = 'cooperative';
        evasionType = 'partial-truth';
        break;
      case 'stonewalling':
      default:
        emotionalState = 'guarded';
        evasionType = 'stonewalling';
        break;
    }

    if (isAssistantTurn && isSilentScribeActive) {
      replyText = `(Suspect remains under examination. Officer ${assistName || 'Co-Examiner'} is logging observations in real time.)`;
      evasionType = 'silent-observation';
      officerNote = `Officer ${assistName || 'Co-Examiner'} is on silent scribe duty as instructed.`;
    }

    // 5. Build Layered System Prompt and invoke Gemini AI
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (keyToUse && !replyText) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: keyToUse });
        
        const priorTurns = (interview.state_json && interview.state_json.turns) || [];
        const transcript = interview?.transcript || [];
        const fullTranscriptFormatted = transcript.map((t: any, idx: number) => {
          const spk = t.speaker === 'officer' 
            ? 'Investigating Officer (Lead IO)' 
            : t.speaker === 'assistant' 
            ? `${t.assistant_name || assistName || 'Co-Examiner'} [Assisting Member]` 
            : `${person.name} (Suspect)`;
          return `[Turn ${idx + 1}] ${spk}: "${t.text}"`;
        }).join('\n');

        const activeMember = isAssistantTurn 
          ? ((this.team || []).find((m: any) => m.name?.toLowerCase().includes(assistName.toLowerCase())) || { name: assistName, role: 'Assisting Member' })
          : null;

        const squadPersona = isAssistantTurn
          ? getSquadInterrogationPersona(assistName, activeMember?.role || activeMember?.designation)
          : null;

        const confrontedContext = getConfrontedEvidenceContext(transcript, snap);
        const sessionLedger = extractInterrogationRoomLedger(transcript, newState, snap);
        const roomChatSummary = buildInterrogationRoomChatSummary(
          transcript,
          { name: person.name, role: person.role, occupation: person.occupation, stated_alibi: person.stated_alibi },
          interview,
          newState
        );
        const questionIntents = parseInterrogationIntents(
          questionText,
          { name: person.name, occupation: person.occupation, stated_alibi: person.stated_alibi },
          newState
        );

        const aiPrompt = buildInterrogationPrompt(
          {
            name: person.name,
            role: person.role,
            occupation: person.occupation,
            stated_alibi: person.stated_alibi || person.alibi,
            true_alibi: person.true_alibi,
            is_culprit: person.is_culprit || person.isCulprit
          },
          newState,
          priorTurns,
          mappedTactic,
          questionText,
          {
            decision: decisionBranch.decision,
            priorTactic,
            speakerName: isAssistantTurn ? (squadPersona?.name || assistName || 'Co-Examiner') : 'Investigating Officer (Lead IO)',
            speakerRole: isAssistantTurn ? (squadPersona?.rank || activeMember?.designation || 'Assisting Member') : 'Lead Detective',
            isAssistantTurn,
            transcriptHistory: fullTranscriptFormatted || '(No prior dialogue in this room yet. This is Turn 1.)',
            roomChatSummary,
            confrontedEvidenceSummary: confrontedContext.confrontedSummary,
            advocatePresent,
            remandMinutesRemaining,
            parsedIntents: questionIntents,
            sessionLedger
          }
        );

        if (!isGeminiQuotaBlocked()) {
          const genPromise = ai.models.generateContent({
            model: DEFAULT_GEMINI_MODEL,
            contents: aiPrompt
          });
          const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 7500));
          const aiRes: any = await Promise.race([genPromise, timeoutPromise]);

          if (aiRes && aiRes.text) {
            let cleanReply = aiRes.text.trim();
            // Remove markdown wrapper or quotes if model included them
            cleanReply = cleanReply.replace(/^["']|["']$/g, '').replace(/```[\s\S]*?```/g, '').trim();
            if (cleanReply && !cleanReply.startsWith('{')) {
              replyText = cleanReply;
            }
          }
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }

    // High fidelity procedural fallback tailored to case suspects
    if (!replyText) {
      const lower = (questionText || userText).toLowerCase();
      const pName = (person.name || '').toLowerCase();
      const trCount = Math.floor((interview.transcript || []).length / 2);
      const transcriptList = interview.transcript || [];
      const intents = parseInterrogationIntents(
        questionText,
        { name: person.name, occupation: person.occupation, stated_alibi: person.stated_alibi },
        newState
      );

      // 1. Handle pure courtesy / refreshment offer if not accompanied by tactical question
      if (intents.hasCourtesyIntent && !intents.hasAlibiTimelineIntent && !intents.hasEvidenceConfrontationIntent && !intents.hasAccompliceOrPaymentIntent && !intents.hasConcealmentLocationIntent) {
        if (decisionBranch.decision === 'cooperative' || emotionalState === 'remorseful' || emotionalState === 'broken') {
          replyText = "Thank you, Officer. *takes a sip of water* I really needed that. I am ready to speak with you.";
          evasionType = 'cooperating';
          tensionDelta = -8;
          credDelta = 4;
          emotionalState = 'cooperative';
          officerNote = 'Refreshment accepted. Suspect composure de-escalated under BNSS §54.';
        } else if (decisionBranch.decision === 'hostile') {
          replyText = "*glares at the refreshment* Keep your tea and water to yourself, Inspector! You cannot soften me up with gestures.";
          evasionType = 'denial';
          tensionDelta = 4;
          credDelta = 0;
          emotionalState = 'defiant';
          officerNote = 'Suspect refused refreshments hostilely.';
        } else {
          replyText = "*pushes the glass aside* I don't need any refreshments or tea, Officer. Please state your formal questions so I can leave.";
          evasionType = 'stonewalling';
          tensionDelta = 0;
          credDelta = 0;
          emotionalState = 'guarded';
          officerNote = 'Courtesy acknowledged and declined guardedly.';
        }
      }

      // 2. Handle pure personal / background inquiry (vacations, family, health) if not accompanied by tactical question
      if (!replyText && intents.hasPersonalBackgroundIntent && !intents.hasAlibiTimelineIntent && !intents.hasEvidenceConfrontationIntent && !intents.hasAccompliceOrPaymentIntent && !intents.hasConcealmentLocationIntent) {
        if (intents.personalSubject === 'vacation_travel') {
          replyText = "I haven't taken any vacations or holidays this whole year, Officer. I've only been working my regular shifts and staying at my Chembur residence.";
          evasionType = 'partial-truth';
          tensionDelta = -4;
          credDelta = 2;
          emotionalState = 'composed';
          officerNote = 'Background travel timeline recorded. No unexplained travel logged.';
        } else if (intents.personalSubject === 'family') {
          replyText = "I live with my elderly mother and younger brother at our family chawl. My mother has chronic health problems, which is why I've been under extreme financial pressure.";
          evasionType = 'partial-truth';
          tensionDelta = -4;
          credDelta = 4;
          emotionalState = 'remorseful';
          officerNote = 'Domestic family background recorded. Ailing mother establishes economic stress.';
        } else if (intents.personalSubject === 'health_medical') {
          replyText = "I have a throbbing headache and my blood pressure feels elevated from all this stress, but I am able to continue answering your questions.";
          evasionType = 'cooperating';
          tensionDelta = -2;
          credDelta = 2;
          emotionalState = 'anxious';
          officerNote = 'Subject confirmed medical fitness to continue under BNSS §54.';
        } else {
          replyText = "I work regular shifts at the logistics depot earning daily wages. I don't have any secret business or side dealings.";
          evasionType = 'partial-truth';
          tensionDelta = -2;
          credDelta = 2;
          emotionalState = 'composed';
          officerNote = 'Employment routine verified.';
        }
      }

      let courtesyPrefix = '';
      if (intents.hasCourtesyIntent) {
        if (decisionBranch.decision === 'cooperative' || emotionalState === 'remorseful' || emotionalState === 'broken') {
          courtesyPrefix = "Thank you for the water, Officer. *takes a sip* ";
        } else if (decisionBranch.decision === 'hostile') {
          courtesyPrefix = "I don't need your tea, Inspector! ";
        } else {
          courtesyPrefix = "*pushes the water glass aside* ";
        }
      }

      if (!replyText && (pName.includes('imran') || pName.includes('pawar'))) {
        const hasDisclosedDuffel = transcriptList.some((t: any) => {
          const tText = (t.text || '').toLowerCase();
          return tText.includes('transformer') || tText.includes('shed') || tText.includes('water tank');
        });

        if (hasDisclosedDuffel) {
          if (lower.includes('who') || lower.includes('partner') || lower.includes('nitin') || lower.includes('accomplice') || lower.includes('paid')) {
            replyText = `${courtesyPrefix}I told you, it was [[person:nitin_bhosale|Nitin Bhosale from Sunrise Logistics|Subject named accomplice Nitin Bhosale as insider co-conspirator who paid bribe]] who paid me! He gave me 25,000 Rupees to hide the duffel bag and cut the lock. Please record that I am cooperating, Sahib!`;
            evasionType = 'cooperating';
            tensionDelta = 10;
            credDelta = -15;
            emotionalState = 'broken';
            officerNote = 'Accomplice Nitin Bhosale named. Issue immediate s.35 BNSS arrest requisition.';
          } else if (lower.includes('how') || lower.includes('key') || lower.includes('access') || lower.includes('latch')) {
            replyText = `${courtesyPrefix}The back door was already left unlocked by Nitin's contact inside. I just cut the internal latch padlock with the lock-cutter. Everything is [[location:transformer_shed|behind the transformer shed near the municipal water tank|Subject pointed out stash recovery location near municipal water tank]]!`;
            evasionType = 'cooperating';
            tensionDelta = 8;
            credDelta = -10;
            emotionalState = 'broken';
            officerNote = 'Modus operandi fully established. Confirming key/latch collusion.';
          } else {
            replyText = `${courtesyPrefix}Sahib, I've already disclosed everything! The [[evidence:duffel_lock_cutter|grey duffel bag, iron lock-cutter, and cash|Subject disclosed weapon & cash duffel hidden under concrete slabs]] are stashed behind the transformer shed under the concrete slabs. Please go and recover it with independent witnesses!`;
            evasionType = 'cooperating';
            tensionDelta = 0;
            credDelta = -5;
            emotionalState = 'remorseful';
            officerNote = 'Disclosure already logged. Proceed to execute recovery before witnesses.';
          }
        } else {
          if (technique === 'contradiction-trap' || lower.includes('tower') || lower.includes('cctv') || lower.includes('contradict') || lower.includes('bike') || lower.includes('cdr') || lower.includes('footprint') || lower.includes('sector')) {
            replyText = `${courtesyPrefix}Tower location? Saab, that can't be right... Fine! Stop squeezing me! The [[evidence:duffel_lock_cutter|grey duffel bag and the lock-cutter|Subject admitted location of hidden duffel bag and bolt cutter]] aren't at my house. They're hidden [[location:transformer_shed|behind the transformer shed near the municipal water tank|Subject identified physical recovery locus near water tank]]. Go look if you don't believe me!`;
            evasionType = 'partial-truth';
            tensionDelta = 20;
            credDelta = -22;
            emotionalState = 'rattled';
            locatableDisclosure = {
              available: true,
              location: 'Behind the transformer shed near municipal water tank',
              item: 'Concealed lock-cutter & grey duffel bag'
            };
            contradictionNoted = 'Tower location directly destroys the alibi of being at home.';
            officerNote = 'LOCATABLE DISCLOSURE: Execute recovery immediately before two independent respectable witnesses (BSA s.23).';
          } else if (lower.includes('latch') || lower.includes('fingerprint') || lower.includes('rear door') || lower.includes('bare hand') || lower.includes('handle')) {
            replyText = `${courtesyPrefix}Alright! When we ambushed the cash transit vehicle, I forced open the rear vault latch handle with my bare hands without wearing gloves! My friction ridge fingerprints will be right there on the latch of the van!`;
            evasionType = 'minimisation';
            tensionDelta = 20;
            credDelta = -20;
            emotionalState = 'rattled';
            officerNote = 'LOCATABLE PHYSICAL FACT: Latent fingerprint on rear van door latch disclosed. Examine under ALS (Alternative Light Source).';
            isConfession = true;
          } else if (lower.includes('footwear') || lower.includes('shoe') || lower.includes('boot') || lower.includes('lug cut') || lower.includes('mud') || lower.includes('embankment')) {
            replyText = `${courtesyPrefix}When escaping towards the culvert, I lost my footing on the wet mud embankment! I was wearing combat boots with a 3.2mm lug cut in the right heel sole. My footprint impression is right there in the culvert mud!`;
            evasionType = 'minimisation';
            tensionDelta = 18;
            credDelta = -18;
            emotionalState = 'anxious';
            officerNote = 'LOCATABLE PHYSICAL FACT: Footwear impression with 3.2mm lug cut in culvert mud disclosed. Examine under Oblique lighting.';
            isConfession = true;
          } else if (lower.includes('drag') || lower.includes('track') || lower.includes('trail') || lower.includes('wiped') || lower.includes('blood wipe')) {
            replyText = `${courtesyPrefix}The escort hit me with his iron rod and I was bleeding! I dragged the cash box across the road toward the tea stall and frantically tried wiping the blood trail with grass and cloth. The chemiluminescent blood drag mark is on the road verge!`;
            evasionType = 'minimisation';
            tensionDelta = 22;
            credDelta = -22;
            emotionalState = 'broken';
            officerNote = 'LOCATABLE PHYSICAL FACT: Wiped drag track disclosed. Requires Chemical / Luminol optical reagent to visualize.';
            isConfession = true;
          } else if (lower.includes('kerchief') || lower.includes('handkerchief') || lower.includes('mask') || lower.includes('cloth') || lower.includes('dna')) {
            replyText = `${courtesyPrefix}My white cotton face kerchief soaked with my sweat and blood slipped off my neck into the ditch when I scrambled through the culvert grass verge! It's lying right there in the ditch verge!`;
            evasionType = 'minimisation';
            tensionDelta = 24;
            credDelta = -25;
            emotionalState = 'broken';
            officerNote = 'LOCATABLE PHYSICAL FACT: Stained cotton kerchief with suspect DNA disclosed in culvert ditch. Visualize under UV 365nm.';
            isConfession = true;
          } else if (lower.includes('bag') || lower.includes('cutter') || lower.includes('tool') || lower.includes('weapon') || lower.includes('transformer') || lower.includes('shed') || lower.includes('water tank')) {
            replyText = `${courtesyPrefix}I told you! The grey duffel bag with the heavy iron lock-cutter and stolen cash box is behind the transformer shed near the municipal water tank under two concrete slabs! I can take you there right now under witness supervision.`;
            evasionType = 'cooperating';
            tensionDelta = 25;
            credDelta = -30;
            emotionalState = 'broken';
            locatableDisclosure = {
              available: true,
              location: 'Behind the transformer shed near municipal water tank under concrete slabs',
              item: 'Grey duffel bag, iron lock-cutter & cash'
            };
            contradictionNoted = 'Full locatable disclosure recorded under BSA s.23.';
            officerNote = 'EXCELLENT: Execute recovery memo immediately under BNSS s.105 with two independent panch witnesses.';
          } else if (technique === 'evidence-disclosure' || lower.includes('exhibit') || lower.includes('chat') || lower.includes('pin') || lower.includes('message')) {
            replyText = `${courtesyPrefix}Look... I might have been seen in the vicinity, but I didn't plan the break-in! I was only supposed to hold the bag for someone else.`;
            evasionType = 'minimisation';
            tensionDelta = 14;
            credDelta = -10;
            emotionalState = 'anxious';
            officerNote = 'He admitted presence. Push him on where he placed the items.';
            isConfession = true;
          } else if (technique === 'rapport') {
            replyText = `${courtesyPrefix}Saab, I have an ailing mother at home and moneylender debts. I didn't want to get involved, but I was desperate for cash.`;
            evasionType = 'cooperating';
            tensionDelta = -6;
            credDelta = 4;
            emotionalState = 'remorseful';
            officerNote = 'Rapport established. Guide him towards locating the physical proceeds.';
          } else if (technique === 'legal-warning') {
            replyText = `${courtesyPrefix}I know my rights, Saab! But if I tell you where the lock-cutter is, will you record in the case diary that I cooperated?`;
            evasionType = 'bargaining';
            tensionDelta = 12;
            credDelta = -5;
            emotionalState = 'guarded';
            officerNote = 'He is bargaining. Under BSA s.23, only information leading to discovery is admissible.';
          } else if (lower.includes('tea vendor') || lower.includes('tea stall') || lower.includes('canvassed') || lower.includes('shuttered')) {
            replyText = `${courtesyPrefix}Look Officer, alright! The tea stall was closed, so I went to the back alley to wait for a pickup. But I didn't break any locks! I was only supposed to carry the bag for someone else!`;
            evasionType = 'minimisation';
            tensionDelta = 16;
            credDelta = -12;
            emotionalState = 'rattled';
            officerNote = 'He admitted presence in the alley and tasking with the bag. Confront on who gave the bag and where it was stashed.';
            isConfession = true;
          } else if (lower.includes('manifest') || lower.includes('assigned deliveries') || lower.includes('zero registered')) {
            replyText = `${courtesyPrefix}Alright, I lied about the official delivery rounds! A guy offered me quick cash to pick up a parcel from behind the market shutter. I needed money for my mother's medicine, Saab!`;
            evasionType = 'minimisation';
            tensionDelta = 18;
            credDelta = -15;
            emotionalState = 'rattled';
            officerNote = 'Alibi destroyed. Press on the identity of the accomplice and location of the parcel.';
            isConfession = true;
          } else {
            const imranVariations = [
              `${courtesyPrefix}Saab, why are you singling me out? I was doing delivery rounds near the Shivaji Market main road, but I didn't enter the back alley!`,
              `${courtesyPrefix}Look Officer, I admit I was short on money, but you can't pin the whole burglary on me without proof!`,
              `${courtesyPrefix}I was meeting a tea vendor near the market corner around 8 AM. Ask him if you don't believe my presence!`,
              `${courtesyPrefix}I have answered everything I know, Saab. If you have electronic proof, show it to me!`
            ];
            replyText = imranVariations[trCount % imranVariations.length];
            evasionType = 'false-alibi';
            tensionDelta = 6;
            credDelta = 0;
            emotionalState = 'defensive';
            officerNote = 'Alibi offered. Confront with electronic CDR or tower co-location evidence.';
          }
        }
      }
 else if (pName.includes('sneha') || pName.includes('naik')) {
        const hasDisclosedRegister = transcriptList.some((t: any) => {
          const tText = (t.text || '').toLowerCase();
          return tText.includes('drawer') || tText.includes('desk') || tText.includes('sunrise');
        });

        if (hasDisclosedRegister) {
          if (lower.includes('who') || lower.includes('contact') || lower.includes('accomplice') || lower.includes('boss') || lower.includes('bhosale')) {
            replyText = `${courtesyPrefix}It was Nitin Bhosale who approached me... he said it was just a custom clearance adjustment and nobody would get hurt. He handed me the envelope!`;
            evasionType = 'cooperating';
            tensionDelta = 12;
            credDelta = -15;
            emotionalState = 'broken';
            officerNote = 'Insider collusion confirmed with Nitin Bhosale. Link with Imran\'s statement.';
          } else {
            replyText = `${courtesyPrefix}I've already told you, Sahib! The duplicate register extract and cash envelope are locked in my desk bottom drawer at the Sunrise Logistics office. I will cooperate fully.`;
            evasionType = 'cooperating';
            tensionDelta = 0;
            credDelta = -5;
            emotionalState = 'remorseful';
            officerNote = 'Disclosure already logged. Execute recovery memo immediately.';
          }
        } else {
          if (technique === 'evidence-disclosure' || lower.includes('bank') || lower.includes('account') || lower.includes('schedule') || lower.includes('money') || lower.includes('deposit') || lower.includes('override') || lower.includes('register')) {
            replyText = `${courtesyPrefix}The account deposit? That was a family loan! Okay, look... Nitin Bhosale gave me an envelope to adjust the gate schedule. The duplicate register extract is locked in my desk bottom drawer at the office.`;
            evasionType = 'partial-truth';
            tensionDelta = 22;
            credDelta = -25;
            emotionalState = 'broken';
            locatableDisclosure = {
              available: true,
              location: 'Desk bottom drawer at Sunrise Logistics office',
              item: 'Duplicate register extract & cash envelope'
            };
            contradictionNoted = 'Financial paper trail contradicts claim of routine work activities.';
            officerNote = 'LOCATABLE DISCLOSURE: Obtain warrant or search order to recover register extract before independent witnesses.';
          } else {
            const snehaVariations = [
              `${courtesyPrefix}I was on duty the whole time, Inspector. I arrived at 8 AM, signed in, and started my rounds. Everything was completely routine.`,
              `${courtesyPrefix}If there was a log discrepancy at the depot gate, it must have been a system glitch! I didn't authorize any manual override!`,
              `${courtesyPrefix}I manage dozens of truck entries every morning. You cannot expect me to remember every vehicle without checking terminal logs!`
            ];
            replyText = snehaVariations[trCount % snehaVariations.length];
            evasionType = 'denial';
            tensionDelta = 8;
            credDelta = 0;
            emotionalState = 'guarded';
            officerNote = 'Insider is stonewalling. Trace financial records or call logs to break her timeline.';
          }
        }
      } else if (pName.includes('vikram') || pName.includes('shaikh')) {
        const lowerQ = (questionText || userText).toLowerCase();
        if (lowerQ.includes('bag') || lowerQ.includes('cutter') || lowerQ.includes('tool') || lowerQ.includes('transformer') || lowerQ.includes('tank') || lowerQ.includes('stolen') || lowerQ.includes('shed') || lowerQ.includes('recovery') || lowerQ.includes('witness') || lowerQ.includes('panch') || lowerQ.includes('water tank')) {
          replyText = "Yes Officer! I saw a suspicious person carrying a grey duffel bag near the municipal water tank behind the transformer shed early that morning. The heavy lock-cutter matches the cut on my godown latch! I am ready to stand as an independent panch witness for the recovery under BNSS s.103 and sign the memo.";
          evasionType = 'cooperating';
          tensionDelta = -10;
          credDelta = 25;
          emotionalState = 'cooperative';
          officerNote = 'Complainant Vikram Shaikh confirmed seeing the duffel bag and tools near the transformer shed, and agreed to act as independent panch witness.';
        } else if (lowerQ.includes('shop') || lowerQ.includes('theft') || lowerQ.includes('burglary') || lowerQ.includes('loss') || lowerQ.includes('lock') || lowerQ.includes('padlock')) {
          replyText = "I arrived at my shop at 8:30 AM and found the godown latch padlock had been cut clean through with a heavy iron tool. Cash and goods were missing. I reported it immediately to the police station.";
          evasionType = 'cooperating';
          tensionDelta = -5;
          credDelta = 15;
          emotionalState = 'earnest';
          officerNote = 'Complainant establishes the time of discovery and method of entry (cut padlock).';
        } else {
          replyText = "Officer, I am cooperating completely as the complainant. Ask me anything about what was stolen, or if any articles are discovered near the transformer shed, I will verify them immediately.";
          evasionType = 'cooperating';
          tensionDelta = 0;
          credDelta = 10;
          emotionalState = 'cooperative';
          officerNote = 'Complainant is ready to assist and verify recovered exhibits.';
        }
      } else if (person.role === 'witness' || person.role === 'complainant' || person.role === 'victim') {
        const lowerQ = (questionText || userText).toLowerCase();
        if (lowerQ.includes('latch') || lowerQ.includes('fingerprint') || lowerQ.includes('door') || lowerQ.includes('bare hand') || lowerQ.includes('handle')) {
          replyText = `Yes Officer! I saw the assailant grab the rear van vault door latch handle with bare, un-gloved hands while forcing the door! He definitely left latent fingerprints on that latch!`;
          evasionType = 'cooperating';
          tensionDelta = -5;
          credDelta = 25;
          emotionalState = 'cooperative';
          officerNote = `Witness ${person.name} confirmed seeing bare hands on the rear van door latch. Latent fingerprints discoverable under ALS.`;
        } else if (lowerQ.includes('footwear') || lowerQ.includes('shoe') || lowerQ.includes('boot') || lowerQ.includes('lug cut') || lowerQ.includes('mud') || lowerQ.includes('embankment')) {
          replyText = `I saw the fleeing suspect stumble and slip down the drainage culvert mud embankment! He wore heavy combat boots with deep lug cuts that left sharp impressions in the thick mud!`;
          evasionType = 'cooperating';
          tensionDelta = -5;
          credDelta = 25;
          emotionalState = 'cooperative';
          officerNote = `Witness ${person.name} disclosed footwear impressions with lug cuts in the culvert mud. Visible under Oblique lighting.`;
        } else if (lowerQ.includes('drag') || lowerQ.includes('track') || lowerQ.includes('trail') || lowerQ.includes('wiped') || lowerQ.includes('blood wipe')) {
          replyText = `I watched from across the road as the wounded assailant dragged a heavy metal container across the asphalt toward the tea stall, hurriedly wiping the blood drag trail with grass!`;
          evasionType = 'cooperating';
          tensionDelta = -5;
          credDelta = 25;
          emotionalState = 'cooperative';
          officerNote = `Witness ${person.name} revealed the wiped blood drag track towards the tea stall. Visible under Chemical / Luminol optical reagent.`;
        } else if (lowerQ.includes('kerchief') || lowerQ.includes('handkerchief') || lowerQ.includes('mask') || lowerQ.includes('cloth') || lowerQ.includes('dna')) {
          replyText = `As the man jumped over the culvert drainage ditch, his white cotton face kerchief came off and dropped into the grass verge right by the ditch!`;
          evasionType = 'cooperating';
          tensionDelta = -5;
          credDelta = 25;
          emotionalState = 'cooperative';
          officerNote = `Witness ${person.name} disclosed the cotton kerchief with suspect DNA in the culvert ditch verge. Visible under UV 365nm.`;
        } else if (lowerQ.includes('bag') || lowerQ.includes('cutter') || lowerQ.includes('transformer') || lowerQ.includes('water tank') || lowerQ.includes('shed') || lowerQ.includes('witness') || lowerQ.includes('panch') || lowerQ.includes('recovery') || lowerQ.includes('see') || lowerQ.includes('saw') || lowerQ.includes('exhibit')) {
          replyText = `Yes Officer, I know about this! I observed the movement near that location and I am willing to stand as an independent respectable panch witness to inspect and verify the physical recovery under BNSS s.103.`;
          evasionType = 'cooperating';
          tensionDelta = -5;
          credDelta = 20;
          emotionalState = 'cooperative';
          officerNote = `Witness ${person.name} confirmed direct observation and agreed to attest as an independent panch witness.`;
        } else {
          replyText = `Officer, I have shared what I observed regarding the incident. I am available to verify any discovered articles or sign the panchnama.`;
          evasionType = 'cooperating';
          tensionDelta = 0;
          credDelta = 10;
          emotionalState = 'cooperative';
        }
      } else {
        const lowerQ = (questionText || userText).toLowerCase();
        if (lowerQ.includes('tea') || lowerQ.includes('chai') || lowerQ.includes('water') || lowerQ.includes('coffee') || lowerQ.includes('drink') || lowerQ.includes('snack') || lowerQ.includes('biscuit') || lowerQ.includes('refreshment') || lowerQ.includes('breakfast') || lowerQ.includes('food')) {
          if (newState.resistance > 50) {
            replyText = `I don't need any tea or refreshments, Officer. Just tell me why I am being held here and when I can leave.`;
            emotionalState = 'guarded';
            evasionType = 'denial';
            tensionDelta = 0;
            credDelta = 5;
          } else {
            replyText = `A cup of hot tea would be very helpful, Officer. Thank you. It has been an exhausting day, but I am willing to cooperate and answer whatever you ask.`;
            emotionalState = 'cooperative';
            evasionType = 'partial-truth';
            newState.resistance = Math.max(0, newState.resistance - 15);
            newState.arousal = Math.max(0, newState.arousal - 10);
            newState.rapport = Math.min(100, newState.rapport + 20);
            newState.coercion = 0;
            tensionDelta = -10;
            credDelta = 15;
            officerNote = `Hospitality offered under BNSS s.180 established rapport and lowered suspect resistance.`;
          }
        } else if (lowerQ.includes('vacation') || lowerQ.includes('holiday') || lowerQ.includes('travel') || lowerQ.includes('trip') || lowerQ.includes('leave')) {
          if (newState.resistance > 50) {
            replyText = `What do my vacations have to do with anything? I haven't taken any holiday in months, I've been working every single day.`;
            emotionalState = 'defensive';
            evasionType = 'denial';
          } else {
            replyText = `I haven't been on any vacation recently, Officer. The last time I traveled outside the city was over a year ago for a family function. You can verify that with my relatives.`;
            emotionalState = 'cooperative';
            evasionType = 'partial-truth';
          }
        } else if (lowerQ.includes('family') || lowerQ.includes('wife') || lowerQ.includes('child') || lowerQ.includes('parent') || lowerQ.includes('home') || lowerQ.includes('relative')) {
          if (newState.resistance > 50) {
            replyText = `Leave my family out of this. They have nothing to do with whatever trouble you are investigating.`;
            emotionalState = 'defensive';
            evasionType = 'denial';
          } else {
            replyText = `I live with my family here locally. They know I was home and have nothing to hide.`;
            emotionalState = 'cooperative';
            evasionType = 'partial-truth';
          }
        } else if (lowerQ.includes('health') || lowerQ.includes('doctor') || lowerQ.includes('medicine') || lowerQ.includes('sick') || lowerQ.includes('hospital')) {
          replyText = `My health is fine, Officer, but being held in this station is giving me a severe headache. I just want this finished.`;
          emotionalState = 'anxious';
          evasionType = 'minimisation';
        } else if (lowerQ.includes('calm') || lowerQ.includes('relax') || lowerQ.includes('comfortable') || lowerQ.includes('help')) {
          replyText = `I am trying to stay calm, Officer, but being interrogated in a police station is stressful. I want this cleared up.`;
          emotionalState = 'anxious';
          evasionType = 'minimisation';
        } else if (lowerQ.includes('where') || lowerQ.includes('alibi') || lowerQ.includes('time') || lowerQ.includes('morning') || lowerQ.includes('timeline') || lowerQ.includes('movements')) {
          const cleanAlibi = this.getCleanStatedAlibi(person);
          const alibiPhrase = /^(at|in|with|near|around)\s/i.test(cleanAlibi) ? cleanAlibi : `at ${cleanAlibi}`;
          replyText = `As I told you earlier, I was ${alibiPhrase}. I had no reason to be involved in this incident.`;
          emotionalState = 'defensive';
          evasionType = 'false-alibi';
        } else {
          // Dynamic replies reflecting suspect's resistance and computed decision branch
          if (newState.resistance < 50 || decisionBranch.decision === 'cooperative') {
            const coopReplies = [
              `I understand you're doing your duty, Officer. I am trying to cooperate with you, but I don't have any connection to this matter.`,
              `I have answered your questions truthfully so far. Ask whatever else you need to verify my routine.`,
              `I am cooperating with you, Officer. What specific detail do you need me to clarify?`
            ];
            const trCount = Math.floor((interview.transcript || []).length / 2);
            replyText = coopReplies[trCount % coopReplies.length];
            evasionType = 'partial-truth';
            emotionalState = 'cooperative';
          } else {
            const defaultReplies = [
              `I have answered your questions, Officer. I had nothing to do with this occurrence.`,
              `I don't know anything about this matter. You are questioning the wrong person.`,
              `Look, I've told you my routine for that day. If you have evidence to the contrary, put it to me directly.`
            ];
            const trCount = Math.floor((interview.transcript || []).length / 2);
            replyText = defaultReplies[trCount % defaultReplies.length];
            evasionType = 'denial';
            emotionalState = 'defensive';
          }
        }
        if (typeof tensionDelta === 'undefined' || tensionDelta === 0) {
          tensionDelta = 2;
        }
        if (typeof credDelta === 'undefined') {
          credDelta = 0;
        }
      }
    }

    // Expired Remand Handling (BNSS §187 & Constitution Art. 22(2))
    if (snap.remand_clock && snap.remand_clock.isExpired) {
      advocateIntervention = {
        advocateName: 'Adv. Rajeshwar Sharma',
        statute: 'BNSS 2023 §187 & Art. 22(2)',
        type: 'objection',
        statement: 'HALT! The 24-hour statutory police custody remand has completely expired. Further detention is unconstitutional under Article 22(2). Produce my client before the Chief Judicial Magistrate immediately!',
        coercionPenalty: 35,
        actionHint: '⚠️ ILLEGAL DETENTION: Remand clock expired! File Remand Extension Petition before Judicial Magistrate immediately under BNSS §187.'
      };
      replyText = `*[folding arms firmly]* My 24 hours in police custody are over. By law, you cannot question me any further. Take me to the Magistrate or release me on bail.`;
      emotionalState = 'defiant';
      evasionType = 'stonewalling';
    } else if (advocateIntervention && !confrontedLie) {
      if (advocateIntervention.type === 'recess_demand') {
        replyText = `*[exhausted, rubbing face with trembling hands]* I need water, Officer... My advocate has formally demanded a medical recess under BNSS §54. I cannot answer any more questions right now.`;
        emotionalState = 'exhausted';
        evasionType = 'exhausted';
      } else if (advocateIntervention.type === 'objection' || advocateIntervention.type === 'warning') {
        replyText = `My advocate is right, Inspector. Show me the legal exhibits on record before putting these accusations to me. I will not answer speculative threats without proof.`;
        emotionalState = 'guarded';
        evasionType = 'stonewalling';
      }
    }

    // Physiological Stress Feedback Loop: High arousal / cracking creates visible distress
    if ((newState.arousal >= 60 || decisionBranch.decision === 'crack' || confrontedLie) && replyText && !replyText.includes('*[')) {
      const panicPhrases = [
        "*[swallowing dryly, hands visibly trembling]* ",
        "*[voice shaking, avoiding eye contact]* ",
        "*[wiping cold sweat from forehead]* "
      ];
      const pIdx = Math.abs((interview.transcript || []).length) % panicPhrases.length;
      replyText = panicPhrases[pIdx] + replyText;
    }

    // Construct comprehensive thought process breakdown (Facts, Evidentiary Data, Statutory & Tactical Logic)
    const thoughtSteps: string[] = [];
    if (isAssistantTurn) {
      const lowerQ = (questionText || userText).toLowerCase();
      const isHospitality = lowerQ.includes('tea') || lowerQ.includes('chai') || lowerQ.includes('water') || lowerQ.includes('coffee') || lowerQ.includes('drink') || lowerQ.includes('snack') || lowerQ.includes('biscuit') || lowerQ.includes('refreshment') || lowerQ.includes('breakfast') || lowerQ.includes('food');

      if (isHospitality) {
        thoughtSteps.push(`Directive Intent: Implementing IO's instruction to offer refreshments and build rapport with ${person.name}.`);
        thoughtSteps.push(`Psychological Assessment: Current suspect resistance is ${interview.resistance || 0}%, tension ${interview.tension || 0}%. Hospitality defuses psychological barriers.`);
        thoughtSteps.push(`Statutory Compliance: BNSS s.180 voluntary cooperation protocol — ensuring interrogation remains fair, humane, and free from duress.`);
        thoughtSteps.push(`Tactical Formulation: Framing courteous offer of hot tea/water on behalf of the Investigating Officer.`);
      } else {
        const cleanAlibi = this.getCleanStatedAlibi(person);
        thoughtSteps.push(`Facts & Timeline: Auditing stated alibi ("${cleanAlibi.substring(0, 65)}...") against corroborated forensic timeline.`);

        const seizedExhibits = (snap.exhibits || []).filter((e: any) => e.found || e.seized);
        if (seizedExhibits.length) {
          thoughtSteps.push(`Evidentiary Data: Cross-referencing ${seizedExhibits.length} physical exhibit(s) on file, notably Exhibit ${seizedExhibits[0].code} (${seizedExhibits[0].name}).`);
        } else {
          thoughtSteps.push(`Evidentiary Data: Synthesizing surveillance logs, CDR call traces, and physical scene markings.`);
        }

        thoughtSteps.push(`Statutory Logic: Enforcing procedural inquiry rules under BNSS §180 & isolating locatable discovery pathways under BSA §23.`);

        if ((interview.tension || 30) > 55) {
          thoughtSteps.push(`Tactical Logic: Suspect stress index elevated at ${interview.tension || 30}%. Framing cornering inquiry to prompt material disclosure.`);
        } else {
          thoughtSteps.push(`Tactical Logic: Current tension index ${interview.tension || 30}%. Framing progressive question to test consistency.`);
        }
      }
    }

    // Update interview record
    interview.transcript = interview.transcript || [];
    interview.admissible = interview.admissible || [];
    interview.inadmissible = interview.inadmissible || [];
    interview.disclosures = interview.disclosures || [];
    interview.tactics_used = interview.tactics_used || [];

    const turnIndex = interview.transcript.length + 1;
    const activePersona = isAssistantTurn ? getSquadInterrogationPersona(assistName) : null;
    interview.transcript.push({
      turn: turnIndex,
      speaker: isAssistantTurn ? 'assistant' : 'officer',
      assistant_name: activePersona?.name || assistName,
      speakerName: activePersona?.name || (isAssistantTurn ? assistName : 'Investigating Officer'),
      assistant_rank: activePersona?.rank,
      text: questionText,
      technique,
      notes: officerNote || '',
      thought_process: thoughtSteps.length ? thoughtSteps : undefined
    });

    if (advocateIntervention) {
      interview.transcript.push({
        turn: interview.transcript.length + 1,
        speaker: 'advocate',
        assistant_name: advocateIntervention.advocateName,
        text: advocateIntervention.statement,
        technique: advocateIntervention.type,
        statute: advocateIntervention.statute,
        actionHint: advocateIntervention.actionHint,
        coercionPenalty: advocateIntervention.coercionPenalty,
        notes: `[ADVOCATE INTERVENTION (${advocateIntervention.statute})] ${advocateIntervention.statement}`
      });

      snap.diary = snap.diary || [];
      snap.diary.unshift({
        day: snap.day || 1,
        time: new Date().toISOString().substring(11, 16),
        author: advocateIntervention.advocateName,
        text: `[ADVOCATE ${advocateIntervention.type.toUpperCase()}] Counsel intervened under ${advocateIntervention.statute}: "${advocateIntervention.statement}"`,
        tag: 'LEGAL'
      });
    }

    interview.transcript.push({
      turn: interview.transcript.length + 1,
      speaker: 'suspect',
      text: replyText,
      technique: evasionType,
      notes: evasionType
    });

    interview.arousal = newState.arousal;
    interview.resistance = newState.resistance;
    interview.rapport = newState.rapport;
    interview.belief = newState.belief;
    interview.police_credibility = newState.police_credibility;
    interview.coercion = newState.coercion;
    interview.disclosure_tier = decisionBranch.disclosure_tier;
    interview.current_decision = decisionBranch.decision;
    interview.last_tactic = mappedTactic;
    interview.tension = newState.arousal; // Compatibility shim
    interview.credibility = newState.police_credibility; // Compatibility shim
    interview.emotional_state = emotionalState;
    if (decisionBranch.regression) {
      interview.regressions = (interview.regressions || 0) + 1;
    }

    // Update state_json turn history for replay & session continuity
    interview.state_json = interview.state_json || { turns: [], current_decision: decisionBranch.decision };
    if (typeof interview.state_json === 'string') {
      try {
        interview.state_json = JSON.parse(interview.state_json);
      } catch (e) {
        interview.state_json = { turns: [] };
      }
    }
    interview.state_json.turns = interview.state_json.turns || [];
    interview.state_json.turns.push({
      tactic: mappedTactic,
      statement: questionText,
      reply: replyText,
      arousal_before: priorState.arousal,
      arousal_after: newState.arousal,
      resistance_before: priorState.resistance,
      resistance_after: newState.resistance,
      decision: decisionBranch.decision,
      disclosure_unlocked: decisionBranch.disclosure_tier,
      contradiction_found: !!contradictionNoted,
      regression: decisionBranch.regression
    });
    interview.state_json.current_decision = decisionBranch.decision;

    if (technique && !interview.tactics_used.includes(technique)) {
      interview.tactics_used.push(technique);
    }

    // Process Active Co-Examiner Directive (Question countdown, gametime tracking, note-taking, completion)
    let newGeneratedNote: any = null;
    const activeDir = interview.activeDirective;
    if (activeDir && activeDir.status === 'active') {
      // 1. Generate Substantive Note if information was disclosed
      let noteCat: 'admission' | 'contradiction' | 'timeline' | 'lead' | 'demeanor' | null = null;
      let noteContent = '';
      let noteRel = 'Recorded during custodial interrogation';

      if (contradictionNoted) {
        noteCat = 'contradiction';
        noteContent = `Direct Contradiction: ${contradictionNoted}`;
        noteRel = 'Critical for impeachment under BSA Section 145/146.';
      } else if (locatableDisclosure && locatableDisclosure.available) {
        noteCat = 'lead';
        noteContent = `BSA s.23 Locatable Discovery: "${locatableDisclosure.item}" hidden at "${locatableDisclosure.location}".`;
        noteRel = 'Admissible under Section 23 BSA upon witnessed recovery.';
      } else if (replyText && (replyText.toLowerCase().includes('tea') || replyText.toLowerCase().includes('nitin') || replyText.toLowerCase().includes('shutter') || replyText.toLowerCase().includes('bag') || replyText.toLowerCase().includes('money') || replyText.toLowerCase().includes('alley') || replyText.toLowerCase().includes('bhosale') || replyText.toLowerCase().includes('cutter') || replyText.toLowerCase().includes('rupee'))) {
        noteCat = 'admission';
        noteContent = `Material Statement: "${replyText.substring(0, 160)}"`;
        noteRel = 'Material factual assertion regarding presence/accomplice.';
      } else if (emotionalState === 'broken' || emotionalState === 'rattled') {
        noteCat = 'demeanor';
        noteContent = `Demeanor Shift: Suspect displayed observable agitation and anxiety (${emotionalState}) when pressed.`;
        noteRel = 'Psychological state indicates vulnerability on this topic.';
      }

      if (noteCat && noteContent) {
        newGeneratedNote = {
          id: 'note-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          gameTime: `Day ${snap.day || 1}, ${snap.time || '11:45'}`,
          author: activeDir.assignedMember || assistName || 'Co-Examiner',
          category: noteCat,
          text: noteContent,
          relevance: noteRel
        };
        activeDir.substantiveNotes = activeDir.substantiveNotes || [];
        activeDir.substantiveNotes.unshift(newGeneratedNote);
      }

      // 2. Countdown remaining questions if this was an assistant question
      if (isAssistantTurn && typeof activeDir.remainingQuestions === 'number' && activeDir.remainingQuestions > 0) {
        activeDir.remainingQuestions -= 1;
        if (activeDir.remainingQuestions <= 0) {
          activeDir.status = 'completed';
          activeDir.completedReason = `Question quota fulfilled (${activeDir.questionBudget} questions asked). Standing down.`;
        }
      }

      // 3. Countdown remaining game time (5 minutes deducted per question/turn)
      if (isAssistantTurn && typeof activeDir.remainingGameMinutes === 'number' && activeDir.remainingGameMinutes > 0) {
        const turnDeduction = 5;
        activeDir.remainingGameMinutes = Math.max(0, activeDir.remainingGameMinutes - turnDeduction);
        
        // Advance in-game clock
        if (snap.time && typeof snap.time === 'string' && snap.time.includes(':')) {
          const [hh, mm] = snap.time.split(':').map(Number);
          const total = (hh || 11) * 60 + (mm || 30) + turnDeduction;
          const nh = Math.floor(total / 60) % 24;
          const nm = total % 60;
          snap.time = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
        }

        if (activeDir.remainingGameMinutes <= 0) {
          activeDir.status = 'completed';
          activeDir.completedReason = `Allocated in-game examination time reached (${activeDir.gametimeMinutesBudget} minutes elapsed). Standing down.`;
        }
      }

      // 4. Check for exit conditions
      if (activeDir.stopConditions) {
        if (activeDir.stopConditions.includes('locatable_disclosure_found') && locatableDisclosure && locatableDisclosure.available) {
          activeDir.status = 'completed';
          activeDir.completedReason = `Target discovery breakthrough achieved under BSA s.23! Standing down.`;
        }
      }

      if (activeDir.status === 'completed') {
        officerNote = (officerNote ? officerNote + ' · ' : '') + `[Directive Complete: ${activeDir.completedReason}]`;
      }
    }

    if (locatableDisclosure && locatableDisclosure.available) {
      interview.admissible.push({
        disclosed_fact: `${locatableDisclosure.item} concealed at ${locatableDisclosure.location}`,
        recovery: locatableDisclosure.item,
        discovery_witnessed: false,
        weight: 'high'
      });
      interview.disclosures.push({
        location: locatableDisclosure.location,
        item: locatableDisclosure.item,
        act: 'BSA s.23'
      });

      // 1. Auto-lodge as actionable lead
      snap.leads = snap.leads || [];
      snap.leads.push({
        id: Date.now(),
        case_id: snap.caseId,
        source: 'interrogation',
        title: `Disclosure: ${locatableDisclosure.item}`,
        detail: `Information disclosed by ${person.name} in custody identifying where ${locatableDisclosure.item} was concealed at ${locatableDisclosure.location}. Provable only through witnessed recovery under BSA s.23.`,
        linked_person: interview.person_id,
        locatable: true,
        recovery_item: locatableDisclosure.item,
        recovery_grid: locatableDisclosure.location,
        is_false: 0,
        followed: false,
        created_day: snap.day,
        isFalse: false
      });

      // 2. Auto-lodge as Disclosed Exhibit on Evidence Board & Unlock on Crime Scene
      snap.exhibits = snap.exhibits || [];
      const itemKey = locatableDisclosure.item || 'Disclosed Item';
      let existingDiscEx = snap.exhibits.find((e: any) => e.name?.toLowerCase().includes(itemKey.toLowerCase()) || (e.gridRef && String(e.gridRef).toUpperCase() === String(locatableDisclosure.location).toUpperCase()));
      if (!existingDiscEx) {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const nextNo = alphabet[snap.exhibits.length % alphabet.length] || String(snap.exhibits.length + 1);
        snap.exhibits.push({
          id: Date.now() + Math.floor(Math.random() * 500),
          case_id: snap.caseId,
          exhibitNo: nextNo,
          code: 'DISC-' + nextNo,
          name: itemKey,
          category: 'physical',
          isDisclosure: true,
          requiresDisclosure: true,
          unlockedByDisclosure: true,
          disclosed: true,
          found: false, // Disclosed in custody, now added to Crime Scene for in-situ examination & recovery
          gridRef: locatableDisclosure.location && locatableDisclosure.location.length <= 4 ? locatableDisclosure.location : 'F4',
          seized: false,
          tainted: false,
          chain_valid: true,
          location_found: locatableDisclosure.location,
          significance: `Disclosed by accused ${person.name} in custody under BSA s.23 statement.`,
          admissible: false,
          status: 'disclosed_pending_recovery'
        });
      } else {
        existingDiscEx.requiresDisclosure = true;
        existingDiscEx.unlockedByDisclosure = true;
        existingDiscEx.disclosed = true;
        existingDiscEx.found = false;
        existingDiscEx.gridRef = existingDiscEx.gridRef || 'F4';
        existingDiscEx.status = 'disclosed_pending_recovery';
      }

      // 3. Auto-lodge in BNSS Case Diary
      snap.diary = snap.diary || [];
      snap.diary.unshift({
        day: snap.day || 1,
        time: new Date().toISOString().substring(11, 16),
        author: 'Investigating Officer',
        text: `[AUTOMATIC DISCLOSURE LODGED] Accused ${person.name} in custody disclosed information leading to discovery: "${locatableDisclosure.item}" concealed at "${locatableDisclosure.location}". Requisition logged for witnessed recovery under BSA s.23.`,
        tag: 'INTERROGATION'
      });

      // 4. Auto-lodge in Operational Logs
      snap.logs = snap.logs || [];
      snap.logs.unshift({
        id: 'log-disc-' + Date.now(),
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        type: 'INTERROGATION',
        message: `CRITICAL DISCOVERY LODGED: Accused ${person.name} disclosed location of ${locatableDisclosure.item} at ${locatableDisclosure.location}.`,
        severity: 'critical'
      });

      // 5. Auto-lodge in Disclosed Recoveries
      snap.recoveries = snap.recoveries || [];
      if (!snap.recoveries.some((r: any) => r.description?.includes(itemKey))) {
        snap.recoveries.push({
          id: 'rec-' + Date.now(),
          case_id: snap.caseId,
          person_id: person.id,
          description: `${itemKey} at ${locatableDisclosure.location}`,
          recovery_day: snap.day || 1,
          s23_valid: false,
          status: 'disclosed_pending_panchnama',
          location: locatableDisclosure.location,
          item: itemKey
        });
      }

      // 6. Attach to Person Revealed Intel
      if (person) {
        person.revealedIntel = person.revealedIntel || [];
        const intelText = `[BSA s.23 DISCLOSURE] Concealment of ${itemKey} at ${locatableDisclosure.location}`;
        if (!person.revealedIntel.includes(intelText)) {
          person.revealedIntel.push(intelText);
        }
      }

      // 7. Dispatch Actionable Alert to Squad Dispatch Bus
      this.notifyChatForCase(caseId, {
        sender: 'HQ Field Dispatch',
        body: `🚨 **DISCLOSURE RECORDED IN INTERROGATION**: Accused **${person ? person.name : 'Suspect'}** has disclosed a locatable lead under Section 23 BSA: *"${locatableDisclosure.item}"* at *"${locatableDisclosure.location}"*. Issue a field directive to search and recover the item before independent panch witnesses! [View Recoveries](go:recoveries)`
      });
    } else if (isConfession || evasionType === 'minimisation' || evasionType === 'partial-truth') {
      interview.inadmissible.push({
        utterance: replyText,
        why: 'Bare admission/confession made to a police officer barred by BSA s.23. Worthless without witnessed recovery.'
      });

      // Auto-lodge admission in person revealed intel and logs
      if (person) {
        person.revealedIntel = person.revealedIntel || [];
        const admissionText = `[ADMISSION / STATEMENT] ${replyText.substring(0, 100)}...`;
        if (!person.revealedIntel.includes(admissionText)) {
          person.revealedIntel.push(admissionText);
        }
      }

      snap.logs = snap.logs || [];
      snap.logs.unshift({
        id: 'log-admission-' + Date.now(),
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        type: 'INTERROGATION',
        message: `ADMISSION LODGED: Accused ${person.name} made a partial admission during interrogation.`,
        severity: 'warning'
      });
    }

    // --- AUTOMATIC SEMANTIC LEAD DISCOVERY EXTRACTION & LOGGING ---
    const semanticLeads = extractLeads(replyText);
    if (semanticLeads && semanticLeads.length > 0) {
      snap.diary = snap.diary || [];
      snap.loggedLeads = snap.loggedLeads || [];
      for (const lead of semanticLeads) {
        const leadKey = `${lead.type}:${lead.targetId}:${lead.text}`;
        if (!snap.loggedLeads.includes(leadKey)) {
          snap.loggedLeads.push(leadKey);
          const badgeType = lead.type.toUpperCase();
          snap.diary.unshift({
            day: snap.day || 1,
            time: snap.time || new Date().toISOString().substring(11, 16),
            author: 'Investigating Officer',
            text: `[STATION DIARY §180 BNSS - ${badgeType}] Examination of ${person.name}: ${lead.summary}`,
            tag: 'INTERROGATION'
          });
          snap.logs = snap.logs || [];
          snap.logs.unshift({
            id: 'log-lead-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
            timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
            type: 'INTERROGATION',
            message: `LEAD DISCOVERY LOGGED (${badgeType}): ${lead.summary.substring(0, 100)}`,
            severity: 'info'
          });
          if (activeDir && activeDir.status === 'active') {
            activeDir.substantiveNotes = activeDir.substantiveNotes || [];
            activeDir.substantiveNotes.unshift({
              id: 'note-lead-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              gameTime: `Day ${snap.day || 1}, ${snap.time || '12:00'}`,
              author: assistName || 'Investigating Officer',
              category: lead.type === 'contradiction' ? 'contradiction' : lead.type === 'alibi' ? 'admission' : 'lead',
              text: lead.summary,
              relevance: `Disclosed under Section 180 BNSS during interrogation of ${person.name}`,
              pinned: true
            });
          }
        }
      }
    }

    // --- WITNESS & SUSPECT EVIDENCE KNOWLEDGE & DISCLOSURE PARSER ---
    const witnessDisclosures: any[] = [];
    const dialogueFull = (questionText || '') + ' ' + (replyText || '');
    const unlockedExhibitsList = this.unlockExhibitsFromDialogue(snap, dialogueFull, person);
    if (unlockedExhibitsList && unlockedExhibitsList.length > 0) {
      unlockedExhibitsList.forEach((ue: any) => {
        witnessDisclosures.push({
          witness: person.name,
          exhibitId: ue.id,
          exhibitName: ue.name,
          requiredLight: ue.requiredLight,
          gridRef: ue.gridRef
        });
      });
    }

    const isSuspectOrAccused = person.role === 'suspect' || person.role === 'accused' || person.is_culprit;

    if (!isSuspectOrAccused) {
      person.examined = 1;
      person.statementRecorded = true;
      const combinedDialogue = dialogueFull.toLowerCase();

      // Scan exhibits
      (snap.exhibits || []).forEach((ex: any) => {
        const exName = (ex.name || '').toLowerCase();
        const exDesc = (ex.described || '').toLowerCase();
        const keywords = [
          ...exName.split(/[\s,&/]+/).filter((w: string) => w.length > 3),
          ...exDesc.split(/[\s,&/]+/).filter((w: string) => w.length > 3),
          'transformer', 'water tank', 'shed', 'duffel', 'cutter', 'lock-cutter', 'padlock', 'stolen'
        ];
        const hasMatch = keywords.some((kw: string) => combinedDialogue.includes(kw));

        if (hasMatch) {
          ex.confirmedWitnesses = ex.confirmedWitnesses || [];
          if (!ex.confirmedWitnesses.includes(person.name)) {
            ex.confirmedWitnesses.push(person.name);
          }

          person.knownExhibits = person.knownExhibits || [];
          if (!person.knownExhibits.includes(ex.name)) {
            person.knownExhibits.push(ex.name);
          }

          witnessDisclosures.push({
            witness: person.name,
            exhibitId: ex.id,
            exhibitName: ex.name
          });

          // Auto-lodge witness on exhibit if slot open
          if (!ex.witnessA) {
            ex.witnessA = person.name;
          } else if (!ex.witnessB && ex.witnessA !== person.name) {
            ex.witnessB = person.name;
            ex.seizureValid = true;
            ex.admissibility = 'admissible';
          }
        }
      });

      // Scan recoveries
      (snap.recoveries || []).forEach((r: any) => {
        const rDesc = (r.description || r.item || '').toLowerCase();
        const rLoc = (r.location || '').toLowerCase();
        const rKeywords = [
          ...rDesc.split(/[\s,&/]+/).filter((w: string) => w.length > 3),
          ...rLoc.split(/[\s,&/]+/).filter((w: string) => w.length > 3),
          'transformer', 'water tank', 'shed', 'duffel', 'cutter', 'lock-cutter'
        ];
        const hasMatch = rKeywords.some((kw: string) => combinedDialogue.includes(kw));

        if (hasMatch) {
          r.confirmedWitnesses = r.confirmedWitnesses || [];
          if (!r.confirmedWitnesses.includes(person.name)) {
            r.confirmedWitnesses.push(person.name);
          }

          // Auto-lodge witness into recovery memo!
          if (!r.witness_a) {
            r.witness_a = person.name;
          } else if (!r.witness_b && r.witness_a !== person.name) {
            r.witness_b = person.name;
            r.witnesses = [r.witness_a, r.witness_b];
            r.s23_valid = true;
            r.status = 'witnessed_recovery_completed';
          }

          snap.diary = snap.diary || [];
          snap.diary.unshift({
            day: snap.day || 1,
            time: new Date().toISOString().substring(11, 16),
            author: 'Investigating Officer',
            body: `[WITNESS EVIDENCE DISCLOSURE] Witness "${person.name}" examined under BNSS s.180 confirmed direct knowledge of "${r.description || r.item}". Lodged as verified panch witness.`,
            tag: 'EXAMINATION'
          });
        }
      });
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    // Multi-Core Interrogation Termination System (MITS) Evaluation
    let terminationTrigger: null | {
      type: 'evidence_lock' | 'psychological_burnout' | 'legal_stonewall';
      title: string;
      reason: string;
      actionGuidance: string;
    } = null;

    if (isAssistantTurn || assistName) {
      const transcript = interview.transcript || [];
      const recentSuspectTurns = transcript.filter((t: any) => t.speaker === 'suspect');
      const recentReplies = recentSuspectTurns.slice(-4).map((t: any) => (t.text || '').toLowerCase());

      // 1. Combination Alpha: Locatable Discovery Safe-Lock (BSA s.23 Breakthrough)
      if (locatableDisclosure && locatableDisclosure.available) {
        terminationTrigger = {
          type: 'evidence_lock',
          title: 'Locatable Discovery Safe-Lock (BSA s.23)',
          reason: `Accused revealed locatable disclosure: "${locatableDisclosure.item}" at "${locatableDisclosure.location}". Interrogation terminated immediately to prevent revelation-washing and safeguard Section 23 admissibility.`,
          actionGuidance: 'Execute search and seizure memo immediately before two independent panch witnesses under BNSS s.103.'
        };
      }
      // 2. Combination Gamma: Lawyer Shield / Legal Stonewall Cap (Core A absence + Core B tension ceiling)
      else if ((interview.tension >= 95 || (interview.tension >= 90 && (evasionType === 'stonewalling' || evasionType === 'denial'))) && (interview.admissible || []).length === 0) {
        terminationTrigger = {
          type: 'legal_stonewall',
          title: 'Legal Stonewall Cap (BNSS Protection)',
          reason: `Suspect tension reached critical limit (${interview.tension}/100) with hardened stonewalling and zero locatable disclosures. Questioning terminated to prevent custodial rights violation or invocation of right to counsel under BNSS.`,
          actionGuidance: 'Suspend direct questioning. Corroborate independent evidence from CDR tower logs, CCTV footage, and forensic lab reports before re-commencing.'
        };
      }
      // 3. Combination Beta: Psychological Burnout Deadlock (Tension >= 80 + Repeating Contradictions / Diminishing Returns)
      else if (interview.tension >= 80 && (interview.credibility <= 40 || (person?.contradictions || []).length >= 2)) {
        const hasRepetitiveDenial = recentReplies.length >= 2 && (
          evasionType === 'denial' ||
          evasionType === 'false-alibi' ||
          evasionType === 'stonewalling' ||
          recentReplies[recentReplies.length - 1] === recentReplies[recentReplies.length - 2] ||
          recentReplies.some((r: string) => r.includes('already told') || r.includes('nothing to say') || r.includes('don\'t know') || r.includes('wasn\'t me') || r.includes('singling me out'))
        );

        if (hasRepetitiveDenial || (person?.contradictions || []).length >= 3) {
          terminationTrigger = {
            type: 'psychological_burnout',
            title: 'Psychological Burnout Deadlock',
            reason: `Suspect is in psychological deadlock (Tension: ${interview.tension}/100, Credibility: ${Math.round(interview.credibility)}/100). Repetitive statements indicate cognitive exhaustion with zero incremental discovery.`,
            actionGuidance: 'Allow a cooling-off interval. Re-approach with physical exhibits or CCTV footage rather than repetitive verbal interrogation.'
          };
        }
      }
    }

    if (activeDir && activeDir.status === 'completed' && !terminationTrigger) {
      terminationTrigger = {
        type: 'evidence_lock',
        title: 'Co-Examiner Directive Complete',
        reason: activeDir.completedReason || 'Officer completed specified questioning mandate.',
        actionGuidance: 'The squad member has fulfilled your instructions. Resume examination personally or issue a new operational directive.'
      };
    }

    interview.composure = newState.arousal >= 80 ? 'breakdown' : newState.arousal >= 65 ? 'cornered' : newState.arousal >= 45 ? 'agitated' : 'guarded';
    interview.is_breakdown = newState.arousal >= 80;
    interview.breakthrough = decisionBranch.decision === 'crack' || newState.arousal >= 80;

    const turn = {
      speaker: 'suspect',
      question_framed: questionText,
      suspect_reply: replyText,
      thought_process: thoughtSteps.length ? thoughtSteps : null,
      evasion_type: evasionType,
      locatable_disclosure: locatableDisclosure,
      contradiction_noted: contradictionNoted,
      officer_note: officerNote,
      termination_trigger: terminationTrigger,
      witness_disclosures: witnessDisclosures.length > 0 ? witnessDisclosures : null,
      advocate_intervention: advocateIntervention || null,
      fatigue: fatigueContext,
      confronted_lie: confrontedLie || null,
      micro_lies: lies,
      composure: interview.composure,
      is_breakdown: interview.is_breakdown,
      breakthrough: interview.breakthrough,
      remand_clock: snap.remand_clock
    };

    return {
      turn,
      interview,
      directive: interview.activeDirective || null,
      newNote: newGeneratedNote || null,
      advocate_intervention: advocateIntervention || null,
      fatigue: fatigueContext,
      confronted_lie: confrontedLie || null,
      micro_lies: lies,
      composure: interview.composure,
      is_breakdown: interview.is_breakdown,
      breakthrough: interview.breakthrough,
      remand_clock: snap.remand_clock,
      ...this.getFullBundle(caseId)
    };
  }

  public slamEvidenceContradiction(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const person = (snap.persons || []).find((p: any) => p.id === personId) || (snap.persons || [])[0];
    const exhibitId = body.exhibitId;
    const exhibit = (snap.exhibits || []).find((e: any) => String(e.id) === String(exhibitId) || e.code === exhibitId) || {
      id: exhibitId || 'EX-01',
      code: 'EX-01',
      name: body.exhibitName || 'Seized Physical Exhibit',
      weight: 8,
      category: 'Physical'
    };

    const interview = (snap.interviews || []).find((iv: any) => iv.person_id === (person && person.id)) || (snap.interviews || [])[0];
    if (!interview) throw new Error('No active interview found for this person');

    const advocatePresent = Boolean(body.advocatePresent ?? snap.remand_clock?.advocatePresent ?? interview.advocatePresent);

    const psych = {
      stressLevel: typeof interview.arousal === 'number' ? interview.arousal : 25,
      cooperationLevel: 100 - (typeof interview.resistance === 'number' ? interview.resistance : 65),
      composureState: (interview.composure || 'guarded') as any,
      isBreakdown: Boolean(interview.is_breakdown),
      deceitIndex: Math.max(10, 100 - (interview.belief || 30)),
      vulnerabilitiesShattered: interview.vulnerabilitiesShattered || [],
      coercionPenalty: interview.coercion || 0
    };

    const exhibitWeight = exhibit.weight || (exhibit.category === 'Digital' || exhibit.category === 'Forensic' ? 9 : 7);
    const isVulnerability = Boolean(
      (person.true_alibi && exhibit.name && person.true_alibi.toLowerCase().includes(exhibit.name.toLowerCase())) ||
      (exhibit.name && (exhibit.name.toLowerCase().includes('blood') || exhibit.name.toLowerCase().includes('cctv') || exhibit.name.toLowerCase().includes('cdr') || exhibit.name.toLowerCase().includes('crowbar') || exhibit.name.toLowerCase().includes('phone')))
    );

    const contradictionType = body.contradictionType || (
      exhibit.name?.toLowerCase().includes('cctv') ? 'cctv_visual' :
      exhibit.name?.toLowerCase().includes('cdr') || exhibit.name?.toLowerCase().includes('tower') ? 'cell_tower_ping' :
      exhibit.name?.toLowerCase().includes('blood') || exhibit.name?.toLowerCase().includes('fingerprint') || exhibit.name?.toLowerCase().includes('serology') ? 'forensic_match' :
      'alibi_refutation'
    );

    const impact = calculateEvidenceSlamImpact(
      psych as any,
      exhibitWeight,
      contradictionType,
      isVulnerability,
      advocatePresent
    );

    interview.arousal = clamp((interview.arousal || 20) + impact.stressDelta);
    interview.resistance = clamp((interview.resistance || 65) - impact.cooperationDelta);
    interview.tension = interview.arousal;
    interview.belief = clamp((interview.belief || 30) + 20);
    interview.composure = impact.newPsychology.composureState;
    interview.is_breakdown = impact.newPsychology.isBreakdown;
    interview.breakthrough = impact.breakthroughAchieved;

    if (impact.breakthroughAchieved && (interview.disclosure_tier || 0) < 3) {
      interview.disclosure_tier = 3;
    }
    if (impact.newPsychology.stressLevel >= 85 && (interview.disclosure_tier || 0) < 4) {
      interview.disclosure_tier = 4;
    }

    snap.remand_clock = snap.remand_clock || {
      remandMinutesRemaining: 1440,
      elapsedMinutes: 0,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false,
      remandOrdersCount: 0,
      remandHistory: []
    };
    snap.remand_clock.remandMinutesRemaining = Math.max(0, (snap.remand_clock.remandMinutesRemaining || 1440) - 25);
    snap.remand_clock.elapsedMinutes = (snap.remand_clock.elapsedMinutes || 0) + 25;
    snap.remand_clock.lastMedicalCheckMinutesAgo = (snap.remand_clock.lastMedicalCheckMinutesAgo || 0) + 25;

    snap.slammedExhibits = snap.slammedExhibits || [];
    const slamRecord = {
      id: `slam-${Date.now()}`,
      exhibitId: exhibit.id,
      exhibitCode: `EX-${exhibit.id || '01'}`,
      exhibitTitle: exhibit.name,
      contradictionType,
      stressDelta: impact.stressDelta,
      cooperationDelta: impact.cooperationDelta,
      breakthroughAchieved: impact.breakthroughAchieved,
      timestamp: new Date().toISOString()
    };
    snap.slammedExhibits.unshift(slamRecord);

    let suspectReaction = '';
    if (impact.breakthroughAchieved) {
      suspectReaction = `*[visibly shakes, tears welling up, staring at ${exhibit.name}]* "Bas kijiye, Inspector Sahab... I never intended for anyone to get hurt! This ${exhibit.name}... it proves I was there. I will cooperate and tell you everything!"`;
    } else if (impact.newPsychology.composureState === 'cornered' || impact.newPsychology.composureState === 'agitated') {
      suspectReaction = `*[shifts back uncomfortably, breathing heavily]* "Where did you get ${exhibit.name}? Look... you have to understand the pressure I was under! But that doesn't mean I did the whole thing alone!"`;
    } else {
      suspectReaction = `*[nervously eyes ${exhibit.name}, clutching table]* "Sir, this ${exhibit.name}... it could belong to anyone. I don't know why you're putting this in front of me."`;
    }

    interview.transcript = interview.transcript || [];
    interview.transcript.push({
      speaker: 'officer',
      text: `💥 [EXHIBIT CONTRADICTION SLAMMED] Investigating Officer confronts accused with Exhibit EX-${exhibit.id || '01'}: ${exhibit.name}. "${body.questionText || `We recovered this from the scene. Your alibi is dismantled. Explain this!`}"`,
      technique: 'evidence-disclosure'
    });
    interview.transcript.push({
      speaker: 'suspect',
      text: suspectReaction,
      breakthrough: impact.breakthroughAchieved,
      composure: impact.newPsychology.composureState
    });

    const timeStr = new Date().toISOString().substring(11, 16);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: timeStr,
      author: 'Investigating Officer',
      text: `[EXHIBIT CONTRADICTION SLAMMED §145 BSA] Accused ${person.name} formally confronted with ${exhibit.name}. Psychological stress rose to ${interview.arousal}%. ${impact.breakthroughAchieved ? 'CRITICAL BREAKTHROUGH ACHIEVED — Suspect composure shattered.' : 'Suspect cornered under physical evidence.'}`,
      tag: 'INTERROGATION'
    });

    snap.logs = snap.logs || [];
    snap.logs.unshift({
      id: 'log-slam-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      type: 'INTERROGATION',
      message: `Evidence slam executed: ${exhibit.name}. Breakthrough: ${impact.breakthroughAchieved}. Composure: ${impact.newPsychology.composureState}.`,
      severity: impact.breakthroughAchieved ? 'critical' : 'info'
    });

    this.bumpRev();

    return {
      success: true,
      impact,
      slamRecord,
      suspectReaction,
      interview,
      remand_clock: snap.remand_clock,
      ...this.getFullBundle(caseId)
    };
  }

  public recordDiscoveryMemo(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const person = (snap.persons || []).find((p: any) => p.id === personId) || (snap.persons || [])[0];
    const statementText = body.statementText || 'I have concealed the weapon used in the offence behind the brick kiln in Sector 4. I can lead the police party there and recover it.';
    const targetLocation = body.targetLocation || 'Abandoned Brick Kiln, Sector 4';
    const itemDescription = body.itemDescription || 'Country-made firearm with spent cartridges';
    const panchaA = body.panchaA || 'Rameshwar Sharma (Local Merchant)';
    const panchaB = body.panchaB || 'Anil Gupta (Area Resident)';

    const validation = validateDiscoveryMemoBSA23(
      String(person.id),
      person.name,
      statementText,
      targetLocation,
      itemDescription,
      [panchaA, panchaB],
      'Inspector & IO'
    );

    if (!validation.isValid || !validation.memo) {
      throw new Error(validation.reason || 'Invalid BSA §23 Discovery Memo');
    }

    const memo = validation.memo;
    snap.discovery_memos = snap.discovery_memos || [];
    snap.discovery_memos.unshift(memo);

    snap.exhibits = snap.exhibits || [];
    const newExhibitId = 100 + snap.exhibits.length + 1;
    const newExhibit = {
      id: newExhibitId,
      code: `REC-${newExhibitId}`,
      name: `${itemDescription} (${targetLocation})`,
      category: 'Physical',
      location_found: targetLocation,
      found: true,
      recovered: true,
      isUnlocked: true,
      summary: `Recovered on voluntary disclosure of accused ${person.name} recorded under Section 23 Bharatiya Sakshya Adhiniyam 2023 before Panchas ${panchaA} and ${panchaB}.`,
      panchnama_ref: memo.memoNumber,
      admissible_status: 'ADMISSIBLE_UNDER_BSA_S23'
    };
    snap.exhibits.unshift(newExhibit);

    snap.remand_clock = snap.remand_clock || {
      remandMinutesRemaining: 1440,
      elapsedMinutes: 0,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false,
      remandOrdersCount: 0,
      remandHistory: []
    };
    snap.remand_clock.remandMinutesRemaining = Math.max(0, (snap.remand_clock.remandMinutesRemaining || 1440) - 45);
    snap.remand_clock.elapsedMinutes = (snap.remand_clock.elapsedMinutes || 0) + 45;
    snap.remand_clock.lastMedicalCheckMinutesAgo = (snap.remand_clock.lastMedicalCheckMinutesAgo || 0) + 45;

    const timeStr = new Date().toISOString().substring(11, 16);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: timeStr,
      author: 'Investigating Officer',
      text: `[BSA §23 DISCOVERY PANCHNAMA EXECUTED] Panchnama Memo ${memo.memoNumber} drawn up in presence of independent Panch witnesses ${panchaA} and ${panchaB}. Accused led police party to "${targetLocation}". Recovered: "${itemDescription}". Fact discovered is fully admissible in evidence under BSA 2023 Section 23.`,
      tag: 'LEGAL',
      entry_type: 'milestone'
    });

    const interview = (snap.interviews || []).find((iv: any) => iv.person_id === (person && person.id)) || (snap.interviews || [])[0];
    if (interview) {
      interview.transcript = interview.transcript || [];
      interview.transcript.push({
        speaker: 'officer',
        text: `📜 [BSA §23 DISCOVERY PANCHNAMA // ${memo.memoNumber}] Voluntary disclosure statement recorded before independent Panch witnesses ${panchaA} & ${panchaB}: "${statementText}"`
      });
      interview.transcript.push({
        speaker: 'suspect',
        text: `*[signing memo before Panch witnesses]* "Yes, I voluntarily showed the police where I hid the item. This is my true signature."`
      });
      interview.arousal = Math.max(20, (interview.arousal || 50) - 10);
      interview.resistance = Math.max(0, (interview.resistance || 40) - 25);
      interview.belief = 100;
    }

    snap.logs = snap.logs || [];
    snap.logs.unshift({
      id: 'log-memo-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      type: 'LEGAL',
      message: `BSA §23 Discovery Panchnama recorded: ${memo.memoNumber}. Recovered: ${newExhibit.name}.`,
      severity: 'critical'
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      success: true,
      memo,
      recoveredExhibit: newExhibit,
      remand_clock: snap.remand_clock,
      ...this.getFullBundle(caseId)
    };
  }

  public petitionRemandExtension(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const person = (snap.persons || []).find((p: any) => p.id === personId) || (snap.persons || [])[0];
    const grounds = body.grounds || 'Recover concealed weapons, stolen property & physical exhibits under BSA §23';
    const requestedDays = Number(body.requestedDays) || 7;

    snap.remand_clock = snap.remand_clock || {
      remandMinutesRemaining: 1440,
      elapsedMinutes: 0,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false,
      remandOrdersCount: 0,
      remandHistory: []
    };

    const addedMinutes = requestedDays * 1440;
    snap.remand_clock.remandMinutesRemaining = (snap.remand_clock.remandMinutesRemaining || 0) + addedMinutes;
    snap.remand_clock.isExpired = false;
    snap.remand_clock.remandOrdersCount = (snap.remand_clock.remandOrdersCount || 0) + 1;

    const timeStr = new Date().toISOString().substring(11, 16);
    const magistrateName = 'Hon\'ble CJM K. L. Deshmukh';
    const orderRecord = {
      day: snap.day || 1,
      time: timeStr,
      grantedDays: requestedDays,
      grounds,
      magistrateName
    };

    snap.remand_clock.remandHistory = snap.remand_clock.remandHistory || [];
    snap.remand_clock.remandHistory.unshift(orderRecord);

    // Auto-lodge in BNSS Case Diary
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: timeStr,
      author: 'Chief Judicial Magistrate',
      text: `[MAGISTRATE POLICE REMAND ORDER §187 BNSS] Application for police custody of accused ${person ? person.name : 'Suspect'} heard. Satisfied that custody is necessary for: "${grounds}". Police custody extended by ${requestedDays} days. Accused to be produced on expiry.`,
      tag: 'LEGAL'
    });

    snap.logs = snap.logs || [];
    snap.logs.unshift({
      id: 'log-remand-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      type: 'LEGAL',
      message: `POLICE REMAND EXTENSION GRANTED (${requestedDays} Days) by ${magistrateName} under BNSS §187.`,
      severity: 'info'
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      success: true,
      grantedDays: requestedDays,
      remand_clock: snap.remand_clock,
      magistrateName,
      grounds,
      ...this.getFullBundle(caseId)
    };
  }

  public conductMedicalExamination(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const person = (snap.persons || []).find((p: any) => p.id === personId) || (snap.persons || [])[0];
    const doctorName = body.doctorName || 'Dr. A. Verma (CMO, District Civil Hospital)';
    const pulse = body.pulse || '78 bpm';
    const bp = body.bp || '124/82 mmHg';

    snap.remand_clock = snap.remand_clock || {
      remandMinutesRemaining: 1440,
      elapsedMinutes: 0,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false,
      remandOrdersCount: 0,
      remandHistory: []
    };

    snap.remand_clock.lastMedicalCheckMinutesAgo = 0;
    snap.remand_clock.medicalFitnessStatus = 'fit';

    // Reduce tension/arousal as medical check and hydration defuses acute panic
    const interview = (snap.interviews || []).find((iv: any) => iv.person_id === (person && person.id)) || (snap.interviews || [])[0];
    if (interview) {
      interview.arousal = Math.max(15, (interview.arousal || 30) - 15);
      interview.tension = interview.arousal;
    }

    const timeStr = new Date().toISOString().substring(11, 16);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: timeStr,
      author: doctorName,
      text: `[MEDICAL CERTIFICATE §54 BNSS] Accused ${person ? person.name : 'Suspect'} examined. BP: ${bp}, Pulse: ${pulse}. No external contusions or signs of trauma. Subject certified medically fit for examination.`,
      tag: 'LEGAL'
    });

    snap.logs = snap.logs || [];
    snap.logs.unshift({
      id: 'log-med-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      type: 'LEGAL',
      message: `MANDATORY MEDICAL EXAM COMPLETED under BNSS §54 by ${doctorName}. Status: FIT.`,
      severity: 'info'
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      success: true,
      medicalFitnessStatus: 'fit',
      doctorName,
      pulse,
      bp,
      remand_clock: snap.remand_clock,
      ...this.getFullBundle(caseId)
    };
  }

  public toggleAdvocatePresence(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const interviewId = Number(body.interviewId);
    const explicitPresent = typeof body.advocatePresent === 'boolean' ? body.advocatePresent : undefined;

    snap.remand_clock = snap.remand_clock || {
      remandMinutesRemaining: 1440,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false
    };

    const newStatus = explicitPresent !== undefined ? explicitPresent : !snap.remand_clock.advocatePresent;
    snap.remand_clock.advocatePresent = newStatus;

    const interview = (snap.interviews || []).find((iv: any) => (interviewId && iv.id === interviewId) || (personId && iv.person_id === personId)) || (snap.interviews || [])[0];
    if (interview) {
      interview.advocatePresent = newStatus;
      interview.advocate_present = newStatus;
    }

    const nowStr = new Date().toISOString().substring(11, 16);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: nowStr,
      author: 'Investigating Officer',
      text: newStatus 
        ? `[LEGAL COUNSEL NOTIFIED] Defense Advocate Adv. Sharma seated in interrogation room under BNSS §41D within visual range.`
        : `[LEGAL COUNSEL DEPARTURE] Defense Advocate departed interrogation room. Proceeding under regular custodial protocol.`,
      tag: 'LEGAL'
    });

    snap.logs = snap.logs || [];
    snap.logs.unshift({
      id: 'log-adv-' + Date.now(),
      timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
      type: 'LEGAL',
      message: `Advocate presence toggled: ${newStatus ? 'PRESENT (BNSS §41D)' : 'ABSENT'}`,
      severity: 'info'
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      success: true,
      advocatePresent: newStatus,
      interview,
      remand_clock: snap.remand_clock,
      ...this.getFullBundle(caseId)
    };
  }

  public closeInterview(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const interviewId = Number(body.interviewId);
    const interview = (snap.interviews || []).find((iv: any) => (interviewId && iv.id === interviewId) || (personId && iv.person_id === personId)) || (snap.interviews || [])[0];

    if (interview) {
      interview.phase = 'closed';
      interview.end_day = snap.day;

      // TASK 6: Compute taint and increment session count
      const ivState: InterrogationState = {
        arousal: typeof interview.arousal === 'number' ? interview.arousal : (interview.tension || 20),
        resistance: typeof interview.resistance === 'number' ? interview.resistance : 65,
        rapport: typeof interview.rapport === 'number' ? interview.rapport : 0,
        belief: typeof interview.belief === 'number' ? interview.belief : 30,
        police_credibility: typeof interview.police_credibility === 'number' ? interview.police_credibility : 60,
        coercion: typeof interview.coercion === 'number' ? interview.coercion : 0,
        disclosure_tier: (interview.disclosure_tier || 0) as (0 | 1 | 2 | 3 | 4),
        session_turn: interview.session_turn || 0,
        psychology: interview.psychology || { temper: 40, resilience: 65, compliance: 35, transparency: 45, defensiveness: 70, suggestibility: 30, consistency: 55 },
        contradictions_found: interview.contradictions_found || 0,
        session_no: interview.session_no || 1
      };

      const { taint, session_count } = closeSession(ivState);
      interview.taint = taint;
      interview.session_no = session_count + 1; // Increment so next session starts from prior values

      if (taint === 'tainted') {
        const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
        snap.diary = snap.diary || [];
        snap.diary.unshift({
          id: Date.now() + 1,
          case_id: snap.caseId,
          day: snap.day,
          entry_type: 'warning',
          body: `Session closed with coercion exposure. The disclosures obtained in this room are legally tainted.`,
          auto: 1,
          created_at: nowStr
        });

        // Mark associated disclosures or recoveries as tainted
        if (Array.isArray(interview.admissible)) {
          interview.admissible.forEach((adm: any) => {
            adm.taint = 'tainted';
          });
        }
        if (Array.isArray(snap.recoveries)) {
          snap.recoveries.forEach((rec: any) => {
            if (rec.interview_id === interview.id || rec.person_id === interview.person_id) {
              rec.taint = 'tainted';
            }
          });
        }
      }
    }

    const admissible = (interview && interview.admissible) || [];
    const inadmissible = (interview && interview.inadmissible) || [];

    const summary = (interview && interview.summary) || (admissible.length > 0
      ? `Session closed under BSA s.23. Suspect made ${admissible.length} locatable disclosure(s) leading to discovery of physical evidence/facts.`
      : `Session closed under BSA s.23. No admissible discoveries substantiated before witnesses; confessional utterances remain inadmissible against the accused.`);

    const guidance = (interview && interview.guidance) || (admissible.length > 0
      ? `Proceed to the Evidence Board and execute formal recovery memos before two independent panch witnesses to substantiate Section 23 admissibility.`
      : `Re-examine the suspect or corroborate witness alibis and forensic lab reports before submitting the final charge sheet.`);

    const result = {
      provable_count: admissible.length,
      worthless_count: inadmissible.length,
      admissible,
      inadmissible,
      summary,
      guidance
    };

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: `Examination of ${interview?.person_name || 'suspect'} concluded. Audio-video recording sealed under BNSS s.105 directives. Application of BSA s.23: ${result.provable_count} provable fact(s), ${result.worthless_count} inadmissible statement(s).`,
      auto: 1,
      created_at: nowStr
    });

    this.crossSyncPlayerManualAction(caseId, 'interrogate', { interview });
    
    // Auto-post findings report to squad chat if assistant officer was assigned
    if (snap.interrogation_assistant || body.assistantName) {
      this.stopInterviewAndReportFindings(caseId, body);
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();

    return {
      result,
      interview,
      ...this.getFullBundle(caseId)
    };
  }

  public stopInterviewAndReportFindings(caseId: number, body: any = {}): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const assistantName = body.assistantName || snap.interrogation_assistant || 'Co-Examiner';
    const interviewId = Number(body.interviewId);
    const personId = Number(body.personId);

    const interview = (snap.interviews || []).find((iv: any) => (interviewId && iv.id === interviewId) || (personId && iv.person_id === personId)) || (snap.interviews || [])[0];
    const person = (snap.persons || []).find((p: any) => p.id === (interview ? interview.person_id : personId));
    const personName = person ? (person.full_name || person.name) : (interview ? interview.person_name : 'Suspect');

    const admissible = (interview && interview.admissible) || [];
    const tension = interview ? (interview.tension || 30) : 30;
    const cred = interview ? Math.round(interview.credibility || 70) : 70;
    const emotionalState = interview ? (interview.emotional_state || 'guarded and defensive') : 'guarded and defensive';

    // Compile brief findings summary for squad message thread
    const termTitle = body.terminationTitle || (body.terminationType === 'evidence_lock' ? 'Locatable Discovery Safe-Lock (BSA s.23)' :
      body.terminationType === 'psychological_burnout' ? 'Psychological Burnout Deadlock' :
      body.terminationType === 'legal_stonewall' ? 'Legal Stonewall Cap (BNSS Protection)' : 'Investigating Officer Directive');
    const termReason = body.terminationReason || (body.terminationType ? 'Automatic custodial threshold met.' : 'Interrogation concluded by command of the Investigating Officer.');

    let findingsBody = `**Interrogation Status & Discovery Report — ${personName}**\n`;
    findingsBody += `**Examining Officer:** ${assistantName}\n`;
    findingsBody += `**Session Status:** Concluded (${termTitle})\n`;
    findingsBody += `**Operational Analysis:** ${termReason}\n`;
    findingsBody += `**Suspect Demeanour:** ${emotionalState} (Tension: ${tension}/100 | Credibility: ${cred}/100)\n\n`;

    if (admissible.length > 0) {
      findingsBody += `**Locatable Disclosures (BSA s.23):** ${admissible.length} provable discovery fact(s) recorded in transcript:\n`;
      admissible.forEach((a: any, idx: number) => {
        const itemStr = typeof a === 'string' ? a : (a.recovery || a.disclosed_fact || 'Concealed article/spot');
        findingsBody += `  • ${idx + 1}. ${itemStr}\n`;
      });
      findingsBody += `\n**Investigative Action Required:** ${body.actionGuidance || 'Proceed to the Evidence Board & execute formal search/recovery memos before two independent local witnesses (panchas) pursuant to BNSS s.103.'}`;
    } else {
      findingsBody += `**Locatable Disclosures:** Zero locatable disclosures obtained during this questioning block. Confessional utterances without physical discovery remain inadmissible under BSA s.23.\n\n`;
      findingsBody += `**Investigative Action Required:** ${body.actionGuidance || 'Cross-examine against cell tower CDR pings, CCTV footage, and FSL lab reports before re-commencing examination.'}`;
    }

    // Identify officer thread or case squad desk thread
    let targetThread = this.threads.find((t: any) => t.title && t.title.toLowerCase().includes(assistantName.toLowerCase()));
    if (!targetThread) {
      targetThread = this.threads.find((t: any) => t.member_id && this.team.some((m: any) => m.id === t.member_id && m.name.toLowerCase().includes(assistantName.toLowerCase())));
    }
    if (!targetThread) {
      targetThread = this.threads.find((t: any) => t.kind === 'case' && t.case_id === caseId) || this.threads[0];
    }

    if (targetThread) {
      this.postSystemMessageToThread(targetThread.id, assistantName, findingsBody);
    }

    if (body.withdraw !== false) {
      snap.interrogation_assistant = null;
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public setInterrogationAssistant(caseId: number, body: any = {}): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const assistName = (body.assistantName || body.name || '').trim();
    snap.interrogation_assistant = assistName || null;

    this.bumpRev();
    return this.getFullBundle(caseId);
  }

  public async parseInterrogationDirective(
    caseId: number,
    body: {
      instruction: string;
      personId: number;
      assistantName?: string;
    },
    apiKey?: string
  ): Promise<any> {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const personId = Number(body.personId);
    const interview = (snap.interviews || []).find((iv: any) => iv.person_id === personId) || (snap.interviews || [])[0];
    const person = (snap.persons || []).find((p: any) => p.id === personId) || { name: interview?.person_name || 'Suspect', role: 'suspect' };
    const rawInstruction = (body.instruction || '').trim();
    const assistName = body.assistantName || snap.interrogation_assistant || 'Co-Examiner';

    if (assistName) {
      snap.interrogation_assistant = assistName;
    }

    // 1. Initial heuristic defaults
    let operationalMode: string = 'autonomous_lead';
    let questionBudget: number | null = null;
    let gametimeMinutesBudget: number | null = null;
    let tacticalPosture = 'structured_custodial_examination';
    let stopConditions: string[] = [];
    let backgroundTasks: string[] = ['note_substantial_admissions', 'detect_contradictions'];
    const targetEntities: { exhibits: string[]; persons: string[]; timeWindows: string[]; locations: string[] } = {
      exhibits: [],
      persons: [],
      timeWindows: [],
      locations: []
    };
    let acknowledgement = `Understood, Sir. I will proceed with questioning ${person.name} as directed.`;

    const lower = rawInstruction.toLowerCase();

    // Check for note-taking / scribe directives
    if (/(\bnote\b|\bnotes\b|\bscribe\b|\brecord\b|\blog\b|\blisten\b|\bwatch\b|\bkeep\s+taking\s+notes?\b)/i.test(lower) && 
        !(/(\byou\s*interrogate\b|\byou\s*ask\b|\bgrill\b|\bpress\b)/i.test(lower) && !lower.includes('while i'))) {
      operationalMode = 'silent_scribe';
      tacticalPosture = 'covert_behavioral_scribe';
      backgroundTasks = ['note_substantial_admissions', 'detect_contradictions', 'log_timeline', 'observe_demeanor'];
      acknowledgement = `Understood, Sir. I will stand by quietly, observe ${person.name}'s demeanor, and log all substantial admissions and contradictions while you conduct the examination.`;
    } else if (lower.includes('tea') || lower.includes('chai') || lower.includes('water') || lower.includes('coffee') || lower.includes('drink') || lower.includes('snack') || lower.includes('biscuit') || lower.includes('refreshment') || lower.includes('breakfast') || lower.includes('food') || lower.includes('hospitality')) {
      operationalMode = 'good_cop';
      tacticalPosture = 'hospitality_and_rapport';
      acknowledgement = `Understood, Sir. I will offer ${person.name} some hot tea and refreshments to ease their tension and build voluntary rapport under BNSS s.180.`;
    } else if (lower.includes('good cop') || lower.includes('empathy') || lower.includes('rapport')) {
      operationalMode = 'good_cop';
      tacticalPosture = 'rapport_and_empathy';
      acknowledgement = `Sir, I will adopt a cooperative, empathetic approach to put ${person.name} at ease and draw out the facts.`;
    } else if (lower.includes('bad cop') || lower.includes('grill') || lower.includes('hammer') || lower.includes('pressure') || lower.includes('hard') || lower.includes('break him')) {
      operationalMode = 'bad_cop';
      tacticalPosture = 'high_pressure_confrontation';
      acknowledgement = `Sir, I will challenge ${person.name}'s contradictions aggressively and keep up the pressure on every discrepancy.`;
    } else if (lower.includes('technical') || lower.includes('forensics') || lower.includes('cdr') || lower.includes('cctv') || lower.includes('cyber')) {
      operationalMode = 'technical_specialist';
      tacticalPosture = 'scientific_evidence_presentation';
      acknowledgement = `Sir, I will confront ${person.name} with the technical forensics and digital timeline records.`;
    } else {
      operationalMode = 'autonomous_lead';
      tacticalPosture = 'focused_fact_finding';
    }

    // Check for question budget (e.g. "only one question", "1 question", "2 questions", "3-5 questions", "ask 3 questions")
    const wordNumbers: { [k: string]: number } = {
      'one': 1, 'single': 1, 'a single': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
    };

    if (/\b(only|just|a)?\s*(one|single|1)\s*questions?\b/i.test(lower) || /\bask\s+(only|just)?\s*(one|single|1)\s*(question)?\b/i.test(lower)) {
      questionBudget = 1;
      stopConditions.push('question_limit_reached');
    } else {
      const wordNumMatch = lower.match(/\b(only|just)?\s*(two|three|four|five|six|seven|eight|nine|ten)\s*questions?\b/i);
      if (wordNumMatch && wordNumbers[wordNumMatch[2].toLowerCase()]) {
        questionBudget = wordNumbers[wordNumMatch[2].toLowerCase()];
        stopConditions.push('question_limit_reached');
      } else {
        const rangeMatch = lower.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*questions?/i);
        if (rangeMatch) {
          questionBudget = parseInt(rangeMatch[2], 10);
          stopConditions.push('question_limit_reached');
        } else {
          const qMatch = lower.match(/(\d+)\s*questions?/i) || lower.match(/ask\s+(\d+)/i) || lower.match(/put\s+(\d+)/i);
          if (qMatch) {
            questionBudget = parseInt(qMatch[1], 10);
            stopConditions.push('question_limit_reached');
          }
        }
      }
    }

    // Check for gametime budget (e.g. "for 10 minutes", "15 mins", "10 min", "half an hour")
    const mMatch = lower.match(/(\d+)\s*(?:minutes?|mins?)/i);
    if (mMatch) {
      gametimeMinutesBudget = parseInt(mMatch[1], 10);
      stopConditions.push('gametime_limit_reached');
    } else if (lower.includes('half an hour') || lower.includes('30 min')) {
      gametimeMinutesBudget = 30;
      stopConditions.push('gametime_limit_reached');
    }

    // Check for target entities in case
    (snap.exhibits || []).forEach((ex: any) => {
      if (ex.name && lower.includes(ex.name.toLowerCase())) {
        targetEntities.exhibits.push(ex.name);
      }
    });
    (snap.persons || []).forEach((p: any) => {
      if (p.name && lower.includes(p.name.toLowerCase()) && p.id !== person.id) {
        targetEntities.persons.push(p.name);
      }
    });
    if (lower.includes('alibi') || lower.includes('timeline') || lower.includes('whereabouts')) {
      targetEntities.timeWindows.push('Incident timeline window');
    }
    if (lower.includes('cutter') || lower.includes('lock') || lower.includes('weapon') || lower.includes('bag') || lower.includes('duffel') || lower.includes('shed') || lower.includes('tank')) {
      stopConditions.push('locatable_disclosure_found');
    }

    // Gemini AI Structured Extraction for unknown / complex directions
    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (keyToUse && !isGeminiQuotaBlocked()) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: keyToUse });
        const prompt = `You are an AI Dispatch Parser for a police investigation chamber simulation under Indian law (BNSS 2023, BSA 2023).
The Investigating Officer gave this natural language directive to squad member "${assistName}" regarding suspect "${person.name}":
Directive: "${rawInstruction}"

Case context:
- FIR: ${snap.fir?.incident_type || 'Offence'} (${snap.fir?.short_summary || ''})
- Suspect: ${person.name} (${person.role || 'Suspect'})

Parse the directive into a structured interrogation mandate adhering to this JSON schema:
{
  "operational_mode": "autonomous_lead | co_examiner_wingman | silent_scribe | good_cop | bad_cop | technical_specialist",
  "question_budget": integer or null,
  "gametime_minutes_budget": integer or null,
  "target_entities": {
    "exhibits": ["exhibit names or items mentioned"],
    "persons": ["accomplices or witness names mentioned"],
    "time_windows": ["e.g. 02:00 to 02:30 or timeline"],
    "locations": ["locations mentioned"]
  },
  "tactical_posture": "short tag e.g. aggressive_confrontation, rapport_building, alibi_pressure, bluff_probe, statutory_warning",
  "stop_conditions": ["list of triggers: e.g. question_limit_reached, gametime_limit_reached, locatable_disclosure_found, tension_above_80"],
  "background_tasks": ["note_substantial_admissions", "detect_contradictions", "log_timeline"],
  "acknowledgement": "1-sentence direct military/police response from ${assistName} confirming the plan"
}`;

        const genPromise = ai.models.generateContent({
          model: DEFAULT_GEMINI_MODEL,
          contents: prompt,
          config: { responseMimeType: 'application/json' }
        });
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const res: any = await Promise.race([genPromise, timeoutPromise]);
        if (res && res.text) {
          const raw = res.text.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(raw);
          if (parsed.operational_mode) operationalMode = parsed.operational_mode;
          if (typeof parsed.question_budget === 'number') questionBudget = parsed.question_budget;
          if (typeof parsed.gametime_minutes_budget === 'number') gametimeMinutesBudget = parsed.gametime_minutes_budget;
          if (parsed.tactical_posture) tacticalPosture = parsed.tactical_posture;
          if (Array.isArray(parsed.stop_conditions) && parsed.stop_conditions.length) stopConditions = parsed.stop_conditions;
          if (Array.isArray(parsed.background_tasks) && parsed.background_tasks.length) backgroundTasks = parsed.background_tasks;
          if (parsed.acknowledgement) acknowledgement = parsed.acknowledgement;
          if (parsed.target_entities) {
            if (Array.isArray(parsed.target_entities.exhibits) && parsed.target_entities.exhibits.length) targetEntities.exhibits = parsed.target_entities.exhibits;
            if (Array.isArray(parsed.target_entities.persons) && parsed.target_entities.persons.length) targetEntities.persons = parsed.target_entities.persons;
            if (Array.isArray(parsed.target_entities.locations) && parsed.target_entities.locations.length) targetEntities.locations = parsed.target_entities.locations;
            if (Array.isArray(parsed.target_entities.time_windows) && parsed.target_entities.time_windows.length) targetEntities.timeWindows = parsed.target_entities.timeWindows;
          }
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }

    // Build the InterrogationDirective record
    const directive: any = {
      id: 'dir-iv-' + Date.now(),
      assignedMember: assistName,
      originalInstruction: rawInstruction,
      operationalMode,
      questionBudget,
      remainingQuestions: questionBudget,
      gametimeMinutesBudget,
      remainingGameMinutes: gametimeMinutesBudget,
      targetEntities,
      tacticalPosture,
      stopConditions,
      backgroundTasks,
      substantiveNotes: (interview?.activeDirective?.substantiveNotes) || [],
      status: 'active',
      acknowledgement,
      createdAt: Date.now()
    };

    // Attach to active interview
    if (interview) {
      interview.activeDirective = directive;
    }

    // Also record in case diary
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: snap.time || '11:30',
      author: assistName,
      text: `[CO-EXAMINER DIRECTIVE] Assigned by IO: "${rawInstruction}". Posture: ${tacticalPosture}. Mode: ${operationalMode}. Target Budget: ${questionBudget ? questionBudget + ' questions' : (gametimeMinutesBudget ? gametimeMinutesBudget + ' mins' : 'open-ended')}.`,
      tag: 'INTERROGATION'
    });

    this.bumpRev();

    return {
      ok: true,
      directive,
      acknowledgement,
      ...this.getFullBundle(caseId)
    };
  }

  public clearInterviewDirective(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');
    const personId = Number(body.personId);
    const interview = (snap.interviews || []).find((iv: any) => iv.person_id === personId) || (snap.interviews || [])[0];
    if (interview && interview.activeDirective) {
      interview.activeDirective.status = 'completed';
      interview.activeDirective.completedReason = 'Directive dismissed or completed by IO.';
    }
    this.bumpRev();
    return { ok: true, interview, ...this.getFullBundle(caseId) };
  }

  public pinSubstantiveNote(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');
    const note = body.note;
    if (note) {
      // Mark note as pinned across interviews
      for (const iv of (snap.interviews || [])) {
        if (iv.activeDirective?.substantiveNotes) {
          const match = iv.activeDirective.substantiveNotes.find((n: any) => n.id === note.id);
          if (match) match.pinned = true;
        }
      }
      snap.diary = snap.diary || [];
      snap.diary.unshift({
        day: snap.day || 1,
        time: note.gameTime || snap.time || '11:45',
        author: note.author || 'Co-Examiner',
        text: `[SUBSTANTIVE INTERROGATION NOTE: ${String(note.category || 'NOTE').toUpperCase()}] ${note.text} (Relevance: ${note.relevance || 'Evidentiary Lead'})`,
        tag: 'INTERROGATION'
      });
      snap.logs = snap.logs || [];
      snap.logs.unshift({
        id: 'log-note-' + Date.now(),
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        type: 'INTERROGATION',
        message: `SUBSTANTIVE NOTE PINNED: ${String(note.text || '').substring(0, 90)}...`,
        severity: 'info'
      });
    }
    this.saveState();
    this.bumpRev();
    return { ok: true, ...this.getFullBundle(caseId) };
  }

  public logLead(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');
    const { type = 'lead', targetId = '', text = '', summary = '', suspectName = 'Subject' } = body || {};
    snap.diary = snap.diary || [];
    snap.loggedLeads = snap.loggedLeads || [];
    const leadKey = `${type}:${targetId}:${text || summary}`;
    if (!snap.loggedLeads.includes(leadKey)) {
      snap.loggedLeads.push(leadKey);
      const tagType = String(type).toUpperCase();
      snap.diary.unshift({
        day: snap.day || 1,
        time: snap.time || new Date().toISOString().substring(11, 16),
        author: 'Investigating Officer',
        text: `[STATION DIARY §180 BNSS - ${tagType}] Examination of ${suspectName}: ${summary || text}`,
        tag: 'INTERROGATION'
      });
      snap.logs = snap.logs || [];
      snap.logs.unshift({
        id: 'log-lead-click-' + Date.now(),
        timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
        type: 'INTERROGATION',
        message: `LEAD INSPECTED & LOGGED: ${(summary || text).substring(0, 90)}`,
        severity: 'info'
      });
      this.saveState();
      this.bumpRev();
    }
    return { ok: true, ...this.getFullBundle(caseId) };
  }

  public executeRecovery(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const w1 = (body.witnessA || body.witness1 || '').trim();
    const w2 = (body.witnessB || body.witness2 || '').trim();

    const isSuspect = (name: string) => {
      if (!name) return false;
      const lower = name.toLowerCase().trim();
      return (snap.persons || []).some((p: any) =>
        (p.role === 'suspect' || p.role === 'accused' || p.is_culprit) &&
        (p.name || '').toLowerCase().trim().includes(lower)
      );
    };

    const hasTwoWitnesses = w1.length > 2 && w2.length > 2 && w1.toLowerCase() !== w2.toLowerCase();
    const suspectWitnessFound = isSuspect(w1) || isSuspect(w2);
    const isLawful = hasTwoWitnesses && !suspectWitnessFound;

    snap.recoveries = snap.recoveries || [];
    const leadId = Number(body.leadId);
    const linkedLead = (snap.leads || []).find((l: any) => l.id === leadId);

    const recItem = linkedLead?.recovery_item || body.item || 'Recovered instrument of offence';
    const recLoc = linkedLead?.recovery_grid || body.location || 'Scene vicinity';

    snap.recoveries.push({
      id: Date.now(),
      lead_id: leadId,
      item: recItem,
      location: recLoc,
      witness_a: w1,
      witness_b: w2,
      witnesses: [w1, w2],
      admissible_under_s23: isLawful,
      s23_valid: isLawful,
      status: isLawful ? 'witnessed_recovery_completed' : 'defective_recovery'
    });

    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: isLawful ? 'milestone' : 'deficiency',
      body: isLawful
        ? `PHYSICAL RECOVERY EFFECTED PURSUANT TO BSA s.23: Disclosed articles (${recItem}) recovered before two independent respectable witnesses (${w1}, ${w2}). Statement leading to discovery substantiated.`
        : `DEFECTIVE RECOVERY RECORDED under BSA s.23: Recovery of ${recItem} attempted without two distinct independent panch witnesses (${w1 || 'none'}, ${w2 || 'none'}). Inadmissible until cured.`,
      auto: 1,
      created_at: nowStr
    });

    this.crossSyncPlayerManualAction(caseId, 'recovery', body);
    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();
    return {
      ...this.getFullBundle(caseId),
      valid: isLawful,
      ok: isLawful,
      message: isLawful
        ? 'Physical recovery recorded lawfully before two independent witnesses pursuant to BSA s.23.'
        : 'Major Procedural Defect: Recovery lacks two distinct independent witnesses (BNSS s.103 / BSA s.23).'
    };
  }

  public draftChargeSheet(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    snap.chargeSheet = {
      narrative: body.narrative,
      accused: body.accused || [],
      witnesses: body.witnesses || [],
      sections: body.sections || snap.fir?.bns_sections || [],
      exhibits: body.exhibits || [],
      drafted_day: snap.day,
      status: 'draft'
    };

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();
    return this.getFullBundle(caseId);
  }

  public submitChargeSheet(caseId: number): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    snap.status = 'court';
    if (snap.chargeSheet) {
      snap.chargeSheet.status = 'submitted';
      snap.chargeSheet.submitted_day = snap.day;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'milestone',
      body: `CHARGE SHEET FILED under BNSS s.193 before the Court of the Chief Judicial Magistrate within the statutory ${snap.dayLimit}-day mandate.`,
      auto: 1,
      created_at: nowStr
    });

    if (snap.acts && snap.acts[6]) {
      snap.acts[6].done = 1;
      snap.acts[6].pct = 100;
      snap.acts[6].state = 'complete';
    }
    if (snap.acts && snap.acts[7]) {
      snap.acts[7].state = 'active';
    }

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();
    return this.getFullBundle(caseId);
  }

  public runTrial(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const finalArgument = body?.finalArgument || '';
    const primaryStrategy = body?.primaryStrategy || 'balanced';
    const evidenceFocus = body?.evidenceFocus || 'balanced';
    const witnessTactic = body?.witnessTactic || 'standard';

    const taintedCount = snap.readiness?.taintedCount || 0;
    const inadmissibleCount = snap.readiness?.inadmissibleCount || 0;
    let admissibleWeight = snap.readiness?.admissibleWeight || 0;
    const provableRecoveries = (snap.recoveries || []).filter((r: any) => r.s23_valid);
    const hasRecoveries = provableRecoveries.length > 0;

    // Strategy Adjustments
    let strategyBonus = 0;
    let strategyNotes: string[] = [];

    if (evidenceFocus === 's23_recovery') {
      if (hasRecoveries) {
        strategyBonus += 15;
        strategyNotes.push('Strategy Success: Leading with Section 23 BSA witnessed recoveries anchored the prosecution case firmly.');
      } else {
        strategyBonus -= 10;
        strategyNotes.push('Strategy Defect: Selected Section 23 BSA recovery focus, but no witnessed recovery was on record.');
      }
    } else if (evidenceFocus === 'digital_cdr') {
      if (inadmissibleCount === 0) {
        strategyBonus += 12;
        strategyNotes.push('Strategy Success: Digital CDR trail backed by BSA s.63 certificates proved decisive under judicial scrutiny.');
      } else {
        strategyBonus -= 15;
        strategyNotes.push('Strategy Penalty: Cyber evidence relied upon lacked Section 63 BSA dual-signature certification.');
      }
    } else if (evidenceFocus === 'forensic_dna') {
      strategyBonus += 10;
      strategyNotes.push('Strategy Success: Emphasized forensic laboratory analysis under BNSS s.329.');
    }

    if (witnessTactic === 'declare_hostile') {
      strategyBonus += 8;
      strategyNotes.push('Witness Handling: Proactively impeached hostile witness under BNSS s.180, neutralizing defence cross-examination.');
    } else if (witnessTactic === 'corroborate_panch') {
      if (taintedCount === 0) {
        strategyBonus += 10;
        strategyNotes.push('Witness Handling: Grounding case on two independent local panch witnesses satisfied judicial conscience.');
      } else {
        strategyBonus -= 12;
        strategyNotes.push('Witness Handling: Panch witness testimony collapsed due to defective search memos (BNSS s.103).');
      }
    }

    if (finalArgument.trim().length > 40) {
      strategyBonus += 5;
    }

    const effectiveAdmissibleWeight = admissibleWeight + strategyBonus;

    // Accepted exhibits (survivors)
    const survivors = (snap.exhibits || [])
      .filter((e: any) => e.seized && e.admissibility === 'admissible')
      .map((e: any) => ({
        exhibit: e.name,
        weight: e.weight || 20,
        reason: e.why || 'Seized under BNSS s.103 with two respectable panch witnesses; chain of custody intact (BSA s.57)'
      }));

    // Reasonable doubts analysis
    const reasonable_doubts: string[] = [];
    if (effectiveAdmissibleWeight < 120) {
      reasonable_doubts.push('Aggregate weight of admissible evidence is below the required threshold for conviction beyond reasonable doubt.');
    }
    if (taintedCount > 0) {
      reasonable_doubts.push(`${taintedCount} exhibit(s) were seized without independent witnesses in violation of BNSS s.103 and excluded from consideration.`);
    }
    if (inadmissibleCount > 0) {
      reasonable_doubts.push(`${inadmissibleCount} electronic record(s) lacked mandatory certification under BSA s.63.`);
    }
    if (!hasRecoveries) {
      reasonable_doubts.push('Confessional statements made in police custody failed the test of BSA s.23 as no subsequent physical recovery was substantiated.');
    }

    // Determine acquittal risk incorporating strategy
    const rawRisk = 95 - effectiveAdmissibleWeight / 2 - provableRecoveries.length * 8 + taintedCount * 12 + inadmissibleCount * 12;
    const acquittalRisk = Math.max(5, Math.min(95, rawRisk));

    let verdict = 'Conviction';
    let sentence = 'Sentenced to 5 years Rigorous Imprisonment under BNS ss. 309, 115, 61 with a fine of ₹25,000.';
    let judgmentSummary = 'Accused held guilty beyond reasonable doubt under BNS ss. 309, 115, 61.';
    
    const remarks: Array<{ issue: string; severity: string; detail: string; learn?: string; statute?: string }> = [];

    if (acquittalRisk > 60 || (taintedCount >= 2 && !hasRecoveries)) {
      verdict = 'Acquittal';
      sentence = 'Accused acquitted and set at liberty forthwith.';
      judgmentSummary = 'Benefit of doubt extended to the accused. The prosecution failed to establish guilt beyond reasonable doubt due to material procedural infractions.';
      this.player.acquittals = (this.player.acquittals || 0) + 1;
      this.player.standing = Math.max(20, (this.player.standing || 80) - 15);
      this.player.reputation = 'Investigation compromised by procedural errors';

      remarks.push({
        issue: 'Failure to comply with Search & Seizure mandates',
        severity: 'critical',
        detail: 'Exhibits seized without independent local witnesses (BNSS s.103) were rendered inadmissible, destroying the prosecution nexus.',
        learn: 'Always summon two independent panch witnesses and record contemporaneously under BNSS s.105.',
        statute: 'BNSS s.103 & BSA s.57'
      });
    } else if (acquittalRisk > 35) {
      verdict = 'Partial';
      sentence = 'Convicted under minor sections (BNS s.309 / 115); acquitted of conspiracy.';
      judgmentSummary = 'Partial conviction sustained. Major charges failed for lack of electronic record certificate under BSA s.63.';
      this.player.convictions = (this.player.convictions || 0) + 1;
      this.player.standing = Math.min(100, (this.player.standing || 80) + 5);
      this.player.reputation = 'Competent field officer with minor procedural gaps';

      if (inadmissibleCount > 0) {
        remarks.push({
          issue: 'Missing Electronic Record Certificate',
          severity: 'material',
          detail: 'Electronic records were excluded under BSA s.63 due to lack of hash verification and dual signatures.',
          learn: 'Procure BSA s.63 certificate from system in-charge and nodal cyber officer prior to charge sheet filing.',
          statute: 'BSA s.63 (formerly IEA 65B)'
        });
      }
    } else {
      verdict = 'Conviction';
      judgmentSummary = 'Accused held guilty beyond reasonable doubt. Complete chain of circumstantial and direct evidence established.';
      this.player.convictions = (this.player.convictions || 0) + 1;
      this.player.standing = Math.min(100, (this.player.standing || 80) + 12);
      this.player.reputation = 'Distinguished investigator, rigorous prosecutor';

      remarks.push({
        issue: 'Exemplary Chain of Custody & Statutory Compliance',
        severity: 'minor',
        detail: 'All exhibits strictly preserved with intact seal memos, independent witness panchnamas, and forensic corroboration.',
        learn: 'Maintain this standard for session trial integrity.',
        statute: 'BNSS s.103, 105 & BSA s.23, 57'
      });
    }

    if (strategyNotes.length) {
      remarks.push({
        issue: 'Prosecution Trial Strategy Evaluation',
        severity: 'info',
        detail: strategyNotes.join(' '),
        statute: 'BNSS s.313 / Oral Submissions'
      });
    }

    const judgmentText = `IN THE COURT OF THE SESSIONS JUDGE, PUNE\n` +
      `Special Trial Case № ${snap.caseNo || '2417/682'} / 2026\n` +
      `State of Maharashtra (through Crime Branch) versus Accused\n\n` +
      `JUDGMENT:\n` +
      `1. The prosecution submitted a formal charge sheet under Section 193 BNSS. Trial strategy executed: Focus (${primaryStrategy.toUpperCase()}), Lead Pillar (${evidenceFocus.toUpperCase()}), Witness Tactic (${witnessTactic.toUpperCase()}).\n\n` +
      `2. The court evaluated depositions under BNSS s.180/183, panchnamas, and admissible material. Aggregate effective weight of admissible proof stands at ${effectiveAdmissibleWeight} (Base: ${admissibleWeight}, Strategy Adjustment: ${strategyBonus > 0 ? '+' : ''}${strategyBonus}).\n\n` +
      `3. Evidence Evaluation & Strategy Impact:\n` +
      (strategyNotes.length ? `   - ${strategyNotes.join('\n   - ')}\n` : '') +
      (survivors.length > 0 
        ? `   - Exhibits admitted: ${survivors.map((s: any) => `${s.exhibit} (Weight: ${s.weight})`).join(', ')}.\n`
        : `   - No physical exhibits satisfied the strict threshold of admissible seizure.\n`) +
      (hasRecoveries 
        ? `   - Discovery disclosures under Section 23 BSA were corroborated by recovery memos executed in the presence of independent respectable witnesses.\n`
        : `   - Unwitnessed custodial statements were discarded in obedience to Section 23 BSA.\n`) +
      `\n4. Finding of the Court:\n` +
      `   ${judgmentSummary}\n\n` +
      `5. Order:\n` +
      `   ${sentence}`;

    this.player.casesClosed = (this.player.casesClosed || 0) + 1;
    snap.status = 'closed';
    snap.verdict = verdict;

    const analysis = this.buildTrialAnalysis(snap, verdict, sentence, judgmentSummary, acquittalRisk, finalArgument);

    const trialObj = {
      conducted: true,
      verdict,
      sentence,
      acquittal_risk: acquittalRisk,
      judgment: judgmentText,
      judgment_summary: judgmentSummary,
      argument_recorded: finalArgument,
      primaryStrategy,
      evidenceFocus,
      witnessTactic,
      survivors,
      remarks,
      reasonable_doubts,
      analysis,
      events: analysis,
      events_json: JSON.stringify(analysis)
    };

    snap.trial = trialObj;

    const cObj = this.cases.find(c => c.id === caseId || c.case_no === snap.caseNo);
    if (cObj) {
      cObj.status = 'closed';
      cObj.verdict = verdict;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'milestone',
      body: `JUDGMENT DELIVERED: ${verdict.toUpperCase()}. ${judgmentSummary}`,
      auto: 1,
      created_at: nowStr
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();
    const fullBundle = this.getFullBundle(caseId);
    return {
      ...fullBundle,
      verdict: trialObj,
      trial: trialObj
    };
  }

  public buildTrialAnalysis(snap: any, verdict?: string, sentence?: string, judgmentSummary?: string, acquittalRisk?: number, finalArgument?: string): any {
    const v = verdict || snap.trial?.verdict || snap.verdict || 'Conviction';
    const snt = sentence || snap.trial?.sentence || 'Sentenced according to law.';
    const admExhibits = (snap.exhibits || []).filter((e: any) => e.seized && e.admissibility === 'admissible');
    const admissibleCount = admExhibits.length;
    const admissibleWeight = snap.readiness?.admissibleWeight || admExhibits.reduce((acc: number, e: any) => acc + (e.weight || 20), 0);
    const taintedCount = snap.readiness?.taintedCount || (snap.exhibits || []).filter((e: any) => e.seized && e.admissibility === 'tainted').length;
    const inadmissibleCount = snap.readiness?.inadmissibleCount || (snap.exhibits || []).filter((e: any) => e.seized && e.admissibility === 'inadmissible').length;
    const custodyBreaks = (snap.exhibits || []).filter((e: any) => e.seized && !e.custodyIntact).length;
    const provableRecoveries = (snap.recoveries || []).filter((r: any) => r.s23_valid).length;
    const personsExamined = (snap.persons || []).filter((p: any) => p.statements && p.statements.length).length;
    const hostileCount = (snap.persons || []).filter((p: any) => (p.hostile_risk || 0) > 0.6).length;
    const accusedCount = (snap.persons || []).filter((p: any) => p.isAccused || p.role === 'suspect' || p.isCulprit).length || 1;

    let fatalDefects = 0;
    if (custodyBreaks > 0) fatalDefects++;
    if (taintedCount >= 2) fatalDefects++;
    if (inadmissibleCount >= 2 && admissibleWeight < 80) fatalDefects++;

    const chargedSections = (snap.chargeSheet && snap.chargeSheet.bns_sections) || (snap.fir && snap.fir.bns_sections) || ['BNS 309', 'BNS 115', 'BNS 61'];

    // 1. Factors
    const factors: any[] = [];
    
    // Group: Admissible evidence
    if (admissibleWeight >= 120) {
      factors.push({
        group: 'Admissible evidence',
        name: 'Aggregate proved weight',
        impact: 30,
        status: 'proved',
        detail: `The prosecution has marshalled ${admissibleCount} exhibit(s) for a cumulative weight of ${admissibleWeight}, exceeding the threshold for serious offences.`,
        statute: 'BSA — relevancy, proof and weight'
      });
    } else {
      factors.push({
        group: 'Admissible evidence',
        name: 'Aggregate proved weight',
        impact: -15,
        status: 'weak',
        detail: `Admissible weight of ${admissibleWeight} is thin and leaves reasonable doubt on core ingredients.`,
        statute: 'BSA — relevancy, proof and weight'
      });
    }

    // Group: Handling defects
    if (taintedCount === 0) {
      factors.push({
        group: 'Handling defects',
        name: 'Every seizure properly witnessed',
        impact: 6,
        status: 'proved',
        detail: 'No search or seizure on the file was conducted without two independent respectable inhabitants of the locality.',
        statute: 'BNSS s.103(4)'
      });
    } else {
      factors.push({
        group: 'Handling defects',
        name: 'Tainted seizures without independent panchas',
        impact: -(taintedCount * 8),
        status: 'weak',
        detail: `${taintedCount} exhibit(s) were seized without two independent local witnesses in violation of BNSS s.103.`,
        statute: 'BNSS s.103(4)'
      });
    }

    if (custodyBreaks === 0) {
      factors.push({
        group: 'Handling defects',
        name: 'Unbroken chain of custody',
        impact: 7,
        status: 'proved',
        detail: 'Every hand-off from scene to malkhana to judicial magistrate carries intact seal memos and register entries.',
        statute: 'BSA s.57'
      });
    } else {
      factors.push({
        group: 'Handling defects',
        name: 'Chain of custody broken',
        impact: -(custodyBreaks * 10),
        status: 'fatal',
        detail: `${custodyBreaks} physical exhibit(s) show gaps in malkhana transit, raising possibility of tampering.`,
        statute: 'BSA s.57'
      });
    }

    // Group: Electronic evidence certification
    if (inadmissibleCount === 0) {
      factors.push({
        group: 'Electronic records',
        name: 'Dual-certified electronic records',
        impact: 8,
        status: 'proved',
        detail: 'All digital records carry contemporaneous certificates with SHA-256 cryptographic hashes signed by the custodian and forensic analyst.',
        statute: 'BSA s.63'
      });
    } else {
      factors.push({
        group: 'Electronic records',
        name: 'Uncertified electronic records',
        impact: -(inadmissibleCount * 12),
        status: 'weak',
        detail: `${inadmissibleCount} electronic record(s) lack mandatory statutory certification under BSA s.63 and cannot be admitted.`,
        statute: 'BSA s.63'
      });
    }

    // Group: Disclosure & recovery
    if (provableRecoveries > 0) {
      factors.push({
        group: 'Disclosure & recovery',
        name: `${provableRecoveries} witnessed recovery/recoveries`,
        impact: provableRecoveries * 9,
        status: 'proved',
        detail: 'Information given by accused in police custody led directly to discovery of distinct concealed facts and physical evidence.',
        statute: 'BSA s.23'
      });
    } else {
      factors.push({
        group: 'Disclosure & recovery',
        name: 'No witnessed recovery under BSA s.23',
        impact: -10,
        status: 'weak',
        detail: 'No disclosure memo led to an independent recovery; custodial admissions are legally barred from proof.',
        statute: 'BSA s.23'
      });
    }

    // Group: Witnesses
    if (hostileCount > 0) {
      factors.push({
        group: 'Witnesses',
        name: 'Hostile witness risk',
        impact: -(hostileCount * 8),
        status: 'weak',
        detail: `${hostileCount} key prosecution witness(es) displayed marked contradictions against police case statements.`,
        statute: 'BSA s.141; s.155'
      });
    } else {
      factors.push({
        group: 'Witnesses',
        name: 'Steadfast prosecution witnesses',
        impact: 6,
        status: 'proved',
        detail: 'Witness depositions remained consistent during extensive cross-examination.',
        statute: 'BSA s.118'
      });
    }

    if (personsExamined >= 2) {
      factors.push({
        group: 'Witnesses',
        name: `${personsExamined} witness(es) cited & examined`,
        impact: 5,
        status: 'proved',
        detail: 'Multiple independent depositions corroborate the sequence of events and place of occurrence.',
        statute: 'BNSS s.180'
      });
    }

    // Group: Procedural regularities
    factors.push({
      group: 'Procedural regularities',
      name: 'FIR on record without delay',
      impact: 5,
      status: 'proved',
      detail: 'First Information Report promptly lodged under BNSS s.173, eliminating possibility of coloured version.',
      statute: 'BNSS s.173'
    });

    factors.push({
      group: 'The accused',
      name: 'Overt acts and conspiracy established',
      impact: v === 'Conviction' ? 6 : v === 'Partial' ? 2 : -8,
      status: v === 'Conviction' ? 'proved' : v === 'Partial' ? 'weak' : 'fatal',
      detail: v === 'Conviction' 
        ? 'Active complicity and meeting of minds proved beyond reasonable doubt.' 
        : 'Individual roles not cleanly differentiated in joint charge.',
      statute: 'BNS s.3(5); s.61(2)'
    });

    factors.push({
      group: 'The accused',
      name: 'Every accused afforded s.313 examination',
      impact: 4,
      status: 'proved',
      detail: 'Every incriminating circumstance was specifically put to the accused with full opportunity to explain.',
      statute: 'BNSS s.313'
    });

    // Group: Delay and adjournments
    const benchmarkDays = 40;
    const trialDays = 38 + (hostileCount * 4) + (admissibleCount > 4 ? 6 : 0);
    const adjournDays = Math.max(0, trialDays - benchmarkDays);
    factors.push({
      group: 'Delay and adjournments',
      name: 'Trial duration',
      impact: adjournDays > 10 ? -4 : 0,
      status: adjournDays > 10 ? 'weak' : 'proved',
      detail: `Trial concluded in ${trialDays} days against the statutory benchmark of ${benchmarkDays} days.`,
      statute: 'BNSS s.346'
    });

    // 2. Decision Ledger
    const rawSum = factors.reduce((sum, f) => sum + f.impact, 0);
    const fatalCap = fatalDefects >= 2 ? 35 : fatalDefects === 1 ? 55 : 100;
    const effectiveScore = Math.min(rawSum, fatalCap);
    const threshold = 45;
    const margin = effectiveScore - threshold;
    const risk = acquittalRisk != null ? Math.round(acquittalRisk) : (v === 'Conviction' ? 5 : v === 'Partial' ? 42 : 78);

    // 3. Stages
    const curDay = snap.day || 1;
    const stages = [
      {
        key: 'cognizance',
        name: 'Cognizance & framing of charges',
        statute: 'BNSS s.210, s.228',
        days: 5,
        fromDay: curDay + 1,
        toDay: curDay + 6,
        procedure: 'The court takes cognizance of the charge sheet, satisfies itself there is ground to proceed, and frames the charges the accused must answer.',
        note: 'A defective or delayed charge sheet is examined here first. Charges may be altered or dropped at this stage.'
      },
      {
        key: 'prosecution',
        name: 'Prosecution evidence (examination-in-chief)',
        statute: 'BSA s.118; BNSS s.230',
        days: Math.max(12, 14 + admissibleCount * 2),
        fromDay: curDay + 6,
        toDay: curDay + 6 + Math.max(12, 14 + admissibleCount * 2),
        procedure: 'The prosecution examines its witnesses in chief and marks its exhibits. Each electronic record must carry its s.63 certificate as it is tendered.',
        note: 'This is where an uncertified or tainted exhibit is exposed, because it cannot lawfully be marked.'
      },
      {
        key: 'cross',
        name: 'Cross-examination by the defence',
        statute: 'BSA s.140',
        days: Math.max(8, 10 + hostileCount * 3),
        fromDay: curDay + 6 + Math.max(12, 14 + admissibleCount * 2),
        toDay: curDay + 6 + Math.max(12, 14 + admissibleCount * 2) + Math.max(8, 10 + hostileCount * 3),
        procedure: 'Defence counsel tests every witness: omissions, contradictions, improvements and the chain of custody of every exhibit.',
        note: 'A hostile or inconsistent witness is broken here. Custody breaks are fatal at this stage.'
      },
      {
        key: 'defence',
        name: 'Defence evidence',
        statute: 'BNSS s.233',
        days: 5,
        fromDay: curDay + 28,
        toDay: curDay + 33,
        procedure: 'The accused may lead evidence, including a plea of alibi or a claim of a verifiable alibi contradicted by the prosecution record.',
        note: 'An unverified alibi on the file becomes a live doubt here.'
      },
      {
        key: 'accused',
        name: 'Examination of the accused',
        statute: 'BNSS s.313',
        days: 3,
        fromDay: curDay + 33,
        toDay: curDay + 36,
        procedure: 'The court puts the incriminating circumstances to each accused personally, and records their answers.',
        note: 'Material not put to the accused cannot be used to convict them.'
      },
      {
        key: 'arguments',
        name: 'Final arguments',
        statute: 'BNSS s.314',
        days: 5,
        fromDay: curDay + 36,
        toDay: curDay + 41,
        procedure: 'Prosecution and defence address the court on the evidence, the presumptions, and the applicable sections.',
        note: "Counsel's written summary of arguments forms part of this."
      },
      {
        key: 'judgment',
        name: 'Judgment',
        statute: 'BNSS s.392',
        days: 3,
        fromDay: curDay + 41,
        toDay: curDay + 44,
        procedure: 'The court delivers a reasoned judgment, either convicting or acquitting, and states the points for determination with its findings.',
        note: 'Every accused is entitled to the benefit of reasonable doubt.'
      }
    ];

    // 4. Findings
    const secNameMap: Record<string, string> = {
      'BNS 303': 'Theft',
      'BNS 309': 'Robbery',
      'BNS 115': 'Voluntarily causing hurt',
      'BNS 61': 'Criminal conspiracy',
      'BNS 316': 'Criminal breach of trust',
      'BNS 318': 'Cheating',
      'BNS 101': 'Culpable homicide not amounting to murder',
      'IT Act 66': 'Computer-related offences',
      'NDPS 8/21': 'Offences relating to narcotic drugs'
    };

    const findings = chargedSections.map((secStr: string, idx: number) => {
      const offName = secNameMap[secStr] || 'Offence under the charge sheet';
      let finding = 'proved';
      let basis = 'The ingredients of the offence are established beyond reasonable doubt by unimpeached admissible testimony, forensic corroboration and witnessed recovery.';

      if (v === 'Acquittal') {
        finding = 'not proved';
        basis = 'The prosecution failed to substantiate the statutory ingredients on admissible evidence. Benefit of reasonable doubt extended to the accused.';
      } else if (v === 'Partial') {
        if (idx === 0) {
          finding = 'partly proved';
          basis = 'Substantive act proved, but aggravated ingredients lacked corroborating electronic certificates under BSA s.63.';
        } else if (secStr.includes('61')) {
          finding = 'not proved';
          basis = 'Meeting of minds not established by independent evidence; criminal conspiracy charge fails.';
        } else {
          finding = 'proved';
          basis = 'Minor offence ingredients fully satisfied by contemporaneous seizure and eyewitness identification.';
        }
      }

      return {
        section: secStr,
        offence: offName,
        finding,
        basis
      };
    });

    // 5. Analytics
    const analytics = {
      proofScore: effectiveScore,
      threshold,
      acquittalRisk: risk,
      admissibleWeight,
      admissibleCount,
      rejectedCount: inadmissibleCount + (snap.readiness?.unverifiedCount || 0),
      taintedCount,
      uncertifiedCount: inadmissibleCount,
      custodyBreaks,
      provableRecoveries,
      witnessesExamined: personsExamined,
      hostileCount,
      accusedCount,
      fatalDefects,
      trialDays,
      rawSum,
      fatalCap,
      effectiveScore,
      margin,
      benchmarkDays,
      adjournDays
    };

    // 6. Reasoned order
    const reasonInLaw = v === 'Conviction'
      ? 'The chain of circumstantial evidence is complete and incapable of explanation on any other reasonable hypothesis than that of the guilt of the accused (BSA s.3). Direct recoveries under BSA s.23 and corroborative depositions withstand defence scrutiny.'
      : v === 'Partial'
        ? 'While the charge under the primary section lacks forensic corroboration due to evidentiary deficiencies, the lesser offences stand established beyond reasonable doubt under BNSS s.245.'
        : 'The prosecution has failed to establish the foundational facts beyond reasonable doubt. Fatal procedural lapses in search and seizure under BNSS s.103 and exclusion of uncertified electronic records under BSA s.63 entitle the accused to the benefit of doubt.';

    return {
      stages,
      factors,
      findings,
      analytics,
      sentence: snt,
      reasonInLaw
    };
  }

  public postSystemMessageToThread(threadId: number, senderName: string, bodyText: string): void {
    const threadData = this.chatThreads.get(threadId) || {
      thread: this.threads.find(t => t.id === threadId) || { id: threadId, title: senderName, kind: 'assistant' },
      messages: []
    };
    threadData.messages = threadData.messages || [];

    const last = threadData.messages[threadData.messages.length - 1];
    if (last && last.body === bodyText && (Date.now() - new Date(last.created_at).getTime() < 3000)) {
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const msg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      thread_id: threadId,
      sender: senderName,
      role: 'npc',
      body: bodyText,
      effect_json: null,
      created_at: nowStr
    };
    threadData.messages.push(msg);

    if (threadData.thread) {
      threadData.thread.last_at = nowStr;
      threadData.thread.unread = (threadData.thread.unread || 0) + 1;
    }
    const masterThread = this.threads.find(t => t.id === threadId);
    if (masterThread) {
      masterThread.last_at = nowStr;
      masterThread.unread = (masterThread.unread || 0) + 1;
    }
    this.chatThreads.set(threadId, threadData);
    this.bumpRev();
  }

  public notifyChatForCase(caseId: number, opts: { sender?: string; body: string; targetKinds?: string[]; memberId?: number }): void {
    const targetKinds = opts.targetKinds || ['case', 'assistant'];
    for (const t of this.threads) {
      let shouldSend = false;
      if (opts.targetKinds && opts.targetKinds.includes(t.kind)) shouldSend = true;
      if (t.kind === 'case' && t.case_id === caseId && targetKinds.includes('case')) shouldSend = true;
      if (opts.memberId && t.member_id === opts.memberId) shouldSend = true;

      if (shouldSend) {
        const sender = opts.sender || (t.kind === 'case' ? 'Squad Desk' : t.title || 'Investigating Squad');
        this.postSystemMessageToThread(t.id, sender, opts.body);
      }
    }
  }

  private checkAssignmentsAndLabs(snap: any): void {
    if (!snap) return;
    const currentDay = snap.day || 1;

    // 1. Check running assignments
    if (snap.assignments && snap.assignments.length) {
      for (const a of snap.assignments) {
        if (a.status === 'running' && currentDay >= a.due_day && !a.debrief_sent) {
          a.status = 'completed';
          a.debrief_sent = true;
          const m = this.team.find((tm: any) => tm.name === a.member || tm.id === a.member_id);
          if (m) {
            m.busy_until_day = null;
            m.current_task = null;
          }

          // Apply backend updates matching manual player execution
          const descLower = (a.description || '').toLowerCase();
          const typeLower = (a.task_type || '').toLowerCase();

          if (typeLower.includes('scene') || descLower.includes('scene') || descLower.includes('seiz') || descLower.includes('eviden') || descLower.includes('analys') || descLower.includes('analyz')) {
            if (snap.scene) {
              snap.scene.walkthrough = true;
              snap.scene.cordoned = true;
              snap.scene.sealed = true;
              snap.scene.photographed = true;
              snap.scene.diagrammed = true;
              snap.scene.canvassed = true;
            }
            if (snap.case) {
              snap.case.walkthrough = true;
            }
            if (snap.exhibits && Array.isArray(snap.exhibits)) {
              snap.exhibits.forEach((e: any) => {
                e.seized = true;
                e.status = 'seized';
                e.seized_day = currentDay;
              });
            }
          }

          if (typeLower.includes('lab') || descLower.includes('lab') || descLower.includes('cctv') || descLower.includes('ballistic') || descLower.includes('dna') || descLower.includes('forensic')) {
            if (snap.labRequests && Array.isArray(snap.labRequests)) {
              snap.labRequests.forEach((lr: any) => {
                lr.status = 'ready';
              });
            }
          }

          // Mark corresponding directive in queue as completed
          let matchingDir: any = null;
          if (snap.directiveQueue && Array.isArray(snap.directiveQueue)) {
            matchingDir = snap.directiveQueue.find((d: any) => d.memberName === a.member && d.status === 'running');
            if (matchingDir) {
              matchingDir.status = 'completed';
              if (matchingDir.subTasks) {
                matchingDir.subTasks.forEach((st: any) => st.status = 'completed');
              }
            }
          }

          // Task 3.1: Emit in-thread NPC follow-up debrief message with radio squelch alert and deep links
          const memberName = a.member || (m ? m.name : 'Squad Officer');
          let followUpMsg = '';
          const activePerson = (snap?.persons || []).find((p: any) => p.in_chamber) ||
            (snap?.persons || []).find((p: any) => p.role === 'suspect' || p.isAccused || p.isCulprit) ||
            (snap?.persons || [])[0];

          if (typeLower.includes('interrogat') || descLower.includes('interrogat') || descLower.includes('suspect') || descLower.includes('witness') || descLower.includes('escort')) {
            const pName = activePerson ? activePerson.name : 'the subject';
            const pLink = activePerson ? `[Open Interrogation: ${pName}](go:interrogation:${activePerson.id})` : `[Open Interrogation Room](go:interrogation)`;
            const pStmt = activePerson?.statement ? `\n• Statement Recorded: "${activePerson.statement.substring(0, 110)}..."` : `\n• Statutory Compliance: Served Section 35 BNSS notice and recorded examination under BNSS s.180.`;
            followUpMsg = `Sir! Interrogation assignment completed: "${a.description}".\n• Subject: ${pName}${pStmt}\n• Status: Accused/Subject secured in Room 04. ${pLink}`;
          } else if (typeLower.includes('seiz') || descLower.includes('seiz') || descLower.includes('exhibit') || descLower.includes('malkhana') || descLower.includes('eviden')) {
            followUpMsg = `Sir! Evidence seizure completed: "${a.description}". Physical exhibits have been formally seized before two independent panch witnesses under BNSS s.103 and catalogued in the Malkhana register: [View Malkhana Register](go:malkhana) · [View Evidence Board](go:board)`;
          } else if (typeLower.includes('lab') || descLower.includes('lab') || descLower.includes('cctv') || descLower.includes('cyber') || descLower.includes('forensic')) {
            followUpMsg = `Sir! Laboratory follow-up completed: "${a.description}". Forensic analysis and digital certification under BNSS s.329 / BSA s.63 are finalized: [View Forensic Lab](go:labs)`;
          } else if (typeLower.includes('scene') || descLower.includes('scene') || descLower.includes('canvass')) {
            followUpMsg = `Sir! Crime scene assignment completed: "${a.description}". Forensic walkthrough, photography, and spot diagramming under BNSS s.176 are complete: [Inspect Crime Scene](go:scene)`;
          } else {
            followUpMsg = `Sir! Assignment completed: "${a.description}". Field operations and procedural documentation have been synchronized with HQ: [View Evidence Board](go:board)`;
          }

          const targetThread = (this.threads || []).find((t: any) => 
            (a.member_id && Number(t.member_id) === Number(a.member_id)) ||
            (t.title && t.title.toLowerCase() === memberName.toLowerCase()) ||
            (memberName.toLowerCase().includes('ravi') && t.kind === 'assistant')
          );
          const threadId = targetThread ? targetThread.id : 1;
          const threadData = this.chatThreads.get(threadId) || {
            thread: targetThread || { id: threadId, title: memberName, kind: 'assistant' },
            messages: []
          };
          threadData.messages = threadData.messages || [];
          const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
          const debriefMsg = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            thread_id: threadId,
            sender: memberName,
            role: 'npc',
            body: followUpMsg,
            directive_json: JSON.stringify(matchingDir || null),
            effect_json: JSON.stringify({ completed: true, squelch: true, assignmentId: a.id }),
            created_at: nowStr
          };
          threadData.messages.push(debriefMsg);
          if (threadData.thread) {
            threadData.thread.last_at = nowStr;
            threadData.thread.unread = (threadData.thread.unread || 0) + 1;
          }
          this.chatThreads.set(threadId, threadData);

          const caseThread = (this.threads || []).find((t: any) => t.kind === 'case' && t.case_id === snap.caseId);
          if (caseThread && caseThread.id !== threadId) {
            this.postSystemMessageToThread(caseThread.id, memberName, followUpMsg);
          }

          // Case diary filing
          snap.diary = snap.diary || [];
          snap.diary.unshift({
            day: currentDay,
            time: '17:00',
            author: memberName,
            text: `Assignment completed: "${a.description}". Statutory documentation and findings filed in docket.`,
            tag: 'INVESTIGATION'
          });

          // Check if there are queued directives for this member to promote
          if (snap.directiveQueue && Array.isArray(snap.directiveQueue)) {
            const nextQueuedDir = snap.directiveQueue.find((d: any) => (d.memberName === a.member || d.memberId === a.member_id) && d.status === 'queued');
            if (nextQueuedDir) {
              nextQueuedDir.status = 'running';
              if (nextQueuedDir.subTasks && nextQueuedDir.subTasks.length) {
                nextQueuedDir.subTasks[0].status = 'running';
              }
              const duration = (nextQueuedDir.dueDay && nextQueuedDir.startDay) ? (nextQueuedDir.dueDay - nextQueuedDir.startDay) : 1;
              const nextDueDay = currentDay + Math.max(1, duration);
              
              const promotedAssign = {
                id: Date.now() + Math.floor(Math.random() * 1000),
                case_id: snap.caseId,
                player_id: this.player.id,
                member_id: a.member_id,
                task_type: 'field_directive',
                target_ref: null,
                description: nextQueuedDir.playerInstruction || 'Queued Task',
                days_cost: duration,
                start_day: currentDay,
                due_day: nextDueDay,
                status: 'running',
                result_json: { directive: nextQueuedDir },
                created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
                member: a.member
              };

              snap.assignments.push(promotedAssign);

              if (m) {
                m.busy_until_day = nextDueDay;
                m.current_task = promotedAssign.description;
              }
            }
          }
        }
      }
    }

    // 2. Check pending lab requests
    if (snap.labRequests && snap.labRequests.length) {
      for (const lr of snap.labRequests) {
        if (lr.status === 'pending' && currentDay >= (lr.expected_day || lr.expectedDay || 1)) {
          lr.status = 'ready';
          const fslThread = this.threads.find(t => t.kind === 'fsl');
          if (fslThread) {
            this.postSystemMessageToThread(
              fslThread.id,
              'FSL Liaison Desk',
              `FSL Laboratory Analysis Complete: Forensic findings for **${lr.test_name || lr.test_code}** are ready to collect. Requisitions logged in the Forensic Lab.`
            );
          }
        }
      }
    }
  }

  public buildRichCaseContext(activeCase: any): string {
    if (!activeCase) return 'No active case loaded.';

    const dayInfo = `Day ${activeCase.day || 1} of ${activeCase.dayLimit || 60} (Current Status: ${activeCase.status || 'Active'})`;
    const firInfo = activeCase.fir ? `FIR No: ${activeCase.fir.fir_no}, Complainant: ${activeCase.fir.informant}, Offence: ${(activeCase.fir.bns_sections || []).join(', ')}` : 'FIR pending';
    
    const sceneInfo = activeCase.scene ? `Crime Scene Steps: Walkthrough:${activeCase.scene.walkthrough ? 'DONE' : 'PENDING'}, Cordoned:${activeCase.scene.cordoned ? 'DONE' : 'PENDING'}, Sealed:${activeCase.scene.sealed ? 'DONE' : 'PENDING'}, Photographed:${activeCase.scene.photographed ? 'DONE' : 'PENDING'}, Diagrammed:${activeCase.scene.diagrammed ? 'DONE' : 'PENDING'}, Canvassed:${activeCase.scene.canvassed ? 'DONE' : 'PENDING'}` : '';

    const exhibitsInfo = (activeCase.exhibits || []).map((e: any) => 
      `- Exhibit ${e.exhibitNo} (${e.name}): Seized:${e.seized ? 'YES' : 'NO'}, Tainted:${e.taintReasons?.length ? 'YES (' + e.taintReasons.join('; ') + ')' : 'NO'}, s.63 Cert:${e.s63Certified ? 'VALID' : (e.isDigital ? 'REQUIRED' : 'N/A')}, Lab Status:${e.labStatus || 'none'}`
    ).join('\n');

    const personsInfo = (activeCase.persons || []).map((p: any) => 
      `- Person ${p.name} (${p.role}): Statement Recorded:${p.statementRecorded ? 'YES' : 'NO'}, Arrested:${p.arrested ? 'YES' : 'NO'}, Alibi:${p.alibiVerified ? 'VERIFIED' : p.alibi || 'Unverified'}`
    ).join('\n');

    const disclosuresInfo = (activeCase.leads || []).map((l: any) => 
      `- Lead/Disclosure: "${l.disclosure_text || l.text || l.item}" from ${l.person || 'Suspect'} -> Followed/Recovered:${l.followed ? 'YES' : 'NO'}`
    ).join('\n');

    const recoveriesInfo = (activeCase.recoveries || []).map((r: any) => 
      `- Recovery: "${r.item || r.recovery_item}" at ${r.grid || r.recovery_grid} (Witnessed:${r.witnessed ? 'YES' : 'NO'})`
    ).join('\n');

    const labsInfo = (activeCase.labRequests || []).map((lr: any) => 
      `- Lab Requisition: ${lr.test_name || lr.test_code} for Ex. ${lr.exhibit_id} -> Status:${lr.status || 'pending'} (Expected Day:${lr.expected_day})`
    ).join('\n');

    const assignmentsInfo = (activeCase.assignments || []).map((a: any) => 
      `- Assignment: ${a.member} -> "${a.description || a.task_type}", Status:${a.status}, Due Day:${a.due_day}`
    ).join('\n');

    return `
=== CURRENT CASE REAL-TIME STATE ===
Case: #${activeCase.caseNo} - "${activeCase.title}"
Timeline: ${dayInfo}
${firInfo}

Crime Scene Processing:
${sceneInfo}

Exhibits & Seizures:
${exhibitsInfo || 'None seized.'}

Suspects & Persons:
${personsInfo || 'None recorded.'}

Disclosures (BSA s.23):
${disclosuresInfo || 'None recorded.'}

Physical Recoveries:
${recoveriesInfo || 'None executed.'}

Laboratory Requisitions:
${labsInfo || 'No lab requisitions.'}

Active Squad Assignments:
${assignmentsInfo || 'No active assignments.'}
===================================
`.trim();
  }

  public assignTask(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) throw new Error('Case not found');

    const memberId = Number(body.memberId);
    const taskType = body.taskType || 'canvass';
    const description = body.description || 'Assigned task';
    const daysCost = Number(body.daysCost || 1);

    const teamMember = this.team.find((m: any) => m.id === memberId) || this.team.find((m: any) => m.name === body.memberName);
    const memberName = teamMember ? teamMember.name : 'Officer';

    const dueDay = snap.day + daysCost;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const memberThread = this.threads.find(t => t.member_id === memberId || t.title === memberName || (t.kind === 'assistant' && memberName.includes('Ravi')));
    const threadId = memberThread ? memberThread.id : 1;

    const descLower = description.toLowerCase();
    const isStatementTask = taskType === 'interrogation' || /\b(statement|statements|witness|witnesses|accused|suspect|suspects|interrogat|interrogate|question|interview|alibi|confession|disclosure|inquir)\b/i.test(descLower) || (/\b(gather|collect|record|take|get)\b/i.test(descLower) && /\b(statement|statements|testimony|intel|information|alibi|facts)\b/i.test(descLower));
    const isLabTask = taskType === 'collect_report' || taskType.includes('lab') || /\b(lab|labs|fsl|forensic|forensics|ballistic|ballistics|dna|fingerprint|fingerprints|autopsy|postmortem|toxicology|chemical|serology)\b/i.test(descLower);
    const isCyberTask = taskType === 'device_image' || taskType === 'cdr_pull' || /\b(cctv|camera|footage|cdr|phone|mobile|device|electronic|cyber|imei|ip\s*address|hard\s*drive|laptop|s\.?63|cert\s*63|hash)\b/i.test(descLower);
    const isSeizureTask = taskType === 'seizure' || /\b(seize|seizure|panch|panchanama|malkhana|exhibit|exhibits|recovery\s*memo|custody\s*chain|confiscat)\b/i.test(descLower) || (/\b(gather|collect|recover)\b/i.test(descLower) && /\b(evidence|weapon|knife|gun|cash|goods|property|item|article)\b/i.test(descLower));
    const isSceneTask = taskType === 'scene_processing' || /\b(scene|cordon|cordoning|walkthrough|grid|spot|photograph|photography|diagram|sketch|seal|canvass|perimeter)\b/i.test(descLower);

    const legalCtx = isStatementTask ? 'BNSS s.180 Examination of Witnesses & Accused' :
      isCyberTask ? 'BSA s.63 / Digital Evidence Chain of Custody' :
      isLabTask ? 'BNSS s.329 / FSL Requisition Protocol' :
      isSeizureTask ? 'BNSS s.103 Seizure & Panch Rules' :
      isSceneTask ? 'BNSS s.176 Crime Scene Inspection' :
      'BNSS Procedural Assignment & Compliance';

    const directivePayload = {
      id: 'dir_assign_' + Date.now(),
      memberId: memberId,
      memberName: memberName,
      playerInstruction: description,
      threadId: threadId,
      timeCostDays: daysCost,
      aiThinking: {
        parsedGoal: description,
        legalContext: legalCtx,
        thoughtProcessSteps: [
          `Received directive for team member ${memberName}: "${description}".`,
          `Verified team appointment, procedural bandwidth, and statutory authority.`,
          `Formulated multi-step operational workflow with expected completion by Day ${dueDay}.`
        ]
      },
      subTasks: [
        {
          id: 'sub-1-' + Date.now(),
          title: 'Prerequisite Resolution & Statutory Verification',
          description: isStatementTask ? 'Verify accused custody status, legal representation rights (BNSS s.38), and witness availability.' :
            isCyberTask ? 'Verify camera/device custodian identity and serve statutory notice under BNSS s.94.' :
            isLabTask ? 'Prepare formal FSL requisition docket and verify tamper-proof seal integrity.' :
            isSceneTask ? 'Verify perimeter cordon integrity and establish safe entry corridor under BNSS s.176.' :
            isSeizureTask ? 'Summon two independent, respectable local panch witnesses and initiate BNSS s.105 videography.' :
            `Verify jurisdictional authority, procedural rules, and equipment for ${description}.`,
          targetScope: isStatementTask ? 'witnesses' : isCyberTask ? 'cyber' : isLabTask ? 'labs' : (isSceneTask || isSeizureTask) ? 'scene' : 'procedure',
          status: 'completed',
          timeCostDays: 0,
          requiresTimer: false
        },
        {
          id: 'sub-2-' + Date.now(),
          title: 'Field Execution & Evidence Collection',
          description: description,
          targetScope: isStatementTask ? 'witnesses' : isCyberTask ? 'cyber' : isLabTask ? 'labs' : isSeizureTask ? 'exhibits' : isSceneTask ? 'scene' : 'field',
          status: 'running',
          timeCostDays: daysCost,
          requiresTimer: true
        },
        {
          id: 'sub-3-' + Date.now(),
          title: 'Legal Compliance & Case Diary Filing',
          description: isStatementTask ? 'Record Section 180 BNSS statement, certify voluntariness, execute Section 23 BSA disclosure memo before witnesses, and log in Case Diary.' :
            isCyberTask ? 'Obtain bit-stream clone, compute SHA-256 hash, and execute mandatory BSA Section 63 certificate.' :
            isLabTask ? 'Procure government scientific expert report under BNSS s.329 and file in Case Diary.' :
            isSceneTask ? 'Complete 4-quadrant crime scene spot map, record observation notes under BNSS s.176, and seal scene.' :
            isSeizureTask ? 'File BNSS s.103 seizure memo, update Malkhana registry, and record Case Diary entry.' :
            'Document procedural steps under BNSS s.172 and prepare official case diary extract.',
          targetScope: 'diary',
          status: 'pending',
          timeCostDays: 0,
          requiresTimer: false
        },
        {
          id: 'sub-4-' + Date.now(),
          title: 'Pro-active Player Update & Case Diary Sync',
          description: isStatementTask ? 'Transcribe statement notes, formalize disclosure records, and notify Investigating Officer in chat thread.' :
            isCyberTask ? 'Verify digital hash integrity, log in digital registry, and notify Investigating Officer in chat thread.' :
            isLabTask ? 'Correlate forensic findings, update admissibility ratings on Evidence Board, and notify Investigating Officer in chat thread.' :
            isSceneTask ? 'Synchronize scene photographs, compile crime scene log, and notify Investigating Officer in chat thread.' :
            isSeizureTask ? 'Update Malkhana register, preserve chain of custody, and notify Investigating Officer in chat thread.' :
            'Compile field findings, synchronize case records, and notify Investigating Officer in chat thread.',
          targetScope: 'chat',
          status: 'pending',
          timeCostDays: 0,
          requiresTimer: false
        }
      ],
      status: 'running',
      createdDay: snap.day,
      startDay: snap.day,
      dueDay
    };

    const newAssign = {
      id: Date.now(),
      case_id: snap.caseId,
      player_id: body.playerId || this.player.id,
      member_id: memberId,
      task_type: taskType,
      target_ref: null,
      description,
      days_cost: daysCost,
      start_day: snap.day,
      due_day: dueDay,
      status: 'running',
      result_json: { auto_resolved_prerequisites: true, directive: directivePayload },
      created_at: nowStr,
      member: memberName
    };

    snap.directiveQueue = snap.directiveQueue || [];
    snap.directiveQueue.push(directivePayload);

    snap.assignments = snap.assignments || [];
    snap.assignments.push(newAssign);

    if (teamMember) {
      teamMember.busy_until_day = dueDay;
      teamMember.current_task = description;
    }

    // Advance case day to represent passing of time and procedural friction
    snap.day = Math.min(snap.day + daysCost, snap.dayLimit);
    snap.daysLeft = Math.max(0, snap.dayLimit - snap.day);
    snap.clockPct = Math.round((snap.day / snap.dayLimit) * 100);

    // Run task resolution update immediately for the advanced day
    this.checkAssignmentsAndLabs(snap);

    this.postSystemMessageToThread(
      threadId,
      memberName,
      `Understood, Officer. I have taken up the assignment: "${description}". Cost: ${daysCost} day(s). I will report back on Day ${dueDay}. [View Team & Assignments](go:team)`
    );

    const squadThread = this.threads.find(t => t.kind === 'case' && t.case_id === caseId);
    if (squadThread && squadThread.id !== threadId) {
      this.postSystemMessageToThread(
        squadThread.id,
        'Squad Desk',
        `Assignment Launched: **${memberName}** assigned to "${description}" (Due Day ${dueDay}). [View Team](go:team)`
      );
    }

    snap.diary.unshift({
      id: Date.now(),
      case_id: snap.caseId,
      day: snap.day,
      entry_type: 'procedural',
      body: `Task assigned to ${memberName}: "${description}". Due on Day ${dueDay}.`,
      auto: 1,
      created_at: nowStr
    });

    this.recalculateCaseReadiness(snap);
    this.bumpRev();

    return {
      dueDay,
      assignment: newAssign,
      ...this.getFullBundle(caseId)
    };
  }

  public applyDirectiveStepEffects(snap: any, dir: any, subTask: any, memberName: string) {
    if (!snap || !subTask) return;
    const taskLower = ((dir?.playerInstruction || '') + ' ' + (subTask?.description || '') + ' ' + (subTask?.title || '')).toLowerCase();
    const scope = subTask.targetScope || '';

    // 1. Scene Processing
    if (scope === 'scene' || taskLower.includes('cordon') || taskLower.includes('walkthrough') || taskLower.includes('scene') || taskLower.includes('spot') || taskLower.includes('photograph') || taskLower.includes('diagram') || taskLower.includes('canvass') || taskLower.includes('seal')) {
      if (snap.scene) {
        snap.scene.cordoned = true;
        snap.scene.walkthrough = true;
        if (taskLower.includes('photo') || taskLower.includes('core') || taskLower.includes('sweep') || taskLower.includes('evidence')) snap.scene.photographed = true;
        if (taskLower.includes('diag') || taskLower.includes('grid') || taskLower.includes('core') || taskLower.includes('evidence')) snap.scene.diagrammed = true;
        if (taskLower.includes('canvass') || taskLower.includes('witness')) snap.scene.canvassed = true;
        if (taskLower.includes('seal') || taskLower.includes('close') || taskLower.includes('finish') || taskLower.includes('file')) snap.scene.sealed = true;
      }
    }

    // 2. Exhibits & Evidence Seizure
    if (scope === 'exhibits' || taskLower.includes('exhibit') || taskLower.includes('evidence') || taskLower.includes('seiz') || taskLower.includes('find') || taskLower.includes('gather') || taskLower.includes('collect') || taskLower.includes('recover') || taskLower.includes('sweep') || taskLower.includes('cutter') || taskLower.includes('bag') || taskLower.includes('weapon') || taskLower.includes('malkhana')) {
      (snap.exhibits || []).forEach((e: any) => {
        e.found = true;
        e.seized = true;
        e.tainted = false;
        e.admissibility = 'admissible';
        e.seizureValid = true;
        e.seizureMethod = 'Section 105 BNSS videographed seizure';
        e.panchas = (e.panchas && e.panchas.length >= 2) ? e.panchas : ['Panch 1 (Local Independent Trader)', 'Panch 2 (Independent Resident)'];
        e.admissibilityNotes = 'Seized before two independent panch witnesses under BNSS s.103 with videography (BNSS s.105).';
        e.weight = e.isDigital ? 30 : 25;
        if (e.isDigital) {
          e.s63Certified = true;
          e.s63_certified = true;
          e.hasCert63 = true;
          e.s63SignerA = memberName || 'JC Ravi Deshmukh';
          e.s63SignerB = 'Digital Forensics Specialist';
        }
        e.custodyChain = e.custodyChain || [];
        if (!e.custodyChain.some((c: any) => c.action && c.action.includes('BNSS s.103'))) {
          e.custodyChain.push({
            date: new Date().toISOString().substring(0, 10),
            handler: memberName || 'Squad Member',
            action: 'Validly seized and deposited into Malkhana under BNSS s.103'
          });
        }
      });
    }

    // 3. Labs / Forensics
    if (scope === 'lab' || taskLower.includes('lab') || taskLower.includes('fsl') || taskLower.includes('forensic') || taskLower.includes('ballistic') || taskLower.includes('dna') || taskLower.includes('fingerprint') || taskLower.includes('cctv') || taskLower.includes('cyber') || taskLower.includes('cdr')) {
      (snap.labRequests || []).forEach((lr: any) => {
        lr.status = 'ready';
        lr.result = lr.result || 'Forensic analysis completed with matching ballistic/digital signature.';
      });
      (snap.exhibits || []).forEach((e: any) => {
        if (e.labStatus || e.isDigital) {
          e.labStatus = 'collected';
          e.labResult = 'Forensic laboratory report confirmed admissible.';
          e.weight = (e.weight || 25) + 10;
        }
      });
    }

    // 4. Persons / Statements / Interrogations
    if (scope === 'person' || taskLower.includes('interrogat') || taskLower.includes('statement') || taskLower.includes('witness') || taskLower.includes('suspect') || taskLower.includes('examine') || taskLower.includes('alibi')) {
      (snap.persons || []).forEach((p: any) => {
        p.examined = true;
        p.statementRecorded = true;
        p.statement = p.statement || `Detailed statement recorded under Section 180 BNSS by ${memberName}.`;
        if (p.role === 'suspect' || p.category === 'suspect') {
          p.interrogated = true;
        }
      });
      snap.recoveries = snap.recoveries || [];
      if (snap.recoveries.length === 0) {
        snap.recoveries.push({
          id: Date.now(),
          title: 'Section 23 BSA Corroborative Recovery',
          description: 'Locatable weapon/article recovered pursuant to accused disclosure before two independent witnesses.',
          s23_valid: true,
          witnesses: ['Independent Witness A', 'Independent Witness B'],
          weight: 30
        });
      }
    }
  }

  public applyDirectiveCompletionEffects(snap: any, dir: any, memberName: string) {
    if (!snap) return;
    const taskLower = (dir?.playerInstruction || '').toLowerCase();

    const isStatementOrWitness = /\b(statement|statements|witness|witnesses|accused|suspect|suspects|interrogat|interrogate|question|interview|alibi|confession|disclosure|inquir)\b/i.test(taskLower) || (/\b(gather|collect|record|take|get)\b/i.test(taskLower) && /\b(statement|statements|testimony|intel|information|alibi|facts)\b/i.test(taskLower));
    const isDigitalOrCyber = /\b(cctv|camera|footage|cdr|phone|mobile|device|electronic|cyber|imei|ip\s*address|hard\s*drive|laptop|s\.?63|cert\s*63|hash)\b/i.test(taskLower);
    const isLab = /\b(lab|labs|fsl|forensic|forensics|ballistic|ballistics|dna|fingerprint|fingerprints|autopsy|postmortem|toxicology|chemical|serology)\b/i.test(taskLower);
    const isScene = /\b(scene|cordon|cordoning|walkthrough|grid|spot|photograph|photography|diagram|sketch|seal|canvass|perimeter)\b/i.test(taskLower);
    const isSeizure = /\b(seize|seizure|panch|panchanama|malkhana|exhibit|exhibits|recovery\s*memo|custody\s*chain|confiscat)\b/i.test(taskLower) || (/\b(gather|collect|recover)\b/i.test(taskLower) && /\b(evidence|weapon|knife|gun|cash|goods|property|item|article)\b/i.test(taskLower));
    const isGeneralSweep = /\b(all\s*evidence|sweep|everything|entire\s*case|full\s*case)\b/i.test(taskLower);

    // Ensure all scene steps are completed if directive relates to scene or general sweep
    if (isScene || isGeneralSweep) {
      if (snap.scene) {
        snap.scene.cordoned = true;
        snap.scene.walkthrough = true;
        snap.scene.photographed = true;
        snap.scene.diagrammed = true;
        snap.scene.canvassed = true;
        snap.scene.sealed = true;
      }
    }

    // Physical exhibits & seizure memos
    if (isSeizure || isGeneralSweep) {
      (snap.exhibits || []).forEach((e: any) => {
        e.found = true;
        e.seized = true;
        e.tainted = false;
        e.admissibility = 'admissible';
        e.seizureValid = true;
        e.seizureMethod = 'Section 105 BNSS videographed seizure';
        e.panchas = ['Panch 1 (Local Independent Trader)', 'Panch 2 (Independent Resident)'];
        e.admissibilityNotes = 'Seized before two independent panch witnesses under BNSS s.103 with videography (BNSS s.105).';
        e.weight = e.isDigital ? 30 : 25;
        e.custodyChain = e.custodyChain || [];
        if (!e.custodyChain.some((c: any) => c.action && c.action.includes('BNSS s.103'))) {
          e.custodyChain.push({
            date: new Date().toISOString().substring(0, 10),
            handler: memberName || 'Squad Member',
            action: 'Validly seized and deposited into Malkhana under BNSS s.103'
          });
        }
      });
    }

    // Digital exhibits & BSA s.63 certification
    if (isDigitalOrCyber || isGeneralSweep) {
      (snap.exhibits || []).filter((e: any) => e.isDigital).forEach((e: any) => {
        e.s63Certified = true;
        e.s63_certified = true;
        e.hasCert63 = true;
        e.s63SignerA = memberName || 'JC Ravi Deshmukh';
        e.s63SignerB = 'Digital Forensics Specialist';
      });
    }

    // Labs & FSL
    if (isLab || isGeneralSweep) {
      (snap.labRequests || []).forEach((lr: any) => {
        lr.status = 'ready';
        lr.result = 'Laboratory test results certified and received under BNSS s.329.';
      });
      (snap.exhibits || []).forEach((e: any) => {
        e.labStatus = 'collected';
        e.labResult = 'Forensic laboratory report confirmed admissible.';
        e.weight = (e.weight || 25) + 10;
      });
    }

    // Interrogation & Statements
    if (isStatementOrWitness || isGeneralSweep) {
      (snap.persons || []).forEach((p: any) => {
        p.examined = true;
        p.statementRecorded = true;
        p.statement = p.statement || `Examination completed by ${memberName} under BNSS s.180.`;
      });
      snap.recoveries = snap.recoveries || [];
      if (snap.recoveries.length === 0) {
        snap.recoveries.push({
          id: Date.now(),
          title: 'Section 23 BSA Corroborative Recovery',
          description: 'Locatable weapon/article recovered pursuant to accused disclosure before two independent witnesses.',
          s23_valid: true,
          witnesses: ['Independent Witness A', 'Independent Witness B'],
          weight: 30
        });
      }
    }

    // Update acts progress
    if (Array.isArray(snap.acts)) {
      const act2 = snap.acts.find((a: any) => a.act === 2 || a.name?.includes('Scene'));
      if (act2 && snap.scene && snap.scene.sealed) {
        act2.done = act2.total || 9;
        act2.pct = 100;
        act2.state = 'complete';
      }
      const act3 = snap.acts.find((a: any) => a.act === 3 || a.name?.includes('Evidence'));
      if (act3) {
        const seizedCount = (snap.exhibits || []).filter((e: any) => e.seized && e.admissibility === 'admissible').length;
        act3.done = Math.max(act3.done || 0, seizedCount);
        act3.pct = Math.round((act3.done / (act3.total || 4)) * 100);
        if (act3.pct >= 100) act3.state = 'complete';
      }
    }
  }

  public advanceDirectiveStep(caseId: number, directiveId: string, subtaskIndex?: number): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) return { ok: false, error: 'Case not found' };

    snap.directiveQueue = snap.directiveQueue || [];
    let dir = snap.directiveQueue.find((d: any) => String(d.id) === String(directiveId));
    if (!dir) {
      const assign = (snap.assignments || []).find((a: any) => a.result_json?.directive?.id === directiveId || a.status === 'running');
      if (assign?.result_json?.directive) {
        dir = assign.result_json.directive;
        snap.directiveQueue.push(dir);
      }
    }

    if (!dir) {
      return { ok: false, error: 'Directive not found', bundle: this.getFullBundle(caseId) };
    }

    const subTasks = dir.subTasks || [];
    let activeIdx = subTasks.findIndex((s: any) => s.status === 'running');
    if (activeIdx === -1) {
      activeIdx = subTasks.findIndex((s: any) => s.status === 'pending');
    }

    const idxToComplete = subtaskIndex !== undefined ? subtaskIndex : activeIdx;
    if (idxToComplete >= 0 && idxToComplete < subTasks.length) {
      subTasks[idxToComplete].status = 'completed';
      const memberName = dir.memberName || 'Squad Member';
      this.applyDirectiveStepEffects(snap, dir, subTasks[idxToComplete], memberName);
    }

    // Find next pending subtask
    const nextIdx = subTasks.findIndex((s: any) => s.status === 'pending');
    if (nextIdx >= 0) {
      subTasks[nextIdx].status = 'running';
      dir.status = 'running';
      this.recalculateCaseReadiness(snap);
      this.bumpRev();
      this.saveState();

      return {
        ok: true,
        directive: dir,
        activeSubtask: subTasks[nextIdx],
        bundle: this.getFullBundle(caseId)
      };
    } else {
      // All subtasks done -> complete directive
      return this.completeDirective(caseId, directiveId);
    }
  }

  public completeDirective(caseId: number, directiveId: string): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) return { ok: false, error: 'Case not found' };

    snap.directiveQueue = snap.directiveQueue || [];
    let dir = snap.directiveQueue.find((d: any) => String(d.id) === String(directiveId));

    if (!dir) {
      const assign = (snap.assignments || []).find((a: any) => 
        (directiveId && a.result_json?.directive?.id === directiveId) || 
        (directiveId && String(a.id) === String(directiveId)) ||
        a.status === 'running'
      );
      if (assign?.result_json?.directive) {
        dir = assign.result_json.directive;
        snap.directiveQueue.push(dir);
      } else if (assign) {
        dir = {
          id: directiveId || `dir-${Date.now()}`,
          playerInstruction: assign.description,
          memberName: assign.member,
          memberId: assign.member_id,
          status: 'completed'
        };
        snap.directiveQueue.push(dir);
      }
    }

    // Idempotency: If directive was already completed and debrief sent, return safely without duplicating messages or loop
    if (dir && dir.status === 'completed' && dir.debrief_sent) {
      return {
        ok: true,
        directive: dir,
        promotedDirective: null,
        bundle: this.getFullBundle(caseId)
      };
    }

    if (dir) {
      dir.status = 'completed';
      dir.debrief_sent = true;
      if (dir.subTasks) {
        dir.subTasks.forEach((st: any) => {
          if (st.status !== 'completed_by_player') st.status = 'completed';
        });
      }
    }

    // Mark matching running assignment as completed
    const matchingAssign = (snap.assignments || []).find((a: any) => 
      dir && ((a.member === dir.memberName || Number(a.member_id) === Number(dir.memberId) || a.result_json?.directive?.id === dir.id || String(a.id) === String(dir.id)) && a.status === 'running')
    ) || (snap.assignments || []).find((a: any) => a.status === 'running');

    if (matchingAssign) {
      matchingAssign.status = 'completed';
      matchingAssign.debrief_sent = true;
    }

    const memberName = dir?.memberName || matchingAssign?.member || 'JC Ravi Deshmukh';
    const memberId = dir?.memberId || matchingAssign?.member_id || 1;

    // Apply comprehensive real-world directive completion effects
    this.applyDirectiveCompletionEffects(snap, dir, memberName);

    // Record Case Diary milestone
    snap.diary = snap.diary || [];
    snap.diary.unshift({
      id: Date.now(),
      day: snap.day || 1,
      entry_type: 'milestone',
      body: `Directive Complete by ${memberName}: "${dir?.playerInstruction || matchingAssign?.description || 'Investigative directive'}". All sub-tasks completed and evidentiary records filed.`,
      auto: 1,
      created_at: new Date().toISOString()
    });

    // Promote next queued directive for this member
    const nextQueuedDir = snap.directiveQueue.find((d: any) => 
      (d.memberName === memberName || d.memberId === memberId) && d.status === 'queued'
    );

    const m = (this.team || []).find((tm: any) => tm.name === memberName || tm.id === memberId || tm.candidate_id === memberId);

    if (nextQueuedDir) {
      nextQueuedDir.status = 'running';
      if (nextQueuedDir.subTasks && nextQueuedDir.subTasks.length) {
        nextQueuedDir.subTasks[0].status = 'running';
      }
      const duration = (nextQueuedDir.dueDay && nextQueuedDir.startDay) ? (nextQueuedDir.dueDay - nextQueuedDir.startDay) : 1;
      const nextDueDay = (snap.day || 1) + Math.max(1, duration);

      const promotedAssign = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        case_id: snap.caseId,
        player_id: this.player.id,
        member_id: memberId,
        task_type: 'field_directive',
        target_ref: null,
        description: nextQueuedDir.playerInstruction || 'Queued Task',
        days_cost: duration,
        start_day: snap.day || 1,
        due_day: nextDueDay,
        status: 'running',
        result_json: { directive: nextQueuedDir },
        created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        member: memberName
      };

      snap.assignments.push(promotedAssign);

      if (m) {
        m.busy_until_day = nextDueDay;
        m.current_task = promotedAssign.description;
      }
    } else {
      if (m) {
        m.busy_until_day = 0;
        m.current_task = null;
      }
    }

    // Generate and post in-character proactive completion response into the member's chat thread
    let targetThreadId: number | null = null;
    if (memberId) {
      const foundThread = (this.threads || []).find((t: any) => 
        Number(t.member_id) === Number(memberId) || 
        (t.kind === 'assistant' && Number(memberId) === 1)
      );
      if (foundThread) targetThreadId = foundThread.id;
    }
    if (!targetThreadId && memberName) {
      const foundByName = (this.threads || []).find((t: any) => 
        (t.title && t.title.toLowerCase().includes(memberName.toLowerCase())) ||
        (memberName.toLowerCase().includes('ravi') && t.kind === 'assistant')
      );
      if (foundByName) targetThreadId = foundByName.id;
    }
    if (!targetThreadId && dir?.threadId) {
      const candidateThread = (this.threads || []).find((t: any) => t.id === Number(dir.threadId));
      if (candidateThread && (candidateThread.kind === 'assistant' || candidateThread.kind === 'member' || candidateThread.kind === 'case')) {
        targetThreadId = candidateThread.id;
      }
    }
    if (!targetThreadId) {
      targetThreadId = 1;
    }

    const taskTitle = dir?.playerInstruction || matchingAssign?.description || 'Investigative directive';
    const taskLower = taskTitle.toLowerCase();
    
    const isStatementOrWitness = /\b(statement|statements|witness|witnesses|accused|suspect|suspects|interrogat|interrogate|question|interview|alibi|confession|disclosure|inquir)\b/i.test(taskLower) || (/\b(gather|collect|record|take|get)\b/i.test(taskLower) && /\b(statement|statements|testimony|intel|information|alibi|facts)\b/i.test(taskLower));
    const isDigitalOrCyber = /\b(cctv|camera|footage|cdr|phone|mobile|device|electronic|cyber|imei|ip\s*address|hard\s*drive|laptop|s\.?63|cert\s*63|hash)\b/i.test(taskLower);
    const isLab = /\b(lab|labs|fsl|forensic|forensics|ballistic|ballistics|dna|fingerprint|fingerprints|autopsy|postmortem|toxicology|chemical|serology)\b/i.test(taskLower);
    const isScene = /\b(scene|cordon|cordoning|walkthrough|grid|spot|photograph|photography|diagram|sketch|seal|canvass|perimeter)\b/i.test(taskLower);
    const isSeizure = /\b(seize|seizure|panch|panchanama|malkhana|exhibit|exhibits|recovery\s*memo|custody\s*chain|confiscat)\b/i.test(taskLower) || (/\b(gather|collect|recover)\b/i.test(taskLower) && /\b(evidence|weapon|knife|gun|cash|goods|property|item|article)\b/i.test(taskLower));

    let proactiveBody = '';
    const activePerson = (snap?.persons || []).find((p: any) => p.in_chamber) ||
      (snap?.persons || []).find((p: any) => p.role === 'suspect' || p.isAccused || p.isCulprit) ||
      (snap?.persons || [])[0];

    if (isStatementOrWitness) {
      const pName = activePerson ? activePerson.name : 'the subject';
      const pLink = activePerson ? `[Open Interrogation: ${pName}](go:interrogation:${activePerson.id})` : `[Open Interrogation Room](go:interrogation)`;
      const pStmt = activePerson?.statement ? `\n• Key Statement Recorded: "${activePerson.statement.substring(0, 120)}..."` : '';
      proactiveBody = `Sir! Interrogation and witness examination completed: "${taskTitle}".\n• Subject: ${pName}\n• Statutory Process: Formal examination recorded under BNSS Section 180 and disclosure memo logged under BSA s.23 before independent witnesses.${pStmt}\n• Case File: Statements synchronized with Case Diary and Evidence Board. Standing by for next orders! ${pLink}`;
    } else if (isDigitalOrCyber) {
      proactiveBody = `Sir! Digital evidence assignment completed: "${taskTitle}". Electronic footage and digital records have been retrieved with bit-stream forensic integrity, cryptographic hash verification, and the mandatory Section 63 BSA certificate signed by the lawful custodian. Digital exhibits are fully admissible and linked to the dossier!`;
    } else if (isLab) {
      proactiveBody = `Sir! Laboratory follow-up completed: "${taskTitle}". Forensic analysis reports have been procured from the FSL and certified under BNSS s.329. Admissibility ratings, scientific conclusions, and corroborative links have been updated on the Evidence Board!`;
    } else if (isScene) {
      proactiveBody = `Sir! Crime scene assignment completed: "${taskTitle}". Perimeter cordoning, systematic forensic walkthrough, photographic documentation, and spot diagramming under BNSS s.176 have been finalized. Scene status and findings are logged in the case file.`;
    } else if (isSeizure) {
      proactiveBody = `Sir! Evidence seizure completed: "${taskTitle}". Physical exhibits have been formally seized before two independent panch witnesses under BNSS s.103 with s.105 videography logs. Exhibits are catalogued and deposited into the Malkhana with unbroken chain-of-custody documentation. The Evidence Board has been synchronized with full admissibility points!`;
    } else {
      proactiveBody = `Sir! I have completed the assignment: "${taskTitle}". All field tasks, statutory documentation, and procedural verifications have been carried out. Evidence Board and case files have been synchronized with our findings. Standing by for your next orders!`;
    }

    const targetThreadData = this.chatThreads.get(Number(targetThreadId)) || {
      thread: (this.threads || []).find((t: any) => t.id === Number(targetThreadId)) || { id: Number(targetThreadId), title: memberName, kind: 'assistant' },
      messages: []
    };
    targetThreadData.messages = targetThreadData.messages || [];

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const proactiveMsg = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      thread_id: Number(targetThreadId),
      sender: memberName,
      role: 'npc',
      body: proactiveBody,
      directive_json: JSON.stringify(dir),
      effect_json: JSON.stringify({ completed: true, directiveId: dir?.id }),
      created_at: nowStr
    };
    targetThreadData.messages.push(proactiveMsg);

    if (targetThreadData.thread) {
      targetThreadData.thread.last_at = nowStr;
      targetThreadData.thread.unread = (targetThreadData.thread.unread || 0) + 1;
    }
    const masterThread = (this.threads || []).find((t: any) => t.id === Number(targetThreadId));
    if (masterThread) {
      masterThread.last_at = nowStr;
      masterThread.unread = (masterThread.unread || 0) + 1;
    }
    this.chatThreads.set(Number(targetThreadId), targetThreadData);

    this.recalculateCaseReadiness(snap);
    this.bumpRev();
    this.saveState();

    return {
      ok: true,
      directive: dir,
      promotedDirective: nextQueuedDir || null,
      message: proactiveMsg,
      bundle: this.getFullBundle(caseId)
    };
  }

  public syncState(payload: any): any {
    if (payload.player) {
      this.player = { ...this.player, ...payload.player };
    }
    if (payload.team && Array.isArray(payload.team)) {
      this.team = payload.team;
    }
    if (payload.cases && Array.isArray(payload.cases)) {
      this.cases = payload.cases;
    }
    if (payload.snapshot && payload.snapshot.caseId) {
      this.snapshots.set(Number(payload.snapshot.caseId), payload.snapshot);
      this.recalculateCaseReadiness(payload.snapshot);
    }
    if (payload.chatMessages && Array.isArray(payload.chatMessages) && payload.threadId) {
      const threadData = this.chatThreads.get(Number(payload.threadId)) || {
        thread: this.threads.find(t => t.id === Number(payload.threadId)) || { id: Number(payload.threadId), title: 'Desk', kind: 'assistant' },
        messages: []
      };
      threadData.messages = payload.chatMessages;
      this.chatThreads.set(Number(payload.threadId), threadData);
    }

    this.bumpRev();
    this.saveState();
    return { ok: true, rev: this.rev, bundle: this.getFullBundle(this.player.activeCaseId || 2) };
  }

  public getFullState(): any {
    const serializedSnapshots: Record<string, any> = {};
    this.snapshots.forEach((val, key) => {
      serializedSnapshots[String(key)] = val;
    });

    const serializedChatThreads: Record<string, any> = {};
    this.chatThreads.forEach((val, key) => {
      serializedChatThreads[String(key)] = val;
    });

    return {
      player: this.player,
      cases: this.cases,
      team: this.team,
      threads: this.threads,
      candidates: this.candidates,
      snapshots: serializedSnapshots,
      chatThreads: serializedChatThreads,
      rev: this.rev
    };
  }

  public sanitizeThreadMessages(messages: any[]): any[] {
    if (!Array.isArray(messages)) return [];
    const sanitized: any[] = [];
    const seenDirectiveCompleteKeys = new Set<string>();

    for (const m of messages) {
      if (!m || !m.body) continue;
      const bodyText = (m.body || '').trim();

      // Filter out redundant canned completion spam
      if (bodyText.includes('Sir, directive complete:') || bodyText.includes('Directive Complete by') || bodyText.includes('Promoted next queued directive')) {
        const key = `${m.sender}_${bodyText}`;
        if (seenDirectiveCompleteKeys.has(key)) {
          continue;
        }
        seenDirectiveCompleteKeys.add(key);
      }

      // Check consecutive identical messages
      const prev = sanitized[sanitized.length - 1];
      if (prev && prev.sender === m.sender && prev.body.trim() === bodyText) {
        continue;
      }

      sanitized.push(m);
    }
    return sanitized;
  }

  public markThreadRead(threadId: number): any {
    const threadData = this.chatThreads.get(threadId);
    if (threadData && threadData.thread) {
      threadData.thread.unread = 0;
    }
    const master = this.threads.find(t => t.id === threadId);
    if (master) {
      master.unread = 0;
    }
    this.bumpRev();
    return { ok: true, threadId, unreadTotal: this.threads.reduce((n, t) => n + (t.unread || 0), 0) };
  }

  public getChatThread(threadId: number): any {
    const threadData = this.chatThreads.get(threadId) || { thread: this.threads.find(t => t.id === threadId), messages: [] };
    if (threadData && threadData.messages) {
      threadData.messages = this.sanitizeThreadMessages(threadData.messages);
    }
    // Mark as read when thread is retrieved
    if (threadData.thread) {
      threadData.thread.unread = 0;
    }
    const master = this.threads.find(t => t.id === threadId);
    if (master) {
      master.unread = 0;
    }
    return threadData;
  }

  public recordTip(caseId: number, body: any): any {
    const snap = this.snapshots.get(caseId);
    if (!snap) return this.getFullBundle(caseId);

    const personId = Number(body.personId);
    const identified = !!body.identified;
    const witnesses = body.witnesses || '';
    const person = (snap.persons || []).find((p: any) => p.id === personId);

    const isSuspect = person && (person.isAccused || person.role === 'suspect' || person.isCulprit);
    const correct = identified ? isSuspect : false;

    snap.tips = snap.tips || [];
    snap.tips.push({
      personId,
      personName: person ? person.name : 'Unknown',
      identified,
      correct,
      witnesses,
      date: new Date().toISOString().replace('T', ' ').substring(0, 19)
    });

    snap.diary = snap.diary || [];
    snap.diary.unshift({
      day: snap.day || 1,
      time: '16:00',
      author: 'Investigating Officer',
      text: `Test Identification Parade (TIP) conducted for ${person ? person.name : 'Subject'}. Identified: ${identified ? 'YES' : 'NO'}. Witnesses: ${witnesses}.`,
      tag: 'LEGAL'
    });

    return {
      identified,
      correct,
      msg: identified
        ? (correct ? `Witness correctly identified ${person?.name || 'suspect'} in the parade under BNSS provisions.` : `Witness identified ${person?.name || 'subject'}, but discrepancies exist in suspect description.`)
        : `No identification made during parade by witnesses (${witnesses}).`,
      ...this.getFullBundle(caseId)
    };
  }

  private isCommandDirective(text: string, activeCase?: any, kind?: string, senderName?: string): boolean {
    const lower = text.toLowerCase().trim();
    if (lower.includes('?') || lower.endsWith('?')) return false;

    // Conversational, inquiry, or status requests are never field directives
    const isChaiOrCoffee = /\b(chai|tea|coffee|water|snack|lunch|dinner|breakfast|biscuit|drink|break|tired|relax|how\s+are\s+you|how\s+is\s+it\s+going|how's\s+it\s+going|what's\s+up|sup)\b/i.test(lower);
    const isStatusQuery = /\b(status|update|case\s*status|brief|briefing|overview|summary|report|how\s+are\s+we|progress|where\s+are\s+we|tell\s+me|show|list|present\s+(?:me\s+)?(?:the\s+)?(?:case\s+)?status)\b/i.test(lower);
    if (isStatusQuery && !/\b(seize|cordon|walkthrough|summon|send\s+to\s+lab|arrest|escort)\b/i.test(lower)) return false;
    if (isChaiOrCoffee && !/\b(seize|cordon|walkthrough|summon|send\s+to\s+lab|arrest|escort)\b/i.test(lower)) return false;

    const analysis = classifySpiritAndIntent(text, activeCase, kind || 'member', senderName || 'Officer');
    return analysis.intent.startsWith('ORDER_');
  }

  private processSeniorDirectiveResponse(senderName: string, kind: string, userText: string, activeCase: any): string {
    const lower = userText.toLowerCase().trim();
    const taskDesc = userText.length > 60 ? userText.substring(0, 57) + '...' : userText;

    let topic = 'this field duty';
    let suggestedMember = 'JC Ravi Deshmukh or Constable Dhanraj';

    if (lower.includes('certif') || lower.includes('bsa') || lower.includes('63') || lower.includes('electronic') || lower.includes('cyber') || lower.includes('cctv')) {
      topic = 'obtaining or verifying electronic certificates under BSA s.63';
      suggestedMember = 'Preeti Nair (Cyber & Electronics Specialist)';
    } else if (lower.includes('scene') || lower.includes('seiz') || lower.includes('cordon') || lower.includes('malkhana') || lower.includes('exhibit') || lower.includes('weapon')) {
      topic = 'crime scene walkthrough and exhibit seizure under BNSS s.103';
      suggestedMember = 'Constable Dhanraj (Field & Recovery Specialist)';
    } else if (lower.includes('interrogat') || lower.includes('suspect') || lower.includes('witness') || lower.includes('statement') || lower.includes('canvass')) {
      topic = 'witness canvassing and suspect questioning in Room 04';
      suggestedMember = 'JC Ravi Deshmukh or Constable Dhanraj';
    } else if (lower.includes('lab') || lower.includes('fsl') || lower.includes('ballistic') || lower.includes('dna') || lower.includes('fingerprint')) {
      topic = 'submitting forensic exhibits to FSL';
      suggestedMember = 'FSL Liaison Desk';
    }

    if (kind === 'senior' || senderName.includes('Sawant')) {
      return `Officer, as your Senior Officer and Mentor (Insp. M. Sawant), my role is to provide strategic leadership and review legal compliance under BNSS s.193—not to execute field directives like "${taskDesc}". I have analyzed your request regarding ${topic}: please assign this directive directly to ${suggestedMember} in their chat channel.`;
    } else if (kind === 'head') {
      return `Officer, the Head of Branch approves administrative sanctions and legal requisitions. Directives concerning ${topic} must be assigned directly to your investigating squad (${suggestedMember}).`;
    } else if (kind === 'court') {
      return `Officer, this is the Judicial Magistrate Desk. Court officers adjudicate bail applications and charge sheets. Field directives for ${topic} must be carried out by your squad (${suggestedMember}).`;
    }

    return `Officer, supervisory officers guide legal strategy rather than executing field directives. Please assign "${taskDesc}" to ${suggestedMember}.`;
  }

  private generateDynamicNonDirectiveReply(senderName: string, kind: string, userText: string, activeCase: any, messageHistoryCount: number): string {
    const lower = userText.toLowerCase().trim();
    const caseNo = activeCase?.caseNo || '2417/682';

    // 1. Inquiries about Suspects, Accused, Interrogations, and Witnesses
    if (lower.includes('suspect') || lower.includes('accused') || lower.includes('culprit') || lower.includes('interrogat') || lower.includes('witness') || lower.includes('statement') || lower.includes('person')) {
      const allPersons = activeCase?.persons || [];
      const accusedList = allPersons.filter((p: any) => p.role === 'suspect' || p.isAccused || p.isCulprit);
      const pendingAccused = accusedList.filter((p: any) => !p.statementRecorded && !p.examined && !p.statement);
      const examinedAccused = accusedList.filter((p: any) => p.statementRecorded || p.examined || p.statement);
      const witnessList = allPersons.filter((p: any) => 
        (p.role === 'witness' || (!p.isAccused && !p.isCulprit && p.role !== 'suspect')) &&
        ((p.canvassed && (p.consented || p.assent || p.canvassConsent)) || ((activeCase?.consentedWitnesses || []).includes(p.name)))
      );
      const pendingWitnesses = witnessList.filter((p: any) => !p.statementRecorded && !p.examined && !p.statement);

      if (kind === 'assistant' || kind === 'member') {
        let lines: string[] = [];
        if (pendingAccused.length > 0) {
          lines.push(`**Accused / Suspects Pending Examination (${pendingAccused.length}):**`);
          pendingAccused.forEach((p: any) => {
            const noticeState = p.summoned ? 'Notice served (BNSS s.35)' : p.arrested ? 'Under arrest (BNSS s.187)' : 'Pending formal summons';
            lines.push(`• **${p.name}** (${p.occupation || p.role || 'Suspect'}) — Status: *${noticeState}*. [Examine](go:interrogation:${p.id})`);
          });
        } else {
          lines.push(`All ${accusedList.length} identified accused persons have had formal statements recorded under BNSS s.180.`);
        }

        if (examinedAccused.length > 0) {
          lines.push(`\n**Accused Already Examined (${examinedAccused.length}):**`);
          examinedAccused.forEach((p: any) => {
            lines.push(`• **${p.name}** — Statement on record under BNSS s.180. [Review Dossier](go:interrogation:${p.id})`);
          });
        }

        if (pendingWitnesses.length > 0) {
          lines.push(`\n**Witnesses Pending Examination (${pendingWitnesses.length}):**`);
          pendingWitnesses.forEach((p: any) => {
            lines.push(`• **${p.name}** (${p.occupation || 'Witness'}) — [Record Statement](go:interrogation:${p.id})`);
          });
        }

        return `Sir, here is the suspect and witness interrogation roster for Case #${caseNo}:\n\n` + lines.join('\n') + `\n\nDirect me if you wish me to serve statutory Section 35 BNSS notice or bring any subject into Interrogation Room 04.`;
      }

      if (kind === 'senior') {
        const pendingNames = pendingAccused.map((p: any) => p.name).join(', ') || 'None';
        return `Officer, for Case #${caseNo}, the following accused are yet to be examined: **${pendingNames}**. Prioritize serving statutory notice under BNSS s.35 and confronting them with seized exhibits in Interrogation Room 04.`;
      }
      if (kind === 'head') {
        return `Ensure all accused persons (${accusedList.map((p: any) => p.name).join(', ') || 'listed suspects'}) are examined strictly under BNSS s.180 protocols before filing the final report under s.193.`;
      }
      if (kind === 'court') {
        return `The Magistrate requires all witness statements under BNSS s.180 to be cleanly recorded and signed before judicial remand or trial proceedings.`;
      }
    }

    // 2. Inquiries about Evidence, Exhibits, Seizures, and Malkhana
    if (lower.includes('evidence') || lower.includes('exhibit') || lower.includes('malkhana') || lower.includes('seiz') || lower.includes('item') || lower.includes('weapon')) {
      const allEx = activeCase?.exhibits || [];
      const seized = allEx.filter((e: any) => e.seized);
      const unseized = allEx.filter((e: any) => !e.seized);

      if (kind === 'assistant' || kind === 'member') {
        let lines: string[] = [];
        if (unseized.length > 0) {
          lines.push(`**Exhibits Pending Seizure (${unseized.length}/${allEx.length}):**`);
          unseized.forEach((e: any) => {
            lines.push(`• **Ex. ${e.exhibitNo || ''}: ${e.name}** (${e.category}) — Locus: ${e.gridRef || 'Scene'}. Requires BNSS s.103 dual-witness seizure.`);
          });
        } else {
          lines.push(`All ${allEx.length} identified exhibits have been formally seized into the Malkhana.`);
        }
        if (seized.length > 0) {
          lines.push(`\n**Exhibits in Malkhana Custody (${seized.length}):**`);
          seized.forEach((e: any) => {
            const labNote = e.forensic_status === 'analyzed' ? 'FSL Analyzed' : e.labStatus === 'pending' ? 'FSL Pending' : 'Chain of custody intact';
            lines.push(`• **Ex. ${e.exhibitNo || ''}: ${e.name}** — *${labNote}*.`);
          });
        }
        return `Sir, here is the Evidence & Malkhana inventory for Case #${caseNo}:\n\n` + lines.join('\n') + `\n\n[Open Malkhana Register](go:malkhana) · [View Evidence Board](go:board)`;
      }

      if (kind === 'senior') return `We currently have ${seized.length}/${allEx.length} exhibits seized into the Malkhana for Case #${caseNo}. Keep the chain of custody intact under BNSS s.103.`;
      if (kind === 'head') return `Verify that all ${seized.length} seized exhibits have corresponding dual-witness seizure memos attached to the file.`;
      if (kind === 'court') return `Exhibits submitted to court must match the seizure log in the Case Diary under BNSS s.172.`;
    }

    // 3. Inquiries about Current Squad Status / Activity
    if (lower.includes('working on') || lower.includes('doing right now') || lower.includes('what are you doing') || lower.includes('current task') || lower.includes('your status') || lower.includes('status update') || lower.includes('what is your task') || lower.includes('what task') || lower.includes('are you busy') || lower.includes('current assignment')) {
      const currentDay = activeCase?.day || 1;
      const teamMember = (this.team || []).find((m: any) => m.name === senderName || (kind === 'assistant' && m.name.includes('Ravi')));
      if (teamMember && teamMember.busy_until_day > currentDay) {
        return `Sir, I am currently deployed on the assignment: "${teamMember.current_task || 'Field Directive'}". Scheduled completion is on Day ${teamMember.busy_until_day}.`;
      } else {
        if (kind === 'assistant') {
          return `Sir, all my previous assignments are completed and logged. I am currently available at HQ Desk, standing by for your next directive on Case #${caseNo}.`;
        } else if (kind === 'member') {
          return `Officer, I have completed my assigned field tasks. Standing by and available for your next orders on Case #${caseNo}.`;
        } else if (kind === 'fsl') {
          return `FSL Liaison Desk is active. All current lab sample submissions are being monitored. Standing by for any new forensic requisitions.`;
        } else if (kind === 'senior') {
          return `Officer, I am reviewing the overall case chronology and supervising legal compliance under BNSS provisions for Case #${caseNo}.`;
        } else {
          return `Standing by, Officer. No active blockers on my desk. Ready for instructions on Case #${caseNo}.`;
        }
      }
    }

    // 4. Inquiries about Crime Scene and Walkthrough
    if (lower.includes('scene') || lower.includes('cordon') || lower.includes('spot') || lower.includes('walkthrough') || lower.includes('diagram') || lower.includes('canvass')) {
      const sc = activeCase?.scene || {};
      const steps = [
        { name: 'Perimeter Cordoning', done: !!sc.cordoned, legal: 'BNSS s.176' },
        { name: 'IO Walkthrough & Spot Inspection', done: !!sc.walkthrough, legal: 'Spot Inspection' },
        { name: 'Crime Scene Photography', done: !!sc.photographed, legal: 'BSA s.63 Record' },
        { name: 'Spot Diagram & Sketch', done: !!sc.diagrammed, legal: 'Scale Diagram' },
        { name: 'Area Canvassing', done: !!sc.canvassed, legal: 'Witness Search' },
        { name: 'Locus Sealing', done: !!sc.sealed, legal: 'Chain of Custody' }
      ];
      if (kind === 'assistant' || kind === 'member') {
        const lines = steps.map(s => `• ${s.name}: ${s.done ? '✅ COMPLETED' : '⏳ PENDING'} (${s.legal})`);
        return `Sir, Crime Scene operational status for Case #${caseNo} (${sc.description || 'Scene Locus'}):\n\n` + lines.join('\n') + `\n\n[Inspect Crime Scene](go:scene)`;
      }
      const cordoned = sc.cordoned ? 'COMPLETED' : 'PENDING';
      const walkthrough = sc.walkthrough ? 'COMPLETED' : 'PENDING';
      return `Crime Scene status for Case #${caseNo}: Cordoning is ${cordoned}, Walkthrough is ${walkthrough}. Keep your squad focused on physical recovery.`;
    }

    // 5. Inquiries about Forensic Labs and FSL
    if (lower.includes('lab') || lower.includes('fsl') || lower.includes('dna') || lower.includes('ballistic') || lower.includes('toxicolog') || lower.includes('fingerprint') || lower.includes('autopsy')) {
      const reqs = activeCase?.labRequests || [];
      if (kind === 'assistant' || kind === 'member' || kind === 'fsl') {
        if (reqs.length === 0) {
          return `Sir, no forensic laboratory requisitions have been submitted yet for Case #${caseNo}. We can dispatch seized exhibits for Ballistics, DNA, Toxicology, or Digital forensics: [Open Forensic Lab](go:labs)`;
        }
        const lines = reqs.map((r: any) => `• **${r.test_name || r.test_code}**: Status is **${(r.status || 'pending').toUpperCase()}** (Expected Day ${r.expected_day || 2})`);
        return `Sir, Forensic Laboratory status for Case #${caseNo}:\n\n` + lines.join('\n') + `\n\n[Open Forensic Lab](go:labs)`;
      }
    }

    // 6. Inquiries about Electronic Evidence Certificates (BSA s.63)
    if (lower.includes('certificate') || lower.includes('bsa') || lower.includes('63') || lower.includes('section 63') || lower.includes('electronic') || lower.includes('cyber') || lower.includes('cdr') || lower.includes('cctv')) {
      if (kind === 'assistant' || kind === 'member') {
        const digitalEx = (activeCase?.exhibits || []).filter((e: any) => e.isDigital || e.category === 'digital');
        const certified = digitalEx.filter((e: any) => e.s63Certified);
        return `Sir, Section 63 BSA Electronic Certificate status for Case #${caseNo}:\n` +
          `• Total digital exhibits: ${digitalEx.length}\n` +
          `• Certified under s.63 BSA: ${certified.length}/${digitalEx.length}\n\n` +
          `Ensure Preeti Nair signs electronic certificates before submitting the final charge sheet.`;
      }
      if (kind === 'senior') return `Under BSA s.63, every electronic record requires a signed certificate from the device handler. Ensure Preeti Nair logs it before we submit the charge sheet on Case #${caseNo}.`;
      if (kind === 'head') return `Make sure all BSA s.63 certificates are verified before forwarding Case #${caseNo} for branch sanction.`;
      if (kind === 'court') return `The Magistrate will strictly inspect Section 63 BSA compliance for electronic evidence admissible in court.`;
    }

    // 7. Inquiries about Charge Sheet / Case Filing (BNSS s.193)
    if (lower.includes('charge sheet') || lower.includes('chargesheet') || lower.includes('193') || lower.includes('court') || lower.includes('file')) {
      if (kind === 'senior') return `Ensure all witness statements under BNSS s.180 and forensic lab reports are attached before filing the final Charge Sheet under s.193 BNSS for Case #${caseNo}.`;
      if (kind === 'head') return `Complete all exhibit Malkhana entries before presenting the final charge sheet for administrative sign-off.`;
      if (kind === 'court') return `Ensure the charge sheet is submitted with dual witness signatures and complete exhibit registry logs.`;
    }

    // 8. General Case Summary / Briefing & Camaraderie (e.g. Chai / Coffee / Casual talk)
    const isChaiOrCoffee = /\b(chai|tea|coffee|water|snack|lunch|dinner|breakfast|biscuit|drink|break|tired|relax|how\s+are\s+you|how\s+is\s+it\s+going|how's\s+it\s+going|what's\s+up|good\s+morning|good\s+evening|hello|hi|hey|thanks|thank\s+you)\b/i.test(lower);
    const isExplicitCaseStatus = /\b(case\s*status|status\s*update|case\s*update|brief\s*me|briefing|overview|summary|progress|where\s+(?:are\s+we|do\s+we\s+stand)|tell\s+me\s+(?:the\s+)?status|present\s+(?:me\s+)?(?:the\s+)?status|case\s+findings|case\s+summary)\b/i.test(lower);

    if (isChaiOrCoffee && !isExplicitCaseStatus) {
      if (kind === 'assistant' || senderName.includes('Ravi')) {
        return `Right away, Sir! I'll run over to the station corner tapri right now and bring two piping hot cutting adrak chais with biscuits. Please take a quick breather, Sir!`;
      } else if (senderName.includes('Dhanraj')) {
        return `Jai Hind, Officer! A strong cutting chai is just what we need to wash down the street dust from the field. Much appreciated, Sir!`;
      } else if (senderName.includes('Preeti')) {
        return `Thank you, Sir! Staring at these CDR logs and CCTV feeds has been burning my eyes—a hot cup of tea/coffee will definitely help recharge.`;
      } else if (kind === 'head' || senderName.includes('Nadkarni')) {
        return `Good idea, Officer. Pour yourself a hot cup and take five minutes to breathe. A rested mind catches the subtle inconsistencies that crack a case.`;
      } else if (kind === 'senior' || senderName.includes('Sawant')) {
        return `Much appreciated, Officer. Grab a quick cup of tea to stay sharp, then let's keep our team moving.`;
      } else if (kind === 'fsl' || senderName.includes('Rao') || senderName.includes('FSL')) {
        return `Thank you, Officer. A tea break between chemical reagent tests is always welcome. Much appreciated.`;
      } else {
        return `Thank you, Officer! A hot cup of chai hits the spot. Appreciate the gesture!`;
      }
    }

    if (isExplicitCaseStatus) {
      const fir = activeCase?.fir || {};
      const acts = activeCase?.acts || [];
      const currentAct = acts.find((a: any) => a.state === 'active') || acts[0];
      const allEx = activeCase?.exhibits || [];
      const seizedEx = allEx.filter((e: any) => e.seized);
      const allPersons = activeCase?.persons || [];
      const examinedAccused = allPersons.filter((p: any) => (p.role === 'suspect' || p.isAccused) && (p.statementRecorded || p.statement));

      const prefix = (kind === 'assistant' || senderName.includes('Ravi'))
        ? `Sir, here is the current operational briefing for **Case #${caseNo} — ${activeCase?.title || 'Active Case'}**:`
        : (kind === 'head' || senderName.includes('Nadkarni'))
        ? `Officer, here is our branch overview for **Case #${caseNo}**:`
        : `Officer, here is the latest case status for **Case #${caseNo}**:`;

      return `${prefix}\n\n` +
        `• **FIR Status**: ${fir.fir_no ? `FIR #${fir.fir_no} registered` : 'FIR registered'} under ${(fir.bns_sections || activeCase?.statutes || ['BNS s.304']).join(', ')}\n` +
        `• **Timeline**: Day ${activeCase?.day || 1} of ${activeCase?.dayLimit || 7} (${activeCase?.daysLeft ?? Math.max(0, (activeCase?.dayLimit || 7) - (activeCase?.day || 1))} days remaining)\n` +
        `• **Phase**: ${currentAct ? currentAct.name : 'Investigation'}\n` +
        `• **Evidence Status**: ${seizedEx.length}/${allEx.length} exhibits seized into Malkhana\n` +
        `• **Interrogation Roster**: ${examinedAccused.length} suspect statement(s) formally recorded under BNSS s.180\n\n` +
        `Let me know how you wish to proceed, Sir!`;
    }

    // 9. Advice / Strategy
    if (lower.includes('advice') || lower.includes('guid') || lower.includes('help') || lower.includes('what should') || lower.includes('next') || lower.includes('recommend') || lower.includes('opinion')) {
      if (kind === 'head' || senderName.includes('Nadkarni')) {
        const unseized = (activeCase?.exhibits || []).filter((e: any) => !e.seized);
        const unexamined = (activeCase?.persons || []).filter((p: any) => (p.role === 'suspect' || p.isAccused) && !p.statement && !p.examined);
        const sceneDone = activeCase?.scene?.cordoned && activeCase?.scene?.walkthrough;
        
        let priorities: string[] = [];
        if (!sceneDone) {
          priorities.push("1. Complete the crime scene walkthrough and perimeter cordoning under BNSS s.176.");
        }
        if (unseized.length > 0) {
          priorities.push(`2. Seize remaining physical exhibits (${unseized.map((e: any) => e.name || e.title).slice(0, 2).join(', ')}) into the Malkhana under BNSS s.103.`);
        }
        if (unexamined.length > 0) {
          priorities.push(`3. Serve Section 35 BNSS appearance notice on ${unexamined[0].name} and examine them in Interrogation Room 04.`);
        }
        if (priorities.length === 0) {
          priorities.push("1. Reconcile witness alibis against forensic laboratory reports and CDR logs.");
          priorities.push("2. Prepare final chargesheet papers under Section 193 BNSS.");
        }

        return `Officer, here is my operational assessment for Case #${caseNo}:\n\n` +
          priorities.join('\n') + `\n\nEnsure every piece of physical and digital evidence is fortified under BNSS/BSA standards. Keep me posted on any new admissions or forensic hits.`;
      }
      if (kind === 'senior') return `Officer, focus on three priorities for Case #${caseNo}: 1) Complete crime scene processing, 2) Seize all critical exhibits into Malkhana under BNSS s.103, and 3) Requisition forensic lab analysis.`;
      if (kind === 'assistant' || kind === 'member') {
        return `Sir, I recommend verifying all crime scene steps under BNSS s.176, seizing remaining physical exhibits under s.103, and summoning identified suspects for examination in Room 04.`;
      }
    }

    // 10. Role-Based Fallbacks
    if (kind === 'senior') {
      const seniorPool = [
        `Good progress, Officer. I am reviewing the chronology for Case #${caseNo}. Ensure all evidence chains are documented under BNSS procedures.`,
        `Officer, keep your squad members actively deployed in the field while maintaining strict compliance with BNSS s.103 and BSA s.63.`,
        `Remember that procedural gaps in exhibit seizure or witness logs can be exploited by defense counsel. Verify every entry in your Case Diary.`,
        `I am monitoring Case #${caseNo} from HQ. Delegate field directives to JC Ravi, Dhanraj, and Preeti while keeping me updated on major breakthroughs.`,
        `Ensure the FIR and crime scene walkthrough are fully synchronized before we draft the final charge sheet under s.193 BNSS.`
      ];
      return seniorPool[messageHistoryCount % seniorPool.length];
    }

    if (kind === 'head') {
      const headPool = [
        `Good day, Officer. Ensure procedural integrity under BNSS s.103 and BSA s.23 on the Evidence Board for Case #${caseNo}.`,
        `Branch administration requires complete documentation for all lab requisitions and exhibit transfers on Case #${caseNo}.`,
        `Maintain focus on closing all investigative gaps before submitting the final case file for branch sanction.`
      ];
      return headPool[messageHistoryCount % headPool.length];
    }

    if (kind === 'court') {
      const courtPool = [
        `Judicial Magistrate Desk. Charge sheet papers and remand applications for Case #${caseNo} will be reviewed upon submission.`,
        `Ensure all statutory timelines under BNSS s.187 (60/90 days) are strictly respected for Case #${caseNo}.`,
        `The court requires verified dual-witness seizure memos for all physical exhibits presented in evidence.`
      ];
      return courtPool[messageHistoryCount % courtPool.length];
    }

    if (kind === 'assistant') {
      const raviPool = [
        `Sir, Junior Constable Ravi Deshmukh here. Currently on Day ${activeCase?.day || 1} of Case #${caseNo}. Standing by for field or desk directives.`,
        `Sir! All case diary entries and evidence logs are synchronized. Inform me if you wish me to process scene walkthrough or exhibit seizure.`,
        `Standing by at HQ Desk, Sir. Ready to assist on Case #${caseNo}.`
      ];
      return raviPool[messageHistoryCount % raviPool.length];
    }

    if (kind === 'member') {
      if (senderName.includes('Dhanraj')) {
        const dhanrajPool = [
          `Jai Hind, Officer! Constable Dhanraj reporting. Standing by for field canvassing, witness summons, or scene duty on Case #${caseNo}.`,
          `Officer! Ready to deploy for physical search or exhibit recovery as required under BNSS s.103.`,
          `Standing by in the field, Sir. Direct me whenever you need physical scene processing or witness tracing.`
        ];
        return dhanrajPool[messageHistoryCount % dhanrajPool.length];
      } else if (senderName.includes('Preeti')) {
        const preetiPool = [
          `Sir, Preeti Nair here. Standing by for cyber analysis, device imaging, or s.63 BSA certificate requisitions.`,
          `Officer, digital forensics and CDR/CCTV logs are monitored. Direct me for electronic evidence analysis anytime.`,
          `Standing by at Cyber Cell, Sir. Ready to process electronic exhibits or phone record analysis.`
        ];
        return preetiPool[messageHistoryCount % preetiPool.length];
      }
    }

    return `Understood, Officer. Communication recorded in the case file for Case #${caseNo}.`;
  }

  private processTaskWithBlockers(activeCase: any, userText: string, senderName: string, memberId: number, parsedIntent?: IntentAnalysisResult): { replyText: string; assignment: any; directive?: any } {
    const lower = userText.toLowerCase().trim();
    const isApproval = /\b(yes|do\s*it|do\s*all|overcome|proceed|complete|go\s*ahead|execute|resolve|clear|all\s*tasks|from\s*beginning|start\s*from|do\s*everything)\b/i.test(lower);
    
    const isStatementOrWitnessTask = /\b(statement|statements|witness|witnesses|accused|suspect|suspects|interrogat|interrogate|question|interview|alibi|confession|disclosure|inquir)\b/i.test(lower) || (/\b(gather|collect|record|take|get)\b/i.test(lower) && /\b(statement|statements|testimony|intel|information|alibi|facts)\b/i.test(lower));
    const isDigitalOrCyberTask = /\b(cctv|camera|footage|cdr|phone|mobile|device|electronic|cyber|imei|ip\s*address|hard\s*drive|laptop|s\.?63|cert\s*63|hash)\b/i.test(lower);
    const isLabTask = /\b(lab|labs|fsl|forensic|forensics|ballistic|ballistics|dna|fingerprint|fingerprints|autopsy|postmortem|toxicology|chemical|serology)\b/i.test(lower);
    const isSceneProcessingTask = /\b(scene|cordon|cordoning|walkthrough|grid|spot|photograph|photography|diagram|sketch|seal|canvass|perimeter)\b/i.test(lower);
    const isSeizureOrMalkhanaTask = /\b(seize|seizure|panch|panchanama|malkhana|exhibit|exhibits|recovery\s*memo|custody\s*chain|confiscat)\b/i.test(lower) || (/\b(gather|collect|recover)\b/i.test(lower) && /\b(evidence|weapon|knife|gun|cash|goods|property|item|article)\b/i.test(lower));

    const startDay = activeCase.day || 1;
    const targetCaseId = activeCase.caseId || activeCase.case_id || activeCase.id || 2;

    // Format clean, professional task title instead of raw user prompt
    let cleanTargetPerson = parsedIntent?.entities?.targetPerson;
    if (!cleanTargetPerson && isStatementOrWitnessTask) {
      const p = (activeCase.persons || []).find((p: any) => p.in_chamber) ||
        (activeCase.persons || []).find((p: any) => p.role === 'suspect' || p.isAccused || p.isCulprit) ||
        (activeCase.persons || [])[0];
      if (p) cleanTargetPerson = { id: p.id, name: p.name, role: p.role || 'suspect', isAccused: !!p.isAccused };
    }

    let taskDesc = '';
    if (isStatementOrWitnessTask) {
      taskDesc = cleanTargetPerson?.name ? `Interrogate Suspect (${cleanTargetPerson.name})` : 'Interrogate Suspect & Record Statement';
    } else if (isDigitalOrCyberTask) {
      taskDesc = 'Retrieve Digital Records & Section 63 BSA Certification';
    } else if (isLabTask) {
      taskDesc = 'FSL Forensic Requisition & Analysis';
    } else if (isSceneProcessingTask) {
      taskDesc = 'Crime Scene Inspection & Walkthrough (BNSS s.176)';
    } else if (isSeizureOrMalkhanaTask) {
      taskDesc = 'Physical Seizure & Malkhana Deposit (BNSS s.103)';
    } else {
      let cleaned = userText.replace(/\b(also|and|please|go|and\s+give\s+me|give\s+me|the\s+summary|summary\s+of|findings)\b/gi, '').trim();
      if (!cleaned || cleaned.length < 3) cleaned = userText;
      taskDesc = cleaned.length > 50 ? cleaned.substring(0, 47) + '...' : cleaned;
    }

    const teamMember = this.team.find((m: any) => m.name === senderName || m.id === memberId);
    const isMemberBusy = !!(teamMember && teamMember.busy_until_day > activeCase.day);

    // Intent-Driven Special Handlers
    if (parsedIntent?.intent === 'ORDER_CANCEL_TASK') {
      if (teamMember) {
        teamMember.busy_until_day = 0;
        teamMember.current_task = null;
      }
      if (activeCase.directiveQueue) {
        activeCase.directiveQueue = activeCase.directiveQueue.filter((d: any) => d.memberId !== memberId);
      }
      activeCase.diary = activeCase.diary || [];
      activeCase.diary.unshift({
        day: activeCase.day || 1,
        time: '12:00',
        author: senderName,
        text: `Active field directive cancelled upon order of Investigating Officer: "${userText}".`,
        tag: 'INVESTIGATION'
      });
      return {
        replyText: `Sir! Standing down as ordered. Active directive has been cancelled and I have resumed standby status at HQ Desk.`,
        assignment: { create: false, task_type: 'cancelled' },
        directive: null
      };
    }

    if (parsedIntent?.intent === 'ORDER_INTERROGATION_SUMMON') {
      let targetPerson: any = null;
      if (parsedIntent.entities.targetPerson?.id) {
        targetPerson = (activeCase.persons || []).find((p: any) => p.id === parsedIntent.entities.targetPerson?.id);
      }
      if (!targetPerson) {
        targetPerson = (activeCase.persons || []).find((p: any) => p.role === 'suspect' || p.isAccused || p.isCulprit) || activeCase.persons?.[0];
      }

      if (!targetPerson) {
        return {
          replyText: `Sir, no suspect has been formally identified or named in the case roster yet. Please check the Persons of Interest or canvass the crime scene first.`,
          assignment: { create: false },
          directive: null
        };
      }

      if (targetPerson.in_chamber) {
        return {
          replyText: `Sir! ${targetPerson.name} is already secured in Interrogation Room 04 under custody guard. You can begin the formal examination immediately: [Open Interrogation Room: ${targetPerson.name}](go:interrogation:${targetPerson.id})`,
          assignment: { create: false },
          directive: null
        };
      }

      // Blocker check: If suspect's whereabouts are unconfirmed or Section 35 notice unserved, and user has not given explicit authorization
      const hasExplicitAuthorization = isApproval || /\b(authorize|authorized|proceed|execute|issue\s*notice|bring|fetch|summon|escort|interrogat|question|take\s*in|call\s*in|get\s*him|get\s*her|get\s*them|yes|do\s*it|go\s*ahead)\b/i.test(lower);
      
      const hasBlocker = !targetPerson.summoned && !targetPerson.arrested && (targetPerson.alibi_status !== 'verified' || !targetPerson.spotted);

      if (hasBlocker && !hasExplicitAuthorization) {
        return {
          replyText: `Sir, **${targetPerson.name}** (${targetPerson.role || 'Suspect'}) is currently not in custody, and their immediate ground whereabouts have not been verified under formal notice.

**Statutory Compliance Blocker:**
Under BNSS Section 35(3), a person cannot be arbitrarily detained without a written Notice of Appearance, unless arrested under Section 187 on cognizable grounds.

**Recommended Resolution:**
1. Serve formal Notice of Appearance under Section 35 BNSS at their recorded address.
2. Deploy an officer for safe escort to Interrogation Room 04.

Shall I proceed to issue the Section 35 notice and escort **${targetPerson.name}** to Interrogation Room 04? Reply **'Authorize'** or **'Proceed'** to execute.`,
          assignment: { create: false, requires_authorization: true, target_person_id: targetPerson.id },
          directive: null
        };
      }

      targetPerson.summoned = true;
      targetPerson.in_chamber = true;
      targetPerson.interrogation_ready = true;
      targetPerson.escorted_by = senderName;

      activeCase.diary = activeCase.diary || [];
      activeCase.diary.unshift({
        day: activeCase.day || 1,
        time: '11:15',
        author: senderName,
        text: `Notice of appearance served on ${targetPerson.name} under BNSS s.35. Escorted to Interrogation Room 04 for formal examination.`,
        tag: 'LEGAL'
      });

      if (teamMember) {
        teamMember.busy_until_day = activeCase.day || 1;
        teamMember.current_task = `Escorting ${targetPerson.name} to Interrogation Room 04`;
      }

      const memberThread = (this.threads || []).find((t: any) => 
        Number(t.member_id) === Number(memberId) || 
        t.title === senderName || 
        (t.kind === 'assistant' && (Number(memberId) === 1 || senderName.includes('Ravi')))
      );
      const resolvedThreadId = memberThread ? memberThread.id : (memberId || 1);

      const ivDirective = {
        id: 'dir-iv-' + Date.now(),
        caseId: targetCaseId,
        threadId: resolvedThreadId,
        memberId: memberId || 1,
        memberName: senderName,
        playerInstruction: userText,
        action_link: {
          type: 'interrogation',
          target_person_id: targetPerson.id,
          label: `Open Interrogation Room: ${targetPerson.name}`
        },
        aiThinking: {
          parsedGoal: `Summon & escort ${targetPerson.name} to Interrogation Room 04`,
          gapsIdentified: ['Statutory notice under Section 35 BNSS served and authorized.'],
          legalContext: targetPerson.arrested ? 'BNSS s.187 (Police Custody Examination)' : 'BNSS s.35 (Notice of Appearance before IO)',
          frictionFormula: 'Immediate execution (0-1 Day) - Statutory notice served, chamber secured.',
          thoughtProcessSteps: [
            `Identified target suspect: ${targetPerson.name} (Role: ${targetPerson.role || 'Suspect'}, ID: #${targetPerson.id}).`,
            `Verified statutory compliance: Served notice under BNSS Section 35 / Section 180.`,
            `Secured escort to Metropolitan Police Interrogation Room 04.`,
            `Subject seated in chamber with escorting officer present.`
          ],
          elapsedSeconds: 1.1
        },
        subTasks: [
          {
            id: 'sub-iv-1-' + Date.now(),
            title: 'Notice Service & Legal Warning',
            description: `Serve statutory Section 35 BNSS notice of appearance to ${targetPerson.name}.`,
            targetScope: 'interrogation',
            status: 'completed',
            timeCostDays: 0
          },
          {
            id: 'sub-iv-2-' + Date.now(),
            title: 'Chamber Escort & Watch',
            description: `Escort ${targetPerson.name} to Interrogation Room 04 and maintain secure presence until IO arrives.`,
            targetScope: 'interrogation',
            status: 'completed',
            timeCostDays: 0
          }
        ],
        status: 'completed',
        createdDay: startDay,
        startDay: startDay,
        dueDay: startDay
      };

      activeCase.directiveQueue = activeCase.directiveQueue || [];
      activeCase.directiveQueue.push(ivDirective);

      const replyText = `Sir! ${senderName} reporting. Notice of appearance under Section 35 BNSS has been served upon ${targetPerson.name}. The subject has been brought in and secured in Interrogation Room 04. Standing by for your examination: [Open Interrogation Room: ${targetPerson.name}](go:interrogation:${targetPerson.id})`;

      return {
        replyText,
        directive: ivDirective,
        assignment: {
          create: true,
          id: Date.now() + Math.floor(Math.random() * 1000),
          case_id: targetCaseId,
          member_id: memberId,
          task_type: 'interrogation',
          description: `Escort ${targetPerson.name} to Interrogation Room 04`,
          days_cost: 0,
          start_day: startDay,
          due_day: startDay,
          status: 'completed',
          member: senderName
        }
      };
    }

    // Multi-factor dynamic friction calculation
    const complexityFactor = (isLabTask || isDigitalOrCyberTask) ? 1.5 : (isSceneProcessingTask || isSeizureOrMalkhanaTask) ? 1.3 : 1.0;
    const prereqFriction = (!activeCase.fir || (!activeCase.scene?.cordoned && isSceneProcessingTask)) ? 1.4 : 1.0;
    const specialtyBonus = (senderName.includes('Preeti') && (isLabTask || isDigitalOrCyberTask)) ? 0.6 : (senderName.includes('Dhanraj') && (isSceneProcessingTask || isSeizureOrMalkhanaTask)) ? 0.6 : (senderName.includes('Ravi')) ? 0.7 : 1.0;
    const adminFriction = 1.1;

    const timeCostDays = Math.max(1, Math.round(complexityFactor * prereqFriction * specialtyBonus * adminFriction));

    // Determine blockers for the active case state
    const blockers: string[] = [];
    if (!activeCase.fir) {
      blockers.push("FIR is not yet registered under BNSS s.173 in the Duty Room.");
    }
    if (isSceneProcessingTask || isSeizureOrMalkhanaTask) {
      if (!activeCase.scene?.cordoned) {
        blockers.push(`Crime scene at ${activeCase.scene?.name || 'location'} is not yet cordoned off.`);
      }
      if (!activeCase.scene?.walkthrough && !activeCase.scene?.walkthrough_completed) {
        blockers.push("Crime scene walkthrough and physical grid search are pending.");
      }
      const unspottedExhibits = (activeCase.exhibits || []).filter((e: any) => !e.found);
      if (unspottedExhibits.length > 0 && !(activeCase.exhibits || []).some((e: any) => e.found)) {
        blockers.push("Exhibits at the crime scene have not yet been spotted or photographed.");
      }
    }
    if (isLabTask) {
      const seizedExhibits = (activeCase.exhibits || []).filter((e: any) => e.seized);
      if (seizedExhibits.length === 0) {
        blockers.push("No exhibits have been seized from the scene or deposited in the Malkhana register (BNSS s.105).");
      }
    }

    const dueDay = (isMemberBusy ? teamMember.busy_until_day : startDay) + timeCostDays;

    const legalCtx = isStatementOrWitnessTask ? 'BNSS s.180 Examination of Witnesses & Accused' :
      isDigitalOrCyberTask ? 'BSA s.63 / Digital Evidence Chain of Custody' :
      isLabTask ? 'BNSS s.329 / FSL Requisition Protocol' :
      isSeizureOrMalkhanaTask ? 'BNSS s.103 Seizure & Panch Rules' :
      isSceneProcessingTask ? 'BNSS s.176 Crime Scene Inspection' :
      'BNSS s.176 General Investigation Standard';

    const memberThread = (this.threads || []).find((t: any) => 
      Number(t.member_id) === Number(memberId) || 
      t.title === senderName || 
      (t.kind === 'assistant' && (Number(memberId) === 1 || senderName.includes('Ravi')))
    );
    const resolvedThreadId = memberThread ? memberThread.id : (memberId || 1);

    const directivePayload = {
      id: 'dir-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      caseId: targetCaseId,
      threadId: resolvedThreadId,
      memberId: memberId || 1,
      memberName: senderName,
      playerInstruction: userText,
      aiThinking: {
        parsedGoal: `Execute player directive: "${taskDesc}"`,
        gapsIdentified: blockers.length > 0 ? blockers : ['No blocking gaps found. Direct execution authorized under BNSS.'],
        legalContext: legalCtx,
        frictionFormula: `Base(1d) * Complexity(${complexityFactor.toFixed(1)}) * Friction(${prereqFriction.toFixed(1)}) * OfficerBonus(${specialtyBonus.toFixed(1)}) * Admin(${adminFriction.toFixed(1)}) = ${timeCostDays} Day(s)`,
        thoughtProcessSteps: [
          `Deep Analysis: Parsed instruction "${userText}" against Case #${activeCase.caseNo} snapshot state.`,
          `Gap Detection: ${blockers.length > 0 ? 'Identified missing prerequisites (' + blockers.length + ' item/s). Gap-filling auto-scheduled.' : 'All statutory prerequisites verified intact.'}`,
          `Friction Matrix: Calculated time cost = ${timeCostDays} day(s) based on officer specialization (${senderName}) and legal administrative friction.`,
          `Decomposition: Formulated 4 sequential sub-tasks with scope invariant guards.`,
          `Queue Status: ${isMemberBusy ? 'Member committed to active task. Directive placed in Task Queue.' : 'Member available. Active field execution started immediately.'}`
        ],
        elapsedSeconds: 1.8
      },
      subTasks: [
        {
          id: 'sub-1-' + Date.now(),
          title: 'Prerequisite Resolution & Verification',
          description: blockers.length > 0 ? `Resolve missing gap: ${blockers[0]}` :
            isStatementOrWitnessTask ? 'Verify accused custody status, legal representation rights (BNSS s.38), and witness availability.' :
            isDigitalOrCyberTask ? 'Verify camera/device custodian identity and serve statutory notice under BNSS s.94.' :
            isLabTask ? 'Prepare formal FSL requisition docket and verify tamper-proof seal integrity.' :
            isSceneProcessingTask ? 'Verify perimeter cordon integrity and establish safe entry corridor under BNSS s.176.' :
            isSeizureOrMalkhanaTask ? 'Summon two independent, respectable local panch witnesses and initiate BNSS s.105 videography.' :
            'Verify FIR registration, jurisdictional authority, and operational clearance at HQ.',
          targetScope: isStatementOrWitnessTask ? 'witnesses' : isDigitalOrCyberTask ? 'cyber' : isLabTask ? 'labs' : isSceneProcessingTask ? 'scene' : isSeizureOrMalkhanaTask ? 'scene' : 'procedure',
          status: isMemberBusy ? 'pending' : (blockers.length > 0 ? 'running' : 'completed'),
          timeCostDays: 1,
          frictionFactors: {
            complexity: 'Standard Verification',
            prerequisites: blockers.length > 0 ? 'Gap Resolution Required' : 'Cleared',
            specialtyBonus: senderName.includes('Preeti') ? 'Cyber Bonus (-0.2d)' : senderName.includes('Ravi') ? 'Procedure Bonus (-0.3d)' : 'Standard Rate',
            adminFriction: 'HQ Entry Approval'
          }
        },
        {
          id: 'sub-2-' + Date.now(),
          title: 'Core Field Execution',
          description: `Execute core task: ${taskDesc}`,
          targetScope: isStatementOrWitnessTask ? 'witnesses' : isDigitalOrCyberTask ? 'cyber' : isLabTask ? 'labs' : isSceneProcessingTask ? 'scene' : isSeizureOrMalkhanaTask ? 'exhibits' : 'scene',
          status: isMemberBusy ? 'pending' : (blockers.length > 0 ? 'pending' : 'running'),
          timeCostDays: Math.max(1, timeCostDays - 1),
          frictionFactors: {
            complexity: (isLabTask || isDigitalOrCyberTask) ? 'High Technical Scope (+1.5x)' : isStatementOrWitnessTask ? 'Examination Protocol' : 'Field Operation',
            prerequisites: isStatementOrWitnessTask ? 'Voluntariness & Right to Legal Counsel' : isSeizureOrMalkhanaTask ? 'BNSS Dual Witness Requirement' : 'Standard Authorization',
            specialtyBonus: senderName.includes('Dhanraj') ? 'Field Search Bonus (-0.4d)' : 'Standard Rate',
            adminFriction: isSeizureOrMalkhanaTask ? 'Malkhana Entry' : 'Case Docket Entry'
          }
        },
        {
          id: 'sub-3-' + Date.now(),
          title: 'Legal Compliance & Case Diary Filing',
          description: isStatementOrWitnessTask ? 'Record Section 180 BNSS statement, certify voluntariness, execute Section 23 BSA disclosure memo before witnesses, and log in Case Diary.' :
            isDigitalOrCyberTask ? 'Obtain bit-stream clone, compute SHA-256 hash, and execute mandatory BSA Section 63 certificate.' :
            isLabTask ? 'Procure government scientific expert report under BNSS s.329 and file in Case Diary.' :
            isSceneProcessingTask ? 'Complete 4-quadrant crime scene spot map, record observation notes under BNSS s.176, and seal scene.' :
            isSeizureOrMalkhanaTask ? 'File BNSS s.103 seizure memo, update Malkhana registry, and record Case Diary entry.' :
            'Document procedural steps taken under BNSS s.172 and enter updates in Case Diary.',
          targetScope: 'diary',
          status: 'pending',
          timeCostDays: 1,
          frictionFactors: {
            complexity: 'BNSS Administrative Compliance',
            prerequisites: 'Verified Dual Signatures',
            specialtyBonus: senderName.includes('Ravi') ? 'Procedure Bonus (-0.3d)' : 'Standard Rate',
            adminFriction: 'Case File Logging'
          }
        },
        {
          id: 'sub-4-' + Date.now(),
          title: 'Pro-active Player Update & Case Diary Sync',
          description: isStatementOrWitnessTask ? 'Transcribe statement notes, formalize disclosure records, and notify Investigating Officer in chat thread.' :
            isDigitalOrCyberTask ? 'Verify digital hash integrity, log in digital registry, and notify Investigating Officer in chat thread.' :
            isLabTask ? 'Correlate forensic findings, update admissibility ratings on Evidence Board, and notify Investigating Officer in chat thread.' :
            isSceneProcessingTask ? 'Synchronize scene photographs, compile crime scene log, and notify Investigating Officer in chat thread.' :
            isSeizureOrMalkhanaTask ? 'Update Malkhana register, preserve chain of custody, and notify Investigating Officer in chat thread.' :
            'Compile field findings, synchronize case records, and notify Investigating Officer in chat thread.',
          targetScope: 'chat',
          status: 'pending',
          timeCostDays: 0,
          requiresTimer: false
        }
      ],
      status: isMemberBusy ? 'queued' : 'running',
      createdDay: startDay,
      startDay: isMemberBusy ? teamMember.busy_until_day : startDay,
      dueDay
    };

    activeCase.directiveQueue = activeCase.directiveQueue || [];
    activeCase.directiveQueue.push(directivePayload);

    // If member is busy, put in queue and return queued response
    if (isMemberBusy) {
      const replyText = `Sir, I am currently deployed in the field working on: "${teamMember.current_task}". I have analyzed your directive ("${taskDesc}") and added it to my Task Queue. It will start automatically once I complete my current assignment on Day ${teamMember.busy_until_day}.`;
      return { replyText, directive: directivePayload, assignment: { create: false } };
    }

    // Member is available - launch directive
    const assignTaskType = isStatementOrWitnessTask ? 'interrogation' : isDigitalOrCyberTask ? 'device_image' : isLabTask ? 'forensic' : (isSceneProcessingTask || isSeizureOrMalkhanaTask) ? 'scene_processing' : 'field_directive';

    const newAssign = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      case_id: targetCaseId,
      player_id: this.player.id,
      member_id: memberId,
      task_type: assignTaskType,
      target_ref: null,
      description: taskDesc,
      days_cost: timeCostDays,
      start_day: startDay,
      due_day: dueDay,
      status: 'running',
      result_json: { auto_resolved_prerequisites: true, directive: directivePayload },
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      member: senderName
    };

    activeCase.assignments = activeCase.assignments || [];
    activeCase.assignments.push(newAssign);

    if (teamMember) {
      teamMember.busy_until_day = dueDay;
      teamMember.current_task = taskDesc;
    }

    // Add diary entry for launched directive
    activeCase.diary = activeCase.diary || [];
    activeCase.diary.unshift({
      day: activeCase.day || 1,
      time: '14:30',
      author: senderName,
      text: `Directive launched under BNSS procedures: "${taskDesc}". Scheduled completion on Day ${dueDay}.`,
      tag: 'FIELD'
    });

    let replyText = '';
    if (senderName.includes('Dhanraj')) {
      replyText = `Jai Hind, Officer! I am deploying to the field immediately for: "${taskDesc}". Scheduled completion on Day ${dueDay}. Findings will be synchronized live on the Evidence Board.`;
    } else if (senderName.includes('Preeti')) {
      replyText = `Sir, Preeti Nair here. Proceeding with electronic and cyber analysis for: "${taskDesc}". Scheduled completion on Day ${dueDay}. Findings will be synchronized live on the Evidence Board.`;
    } else if (senderName.includes('Ravi')) {
      replyText = `Understood, Sir! Junior Constable Ravi Deshmukh taking up assignment: "${taskDesc}". Scheduled completion on Day ${dueDay}. Findings will be synchronized live on the Evidence Board.`;
    } else {
      replyText = `Sir! I have taken up your directive as an active assignment: "${taskDesc}". Scheduled completion on Day ${dueDay}. Findings will be synchronized live on the Evidence Board.`;
    }

    if (/\b(case\s*summary|case\s*findings|case\s*overview|case\s*briefing|case\s*status|investigation\s*status)\b/i.test(lower)) {
      const fir = activeCase.fir || {};
      const seizedEx = (activeCase.exhibits || []).filter((e: any) => e.seized);
      const stmtsCount = (activeCase.persons || []).filter((p: any) => p.statement || p.summoned).length;
      replyText += `\n\n**Case Summary & Current Findings (Case #${activeCase.caseNo || activeCase.id || 2}):**\n` +
        `• **FIR Status**: FIR #${fir.fir_no || '102/2026'} registered under ${(fir.bns_sections || activeCase.statutes || ['BNS s.304']).join(', ')}.\n` +
        `• **Persons Examined**: ${stmtsCount} suspect(s)/witness(es) summoned or questioned under BNSS s.180.\n` +
        `• **Evidence Seized**: ${seizedEx.length} physical exhibit(s) deposited into Malkhana register.\n` +
        `• **Locus**: ${activeCase.scene?.name || activeCase.scene?.description || 'Crime Scene Locus'} cordoned and documented.`;
    }

    return { replyText, directive: directivePayload, assignment: { create: true, ...newAssign } };
  }

  public async postChatMessage(threadId: number, body: any, apiKey?: string): Promise<any> {
    const threadData = this.chatThreads.get(threadId) || {
      thread: this.threads.find(t => t.id === threadId) || { id: threadId, title: 'HQ Desk', kind: 'assistant' },
      messages: []
    };
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    threadData.messages = threadData.messages || [];
    const userText = (body.message || body.text || '').trim();

    // 1. Add player message
    const userMsg = {
      id: Date.now(),
      thread_id: threadId,
      sender: 'Investigating Officer',
      role: 'player',
      body: userText,
      effect_json: null,
      created_at: nowStr
    };
    threadData.messages.push(userMsg);

    // 2. Generate NPC reply
    const kind = threadData.thread?.kind || 'assistant';
    const senderName = threadData.thread?.title || 'Branch Staff';
    const activeCase = this.snapshots.get(this.player.activeCaseId || 2);
    if (activeCase) {
      this.checkAssignmentsAndLabs(activeCase);
    }

    // Multi-turn thread history before this new message
    const priorMsgs = threadData.messages.slice(0, -1);
    const intentAnalysis = classifySpiritAndIntent(userText, activeCase, kind, senderName, priorMsgs);

    let replyBody = '';
    let assignment: any = { create: false, task_type: '', description: '', days_cost: 0 };
    let activeDirective: any = null;
    let effect: any = { kind: 'none', amount: 0, detail: '' };
    let actionItems: string[] = [];

    // Optional Gemini AI integration with Dynamic Multi-Model Auto-Routing & Resilient Fallback
    let modelTelemetry = {
      tier: 'offline',
      model: 'deterministic-engine',
      fellBack: false
    };

    const keyToUse = apiKey || process.env.GEMINI_API_KEY;
    if (keyToUse) {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: keyToUse });
        const recentMsgs = formatConversationHistory(priorMsgs, senderName);
        
        const prompt = buildGroundedAiPrompt({
          senderName,
          senderKind: kind,
          userText,
          intentResult: intentAnalysis,
          activeCase,
          conversationHistory: recentMsgs
        });
        if (!isGeminiQuotaBlocked()) {
          const routeDecision = classifyTaskComplexity({
            userText,
            intentCategory: intentAnalysis.intent,
            senderKind: kind,
            senderName,
            hasEvidenceMention: !!intentAnalysis.entities?.targetExhibit,
            hasLegalStatute: (intentAnalysis.entities?.legalSections || []).length > 0
          });

          const genResult = await generateWithFallback(ai, routeDecision, {
            contents: prompt,
            config: { responseMimeType: 'application/json' },
            timeoutMs: 8000
          });

          if (genResult && genResult.text) {
            modelTelemetry = {
              tier: genResult.tierUsed,
              model: genResult.modelUsed,
              fellBack: genResult.fellBack
            };
            const rawText = genResult.text.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(rawText);
            if (parsed.reply) {
              replyBody = parsed.reply;
              if (parsed.action_item) actionItems.push(parsed.action_item);

              // Directive handling for field members (scheduling background assignments)
              if ((intentAnalysis.intent.startsWith('ORDER_') || this.isCommandDirective(userText, activeCase, kind, senderName)) && activeCase) {
                if (kind === 'assistant' || kind === 'member' || kind === 'fsl') {
                  const memberId = threadData.thread?.member_id || (kind === 'assistant' ? 1 : 2);
                  const res = this.processTaskWithBlockers(activeCase, userText, senderName, memberId, intentAnalysis);
                  // Keep the AI's natural reply if present, otherwise use task confirmation
                  if (!replyBody) replyBody = res.replyText;
                  assignment = res.assignment;
                  if (res.directive) activeDirective = res.directive;
                }
              }
            }
          }
        }
      } catch (e: any) {
        reportGeminiQuotaError(e);
      }
    }

    // High quality procedural fallback based on real-time game status
    if (!replyBody) {
      const lower = userText.toLowerCase().trim();
      const isGreeting = intentAnalysis.intent === 'SOCIAL_GREETING' || /^(\b(hi|hello|hey|good\s*morning|good\s*afternoon|good\s*evening|namaste|sir)\b[!.]?)$/i.test(lower) || lower === 'hi' || lower === 'hello' || lower === 'hey';
      const isAck = intentAnalysis.intent === 'SOCIAL_ACK' || lower === 'ok' || lower === 'okay' || lower === 'thanks' || lower === 'thank you' || lower === 'got it' || lower === 'great';

      if (isGreeting) {
        if (kind === 'assistant') {
          replyBody = "Good day, Sir! Junior Constable Ravi Deshmukh reporting. Ready for your directives on Case #" + (activeCase?.caseNo || '2417/682') + ".";
        } else if (kind === 'member') {
          replyBody = `Jai Hind, Officer. Standing by for your instructions.`;
        } else if (kind === 'fsl') {
          replyBody = "FSL Liaison Desk. How can we assist the investigating team today, Officer?";
        } else if (kind === 'senior') {
          replyBody = "Good day, Officer. How is the investigation progressing on Case #" + (activeCase?.caseNo || '2417/682') + "?";
        } else if (kind === 'head') {
          replyBody = "Good day. Do you have a progress update on the case file?";
        } else {
          replyBody = "Good day, Officer. Standing by.";
        }
      } else if (isAck) {
        replyBody = "Glad to assist, Sir. Standing by.";
      } else if ((intentAnalysis.intent.startsWith('ORDER_') || this.isCommandDirective(userText, activeCase, kind, senderName)) && activeCase) {
        if (kind === 'assistant' || kind === 'member' || kind === 'fsl') {
          const memberId = threadData.thread?.member_id || (kind === 'assistant' ? 1 : 2);
          const res = this.processTaskWithBlockers(activeCase, userText, senderName, memberId, intentAnalysis);
          replyBody = res.replyText;
          assignment = res.assignment;
          if (res.directive) activeDirective = res.directive;
        } else {
          replyBody = this.processSeniorDirectiveResponse(senderName, kind, userText, activeCase);
        }
      } else {
        replyBody = this.generateDynamicNonDirectiveReply(senderName, kind, userText, activeCase, threadData.messages.length);
      }
    }

    const replyMsg = {
      id: Date.now() + 5,
      thread_id: threadId,
      sender: senderName,
      role: 'npc',
      body: replyBody,
      intent: intentAnalysis.intent,
      spirit: intentAnalysis.spirit,
      model_tier: modelTelemetry.tier,
      model_name: modelTelemetry.model,
      fell_back: modelTelemetry.fellBack,
      directive_json: activeDirective ? JSON.stringify(activeDirective) : null,
      effect_json: JSON.stringify({ effect, assignment, directive: activeDirective, intent: intentAnalysis.intent, spirit: intentAnalysis.spirit, model_tier: modelTelemetry.tier, model_name: modelTelemetry.model, fell_back: modelTelemetry.fellBack }),
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    threadData.messages.push(replyMsg);

    if (threadData.thread) {
      threadData.thread.last_at = replyMsg.created_at;
      threadData.thread.unread = 0;
    }
    this.chatThreads.set(threadId, threadData);
    this.bumpRev();

    const groundedMetadata = {
      targetPerson: intentAnalysis.entities.targetPerson ? {
        id: intentAnalysis.entities.targetPerson.id,
        name: intentAnalysis.entities.targetPerson.name,
        role: intentAnalysis.entities.targetPerson.role,
        isAccused: intentAnalysis.entities.targetPerson.isAccused,
        inChamber: intentAnalysis.entities.targetPerson.inChamber,
        hasInterview: !!intentAnalysis.entities.targetPerson.interviewSummary
      } : null,
      targetExhibit: intentAnalysis.entities.targetExhibit ? {
        id: intentAnalysis.entities.targetExhibit.id,
        code: intentAnalysis.entities.targetExhibit.code,
        title: intentAnalysis.entities.targetExhibit.title,
        seized: intentAnalysis.entities.targetExhibit.seized
      } : null,
      interrogationMentioned: intentAnalysis.entities.interrogationMentioned,
      intent: intentAnalysis.intent,
      spirit: intentAnalysis.spirit
    };

    return {
      thread: threadData.thread,
      messages: threadData.messages,
      reply: {
        sender: senderName,
        role: 'npc',
        body: replyBody,
        intent: intentAnalysis.intent,
        spirit: intentAnalysis.spirit,
        effect,
        assignment,
        directive: activeDirective,
        action_items: actionItems,
        grounding: groundedMetadata
      },
      intent: intentAnalysis.intent,
      spirit: intentAnalysis.spirit,
      directive: activeDirective,
      grounding: groundedMetadata,
      snapshot: activeCase,
      bundle: this.getFullBundle(activeCase?.id)
    };
  }

  public hireCandidate(body: any): any {
    const cid = Number(body.candidateId);
    const candidate = this.candidates.find(c => c.id === cid);
    if (candidate) {
      this.team.push({
        id: Date.now(),
        player_id: 1,
        candidate_id: candidate.id,
        name: candidate.name,
        role: candidate.role,
        speciality: candidate.speciality,
        skill: candidate.skill,
        trust: 8,
        is_assistant: 0,
        morale: 80
      });
    }
    this.bumpRev();
    return this.getFullBundle();
  }

  public updateSettings(patch: any): any {
    this.player.settings = {
      ...this.player.settings,
      ...patch,
      presentation: {
        ...(this.player.settings?.presentation || {}),
        ...(patch.presentation || {})
      },
      tactical: {
        ...(this.player.settings?.tactical || {}),
        ...(patch.tactical || {})
      }
    };
    this.saveState();
    this.bumpRev();
    return { ok: true, player: this.player, settings: this.player.settings };
  }

  public updatePlayer(body: any): any {
    if (body.fullName || body.displayName) this.player.fullName = body.fullName || body.displayName;
    if (body.callsign) this.player.callsign = body.callsign;
    if (body.badgeNo || body.badgeNumber) this.player.badgeNo = body.badgeNo || body.badgeNumber;
    if (body.division || body.posting) this.player.posting = body.division || body.posting;
    if (body.bio) this.player.bio = body.bio;
    if (body.avatarUrl) this.player.avatarUrl = body.avatarUrl;
    if (body.motto) this.player.motto = body.motto;
    if (body.rank || body.rankTitle) this.player.rank = body.rank || body.rankTitle;
    if (body.clearanceLevel !== undefined) this.player.clearanceLevel = body.clearanceLevel;
    if (body.meritScore !== undefined || body.standing !== undefined) {
      this.player.standing = body.meritScore !== undefined ? body.meritScore : body.standing;
    }
    if (body.casesClosed !== undefined) this.player.casesClosed = body.casesClosed;
    if (body.careerStats) this.player.careerStats = { ...(this.player.careerStats || {}), ...body.careerStats };
    if (body.ribbons) this.player.ribbons = body.ribbons;
    if (body.perks) this.player.perks = body.perks;
    this.saveState();
    this.bumpRev();
    return { ok: true, player: this.player };
  }

  public getGuide(): any {
    return this.guideData;
  }

  public getLegalIndex(act: string, offset: number = 0, limit: number = 80): any {
    let source = this.legalBns;
    if (act === 'BNSS') source = this.legalBnss;
    else if (act === 'BSA') source = this.legalBsa;
    else if (act === 'ALLIED') source = this.legalAllied;

    const rawSections = (source.rows || source.sections || []);
    const total = source.total || rawSections.length || 0;
    const formatted = rawSections.slice(offset, offset + limit).map((s: any) => ({
      ...s,
      act: s.act || act,
      gist: s.gist || s.description || s.summary || '',
      bare: s.bare || s.description || s.gist || ''
    }));

    return {
      act,
      total,
      offset,
      limit,
      sections: formatted,
      rows: formatted
    };
  }

  public async searchLegal(q: string, act: string = 'ALL', apiKey?: string): Promise<any> {
    const rawQuery = (q || '').trim();
    const query = rawQuery.toLowerCase();
    if (!query) {
      return { query: rawQuery, results: [], rows: [], summary: 'Provide a query to search the library.', candidates: 0 };
    }

    const poolBns = (this.legalBns.rows || this.legalBns.sections || []).map((s: any) => ({ ...s, act: 'BNS' }));
    const poolBnss = (this.legalBnss.rows || this.legalBnss.sections || []).map((s: any) => ({ ...s, act: 'BNSS' }));
    const poolBsa = (this.legalBsa.rows || this.legalBsa.sections || []).map((s: any) => ({ ...s, act: 'BSA' }));
    const poolAllied = (this.legalAllied.rows || this.legalAllied.sections || []).map((s: any) => ({ ...s, act: 'ALLIED' }));

    const searchPool = act === 'BNS' ? poolBns
      : act === 'BNSS' ? poolBnss
      : act === 'BSA' ? poolBsa
      : act === 'ALLIED' ? poolAllied
      : [...poolBns, ...poolBnss, ...poolBsa, ...poolAllied];

    // Tokenize query words
    const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'may', 'i', 'can', 'do', 'how']);
    const tokens = query.split(/[\s,?.!]+/).filter(t => t.length > 1 && !stopWords.has(t));

    // Check if query is a specific statutory citation (e.g. "BNSS s.180", "BNS 304", "BSA s.63", "s.180")
    const citeMatch = rawQuery.match(/^(?:(BNSS|BNS|BSA|IPC|CrPC|IEA)\s*)?(?:s\.|section|sec\.?)?\s*([0-9]{1,4}[a-z]?(?:\([0-9a-z]+\))?)$/i);
    const citeAct = citeMatch ? (citeMatch[1] || '').toUpperCase() : '';
    const citeSec = citeMatch ? citeMatch[2].toLowerCase() : '';

    const scored: { item: any; score: number; why: string }[] = [];

    for (const item of searchPool) {
      const secStr = String(item.section || '').toLowerCase();
      const titleStr = String(item.title || '').toLowerCase();
      const plainStr = String(item.plain || '').toLowerCase();
      const gameStr = String(item.in_game || '').toLowerCase();
      const gistStr = String(item.gist || item.description || item.bare || '').toLowerCase();
      const chapStr = String(item.chapter || '').toLowerCase();
      const allText = `${secStr} ${titleStr} ${plainStr} ${gameStr} ${gistStr} ${chapStr}`;

      let score = 0;

      // Direct section citation match bonus
      if (citeSec && secStr === citeSec) {
        if (!citeAct || item.act.toUpperCase() === citeAct) {
          score += 10000;
        } else {
          score += 600;
        }
      }

      // Exact query match
      if (allText.includes(query)) score += 50;
      if (titleStr.includes(query)) score += 30;
      if (secStr === query || secStr.includes(query)) score += 40;

      // Token matches
      for (const tok of tokens) {
        if (secStr.includes(tok)) score += 25;
        if (titleStr.includes(tok)) score += 15;
        if (plainStr.includes(tok)) score += 10;
        if (gameStr.includes(tok)) score += 10;
        if (gistStr.includes(tok)) score += 5;
      }

      if (item.curated) score += 5;

      if (score > 0) {
        const why = item.in_game
          ? item.in_game
          : item.plain
          ? item.plain
          : `Statutory mandate under ${item.act} s.${item.section} covering ${item.title || 'this procedure'}.`;

        scored.push({
          item: {
            ...item,
            gist: item.gist || item.description || item.summary || '',
            bare: item.bare || item.description || item.gist || '',
            why
          },
          score,
          why
        });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topScored = scored.slice(0, 25).map(s => s.item);

    // If query is an exact section citation (e.g. "BNSS s.180", "BNS 304"), return immediately
    if (citeMatch && topScored.length > 0) {
      const topItem = topScored[0];
      return {
        query: rawQuery,
        mode: 'exact',
        summary: `Statutory provision ${topItem.act} Section ${topItem.section}: ${topItem.title || 'Provisions & Procedure'}.`,
        candidates: scored.length,
        results: topScored,
        related: [
          `${topItem.act} s.${topItem.section}`,
          ...topScored.slice(1, 4).map((x: any) => `${x.act} s.${x.section}`)
        ]
      };
    }

    // AI Semantic Research Assistant if Gemini key is available
    const activeKey = apiKey || process.env.GEMINI_API_KEY;
    if (activeKey && topScored.length > 0) {
      try {
        const client = new GoogleGenAI({ apiKey: activeKey });
        const candidateSummaries = topScored.slice(0, 10).map((r, i) =>
          `[${i + 1}] ${r.act} s.${r.section}: ${r.title}. ${r.plain || r.gist || ''}`
        ).join('\n');

        const prompt = `You are the legal research assistant for the Indian Criminal Procedure & Penal Code (BNS 2023, BNSS 2023, BSA 2023, Allied Acts) in a realistic police simulation.
The officer asked: "${rawQuery}"

Candidate provisions from the library:
${candidateSummaries}

Provide a JSON response with:
1. "summary": A 1-2 sentence authoritative plain-English guidance explaining how the law answers the question.
2. "topIndices": An array of numbers (1-indexed) of the top 3-6 most relevant provisions from the list in order of importance.
3. "whys": An object mapping the 1-indexed number to a brief (1 sentence) specific operational explanation of why it applies to this specific question.
4. "related": An array of 2-4 related statutory references (e.g. ["BNSS s.105", "BSA s.63"]).

Return ONLY valid JSON matching this format without backticks or markdown wrap:
{"summary": "...", "topIndices": [1, 2], "whys": {"1": "..."}, "related": ["..."]}`;

        if (!isGeminiQuotaBlocked()) {
          const aiRes = await client.models.generateContent({
            model: DEFAULT_GEMINI_MODEL,
            contents: prompt
          });

          const rawAiText = (aiRes.text || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
          const parsed = JSON.parse(rawAiText);

          if (parsed && Array.isArray(parsed.topIndices) && parsed.topIndices.length > 0) {
            const aiRanked: any[] = [];
            for (const idx of parsed.topIndices) {
              const item = topScored[idx - 1];
              if (item) {
                const specificWhy = (parsed.whys && parsed.whys[String(idx)]) || item.why;
                aiRanked.push({ ...item, why: specificWhy });
              }
            }

            // Add any remaining top items
            for (const item of topScored) {
              if (!aiRanked.some(x => x.act === item.act && x.section === item.section)) {
                aiRanked.push(item);
              }
            }

            return {
              query: rawQuery,
              mode: 'ai',
              results: aiRanked.slice(0, 20),
              rows: aiRanked.slice(0, 20),
              summary: parsed.summary || `Assistant curated reading list for "${rawQuery}".`,
              candidates: scored.length,
              related: parsed.related || ['BNSS s.105', 'BSA s.63', 'BNS s.309']
            };
          }
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }

    const relatedFallback = topScored.slice(0, 4).map(r => `${r.act} s.${r.section}`);
    return {
      query: rawQuery,
      mode: 'keyword',
      results: topScored,
      rows: topScored,
      summary: topScored.length > 0
        ? `Found ${topScored.length} provisions directly addressing "${rawQuery}".`
        : `No provisions directly matched "${rawQuery}".`,
      candidates: scored.length,
      related: relatedFallback
    };
  }

  public getApplyQuestions(): any {
    return this.applyQuestions;
  }

  public getApplySubjective(): any {
    return this.applySubjective;
  }

  // --- Enforce Lawful Panch Witnesses on BSA s.23 Recoveries & Exhibits ---
  private autoAttachWitnessesToRecoveries(snap: any): void {
    if (!snap) return;

    // Helper: is this name a suspect or accused? An accused can NEVER be a panch witness
    const isSuspectOrAccused = (name: string | null | undefined): boolean => {
      if (!name) return false;
      const lower = name.toLowerCase().trim();
      return (snap.persons || []).some((p: any) => {
        const pLower = (p.name || '').toLowerCase().trim();
        return (p.role === 'suspect' || p.role === 'accused' || p.is_culprit) && (pLower === lower || pLower.includes(lower) || lower.includes(pLower));
      });
    };

    // Helper: has this person actually disclosed knowledge or been examined about this item?
    const hasDisclosedKnowledge = (name: string | null | undefined, refItem: any): boolean => {
      if (!name) return false;
      if (isSuspectOrAccused(name)) return false; // Accused can NEVER be a panch witness
      const confirmed = (refItem.confirmedWitnesses || []);
      if (confirmed.includes(name)) return true;
      const person = (snap.persons || []).find((p: any) => p.name === name);
      if (person && (person.knownExhibits || []).some((k: string) => refItem.description?.toLowerCase().includes(k.toLowerCase()) || refItem.name?.toLowerCase().includes(k.toLowerCase()))) {
        return true;
      }
      return false;
    };

    // 1. Sanitize all recoveries: Remove any accused or uninterrogated persons
    (snap.recoveries || []).forEach((r: any) => {
      // Check witness_a
      if (r.witness_a && (isSuspectOrAccused(r.witness_a) || (!r.manuallyEntered && !hasDisclosedKnowledge(r.witness_a, r)))) {
        r.witness_a = null;
      }
      // Check witness_b
      if (r.witness_b && (isSuspectOrAccused(r.witness_b) || (!r.manuallyEntered && !hasDisclosedKnowledge(r.witness_b, r)) || r.witness_b === r.witness_a)) {
        r.witness_b = null;
      }

      // Check if confirmed witnesses exist that can be attached
      const validConfirmed = (r.confirmedWitnesses || []).filter((w: string) => !isSuspectOrAccused(w));
      if (!r.witness_a && validConfirmed.length > 0) {
        r.witness_a = validConfirmed[0];
      }
      if (!r.witness_b && validConfirmed.length > 1 && validConfirmed[1] !== r.witness_a) {
        r.witness_b = validConfirmed[1];
      }

      const hasTwoDistinctWitnesses = Boolean(r.witness_a && r.witness_b && r.witness_a !== r.witness_b && !isSuspectOrAccused(r.witness_a) && !isSuspectOrAccused(r.witness_b));
      r.s23_valid = hasTwoDistinctWitnesses;
      r.witnesses = hasTwoDistinctWitnesses ? [r.witness_a, r.witness_b] : (r.witness_a ? [r.witness_a] : []);
      r.status = hasTwoDistinctWitnesses ? 'witnessed_recovery_completed' : 'disclosed_pending_panchnama';
    });

    // 2. Sanitize all exhibits: Remove any accused or unconfirmed witnesses
    (snap.exhibits || []).forEach((e: any) => {
      if (e.manuallyReset) {
        e.seized = false;
        e.seizureValid = false;
        e.admissibility = 'unseized';
        e.witnessA = null;
        e.witnessB = null;
        e.witness1 = null;
        e.witness2 = null;
        if (e.isDisclosure || e.category === 'interrogation_disclosure') {
          e.category = 'others';
        }
        return;
      }

      if (e.witnessA && (isSuspectOrAccused(e.witnessA) || (!e.manuallyEntered && !hasDisclosedKnowledge(e.witnessA, e)))) {
        e.witnessA = null;
      }
      if (e.witnessB && (isSuspectOrAccused(e.witnessB) || (!e.manuallyEntered && !hasDisclosedKnowledge(e.witnessB, e)) || e.witnessB === e.witnessA)) {
        e.witnessB = null;
      }

      // If this is a disclosure exhibit, ensure category is 'others' and sync with linked recovery if available
      if (e.isDisclosure || e.category === 'others' || e.category === 'interrogation_disclosure') {
        e.category = 'others';
        const linkedRec = (snap.recoveries || []).find((r: any) =>
          (r.item && e.name && r.item.toLowerCase().includes(e.name.toLowerCase())) ||
          (r.description && e.name && r.description.toLowerCase().includes(e.name.toLowerCase()))
        );
        if (linkedRec) {
          if (!e.witnessA && linkedRec.witness_a) e.witnessA = linkedRec.witness_a;
          if (!e.witnessB && linkedRec.witness_b) e.witnessB = linkedRec.witness_b;
          e.seizureValid = linkedRec.s23_valid;
          e.seized = linkedRec.s23_valid;
          e.admissibility = linkedRec.s23_valid ? 'admissible' : 'unseized';
        } else {
          const hasTwoExWitnesses = Boolean(e.witnessA && e.witnessB && e.witnessA !== e.witnessB && !isSuspectOrAccused(e.witnessA) && !isSuspectOrAccused(e.witnessB));
          e.seizureValid = hasTwoExWitnesses;
          if (!e.manuallyEntered && !hasTwoExWitnesses) {
            e.seized = false;
            e.admissibility = 'unseized';
          }
        }
      }
    });

    // 3. Remove obsolete defective diary entries that paired accused as panch witnesses
    snap.diary = (snap.diary || []).filter((d: any) => {
      const text = d.body || d.text || '';
      return !(text.includes('AUTOMATIC PANCH ATTACHMENT') && (text.includes('Imran Pawar') || text.includes('Vikram Shaikh')));
    });
  }

  // --- Auto-Recalculate Readiness & Blockers ---
  private recalculateCaseReadiness(snap: any) {
    this.autoAttachWitnessesToRecoveries(snap);

    let taintedCount = 0;
    let witnessCount = 0;
    let accusedCount = 0;
    let totalAdmissibleWeight = 0;

    (snap.exhibits || []).forEach((e: any) => {
      const baseW = this.getExhibitBaseWeight(e);
      if (e.seized && (e.tainted || e.admissibility === 'tainted')) {
        taintedCount++;
        e.weight = 0;
      } else if (e.seized && (e.seizureValid || e.admissibility === 'admissible')) {
        let w = baseW;
        if (e.isDigital && (e.s63Certified || e.s63_certified || e.s63SignerA)) w += 15;
        if (e.labStatus === 'collected' || e.labResult) w += 15;
        e.weight = w;
        e.admissibility = 'admissible';
        totalAdmissibleWeight += e.weight;
      } else if (e.found && !e.seized) {
        e.weight = 0;
      } else if (!e.weight) {
        e.weight = 0;
      }
    });

    (snap.persons || []).forEach((p: any) => {
      if (p.statement || (p.statements && p.statements.length)) witnessCount++;
      if (p.status === 'in_custody' || p.arrested) accusedCount++;
    });

    const hasRecoveries = (snap.recoveries && snap.recoveries.length > 0);
    if (hasRecoveries) {
      snap.recoveries.forEach((r: any) => {
        if (r.s23_valid) totalAdmissibleWeight += (r.weight || 25);
      });
    }

    const blockers: any[] = [];
    const alerts: any[] = [];

    (snap.exhibits || []).forEach((e: any) => {
      if (e.seized && (e.tainted || e.admissibility === 'tainted')) {
        blockers.push({
          id: `taint_${e.id}`,
          severity: 'critical',
          act: 2,
          title: `Exhibit ${e.exhibitNo || e.name} is TAINTED`,
          detail: 'Independent witness 1 is not recorded (BNSS s.103 requires two or more). Independent witness 2 is not recorded (BNSS s.103 requires two or more).',
          fix: 'Use the redo button to clear the defective memo and record two independent respectable witnesses under BNSS s.103.'
        });
        alerts.push({ level: 'critical', text: `Exhibit ${e.exhibitNo || e.name} is TAINTED` });
      }

      if ((e.isDigital || e.category === 'digital') && e.seized && !e.s63Certified && !e.s63_certified) {
        blockers.push({
          id: `s63_${e.id}`,
          severity: 'warning',
          act: 3,
          title: `Exhibit ${e.exhibitNo || e.name} requires BSA s.63 Certificate`,
          detail: 'Electronic record inadmissible without dual-signed certificate.',
          fix: 'Obtain s.63 certificate with person in charge and digital forensic expert signatures.'
        });
      }
    });

    const hasDisclosures = (snap.leads && snap.leads.some((l: any) => l.locatable && !l.followed));

    if (hasDisclosures && !hasRecoveries) {
      blockers.push({
        id: 'no_s23',
        severity: 'critical',
        act: 6,
        title: 'Nothing admissible has come from interrogation',
        detail: 'Talk alone proves nothing (BSA s.23). No disclosure has been converted into a witnessed recovery.',
        fix: 'Follow a locatable disclosure to a physical recovery, made before two respectable witnesses.'
      });
      alerts.push({ level: 'critical', text: 'Nothing admissible has come from interrogation' });
    }

    snap.blockers = blockers;
    snap.alerts = alerts;

    const evidenceQuality = Math.max(0, 100 - (taintedCount * 30) + (hasRecoveries ? 35 : 0) + (witnessCount * 10));

    snap.readiness = {
      chargeSheetReady: (witnessCount >= 1 && (totalAdmissibleWeight >= 25 || evidenceQuality > 40)),
      admissibleWeight: totalAdmissibleWeight,
      taintedCount,
      inadmissibleCount: 0,
      witnessCount,
      accusedCount,
      evidenceQuality: Math.min(100, Math.max(totalAdmissibleWeight, evidenceQuality))
    };
  }
}

export const cfzEngine = new CfzEngine();
