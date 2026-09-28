import React, { useState } from 'react';
import { X, ShieldCheck, LogIn, LogOut, User, Award, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { OfficerProfile } from '../types/game';
import { loginWithGoogle, logoutDetective } from '../lib/firebase';
import { sound } from '../lib/audio';
import { OfficerBadge } from './OfficerBadge';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: OfficerProfile;
  onProfileUpdated: (profile: Partial<OfficerProfile>) => void;
  isCloudSynced: boolean;
  onLogout?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  officer,
  onProfileUpdated,
  isCloudSynced,
  onLogout
}) => {
  const [callsignInput, setCallsignInput] = useState(officer.callsign);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showBadge, setShowBadge] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg('');
    sound.playClick();
    try {
      const user = await loginWithGoogle();
      if (user) {
        sound.playClueUnlocked();
        onProfileUpdated({
          uid: user.uid,
          displayName: user.displayName || 'Special Agent',
          callsign: (user.displayName || 'VANGUARD').toUpperCase().split(' ')[0],
          isAnonymous: false
        });
      }
    } catch (err: any) {
      console.error('Google sign in error:', err);
      setErrorMsg('Google Sign-In failed or popup was closed. Ensure popups are allowed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    sound.playClick();
    try {
      await logoutDetective();
      let guestId = localStorage.getItem('blackwatch_guest_id');
      if (!guestId) {
        guestId = 'guest-' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('blackwatch_guest_id', guestId);
      }
      onProfileUpdated({
        uid: guestId,
        displayName: 'Guest Detective',
        callsign: 'SPECTRE',
        isAnonymous: true
      });
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCallsign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callsignInput.trim()) return;
    sound.playClick();
    onProfileUpdated({ callsign: callsignInput.trim().toUpperCase() });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#121826] border border-slate-700 w-full max-w-md rounded p-5 space-y-4 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h3 className="font-serif-header text-base font-bold text-slate-100">
              OFFICER CREDENTIALS & CLEARANCE
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Card */}
        <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-3 font-mono-tactical text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>OFFICER CALLSIGN:</span>
            <span className="text-amber-400 font-bold">{officer.callsign}</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>BADGE NUMBER:</span>
            <span className="text-slate-200">{officer.badgeNumber}</span>
          </div>
          {officer.loginId && (
            <div className="flex items-center justify-between text-slate-400">
              <span>LOGIN ID:</span>
              <span className="text-cyan-400 font-bold">{officer.loginId}</span>
            </div>
          )}
          {officer.division && (
            <div className="flex items-center justify-between text-slate-400">
              <span>DIVISION:</span>
              <span className="text-slate-200 truncate max-w-[200px]" title={officer.division}>{officer.division}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-slate-400">
            <span>SECURITY CLEARANCE:</span>
            <span className="text-cyan-400 font-bold">LEVEL {officer.clearanceLevel} // TOP-SECRET</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>CASES SOLVED:</span>
            <span className="text-emerald-400 font-bold">{officer.casesClosed} CLOSED</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>FIRESTORE PERSISTENCE:</span>
            <span className="text-slate-200">
              {isCloudSynced ? 'ACTIVE (CLOUD SYNCED)' : 'LOCAL OPTIMISTIC CACHE'}
            </span>
          </div>
        </div>

        {/* Tactical Badge Visual Toggle */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setShowBadge(!showBadge);
            }}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-mono-tactical text-xs flex items-center justify-center space-x-2 cursor-pointer"
          >
            {showBadge ? <EyeOff className="w-4 h-4 text-amber-500" /> : <Eye className="w-4 h-4 text-amber-500" />}
            <span>{showBadge ? 'HIDE OPERATIONAL BADGE' : 'VIEW OPERATIONAL BADGE'}</span>
          </button>
          
          {showBadge && (
            <div className="pt-2 animate-fadeIn">
              <OfficerBadge officer={officer} />
            </div>
          )}
        </div>

        {/* Callsign Edit Form */}
        <form onSubmit={handleSaveCallsign} className="space-y-2">
          <label className="text-xs font-mono-tactical text-slate-400 block">
            UPDATE TACTICAL CALLSIGN
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={callsignInput}
              onChange={(e) => setCallsignInput(e.target.value)}
              maxLength={12}
              className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono-tactical rounded px-3 py-2 uppercase focus:border-amber-500 focus:outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono-tactical rounded border border-slate-600 cursor-pointer"
            >
              SAVE
            </button>
          </div>
        </form>

        {/* Firebase Authentication Action */}
        <div className="border-t border-slate-800 pt-3 space-y-2">
          <span className="text-[11px] font-mono-tactical text-slate-400 block">
            CLOUD SYNCHRONIZATION (GOOGLE IDENTITY)
          </span>

          {officer.isAnonymous ? (
            <button
              disabled={isLoading}
              onClick={handleGoogleSignIn}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow"
            >
              <LogIn className="w-4 h-4 text-slate-900" />
              <span>{isLoading ? 'AUTHENTICATING...' : 'SIGN IN WITH GOOGLE'}</span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 text-xs font-mono-tactical">
                <CheckCircle className="w-4 h-4" />
                <span>SIGNED IN AS: {officer.displayName}</span>
              </div>
              <button
                disabled={isLoading}
                onClick={handleSignOut}
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-rose-400 border border-rose-900/50 font-mono-tactical text-xs rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>SIGN OUT / RETURN TO GUEST</span>
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-mono-tactical rounded">
              {errorMsg}
            </div>
          )}

          {onLogout && (
            <button
              onClick={() => {
                sound.playClick();
                onLogout();
                onClose();
              }}
              className="w-full py-2 px-4 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-rose-900 text-rose-400 font-mono-tactical text-[11px] rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>RETIRE FROM OPERATION (LOGOUT)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
