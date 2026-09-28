import React, { useState } from 'react';
import { 
  Radio, 
  Shield, 
  MapPin, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Crosshair,
  Compass,
  ArrowRight
} from 'lucide-react';
import { MapSector, TacticalUnit } from '../types/game';
import { sound } from '../lib/audio';

interface DispatchViewProps {
  sectors: MapSector[];
  units: TacticalUnit[];
  budget: number;
  onDeployUnit: (unitId: string, sectorId: string) => void;
  onScanSector: (sectorId: string) => void;
}

export const DispatchView: React.FC<DispatchViewProps> = ({
  sectors,
  units,
  budget,
  onDeployUnit,
  onScanSector
}) => {
  const [selectedSectorId, setSelectedSectorId] = useState<string>(sectors[0]?.id || '');
  const [selectedUnitId, setSelectedUnitId] = useState<string>(units[0]?.id || '');

  const selectedSector = sectors.find(s => s.id === selectedSectorId) || sectors[0];
  const selectedUnit = units.find(u => u.id === selectedUnitId) || units[0];

  const handleSelectSector = (secId: string) => {
    sound.playClick();
    setSelectedSectorId(secId);
  };

  const handleDispatch = () => {
    if (!selectedUnit || !selectedSector) return;
    if (selectedUnit.status === 'deployed') {
      sound.playAlertWarning();
      return;
    }
    if (budget < selectedUnit.cost) {
      sound.playAlertWarning();
      return;
    }
    sound.playDispatchRadio();
    onDeployUnit(selectedUnit.id, selectedSector.id);
  };

  const threatColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'text-rose-500 bg-rose-950/80 border-rose-800';
      case 'HIGH': return 'text-amber-500 bg-amber-950/80 border-amber-800';
      case 'ELEVATED': return 'text-amber-400 bg-amber-950/40 border-amber-800/60';
      default: return 'text-emerald-400 bg-emerald-950/60 border-emerald-800';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Section: Metropolitan Tactical Grid Map */}
      <div className="bg-[#121826] border border-slate-800 p-4 sm:p-5 rounded space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-lg font-serif-header font-bold text-slate-100 flex items-center space-x-2">
              <Compass className="w-4 h-4 text-amber-500" />
              <span>METROPOLITAN SECTOR SURVEILLANCE GRID</span>
            </h2>
            <p className="text-xs font-mono-tactical text-slate-400">
              TACTICAL RADAR OVERLAY // COORDINATE MATRIX 88-ALPHA
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono-tactical">
            <span className="text-slate-400">ACTIVE FIELD TEAMS:</span>
            <span className="text-amber-400 font-semibold">
              {units.filter(u => u.status === 'deployed').length} / {units.length} DEPLOYED
            </span>
          </div>
        </div>

        {/* Tactical Interactive Map Canvas Area */}
        <div className="relative w-full h-[320px] sm:h-[400px] bg-[#070B12] rounded border border-slate-800 overflow-hidden bg-tactical-grid shadow-inner">
          
          {/* Radar Sweep Effect */}
          <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,_rgba(245,158,11,0.25)_0%,_transparent_70%)]" />

          {/* Grid lines & Sector Nodes */}
          {sectors.map(sec => {
            const isSelected = sec.id === selectedSector?.id;
            const assignedUnit = units.find(u => u.activeMission?.sectorId === sec.id);

            return (
              <button
                key={sec.id}
                onClick={() => handleSelectSector(sec.id)}
                style={{ left: `${sec.posX}%`, top: `${sec.posY}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group p-1 transition-all z-10 select-none ${
                  isSelected ? 'scale-110 z-20' : 'hover:scale-105'
                }`}
              >
                <div className={`relative flex items-center justify-center w-10 h-10 rounded border transition-all ${
                  isSelected 
                    ? 'bg-amber-500 text-slate-950 border-amber-300 ring-4 ring-amber-500/30' 
                    : sec.isScanned
                    ? 'bg-slate-900/90 text-slate-200 border-slate-700 hover:border-amber-400'
                    : 'bg-slate-950/90 text-slate-400 border-dashed border-slate-800'
                }`}>
                  <Crosshair className={`w-5 h-5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                  
                  {/* Pulse for critical/high threats */}
                  {(sec.threatLevel === 'HIGH' || sec.threatLevel === 'CRITICAL') && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                    </span>
                  )}
                </div>

                {/* Tactical Node Label */}
                <div className={`mt-1 text-[10px] font-mono-tactical px-1.5 py-0.5 rounded text-center whitespace-nowrap shadow-md border ${
                  isSelected
                    ? 'bg-slate-950 text-amber-300 border-amber-500'
                    : 'bg-slate-950/90 text-slate-300 border-slate-800'
                }`}>
                  {sec.code} • {sec.name.split(' ')[0]}
                </div>

                {/* Assigned Active Unit badge */}
                {assignedUnit && (
                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-cyan-950 border border-cyan-500 text-cyan-300 text-[9px] font-mono-tactical px-1 py-0.2 rounded whitespace-nowrap">
                    {assignedUnit.callsign} ({assignedUnit.deploymentTimeRemaining}s)
                  </div>
                )}
              </button>
            );
          })}

          {/* Compass Rose */}
          <div className="absolute bottom-3 right-3 text-[10px] font-mono-tactical text-slate-600 border border-slate-800 bg-slate-950/80 px-2 py-1 rounded pointer-events-none">
            GRID // LAT 42.3601 N // LONG 71.0589 W
          </div>
        </div>
      </div>

      {/* Bottom Dispatch Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col 1 & 2: Field Units Roster */}
        <div className="lg:col-span-2 bg-[#121826] border border-slate-800 p-5 rounded space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-serif-header font-bold text-slate-100 flex items-center space-x-2">
              <Users className="w-4 h-4 text-amber-500" />
              <span>TACTICAL FIELD UNITS (ROSTER & STATUS)</span>
            </h3>
            <span className="text-xs font-mono-tactical text-slate-400">
              READY FOR DEPLOYMENT
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {units.map(unit => {
              const isSelected = selectedUnit?.id === unit.id;
              const isBusy = unit.status === 'deployed';

              return (
                <div
                  key={unit.id}
                  onClick={() => {
                    sound.playClick();
                    setSelectedUnitId(unit.id);
                  }}
                  className={`p-3.5 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#161F33] border-amber-500/70 ring-1 ring-amber-500/30'
                      : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 text-xs font-mono-tactical">
                    <span className="font-bold text-slate-100 flex items-center space-x-1.5">
                      <Radio className={`w-3.5 h-3.5 ${isBusy ? 'text-amber-400 animate-pulse' : 'text-slate-400'}`} />
                      <span>{unit.callsign}</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${
                      isBusy ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {isBusy ? `ACTIVE (${unit.deploymentTimeRemaining}s)` : 'STANDBY'}
                    </span>
                  </div>

                  <p className="text-xs font-mono-tactical text-slate-400 mb-3">
                    SPECIALTY: <span className="text-slate-200">{unit.specialty}</span>
                  </p>

                  <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-xs font-mono-tactical">
                    <span className="text-emerald-400 font-semibold">
                      COST: ${unit.cost}
                    </span>
                    {isBusy ? (
                      <span className="text-amber-400 text-[11px] truncate max-w-[50%]">
                        Mission in {unit.activeMission?.sectorId.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px]">SELECT TO ASSIGN</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Col 3: Sector Order & Dispatch Authorization */}
        <div className="bg-[#121826] border border-slate-800 p-5 rounded space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-800 pb-3 mb-3">
              <span className="text-[10px] font-mono-tactical uppercase text-slate-500">
                TARGET SECTOR SPECIFICATION
              </span>
              <h3 className="text-base font-serif-header font-bold text-slate-100">
                {selectedSector.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`text-[10px] font-mono-tactical px-1.5 py-0.5 rounded border ${threatColor(selectedSector.threatLevel)}`}>
                  THREAT: {selectedSector.threatLevel}
                </span>
                <span className="text-xs font-mono-tactical text-slate-400">
                  GRID: {selectedSector.gridCoord}
                </span>
              </div>
            </div>

            <p className="text-xs font-sans-body text-slate-300 mb-4 leading-relaxed">
              {selectedSector.description}
            </p>

            <div className="bg-slate-950 p-3 rounded border border-slate-800 text-xs font-mono-tactical space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>ASSIGNED UNIT:</span>
                <span className="text-amber-300 font-bold">{selectedUnit?.callsign}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>OPERATIONAL COST:</span>
                <span className="text-emerald-400 font-bold">${selectedUnit?.cost}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>RECON DURATION:</span>
                <span className="text-slate-200">12 SECONDS (HIGH SPEED)</span>
              </div>
            </div>
          </div>

          <button
            disabled={selectedUnit?.status === 'deployed' || budget < (selectedUnit?.cost || 0)}
            onClick={handleDispatch}
            className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-mono-tactical text-xs font-bold rounded flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-md mt-4"
          >
            <Radio className="w-4 h-4" />
            <span>AUTHORIZE TACTICAL DISPATCH</span>
          </button>
        </div>

      </div>

    </div>
  );
};
