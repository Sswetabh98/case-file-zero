import { PsychologyProfile } from '../engine/interrogation-context';

/**
 * Deterministic hash function for string inputs
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
}

/**
 * Deterministically generates a PsychologyProfile based on character role/name.
 */
export function profileFor(role: string, name?: string): PsychologyProfile {
  const seed = hashString(`${role || 'suspect'}_${name || ''}`);
  
  // Deterministic pseudo-random generation with bounded realistic ranges
  const temper = 25 + (seed % 55);                  // 25 - 80
  const resilience = 30 + ((seed >> 2) % 55);       // 30 - 85
  const compliance = 15 + ((seed >> 4) % 65);       // 15 - 80
  const transparency = 20 + ((seed >> 6) % 60);     // 20 - 80
  const defensiveness = 30 + ((seed >> 8) % 60);    // 30 - 90
  const suggestibility = 15 + ((seed >> 10) % 50);  // 15 - 65
  const consistency = 35 + ((seed >> 12) % 55);     // 35 - 90

  return {
    temper,
    resilience,
    compliance,
    transparency,
    defensiveness,
    suggestibility,
    consistency
  };
}

export function breakingPointFor(role: string, name?: string): number {
  const seed = hashString(`bp_${role || 'suspect'}_${name || ''}`);
  return 50 + (seed % 35); // 50 - 85
}
