import React, { useState } from 'react';
import { 
  CheckSquare, 
  Download, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Search, 
  RefreshCw,
  QrCode,
  MapPin
} from 'lucide-react';
import { PatrimonialAsset, User, InternalAuditItem } from '../types';
import { PdfGeneratorService } from '../services/pdfGenerator';
import { StorageService } from '../services/storage';

interface AuditsViewProps {
  assets: PatrimonialAsset[];
  currentUser: User;
  onRefreshAssets: () => void;
  onOpenScanner: () => void;
}

export const AuditsView: React.FC<AuditsViewProps> = ({
  assets,
  currentUser,
  onRefreshAssets,
  onOpenScanner
}) => {
  const roomsList = StorageService.getRoomsList();
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [auditStatuses, setAuditStatuses] = useState<{ [assetId: string]: 'conforme' | 'divergente' | 'nao_encontrado' | 'avaria' }>({});
  const [savedMessage, setSavedMessage] = useState('');

  const filteredAssets = selectedRoom === 'all' 
    ? assets 
    : assets.filter(a => a.location.room === selectedRoom);

  // Compute compliance
  const totalInFilter = filteredAssets.length;
  const auditedCount = Object.keys(auditStatuses).length;
  const conformesCount = Object.values(auditStatuses).filter(s => s === 'conforme').length;
  const divergentesCount = Object.values(auditStatuses).filter(s => s === 'divergente' || s === 'nao_encontrado' || s === 'avaria').length;

  const complianceRate = totalInFilter > 0 
    ? ((conformesCount + (totalInFilter - auditedCount)) / totalInFilter) * 100 
    : 100;

  const setStatusForItem = (assetId: string, status: 'conforme' | 'divergente' | 'nao_encontrado' | 'avaria') => {
    setAuditStatuses(prev => ({
      ...prev,
      [assetId]: status
    }));
  };

  const markAllAsConforme = () => {
    const next: { [id: string]: 'conforme' } = {};
    filteredAssets.forEach(a => { next[a.id] = 'conforme'; });
    setAuditStatuses(next);
  };

  const handleSaveAudit = () => {
    // Update lastAuditedDate on assets
    const updatedAssets = assets.map(a => {
      if (auditStatuses[a.id]) {
        return {
          ...a,
          lastAuditedDate: new Date().toISOString().split('T')[0]
        };
      }
      return a;
    });

    StorageService.saveAssets(updatedAssets);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'AUDITORIA',
      entity: 'Auditoria Interna',
      entityId: `AUD-${Date.now()}`,
      details: `Conferência física finalizada no ambiente "${selectedRoom}". Taxa de acurácia: ${complianceRate.toFixed(1)}%.`
    });

    setSavedMessage(`Auditoria física registrada com sucesso! ${auditedCount} ativos conferidos.`);
    setTimeout(() => setSavedMessage(''), 4000);
    onRefreshAssets();
  };

  const handleExportCompliancePdf = () => {
    PdfGeneratorService.generateComplianceReportPdf(filteredAssets, complianceRate);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Auditoria Interna & Conformidade de Ativos
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Conferência física periódica, índice de acurácia patrimonial e emissão de laudos para controladoria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenScanner}
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/30"
          >
            <QrCode className="w-4 h-4" />
            <span>Conferir via QR</span>
          </button>

          <button
            onClick={handleExportCompliancePdf}
            id="export-compliance-pdf-btn"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Relatório de Conformidade PDF</span>
          </button>
        </div>
      </div>

      {savedMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Índice de Acurácia</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{complianceRate.toFixed(1)}%</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Meta corporativa: ≥ 98%</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Itens Auditados</span>
          <div className="text-2xl font-black text-white mt-1">{auditedCount} / {totalInFilter}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Progresso da rodada</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Itens 100% Conformes</span>
          <div className="text-2xl font-black text-indigo-400 mt-1">{conformesCount}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Localização e estado íntegros</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Divergências Detectadas</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{divergentesCount}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Exige averiguação física</span>
        </div>
      </div>

      {/* Room filter toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-slate-300">Filtrar por Sala de Auditoria:</span>
          <select
            value={selectedRoom}
            onChange={(e) => {
              setSelectedRoom(e.target.value);
              setAuditStatuses({});
            }}
            className="bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-1.5 focus:outline-none"
          >
            <option value="all">Todas as Salas da Empresa</option>
            {roomsList.map(r => (
              <option key={r.id} value={r.name}>{r.name} ({r.building})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={markAllAsConforme}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium cursor-pointer"
          >
            Marcar Todos Conformes
          </button>
          <button
            onClick={handleSaveAudit}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold cursor-pointer shadow-md"
          >
            Salvar Rodada de Auditoria
          </button>
        </div>
      </div>

      {/* Assets Checklist Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Patrimônio</th>
                <th className="py-3 px-4">Material / Especificação</th>
                <th className="py-3 px-4">Local Esperado</th>
                <th className="py-3 px-4">Responsável</th>
                <th className="py-3 px-4">Última Auditoria</th>
                <th className="py-3 px-4 text-center">Status na Conferência</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredAssets.map((asset) => {
                const currentStatus = auditStatuses[asset.id] || 'conforme';
                return (
                  <tr key={asset.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {asset.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{asset.name}</div>
                      <div className="text-[11px] text-slate-400">{asset.brand} {asset.model}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {asset.location.room}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {asset.location.responsiblePerson}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {asset.lastAuditedDate || 'Nunca'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex rounded-lg border border-slate-700 bg-slate-950 p-0.5">
                        <button
                          type="button"
                          onClick={() => setStatusForItem(asset.id, 'conforme')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            currentStatus === 'conforme'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Conforme
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusForItem(asset.id, 'divergente')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            currentStatus === 'divergente'
                              ? 'bg-amber-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Sala Divergente
                        </button>
                        <button
                          type="button"
                          onClick={() => setStatusForItem(asset.id, 'nao_encontrado')}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                            currentStatus === 'nao_encontrado'
                              ? 'bg-rose-600 text-white'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Não Encontrado
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
