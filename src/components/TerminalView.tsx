import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Shield, CornerDownLeft, Trash2, Cpu } from 'lucide-react';
import { OperationalLog, TacticalUnit, MapSector, EvidenceItem } from '../types/game';
import { sound } from '../lib/audio';

interface TerminalViewProps {
  logs: OperationalLog[];
  units: TacticalUnit[];
  sectors: MapSector[];
  evidenceList: EvidenceItem[];
  budget: number;
  suspicionIndex: number;
  onExecuteCommand: (cmd: string) => string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  logs,
  units,
  sectors,
  evidenceList,
  budget,
  suspicionIndex,
  onExecuteCommand
}) => {
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<Array<{ text: string; type: 'cmd' | 'resp' | 'system' }>>([
    { text: 'PROJECT BLACKWATCH SECURE TACTICAL TERMINAL // OS-VERSION 4.19-PROD', type: 'system' },
    { text: 'TYPE "help" FOR AVAILABLE COMMANDS OR "status" FOR LIVE TELEMETRY.', type: 'system' }
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    sound.playTeletype();
    setHistory(prev => [...prev, { text: `> ${cmd}`, type: 'cmd' }]);
    setCommandInput('');

    if (cmd.toLowerCase() === 'clear') {
      setHistory([]);
      return;
    }

    const response = onExecuteCommand(cmd);
    setHistory(prev => [...prev, { text: response, type: 'resp' }]);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Terminal Header */}
      <div className="bg-[#121826] border border-slate-800 p-4 rounded flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-mono-tactical font-bold text-slate-100">
            OPERATIONAL COMMAND LINE INTERFACE (BLACKWATCH-CLI)
          </h2>
        </div>
        <div className="flex items-center space-x-3 text-xs font-mono-tactical text-slate-400">
          <span>HOST: TAC-COMMAND-SRV</span>
          <button 
            onClick={() => setHistory([])}
            className="text-slate-500 hover:text-slate-300 flex items-center space-x-1"
          >
            <Trash2 className="w-3 h-3" />
            <span>CLEAR</span>
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div className="bg-[#070B12] border border-slate-800 rounded p-4 h-[520px] flex flex-col justify-between font-mono-tactical text-xs text-slate-300 shadow-inner overflow-hidden">
        
        {/* Output stream */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {history.map((item, idx) => (
            <div 
              key={idx}
              className={`whitespace-pre-wrap leading-relaxed ${
                item.type === 'cmd' 
                  ? 'text-amber-400 font-semibold' 
                  : item.type === 'system' 
                  ? 'text-cyan-400 opacity-90' 
                  : 'text-slate-200'
              }`}
            >
              {item.text}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {/* Input prompt line */}
        <form onSubmit={handleSubmit} className="border-t border-slate-800 pt-3 flex items-center space-x-2">
          <span className="text-amber-500 font-bold select-none">&gt;</span>
          <input
            type="text"
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Type a tactical command (e.g. help, status, scan sec-01)..."
            className="flex-1 bg-transparent text-amber-200 focus:outline-none placeholder:text-slate-700 font-mono-tactical text-xs"
            autoFocus
          />
          <button type="submit" className="text-slate-500 hover:text-amber-400">
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* Operational Event Audit Logs Panel */}
      <div className="bg-[#121826] border border-slate-800 p-4 rounded space-y-3">
        <h3 className="text-xs font-mono-tactical uppercase text-slate-400 tracking-wider">
          LIVE AUDIT DISPATCH LOGS (LAST {logs.length} EVENTS)
        </h3>
        <div className="space-y-1.5 font-mono-tactical text-[11px] max-h-48 overflow-y-auto">
          {logs.slice(-8).reverse().map(l => (
            <div key={l.id} className="flex items-center space-x-2 p-1.5 bg-slate-900/60 rounded border border-slate-800/40">
              <span className="text-slate-500 text-[10px] shrink-0">{l.timestamp}</span>
              <span className={`px-1 rounded text-[9px] font-bold ${
                l.severity === 'critical' ? 'bg-rose-950 text-rose-300' :
                l.severity === 'warning' ? 'bg-amber-950 text-amber-300' :
                l.severity === 'success' ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-300'
              }`}>
                {l.type}
              </span>
              <span className="text-slate-300 truncate">{l.message}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
