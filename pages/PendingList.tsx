
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
  ShieldAlert,
  ArrowDownToLine,
  ExternalLink,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { PendingItem, Area, Turma, Discipline } from '../types';
import { formatShiftSummaryForWhatsApp, copyToClipboard, shareToWhatsApp } from '../services/whatsappShare';
import { getCurrentShiftInfo } from '../services/shiftService';
import { exportToExcel } from '../services/excelExport';
import { exportShiftReportPDF, exportAuditPDF } from '../services/pdfExport';
import { fetchEmployees, Employee } from '../services/employeeService';

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
  
  const queryArea = searchParams.get('area');
  const queryStatus = searchParams.get('status');
  const queryTurma = searchParams.get('turma');

  const [searchTerm, setSearchTerm] = useState('');
  const [areaFilter, setAreaFilter] = useState<string>(queryArea || 'Tudo');
  const [statusFilter, setStatusFilter] = useState<'aberto' | 'resolvido' | 'Tudo'>( (queryStatus as any) || 'aberto');
  const [turmaFilter, setTurmaFilter] = useState<Turma | 'Tudo'>( (queryTurma as any) || 'Tudo');
  
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolverName, setResolverName] = useState('');
  const [resolutionDescription, setResolutionDescription] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showResolverSuggestions, setShowResolverSuggestions] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  const filteredItems = pendingItems.filter(item => {
    if (!item) return false;
    const matchesSearch = (item.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.tag || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = areaFilter === 'Tudo' || item.area === areaFilter;
    const matchesStatus = statusFilter === 'Tudo' || item.status === statusFilter;
    const matchesTurma = turmaFilter === 'Tudo' || item.turma === turmaFilter;
    
    return matchesSearch && matchesArea && matchesStatus && matchesTurma;
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

  const handleCopySummary = async () => {
    const shiftInfo = getCurrentShiftInfo();
    
    // Trabalho realizado: Itens resolvidos pela turma atual no turno atual (ou hoje)
    // Para simplificar e ser preciso: Itens resolvidos hoje pela turma logada
    const today = new Date().setHours(0, 0, 0, 0);
    const workDone = pendingItems.filter(item => 
      item.status === 'resolvido' && 
      item.resolvedAt && item.resolvedAt >= today &&
      item.resolvedByTurma === shiftInfo.turma
    );

    // Pendências remanescentes: Todos os itens que continuam abertos
    const remaining = pendingItems.filter(item => item.status === 'aberto');

    const text = formatShiftSummaryForWhatsApp([...workDone, ...remaining], { turma: shiftInfo.turma, turno: shiftInfo.turno });
    const success = await copyToClipboard(text);
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      shareToWhatsApp(text);
    }
  };

  /**
   * Vulcan Strict-Date Formatter v3.9
   * Formata Data e Hora para exibir exatamente o que está na planilha.
   */
  const formatDateSafely = (timestamp: number | undefined) => {
    if (!timestamp || timestamp === 0) return "---";
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return "DATA INVÁLIDA";
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}`;
  };

  return (
    <div className="space-y-6">
      {resolvingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl space-y-8 animate-in zoom-in-95">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><UserCheck size={40} /></div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Baixa de Pendência</h2>
              <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Lock size={12} /> Turma Logada: <span className="text-emerald-600">Equipe {getCurrentShiftInfo().turma}</span>
              </p>
            </div>
            <div className="space-y-4 relative">
              <input 
                type="text" 
                placeholder="SEU NOME..." 
                value={resolverName || ''} 
                onChange={(e) => { setResolverName(e.target.value); setShowResolverSuggestions(true); }} 
                onFocus={() => setShowResolverSuggestions(true)}
                className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-center uppercase outline-none focus:border-emerald-500 transition-all shadow-inner" 
              />
              <textarea
                placeholder="DESCRIÇÃO TÉCNICA DO QUE FOI FEITO..."
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
              <button onClick={() => { setResolvingId(null); setResolutionDescription(''); }} className="flex-1 py-5 border-2 border-slate-100 rounded-2xl font-black uppercase text-slate-400 text-[10px] tracking-widest">Cancelar</button>
              <button onClick={() => { if(resolvingId && resolverName.trim()){ onResolve(resolvingId, resolverName.toUpperCase(), getCurrentShiftInfo().turma, resolutionDescription); setResolvingId(null); setResolverName(''); setResolutionDescription(''); } }} disabled={!resolverName.trim()} className="flex-1 bg-emerald-600 text-white py-5 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Painel de Pendências</h1>
        </div>
        <button 
          onClick={() => navigate('/manual-pending')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
        >
          <AlertCircle size={16} /> Registrar Pendência Manual
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={handleCopySummary} className={`flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 transition-all active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-100 hover:border-blue-500'}`}>
          <Copy size={18} /> Copiar Resumo e Partilhar
        </button>
        <button onClick={() => exportShiftReportPDF(pendingItems, { teamLeader: 'EQUIPE VULCAN', turma: getCurrentShiftInfo().turma, turno: getCurrentShiftInfo().turno })} className="flex items-center justify-center gap-2 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 border-transparent hover:bg-red-700 transition-all active:scale-95">
          <FileText size={18} /> PDF Turno
        </button>
        <button onClick={() => exportAuditPDF(pendingItems)} className="flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg border-2 border-transparent hover:bg-slate-800 transition-all active:scale-95">
          <ShieldAlert size={18} /> Auditoria PDF
        </button>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="BUSCAR TAG OU DESCRIÇÃO..." value={searchTerm || ''} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none text-sm font-black uppercase focus:bg-white focus:border-blue-500 transition-all shadow-inner" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none">
            <option value="Tudo">Áreas (Tudo)</option>
            {Object.values(Area).map(area => <option key={area} value={area}>{area}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="bg-slate-900 text-white rounded-xl px-3 py-3 text-[9px] font-black uppercase outline-none">
            <option value="aberto">🚨 Em Aberto</option>
            <option value="resolvido">✅ Resolvidas</option>
            <option value="Tudo">Todas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const config = disciplineConfig[item.discipline] || disciplineConfig['OPERAÇÃO'];
          return (
            <div key={item.id} className={`bg-white rounded-[2rem] border-2 transition-all flex flex-col h-full overflow-hidden ${item.status === 'resolvido' ? 'border-emerald-500 bg-emerald-50/10' : 'border-slate-100 shadow-sm'}`}>
              <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bg} ${config.color} text-[9px] font-black uppercase tracking-tight`}>
                  {config.icon} {item.discipline}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.turno}</span>
                  {item.status === 'resolvido' ? <CheckCircle2 size={14} className="text-emerald-600 mt-1" /> : <Clock size={14} className="text-amber-500 animate-pulse mt-1" />}
                </div>
              </div>
              
              <div className="p-6 space-y-4 flex-grow">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tight">
                  <span className="bg-slate-900 text-white px-3 py-1 rounded-lg">{item.area}</span>
                  <span className="text-blue-600 border border-blue-100 px-3 py-1 rounded-lg">TAG: {item.tag || 'S/T'}</span>
                </div>
                <p className={`text-sm font-black uppercase leading-relaxed ${item.status === 'resolvido' ? 'text-emerald-900' : 'text-slate-800'}`}>{item.description}</p>
                
                <div className="p-4 bg-white/50 rounded-2xl border border-slate-100 space-y-4 shadow-inner">
                   <div className="flex items-start gap-3 border-b border-slate-100 pb-3">
                     <Calendar size={14} className="text-slate-400 mt-1" />
                     <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Data do Reporte</span>
                        <span className="text-[11px] font-black text-slate-700 uppercase mt-1">
                          {formatDateSafely(item.timestamp)}
                        </span>
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{item.turno}</span>
                        <span className="text-[8px] font-bold text-slate-400 mt-0.5">{item.operator} (TURMA {item.turma})</span>
                     </div>
                   </div>

                   {item.status === 'resolvido' && (
                     <div className="flex items-start gap-3 pt-1 animate-in slide-in-from-top-2 duration-300">
                       <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center mt-1 shrink-0"><Check size={12} /></div>
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-emerald-600 uppercase tracking-[0.2em]">Data da Resolução</span>
                          <span className="text-[11px] font-black text-emerald-800 uppercase mt-1">
                            {formatDateSafely(item.resolvedAt)}
                          </span>
                          <span className="text-[8px] font-bold text-emerald-600 mt-0.5 uppercase">{item.resolvedBy} (EQUIPE {item.resolvedByTurma})</span>
                       </div>
                     </div>
                   )}
                </div>
              </div>

              <div className="p-6 border-t mt-auto">
                {item.status === 'aberto' ? (
                  <button onClick={() => setResolvingId(item.id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95">Resolver Agora</button>
                ) : (
                  <div className="w-full py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-inner">
                    <CheckCircle2 size={16} /> Item Concluído
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
