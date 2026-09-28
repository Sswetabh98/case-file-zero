import React from 'react';
import { 
  FolderLock, 
  Search, 
  Compass, 
  GitBranch, 
  MessageSquareWarning, 
  Terminal, 
  FileText 
} from 'lucide-react';
import { sound } from '../lib/audio';

export type GameTab = 
  | 'dossier' 
  | 'evidence' 
  | 'dispatch' 
  | 'corkboard' 
  | 'interrogation' 
  | 'terminal' 
  | 'docs';

interface BottomNavProps {
  activeTab: GameTab;
  onSelectTab: (tab: GameTab) => void;
  unlockedEvidenceCount: number;
  totalEvidenceCount: number;
  activeDeploymentsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  unlockedEvidenceCount,
  totalEvidenceCount,
  activeDeploymentsCount
}) => {
  const tabs = [
    { id: 'dossier', label: 'Dossier', icon: FolderLock },
    { 
      id: 'evidence', 
      label: 'Evidence', 
      icon: Search, 
      badge: `${unlockedEvidenceCount}/${totalEvidenceCount}` 
    },
    { 
      id: 'dispatch', 
      label: 'Dispatch', 
      icon: Compass, 
      badge: activeDeploymentsCount > 0 ? `${activeDeploymentsCount}` : undefined 
    },
    { id: 'corkboard', label: 'Corkboard', icon: GitBranch },
    { id: 'interrogation', label: 'Interrogate', icon: MessageSquareWarning },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'docs', label: 'Specs / PRD', icon: FileText },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F19] border-t border-slate-800 backdrop-blur-md px-1 py-1 sm:py-1.5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-around sm:justify-center sm:space-x-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                sound.playClick();
                onSelectTab(tab.id as GameTab);
              }}
              className={`relative flex flex-col items-center justify-center min-w-[48px] sm:min-w-[80px] h-[52px] sm:h-[50px] px-2 sm:px-3 rounded transition-all select-none ${
                isActive 
                  ? 'bg-slate-900 border border-amber-500/60 text-amber-400 font-semibold' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border border-transparent'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 sm:w-4 sm:h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                {tab.badge && (
                  <span className={`absolute -top-1.5 -right-3 text-[9px] font-mono-tactical px-1 py-0.2 rounded-full border ${
                    isActive ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold' : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] sm:text-[11px] mt-1 font-mono-tactical tracking-tight ${isActive ? 'text-slate-100' : 'text-slate-400'}`}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-2 right-2 h-[2px] bg-amber-500" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
