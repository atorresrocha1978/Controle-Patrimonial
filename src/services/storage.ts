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
    try {
      const users: User[] = JSON.parse(data);
      // Ensure default users from INITIAL_USERS are included if missing (like new Detentor Executivo)
      let updated = false;
      INITIAL_USERS.forEach(initUser => {
        if (!users.some(u => u.id === initUser.id || u.email === initUser.email)) {
          users.push(initUser);
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      }
      return users;
    } catch {
      return INITIAL_USERS;
    }
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
    try {
      const parsed: PatrimonialAsset[] = JSON.parse(data);
      // Normalize statuses to only: 'em_uso' | 'disponivel' | 'descarga'
      // Normalize conditions to only: 'novo' | 'bom' | 'danificado'
      let modified = false;
      const normalized = parsed.map(asset => {
        let status = asset.status;
        if (status === ('em_manutencao' as any) || status === ('danificado' as any) || status === ('em_transferencia' as any)) {
          status = 'em_uso';
          modified = true;
        } else if (status === ('baixado' as any)) {
          status = 'descarga';
          modified = true;
        } else if (status !== 'em_uso' && status !== 'disponivel' && status !== 'descarga') {
          status = 'em_uso';
          modified = true;
        }

        let condition = asset.condition;
        if ((condition as any) === 'regular') {
          condition = 'bom';
          modified = true;
        } else if ((condition as any) === 'sucata') {
          condition = 'danificado';
          modified = true;
        } else if (condition !== 'novo' && condition !== 'bom' && condition !== 'danificado') {
          condition = 'bom';
          modified = true;
        }

        return { ...asset, status, condition };
      });
      if (modified) {
        localStorage.setItem(KEYS.ASSETS, JSON.stringify(normalized));
      }
      return normalized;
    } catch {
      return INITIAL_ASSETS;
    }
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
        targetAsset.status = 'em_uso';
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

  static addRoom(roomData: Omit<RoomInfo, 'id'>, user: User): RoomInfo {
    const rooms = this.getRoomsList();
    const newRoom: RoomInfo = {
      id: `sala-${Date.now()}`,
      name: roomData.name.trim(),
      building: roomData.building.trim(),
      floor: roomData.floor.trim(),
      department: roomData.department.trim(),
      responsible: roomData.responsible.trim()
    };
    const updated = [...rooms, newRoom];
    this.saveRoomsList(updated);

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CRIACAO',
      entity: 'Salas / Locais',
      entityId: newRoom.name,
      details: `Sala "${newRoom.name}" (${newRoom.building}, ${newRoom.floor}) cadastrada com responsável "${newRoom.responsible}".`
    });

    return newRoom;
  }

  static updateRoom(roomId: string, data: Partial<Omit<RoomInfo, 'id'>>, user: User): RoomInfo[] {
    const rooms = this.getRoomsList();
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return rooms;

    const oldName = targetRoom.name;
    const oldResponsible = targetRoom.responsible;
    const updatedRoom: RoomInfo = {
      ...targetRoom,
      name: data.name !== undefined ? data.name.trim() : targetRoom.name,
      building: data.building !== undefined ? data.building.trim() : targetRoom.building,
      floor: data.floor !== undefined ? data.floor.trim() : targetRoom.floor,
      department: data.department !== undefined ? data.department.trim() : targetRoom.department,
      responsible: data.responsible !== undefined ? data.responsible.trim() : targetRoom.responsible,
    };

    const updatedRooms = rooms.map(r => r.id === roomId ? updatedRoom : r);
    this.saveRoomsList(updatedRooms);

    // Sync assets if room name, building, floor or responsible changed
    const assets = this.getAssets();
    let assetsChanged = false;
    const updatedAssets = assets.map(a => {
      if (a.location.room === oldName) {
        assetsChanged = true;
        return {
          ...a,
          location: {
            ...a.location,
            room: updatedRoom.name,
            building: updatedRoom.building,
            floor: updatedRoom.floor,
            responsiblePerson: updatedRoom.responsible
          }
        };
      }
      return a;
    });

    if (assetsChanged) {
      this.saveAssets(updatedAssets);
    }

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'EDICAO',
      entity: 'Salas / Locais',
      entityId: updatedRoom.name,
      details: `Sala "${updatedRoom.name}" atualizada (Prédio: ${updatedRoom.building}, Andar: ${updatedRoom.floor}, Setor: ${updatedRoom.department}, Resp: ${updatedRoom.responsible}). Anterior: "${oldName}" (Resp: ${oldResponsible}).`
    });

    return updatedRooms;
  }

  static deleteRoom(roomId: string, user: User): { updatedRooms: RoomInfo[]; affectedAssetsCount: number } {
    const rooms = this.getRoomsList();
    const targetRoom = rooms.find(r => r.id === roomId);
    if (!targetRoom) return { updatedRooms: rooms, affectedAssetsCount: 0 };

    const assets = this.getAssets();
    const affectedAssets = assets.filter(a => a.location.room === targetRoom.name);

    const updatedRooms = rooms.filter(r => r.id !== roomId);
    this.saveRoomsList(updatedRooms);

    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'EXCLUSAO',
      entity: 'Salas / Locais',
      entityId: targetRoom.name,
      details: `Sala/Local "${targetRoom.name}" (${targetRoom.building}, Resp: ${targetRoom.responsible}) foi excluída. Bens afetados: ${affectedAssets.length}.`
    });

    return { updatedRooms, affectedAssetsCount: affectedAssets.length };
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
