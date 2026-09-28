# CASE FILE ZERO / PROJECT BLACKWATCH — MASTER TASK LIST
**Feature Track**: Agentic Messaging System, Intent Classification & Interrogation Workflow Integration  
**Last Updated**: 2026-09-22  
**Status**: COMPLETED

---

## Architecture Overview
The messaging engine operates as an **Agentic Operational Dispatch Bus**. It does not merely chat; it parses player intent and operational spirit, extracts active case entities, prompts role-constrained AI personas, and emits strongly-typed action payloads that mutate the game snapshot in real-time, synchronizing frontend and backend state.

---

## Sequenced Task Roadmap

### Phase 1: Classification & Intent Engine (Backend Core)
- [x] **Task 1.1: Master Task List & Architecture Specification**: Formulate living task tracker and technical pipeline documentation. (`docs/TASK_LIST.md`)
- [x] **Task 1.2: Entity & Lexical Tagger**: Fast deterministic regex and dictionary extractor matching active case entities (persons, exhibits, scene sectors, legal sections, negations, modality). (`src/server/intentPipeline.ts`)
- [x] **Task 1.3: Spirit & Modality Analyzer**: Rule-based & heuristic detection of operational spirit (Urgency, Tone, Polarity, Intent Category). (`src/server/intentPipeline.ts`)
- [x] **Task 1.4: Grounded In-App Prompt Construction**: Modular prompt assembler injecting role boundaries, filtered case snapshot, and structured action contracts. (`src/server/intentPipeline.ts`)
- [x] **Task 1.5: Intent Pipeline Integration into cfzEngine**: Wire `intentPipeline` into `postChatMessage` in `cfzEngine.ts`, replacing brittle command matching and connecting structured intent actions. (`src/server/cfzEngine.ts`)

### Phase 2: Message $\leftrightarrow$ Interrogation Workflow & State Machine
- [x] **Task 2.1: Suspect Custody & Chamber State**: Model suspect presence in interrogation chamber (`summoned`, `in_chamber`, `interrogation_ready`, `escorted_by`). (`src/server/cfzEngine.ts`)
- [x] **Task 2.2: Interrogation Summon Directive Execution**: Enable player to command an officer (e.g., *"Bring in Arjun Mehta for questioning"*), assigning the squad member, logging in Case Diary, and staging the suspect in Interrogation Room. (`src/server/cfzEngine.ts`)
- [x] **Task 2.3: Cross-Feature UI Deep Links**: Render interactive deep-link pills in chat messages (`[Open Interrogation Room: Arjun Mehta](go:interrogation:id)`) that route directly via `go('interrogation:<id>')` and target the suspect. (`public/static/game.js`, `public/static/game.views4.js`)
- [x] **Task 2.4: Live Interrogation Room Chamber Badge**: Reflect in `VIEWS.interrogation` when a suspect is brought in via dispatch order, displaying escorting officer credit and legal basis under BNSS Section 35 / Section 187. (`public/static/game.views3.js`)

### Phase 3: Real-Time Bidirectional Sync & Proactive Dispatch Loops
- [x] **Task 3.1: Task Completion & Proactive Squelch Alerts**: Emit in-thread NPC follow-up messages when an officer finishes an escort, seizure, or lab delivery. (`src/server/cfzEngine.ts`, `public/static/game.views4.js`)
- [x] **Task 3.2: Interrogation Contradiction $\rightarrow$ Squad Dispatch Feed**: When a suspect cracks in interrogation (confession or lead revealed), automatically post an actionable memo into the squad dispatch thread. (`src/server/cfzEngine.ts`)
- [x] **Task 3.3: Blocker Resolution Dialogues**: If a suspect cannot be brought in (e.g. unknown whereabouts or lack of Section 35 notice), officer prompts player for authorization before proceeding. (`src/server/cfzEngine.ts`)

### Phase 4: Frontend Polish & Feedback
- [x] **Task 4.1: Chat Intent & Spirit Badges**: Render subtle tactical tag on messages (e.g. `FIELD DIRECTIVE`, `INQUIRY`, `DISCUSS`). (`public/static/game.views4.js`)
- [x] **Task 4.2: Audio / Radio Feedback**: Trigger authentic radio squelch on dispatch actions and suspect arrivals. (`public/static/game.audio.js`, `public/static/game.views4.js`)
- [x] **Task 4.3: End-to-End Build & Compilation Verification**: Verify flawless dev build, linting, and runtime integrity.
