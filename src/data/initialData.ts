import { PatrimonialAsset, User, MaintenanceRecord, AuditLogEntry, ErpSyncConfig, AppNotification } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Carlos Alberto Silva',
    email: 'admin@empresa.com.br',
    role: 'admin',
    department: 'Patrimônio & Controladoria',
    active: true,
    createdAt: '2025-01-10T08:00:00Z',
    lastLogin: '2026-09-19T08:30:00Z'
  },
  {
    id: 'usr-2',
    name: 'Mariana Duarte Souza',
    email: 'mariana.souza@empresa.com.br',
    role: 'employee',
    department: 'Tecnologia da Informação',
    active: true,
    createdAt: '2025-03-15T09:30:00Z',
    lastLogin: '2026-09-18T16:45:00Z'
  },
  {
    id: 'usr-3',
    name: 'Roberto Mendes Neves',
    email: 'roberto.auditor@empresa.com.br',
    role: 'auditor',
    department: 'Auditoria e Compliance',
    active: true,
    createdAt: '2025-02-20T10:00:00Z',
    lastLogin: '2026-09-19T07:15:00Z'
  },
  {
    id: 'usr-4',
    name: 'Juliana Costa Lima',
    email: 'juliana.costa@empresa.com.br',
    role: 'employee',
    department: 'Operações e Logística',
    active: true,
    createdAt: '2025-05-11T14:20:00Z',
    lastLogin: '2026-09-17T11:00:00Z'
  }
];

export const INITIAL_ROOMS = [
  { id: 'sala-101', name: 'Laboratório de TI 101', building: 'Bloco A - Engenharia', floor: '1º Andar', department: 'Tecnologia da Informação', responsible: 'Mariana Duarte Souza' },
  { id: 'sala-102', name: 'Sala de Reuniões Executiva', building: 'Bloco A - Engenharia', floor: '1º Andar', department: 'Diretoria Geral', responsible: 'Carlos Alberto Silva' },
  { id: 'sala-201', name: 'Centro de Operações de Rede (NOC)', building: 'Bloco A - Engenharia', floor: '2º Andar', department: 'Infraestrutura de TI', responsible: 'Mariana Duarte Souza' },
  { id: 'sala-202', name: 'Almoxarifado Central', building: 'Bloco B - Logística', floor: 'Térreo', department: 'Operações e Logística', responsible: 'Juliana Costa Lima' },
  { id: 'sala-301', name: 'Laboratório Químico & P&D', building: 'Bloco C - Pesquisa', floor: '3º Andar', department: 'Pesquisa & Desenvolvimento', responsible: 'Dra. Fernanda Lins' },
  { id: 'sala-401', name: 'Departamento Financeiro', building: 'Bloco A - Engenharia', floor: '4º Andar', department: 'Controladoria & Finanças', responsible: 'Roberto Mendes Neves' }
];

