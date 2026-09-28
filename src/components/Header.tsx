import React from 'react';
import { 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Cloud, 
  CloudOff, 
  User as UserIcon, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  Download,
  Settings as SettingsIcon,
  FileText,
  Key
} from 'lucide-react';
import { OfficerProfile } from '../types/game';
import { sound } from '../lib/audio';

interface HeaderProps {
  currentCaseNumber: string;
  budget: number;
  suspicionIndex: number;
  gameClock: string;
  isMuted: boolean;
  onToggleMute: () => void;
  officer: OfficerProfile;
  onOpenProfile: () => void;
  isCloudSynced: boolean;
  isSyncing: boolean;
  onInstallPwa?: () => void;
  canInstallPwa?: boolean;
  onOpenSettings: (tab?: string) => void;
  onOpenBriefing: () => void;
  hasByokKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentCaseNumber,
  budget,
  suspicionIndex,
  gameClock,
  isMuted,
  onToggleMute,
  officer,
  onOpenProfile,
  isCloudSynced,
  isSyncing,
  onInstallPwa,
  canInstallPwa,
  onOpenSettings,
  onOpenBriefing,
  hasByokKey
}) => {
  return (
    <header className="bg-[#0D131F] border-b border-slate-800 text-slate-200 sticky top-0 z-30 shadow-md">
      {/* Top Banner: Administrative Telemetry */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        
        {/* Brand & Classification */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded bg-slate-900 border border-amber-500/40 flex items-center justify-center p-1 shadow-inner">
            <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500" fill="currentColor">
              <polygon points="50,10 85,25 85,55 50,90 15,55 15,25" fill="none" stroke="currentColor" strokeWidth="6"/>
              <circle cx="50" cy="48" r="14" fill="#0D131F" stroke="currentColor" strokeWidth="5"/>
              <circle cx="50" cy="48" r="5" fill="#F59E0B"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-serif-header font-bold tracking-wider text-sm sm:text-base text-slate-100">
                PROJECT BLACKWATCH
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-mono-tactical tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase rounded-xs">
                SPEC-OPS
              </span>
            </div>
            <p className="font-mono-tactical text-[10px] text-slate-400 tracking-tight">
              METROPOLITAN INVESTIGATION BUREAU // {currentCaseNumber}
            </p>
          </div>
        </div>

        {/* Global Game Status Metrics */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Tactical Clock */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 border border-slate-800 rounded">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono-tactical text-[11px] text-slate-300 tracking-wider">
              {gameClock}
            </span>
          </div>

          {/* Operational Budget */}
          <div className="flex items-center space-x-1.5 bg-slate-900/80 px-2.5 py-1 border border-slate-800 rounded">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono-tactical text-[11px] text-emerald-300 font-semibold tracking-wide">
              ${budget.toLocaleString()}
            </span>
          </div>

          {/* Suspicion Index Gauge */}
          <div className="hidden md:flex items-center space-x-2 bg-slate-900/80 px-2.5 py-1 border border-slate-800 rounded">
            <AlertTriangle className={`w-3.5 h-3.5 ${suspicionIndex > 70 ? 'text-rose-500 animate-pulse' : suspicionIndex > 40 ? 'text-amber-500' : 'text-slate-400'}`} />
            <span className="font-mono-tactical text-[11px] text-slate-400">ALERT:</span>
            <div className="w-16 bg-slate-950 h-2 rounded-xs overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 ${suspicionIndex > 70 ? 'bg-rose-600' : suspicionIndex > 40 ? 'bg-amber-500' : 'bg-cyan-600'}`}
                style={{ width: `${Math.min(100, suspicionIndex)}%` }}
              />
            </div>
            <span className="font-mono-tactical text-[11px] text-slate-200">
              {suspicionIndex}%
            </span>
          </div>

          {/* Cloud Persistence Indicator */}
          <div 
            title={isSyncing ? "Syncing to Firebase Firestore..." : isCloudSynced ? "Synchronized with Firestore" : "Local state cached"}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-900/90 border border-slate-800 rounded"
          >
            {isCloudSynced ? (
              <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'text-amber-400 animate-pulse' : 'text-cyan-400'}`} />
            ) : (
              <CloudOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden xl:inline text-[10px] font-mono-tactical text-slate-400">
              {isSyncing ? 'SYNC...' : isCloudSynced ? 'FIRESTORE' : 'OFFLINE'}
            </span>
          </div>

          {/* Daily Briefing Quick Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenBriefing();
            }}
            className="flex items-center space-x-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded transition-colors text-[11px] font-mono-tactical"
            title="Open Daily Operational Briefing"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">BRIEFING</span>
          </button>

          {/* Game Settings & BYOK Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenSettings();
            }}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded transition-colors text-[11px] font-mono-tactical border ${
              hasByokKey
                ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/80'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Configure Game Settings & Gemini BYOK Key"
          >
            {hasByokKey ? <Key className="w-3.5 h-3.5 text-emerald-400" /> : <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">SETTINGS</span>
            {hasByokKey && (
              <span className="text-[9px] bg-emerald-500/20 px-1 py-0.2 rounded text-emerald-300 border border-emerald-500/40">
                BYOK
              </span>
            )}
          </button>

          {/* PWA Install Button if available */}
          {canInstallPwa && onInstallPwa && (
            <button
              onClick={() => {
                sound.playClick();
                onInstallPwa();
              }}
              className="flex items-center space-x-1 px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded transition-colors text-[11px] font-mono-tactical"
              title="Install Project Blackwatch as PWA"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">INSTALL</span>
            </button>
          )}

          {/* Audio Mute Toggle */}
          <button
            onClick={() => {
              onToggleMute();
              sound.playClick();
            }}
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 border border-slate-800 rounded transition-colors"
            title={isMuted ? "Unmute Tactical Audio" : "Mute Tactical Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Operative Profile Circular Avatar Bubble Trigger */}
          <button
            onClick={() => {
              sound.playClick();
              onOpenSettings('profile');
            }}
            className="flex items-center space-x-2 pl-1 pr-2.5 py-1 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 hover:border-amber-500/70 rounded-full transition-all group cursor-pointer shadow-sm hover:shadow-amber-500/10"
            title={`Operative Profile: ${officer.callsign} (Level ${officer.clearanceLevel}) — Click to configure profile & image`}
          >
            {/* Small Circular Avatar Bubble with Level Glow Ring */}
            <div className="relative shrink-0">
              <div className={`w-7 h-7 rounded-full p-0.5 overflow-hidden transition-transform group-hover:scale-105 border-2 ${
                officer.clearanceLevel >= 5
                  ? 'border-purple-500 shadow-[0_0_6px_rgba(168,85,247,0.4)]'
                  : officer.clearanceLevel >= 4
                  ? 'border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]'
                  : officer.clearanceLevel >= 3
                  ? 'border-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.4)]'
                  : 'border-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.4)]'
              }`}>
                {officer.avatarUrl ? (
                  <img 
                    src={officer.avatarUrl} 
                    alt={officer.callsign} 
                    className="w-full h-full rounded-full object-cover bg-slate-950"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-amber-400">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              {/* Online Operational Status Indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border border-slate-950 rounded-full animate-pulse" />
            </div>

            {/* Operative Callsign & Clearance Badge */}
            <div className="flex items-center space-x-1.5">
              <span className="font-mono-tactical text-[11px] text-slate-200 group-hover:text-amber-300 font-bold transition-colors">
                {officer.callsign}
              </span>
              <span className="hidden sm:inline text-[9px] bg-slate-950 px-1 py-0.2 rounded text-amber-400 font-mono-tactical border border-amber-500/30">
                LVL-{officer.clearanceLevel}
              </span>
            </div>
          </button>
        </div>

      </div>
    </header>
  );
};
