
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
  XCircle
} from 'lucide-react';
import { Report, Area, ChecklistItem, PendingItem } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { exportToExcel } from '../services/excelExport';
import { formatReportForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface ReportsHistoryProps {
  reports: Report[];
  pendingItems: PendingItem[];
  onAddItemComment: (reportId: string, itemId: string, text: string) => void;
}

const ReportsHistory: React.FC<ReportsHistoryProps> = ({ reports = [], pendingItems = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState(''); 
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

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
      const filterYMD = dateFilter; 
      const reportYMD = `${reportDate.getFullYear()}-${(reportDate.getMonth() + 1).toString().padStart(2, '0')}-${reportDate.getDate().toString().padStart(2, '0')}`;
      matchesDate = reportYMD === filterYMD;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Histórico de Relatórios</h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Auditoria Completa com Descrições Técnicas</p>
        </div>
        <button 
          onClick={() => exportToExcel(filteredReports, 'Auditoria_Relatorios')}
          className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase hover:bg-emerald-700 transition-all shadow-lg"
        >
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
    </div>
  );
};

export default ReportsHistory;
