import { 
  PatrimonialAsset, 
  User, 
  MaintenanceRecord, 
  AuditLogEntry, 
  ErpSyncConfig, 
  AppNotification, 
  RoomChargeMap,
  RoomInfo 
} from '../types';
import { 
  INITIAL_ASSETS, 
  INITIAL_USERS, 
  INITIAL_MAINTENANCES, 
  INITIAL_AUDIT_LOGS, 
  INITIAL_ERP_CONFIG, 
  INITIAL_NOTIFICATIONS,
  INITIAL_ROOMS 
} from '../data/initialData';

const KEYS = {
  ASSETS: 'patrimonio_assets_v1',
  USERS: 'patrimonio_users_v1',
  MAINTENANCES: 'patrimonio_maintenances_v1',
  AUDIT_LOGS: 'patrimonio_audit_logs_v1',
  ERP_CONFIG: 'patrimonio_erp_config_v1',
  NOTIFICATIONS: 'patrimonio_notifications_v1',
  ROOM_MAPS: 'patrimonio_room_maps_v1',
  ROOMS: 'patrimonio_rooms_v1',
  CURRENT_USER: 'patrimonio_current_user_v1',
  OFFLINE_QUEUE: 'patrimonio_offline_queue_v1',
  SIMULATED_OFFLINE: 'patrimonio_simulated_offline_v1'
};

export class StorageService {
  // --- USERS & AUTH ---
  static getUsers(): User[] {
    const data = localStorage.getItem(KEYS.USERS);
    if (!data) {
      localStorage.setItem(KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    return JSON.parse(data);
  }

  static saveUsers(users: User[]): void {
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  }

  static getCurrentUser(): User | null {
    const data = localStorage.getItem(KEYS.CURRENT_USER);
    if (!data) {
      // Default to admin for instant seamless experience
      const defaultUser = INITIAL_USERS[0];
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(data);
  }

  static setCurrentUser(user: User | null): void {
    if (user) {
      localStorage.setItem(KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEYS.CURRENT_USER);
    }
  }

  // --- ASSETS ---
  static getAssets(): PatrimonialAsset[] {
    const data = localStorage.getItem(KEYS.ASSETS);
    if (!data) {
      localStorage.setItem(KEYS.ASSETS, JSON.stringify(INITIAL_ASSETS));
      return INITIAL_ASSETS;
    }
    return JSON.parse(data);
  }

  static saveAssets(assets: PatrimonialAsset[]): void {
    localStorage.setItem(KEYS.ASSETS, JSON.stringify(assets));
  }

  static getAssetByCode(code: string): PatrimonialAsset | undefined {
    const assets = this.getAssets();
    const cleanCode = code.trim().toLowerCase();
    return assets.find(a => a.code.toLowerCase() === cleanCode || a.id.toLowerCase() === cleanCode);
  }

  static saveAsset(asset: PatrimonialAsset, user: User, isNew = false): void {
    const assets = this.getAssets();
    let updatedAssets: PatrimonialAsset[];

    if (isNew) {
      updatedAssets = [asset, ...assets];
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'CRIACAO',
        entity: 'Patrimonio',
        entityId: asset.code,
        details: `Novo ativo "${asset.name}" cadastrado na sala ${asset.location.room}. Valor: R$ ${asset.acquisitionValue.toFixed(2)}.`
      });
    } else {
      updatedAssets = assets.map(a => (a.id === asset.id ? asset : a));
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'EDICAO',
        entity: 'Patrimonio',
        entityId: asset.code,
        details: `Ativo "${asset.name}" atualizado. Status: ${asset.status}, Local: ${asset.location.room}.`
      });
    }

