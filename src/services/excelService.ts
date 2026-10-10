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
  detentorResponsavel?: string;
  codUnidade?: string;
  codMaterial?: string;
  ne?: string;
  nl?: string;
  fam?: string;
  dom?: string;
  bam?: string;
  contaPat?: string;
  especificacoes?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  acquisitionValue: number;
  acquisitionDate: string;
  dataInclusao?: string;
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
      'Cod_Unidade',
      'Cod_Material',
      'Numero_Patrimonio',
      'Nome_Material',
      'Categoria',
      'Numero_Serie',
      'NE',
      'NL',
      'FAM',
      'Dom',
      'BAM',
      'Conta_Pat',
      'Local_Sala',
      'Detentor_Responsavel',
      'Valor',
      'Data_Inclusao',
      'Especificacoes',
      'Estado_Conservacao',
      'Marca',
      'Modelo',
      'Observacoes'
    ];

    const sampleRows = [
      [
        'ESSgt - 160136',
        'MAT-INF-0042',
        'PAT-2026-101',
        'Notebook Lenovo ThinkPad T14 Gen 4',
        'Informatica',
        'PF-998821',
        '2024NE00018',
        '2024NL00025',
        'FAM-001/2024',
        'DOM-847291/24',
        'BAM-04/2024',
        '1.2.3.1.1.01.02',
        'Laboratório de TI 101',
        'Mariana Duarte Souza',
        6450.00,
        '2026-05-10',
        'Intel Core i7 13ª Geração, 32GB RAM, SSD 1TB NVMe, Tela 14" IPS',
        'novo',
        'Lenovo',
        'ThinkPad T14',
        'Equipamento em garantia oficial'
      ],
      [
        'ESSgt - 160136',
        'MAT-MOB-0087',
        'PAT-2026-102',
        'Armário de Aço 2 Portas com Chave',
        'Mobiliario',
        'S/N',
        '2024NE00044',
        '2024NL00031',
        'FAM-002/2024',
        'DOM-044321/24',
        'BAM-08/2024',
        '1.2.3.1.1.02.01',
        'Almoxarifado Central',
        'Juliana Costa Lima',
        1150.00,
        '2026-03-12',
        'Armário em chapa de aço 24, 4 prateleiras reguláveis, pintura eletrostática',
        'bom',
        'Pandin',
        'Linha Prime PA-120',
        'Armazenamento de ferramentas'
      ],
      [
        'ESSgt - 160136',
        'MAT-LAB-0005',
        'PAT-2026-103',
        'Osciloscópio Digital 100MHz 2 Canais',
        'Laboratorio',
        'DS1ZA23490',
        '2024NE00012',
        '2024NL00009',
        'FAM-003/2024',
        'DOM-011983/24',
        'BAM-02/2024',
        '1.2.3.1.1.04.10',
        'Laboratório Químico & P&D',
        'Dra. Fernanda Lins',
        3890.00,
        '2026-01-20',
        'Osciloscópio digital 100MHz, taxa amostragem 1GSa/s, tela 7 polegadas',
        'novo',
        'Rigol',
        'DS1102Z-E',
        'Calibração de bancada efetuada'
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
    // Set nice column widths
    ws['!cols'] = [
      { wch: 18 },
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
            const name = String(row['Nome_Material'] || row['Nome'] || row['Descricao_Item'] || row['Descricao'] || row['Item'] || '').trim();
            const codUnidade = String(row['Cod_Unidade'] || row['CodUnidade'] || row['Codigo_Unidade'] || row['Unidade'] || row['UG'] || 'ESSgt - 160136').trim();
            const codMaterial = String(row['Cod_Material'] || row['CodMaterial'] || row['Codigo_Material'] || '').trim();
            const category = String(row['Categoria'] || 'Informatica').trim();
            const room = String(row['Local_Sala'] || row['Sala'] || row['Local'] || 'Almoxarifado Central').trim();
            const building = String(row['Edificio'] || row['Prédio'] || row['Bloco'] || 'Bloco A - Engenharia').trim();
            const floor = String(row['Andar'] || 'Térreo').trim();
            const responsible = String(row['Responsavel_Sala'] || row['Responsavel'] || 'Carlos Alberto Silva').trim();
            const detentorResponsavel = String(row['Detentor_Responsavel'] || row['Detentor Responsavel'] || row['Detentor'] || responsible || 'Carlos Alberto Silva').trim();
            const ne = String(row['NE'] || row['Nota_Empenho'] || '').trim();
            const nl = String(row['NL'] || row['Nota_Lancamento'] || '').trim();
            const fam = String(row['FAM'] || row['Ficha_Acompanhamento'] || '').trim();
            const dom = String(row['Dom'] || row['DOM'] || row['Doc_Origem'] || '').trim();
            const bam = String(row['BAM'] || row['Boletim_Alteracao'] || '').trim();
            const contaPat = String(row['Conta_Pat'] || row['ContaPat'] || row['Conta_Patrimonial'] || '1.2.3.1.1.01.00').trim();
            const especificacoes = String(row['Especificacoes'] || row['Especificações'] || row['Descricao_Detalhada'] || '').trim();
            const brand = String(row['Marca'] || '').trim();
            const model = String(row['Modelo'] || '').trim();
            const serialNumber = String(row['Numero_Serie'] || row['Serie'] || '').trim();
            
            let value = Number(row['Valor'] || row['Valor_Aquisicao'] || row['Preço'] || 0);
            if (isNaN(value)) value = 0;

            let date = String(row['Data_Inclusao'] || row['Data_Aquisicao'] || row['Data'] || new Date().toISOString().split('T')[0]).trim();
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
              error = 'Nome do material obrigatório.';
            }

            return {
              code: code || `PAT-AUTO-${index + 1}`,
              name: name || 'Item Sem Descrição',
              codUnidade: codUnidade || 'ESSgt - 160136',
              codMaterial: codMaterial || `MAT-${(code || '').replace(/\D/g, '').padStart(4, '0') || '001'}`,
              category,
              room,
              building,
              floor,
              responsiblePerson: responsible,
              detentorResponsavel,
              ne,
              nl,
              fam,
              dom,
              bam,
              contaPat,
              especificacoes,
              brand,
              model,
              serialNumber,
              acquisitionValue: value,
              acquisitionDate: date,
              dataInclusao: date,
              condition: ['novo', 'bom', 'danificado'].includes(condition) ? condition : 'bom',
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

      const validConditions: AssetCondition[] = ['novo', 'bom', 'danificado'];
      const matchedCondition = validConditions.find(
        c => c.toLowerCase() === r.condition.toLowerCase()
      ) || 'bom';

      const dateStr = r.dataInclusao || r.acquisitionDate || now.split('T')[0];

      return {
        id: `ast-imp-${Date.now()}-${i}`,
        codUnidade: r.codUnidade || 'ESSgt - 160136',
        codMaterial: r.codMaterial || `MAT-${r.code.replace(/\D/g, '').padStart(4, '0') || '001'}`,
        code: r.code,
        serialNumber: r.serialNumber,
        ne: r.ne || '',
        nl: r.nl || '',
        name: r.name,
        especificacoes: r.especificacoes || `${r.name} - Cadastrado via importação em lote.`,
        acquisitionValue: r.acquisitionValue || 1000,
        dataInclusao: dateStr,
        acquisitionDate: dateStr,
        fam: r.fam || '',
        dom: r.dom || '',
        bam: r.bam || '',
        contaPat: r.contaPat || '1.2.3.1.1.01.00',
        detentorResponsavel: r.detentorResponsavel || r.responsiblePerson || currentUser.name,
        status: 'em_uso',
        category: matchedCategory,
        description: r.especificacoes || `${r.name} - Cadastrado via importação em lote.`,
        brand: r.brand,
        model: r.model,
        location: {
          building: r.building || 'Bloco A - Engenharia',
          floor: r.floor || '1º Andar',
          room: r.room || 'Almoxarifado Central',
          fullAddress: `${r.building || 'Bloco A'}, ${r.floor || '1º Andar'}, ${r.room || 'Almoxarifado Central'}`,
          responsiblePerson: r.responsiblePerson || currentUser.name
        },
        condition: matchedCondition,
        currentBookValue: r.acquisitionValue ? r.acquisitionValue * 0.9 : 900,
        annualDepreciationRate: 15,
        attachments: [],
        movementHistory: [
          {
            id: `mov-imp-${i}`,
            date: dateStr,
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
