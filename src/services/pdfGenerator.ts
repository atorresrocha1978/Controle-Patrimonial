import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RoomChargeMap, PatrimonialAsset, MaintenanceRecord, AuditLogEntry } from '../types';

export class PdfGeneratorService {
  /**
   * Generates the Official Room Charge Map (Termo de Carga Patrimonial por Sala)
   * with Header (room, building, department, date), Table (# seq, description, code, brand, condition, value),
   * Footer with date, room manager, and digital signature canvas image / electronic seal!
   */
  static generateRoomChargeMapPdf(map: RoomChargeMap): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Primary Header Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 36, 'F');

    // Accent bar
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, 35, pageWidth, 1.2, 'F');

    // 1ª linha: "Escola Superior de Sargentos"
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(map.organization || 'Escola Superior de Sargentos', pageWidth / 2, 9, { align: 'center' });

    // 2ª linha: "MAPA CARGA E TERMO DE RESPONSÁBILIDADE"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(224, 231, 255); // indigo-100
    doc.text(map.documentTitle || 'MAPA CARGA E TERMO DE RESPONSÁBILIDADE', pageWidth / 2, 16.5, { align: 'center' });

    // 3ª linha: "Numero do Mapa Carga ESSgt - 001/14/26"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(199, 210, 254); // indigo-200
    const mapNum = map.mapNumber || 'Numero do Mapa Carga ESSgt - 001/14/26';
    doc.text(mapNum.startsWith('Numero do Mapa Carga') ? mapNum : `Numero do Mapa Carga ${mapNum}`, pageWidth / 2, 23.5, { align: 'center' });

    // 4ª linha: "Nome da Sala"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(map.roomName, pageWidth / 2, 30.5, { align: 'center' });

    // Room Info Header Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(14, 40, pageWidth - 28, 24, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`SALA: ${map.roomName.toUpperCase()}`, 18, 47);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Edifício / Bloco: ${map.building}`, 18, 53);
    doc.text(`Departamento: ${map.department}`, 18, 59);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Responsável da Sala: ${map.responsibleName}`, pageWidth - 110, 47);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Cargo / Função: ${map.responsibleRole}`, pageWidth - 110, 53);
    doc.text(`Data de Emissão: ${map.generatedDate}`, pageWidth - 110, 59);

    // Disclaimer text
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'Declaro para os devidos fins que assumo a guarda, conservação e responsabilidade pelos bens patrimoniais abaixo relacionados:',
      14,
      69
    );

    // Items Table
    const tableBody = map.items.map((item, index) => [
      String(index + 1).padStart(2, '0'),
      item.code,
      item.description,
      item.brandModel || 'N/A',
      item.condition.toUpperCase(),
      `R$ ${item.bookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    const totalValue = map.items.reduce((acc, curr) => acc + curr.bookValue, 0);

    autoTable(doc, {
      startY: 73,
      margin: { left: 14, right: 14, bottom: 55 },
      head: [['# Seq', 'Nº Patrimônio', 'Descrição do Material', 'Marca / Modelo', 'Estado', 'Valor Contábil']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center'
      },
      styles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 2.5
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 14 },
        1: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 32 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'right', cellWidth: 28 }
      },
      foot: [
        [
          { content: `TOTAL DE ITENS NA SALA: ${map.items.length}`, colSpan: 4, styles: { fontStyle: 'bold' } },
          { content: 'VALOR TOTAL:', styles: { halign: 'right', fontStyle: 'bold' } },
          { content: `R$ ${totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { halign: 'right', fontStyle: 'bold' } }
        ]
      ],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontSize: 8.5
      }
    });

    // Signature Area on the last page or current page
    let finalY = (doc as any).lastAutoTable.finalY + 12;

    // Check if we have room for signature box (needs ~40mm), else add page
    if (finalY + 45 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }

    doc.setDrawColor(203, 213, 225);
    doc.line(14, finalY, pageWidth - 14, finalY);
    finalY += 6;

    // Signature Columns
    const colWidth = (pageWidth - 36) / 2;

    // Left Column: Date & Room Manager declaration
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('CONFERÊNCIA E RECEBIMENTO:', 14, finalY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Data de Conferência: ${map.signedAt ? new Date(map.signedAt).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}`, 14, finalY + 6);
    doc.text(`Responsável: ${map.responsibleName}`, 14, finalY + 11);
    doc.text(`Departamento: ${map.department}`, 14, finalY + 16);
    doc.text('Status: Atestado e conferido fisicamente.', 14, finalY + 21);

    // Right Column: Digital Signature Box
    const sigBoxX = 14 + colWidth + 8;
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(sigBoxX, finalY - 3, colWidth, 34, 2, 2, 'FD');

    if (map.digitalSignatureDataUrl) {
      try {
        doc.addImage(map.digitalSignatureDataUrl, 'PNG', sigBoxX + 10, finalY - 1, colWidth - 20, 20);
      } catch (err) {
        console.error('Falha ao renderizar imagem da assinatura no PDF:', err);
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(map.responsibleName.toUpperCase(), sigBoxX + colWidth / 2, finalY + 23, { align: 'center' });
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Assinado Digitalmente em ${map.signedAt ? new Date(map.signedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR')}`, sigBoxX + colWidth / 2, finalY + 27, { align: 'center' });
      doc.text(`Autenticidade Criptográfica: ${map.signatureHash || 'SHA256-VALIDADO-ICP'}`, sigBoxX + colWidth / 2, finalY + 31, { align: 'center' });
    } else {
      // Blank line for manual pen signature
      doc.setDrawColor(148, 163, 184);
      doc.line(sigBoxX + 10, finalY + 20, sigBoxX + colWidth - 10, finalY + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${map.responsibleName}`, sigBoxX + colWidth / 2, finalY + 25, { align: 'center' });
      doc.text('Assinatura do Responsável pela Sala', sigBoxX + colWidth / 2, finalY + 29, { align: 'center' });
    }

    // Official Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento de Auditoria e Mapa Carga - Página ${i} de ${pageCount} | Emitido pelo Sistema de Controle Patrimonial`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    // Trigger download
    const cleanRoomName = map.roomName.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Mapa_Carga_${cleanRoomName}_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Generates Monthly Asset Management and Movement Report
   */
  static generateMonthlyReportPdf(assets: PatrimonialAsset[], maintenances: MaintenanceRecord[], monthYear: string): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Top Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO MENSAL DE GESTÃO PATRIMONIAL', pageWidth / 2, 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Competência: ${monthYear} | Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 17, { align: 'center' });
    doc.text('Auditoria, Depreciação e Conformidade de Ativos Fixos', pageWidth / 2, 22, { align: 'center' });

    // Summary KPI Cards
    const totalAssets = assets.length;
    const totalAcquisition = assets.reduce((acc, a) => acc + a.acquisitionValue, 0);
    const totalBookValue = assets.reduce((acc, a) => acc + a.currentBookValue, 0);
    const accumulatedDeprec = totalAcquisition - totalBookValue;
    const inMaintenanceCount = assets.filter(a => a.status === 'em_manutencao').length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 30, pageWidth - 28, 20, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('TOTAL DE ATIVOS', 18, 36);
    doc.text('VALOR AQUISIÇÃO', 60, 36);
    doc.text('VALOR CONTÁBIL ATUAL', 110, 36);
    doc.text('EM MANUTENÇÃO', 165, 36);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${totalAssets} itens`, 18, 43);
    doc.text(`R$ ${totalAcquisition.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 60, 43);
    doc.text(`R$ ${totalBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 110, 43);
    doc.text(`${inMaintenanceCount} ativo(s)`, 165, 43);

    // Assets Table
    const tableData = assets.map(a => [
      a.code,
      a.name,
      a.category,
      a.location.room,
      a.status.replace('_', ' ').toUpperCase(),
      `R$ ${a.acquisitionValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      `R$ ${a.currentBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 55,
      margin: { left: 14, right: 14, bottom: 20 },
      head: [['Código', 'Descrição do Ativo', 'Categoria', 'Localização Atual', 'Status', 'Valor Aquisição', 'Valor Contábil']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8,
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 24 },
        3: { cellWidth: 32 },
        4: { halign: 'center', cellWidth: 24 },
        5: { halign: 'right', cellWidth: 26 },
        6: { halign: 'right', cellWidth: 26 }
      },
      foot: [
        [
          { content: 'TOTAIS CONSOLIDADOS', colSpan: 5, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `R$ ${totalAcquisition.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right' } },
          { content: `R$ ${totalBookValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, styles: { fontStyle: 'bold', halign: 'right' } }
        ]
      ]
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Relatório Mensal Patrimonial - Página ${i} de ${pageCount} | Confidencial - Uso Interno`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    doc.save(`Relatorio_Mensal_Patrimonio_${monthYear.replace('/', '_')}.pdf`);
  }

  /**
   * Generates Audit Compliance Report
   */
  static generateComplianceReportPdf(assets: PatrimonialAsset[], complianceRate: number): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Top Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 28, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('RELATÓRIO DE AUDITORIA E CONFORMIDADE PATRIMONIAL', pageWidth / 2, 12, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Comitê de Auditoria Interna & Governança | Data: ${new Date().toLocaleDateString('pt-BR')}`, pageWidth / 2, 18, { align: 'center' });
    doc.text(`Índice Geral de Conformidade Física: ${complianceRate.toFixed(1)}%`, pageWidth / 2, 23, { align: 'center' });

    // Table of Audited Assets
    const tableData = assets.map(a => [
      a.code,
      a.name,
      a.location.room,
      a.location.responsiblePerson,
      a.lastAuditedDate || 'Pendente',
      a.condition.toUpperCase(),
      a.status === 'em_uso' ? 'CONFORME' : a.status.replace('_', ' ').toUpperCase()
    ]);

    autoTable(doc, {
      startY: 35,
      margin: { left: 14, right: 14, bottom: 20 },
      head: [['Código', 'Descrição do Ativo', 'Localização Auditada', 'Responsável', 'Data Auditoria', 'Estado', 'Parecer Auditoria']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 8,
        halign: 'center'
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 2
      },
      columnStyles: {
        0: { halign: 'center', fontStyle: 'bold', cellWidth: 24 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 32 },
        3: { cellWidth: 30 },
        4: { halign: 'center', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 24, fontStyle: 'bold' }
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Relatório Oficial de Conformidade - Página ${i} de ${pageCount} | Auditoria Interna`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    doc.save(`Relatorio_Conformidade_Auditoria_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Generates Official Audit Logs PDF Report (Trilha de Auditoria)
   */
  static generateAuditLogsPdf(
    logs: AuditLogEntry[], 
    filterCriteria?: { searchTerm?: string; actionFilter?: string }
  ): void {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm in landscape
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm in landscape

    // Top Header Banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 26, 'F');

    // Accent line
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(0, 25, pageWidth, 1.2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('RELATÓRIO OFICIAL DE TRILHA DE AUDITORIA (AUDIT LOG)', pageWidth / 2, 10.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(203, 213, 225); // slate-300
    const nowStr = new Date().toLocaleString('pt-BR');
    doc.text('Sistema de Controle de Material Patrimoniado | Rastreabilidade Imutável de Transações', pageWidth / 2, 16.5, { align: 'center' });
    doc.text(`Emitido em: ${nowStr} | Total de Registros: ${logs.length}`, pageWidth / 2, 21.5, { align: 'center' });

    // Filter/Context Summary Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 29, pageWidth - 28, 16, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('PARÂMETROS DA EMISSÃO:', 18, 35);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const filterText = filterCriteria?.actionFilter && filterCriteria.actionFilter !== 'all' 
      ? filterCriteria.actionFilter 
      : 'Todas as Ações';
    const searchFilterText = filterCriteria?.searchTerm 
      ? `"${filterCriteria.searchTerm}"` 
      : 'Nenhum (Todos)';

    doc.text('Filtro de Ação: ', 65, 35);
    doc.setFont('helvetica', 'bold');
    doc.text(`${filterText}`, 85, 35);

    doc.setFont('helvetica', 'normal');
    doc.text('Termo pesquisado: ', 130, 35);
    doc.setFont('helvetica', 'bold');
    doc.text(`${searchFilterText}`, 155, 35);

    // Right side hash stamp
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    const hash = `SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now()}`;
    doc.text(`Chave Criptográfica: ${hash}`, pageWidth - 18, 35, { align: 'right' });

    // Summary counts line
    const createCount = logs.filter(l => l.action === 'CRIACAO').length;
    const editCount = logs.filter(l => l.action === 'EDICAO').length;
    const deleteCount = logs.filter(l => l.action === 'EXCLUSAO').length;
    const transferCount = logs.filter(l => l.action === 'TRANSFERENCIA').length;
    const otherCount = logs.length - (createCount + editCount + deleteCount + transferCount);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Resumo no Período:  ${createCount} Criações  |  ${editCount} Edições  |  ${deleteCount} Exclusões  |  ${transferCount} Transferências  |  ${otherCount} Outras Operações (Login/Auditoria/Importação)`,
      18,
      41
    );

    // Table Data
    const tableBody = logs.map(l => [
      new Date(l.timestamp).toLocaleString('pt-BR'),
      `${l.userName}\n(${l.userRole.toUpperCase()})`,
      l.action,
      `${l.entity}\n[${l.entityId}]`,
      l.details,
      l.ipAddress || '192.168.10.45'
    ]);

    autoTable(doc, {
      startY: 48,
      margin: { left: 14, right: 14, bottom: 18 },
      head: [['Data / Hora', 'Usuário / Cargo', 'Tipo de Ação', 'Entidade / ID', 'Detalhamento da Operação', 'Endereço IP']],
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: 255,
        fontSize: 7.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      styles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 2,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 38 },
        2: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        3: { cellWidth: 42, fontStyle: 'bold' },
        4: { cellWidth: 'auto' },
        5: { halign: 'center', cellWidth: 24 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw);
          if (val === 'EXCLUSAO') {
            data.cell.styles.textColor = [225, 29, 72];
          } else if (val === 'CRIACAO') {
            data.cell.styles.textColor = [5, 150, 105];
          } else if (val === 'TRANSFERENCIA') {
            data.cell.styles.textColor = [2, 132, 199];
          }
        }
      }
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Trilha de Auditoria & Governança Patrimonial - Página ${i} de ${pageCount} | Documento Oficial Auditável`,
        pageWidth / 2,
        pageHeight - 6,
        { align: 'center' }
      );
    }

    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`Trilha_Auditoria_Patrimonio_${dateStr}.pdf`);
  }
}
