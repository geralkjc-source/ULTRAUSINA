
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Area, Turma, Turno, ChecklistItem, Report, Discipline } from '../types';
import { CHECKLIST_TEMPLATES } from '../constants';
import { formatReportForWhatsApp, shareToWhatsApp, copyToClipboard } from '../services/whatsappShare';
import { getCurrentShiftInfo } from '../services/shiftService';
import { fetchEmployees, Employee } from '../services/employeeService';

// Standard Lucide icons
import { 
  ArrowLeft as ArrowLeftIcon,
  CheckCircle2 as CheckCircleIcon,
  Check as CheckIconStandard,
  ShieldAlert as ShieldAlertIcon,
  Target as TargetIcon,
  AlertTriangle as AlertTriangleIcon,
  StickyNote as StickyNoteIcon,
  RotateCcw as RotateCcwIcon,
  Send as SendIcon,
  Wrench as WrenchIcon,
  Zap as ZapIconStandard,
  Cpu as CpuIcon,
  UserCog as UserCogIcon,
  Copy as CopyIcon,
  Clock as ClockIcon,
  Lock,
  Zap
} from 'lucide-react';

interface ChecklistAreaProps {
  onSaveReport: (report: Report) => void;
}

const ChecklistArea: React.FC<ChecklistAreaProps> = ({ onSaveReport }) => {
  const { areaName } = useParams<{ areaName: string }>();
  const navigate = useNavigate();
  const currentArea = areaName ? decodeURIComponent(areaName) as Area : Area.DFP2;
  
  const [operator, setOperator] = useState('');
  const [matricula, setMatricula] = useState('');
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [observations, setObservations] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSavedReport, setLastSavedReport] = useState<Report | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isColumnsFeeding, setIsColumnsFeeding] = useState(true);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState<{ field: string; visible: boolean }>({ field: '', visible: false });

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  // Sincroniza a escala a cada minuto para garantir precisão em trocas de turno
  useEffect(() => {
    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const template = CHECKLIST_TEMPLATES[currentArea];
    if (template) {
      setItems(template.map((label, index) => ({
        id: `item-${index}`,
        label,
        status: 'ok',
        discipline: 'OPERAÇÃO',
        observation: ''
      })));
    }
  }, [currentArea]);

  const updateItemStatus = (id: string, status: 'ok' | 'fail' | 'na' | 'warning', observation?: string) => {
    const item = items.find(i => i.id === id);
    if (item?.label === 'ALIMENTANDO COLUNAS?') {
      setIsColumnsFeeding(status === 'ok');
    }
    
    let autoDiscipline: Discipline = 'OPERAÇÃO';
    const labelLower = item?.label.toLowerCase() || '';
    if (labelLower.includes('sprays') || labelLower.includes('pano') || labelLower.includes('underpan') || labelLower.includes('resguardos')) {
      autoDiscipline = 'MECÂNICA';
    } else if (labelLower.includes('valvula') || labelLower.includes('corse') || labelLower.includes('retorno') || labelLower.includes('qualidade água')) {
      autoDiscipline = 'OPERAÇÃO';
    }

    setItems(items.map(item => item.id === id ? { 
      ...item, 
      status, 
      discipline: autoDiscipline,
      observation: observation !== undefined ? observation : item.observation 
    } : item));
    setValidationError(null);
  };

  const updateItemDiscipline = (id: string, discipline: Discipline) => {
    setItems(items.map(item => item.id === id ? { ...item, discipline } : item));
  };

  const updateItemObservation = (id: string, observation: string) => {
    setItems(items.map(item => item.id === id ? { ...item, observation } : item));
    setValidationError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsRequiringJustification = items.filter(item => {
      const isHeader = item.label.startsWith('SECTION:');
      const labelLower = item.label.toLowerCase();
      
      if (labelLower.includes('retorno do tanque 104') || 
          labelLower.includes('corse seeding') || 
          labelLower.includes('valvula de diluicao')) {
        return false;
      }

      if (item.label === 'ALIMENTANDO COLUNAS?' && item.status === 'fail') {
        return false; // Não gera pendência para 'NÃO' em ALIMENTANDO COLUNAS?
      }

      if (!isColumnsFeeding && (labelLower.includes('coluna') || labelLower.includes('-fc-') || labelLower.includes('frother') || labelLower.includes('colector') || labelLower.includes('feed rate colunas'))) {
        return false;
      }

      const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(%)') || labelLower.includes('(kpa)') || 
                            labelLower.includes('(tph)') || labelLower.includes('(g/t)') || labelLower.includes('(hz)') || 
                            labelLower.includes('(ppm)') || labelLower.includes('(t/m³)') || labelLower.includes('(l/min)') ||
                            labelLower.includes('(mm)');
      const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

      if (!isHeader && !isMeasurement && !isTextInput && (item.status === 'fail' || item.status === 'warning')) {
        const obs = item.observation?.trim() || '';
        return obs === '';
      }
      return false;
    });

    if (itemsRequiringJustification.length > 0) {
      setValidationError(`Justificativa obrigatória não preenchida para o item: ${itemsRequiringJustification[0].label}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);
    const filteredItems = items.filter(item => !item.label.startsWith('SECTION:'));
    
    // Usa a escala detectada automaticamente no momento do envio
    const currentScale = getCurrentShiftInfo();

    const report: Report = {
      id: `rep-${Date.now()}`,
      timestamp: Date.now(),
      area: currentArea,
      operator,
      matricula,
      turma: currentScale.turma,
      turno: currentScale.turno,
      items: filteredItems,
      pendingItems: [],
      generalObservations: observations
    };

    setTimeout(() => {
      onSaveReport(report);
      setLastSavedReport(report);
      setIsSubmitting(false);
      setShowSuccessModal(true);
    }, 800);
  };

  const handleShareWhatsApp = () => {
    if (lastSavedReport) {
      const whatsappText = formatReportForWhatsApp(lastSavedReport, items);
      shareToWhatsApp(whatsappText);
    }
  };

  const handleCopyText = async () => {
    if (lastSavedReport) {
      const text = formatReportForWhatsApp(lastSavedReport, items);
      const success = await copyToClipboard(text);
      if (success) {
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
      }
    }
  };

  const handleOperatorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setOperator(value);
    setSearchTerm(value);
    setShowSuggestions({ field: 'operator', visible: value.length > 1 });
  };

  const handleMatriculaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMatricula(value);
    setSearchTerm(value);
    setShowSuggestions({ field: 'matricula', visible: value.length > 1 });

    const exactMatch = employees.find(emp => emp.matricula === value);
    if (exactMatch) {
      setOperator(exactMatch.nome.toUpperCase());
      setMatricula(exactMatch.matricula);
      setShowSuggestions({ field: '', visible: false });
    }
  };

  const selectEmployee = (emp: Employee) => {
    setOperator(emp.nome.toUpperCase());
    setMatricula(emp.matricula);
    setShowSuggestions({ field: '', visible: false });
  };

  const renderItemControl = (item: ChecklistItem) => {
    const labelLower = item.label.toLowerCase();
    
    if (labelLower.includes('condições dos resguardos')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'NO LUGAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'NO LUGAR' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>NO LUGAR</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'FORA DO LUGAR')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'FORA DO LUGAR' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>FORA DO LUGAR</button>
        </div>
      );
    }

    if (labelLower.includes('sprays') || labelLower.includes('pano') || labelLower.includes('underpan')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'OK')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'OK' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>OK</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'ANORMAL')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'ANORMAL' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>ANORMAL</button>
        </div>
      );
    }

    if (labelLower.includes('valvula de diluicao')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'ABERTA')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'ABERTA' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>ABERTA</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'FECHADA')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'FECHADA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>FECHADA</button>
        </div>
      );
    }

    if (labelLower.includes('corse seeding')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'ABERTO')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'ABERTO' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>ABERTO</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'FECHADO')} className={`px-6 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'FECHADO' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>FECHADO</button>
        </div>
      );
    }

    if (labelLower.includes('qualidade água')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'LIMPA')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'LIMPA' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>LIMPA</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'warning', 'TURVA')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'TURVA' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500'}`}>TURVA</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'SUJA')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'SUJA' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>SUJA</button>
        </div>
      );
    }

    if (labelLower.includes('retorno do tanque 104')) {
       return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'COM RETORNO')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'COM RETORNO' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500'}`}>COM RETORNO</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'SEM RETORNO')} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${item.observation === 'SEM RETORNO' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>SEM RETORNO</button>
        </div>
      );
    }

    if (item.label === 'ALIMENTANDO COLUNAS?') {
      return (
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-inner">
          <button type="button" onClick={() => updateItemStatus(item.id, 'ok', 'SIM')} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${item.status === 'ok' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>SIM</button>
          <button type="button" onClick={() => updateItemStatus(item.id, 'fail', 'NÃO')} className={`px-8 py-3 rounded-lg text-xs font-black uppercase transition-all ${item.status === 'fail' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}>NÃO</button>
        </div>
      );
    }

    const isMeasurement = labelLower.includes('(m³/h)') || labelLower.includes('(%)') || labelLower.includes('(kpa)') || 
                          labelLower.includes('(tph)') || labelLower.includes('(g/t)') || labelLower.includes('(hz)') || 
                          labelLower.includes('(ppm)') || labelLower.includes('(t/m³)') || labelLower.includes('(l/min)') ||
                          labelLower.includes('(mm)');
    const isTextInput = labelLower.includes('ply') || labelLower.includes('linhas') || labelLower.includes('nota');

    if (isMeasurement || isTextInput) {
       return (
        <div className="relative w-full max-w-[200px]">
          <input type={isMeasurement && !labelLower.includes('ply') ? "number" : "text"} placeholder={isMeasurement ? "Vlr..." : "Preencher..."} value={item.observation || ''} onChange={(e) => updateItemObservation(item.id, e.target.value)} className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none font-black text-[11px] uppercase transition-all text-blue-600" />
        </div>
       );
    }

    return (
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-inner">
        <button type="button" onClick={() => updateItemStatus(item.id, 'ok', '')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'ok' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>OK</button>
        <button type="button" onClick={() => updateItemStatus(item.id, 'na', 'STANDBY')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'na' ? 'bg-slate-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>SBY</button>
        <button type="button" onClick={() => updateItemStatus(item.id, 'fail')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'fail' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>FALHA</button>
        <button type="button" onClick={() => updateItemStatus(item.id, 'warning')} className={`px-4 py-2 rounded-md text-[10px] font-black uppercase transition-all ${item.status === 'warning' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}>ANOM</button>
      </div>
    );
  };

  let skipDueToNoFeed = false;

  const getShiftColor = (turno: Turno) => {
    if (turno === 'MANHÃ') return 'bg-blue-600';
    if (turno === 'TARDE') return 'bg-orange-500';
    if (turno === 'NOITE') return 'bg-indigo-700';
    return 'bg-slate-900';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100 animate-bounce"><CheckCircleIcon size={56} /></div>
            <div className="space-y-2">
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Relatório Concluído!</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Plataforma Ultrafino Usina 2</p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={handleShareWhatsApp} className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-emerald-500/20 active:scale-95"><SendIcon size={20} /> Compartilhar Agora</button>
              <button onClick={handleCopyText} className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl border-2 active:scale-95 ${copyFeedback ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-900 border-slate-100 hover:border-slate-300'}`}>{copyFeedback ? <CheckIconStandard size={20} /> : <CopyIcon size={20} />}{copyFeedback ? 'Copiado!' : 'Copiar Texto'}</button>
              <button onClick={() => navigate('/history')} className="w-full text-slate-400 py-3 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">Ver Histórico de Turnos</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeftIcon size={16} /> Voltar</button>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/manual-pending')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <AlertTriangleIcon size={14} /> Registrar Pendência
          </button>
          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{currentArea}</h1>
            <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Plataforma Ultrafino Usina 2</p>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl flex items-center gap-4 text-red-600 animate-shake shadow-lg shadow-red-500/5">
          <AlertTriangleIcon className="shrink-0" size={24} />
          <p className="font-black text-[11px] uppercase tracking-wider leading-relaxed">{validationError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 pb-12">
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><UserCogIcon size={14} className="text-blue-500" /> Identificação</label>
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  required 
                  placeholder="DIGITE SEU NOME..." 
                  value={operator || ''} 
                  onChange={handleOperatorChange} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                  autoComplete="off"
                />
                {showSuggestions.visible && showSuggestions.field === 'operator' && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                    {employees.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                      <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp)} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                        <span className="font-black text-slate-900 text-xs uppercase">{emp.nome}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.matricula} | {emp.funcao} | {emp.equipe}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <input 
                  type="text" 
                  required 
                  placeholder="MATRÍCULA..." 
                  value={matricula || ''} 
                  onChange={handleMatriculaChange} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                  autoComplete="off"
                />
                {showSuggestions.visible && showSuggestions.field === 'matricula' && (
                  <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                    {employees.filter(e => e.matricula.includes(searchTerm)).map(emp => (
                      <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp)} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                        <span className="font-black text-slate-900 text-xs uppercase">{emp.matricula}</span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.nome} | {emp.funcao} | {emp.equipe}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* PAINEL DE ESCALA AUTOMÁTICA */}
          <div className="space-y-3">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               <Lock size={12} className="text-slate-400" /> Escala Vigente (Auto)
             </label>
             <div className="flex gap-4">
                <div className={`flex-1 ${getShiftColor(detectedScale.turno)} p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col justify-center`}>
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black text-white/60 uppercase tracking-widest">Turno</span>
                      <ClockIcon size={12} className="text-white/40" />
                   </div>
                   <span className="text-white font-black uppercase text-sm">{detectedScale.turno}</span>
                </div>
                <div className="flex-1 bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-center">
                   <div className="flex items-center justify-between mb-1">
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Equipe</span>
                      <Zap size={12} className="text-amber-500" />
                   </div>
                   <span className="text-white font-black uppercase text-sm">Turma {detectedScale.turma}</span>
                </div>
             </div>
             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest text-center mt-2 flex items-center justify-center gap-1">
               <Zap size={8} className="text-amber-500" /> Sincronizado com Escala Vulcan 2026
             </p>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
          {items.map((item, idx) => {
            const isHeader = item.label.startsWith('SECTION:');
            const labelLower = item.label.toLowerCase();

            if (item.label === 'ALIMENTANDO COLUNAS?') {
              skipDueToNoFeed = !isColumnsFeeding;
            } else if (isHeader && labelLower.includes('equipamentos hbf')) {
              skipDueToNoFeed = false;
            }

            if (skipDueToNoFeed && item.label !== 'ALIMENTANDO COLUNAS?') {
              const isActuallyColumnItem = labelLower.includes('coluna') || labelLower.includes('-fc-') || labelLower.includes('frother') || labelLower.includes('colector') || labelLower.includes('feed rate colunas') || labelLower.includes('ar (kpa)') || labelLower.includes('nível (%)') || labelLower.includes('setpoint (%)');
              if (isActuallyColumnItem) return null;
            }

            const isFailOrWarning = item.status === 'fail' || item.status === 'warning';
            const isNoFeedButNeedsObs = item.label === 'ALIMENTANDO COLUNAS?' && item.status === 'fail';
            
            const isAuxiliaryItem = labelLower.includes('retorno do tanque 104') || 
                                    labelLower.includes('corse seeding') || 
                                    labelLower.includes('valvula de diluicao');
                                    
            const isSimplifiedItem = labelLower.includes('sprays') || labelLower.includes('pano') || labelLower.includes('underpan') || labelLower.includes('resguardos') || labelLower.includes('qualidade água') || item.label === 'ALIMENTANDO COLUNAS?';
            
            return (
              <div key={item.id} className={`p-8 space-y-6 transition-colors ${isHeader ? 'bg-slate-50/80 backdrop-blur-sm' : 'hover:bg-slate-50/30'}`}>
                {isHeader ? (
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-1 bg-blue-500 rounded-full" />
                    <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{item.label.replace('SECTION:', '')}</h3>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-800 text-xs uppercase tracking-tight">{item.label}</h4>
                      </div>
                      {renderItemControl(item)}
                    </div>
                    
                    {(isFailOrWarning || isNoFeedButNeedsObs) && !isAuxiliaryItem && !(item.label === 'ALIMENTANDO COLUNAS?' && item.status === 'fail') && (
                      <div className="p-6 bg-slate-50 rounded-[2rem] space-y-6 border-2 border-slate-100 animate-in slide-in-from-top-4 duration-300">
                        {isFailOrWarning && !isSimplifiedItem && (
                          <div className="space-y-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2"><ShieldAlertIcon size={14} className="text-red-500" /> Setor Responsável pela Anomalia</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {[
                                { id: 'MECÂNICA', icon: <WrenchIcon size={12} />, color: 'bg-orange-500' },
                                { id: 'ELÉTRICA', icon: <ZapIconStandard size={12} />, color: 'bg-blue-500' },
                                { id: 'INSTRUMENTAÇÃO', icon: <CpuIcon size={12} />, color: 'bg-purple-500' },
                                { id: 'OPERAÇÃO', icon: <UserCogIcon size={12} />, color: 'bg-emerald-500' }
                              ].map(disc => (
                                <button key={disc.id} type="button" onClick={() => updateItemDiscipline(item.id, disc.id as Discipline)} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all active:scale-95 ${item.discipline === disc.id ? `${disc.color} text-white border-transparent shadow-lg` : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{disc.icon} {disc.id}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                            {item.label === 'ALIMENTANDO COLUNAS?' ? 'JUSTIFICATIVA PARA NÃO ALIMENTAR' : 'Descrição Técnica da Falha'}
                          </label>
                          <textarea placeholder={item.label === 'ALIMENTANDO COLUNAS?' ? "DESCREVA O MOTIVO DA PARADA..." : "DESCREVA O PROBLEMA COM DETALHES..."} value={item.observation || ''} onChange={(e) => updateItemObservation(item.id, e.target.value.toUpperCase())} className="w-full p-5 bg-white border-2 border-slate-200 rounded-2xl text-[11px] font-black uppercase outline-none focus:border-red-400 transition-all shadow-inner" rows={3} />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4">
           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2"><StickyNoteIcon size={14} className="text-blue-500" /> Observações Gerais / Passagem de Turno</label>
           <textarea placeholder="REGISTRE AQUI PONTOS DE ATENÇÃO PARA O PRÓXIMO TURNO..." value={observations} onChange={(e) => setObservations(e.target.value.toUpperCase())} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-6 rounded-[2rem] bg-slate-900 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-sm">
          {isSubmitting ? <RotateCcwIcon size={20} className="animate-spin" /> : <SendIcon size={20} />}
          {isSubmitting ? 'PROCESSANDO...' : 'TRANSMITIR RELATÓRIO USINA 2'}
        </button>
      </form>
    </div>
  );
};

export default ChecklistArea;
