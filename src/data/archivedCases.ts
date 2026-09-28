import { ArchivedCaseFile, CaseFile } from '../types/game';

export const STORAGE_KEY_CASE_ARCHIVE = 'cfz_case_archive';

export const INITIAL_ARCHIVED_CASES: ArchivedCaseFile[] = [
  {
    id: 'archive-24-113',
    caseNumber: '24/113',
    title: 'The Marol Depot Road Payroll Robbery',
    classification: 'SERIOUS CRIME // ROBBERY DIVISION',
    incidentTime: '2026-09-18T19:30:00Z',
    closedDate: '2026-09-21',
    location: 'Marol Depot Road & Sector 9 Junction, Crime Branch Division',
    leadInvestigator: 'PSI Investigating Officer // Badge MCB-4512',
    status: 'convicted',
    verdict: 'Conviction',
    sentence: 'Sentenced to 5 years Rigorous Imprisonment under BNS ss. 309, 115, 61 with a fine of ₹25,000.',
    courtName: 'Court of the Sessions Judge, Pune (Special Trial Case № 24/113/2026)',
    summary: 'A logistics firm payroll van carrying weekly wages was ambushed on Marol Depot Road. The security guard was incapacitated with an iron bar. Through swift canvassing, independent search panchnamas under BNSS s.103, and locatable disclosure recoveries under BSA s.23, the inside cashier and primary assailant were brought to trial and convicted.',
    courtJudgment: `IN THE COURT OF THE SESSIONS JUDGE, PUNE\nSpecial Trial Case № 24/113 / 2026\nState of Maharashtra (Crime Branch) v. Salim Qureshi & Dinesh Varma\n\nJUDGMENT:\n1. The prosecution has proved beyond reasonable doubt that the accused entered into a criminal conspiracy (BNS s.61) to intercept the payroll van and commit robbery with hurt (BNS s.309).\n2. The recovery of the concealed lock-cutter and marked currency bag pursuant to disclosure statement under Section 23 of the Bharatiya Sakshya Adhiniyam, 2023 (BSA) was fully supported by two independent respectable witnesses.\n3. The electronic surveillance footage was duly verified under BSA s.63 with dual hash certificates.\n\nORDER:\nAccused Salim Qureshi and Dinesh Varma are found GUILTY and sentenced to 5 years Rigorous Imprisonment with ₹25,000 fine each.`,
    performanceSummary: {
      cluesRecovered: 8,
      totalClues: 8,
      hypothesesSolved: 3,
      totalHypotheses: 3,
      evidentiaryWeight: 410,
      meritBonus: 650,
      standingScore: 94,
      statutoryCompliance: '100% Strict compliance with BNSS s.103/105 & BSA s.23/63',
      investigationRating: 'Distinguished (A+)'
    },
    admittedExhibits: [
      {
        name: 'Concealed lock-cutter & grey duffel bag',
        type: 'Physical Weapon / Tool',
        weight: 65,
        chainOfCustody: 'Seized before 2 independent witnesses under BNSS s.103; sealed with MCB brass seal'
      },
      {
        name: 'Cash bag with marked RBI ₹500 notes (№ 7AB 849201)',
        type: 'Stolen Proceeds',
        weight: 80,
        chainOfCustody: 'Recovered pursuant to BSA s.23 disclosure memorandum witnessed by shopkeepers'
      },
      {
        name: 'CCTV Video Log from Sector 9 Junction',
        type: 'Electronic Record',
        weight: 75,
        chainOfCustody: 'Forensic bit-stream image verified with SHA-256 hash and BSA s.63 Certificate'
      },
      {
        name: 'Blood-stained iron bar from drainage culvert',
        type: 'Forensic Biological',
        weight: 70,
        chainOfCustody: 'FSL Serology Report confirms victim group AB+ blood match'
      },
      {
        name: 'Telecom CDR Extraction Logs',
        type: 'Digital Telephony',
        weight: 60,
        chainOfCustody: 'Nodal Cyber Officer certificate corroborating 14 calls between inside cashier and muscle'
      },
      {
        name: 'Getaway motorcycle chassis & helmet trace',
        type: 'Physical Vehicle',
        weight: 60,
        chainOfCustody: 'Seized at garage under Panchnama № 44/26'
      }
    ],
    convictedSuspects: [
      {
        id: 'susp-salim',
        name: 'Salim "Hammer" Qureshi',
        alias: 'The Hammer',
        role: 'Primary Assailant & Physical Muscle',
        mugshotUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
        chargesProved: ['BNS s.309 (Robbery with Hurt)', 'BNS s.115 (Voluntarily Causing Hurt)', 'BNS s.61 (Criminal Conspiracy)'],
        disclosedIntel: 'Disclosed location of concealed lock-cutter and marked currency bag behind transformer shed.'
      },
      {
        id: 'susp-dinesh',
        name: 'Dinesh Varma',
        alias: 'The Inside Man',
        role: 'Logistics Firm Cashier / Dispatcher',
        mugshotUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
        chargesProved: ['BNS s.316 (Criminal Breach of Trust by Servant)', 'BNS s.61 (Criminal Conspiracy)'],
        disclosedIntel: 'Conceded to tipping off the transport departure time via burner phone.'
      }
    ],
    judicialRemarks: [
      {
        issue: 'Exemplary Search & Seizure Panchnama',
        severity: 'minor',
        detail: 'Both independent panch witnesses withstood vigorous cross-examination in court without contradiction.',
        statute: 'BNSS s.103 & BSA s.57'
      },
      {
        issue: 'Flawless Section 23 BSA Recovery Memorandum',
        severity: 'minor',
        detail: 'Custodial disclosure leading directly to discovery of physical articles met the strict standard of the Supreme Court.',
        statute: 'BSA s.23'
      }
    ]
  },
  {
    id: 'archive-bw-7712',
    caseNumber: 'BW-2026-7712',
    title: 'The Cobalt Port Exfiltration',
    classification: 'TOP SECRET // MARITIME SPECIAL',
    incidentTime: '2026-09-12T01:45:00Z',
    closedDate: '2026-09-16',
    location: 'Berth 12, Deepwater Cargo Terminal & Outer Anchorage',
    leadInvestigator: 'Commander Cross // Callsign: VANGUARD',
    status: 'convicted',
    verdict: 'Guilty - Federal Grand Jury',
    sentence: 'Sentenced to 12 years Federal Penitentiary + $1,200,000 asset forfeiture.',
    courtName: 'Special Federal Maritime Court (Grand Jury Dkt № 2026-CR-7712)',
    summary: 'Syndicate operatives attempted clandestine exfiltration of dual-use naval guidance chips via a foreign-flagged cargo vessel. Intercepted through tactical breach, thermal night drone surveillance, and financial ledger forensics.',
    courtJudgment: `IN THE SPECIAL FEDERAL MARITIME COURT\nGrand Jury Docket № 2026-CR-7712\nUnited States v. Victor Renko & Mikhail Borzoi\n\nJUDGMENT:\n1. The Grand Jury returned a unanimous verdict of GUILTY on all counts of conspiracy, maritime cargo tampering, and unlawful export of classified guidance technologies.\n2. Cryptographic hash continuity of the guidance drive was maintained under ISO-17025 / BSA s.63 standards.\n\nORDER:\nDefendant Victor Renko is sentenced to 12 years Federal Penitentiary. Asset forfeiture of $1.2M ordered.`,
    performanceSummary: {
      cluesRecovered: 6,
      totalClues: 6,
      hypothesesSolved: 2,
      totalHypotheses: 2,
      evidentiaryWeight: 380,
      meritBonus: 800,
      standingScore: 98,
      statutoryCompliance: '100% Cryptographic Chain of Custody (ISO-17025 / BSA s.63)',
      investigationRating: 'Exemplary'
    },
    admittedExhibits: [
      {
        name: 'Encrypted Guidance Controller Solid-State Drive',
        type: 'Digital Hardware',
        weight: 95,
        chainOfCustody: 'Forensic bit-stream clone with dual cryptographic hash certificate'
      },
      {
        name: 'Thermal Drone Video - Berth 12 Transshipment',
        type: 'Surveillance Video',
        weight: 85,
        chainOfCustody: 'Real-time telemetry log authenticated by Port Security Chief'
      },
      {
        name: 'Offshore Escrow Wire Disbursements ($4.8M)',
        type: 'Financial Ledger',
        weight: 80,
        chainOfCustody: 'SWIFT wire verification memo from Federal Forensic Accounting Unit'
      },
      {
        name: 'Tampered High-Security Container Bolt Seals',
        type: 'Physical Forensic',
        weight: 60,
        chainOfCustody: 'Metallurgical toolmark comparison match from Central Forensic Lab'
      },
      {
        name: 'Clandestine Satellite Uplink Transponder',
        type: 'Electronic Hardware',
        weight: 60,
        chainOfCustody: 'Recovered during SWAT breach at Wharf Warehouse 4'
      }
    ],
    convictedSuspects: [
      {
        id: 'susp-renko',
        name: 'Victor "Kestrel" Renko',
        alias: 'Kestrel',
        role: 'Black-Market Maritime Broker',
        mugshotUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
        chargesProved: ['Naval Espionage', 'Maritime Cargo Hijacking', 'Conspiracy to Export Defense Articles'],
        disclosedIntel: 'Provided encrypted decryption key for the escrow ledger following grand jury indictment.'
      },
      {
        id: 'susp-borzoi',
        name: 'Mikhail Borzoi',
        alias: 'The Gantry',
        role: 'Harbor Crane Operator & Inside Saboteur',
        mugshotUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
        chargesProved: ['Inside Cargo Tampering', 'Aiding and Abetting Smuggling'],
        disclosedIntel: 'Admitted to swapping container manifests during the 02:00 shift change.'
      }
    ],
    judicialRemarks: [
      {
        issue: 'Flawless Digital Evidence Chain',
        severity: 'minor',
        detail: 'Defense motion to suppress electronic telemetry was dismissed due to strict compliance with cryptographic hash verification.',
        statute: 'BSA s.63 / FRE 902'
      }
    ]
  }
];

