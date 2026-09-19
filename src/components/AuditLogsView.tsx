import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldAlert, 
  Clock, 
  User, 
  Activity,
  ArrowRight,
  Download,
  FileText,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { StorageService } from '../services/storage';
import { AuditLogEntry } from '../types';
import { PdfGeneratorService } from '../services/pdfGenerator';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => StorageService.getAuditLogs());
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [notification, setNotification] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = actionFilter === 'all' || log.action === actionFilter;

    return matchesSearch && matchesAction;
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleGeneratePdf = (onlyFiltered: boolean = true) => {
    const targetLogs = onlyFiltered ? filteredLogs : logs;
    if (targetLogs.length === 0) {
      showNotification('Nenhum registro de auditoria disponível para exportação.');
      return;
    }

    PdfGeneratorService.generateAuditLogsPdf(targetLogs, {
      searchTerm: onlyFiltered ? searchTerm : undefined,
      actionFilter: onlyFiltered ? actionFilter : undefined
    });

    showNotification(
      `Relatório em PDF com ${targetLogs.length} registro(s) gerado e baixado com sucesso!`
    );
  };

  const exportLogsAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Trilha_Auditoria_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Arquivo JSON da trilha de auditoria exportado com sucesso!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <History className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Trilha de Auditoria & Registro de Alterações (Audit Log)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rastreamento completo e imutável de criação, modificação, transferência e exclusão de materiais
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleGeneratePdf(true)}
            id="download-pdf-btn"
            title="Gerar e baixar relatório em PDF dos logs atuais"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>Gerar & Baixar PDF ({filteredLogs.length})</span>
          </button>

          {filteredLogs.length !== logs.length && (
            <button
              onClick={() => handleGeneratePdf(false)}
              id="download-all-pdf-btn"
              title="Gerar e baixar PDF com todos os registros de auditoria"
              className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Baixar Todos ({logs.length})</span>
            </button>
          )}

          <button
            onClick={exportLogsAsJson}
            title="Exportar arquivo em formato JSON"
            className="flex items-center space-x-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Exportar JSON</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2 shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Audit Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Total de Eventos</div>
          <div className="text-lg font-bold text-white mt-0.5">{logs.length}</div>
        </div>
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-emerald-400">Criações</div>
          <div className="text-lg font-bold text-emerald-300 mt-0.5">
            {logs.filter(l => l.action === 'CRIACAO').length}
          </div>
        </div>
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-amber-400">Edições</div>
          <div className="text-lg font-bold text-amber-300 mt-0.5">
            {logs.filter(l => l.action === 'EDICAO').length}
          </div>
        </div>
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
          <div className="text-[10px] uppercase font-semibold text-rose-400">Exclusões / Baixas</div>
          <div className="text-lg font-bold text-rose-300 mt-0.5">
            {logs.filter(l => l.action === 'EXCLUSAO' || l.action === 'BAIXA').length}
          </div>
        </div>
        <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-semibold text-sky-400">Transferências</div>
          <div className="text-lg font-bold text-sky-300 mt-0.5">
            {logs.filter(l => l.action === 'TRANSFERENCIA').length}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por responsável, número de patrimônio ou palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <span className="text-slate-400 font-medium whitespace-nowrap">Ação:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer text-xs"
          >
            <option value="all">Todas as Ações</option>
            <option value="CRIACAO">Criação</option>
            <option value="EDICAO">Edição</option>
            <option value="EXCLUSAO">Exclusão</option>
            <option value="TRANSFERENCIA">Transferência</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="IMPORTACAO_EXCEL">Importação Excel</option>
            <option value="AUDITORIA">Auditoria</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Data / Hora</th>
                <th className="py-3 px-4">Usuário Responsável</th>
                <th className="py-3 px-4 text-center">Tipo de Ação</th>
                <th className="py-3 px-4">Entidade Afetada</th>
                <th className="py-3 px-4">Descrição da Alteração</th>
                <th className="py-3 px-4 text-right">Endereço IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    Nenhum registro de log encontrado para os critérios selecionados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{log.userName}</div>
                      <div className="text-[10px] text-slate-500 uppercase">{log.userRole}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.action === 'CRIACAO' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        log.action === 'EXCLUSAO' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        log.action === 'TRANSFERENCIA' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                        log.action === 'IMPORTACAO_EXCEL' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                      {log.entityId}
                    </td>
                    <td className="py-3 px-4 text-slate-300 leading-relaxed max-w-md">
                      {log.details}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-500">
                      {log.ipAddress || '192.168.10.45'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
