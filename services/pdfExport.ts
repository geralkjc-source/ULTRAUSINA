
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { PendingItem, Turma, Turno } from '../types';
import { getCurrentShiftRange } from './shiftService';

interface PDFMeta {
  teamLeader: string;
  turma: Turma;
  turno: Turno;
}

const parseTimestamp = (ts: any): number => {
  if (!ts) return 0;
  const num = Number(ts);
  if (!isNaN(num)) return num;
  const date = new Date(ts);
  return isNaN(date.getTime()) ? 0 : date.getTime();
};

/**
 * RELATÓRIO EXECUTIVO DE TURNO (LAYOUT RESUMIDO PARA APRESENTAÇÃO)
 */
export const exportShiftReportPDF = (items: PendingItem[], meta: PDFMeta, customRange?: { start: number, end: number }, customDate?: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const dateStr = customDate || new Date().toLocaleDateString('pt-BR');
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const shiftRange = customRange || getCurrentShiftRange();

  // Cabeçalho Principal
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('VULCAN', 15, 20);
  
  doc.setFontSize(16);
  doc.text('RELATÓRIO EXECUTIVO DE TURNO ULTRAFINO', 15, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`DATA: ${dateStr} | EMISSÃO: ${timeStr}`, 282, 25, { align: 'right' });

  // FILTRAGEM RESTRITA PARA O PDF
  const pendentesAtivas = items.filter(i => 
    i.status === 'aberto' && 
    parseTimestamp(i.timestamp) <= shiftRange.end
  );
  
  // Apenas as resolvidas que ocorreram DENTRO do horário do turno vigente
  const resolvidasNoTurno = items.filter(i => {
    if (i.status !== 'resolvido' || !i.resolvedAt) return false;
    const rTime = parseTimestamp(i.resolvedAt);
    const inRange = rTime >= shiftRange.start && rTime <= shiftRange.end;
    const inTolerance = rTime > shiftRange.end && rTime <= shiftRange.end + 60 * 60 * 1000 && i.resolvedByTurma === meta.turma;
    if (meta.turma === 'ADM') {
      return inRange && i.resolvedByTurma === 'ADM';
    }
    return (inRange || inTolerance) && i.resolvedByTurma !== 'ADM';
  });
  
  // Cards de Resumo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 45, 80, 25, 3, 3, 'F');
  doc.roundedRect(105, 45, 80, 25, 3, 3, 'F');
  doc.roundedRect(195, 45, 87, 25, 3, 3, 'F');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('RESPONSÁVEL / EQUIPE', 20, 52);
  doc.text('PRODUTIVIDADE (RESOLVIDOS)', 110, 52);
  doc.text('CARGA PENDENTE (ABERTAS)', 200, 52);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${meta.teamLeader.toUpperCase()} - TURMA ${meta.turma}`, 20, 62);
  
  doc.setTextColor(22, 163, 74); // Emerald 600
  doc.text(`${resolvidasNoTurno.length} ITENS FINALIZADOS`, 110, 62);

  doc.setTextColor(pendentesAtivas.length > 0 ? 220 : 22, pendentesAtivas.length > 0 ? 38 : 163, pendentesAtivas.length > 0 ? 38 : 74);
  doc.text(`${pendentesAtivas.length} ITENS EM ABERTO`, 200, 62);

  // --- SEÇÃO 1: TRABALHO REALIZADO (RESOLVIDOS) ---
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(12);
  doc.text('1. TRABALHO REALIZADO (RESOLVIDOS NESTE TURNO)', 15, 80);

  const resolvedData = resolvidasNoTurno.map(item => [
    item.area,
    item.tag || 'N/A',
    item.discipline,
    (item.comments && item.comments.length > 0) 
      ? item.comments[item.comments.length - 1].text.replace('RESOLVIDO: ', '').toUpperCase() 
      : item.description.toUpperCase(),
    item.resolvedBy?.toUpperCase() || '-',
    item.resolvedAt ? new Date(parseTimestamp(item.resolvedAt)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'
  ]);

  (doc as any).autoTable({
    startY: 85,
    head: [['ÁREA', 'TAG/ATIVO', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'EXECUTADO POR', 'HORA']],
    body: resolvedData.length > 0 ? resolvedData : [['-', '-', '-', 'NENHUM ITEM RESOLVIDO NESTE TURNO', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 3: { cellWidth: 90 } }
  });

  // --- SEÇÃO 2: PENDÊNCIAS ATIVAS (EM ABERTO) ---
  const nextY = (doc as any).lastAutoTable.finalY + 15;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('2. PENDÊNCIAS ATIVAS (CARGA PARA O PRÓXIMO TURNO)', 15, nextY);

  const activeData = pendentesAtivas.map(item => [
    item.area,
    item.tag || 'N/A',
    item.discipline,
    item.description.toUpperCase(),
    item.priority.toUpperCase(),
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR')
  ]);

  (doc as any).autoTable({
    startY: nextY + 5,
    head: [['ÁREA', 'TAG/ATIVO', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'PRIORIDADE', 'DATA REPORTE']],
    body: activeData.length > 0 ? activeData : [['-', '-', '-', 'NENHUMA PENDÊNCIA ATIVA', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 3: { cellWidth: 90 } }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150);
    doc.text(`Sistema Vulcan Ultrafino Usina 2 - Relatório de Turno | Página ${i} de ${pageCount}`, 148, 205, { align: 'center' });
  }

  doc.save(`Relatorio_Turno_${meta.turno}_Turma_${meta.turma}_${dateStr.replace(/\//g, '-')}.pdf`);
};

export const generateShiftReportPDFBase64 = (items: PendingItem[], meta: PDFMeta, customRange?: { start: number, end: number }, customDate?: string): string => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const dateStr = customDate || new Date().toLocaleDateString('pt-BR');
  const shiftRange = customRange || getCurrentShiftRange();

  // Cabeçalho Principal
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('VULCAN', 15, 20);
  
  doc.setFontSize(16);
  doc.text('RELATÓRIO EXECUTIVO DE TURNO ULTRAFINO', 15, 30);

  // FILTRAGEM RESTRITA PARA O PDF
  const pendentesAtivas = items.filter(i => 
    i.status === 'aberto' && 
    parseTimestamp(i.timestamp) <= shiftRange.end
  );
  
  const resolvidasNoTurno = items.filter(i => {
    if (i.status !== 'resolvido' || !i.resolvedAt) return false;
    const rTime = parseTimestamp(i.resolvedAt);
    const inRange = rTime >= shiftRange.start && rTime <= shiftRange.end;
    const inTolerance = rTime > shiftRange.end && rTime <= shiftRange.end + 60 * 60 * 1000 && i.resolvedByTurma === meta.turma;
    if (meta.turma === 'ADM') {
      return inRange && i.resolvedByTurma === 'ADM';
    }
    return (inRange || inTolerance) && i.resolvedByTurma !== 'ADM';
  });
  
  // Cards de Resumo
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(15, 45, 80, 25, 3, 3, 'F');
  doc.roundedRect(105, 45, 80, 25, 3, 3, 'F');
  doc.roundedRect(195, 45, 87, 25, 3, 3, 'F');

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text('RESPONSÁVEL / EQUIPE', 20, 52);
  doc.text('PRODUTIVIDADE (RESOLVIDOS)', 110, 52);
  doc.text('CARGA PENDENTE (ABERTAS)', 200, 52);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${meta.teamLeader.toUpperCase()} - TURMA ${meta.turma}`, 20, 62);
  
  doc.setTextColor(22, 163, 74); // Emerald 600
  doc.text(`${resolvidasNoTurno.length} ITENS FINALIZADOS`, 110, 62);

  doc.setTextColor(pendentesAtivas.length > 0 ? 220 : 22, pendentesAtivas.length > 0 ? 38 : 163, pendentesAtivas.length > 0 ? 38 : 74);
  doc.text(`${pendentesAtivas.length} ITENS EM ABERTO`, 200, 62);

  // --- SEÇÃO 1: TRABALHO REALIZADO (RESOLVIDOS) ---
  doc.setTextColor(22, 163, 74);
  doc.setFontSize(12);
  doc.text('1. TRABALHO REALIZADO (RESOLVIDOS NESTE TURNO)', 15, 80);

  const resolvedData = resolvidasNoTurno.map(item => [
    item.area,
    item.tag || 'N/A',
    item.discipline,
    (item.comments && item.comments.length > 0) 
      ? item.comments[item.comments.length - 1].text.replace('RESOLVIDO: ', '').toUpperCase() 
      : item.description.toUpperCase(),
    item.resolvedBy?.toUpperCase() || '-',
    item.resolvedAt ? new Date(parseTimestamp(item.resolvedAt)).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'
  ]);

  (doc as any).autoTable({
    startY: 85,
    head: [['ÁREA', 'TAG/ATIVO', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'EXECUTADO POR', 'HORA']],
    body: resolvedData.length > 0 ? resolvedData : [['-', '-', '-', 'NENHUM ITEM RESOLVIDO NESTE TURNO', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 3: { cellWidth: 90 } }
  });

  // --- SEÇÃO 2: PENDÊNCIAS ATIVAS (EM ABERTO) ---
  const nextY = (doc as any).lastAutoTable.finalY + 15;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.text('2. PENDÊNCIAS ATIVAS (CARGA PARA O PRÓXIMO TURNO)', 15, nextY);

  const activeData = pendentesAtivas.map(item => [
    item.area,
    item.tag || 'N/A',
    item.discipline,
    item.description.toUpperCase(),
    item.priority.toUpperCase(),
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR')
  ]);

  (doc as any).autoTable({
    startY: nextY + 5,
    head: [['ÁREA', 'TAG/ATIVO', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'PRIORIDADE', 'DATA REPORTE']],
    body: activeData.length > 0 ? activeData : [['-', '-', '-', 'NENHUMA PENDÊNCIA ATIVA', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: { 3: { cellWidth: 90 } }
  });

  return doc.output('datauristring').split(',')[1];
};

/**
 * AUDITORIA GERAL DE FALHAS (LAYOUT COMPLETO - SEPARADO POR STATUS EM PÁGINAS)
 */
export const exportAuditPDF = (items: PendingItem[], period?: string) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const dateStr = new Date().toLocaleDateString('pt-BR');
  const resolvidas = items.filter(i => i.status === 'resolvido');
  const pendentes = items.filter(i => i.status === 'aberto');

  const drawHeader = (title: string, color: [number, number, number]) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`VULCAN - ${title}`, 15, 10);
    doc.setFontSize(10);
    doc.text('Ultrafino RELATÓRIO EXECUTIVO DE TURNO ULTRAFINO', 15, 16);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`PERÍODO: ${period || 'GERAL'} | EXTRAÇÃO: ${dateStr} | RASTREABILIDADE TOTAL`, 15, 22);

    doc.setFillColor(...color);
    doc.rect(230, 8, 52, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('AUDITORIA MASTER', 256, 13.5, { align: 'center' });
  };

  // --- PÁGINA 1: RESOLVIDOS ---
  drawHeader('AUDITORIA DE RESOLUÇÕES (CONCLUÍDAS)', [22, 163, 74]); // Verde

  const resolvedTableData = resolvidas.map(item => [
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR'),
    item.area,
    item.tag || 'S/T',
    item.discipline,
    (item.comments && item.comments.length > 0) 
      ? item.comments[item.comments.length - 1].text.replace('RESOLVIDO: ', '').toUpperCase() 
      : item.description.toUpperCase(),
    `T-${item.turma}\n${item.operator}`,
    item.resolvedAt ? new Date(parseTimestamp(item.resolvedAt)).toLocaleDateString('pt-BR') : '-',
    `T-${item.resolvedByTurma}\n${item.resolvedBy}`
  ]);

  (doc as any).autoTable({
    startY: 30,
    head: [['DATA REPORTE', 'ÁREA', 'TAG', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'ORIGEM', 'CONCLUSÃO', 'RESOLVIDO POR']],
    body: resolvedTableData.length > 0 ? resolvedTableData : [['-', '-', '-', '-', 'NENHUM REGISTRO CONCLUÍDO NO PERÍODO', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], fontSize: 6, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 6, cellPadding: 1.5, valign: 'middle' },
    columnStyles: { 4: { cellWidth: 70 }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' } }
  });

  // --- PÁGINA 2: PENDENTES ---
  doc.addPage();
  drawHeader('AUDITORIA DE PENDÊNCIAS ATIVAS (EM ABERTO)', [30, 41, 59]); // Slate

  const pendingTableData = pendentes.map(item => [
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR'),
    item.area,
    item.tag || 'S/T',
    item.discipline,
    item.description.toUpperCase(),
    `T-${item.turma}\n${item.operator}`,
    item.priority.toUpperCase(),
    item.turno
  ]);

  (doc as any).autoTable({
    startY: 30,
    head: [['DATA REPORTE', 'ÁREA', 'TAG', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'REPORTADO POR', 'PRIORIDADE', 'TURNO']],
    body: pendingTableData.length > 0 ? pendingTableData : [['-', '-', '-', '-', 'NENHUMA PENDÊNCIA EM ABERTO', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 6, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 6, cellPadding: 1.5, valign: 'middle' },
    columnStyles: { 4: { cellWidth: 80 }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' } },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'ALTA') data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(`Sistema Vulcan Ultrafino Usina 2 v1.4 | Auditoria Master | Página ${i} de ${pageCount}`, 148, 205, { align: 'center' });
  }

  doc.save(`Auditoria_Master_Ultrafino_Usina_2_${dateStr.replace(/\//g, '-')}.pdf`);
};

export const generateAuditPDFBase64 = (items: PendingItem[], period?: string): string => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const resolvidas = items.filter(i => i.status === 'resolvido');
  const pendentes = items.filter(i => i.status === 'aberto');

  const drawHeader = (title: string, color: [number, number, number]) => {
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(`VULCAN - ${title}`, 15, 10);
    doc.setFontSize(10);
    doc.text('Ultrafino RELATÓRIO EXECUTIVO DE TURNO ULTRAFINO', 15, 16);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`PERÍODO: ${period || 'GERAL'} | EXTRAÇÃO: ${new Date().toLocaleDateString('pt-BR')} | RASTREABILIDADE TOTAL`, 15, 22);

    doc.setFillColor(...color);
    doc.rect(230, 8, 52, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('AUDITORIA MASTER', 256, 13.5, { align: 'center' });
  };

  // --- PÁGINA 1: RESOLVIDOS ---
  drawHeader('AUDITORIA DE RESOLUÇÕES (CONCLUÍDAS)', [22, 163, 74]); // Verde

  const resolvedTableData = resolvidas.map(item => [
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR'),
    item.area,
    item.tag || 'S/T',
    item.discipline,
    (item.comments && item.comments.length > 0) 
      ? item.comments[item.comments.length - 1].text.replace('RESOLVIDO: ', '').toUpperCase() 
      : item.description.toUpperCase(),
    `T-${item.turma}\n${item.operator}`,
    item.resolvedAt ? new Date(parseTimestamp(item.resolvedAt)).toLocaleDateString('pt-BR') : '-',
    `T-${item.resolvedByTurma}\n${item.resolvedBy}`
  ]);

  (doc as any).autoTable({
    startY: 30,
    head: [['DATA REPORTE', 'ÁREA', 'TAG', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'ORIGEM', 'CONCLUSÃO', 'RESOLVIDO POR']],
    body: resolvedTableData.length > 0 ? resolvedTableData : [['-', '-', '-', '-', 'NENHUM REGISTRO CONCLUÍDO NO PERÍODO', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [22, 163, 74], fontSize: 6, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 6, cellPadding: 1.5, valign: 'middle' },
    columnStyles: { 4: { cellWidth: 70 }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' } }
  });

  // --- PÁGINA 2: PENDENTES ---
  doc.addPage();
  drawHeader('AUDITORIA DE PENDÊNCIAS ATIVAS (EM ABERTO)', [30, 41, 59]); // Slate

  const pendingTableData = pendentes.map(item => [
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR'),
    item.area,
    item.tag || 'S/T',
    item.discipline,
    item.description.toUpperCase(),
    `T-${item.turma}\n${item.operator}`,
    item.priority.toUpperCase(),
    item.turno
  ]);

  (doc as any).autoTable({
    startY: 30,
    head: [['DATA REPORTE', 'ÁREA', 'TAG', 'DISCIPLINA', 'DESCRIÇÃO TÉCNICA', 'REPORTADO POR', 'PRIORIDADE', 'TURNO']],
    body: pendingTableData.length > 0 ? pendingTableData : [['-', '-', '-', '-', 'NENHUMA PENDÊNCIA EM ABERTO', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 6, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 6, cellPadding: 1.5, valign: 'middle' },
    columnStyles: { 4: { cellWidth: 80 }, 5: { halign: 'center' }, 6: { halign: 'center' }, 7: { halign: 'center' } },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'ALTA') data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(`Sistema Vulcan Ultrafino Usina 2 v1.4 | Auditoria Master | Página ${i} de ${pageCount}`, 148, 205, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};

/**
 * RELATÓRIO DE CARGA ACUMULADA POR DISCIPLINA
 */
export const generateDisciplineAuditPDFBase64 = (items: PendingItem[], discipline: string): string => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const dateStr = new Date().toLocaleDateString('pt-BR');
  const pendentes = items.filter(i => i.status === 'aberto' && i.discipline === discipline);

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, 297, 25, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`VULCAN - CARGA ACUMULADA: ${discipline}`, 15, 10);
  doc.setFontSize(10);
  doc.text('RELATÓRIO DE PENDÊNCIAS POR DISCIPLINA', 15, 16);
  
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`EXTRAÇÃO: ${dateStr} | FOCO: ${discipline}`, 15, 22);

  const pendingTableData = pendentes.map(item => [
    new Date(parseTimestamp(item.timestamp)).toLocaleDateString('pt-BR'),
    item.area,
    item.tag || 'S/T',
    item.description.toUpperCase(),
    `T-${item.turma}\n${item.operator}`,
    item.priority.toUpperCase()
  ]);

  (doc as any).autoTable({
    startY: 30,
    head: [['DATA REPORTE', 'ÁREA', 'TAG', 'DESCRIÇÃO TÉCNICA', 'REPORTADO POR', 'PRIORIDADE']],
    body: pendingTableData.length > 0 ? pendingTableData : [['-', '-', '-', 'NENHUMA PENDÊNCIA EM ABERTO PARA ESTA DISCIPLINA', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], fontSize: 7, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
    columnStyles: { 3: { cellWidth: 100 }, 4: { halign: 'center' }, 5: { halign: 'center' } },
    didParseCell: function(data: any) {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'ALTA') data.cell.styles.textColor = [220, 38, 38];
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(6);
    doc.setTextColor(100);
    doc.text(`Sistema Vulcan Ultrafino | Carga Acumulada ${discipline} | Página ${i} de ${pageCount}`, 148, 205, { align: 'center' });
  }

  return doc.output('datauristring').split(',')[1];
};
