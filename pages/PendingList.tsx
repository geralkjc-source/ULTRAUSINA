
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Search, 
  CheckCircle2, 
  Clock, 
  RotateCw,
  UserCheck,
  Check,
  Wrench,
  Zap,
  Cpu,
  UserCog,
  Copy,
  Calendar,
  Lock,
  Download,
  FileSpreadsheet,
  FileText,
  Mail,
  ShieldAlert,
  ArrowDownToLine,
  ExternalLink,
  ClipboardList,
  AlertCircle,
  Tag,
  Activity
} from 'lucide-react';
import { PendingItem, Area, Turma, Discipline, Turno } from '../types';
import { formatShiftSummaryForWhatsApp, copyToClipboard, shareToWhatsApp } from '../services/whatsappShare';
import { getCurrentShiftInfo, getPreviousShiftInfo, getPreviousShiftRange, getCurrentShiftRange } from '../services/shiftService';
import { exportToExcel } from '../services/excelExport';
import { exportShiftReportPDF, exportAuditPDF, generateShiftReportPDFBase64, generateAuditPDFBase64, generateDisciplineAuditPDFBase64 } from '../services/pdfExport';
import { fetchEmployees, Employee } from '../services/employeeService';
import { backendService } from '../services/backendService';
import { useLanguage } from '../LanguageContext';

interface PendingListProps {
  pendingItems: PendingItem[];
  onResolve: (id: string, operatorName: string, resolvedTurma: Turma) => void;
  onAddComment: (id: string, text: string) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

const PendingList: React.FC<PendingListProps> = ({ pendingItems = [], onResolve, onRefresh, isRefreshing }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language, translateArea, translateDiscipline, translateShift } = useLanguage();
  
