# PROJECT BLACKWATCH — PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Classification**: AGENCY RESTRICTED // EYES ONLY  
**Product Name**: Project Blackwatch (Tactical Detective Operations & Simulation Platform)  
**Version**: 1.0.0-PROD  
**Target Environments**: Mobile-First PWA (iOS / Android / Desktop Touch & Terminal)  
**Author**: Directorate of Technical Operations & UI/UX Architecture

---

## 1. Executive Summary & Vision
**Project Blackwatch** is an immersive, mobile-first, high-fidelity tactical detective simulation game. Players assume the role of an Administrative Special Commander overseeing the Metropolitan Bureau of Investigation. The game discards childish, playful tropes in favor of a "Premium Administrative" aesthetic: deep charcoal gray, tactical navy, amber alert accents, crisp white data fields, sharp 1px dividing borders, retro monospace tactical data grids, and authoritative Serif headers.

The core gameplay loop centers on **cold logic, evidentiary deduction, tactical field dispatch, forensic analysis, real-time suspect interrogation powered by server-side Gemini AI models, and real-time Firestore cloud synchronization**.

---

## 2. Target Audience & User Personas
1. **The Tactical Strategist ("Commander Cross")**: Values systemic depth, dispatch logistics, realistic budget/time constraints, and tangible cause-and-effect outcomes.
2. **The Evidentiary Investigator ("Detective Mercer")**: Wants proof-based deductions where facts connect visually and logically (corkboard threads, ballistic trajectories, financial ledgers, encrypted logs).
3. **The Mobile-First Operator**: Demands high responsiveness, clean 44px+ touch targets, instant offline caching via Service Worker (PWA), and zero UI bloat.

---

## 3. Core Functional Pillars

### 3.1 Case Management & Tactical Dossiers
- **Multi-Case Roster**: Primary operations including *Case 01: The Arlington Syndicate Wire*, *Case 02: The Black Amber Incident*, and *Case 03: Phantom Syndicate Protocol*.
- **Incident Briefings**: Detailed audio/text intelligence dossiers, timestamps, classified memos, crime scene coordinates, and victim/target profiles.
- **Evidence Vault**: Real-time evidence categorization (Forensics, Cryptography, Ballistics, Surveillance, Financial Records). Each item contains inspection metadata, chain of custody, and deduction tags.

### 3.2 Evidence Deduction & Connection Matrix (Corkboard Engine)
- Visual deduction graph linking pieces of evidence to suspects and hypotheses.
- Logic Engine: Validates combinations of clues (e.g., matching a 9mm casing + security footage + shell company bank statement) to unlock definitive warrants.
- Anti-Guessing Penalty: False warrants raise the Syndicate Alert Index, risking target escape or evidence destruction.

### 3.3 Tactical Grid & Field Dispatch Operations
- Interactive Metropolitan Tactical Map with active district sectors (Financial District, Harbor Docks, North Ridge Warehouse, Embassy Quarter).
- Field Units available for tactical deployment:
  - **Alpha-1 (Forensics & Crime Scene CSI)**: Scours scenes for latent prints, ballistics, DNA.
  - **Bravo-2 (Covert Surveillance & Wiretap)**: Monitors radio frequencies, taps phone lines, tails suspects.
  - **Charlie-3 (Tactical Strike & Swat Breachers)**: Executes high-risk raids and search warrants.
  - **Delta-4 (Cyber & Financial Forensics)**: Decrypts encrypted flash drives, audits SWIFT transactions.
- Live deployment timers, dispatch costs, risk assessments, and real-time unit status reports.

### 3.4 Gemini-Powered Suspect Interrogation & Forensics Lab
- Direct interrogation room where players confront suspects (e.g., Marcus Vance - Syndicate CFO, Elena Rostova - Cryptographer, Dr. Julian Aris - Corrupt Medical Examiner).
- Dynamic AI Interrogation Protocol: Suspects possess psychological stress levels, deceit meters, and guarded secrets. Confronting them with specific unlocked evidence breaks their alibi.
- Forensics Analysis Terminal: Gemini-assisted document synthesis, cryptanalysis, cipher cracking, and chemical mass-spectrometry breakdowns.

### 3.5 Operational Command Terminal (CLI)
- Monospace command console (`help`, `scan`, `dispatch`, `query`, `decrypt`, `warrant`, `sync`, `clear`).
- For power users and retro tactical enthusiasts, providing direct command-line agency.

---

## 4. Technical & Non-Functional Requirements
- **Design System**: "Premium Administrative" aesthetic with strict avoidance of playful/bubbly elements.
- **Performance**: Sub-100ms UI interactions, 60fps canvas/motion renders.
- **Offline & PWA**: Full service worker caching, installable on Android/iOS/Desktop, offline fallback.
- **Persistence**: Real-time state synchronization via Firebase Firestore with local fallback.
- **Security**: Strict Firestore rules, server-proxied Gemini API keys, zero client-side secret exposure.
