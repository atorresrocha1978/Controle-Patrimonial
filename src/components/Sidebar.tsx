import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Wrench, 
  CheckSquare, 
  FileSpreadsheet, 
  Database, 
  History, 
  Users, 
  QrCode,
  Building2
} from 'lucide-react';
import { UserRole } from '../types';

export type ActiveTab = 
  | 'dashboard' 
  | 'assets' 
  | 'room-charge-map' 
  | 'maintenance' 
  | 'audit-compliance' 
  | 'excel-import' 
  | 'erp-sync' 
  | 'audit-logs' 
  | 'users';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole?: UserRole;
  onOpenScanner: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole = 'employee',
  onOpenScanner
}) => {
  const menuItems = [
    {
      id: 'dashboard' as ActiveTab,
      label: 'Painel & Preditivo',
      icon: LayoutDashboard,
      description: 'KPIs e análise preditiva',
      allowedRoles: ['admin', 'employee', 'auditor']
    },
    {
      id: 'assets' as ActiveTab,
      label: 'Materiais & Ativos',
      icon: Package,
      description: 'Inventário e rastreio QR',
      allowedRoles: ['admin', 'employee', 'auditor']
    },
    {
      id: 'room-charge-map' as ActiveTab,
      label: 'Mapa Carga da Sala',
      icon: FileText,
      description: 'Termo e assinatura digital',
      allowedRoles: ['admin', 'employee', 'auditor']
    },
    {
      id: 'maintenance' as ActiveTab,
      label: 'Gestão Manutenções',
      icon: Wrench,
      description: 'Revisões e periodicidade',
      allowedRoles: ['admin', 'employee', 'auditor']
    },
    {
      id: 'audit-compliance' as ActiveTab,
      label: 'Auditoria & Conformidade',
      icon: CheckSquare,
      description: 'Conferência física',
      allowedRoles: ['admin', 'employee', 'auditor']
    },
    {
      id: 'excel-import' as ActiveTab,
      label: 'Importação em Lote',
      icon: FileSpreadsheet,
      description: 'Upload planilha Excel',
      allowedRoles: ['admin', 'employee']
    },
    {
      id: 'erp-sync' as ActiveTab,
      label: 'Integração ERP',
      icon: Database,
      description: 'Sincronização automática',
      allowedRoles: ['admin', 'employee', 'auditor']
    },
    {
      id: 'audit-logs' as ActiveTab,
      label: 'Logs de Auditoria',
      icon: History,
      description: 'Histórico de alterações',
      allowedRoles: ['admin', 'auditor']
    },
    {
      id: 'users' as ActiveTab,
      label: 'Gestão de Usuários',
      icon: Users,
      description: 'Permissões e perfis',
      allowedRoles: ['admin']
    }
  ];

  const filteredItems = menuItems.filter(item => item.allowedRoles.includes(userRole));

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      <div className="p-3 space-y-3">
        {/* Quick QR Code Scanner Button */}
        <button
          onClick={onOpenScanner}
          id="sidebar-qr-scanner-btn"
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-2.5 px-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-indigo-900/30 transition-all active:scale-[0.98]"
        >
          <QrCode className="w-4 h-4" />
          <span className="text-xs tracking-wide">Escanear Código QR</span>
        </button>

        {/* Menu Navigation */}
        <nav className="space-y-1">
          <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Navegação Principal
          </div>
          {filteredItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                id={`sidebar-tab-${item.id}`}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs leading-tight truncate">{item.label}</div>
                  <div className={`text-[10px] leading-tight truncate ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {item.description}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 text-slate-400 text-xs">
        <div className="flex items-center space-x-2 mb-1 text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-[11px]">Unidade Matriz Central</span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Patrimônio Integrado & Rastreamento em Tempo Real
        </p>
      </div>
    </aside>
  );
};
