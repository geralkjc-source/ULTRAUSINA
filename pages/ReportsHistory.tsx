
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar,
  ArrowRight,
  X,
  Check,
  AlertCircle,
  MessageCircle,
  Copy,
  Cloud,
  Filter,
  Clock,
  ClipboardList,
  AlertTriangle,
  MinusCircle,
  User,
  Users,
  CheckCircle2,
  XCircle,
  BarChart3,
  TrendingUp,
  Target,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { Report, Area, ChecklistItem, PendingItem, Turno, Turma } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { exportToExcel } from '../services/excelExport';
import { formatReportForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsHistoryProps {
  reports: Report[];
  pendingItems: PendingItem[];
  onAddItemComment: (reportId: string, itemId: string, text: string) => void;
}

const ReportsHistory: React.FC<ReportsHistoryProps> = ({ reports = [], pendingItems = [] }) => {
  const [viewMode, setViewMode] = useState<'list' | 'engagement'>('engagement');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(''); 
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [engagementDate, setEngagementDate] = useState(new Date().toISOString().split('T')[0]);

  // Áreas fixas para o cálculo de engajamento
  const AREAS = Object.values(Area);
  const TURNOS: Turno[] = ['MANHÃ', 'TARDE', 'NOITE'];
  const TURMAS: Turma[] = ['A', 'B', 'C', 'D'];
  const TARGET_PER_AREA_SHIFT = 3;

  // Ordenação por data (decrescente baseada no timestamp da planilha)
  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [reports]);

  const filteredReports = sortedReports.filter(r => {
    const matchesSearch = r.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.area.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter) {
      const reportDate = new Date(r.timestamp);
      const h = reportDate.getHours();
      const opDate = new Date(reportDate);
      // Ajuste operacional para o turno da NOITE
      if (r.turno === 'NOITE' && h < 6) {
        opDate.setDate(opDate.getDate() - 1);
      }
      const reportYMD = `${opDate.getFullYear()}-${(opDate.getMonth() + 1).toString().padStart(2, '0')}-${opDate.getDate().toString().padStart(2, '0')}`;
      matchesDate = reportYMD === dateFilter;
    }

    return matchesSearch && matchesDate;
  });

  /**
   * RECONSTRUÇÃO DO CHECKLIST COMPLETO COM CRUZAMENTO DE PENDÊNCIAS
   * Se for um relatório da nuvem, reconstrói usando o template e busca as descrições técnicas reais.
   */
  const fullChecklistItems = useMemo(() => {
    if (!selectedReport) return [];
    
    // Verifica se o relatório parece ser resumido (vindo da nuvem com apenas falhas)
    const hasOnlyFailures = selectedReport.items.length > 0 && selectedReport.items.every(i => i.status === 'fail' || i.status === 'warning');
    
    if (hasOnlyFailures) {
      const template = CHECKLIST_TEMPLATES[selectedReport.area] || [];
      const failureLabels = selectedReport.items.map(i => i.label.toUpperCase());

      return template.map((label, idx) => {
        const isSection = label.startsWith('SECTION:');
        if (isSection) return { id: `sec-${idx}`, label, status: 'ok' as const };

        const isFailure = failureLabels.includes(label.toUpperCase());
        
        let observation = '';
        let status: 'ok' | 'fail' | 'warning' = 'ok';

        if (isFailure) {
          const originalItem = selectedReport.items.find(i => i.label.toUpperCase() === label.toUpperCase());
          status = originalItem?.status || 'fail';

          // BUSCA CRUZADA: Procura a descrição técnica real na lista de pendências
          // Critérios: Mesma área, mesmo dia (timestamp aproximado) e tag que contenha o label do item.
          const matchingPending = pendingItems.find(p => {
            const sameArea = p.area === selectedReport.area;
            const sameDay = new Date(p.timestamp).toLocaleDateString() === new Date(selectedReport.timestamp).toLocaleDateString();
            const tagMatch = p.tag.toUpperCase().includes(label.toUpperCase()) || label.toUpperCase().includes(p.tag.toUpperCase());
            return sameArea && sameDay && tagMatch;
          });

          observation = matchingPending ? matchingPending.description : (originalItem?.observation || 'FALHA REPORTADA NO TURNO');
          
          // Se a observação ainda for a genérica, tenta limpar
          if (observation === 'FALHA IMPORTADA DA PLANILHA') {
            observation = 'DESCRIÇÃO DISPONÍVEL NA PLANILHA MESTRA';
          }
        }

        return {
          id: `item-${idx}`,
          label,
          status,
          observation
        };
      }) as ChecklistItem[];
    }

    return selectedReport.items;
  }, [selectedReport, pendingItems]);

  const stats = useMemo(() => {
    const items = fullChecklistItems.filter(i => !i.label.startsWith('SECTION:'));
    return {
      ok: items.filter(i => i.status === 'ok').length,
      fail: items.filter(i => i.status === 'fail' || i.status === 'warning').length,
      total: items.length
    };
  }, [fullChecklistItems]);

  const getTurnoColor = (turno: string) => {
    switch(turno.toUpperCase()) {
      case 'MANHÃ': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'TARDE': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'NOITE': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const formatDateOnly = (timestamp: number | undefined) => {
    if (!timestamp || timestamp === 0) return "---";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "DATA INVÁLIDA";
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'ok': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'fail': return 'bg-red-50 text-red-600 border-red-100';
      case 'warning': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'na': return 'bg-slate-50 text-slate-400 border-slate-100';
      default: return 'bg-slate-50 text-slate-300 border-slate-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'ok': return <Check size={12} strokeWidth={4} />;
      case 'fail': return <X size={12} strokeWidth={4} />;
      case 'warning': return <AlertTriangle size={12} strokeWidth={4} />;
      case 'na': return <MinusCircle size={12} strokeWidth={4} />;
      default: return null;
    }
  };

  // ================= LÓGICA DE ENGAJAMENTO =================
  const engagementStats = useMemo(() => {
    const selectedDate = new Date(engagementDate);
    selectedDate.setHours(12, 0, 0, 0); // Normalizar para meio-dia para evitar problemas de fuso
    
    const getOpDate = (timestamp: number | string, turno: string) => {
      const d = new Date(timestamp);
      const h = d.getHours();
      const op = new Date(d);
      // Se for turno da noite e for antes das 6h, pertence ao dia anterior
      if (turno === 'NOITE' && h < 6) {
        op.setDate(op.getDate() - 1);
      }
      op.setHours(12, 0, 0, 0);
      return op;
    };

    // Semana
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Mês
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const todayReports = reports.filter(r => {
      const opDate = getOpDate(r.timestamp, r.turno);
      return opDate.toDateString() === selectedDate.toDateString();
    });

    const weekReports = reports.filter(r => {
      const opDate = getOpDate(r.timestamp, r.turno);
      return opDate >= startOfWeek && opDate <= endOfWeek;
    });

    const monthReports = reports.filter(r => {
      const opDate = getOpDate(r.timestamp, r.turno);
      return opDate >= startOfMonth && opDate <= endOfMonth;
    });

    // Produção por Turno (Hoje)
    const shiftStats = TURNOS.map(turno => {
      const shiftReports = todayReports.filter(r => r.turno === turno);
      const areaStats = AREAS.map(area => {
        const count = shiftReports.filter(r => r.area === area).length;
        return { area, count, target: TARGET_PER_AREA_SHIFT };
      });
      return { turno, areaStats, total: shiftReports.length };
    });

    // Produção por Turma (Semana e Mês)
    const turmaStats = TURMAS.map(turma => {
      const weekCount = weekReports.filter(r => r.turma === turma).length;
      const monthCount = monthReports.filter(r => r.turma === turma).length;
      return { turma, weekCount, monthCount };
    });

    // Produção por Área (Semana)
    const areaStatsWeek = AREAS.map(area => {
      const count = weekReports.filter(r => r.area === area).length;
      return { area, count };
    });

    return {
      today: todayReports.length,
      week: weekReports.length,
      month: monthReports.length,
      shiftStats,
      turmaStats,
      areaStatsWeek,
      dayTarget: 45,
      weekTarget: 315,
      monthTarget: 1350 // 45 * 30
    };
  }, [reports, engagementDate]);

  const getEngagementColor = (count: number, target: number) => {
    if (count === 0) return 'bg-red-500';
    if (count < target) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getEngagementTextColor = (count: number, target: number) => {
    if (count === 0) return 'text-red-600';
    if (count < target) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getEngagementBgColor = (count: number, target: number) => {
    if (count === 0) return 'bg-red-50';
    if (count < target) return 'bg-amber-50';
    return 'bg-emerald-50';
  };

  const getEngagementBorderColor = (count: number, target: number) => {
    if (count === 0) return 'border-red-100';
    if (count < target) return 'border-amber-100';
    return 'border-emerald-100';
  };

  const generateEngagementPDF = () => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString('pt-BR', { hour12: false });
    const formattedDate = new Date(engagementDate).toLocaleDateString('pt-BR');

    doc.setFontSize(18);
    doc.text('RELATÓRIO DE ENGAJAMENTO DE CHECKLIST', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Data de Referência: ${formattedDate} | Gerado em: ${timestamp}`, 105, 28, { align: 'center' });
    doc.text('Plataforma Ultrafino Usina 2', 105, 34, { align: 'center' });

    // Tabela de Resumo
    autoTable(doc, {
      startY: 45,
      head: [['MÉTRICA', 'VALOR', 'META', 'STATUS']],
      body: [
        ['Produção Diária', engagementStats.today, engagementStats.dayTarget, engagementStats.today >= engagementStats.dayTarget ? 'META ATINGIDA' : 'ABAIXO DA META'],
        ...engagementStats.shiftStats.map(s => [`Produção Turno ${s.turno}`, s.total, 15, s.total >= 15 ? 'META ATINGIDA' : 'ABAIXO DA META']),
        ['Produção Semanal', engagementStats.week, engagementStats.weekTarget, engagementStats.week >= engagementStats.weekTarget ? 'META ATINGIDA' : 'ABAIXO DA META'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42] }
    });

    // Tabela por Turno e Área
    const tableBody = AREAS.map(area => {
      const row = [area];
      TURNOS.forEach(turno => {
        const shift = engagementStats.shiftStats.find(s => s.turno === turno);
        const count = shift?.areaStats.find(as => as.area === area)?.count || 0;
        row.push(count.toString());
      });
      return row;
    });

    doc.setFontSize(12);
    doc.text('PRODUÇÃO POR TURNO E ÁREA', 14, (doc as any).lastAutoTable.finalY + 15);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['ÁREA', 'MANHÃ', 'TARDE', 'NOITE']],
      body: tableBody,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Tabela por Turma
    doc.text('PRODUÇÃO POR TURMA (SEMANA E MÊS)', 14, (doc as any).lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['TURMA', 'SEMANAL', 'MENSAL']],
      body: engagementStats.turmaStats.map(s => [`TURMA ${s.turma}`, s.weekCount.toString(), s.monthCount.toString()]),
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Engajamento_${engagementDate.replace(/-/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Histórico e Engajamento</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Controle de Produção e Auditoria Operacional</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
          <button 
            onClick={() => setViewMode('engagement')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'engagement' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <TrendingUp size={16} className="inline mr-2" /> Engajamento
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <ClipboardList size={16} className="inline mr-2" /> Lista
          </button>
        </div>
      </div>

      {viewMode === 'engagement' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header de Filtro de Data */}
          <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => {
                  const d = new Date(engagementDate);
                  d.setDate(d.getDate() - 1);
                  setEngagementDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data de Referência</p>
                <h2 className="text-lg font-black text-slate-900 uppercase">{new Date(engagementDate).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</h2>
              </div>
              <button 
                onClick={() => {
                  const d = new Date(engagementDate);
                  d.setDate(d.getDate() + 1);
                  setEngagementDate(d.toISOString().split('T')[0]);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <ChevronRight size={24} />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={generateEngagementPDF}
                className="flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-slate-800 transition-all shadow-lg"
              >
                <Download size={16} /> PDF Engajamento
              </button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date" 
                  value={engagementDate}
                  onChange={(e) => setEngagementDate(e.target.value)}
                  className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold uppercase cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Target size={20} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${engagementStats.today >= engagementStats.dayTarget ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {Math.round((engagementStats.today / engagementStats.dayTarget) * 100)}% DA META
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produção Diária</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{engagementStats.today} <span className="text-slate-300 text-lg">/ {engagementStats.dayTarget}</span></h3>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div className="flex gap-1">
                  {engagementStats.shiftStats.map(s => (
                    <div key={s.turno} title={`${s.turno}: ${s.total}/15`} className={`w-2 h-2 rounded-full ${s.total >= 15 ? 'bg-emerald-500' : s.total > 0 ? 'bg-amber-500' : 'bg-slate-200'}`} />
                  ))}
                </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produção por Turno</p>
              <div className="mt-2 space-y-1">
                {engagementStats.shiftStats.map(s => (
                  <div key={s.turno} className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-500 uppercase">{s.turno}</span>
                    <span className={`text-[10px] font-black ${s.total >= 15 ? 'text-emerald-600' : s.total > 0 ? 'text-amber-600' : 'text-slate-400'}`}>{s.total}/15</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${engagementStats.week >= engagementStats.weekTarget ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                  {Math.round((engagementStats.week / engagementStats.weekTarget) * 100)}% DA META
                </span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Produção Semanal</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1">{engagementStats.week} <span className="text-slate-300 text-lg">/ {engagementStats.weekTarget}</span></h3>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 bg-white/10 text-white rounded-xl flex items-center justify-center">
                  <TrendingUp size={20} />
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400">Tempo Real</span>
                </div>
              </div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Status da Operação</p>
              <h3 className="text-xl font-black mt-1 uppercase tracking-tight">
                {engagementStats.today >= engagementStats.dayTarget ? '🟢 Meta Atingida' : engagementStats.today > 0 ? '🟡 Abaixo da Meta' : '🔴 Sem Checklist'}
              </h3>
            </div>
          </div>

          {/* Grade de Turnos e Áreas */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Painel de Engajamento por Turno</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Meta (3+)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-500 rounded-full" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Abaixo (1-2)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500 rounded-full" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Sem Registro</span>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="p-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-r border-slate-100">Área Operacional</th>
                    {TURNOS.map(turno => (
                      <th key={turno} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        {turno}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {AREAS.map(area => (
                    <tr key={area} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 border-r border-slate-100">
                        <span className="text-[11px] font-black text-slate-700 uppercase">{area}</span>
                      </td>
                      {TURNOS.map(turno => {
                        const shift = engagementStats.shiftStats.find(s => s.turno === turno);
                        const areaStat = shift?.areaStats.find(as => as.area === area);
                        const count = areaStat?.count || 0;
                        const target = areaStat?.target || 3;
                        
                        return (
                          <td key={turno} className="p-4">
                            <div className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${getEngagementBgColor(count, target)} ${getEngagementBorderColor(count, target)}`}>
                              <span className={`text-lg font-black ${getEngagementTextColor(count, target)}`}>{count}</span>
                              <div className="flex gap-1 mt-1">
                                {[1, 2, 3].map(i => (
                                  <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= count ? getEngagementColor(count, target) : 'bg-slate-200'}`} />
                                ))}
                              </div>
                              {count === 0 && (
                                <span className="text-[7px] font-black text-red-500 uppercase mt-1 animate-pulse">❌ Sem Checklist</span>
                              )}
                              {count > 0 && count < target && (
                                <span className="text-[7px] font-black text-amber-600 uppercase mt-1">⚠️ Abaixo da Meta</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Produção por Turma e Área (Semana/Mês) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                <Users size={18} className="text-blue-600" /> Produção por Turma (Semana e Mês)
              </h3>
              <div className="space-y-6">
                {engagementStats.turmaStats.map(stat => (
                  <div key={stat.turma} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-black text-slate-900 uppercase">Turma {stat.turma}</span>
                    </div>
                    
                    {/* Barra Semanal */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Semanal</span>
                        <span className="text-[10px] font-black text-blue-600">{stat.weekCount} <span className="text-slate-400 text-[8px]">Checklists</span></span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((stat.weekCount / (engagementStats.weekTarget / 4)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Barra Mensal */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Mensal</span>
                        <span className="text-[10px] font-black text-indigo-600">{stat.monthCount} <span className="text-slate-400 text-[8px]">Checklists</span></span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.min((stat.monthCount / (engagementStats.monthTarget / 4)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
                <Target size={18} className="text-indigo-600" /> Produção por Área (Semana)
              </h3>
              <div className="space-y-4">
                {engagementStats.areaStatsWeek.map(stat => (
                  <div key={stat.area} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-700 uppercase truncate max-w-[200px]">{stat.area}</span>
                      <span className="text-[11px] font-black text-slate-900">{stat.count}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${Math.min((stat.count / (engagementStats.weekTarget / 5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  placeholder="BUSCAR OPERADOR OU ÁREA..."
                  value={searchTerm || ''}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold uppercase"
                />
              </div>
              <div className="relative flex-1 sm:max-w-[200px]">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="date"
                  value={dateFilter || ''}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none text-xs font-bold uppercase cursor-pointer"
                />
              </div>
              <button 
                onClick={() => exportToExcel(filteredReports, 'Auditoria_Relatorios')}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-700 transition-all shadow-lg"
              >
                <Download size={16} /> Excel
              </button>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div 
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-5 flex items-center justify-between cursor-pointer transition-all hover:bg-slate-50 ${
                    selectedReport?.id === report.id ? 'bg-blue-50 border-l-8 border-blue-600' : 'border-l-8 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-[11px] border shadow-sm ${getTurnoColor(report.turno)}`}>
                      {report.turno.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight">{report.area}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-slate-500 text-[9px] font-black uppercase tracking-tighter">{report.operator}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-blue-600 text-[9px] font-black uppercase">TURMA {report.turma}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-[11px] font-black text-slate-900">{formatDateOnly(report.timestamp)}</p>
                      <p className={`text-[8px] font-black uppercase mt-0.5 tracking-widest px-2 py-0.5 rounded ${getTurnoColor(report.turno)}`}>
                        {report.turno}
                      </p>
                    </div>
                    <ArrowRight size={20} className="text-slate-300" />
                  </div>
                </div>
              ))}
              {filteredReports.length === 0 && (
                <div className="p-10 text-center text-slate-400 font-black uppercase text-[10px]">
                  Nenhum relatório encontrado para o filtro.
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            {selectedReport ? (
              <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 shadow-2xl sticky top-24 overflow-hidden animate-in slide-in-from-right-4 duration-300 flex flex-col max-h-[85vh]">
                <div className="p-6 bg-slate-900 text-white shrink-0">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest ${getTurnoColor(selectedReport.turno)}`}>
                      <Clock size={12} /> {selectedReport.turno}
                    </div>
                    <button onClick={() => setSelectedReport(null)} className="text-slate-400 hover:text-white transition-colors"><X size={24} /></button>
                  </div>
                  <h3 className="text-xl font-black uppercase tracking-tight">{selectedReport.area}</h3>
                  <div className="flex items-center gap-2 mt-2 text-blue-400">
                    <Calendar size={14} />
                    <span className="text-[12px] font-black uppercase tracking-widest">DATA: {formatDateOnly(selectedReport.timestamp)}</span>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-inner">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <User size={12} /> Responsável
                      </div>
                      <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{selectedReport.operator}</p>
                    </div>
                    <div className="space-y-1 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        <Users size={12} /> Equipe
                      </div>
                      <p className="text-[11px] font-black text-blue-600 uppercase leading-none">Turma {selectedReport.turma}</p>
                    </div>
                  </div>

                  {/* CONTADORES DE PERFORMANCE */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-700 uppercase">ITENS OK</span>
                      </div>
                      <span className="text-lg font-black text-emerald-700">{stats.ok}</span>
                    </div>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <XCircle size={16} className="text-red-500" />
                        <span className="text-[10px] font-black text-red-700 uppercase">ANOMALIAS</span>
                      </div>
                      <span className="text-lg font-black text-red-700">{stats.fail}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <ClipboardList size={16} className="text-blue-600" />
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Folha de Verificação Completa</h4>
                    </div>
                    
                    <div className="space-y-1.5">
                      {fullChecklistItems.map((item, i) => {
                        const isSection = item.label.startsWith('SECTION:');
                        if (isSection) {
                          return (
                            <div key={i} className="pt-4 pb-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 py-0.5 bg-slate-50 border border-slate-100 rounded">
                                {item.label.replace('SECTION:', '')}
                              </span>
                            </div>
                          );
                        }
                        
                        const isFailure = item.status === 'fail' || item.status === 'warning';

                        return (
                          <div key={i} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isFailure ? 'bg-red-50/50 border-red-200' : 'bg-white border-slate-100'
                          }`}>
                            <div className="max-w-[70%]">
                              <span className={`text-[10px] font-bold uppercase leading-tight ${isFailure ? 'text-red-900' : 'text-slate-600'}`}>
                                {item.label}
                              </span>
                              {item.observation && isFailure && (
                                <p className="text-[9px] font-black text-red-600 uppercase mt-1 italic leading-tight">
                                  ↳ {item.observation}
                                </p>
                              )}
                            </div>
                            <div className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 ${getStatusStyle(item.status)}`}>
                              {getStatusIcon(item.status)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {selectedReport.generalObservations && (
                    <div className="space-y-3 pt-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Passagem de Turno</p>
                      <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl">
                        <p className="text-[11px] font-bold text-slate-700 uppercase leading-relaxed italic">
                          "{selectedReport.generalObservations}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 border-t border-slate-100 shrink-0 bg-slate-50/50">
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => shareToWhatsApp(formatReportForWhatsApp(selectedReport, fullChecklistItems))} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all">
                      <MessageCircle size={18} /> WhatsApp
                    </button>
                    <button onClick={async () => {
                      const success = await copyToClipboard(formatReportForWhatsApp(selectedReport, fullChecklistItems));
                      if (success) { setCopyFeedback(true); setTimeout(() => setCopyFeedback(false), 2000); }
                    }} className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 shadow-lg border-2 transition-all ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'}`}>
                      {copyFeedback ? <Check size={18} /> : <Copy size={18} />} {copyFeedback ? 'Copiado!' : 'Copiar Texto'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center text-slate-400 text-center p-12 space-y-6">
                <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-300 shadow-inner">
                  <FileText size={40} />
                </div>
                <p className="font-black uppercase text-sm tracking-tighter">Selecione um Relatório Operacional</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportsHistory;
