import { CaseFile, TacticalUnit } from '../types/game';

export const INITIAL_TACTICAL_UNITS: TacticalUnit[] = [
  {
    id: 'unit-alpha',
    callsign: 'Alpha-1 CSI',
    unitCode: 'TAC-FORENSIC-01',
    specialty: 'Crime Scene & Ballistics',
    status: 'standby',
    currentSectorId: 'sector-hq',
    deploymentTimeRemaining: 0,
    cost: 450,
  },
  {
    id: 'unit-bravo',
    callsign: 'Bravo-2 Wire',
    unitCode: 'TAC-SIGINT-02',
    specialty: 'Covert Surveillance & Wiretap',
    status: 'standby',
    currentSectorId: 'sector-hq',
    deploymentTimeRemaining: 0,
    cost: 600,
  },
  {
    id: 'unit-charlie',
    callsign: 'Charlie-3 SWAT',
    unitCode: 'TAC-BREACH-03',
    specialty: 'Tactical Breach & SWAT',
    status: 'standby',
    currentSectorId: 'sector-hq',
    deploymentTimeRemaining: 0,
    cost: 950,
  },
  {
    id: 'unit-delta',
    callsign: 'Delta-4 Cyber',
    unitCode: 'TAC-CYBER-04',
    specialty: 'Cybernetics & Ledger Audit',
    status: 'standby',
    currentSectorId: 'sector-hq',
    deploymentTimeRemaining: 0,
    cost: 750,
  }
];

