import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle,
  CheckSquare,
  Square,
  RotateCcw
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
  const [searchPatrimonio, setSearchPatrimonio] = useState('');
  const [searchNomeMaterial, setSearchNomeMaterial] = useState('');
  const [filterContaPat, setFilterContaPat] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roomFilter, setRoomFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pendingFilter, setPendingFilter] = useState<string>('all');

  // Modals state
  const [activeAssetModal, setActiveAssetModal] = useState<PatrimonialAsset | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [qrCodeModalAsset, setQrCodeModalAsset] = useState<PatrimonialAsset | null>(null);
  const [generatedQrDataUrl, setGeneratedQrDataUrl] = useState<string>('');
  const [assetToDelete, setAssetToDelete] = useState<PatrimonialAsset | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Batch selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

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
    codUnidade: 'ESSgt - 160136',
    codMaterial: '',
    code: '',
    serialNumber: '',
    ne: '',
    nl: '',
    name: '',
    especificacoes: '',
    acquisitionValue: 1000,
    dataInclusao: new Date().toISOString().split('T')[0],
    acquisitionDate: new Date().toISOString().split('T')[0],
    fam: '',
    dom: '',
    bam: '',
    contaPat: '1.2.3.1.1.01.00',
    category: 'Informatica',
    status: 'em_uso',
    condition: 'novo',
    detentorResponsavel: currentUser.name,
    annualDepreciationRate: 20,
    brand: '',
    model: '',
    description: '',
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
        room: qrCodeModalAsset.location?.room || 'Almoxarifado Central',
        serialNumber: qrCodeModalAsset.serialNumber || 'N/A'
      });
      generateQrCodeDataUrl(payload).then(url => setGeneratedQrDataUrl(url));
    }
  }, [qrCodeModalAsset]);

  // Unique Conta Pat list for dropdown filtering
  const uniqueContaPatList = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(a => {
      if (a.contaPat && a.contaPat.trim()) {
        set.add(a.contaPat.trim());
      }
    });
    return Array.from(set).sort();
  }, [assets]);

  // Filtered Assets across all official fields and dedicated filters
  const filteredAssets = assets.filter((asset) => {
    // Dedicated filter: Patrimônio (Nº Tombamento / Code)
    if (searchPatrimonio.trim()) {
      const termPat = searchPatrimonio.trim().toLowerCase();
      if (!asset.code || !asset.code.toLowerCase().includes(termPat)) {
        return false;
      }
    }

    // Dedicated filter: Nome do Material
    if (searchNomeMaterial.trim()) {
      const termNome = searchNomeMaterial.trim().toLowerCase();
      if (!asset.name || !asset.name.toLowerCase().includes(termNome)) {
        return false;
      }
    }

    // Dedicated filter: Conta Pat
    if (filterContaPat !== 'all' && filterContaPat.trim()) {
      const termConta = filterContaPat.trim().toLowerCase();
      if (!asset.contaPat || !asset.contaPat.toLowerCase().includes(termConta)) {
        return false;
      }
    }

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      (asset.name && asset.name.toLowerCase().includes(term)) ||
      (asset.code && asset.code.toLowerCase().includes(term)) ||
      (asset.codUnidade && asset.codUnidade.toLowerCase().includes(term)) ||
      (asset.codMaterial && asset.codMaterial.toLowerCase().includes(term)) ||
      (asset.serialNumber && asset.serialNumber.toLowerCase().includes(term)) ||
      (asset.ne && asset.ne.toLowerCase().includes(term)) ||
      (asset.nl && asset.nl.toLowerCase().includes(term)) ||
      (asset.fam && asset.fam.toLowerCase().includes(term)) ||
      (asset.dom && asset.dom.toLowerCase().includes(term)) ||
      (asset.bam && asset.bam.toLowerCase().includes(term)) ||
      (asset.contaPat && asset.contaPat.toLowerCase().includes(term)) ||
      (asset.detentorResponsavel && asset.detentorResponsavel.toLowerCase().includes(term)) ||
      (asset.location?.room && asset.location.room.toLowerCase().includes(term)) ||
      (asset.especificacoes && asset.especificacoes.toLowerCase().includes(term)) ||
      (asset.brand && asset.brand.toLowerCase().includes(term));

    const matchesCategory = categoryFilter === 'all' || asset.category === categoryFilter;
    const matchesRoom = roomFilter === 'all' || asset.location?.room === roomFilter;
    const matchesStatus = statusFilter === 'all' || asset.status === statusFilter;

    const hasBlankFields = !asset.code || !asset.name || !asset.detentorResponsavel || !asset.location?.room;
    const matchesPending =
      pendingFilter === 'all' ||
      (pendingFilter === 'pending' && hasBlankFields) ||
      (pendingFilter === 'complete' && !hasBlankFields);

    return matchesSearch && matchesCategory && matchesRoom && matchesStatus && matchesPending;
  });

  // Toggle selection for a single asset
  const toggleSelectAsset = (assetId: string) => {
    setSelectedAssetIds(prev =>
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  // Check if all filtered assets are currently selected
  const allFilteredSelected = filteredAssets.length > 0 && filteredAssets.every(a => selectedAssetIds.includes(a.id));

  // Handle Select All / Unselect All
  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIdSet = new Set(filteredAssets.map(a => a.id));
      setSelectedAssetIds(prev => prev.filter(id => !filteredIdSet.has(id)));
    } else {
      const newIds = new Set([...selectedAssetIds, ...filteredAssets.map(a => a.id)]);
      setSelectedAssetIds(Array.from(newIds));
    }
  };

  // Handle Confirm Bulk Delete (Popup: Tem certeza que deseja apagar?)
  const handleConfirmBulkDelete = () => {
    if (selectedAssetIds.length === 0) return;
    const count = StorageService.deleteAssets(selectedAssetIds, currentUser);
    if (count > 0) {
      if (activeAssetModal && selectedAssetIds.includes(activeAssetModal.id)) {
        setActiveAssetModal(null);
      }
      if (formAsset.id && selectedAssetIds.includes(formAsset.id)) {
        setIsEditModalOpen(false);
      }
      setSelectedAssetIds([]);
      setIsBulkDeleteModalOpen(false);
      onRefreshAssets();
      showNotification(`${count} materiais apagados com sucesso!`, 'success');
    } else {
      showNotification('Nenhum material foi apagado.', 'error');
    }
  };

  // Handle Confirm Delete Single Asset
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
      showNotification(`Material "${target.name || 'Sem nome'}" (${target.code || 'Sem nº'}) foi excluído com sucesso!`, 'success');
    } else {
      showNotification(`Falha ao excluir o material "${target.name || 'item'}". Item não localizado.`, 'error');
    }
  };

  // Handle Save New or Edit Asset (aceita salvar campos em branco para preenchimento posterior)
  const handleSaveAssetForm = (e: React.FormEvent) => {
    e.preventDefault();

    const selectedRoomObj = roomsList.find(r => r.name === formAsset.location?.room) || roomsList[0];

    const isNew = !formAsset.id;
    const dateNowStr = new Date().toISOString().split('T')[0];
    const dataInclusaoFinal = formAsset.dataInclusao || formAsset.acquisitionDate || '';
    const finalCode = (formAsset.code || '').toUpperCase().trim();
    const finalName = (formAsset.name || '').trim();

    const assetToSave: PatrimonialAsset = {
      id: formAsset.id || `ast-${Date.now()}`,
      // Campos Oficiais de Ativo Patrimonial
      codUnidade: formAsset.codUnidade !== undefined ? formAsset.codUnidade.trim() : '',
      codMaterial: formAsset.codMaterial !== undefined ? formAsset.codMaterial.trim() : '',
      code: finalCode,
      serialNumber: formAsset.serialNumber !== undefined ? formAsset.serialNumber.trim() : '',
      ne: formAsset.ne !== undefined ? formAsset.ne.trim() : '',
      nl: formAsset.nl !== undefined ? formAsset.nl.trim() : '',
      name: finalName,
      especificacoes: formAsset.especificacoes !== undefined ? formAsset.especificacoes.trim() : (formAsset.description?.trim() || ''),
      acquisitionValue: Number(formAsset.acquisitionValue) || 0,
      dataInclusao: dataInclusaoFinal,
      acquisitionDate: dataInclusaoFinal,
      fam: formAsset.fam !== undefined ? formAsset.fam.trim() : '',
      dom: formAsset.dom !== undefined ? formAsset.dom.trim() : '',
      bam: formAsset.bam !== undefined ? formAsset.bam.trim() : '',
      contaPat: formAsset.contaPat !== undefined ? formAsset.contaPat.trim() : '',
      detentorResponsavel: formAsset.detentorResponsavel !== undefined ? formAsset.detentorResponsavel.trim() : '',
      status: (formAsset.status as AssetStatus) || 'em_uso',
      category: (formAsset.category as AssetCategory) || 'Informatica',

      // Complementares
      description: formAsset.especificacoes?.trim() || formAsset.description || finalName || 'Material cadastrado no sistema',
      brand: formAsset.brand || '',
      model: formAsset.model || '',
      location: {
        building: selectedRoomObj?.building || '',
        floor: selectedRoomObj?.floor || '',
        room: formAsset.location?.room || selectedRoomObj?.name || '',
        fullAddress: `${selectedRoomObj?.building || ''}, ${selectedRoomObj?.floor || ''}, ${formAsset.location?.room || selectedRoomObj?.name || ''}`,
        responsiblePerson: formAsset.detentorResponsavel || selectedRoomObj?.responsible || ''
      },
      condition: (formAsset.condition as AssetCondition) || 'bom',
      currentBookValue: Number(formAsset.acquisitionValue) * 0.85,
      annualDepreciationRate: Number(formAsset.annualDepreciationRate) || 15,
      attachments: formAsset.attachments || [],
      movementHistory: formAsset.movementHistory || [
        {
          id: `mov-${Date.now()}`,
          date: dateNowStr,
          fromLocation: 'Cadastro Inicial',
          toLocation: formAsset.location?.room || selectedRoomObj?.name || 'Inventário',
          responsibleUser: currentUser.name,
          reason: 'Entrada patrimonial no inventário'
        }
      ],
      syncedWithErp: false,
      lastAuditedDate: dateNowStr
    };

    StorageService.saveAsset(assetToSave, currentUser, isNew);
    onRefreshAssets();
    setIsEditModalOpen(false);
    setActiveAssetModal(assetToSave);

    const hasBlankPending = !finalCode || !finalName || !assetToSave.detentorResponsavel;
    if (hasBlankPending) {
      showNotification(`Material salvo com sucesso! Campos em branco mantidos para preenchimento posterior.`, 'success');
    } else {
      showNotification(isNew ? `Material "${assetToSave.name}" (${assetToSave.code}) cadastrado com sucesso!` : `Material "${assetToSave.name}" atualizado com sucesso!`);
    }
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
                const nextNum = assets.length + 1;
                const dateNow = new Date().toISOString().split('T')[0];
                setFormAsset({
                  codUnidade: 'ESSgt - 160136',
                  codMaterial: `MAT-${String(nextNum).padStart(4, '0')}`,
                  code: `PAT-2026-${String(nextNum).padStart(3, '0')}`,
                  serialNumber: '',
                  ne: '',
                  nl: '',
                  name: '',
                  especificacoes: '',
                  acquisitionValue: 2500,
                  dataInclusao: dateNow,
                  acquisitionDate: dateNow,
                  fam: '',
                  dom: '',
                  bam: '',
                  contaPat: '1.2.3.1.1.01.00',
                  category: 'Informatica',
                  status: 'em_uso',
                  condition: 'novo',
                  detentorResponsavel: currentUser.name,
                  annualDepreciationRate: 20,
                  brand: '',
                  model: '',
                  description: '',
                  location: {
                    building: roomsList[0]?.building || 'Bloco A - Engenharia',
                    floor: roomsList[0]?.floor || '1º Andar',
                    room: roomsList[0]?.name || 'Laboratório de TI 101',
                    fullAddress: `${roomsList[0]?.building || 'Bloco A'}, ${roomsList[0]?.name || 'Sala 101'}`,
                    responsiblePerson: roomsList[0]?.responsible || currentUser.name
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

      {/* Filter and Search Panel */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-3">
        {/* Row 1: Dedicated Search Filters (Patrimônio, Nome do Material, Conta Pat) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* 1. Pesquisa por Patrimônio */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por Patrimônio..."
              value={searchPatrimonio}
              onChange={(e) => setSearchPatrimonio(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            {searchPatrimonio && (
              <button
                onClick={() => setSearchPatrimonio('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 2. Pesquisa por Nome do Material */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar por Nome do Material..."
              value={searchNomeMaterial}
              onChange={(e) => setSearchNomeMaterial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchNomeMaterial && (
              <button
                onClick={() => setSearchNomeMaterial('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 3. Filtro por Conta Pat */}
          <div className="relative">
            <select
              value={filterContaPat}
              onChange={(e) => setFilterContaPat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            >
              <option value="all">Todas as Contas Pat</option>
              {uniqueContaPatList.map((cp) => (
                <option key={cp} value={cp}>Conta Pat: {cp}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Secondary Filters & Clear Button */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          {/* General Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Busca geral (Nº Série, NE, NL, Local, Detentor...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 max-w-[150px]"
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
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todos Status</option>
            <option value="em_uso">Em Uso</option>
            <option value="disponivel">Disponível</option>
            <option value="descarga">Descarga</option>
          </select>

          {/* Pending / Incomplete Filter */}
          <select
            value={pendingFilter}
            onChange={(e) => setPendingFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Todos Cadastros</option>
            <option value="pending">Com campos em branco</option>
            <option value="complete">Cadastro completo</option>
          </select>

          {/* Reset Filters button */}
          {(searchPatrimonio || searchNomeMaterial || filterContaPat !== 'all' || searchTerm || categoryFilter !== 'all' || roomFilter !== 'all' || statusFilter !== 'all' || pendingFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchPatrimonio('');
                setSearchNomeMaterial('');
                setFilterContaPat('all');
                setSearchTerm('');
                setCategoryFilter('all');
                setRoomFilter('all');
                setStatusFilter('all');
                setPendingFilter('all');
              }}
              className="flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Limpar</span>
            </button>
          )}
        </div>
      </div>

      {/* --- SELECTION & BATCH ACTION TOOLBAR --- */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          {/* Botão Selecionar Todos */}
          <button
            type="button"
            onClick={handleToggleSelectAll}
            id="assets-select-all-btn"
            className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              allFilteredSelected
                ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/60 hover:bg-indigo-600/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={allFilteredSelected ? 'Desmarcar todos os itens' : 'Selecionar todos os materiais listados'}
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>
              {allFilteredSelected
                ? `Desmarcar Todos (${selectedAssetIds.length})`
                : `Selecionar Todos (${filteredAssets.length})`}
            </span>
          </button>

          {/* Quick Stats / Feedback */}
          <div className="text-xs text-slate-400 flex items-center space-x-2">
            <span>Listando <strong>{filteredAssets.length}</strong> {filteredAssets.length === 1 ? 'material' : 'materiais'}</span>
            {selectedAssetIds.length > 0 && (
              <span className="text-indigo-400 font-semibold bg-indigo-950/80 border border-indigo-800/60 px-2 py-0.5 rounded-md">
                {selectedAssetIds.length} selecionado(s)
              </span>
            )}
          </div>
        </div>

        {/* Botão Apagar e Limpar Seleção */}
        {canDelete && (
          <div className="flex items-center space-x-2">
            {selectedAssetIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedAssetIds([])}
                className="text-xs text-slate-400 hover:text-slate-200 px-2.5 py-1.5 transition-colors cursor-pointer"
              >
                Limpar seleção
              </button>
            )}

            {/* Botão Apagar que abre o Popup Tem certeza que deseja apagar? */}
            <button
              type="button"
              id="assets-bulk-delete-btn"
              onClick={() => {
                if (selectedAssetIds.length === 0) {
                  showNotification('Selecione ao menos um material para apagar.', 'error');
                  return;
                }
                setIsBulkDeleteModalOpen(true);
              }}
              disabled={selectedAssetIds.length === 0}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedAssetIds.length > 0
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/50 cursor-pointer active:scale-95'
                  : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed opacity-50'
              }`}
              title={
                selectedAssetIds.length > 0
                  ? `Apagar ${selectedAssetIds.length} materiais selecionados`
                  : 'Selecione materiais para habilitar o botão Apagar'
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Apagar {selectedAssetIds.length > 0 ? `(${selectedAssetIds.length})` : ''}</span>
            </button>
          </div>
        )}
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
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all group shadow-sm hover:shadow-lg ${
                selectedAssetIds.includes(asset.id)
                  ? 'border-indigo-500/80 ring-1 ring-indigo-500/50 bg-slate-900/95 shadow-indigo-950/30'
                  : 'border-slate-800 hover:border-indigo-500/50 hover:shadow-indigo-950/20'
              }`}
            >
              <div>
                {/* Card Header: Checkbox, Code & Status */}
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Individual selection checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectAsset(asset.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={selectedAssetIds.includes(asset.id) ? 'Desmarcar material' : 'Selecionar material'}
                    >
                      {selectedAssetIds.includes(asset.id) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 hover:text-slate-300" />
                      )}
                    </button>

                    {asset.code ? (
                      <span className="font-mono font-bold text-xs bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 px-2 py-0.5 rounded-md" title="Nº Patrimônio">
                        {asset.code}
                      </span>
                    ) : (
                      <span className="font-mono text-[10.5px] font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/60 px-2 py-0.5 rounded-md italic" title="Patrimônio a preencher">
                        A preencher
                      </span>
                    )}
                    {asset.codMaterial && (
                      <span className="font-mono text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded" title="Cod Material">
                        {asset.codMaterial}
                      </span>
                    )}
                    {asset.codUnidade && (
                      <span className="font-mono text-[9.5px] bg-emerald-950/50 text-emerald-300 border border-emerald-800/50 px-1.5 py-0.5 rounded" title="Cód Unidade Gestora">
                        {asset.codUnidade}
                      </span>
                    )}
                    {(!asset.code || !asset.name || !asset.detentorResponsavel) && (
                      <span className="text-[9.5px] bg-amber-950/60 text-amber-300 border border-amber-800/60 px-1.5 py-0.5 rounded font-medium">
                        Campos pendentes
                      </span>
                    )}
                  </div>

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

                {/* Title and Category */}
                <h3 className="font-bold text-sm text-white group-hover:text-indigo-200 transition-colors line-clamp-1">
                  {asset.name ? asset.name : <span className="italic text-amber-400 font-normal">Material sem nome (A preencher)</span>}
                </h3>

                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                  <span className="text-indigo-400 font-medium">{asset.category}</span>
                  {asset.serialNumber && (
                    <span className="font-mono text-slate-400">
                      S/N: {asset.serialNumber}
                    </span>
                  )}
                </div>

                {/* Badges Administrativos Rápidos (NE, NL, Conta Pat) */}
                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                  {asset.contaPat && (
                    <span className="text-[9.5px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                      Conta: {asset.contaPat}
                    </span>
                  )}
                  {asset.ne && (
                    <span className="text-[9.5px] bg-indigo-950/40 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-900/60 font-mono">
                      NE: {asset.ne}
                    </span>
                  )}
                  {asset.nl && (
                    <span className="text-[9.5px] bg-sky-950/40 text-sky-300 px-1.5 py-0.5 rounded border border-sky-900/60 font-mono">
                      NL: {asset.nl}
                    </span>
                  )}
                </div>

                {/* Metadata tags */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center space-x-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{asset.location?.room || <span className="italic text-slate-500">Local não definido (A preencher)</span>}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-400">
                    <span className="truncate mr-2" title={`Detentor Responsável: ${asset.detentorResponsavel || 'A preencher'}`}>
                      Detentor: <strong className="text-slate-200 font-semibold">{asset.detentorResponsavel || <span className="italic text-amber-400 font-normal">A preencher</span>}</strong>
                    </span>
                    <span className="font-mono font-bold text-emerald-400 shrink-0">
                      R$ {asset.acquisitionValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

            <div className="p-6 space-y-5">
              {/* Painel Oficial de Campos do Ativo Patrimonial */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    <span>Ficha de Ativo Patrimonial</span>
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-mono font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-800/60 px-2 py-0.5 rounded">
                      Cód Unidade: {activeAssetModal.codUnidade || 'Não inf.'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-indigo-300 bg-indigo-950/70 border border-indigo-800/60 px-2 py-0.5 rounded">
                      Cód Mat: {activeAssetModal.codMaterial || 'Não inf.'}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      activeAssetModal.status === 'em_uso' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/60' :
                      activeAssetModal.status === 'disponivel' ? 'bg-sky-950/60 text-sky-300 border border-sky-800/60' :
                      'bg-rose-950/60 text-rose-300 border border-rose-800/60'
                    }`}>
                      {activeAssetModal.status === 'em_uso' ? 'Em Uso' : activeAssetModal.status === 'disponivel' ? 'Disponível' : 'Descarga'}
                    </span>
                  </div>
                </div>

                {/* Grid dos Campos Oficiais */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {/* 1. Cod Unidade */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cod Unidade</span>
                    <span className="font-mono font-bold text-slate-200">
                      {activeAssetModal.codUnidade || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 2. Cod Material */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Cod Material</span>
                    <span className="font-mono font-bold text-slate-200">
                      {activeAssetModal.codMaterial || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 3. Patrimônio */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-indigo-900/40">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold block">Patrimônio</span>
                    <span className="font-mono font-black text-indigo-200 text-sm">
                      {activeAssetModal.code || <span className="text-amber-400 text-xs italic font-semibold">A preencher</span>}
                    </span>
                  </div>

                  {/* 4. N. Série */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">N. Série</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.serialNumber?.trim() || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 4. Categoria */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Categoria</span>
                    <span className="font-semibold text-slate-200">{activeAssetModal.category}</span>
                  </div>

                  {/* 5. Sala/Local de Alocação */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Sala/Local de Alocação</span>
                    <span className="font-semibold text-slate-200">
                      {activeAssetModal.location?.room || <span className="text-slate-500 italic font-normal">Não informada</span>}
                    </span>
                  </div>

                  {/* 6. Detentor Responsável */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-indigo-800/60 bg-indigo-950/20">
                    <span className="text-[10px] text-indigo-400 uppercase font-bold block">Detentor Responsável</span>
                    <span className="font-bold text-white truncate block" title={activeAssetModal.detentorResponsavel}>
                      {activeAssetModal.detentorResponsavel || <span className="text-amber-400 italic font-normal">A preencher</span>}
                    </span>
                  </div>

                  {/* 7. Valor */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Valor</span>
                    <span className="font-mono font-bold text-emerald-400">
                      R$ {activeAssetModal.acquisitionValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* 8. Data Inclusão */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Data Inclusão</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.dataInclusao || activeAssetModal.acquisitionDate || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 9. NE */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">NE</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.ne || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 10. NL */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">NL</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.nl || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 11. FAM */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">FAM</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.fam || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 12. Dom */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Dom</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.dom || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 13. BAM */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">BAM</span>
                    <span className="font-mono text-slate-200">
                      {activeAssetModal.bam || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 14. Conta Pat */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Conta Pat</span>
                    <span className="font-mono text-slate-200 truncate block" title={activeAssetModal.contaPat}>
                      {activeAssetModal.contaPat || <span className="text-slate-500 italic font-normal">Em branco</span>}
                    </span>
                  </div>

                  {/* 15. Status */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                    <span className="font-semibold text-slate-200">
                      {activeAssetModal.status === 'em_uso' ? 'Em Uso' : activeAssetModal.status === 'disponivel' ? 'Disponível' : 'Descarga'}
                    </span>
                  </div>

                  {/* 16. Conservação */}
                  <div className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Conservação</span>
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

                {/* 17. Nome do material & Especificações */}
                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Nome do Material</span>
                  <div className="text-slate-100 font-bold text-xs">{activeAssetModal.name || <span className="text-amber-400 italic font-normal">Em branco (A preencher)</span>}</div>
                </div>

                <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800 space-y-1">
                  <span className="text-[10px] text-indigo-400 uppercase font-bold block">Especificações</span>
                  <p className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap">
                    {activeAssetModal.especificacoes || activeAssetModal.description || <span className="text-slate-500 italic font-normal">Em branco (A preencher)</span>}
                  </p>
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
                  {activeAssetModal.location?.room || 'Almoxarifado Central'} ({activeAssetModal.location?.building || 'Bloco A'})
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
              {/* Bloco 1: Identificação do Material & Tombamento */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                  1. Identificação do Material & Tombamento
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Cod Unidade</label>
                    <input
                      type="text"
                      value={formAsset.codUnidade || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, codUnidade: e.target.value })}
                      placeholder="Ex: ESSgt - 160136"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Cod Material</label>
                    <input
                      type="text"
                      value={formAsset.codMaterial || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, codMaterial: e.target.value.toUpperCase() })}
                      placeholder="Ex: MAT-INF-0042"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Patrimônio</label>
                    <input
                      type="text"
                      value={formAsset.code || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, code: e.target.value.toUpperCase() })}
                      placeholder="Ex: PAT-2026-001 (ou deixe em branco para preencher posterior)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">N. Série</label>
                    <input
                      type="text"
                      value={formAsset.serialNumber || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, serialNumber: e.target.value })}
                      placeholder="Ex: SN-994821"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-300 mb-1">Nome do Material</label>
                    <input
                      type="text"
                      value={formAsset.name || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, name: e.target.value })}
                      placeholder="Ex: Notebook Dell Latitude 5440 i7 32GB"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Categoria*</label>
                    <select
                      value={formAsset.category}
                      onChange={(e) => setFormAsset({ ...formAsset, category: e.target.value as AssetCategory })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    >
                      <option value="Informatica">Informática</option>
                      <option value="Mobiliario">Mobiliário</option>
                      <option value="Equipamentos">Equipamentos</option>
                      <option value="Audiovisual">Audiovisual</option>
                      <option value="Laboratorio">Laboratório</option>
                      <option value="Veiculos">Veículos</option>
                      <option value="Ferramentas">Ferramentas</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Status*</label>
                    <select
                      value={formAsset.status}
                      onChange={(e) => setFormAsset({ ...formAsset, status: e.target.value as AssetStatus })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    >
                      <option value="em_uso">Em Uso</option>
                      <option value="disponivel">Disponível</option>
                      <option value="descarga">Descarga</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Estado de Conservação</label>
                    <select
                      value={formAsset.condition}
                      onChange={(e) => setFormAsset({ ...formAsset, condition: e.target.value as AssetCondition })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
                    >
                      <option value="novo">Novo</option>
                      <option value="bom">Bom</option>
                      <option value="danificado">Danificado</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bloco 2: Alocação & Detentor Responsável */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block">
                  2. Alocação & Custódia Direta
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Sala/Local de Alocação*</label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white"
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
                      placeholder="Nome do detentor direto do material"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500"
                    />
                    <datalist id="detentor-users-list">
                      {usersList.map((u) => (
                        <option key={u.id} value={u.name}>{u.department} ({u.role})</option>
                      ))}
                    </datalist>
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Responsável direto pela carga patrimonial e custódia
                    </span>
                  </div>
                </div>
              </div>

              {/* Bloco 3: Dados Administrativos & Orçamentários */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  3. Dados Administrativos, Documentais & Contábeis
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">NE (Nota de Empenho)</label>
                    <input
                      type="text"
                      value={formAsset.ne || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, ne: e.target.value.toUpperCase() })}
                      placeholder="Ex: 2024NE00018"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">NL (Nota de Lançamento)</label>
                    <input
                      type="text"
                      value={formAsset.nl || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, nl: e.target.value.toUpperCase() })}
                      placeholder="Ex: 2024NL00025"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">FAM</label>
                    <input
                      type="text"
                      value={formAsset.fam || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, fam: e.target.value.toUpperCase() })}
                      placeholder="Ex: FAM-001/2024"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Dom</label>
                    <input
                      type="text"
                      value={formAsset.dom || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, dom: e.target.value.toUpperCase() })}
                      placeholder="Ex: DOM-847291/24"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">BAM (Bol. Alteração)</label>
                    <input
                      type="text"
                      value={formAsset.bam || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, bam: e.target.value.toUpperCase() })}
                      placeholder="Ex: BAM-04/2024"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Conta Pat (Conta Patrimonial)</label>
                    <input
                      type="text"
                      value={formAsset.contaPat || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, contaPat: e.target.value })}
                      placeholder="Ex: 1.2.3.1.1.01.02"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 4: Financeiro & Entrada */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block">
                  4. Valores & Data de Inclusão
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formAsset.acquisitionValue ?? 0}
                      onChange={(e) => setFormAsset({ ...formAsset, acquisitionValue: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Data Inclusão</label>
                    <input
                      type="date"
                      value={formAsset.dataInclusao || formAsset.acquisitionDate || ''}
                      onChange={(e) => setFormAsset({ ...formAsset, dataInclusao: e.target.value, acquisitionDate: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Bloco 5: Especificações */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider block">
                  5. Especificações
                </span>
                <textarea
                  rows={3}
                  value={formAsset.especificacoes || formAsset.description || ''}
                  onChange={(e) => setFormAsset({ ...formAsset, especificacoes: e.target.value, description: e.target.value })}
                  placeholder="Detalhamento técnico completo, configuração, capacidades, dimensões e particularidades do material..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white leading-relaxed placeholder-slate-500"
                />
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

      {/* --- CONFIRM BULK DELETE POPUP: TEM CERTEZA QUE DESEJA APAGAR? --- */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <span className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Tem certeza que deseja apagar?</h3>
                <p className="text-[11px] text-slate-400">
                  Exclusão em lote de materiais e ativos patrimoniados selecionados
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-200 flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-100">
                    Você selecionou {selectedAssetIds.length} {selectedAssetIds.length === 1 ? 'material' : 'materiais'} para apagar permanentemente.
                  </p>
                  <p className="text-[11px] text-rose-300/90 leading-relaxed">
                    Esta ação não poderá ser desfeita. Todos os itens selecionados serão removidos do inventário, mapas de carga e relatórios.
                  </p>
                </div>
              </div>

              {/* Selected Assets Preview List */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Materiais selecionados ({selectedAssetIds.length})</span>
                  <span>Valor Total: R$ {assets
                    .filter(a => selectedAssetIds.includes(a.id))
                    .reduce((sum, a) => sum + (a.acquisitionValue || 0), 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  {assets
                    .filter(a => selectedAssetIds.includes(a.id))
                    .map(item => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px]"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <span className="font-mono font-bold text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-800/60 shrink-0">
                            {item.code || 'S/Nº'}
                          </span>
                          <span className="text-white truncate font-medium">
                            {item.name || 'Sem nome'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 shrink-0 ml-2">
                          <span className="text-slate-400 text-[10px]">
                            {item.location?.room || 'Sem sala'}
                          </span>
                          <span className="text-emerald-400 font-mono font-semibold">
                            R$ {item.acquisitionValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* User audit note */}
              <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                Operação executada por: <strong className="text-slate-200">{currentUser.name}</strong> ({currentUser.role}). O registro de exclusão em lote será gravado na <strong>Trilha de Auditoria</strong>.
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                id="confirm-bulk-delete-btn"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-lg shadow-rose-950/50 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Apagar ({selectedAssetIds.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRM SINGLE DELETE MODAL / POPUP: TEM CERTEZA QUE DESEJA APAGAR? --- */}
      {assetToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-800/60 rounded-2xl max-w-md w-full p-6 shadow-2xl text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <span className="p-2.5 rounded-xl bg-rose-950 text-rose-400 border border-rose-800/60">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-base text-white">Tem certeza que deseja apagar?</h3>
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
                    <span className="text-slate-500 block">Cod Unidade:</span>
                    <span className="font-mono text-emerald-400 font-medium">{assetToDelete.codUnidade || 'ESSgt - 160136'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Cod Material:</span>
                    <span className="font-mono text-slate-300 font-medium">{assetToDelete.codMaterial || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Localização:</span>
                    <span className="text-slate-300 font-medium">{assetToDelete.location?.room || 'Almoxarifado Central'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Detentor Responsável:</span>
                    <span className="text-indigo-300 font-semibold">{assetToDelete.detentorResponsavel || assetToDelete.location?.responsiblePerson || 'Carlos Alberto Silva'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block">Valor:</span>
                    <span className="text-emerald-400 font-medium font-mono">
                      R$ {assetToDelete.acquisitionValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
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
                <span>Sim, Apagar Material</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
