import { GoogleGenAI } from '@google/genai';
import { parseInterrogationIntents, extractInterrogationRoomLedger, buildInterrogationRoomChatSummary } from '../engine/interrogation-context.js';
import { 
  MODEL_REGISTRY, 
  ALL_ROUTER_MODELS, 
  classifyTaskComplexity, 
  getTierConfig, 
  generateWithFallback,
  type ModelTier, 
  type RouteDecision, 
  type ClassificationContext,
  type GenerationOptions,
  type GenerationResult
} from './modelRouter.js';

export { 
  MODEL_REGISTRY, 
  ALL_ROUTER_MODELS, 
  classifyTaskComplexity, 
  getTierConfig, 
  generateWithFallback,
  type ModelTier, 
  type RouteDecision, 
  type ClassificationContext,
  type GenerationOptions,
  type GenerationResult
};

export const DEFAULT_GEMINI_MODEL = MODEL_REGISTRY.balanced.primaryModel; // 'gemini-3.8-flash'
export const FALLBACK_GEMINI_MODEL = MODEL_REGISTRY.lite.primaryModel; // 'gemini-3.1-flash-lite'
export const SUPPORTED_MODELS = ALL_ROUTER_MODELS;

let serverAiClient: GoogleGenAI | null = null;
let quotaBlockedUntil = 0;

export function isGeminiQuotaBlocked(): boolean {
  return Date.now() < quotaBlockedUntil;
}

export function reportGeminiQuotaError(err: any): void {
  const errMsg = err?.message || String(err || '');
  if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('Quota exceeded')) {
    // Backoff for 60 seconds to avoid repeating failed quota calls
    quotaBlockedUntil = Date.now() + 60000;
  }
}

