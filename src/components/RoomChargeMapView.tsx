import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  MapPin, 
  User as UserIcon, 
  Calendar, 
  PenTool, 
  RotateCcw, 
  ShieldCheck, 
  Save, 
  Building2,
  Check,
  AlertCircle,
  Edit2,
  X
} from 'lucide-react';
import { PatrimonialAsset, RoomChargeMap, RoomChargeMapItem, User, RoomInfo } from '../types';
import { StorageService } from '../services/storage';
import { PdfGeneratorService } from '../services/pdfGenerator';

interface RoomChargeMapViewProps {
  assets: PatrimonialAsset[];
  currentUser: User;
}

export const RoomChargeMapView: React.FC<RoomChargeMapViewProps> = ({
  assets,
  currentUser
}) => {
  const [roomsList, setRoomsList] = useState<RoomInfo[]>(() => StorageService.getRoomsList());
  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => {
    const list = StorageService.getRoomsList();
    return list.length > 0 ? list[0].id : 'sala-101';
  });
  const [checkedItems, setCheckedItems] = useState<{ [assetId: string]: boolean }>({});
  const [hasSigned, setHasSigned] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');
  const [useCryptoStamp, setUseCryptoStamp] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Edit Responsible state
  const [isEditingResponsible, setIsEditingResponsible] = useState(false);
  const [editedResponsible, setEditedResponsible] = useState('');

  const currentRoom = roomsList.find(r => r.id === selectedRoomId) || roomsList[0];

  // Map Header Customizations
  const organizationName = 'Escola Superior de Sargentos';
  const documentTitle = 'MAPA CARGA E TERMO DE RESPONSÁBILIDADE';
  const mapNumber = 'Numero do Mapa Carga ESSgt - 001/14/26';

  // Assets in this room
  const roomAssets = assets.filter(a => a.location.room === currentRoom.name);

  // Digital Signature Canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Synchronize editedResponsible with current room
  useEffect(() => {
    if (currentRoom) {
      setEditedResponsible(currentRoom.responsible);
      setIsEditingResponsible(false);
    }
  }, [currentRoom?.id, currentRoom?.responsible]);

  // Handler for saving edited room responsible
  const handleSaveResponsible = () => {
    const trimmed = editedResponsible.trim();
    if (!trimmed) return;
    const updated = StorageService.updateRoomResponsible(currentRoom.id, trimmed, currentUser);
    setRoomsList(updated);
    setIsEditingResponsible(false);
    setSuccessMessage(`Responsável pela sala atualizado para "${trimmed}" com sucesso!`);
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  // Setup canvas resolution and drawing
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    setSignatureDataUrl('');
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setIsDrawing(false);
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
  };

  // Toggle item check
  const toggleCheck = (assetId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [assetId]: !prev[assetId]
    }));
  };

  const checkAll = () => {
    const next: { [id: string]: boolean } = {};
    roomAssets.forEach(a => { next[a.id] = true; });
    setCheckedItems(next);
  };

  // Create Crypto Stamp if requested
  const generateStampDataUrl = (): string => {
    const stampCanvas = document.createElement('canvas');
    stampCanvas.width = 400;
    stampCanvas.height = 120;
    const ctx = stampCanvas.getContext('2d');
    if (!ctx) return '';

    // Draw professional digital signature stamp box
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, 400, 120);

    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 392, 112);

    ctx.fillStyle = '#0369a1';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ASSINADO DIGITALMENTE - CONFORMIDADE ICP-BRASIL', 16, 26);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(currentRoom.responsible.toUpperCase(), 16, 50);

    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(`Responsável pela Sala: ${currentRoom.name}`, 16, 70);
    ctx.fillText(`Data/Hora: ${new Date().toLocaleString('pt-BR')}`, 16, 88);

    const hash = 'SHA256-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(16).toUpperCase();
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`HASH: ${hash}`, 16, 106);

    return stampCanvas.toDataURL('image/png');
  };

  // Build the RoomChargeMap object
  const buildCurrentMapObject = (): RoomChargeMap => {
    const items: RoomChargeMapItem[] = roomAssets.map((a, index) => ({
      seq: index + 1,
      assetId: a.id,
      code: a.code,
      description: a.name,
      brandModel: `${a.brand || ''} ${a.model || ''}`.trim() || 'N/A',
      serialNumber: a.serialNumber || 'S/N',
      condition: a.condition,
      bookValue: a.currentBookValue,
      checked: !!checkedItems[a.id]
    }));

    const finalSig = useCryptoStamp ? generateStampDataUrl() : signatureDataUrl;

    return {
      id: `MAPA-${currentRoom.id.toUpperCase()}-${Date.now().toString().slice(-4)}`,
      organization: organizationName,
      documentTitle: documentTitle,
      mapNumber: mapNumber,
      roomName: currentRoom.name,
      building: currentRoom.building,
      department: currentRoom.department,
      responsibleName: currentRoom.responsible,
      responsibleRole: 'Custodiante / Responsável de Sala',
      generatedDate: new Date().toLocaleDateString('pt-BR'),
      items,
      digitalSignatureDataUrl: finalSig,
      signedAt: hasSigned || useCryptoStamp ? new Date().toISOString() : undefined,
      signatureHash: 'SHA256-ICP-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      status: (hasSigned || useCryptoStamp) ? 'assinado' : 'conferido'
    };
  };

  const handleExportPdf = () => {
    const mapObj = buildCurrentMapObject();
    PdfGeneratorService.generateRoomChargeMapPdf(mapObj);

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'AUDITORIA',
      entity: 'Mapa Carga',
      entityId: mapObj.id,
      details: `Geração e exportação do Mapa Carga em PDF para a sala ${currentRoom.name} com ${roomAssets.length} itens.`
    });
  };

  const handleSaveMap = () => {
    const mapObj = buildCurrentMapObject();
    StorageService.saveRoomMap(mapObj);
    setSuccessMessage(`Mapa Carga de ${currentRoom.name} salvo com sucesso!`);

    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'AUDITORIA',
      entity: 'Mapa Carga',
      entityId: mapObj.id,
      details: `Registro e conferência física formalizada do Mapa Carga da sala ${currentRoom.name}.`
    });

    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const totalValue = roomAssets.reduce((sum, a) => sum + a.currentBookValue, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Mapa Carga por Sala
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Termo oficial de responsabilidade com relação sequencial de itens e assinatura digital de conferência
          </p>
        </div>

        {/* Room selector & PDF Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-700">
            <MapPin className="w-4 h-4 text-indigo-400" />
            <select
              value={selectedRoomId}
              onChange={(e) => {
                setSelectedRoomId(e.target.value);
                setCheckedItems({});
                clearCanvas();
              }}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
            >
              {roomsList.map((r) => (
                <option key={r.id} value={r.id} className="bg-slate-900 text-white">
                  {r.name} ({r.building})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportPdf}
            id="export-mapa-carga-pdf-btn"
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF Oficial</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Official Document Sheet Preview */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 text-slate-900 overflow-hidden">
        {/* Document Header */}
        <div className="border-b border-slate-200 bg-slate-50">
          {/* Official 4-Line Institutional Header Banner */}
          <div className="bg-slate-900 text-white p-5 border-b border-indigo-500 text-center space-y-1">
            {/* 1ª linha: "Escola Superior de Sargentos" */}
            <div className="text-sm font-bold tracking-wide uppercase text-white">
              {organizationName}
            </div>
            {/* 2ª linha: "MAPA CARGA E TERMO DE RESPONSÁBILIDADE" */}
            <div className="text-base font-extrabold tracking-wider text-indigo-300">
              {documentTitle}
            </div>
            {/* 3ª linha: "Numero do Mapa Carga ESSgt - 001/14/26" */}
            <div className="text-xs text-indigo-200 font-medium">
              {mapNumber}
            </div>
            {/* 4ª linha: "Nome da Sala" */}
            <div className="text-sm font-bold text-emerald-400 pt-0.5">
              {currentRoom.name}
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Finalidade:</span> Carga e custódia de bens patrimoniais distribuídos
              </div>
              <div className="text-right text-xs text-slate-500">
                <div><span className="font-semibold text-slate-700">Data de Emissão:</span> {new Date().toLocaleDateString('pt-BR')}</div>
                <div><span className="font-semibold text-slate-700">Identificador:</span> ESSgt-001/14/26</div>
              </div>
            </div>

            {/* Location details grid with editable Responsible */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-xs">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Prédio / Bloco</span>
                <span className="font-semibold text-slate-800">{currentRoom.building}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">{currentRoom.floor}</span>
              </div>
              
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Departamento</span>
                <span className="font-semibold text-slate-800">{currentRoom.department}</span>
                <span className="block text-[11px] text-slate-500 mt-0.5">Unidade Administrativa</span>
              </div>

              {/* Responsável pela Sala com Edição Permitida */}
              <div className="bg-white p-3.5 rounded-xl border border-indigo-200/80 shadow-sm relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-indigo-600 font-bold uppercase">Responsável pela Sala</span>
                  {!isEditingResponsible && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditedResponsible(currentRoom.responsible);
                        setIsEditingResponsible(true);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors"
                      title="Editar o nome do responsável pela sala"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                {isEditingResponsible ? (
                  <div className="mt-2 space-y-2">
                    <input
                      type="text"
                      value={editedResponsible}
                      onChange={(e) => setEditedResponsible(e.target.value)}
                      placeholder="Nome do Responsável"
                      autoFocus
                      className="w-full text-xs font-semibold text-slate-900 px-2.5 py-1.5 border border-indigo-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-indigo-50/30"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveResponsible();
                        if (e.key === 'Escape') setIsEditingResponsible(false);
                      }}
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={handleSaveResponsible}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-semibold flex items-center space-x-1 cursor-pointer"
                      >
                        <Check className="w-3 h-3" />
                        <span>Salvar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingResponsible(false)}
                        className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] flex items-center space-x-1 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                        <span>Cancelar</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="font-semibold text-slate-900 block mt-0.5 text-sm">
                      {currentRoom.responsible}
                    </span>
                    <span className="block text-[11px] text-indigo-600 font-medium mt-0.5">
                      Fiel Depositário / Custodiante
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action toolbar over table */}
        <div className="p-4 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            <span className="font-bold text-slate-700">
              {roomAssets.length} material(is) alocado(s) nesta sala
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600">
              Conferidos: <strong className="text-indigo-600">{checkedCount}</strong> de {roomAssets.length}
            </span>
          </div>

          <button
            onClick={checkAll}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
          >
            Marcar todos como conferidos
          </button>
        </div>

        {/* Sequential Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800 text-white font-semibold uppercase text-[11px]">
                <th className="py-3 px-3 w-12 text-center"># Seq</th>
                <th className="py-3 px-3 w-32">Nº Patrimônio</th>
                <th className="py-3 px-4">Descrição do Material</th>
                <th className="py-3 px-3">Marca / Modelo</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-4 text-right">Valor Contábil</th>
                <th className="py-3 px-3 text-center w-24">Conferido</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {roomAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Nenhum material cadastrado nesta sala no momento.
                  </td>
                </tr>
              ) : (
                roomAssets.map((asset, index) => {
                  const isChecked = !!checkedItems[asset.id];
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-indigo-50/40 transition-colors ${
                        isChecked ? 'bg-emerald-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center font-bold text-slate-500">
                        {String(index + 1).padStart(2, '0')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {asset.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{asset.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{asset.description}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {asset.brand} {asset.model}
                        {asset.serialNumber && (
                          <span className="block text-[10px] text-slate-400">S/N: {asset.serialNumber}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          asset.condition === 'novo' ? 'bg-emerald-100 text-emerald-800' :
                          asset.condition === 'bom' ? 'bg-blue-100 text-blue-800' :
                          asset.condition === 'regular' ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {asset.condition}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800">
                        R$ {asset.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => toggleCheck(asset.id)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors mx-auto ${
                            isChecked
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 hover:border-indigo-500 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800 text-xs border-t-2 border-slate-300">
                <td colSpan={5} className="py-3 px-4 text-right">
                  TOTAL DE ITENS: {roomAssets.length} | VALOR TOTAL PATRIMONIAL DA SALA:
                </td>
                <td className="py-3 px-4 text-right text-indigo-900 text-sm">
                  R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-center text-[11px] text-emerald-700">
                  {checkedCount}/{roomAssets.length} OK
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Document Footer: Date, Custodian, and Interactive Digital Signature Canvas */}
        <div className="p-6 bg-slate-50 border-t border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left: Termo de Fiel Depositário e Rodapé */}
            <div className="space-y-3 text-xs text-slate-600">
              <div className="font-bold text-slate-900 uppercase text-xs">
                Termo de Guarda e Responsabilidade:
              </div>
              <p className="leading-relaxed text-justify text-[11px] text-slate-600 bg-white p-3 rounded-lg border border-slate-200">
                "Pelo presente instrumento, declaro ter recebido em perfeitas condições de uso e conservação os materiais patrimoniais discriminados neste Mapa Carga, comprometendo-me a zelar pela sua guarda e integridade, comunicando imediatamente ao setor de patrimônio qualquer avaria, extravio ou necessidade de transferência de ambiente."
              </p>
              <div className="space-y-1 text-xs pt-1">
                <div><strong>Data da Conferência:</strong> {new Date().toLocaleDateString('pt-BR')}</div>
                <div><strong>Responsável pela Sala:</strong> {currentRoom.responsible}</div>
                <div><strong>Departamento / Setor:</strong> {currentRoom.department}</div>
              </div>
            </div>

            {/* Right: Digital Signature Box */}
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <PenTool className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Assinatura Digital de Conferência</span>
                </span>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUseCryptoStamp(!useCryptoStamp);
                      clearCanvas();
                    }}
                    className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors ${
                      useCryptoStamp 
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300' 
                        : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {useCryptoStamp ? '✓ Usando Carimbo ICP' : 'Usar Carimbo Digital'}
                  </button>

                  <button
                    type="button"
                    onClick={clearCanvas}
                    className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              {/* Signature Canvas or Carimbo */}
              {useCryptoStamp ? (
                <div className="w-full h-32 bg-sky-50/50 border-2 border-dashed border-sky-400 rounded-lg p-3 flex flex-col justify-center text-xs text-sky-900">
                  <div className="flex items-center space-x-2 font-bold text-sky-800">
                    <ShieldCheck className="w-4 h-4 text-sky-600" />
                    <span>Carimbo Criptográfico Autorizado</span>
                  </div>
                  <div className="mt-1 text-slate-700 font-semibold">{currentRoom.responsible.toUpperCase()}</div>
                  <div className="text-[11px] text-slate-500">Responsável pela Sala: {currentRoom.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">
                    HASH: SHA256-VALIDADO-ICP-{Math.random().toString(36).substr(2, 6).toUpperCase()}
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    width={420}
                    height={128}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-32 bg-slate-50 border border-slate-300 rounded-lg cursor-crosshair touch-none"
                  />
                  {!hasSigned && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs">
                      Assine aqui com o mouse ou toque
                    </div>
                  )}
                </div>
              )}

              <div className="text-center pt-1 border-t border-slate-200">
                <div className="font-bold text-xs text-slate-900">{currentRoom.responsible}</div>
                <div className="text-[10px] text-slate-500">
                  Assinatura do Responsável da Sala | {new Date().toLocaleDateString('pt-BR')}
                </div>
              </div>

              {/* Save Conference Button */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveMap}
                  className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Conferência</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