export const INITIAL_ASSETS: PatrimonialAsset[] = [
  {
    id: 'ast-001',
    code: 'PAT-2024-001',
    name: 'Notebook Dell Latitude 5440 i7 32GB',
    description: 'Notebook corporativo de alta performance com processador Intel Core i7 13ª Geração, SSD 1TB NVMe e 32GB RAM.',
    category: 'Informatica',
    brand: 'Dell',
    model: 'Latitude 5440',
    serialNumber: 'BR-DELL-89412',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '1º Andar',
      room: 'Laboratório de TI 101',
      fullAddress: 'Bloco A, 1º Andar, Sala 101',
      responsiblePerson: 'Mariana Duarte Souza'
    },
    status: 'em_uso',
    condition: 'novo',
    acquisitionDate: '2024-02-15',
    acquisitionValue: 6850.00,
    currentBookValue: 5822.50,
    annualDepreciationRate: 20,
    supplier: 'Dell Computadores do Brasil Ltda',
    invoiceNumber: 'NF-e 847291',
    warrantyExpiration: '2027-02-15',
    attachments: [
      {
        id: 'att-1',
        name: 'nota_fiscal_dell.pdf',
        type: 'document',
        size: 245000,
        dataUrl: '',
        uploadedAt: '2024-02-16T10:00:00Z'
      }
    ],
    movementHistory: [
      {
        id: 'mov-1',
        date: '2024-02-16',
        fromLocation: 'Almoxarifado Central',
        toLocation: 'Laboratório de TI 101',
        responsibleUser: 'Carlos Alberto Silva',
        reason: 'Alocação inicial para desenvolvedor sênior'
      }
    ],
    lastMaintenanceDate: '2024-08-10',
    nextMaintenanceDate: '2026-10-15',
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20',
    notes: 'Equipamento em perfeito estado, selo lacre preservado.'
  },
  {
    id: 'ast-002',
    code: 'PAT-2024-002',
    name: 'Servidor Rack Dell PowerEdge R750',
    description: 'Servidor dual Xeon Silver, 128GB RAM, 8x SAS 2.4TB RAID 10, redundância de fontes.',
    category: 'Informatica',
    brand: 'Dell',
    model: 'PowerEdge R750',
    serialNumber: 'SRV-RACK-7729',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '2º Andar',
      room: 'Centro de Operações de Rede (NOC)',
      fullAddress: 'Bloco A, 2º Andar, Sala 201',
      responsiblePerson: 'Mariana Duarte Souza'
    },
    status: 'em_uso',
    condition: 'bom',
    acquisitionDate: '2023-11-20',
    acquisitionValue: 42000.00,
    currentBookValue: 31500.00,
    annualDepreciationRate: 20,
    supplier: 'Dell Computadores do Brasil Ltda',
    invoiceNumber: 'NF-e 812993',
    warrantyExpiration: '2026-11-20',
    attachments: [],
    movementHistory: [
      {
        id: 'mov-2',
        date: '2023-11-22',
        fromLocation: 'Almoxarifado Central',
        toLocation: 'Centro de Operações de Rede (NOC)',
        responsibleUser: 'Carlos Alberto Silva',
        reason: 'Instalação no Rack 04 do Datacenter'
      }
    ],
    lastMaintenanceDate: '2026-06-15',
    nextMaintenanceDate: '2026-09-25',
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20',
    notes: 'Revisão preventiva semestral agendada para limpeza de filtros e checagem térmica.'
  },
  {
    id: 'ast-003',
    code: 'PAT-2024-003',
    name: 'Mesa de Reunião Oval 12 Lugares Madeira Nobre',
    description: 'Mesa para conferências com calha embutida para tomadas elétricas, rede RJ45 e conexões HDMI.',
    category: 'Mobiliario',
    brand: 'Kappesberg Corporativo',
    model: 'Executive Wood 360',
    serialNumber: 'MOB-2023-88',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '1º Andar',
      room: 'Sala de Reuniões Executiva',
      fullAddress: 'Bloco A, 1º Andar, Sala 102',
      responsiblePerson: 'Carlos Alberto Silva'
    },
    status: 'em_uso',
    condition: 'bom',
    acquisitionDate: '2023-08-10',
    acquisitionValue: 8900.00,
    currentBookValue: 6230.00,
    annualDepreciationRate: 10,
    supplier: 'Mobiliário Sul Comercial Ltda',
    invoiceNumber: 'NF-e 44321',
    warrantyExpiration: '2028-08-10',
    attachments: [],
    movementHistory: [],
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20'
  },
  {
    id: 'ast-004',
    code: 'PAT-2024-004',
    name: 'Projetor Laser 4K Sony VPL-PHZ60',
    description: 'Projetor profissional 6000 lumens, resolução WUXGA / 4K input, tecnologia 3LCD.',
    category: 'Audiovisual',
    brand: 'Sony',
    model: 'VPL-PHZ60',
    serialNumber: 'SNY-PRJ-9031',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '1º Andar',
      room: 'Sala de Reuniões Executiva',
      fullAddress: 'Bloco A, 1º Andar, Sala 102',
      responsiblePerson: 'Carlos Alberto Silva'
    },
    status: 'em_manutencao',
    condition: 'regular',
    acquisitionDate: '2023-09-05',
    acquisitionValue: 14500.00,
    currentBookValue: 10875.00,
    annualDepreciationRate: 15,
    supplier: 'AudioVisual Pro Brasil',
    invoiceNumber: 'NF-e 66750',
    warrantyExpiration: '2025-09-05',
    attachments: [],
    movementHistory: [
      {
        id: 'mov-3',
        date: '2026-09-10',
        fromLocation: 'Sala de Reuniões Executiva',
        toLocation: 'Laboratório de TI 101',
        responsibleUser: 'Mariana Duarte Souza',
        reason: 'Envio para manutenção corretiva (lente com foco desalinhado)'
      }
    ],
    lastMaintenanceDate: '2026-09-12',
    nextMaintenanceDate: '2026-09-22',
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20',
    notes: 'Aguardando peça de reposição do suporte ótico.'
  },
  {
    id: 'ast-005',
    code: 'PAT-2024-005',
    name: 'Microscópio Eletrônico de Bancada Carl Zeiss',
    description: 'Microscópio óptico com câmera acoplada digital 4K e software de microanálise.',
    category: 'Laboratorio',
    brand: 'Carl Zeiss',
    model: 'Axio Lab.A1',
    serialNumber: 'CZ-AX-40918',
    location: {
      building: 'Bloco C - Pesquisa',
      floor: '3º Andar',
      room: 'Laboratório Químico & P&D',
      fullAddress: 'Bloco C, 3º Andar, Sala 301',
      responsiblePerson: 'Dra. Fernanda Lins'
    },
    status: 'em_uso',
    condition: 'bom',
    acquisitionDate: '2023-01-20',
    acquisitionValue: 35000.00,
    currentBookValue: 26250.00,
    annualDepreciationRate: 10,
    supplier: 'Zeiss Soluções Científicas',
    invoiceNumber: 'NF-e 11983',
    warrantyExpiration: '2026-01-20',
    attachments: [],
    movementHistory: [],
    lastMaintenanceDate: '2026-04-10',
    nextMaintenanceDate: '2026-10-10',
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20'
  },
  {
    id: 'ast-006',
    code: 'PAT-2024-006',
    name: 'Nobreak Senoidal APC Smart-UPS 3000VA',
    description: 'Nobreak online dupla conversão com baterias externas seladas e placa de rede SNMP.',
    category: 'Equipamentos',
    brand: 'APC Schneider',
    model: 'SMT3000RMI2UC',
    serialNumber: 'APC-UPS-11029',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '2º Andar',
      room: 'Centro de Operações de Rede (NOC)',
      fullAddress: 'Bloco A, 2º Andar, Sala 201',
      responsiblePerson: 'Mariana Duarte Souza'
    },
    status: 'em_uso',
    condition: 'regular',
    acquisitionDate: '2022-05-15',
    acquisitionValue: 9800.00,
    currentBookValue: 4900.00,
    annualDepreciationRate: 15,
    supplier: 'EletroNetwork Comércio',
    invoiceNumber: 'NF-e 9923',
    warrantyExpiration: '2024-05-15',
    attachments: [],
    movementHistory: [],
    lastMaintenanceDate: '2025-11-20',
    nextMaintenanceDate: '2026-09-28',
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20',
    notes: 'Baterias atingindo 3 anos de vida útil. Substituição preventiva recomendada pelo fabricante.'
  },
  {
    id: 'ast-007',
    code: 'PAT-2024-007',
    name: 'Monitor Profissional Dell UltraSharp 27" 4K',
    description: 'Monitor USB-C Hub com calibração sRGB 100%, suporte articulado ergonômico.',
    category: 'Informatica',
    brand: 'Dell',
    model: 'U2723QE',
    serialNumber: 'DL-MON-55829',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '1º Andar',
      room: 'Laboratório de TI 101',
      fullAddress: 'Bloco A, 1º Andar, Sala 101',
      responsiblePerson: 'Mariana Duarte Souza'
    },
    status: 'em_uso',
    condition: 'novo',
    acquisitionDate: '2024-03-10',
    acquisitionValue: 3400.00,
    currentBookValue: 2890.00,
    annualDepreciationRate: 20,
    supplier: 'Dell Computadores do Brasil Ltda',
    invoiceNumber: 'NF-e 882194',
    warrantyExpiration: '2027-03-10',
    attachments: [],
    movementHistory: [],
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20'
  },
  {
    id: 'ast-008',
    code: 'PAT-2024-008',
    name: 'Cadeira Ergonômica Presidente Herman Miller Aeron',
    description: 'Cadeira com encosto em tela Pellicle, apoio lombar ajustável PostureFit SL, braços 4D.',
    category: 'Mobiliario',
    brand: 'Herman Miller',
    model: 'Aeron Size B',
    serialNumber: 'HM-AER-4820',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '4º Andar',
      room: 'Departamento Financeiro',
      fullAddress: 'Bloco A, 4º Andar, Sala 401',
      responsiblePerson: 'Roberto Mendes Neves'
    },
    status: 'em_uso',
    condition: 'bom',
    acquisitionDate: '2023-04-12',
    acquisitionValue: 7200.00,
    currentBookValue: 5400.00,
    annualDepreciationRate: 10,
    supplier: 'Atec Original Design',
    invoiceNumber: 'NF-e 77123',
    warrantyExpiration: '2035-04-12',
    attachments: [],
    movementHistory: [],
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20'
  },
  {
    id: 'ast-009',
    code: 'PAT-2024-009',
    name: 'Empilhadeira Elétrica Retrátil Still 1.6T',
    description: 'Equipamento de movimentação interna de cargas com bateria de íons de lítio 48V e torre triplex.',
    category: 'Equipamentos',
    brand: 'Still',
    model: 'FM-X 16',
    serialNumber: 'STL-EMP-2099',
    location: {
      building: 'Bloco B - Logística',
      floor: 'Térreo',
      room: 'Almoxarifado Central',
      fullAddress: 'Bloco B, Térreo, Sala 202',
      responsiblePerson: 'Juliana Costa Lima'
    },
    status: 'em_uso',
    condition: 'bom',
    acquisitionDate: '2023-06-01',
    acquisitionValue: 85000.00,
    currentBookValue: 63750.00,
    annualDepreciationRate: 10,
    supplier: 'Kion Group South America',
    invoiceNumber: 'NF-e 31920',
    warrantyExpiration: '2026-06-01',
    attachments: [],
    movementHistory: [],
    lastMaintenanceDate: '2026-07-20',
    nextMaintenanceDate: '2026-10-20',
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20'
  },
  {
    id: 'ast-010',
    code: 'PAT-2024-010',
    name: 'Switch Gerenciável Cisco Catalyst 9300 48P PoE+',
    description: 'Switch corporativo camada 3 com portas 10G SFP+ e suporte a empilhamento StackWise.',
    category: 'Informatica',
    brand: 'Cisco',
    model: 'C9300-48P',
    serialNumber: 'FOC23490X12',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '2º Andar',
      room: 'Centro de Operações de Rede (NOC)',
      fullAddress: 'Bloco A, 2º Andar, Sala 201',
      responsiblePerson: 'Mariana Duarte Souza'
    },
    status: 'em_uso',
    condition: 'novo',
    acquisitionDate: '2024-01-18',
    acquisitionValue: 28900.00,
    currentBookValue: 24565.00,
    annualDepreciationRate: 15,
    supplier: 'Anixter Distribuidora Brasil',
    invoiceNumber: 'NF-e 671044',
    warrantyExpiration: '2029-01-18',
    attachments: [],
    movementHistory: [],
    syncedWithErp: true,
    lastAuditedDate: '2026-08-20'
  }
];

