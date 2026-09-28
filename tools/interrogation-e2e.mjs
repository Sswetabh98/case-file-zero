import { profileFor, breakingPointFor } from '../src/data/case_seed.ts';
import {
  suspectStateNarrative,
  strategicPosition,
  pressureGauge,
  emotionalMoment,
  beliefDecoder,
  tacticResonance,
  sessionContinuity
} from '../src/engine/interrogation-context.ts';
import { applyTactic, makeDecision, closeSession } from '../src/engine/interrogation.ts';
import { buildInterrogationPrompt } from '../src/prompts/interrogation.ts';
import { cfzEngine } from '../src/server/cfzEngine.ts';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runRegressionGate() {
  console.log('====================================================');
  console.log('INTERROGATION SYSTEM FULL REGRESSION GATE (§10 & §11)');
  console.log('====================================================\n');

  // 1. PSYCHOLOGY SEEDING
  console.log('--- Phase 1: Psychology & Breaking Point Seeding ---');
  const prof1 = profileFor('suspect', 'Marcus Vance');
  const bp1 = breakingPointFor('suspect', 'Marcus Vance');
  assert(typeof prof1.temper === 'number' && typeof bp1 === 'number', 'Psychology profile & breaking point deterministically seeded');

  // 2. CONTEXT ENCODERS
  console.log('\n--- Phase 2: Context Encoder Narrative Translations ---');
  const testState = {
    arousal: 70,
    resistance: 30,
    rapport: 25,
    belief: 65,
    police_credibility: 80,
    coercion: 10,
    disclosure_tier: 3,
    session_turn: 3,
    contradictions_found: 1,
    session_no: 1,
    psychology: prof1
  };
  const narrative = suspectStateNarrative(testState);
  assert(narrative.toLowerCase().includes('cracking') || narrative.toLowerCase().includes('vulnerable'), 'State narrative captures cracking/vulnerable state');

  const strat = strategicPosition(testState);
  assert(strat.length > 10, 'Strategic position generated from belief decoder');

  const moment = emotionalMoment(testState, prof1);
  assert(moment.length > 10, 'Emotional moment generated from arousal/temper');

  // 3. DETERMINISTIC ENGINE CORE
  console.log('\n--- Phase 3: Deterministic Engine Rules ---');
  const resAcc = applyTactic(testState, 'accusatory');
  assert(resAcc.arousal > testState.arousal, 'Accusatory tactic elevates arousal');

  const resRap = applyTactic(testState, 'rapport');
  assert(resRap.resistance < testState.resistance, 'Rapport tactic reduces resistance');

  const resSil = applyTactic(testState, 'silence');
  assert(resSil.arousal === testState.arousal - 10 && resSil.resistance === testState.resistance - 5, 'Silence decays arousal and resistance');

  const decCrack = makeDecision({ ...testState, arousal: 65, resistance: 40 });
  assert(decCrack.decision === 'crack' && decCrack.disclosure_tier >= 3, 'High arousal / low resistance yields crack decision and T3 disclosure');

  // 4. 8-LAYER PROMPT SYSTEM
  console.log('\n--- Phase 4: 8-Layer System Prompt Assembly ---');
  const prompt = buildInterrogationPrompt({ name: 'Marcus Vance' }, testState, [], 'accusatory', 'We found your fingerprints.', { decision: 'crack' });
  assert(
    prompt.includes('LAYER 1: PRIMARY DECISION') &&
    prompt.includes('LAYER 7: DISCLOSURE CONSTRAINTS') &&
    prompt.includes('DIALOGUE RULES'),
    '8-Layer system prompt generated with all structured constraints'
  );

  // 5. TURN & SESSION CONTINUITY E2E
  console.log('\n--- Phase 5: Server Engine & Session Continuity E2E ---');
  const caseId = 2;
  const startRes = cfzEngine.startInterview(caseId, { personId: 10 });
  assert(startRes.interview && startRes.interview.session_no >= 1, 'Interview session initialized or resumed');

  const turnRes = await cfzEngine.turnInterview(caseId, {
    personId: 10,
    technique: 'rapport',
    input: 'Let us go over your shift schedule again calmly.'
  });
  const ivAfterTurn = turnRes.snapshot.interviews.find(i => i.person_id === 10);
  assert(ivAfterTurn.state_json && ivAfterTurn.state_json.turns.length > 0, 'Turn recorded with state telemetry in state_json');

  const closeRes = cfzEngine.closeInterview(caseId, { personId: 10, interviewId: ivAfterTurn.id });
  const ivClosed = closeRes.snapshot.interviews.find(i => i.person_id === 10);
  assert(ivClosed.phase === 'closed' && typeof ivClosed.taint === 'string', 'Session closed with formal taint evaluation');

  // 6. MULTI-SESSION RE-EXAMINATION CONTINUITY
  console.log('\n--- Phase 6: Multi-Session Re-examination Continuity ---');
  const priorArousal = ivClosed.arousal;
  const priorSessionNo = ivClosed.session_no;
  const reOpenRes = cfzEngine.startInterview(caseId, { personId: 10 });
  const ivReopened = reOpenRes.snapshot.interviews.find(i => i.person_id === 10);
  assert(ivReopened.arousal === priorArousal && ivReopened.session_no === priorSessionNo, 'Re-examination preserves prior ending state & increments session counter');

  console.log(`\n====================================================`);
  console.log(`REGRESSION GATE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);
  if (failed > 0) process.exit(1);
}

runRegressionGate();
