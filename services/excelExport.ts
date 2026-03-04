
import * as XLSX from 'xlsx';
import { Report, PendingItem } from '../types';

/**
 * Utilitário para gerar arquivo e disparar download
 */
const saveWorkbook = (workbook: XLSX.WorkBook, fileName: string) => {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.xlsx`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * EXPORTAÇÃO GERAL (AUDITORIA)
 */
export const exportToExcel = (data: any[], fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  
  const objectMaxLength: number[] = [];
  data.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const columnValue = val ? val.toString() : "";
      objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnValue.length + 2);
    });
  });
  worksheet["!cols"] = objectMaxLength.map((w) => ({ wch: Math.min(w, 50) }));

  XLSX.utils.book_append_sheet(workbook, worksheet, "BASE_DADOS_AUDITORIA");
  
  const now = new Date();
  const timeTag = `${now.getHours()}h${now.getMinutes()}`;
  saveWorkbook(workbook, `${fileName}_${timeTag}`);
};

/**
 * RELATÓRIO DE TURNO (LAYOUT PARA APRESENTAÇÃO/DDS)
 */
export const exportShiftReport = (
  items: any[], 
  meta: { teamLeader: string, turma: string, turno: string },
  fileName: string
) => {
  const dateStr = new Date().toLocaleDateString('pt-BR');
  const timeStr = new Date().toLocaleTimeString('pt-BR', { hour12: false, hour: '2-digit', minute: '2-digit' });

  const headerData = [
    ["VULCAN - RELATÓRIO EXECUTIVO DE TURNO"],
    ["ESTADO ATUAL DOS ATIVOS E PRODUTIVIDADE DA EQUIPE"],
    [""],
    ["TEAM LEADER:", meta.teamLeader.toUpperCase(), "", "DATA:", dateStr],
    ["TURMA / EQUIPE:", meta.turma, "", "HORA EMISSÃO:", timeStr],
    ["TURNO OPERACIONAL:", meta.turno, "", "STATUS GERAL:", "GERADO"],
    [""],
    ["ÁREA", "TAG/ATIVO", "DISCIPLINA", "DESCRIÇÃO TÉCNICA", "SITUAÇÃO", "DATA REPORTE", "DATA CONCLUSÃO"]
  ];

  const rows = items.map(item => [
    item.ÁREA,
    item.TAG,
    item.DISCIPLINA,
    item.DESCRIÇÃO,
    item.SITUAÇÃO,
    item['DATA REPORTE'],
    item['DATA CONCLUSÃO']
  ]);

  const finalData = [...headerData, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(finalData);
  const workbook = XLSX.utils.book_new();

  worksheet["!cols"] = [
    { wch: 20 }, 
    { wch: 15 }, 
    { wch: 15 }, 
    { wch: 60 }, 
    { wch: 30 }, 
    { wch: 15 }, 
    { wch: 15 }  
  ];

  worksheet['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, 
    { s: { r: 1, c: 0 }, e: { r: 1, c: 6 } }
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, "DASHBOARD_TURNO");
  saveWorkbook(workbook, fileName);
};

export const exportMasterToExcel = (reports: Report[], pending: PendingItem[], fileName: string) => {
  const workbook = XLSX.utils.book_new();
  const monthTag = `${(new Date().getMonth() + 1).toString().padStart(2, '0')}_${new Date().getFullYear()}`;

  const summaryData = [
    ["SUMÁRIO EXECUTIVO DE PERFORMANCE - " + monthTag],
    [""],
    ["DISCIPLINA", "VOLUME TOTAL", "RESOLVIDOS", "EFICIÊNCIA"],
    ...Array.from(new Set(pending.map(p => p.discipline))).map(d => {
      const total = pending.filter(p => p.discipline === d).length;
      const res = pending.filter(p => p.discipline === d && p.status === 'resolvido').length;
      return [d, total, res, total > 0 ? `${Math.round((res/total)*100)}%` : "0%"];
    })
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, wsSummary, "RESUMO_MENSAL");

  const pendingData = pending.map(p => ({
    'STATUS': p.status === 'resolvido' ? "🟢 RESOLVIDO" : "🔴 PENDENTE",
    'ÁREA': p.area,
    'TAG': p.tag.toUpperCase(),
    'DISCIPLINA': p.discipline,
    'DESCRIÇÃO': p.description.toUpperCase(),
    'PRIORIDADE': p.priority.toUpperCase(),
    'EQUIPE ORIGEM': `TURMA ${p.turma}`,
    'OPERADOR': p.operator,
    'DATA REPORTE': new Date(p.timestamp).toLocaleString('pt-BR', { hour12: false }),
    'RESOLVIDO POR': p.resolvedBy ? `${p.resolvedBy} (TURMA ${p.resolvedByTurma})` : "-",
    'DATA CONCLUSÃO': p.resolvedAt ? new Date(p.resolvedAt).toLocaleString('pt-BR', { hour12: false }) : "-"
  }));
  const wsPending = XLSX.utils.json_to_sheet(pendingData);
  XLSX.utils.book_append_sheet(workbook, wsPending, "DETALHE_TECNICO");

  saveWorkbook(workbook, `${fileName}_${monthTag}`);
};