export const INITIAL_MAINTENANCES: MaintenanceRecord[] = [
  {
    id: 'mnt-001',
    assetId: 'ast-002',
    assetCode: 'PAT-2024-002',
    assetName: 'Servidor Rack Dell PowerEdge R750',
    type: 'preventiva',
    description: 'Limpeza interna de poeira nos dissipadores, teste de fontes redundantes e atualização de firmware iDRAC/BIOS.',
    scheduledDate: '2026-09-25',
    status: 'agendada',
    priority: 'alta',
    technicianOrCompany: 'Dell Enterprise Services',
    estimatedCost: 850.00,
    frequencyMonths: 6,
    notes: 'Janela de manutenção programada para o sábado à noite sem impacto operacional.'
  },
  {
    id: 'mnt-002',
    assetId: 'ast-004',
    assetCode: 'PAT-2024-004',
    assetName: 'Projetor Laser 4K Sony VPL-PHZ60',
    type: 'corretiva',
    description: 'Ajuste de alinhamento óptico e substituição do módulo do prisma.',
    scheduledDate: '2026-09-22',
    status: 'em_andamento',
    priority: 'urgente',
    technicianOrCompany: 'Assistência Técnica Especializada Sony Pro',
    estimatedCost: 1400.00,
    actualCost: 1350.00,
    notes: 'Peça recebida em 18/09, em fase final de calibração.'
  },
  {
    id: 'mnt-003',
    assetId: 'ast-006',
    assetCode: 'PAT-2024-006',
    assetName: 'Nobreak Senoidal APC Smart-UPS 3000VA',
    type: 'preventiva',
    description: 'Troca de baterias VRLA 12V 9Ah e aferição de tensão nos bancos.',
    scheduledDate: '2026-09-28',
    status: 'agendada',
    priority: 'alta',
    technicianOrCompany: 'Schneider Electric Autorizada',
    estimatedCost: 1950.00,
    frequencyMonths: 12,
    notes: 'Recomendação técnica baseada na telemetria preditiva do sistema.'
  },
  {
    id: 'mnt-004',
    assetId: 'ast-009',
    assetCode: 'PAT-2024-009',
    assetName: 'Empilhadeira Elétrica Retrátil Still 1.6T',
    type: 'preventiva',
    description: 'Revisão hidráulica de torre, lubrificação de correntes e verificação de freios eletromagnéticos.',
    scheduledDate: '2026-10-20',
    status: 'agendada',
    priority: 'media',
    technicianOrCompany: 'Still Assistência Técnica',
    estimatedCost: 2200.00,
    frequencyMonths: 3
  }
];

