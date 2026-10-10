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
  AlertTriangle,
  AlertCircle
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
  const [assetToDelete, setAssetToDelete] = useState<PatrimonialAsset | null>(null);

  // Feedback notifications
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Transfer room state
  const [targetRoom, setTargetRoom] = useState('');
  const [transferReason, setTransferReason] = useState('');

  // New / Edit Asset Form State
  const [formAsset, setFormAsset] = useState<Partial<PatrimonialAsset>>({
    code: '',
    name: '',
    description: '',
    category: 'Informatica',
    detentorResponsavel: currentUser.name,
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
  const usersList = StorageService.getUsers();
  const isAdmin = currentUser.role === 'admin';
  const canManage = currentUser.role === 'admin' || currentUser.role === 'employee';
  const canDelete = currentUser.role !== 'auditor' && currentUser.role !== 'detentor_executivo';

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
        room: qrCodeModalAsset.location.room,
        serialNumber: qrCodeModalAsset.serialNumber || 'N/A'
      });
      generateQrCodeDataUrl(payload).then(url => setGeneratedQrDataUrl(url));
    }
  }, [qrCodeModalAsset]);

  // Filtered Assets
  const filteredAssets = assets.filter((asset) => {
    const matchesSearch =
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset.detentorResponsavel && asset.detentorResponsavel.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.brand && asset.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesRoom = roomFilter === 'all' || asset.location.room === roomFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;

    return matchesSearch && matchesCategory && matchesRoom && matchesStatus;
  });

  // Handle Confirm Delete Asset
  const handleConfirmDeleteAsset = () => {
    if (!assetToDelete) return;
    const target = assetToDelete;
    const success = StorageService.deleteAsset(target.id, currentUser);
    if (success) {
      if (activeAssetModal?.id === target.id) {
        setActiveAssetModal(null);
      }
      if (formAsset.id === target.id) {
        setIsEditModalOpen(false);
      }
      setAssetToDelete(null);
      onRefreshAssets();
      showNotification(`Material "${target.name}" (${target.code}) foi excluído com sucesso!`, 'success');
    } else {
      showNotification(`Falha ao excluir o material "${target.name}". Item não localizado.`, 'error');
    }
  };

  // Handle Save New or Edit Asset
  const handleSaveAssetForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAsset.code || !formAsset.name) {
      showNotification('Código e nome são obrigatórios para salvar o material.', 'error');
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
      detentorResponsavel: formAsset.detentorResponsavel?.trim() || selectedRoomObj.responsible || currentUser.name,
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
    showNotification(isNew ? `Material "${assetToSave.name}" (${assetToSave.code}) cadastrado com sucesso!` : `Material "${assetToSave.name}" atualizado com sucesso!`);
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

  // Download PNG in 360 DPI for Brother PT-P900W / P-touch Editor
  const handleDownloadBrotherPtouchImage = (asset: PatrimonialAsset) => {
    if (!asset || !generatedQrDataUrl) return;
    const canvas = document.createElement('canvas');
    canvas.width = 850; // 60mm at 360 dpi (Brother PT-P900W native resolution)
    canvas.height = 510; // 36mm at 360 dpi
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background white (TZe tape)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 850, 510);

    // Border line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, 818, 478);

    // Header top bar
    ctx.beginPath();
    ctx.moveTo(16, 68);
    ctx.lineTo(834, 68);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // Header text
    ctx.fillStyle = '#000000';
    ctx.font = '900 27px Arial, Helvetica, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLE PATRIMONIAL - ESSgt', 425, 52);
    ctx.textAlign = 'left';

    const qrImg = new Image();
    qrImg.onload = () => {
      // Draw QR Code in pure black
      ctx.drawImage(qrImg, 34, 88, 360, 360);

      // Vertical separator
      ctx.beginPath();
      ctx.moveTo(414, 76);
      ctx.lineTo(414, 480);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#999999';
      ctx.stroke();

      // Nº PATRIMÔNIO
      ctx.fillStyle = '#444444';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('Nº PATRIMÔNIO', 434, 115);

      ctx.fillStyle = '#000000';
      ctx.font = '900 44px "Courier New", Courier, monospace';
      ctx.fillText(asset.code, 434, 162);

      // Horizontal separator line
      ctx.beginPath();
      ctx.moveTo(434, 185);
      ctx.lineTo(820, 185);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#cccccc';
      ctx.stroke();

      // DESCRIÇÃO DO MATERIAL (Fonte aumentada)
      ctx.fillStyle = '#444444';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('DESCRIÇÃO DO MATERIAL', 434, 215);

      ctx.fillStyle = '#000000';
      ctx.font = 'bold 30px Arial, Helvetica, sans-serif';
      // Word wrap text
      const words = (asset.name || '').split(' ');
      let line1 = '';
      let line2 = '';
      for (const w of words) {
        if ((line1 + ' ' + w).trim().length < 20) {
          line1 = (line1 ? line1 + ' ' : '') + w;
        } else if ((line2 + ' ' + w).trim().length < 22) {
          line2 = (line2 ? line2 + ' ' : '') + w;
        }
      }
      ctx.fillText(line1, 434, 255);
      if (line2) {
        ctx.fillText(line2, 434, 296);
      }

      // Horizontal separator line
      ctx.beginPath();
      ctx.moveTo(434, 380);
      ctx.lineTo(820, 380);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#cccccc';
      ctx.stroke();

      // Nº DE SÉRIE (Fonte aumentada)
      ctx.fillStyle = '#444444';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText('Nº DE SÉRIE', 434, 412);

      ctx.fillStyle = '#000000';
      ctx.font = '900 38px "Courier New", Courier, monospace';
      const snText = asset.serialNumber && asset.serialNumber.trim() ? `S/N: ${asset.serialNumber}` : 'S/N: N/A';
      ctx.fillText(snText, 434, 456);

      // Trigger download
      const link = document.createElement('a');
      link.download = `Plaqueta_Brother_36x60mm_${asset.code}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    qrImg.src = generatedQrDataUrl;
  };

  // Print Label Sheet - Brother PT-P900W (Largura 36 mm x Comprimento 60 mm)
  const handlePrintLabel = (asset: PatrimonialAsset) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const serialNum = asset.serialNumber && asset.serialNumber.trim() ? asset.serialNumber.trim() : 'N/A';
    const assetName = asset.name || 'Sem Descrição';
    const assetCode = asset.code || 'PAT-0000';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>Plaqueta Brother PT-P900W - ${assetCode}</title>
          <style>
            @page {
              size: 60mm 36mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            html, body {
              width: 60mm;
              height: 36mm;
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              overflow: hidden;
            }
            .brother-label-wrapper {
              width: 60mm;
              height: 36mm;
              padding: 1.4mm 1.8mm;
              border: 0.4mm solid #000000;
              border-radius: 1mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              background: #ffffff;
              box-sizing: border-box;
            }
            .label-header {
              display: flex;
              align-items: center;
              justify-content: center;
              border-bottom: 0.35mm solid #000000;
              padding-bottom: 0.45mm;
              margin-bottom: 0.65mm;
              text-align: center;
            }
            .header-title {
              font-size: 6.2pt;
              font-weight: 900;
              letter-spacing: 0.25pt;
              text-transform: uppercase;
              text-align: center;
              width: 100%;
            }
            .label-body {
              display: flex;
              align-items: center;
              justify-content: space-between;
              flex: 1;
              gap: 1.5mm;
              overflow: hidden;
            }
            .qr-col {
              width: 25.5mm;
              height: 25.5mm;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              background: #ffffff;
            }
            .qr-col img {
              width: 25.5mm;
              height: 25.5mm;
              display: block;
              image-rendering: -webkit-optimize-contrast;
              image-rendering: pixelated;
              object-fit: contain;
            }
            .info-col {
              flex: 1;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              height: 100%;
              min-width: 0;
              text-align: left;
              padding-left: 0.5mm;
            }
            .field-label {
              font-size: 4.4pt;
              font-weight: 700;
              text-transform: uppercase;
              color: #333333;
              line-height: 1;
            }
            .code-value {
              font-size: 9pt;
              font-weight: 900;
              font-family: "Courier New", Courier, monospace;
              letter-spacing: -0.2pt;
              line-height: 1.05;
              color: #000000;
              margin-bottom: 0.4mm;
            }
            .desc-value {
              font-size: 7.5pt;
              font-weight: 800;
              line-height: 1.15;
              color: #000000;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
              margin-bottom: 0.4mm;
            }
            .serial-block {
              border-top: 0.25mm solid #666666;
              padding-top: 0.4mm;
            }
            .serial-value {
              font-size: 8pt;
              font-weight: 900;
              font-family: "Courier New", Courier, monospace;
              color: #000000;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .brother-label-wrapper {
                border: 0.35mm solid #000000;
              }
            }
          </style>
        </head>
        <body>
          <div class="brother-label-wrapper">
            <div class="label-header">
              <span class="header-title">CONTROLE PATRIMONIAL - ESSgt</span>
            </div>
            <div class="label-body">
              <div class="qr-col">
                <img src="${generatedQrDataUrl || ''}" alt="QR Code" />
              </div>
              <div class="info-col">
                <div>
                  <div class="field-label">Nº Patrimônio</div>
                  <div class="code-value">${assetCode}</div>
                </div>
                <div>
                  <div class="field-label">Descrição do Material</div>
                  <div class="desc-value" title="${assetName}">${assetName}</div>
                </div>
                <div class="serial-block">
                  <div class="field-label">Nº de Série</div>
                  <div class="serial-value">S/N: ${serialNum}</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                window.close();
              }, 400);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Feedback Toast Notification */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between border transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300' 
            : 'bg-rose-950/60 border-rose-700/50 text-rose-300'
        }`}>
          <div className="flex items-center space-x-2">
            {feedbackMsg.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{feedbackMsg.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setFeedbackMsg(null)} 
            className="p-1 hover:opacity-75 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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

          {canManage && (
            <button
              onClick={() => {
                setFormAsset({
                  code: `PAT-2026-${String(assets.length + 1).padStart(3, '0')}`,
                  name: '',
                  description: '',
                  category: 'Informatica',
                  detentorResponsavel: currentUser.name,
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
            placeholder="Buscar por código (PAT-...), descrição, detentor responsável, marca ou série..."
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
            <option value="disponivel">Disponível</option>
            <option value="descarga">Descarga</option>
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

                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      asset.condition === 'novo' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' :
                      asset.condition === 'bom' ? 'bg-blue-950/60 text-blue-300 border border-blue-800/60' :
                      'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                    }`}>
                      {asset.condition === 'novo' ? 'Novo' : asset.condition === 'bom' ? 'Bom' : 'Danificado'}
                    </span>

                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      asset.status === 'em_uso' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' :
                      asset.status === 'disponivel' ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60' :
                      asset.status === 'descarga' ? 'bg-rose-950/60 text-rose-300 border border-rose-800/60' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {asset.status === 'em_uso' ? 'Em Uso' : asset.status === 'disponivel' ? 'Disponível' : asset.status === 'descarga' ? 'Descarga' : asset.status}
                    </span>
                  </div>
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

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                    <span className="truncate mr-2" title={`Detentor Responsável: ${asset.detentorResponsavel || asset.location.responsiblePerson}`}>
                      Detentor: <strong className="text-slate-300 font-semibold">{asset.detentorResponsavel || asset.location.responsiblePerson}</strong>
                    </span>
                    <span className="font-mono font-medium text-slate-300 shrink-0">
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

                  {canManage && (
                    <button
                      onClick={() => {
                        setFormAsset(asset);
                        setIsEditModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                      title="Editar Material"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => setAssetToDelete(asset)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-800/60 transition-colors cursor-pointer"
                      title="Excluir Material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Localização</span>
                  <span className="font-semibold text-slate-200">{activeAssetModal.location.room}</span>
                  <span className="text-[10px] text-slate-400 block">{activeAssetModal.location.building}</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-indigo-800/40">
                  <span className="text-[10px] text-indigo-400 font-bold uppercase block">Detentor Responsável</span>
                  <span className="font-semibold text-indigo-200">{activeAssetModal.detentorResponsavel || activeAssetModal.location.responsiblePerson}</span>
                  <span className="text-[10px] text-slate-400 block">Posse / Carga direta</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase block">Resp. da Sala</span>
                  <span className="font-semibold text-slate-200">{activeAssetModal.location.responsiblePerson}</span>
                  <span className="text-[10px] text-slate-400 block">Gestão do setor</span>
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
                  <span className={`font-semibold capitalize ${
                    activeAssetModal.condition === 'novo' ? 'text-emerald-400' :
                    activeAssetModal.condition === 'bom' ? 'text-blue-400' :
                    'text-rose-400'
                  }`}>
                    {activeAssetModal.condition === 'novo' ? 'Novo' :
                     activeAssetModal.condition === 'bom' ? 'Bom' : 'Danificado'}
                  </span>
                </div>
              </div>

              {/* Action Toolbar inside Modal */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => {
                      setQrCodeModalAsset(activeAssetModal);
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Gerar Etiqueta QR</span>
                  </button>

                  {canManage && (
                    <button
                      onClick={() => {
                        setTargetRoom(activeAssetModal.location.room);
                        setIsMoveModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
                      <span>Transferir Sala</span>
                    </button>
                  )}

                  {canManage && (
                    <button
                      onClick={() => {
                        setFormAsset(activeAssetModal);
                        setIsEditModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Editar Material</span>
                    </button>
                  )}
                </div>

                {canDelete && (
                  <button
                    onClick={() => setAssetToDelete(activeAssetModal)}
                    className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Excluir Material"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Excluir Material</span>
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

      {/* --- QR CODE & PRINT MODAL - BROTHER PT-P900W (36 mm x 60 mm) --- */}
      {qrCodeModalAsset && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 text-center space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
                    <Printer className="w-4 h-4" />
                  </span>
                  <h3 className="font-bold text-sm text-white">Plaqueta Patrimonial QR</h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dimensões: <strong>Largura 36 mm x Comprimento 60 mm</strong> (Rotuladora Brother PT-P900W)
                </p>
              </div>
              <button
                onClick={() => setQrCodeModalAsset(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Label Visual Simulation in real 60mm x 36mm proportion (5:3 ratio) */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="text-[10px] text-slate-400 font-mono mb-2 flex items-center space-x-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Fita Brother TZe 36 mm • Comprimento 60 mm</span>
              </div>

              {/* Physical Tag representation */}
              <div className="w-full max-w-[420px] aspect-[60/36] bg-white rounded-xl border-2 border-black p-3 text-black shadow-2xl flex flex-col justify-between relative overflow-hidden select-none">
                {/* Header line on label */}
                <div className="flex items-center justify-center border-b border-black pb-1 mb-1.5 text-center">
                  <span className="text-[9.5px] font-black tracking-wider uppercase text-black text-center w-full">
                    CONTROLE PATRIMONIAL - ESSgt
                  </span>
                </div>

                {/* Body: Left QR Code, Right Asset Details */}
                <div className="flex items-center justify-between gap-3 flex-1 min-h-0">
                  {/* QR Code Container */}
                  <div className="w-[38%] h-full flex items-center justify-center bg-white shrink-0">
                    {generatedQrDataUrl ? (
                      <img
                        src={generatedQrDataUrl}
                        alt={`QR Code ${qrCodeModalAsset.code}`}
                        className="w-full h-full object-contain"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                        Gerando QR...
                      </div>
                    )}
                  </div>

                  {/* Information Details Container */}
                  <div className="w-[62%] h-full flex flex-col justify-between text-left min-w-0 pr-0.5">
                    {/* 1. Nº Patrimônio */}
                    <div>
                      <span className="text-[7.5px] uppercase font-bold text-slate-600 block leading-tight">
                        Nº Patrimônio
                      </span>
                      <span className="font-mono font-black text-sm text-black tracking-tight block leading-tight">
                        {qrCodeModalAsset.code}
                      </span>
                    </div>

                    {/* 2. Descrição do Material (Fonte aumentada) */}
                    <div className="my-0.5">
                      <span className="text-[7.5px] uppercase font-bold text-slate-600 block leading-tight">
                        Descrição do Material
                      </span>
                      <p className="text-[11.5px] font-extrabold text-slate-900 line-clamp-2 leading-tight" title={qrCodeModalAsset.name}>
                        {qrCodeModalAsset.name}
                      </p>
                    </div>

                    {/* 3. Nº de Série (Fonte aumentada) */}
                    <div className="pt-0.5 border-t border-slate-300">
                      <span className="text-[7.5px] uppercase font-bold text-slate-600 block leading-tight">
                        Nº de Série
                      </span>
                      <span className="font-mono font-black text-[11px] text-black truncate block leading-tight">
                        S/N: {qrCodeModalAsset.serialNumber?.trim() || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hardware specifications badge */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-left text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Rotuladora de Mesa:</span>
                <strong className="text-white">Brother PT-P900W</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Dimensão da Plaqueta:</span>
                <span className="text-indigo-300 font-mono font-semibold">Largura 36 mm x Comprimento 60 mm</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Campos Impressos:</span>
                <span className="text-slate-300">QR Code • Nº Patrimônio • Descrição • Nº de Série</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                onClick={() => handlePrintLabel(qrCodeModalAsset)}
                className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-colors shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir na Brother PT-P900W</span>
              </button>

              <button
                onClick={() => handleDownloadBrotherPtouchImage(qrCodeModalAsset)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                title="Baixar imagem em 360 DPI para importar no software Brother P-touch Editor"
              >
                <Download className="w-4 h-4 text-indigo-400" />
                <span>Baixar PNG (360 DPI)</span>
              </button>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Detentor Responsável*</label>
                  <input
                    type="text"
                    list="detentor-users-list"
                    value={formAsset.detentorResponsavel || ''}
                    onChange={(e) => setFormAsset({ ...formAsset, detentorResponsavel: e.target.value })}
                    placeholder="Nome do detentor / custodiante"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500"
                  />
                  <datalist id="detentor-users-list">
                    {usersList.map((u) => (
                      <option key={u.id} value={u.name}>{u.department} ({u.role})</option>
                    ))}
                  </datalist>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Pessoa física com a guarda e posse direta do bem
                  </span>
                </div>
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
                    <option value="danificado">Danificado</option>
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
                    <option value="disponivel">Disponível</option>
                    <option value="descarga">Descarga</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                {formAsset.id && canDelete ? (
                  <button
                    type="button"
                    onClick={() => {
                      const found = assets.find(a => a.id === formAsset.id);
                      if (found) setAssetToDelete(found);
                    }}
                    className="px-3.5 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Excluir Material</span>
                  </button>
                ) : <div />}

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-semibold text-white transition-colors"
                  >
                    Salvar Patrimônio
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE MODAL / POPUP --- */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <span className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Confirmar Exclusão de Material</h3>
                <p className="text-[11px] text-slate-400">Esta ação é permanente e removerá o item do inventário.</p>
              </div>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-300">
                Tem certeza de que deseja excluir o seguinte material e ativo patrimoniado do sistema?
              </p>

              {/* Asset Details Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded">
                    {assetToDelete.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      assetToDelete.condition === 'novo' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      assetToDelete.condition === 'bom' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {assetToDelete.condition === 'novo' ? 'Novo' : assetToDelete.condition === 'bom' ? 'Bom' : 'Danificado'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      assetToDelete.status === 'em_uso' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      assetToDelete.status === 'disponivel' ? 'bg-sky-950 text-sky-300 border border-sky-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {assetToDelete.status === 'em_uso' ? 'Em Uso' : assetToDelete.status === 'disponivel' ? 'Disponível' : 'Descarga'}
                    </span>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-white text-sm">{assetToDelete.name}</div>
                  <div className="text-slate-400 text-[11px]">
                    {assetToDelete.category} {assetToDelete.brand ? `• ${assetToDelete.brand}` : ''} {assetToDelete.model ? `(${assetToDelete.model})` : ''}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Localização:</span>
                    <span className="text-slate-300 font-medium">{assetToDelete.location.room}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Detentor Responsável:</span>
                    <span className="text-indigo-300 font-semibold">{assetToDelete.detentorResponsavel || assetToDelete.location.responsiblePerson}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Valor Contábil:</span>
                    <span className="text-emerald-400 font-medium font-mono">
                      R$ {assetToDelete.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Documentos/Anexos:</span>
                    <span className="text-slate-300 font-medium">{assetToDelete.attachments.length} anexo(s)</span>
                  </div>
                </div>
              </div>

              {/* Warning box */}
              <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-xl text-rose-300 text-[11px] flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>
                  O material será removido de todos os mapas de carga, relatórios e contagens patrimoniais. A exclusão será registrada na <strong>Trilha de Auditoria</strong> com a identificação de <strong>{currentUser.name}</strong>.
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAssetToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAsset}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Material</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
