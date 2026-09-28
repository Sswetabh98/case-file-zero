import React, { useState } from 'react';
import { FileText, Shield, Layers, Copy, Check, Download } from 'lucide-react';
import { sound } from '../lib/audio';

export const DocsView: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<'prd' | 'security' | 'system'>('prd');
  const [copied, setCopied] = useState(false);

  const docTabs = [
    { id: 'prd', label: '1. Product Requirements (PRD)', icon: FileText },
    { id: 'security', label: '2. Security Architecture', icon: Shield },
    { id: 'system', label: '3. System Design & State Specs', icon: Layers },
  ];

  const prdContent = `# PROJECT BLACKWATCH — PRODUCT REQUIREMENTS DOCUMENT (PRD)
Classification: AGENCY RESTRICTED // EYES ONLY
Product Name: Project Blackwatch (Tactical Detective Operations & Simulation Platform)
Version: 1.0.0-PROD
Target Environments: Mobile-First PWA (iOS / Android / Desktop Touch & Terminal)
Author: Directorate of Technical Operations & UI/UX Architecture

---

1. EXECUTIVE SUMMARY & VISION
Project Blackwatch is an immersive, mobile-first, high-fidelity tactical detective simulation game. Players assume the role of an Administrative Special Commander overseeing the Metropolitan Bureau of Investigation. The game discards playful or bubbly tropes in favor of a "Premium Administrative" aesthetic: deep charcoal gray, tactical navy, amber alert accents, crisp white data fields, sharp 1px dividing borders, retro monospace tactical data grids, and authoritative Serif headers.

The core gameplay loop centers on cold logic, evidentiary deduction, tactical field dispatch, forensic analysis, real-time suspect interrogation powered by server-side Gemini AI models, and real-time Firestore cloud synchronization.

2. TARGET AUDIENCE & USER PERSONAS
1. The Tactical Strategist ("Commander Cross"): Values systemic depth, dispatch logistics, realistic budget/time constraints, and tangible cause-and-effect outcomes.
2. The Evidentiary Investigator ("Detective Mercer"): Wants proof-based deductions where facts connect visually and logically (corkboard threads, ballistic trajectories, financial ledgers, encrypted logs).
3. The Mobile-First Operator: Demands high responsiveness, clean 44px+ touch targets, instant offline caching via Service Worker (PWA), and zero UI bloat.

3. CORE FUNCTIONAL PILLARS
3.1 Case Management & Tactical Dossiers
- Multi-Case Roster: Case 01: The Arlington Syndicate Wire, Case 02: The Black Amber Incident, and Case 03: Phantom Syndicate Protocol.
- Incident Briefings: Detailed audio/text intelligence dossiers, timestamps, classified memos, crime scene coordinates, and victim/target profiles.
- Evidence Vault: Real-time evidence categorization (Forensics, Cryptography, Ballistics, Surveillance, Financial Records). Each item contains inspection metadata, chain of custody, and deduction tags.

3.2 Evidence Deduction & Connection Matrix (Corkboard Engine)
- Visual deduction graph linking pieces of evidence to suspects and hypotheses.
- Logic Engine: Validates combinations of clues to unlock definitive warrants.
- Anti-Guessing Penalty: False warrants raise the Syndicate Alert Index, risking target escape.

3.3 Tactical Grid & Field Dispatch Operations
- Interactive Metropolitan Tactical Map with active district sectors (Financial District, Harbor Docks, North Ridge Warehouse, Embassy Quarter).
- Field Units: Alpha-1 (CSI), Bravo-2 (Wiretap), Charlie-3 (SWAT), Delta-4 (Cyber).
- Live deployment timers, dispatch costs, risk assessments, and real-time unit status reports.

3.4 Gemini-Powered Suspect Interrogation & Forensics Lab
- Direct interrogation room where players confront suspects.
- Realistic Evidence Containment Guardrails: Suspects have zero telepathic knowledge of unpresented police files; evidence only pressures the suspect once explicitly produced in the room or cited in dialogue.
- 3-Way Squad Interrogation Dynamics: Assisting members (SI Preeti, HC Dhanraj, JC Ravi) can be dispatched into the room with specific operational directives (cyber confrontation, street beat pressure, silent scribe).
- Statutory Safeguards (BNSS & BSA 2023): Enforces 24-hour statutory custody countdown (BNSS s.58/187), mandatory medical exams (s.54), advocate presence (s.41D), and admissible Locatable Discovery Memos under BSA s.23 (formerly s.27 IEA).
- Forensics Analysis Terminal: Gemini-assisted document synthesis, cryptanalysis, and chemical mass-spectrometry.

3.5 Command Line Interface (CLI)
- Monospace command console (help, scan, dispatch, query, decrypt, warrant, sync, clear).

3.6 Procedural Realism & Anti-AI Slop Architecture
- Deterministic psychological state transitions (arousal, resistance, credibility) coupled with authentic Indian statutory criminal procedure.
- Zero clue-dispensing shortcuts: Suspect admissions progress through realistic disclosure tiers based on evidence weight and emotional composure.`;

  const securityContent = `# PROJECT BLACKWATCH — SECURITY ARCHITECTURE DOCUMENT
Classification: TOP SECRET // COMMINT-SPEC-OPS
Product: Project Blackwatch Tactical Detective System
Version: 1.0.0-SEC
Security Framework: Defense-in-Depth, Zero-Trust Architecture, Least-Privilege Access Control

---

1. SECURITY ARCHITECTURE OVERVIEW
The security design enforces strict segregation between public presentation layers, client-side game state machines, and privileged server-side artificial intelligence execution boundaries.

Client Application (Mobile PWA / Web Browser)
  |-- Local Tactical State Machine (IndexedDB / LocalStorage fallback)
  |-- Firebase Client SDK (Authenticated via Google Auth / Anonymous ID)
  |-- Secure Token Storage & Nonce Validation
          |
    (gRPC / HTTPS)
          |
Firebase Infrastructure
  |-- Authentication: Token verification & Google Identity Services
  |-- Cloud Firestore: User Data Partitioning & Security Rules Guard
          |
    (REST /api/*)
          |
Application Server (Node/Express API Proxy)
  |-- Server-Side Gemini API Key Isolation (GEMINI_API_KEY)
  |-- Interrogation Sanitizer & Prompt Defense
  |-- Rate-Limiting & WAF

2. STRIDE THREAT MODELING & MITIGATIONS
- Spoofing: Cryptographically signed Firebase session JWTs; Firestore security rules enforce request.auth.uid == userId.
- Tampering: Game logic rules validate prerequisite chains; Firestore security rules reject writes to unauthorized documents.
- Repudiation: Immutable operational audit logs recorded with millisecond timestamps and officer cryptographic callsigns.
- Information Disclosure: Gemini API key strictly isolated on the backend server (GEMINI_API_KEY); client never has direct key access.
- Denial of Service: Token bucket rate limiting, prompt truncation guards, and backend timeout bounds.
- Elevation of Privilege: Granular RBAC: Player roles capped at detective clearance level; administrative settings read-only from client.

3. DATA PROTECTION & CRYPTOGRAPHIC PROTOCOLS
- Data in Transit: TLS 1.3 encryption across all communication links (HSTS enabled).
- Data at Rest: AES-256 server-side encryption via Google Cloud Firestore.
- Secret Management: GEMINI_API_KEY injected into server container environment; zero client exposure.

4. FIRESTORE SECURITY RULES
Rules enforce that users can only read and write their own documents matching request.auth.uid.`;

  const systemContent = `# PROJECT BLACKWATCH — SYSTEM DESIGN & TECHNICAL ARCHITECTURE
Classification: AGENCY RESTRICTED // COMM-SYS-OPS
Document: System Design Specification
Version: 1.0.0-SYS

---

1. SYSTEM ARCHITECTURE OVERVIEW
- Frontend Core: React 19, TypeScript, Tailwind CSS 4, Motion for tactical transitions.
- UI Architecture: "Premium Administrative" aesthetic — Sharp borders (border-slate-800), deep charcoal backgrounds (#0B0F19, #121826), tactical amber (#F59E0B), cyan telemetry (#06B6D4), and retro monospace grids paired with serif headers.
- Data Persistence: Firebase Firestore with instant local optimistic caching (localStorage fallback) and real-time document listeners.
- Authentication: Firebase Authentication with Google Sign-In and anonymous detective guest session provisioning.
- Artificial Intelligence: Server-side Gemini API (@google/genai) for real-time suspect interrogation, forensic cipher cracking, document summarization, and crime scene synthesis.
- PWA Capabilities: Web App Manifest (manifest.webmanifest), custom Service Worker (sw.js) with cache-first assets and network-first dynamic fallbacks, install prompt integration.

2. CORE GAME STATE MACHINE & DATA FLOW
- Detective Action (UI) -> Unified Local Game State Store -> Optimistic Firestore Sync + Gemini Server API Proxy.

3. CASE 01: THE ARLINGTON SYNDICATE WIRE (SCENARIO LOGIC)
- Premise: Marcus Vance (CFO of Arlington Capital) was seen leaving Pier 17 where courier was found shot clutching an encrypted drive.
- Clues: Shell Company Ledger, 9mm Casing, Port CCTV 02:14, Encrypted USB Drive, Coroner Toxicology Memo, Wiretap Audio Intercept.
- Tactical Missions: Deploy Alpha-1 to Pier 17; Bravo-2 to wiretap; Delta-4 to decrypt; Alpha-1 to County Morgue.
- Deductions: Linking CCTV + Ballistics proves homicide; Linking Ledger + Decrypted Drive authorizes Grand Jury Arrest Warrant.`;

  const currentContent = activeDoc === 'prd' ? prdContent : activeDoc === 'security' ? securityContent : systemContent;

  const handleCopy = () => {
    sound.playClick();
    navigator.clipboard.writeText(currentContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header & Controls */}
      <div className="bg-[#121826] border border-slate-800 p-4 sm:p-5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-lg font-serif-header font-bold text-slate-100 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-amber-500" />
            <span>PROJECT ARCHITECTURE & SPECIFICATION DOSSIER</span>
          </h2>
          <p className="text-xs font-mono-tactical text-slate-400">
            FORMAL PRODUCT REQUIREMENTS, SECURITY BLUEPRINTS, AND SYSTEM DESIGN
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded text-xs font-mono-tactical transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY SPEC TEXT'}</span>
        </button>
      </div>

      {/* Document Tab Selector */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-2">
        {docTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeDoc === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                setActiveDoc(tab.id as any);
              }}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-mono-tactical rounded transition-colors ${
                isActive 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Document Reader Container */}
      <div className="bg-[#0B0F19] border border-slate-800 p-6 rounded shadow-inner font-mono-tactical text-xs text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
        {currentContent}
      </div>

    </div>
  );
};