export const INITIAL_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'log-001',
    timestamp: '2026-09-19T08:15:22Z',
    userId: 'usr-1',
    userName: 'Carlos Alberto Silva',
    userRole: 'admin',
    action: 'LOGIN',
    entity: 'Sistema',
    entityId: 'AUTH-SESSION',
    details: 'Login bem-sucedido no painel administrativo via IP corporativo.',
    ipAddress: '192.168.10.45'
  },
  {
    id: 'log-002',
    timestamp: '2026-09-18T16:20:11Z',
    userId: 'usr-2',
    userName: 'Mariana Duarte Souza',
    userRole: 'employee',
    action: 'TRANSFERENCIA',
    entity: 'Patrimonio',
    entityId: 'PAT-2024-004',
    details: 'Transferência do item PAT-2024-004 da Sala de Reuniões Executiva para Laboratório de TI 101 para manutenção corretiva.',
    ipAddress: '192.168.10.78'
  },
  {
    id: 'log-003',
    timestamp: '2026-09-18T14:10:00Z',
    userId: 'usr-3',
    userName: 'Roberto Mendes Neves',
    userRole: 'auditor',
    action: 'AUDITORIA',
    entity: 'Auditoria Interna',
    entityId: 'AUDIT-2026-Q3',
    details: 'Conferência física no Bloco A concluída com índice de conformidade de 96.4%.',
    ipAddress: '192.168.10.12'
  },
  {
    id: 'log-004',
    timestamp: '2026-09-17T11:45:00Z',
    userId: 'usr-1',
    userName: 'Carlos Alberto Silva',
    userRole: 'admin',
    action: 'IMPORTACAO_EXCEL',
    entity: 'Lote de Ativos',
    entityId: 'BATCH-2026-09',
    details: 'Importação automática via planilha Excel: 10 novos bens patrimoniados cadastrados com sucesso.',
    ipAddress: '192.168.10.45'
  }
];

