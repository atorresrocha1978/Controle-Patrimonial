import * as XLSX from 'xlsx';
import { PatrimonialAsset, AssetCategory, AssetCondition, User } from '../types';

export interface ParsedAssetRow {
  code: string;
  name: string;
  category: string;
  room: string;
  building?: string;
  floor?: string;
  responsiblePerson?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  acquisitionValue: number;
  acquisitionDate: string;
  condition: string;
  notes?: string;
  valid: boolean;
  error?: string;
}

export class ExcelService {
  /**
   * Generates and triggers download of a standardized Excel template for asset batch upload.
   */
  static downloadTemplate(): void {
    const headers = [
      'Numero_Patrimonio',
      'Descricao_Item',
      'Categoria',
      'Marca',
      'Modelo',
      'Numero_Serie',
      'Local_Sala',
      'Edificio',
      'Andar',
      'Responsavel_Sala',
      'Valor_Aquisicao',
      'Data_Aquisicao',
      'Estado_Conservacao',
      'Observacoes'
    ];

    const sampleRows = [
      [
        'PAT-2026-101',
        'Notebook Lenovo ThinkPad T14 Gen 4',
        'Informatica',
        'Lenovo',
        'ThinkPad T14',
        'PF-998821',
        'Laboratório de TI 101',
        'Bloco A - Engenharia',
        '1º Andar',
        'Mariana Duarte Souza',
        6450.00,
        '2026-05-10',
        'novo',
        'Equipamento em garantia oficial'
      ],
      [
        'PAT-2026-102',
        'Armário de Aço 2 Portas com Chave',
        'Mobiliario',
        'Pandin',
        'Linha Prime PA-120',
        'S/N',
        'Almoxarifado Central',
        'Bloco B - Logística',
        'Térreo',
        'Juliana Costa Lima',
        1150.00,
        '2026-03-12',
        'bom',
        'Armazenamento de ferramentas'
      ],
      [
        'PAT-2026-103',
        'Osciloscópio Digital 100MHz 2 Canais',
        'Laboratorio',
        'Rigol',
        'DS1102Z-E',
        'DS1ZA23490',
        'Laboratório Químico & P&D',
        'Bloco C - Pesquisa',
        '3º Andar',
        'Dra. Fernanda Lins',
        3890.00,
        '2026-01-20',
        'novo',
        'Calibração de bancada efetuada'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    // Set nice column widths
    ws['!cols'] = [
      { wch: 18 },
      { wch: 35 },
      { wch: 16 },
      { wch: 14 },
      { wch: 18 },
      { wch: 16 },
      { wch: 26 },
      { wch: 22 },
      { wch: 12 },
      { wch: 24 },
      { wch: 16 },
      { wch: 15 },
      { wch: 18 },
      { wch: 30 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Modelo_Inventario');
    XLSX.writeFile(wb, 'Modelo_Importacao_Patrimonio.xlsx');
  }

  /**
   * Parses an uploaded File object (.xlsx, .xls, .csv) and validates rows.
   */
  static async parseSpreadsheet(file: File): Promise<ParsedAssetRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

          const results: ParsedAssetRow[] = rawRows.map((row, index) => {
            // Flexible field matching
            const code = String(row['Numero_Patrimonio'] || row['Patrimonio'] || row['Código'] || row['Codigo'] || row['TAG'] || '').trim();
            const name = String(row['Descricao_Item'] || row['Descricao'] || row['Nome'] || row['Item'] || '').trim();
            const category = String(row['Categoria'] || 'Informatica').trim();
            const room = String(row['Local_Sala'] || row['Sala'] || row['Local'] || 'Almoxarifado Central').trim();
            const building = String(row['Edificio'] || row['Prédio'] || row['Bloco'] || 'Bloco A - Engenharia').trim();
            const floor = String(row['Andar'] || 'Térreo').trim();
            const responsible = String(row['Responsavel_Sala'] || row['Responsavel'] || 'Carlos Alberto Silva').trim();
            const brand = String(row['Marca'] || '').trim();
            const model = String(row['Modelo'] || '').trim();
            const serialNumber = String(row['Numero_Serie'] || row['Serie'] || '').trim();
            
            let value = Number(row['Valor_Aquisicao'] || row['Valor'] || row['Preço'] || 0);
            if (isNaN(value)) value = 0;

            let date = String(row['Data_Aquisicao'] || row['Data'] || new Date().toISOString().split('T')[0]).trim();
            // Handle excel numeric dates if any
            if (!isNaN(Number(date)) && Number(date) > 20000) {
              const jsDate = new Date((Number(date) - (25567 + 2)) * 86400 * 1000);
              date = jsDate.toISOString().split('T')[0];
            }

            const condition = String(row['Estado_Conservacao'] || row['Estado'] || 'bom').toLowerCase().trim();
            const notes = String(row['Observacoes'] || row['Notas'] || '').trim();

            let valid = true;
            let error = '';

            if (!code) {
              valid = false;
              error = 'Número de patrimônio obrigatório.';
            } else if (!name) {
              valid = false;
              error = 'Descrição do item obrigatória.';
            }

            return {
              code: code || `PAT-AUTO-${index + 1}`,
              name: name || 'Item Sem Descrição',
              category,
              room,
              building,
              floor,
              responsiblePerson: responsible,
              brand,
              model,
              serialNumber,
              acquisitionValue: value,
              acquisitionDate: date,
              condition: ['novo', 'bom', 'regular', 'danificado', 'sucata'].includes(condition) ? condition : 'bom',
              notes,
              valid,
              error
            };
          });

          resolve(results);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Converts validated rows into full PatrimonialAsset objects and saves them.
   */
  static convertToAssets(rows: ParsedAssetRow[], currentUser: User): PatrimonialAsset[] {
    const now = new Date().toISOString();
    return rows.map((r, i) => {
      const validCategories: AssetCategory[] = [
        'Informatica',
        'Mobiliario',
        'Equipamentos',
        'Veiculos',
        'Audiovisual',
        'Laboratorio',
        'Ferramentas'
      ];
      const matchedCategory = validCategories.find(
        c => c.toLowerCase() === r.category.toLowerCase()
      ) || 'Informatica';

      const validConditions: AssetCondition[] = ['novo', 'bom', 'regular', 'danificado', 'sucata'];
      const matchedCondition = validConditions.find(
        c => c.toLowerCase() === r.condition.toLowerCase()
      ) || 'bom';

      return {
        id: `ast-imp-${Date.now()}-${i}`,
        code: r.code,
        name: r.name,
        description: `${r.name} - Cadastrado via importação em lote.`,
        category: matchedCategory,
        brand: r.brand,
        model: r.model,
        serialNumber: r.serialNumber,
        location: {
          building: r.building || 'Bloco A - Engenharia',
          floor: r.floor || '1º Andar',
          room: r.room || 'Almoxarifado Central',
          fullAddress: `${r.building || 'Bloco A'}, ${r.floor || '1º Andar'}, ${r.room || 'Almoxarifado Central'}`,
          responsiblePerson: r.responsiblePerson || currentUser.name
        },
        status: 'em_uso',
        condition: matchedCondition,
        acquisitionDate: r.acquisitionDate || new Date().toISOString().split('T')[0],
        acquisitionValue: r.acquisitionValue || 1000,
        currentBookValue: r.acquisitionValue ? r.acquisitionValue * 0.9 : 900,
        annualDepreciationRate: 15,
        attachments: [],
        movementHistory: [
          {
            id: `mov-imp-${i}`,
            date: new Date().toISOString().split('T')[0],
            fromLocation: 'Importação em Lote',
            toLocation: r.room || 'Almoxarifado Central',
            responsibleUser: currentUser.name,
            reason: 'Cadastro massivo via planilha Excel'
          }
        ],
        notes: r.notes || 'Importado automaticamente via planilha.',
        syncedWithErp: false,
        lastAuditedDate: now.split('T')[0]
      };
    });
  }
}