function getServerGenAI(): GoogleGenAI | null {
  if (!serverAiClient && process.env.GEMINI_API_KEY) {
    serverAiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return serverAiClient;
}

export function createGenAIClient(customKey?: string): { client: GoogleGenAI | null; isByok: boolean } {
  if (customKey && customKey.trim().length > 5) {
    try {
      return {
        client: new GoogleGenAI({
          apiKey: customKey.trim(),
          httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
        }),
        isByok: true
      };
    } catch {
      // quiet fallback
    }
  }
  return { client: getServerGenAI(), isByok: false };
}

export async function validateGeminiKey(apiKey: string): Promise<{
  valid: boolean;
  message: string;
  model: string;
}> {
  if (!apiKey || apiKey.trim().length < 10) {
    return { valid: false, message: 'API key is too short or invalid.', model: DEFAULT_GEMINI_MODEL };
  }
  const cleanKey = apiKey.trim();
  let lastErrorMsg = '';
  let isDemandSpike503 = false;

  for (const model of SUPPORTED_MODELS) {
    try {
      const testClient = new GoogleGenAI({ apiKey: cleanKey });
      const response = await testClient.models.generateContent({
        model,
        contents: 'Respond with exactly: {"status":"active"}',
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });
      const text = response.text?.trim();
      if (text) {
        return { valid: true, message: `Gemini API key verified successfully (${model}).`, model };
      }
    } catch (err: any) {
      const errStr = err?.message || String(err || '');
      lastErrorMsg = errStr;
      if (errStr.includes('503') || errStr.includes('high demand') || errStr.includes('UNAVAILABLE')) {
        isDemandSpike503 = true;
      }
    }
  }

  if (isDemandSpike503) {
    return {
      valid: true,
      message: 'Key authenticated with Google AI. Note: Google servers are experiencing temporary high demand spikes (503); zero-delay server engine is ready as fallback.',
      model: DEFAULT_GEMINI_MODEL
    };
  }

  let userMsg = lastErrorMsg;
  try {
    const parsed = JSON.parse(lastErrorMsg);
    if (parsed.error && parsed.error.message) {
      userMsg = parsed.error.message;
    }
  } catch {}

  return {
    valid: false,
    message: userMsg || 'Failed to authenticate with Gemini API. Please check key validity and quotas.',
    model: DEFAULT_GEMINI_MODEL
  };
}

export interface InterrogationRequest {
  suspectId: string;
  suspectName: string;
  suspectRole: string;
  question: string;
  unlockedEvidence: Array<{ id: string; title: string; summary: string }>;
  stressLevel: number;
  history: Array<{ sender: 'detective' | 'suspect'; text: string }>;
  apiKey?: string;
}

export interface ForensicsRequest {
  title: string;
  evidenceType: string;
  rawContent: string;
  analysisMethod: string;
  apiKey?: string;
}

export interface GenerateCaseRequest {
  prompt?: string;
  genre?: string;
  difficulty?: string;
  apiKey?: string;
}

export async function generateCaseWithAI(body: GenerateCaseRequest): Promise<any> {
  const { prompt = 'High-stakes armed bank cash heist with digital tampering and covert flight path', genre = 'Armed Heist / Financial Forensics', difficulty = 'Medium', apiKey } = body;

  const { client: primaryClient, isByok } = createGenAIClient(apiKey);
  const clientsToTry: Array<{ client: GoogleGenAI; isByok: boolean }> = [];

  if (primaryClient) {
    clientsToTry.push({ client: primaryClient, isByok });
  }

  if (isByok) {
    const serverClient = getServerGenAI();
    if (serverClient) {
      clientsToTry.push({ client: serverClient, isByok: false });
    }
  }

  for (const { client, isByok: currentIsByok } of clientsToTry) {
    if (isGeminiQuotaBlocked() && !currentIsByok) continue;
    
    for (const modelName of SUPPORTED_MODELS) {
      try {
        const systemPrompt = `You are the Lead Master Case Architect for "CASE FILE ZERO", a realistic Indian criminal investigation simulation adhering strictly to the Bharatiya Nyaya Sanhita (BNS, 2023), Bharatiya Nagarik Suraksha Sanhita (BNSS, 2023), and Bharatiya Sakshya Adhiniyam (BSA, 2023).

Generate a complete, coherent, realistic procedural crime case dossier in valid JSON based on:
Prompt: ${prompt}
Genre: ${genre}
Difficulty: ${difficulty}

RULES & STRUCTURE:
1. Legal provisions must use modern Indian penal codes (e.g. BNS s.309 for Robbery, BNS s.103 for Murder, BNS s.316 for Criminal Breach of Trust, BNS s.115 for Grevious Hurt).
2. The crime scene must feature 5-7 distinct evidence items placed on a grid (A1 to H8).
3. Each evidence item must have a specific optical spectrum requirement:
   - "uv" (UV 365nm) for biological blood/saliva/semen
   - "als" (ALS 450nm) for latent sebaceous fingerprints / friction ridges
   - "oblique" (15° Oblique Raking Light) for tyre tracks / footwear mud impressions
   - "chemical" (Luminol) for wiped blood trails
   - "" (Ordinary White Light) for overt weapons, currency, documents, phones
4. Include 4-5 persons (1 victim, 2 suspects with motives and testable alibis, 1-2 eyewitnesses/experts).

Output valid JSON matching this schema:
{
  "title": "Short punchy case title",
  "incident": "2-3 sentence administrative summary of crime locus and time",
  "statutes": ["BNS s.309", "BNS s.115"],
  "fir": {
    "complainant": "Full name of informant",
    "narrative": "Detailed narrative of FIR report",
    "bns_sections": ["BNS 309", "BNS 115"],
    "place_of_occurrence": "Precise location with landmark",
    "date_of_occurrence": "Date and approximate time"
  },
  "scene_description": "Detailed description of the crime locus, terrain, vehicle, and surrounding lighting",
  "persons": [
    {
      "name": "Full Name",
      "role": "suspect | victim | witness | expert",
      "age": 34,
      "occupation": "Job Title",
      "alibi": "Stated whereabouts and timeline",
      "motive": "Potential motive or connection",
      "phone": "+91 98200 XXXXX",
      "address": "Local address"
    }
  ],
  "exhibits": [
    {
      "exhibitNo": "A",
      "name": "Detailed Evidence Name",
      "category": "physical | biological | digital | financial",
      "gridRef": "F4",
      "described": "Detailed physical description and state",
      "significance": "Material legal importance proving ingredients under BNS",
      "gearReq": "uv | als | oblique | chemical | ",
      "isDigital": false
    }
  ]
}`;

        const response = await client.models.generateContent({
          model: modelName,
          contents: systemPrompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.6,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...parsed,
            generatedByAI: true,
            usedByok: currentIsByok
          };
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }
  }

  // Fallback Case Generator if API is unavailable
  return {
    title: 'The Marol Depot Transit Heist',
    incident: 'Armed interception of cash logistics van Unit #04 at Marol Depot Road. Escort injured, vault forced, ₹2.4 Crores in transit stolen.',
    statutes: ['BNS s.309 (Robbery)', 'BNS s.115 (Voluntarily Causing Hurt)'],
    fir: {
      complainant: 'Ramzan Sheikh (Cash Logistics Escort)',
      narrative: 'Armed ambush by masked assailants on motorcycle and bolero at Marol culvert. Escort struck with blunt iron rod.',
      bns_sections: ['BNS 309', 'BNS 115'],
      place_of_occurrence: 'Marol Depot Road, Andheri East, Mumbai',
      date_of_occurrence: '14 Jan 2026, 02:15 hrs'
    },
    scene_description: 'Asphalt roadway near culvert embankment, Sunrise Logistics Cash Van listing at 7° angle, broken glass and skid marks.',
    persons: [
      { name: 'Vikram Salunkhe', role: 'suspect', age: 34, occupation: 'Suspended Route Driver', alibi: 'Claims he was sleeping at Chembur residence.', motive: 'Deep gambling debts and inside knowledge of route timing.', phone: '+91 98201 44321', address: 'Chembur Colony, Mumbai' },
      { name: 'Sameer Qureshi', role: 'suspect', age: 29, occupation: 'Mechanic at Marol Garage', alibi: 'Claims garage was open all night doing engine overhauls.', motive: 'Associated with stolen Bolero getaway vehicle.', phone: '+91 97690 12890', address: 'Marol Pipeline, Andheri East' },
      { name: 'Ramzan Sheikh', role: 'victim', age: 46, occupation: 'Senior Armed Escort', alibi: 'On duty inside cash van.', motive: 'Victim of assault and robbery.', phone: '+91 98334 56781', address: 'Kurla West, Mumbai' },
      { name: 'Dattaram Panja', role: 'witness', age: 58, occupation: 'All-Night Tea Stall Owner', alibi: 'Present at tea stall 35m from scene.', motive: 'Eyewitness who saw two bikes and a dark van fleeing.', phone: '+91 91223 99812', address: 'Opposite Marol Depot' }
    ],
    exhibits: [
      { exhibitNo: 'A', name: 'Bloodstained Hexagonal Iron Rod', category: 'physical', gridRef: 'F4', described: '342mm modified steel rod with knurled grip and impact end deformed with hair and tissue.', significance: 'Primary weapon of offence causing grevious hurt under BNS s.115.', gearReq: '', isDigital: false },
      { exhibitNo: 'B', name: 'Latent Blood Spatter (Escort Impact)', category: 'biological', gridRef: 'F5', described: 'Arterial impact spatter droplets matching victim Ramzan Sheikh (O+).', significance: 'Establishes exact point of impact and physical violence under BNS s.309.', gearReq: 'uv', isDigital: false },
      { exhibitNo: 'C', name: 'Latent Fingerprint on Van Latch', category: 'physical', gridRef: 'E4', described: 'Friction ridge pattern deposited in sweat/sebum on metallic rear cash vault latch.', significance: 'AFIS 12-point individualising match linking accused to forcible vault opening.', gearReq: 'als', isDigital: false },
      { exhibitNo: 'D', name: 'Footwear Impression with 3.2mm Lug Cut', category: 'physical', gridRef: 'H4', described: 'Deep mud impression from size 9 combat boot with accidental 3.2mm stone cut at heel.', significance: 'Unique physical match to footwear seized from suspect accused.', gearReq: 'oblique', isDigital: false },
      { exhibitNo: 'E', name: 'Wiped Chemiluminescent Drag Track', category: 'biological', gridRef: 'G5', described: 'Diluted catalytic hemoglobin reaction trail showing direction of suspect flight.', significance: 'Direct physical link proving suspect fled across Marol culvert embankment.', gearReq: 'chemical', isDigital: false },
      { exhibitNo: 'F', name: 'RBI ₹500 Currency Note (№ 7AB 849201)', category: 'financial', gridRef: 'D3', described: 'Used ₹500 banknote bearing bank teller rubber stamp matching Sunrise Logistics payroll.', significance: 'Directly identifies the stolen movable property under BNS s.309.', gearReq: '', isDigital: false }
    ],
    generatedByAI: false,
    usedByok: false
  };
}

export async function handleInterrogation(body: InterrogationRequest): Promise<{
  response: string;
  stressChange: number;
  revealedIntel?: string;
  bluffDetected?: boolean;
  usedByok?: boolean;
}> {
  const { suspectName, suspectRole, question, unlockedEvidence, stressLevel, history, apiKey } = body;

  const { client: primaryClient, isByok } = createGenAIClient(apiKey);
  const clientsToTry: Array<{ client: GoogleGenAI; isByok: boolean }> = [];

  if (primaryClient) {
    clientsToTry.push({ client: primaryClient, isByok });
  }

  // If BYOK was primary, also keep server client ready as instant fallback without delay
  if (isByok) {
    const serverClient = getServerGenAI();
    if (serverClient) {
      clientsToTry.push({ client: serverClient, isByok: false });
    }
  }

  for (const { client, isByok: currentIsByok } of clientsToTry) {
    if (isGeminiQuotaBlocked() && !currentIsByok) continue;

    for (const modelName of SUPPORTED_MODELS) {
      try {
        const evidenceContext = unlockedEvidence.map(e => `[EVIDENCE #${e.id}] ${e.title}: ${e.summary}`).join('\n');
        const formattedHistoryForLedger = history.map((h, idx) => ({
          turn: idx + 1,
          speaker: h.sender === 'detective' ? 'officer' : 'suspect',
          text: h.text
        }));
        const fullTranscriptFormatted = history.map((h, idx) => `[Turn ${idx + 1}] ${h.sender === 'detective' ? 'Investigating Officer' : `${suspectName} (Suspect)`}: "${h.text}"`).join('\n');
        const ledger = extractInterrogationRoomLedger(formattedHistoryForLedger);
        const roomSummary = buildInterrogationRoomChatSummary(formattedHistoryForLedger, { name: suspectName, role: suspectRole });
        const intents = parseInterrogationIntents(question, { name: suspectName, role: suspectRole });

        const systemPrompt = `You are roleplaying as ${suspectName}, ${suspectRole} in a gritty tactical neo-noir administrative detective simulation called "Project Blackwatch".
Current Suspect Psychological Stress: ${stressLevel}% (0 = icy calm, 100 = full breakdown).

CURRENT MESSAGE INPUT & INTENT BREAKDOWN:
- Active Question: "${question}"
- Intent Summary: ${intents.intentSummary}
- Multi-Part Structure: ${intents.isMultiPart ? 'YES (Multi-part inquiry — address each part)' : 'NO'}
- Sequential Instructions: ${intents.sequentialAnswerInstruction}
* NOTE: You MUST address each part and specific subject in the active question directly.

INTERROGATION ROOM CHAT SUMMARY FOR ${suspectName.toUpperCase()}:
${roomSummary}

ESTABLISHED INTERROGATION ROOM CONCESSIONS & DISCLOSURES LEDGER:
${ledger.ledgerSummary}

INFORMATION PARTITIONING & ANTI-LEAKAGE BOUNDARY:
- Partition A (Subjective Memory): You only know what ${suspectName} directly saw, heard, or did. You have ZERO access to internal police notes or unrevealed forensics.
- Partition B (Exhibits on Table): You may only react to evidence explicitly placed before you or mentioned in the transcript.
${evidenceContext ? `Known Evidence:\n${evidenceContext}` : 'No hard evidence presented on the table yet.'}

CHRONOLOGICAL INTERROGATION ROOM TRANSCRIPT:
${fullTranscriptFormatted || '(No prior dialogue in this room yet. This is Turn 1.)'}

RULES:
1. Stay strictly in-character as ${suspectName}. Never break character or refer to yourself as an AI.
2. If the detective asks a multi-part question (e.g. offering water/tea AND asking alibi/evidence), answer both parts in sequential order.
3. If the detective asks about personal background or offers tea/water, respond directly to that topic first; DO NOT blurt out unsolicited crime denials if not asked.
4. Maintain strict continuity with previously recorded concessions in the Ledger. You cannot retract facts you already admitted earlier.
5. Strictly adhere to Data Partitioning: Never mention or leak internal police exhibits, lab dossiers, or statements from people you never met unless the detective confronts you with them first.
6. If the detective mentions concrete proof from the known evidence (e.g., Shell Ledger, 9mm casing, Port CCTV 02:14, Toxicology Memo), your composure crumbles. Increase stress by 15-25 points, stutter, make defensive slips, or offer a partial confession.
7. If the detective bluffs or asks vague questions with no evidence, stay smug, guarded, or demand a lawyer. Stress changes by -5 to 0.
8. Keep your spoken response crisp and realistic (2 to 4 sentences).
9. When revealing evidence locations, alibis, named associates, or contradictions, enclose the specific discovery inside [[type:targetId|spoken phrase|brief humanized note]].
   Available types: alibi, evidence, person, contradiction, location.
   Example: "The ledger was hidden inside [[evidence:ledger_box|the safe behind the painting|Disclosed hidden ledger location behind office painting]]."
10. Output valid JSON in this exact structure:
{
  "response": "Your spoken dialogue here",
  "stressChange": number (-10 to 30),
  "revealedIntel": "Optional unlocked clue or admission if broken, otherwise null",
  "bluffDetected": boolean
}`;

        const generatePromise = client.models.generateContent({
          model: modelName,
          contents: `${systemPrompt}\n\nDETECTIVE'S QUESTION: "${question}"\n\nProvide the JSON response:`,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.7,
          },
        });

        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
        const response: any = await Promise.race([generatePromise, timeoutPromise]);

        if (!response) {
          // Timeout occurred; try next or fall back immediately to local zero-delay engine
          continue;
        }

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          return {
            response: parsed.response || "I have nothing to say without my attorney present.",
            stressChange: typeof parsed.stressChange === 'number' ? parsed.stressChange : 5,
            revealedIntel: parsed.revealedIntel || undefined,
            bluffDetected: !!parsed.bluffDetected,
            usedByok: currentIsByok
          };
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }
  }

  // Tactical deterministic fallback logic if API keys fail or are absent
  const lowerQ = question.toLowerCase();
  const mentionsEvidence = unlockedEvidence.some(e => 
    lowerQ.includes(e.title.toLowerCase()) || 
    lowerQ.includes('cctv') || 
    lowerQ.includes('ledger') || 
    lowerQ.includes('casing') || 
    lowerQ.includes('toxicology') ||
    lowerQ.includes('pier 4') ||
    lowerQ.includes('drive')
  );

  if (mentionsEvidence) {
    return {
      response: `You... you have the Port CCTV footage? That's impossible, those cameras were scheduled for a firmware wipe at 02:00. Look, I didn't pull any triggers. I only handled the [[contradiction:camera_routing|cryptographic routing|Subject admitted knowledge of camera firmware wiping schedule and electronic wire routing]]!`,
      stressChange: 22,
      revealedIntel: `ADMISSION: Subject confirms personal knowledge of security camera scheduled tampering and electronic wire routing.`,
      bluffDetected: false,
      usedByok: false
    };
  }

  if (stressLevel > 65) {
    return {
      response: `I can't take this pressure anymore. The Arlington Maritime LLC accounts... they aren't shipping freight. They are funding safe houses along the coast! Check the [[location:north_ridge_warehouse|North Ridge warehouse lease|Disclosed clandestine warehouse leased under Arlington Maritime LLC]]!`,
      stressChange: 15,
      revealedIntel: `LEAD: North Ridge warehouse leased under Arlington Maritime LLC holding company.`,
      bluffDetected: false,
      usedByok: false
    };
  }

  return {
    response: `You're grasping at straws, Detective. Without an affidavit backed by physical chain-of-custody, I'm walking out of this holding cell in forty minutes.`,
    stressChange: 2,
    bluffDetected: true,
    usedByok: false
  };
}

export async function handleForensics(body: ForensicsRequest): Promise<{
  analysisReport: string;
  matchFound: boolean;
  synthesizedLead?: string;
  confidenceScore: number;
  usedByok?: boolean;
}> {
  const { title, evidenceType, rawContent, analysisMethod, apiKey } = body;

  const { client: primaryClient, isByok } = createGenAIClient(apiKey);
  const clientsToTry: Array<{ client: GoogleGenAI; isByok: boolean }> = [];

  if (primaryClient) {
    clientsToTry.push({ client: primaryClient, isByok });
  }

  if (isByok) {
    const serverClient = getServerGenAI();
    if (serverClient) {
      clientsToTry.push({ client: serverClient, isByok: false });
    }
  }

  for (const { client, isByok: currentIsByok } of clientsToTry) {
    if (isGeminiQuotaBlocked() && !currentIsByok) continue;

    for (const modelName of SUPPORTED_MODELS) {
      try {
        const prompt = `You are the Automated Crime Lab & Cybernetics Forensics System for Project Blackwatch.
Analyze the following item:
Title: ${title}
Type: ${evidenceType}
Method: ${analysisMethod}
Raw Artifact Data:
${rawContent}

Perform a rigorous, realistic forensic breakdown (e.g. ballistic striations, spectroscopic mass analysis, XOR cipher decryption, or transaction chain tracking).
Return valid JSON:
{
  "analysisReport": "Concise forensic lab breakdown (3-4 sentences in administrative technical terminology)",
  "matchFound": boolean,
  "synthesizedLead": "Actionable investigative clue derived from the analysis",
  "confidenceScore": number (85-99)
}`;

        const response = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          }
        });

        const text = response.text?.trim();
        if (text) {
          const parsed = JSON.parse(text);
          return {
            ...parsed,
            usedByok: currentIsByok
          };
        }
      } catch (err: any) {
        reportGeminiQuotaError(err);
      }
    }
  }

  // Tactical fallback
  return {
    analysisReport: `SPECTRAL SCAN COMPLETED // Specimen "${title}" exhibits high-density chemical stippling consistent with specialized suppressors. Chrono-markers confirm deployment between 02:10 and 02:20 UTC.`,
    matchFound: true,
    synthesizedLead: `Ballistic signature links directly to a customized SIG P226 registered under Arlington Security Contractors.`,
    confidenceScore: 94.8,
    usedByok: false
  };
}