export const INITIAL_ERP_CONFIG: ErpSyncConfig = {
  systemName: 'SAP S/4HANA Enterprise ERP',
  endpointUrl: 'https://erp-gateway.empresa.com.br/api/v2/fixed-assets',
  apiKey: 'sap_live_sec_7894a91cbf829e01',
  autoSync: true,
  syncIntervalMinutes: 60,
  lastSyncTimestamp: '2026-09-19T08:00:00Z',
  status: 'conectado',
  totalSyncedItems: 10,
  pendingSyncCount: 0
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Manutenção Agendada Próxima',
    message: 'O servidor PowerEdge R750 (PAT-2024-002) tem revisão preventiva agendada para 25/09/2026.',
    type: 'warning',
    date: '2026-09-19T08:00:00Z',
    read: false,
    assetId: 'ast-002'
  },
  {
    id: 'notif-2',
    title: 'Item em Manutenção Corretiva',
    message: 'Projetor Laser Sony (PAT-2024-004) está em manutenção com previsão de retorno em 22/09/2026.',
    type: 'info',
    date: '2026-09-18T16:30:00Z',
    read: false,
    assetId: 'ast-004'
  },
  {
    id: 'notif-3',
    title: 'Análise Preditiva: Alerta de Bateria',
    message: 'Nobreak APC 3000VA (PAT-2024-006) atingiu prazo crítico de substituição de baterias para evitar paradas inesperadas.',
    type: 'danger',
    date: '2026-09-18T09:15:00Z',
    read: true,
    assetId: 'ast-006'
  }
];
