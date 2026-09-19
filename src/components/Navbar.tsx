import React, { useState } from 'react';
import { 
  Shield, 
  Wifi, 
  WifiOff, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Info
} from 'lucide-react';
import { User, AppNotification } from '../types';
import { StorageService } from '../services/storage';

interface NavbarProps {
  currentUser: User | null;
  onLogout: () => void;
  onOpenNotifications?: () => void;
  isOffline: boolean;
  onToggleOffline: () => void;
  pendingSyncCount: number;
  onTriggerSync: () => void;
  onNavigateToAsset?: (assetId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  isOffline,
  onToggleOffline,
  pendingSyncCount,
  onTriggerSync,
  onNavigateToAsset
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => StorageService.getNotifications());
  const [isSyncing, setIsSyncing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAllRead = () => {
    StorageService.markAllNotificationsAsRead();
    setNotifications(StorageService.getNotifications());
  };

  const handleNotificationClick = (notif: AppNotification) => {
    StorageService.markNotificationAsRead(notif.id);
    setNotifications(StorageService.getNotifications());
    if (notif.assetId && onNavigateToAsset) {
      onNavigateToAsset(notif.assetId);
      setShowNotifications(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await onTriggerSync();
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shadow-sm">
      {/* Brand / Logo */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white font-bold text-lg">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-base sm:text-lg tracking-tight text-slate-100">
              Controle Patrimonial
            </span>
            <span className="hidden sm:inline-block text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
              PRO
            </span>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Gestão de Ativos, QR Code e Rastreabilidade
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Offline / Online Status Badge & Toggle */}
        <button
          onClick={onToggleOffline}
          id="toggle-offline-mode-btn"
          title={isOffline ? "Você está trabalhando em modo Offline. Clique para reconectar." : "Conectado à nuvem corporativa. Clique para testar modo Offline."}
          className={`flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors ${
            isOffline 
              ? 'bg-amber-950/60 border-amber-600/50 text-amber-300 hover:bg-amber-900/60' 
              : 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60'
          }`}
        >
          {isOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span className="hidden md:inline">Modo Offline</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Online (ERP Sincronizado)</span>
            </>
          )}
        </button>

        {/* Pending Sync Count */}
        {pendingSyncCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={isOffline || isSyncing}
            className="flex items-center space-x-1.5 text-xs bg-indigo-950 border border-indigo-500/50 text-indigo-300 px-2.5 py-1.5 rounded-lg hover:bg-indigo-900 transition-colors disabled:opacity-50"
            title={`${pendingSyncCount} alterações pendentes de sincronização`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{pendingSyncCount} pendente{pendingSyncCount > 1 ? 's' : ''}</span>
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            id="notifications-bell-btn"
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Notificações e Avisos de Revisão"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Flyout */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden text-slate-200">
              <div className="p-3 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-slate-100">Notificações e Alertas</span>
                  {unreadCount > 0 && (
                    <span className="text-xs bg-indigo-900/60 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-700">
                      {unreadCount} novas
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Marcar lidas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-500">
                    Nenhuma notificação no momento.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 cursor-pointer hover:bg-slate-800/80 transition-colors flex items-start space-x-3 ${
                        !notif.read ? 'bg-slate-800/40' : ''
                      }`}
                    >
                      <div className="mt-0.5">
                        {notif.type === 'danger' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
                        {notif.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                        {notif.type === 'info' && <Info className="w-4 h-4 text-sky-400" />}
                        {notif.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className={`text-xs font-semibold ${!notif.read ? 'text-white' : 'text-slate-300'}`}>
                            {notif.title}
                          </p>
                          <span className="text-[10px] text-slate-500">
                            {new Date(notif.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Current User Info & Role Badge */}
        {currentUser && (
          <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                {currentUser.name}
              </div>
              <div className="flex items-center justify-end space-x-1">
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                  currentUser.role === 'admin' 
                    ? 'bg-rose-950 text-rose-300 border border-rose-800/60' 
                    : currentUser.role === 'auditor'
                    ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                }`}>
                  {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'auditor' ? 'Auditor Interno' : 'Funcionário'}
                </span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-200 border border-slate-600">
              <UserIcon className="w-4 h-4" />
            </div>

            <button
              onClick={onLogout}
              id="user-logout-btn"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-200 text-slate-400 transition-colors"
              title="Encerrar Sessão / Trocar Usuário"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
