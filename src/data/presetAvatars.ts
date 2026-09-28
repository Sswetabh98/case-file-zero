// Preset Tactical Avatars for Project Blackwatch Operative Profiles
export interface PresetAvatar {
  id: string;
  name: string;
  role: string;
  division: string;
  badgeCode: string;
  svgIcon: string; // SVG data URI
}

// Generate stylized vector portrait SVG data URI
function createAvatarSvg(bgGradient: [string, string], accentColor: string, symbolType: 'shield' | 'crosshair' | 'circuit' | 'terminal' | 'eye' | 'star' | 'lightning' | 'badge'): string {
  let symbolSvg = '';
  if (symbolType === 'shield') {
    symbolSvg = `<polygon points="50,18 78,32 78,58 50,82 22,58 22,32" fill="none" stroke="${accentColor}" stroke-width="4"/>
                 <circle cx="50" cy="48" r="10" fill="${accentColor}" fill-opacity="0.3"/>
                 <polygon points="50,38 58,54 42,54" fill="${accentColor}"/>`;
  } else if (symbolType === 'crosshair') {
    symbolSvg = `<circle cx="50" cy="50" r="26" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <circle cx="50" cy="50" r="14" fill="none" stroke="${accentColor}" stroke-width="2" stroke-dasharray="3,3"/>
                 <line x1="50" y1="16" x2="50" y2="84" stroke="${accentColor}" stroke-width="3"/>
                 <line x1="16" y1="50" x2="84" y2="50" stroke="${accentColor}" stroke-width="3"/>
                 <circle cx="50" cy="50" r="4" fill="${accentColor}"/>`;
  } else if (symbolType === 'circuit') {
    symbolSvg = `<rect x="30" y="30" width="40" height="40" rx="6" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <circle cx="50" cy="50" r="8" fill="${accentColor}"/>
                 <line x1="50" y1="18" x2="50" y2="30" stroke="${accentColor}" stroke-width="3"/>
                 <line x1="50" y1="70" x2="50" y2="82" stroke="${accentColor}" stroke-width="3"/>
                 <line x1="18" y1="50" x2="30" y2="50" stroke="${accentColor}" stroke-width="3"/>
                 <line x1="70" y1="50" x2="82" y2="50" stroke="${accentColor}" stroke-width="3"/>`;
  } else if (symbolType === 'terminal') {
    symbolSvg = `<rect x="22" y="24" width="56" height="52" rx="4" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <polyline points="32,44 42,52 32,60" fill="none" stroke="${accentColor}" stroke-width="4" stroke-linecap="round"/>
                 <line x1="48" y1="60" x2="64" y2="60" stroke="${accentColor}" stroke-width="4" stroke-linecap="round"/>`;
  } else if (symbolType === 'eye') {
    symbolSvg = `<path d="M 20 50 Q 50 24 80 50 Q 50 76 20 50 Z" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <circle cx="50" cy="50" r="12" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <circle cx="50" cy="50" r="5" fill="${accentColor}"/>`;
  } else if (symbolType === 'star') {
    symbolSvg = `<polygon points="50,18 58,38 80,38 62,52 68,74 50,60 32,74 38,52 20,38 42,38" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <circle cx="50" cy="50" r="6" fill="${accentColor}"/>`;
  } else if (symbolType === 'lightning') {
    symbolSvg = `<polygon points="54,16 32,48 48,48 44,84 68,44 52,44" fill="${accentColor}" stroke="${accentColor}" stroke-width="2"/>`;
  } else {
    symbolSvg = `<polygon points="50,14 82,28 82,62 50,86 18,62 18,28" fill="none" stroke="${accentColor}" stroke-width="3"/>
                 <text x="50" y="56" font-family="monospace" font-size="20" font-weight="bold" fill="${accentColor}" text-anchor="middle">BW</text>`;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bgGradient[0]}"/>
        <stop offset="100%" stop-color="${bgGradient[1]}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="50" fill="url(#bg)"/>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${accentColor}" stroke-width="1.5" stroke-opacity="0.4"/>
    ${symbolSvg}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  {
    id: 'cyber_lead',
    name: 'Cyber & Digital Lead',
    role: 'Cyber Forensics Specialist',
    division: 'Cybercrime & Electronic Intel',
    badgeCode: 'CY-8802',
    svgIcon: createAvatarSvg(['#051c24', '#083344'], '#06b6d4', 'circuit')
  },
  {
    id: 'field_commander',
    name: 'Special Commander',
    role: 'Tactical Recon Commander',
    division: 'Special Tactical Operations',
    badgeCode: 'BW-0941',
    svgIcon: createAvatarSvg(['#1c1305', '#382405'], '#f59e0b', 'shield')
  },
  {
    id: 'ballistics_expert',
    name: 'Forensic Ace',
    role: 'Chief Ballistics Officer',
    division: 'Forensic Ballistics & GSR',
    badgeCode: 'FB-4419',
    svgIcon: createAvatarSvg(['#1e0a1a', '#3b072e'], '#ec4899', 'crosshair')
  },
  {
    id: 'interrogation_ace',
    name: 'Master Interrogator',
    role: 'Behavioral Profiler',
    division: 'Custodial Interrogation Div.',
    badgeCode: 'BI-1033',
    svgIcon: createAvatarSvg(['#130a24', '#281347'], '#a855f7', 'eye')
  },
  {
    id: 'cryptographer',
    name: 'Signals Analyst',
    role: 'Cryptographic Lead',
    division: 'Signals Intelligence & Ciphers',
    badgeCode: 'SIG-7721',
    svgIcon: createAvatarSvg(['#051e15', '#064e3b'], '#10b981', 'terminal')
  },
  {
    id: 'shadow_operator',
    name: 'Ghost Operative',
    role: 'Deep Covert Recon',
    division: 'Covert Surveillance Branch',
    badgeCode: 'OP-0042',
    svgIcon: createAvatarSvg(['#0c121e', '#1e293b'], '#94a3b8', 'star')
  },
  {
    id: 'bureau_director',
    name: 'Bureau Director',
    role: 'Director of Special Operations',
    division: 'Executive Command Council',
    badgeCode: 'DIR-0001',
    svgIcon: createAvatarSvg(['#240f0f', '#450a0a'], '#ef4444', 'badge')
  },
  {
    id: 'strike_lead',
    name: 'SWAT Breach Lead',
    role: 'Tactical Assault Supervisor',
    division: 'Hostage & Rapid Intervention',
    badgeCode: 'SWAT-612',
    svgIcon: createAvatarSvg(['#18181b', '#27272a'], '#fbbf24', 'lightning')
  }
];

export const DEFAULT_RIBBONS = [
  {
    id: 'first_blood',
    title: 'First Analysis',
    description: 'First physical evidence submitted to spectrometer analysis.',
    icon: 'Microscope',
    category: 'forensics' as const,
    unlocked: true
  },
  {
    id: 'cold_case_breaker',
    title: 'Deduction Architect',
    description: 'Confirmed first criminal hypothesis on the Tactical Corkboard.',
    icon: 'Network',
    category: 'deduction' as const,
    unlocked: true
  },
  {
    id: 'truth_siphon',
    title: 'Truth Siphon',
    description: 'Broke a suspect past 80% stress level during custodial interrogation.',
    icon: 'Fingerprint',
    category: 'interrogation' as const,
    unlocked: false
  },
  {
    id: 'fiscal_guardian',
    title: 'Fiscal Guardian',
    description: 'Maintained operational budget with over $8,000 remaining reserves.',
    icon: 'Coins',
    category: 'operational' as const,
    unlocked: true
  },
  {
    id: 'ghost_commander',
    title: 'Ghost Operator',
    description: 'Completed field surveillance sweep with suspicion index below 30%.',
    icon: 'EyeOff',
    category: 'stealth' as const,
    unlocked: false
  },
  {
    id: 'magistrate_warrant',
    title: 'Judicial Warrant Ace',
    description: 'Executed judicial arrest warrant with flawless evidence backing.',
    icon: 'Award',
    category: 'operational' as const,
    unlocked: false
  }
];

export const DEFAULT_PERKS = [
  {
    id: 'perk_spectrometer',
    title: 'Spectrometer Priority Lane',
    description: 'Reduces evidence forensic analysis turnaround time by 30%.',
    requiredClearance: 1,
    unlocked: true,
    effect: '-30% analysis cost & immediate lab priority'
  },
  {
    id: 'perk_stress_insight',
    title: 'Psychological Readout HUD',
    description: 'Visualizes suspect deceit micro-expressions in real-time.',
    requiredClearance: 2,
    unlocked: true,
    effect: 'Displays live deceit meter & vulnerability alerts'
  },
  {
    id: 'perk_wiretap_grant',
    title: 'Emergency Wiretap Warrant',
    description: 'Recon dispatches uncover secondary suspect leads twice as fast.',
    requiredClearance: 3,
    unlocked: true,
    effect: '+50% chance of discovering encrypted leads during surveillance'
  },
  {
    id: 'perk_budget_subsidy',
    title: 'Metropolitan Contingency Fund',
    description: 'Automatic emergency $3,000 budget replenishment if funds drop below $1,000.',
    requiredClearance: 4,
    unlocked: false,
    effect: 'Emergency +$3,000 grant reserve'
  },
  {
    id: 'perk_executive_immunity',
    title: 'Directorate Executive Privilege',
    description: 'Syndicate alert and suspicion spikes dampened by 40%.',
    requiredClearance: 5,
    unlocked: false,
    effect: '-40% suspicion penalty on high-impact tactical breach'
  }
];
