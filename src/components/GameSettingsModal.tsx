import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  ShieldCheck, 
  RotateCcw,
  Eye, 
  EyeOff, 
  Radio, 
  FileText,
  User,
  Camera,
  Upload,
  Award,
  Sliders,
  Palette,
  Monitor,
  Cpu,
  Cloud,
  CloudOff,
  Download,
  RefreshCw,
  Zap,
  Shield,
  Lock,
  DollarSign,
  AlertTriangle,
  Fingerprint,
  Mic,
  Activity,
  Layers,
  Save,
  Check
} from 'lucide-react';
import { OfficerProfile, GameSettingsState, TacticalTheme } from '../types/game';
import { PRESET_AVATARS, DEFAULT_RIBBONS, DEFAULT_PERKS } from '../data/presetAvatars';
import { sound, SoundProfile } from '../lib/audio';
import { loginWithGoogle, logoutDetective } from '../lib/firebase';

export type SettingsTab = 'profile' | 'ai' | 'display' | 'audio' | 'gameplay' | 'cloud';

interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  officer: OfficerProfile;
  onUpdateOfficer: (profile: Partial<OfficerProfile>) => void;
  settings: GameSettingsState;
  onUpdateSettings: (settings: Partial<GameSettingsState>) => void;
  byokKey: string;
  onSaveByokKey: (key: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isCloudSynced: boolean;
  isSyncing: boolean;
  onForceCloudSync: () => void;
  onOpenBriefing: () => void;
  onResetInvestigation: () => void;
  onRecallAllUnits: () => void;
  onExportSave: () => void;
  onImportSave: (file: File) => void;
}

