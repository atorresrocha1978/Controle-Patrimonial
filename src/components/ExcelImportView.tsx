import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  Table, 
  Layers, 
  Check, 
  X,
  FileCheck,
  ArrowRight
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
      details: `Importação em lote de ${newAssets.length} novos ativos via arquivo "${file?.name}".`
    });

    setImportSuccess(`${newAssets.length} novos materiais patrimoniados importados com sucesso para o sistema!`);
    setRows([]);
    setFile(null);
    onImportComplete();
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.length - validCount;

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
            Envie sua planilha padrão para cadastrar dezenas ou centenas de produtos simultaneamente
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
            ou clique para navegar no computador
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
          Processando e validando planilha...
        </div>
      )}

      {/* Preview Table if rows parsed */}
      {rows.length > 0 && (
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-4">
          <div className="p-4 bg-slate-850 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4">
              <span className="font-bold text-white text-sm">
                Pré-Visualização dos Dados ({rows.length} registros)
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                {validCount} válidos
              </span>
              {invalidCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  {invalidCount} com pendências
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
                  <th className="py-2.5 px-3">Patrimônio</th>
                  <th className="py-2.5 px-3">Descrição</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Sala Alocação</th>
                  <th className="py-2.5 px-3">Valor (R$)</th>
                  <th className="py-2.5 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {rows.slice(0, 50).map((row, idx) => (
                  <tr key={idx} className={row.valid ? 'hover:bg-slate-800/40' : 'bg-rose-950/20'}>
                    <td className="py-2.5 px-3">
                      {row.valid ? (
                        <span className="flex items-center text-emerald-400 space-x-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>OK</span>
                        </span>
                      ) : (
                        <span className="flex items-center text-rose-400 space-x-1" title={row.error}>
                          <X className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[80px]">{row.error}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{row.code}</td>
                    <td className="py-2.5 px-3 font-medium text-white">{row.name}</td>
                    <td className="py-2.5 px-3">{row.category}</td>
                    <td className="py-2.5 px-3">{row.room}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-mono">
                      R$ {row.acquisitionValue.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 capitalize">{row.condition}</td>
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
