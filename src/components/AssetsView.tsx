import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  Plus, 
  QrCode, 
  Printer, 
  ArrowRightLeft, 
  Paperclip, 
  Image as ImageIcon, 
  FileText, 
  Trash2, 
  Edit3, 
  Eye, 
  MapPin, 
  Download, 
  Upload, 
  Clock, 
  ShieldCheck, 
  X, 
  Check,
  AlertTriangle
} from 'lucide-react';
import { 
  PatrimonialAsset, 
  AssetCategory, 
  AssetCondition, 
  AssetStatus, 
  User, 
  AssetAttachment 
} from '../types';
import { StorageService } from '../services/storage';
import { generateQrCodeDataUrl, formatAssetPayloadForQr } from '../services/qrService';

interface AssetsViewProps {
  assets: PatrimonialAsset[];
  onRefreshAssets: () => void;
  currentUser: User;
  onOpenScanner: () => void;
  selectedAssetIdFromUrl?: string | null;
}

export const AssetsView: React.FC<AssetsViewProps> = ({
  assets,
  onRefreshAssets,
  currentUser,
  onOpenScanner,
  selectedAssetIdFromUrl
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [activeAssetModal, setActiveAssetModal] = useState<PatrimonialAsset | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [qrCodeModalAsset, setQrCodeModalAsset] = useState<PatrimonialAsset | null>(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');

  // Transfer room state
  const [targetRoom, setTargetRoom] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // New / Edit Asset Form State
  const [formAsset, setFormAsset] = useState<Partial<PatrimonialAsset>>({
    code: '',
    name: '',
    description: '',
    category: 'Informatica',
    condition: 'novo',
    status: 'em_uso',
    acquisitionValue: 1000,
    acquisitionDate: new Date().toISOString().split('T')[0],
    annualDepreciationRate: 20,
    brand: '',
    model: '',
    serialNumber: '',
    location: {
      building: 'Bloco A - Engenharia',
      floor: '1º Andar',
      room: 'Laboratório de TI 101',
      fullAddress: 'Bloco A, 1º Andar, Sala 101',
      responsiblePerson: currentUser.name
    }
  });

  const roomsList = StorageService.getRoomsList();
  const isAdmin = currentUser.role === 'admin';

  // Open asset if passed from parent
  useEffect(() => {
    if (selectedAssetIdFromUrl) {
      const found = assets.find(a => a.id === selectedAssetIdFromUrl || a.code === selectedAssetIdFromUrl);
      if (found) {
        setActiveAssetModal(found);
      }
    }
  }, [selectedAssetIdFromUrl, assets]);

  // Generate QR Code when QR modal opens
  useEffect(() => {
    if (qrCodeModalAsset) {
      const payload = formatAssetPayloadForQr({
        code: qrCodeModalAsset.code,
        name: qrCodeModalAsset.name,
        room: qrCodeModalAsset.location.room
      });
      generateQrCodeDataUrl(payload).then(url => setGeneratedQrDataUrl(url));
    }
  }, [qrCodeModalAsset]);

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesRoom = roomFilter === 'all' || asset.location.room === roomFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;

    return matchesSearch && matchesCategory && matchesRoom && matchesStatus;
  });

  // Handle Save New or Edit Asset
  const handleSaveAssetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAsset.code || !formAsset.name) {
      alert('Código e nome são obrigatórios.');
      return;
    }

    const selectedRoomObj = roomsList.find(r => r.name === formAsset.location?.room) || roomsList[0];

    const isNew = !formAsset.id;
    const assetToSave: PatrimonialAsset = {
      id: formAsset.id || `ast-${Date.now()}`,
      code: formAsset.code.toUpperCase(),
      name: formAsset.name,
      description: formAsset.description || '',
      category: (formAsset.category as AssetCategory) || 'Informatica',
      brand: formAsset.brand || '',
      model: formAsset.model || '',
      serialNumber: formAsset.serialNumber || '',
      location: {
        building: selectedRoomObj.building,
        floor: selectedRoomObj.floor,
        room: selectedRoomObj.name,
        fullAddress: `${selectedRoomObj.building}, ${selectedRoomObj.floor}, ${selectedRoomObj.name}`,
        responsiblePerson: selectedRoomObj.responsible
      },
      status: (formAsset.status as AssetStatus) || 'em_uso',
      condition: (formAsset.condition as AssetCondition) || 'bom',
      acquisitionDate: formAsset.acquisitionDate || new Date().toISOString().split('T')[0],
      acquisitionValue: Number(formAsset.acquisitionValue) || 0,
      currentBookValue: Number(formAsset.acquisitionValue) * 0.85,
      annualDepreciationRate: Number(formAsset.annualDepreciationRate) || 15,
      attachments: formAsset.attachments || [],
      movementHistory: formAsset.movementHistory || [
        {
          id: `mov-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          fromLocation: 'Cadastro Inicial',
          toLocation: selectedRoomObj.name,
          responsibleUser: currentUser.name,
          reason: 'Entrada patrimonial no inventário'
        }
      ],
      syncedWithErp: false,
      lastAuditedDate: new Date().toISOString().split('T')[0]
    };

    StorageService.saveAsset(assetToSave, currentUser, isNew);
    onRefreshAssets();
    setIsEditModalOpen(false);
    setActiveAssetModal(assetToSave);
  };

  // Handle Transfer Asset
  const handleExecuteTransfer = () => {
    if (!activeAssetModal || !targetRoom) return;

    const targetRoomObj = roomsList.find(r => r.name === targetRoom);
    if (!targetRoomObj) return;

    const oldLocation = activeAssetModal.location.room;
    const updatedAsset: PatrimonialAsset = {
      ...activeAssetModal,
      location: {
        building: targetRoomObj.building,
        floor: targetRoomObj.floor,
        room: targetRoomObj.name,
        fullAddress: `${targetRoomObj.building}, ${targetRoomObj.floor}, ${targetRoomObj.name}`,
        responsiblePerson: targetRoomObj.responsible
      },
      movementHistory: [
        {
          id: `mov-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          fromLocation: oldLocation,
          toLocation: targetRoomObj.name,
          responsibleUser: currentUser.name,
          reason: transferReason || 'Transferência entre setores autorizada'
        },
        ...activeAssetModal.movementHistory
      ]
    };

    StorageService.saveAsset(updatedAsset, currentUser, false);
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'TRANSFERENCIA',
      entity: 'Patrimonio',
      entityId: updatedAsset.code,
      details: `Transferência de "${updatedAsset.name}" da sala ${oldLocation} para ${targetRoomObj.name}. Motivo: ${transferReason || 'Operacional'}.`
    });

    onRefreshAssets();
    setActiveAssetModal(updatedAsset);
    setIsMoveModalOpen(false);
    setTransferReason('');
  };

  // Handle Attachment Upload (Images & Documents)
  const handleFileUploadAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeAssetModal) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const newAtt: AssetAttachment = {
        id: `att-${Date.now()}`,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'document',
        size: file.size,
        dataUrl: event.target?.result as string,
        uploadedAt: new Date().toISOString()
      };

      const updatedAsset = {
        ...activeAssetModal,
        attachments: [...activeAssetModal.attachments, newAtt]
      };

      StorageService.saveAsset(updatedAsset, currentUser, false);
      onRefreshAssets();
      setActiveAssetModal(updatedAsset);
    };
    reader.readAsDataURL(file);
  };

  // Remove attachment
  const handleRemoveAttachment = (attId: string) => {
    if (!activeAssetModal) return;
    const updated = {
      ...activeAssetModal,
      attachments: activeAssetModal.attachments.filter(a => a.id !== attId)
    };
    StorageService.saveAsset(updated, currentUser, false);
    onRefreshAssets();
    setActiveAssetModal(updated);
  };

  // Print Label Sheet
  const handlePrintLabel = (asset: PatrimonialAsset) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta Patrimonial - ${asset.code}</title>
          <style>
            body { font-family: sans-serif; margin: 20px; text-align: center; }
            .label-box {
              width: 320px;
              border: 2px solid #000;
              padding: 12px;
              margin: 0 auto;
              border-radius: 8px;
            }
            .title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #444; }
            .code { font-size: 18px; font-weight: bold; font-family: monospace; margin: 4px 0; }
            .name { font-size: 13px; font-weight: 600; margin-bottom: 6px; }
            .info { font-size: 10px; color: #666; margin-top: 4px; }
            img { width: 140px; height: 140px; margin: 8px 0; }
          </style>
        </head>
        <body>
          <div class="label-box">
            <div class="title">Controle Patrimonial Permanente</div>
            <div class="code">${asset.code}</div>
            <div class="name">${asset.name}</div>
            <img src="${generatedQrDataUrl || ''}" alt="QR Code" />
            <div class="info">Local: ${asset.location.room}</div>
            <div class="info">Responsável: ${asset.location.responsiblePerson}</div>
          </div>
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Package className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Materiais & Ativos Patrimoniados
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Rastreabilidade total, leitura de QR Codes, documentação e movimentação de bens
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenScanner}
            id="assets-scan-qr-btn"
            className="flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
          >
            <QrCode className="w-4 h-4 text-indigo-400" />
            <span>Ler Plaqueta QR</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setFormAsset({
                  code: `PAT-2026-${String(assets.length + 1).padStart(3, '0')}`,
                  name: '',
                  description: '',
                  category: 'Informatica',
                  condition: 'novo',
                  status: 'em_uso',
                  acquisitionValue: 2500,
                  acquisitionDate: new Date().toISOString().split('T')[0],
                  annualDepreciationRate: 20,
                  brand: '',
                  model: '',
                  serialNumber: '',
                  location: {
                    building: roomsList[0].building,
                    floor: roomsList[0].floor,
                    room: roomsList[0].name,
                    fullAddress: `${roomsList[0].building}, ${roomsList[0].name}`,
                    responsiblePerson: roomsList[0].responsible
                  }
                });
                setIsEditModalOpen(true);
              }}
              id="assets-new-asset-btn"
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Patrimônio</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código (PAT-...), descrição, marca ou série..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todas Categorias</option>
            <option value="Informatica">Informática</option>
            <option value="Mobiliario">Mobiliário</option>
            <option value="Equipamentos">Equipamentos</option>
            <option value="Audiovisual">Audiovisual</option>
            <option value="Laboratorio">Laboratório</option>
            <option value="Veiculos">Veículos</option>
          </select>

          {/* Room Filter */}
          <select
            value={roomFilter}
            onChange={(e) => setRoomFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[160px]"
          >
            <option value="all">Todas as Salas</option>
            {roomsList.map(r => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todos Status</option>
            <option value="em_uso">Em Uso</option>
            <option value="em_manutencao">Em Manutenção</option>
            <option value="disponivel">Disponível</option>
            <option value="danificado">Danificado</option>
            <option value="baixado">Baixado</option>
          </select>
        </div>
      </div>

      {/* Assets Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-300">Nenhum ativo encontrado</p>
            <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou cadastre um novo material no inventário.</p>
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-lg hover:shadow-indigo-950/20"
            >
              <div>
                {/* Card Header: Code & Status */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono font-bold text-xs bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-md">
                    {asset.code}
                  </span>

                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    asset.status === 'em_uso' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' :
                    asset.status === 'em_manutencao' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/60' :
                    asset.status === 'danificado' ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {asset.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Title and Description */}
                <h3 className="font-bold text-sm text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                  {asset.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {asset.description}
                </p>

                {/* Metadata tags */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{asset.location.room}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-500">
                    <span>Resp: {asset.location.responsiblePerson.split(' ')[0]}</span>
                    <span className="font-mono font-medium text-slate-300">
                      R$ {asset.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  onClick={() => {
                    setQrCodeModalAsset(asset);
                  }}
                  title="Ver QR Code e Imprimir Plaqueta"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  <QrCode className="w-4 h-4" />
                </button>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setActiveAssetModal(asset)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Detalhes</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setFormAsset(asset);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Editar Ativo"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- ASSET DETAIL & AUDIT MODAL --- */}
      {activeAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-200">
            {/* Modal Header */}
            <div className="p-5 bg-slate-850 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center space-x-3">
                <span className="font-mono font-bold text-sm bg-indigo-900 text-indigo-200 px-2.5 py-1 rounded-md border border-indigo-700">
                  {activeAssetModal.code}
                </span>
                <div>
                  <h3 className="font-bold text-base text-white">{activeAssetModal.name}</h3>
                  <p className="text-xs text-slate-400">{activeAssetModal.category} | {activeAssetModal.brand} {activeAssetModal.model}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveAssetModal(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Localização</span>
                  <span className="font-semibold text-slate-200">{activeAssetModal.location.room}</span>
                  <span className="text-[10px] text-slate-400 block">{activeAssetModal.location.building}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Responsável</span>
                  <span className="font-semibold text-slate-200">{activeAssetModal.location.responsiblePerson}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Valor Contábil</span>
                  <span className="font-semibold text-emerald-400">
                    R$ {activeAssetModal.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 block">Original: R$ {activeAssetModal.acquisitionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Conservação</span>
                  <span className="font-semibold capitalize text-indigo-300">{activeAssetModal.condition}</span>
                </div>
              </div>

              {/* Action Toolbar inside Modal */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setQrCodeModalAsset(activeAssetModal);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                >
                  <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Gerar Etiqueta QR</span>
                </button>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setTargetRoom(activeAssetModal.location.room);
                      setIsMoveModalOpen(true);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                    <span>Transferir Sala</span>
                  </button>
                )}
              </div>

              {/* Attachments Section (Images and Documents) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Paperclip className="w-4 h-4 text-indigo-400" />
                    <span className="font-bold text-xs text-white">Anexos e Documentos Comprobatórios</span>
                  </div>

                  <label className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium cursor-pointer flex items-center space-x-1">
                    <Upload className="w-3 h-3" />
                    <span>Adicionar Anexo</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileUploadAttachment}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeAssetModal.attachments.length === 0 ? (
                    <div className="col-span-2 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center text-xs text-slate-500">
                      Nenhum documento ou foto anexada a este ativo.
                    </div>
                  ) : (
                    activeAssetModal.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          {att.type === 'image' ? (
                            <ImageIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                          )}
                          <span className="truncate text-slate-300">{att.name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          {att.dataUrl && (
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="p-1 text-slate-400 hover:text-white"
                              title="Baixar Arquivo"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleRemoveAttachment(att.id)}
                            className="p-1 text-slate-400 hover:text-rose-400"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Movement History (Rastreabilidade Total) */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-xs text-white">Histórico de Movimentações & Custódia</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeAssetModal.movementHistory.map((mov) => (
                    <div
                      key={mov.id}
                      className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-400">{mov.date}</span>
                        <span>Por: {mov.responsibleUser}</span>
                      </div>
                      <div className="text-slate-300 font-medium">
                        {mov.fromLocation} → <strong className="text-indigo-400">{mov.toLocation}</strong>
                      </div>
                      <div className="text-[11px] text-slate-400 italic">
                        Motivo: {mov.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- QR CODE & PRINT MODAL --- */}
      {qrCodeModalAsset && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">Plaqueta Patrimonial QR</span>
              <button
                onClick={() => setQrCodeModalAsset(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border-2 border-slate-300 inline-block shadow-inner">
              <div className="text-[11px] font-bold text-slate-600 uppercase">
                Patrimônio Registrado
              </div>
              <div className="font-mono font-black text-xl text-slate-950 my-1">
                {qrCodeModalAsset.code}
              </div>
              {generatedQrDataUrl ? (
                <img
                  src={generatedQrDataUrl}
                  alt={`QR Code ${qrCodeModalAsset.code}`}
                  className="w-48 h-48 mx-auto my-2"
                />
              ) : (
                <div className="w-48 h-48 bg-slate-100 flex items-center justify-center text-xs text-slate-400 mx-auto">
                  Gerando QR...
                </div>
              )}
              <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                {qrCodeModalAsset.name}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {qrCodeModalAsset.location.room}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handlePrintLabel(qrCodeModalAsset)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Etiqueta</span>
              </button>
              {generatedQrDataUrl && (
                <a
                  href={generatedQrDataUrl}
                  download={`QR_${qrCodeModalAsset.code}.png`}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center"
                  title="Baixar Imagem PNG"
                >
                  <Download className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TRANSFER ROOM MODAL --- */}
      {isMoveModalOpen && activeAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-200">
            <h3 className="font-bold text-base text-white">Transferir Ativo de Sala</h3>
            <p className="text-xs text-slate-400">
              Movimentação do item <strong>{activeAssetModal.code}</strong> - {activeAssetModal.name}
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Localização Atual</label>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-slate-400">
                  {activeAssetModal.location.room} ({activeAssetModal.location.building})
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Nova Sala de Destino</label>
                <select
                  value={targetRoom}
                  onChange={(e) => setTargetRoom(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {roomsList.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} - {r.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Motivo da Transferência</label>
                <textarea
                  rows={3}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Ex: Remanejamento solicitado pelo gestor do departamento para apoio em novo projeto..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteTransfer}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white"
              >
                Confirmar Transferência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CREATE / EDIT ASSET MODAL --- */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-base text-white">
                {formAsset.id ? 'Editar Ativo Patrimonial' : 'Novo Cadastro de Ativo'}
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAssetForm} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nº Patrimônio (Plaqueta)*</label>
                  <input
                    type="text"
                    required
                    value={formAsset.code}
                    onChange={(e) => setFormAsset({ ...formAsset, code: e.target.value.toUpperCase() })}
                    placeholder="PAT-2026-001"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Categoria*</label>
                  <select
                    value={formAsset.category}
                    onChange={(e) => setFormAsset({ ...formAsset, category: e.target.value as AssetCategory })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="Informatica">Informática</option>
                    <option value="Mobiliario">Mobiliário</option>
                    <option value="Equipamentos">Equipamentos</option>
                    <option value="Audiovisual">Audiovisual</option>
                    <option value="Laboratorio">Laboratório</option>
                    <option value="Veiculos">Veículos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Descrição do Material*</label>
                <input
                  type="text"
                  required
                  value={formAsset.name}
                  onChange={(e) => setFormAsset({ ...formAsset, name: e.target.value })}
                  placeholder="Ex: Notebook Lenovo ThinkPad T14 Gen 4"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Marca</label>
                  <input
                    type="text"
                    value={formAsset.brand || ''}
                    onChange={(e) => setFormAsset({ ...formAsset, brand: e.target.value })}
                    placeholder="Dell, HP, etc."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={formAsset.model || ''}
                    onChange={(e) => setFormAsset({ ...formAsset, model: e.target.value })}
                    placeholder="Latitude 5440"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Nº de Série</label>
                  <input
                    type="text"
                    value={formAsset.serialNumber || ''}
                    onChange={(e) => setFormAsset({ ...formAsset, serialNumber: e.target.value })}
                    placeholder="BR-99482"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Sala / Local de Alocação*</label>
                <select
                  value={formAsset.location?.room}
                  onChange={(e) => {
                    const roomObj = roomsList.find(r => r.name === e.target.value);
                    if (roomObj) {
                      setFormAsset({
                        ...formAsset,
                        location: {
                          building: roomObj.building,
                          floor: roomObj.floor,
                          room: roomObj.name,
                          fullAddress: `${roomObj.building}, ${roomObj.name}`,
                          responsiblePerson: roomObj.responsible
                        }
                      });
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                >
                  {roomsList.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} ({r.building}) - Resp: {r.responsible}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Valor Aquisição (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formAsset.acquisitionValue || 0}
                    onChange={(e) => setFormAsset({ ...formAsset, acquisitionValue: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Estado de Conservação</label>
                  <select
                    value={formAsset.condition}
                    onChange={(e) => setFormAsset({ ...formAsset, condition: e.target.value as AssetCondition })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="novo">Novo</option>
                    <option value="bom">Bom</option>
                    <option value="regular">Regular</option>
                    <option value="danificado">Danificado</option>
                    <option value="sucata">Sucata</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={formAsset.status}
                    onChange={(e) => setFormAsset({ ...formAsset, status: e.target.value as AssetStatus })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="em_uso">Em Uso</option>
                    <option value="em_manutencao">Em Manutenção</option>
                    <option value="disponivel">Disponível</option>
                    <option value="danificado">Danificado</option>
                    <option value="baixado">Baixado</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-semibold text-white"
                >
                  Salvar Patrimônio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
