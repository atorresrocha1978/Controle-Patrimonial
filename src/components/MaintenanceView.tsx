import React, { useState } from 'react';
import { 
  Wrench, 
  Calendar, 
  Clock, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  UserCheck, 
  DollarSign, 
  Send, 
  Filter, 
  Check, 
  X 
} from 'lucide-react';
import { MaintenanceRecord, PatrimonialAsset, User } from '../types';
import { StorageService } from '../services/storage';

interface MaintenanceViewProps {
  assets: PatrimonialAsset[];
  currentUser: User;
  onRefreshData: () => void;
}

export const MaintenanceView: React.FC<MaintenanceViewProps> = ({
  assets,
  currentUser,
  onRefreshData
}) => {
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>(() => StorageService.getMaintenances());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [notificationSuccess, setNotificationSuccess] = useState('');

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState(assets[0]?.id || '');
  const [type, setType] = useState<'preventiva' | 'corretiva' | 'calibracao'>('preventiva');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]);
  const [priority, setPriority] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');
  const [technician, setTechnician] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(500);
  const [frequencyMonths, setFrequencyMonths] = useState<number>(6);

  const filteredList = maintenances.filter(m => statusFilter === 'all' || m.status === statusFilter);

  // Save new maintenance
  const handleCreateMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    const newRecord: MaintenanceRecord = {
      id: `mnt-${Date.now()}`,
      assetId: asset.id,
      assetCode: asset.code,
      assetName: asset.name,
      type,
      description,
      scheduledDate,
      status: 'agendada',
      priority,
      technicianOrCompany: technician || 'Equipe Técnica Interna',
      estimatedCost: Number(estimatedCost) || 0,
      frequencyMonths
    };

    StorageService.saveMaintenance(newRecord, currentUser, true);
    
    // Auto-create notification for the room custodian
    const notifs = StorageService.getNotifications();
    notifs.unshift({
      id: `notif-${Date.now()}`,
      title: `Revisão Agendada: ${asset.code}`,
      message: `Manutenção ${type} programada para ${scheduledDate} no item "${asset.name}". Responsável da sala: ${asset.location.responsiblePerson}.`,
      type: 'warning',
      date: new Date().toISOString(),
      read: false,
      assetId: asset.id
    });
    localStorage.setItem('patrimonio_notifications_v1', JSON.stringify(notifs));

    setMaintenances(StorageService.getMaintenances());
    setIsNewModalOpen(false);
    setDescription('');
    onRefreshData();
  };

  // Mark maintenance status
  const handleUpdateStatus = (record: MaintenanceRecord, newStatus: MaintenanceRecord['status']) => {
    const updated: MaintenanceRecord = {
      ...record,
      status: newStatus,
      completionDate: newStatus === 'concluida' ? new Date().toISOString().split('T')[0] : record.completionDate,
      actualCost: newStatus === 'concluida' ? (record.actualCost || record.estimatedCost) : record.actualCost
    };
    StorageService.saveMaintenance(updated, currentUser, false);
    setMaintenances(StorageService.getMaintenances());
    onRefreshData();
  };

  // Trigger automated notification dispatch to room managers
  const handleDispatchNotificationAlerts = () => {
    const pendingList = maintenances.filter(m => m.status === 'agendada');
    const notifs = StorageService.getNotifications();

    pendingList.forEach(item => {
      const asset = assets.find(a => a.id === item.assetId);
      notifs.unshift({
        id: `notif-disp-${Date.now()}-${item.id}`,
        title: `Lembrete de Manutenção: ${item.assetCode}`,
        message: `Atenção: A revisão periódica do material "${item.assetName}" está agendada para ${item.scheduledDate}. Técnico designado: ${item.technicianOrCompany}.`,
        type: 'info',
        date: new Date().toISOString(),
        read: false,
        assetId: item.assetId
      });
    });

    localStorage.setItem('patrimonio_notifications_v1', JSON.stringify(notifs));
    setNotificationSuccess(`Disparo automático concluído: ${pendingList.length} avisos de revisão enviados aos responsáveis de sala.`);
    setTimeout(() => setNotificationSuccess(''), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Wrench className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Gestão de Manutenções Periódicas
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Planejamento de revisões preventivas, controle de custos e notificações automáticas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDispatchNotificationAlerts}
            id="dispatch-maintenance-alerts-btn"
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-xs font-semibold border border-indigo-500/30 transition-colors"
            title="Enviar lembretes automáticos para os responsáveis de sala"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Disparar Avisos aos Responsáveis</span>
          </button>

          <button
            onClick={() => setIsNewModalOpen(true)}
            id="new-maintenance-btn"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Agendar Revisão</span>
          </button>
        </div>
      </div>

      {notificationSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notificationSuccess}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex items-center space-x-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-xs">
        <span className="text-slate-400 font-medium">Filtrar por Status:</span>
        <div className="flex gap-1.5">
          {['all', 'agendada', 'em_andamento', 'concluida'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'all' ? 'Todas' : st === 'agendada' ? 'Agendadas' : st === 'em_andamento' ? 'Em Andamento' : 'Concluídas'}
            </button>
          ))}
        </div>
      </div>

      {/* Maintenance Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredList.length === 0 ? (
          <div className="col-span-full bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Wrench className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma manutenção encontrada</p>
          </div>
        ) : (
          filteredList.map((rec) => {
            const asset = assets.find(a => a.id === rec.assetId);
            return (
              <div
                key={rec.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono font-bold text-xs text-indigo-400">
                      {rec.assetCode}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        rec.priority === 'urgente' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        rec.priority === 'alta' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        Prioridade {rec.priority}
                      </span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        rec.status === 'concluida' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        rec.status === 'em_andamento' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {rec.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-white">{rec.assetName}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{rec.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Data Agendada</span>
                      <span className="font-semibold text-slate-200">{rec.scheduledDate}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Periodicidade</span>
                      <span className="font-semibold text-slate-200">
                        {rec.frequencyMonths ? `A cada ${rec.frequencyMonths} meses` : 'Revisão Pontual'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Prestador Técnico</span>
                      <span className="font-semibold text-slate-200 truncate block">{rec.technicianOrCompany}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Custo Estimado</span>
                      <span className="font-semibold text-emerald-400">R$ {rec.estimatedCost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Status action buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <div className="text-[11px] text-slate-500">
                    Local: {asset ? asset.location.room : 'N/A'}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {rec.status !== 'em_andamento' && rec.status !== 'concluida' && (
                      <button
                        onClick={() => handleUpdateStatus(rec, 'em_andamento')}
                        className="px-2.5 py-1 rounded-lg bg-sky-950 text-sky-300 border border-sky-800 hover:bg-sky-900 font-medium"
                      >
                        Iniciar Serviço
                      </button>
                    )}
                    {rec.status !== 'concluida' && (
                      <button
                        onClick={() => handleUpdateStatus(rec, 'concluida')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 font-medium"
                      >
                        Concluir e Liberar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL DE AGENDAMENTO --- */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">Agendar Revisão Preventiva / Corretiva</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMaintenance} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Selecionar Material Patrimoniado*</label>
                <select
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} - {a.name} ({a.location.room})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tipo de Serviço</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="preventiva">Preventiva Periódica</option>
                    <option value="corretiva">Corretiva / Reparo</option>
                    <option value="calibracao">Calibração e Aferição</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Prioridade</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição do Escopo / Problema*</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Troca de filtros de ar, lubrificação de rolamentos e teste de carga..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Data Agendada*</label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Recorrência</label>
                  <select
                    value={frequencyMonths}
                    onChange={(e) => setFrequencyMonths(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value={0}>Pontual (Única vez)</option>
                    <option value={1}>Mensal (30 dias)</option>
                    <option value={3}>Trimestral (90 dias)</option>
                    <option value={6}>Semestral (180 dias)</option>
                    <option value={12}>Anual (365 dias)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Custo Est. (R$)</label>
                  <input
                    type="number"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Técnico / Empresa Responsável</label>
                <input
                  type="text"
                  value={technician}
                  onChange={(e) => setTechnician(e.target.value)}
                  placeholder="Ex: Dell Enterprise Services / Schneider Autorizada"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
