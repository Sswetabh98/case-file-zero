import React from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';
import { sound } from '../lib/audio';

export interface AlertData {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'critical';
}

interface ModalAlertProps {
  alert: AlertData;
  onClose: () => void;
}

export const ModalAlert: React.FC<ModalAlertProps> = ({ alert, onClose }) => {
  React.useEffect(() => {
    if (alert.isOpen) {
      if (alert.type === 'success' || alert.title.includes('MISSION') || alert.title.includes('RECON') || alert.title.includes('REPORT')) {
        sound.playMissionCompleted();
      } else if (alert.type === 'warning' || alert.type === 'critical') {
        sound.playAlertWarning();
      }
    }
  }, [alert.isOpen, alert.title, alert.type]);

  if (!alert.isOpen) return null;

  const icon = () => {
    switch (alert.type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'critical': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-cyan-400" />;
    }
  };

  const borderColor = () => {
    switch (alert.type) {
      case 'success': return 'border-emerald-500/50';
      case 'critical': return 'border-rose-500/50';
      case 'warning': return 'border-amber-500/50';
      default: return 'border-cyan-500/50';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className={`bg-[#121826] border ${borderColor()} w-full max-w-md rounded p-5 space-y-4 shadow-2xl relative`}>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            {icon()}
            <h3 className="font-serif-header text-base font-bold text-slate-100">
              {alert.title}
            </h3>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-950 p-3.5 rounded border border-slate-800 text-xs font-mono-tactical text-slate-300 whitespace-pre-wrap leading-relaxed">
          {alert.message}
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono-tactical text-xs rounded border border-slate-700 cursor-pointer"
          >
            ACKNOWLEDGE
          </button>
        </div>
      </div>
    </div>
  );
};