export const INITIAL_CASES: CaseFile[] = [
  {
    id: 'case-01',
    caseNumber: 'BW-2026-8891',
    title: 'The Arlington Syndicate Wire',
    classification: 'RESTRICTED // BUREAU-LEVEL',
    status: 'active',
    incidentTime: '2026-09-20T02:14:00Z',
    location: 'District 4, Pier 17 & Arlington Maritime HQ',
    leadInvestigator: 'Commander Cross // Callsign: VANGUARD',
    rewardBudget: 12500,
    summary: 'At 02:14 UTC, a harbor security watchman heard three suppressed shots at Pier 17. A black sedan registered to Arlington Maritime Capital sped westbound toward the Financial Core. A courier was found deceased in the cargo staging yard, clutching an encrypted military-grade flash drive. Initial financial audits reveal over $84,000,000 diverted into offshore shell corporations within 72 hours.',
    primaryObjective: 'Establish unbroken evidentiary chain linking Marcus Vance (CFO) to the Pier 17 homicide and offshore shell accounts.',
    secondaryObjective: 'Decrypt the courier’s flash drive and recover intercepted wiretap logs before the Syndicate evacuates District 4.',
    evidence: [
      {
        id: 'ev-01',
        code: 'EV-8891-A',
        title: 'Shell Company Ledger (Arlington Maritime LLC)',
        type: 'financial',
        dateDiscovered: '02:30 UTC',
        isUnlocked: true,
        isAnalyzed: false,
        summary: 'Detailed transaction ledger showing irregular $12.4M wire transfers routed to Caymans accounts under "Vance Family Trust".',
        fullDescription: 'Seized from the executive penthouse suite during the initial preliminary sweep. Entries show recurring payments disguised as maritime bunker fuel invoices, signed by CFO Marcus Vance with an authentication key.',
        chainOfCustody: 'Officer Kowalski -> Evidence Lockbox A4 -> Central Lab',
        locationFound: 'Financial District, Arlington Tower Penthouse',
        tags: ['FINANCIAL', 'VANCE', 'OFFSHORE', 'FORGERY'],
        relatedSuspectId: 'susp-01'
      },
      {
        id: 'ev-02',
        code: 'EV-8891-B',
        title: '9mm Spent Casing (Sub-Sonic Custom Stippling)',
        type: 'ballistics',
        dateDiscovered: '03:10 UTC',
        isUnlocked: true,
        isAnalyzed: false,
        summary: 'Brass casing recovered 4 feet from the victim at Pier 17. Striations indicate a custom titanium match barrel with internal suppressor thread.',
        fullDescription: 'Microscopic inspection reveals unique tool marks on the firing pin indentation. Ballistic registry cross-reference required to identify the firearm owner.',
        chainOfCustody: 'Forensics Specialist Lin -> Ballistics Vault B-12',
        locationFound: 'Harbor Docks, Pier 17 Cargo Zone',
        tags: ['BALLISTICS', 'HOMICIDE', 'FIREARM', 'PIER 17']
      },
      {
        id: 'ev-03',
        code: 'EV-8891-C',
        title: 'Port Harbor CCTV Feed (02:14 UTC)',
        type: 'surveillance',
        dateDiscovered: '04:00 UTC',
        isUnlocked: true,
        isAnalyzed: true,
        summary: 'Security footage captures a heavy overcoat figure matching Marcus Vance exiting Pier 17 gate at 02:15, carrying a metal briefcase.',
        fullDescription: 'Timestamp sync matches the audio acoustic sensors. The figure’s gait analysis exhibits a 94.2% match with Marcus Vance’s pedestrian biometric profile.',
        chainOfCustody: 'Port Authority Security Dir -> Server Backup Raid-5',
        locationFound: 'Harbor Docks Gate 4 Security Cam',
        tags: ['SURVEILLANCE', 'CCTV', 'VANCE', 'TIMELINE']
      },
      {
        id: 'ev-04',
        code: 'EV-8891-D',
        title: 'Encrypted USB Flash Drive (Cipher: XOR-AES-256)',
        type: 'cryptography',
        dateDiscovered: 'Uncovered upon searching Harbor Pier 4 Warehouse',
        isUnlocked: false,
        isAnalyzed: false,
        summary: 'Hardened thumb drive recovered from courier Elena Rostova’s coat lining during sector raid.',
        fullDescription: 'Hardware-level biometric lock with brute-force self-destruct counter. Requires Delta-4 Cyber Unit decryption or interrogation passcode extraction.',
        chainOfCustody: 'Pending Seizure',
        locationFound: 'North Ridge Warehouse (Sector D)',
        tags: ['CRYPTOGRAPHY', 'ELECTRONIC', 'ROSTOVA', 'CONFIDENTIAL']
      },
      {
        id: 'ev-05',
        code: 'EV-8891-E',
        title: 'Coroner Toxicology & Autopsy Memo',
        type: 'forensics',
        dateDiscovered: 'Uncovered upon sending Alpha-1 to County Morgue',
        isUnlocked: false,
        isAnalyzed: false,
        summary: 'Autopsy notes reveal sodium fluoroacetate residue in courier blood sample before the gunshot, confirming prior poisoning attempt.',
        fullDescription: 'Doctor Julian Aris noted high chemical purity obtainable only from state-licensed clinical research laboratories.',
        chainOfCustody: 'County Medical Examiner Office',
        locationFound: 'Medical Examiner District Lab',
        tags: ['FORENSICS', 'TOXICOLOGY', 'POISON', 'ARIS']
      },
      {
        id: 'ev-06',
        code: 'EV-8891-F',
        title: 'Wiretap Audio Intercept (Frequency 462.550 MHz)',
        type: 'audio_log',
        dateDiscovered: 'Uncovered upon deploying Bravo-2 to Embassy Row',
        isUnlocked: false,
        isAnalyzed: false,
        summary: 'Intercepted radio chatter between "CFO-One" and an offshore transport vessel requesting emergency night clearance past nautical border.',
        fullDescription: 'Spectrographic analysis confirms voice timber matches Vance. Reference made to "cleaning the ledger before Federal sunrise".',
        chainOfCustody: 'SIGINT Sector 3 Tower',
        locationFound: 'Embassy Row Telecom Mast',
        tags: ['SIGINT', 'WIRETAP', 'COMMUNICATIONS', 'ESCAPE']
      }
    ],
    suspects: [
      {
        id: 'susp-01',
        name: 'Marcus Vance',
        alias: '"The Auditor"',
        role: 'Chief Financial Officer, Arlington Maritime Capital',
        status: 'person_of_interest',
        mugshotUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=faces',
        age: 52,
        alibi: 'Claims he was in a private dinner at the Grand Metropolitan Club until 03:30 AM with corporate legal counsel.',
        psychologicalProfile: 'Narcissistic, cold, highly defensive. Vulnerable to verifiable accounting discrepancies and physical timeline proof.',
        stressLevel: 25,
        deceitIndex: 85,
        vulnerabilities: ['ev-01', 'ev-02', 'ev-03', 'ev-06'],
        revealedIntel: [],
        testimony: [
          {
            id: 't-01',
            sender: 'suspect',
            text: 'I am CFO of a Fortune 500 shipping syndicate. You dragged me into this interrogation cell on hearsay. My attorneys will have your badge before midnight.',
            timestamp: '03:45 UTC',
            stressAtTime: 25
          }
        ]
      },
      {
        id: 'susp-02',
        name: 'Elena Rostova',
        alias: '"Cipher-9"',
        role: 'Independent Syndicate Courier & Cryptographer',
        status: 'under_surveillance',
        mugshotUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&crop=faces',
        age: 29,
        alibi: 'Claims she was working remotely as a freelance network penetration auditor at a 24-hour Internet café in North Ridge.',
        psychologicalProfile: 'Pragmatic survivor. Will cut a deal if presented with lethal conspiracy evidence or evidence of syndicate betrayal.',
        stressLevel: 40,
        deceitIndex: 70,
        vulnerabilities: ['ev-04', 'ev-05'],
        revealedIntel: [],
        testimony: [
          {
            id: 't-02',
            sender: 'suspect',
            text: 'I only transport dead drops. I do not ask what is inside the parcels. If you found something toxic, you are looking at the wrong contractor.',
            timestamp: '04:15 UTC',
            stressAtTime: 40
          }
        ]
      },
      {
        id: 'susp-03',
        name: 'Dr. Julian Aris',
        alias: '"The Apothecary"',
        role: 'Deputy Medical Examiner & Toxicologist',
        status: 'person_of_interest',
        mugshotUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=faces',
        age: 47,
        alibi: 'Claims he was on-call at St. Jude Hospital until arriving at the morgue at 03:00 UTC.',
        psychologicalProfile: 'Neurotic perfectionist, high gambling debts. Terrified of criminal exposure.',
        stressLevel: 60,
        deceitIndex: 65,
        vulnerabilities: ['ev-05', 'ev-01'],
        revealedIntel: [],
        testimony: [
          {
            id: 't-03',
            sender: 'suspect',
            text: 'The toxicology report took four hours because the compound is exceptionally rare. I followed standard operating procedures to the letter!',
            timestamp: '04:45 UTC',
            stressAtTime: 60
          }
        ]
      }
    ],
    sectors: [
      {
        id: 'sec-01',
        code: 'D-01',
        name: 'Harbor Docks Pier 17',
        threatLevel: 'HIGH',
        gridCoord: 'B-3',
        posX: 22,
        posY: 68,
        description: 'Primary murder scene and container terminal. Evidence of hurried departure, tire tracks, and blood spatter.',
        unlockedClueId: 'ev-02',
        isScanned: true,
        searchCost: 500
      },
      {
        id: 'sec-02',
        code: 'D-02',
        name: 'Arlington Capital Tower (Financial District)',
        threatLevel: 'ELEVATED',
        gridCoord: 'E-5',
        posX: 65,
        posY: 38,
        description: 'Glass-and-steel 42-story skyscraper. Executive suite contains server rooms and shredder bins.',
        unlockedClueId: 'ev-01',
        isScanned: true,
        searchCost: 650
      },
      {
        id: 'sec-03',
        code: 'D-03',
        name: 'North Ridge Warehouse District',
        threatLevel: 'CRITICAL',
        gridCoord: 'A-2',
        posX: 18,
        posY: 22,
        description: 'Abandoned maritime refrigerated depot. Thermal imaging reports three armed sentries and active radio equipment.',
        unlockedClueId: 'ev-04',
        isScanned: false,
        searchCost: 950
      },
      {
        id: 'sec-04',
        code: 'D-04',
        name: 'Embassy Quarter Radio Mast',
        threatLevel: 'LOW',
        gridCoord: 'G-2',
        posX: 82,
        posY: 20,
        description: 'Telecommunications hub monitoring foreign diplomatic lines and emergency coastal radio frequencies.',
        unlockedClueId: 'ev-06',
        isScanned: false,
        searchCost: 800
      },
      {
        id: 'sec-05',
        code: 'D-05',
        name: 'County Medical Examiner Forensic Lab',
        threatLevel: 'LOW',
        gridCoord: 'C-7',
        posX: 44,
        posY: 80,
        description: 'Subterranean morgue and gas chromatography suite where victim’s body is currently undergoing forensic necropsy.',
        unlockedClueId: 'ev-05',
        isScanned: false,
        searchCost: 700
      }
    ],
    hypotheses: [
      {
        id: 'hyp-01',
        code: 'HYP-ALPHA',
        title: 'Pier 17 Physical Presence & Ballistic Execution',
        description: 'Prove that Marcus Vance was physically present at Pier 17 during the 02:14 homicide and executed the victim using a silenced 9mm firearm.',
        requiredEvidenceIds: ['ev-02', 'ev-03'],
        targetSuspectId: 'susp-01',
        isSolved: false,
        warrantUnlocked: false,
        proofExplanation: 'Correlating the CCTV timestamp 02:14 with the 9mm custom-stippled casing shatters Vance’s club alibi and places him at the exact point of execution.'
      },
      {
        id: 'hyp-02',
        code: 'HYP-BETA',
        title: 'Premeditated Poisoning & Chemical Facilitation',
        description: 'Prove that the victim was incapacitated with sodium fluoroacetate prior to shooting, involving laboratory medical collusion.',
        requiredEvidenceIds: ['ev-05', 'ev-01'],
        targetSuspectId: 'susp-03',
        isSolved: false,
        warrantUnlocked: false,
        proofExplanation: 'Chemical trace from autopsy combined with offshore ledger disbursements to Dr. Julian Aris proves hired medical facilitation.'
      },
      {
        id: 'hyp-03',
        code: 'HYP-GAMMA',
        title: 'Master Conspiratorial Wire & Offshore Exfiltration (FULL CASE CLOSURE)',
        description: 'Prove the master conspiracy: Vance ordered the hit to prevent Elena Rostova and the courier from handing the decrypted financial drive to Federal prosecutors.',
        requiredEvidenceIds: ['ev-01', 'ev-03', 'ev-04', 'ev-06'],
        targetSuspectId: 'susp-01',
        isSolved: false,
        warrantUnlocked: false,
        proofExplanation: 'Unbroken chain: Arlington Ledger ($84M) + CCTV Presence + Decrypted Drive + Wiretap chatter provides incontrovertible proof for a Federal Grand Jury Warrant.'
      }
    ]
  },
  {
    id: 'case-02',
    caseNumber: 'BW-2026-9042',
    title: 'The Black Amber Incident',
    classification: 'TOP SECRET // BIO-DEFENSE',
    status: 'registered',
    incidentTime: '2026-09-18T23:50:00Z',
    location: 'District 7, Biotech Bio-Sphere & Old Rail Yards',
    leadInvestigator: 'Inspector Thorne // Callsign: NIGHTHAWK',
    rewardBudget: 15000,
    summary: 'A biological neuro-stabilizer vial codenamed "Black Amber" was extracted from cryogenic containment at Nexis Bio-Labs. The chief toxicologist was found unconscious inside an airlock chamber. A diplomatic courier vehicle was tracked toward the international runway.',
    primaryObjective: 'Locate the missing cryogenic vial before the 06:00 AM diplomatic flight departs.',
    secondaryObjective: 'Identify the inside molecular engineer who bypassed retinal access scanners.',
    evidence: [],
    suspects: [],
    sectors: [],
    hypotheses: []
  },
  {
    id: 'case-03',
    caseNumber: 'BW-2026-9118',
    title: 'Phantom Syndicate Protocol',
    classification: 'CLASSIFIED // SIGINT-SPECIAL',
    status: 'registered',
    incidentTime: '2026-09-15T01:30:00Z',
    location: 'Metropolitan Grid Substation 9 & High Sierra Relay',
    leadInvestigator: 'Captain Miller // Callsign: CHRONOS',
    rewardBudget: 18000,
    summary: 'A coordinated cyber-physical sabotage took down backup generator power for three city sectors while a clandestine server bank in the abandoned subway tunnels was extracted.',
    primaryObjective: 'Track the physical rogue servers and arrest the syndicate signal coordinator.',
    secondaryObjective: 'Prevent the secondary electrical transformer cascade across Central Sector.',
    evidence: [],
    suspects: [],
    sectors: [],
    hypotheses: []
  }
];
