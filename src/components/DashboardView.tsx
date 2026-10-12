import React, { useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Download, 
  QrCode, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  Building2,
  Calendar,
  Layers
} from 'lucide-react';
import { PatrimonialAsset, MaintenanceRecord, User } from '../types';
import { PdfGeneratorService } from '../services/pdfGenerator';

interface DashboardViewProps {
  assets: PatrimonialAsset[];
  maintenances: MaintenanceRecord[];
  currentUser: User;
  onNavigateTab: (tab: any) => void;
  onOpenScanner: () => void;
  onSelectAsset?: (assetId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  maintenances,
  currentUser,
  onNavigateTab,
  onOpenScanner,
  onSelectAsset
}) => {
  const [selectedMonth, setSelectedMonth] = useState('Setembro/2026');

  // Key Financial & Physical Metrics
  const totalAssets = assets.length;
  const totalAcquisition = assets.reduce((sum, a) => sum + a.acquisitionValue, 0);
  const totalBookValue = assets.reduce((sum, a) => sum + a.currentBookValue, 0);
  const inUseCount = assets.filter(a => a.status === 'em_uso').length;
  const disponivelCount = assets.filter(a => a.status === 'disponivel').length;

  // Category counts
  const categoryCounts: { [cat: string]: number } = {};
  assets.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  // Condition counts (Novo, Bom, Danificado)
  const conditionCounts = {
    novo: 0,
    bom: 0,
    danificado: 0
  };
  assets.forEach(a => {
    if (a.condition === 'novo') conditionCounts.novo++;
    else if (a.condition === 'danificado') conditionCounts.danificado++;
    else conditionCounts.bom++;
  });

  const physicalHealthRate = assets.length > 0 
    ? Math.round(((conditionCounts.novo + conditionCounts.bom) / assets.length) * 100)
    : 100;

  const handleDownloadMonthlyPdf = () => {
    PdfGeneratorService.generateMonthlyReportPdf(assets, maintenances, selectedMonth);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Painel de Controle e Gestão Patrimonial
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visão gerencial em tempo real, controle de inventário e distribuição de ativos patrimoniais
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenScanner}
            id="dashboard-quick-scan-btn"
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>Consultar QR</span>
          </button>

          <button
            onClick={handleDownloadMonthlyPdf}
            id="dashboard-monthly-pdf-btn"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Relatório Mensal PDF</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Assets */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total de Ativos</span>
            <div className="text-2xl font-black text-white mt-1">{totalAssets}</div>
            <span className="text-[11px] text-emerald-400 font-medium mt-1 inline-flex items-center space-x-1">
              <span>100% catalogados</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center border border-indigo-800/60">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Book Value */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Valor Total do Patrimônio</span>
            <div className="text-xl font-black text-emerald-400 mt-1">
              R$ {totalAcquisition.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Ativos tombados e inventariados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Ativos em Operação */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Ativos em Operação</span>
            <div className="text-2xl font-black text-cyan-400 mt-1">{inUseCount}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {((inUseCount / (totalAssets || 1)) * 100).toFixed(0)}% em pleno uso
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-cyan-950/60 text-cyan-400 flex items-center justify-center border border-cyan-800/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Ativos Disponíveis / Reserva */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Disponíveis / Reserva</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{disponivelCount}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Prontos para alocação
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center border border-amber-800/60">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- INVENTORY CHARTS & STATUS BREAKDOWN --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white">Distribuição por Categoria</h3>
            <span className="text-[10px] text-slate-400">{Object.keys(categoryCounts).length} categorias ativas</span>
          </div>

          <div className="space-y-3">
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = ((count / totalAssets) * 100).toFixed(0);
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span className="font-medium">{cat}</span>
                    <span className="text-slate-400">{count} itens ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Physical Condition Breakdown */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="font-bold text-sm text-white">Estado de Conservação Física</h3>
            <span className="text-[10px] text-slate-400">Vistorias recentes</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-emerald-400 uppercase font-bold block">Novos</span>
              <span className="text-2xl font-black text-white mt-0.5 block">{conditionCounts.novo}</span>
              <span className="text-[10px] text-slate-500">Em garantia</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-blue-400 uppercase font-bold block">Bons</span>
              <span className="text-2xl font-black text-white mt-0.5 block">{conditionCounts.bom}</span>
              <span className="text-[10px] text-slate-500">Pleno uso</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Danificados</span>
              <span className="text-2xl font-black text-white mt-0.5 block">{conditionCounts.danificado}</span>
              <span className="text-[10px] text-slate-500">Aguardando reparo</span>
            </div>

            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/60 text-center flex flex-col justify-center">
              <span className="text-[10px] text-indigo-300 uppercase font-bold block">Saúde Geral</span>
              <span className="text-2xl font-black text-indigo-200 mt-0.5 block">{physicalHealthRate}%</span>
              <span className="text-[10px] text-indigo-400">Ativos operacionais</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
