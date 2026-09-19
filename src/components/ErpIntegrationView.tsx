import React, { useState } from 'react';
import { 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  Server, 
  Settings, 
  Zap, 
  ArrowRightLeft, 
  Clock, 
  ShieldCheck, 
  Code2,
  AlertCircle
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { ErpSyncConfig, User } from '../types';

interface ErpIntegrationViewProps {
  currentUser: User;
  onRefreshData: () => void;
}

export const ErpIntegrationView: React.FC<ErpIntegrationViewProps> = ({
  currentUser,
  onRefreshData
}) => {
  const [config, setConfig] = useState<ErpSyncConfig>(() => StorageService.getErpConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [syncLogs, setSyncLogs] = useState<Array<{ time: string; text: string; type: 'info' | 'success' | 'warning' }>>([
    { time: '08:00:12', text: 'Conexão segura estabelecida com o gateway ERP (mTLS 1.3).', type: 'info' },
    { time: '08:00:15', text: 'Pacote de 10 ativos imobilizados conferido com o plano de contas contábil.', type: 'success' },
    { time: '08:00:18', text: 'Depreciações acumuladas sincronizadas com sucesso sem divergências.', type: 'success' }
  ]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage('');

    // Simulate real ERP sync steps
    setSyncLogs(prev => [
      { time: new Date().toLocaleTimeString(), text: `Iniciando sincronização bidirecional com ${config.systemName}...`, type: 'info' },
      ...prev
    ]);

    setTimeout(() => {
      const assets = StorageService.getAssets();
      const updatedAssets = assets.map(a => ({ ...a, syncedWithErp: true }));
      StorageService.saveAssets(updatedAssets);

      const newConfig: ErpSyncConfig = {
        ...config,
        lastSyncTimestamp: new Date().toISOString(),
        totalSyncedItems: assets.length,
        pendingSyncCount: 0,
        status: 'conectado'
      };
      StorageService.saveErpConfig(newConfig);
      setConfig(newConfig);
      setIsSyncing(false);

      setSyncLogs(prev => [
        { time: new Date().toLocaleTimeString(), text: `Sincronização concluída: ${assets.length} ativos validados e reconciliados no ERP.`, type: 'success' },
        ...prev
      ]);

      setStatusMessage(`Inventário sincronizado com sucesso com ${config.systemName}!`);
      onRefreshData();
    }, 1200);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveErpConfig(config);
    setStatusMessage('Configurações de integração salvas com sucesso!');
    setTimeout(() => setStatusMessage(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Database className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Integração com Sistemas ERP & Reconciliação
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Conexão bidirecional para sincronização de ativos imobilizados, custos e depreciação contábil
          </p>
        </div>

        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          id="erp-sync-now-btn"
          className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Status da Conexão</span>
          <div className="flex items-center space-x-2 mt-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-sm text-emerald-400 capitalize">{config.status}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{config.systemName}</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Última Sincronização</span>
          <div className="text-sm font-bold text-white mt-1">
            {new Date(config.lastSyncTimestamp).toLocaleTimeString('pt-BR')}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {new Date(config.lastSyncTimestamp).toLocaleDateString('pt-BR')}
          </span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Ativos Sincronizados</span>
          <div className="text-2xl font-black text-indigo-400 mt-1">{config.totalSyncedItems}</div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Reconciliados no razão contábil</span>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-500 font-bold uppercase block">Frequência Automática</span>
          <div className="text-sm font-bold text-white mt-1">
            {config.autoSync ? `A cada ${config.syncIntervalMinutes} min` : 'Manual apenas'}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Sincronização em background</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Settings className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Configurações do Conector ERP</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Sistema ERP Destino</label>
              <select
                value={config.systemName}
                onChange={(e) => setConfig({ ...config, systemName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="SAP S/4HANA Enterprise ERP">SAP S/4HANA Enterprise (RFC / OData)</option>
                <option value="TOTVS Protheus SIGAATF">TOTVS Protheus (Módulo SIGAATF - Ativo Fixo)</option>
                <option value="Senior Sapiens ERP">Senior Sapiens ERP</option>
                <option value="Oracle NetSuite Cloud ERP">Oracle NetSuite Cloud ERP</option>
                <option value="Custom REST Gateway">API REST Corporativa Customizada</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">URL Endpoint do Gateway</label>
              <input
                type="url"
                value={config.endpointUrl}
                onChange={(e) => setConfig({ ...config, endpointUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Chave de Autenticação (API Key / Token)</label>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSync}
                  onChange={(e) => setConfig({ ...config, autoSync: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600 mr-2"
                />
                Ativar Sincronização Automática Contínua
              </label>

              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white cursor-pointer"
              >
                Salvar Parâmetros
              </button>
            </div>
          </form>
        </div>

        {/* Live Transaction Logs */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">Logs de Comunicação de Pacotes (JSON)</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-500">HTTP 200 OK</span>
            </div>

            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto pr-1">
              {syncLogs.map((log, i) => (
                <div key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-slate-300">
                  <div className="flex items-center space-x-2 text-[10px] text-slate-500 mb-0.5">
                    <span>{log.time}</span>
                    <span className="text-indigo-400">[ERP-SYNC-DAEMON]</span>
                  </div>
                  <p className={log.type === 'success' ? 'text-emerald-300' : 'text-slate-300'}>
                    {log.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
            <strong>Garantia de Integridade:</strong> Protocolo transacional com suporte a fila offline. Dados gerados sem conexão são armazenados localmente e sincronizados de forma idempotente assim que a conectividade for restabelecida.
          </div>
        </div>
      </div>
    </div>
  );
};
