import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Check, 
  FileCheck,
  Clock,
  Info
} from 'lucide-react';
import { ExcelService, ParsedAssetRow } from '../services/excelService';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface ExcelImportViewProps {
  currentUser: User;
  onImportComplete: () => void;
}

export const ExcelImportView: React.FC<ExcelImportViewProps> = ({
  currentUser,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedAssetRow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsParsing(true);
    setParseError('');
    setImportSuccess('');

    try {
      const parsed = await ExcelService.parseSpreadsheet(selectedFile);
      setRows(parsed);
    } catch (err: any) {
      console.error(err);
      setParseError('Falha ao processar arquivo. Verifique se é uma planilha válida (.xlsx, .xls ou .csv).');
      setRows([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    const validRows = rows.filter(r => r.valid);
    if (validRows.length === 0) return;

    const newAssets = ExcelService.convertToAssets(validRows, currentUser);
    const currentAssets = StorageService.getAssets();
    
    // Save to storage
    StorageService.saveAssets([...newAssets, ...currentAssets]);

    // Audit log
    StorageService.addAuditLog({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'IMPORTACAO_EXCEL',
      entity: 'Importação em Lote',
      entityId: `BATCH-${Date.now()}`,
      details: `Importação em lote de ${newAssets.length} novos ativos via arquivo "${file?.name}". Células em branco aceitas para preenchimento posterior.`
    });

    setImportSuccess(`${newAssets.length} materiais patrimoniados importados com sucesso! Os campos em branco foram aceitos e podem ser preenchidos a qualquer momento no gerenciamento de ativos.`);
    setRows([]);
    setFile(null);
    onImportComplete();
  };

  const validCount = rows.filter(r => r.valid).length;
  const blankCellsRowsCount = rows.filter(r => r.hasBlankFields).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Importação de Ativos em Lote (Excel / CSV)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Envie sua planilha para cadastrar múltiplos materiais patrimoniais simultaneamente
          </p>
        </div>

        {/* Download Template Button */}
        <button
          onClick={() => ExcelService.downloadTemplate()}
          id="download-excel-template-btn"
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 shadow-sm transition-colors cursor-pointer"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Baixar Modelo Padrão Excel (.xlsx)</span>
        </button>
      </div>

      {/* Info notice about blank cells permission */}
      <div className="p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-indigo-200 text-xs flex items-center space-x-2.5">
        <Info className="w-4 h-4 text-indigo-400 shrink-0" />
        <span>
          <strong>Suporte a células em branco ativo:</strong> Você pode fazer upload de planilhas com qualquer campo em branco. O sistema aceita o registro sem bloqueios para que o preenchimento seja finalizado posteriormente.
        </span>
      </div>

      {importSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {parseError && (
        <div className="p-4 bg-rose-950/60 border border-rose-700/50 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center bg-slate-900/60 transition-all cursor-pointer"
      >
        <label className="cursor-pointer block">
          <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 text-indigo-400 flex items-center justify-center mx-auto mb-3 border border-indigo-800/60">
            <Upload className="w-7 h-7" />
          </div>
          <span className="text-sm font-bold text-white block">
            {file ? file.name : 'Arraste e solte o arquivo Excel (.xlsx / .csv) aqui'}
          </span>
          <span className="text-xs text-slate-400 mt-1 block">
            ou clique para navegar no computador (células em branco são aceitas)
          </span>
          <span className="inline-block mt-3 text-[11px] px-2.5 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Formatos suportados: .XLSX, .XLS, .CSV
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            className="hidden"
          />
        </label>
      </div>

      {isParsing && (
        <div className="p-6 text-center text-xs text-indigo-400">
          Processando e analisando planilha...
        </div>
      )}

      {/* Preview Table if rows parsed */}
      {rows.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4">
          <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className="font-bold text-white text-sm">
                Pré-Visualização dos Dados ({rows.length} registros)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                {validCount} aceitos para importação
              </span>
              {blankCellsRowsCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/70 font-semibold">
                  {blankCellsRowsCount} com campos em branco (para preencher depois)
                </span>
              )}
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={validCount === 0}
              id="confirm-excel-import-btn"
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Confirmar e Importar {validCount} Ativos</span>
            </button>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Unidade</th>
                  <th className="py-2.5 px-3">Patrimônio</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Sala Alocação</th>
                  <th className="py-2.5 px-3">Detentor</th>
                  <th className="py-2.5 px-3">Valor (R$)</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {rows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className={row.hasBlankFields ? 'hover:bg-slate-800/40 bg-amber-950/10' : 'hover:bg-slate-800/40'}>
                    <td className="py-2.5 px-3">
                      {row.hasBlankFields ? (
                        <span className="flex items-center text-amber-400 space-x-1" title={row.blankFields ? `Campos em branco: ${row.blankFields.join(', ')}` : 'Campos em branco aceitos'}>
                          <Clock className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                          <span className="text-[11px] font-medium">Aceito (a preencher)</span>
                        </span>
                      ) : (
                        <span className="flex items-center text-emerald-400 space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Completo</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px]">
                      {row.codUnidade ? (
                        <span className="text-emerald-400">{row.codUnidade}</span>
                      ) : (
                        <span className="text-slate-500 italic">(Em branco)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      {row.code ? (
                        <span className="text-indigo-400">{row.code}</span>
                      ) : (
                        <span className="text-amber-400 italic font-normal text-[11px]">(Em branco - a preencher)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      {row.name ? (
                        <span className="text-white">{row.name}</span>
                      ) : (
                        <span className="text-amber-400 italic text-[11px]">(Em branco - a preencher)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.category ? row.category : <span className="text-slate-500 italic">(Em branco)</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.room ? row.room : <span className="text-slate-500 italic">(Em branco)</span>}
                    </td>
                    <td className="py-2.5 px-3">
                      {row.detentorResponsavel || row.responsiblePerson ? (
                        <span className="text-slate-300 font-medium">{row.detentorResponsavel || row.responsiblePerson}</span>
                      ) : (
                        <span className="text-slate-500 italic">(Em branco)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {row.acquisitionValue ? (
                        <span className="text-emerald-400">R$ {row.acquisitionValue.toFixed(2)}</span>
                      ) : (
                        <span className="text-slate-500 italic">R$ 0,00</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        row.condition === 'novo' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        row.condition === 'bom' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                        'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {row.condition === 'danificado' ? 'Danificado' : row.condition === 'novo' ? 'Novo' : 'Bom'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
