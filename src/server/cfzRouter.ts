import { Router } from 'express';
import { cfzEngine } from './cfzEngine.js';
import { handleInterrogation, handleForensics, validateGeminiKey, DEFAULT_GEMINI_MODEL, createGenAIClient, MODEL_REGISTRY } from './geminiHandler.js';
import { encryptApiKey, decryptApiKey, maskApiKey, extractByokFromRequest, extractUserByokOnly, parseRequestCookies } from './byokVault.js';
import { calculateEvidenceSlamImpact, validateDiscoveryMemoBSA23, tickRemandClock, performMedicalCheck } from '../engine/interrogation.js';
import { classifyTaskComplexity, generateWithFallback } from './modelRouter.js';

export const cfzRouter = Router();

cfzRouter.get('/health', (req, res) => {
  res.json({ ok: true, game: 'Project Blackwatch Intelligence System' });
});

cfzRouter.get('/ai-status', (req, res) => {
  const byok = extractByokFromRequest(req);
  res.json({
    serverKeyConfigured: !!process.env.GEMINI_API_KEY || !!byok,
    byokConfigured: !!byok,
    maskedByok: byok ? maskApiKey(byok) : null,
    defaultModel: DEFAULT_GEMINI_MODEL,
    modelTiers: MODEL_REGISTRY,
    freeTierSupported: true,
  });
});

// Secure BYOK Vault endpoints
cfzRouter.get('/settings/byok/status', (req, res) => {
  const byok = extractUserByokOnly(req);
  if (byok) {
    res.json({ configured: true, maskedKey: maskApiKey(byok) });
  } else {
    res.json({ configured: false, maskedKey: null });
  }
});