export const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'profile',
  officer,
  onUpdateOfficer,
  settings,
  onUpdateSettings,
  byokKey,
  onSaveByokKey,
  isMuted,
  onToggleMute,
  isCloudSynced,
  isSyncing,
  onForceCloudSync,
  onOpenBriefing,
  onResetInvestigation,
  onRecallAllUnits,
  onExportSave,
  onImportSave,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Tab 1: Profile form state
  const [callsign, setCallsign] = useState(officer.callsign);
  const [displayName, setDisplayName] = useState(officer.displayName);
  const [badgeNumber, setBadgeNumber] = useState(officer.badgeNumber);
  const [division, setDivision] = useState(officer.division || 'Special Tactical Operations');
  const [motto, setMotto] = useState(officer.motto || 'Order through truth, justice through evidence.');
  const [bio, setBio] = useState(officer.bio || 'Seasoned investigator assigned to Metro Crime Branch Special Operations.');
  const [avatarPreview, setAvatarPreview] = useState<string>(
    officer.avatarUrl || PRESET_AVATARS[1].svgIcon
  );
  const [selectedPresetId, setSelectedPresetId] = useState<string>(officer.presetAvatarId || 'field_commander');
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab 2: AI state
  const [inputKey, setInputKey] = useState(byokKey);
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    tested: boolean;
    valid: boolean;
    message: string;
  }>({
    tested: false,
    valid: false,
    message: '',
  });

  // Tab 3: Display state
  const [theme, setTheme] = useState<TacticalTheme>(settings.theme || 'blackwatch');
  const [scanlines, setScanlines] = useState(settings.scanlines ?? true);
  const [glitchFx, setGlitchFx] = useState(settings.glitchFx ?? true);
  const [textDensity, setTextDensity] = useState<'compact' | 'expanded'>(settings.textDensity || 'compact');
  const [typingSpeed, setTypingSpeed] = useState<'instant' | 'teletype'>(settings.typingSpeed || 'teletype');

  // Tab 4: Audio state
  const [masterVol, setMasterVol] = useState(settings.audioMasterVolume ?? 80);
  const [sfxVol, setSfxVol] = useState(settings.audioSfxVolume ?? 80);
  const [audioProfile, setAudioProfile] = useState<SoundProfile>(settings.audioProfile || 'cyber');
  const [audioCues, setAudioCues] = useState(settings.audioCues || {
    radar: true,
    clues: true,
    warning: true,
    mission: true
  });

  // Tab 5: Gameplay state
  const [showBriefingOnStartup, setShowBriefingOnStartup] = useState(settings.showBriefingOnStartup ?? true);
  const [confirmHighSpend, setConfirmHighSpend] = useState(settings.confirmHighSpend ?? true);
  const [autoTagClues, setAutoTagClues] = useState(settings.autoTagClues ?? true);
  const [suspicionBrakes, setSuspicionBrakes] = useState(settings.suspicionBrakes ?? true);
  const [aiModel, setAiModel] = useState(settings.aiModel || 'gemini-2.5-flash');
  const [interrogationWingman, setInterrogationWingman] = useState(settings.interrogationWingman || 'co_examiner_wingman');
  const [responseTone, setResponseTone] = useState(settings.responseTone || 'concise');

  // File import ref
  const importFileRef = useRef<HTMLInputElement>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setCallsign(officer.callsign);
      setDisplayName(officer.displayName);
      setBadgeNumber(officer.badgeNumber);
      setDivision(officer.division || 'Special Tactical Operations');
      setMotto(officer.motto || 'Order through truth, justice through evidence.');
      setBio(officer.bio || 'Seasoned investigator assigned to Metro Crime Branch Special Operations.');
      setAvatarPreview(officer.avatarUrl || PRESET_AVATARS[1].svgIcon);
      setSelectedPresetId(officer.presetAvatarId || 'field_commander');
      setInputKey(byokKey);
      setTheme(settings.theme || 'blackwatch');
      setScanlines(settings.scanlines ?? true);
      setGlitchFx(settings.glitchFx ?? true);
      setTextDensity(settings.textDensity || 'compact');
      setTypingSpeed(settings.typingSpeed || 'teletype');
      setMasterVol(settings.audioMasterVolume ?? 80);
      setSfxVol(settings.audioSfxVolume ?? 80);
      setAudioProfile(settings.audioProfile || 'cyber');
      setAudioCues(settings.audioCues || { radar: true, clues: true, warning: true, mission: true });
      setShowBriefingOnStartup(settings.showBriefingOnStartup ?? true);
      setConfirmHighSpend(settings.confirmHighSpend ?? true);
      setAutoTagClues(settings.autoTagClues ?? true);
      setSuspicionBrakes(settings.suspicionBrakes ?? true);
      setAiModel(settings.aiModel || 'gemini-2.5-flash');
      setInterrogationWingman(settings.interrogationWingman || 'co_examiner_wingman');
      setResponseTone(settings.responseTone || 'concise');
    }
  }, [isOpen, initialTab, officer, settings, byokKey]);

  if (!isOpen) return null;

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Selected file exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 180;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Draw center crop to square
          const minDim = Math.min(img.width, img.height);
          const startX = (img.width - minDim) / 2;
          const startY = (img.height - minDim) / 2;
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, size, size);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setAvatarPreview(compressed);
          setSelectedPresetId('custom');
          sound.playClueUnlocked();
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Handle Preset Select
  const handleSelectPreset = (preset: typeof PRESET_AVATARS[0]) => {
    setSelectedPresetId(preset.id);
    setAvatarPreview(preset.svgIcon);
    sound.playClick();
  };

  // Save Profile Handler
  const handleSaveProfile = () => {
    const updated = {
      callsign: callsign.trim().toUpperCase() || 'VANGUARD',
      displayName: displayName.trim() || 'Special Commander',
      badgeNumber: badgeNumber.trim() || 'BW-0941',
      division: division.trim(),
      motto: motto.trim(),
      bio: bio.trim(),
      avatarUrl: avatarPreview,
      presetAvatarId: selectedPresetId,
    };
    onUpdateOfficer(updated);
    setProfileSavedFeedback(true);
    sound.playMissionCompleted();
    setTimeout(() => setProfileSavedFeedback(false), 2500);
  };

  // Test BYOK Key
  const handleTestKey = async () => {
    if (!inputKey.trim()) {
      setValidationResult({
        tested: true,
        valid: false,
        message: 'Enter a Gemini API key to validate.',
      });
      return;
    }

    setIsValidating(true);
    setValidationResult({ tested: false, valid: false, message: '' });

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: inputKey.trim() }),
      });
      const data = await res.json();
      setValidationResult({
        tested: true,
        valid: !!data.valid,
        message: data.valid
          ? 'Key validated successfully! gemini-2.5-flash connection verified.'
          : (data.message || 'Key failed validation. Please verify key from Google AI Studio.'),
      });
      if (data.valid) {
        sound.playClueUnlocked();
      }
    } catch (err: any) {
      setValidationResult({
        tested: true,
        valid: false,
        message: 'Network verification error: ' + (err.message || 'Could not reach validator.'),
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Master Save Handler (persists settings across all tabs)
  const handleMasterSave = () => {
    // 1. Save Profile
    handleSaveProfile();

    // 2. Save BYOK
    onSaveByokKey(inputKey.trim());

    // 3. Save Theme & Display
    const updatedSettings: Partial<GameSettingsState> = {
      theme,
      scanlines,
      glitchFx,
      textDensity,
      typingSpeed,
      aiModel,
      interrogationWingman,
      responseTone,
      audioMasterVolume: masterVol,
      audioSfxVolume: sfxVol,
      audioProfile,
      audioCues,
      showBriefingOnStartup,
      confirmHighSpend,
      autoTagClues,
      suspicionBrakes,
    };
    onUpdateSettings(updatedSettings);

    // 4. Update Audio Engine
    sound.setMasterVolume(masterVol);
    sound.setSfxVolume(sfxVol);
    sound.setProfile(audioProfile);
    sound.setCueEnabled('radar', audioCues.radar);
    sound.setCueEnabled('clues', audioCues.clues);
    sound.setCueEnabled('warning', audioCues.warning);
    sound.setCueEnabled('mission', audioCues.mission);

    sound.playClick();
    onClose();
  };

  // Dynamic Clearance Title
  const getRankTitle = (lvl: number) => {
    switch (lvl) {
      case 1: return 'Junior Forensic Operative';
      case 2: return 'Field Investigator';
      case 3: return 'Special Commander';
      case 4: return 'Bureau Lead Inspector';
      case 5: return 'Director of Special Operations';
      default: return 'Special Commander';
    }
  };

  // Progress to next clearance
  const nextClearanceMerit = officer.clearanceLevel * 1000;
  const progressPercent = Math.min(100, Math.round((officer.meritScore / nextClearanceMerit) * 100));

  const tabs: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'profile', label: 'OPERATIVE PROFILE', icon: <User className="w-3.5 h-3.5" /> },
    { id: 'ai', label: 'AI & INTELLIGENCE', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'display', label: 'UI & THEMES', icon: <Palette className="w-3.5 h-3.5" /> },
    { id: 'audio', label: 'TACTICAL AUDIO', icon: <Volume2 className="w-3.5 h-3.5" /> },
    { id: 'gameplay', label: 'OPERATIONS', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'cloud', label: 'CLOUD & PERSISTENCE', icon: <Cloud className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-[#0B0F19] border border-slate-700/80 rounded-lg shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="bg-[#111726] px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={avatarPreview} 
                alt="Operative" 
                className="w-9 h-9 rounded-full object-cover border-2 border-amber-500/80 shadow-md bg-slate-900"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#111726] rounded-full" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="font-serif-header text-sm sm:text-base font-bold text-slate-100 tracking-wide">
                  PROJECT BLACKWATCH // COMMAND SETTINGS
                </h2>
                <span className="px-1.5 py-0.5 text-[9px] font-mono-tactical tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase rounded-xs">
                  LVL-{officer.clearanceLevel}
                </span>
              </div>
              <p className="font-mono-tactical text-[10px] text-slate-400">
                OPERATIVE DOSSIER, NEURAL MODELS, TELEMETRY & PERSISTENCE
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-100 p-1.5 rounded hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Strip */}
        <div className="bg-[#0e1422] border-b border-slate-800 px-3 sm:px-6 flex items-center overflow-x-auto gap-1 sm:gap-2 shrink-0 scrollbar-none">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id);
                }}
                className={`py-2.5 px-3 text-xs font-mono-tactical font-semibold flex items-center space-x-1.5 whitespace-nowrap border-b-2 transition-all cursor-pointer ${
                  isActive
                    ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs">
          
          {/* ========================================================================= */}
          {/* TAB 1: OPERATIVE PROFILE & TACTICAL DOSSIER                              */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              
              {/* Profile Card Header with Upload & Preview */}
              <div className="bg-[#121A2B] border border-slate-800 rounded-lg p-4 sm:p-5 flex flex-col md:flex-row gap-5 items-start">
                
                {/* Avatar Display & Upload Trigger */}
                <div className="flex flex-col items-center space-y-3 shrink-0 mx-auto md:mx-0">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-amber-500 to-cyan-500 shadow-xl overflow-hidden">
                      <img 
                        src={avatarPreview} 
                        alt="Operative Portrait" 
                        className="w-full h-full rounded-full object-cover bg-slate-950"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-amber-300 transition-opacity cursor-pointer"
                      title="Upload custom portrait photo"
                    >
                      <Camera className="w-6 h-6 mb-1" />
                      <span className="text-[9px] font-mono-tactical font-bold">CHANGE PHOTO</span>
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </div>

                  <div className="flex flex-col gap-1 w-full text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded font-mono-tactical text-[10px] flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Upload className="w-3 h-3 text-cyan-400" />
                      <span>UPLOAD PHOTO</span>
                    </button>
                    <span className="text-[9px] font-mono-tactical text-slate-500">
                      JPG/PNG/WEBP • AUTO-RESIZED
                    </span>
                  </div>
                </div>

                {/* Tactical Bio & Clearance Milestone Banner */}
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-serif-header font-bold text-slate-100">
                          {displayName || 'Special Commander'}
                        </span>
                        <span className="font-mono-tactical text-amber-400 font-bold">
                          [{callsign || 'VANGUARD'}]
                        </span>
                      </div>
                      <p className="text-[11px] font-mono-tactical text-slate-400">
                        {getRankTitle(officer.clearanceLevel)} • {division}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono-tactical font-bold bg-amber-500/10 text-amber-300 border border-amber-500/40">
                        BADGE #{badgeNumber || 'BW-0941'}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Progression Clearance Bar */}
                  <div className="space-y-1.5 bg-slate-950/70 p-3 rounded border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] font-mono-tactical">
                      <span className="text-slate-400 flex items-center space-x-1">
                        <Shield className="w-3.5 h-3.5 text-cyan-400" />
                        <span>CLEARANCE PROGRESS: LEVEL {officer.clearanceLevel}</span>
                      </span>
                      <span className="text-amber-400 font-bold">
                        {officer.meritScore} / {nextClearanceMerit} MERIT ({progressPercent}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-xs overflow-hidden border border-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-mono-tactical text-slate-500">
                      <span>AUTOMATICALLY ADVANCES ON EVIDENCE, DEDUCTIONS & ARRESTS</span>
                      <span>NEXT RANK: {getRankTitle(Math.min(5, officer.clearanceLevel + 1))}</span>
                    </div>
                  </div>

                  {/* Personal Motto Quote */}
                  <div className="italic text-slate-300 text-xs font-serif-header bg-slate-950/40 p-2 rounded border-l-2 border-amber-500">
                    "{motto || 'Order through truth, justice through evidence.'}"
                  </div>
                </div>

              </div>

              {/* Preset Tactical Avatars Picker */}
              <div className="bg-[#121A2B] border border-slate-800 rounded-lg p-4 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Fingerprint className="w-4 h-4 text-amber-400" />
                  <span>PRESET TACTICAL AVATARS & ROLES</span>
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRESET_AVATARS.map((p) => {
                    const isSelected = selectedPresetId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectPreset(p)}
                        className={`p-2 rounded border flex items-center space-x-2.5 transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/80 shadow-md ring-1 ring-amber-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                        }`}
                      >
                        <img 
                          src={p.svgIcon} 
                          alt={p.name} 
                          className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-700"
                        />
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono-tactical font-bold text-slate-200 truncate">
                            {p.name}
                          </div>
                          <div className="text-[9px] font-mono-tactical text-slate-400 truncate">
                            {p.badgeCode}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Manual Profile Customization Inputs */}
              <div className="bg-[#121A2B] border border-slate-800 rounded-lg p-4 sm:p-5 space-y-4">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 block border-b border-slate-800 pb-2">
                  TACTICAL CREDENTIALS & DOSSIER CONFIGURATION
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono-tactical text-slate-400">
                      OPERATIVE CALLSIGN:
                    </label>
                    <input 
                      type="text" 
                      value={callsign}
                      onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                      placeholder="VANGUARD"
                      maxLength={16}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-amber-400 font-mono-tactical font-bold rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono-tactical text-slate-400">
                      FULL AGENT / COMMANDER NAME:
                    </label>
                    <input 
                      type="text" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Special Commander"
                      maxLength={32}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 font-sans-body rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono-tactical text-slate-400">
                      OFFICIAL BADGE NUMBER:
                    </label>
                    <input 
                      type="text" 
                      value={badgeNumber}
                      onChange={(e) => setBadgeNumber(e.target.value)}
                      placeholder="BW-0941"
                      maxLength={16}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono-tactical rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono-tactical text-slate-400">
                      ASSIGNED DIVISION:
                    </label>
                    <select
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono-tactical text-xs rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="Special Tactical Operations">Special Tactical Operations</option>
                      <option value="Cybercrime & Electronic Intel">Cybercrime & Electronic Intel</option>
                      <option value="Forensic Ballistics & GSR">Forensic Ballistics & GSR</option>
                      <option value="Custodial Interrogation Div.">Custodial Interrogation Div.</option>
                      <option value="Signals Intelligence & Ciphers">Signals Intelligence & Ciphers</option>
                      <option value="Covert Surveillance Branch">Covert Surveillance Branch</option>
                      <option value="Executive Command Council">Executive Command Council</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tactical text-slate-400">
                    OPERATIVE MOTTO / CREED:
                  </label>
                  <input 
                    type="text" 
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="Order through truth, justice through evidence."
                    maxLength={100}
                    className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 font-serif-header italic rounded px-3 py-1.5 focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono-tactical text-slate-400">
                    DOSSIER BIO & INVESTIGATIVE BACKGROUND:
                  </label>
                  <textarea 
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Detail operative background, specialized training, and tactical commendations..."
                    className="w-full bg-[#0B0F19] border border-slate-700 text-slate-300 font-sans-body rounded px-3 py-2 text-xs focus:border-amber-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[10px] font-mono-tactical text-slate-500">
                    CHANGES AUTO-SYNCHRONIZE WITH CLOUD & METRO CRIME ENGINE
                  </span>
                  <div className="flex items-center space-x-2">
                    {profileSavedFeedback && (
                      <span className="text-emerald-400 font-mono-tactical text-[11px] flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>PROFILE SAVED</span>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>UPDATE DOSSIER</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Automatic Progression: Career Stats Dashboard */}
              <div className="bg-[#121A2B] border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>CAREER TELEMETRY & LIFETIME STATS</span>
                  </span>
                  <span className="text-[10px] font-mono-tactical text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60">
                    LIVE GAMEPLAY TRACKING
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-center">
                    <span className="text-[10px] font-mono-tactical text-slate-400 block">CASES CLOSED</span>
                    <span className="text-base font-mono-tactical font-bold text-emerald-400">
                      {officer.casesClosed || 0}
                    </span>
                  </div>
                  <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-center">
                    <span className="text-[10px] font-mono-tactical text-slate-400 block">MERIT SCORE</span>
                    <span className="text-base font-mono-tactical font-bold text-amber-400">
                      {officer.meritScore || 1200}
                    </span>
                  </div>
                  <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-center">
                    <span className="text-[10px] font-mono-tactical text-slate-400 block">CLEARANCE LEVEL</span>
                    <span className="text-base font-mono-tactical font-bold text-cyan-400">
                      LEVEL {officer.clearanceLevel}
                    </span>
                  </div>
                  <div className="bg-slate-950/70 p-2.5 rounded border border-slate-800 text-center">
                    <span className="text-[10px] font-mono-tactical text-slate-400 block">ACCURACY RATE</span>
                    <span className="text-base font-mono-tactical font-bold text-purple-400">
                      94.2%
                    </span>
                  </div>
                </div>
              </div>

              {/* Tactical Ribbons & Medals Showcase */}
              <div className="bg-[#121A2B] border border-slate-800 rounded-lg p-4 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>COMMENDATIONS & SERVICE RIBBONS</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {DEFAULT_RIBBONS.map((ribbon) => (
                    <div 
                      key={ribbon.id}
                      className={`p-2.5 rounded border flex items-start space-x-2.5 transition-all ${
                        ribbon.unlocked 
                          ? 'bg-slate-950/80 border-amber-500/30' 
                          : 'bg-slate-950/30 border-slate-800/60 opacity-50'
                      }`}
                    >
                      <div className={`p-1.5 rounded shrink-0 ${
                        ribbon.unlocked 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' 
                          : 'bg-slate-800 text-slate-500'
                      }`}>
                        {ribbon.unlocked ? <Award className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-mono-tactical text-[11px] font-bold ${
                            ribbon.unlocked ? 'text-slate-200' : 'text-slate-500'
                          }`}>
                            {ribbon.title}
                          </span>
                          {ribbon.unlocked && (
                            <span className="text-[8px] bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded font-mono-tactical">
                              AWARDED
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-sans-body leading-tight mt-0.5">
                          {ribbon.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clearance Perks */}
              <div className="bg-[#121A2B] border border-slate-800 rounded-lg p-4 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>CLEARANCE SPECIALIZATION PERKS</span>
                </span>
                <div className="space-y-2">
                  {DEFAULT_PERKS.map((perk) => {
                    const isUnlocked = officer.clearanceLevel >= perk.requiredClearance;
                    return (
                      <div 
                        key={perk.id}
                        className={`p-2.5 rounded border flex items-center justify-between text-xs font-mono-tactical ${
                          isUnlocked 
                            ? 'bg-slate-950/70 border-slate-700/80 text-slate-200' 
                            : 'bg-slate-950/20 border-slate-800/40 text-slate-500'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-slate-200">{perk.title}</span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
                              isUnlocked 
                                ? 'bg-cyan-950 text-cyan-300 border-cyan-800' 
                                : 'bg-slate-900 text-slate-500 border-slate-800'
                            }`}>
                              REQ. LEVEL {perk.requiredClearance}
                            </span>
                          </div>
                          <div className="text-[10px] font-sans-body text-slate-400">
                            {perk.description}
                          </div>
                        </div>
                        <div className={`text-[10px] font-bold px-2 py-1 rounded shrink-0 ml-2 ${
                          isUnlocked ? 'bg-emerald-950/80 text-emerald-300' : 'bg-slate-900 text-slate-600'
                        }`}>
                          {isUnlocked ? 'ACTIVE' : 'LOCKED'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: AI & INTELLIGENCE ENGINE                                          */}
          {/* ========================================================================= */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              {/* BYOK Configuration */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-mono-tactical text-xs font-semibold text-amber-400 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4" />
                    <span>BRING YOUR OWN KEY (BYOK) — PRIMARY AI ENGINE</span>
                  </span>
                  <span className={`text-[10px] font-mono-tactical px-2 py-0.5 rounded border uppercase ${
                    byokKey
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800/80'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-800/80'
                  }`}>
                    {byokKey ? 'BYOK PRIMARY ACTIVE' : 'SYSTEM FALLBACK ACTIVE'}
                  </span>
                </div>

                <p className="text-xs font-sans-body text-slate-300 leading-relaxed">
                  Provide your personal Gemini API key from Google AI Studio. Suspect interrogations, psychological profiles, and ballistic spectrometer reports will route directly through your key. If unset, the system uses the high-performance server proxy fallback with <strong className="text-amber-300">zero delay</strong>.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono-tactical text-slate-400">
                    GEMINI API KEY:
                  </label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="AIzaSy..."
                      value={inputKey}
                      onChange={(e) => setInputKey(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 text-xs font-mono-tactical rounded px-3 py-2 pr-10 focus:border-amber-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-300"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isValidating || !inputKey.trim()}
                    onClick={handleTestKey}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-mono-tactical rounded border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
                        <span>TESTING KEY...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5 text-cyan-400" />
                        <span>VERIFY KEY CONNECTION</span>
                      </>
                    )}
                  </button>

                  {inputKey.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setInputKey('');
                        onSaveByokKey('');
                        setValidationResult({ tested: false, valid: false, message: '' });
                        sound.playClick();
                      }}
                      className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 text-xs font-mono-tactical rounded border border-rose-900/60 transition-colors cursor-pointer"
                    >
                      CLEAR & REVERT TO FALLBACK
                    </button>
                  )}
                </div>

                {validationResult.tested && (
                  <div className={`p-3 rounded text-xs font-mono-tactical flex items-start space-x-2 border ${
                    validationResult.valid
                      ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                      : 'bg-rose-950/60 border-rose-800 text-rose-300'
                  }`}>
                    {validationResult.valid ? (
                      <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    )}
                    <div className="leading-snug break-all">{validationResult.message}</div>
                  </div>
                )}
              </div>

              {/* Model & Posture Preferences */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-4">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 block border-b border-slate-800 pb-2">
                  NEURAL MODEL & INTERROGATION TACTICS
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono-tactical text-slate-400 block">
                      TARGET REASONING MODEL:
                    </label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value as any)}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono-tactical text-xs rounded px-3 py-2 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra-fast, Real-time Dialogue)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (Deep Multi-tier Forensic Reasoning)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono-tactical text-slate-400 block">
                      WINGMAN OPERATIONAL POSTURE:
                    </label>
                    <select
                      value={interrogationWingman}
                      onChange={(e) => setInterrogationWingman(e.target.value as any)}
                      className="w-full bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono-tactical text-xs rounded px-3 py-2 focus:border-amber-500 focus:outline-none"
                    >
                      <option value="co_examiner_wingman">Co-examiner Wingman (Assists Detective)</option>
                      <option value="strict_legalist">Strict Legalist (Enforces Statutory Rules)</option>
                      <option value="autonomous_lead">Autonomous Lead (Aggressive Inquisitor)</option>
                      <option value="good_cop">Good Cop / Sympathetic Examiner</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono-tactical text-slate-400 block">
                    TRANSCRIPT VERBOSITY & TONE:
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer font-mono-tactical text-slate-300 text-xs">
                      <input 
                        type="radio" 
                        name="responseTone" 
                        value="concise" 
                        checked={responseTone === 'concise'} 
                        onChange={() => setResponseTone('concise')}
                        className="accent-amber-500"
                      />
                      <span>Concise Tactical Bulletins</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer font-mono-tactical text-slate-300 text-xs">
                      <input 
                        type="radio" 
                        name="responseTone" 
                        value="detailed" 
                        checked={responseTone === 'detailed'} 
                        onChange={() => setResponseTone('detailed')}
                        className="accent-amber-500"
                      />
                      <span>Detailed Legal Deposition Transcripts</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: UI, DISPLAY & THEMES                                              */}
          {/* ========================================================================= */}
          {activeTab === 'display' && (
            <div className="space-y-5">
              
              {/* Theme Selector with Visual Cards */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                  <Palette className="w-4 h-4 text-amber-400" />
                  <span>COMMAND CONSOLE THEME PALETTE</span>
                </span>
                <p className="text-slate-400 text-xs font-sans-body">
                  Select a tactical visual scheme applied seamlessly across all headers, dossiers, evidence tables, terminals, and corkboards.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  
                  {/* Theme 1: Blackwatch Navy */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('blackwatch');
                      sound.playClick();
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      theme === 'blackwatch'
                        ? 'bg-slate-900 border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded border border-amber-500/40 bg-[#0D131F] flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                    </div>
                    <div>
                      <div className="font-mono-tactical font-bold text-slate-100 text-xs">
                        BLACKWATCH NAVY (DEFAULT)
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans-body">
                        Deep maritime dark navy, tactical amber highlights, crisp slate telemetry.
                      </div>
                    </div>
                  </button>

                  {/* Theme 2: Amber CRT Terminal */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('amber');
                      sound.playClick();
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      theme === 'amber'
                        ? 'bg-[#1a1208] border-amber-500 shadow-lg ring-1 ring-amber-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded border border-amber-600/40 bg-[#160d05] flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
                    </div>
                    <div>
                      <div className="font-mono-tactical font-bold text-amber-300 text-xs">
                        RETRO AMBER PHOSPHOR
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans-body">
                        Monochrome 1980s amber CRT display, warm bronze chassis, phosphor glow.
                      </div>
                    </div>
                  </button>

                  {/* Theme 3: Cyber Matrix Green */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('matrix');
                      sound.playClick();
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      theme === 'matrix'
                        ? 'bg-[#051c0e] border-emerald-500 shadow-lg ring-1 ring-emerald-500/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded border border-emerald-500/40 bg-[#04140b] flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                    </div>
                    <div>
                      <div className="font-mono-tactical font-bold text-emerald-300 text-xs">
                        CYBER MATRIX GREEN
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans-body">
                        High-contrast cyberpunk terminal green, dark matrix chassis, lime accents.
                      </div>
                    </div>
                  </button>

                  {/* Theme 4: Stealth Noir Slate */}
                  <button
                    type="button"
                    onClick={() => {
                      setTheme('stealth');
                      sound.playClick();
                    }}
                    className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center space-x-3 ${
                      theme === 'stealth'
                        ? 'bg-slate-900 border-sky-400 shadow-lg ring-1 ring-sky-400/50'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="w-10 h-10 rounded border border-slate-600 bg-[#080b11] flex items-center justify-center shrink-0">
                      <div className="w-4 h-4 rounded-full bg-slate-200 shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                    </div>
                    <div>
                      <div className="font-mono-tactical font-bold text-sky-200 text-xs">
                        STEALTH NOIR SLATE
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans-body">
                        Cold monochrome slate black, stark silver contrasts, covert spec-ops style.
                      </div>
                    </div>
                  </button>

                </div>
              </div>

              {/* Display Telemetry & Visual Filters */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-4">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 block border-b border-slate-800 pb-2">
                  DISPLAY FILTERS & TELETYPE ENGINE
                </span>

                <div className="space-y-3">
                  {/* CRT Scanline filter */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Tactical CRT Raster Scanlines
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Overlays authentic scanlines and subtle cathode ray raster textures
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={scanlines}
                      onChange={(e) => setScanlines(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>

                  {/* Glitch & Flicker */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        CRT Micro-Flicker & Glitch FX
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Simulates periodic electronic signal variance and surveillance distortion
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={glitchFx}
                      onChange={(e) => setGlitchFx(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>

                  {/* Text Density */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Information Display Density
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Controls padding and vertical compactness of operational dossiers
                      </div>
                    </div>
                    <select
                      value={textDensity}
                      onChange={(e) => setTextDensity(e.target.value as any)}
                      className="bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono-tactical text-xs rounded px-2.5 py-1 focus:border-amber-500"
                    >
                      <option value="compact">Compact (High-Density Tactical)</option>
                      <option value="expanded">Expanded (Comfortable Standard)</option>
                    </select>
                  </div>

                  {/* Typing animation */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Terminal Output Animation Speed
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Pacing of incoming intelligence dispatches and forensic transcripts
                      </div>
                    </div>
                    <select
                      value={typingSpeed}
                      onChange={(e) => setTypingSpeed(e.target.value as any)}
                      className="bg-[#0B0F19] border border-slate-700 text-slate-200 font-mono-tactical text-xs rounded px-2.5 py-1 focus:border-amber-500"
                    >
                      <option value="teletype">Atmospheric Teletype</option>
                      <option value="instant">Instantaneous Output</option>
                    </select>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: TACTICAL AUDIO SYNTHESIZER                                        */}
          {/* ========================================================================= */}
          {activeTab === 'audio' && (
            <div className="space-y-5">
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>TACTICAL SYNTHESIZER VOLUMES</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMute();
                      sound.playClick();
                    }}
                    className={`px-3 py-1 rounded text-xs font-mono-tactical border flex items-center space-x-1.5 cursor-pointer ${
                      isMuted 
                        ? 'bg-rose-950/60 border-rose-800 text-rose-300' 
                        : 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    }`}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isMuted ? 'UNMUTE AUDIO' : 'AUDIO ACTIVE'}</span>
                  </button>
                </div>

                {/* Volume Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono-tactical text-[11px]">
                      <span className="text-slate-400">MASTER SYNTHESIZER GAIN:</span>
                      <span className="text-amber-400 font-bold">{masterVol}%</span>
                    </div>
                    <input 
                      type="range"
                      min={0}
                      max={100}
                      value={masterVol}
                      onChange={(e) => setMasterVol(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between font-mono-tactical text-[11px]">
                      <span className="text-slate-400">TACTICAL EFFECTS (SFX) GAIN:</span>
                      <span className="text-cyan-400 font-bold">{sfxVol}%</span>
                    </div>
                    <input 
                      type="range"
                      min={0}
                      max={100}
                      value={sfxVol}
                      onChange={(e) => setSfxVol(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Audio Profile Selector */}
                <div className="border-t border-slate-800/80 pt-4 space-y-2">
                  <label className="text-[11px] font-mono-tactical text-slate-400 block">
                    SYNTHESIZER ACOUSTIC PROFILE:
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { id: 'relay', name: 'RETRO MECHANICAL', desc: 'Hardware relays, tactile squelches' },
                      { id: 'cyber', name: 'MODERN CYBER SYNTH', desc: 'Crisp sine beeps, futuristic sweeps' },
                      { id: 'stealth', name: 'MUTED ACOUSTIC', desc: 'Subdued, low-frequency stealth' }
                    ].map((prof) => (
                      <button
                        key={prof.id}
                        type="button"
                        onClick={() => {
                          setAudioProfile(prof.id as any);
                          sound.setProfile(prof.id as any);
                          sound.playClick();
                        }}
                        className={`p-2.5 rounded border text-left cursor-pointer transition-colors ${
                          audioProfile === prof.id
                            ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                            : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="font-mono-tactical font-bold text-[11px]">{prof.name}</div>
                        <div className="text-[9px] text-slate-400 font-sans-body mt-0.5">{prof.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Test Sound Cues */}
                <div className="border-t border-slate-800/80 pt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-mono-tactical text-slate-400">
                    TEST AUDIO CHANNELS:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => sound.playClick()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono-tactical rounded border border-slate-700 cursor-pointer"
                    >
                      TEST CLICK
                    </button>
                    <button
                      type="button"
                      onClick={() => sound.playRadarPing()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono-tactical rounded border border-slate-700 cursor-pointer"
                    >
                      TEST RADAR
                    </button>
                    <button
                      type="button"
                      onClick={() => sound.playClueUnlocked()}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-mono-tactical rounded border border-slate-700 cursor-pointer"
                    >
                      TEST CLUE CHIME
                    </button>
                    <button
                      type="button"
                      onClick={() => sound.playMissionCompleted()}
                      className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-mono-tactical rounded border border-amber-500/40 cursor-pointer"
                    >
                      TEST FANFARE
                    </button>
                  </div>
                </div>

              </div>

              {/* Individual Cue Filters */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 block border-b border-slate-800 pb-2">
                  AUDIO EVENT TRIGGERS
                </span>

                <div className="space-y-2.5">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-mono-tactical text-slate-300 text-xs">Radar Ping on Sector Scan Dispatches</span>
                    <input 
                      type="checkbox" 
                      checked={audioCues.radar}
                      onChange={(e) => setAudioCues(prev => ({ ...prev, radar: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-mono-tactical text-slate-300 text-xs">Chime on Clue Discovery & Forensics Complete</span>
                    <input 
                      type="checkbox" 
                      checked={audioCues.clues}
                      onChange={(e) => setAudioCues(prev => ({ ...prev, clues: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-mono-tactical text-slate-300 text-xs">Audible Klaxon on Elevated Suspicion Alarm</span>
                    <input 
                      type="checkbox" 
                      checked={audioCues.warning}
                      onChange={(e) => setAudioCues(prev => ({ ...prev, warning: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-mono-tactical text-slate-300 text-xs">Tactical Fanfare on Hypothesis & Warrant Executed</span>
                    <input 
                      type="checkbox" 
                      checked={audioCues.mission}
                      onChange={(e) => setAudioCues(prev => ({ ...prev, mission: e.target.checked }))}
                      className="accent-amber-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: GAMEPLAY & OPERATIONAL RULES                                      */}
          {/* ========================================================================= */}
          {activeTab === 'gameplay' && (
            <div className="space-y-5">
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-4">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 block border-b border-slate-800 pb-2">
                  OPERATIONAL COMMAND CONSOLE SAFEGUARDS
                </span>

                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Daily Administrative Briefing on Load
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Automatically presents morning operational objectives and syndicate telemetry
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={showBriefingOnStartup}
                      onChange={(e) => setShowBriefingOnStartup(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Confirm High-Value Budget Spends
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Require secondary confirmation before authorizing forensic actions above $1,500
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={confirmHighSpend}
                      onChange={(e) => setConfirmHighSpend(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Auto-Tag Evidence Clues on Corkboard
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Automatically connects verified forensic exhibits to suspected syndicate nodes
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoTagClues}
                      onChange={(e) => setAutoTagClues(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
                    <div>
                      <div className="text-xs font-sans-body text-slate-200 font-medium">
                        Syndicate Suspicion Index Safety Brakes
                      </div>
                      <div className="text-[11px] font-mono-tactical text-slate-400">
                        Warns immediately if tactical breach would push suspicion above the 70% raid threshold
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={suspicionBrakes}
                      onChange={(e) => setSuspicionBrakes(e.target.checked)}
                      className="w-4 h-4 accent-amber-500 rounded bg-slate-900 border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenBriefing();
                    }}
                    className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-mono-tactical rounded border border-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>REVIEW CURRENT OPERATIONAL BRIEFING</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 6: CLOUD & SYSTEM PERSISTENCE                                        */}
          {/* ========================================================================= */}
          {activeTab === 'cloud' && (
            <div className="space-y-5">
              
              {/* Firestore Telemetry */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-mono-tactical text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                    <Cloud className="w-4 h-4 text-cyan-400" />
                    <span>FIREBASE FIRESTORE REAL-TIME PERSISTENCE</span>
                  </span>
                  <span className={`text-[10px] font-mono-tactical px-2 py-0.5 rounded border uppercase ${
                    isCloudSynced
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-slate-900 text-slate-400 border-slate-700'
                  }`}>
                    {isCloudSynced ? 'FIRESTORE ONLINE' : 'LOCAL CACHE MODE'}
                  </span>
                </div>

                <div className="text-xs font-sans-body text-slate-300 space-y-2">
                  <p>
                    All investigation data—including unlocked ballistic reports, suspect interrogation logs, corkboard threads, officer clearance, and budget telemetry—is encrypted and synchronized with Google Cloud Firestore.
                  </p>
                  <p className="text-[11px] font-mono-tactical text-slate-400">
                    USER IDENTIFIER: <span className="text-amber-400">{officer.uid}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => {
                      onForceCloudSync();
                      sound.playRadarPing();
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono-tactical rounded border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>FORCE CLOUD SYNC</span>
                  </button>

                  {/* Google Sign In / Sign Out */}
                  {officer.isAnonymous ? (
                    <button
                      type="button"
                      disabled={authLoading}
                      onClick={async () => {
                        setAuthLoading(true);
                        try {
                          const user = await loginWithGoogle();
                          if (user) {
                            sound.playClueUnlocked();
                            onUpdateOfficer({
                              uid: user.uid,
                              displayName: user.displayName || 'Special Agent',
                              callsign: (user.displayName || 'VANGUARD').toUpperCase().split(' ')[0],
                              isAnonymous: false
                            });
                          }
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setAuthLoading(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-mono-tactical rounded border border-amber-500/40 flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>CONNECT GOOGLE DETECTIVE ACCOUNT</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        await logoutDetective();
                        onUpdateOfficer({
                          uid: 'guest-' + Math.random().toString(36).substring(2, 9),
                          displayName: 'Guest Detective',
                          callsign: 'SPECTRE',
                          isAnonymous: true
                        });
                        sound.playClick();
                      }}
                      className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-950/80 text-rose-300 text-xs font-mono-tactical rounded border border-rose-900/60 transition-colors cursor-pointer"
                    >
                      DISCONNECT ACCOUNT
                    </button>
                  )}
                </div>
              </div>

              {/* Save State Export & Import */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-slate-300 block border-b border-slate-800 pb-2">
                  SAVE STATE MANAGEMENT (OFFLINE ARCHIVE)
                </span>
                <p className="text-xs font-sans-body text-slate-300">
                  Export your entire active case docket, forensic chain-of-custody, and custom operative profile to a standalone JSON archive.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      onExportSave();
                      sound.playClick();
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-tactical rounded border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>EXPORT TACTICAL SAVE (.JSON)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-tactical rounded border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>RESTORE SAVE FROM FILE</span>
                  </button>
                  <input 
                    ref={importFileRef}
                    type="file" 
                    accept=".json" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onImportSave(file);
                        e.target.value = '';
                      }
                    }} 
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Reset Controls */}
              <div className="bg-[#121A2B] p-4 sm:p-5 rounded-lg border border-slate-800 space-y-3">
                <span className="font-mono-tactical text-xs font-semibold text-rose-400 block border-b border-slate-800 pb-2 flex items-center space-x-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span>CRITICAL COMMAND RESET PROTOCOLS</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-950/70 p-3 rounded border border-slate-800/80 space-y-2">
                    <span className="font-mono-tactical text-xs font-bold text-slate-200 block">
                      RECALL TACTICAL UNITS
                    </span>
                    <p className="text-[10px] text-slate-400 font-sans-body">
                      Disengage all deployed squads immediately back to the tactical motorpool.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onRecallAllUnits();
                        sound.playClick();
                      }}
                      className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-mono-tactical rounded border border-slate-700 cursor-pointer"
                    >
                      RECALL ALL SQUADS
                    </button>
                  </div>

                  <div className="bg-rose-950/20 p-3 rounded border border-rose-900/40 space-y-2">
                    <span className="font-mono-tactical text-xs font-bold text-rose-300 block">
                      WIPE CASE PROGRESS (HARD RESET)
                    </span>
                    <p className="text-[10px] text-rose-300/80 font-sans-body">
                      Restore initial case dispatches, re-seal evidence lockers, and zero suspicion.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm('Reset all case evidence, dispatches, and logs to initial dispatch?')) {
                          onResetInvestigation();
                          onClose();
                        }
                      }}
                      className="w-full py-1.5 bg-rose-900/40 hover:bg-rose-900/80 text-rose-200 text-xs font-mono-tactical rounded border border-rose-800/60 flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>WIPE & RESTART CASE</span>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#111726] px-4 sm:px-6 py-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono-tactical text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>SESSION ENCRYPTED // METRO CRIME BRANCH SPEC-OPS</span>
          </div>

          <div className="flex items-center space-x-2.5 ml-auto">
            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="px-3.5 py-1.5 text-xs font-mono-tactical text-slate-400 hover:text-slate-200 transition-colors"
            >
              CLOSE
            </button>
            <button
              onClick={handleMasterSave}
              className="px-5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center space-x-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Save className="w-3.5 h-3.5" />
              <span>SAVE ALL SETTINGS</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
