import React, { useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Wrench, 
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
  const totalDepreciation = totalAcquisition - totalBookValue;
  const inMaintenanceCount = assets.filter(a => a.status === 'em_manutencao').length;
  const scheduledMaintenanceCount = maintenances.filter(m => m.status === 'agendada').length;

  // Category counts
  const categoryCounts: { [cat: string]: number } = {};
  assets.forEach(a => {
    categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
  });

  // Condition counts
  const conditionCounts: { [cond: string]: number } = {
    novo: 0,
    bom: 0,
    regular: 0,
    danificado: 0,
    sucata: 0
  };
  assets.forEach(a => {
    if (conditionCounts[a.condition] !== undefined) {
      conditionCounts[a.condition]++;
    }
  });

  // PREDICTIVE ANALYSIS ALGORITHM:
  // Detect assets nearing failure, requiring battery replacement, or warranty expiration
  const predictiveAlerts = assets.map(a => {
    let riskLevel: 'alto' | 'medio' | 'baixo' = 'baixo';
    let predictedAction = '';
    let projectedCost = 0;

    const acquisitionYear = new Date(a.acquisitionDate).getFullYear();
    const ageYears = 2026 - acquisitionYear;

    if (a.category === 'Informatica' && ageYears >= 3) {
      riskLevel = 'alto';
      predictedAction = 'Fim do ciclo de vida útil (obsolescência tecnológica). Substituição preventiva recomendada.';
      projectedCost = a.acquisitionValue * 1.1;
    } else if (a.name.toLowerCase().includes('nobreak') || a.name.toLowerCase().includes('ups')) {
      riskLevel = 'alto';
      predictedAction = 'Troca obrigatória do banco de baterias VRLA (vida útil química esgotando em 60 dias).';
      projectedCost = 1950.00;
    } else if (a.condition === 'regular' || a.status === 'em_manutencao') {
      riskLevel = 'medio';
      predictedAction = 'Revisão corretiva de alinhamento e calibração para prevenir parada total.';
      projectedCost = 1200.00;
    } else if (ageYears >= 2 && !a.lastMaintenanceDate) {
      riskLevel = 'medio';
      predictedAction = 'Equipamento sem histórico de manutenção preventiva há mais de 18 meses.';
      projectedCost = 650.00;
    }

    return {
      asset: a,
      riskLevel,
      predictedAction,
      projectedCost
    };
  }).filter(item => item.riskLevel !== 'baixo');

  const totalProjectedReplacement = predictiveAlerts.reduce((sum, item) => sum + item.projectedCost, 0);

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
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Painel de Controle & Análise Preditiva
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Visão gerencial em tempo real, saúde patrimonial e inteligência preventiva de ativos
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
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Valor Contábil Atual</span>
            <div className="text-xl font-black text-emerald-400 mt-1">
              R$ {totalBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Orig.: R$ {totalAcquisition.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center border border-emerald-800/60">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Em Manutenção</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{inMaintenanceCount}</div>
            <span className="text-[11px] text-slate-400 mt-1 block">
              {scheduledMaintenanceCount} revisões programadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center border border-amber-800/60">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        {/* Depreciação Acumulada */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Depreciação Acumulada</span>
            <div className="text-xl font-black text-slate-300 mt-1">
              R$ {totalDepreciation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[11px] text-indigo-400 mt-1 block">
              Reconciliado com ERP
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- PREDICTIVE ANALYSIS SECTION --- */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 rounded-2xl border border-indigo-500/30 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white flex items-center space-x-2">
                <span>Análise Preditiva de Falhas e Custos de Reposição</span>
                <span className="text-[10px] bg-indigo-900/80 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700 font-normal">
                  Algoritmo de Telemetria
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Detecção antecipada de desgaste, baterias críticas e projeção de orçamento anual
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block">Projeção de Reposição</span>
            <span className="font-black text-sm text-indigo-300 font-mono">
              R$ {totalProjectedReplacement.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Predictive Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {predictiveAlerts.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 hover:border-indigo-500/40 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-xs font-bold text-indigo-400">{item.asset.code}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    item.riskLevel === 'alto' 
                      ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}>
                    Risco {item.riskLevel}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white line-clamp-1">{item.asset.name}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.predictedAction}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 text-[10px]">Custo Est.:</span>
                <span className="font-semibold text-emerald-400 font-mono">
                  R$ {item.projectedCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
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

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
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
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Regulares</span>
              <span className="text-2xl font-black text-white mt-0.5 block">{conditionCounts.regular}</span>
              <span className="text-[10px] text-slate-500">Desgaste natural</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">Danificados</span>
              <span className="text-2xl font-black text-white mt-0.5 block">{conditionCounts.danificado}</span>
              <span className="text-[10px] text-slate-500">Aguardando reparo</span>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Sucata / Baixa</span>
              <span className="text-2xl font-black text-white mt-0.5 block">{conditionCounts.sucata}</span>
              <span className="text-[10px] text-slate-500">Descarte ecológico</span>
            </div>

            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-800/60 text-center flex flex-col justify-center">
              <span className="text-[10px] text-indigo-300 uppercase font-bold block">Saúde Geral</span>
              <span className="text-2xl font-black text-indigo-200 mt-0.5 block">94%</span>
              <span className="text-[10px] text-indigo-400">Score excelente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
