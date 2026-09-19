export type UserRole = 'admin' | 'employee' | 'auditor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
  active: boolean;
  createdAt: string;
  lastLogin?: string;
}

export type AssetStatus = 
  | 'em_uso' 
  | 'em_manutencao' 
  | 'disponivel' 
  | 'baixado' 
  | 'em_transferencia'
  | 'danificado';

export type AssetCondition = 'novo' | 'bom' | 'regular' | 'danificado' | 'sucata';

export type AssetCategory = 
  | 'Informatica' 
  | 'Mobiliario' 
  | 'Equipamentos' 
  | 'Veiculos' 
  | 'Audiovisual' 
  | 'Laboratorio'
  | 'Ferramentas';

export interface AssetAttachment {
  id: string;
  name: string;
  type: 'image' | 'document';
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface MovementHistory {
  id: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  responsibleUser: string;
  reason: string;
}

export interface PatrimonialAsset {
  id: string;
  code: string; // Ex: PAT-2024-001
  name: string;
  description: string;
  category: AssetCategory;
  serialNumber?: string;
  brand?: string;
  model?: string;
  location: {
    building: string;
    floor: string;
    room: string;
    fullAddress: string;
    responsiblePerson: string;
  };
  status: AssetStatus;
  condition: AssetCondition;
  acquisitionDate: string;
  acquisitionValue: number;
  currentBookValue: number;
  annualDepreciationRate: number; // e.g. 10%
  supplier?: string;
  invoiceNumber?: string;
  warrantyExpiration?: string;
  attachments: AssetAttachment[];
  movementHistory: MovementHistory[];
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  qrCodeDataUrl?: string;
  rfidTag?: string;
  notes?: string;
  syncedWithErp: boolean;
  lastAuditedDate?: string;
}

export type MaintenanceType = 'preventiva' | 'corretiva' | 'calibracao';
export type MaintenanceStatus = 'agendada' | 'em_andamento' | 'concluida' | 'cancelada';

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  type: MaintenanceType;
  description: string;
  scheduledDate: string;
  completionDate?: string;
  status: MaintenanceStatus;
  priority: 'baixa' | 'media' | 'alta' | 'urgente';
  technicianOrCompany: string;
  estimatedCost: number;
  actualCost?: number;
  notes?: string;
  performedActions?: string;
  frequencyMonths?: number; // 0 for one-off, 1, 3, 6, 12 for recurring
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: 'CRIACAO' | 'EDICAO' | 'EXCLUSAO' | 'TRANSFERENCIA' | 'MANUTENCAO' | 'BAIXA' | 'IMPORTACAO_EXCEL' | 'AUDITORIA' | 'LOGIN' | 'LOGOUT';
  entity: string;
  entityId: string;
  details: string;
  ipAddress?: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  building: string;
  floor: string;
  department: string;
  responsible: string;
}

export interface RoomChargeMapItem {
  seq: number;
  assetId: string;
  code: string;
  description: string;
  brandModel: string;
  serialNumber: string;
  condition: AssetCondition;
  bookValue: number;
  checked: boolean;
}

export interface RoomChargeMap {
  id: string;
  organization?: string;
  documentTitle?: string;
  mapNumber?: string;
  roomName: string;
  building: string;
  department: string;
  responsibleName: string;
  responsibleRole: string;
  generatedDate: string;
  items: RoomChargeMapItem[];
  digitalSignatureDataUrl?: string;
  signedAt?: string;
  signatureHash?: string;
  status: 'rascunho' | 'conferido' | 'assinado';
}

export interface InternalAuditItem {
  assetId: string;
  assetCode: string;
  assetName: string;
  expectedRoom: string;
  scannedRoom?: string;
  status: 'conforme' | 'divergente_sala' | 'nao_encontrado' | 'avaria_identificada';
  auditDate: string;
  auditorName: string;
  notes?: string;
}

export interface ErpSyncConfig {
  systemName: string; // 'SAP S/4HANA' | 'TOTVS Protheus' | 'Senior Sapiens' | 'REST Genérico'
  endpointUrl: string;
  apiKey: string;
  autoSync: boolean;
  syncIntervalMinutes: number;
  lastSyncTimestamp: string;
  status: 'conectado' | 'erro' | 'sincronizando' | 'offline';
  totalSyncedItems: number;
  pendingSyncCount: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  date: string;
  read: boolean;
  assetId?: string;
  link?: string;
}