  const queryArea = searchParams.get('area');
  const queryStatus = searchParams.get('status');
  const queryDiscipline = searchParams.get('discipline');

  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>(queryArea || 'all');
  const [statusFilter, setStatusFilter] = useState<string>( (queryStatus as any) || 'all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>( (queryDiscipline as any) || 'all');
  
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolverName, setResolverName] = useState('');
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showResolverSuggestions, setShowResolverSuggestions] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();

    // Automation: Check and send Audit PDF
    const sendReportsInternal = async (reason: string, reportType: 'all' | 'master' | 'discipline' = 'all') => {
      console.log(`Sending ${reason} Audit PDF (${reportType})`);
      const dateStr = new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US');
      
      // 1. Enviar Auditoria Geral (Master)
      if (reportType === 'all' || reportType === 'master') {
        const base64Master = generateAuditPDFBase64(pendingItems, `${t('settings.auditEmailSubject').replace('{reason}', reason)}`.toUpperCase());
        
        const masterEmailBody = `${t('settings.auditEmailBody').replace('{reason}', reason)}
        
${t('settings.auditEmailDetails').replace('{reason}', reason).replace('{date}', dateStr)}
${t('pendingList.open')}: ${pendingItems.filter(i => i.status === 'aberto').length}
${t('pendingList.resolved')}: ${pendingItems.filter(i => i.status === 'resolvido').length}

${t('settings.auditEmailFooter')}`;

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: t('settings.auditEmailSubject').replace('{reason}', 'SIGO'),
            text: masterEmailBody,
            attachment: {
              filename: `Audit_${dateStr.replace(/\//g, '-')}.pdf`,
              content: base64Master
            }
          })
        });
      }

      // 2. Enviar Carga Acumulada por Disciplina para Gestores
      if (reportType === 'all' || reportType === 'discipline') {
        try {
          const config = await backendService.getConfig();
          if (config.disciplineEmails) {
            for (const [discipline, email] of Object.entries(config.disciplineEmails)) {
              if (email && email.trim() !== "") {
                const itemsForDiscipline = pendingItems.filter(i => i.discipline === discipline && i.status === 'aberto');
                
                if (itemsForDiscipline.length > 0) {
                  const base64Disc = generateDisciplineAuditPDFBase64(pendingItems, discipline);
                  const emailBody = `${t('settings.auditEmailBody').replace('{reason}', discipline)}
                  
${t('settings.auditEmailDetails').replace('{reason}', discipline).replace('{date}', dateStr)}
${t('pendingList.open')}: ${itemsForDiscipline.length}
${t('pendingList.resolved')}: ${pendingItems.filter(i => i.discipline === discipline && i.status === 'resolvido').length}

${t('settings.auditEmailFooter')}`;

                  await fetch('/api/send-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      to: email,
                      cc: "",
                      subject: `${t('settings.auditEmailSubject').replace('{reason}', discipline.toUpperCase())} - ${dateStr}`,
                      text: emailBody,
                      attachment: {
                        filename: `Accumulated_Load_${discipline}_${dateStr.replace(/\//g, '-')}.pdf`,
                        content: base64Disc
                      }
                    })
                  });
                }
              }
            }
          }
        } catch (configErr) {
          console.error("Error sending discipline emails:", configErr);
        }
      }
    };

    const checkAutomation = async () => {
      try {
        const res = await fetch('/api/automation/check-audit');
        const { shouldSend, reason } = await res.json();
        
        if (shouldSend && pendingItems.length > 0) {
          await sendReportsInternal(reason, 'all');
          await fetch('/api/automation/mark-audit-sent', { method: 'POST' });
        }
      } catch (error) {
        console.error("Automation error:", error);
      }
    };

    // Delay slightly to ensure data is ready
    const timer = setTimeout(checkAutomation, 5000);
    return () => clearTimeout(timer);
  }, [pendingItems]);

  useEffect(() => {
    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const filteredItems = pendingItems.filter(item => {
    if (!item) return false;
    const matchesSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'all' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesDiscipline = disciplineFilter === 'all' || item.discipline === disciplineFilter;
    
    return matchesSearch && matchesArea && matchesStatus && matchesDiscipline;
  });

  const filteredEmployees = employees.filter(emp => 
    emp.nome.toLowerCase().includes(resolverName.toLowerCase())
  );

  const disciplineConfig: Record<Discipline, { icon: React.ReactNode, color: string, bg: string }> = {
    'MECÂNICA': { icon: <Wrench size={12} />, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    'ELÉTRICA': { icon: <Zap size={12} />, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
    'INSTRUMENTAÇÃO': { icon: <Cpu size={12} />, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
    'OPERAÇÃO': { icon: <UserCog size={12} />, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' }
  };

  const disciplines: Discipline[] = ['MECÂNICA', 'ELÉTRICA', 'INSTRUMENTAÇÃO', 'OPERAÇÃO'];


  const handleCopySummary = async () => {
    const shiftInfo = getCurrentShiftInfo();
    const shiftRange = getCurrentShiftRange();
    
    // Trabalho realizado: Itens resolvidos pela turma atual no turno atual
    const workDone = filteredItems.filter(item => {
      if (item.status !== 'resolvido' || !item.resolvedAt) return false;
      const inRange = item.resolvedAt >= shiftRange.start && item.resolvedAt <= shiftRange.end;
      const inTolerance = item.resolvedAt > shiftRange.end && item.resolvedAt <= shiftRange.end + 60 * 60 * 1000 && item.resolvedByTurma === shiftInfo.turma;
      return (inRange || inTolerance);
    });

    // Pendências remanescentes: Todos os itens que continuam abertos
    const remaining = filteredItems.filter(item => item.status === 'aberto');

    const text = formatShiftSummaryForWhatsApp([...workDone, ...remaining], { turma: shiftInfo.turma, turno: shiftInfo.turno });
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      shareToWhatsApp(text);
    }
  };

  /**
   * SIGO Strict-Date Formatter v3.9
   * Formata Data e Hora para exibir exatamente o que está na planilha.
   */
  const formatDateSafely = (timestamp: number | undefined) => {
    if (!timestamp || timestamp === 0) return "---";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return t('invalidDate');
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return language === 'pt' ? `${day}/${month}/${year}, ${hours}:${minutes}` : `${month}/${day}/${year}, ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      {resolvingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><UserCheck size={40} /></div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t('resolutionTitle')}</h2>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Lock size={12} /> {t('loggedTeam')}: <span className="text-emerald-600">{t('team')} {detectedScale.turma}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-2xl border-2 border-slate-100">
              {(['A', 'B', 'C', 'D'] as Turma[]).map(t_val => (
                <button
                  key={t_val}
                  type="button"
                  onClick={() => setDetectedScale(prev => ({ ...prev, turma: t_val }))}
                  className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${
                    detectedScale.turma === t_val 
                      ? 'bg-slate-900 text-white shadow-lg scale-105' 
                      : 'bg-white text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  {t_val}
                </button>
              ))}
            </div>

            <div className="space-y-4 relative">
              <input 
                type="text" 
                placeholder={t('yourName')} 
                value={resolverName || ''} 
                onChange={(e) => { setResolverName(e.target.value); setShowResolverSuggestions(true); }} 
                onFocus={() => setShowResolverSuggestions(true)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center uppercase outline-none focus:border-emerald-500 transition-all shadow-inner" 
              />
              <textarea
                placeholder={t('technicalDescription')}
                value={resolutionDescription || ''}
                onChange={(e) => setResolutionDescription(e.target.value)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center uppercase outline-none focus:border-emerald-500 transition-all shadow-inner min-h-[100px]"
              />
              {showResolverSuggestions && resolverName && filteredEmployees.length > 0 && (
                <div className="absolute z-[120] w-full bg-white border-2 border-slate-100 rounded-2xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                  {filteredEmployees.map(emp => (
                    <button 
                      key={emp.matricula} 
                      type="button" 
                      onClick={() => { 
                        setResolverName(emp.nome); 
                        setShowResolverSuggestions(false); 
                        // Auto-detect team
                        if (emp.equipe) {
                           const teamUpper = emp.equipe.toUpperCase();
                           if (['A', 'B', 'C', 'D'].includes(teamUpper)) {
                             setDetectedScale(prev => ({ ...prev, turma: teamUpper as Turma }));
                           }
                        }
                      }} 
                      className="w-full text-left px-6 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition-colors"
                    >
                      <div className="text-[10px] font-black uppercase text-slate-700">{emp.nome}</div>
                      <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{emp.funcao} • {emp.equipe}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setResolvingId(null); setResolutionDescription(''); }} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-slate-400 text-[10px] tracking-widest">{t('cancel')}</button>
              <button onClick={() => { if(resolvingId && resolverName.trim()){ onResolve(resolvingId, resolverName.toUpperCase(), detectedScale.turma, resolutionDescription); setResolvingId(null); setResolverName(''); setResolutionDescription(''); } }} disabled={!resolverName.trim()} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">{t('confirm')}</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('pendingListTitle')}</h1>
        </div>
        <button 
          onClick={() => navigate('/manual-pending')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <AlertCircle size={16} /> {t('registerManual')}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <button onClick={handleCopySummary} className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 transition-all active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-100 hover:border-blue-500'}`}>
          <Copy size={18} /> {t('copySummary')}
        </button>
        <button onClick={async () => {
          const prev = getPreviousShiftInfo();
          const range = getPreviousShiftRange();
          const workDone = filteredItems.filter(item => {
            if (item.status !== 'resolvido' || !item.resolvedAt) return false;
            const inRange = item.resolvedAt >= range.start && item.resolvedAt <= range.end;
            const inTolerance = item.resolvedAt > range.end && item.resolvedAt <= range.end + 60 * 60 * 1000 && item.resolvedByTurma === prev.turma;
            return (inRange || inTolerance);
          });
          const remaining = filteredItems.filter(item => item.status === 'aberto');
          const text = formatShiftSummaryForWhatsApp([...workDone, ...remaining], { turma: prev.turma, turno: prev.turno }, range, prev.date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US'));
          const success = await copyToClipboard(text);
          if (success) {
            setCopyFeedback(true);
            setTimeout(() => setCopyFeedback(false), 2000);
            shareToWhatsApp(text);
          }
        }} className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 transition-all active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-slate-100 text-slate-600 border-slate-200 hover:border-slate-300'}`}>
          <Copy size={18} /> Resumo Ant.
        </button>
        <button onClick={() => {
          exportShiftReportPDF(pendingItems, { teamLeader: 'EQUIPE SIGO', turma: getCurrentShiftInfo().turma, turno: getCurrentShiftInfo().turno });
        }} className="flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 border-transparent hover:bg-red-700 transition-all active:scale-95">
          <FileText size={18} /> {t('pdfCurrentShift')}
        </button>
        <button onClick={() => {
          const prev = getPreviousShiftInfo();
          const range = getPreviousShiftRange();
          exportShiftReportPDF(pendingItems, { teamLeader: 'EQUIPE SIGO', turma: prev.turma, turno: prev.turno }, range, prev.date.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US'));
        }} className="flex items-center justify-center gap-2 py-4 bg-orange-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 border-transparent hover:bg-orange-700 transition-all active:scale-95">
          <Clock size={18} /> {t('pdfPreviousShift')}
        </button>
        <button onClick={() => {
          const period = (areaFilter !== 'all' || statusFilter !== 'all' || disciplineFilter !== 'all') 
            ? `FILTRADO: ${areaFilter}/${disciplineFilter}/${statusFilter}`.toUpperCase()
            : 'LISTA GERAL';
          exportAuditPDF(filteredItems, period);
        }} className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 border-transparent hover:bg-slate-800 transition-all active:scale-95">
          <ShieldAlert size={18} /> {t('auditPdf')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder={t('searchPlaceholder')} value={searchTerm || ''} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none text-sm font-black uppercase focus:bg-white focus:border-blue-500 transition-all shadow-inner" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none">
            <option value="all">{t('pendingList.allAreas')}</option>
            {Object.values(Area).map(area => <option key={area} value={area}>{translateArea(area)}</option>)}
          </select>
          <select value={disciplineFilter} onChange={(e) => setDisciplineFilter(e.target.value as any)} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none">
            <option value="all">{t('pendingList.allDisciplines')}</option>
            {disciplines.map(d => <option key={d} value={d}>{translateDiscipline(d)}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-900 text-white rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none">
            <option value="aberto">{t('pendingList.open')}</option>
            <option value="resolvido">{t('pendingList.resolved')}</option>
            <option value="all">{t('pendingList.allStatus')}</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const config = disciplineConfig[item.discipline] || disciplineConfig['OPERAÇÃO'];
          return (
            <div key={item.id} className={`bg-white rounded-[2rem] border-2 transition-all flex flex-col h-full overflow-hidden ${item.status === 'resolvido' ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-100 shadow-sm'}`}>
              <div className="p-5 border-b border-slate-50 space-y-3 bg-slate-50/30">
                <div className="flex flex-col items-start gap-2 text-[10px] font-black uppercase tracking-tight">
                  <span className="bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-widest shadow-md border border-slate-700 flex items-center gap-1.5">
                    <Activity size={14} className="text-slate-400" />
                    {translateArea(item.area)}
                  </span>
                  <span className="bg-blue-700 text-white px-3 py-1.5 rounded-lg text-[13px] font-black uppercase tracking-widest shadow-md border border-blue-400 flex items-center gap-1.5">
                    <Tag size={16} className="text-blue-200" />
                    {item.tag || t('noTag')}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.color} text-[9px] font-black uppercase tracking-tight`}>
                    {config.icon} {translateDiscipline(item.discipline)}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{translateShift(item.turno)}</span>
                    {item.status === 'resolvido' ? <CheckCircle2 size={14} className="text-emerald-600 mt-1" /> : <Clock size={14} className="text-amber-500 animate-pulse mt-1" />}
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-4 flex-grow">
                <p className={`text-sm font-black uppercase leading-relaxed ${item.status === 'resolvido' ? 'text-emerald-900' : 'text-slate-800'}`}>{item.description}</p>
                
                <div className="p-4 bg-white/50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                   <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                     <Calendar size={14} className="text-slate-400 mt-1" />
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('reportDate')}</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase mt-1">
                          {formatDateSafely(item.timestamp)}
                        </span>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{translateShift(item.turno)}</span>
                        <span className="text-[8px] font-bold text-slate-400 mt-0.5">{item.operator} ({t('team')} {item.turma})</span>
                     </div>
                   </div>

                   {item.status === 'resolvido' && (
                     <div className="flex items-start gap-3 pt-1 animate-in slide-in-from-top-2 duration-300">
                       <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center mt-1 shrink-0"><Check size={12} /></div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">{t('resolutionDate')}</span>
                          <span className="text-[11px] font-black text-emerald-800 uppercase mt-1">
                            {formatDateSafely(item.resolvedAt)}
                          </span>
                          <span className="text-[8px] font-bold text-emerald-600 mt-0.5 uppercase">{item.resolvedBy} ({t('team')} {item.resolvedByTurma})</span>
                       </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="p-6 border-t mt-auto">
                {item.status === 'aberto' ? (
                  <button onClick={() => setResolvingId(item.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95">{t('resolveNow')}</button>
                ) : (
                  <div className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-inner">
                    <CheckCircle2 size={16} /> {t('itemCompleted')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PendingList;