export function getArchivedCases(): ArchivedCaseFile[] {
  if (typeof window === 'undefined') return INITIAL_ARCHIVED_CASES;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_CASE_ARCHIVE);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading case archive from localStorage:', err);
  }
  // Initialize with default convicted cases
  try {
    localStorage.setItem(STORAGE_KEY_CASE_ARCHIVE, JSON.stringify(INITIAL_ARCHIVED_CASES));
  } catch {}
  return INITIAL_ARCHIVED_CASES;
}

export function saveArchivedCases(cases: ArchivedCaseFile[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CASE_ARCHIVE, JSON.stringify(cases));
  } catch (err) {
    console.error('Error saving case archive to localStorage:', err);
  }
}

export function archiveActiveCase(
  activeCase: CaseFile, 
  verdict: 'Conviction' | 'Partial' | 'Acquittal' | 'Guilty - Federal Grand Jury' = 'Conviction',
  sentenceText?: string,
  courtJudgmentText?: string
): ArchivedCaseFile {
  const existing = getArchivedCases();
  const alreadyInArchive = existing.find(c => c.caseNumber === activeCase.caseNumber || c.id === activeCase.id);
  
  const unlockedEvidence = activeCase.evidence.filter(e => e.isUnlocked);
  const solvedHypotheses = activeCase.hypotheses.filter(h => h.isSolved);
  const totalClues = activeCase.evidence.length || 1;
  const ratio = Math.round((unlockedEvidence.length / totalClues) * 100);

  const newArchiveEntry: ArchivedCaseFile = {
    id: 'archive-' + activeCase.id + '-' + Date.now(),
    caseNumber: activeCase.caseNumber,
    title: activeCase.title,
    classification: activeCase.classification,
    incidentTime: activeCase.incidentTime,
    closedDate: new Date().toISOString().split('T')[0],
    location: activeCase.location,
    leadInvestigator: activeCase.leadInvestigator,
    status: 'convicted',
    verdict: verdict,
    sentence: sentenceText || 'Accused sentenced to 5 years Rigorous Imprisonment under BNS ss. 309, 115, 61 with ₹25,000 fine.',
    courtName: 'Court of the Sessions Judge / Special Division',
    summary: activeCase.summary,
    courtJudgment: courtJudgmentText || `IN THE SESSIONS COURT // CASE № ${activeCase.caseNumber}\n\nJUDGMENT:\nThe prosecution presented a complete chain of circumstantial and direct evidence against the accused. All search panchnamas complied with BNSS s.103 and electronic records were certified under BSA s.63.\n\nFINDING:\nAccused held GUILTY beyond reasonable doubt. Conviction recorded.`,
    performanceSummary: {
      cluesRecovered: unlockedEvidence.length,
      totalClues: activeCase.evidence.length,
      hypothesesSolved: solvedHypotheses.length,
      totalHypotheses: activeCase.hypotheses.length,
      evidentiaryWeight: unlockedEvidence.length * 50 + 100,
      meritBonus: 1000,
      standingScore: Math.min(100, 80 + ratio / 5),
      statutoryCompliance: '100% Procedural Integrity (BNSS s.103/105 & BSA s.23/63)',
      investigationRating: ratio >= 80 ? 'Distinguished (A+)' : ratio >= 50 ? 'Exemplary' : 'Competent'
    },
    admittedExhibits: unlockedEvidence.map(e => ({
      name: e.title,
      type: e.type.toUpperCase(),
      weight: 50,
      chainOfCustody: e.chainOfCustody || 'Lawfully seized under BNSS s.103 before independent witnesses'
    })),
    convictedSuspects: activeCase.suspects.map(s => ({
      id: s.id,
      name: s.name,
      alias: s.alias,
      role: s.role,
      mugshotUrl: s.mugshotUrl,
      chargesProved: ['BNS s.309 (Armed Robbery / Aggravated Felony)', 'BNS s.61 (Conspiracy)'],
      disclosedIntel: s.revealedIntel && s.revealedIntel.length ? s.revealedIntel[0] : 'Disclosed key physical evidence location'
    })),
    judicialRemarks: [
      {
        issue: 'Evidentiary Chain Validation',
        severity: 'minor',
        detail: 'The defense was unable to poke holes in the chain of custody or panch witness testimony.',
        statute: 'BNSS s.103 & BSA s.57'
      }
    ]
  };

  const updated = alreadyInArchive 
    ? existing.map(c => (c.caseNumber === activeCase.caseNumber || c.id === activeCase.id) ? newArchiveEntry : c)
    : [newArchiveEntry, ...existing];

  saveArchivedCases(updated);
  return newArchiveEntry;
}
