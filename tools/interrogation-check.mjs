import { applyTactic, makeDecision, closeSession } from '../src/engine/interrogation.ts';

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

const baseState = {
  arousal: 20,
  resistance: 65,
  rapport: 0,
  belief: 30,
  police_credibility: 60,
  coercion: 0,
  disclosure_tier: 0,
  session_turn: 1,
  contradictions_found: 0,
  session_no: 1,
  psychology: {
    temper: 40,
    resilience: 65,
    compliance: 35,
    transparency: 45,
    defensiveness: 70,
    suggestibility: 30,
    consistency: 55
  }
};

console.log("Running Task 2 Acceptance Tests for Interrogation Engine...");

// 1. Arousal raising under accusatory scales with psychology.defensiveness
const stateLowDef = { ...baseState, psychology: { ...baseState.psychology, defensiveness: 10 } };
const stateHighDef = { ...baseState, psychology: { ...baseState.psychology, defensiveness: 90 } };
const resLowDef = applyTactic(stateLowDef, 'accusatory');
const resHighDef = applyTactic(stateHighDef, 'accusatory');
assert(resHighDef.arousal > resLowDef.arousal, "1. Arousal raising under accusatory scales with psychology.defensiveness");

// 2. Resistance lowers under rapport and scales with psychology.compliance
const stateLowComp = { ...baseState, psychology: { ...baseState.psychology, compliance: 10 } };
const stateHighComp = { ...baseState, psychology: { ...baseState.psychology, compliance: 90 } };
const resLowComp = applyTactic(stateLowComp, 'rapport');
const resHighComp = applyTactic(stateHighComp, 'rapport');
assert(resHighComp.resistance < resLowComp.resistance, "2. Resistance lowers under rapport and scales with psychology.compliance");

// 3. Regression occurs when the same tactic is used twice with low rapport
const regState = { ...baseState, rapport: 10 };
const regRes = applyTactic(regState, 'accusatory', { priorTactic: 'accusatory', rngRoll: 0.1 });
assert(regRes.resistance > regState.resistance, "3. Regression occurs when same tactic is used twice with low rapport");

// 4. crack is reached only in high-arousal, low-resistance state
const crackDecision = makeDecision({ ...baseState, arousal: 65, resistance: 40 });
const nonCrackDecision = makeDecision({ ...baseState, arousal: 40, resistance: 40 });
assert(crackDecision.decision === 'crack' && nonCrackDecision.decision === 'cooperative', "4. crack is reached only in high-arousal, low-resistance state");

// 5. T1 unlocks at rapport >= 25
const t1Decision = makeDecision({ ...baseState, rapport: 30, disclosure_tier: 0 });
assert(t1Decision.disclosure_tier >= 1, "5. T1 unlocks at rapport >= 25");

// 6. T2 unlocks at belief >= 40
const t2Decision = makeDecision({ ...baseState, belief: 45, disclosure_tier: 0 });
assert(t2Decision.disclosure_tier >= 2, "6. T2 unlocks at belief >= 40");

// 7. T3 unlocks only when decision == crack
const t3Decision = makeDecision({ ...baseState, arousal: 70, resistance: 30, disclosure_tier: 0 });
const t3NonCrack = makeDecision({ ...baseState, arousal: 70, resistance: 70, disclosure_tier: 0 });
assert(t3Decision.disclosure_tier >= 3 && t3NonCrack.disclosure_tier < 3, "7. T3 unlocks only when decision == crack");

// 8. T4 unlocks at belief >= 65 and T3 already unlocked
const t4Valid = makeDecision({ ...baseState, belief: 70, disclosure_tier: 3 });
const t4Invalid = makeDecision({ ...baseState, belief: 70, disclosure_tier: 2 });
assert(t4Valid.disclosure_tier === 4 && t4Invalid.disclosure_tier === 2, "8. T4 unlocks at belief >= 65 and T3 already unlocked");

// 9. Coercion rises on baseless threats
const threatState = { ...baseState, belief: 10, coercion: 0 };
const threatRes = applyTactic(threatState, 'accusatory');
assert(threatRes.coercion === 15, "9. Coercion rises on baseless threats (accusatory with belief < 20)");

// 10. Taint is tainted when coercion > 25
const cleanSess = closeSession({ ...baseState, coercion: 20 });
const taintedSess = closeSession({ ...baseState, coercion: 30 });
assert(cleanSess.taint === 'clean' && taintedSess.taint === 'tainted', "10. Taint is tainted when coercion > 25");

// 11. Tactic decay: repeated identical tactic on turn 3+ accelerates resistance rise by 1.5x
const decayStateTurn2 = applyTactic({ ...baseState, rapport: 10 }, 'accusatory', { priorTactic: 'accusatory', priorTacticsCount: 2, rngRoll: 0.1 });
const decayStateTurn3 = applyTactic({ ...baseState, rapport: 10 }, 'accusatory', { priorTactic: 'accusatory', priorTacticsCount: 3, rngRoll: 0.1 });
const delta2 = decayStateTurn2.resistance - baseState.resistance;
const delta3 = decayStateTurn3.resistance - baseState.resistance;
assert(delta3 > delta2 && Math.round(delta3) === Math.round(delta2 * 1.5), "11. Tactic decay accelerates resistance rise (1.5x) on turn 3 of identical tactic");

// 12. Silence mechanics: silence decays arousal by 10 and resistance by 5
const silenceRes = applyTactic(baseState, 'silence');
assert(silenceRes.arousal === baseState.arousal - 10 && silenceRes.resistance === baseState.resistance - 5, "12. Silence lowers both arousal (-10) and resistance (-5)");

console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
