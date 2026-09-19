import React, { useState, useEffect } from 'react';
import { User, PatrimonialAsset, MaintenanceRecord } from './types';
import { StorageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './components/DashboardView';
import { AssetsView } from './components/AssetsView';
import { RoomChargeMapView } from './components/RoomChargeMapView';
import { MaintenanceView } from './components/MaintenanceView';
import { AuditsView } from './components/AuditsView';
import { ExcelImportView } from './components/ExcelImportView';
import { ErpIntegrationView } from './components/ErpIntegrationView';
import { UsersView } from './components/UsersView';
import { AuditLogsView } from './components/AuditLogsView';
import { QrScannerModal } from './components/QrScannerModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => StorageService.getCurrentUser());
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [assets, setAssets] = useState<PatrimonialAsset[]>(() => StorageService.getAssets());
  const [maintenances, setMaintenances] = useState<MaintenanceRecord[]>(() => StorageService.getMaintenances());
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [selectedAssetIdForView, setSelectedAssetIdForView] = useState<string | null>(null);

  // Calculate pending offline queue
  const [pendingSyncCount, setPendingSyncCount] = useState(() => {
    try {
      const q = JSON.parse(localStorage.getItem('patrimonio_offline_queue_v1') || '[]');
      return q.length;
    } catch {
      return 0;
    }
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      handleTriggerSync();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const refreshAllData = () => {
    setAssets(StorageService.getAssets());
    setMaintenances(StorageService.getMaintenances());
    try {
      const q = JSON.parse(localStorage.getItem('patrimonio_offline_queue_v1') || '[]');
      setPendingSyncCount(q.length);
    } catch {
      setPendingSyncCount(0);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      StorageService.addAuditLog({
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        action: 'LOGOUT',
        entity: 'Autenticação',
        entityId: currentUser.email,
        details: 'Sessão encerrada com sucesso.'
      });
    }
    StorageService.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleToggleOffline = () => {
    setIsOffline(prev => !prev);
  };

  const handleTriggerSync = () => {
    // Process offline queue
    try {
      const q = JSON.parse(localStorage.getItem('patrimonio_offline_queue_v1') || '[]');
      if (q.length > 0) {
        localStorage.setItem('patrimonio_offline_queue_v1', '[]');
        setPendingSyncCount(0);
        
        // Update ERP config
        const erp = StorageService.getErpConfig();
        erp.lastSyncTimestamp = new Date().toISOString();
        erp.pendingSyncCount = 0;
        StorageService.saveErpConfig(erp);
      }
    } catch (e) {
      console.error(e);
    }
    refreshAllData();
  };

  const handleQrScanSuccess = (scannedCode: string) => {
    setIsScannerOpen(false);
    
    // Find asset matching this code
    const matched = assets.find(a => 
      a.code.toUpperCase() === scannedCode.toUpperCase() || 
      a.id === scannedCode
    );

    if (matched) {
      setSelectedAssetIdForView(matched.id);
      setActiveTab('assets');
    } else {
      alert(`Código lido: "${scannedCode}". Nenhum material patrimoniado corresponde a este código.`);
    }
  };

  // If not authenticated, render Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Fixed / Sticky Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        isOffline={isOffline}
        onToggleOffline={handleToggleOffline}
        pendingSyncCount={pendingSyncCount}
        onTriggerSync={handleTriggerSync}
        onNavigateToAsset={(assetId) => {
          setSelectedAssetIdForView(assetId);
          setActiveTab('assets');
        }}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Left Vertical Navigation Menu */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setSelectedAssetIdForView(null);
            setActiveTab(tab);
          }}
          userRole={currentUser.role}
          onOpenScanner={() => setIsScannerOpen(true)}
        />

        {/* Dynamic Content Screen Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              assets={assets}
              maintenances={maintenances}
              currentUser={currentUser}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onOpenScanner={() => setIsScannerOpen(true)}
              onSelectAsset={(id) => {
                setSelectedAssetIdForView(id);
                setActiveTab('assets');
              }}
            />
          )}

          {activeTab === 'assets' && (
            <AssetsView
              assets={assets}
              onRefreshAssets={refreshAllData}
              currentUser={currentUser}
              onOpenScanner={() => setIsScannerOpen(true)}
              selectedAssetIdFromUrl={selectedAssetIdForView}
            />
          )}

          {activeTab === 'room-charge-map' && (
            <RoomChargeMapView
              assets={assets}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'maintenance' && (
            <MaintenanceView
              assets={assets}
              currentUser={currentUser}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'audit-compliance' && (
            <AuditsView
              assets={assets}
              currentUser={currentUser}
              onRefreshAssets={refreshAllData}
              onOpenScanner={() => setIsScannerOpen(true)}
            />
          )}

          {activeTab === 'excel-import' && (
            <ExcelImportView
              currentUser={currentUser}
              onImportComplete={refreshAllData}
            />
          )}

          {activeTab === 'erp-sync' && (
            <ErpIntegrationView
              currentUser={currentUser}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'users' && currentUser.role === 'admin' && (
            <UsersView
              currentUser={currentUser}
              onCurrentUserUpdate={(updated) => setCurrentUser(updated)}
            />
          )}

          {activeTab === 'audit-logs' && currentUser.role === 'admin' && (
            <AuditLogsView />
          )}
        </main>
      </div>

      {/* Global QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleQrScanSuccess}
        assets={assets}
      />
    </div>
  );
}
