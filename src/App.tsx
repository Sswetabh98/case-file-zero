import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav, GameTab } from './components/BottomNav';
import { DossierView } from './components/DossierView';
import { EvidenceView } from './components/EvidenceView';
import { DispatchView } from './components/DispatchView';
import { CorkboardView } from './components/CorkboardView';
import { InterrogationView } from './components/InterrogationView';
import { TerminalView } from './components/TerminalView';
import { DocsView } from './components/DocsView';
import { AuthModal } from './components/AuthModal';
import { WarrantModal } from './components/WarrantModal';
import { ModalAlert, AlertData } from './components/ModalAlert';
import { GameSettingsModal, SettingsTab } from './components/GameSettingsModal';
import { DailyBriefingModal } from './components/DailyBriefingModal';
import { InductionPortal } from './components/InductionPortal';

import { 
  CaseFile, 
  TacticalUnit, 
  OperationalLog, 
  OfficerProfile, 
  DeductionHypothesis, 
  Suspect, 
  EvidenceItem,
  GameSettingsState,
  TacticalTheme
} from './types/game';
import { INITIAL_CASES, INITIAL_TACTICAL_UNITS } from './data/cases';
import { archiveActiveCase, getArchivedCases } from './data/archivedCases';
import { PRESET_AVATARS } from './data/presetAvatars';
import { sound } from './lib/audio';
import { 
  subscribeToAuth, 
  syncGameStateToCloud, 
  loadGameStateFromCloud, 
  saveOfficerProfileToCloud 
} from './lib/firebase';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<GameTab>('dossier');
  const [isInducted, setIsInducted] = useState<boolean>(() => {
    return localStorage.getItem('blackwatch_is_inducted') === 'true';
  });

  // Core Game State
  const [currentCaseId, setCurrentCaseId] = useState<string>('case-01');
  const [cases, setCases] = useState<CaseFile[]>(() => {
    const saved = localStorage.getItem('blackwatch_cases');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_CASES;
  });

  const [units, setUnits] = useState<TacticalUnit[]>(() => {
    const saved = localStorage.getItem('blackwatch_units');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_TACTICAL_UNITS;
  });

  const [budget, setBudget] = useState<number>(() => {
    const saved = localStorage.getItem('blackwatch_budget');
    return saved ? Number(saved) : 12500;
  });

  const [suspicionIndex, setSuspicionIndex] = useState<number>(() => {
    const saved = localStorage.getItem('blackwatch_suspicion');
    return saved ? Number(saved) : 15;
  });

  const [gameClockMinutes, setGameClockMinutes] = useState<number>(134); // 02:14 UTC start
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());

  // Game Settings & UI Theme State
  const [gameSettings, setGameSettings] = useState<GameSettingsState>(() => {
    const saved = localStorage.getItem('blackwatch_game_settings');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    const savedTheme = (localStorage.getItem('blackwatch_theme') as TacticalTheme) || 'blackwatch';
    return {
      theme: savedTheme,
      scanlines: true,
      glitchFx: true,
      textDensity: 'compact',
      typingSpeed: 'teletype',
      aiModel: 'gemini-2.5-flash',
      interrogationWingman: 'co_examiner_wingman',
      responseTone: 'concise',
      audioMasterVolume: 80,
      audioSfxVolume: 80,
      audioProfile: 'cyber',
      audioCues: { radar: true, clues: true, warning: true, mission: true },
      showBriefingOnStartup: true,
      confirmHighSpend: true,
      autoTagClues: true,
      suspicionBrakes: true,
    };
  });

  // Apply theme dynamically to document element
  useEffect(() => {
    const currentTheme = gameSettings.theme || 'blackwatch';
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [gameSettings.theme]);

  // Logs
  const [logs, setLogs] = useState<OperationalLog[]>(() => {
    const saved = localStorage.getItem('blackwatch_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'log-1',
        timestamp: '02:14:00 UTC',
        type: 'ALERT',
        message: 'Acoustic impulse alarm tripped at Pier 17. Tactical Command alert initiated.',
        severity: 'critical'
      },
      {
        id: 'log-2',
        timestamp: '02:15:30 UTC',
        type: 'SYSTEM',
        message: 'Project Blackwatch operations center mobilized under Special Commander.',
        severity: 'info'
      }
    ];
  });

  // Officer Profile
  const [officer, setOfficer] = useState<OfficerProfile>(() => {
    let guestId = localStorage.getItem('blackwatch_guest_id');
    if (!guestId) {
      guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('blackwatch_guest_id', guestId);
    }
    const defaults: OfficerProfile = {
      uid: guestId,
      callsign: 'VANGUARD',
      displayName: 'Special Commander',
      badgeNumber: 'BW-0941',
      division: 'Special Tactical Operations',
      avatarUrl: PRESET_AVATARS[1].svgIcon,
      presetAvatarId: 'field_commander',
      motto: 'Order through truth, justice through evidence.',
      bio: 'Special Operations Commander assigned to Metropolitan Crime Branch.',
      clearanceLevel: 3,
      casesClosed: 0,
      meritScore: 1200,
      isAnonymous: true,
      careerStats: {
        hypothesesFormulated: 3,
        hypothesesConfirmed: 0,
        interrogationsConducted: 0,
        deceitsExposed: 0,
        evidenceDiscovered: 4,
        evidenceAnalyzed: 0,
        unitsDispatched: 0,
        budgetSpent: 0,
        peakSuspicion: 15,
        warrantsIssued: 0,
        arrestsExecuted: 0
      }
    };
    const saved = localStorage.getItem('blackwatch_officer');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaults, ...parsed };
      } catch {}
    }
    return defaults;
  });

  // Loading / Async States
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isAnalyzingEvidence, setIsAnalyzingEvidence] = useState<boolean>(false);
  const [isInterrogating, setIsInterrogating] = useState<boolean>(false);

  // Modals & User Preferences
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<SettingsTab>('profile');
  const [showBriefingOnStartup, setShowBriefingOnStartup] = useState<boolean>(() => {
    return localStorage.getItem('blackwatch_show_briefing') !== 'false';
  });
  const [isBriefingModalOpen, setIsBriefingModalOpen] = useState<boolean>(() => {
    // Open on load by default unless expressly disabled
    return localStorage.getItem('blackwatch_show_briefing') !== 'false';
  });
  const [byokKey, setByokKey] = useState<string>(() => {
    return localStorage.getItem('blackwatch_byok_key') || '';
  });

  const handleSaveByokKey = (key: string) => {
    const trimmed = key.trim();
    setByokKey(trimmed);
    localStorage.setItem('blackwatch_byok_key', trimmed);
    const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';
    setLogs(prev => [
      ...prev,
      {
        id: 'log-' + Date.now(),
        timestamp,
        type: 'SYSTEM',
        message: trimmed 
          ? 'Special Commander configured personal BYOK Gemini API key as PRIMARY engine.' 
          : 'Dedicated BYOK key cleared. Reverted to system fallback API (zero-delay).',
        severity: 'info'
      }
    ]);
  };

  const handleToggleBriefingOnStartup = (show: boolean) => {
    setShowBriefingOnStartup(show);
    handleUpdateSettings({ showBriefingOnStartup: show });
    localStorage.setItem('blackwatch_show_briefing', show ? 'true' : 'false');
  };

  const handleResetInvestigation = () => {
    setCases(INITIAL_CASES);
    setUnits(INITIAL_TACTICAL_UNITS);
    setBudget(12500);
    setSuspicionIndex(15);
    localStorage.removeItem('blackwatch_cases');
    localStorage.removeItem('blackwatch_units');
    localStorage.removeItem('blackwatch_budget');
    localStorage.removeItem('blackwatch_suspicion');
    sound.playAlertWarning();
    const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';
    setLogs([
      {
        id: 'log-' + Date.now(),
        timestamp,
        type: 'SYSTEM',
        message: 'Investigation state wiped and reset to initial crime scene deployment.',
        severity: 'warning'
      }
    ]);
  };

  // Handshake: Update Officer and sync to Firebase & backend /api/player
  const handleUpdateOfficer = (updated: Partial<OfficerProfile>) => {
    setOfficer(prev => {
      const next = { ...prev, ...updated };
      if (next.meritScore !== undefined) {
        next.clearanceLevel = Math.min(5, Math.floor(next.meritScore / 1000) + 1);
      }
      localStorage.setItem('blackwatch_officer', JSON.stringify(next));
      if (next.uid && !next.isAnonymous) {
        saveOfficerProfileToCloud(next.uid, next);
      }
      // Handshake with backend engine
      fetch('/api/player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: next.displayName,
          callsign: next.callsign,
          badgeNumber: next.badgeNumber,
          division: next.division,
          bio: next.bio,
          avatarUrl: next.avatarUrl,
          motto: next.motto,
          meritScore: next.meritScore,
          casesClosed: next.casesClosed,
          clearanceLevel: next.clearanceLevel,
          careerStats: next.careerStats,
        })
      }).catch(err => console.warn('Backend player handshake:', err));
      return next;
    });
  };

  // Handshake: Update Settings and sync to localStorage & backend /api/settings
  const handleUpdateSettings = (updated: Partial<GameSettingsState>) => {
    setGameSettings(prev => {
      const next = { ...prev, ...updated };
      localStorage.setItem('blackwatch_game_settings', JSON.stringify(next));
      if (next.theme) {
        localStorage.setItem('blackwatch_theme', next.theme);
        document.documentElement.setAttribute('data-theme', next.theme);
      }
      fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          presentation: {
            theme: next.theme,
            scanlines: next.scanlines,
            textDensity: next.textDensity,
          },
          tactical: {
            aiModel: next.aiModel,
            interrogationWingman: next.interrogationWingman,
            responseTone: next.responseTone,
            audioProfile: next.audioProfile,
          }
        })
      }).catch(err => console.warn('Backend settings handshake:', err));
      return next;
    });
  };

  // Force Cloud Sync
  const handleForceCloudSync = async () => {
    if (!officer.uid) return;
    setIsSyncing(true);
    try {
      const ok = await syncGameStateToCloud(officer.uid, {
        currentCaseId,
        budget,
        suspicionIndex,
        cases,
        units,
        officer,
        gameSettings
      });
      if (!officer.isAnonymous) {
        await saveOfficerProfileToCloud(officer.uid, officer);
      }
      setIsCloudSynced(ok);
      sound.playRadarPing();
    } finally {
      setIsSyncing(false);
    }
  };

  // Recall all field squads
  const handleRecallAllUnits = () => {
    setUnits(prev => prev.map(u => ({ ...u, status: 'standby', currentSectorId: '' })));
    sound.playDispatchRadio();
    const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';
    setLogs(prev => [
      ...prev,
      {
        id: 'log-' + Date.now(),
        timestamp,
        type: 'DISPATCH',
        message: 'ALL FIELD SQUADS RECALLED. Standby mode restored.',
        severity: 'info'
      }
    ]);
  };

  // Save Export
  const handleExportSave = () => {
    const bundle = {
      version: '1.2.0',
      exportDate: new Date().toISOString(),
      cases,
      units,
      budget,
      suspicionIndex,
      officer,
      gameSettings,
      logs: logs.slice(-30),
      currentCaseId
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blackwatch-save-${(officer.callsign || 'agent').toLowerCase()}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    sound.playMissionCompleted();
  };

  // Save Import
  const handleImportSave = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.cases) setCases(data.cases);
        if (data.units) setUnits(data.units);
        if (data.budget !== undefined) setBudget(data.budget);
        if (data.suspicionIndex !== undefined) setSuspicionIndex(data.suspicionIndex);
        if (data.officer) handleUpdateOfficer(data.officer);
        if (data.gameSettings) handleUpdateSettings(data.gameSettings);
        if (data.logs) setLogs(data.logs);
        if (data.currentCaseId) setCurrentCaseId(data.currentCaseId);
        sound.playClueUnlocked();
      } catch (err) {
        alert('Invalid save file structure. Import aborted.');
      }
    };
    reader.readAsText(file);
  };

  const [warrantModalData, setWarrantModalData] = useState<{
    isOpen: boolean;
    hypothesis: DeductionHypothesis | null;
    suspect: Suspect | null;
  }>({
    isOpen: false,
    hypothesis: null,
    suspect: null
  });

  const [alertModal, setAlertModal] = useState<AlertData>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  // PWA Install Event
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Derive Current Case
  const currentCase = cases.find(c => c.id === currentCaseId) || cases[0];

  // Tactical Clock Formatter
  const formattedClock = (() => {
    const hours = Math.floor(gameClockMinutes / 60) % 24;
    const mins = gameClockMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} UTC`;
  })();

  // 1. Firebase Authentication Listener & Cloud Sync Setup
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (firebaseUser) => {
      if (firebaseUser) {
        setOfficer(prev => ({
          ...prev,
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || prev.displayName,
          isAnonymous: false
        }));

        // Load persisted state from Firestore
        const remoteState = await loadGameStateFromCloud(firebaseUser.uid);
        if (remoteState) {
          if (remoteState.cases) setCases(remoteState.cases);
          if (remoteState.budget !== undefined) setBudget(remoteState.budget);
          if (remoteState.suspicionIndex !== undefined) setSuspicionIndex(remoteState.suspicionIndex);
          if (remoteState.currentCaseId) setCurrentCaseId(remoteState.currentCaseId);
          if (remoteState.units) setUnits(remoteState.units);
          if (remoteState.logs) setLogs(remoteState.logs);
          if (remoteState.officer) {
            setOfficer(prev => ({ ...prev, ...remoteState.officer }));
          }
          if (remoteState.gameSettings) {
            setGameSettings(prev => ({ ...prev, ...remoteState.gameSettings }));
          }
          setIsCloudSynced(true);
        } else {
          // Push initial state to cloud
          await syncGameStateToCloud(firebaseUser.uid, {
            currentCaseId,
            budget,
            suspicionIndex,
            cases,
            units,
            officer,
            gameSettings
          });
          setIsCloudSynced(true);
        }
      } else {
        // Guest mode: operates locally with persistent storage
        setIsCloudSynced(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. PWA Install Prompt Listener
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // 3. Local Cache Persistence
  useEffect(() => {
    localStorage.setItem('blackwatch_cases', JSON.stringify(cases));
    localStorage.setItem('blackwatch_units', JSON.stringify(units));
    localStorage.setItem('blackwatch_budget', budget.toString());
    localStorage.setItem('blackwatch_suspicion', suspicionIndex.toString());
    localStorage.setItem('blackwatch_officer', JSON.stringify(officer));
    localStorage.setItem('blackwatch_logs', JSON.stringify(logs.slice(-20)));
  }, [cases, units, budget, suspicionIndex, officer, logs]);

  // 4. Cloud Debounced Sync to Firestore
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!officer.uid || officer.isAnonymous) {
      setIsCloudSynced(false);
      return;
    }
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);

    setIsSyncing(true);
    syncTimeoutRef.current = setTimeout(async () => {
      const ok = await syncGameStateToCloud(officer.uid, {
        currentCaseId,
        budget,
        suspicionIndex,
        cases,
        units,
        officer,
        gameSettings
      });
      setIsCloudSynced(ok);
      setIsSyncing(false);
    }, 2000);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [cases, units, budget, suspicionIndex, officer, gameSettings, currentCaseId]);

  // 5. Game Simulation Ticker (Clock & Tactical Deployments)
  useEffect(() => {
    const timer = setInterval(() => {
      // Advance tactical minute every 12 seconds
      setGameClockMinutes(prev => prev + 1);

      // Decrement tactical unit deployments
      setUnits(prevUnits => {
        let hasCompletedMission = false;
        const updated = prevUnits.map(unit => {
          if (unit.status === 'deployed' && unit.deploymentTimeRemaining > 0) {
            const nextRemaining = unit.deploymentTimeRemaining - 1;
            if (nextRemaining <= 0) {
              hasCompletedMission = true;
              return {
                ...unit,
                status: 'standby' as const,
                deploymentTimeRemaining: 0,
                activeMission: undefined
              };
            }
            return {
              ...unit,
              deploymentTimeRemaining: nextRemaining
            };
          }
          return unit;
        });

        if (hasCompletedMission) {
          // Process mission completion findings
          onUnitCompletedMission();
        }

        return updated;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentCaseId]);

  // Tactical Unit Mission Completion Handler
  const onUnitCompletedMission = () => {
    sound.playMissionCompleted();

    // Unlock one pending locked clue in current case if any
    setCases(prevCases => {
      return prevCases.map(c => {
        if (c.id !== currentCaseId) return c;
        const lockedClue = c.evidence.find(e => !e.isUnlocked);
        if (!lockedClue) return c;

        const updatedEvidence = c.evidence.map(e => 
          e.id === lockedClue.id ? { ...e, isUnlocked: true } : e
        );

        // Append log
        const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';
        setLogs(prev => [
          ...prev,
          {
            id: 'log-' + Date.now(),
            timestamp,
            type: 'DISPATCH',
            message: `Field unit completed reconnaissance sweep. Uncovered evidence: [${lockedClue.code}] ${lockedClue.title}.`,
            severity: 'success'
          }
        ]);

        // Trigger custom in-game modal
        setAlertModal({
          isOpen: true,
          title: 'TACTICAL RECON REPORT // CLUE RECOVERED',
          message: `Field operators have completed their sector sweep!\n\nRECOVERED ARTIFACT: [${lockedClue.code}] ${lockedClue.title}\nLOCATION: ${lockedClue.locationFound}\n\nThe item has been cataloged and is now available in the Evidence Vault for forensic examination.`,
          type: 'success'
        });

        return { ...c, evidence: updatedEvidence };
      });
    });
  };

  // Deploy Unit
  const handleDeployUnit = (unitId: string, sectorId: string) => {
    const unit = units.find(u => u.id === unitId);
    const sector = currentCase.sectors.find(s => s.id === sectorId);
    if (!unit || !sector || budget < unit.cost) return;

    setBudget(prev => prev - unit.cost);
    setUnits(prev => prev.map(u => 
      u.id === unitId ? {
        ...u,
        status: 'deployed',
        currentSectorId: sectorId,
        deploymentTimeRemaining: 12,
        activeMission: {
          sectorId,
          actionType: 'recon',
          targetDescription: `Recon sweep of ${sector.name}`
        }
      } : u
    ));

    // Mark sector scanned
    setCases(prev => prev.map(c => {
      if (c.id !== currentCaseId) return c;
      return {
        ...c,
        sectors: c.sectors.map(s => s.id === sectorId ? { ...s, isScanned: true } : s)
      };
    }));

    // Update officer career stats on dispatch
    const currentStats = officer.careerStats || {
      hypothesesFormulated: 0,
      hypothesesConfirmed: 0,
      interrogationsConducted: 0,
      deceitsExposed: 0,
      evidenceDiscovered: 0,
      evidenceAnalyzed: 0,
      unitsDispatched: 0,
      budgetSpent: 0,
      peakSuspicion: 0,
      warrantsIssued: 0,
      arrestsExecuted: 0
    };
    handleUpdateOfficer({
      careerStats: {
        ...currentStats,
        unitsDispatched: currentStats.unitsDispatched + 1,
        budgetSpent: currentStats.budgetSpent + unit.cost
      }
    });

    const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';
    setLogs(prev => [
      ...prev,
      {
        id: 'log-' + Date.now(),
        timestamp,
        type: 'DISPATCH',
        message: `Dispatched ${unit.callsign} to ${sector.name} (${sector.gridCoord}). Cost: $${unit.cost}. ETA: 12s.`,
        severity: 'info'
      }
    ]);
  };

  // Run Forensic Lab Analysis (via /api/forensics)
  const handleAnalyzeEvidence = async (evidenceId: string) => {
    const evidence = currentCase.evidence.find(e => e.id === evidenceId);
    if (!evidence || budget < 350) return;

    setIsAnalyzingEvidence(true);
    setBudget(prev => prev - 350);

    try {
      const response = await fetch('/api/forensics', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(byokKey.trim() ? { 'x-gemini-api-key': byokKey.trim() } : {})
        },
        body: JSON.stringify({
          evidenceId: evidence.id,
          title: evidence.title,
          evidenceType: evidence.type,
          rawContent: evidence.fullDescription,
          analysisMethod: evidence.type === 'ballistics' ? 'ballistics' : evidence.type === 'cryptography' ? 'cryptanalysis' : 'toxicology',
          apiKey: byokKey.trim() || undefined
        })
      });

      const result = await response.json();
      sound.playEvidenceAnalyzed();

      setCases(prev => prev.map(c => {
        if (c.id !== currentCaseId) return c;
        return {
          ...c,
          evidence: c.evidence.map(e => e.id === evidenceId ? {
            ...e,
            isAnalyzed: true,
            forensicAnalysis: {
              method: 'Chromatography / Striation Match',
              report: result.analysisReport,
              confidence: result.confidenceScore || 95,
              revealedLead: result.synthesizedLead
            }
          } : e)
        };
      }));

      // Automatic officer progression: +100 merit, +1 evidence analyzed
      const currentStats = officer.careerStats || {
        hypothesesFormulated: 0,
        hypothesesConfirmed: 0,
        interrogationsConducted: 0,
        deceitsExposed: 0,
        evidenceDiscovered: 0,
        evidenceAnalyzed: 0,
        unitsDispatched: 0,
        budgetSpent: 0,
        peakSuspicion: 0,
        warrantsIssued: 0,
        arrestsExecuted: 0
      };
      handleUpdateOfficer({
        meritScore: officer.meritScore + 100,
        careerStats: {
          ...currentStats,
          evidenceAnalyzed: currentStats.evidenceAnalyzed + 1
        }
      });

      // Append Log
      setLogs(prev => [
        ...prev,
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
          type: 'EVIDENCE',
          message: `Forensics certified for [${evidence.code}]. Spectral Confidence: ${result.confidenceScore || 95}%. Engine: ${result.usedByok ? 'BYOK Gemini (Primary)' : 'System Fallback'}.`,
          severity: 'success'
        }
      ]);

    } catch (err) {
      console.error('Forensics error:', err);
    } finally {
      setIsAnalyzingEvidence(false);
    }
  };

  // Interrogation Message Handler (via /api/interrogate)
  const handleSendMessageToSuspect = async (suspectId: string, question: string, tactic?: string) => {
    const suspect = currentCase.suspects.find(s => s.id === suspectId);
    if (!suspect) return;

    setIsInterrogating(true);
    const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';

    // Optimistically add detective's question
    const updatedTestimony = [
      ...suspect.testimony,
      {
        id: 't-' + Date.now(),
        sender: 'detective' as const,
        text: question,
        timestamp
      }
    ];

    setCases(prev => prev.map(c => {
      if (c.id !== currentCaseId) return c;
      return {
        ...c,
        suspects: c.suspects.map(s => s.id === suspectId ? { ...s, testimony: updatedTestimony } : s)
      };
    }));

    try {
      const response = await fetch('/api/interrogate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(byokKey.trim() ? { 'x-gemini-api-key': byokKey.trim() } : {})
        },
        body: JSON.stringify({
          suspectId: suspect.id,
          suspectName: suspect.name,
          suspectRole: suspect.role,
          question,
          tactic: tactic || 'alibi_audit',
          unlockedEvidence: currentCase.evidence.filter(e => e.isUnlocked).map(e => ({
            id: e.id,
            title: e.title,
            summary: e.summary
          })),
          stressLevel: suspect.stressLevel,
          history: updatedTestimony.slice(-6).map(t => ({ sender: t.sender, text: t.text })),
          apiKey: byokKey.trim() || undefined
        })
      });

      const data = await response.json();
      const respTimestamp = new Date().toISOString().substring(11, 19) + ' UTC';

      const newStress = Math.min(100, Math.max(0, suspect.stressLevel + (data.stressChange || 5)));
      const newDeceit = Math.max(10, suspect.deceitIndex - (data.stressChange > 10 ? 15 : 2));

      const newIntelText = data.revealedIntel || (data.stressChange > 15 ? `Disclosed under pressure: ${data.response}` : null);

      setCases(prev => prev.map(c => {
        if (c.id !== currentCaseId) return c;

        let updatedEvidence = c.evidence;
        if (newIntelText) {
          const newClueId = 'ev-disc-' + Date.now();
          const alreadyExists = c.evidence.some(e => e.summary === newIntelText || e.title.includes('Disclosed Intel'));
          if (!alreadyExists) {
            updatedEvidence = [
              ...c.evidence,
              {
                id: newClueId,
                code: 'DISC-' + Date.now().toString().slice(-4),
                title: `DISCLOSED INTEL // ${suspect.name}`,
                type: 'document' as const,
                dateDiscovered: new Date().toISOString().substring(0, 10),
                isUnlocked: true,
                isAnalyzed: true,
                summary: newIntelText,
                fullDescription: `Automatically lodged from interrogation testimony of accused ${suspect.name} under BSA s.23.`,
                chainOfCustody: `Recorded in Interrogation Chamber 04 by ${officer.callsign}.`,
                tags: ['INTERROGATION', 'BSA_S23', 'DISCLOSURE'],
                locationFound: 'Interrogation Chamber 04',
                relatedSuspectId: suspect.id
              }
            ];
          }
        }

        return {
          ...c,
          evidence: updatedEvidence,
          suspects: c.suspects.map(s => s.id === suspectId ? {
            ...s,
            stressLevel: newStress,
            deceitIndex: newDeceit,
            revealedIntel: newIntelText ? Array.from(new Set([...s.revealedIntel, newIntelText])) : s.revealedIntel,
            testimony: [
              ...updatedTestimony,
              {
                id: 't-' + (Date.now() + 1),
                sender: 'suspect' as const,
                text: data.response,
                timestamp: respTimestamp,
                stressAtTime: newStress
              }
            ]
          } : s)
        };
      }));

      // If cracked or intel revealed, play alert sound and log discovery
      if (data.stressChange > 15 || newIntelText) {
        sound.playClueUnlocked();
      }

      setLogs(prev => [
        ...prev,
        {
          id: 'log-' + Date.now(),
          timestamp: respTimestamp,
          type: 'INTERROGATION',
          message: newIntelText
            ? `NEW DISCOVERY LODGED: Accused ${suspect.name} disclosed: "${newIntelText}". Logged in Evidence Board and Dossier.`
            : `Confronted ${suspect.name}. Psychological stress index now at ${newStress}%.`,
          severity: (data.stressChange > 15 || newIntelText) ? 'critical' : 'info'
        }
      ]);

    } catch (err) {
      console.error('Interrogation failed:', err);
    } finally {
      setIsInterrogating(false);
    }
  };

  // Phase 7: Automated Cross-App State Synchronization for BSA s.23 Memos
  const handleDiscoveryMemoRecorded = (memo: any) => {
    sound.playClueUnlocked();
    const timestamp = new Date().toISOString().substring(11, 19) + ' UTC';

    setCases(prev => prev.map(c => {
      if (c.id !== currentCaseId) return c;

      const newClueId = `ev-rec-${Date.now()}`;
      const newEvidenceItem: EvidenceItem = {
        id: newClueId,
        code: `REC-${Date.now().toString().slice(-4)}`,
        title: `RECOVERED: ${memo.recoveryItemDescription}`,
        type: 'ballistics',
        dateDiscovered: new Date().toISOString().substring(0, 10),
        isUnlocked: true,
        isAnalyzed: true,
        summary: `Physical recovery effected at ${memo.revealedLocation} on voluntary confession under BSA Section 23.`,
        fullDescription: `Statutory Panchnama executed in presence of Pancha witnesses (${memo.panchaWitnesses?.map((p: any) => p.name).join(', ')}). Accused: ${memo.suspectName}.`,
        chainOfCustody: `Lodged directly into Malkhana by ${officer.callsign} (${memo.investigatingOfficerRank || 'IO'}).`,
        tags: ['BSA_S23', 'MALKHANA_RECOVERY', 'CORPUS_DELICTI', 'PANCHNAMA'],
        locationFound: memo.revealedLocation,
        relatedSuspectId: memo.suspectId
      };

      // Auto-unlock corresponding sector on map if matched
      const updatedSectors = c.sectors.map(sec => {
        if (sec.description?.toLowerCase().includes('sector 4') || memo.revealedLocation?.toLowerCase().includes(sec.name.toLowerCase())) {
          return { ...sec, isScanned: true, unlockedClueId: newClueId };
        }
        return sec;
      });

      return {
        ...c,
        evidence: [...c.evidence, newEvidenceItem],
        sectors: updatedSectors
      };
    }));

    // Award career merit bonus and record Case Diary entry
    setOfficer(prev => ({
      ...prev,
      meritScore: prev.meritScore + 250,
      careerStats: prev.careerStats ? {
        ...prev.careerStats,
        evidenceDiscovered: (prev.careerStats.evidenceDiscovered || 0) + 1,
        deceitsExposed: (prev.careerStats.deceitsExposed || 0) + 1
      } : undefined
    }));

    setLogs(prev => [
      ...prev,
      {
        id: `log-${Date.now()}`,
        timestamp,
        type: 'INTERROGATION',
        message: `BSA s.23 PANCHNAMA DISCOVERY RECORDED: Physical recovery of "${memo.recoveryItemDescription}" at "${memo.revealedLocation}". Item registered in Malkhana Evidence Locker.`,
        severity: 'success'
      }
    ]);
  };

  // Solve Hypothesis on Corkboard
  const handleSolveHypothesis = (hypothesisId: string, selectedEvidenceIds: string[]) => {
    const hyp = currentCase.hypotheses.find(h => h.id === hypothesisId);
    if (!hyp) return { success: false, message: 'Invalid hypothesis.' };

    // Check if user selected all required evidence IDs
    const hasAll = hyp.requiredEvidenceIds.every(reqId => selectedEvidenceIds.includes(reqId));

    if (hasAll) {
      // Solved!
      setCases(prev => prev.map(c => {
        if (c.id !== currentCaseId) return c;
        return {
          ...c,
          hypotheses: c.hypotheses.map(h => h.id === hypothesisId ? {
            ...h,
            isSolved: true,
            warrantUnlocked: true
          } : h)
        };
      }));

      // Rewards
      setSuspicionIndex(prev => Math.max(0, prev - 10));
      setOfficer(prev => ({
        ...prev,
        meritScore: prev.meritScore + 300,
        clearanceLevel: Math.min(5, prev.clearanceLevel + 1)
      }));

      // Append Log
      setLogs(prev => [
        ...prev,
        {
          id: 'log-' + Date.now(),
          timestamp: new Date().toISOString().substring(11, 19) + ' UTC',
          type: 'DEDUCTION',
          message: `VALIDATED HYPOTHESIS [${hyp.code}]: ${hyp.title}. Probable cause established for warrant.`,
          severity: 'success'
        }
      ]);

      // Open warrant modal automatically
      const suspect = currentCase.suspects.find(s => s.id === hyp.targetSuspectId) || currentCase.suspects[0];
      setWarrantModalData({
        isOpen: true,
        hypothesis: hyp,
        suspect
      });

      return {
        success: true,
        message: `DEDUCTION CONFIRMED! Evidentiary chain establishes proof beyond reasonable doubt. Warrant granted.`
      };
    } else {
      // Penalty for blind guessing
      setSuspicionIndex(prev => Math.min(100, prev + 10));
      return {
        success: false,
        message: `EVIDENTIARY GAP: Selected clues do not substantiate all required elements of this hypothesis (+10% Syndicate Suspicion).`
      };
    }
  };

  // Execute Arrest Warrant
  const handleExecuteArrest = (suspectId: string) => {
    const targetCase = cases.find(c => c.id === currentCaseId);
    if (targetCase) {
      archiveActiveCase(
        targetCase,
        'Guilty - Federal Grand Jury',
        'Accused Marcus Vance convicted on all counts of grand conspiracy, wire fraud, and second-degree homicide. Sentenced to 20 years Federal Penitentiary + $84M restitution order.',
        'IN THE SPECIAL FEDERAL GRAND JURY COURT\nDocket № 2026-CR-8891\nUnited States v. Marcus Vance\n\nJUDGMENT:\nThe jury unanimously finds the defendant GUILTY on all counts. Unbroken chain of evidence including forensic ledger analysis, wiretap logs, and decrypted flash drive data establishes guilt beyond reasonable doubt.'
      );
    }

    setCases(prev => prev.map(c => {
      if (c.id !== currentCaseId) return c;
      return {
        ...c,
        status: 'closed',
        verdict: 'Conviction',
        suspects: c.suspects.map(s => s.id === suspectId ? { ...s, status: 'apprehended' } : s)
      };
    }));

    setOfficer(prev => ({
      ...prev,
      casesClosed: prev.casesClosed + 1,
      meritScore: prev.meritScore + 1000
    }));

    setAlertModal({
      isOpen: true,
      title: 'ARREST EXECUTED // CASE CLOSED & ARCHIVED',
      message: `SWAT Breachers have successfully taken Marcus Vance into federal custody!\n\nThe syndicate offshore financial pipeline has been frozen, and the courier flash drive was secured for federal prosecution.\n\nCOMMENDATION: +1,000 Merit Score awarded to Commander ${officer.callsign}.\n\nThis case file has been formally archived in the Dossier Case Archive.`,
      type: 'success'
    });
  };

  // Reopen Archived Case Investigation (BNSS §193(9))
  const handleReopenCase = (archiveIdOrCaseId: string) => {
    let target = cases.find(c => c.id === archiveIdOrCaseId || ('archive-' + c.id) === archiveIdOrCaseId || c.caseNumber === archiveIdOrCaseId);

    if (!target) {
      const archivedList = getArchivedCases();
      const arch = archivedList.find(a => a.id === archiveIdOrCaseId || a.caseNumber === archiveIdOrCaseId);
      if (arch) {
        const matchingOriginal = INITIAL_CASES.find(c => c.caseNumber === arch.caseNumber || c.id === arch.id.replace('archive-', ''));
        if (matchingOriginal) {
          target = { ...matchingOriginal, status: 'active' };
        } else {
          target = {
            ...INITIAL_CASES[0],
            id: arch.id.replace('archive-', ''),
            caseNumber: arch.caseNumber,
            title: arch.title,
            classification: arch.classification,
            incidentTime: arch.incidentTime,
            location: arch.location,
            summary: arch.summary,
            leadInvestigator: arch.leadInvestigator,
            status: 'active',
            evidence: INITIAL_CASES[0]?.evidence || [],
            suspects: INITIAL_CASES[0]?.suspects || [],
            hypotheses: INITIAL_CASES[0]?.hypotheses || []
          };
        }
      }
    }

    if (target) {
      const reopenedId = target.id;
      setCases(prev => {
        const exists = prev.some(c => c.id === reopenedId);
        if (exists) {
          return prev.map(c => c.id === reopenedId ? { ...c, status: 'active' } : c);
        } else {
          return [...prev, { ...target!, status: 'active' }];
        }
      });
      setCurrentCaseId(reopenedId);
      setActiveTab('dossier');
      setAlertModal({
        isOpen: true,
        title: 'INVESTIGATION REOPENED // BNSS §193(9)',
        message: `Case № ${target.caseNumber} - "${target.title}" has been reactivated.\n\nAll existing First Information Report particulars, crime scene exhibits, witness statements, and forensic reports remain 100% intact.\n\nInvestigation desk and evidence timeline are now active.`,
        type: 'success'
      });
    }
  };

  // Terminal Command Executor
  const handleExecuteTerminalCommand = (cmd: string): string => {
    const parts = cmd.trim().split(' ');
    const root = parts[0].toLowerCase();

    switch (root) {
      case 'help':
        return `PROJECT BLACKWATCH COMMAND REFERENCE:
  status                     - Display current operational and system telemetry
  scan <sector_id>           - Run remote sensor scan on sector (e.g. scan sec-01)
  deploy <unit_id> <sec_id>  - Deploy tactical unit to sector (e.g. deploy unit-alpha sec-01)
  clues                      - List all unlocked evidentiary items
  warrant                    - Inspect active judicial warrants
  sync                       - Force push local state to Firebase Firestore
  clear                      - Clear terminal display buffer`;

      case 'status':
        return `BUREAU STATUS TELEMETRY:
  CASE REF:         ${currentCase.caseNumber} (${currentCase.title})
  OPERATIONAL FUNDS: $${budget.toLocaleString()}
  SYNDICATE ALERT:   ${suspicionIndex}%
  ACTIVE UNITS:     ${units.filter(u => u.status === 'deployed').length} / ${units.length} deployed
  FIRESTORE LINK:   ${isCloudSynced ? 'SYNCHRONIZED (ONLINE)' : 'LOCAL CACHED'}
  OFFICER:          ${officer.callsign} (CLEARANCE LVL-${officer.clearanceLevel})`;

      case 'clues':
        const unlocked = currentCase.evidence.filter(e => e.isUnlocked);
        return `UNLOCKED EVIDENCE (${unlocked.length} ITEMS):\n` +
          unlocked.map(e => `  [${e.code}] ${e.title} (${e.type})`).join('\n');

      case 'sync':
        if (officer.isAnonymous) {
          return `LOCAL CACHE SECURED.\nTo enable multi-device Cloud Firestore sync, open Credentials (top right) and Sign In with Google.`;
        }
        setIsSyncing(true);
        syncGameStateToCloud(officer.uid, { currentCaseId, budget, suspicionIndex, cases, units, officer })
          .then(ok => {
            setIsCloudSynced(ok);
            setIsSyncing(false);
          });
        return `TRANSMITTING GAME STATE ENVELOPE TO CLOUD FIRESTORE... OK.`;

      default:
        return `COMMAND UNRECOGNIZED: "${cmd}". Type "help" for permitted operations.`;
    }
  };

  if (!isInducted) {
    return (
      <InductionPortal
        onInductionComplete={(profile) => {
          setOfficer({
            uid: profile.uid,
            callsign: profile.callsign,
            displayName: profile.displayName,
            badgeNumber: profile.badgeNumber,
            clearanceLevel: profile.clearanceLevel,
            casesClosed: profile.casesClosed || 0,
            meritScore: profile.meritScore || 1000,
            isAnonymous: false
          });
          // If a brand new user gets inducted, start afresh (wipe state)
          if (profile.isNewRecruit) {
            setCases(INITIAL_CASES);
            setUnits(INITIAL_TACTICAL_UNITS);
            setBudget(12500);
            setSuspicionIndex(15);
            localStorage.removeItem('blackwatch_cases');
            localStorage.removeItem('blackwatch_units');
            localStorage.removeItem('blackwatch_budget');
            localStorage.removeItem('blackwatch_suspicion');
          }
          localStorage.setItem('blackwatch_is_inducted', 'true');
          setIsInducted(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* Global Administrative Header */}
      <Header
        currentCaseNumber={currentCase.caseNumber}
        budget={budget}
        suspicionIndex={suspicionIndex}
        gameClock={formattedClock}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          sound.setMuted(nextMuted);
        }}
        officer={officer}
        onOpenProfile={() => setProfileModalOpen(true)}
        isCloudSynced={isCloudSynced}
        isSyncing={isSyncing}
        canInstallPwa={!!deferredPrompt}
        onInstallPwa={handleInstallPwa}
        onOpenSettings={(tab?: string) => {
          if (tab) setSettingsModalTab(tab as SettingsTab);
          setIsSettingsModalOpen(true);
        }}
        onOpenBriefing={() => setIsBriefingModalOpen(true)}
        hasByokKey={!!byokKey.trim()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6">
        {activeTab === 'dossier' && (
          <DossierView
            currentCase={currentCase}
            allCases={cases}
            onSelectCase={(id) => setCurrentCaseId(id)}
            unlockedEvidenceCount={currentCase.evidence.filter(e => e.isUnlocked).length}
            totalEvidenceCount={currentCase.evidence.length}
            solvedHypothesesCount={currentCase.hypotheses.filter(h => h.isSolved).length}
            totalHypothesesCount={currentCase.hypotheses.length}
            onReopenCase={handleReopenCase}
          />
        )}

        {activeTab === 'evidence' && (
          <EvidenceView
            evidenceList={currentCase.evidence}
            onAnalyzeEvidence={handleAnalyzeEvidence}
            isAnalyzing={isAnalyzingEvidence}
            budget={budget}
          />
        )}

        {activeTab === 'dispatch' && (
          <DispatchView
            sectors={currentCase.sectors}
            units={units}
            budget={budget}
            onDeployUnit={handleDeployUnit}
            onScanSector={(secId) => {
              sound.playRadarPing();
              setCases(prev => prev.map(c => c.id === currentCaseId ? {
                ...c,
                sectors: c.sectors.map(s => s.id === secId ? { ...s, isScanned: true } : s)
              } : c));
            }}
          />
        )}

        {activeTab === 'corkboard' && (
          <CorkboardView
            hypotheses={currentCase.hypotheses}
            evidenceList={currentCase.evidence}
            suspects={currentCase.suspects}
            onSolveHypothesis={handleSolveHypothesis}
            onOpenWarrantModal={(hyp) => {
              const suspect = currentCase.suspects.find(s => s.id === hyp.targetSuspectId) || currentCase.suspects[0];
              setWarrantModalData({
                isOpen: true,
                hypothesis: hyp,
                suspect
              });
            }}
          />
        )}

        {activeTab === 'interrogation' && (
          <InterrogationView
            suspects={currentCase.suspects}
            unlockedEvidence={currentCase.evidence.filter(e => e.isUnlocked)}
            onSendMessage={handleSendMessageToSuspect}
            isInterrogating={isInterrogating}
            onMemoRecorded={handleDiscoveryMemoRecorded}
          />
        )}

        {activeTab === 'terminal' && (
          <TerminalView
            logs={logs}
            units={units}
            sectors={currentCase.sectors}
            evidenceList={currentCase.evidence}
            budget={budget}
            suspicionIndex={suspicionIndex}
            onExecuteCommand={handleExecuteTerminalCommand}
          />
        )}

        {activeTab === 'docs' && (
          <DocsView />
        )}
      </main>

      {/* Mobile-First Tactical Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        unlockedEvidenceCount={currentCase.evidence.filter(e => e.isUnlocked).length}
        totalEvidenceCount={currentCase.evidence.length}
        activeDeploymentsCount={units.filter(u => u.status === 'deployed').length}
      />

      {/* Modals */}
      <AuthModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        officer={officer}
        isCloudSynced={isCloudSynced}
        onProfileUpdated={(updated) => {
          setOfficer(prev => ({ ...prev, ...updated }));
          if (officer.uid) {
            saveOfficerProfileToCloud(officer.uid, updated);
          }
        }}
        onLogout={() => {
          localStorage.removeItem('blackwatch_is_inducted');
          localStorage.removeItem('blackwatch_officer');
          setIsInducted(false);
        }}
      />

      <WarrantModal
        isOpen={warrantModalData.isOpen}
        onClose={() => setWarrantModalData({ isOpen: false, hypothesis: null, suspect: null })}
        hypothesis={warrantModalData.hypothesis}
        suspect={warrantModalData.suspect}
        onExecuteArrest={handleExecuteArrest}
      />

      <ModalAlert
        alert={alertModal}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Game Settings & BYOK Modal */}
      <GameSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsModalTab}
        officer={officer}
        onUpdateOfficer={handleUpdateOfficer}
        settings={gameSettings}
        onUpdateSettings={handleUpdateSettings}
        byokKey={byokKey}
        onSaveByokKey={handleSaveByokKey}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = !isMuted;
          setIsMuted(nextMuted);
          sound.setMuted(nextMuted);
        }}
        isCloudSynced={isCloudSynced}
        isSyncing={isSyncing}
        onForceCloudSync={handleForceCloudSync}
        onOpenBriefing={() => setIsBriefingModalOpen(true)}
        onResetInvestigation={handleResetInvestigation}
        onRecallAllUnits={handleRecallAllUnits}
        onExportSave={handleExportSave}
        onImportSave={handleImportSave}
      />

      {/* Daily Administrative Briefing Modal */}
      <DailyBriefingModal
        isOpen={isBriefingModalOpen}
        onClose={() => setIsBriefingModalOpen(false)}
        currentCase={currentCase}
        officer={officer}
        budget={budget}
        suspicionIndex={suspicionIndex}
        gameClock={formattedClock}
        units={units}
        logs={logs}
        showOnStartup={showBriefingOnStartup}
        onToggleShowOnStartup={handleToggleBriefingOnStartup}
      />

    </div>
  );
}
