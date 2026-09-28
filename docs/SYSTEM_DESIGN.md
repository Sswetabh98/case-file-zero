# PROJECT BLACKWATCH — SYSTEM DESIGN & TECHNICAL ARCHITECTURE
**Classification**: AGENCY RESTRICTED // COMM-SYS-OPS  
**Document**: System Design Specification  
**Version**: 1.0.0-SYS  

---

## 1. System Architecture Overview
Project Blackwatch is structured as a full-stack, progressive web application designed for mobile devices and high-resolution command screens.

### Key Technology Stack:
- **Frontend Core**: React 19, TypeScript, Tailwind CSS 4, Motion (framer-motion v12) for tactical transitions.
- **UI Architecture**: "Premium Administrative" aesthetic — Sharp borders (`border-slate-800`), deep charcoal backgrounds (`#0B0F19`, `#121826`), tactical amber (`#F59E0B`), cyan telemetry (`#06B6D4`), and retro monospace grids paired with serif headers.
- **Data Persistence**: Firebase Firestore (`firebase/firestore`) with instant local optimistic caching (`localStorage` fallback) and real-time document listeners.
- **Authentication**: Firebase Authentication with Google Sign-In and anonymous detective guest session provisioning.
- **Artificial Intelligence**: Server-side Gemini API (`@google/genai`) for real-time suspect interrogation, forensic cipher cracking, document summarization, and crime scene synthesis.
- **PWA Capabilities**: Web App Manifest (`manifest.webmanifest`), custom Service Worker (`sw.js`) with cache-first assets and network-first dynamic fallbacks, install prompt integration.

---

## 2. Core Game State Machine & Data Flow

```
+-----------------------------------------------------------+
|                   DETECTIVE ACTION (UI)                  |
|  (Inspect Clue / Dispatch Unit / Interrogate / Connect)   |
+-----------------------------+-----------------------------+
                              |
                              v
+-----------------------------------------------------------+
|              UNIFIED LOCAL GAME STATE STORE               |
|  - Active Case / Unlocked Clues / Dispatched Units        |
|  - Deductions Graph / Pinned Corkboard Threads            |
|  - Agency Budget / Suspicion Index / Clock                |
+--------------+------------------------------+-------------+
               |                              |
               v (Async optimistic write)     v (Gemini prompt proxy)
+-------------------------------+   +-------------------------------+
|      FIRESTORE DATABASE       |   |      BACKEND API SERVER       |
|  - `users/{uid}`              |   |  - `/api/interrogate`         |
|  - `gameState/{uid}`          |   |  - `/api/forensics-analyze`   |
|  - `caseProgress/{uid_case}`  |   |  - `@google/genai` Engine     |
+-------------------------------+   +-------------------------------+
```

---

## 3. Case 01: The Arlington Syndicate Wire (Scenario Logic)
- **Premise**: In the dead of night at 02:14, Marcus Vance (CFO of Arlington Capital) was seen leaving the North Ridge Docks where an encrypted hard drive was dumped. A courier named Elena Rostova was intercepted with a burner phone containing coordinates to an offshore vault.
- **Clues to Discover**:
  1. *Shell Company Ledger (Arlington Maritime LLC)*
  2. *9mm Shell Casing with Custom Stippling*
  3. *Encrypted USB Drive (Cipher: XOR-AES)*
  4. *Port Harbor CCTV Timestamp 02:14*
  5. *Audio Wiretap Transcript (Frequency 462.550 MHz)*
  6. *Coroner's Chemical Toxicology Memo (Sodium Fluoroacetate)*
- **Tactical Dispatch Missions**:
  - Deploy Alpha-1 to Harbor Pier 4 to uncover ballistic fragments.
  - Deploy Bravo-2 to wiretap Arlington Headquarters.
  - Deploy Delta-4 to decrypt the seized drive.
- **Deduction Links**:
  - Linking *CCTV Timestamp* + *Pier 4 Ballistics* + *Toxicology Memo* proves murder rather than suicide.
  - Linking *Shell Ledger* + *Decrypted USB Drive* exposes the offshore accounts, authorizing an arrest warrant for Marcus Vance.
