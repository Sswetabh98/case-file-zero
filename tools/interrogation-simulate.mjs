import { profileFor, breakingPointFor } from '../src/data/case_seed.ts';
import { applyTactic, makeDecision, closeSession } from '../src/engine/interrogation.ts';
import { suspectStateNarrative } from '../src/engine/interrogation-context.ts';
import { cfzEngine } from '../src/server/cfzEngine.ts';

let scenariosPassed = 0;
let scenariosFailed = 0;

function logStep(step, detail) {
  console.log(`    [Turn ${step}] ${detail}`);
}

function assertScenario(condition, message) {
  if (condition) {
    scenariosPassed++;
    console.log(`  ✓ PASSED: ${message}`);
  } else {
    scenariosFailed++;
    console.error(`  ✗ FAILED: ${message}`);
  }
}

async function runMultiTurnSimulationHarness() {
  console.log('================================================================');
  console.log('TASK 11: FULL MULTI-TURN END-TO-END INTERROGATION SIMULATION');
  console.log('================================================================\n');

  // --------------------------------------------------------------------------
  // SCENARIO 1: The Methodical Breakthrough (Cracking & BSA s.23 T4 Discovery)
  // --------------------------------------------------------------------------
  console.log('--- SCENARIO 1: Methodical Breakthrough (Rapport -> Evidence -> Silence -> Crack) ---');
  let state1 = {
    arousal: 20,
    resistance: 65,
    rapport: 0,
    belief: 15,
    police_credibility: 70,
    coercion: 0,
    disclosure_tier: 0,
    session_turn: 0,
    contradictions_found: 0,
    session_no: 1,
    psychology: profileFor('suspect', 'Imran Malik')
  };

  logStep(0, `Initial State: Arousal=${state1.arousal}, Resistance=${state1.resistance}, Rapport=${state1.rapport}, Belief=${state1.belief}, Tier=T${state1.disclosure_tier}`);

  // Turn 1: Establish Initial Rapport
  state1 = applyTactic(state1, 'rapport');
  let dec1 = makeDecision(state1);
  logStep(1, `Tactic: rapport -> Resistance=${state1.resistance}, Rapport=${state1.rapport}, Decision=${dec1.decision}, Tier=T${dec1.disclosure_tier}`);

  // Turn 2: Introduce Physical Exhibit (Alternate tactic to prevent premature regression)
  state1 = applyTactic(state1, 'evidence-disclosure');
  let dec2 = makeDecision(state1);
  logStep(2, `Tactic: evidence-disclosure -> Belief=${state1.belief}, Arousal=${state1.arousal}, Tier=T${dec2.disclosure_tier}`);

  // Turn 3: Deepen Rapport -> Lowers resistance further & unlocks T1
  state1 = applyTactic(state1, 'rapport');
  let dec3 = makeDecision(state1);
  logStep(3, `Tactic: rapport -> Resistance=${state1.resistance}, Rapport=${state1.rapport}, Decision=${dec3.decision}, Tier=T${dec3.disclosure_tier}`);

  // Turn 4: Confront with Forensic Report & Telecom Logs -> Unlocks T2 (Belief >= 40)
  state1 = applyTactic(state1, 'evidence-disclosure');
  let dec4 = makeDecision(state1);
  logStep(4, `Tactic: evidence-disclosure -> Belief=${state1.belief}, Arousal=${state1.arousal}, Tier=T${dec4.disclosure_tier}`);

  // Turn 5: Technical Evidence Disclosed -> Belief climbs >= 65
  state1 = applyTactic(state1, 'evidence-disclosure');
  let dec5 = makeDecision(state1);
  logStep(5, `Tactic: evidence-disclosure -> Belief=${state1.belief}, Arousal=${state1.arousal}, Tier=T${dec5.disclosure_tier}`);

  // Turn 6: Initial Pressure on the Discrepancy -> Arousal surges
  state1 = applyTactic(state1, 'accusatory');
  let dec6 = makeDecision(state1);
  logStep(6, `Tactic: accusatory -> Arousal=${state1.arousal}, Resistance=${state1.resistance}, Tier=T${dec6.disclosure_tier}`);

  // Turn 7: Decisive Confrontation -> Arousal >= 60, Resistance < 50 -> Enters 'crack' quadrant and unlocks T3 + T4
  state1 = applyTactic(state1, 'accusatory');
  let dec7 = makeDecision(state1);
  logStep(7, `Tactic: accusatory -> Arousal=${state1.arousal}, Resistance=${state1.resistance}, Decision=${dec7.decision}, Tier=T${dec7.disclosure_tier}`);

  assertScenario(
    dec7.decision === 'crack' && dec7.disclosure_tier === 4,
    'Scenario 1: Suspect cracked into T4 locational discovery without coercion'
  );

  // --------------------------------------------------------------------------
  // SCENARIO 2: The Tactical Regression Spike (Repeated Accusations with Low Rapport)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 2: Tactical Regression Spike (Low Rapport Accusatory Repeat) ---');
  let state2 = {
    arousal: 25,
    resistance: 60,
    rapport: 5,
    belief: 30,
    police_credibility: 60,
    coercion: 0,
    disclosure_tier: 0,
    session_turn: 0,
    contradictions_found: 0,
    session_no: 1,
    psychology: profileFor('suspect', 'Sneha Naik')
  };

  const t1Res = applyTactic(state2, 'accusatory');
  logStep(1, `Turn 1 Accusation: Arousal=${t1Res.arousal}, Resistance=${t1Res.resistance}`);

  // Turn 2: Repeat accusation without building rapport -> triggers regression roll
  const t2Res = applyTactic(t1Res, 'accusatory', { priorTactic: 'accusatory', rngRoll: 0.1 });
  logStep(2, `Turn 2 Repeated Accusation: Resistance surged to ${t2Res.resistance} (Spike: +${t2Res.resistance - t1Res.resistance})`);

  assertScenario(
    t2Res.resistance > t1Res.resistance,
    'Scenario 2: Regression spike triggered upon unearned repeated accusation'
  );

  // --------------------------------------------------------------------------
  // SCENARIO 3: Repeated Tactic Decay Multiplier (3+ Consecutive Uses)
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 3: Tactic Decay Multiplier on 3+ Repetitions ---');
  let state3 = {
    arousal: 30,
    resistance: 50,
    rapport: 10,
    belief: 30,
    police_credibility: 60,
    coercion: 0,
    disclosure_tier: 0,
    session_turn: 0,
    contradictions_found: 0,
    session_no: 1,
    psychology: profileFor('suspect', 'Rukhsana Khan')
  };

  const decayTurn2 = applyTactic(state3, 'accusatory', { priorTactic: 'accusatory', priorTacticsCount: 2, rngRoll: 0.1 });
  const decayTurn3 = applyTactic(state3, 'accusatory', { priorTactic: 'accusatory', priorTacticsCount: 3, rngRoll: 0.1 });
  const delta2 = decayTurn2.resistance - state3.resistance;
  const delta3 = decayTurn3.resistance - state3.resistance;

  logStep(2, `Turn 2 Repetition Resistance Delta = +${delta2}`);
  logStep(3, `Turn 3 Consecutive Repetition Resistance Delta = +${delta3} (1.5x Multiplier)`);

  assertScenario(
    delta3 > delta2 && Math.round(delta3) === Math.round(delta2 * 1.5),
    'Scenario 3: 1.5x Tactic decay resistance acceleration on 3+ consecutive uses'
  );

  // --------------------------------------------------------------------------
  // SCENARIO 4: Coercion Escalation and Statutory Taint Gate
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 4: Baseless Threats Leading to Coercion Taint ---');
  let state4 = {
    arousal: 20,
    resistance: 70,
    rapport: 0,
    belief: 10, // Very low belief
    police_credibility: 50,
    coercion: 0,
    disclosure_tier: 0,
    session_turn: 0,
    contradictions_found: 0,
    session_no: 1,
    psychology: profileFor('suspect', 'Vikram Shaikh')
  };

  // Turn 1 baseless threat
  state4 = applyTactic(state4, 'accusatory');
  logStep(1, `Baseless Threat #1 (Belief < 20): Coercion=${state4.coercion}`);

  // Turn 2 baseless threat
  state4 = applyTactic(state4, 'accusatory');
  logStep(2, `Baseless Threat #2 (Belief < 20): Coercion=${state4.coercion}`);

  const sessionCloseResult = closeSession(state4);
  logStep(3, `Session Closed: Coercion=${state4.coercion}, Taint Status='${sessionCloseResult.taint}'`);

  assertScenario(
    state4.coercion >= 30 && sessionCloseResult.taint === 'tainted',
    'Scenario 4: Coercion > 25 properly flagged as tainted session'
  );

  // --------------------------------------------------------------------------
  // SCENARIO 5: Multi-Session Persistence & Re-Examination
  // --------------------------------------------------------------------------
  console.log('\n--- SCENARIO 5: Full Server Multi-Session Continuity via cfzEngine ---');
  const caseId = 2;
  const personId = 11;

  // Session 1: Start and perform 2 turns
  cfzEngine.startInterview(caseId, { personId });
  await cfzEngine.turnInterview(caseId, {
    personId,
    technique: 'rapport',
    input: 'Rukhsana, we are establishing your timeline for that morning.'
  });
  const bundleMid = await cfzEngine.turnInterview(caseId, {
    personId,
    technique: 'evidence-disclosure',
    input: 'We have terminal records for the delivery vehicle.'
  });

  const ivSess1 = bundleMid.snapshot.interviews.find(i => i.person_id === personId);
  const sess1Arousal = ivSess1.arousal;
  const sess1Resistance = ivSess1.resistance;
  const sess1TurnsCount = ivSess1.state_json.turns.length;

  logStep(1, `Session #1 Completed: Arousal=${sess1Arousal}, Resistance=${sess1Resistance}, Recorded Turns=${sess1TurnsCount}`);

  // Close Session 1
  cfzEngine.closeInterview(caseId, { personId, interviewId: ivSess1.id });

  // Re-open Session 2
  const reOpenBundle = cfzEngine.startInterview(caseId, { personId });
  const ivSess2 = reOpenBundle.snapshot.interviews.find(i => i.person_id === personId);

  logStep(2, `Session #2 Re-opened: Session_No=${ivSess2.session_no}, Maintained Arousal=${ivSess2.arousal}, Maintained Resistance=${ivSess2.resistance}`);

  assertScenario(
    ivSess2.session_no >= 2 &&
    ivSess2.arousal === sess1Arousal &&
    ivSess2.resistance === sess1Resistance &&
    ivSess2.state_json.turns.length === sess1TurnsCount,
    'Scenario 5: Re-examination seamlessly preserved state across sessions'
  );

  console.log(`\n================================================================`);
  console.log(`SIMULATION HARNESS RESULT: ${scenariosPassed} PASSED, ${scenariosFailed} FAILED`);
  console.log(`================================================================`);
  if (scenariosFailed > 0) process.exit(1);
}

runMultiTurnSimulationHarness();