cfzRouter.post('/settings/byok', async (req, res) => {
  try {
    const rawKey = String(req.body.apiKey || '').trim();
    if (!rawKey) {
      return res.status(400).json({ success: false, message: 'API key is required' });
    }

    const valResult = await validateGeminiKey(rawKey);
    if (!valResult.valid) {
      return res.status(400).json({ success: false, message: valResult.message });
    }

    const encrypted = encryptApiKey(rawKey);
    // Set HTTP-Only Cookie so browser JS / console CANNOT access the raw key
    res.cookie('cfz_byok_session', encrypted, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      path: '/'
    });

    res.json({
      success: true,
      message: 'BYOK API Key verified and saved in secure server HTTP-Only vault.',
      maskedKey: maskApiKey(rawKey)
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to save API key' });
  }
});

cfzRouter.delete('/settings/byok', (req, res) => {
  res.clearCookie('cfz_byok_session', {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  res.clearCookie('cfz_byok_session', { path: '/' });
  res.cookie('cfz_byok_session', '', { maxAge: 0, path: '/', httpOnly: true });
  res.json({ success: true, message: 'BYOK API key removed from server vault.' });
});

cfzRouter.post('/validate-key', async (req, res) => {
  try {
    const apiKey = (req.body.apiKey || extractByokFromRequest(req) || '') as string;
    const result = await validateGeminiKey(apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ valid: false, message: err.message, model: DEFAULT_GEMINI_MODEL });
  }
});

cfzRouter.post('/forensics', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const result = await handleForensics({
      ...req.body,
      apiKey: apiKey || undefined
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/interrogate', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const result = await handleInterrogation({
      ...req.body,
      apiKey: apiKey || undefined
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Phase 3: Evidence Contradiction Slam Endpoint
cfzRouter.post('/interrogation/slam-evidence', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const {
      currentPsychology,
      currentClock,
      exhibit,
      contradictionType = 'alibi_refutation',
      suspectInfo,
      statementContext
    } = req.body || {};

    const psych = currentPsychology || {
      stressLevel: 25,
      cooperationLevel: 30,
      composureState: 'guarded',
      isBreakdown: false,
      deceitIndex: 70,
      vulnerabilitiesShattered: [],
      coercionPenalty: 0
    };

    const clock = currentClock || {
      remandMinutesRemaining: 1440,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 0,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false
    };

    const exhibitWeight = exhibit?.weight || (exhibit?.forensicAnalysis ? 8 : 6);
    const isVulnerability = Boolean(
      suspectInfo?.vulnerabilities?.includes(exhibit?.id) || 
      suspectInfo?.vulnerabilities?.includes(exhibit?.code)
    );

    // 1. Calculate Engine Physics & Stress Shift
    const impact = calculateEvidenceSlamImpact(
      psych,
      exhibitWeight,
      contradictionType,
      isVulnerability,
      clock.advocatePresent
    );

    // 2. Tick Remand Clock by 25 mins for exhibit cross-examination
    const clockResult = tickRemandClock(clock, 25);

    // 3. Generate Suspect Reaction using Multi-Tier Router
    const { client } = createGenAIClient(apiKey);
    let spokenReaction = impact.breakthroughAchieved
      ? `*sweats heavily, looking at ${exhibit?.code || 'the exhibit'} with trembling hands* "Ye... ye kahan se mila aapko? Maine yeh nahi socha tha... suniye, main sab sach batata hoon!"`
      : `*shifts nervously in chair* "Sir, is ${exhibit?.code || 'cheez'} se mera koi lena dena nahi hai! Aap galat samajh rahe hain."`;

    if (client) {
      try {
        const route = classifyTaskComplexity({
          userText: `CONFRONT WITH EXHIBIT ${exhibit?.code}: ${exhibit?.title}. Suspect stress is now ${impact.newPsychology.stressLevel}%, Composure is ${impact.newPsychology.composureState}.`,
          senderKind: 'suspect',
          senderName: suspectInfo?.name || 'Suspect',
          hasEvidenceMention: true,
          hasLegalStatute: true
        });

        const prompt = `You are roleplaying as "${suspectInfo?.name || 'Suspect'}" in an Indian police interrogation room under BNSS/BSA 2023.
The Investigating Officer just slammed physical/digital evidence "${exhibit?.code}: ${exhibit?.title} (${exhibit?.summary || ''})" directly on the table.
Your psychological state: Stress ${impact.newPsychology.stressLevel}/100, Composure: ${impact.newPsychology.composureState.toUpperCase()}.
Breakthrough achieved: ${impact.breakthroughAchieved ? 'YES (Your story collapsed)' : 'NO (Still attempting defensive excuse)'}.
Advocate Present: ${clock.advocatePresent ? 'YES' : 'NO'}.

Respond strictly in character with authentic Indian police station dialogue (Hindi/English mix, raw emotions, physical tells like *sweats*, *avoids gaze*, *breathes heavily*). Keep it under 60 words.`;

        const genRes = await generateWithFallback(client, route, {
          contents: prompt,
          config: { maxOutputTokens: 200, temperature: 0.7 }
        });

        if (genRes?.text) {
          spokenReaction = genRes.text;
        }
      } catch {
        // Fallback reaction preserved
      }
    }

    res.json({
      success: true,
      impact,
      clock: clockResult.newClock,
      statutoryWarning: clockResult.statutoryWarning,
      suspectReaction: spokenReaction,
      exhibitCode: exhibit?.code || 'EX-01'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Evidence slam computation failed' });
  }
});

// Phase 3: Statutory Medical Check Endpoint (BNSS s.53/54)
cfzRouter.post('/interrogation/medical-check', (req, res) => {
  try {
    const { currentClock } = req.body || {};
    const clock = currentClock || {
      remandMinutesRemaining: 1440,
      remandDeadlineISO: new Date(Date.now() + 86400000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 400,
      medicalFitnessStatus: 'requires_attention',
      magistrateNoticeIssued: false
    };

    const updatedClock = performMedicalCheck(clock);
    res.json({
      success: true,
      clock: updatedClock,
      medicalMemo: {
        doctorName: 'Dr. A. Verma, CMO District Hospital',
        certificateNo: `MED-BNSS54/${Date.now()}`,
        status: 'FIT FOR CONTINUED EXAMINATION',
        bp: '128/84 mmHg',
        pulse: '82 bpm',
        notes: 'No external trauma marks. Subject examined and certified fit for custodial inquiry.'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Medical check execution failed' });
  }
});

// Phase 4: Judicial Remand Extension Endpoint (BNSS s.187)
cfzRouter.post('/interrogation/remand-extension', (req, res) => {
  try {
    const { currentClock, ground, justification } = req.body || {};
    const clock = currentClock || {
      remandMinutesRemaining: 320,
      remandDeadlineISO: new Date(Date.now() + 19200000).toISOString(),
      isExpired: false,
      advocatePresent: false,
      lastMedicalCheckMinutesAgo: 100,
      medicalFitnessStatus: 'fit',
      magistrateNoticeIssued: false
    };

    const extendedClock = {
      ...clock,
      remandMinutesRemaining: clock.remandMinutesRemaining + 1440, // +24 hours
      magistrateNoticeIssued: true
    };

    res.json({
      success: true,
      clock: extendedClock,
      orderNumber: `JM-REMAND/${Date.now()}`,
      magistrateName: 'Hon. Magistrate V. K. Deshmukh (Chief Judicial Magistrate)',
      notes: `Application under Section 187 BNSS 2023 allowed. Considering Ground: "${ground || 'Interrogation & Forensic Analysis'}", police custody remand is extended by 24 hours. IO directed to submit fresh medical report under Section 54 BNSS upon expiry.`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Remand extension failed' });
  }
});

// Phase 3: BSA s.23 Discovery Memo Generator Endpoint
cfzRouter.post('/interrogation/generate-memo', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const {
      suspectId,
      suspectName,
      statementText,
      targetLocation,
      itemDescription,
      panchaWitnesses = ['Rameshwar Sharma (Local Merchant)', 'Anil Gupta (Resident)'],
      officerRank = 'Inspector & Investigating Officer'
    } = req.body || {};

    const validation = validateDiscoveryMemoBSA23(
      suspectId || 'SUSP-01',
      suspectName || 'Accused',
      statementText || 'I have concealed the weapon used in the incident behind the abandoned brick kiln near Sector 4.',
      targetLocation || 'Abandoned Brick Kiln, Sector 4',
      itemDescription || 'Country-made pistol with 2 live cartridges',
      [panchaWitnesses[0] || 'Witness 1', panchaWitnesses[1] || 'Witness 2'],
      officerRank
    );

    if (!validation.isValid || !validation.memo) {
      return res.status(400).json({ success: false, error: validation.reason });
    }

    res.json({
      success: true,
      memo: validation.memo,
      statutoryAct: 'Bharatiya Sakshya Adhiniyam, 2023 (BSA Section 23)',
      admissibilityNote: 'Confession leading directly to discovery of physical fact is admissible in Court of Law.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Discovery memo generation failed' });
  }
});

cfzRouter.post('/avatar/generate', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const { person, promptOverride } = req.body || {};
    const { client } = createGenAIClient(apiKey);

    if (!client) {
      return res.status(400).json({ error: 'No active Gemini API key found on server or BYOK vault.' });
    }

    const name = person?.name || 'Person';
    const role = person?.role || 'Citizen';
    const desc = (person?.profile && person?.profile?.summary) || person?.occupation || '';
    const prompt = promptOverride || `A high-contrast, authentic police forensic dossier portrait description of ${name}, ${role}. ${desc}. Dramatic noir forensic lighting, sharp focus, Indian police context.`;

    const response = await client.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: `You are generating a character portrait metadata description for an authentic police investigation console. For character: "${name}", role: "${role}", prompt: "${prompt}". Respond with a JSON object { "visual_dossier": "...", "eyewitness_description": "...", "clothing": "...", "distinguishing_marks": "..." }`,
      config: { responseMimeType: 'application/json' }
    });

    const key = String(person?.portrait_key || person?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
    res.json({ success: true, key, data: response.text });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Avatar metadata generation failed' });
  }
});

cfzRouter.get('/bootstrap', (req, res) => {
  res.json(cfzEngine.getFullBundle());
});

cfzRouter.get('/cases', (req, res) => {
  res.json(cfzEngine.getCasesList());
});

cfzRouter.post('/cases/generate', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const result = await cfzEngine.generateNewCase({
      ...req.body,
      apiKey: apiKey || undefined
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/new', async (req, res) => {
  try {
    const apiKey = extractByokFromRequest(req);
    const result = await cfzEngine.generateNewCase({
      ...req.body,
      apiKey: apiKey || undefined
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.get('/cases/:caseId', (req, res) => {
  res.json(cfzEngine.getFullBundle(Number(req.params.caseId)));
});

cfzRouter.get('/cases/:caseId/summary', (req, res) => {
  try {
    res.json(cfzEngine.getCaseSummary(Number(req.params.caseId)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load case summary' });
  }
});

cfzRouter.post('/cases/:caseId/activate', (req, res) => {
  res.json(cfzEngine.activateCase(Number(req.params.caseId)));
});

cfzRouter.post('/cases/:caseId/reopen', (req, res) => {
  try {
    res.json(cfzEngine.reopenCase(Number(req.params.caseId)));
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reopen case' });
  }
});

cfzRouter.post('/cases/:caseId/fir', (req, res) => {
  res.json(cfzEngine.registerFIR(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/scene/step', (req, res) => {
  res.json(cfzEngine.completeSceneStep(Number(req.params.caseId), req.body.step));
});

cfzRouter.post('/cases/:caseId/canvass/consent', (req, res) => {
  res.json(cfzEngine.recordCanvassConsent(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/scene/examine', (req, res) => {
  res.json(cfzEngine.examineExhibit(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/seizure', (req, res) => {
  res.json(cfzEngine.seizeExhibit(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/seizure/reset', (req, res) => {
  res.json(cfzEngine.resetExhibitSeizure(Number(req.params.caseId), req.body.exhibitId));
});

cfzRouter.post('/cases/:caseId/exhibits/:exhibitId/reset', (req, res) => {
  res.json(cfzEngine.resetExhibitSeizure(Number(req.params.caseId), req.params.exhibitId));
});

cfzRouter.post('/cases/:caseId/exhibits/:exhibitId/digital', (req, res) => {
  res.json(cfzEngine.imageDigitalExhibit(Number(req.params.caseId), req.params.exhibitId));
});

cfzRouter.post('/cases/:caseId/exhibits/:exhibitId/s63', (req, res) => {
  res.json(cfzEngine.certificateS63(Number(req.params.caseId), req.params.exhibitId, req.body));
});

cfzRouter.get('/cases/:caseId/lab/catalogue', (req, res) => {
  res.json(cfzEngine.getLabCatalogue());
});

cfzRouter.post('/cases/:caseId/lab/request', (req, res) => {
  res.json(cfzEngine.requestLabTest(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/lab/collect', (req, res) => {
  res.json(cfzEngine.collectLabResult(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/persons/:personId/statement', (req, res) => {
  res.json(cfzEngine.recordStatement(Number(req.params.caseId), Number(req.params.personId), req.body));
});

cfzRouter.post('/cases/:caseId/persons/:personId/verify-alibi', (req, res) => {
  res.json(cfzEngine.verifyAlibi(Number(req.params.caseId), Number(req.params.personId)));
});

cfzRouter.post('/cases/:caseId/arrest', (req, res) => {
  res.json(cfzEngine.arrestPerson(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/interview/start', (req, res) => {
  res.json(cfzEngine.startInterview(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/interview/turn', async (req, res) => {
  try {
    const apiKey = (req.headers['x-gemini-api-key'] as string) || (req.headers['x-gemini-key'] as string) || req.body?.apiKey || process.env.GEMINI_API_KEY;
    const result = await cfzEngine.turnInterview(Number(req.params.caseId), req.body, apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.get('/cases/:caseId/interview/lies/:personId', (req, res) => {
  try {
    const snap = cfzEngine.getSnapshot(Number(req.params.caseId));
    if (!snap) return res.status(404).json({ error: 'Case not found' });
    const person = (snap.persons || []).find((p: any) => p.id === Number(req.params.personId));
    const lies = cfzEngine.getMicroLiesForSuspect(snap, person);
    res.json({ lies });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/confront-lie', async (req, res) => {
  try {
    const apiKey = (req.headers['x-gemini-api-key'] as string) || (req.headers['x-gemini-key'] as string) || req.body?.apiKey || process.env.GEMINI_API_KEY;
    const { lieId, personId, interviewId, advocatePresent } = req.body;
    const snap = cfzEngine.getSnapshot(Number(req.params.caseId));
    if (!snap) return res.status(404).json({ error: 'Case not found' });
    const person = (snap.persons || []).find((p: any) => p.id === Number(personId));
    const lies = cfzEngine.getMicroLiesForSuspect(snap, person);
    const lie = lies.find((l: any) => l.id === lieId);
    if (!lie) return res.status(404).json({ error: 'Lie not found' });

    const result = await cfzEngine.turnInterview(Number(req.params.caseId), {
      interviewId: Number(interviewId),
      personId: Number(personId),
      input: lie.confrontationPrompt,
      technique: 'contradiction-trap',
      advocatePresent: Boolean(advocatePresent)
    }, apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/close', (req, res) => {
  res.json(cfzEngine.closeInterview(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/interview/slam-evidence', (req, res) => {
  try {
    res.json(cfzEngine.slamEvidenceContradiction(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/discovery-memo', (req, res) => {
  try {
    res.json(cfzEngine.recordDiscoveryMemo(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/remand-extension', (req, res) => {
  try {
    res.json(cfzEngine.petitionRemandExtension(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/medical-check', (req, res) => {
  try {
    res.json(cfzEngine.conductMedicalExamination(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/advocate-toggle', (req, res) => {
  try {
    res.json(cfzEngine.toggleAdvocatePresence(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/interrogation/advocate-toggle', (req, res) => {
  try {
    const caseId = Number(req.body.caseId) || 1;
    res.json(cfzEngine.toggleAdvocatePresence(caseId, req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/stop', (req, res) => {
  res.json(cfzEngine.stopInterviewAndReportFindings(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/interview/assistant', (req, res) => {
  res.json(cfzEngine.setInterrogationAssistant(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/interview/directive', async (req, res) => {
  try {
    const apiKey = (req.headers['x-gemini-api-key'] as string) || (req.headers['x-gemini-key'] as string) || req.body?.apiKey || process.env.GEMINI_API_KEY;
    const result = await cfzEngine.parseInterrogationDirective(Number(req.params.caseId), req.body, apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/directive/clear', (req, res) => {
  try {
    res.json(cfzEngine.clearInterviewDirective(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/interview/note/pin', (req, res) => {
  try {
    res.json(cfzEngine.pinSubstantiveNote(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/lead/log', (req, res) => {
  try {
    res.json(cfzEngine.logLead(Number(req.params.caseId), req.body));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

cfzRouter.post('/cases/:caseId/recovery', (req, res) => {
  res.json(cfzEngine.executeRecovery(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/chargesheet/draft', (req, res) => {
  res.json(cfzEngine.draftChargeSheet(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/chargesheet/submit', (req, res) => {
  res.json(cfzEngine.submitChargeSheet(Number(req.params.caseId)));
});

cfzRouter.post('/cases/:caseId/trial/run', (req, res) => {
  res.json(cfzEngine.runTrial(Number(req.params.caseId), req.body));
});

cfzRouter.get('/chat/:threadId', (req, res) => {
  try {
    const threadId = Number(req.params.threadId) || 1;
    res.setHeader('Content-Type', 'application/json');
    res.json(cfzEngine.getChatThread(threadId));
  } catch (err: any) {
    console.error('Error in GET /chat/:threadId:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err?.message || 'Failed to fetch thread', thread: { id: Number(req.params.threadId) }, messages: [] });
  }
});

cfzRouter.post('/chat/:threadId/read', (req, res) => {
  try {
    const threadId = Number(req.params.threadId) || 1;
    res.setHeader('Content-Type', 'application/json');
    res.json(cfzEngine.markThreadRead(threadId));
  } catch (err: any) {
    console.error('Error in POST /chat/:threadId/read:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err?.message || 'Failed to mark read' });
  }
});

cfzRouter.post('/chat/:threadId', async (req, res) => {
  try {
    const threadId = Number(req.params.threadId) || 1;
    const body = req.body || {};
    const apiKey = (req.headers['x-gemini-api-key'] as string) || (req.headers['x-gemini-key'] as string) || body?.apiKey || process.env.GEMINI_API_KEY;
    const result = await cfzEngine.postChatMessage(threadId, body, apiKey);
    res.setHeader('Content-Type', 'application/json');
    res.json(result);
  } catch (err: any) {
    console.error('Error in POST /chat/:threadId:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: err?.message || 'Chat error', thread: { id: Number(req.params.threadId) }, messages: [] });
  }
});

cfzRouter.post('/cases/:caseId/assign', (req, res) => {
  res.json(cfzEngine.assignTask(Number(req.params.caseId), req.body));
});

cfzRouter.post('/cases/:caseId/directive/step', (req, res) => {
  res.json(cfzEngine.advanceDirectiveStep(Number(req.params.caseId), req.body.directiveId, req.body.subtaskIndex));
});

cfzRouter.post('/cases/:caseId/directive/complete', (req, res) => {
  res.json(cfzEngine.completeDirective(Number(req.params.caseId), req.body.directiveId));
});

cfzRouter.post('/sync/state', (req, res) => {
  res.json(cfzEngine.syncState(req.body));
});

cfzRouter.get('/sync/state', (req, res) => {
  res.json(cfzEngine.getFullState());
});

cfzRouter.post('/team/hire', (req, res) => {
  res.json(cfzEngine.hireCandidate(req.body));
});

cfzRouter.post('/settings', (req, res) => {
  res.json(cfzEngine.updateSettings(req.body));
});

cfzRouter.post('/player', (req, res) => {
  res.json(cfzEngine.updatePlayer(req.body));
});

cfzRouter.get('/guide', (req, res) => {
  res.json(cfzEngine.getGuide());
});

cfzRouter.get('/legal/index', (req, res) => {
  const act = (req.query.act as string) || 'BNS';
  const offset = Number(req.query.offset || 0);
  const limit = Number(req.query.limit || 80);
  res.json(cfzEngine.getLegalIndex(act, offset, limit));
});

cfzRouter.post('/legal/search', async (req, res) => {
  const q = req.body.q || '';
  const act = req.body.act || 'ALL';
  const apiKey = (req.headers['x-gemini-api-key'] as string) || req.body.apiKey;
  const result = await cfzEngine.searchLegal(q, act, apiKey);
  res.json(result);
});

cfzRouter.get('/apply/questions', (req, res) => {
  res.json(cfzEngine.getApplyQuestions());
});

cfzRouter.get('/apply/subjective', (req, res) => {
  res.json(cfzEngine.getApplySubjective());
});

cfzRouter.post('/apply/objective', (req, res) => {
  res.json({ ok: true, score: 92, status: 'passed' });
});

cfzRouter.post('/apply/subjective', (req, res) => {
  res.json({ ok: true, score: 88, status: 'passed' });
});

cfzRouter.post('/apply/psychometric', (req, res) => {
  res.json({ ok: true, standing: 86, status: 'approved' });
});

cfzRouter.post('/apply/interview', (req, res) => {
  const turnIndex = Number(req.body?.turn) || 0;
  const questions = [
    { speaker: 'DIG K. Ranade', reply: 'Officer, explain your understanding of Section 103 BNSS regarding independent seizure panchas.', assessment: 'Understands evidentiary safeguards and search formalities.' },
    { speaker: 'Senior Prosecutor Adv. Mehta', reply: 'If an electronic record lacks a Section 63 BSA certificate at the time of filing chargesheet, can it be cured later?', assessment: 'Recognizes dual-certificate requirements under Indian law.' },
    { speaker: 'ACP V. Nadkarni', reply: 'What is your operational priority when entering a volatile scene of crime?', assessment: 'Prioritizes cordon, walkthrough, and contamination prevention.' }
  ];
  const q = questions[turnIndex % questions.length];
  res.json({
    ok: true,
    recommendation: 'Selected for Crime Branch Malhar Division',
    turn: {
      speaker: q.speaker,
      examiner_reply: q.reply,
      candidate_last_answer_assessment: q.assessment,
      running_score: Math.min(96, 75 + (turnIndex + 1) * 7),
      interview_complete: turnIndex >= 2,
      acknowledgement: 'Answer recorded by the examination board.'
    }
  });
});

cfzRouter.post('/apply/finalize', (req, res) => {
  res.json({ ok: true, applicationState: 'inducted' });
});

cfzRouter.post('/cases/:caseId/tip', (req, res) => {
  res.json(cfzEngine.recordTip(Number(req.params.caseId), req.body));
});

// Fallback JSON 404 handler for API routes
cfzRouter.use((req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});
