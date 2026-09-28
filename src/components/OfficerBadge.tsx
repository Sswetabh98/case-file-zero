import React from 'react';
import { Shield, Award, Eye, FileText, QrCode } from 'lucide-react';
import { OfficerProfile } from '../types/game';

interface OfficerBadgeProps {
  officer: OfficerProfile & {
    loginId?: string;
    division?: string;
  };
}

export const OfficerBadge: React.FC<OfficerBadgeProps> = ({ officer }) => {
  // Format details
  const name = officer.displayName || 'Unenlisted Candidate';
  const badgeNo = officer.badgeNumber || 'MCB-PENDING';
  const callsign = officer.callsign || 'UNKNOWN';
  const clearance = officer.clearanceLevel || 1;
  const loginId = officer.loginId || badgeNo || 'LID-PENDING';
  const division = officer.division || 'Crime Branch, Malhar Division';

  return (
    <div className="relative overflow-hidden bg-slate-950 border border-slate-800 rounded p-6 shadow-2xl font-mono-tactical text-xs text-slate-300 max-w-sm mx-auto">
      {/* Background Microgrids / Scan lines */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[linear-gradient(rgba(18,24,38,1)_1px,transparent_1px),linear-gradient(90deg,rgba(18,24,38,1)_1px,transparent_1px)] bg-[size:16px_16px]" />
      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/10 to-slate-950/90 pointer-events-none" />

      {/* Security Watermarks */}
      <div className="absolute top-2 right-2 text-[8px] text-slate-800 tracking-wider">
        SYS_ID: 0x2A99 // SECURITY-SECURE
      </div>

      {/* Holographic Security Thread Visual */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500/40 via-cyan-500/20 to-amber-500/40 border-r border-slate-800" />

      {/* Badge Content */}
      <div className="pl-4 space-y-5 relative z-10">
        
        {/* Header Title */}
        <div className="text-center border-b border-slate-800 pb-3 space-y-1">
          <div className="text-[10px] uppercase text-slate-500 tracking-widest">
            Metropolitan Police Department
          </div>
          <div className="font-serif-header text-base font-bold text-slate-100 tracking-wide uppercase">
            Crime Branch Division
          </div>
          <div className="text-[9px] uppercase tracking-widest text-amber-500 font-semibold bg-amber-500/5 py-0.5 border border-amber-500/20 inline-block px-2 rounded-xs">
            SPECIAL COMMISSIONED OFFICERS
          </div>
        </div>

        {/* Shield Icon and Photo/ID Slot */}
        <div className="flex items-center justify-between gap-4">
          {/* Authentic Gold/Amber Shield Emblem */}
          <div className="relative w-20 h-20 flex items-center justify-center bg-slate-900 border border-slate-800 rounded shadow-inner p-1">
            <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500" fill="currentColor">
              {/* Outer shield frame */}
              <polygon 
                points="50,5 92,20 92,55 50,95 8,55 8,20" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              {/* Inner shield border */}
              <polygon 
                points="50,12 84,24 84,52 50,86 16,52 16,24" 
                fill="#0A0F1D" 
                stroke="currentColor" 
                strokeWidth="2"
              />
              {/* Center star */}
              <polygon 
                points="50,22 57,38 75,38 61,49 66,66 50,55 34,66 39,49 25,38 43,38" 
                fill="currentColor"
                opacity="0.85"
              />
            </svg>
            <div className="absolute bottom-1 text-[8px] text-slate-400 uppercase tracking-widest">
              MCB
            </div>
          </div>

          {/* Barcode/QR Code Security Validation Visual */}
          <div className="flex flex-col items-end space-y-2">
            <div className="p-1 bg-slate-900 border border-slate-800 rounded">
              <QrCode className="w-12 h-12 text-slate-400 opacity-85" />
            </div>
            <div className="text-right">
              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">LOGIN CREDENTIAL:</span>
              <span className="text-[11px] text-cyan-400 font-bold tracking-wider">{loginId}</span>
            </div>
          </div>
        </div>

        {/* Credentials Details Block */}
        <div className="space-y-2.5 border-t border-b border-slate-800/80 py-3 text-[11px]">
          
          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 uppercase text-[9px] tracking-wider">OFFICER NAME</span>
            <span className="font-serif-header text-slate-100 text-sm font-semibold tracking-wide text-right">
              {name}
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 uppercase text-[9px] tracking-wider">TACTICAL CALLSIGN</span>
            <span className="text-amber-400 font-bold tracking-widest uppercase">
              {callsign}
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 uppercase text-[9px] tracking-wider">BADGE NUMBER</span>
            <span className="text-slate-200 font-semibold tracking-wider">
              {badgeNo}
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 uppercase text-[9px] tracking-wider">ASSIGNED DIVISION</span>
            <span className="text-slate-300 uppercase text-[10px]">
              {division}
            </span>
          </div>

          <div className="flex justify-between items-baseline">
            <span className="text-slate-500 uppercase text-[9px] tracking-wider">CLEARANCE STATUS</span>
            <span className="text-cyan-400 font-bold uppercase tracking-wider">
              LEVEL {clearance} // TOP-SECRET
            </span>
          </div>
        </div>

        {/* Footer Warning / Legal stamp */}
        <div className="text-[8px] text-slate-500 leading-normal text-justify uppercase tracking-tighter">
          This document serves as the official operational warrant for the individual named above. Action authorized under Project Blackwatch direct authority. Unauthorized duplication or possession is a federal violation of MCB Special Mandates.
        </div>

      </div>
    </div>
  );
};