    this.saveAssets(updatedAssets);
    this.enqueueSync({ action: isNew ? 'CREATE_ASSET' : 'UPDATE_ASSET', data: asset });
  }

  static deleteAsset(assetId: string, user: User): boolean {
    const assets = this.getAssets();
    const target = assets.find(a => a.id === assetId);
    if (!target) return false;

    const filtered = assets.filter(a => a.id !== assetId);
    this.saveAssets(filtered);

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'EXCLUSAO',
      entity: 'Patrimonio',
      entityId: target.code,
      details: `Ativo "${target.name}" (${target.code}) removido do sistema patrimonial.`
    });

    this.enqueueSync({ action: 'DELETE_ASSET', data: { id: assetId, code: target.code } });
    return true;
  }

  // --- MAINTENANCES ---
  static getMaintenances(): MaintenanceRecord[] {
    const data = localStorage.getItem(KEYS.MAINTENANCES);
    if (!data) {
      localStorage.setItem(KEYS.MAINTENANCES, JSON.stringify(INITIAL_MAINTENANCES));
      return INITIAL_MAINTENANCES;
    }
    return JSON.parse(data);
  }

  static saveMaintenances(records: MaintenanceRecord[]): void {
    localStorage.setItem(KEYS.MAINTENANCES, JSON.stringify(records));
  }

  static saveMaintenance(record: MaintenanceRecord, user: User, isNew = false): void {
    const list = this.getMaintenances();
    let updated: MaintenanceRecord[];
    if (isNew) {
      updated = [record, ...list];
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'MANUTENCAO',
        entity: 'Manutencao',
        entityId: record.assetCode,
        details: `Nova manutenção agendada (${record.type}) para o ativo ${record.assetCode}. Data: ${record.scheduledDate}.`
      });
    } else {
      updated = list.map(m => (m.id === record.id ? record : m));
      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'MANUTENCAO',
        entity: 'Manutencao',
        entityId: record.assetCode,
        details: `Manutenção do ativo ${record.assetCode} atualizada para status: ${record.status}.`
      });
    }
    this.saveMaintenances(updated);

    // If completed, update the asset lastMaintenanceDate and status if needed
    if (record.status === 'concluida') {
      const assets = this.getAssets();
      const targetAsset = assets.find(a => a.id === record.assetId);
      if (targetAsset) {
        targetAsset.lastMaintenanceDate = record.completionDate || new Date().toISOString().split('T')[0];
        if (targetAsset.status === 'em_manutencao') {
          targetAsset.status = 'em_uso';
        }
        this.saveAssets(assets);
      }
    }
  }

  // --- AUDIT LOGS ---
  static getAuditLogs(): AuditLogEntry[] {
    const data = localStorage.getItem(KEYS.AUDIT_LOGS);
    if (!data) {
      localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
      return INITIAL_AUDIT_LOGS;
    }
    return JSON.parse(data);
  }

  static addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLogEntry = {
      ...entry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.10.45'
    };
    const updated = [newLog, ...logs].slice(0, 500); // keep last 500
    localStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(updated));
  }

  // --- ROOM CHARGE MAPS ---
  static getRoomMaps(): RoomChargeMap[] {
    const data = localStorage.getItem(KEYS.ROOM_MAPS);
    return data ? JSON.parse(data) : [];
  }

  static saveRoomMap(map: RoomChargeMap): void {
    const maps = this.getRoomMaps();
    const existingIndex = maps.findIndex(m => m.id === map.id);
    let updated: RoomChargeMap[];
    if (existingIndex >= 0) {
      updated = [...maps];
      updated[existingIndex] = map;
    } else {
      updated = [map, ...maps];
    }
    localStorage.setItem(KEYS.ROOM_MAPS, JSON.stringify(updated));
  }

  // --- NOTIFICATIONS ---
  static getNotifications(): AppNotification[] {
    const data = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (!data) {
      localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    return JSON.parse(data);
  }

  static markNotificationAsRead(id: string): void {
    const list = this.getNotifications();
    const updated = list.map(n => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  static markAllNotificationsAsRead(): void {
    const list = this.getNotifications();
    const updated = list.map(n => ({ ...n, read: true }));
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(updated));
  }

  // --- ERP CONFIG ---
  static getErpConfig(): ErpSyncConfig {
    const data = localStorage.getItem(KEYS.ERP_CONFIG);
    if (!data) {
      localStorage.setItem(KEYS.ERP_CONFIG, JSON.stringify(INITIAL_ERP_CONFIG));
      return INITIAL_ERP_CONFIG;
    }
    return JSON.parse(data);
  }

  static saveErpConfig(config: ErpSyncConfig): void {
    localStorage.setItem(KEYS.ERP_CONFIG, JSON.stringify(config));
  }

  // --- OFFLINE & QUEUE ---
  static isSimulatedOffline(): boolean {
    return localStorage.getItem(KEYS.SIMULATED_OFFLINE) === 'true';
  }

  static setSimulatedOffline(val: boolean): void {
    localStorage.setItem(KEYS.SIMULATED_OFFLINE, val ? 'true' : 'false');
  }

  static getOfflineQueue(): any[] {
    const data = localStorage.getItem(KEYS.OFFLINE_QUEUE);
    return data ? JSON.parse(data) : [];
  }

  static enqueueSync(item: { action: string; data: any }): void {
    const queue = this.getOfflineQueue();
    queue.push({
      ...item,
      id: `sync-${Date.now()}`,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem(KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  }

  static clearOfflineQueue(): void {
    localStorage.removeItem(KEYS.OFFLINE_QUEUE);
  }

  static getRoomsList(): RoomInfo[] {
    const data = localStorage.getItem(KEYS.ROOMS);
    if (!data) {
      localStorage.setItem(KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS));
      return INITIAL_ROOMS;
    }
    return JSON.parse(data);
  }

  static saveRoomsList(rooms: RoomInfo[]): void {
    localStorage.setItem(KEYS.ROOMS, JSON.stringify(rooms));
  }

  static updateRoomResponsible(roomId: string, newResponsible: string, user: User): RoomInfo[] {
    const rooms = this.getRoomsList();
    const targetRoom = rooms.find(r => r.id === roomId);
    const oldResponsible = targetRoom ? targetRoom.responsible : '';
    
    const updated = rooms.map(r => 
      r.id === roomId ? { ...r, responsible: newResponsible } : r
    );
    this.saveRoomsList(updated);

    // Also update responsible in assets located in this room
    if (targetRoom) {
      const assets = this.getAssets();
      let assetsUpdated = false;
      const updatedAssets = assets.map(a => {
        if (a.location.room === targetRoom.name) {
          assetsUpdated = true;
          return {
            ...a,
            location: {
              ...a.location,
              responsiblePerson: newResponsible
            }
          };
        }
        return a;
      });

      if (assetsUpdated) {
        this.saveAssets(updatedAssets);
      }

      this.addAuditLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: 'EDICAO',
        entity: 'Mapa Carga / Salas',
        entityId: targetRoom.name,
        details: `Responsável da sala "${targetRoom.name}" alterado de "${oldResponsible}" para "${newResponsible}".`
      });
    }

    return updated;
  }
}
