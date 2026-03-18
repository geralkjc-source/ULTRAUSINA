import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft as ArrowLeftIcon, 
  User as UserIcon, 
  Calendar as CalendarIcon, 
  MessageSquare as MessageSquareIcon, 
  CheckCircle2 as CheckCircleIcon, 
  Signature as SignatureIcon,
  Clock as ClockIcon, 
  MapPin as MapPinIcon, 
  AlertTriangle as AlertTriangleIcon,
  Award,
  Zap,
  ShieldAlert,
  Wrench,
  Cpu,
  UserCog
} from 'lucide-react';
import { Area, Turma, Turno, Discipline, PendingItem, OperationalEvent } from '../types';
import { getCurrentShiftInfo } from '../services/shiftService';
import { fetchEmployees, Employee } from '../services/employeeService';
import { useLanguage } from '../LanguageContext';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OperationalFormsProps {
  onAddManualPending: (pending: PendingItem) => void;
  onSaveOperationalEvent: (event: OperationalEvent) => void;
  operationalEvents: OperationalEvent[];
}

const OperationalForms: React.FC<OperationalFormsProps> = ({ onAddManualPending, onSaveOperationalEvent, operationalEvents }) => {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'praise' | 'failure'>('praise');
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
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

  // Praise Form State
  const [praiseData, setPraiseData] = useState({
    elogioNome: '',
    elogioMatricula: '',
    elogioDepartamento: '',
    elogioFuncao: '',
    quemElogiaNome: '',
    quemElogiaMatricula: '',
    quemElogiaDepartamento: '',
    quemElogiaFuncao: '',
    dataElogio: '',
    motivoElogio: '',
    impactoElogio: '',
    assinaturaColaborador: '',
    assinaturaSupervisor: '',
  });

  // Failure Form State
  const [failureData, setFailureData] = useState({
    colaboradorNome: '',
    colaboradorMatricula: '',
    colaboradorDepartamento: '',
    colaboradorFuncao: '',
    dataOcorrencia: '',
    horaOcorrencia: '',
    localOcorrencia: '',
    descricaoFalha: '',
    causasProvaveis: [] as string[],
    outraCausa: '',
    consequenciasObservadas: '',
    acoesCorretivas: '',
    medidasPreventivas: '',
    responsavelRegisto: '',
    supervisorGestor: '',
  });

  const generatePraisePDF = (data: typeof praiseData) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { hour12: false });

    doc.setFontSize(18);
    doc.text(t('operationalForms.praiseForm.title'), 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(t('operationalForms.subtitle'), 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [[t('operationalForms.pdf.field'), t('operationalForms.pdf.info')]],
      body: [
        [t('operationalForms.praiseForm.section1'), ''],
        [t('operationalForms.praiseForm.namePlaceholder'), data.elogioNome],
        [t('operationalForms.praiseForm.matriculaPlaceholder'), data.elogioMatricula],
        [t('operationalForms.praiseForm.deptPlaceholder'), data.elogioDepartamento],
        [t('operationalForms.praiseForm.rolePlaceholder'), data.elogioFuncao],
        [t('operationalForms.praiseForm.section2'), ''],
        [t('operationalForms.praiseForm.namePlaceholder'), data.quemElogiaNome],
        [t('operationalForms.praiseForm.matriculaPlaceholder'), data.quemElogiaMatricula],
        [t('operationalForms.praiseForm.deptRolePlaceholder'), data.quemElogiaDepartamento],
        [t('operationalForms.praiseForm.rolePlaceholder'), data.quemElogiaFuncao],
        [t('operationalForms.praiseForm.section3'), data.dataElogio],
        [t('operationalForms.praiseForm.section4'), data.motivoElogio],
        [t('operationalForms.praiseForm.section5'), data.impactoElogio],
        [t('operationalForms.praiseForm.section6'), ''],
        [t('operationalForms.praiseForm.signatureRegistrar'), data.assinaturaColaborador],
        [t('operationalForms.praiseForm.signatureSupervisor'), data.assinaturaSupervisor],
      ],
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    doc.setFontSize(8);
    doc.text(`${t('operationalForms.pdf.generatedAt')}: ${timestamp}`, 10, doc.internal.pageSize.height - 10);
    doc.save(`${t('operationalForms.praise')}_${data.elogioNome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const generateFailurePDF = (data: typeof failureData) => {
    const doc = new jsPDF();
    const timestamp = new Date().toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US', { hour12: false });

    doc.setFontSize(18);
    doc.text(t('operationalForms.failureForm.title'), 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(t('operationalForms.subtitle'), 105, 28, { align: 'center' });

    autoTable(doc, {
      startY: 40,
      head: [[t('operationalForms.pdf.field'), t('operationalForms.pdf.info')]],
      body: [
        [t('operationalForms.failureForm.section1'), ''],
        [t('operationalForms.failureForm.namePlaceholder'), data.colaboradorNome],
        [t('operationalForms.failureForm.matriculaPlaceholder'), data.colaboradorMatricula],
        [t('operationalForms.failureForm.deptPlaceholder'), data.colaboradorDepartamento],
        [t('operationalForms.failureForm.rolePlaceholder'), data.colaboradorFuncao],
        [t('operationalForms.failureForm.section2'), `${data.dataOcorrencia} ${data.horaOcorrencia}`],
        [t('operationalForms.failureForm.section3'), data.localOcorrencia],
        [t('operationalForms.failureForm.section4'), data.descricaoFalha],
        [t('operationalForms.failureForm.section5'), data.causasProvaveis.join(', ') + (data.outraCausa ? ` - ${data.outraCausa}` : '')],
        [t('operationalForms.failureForm.section6'), data.consequenciasObservadas],
        [t('operationalForms.failureForm.section7'), data.acoesCorretivas],
        [t('operationalForms.failureForm.section8'), data.medidasPreventivas],
        [t('operationalForms.failureForm.section9'), ''],
        [t('operationalForms.failureForm.signatureRegistrar'), data.responsavelRegisto],
        [t('operationalForms.failureForm.signatureSupervisor'), data.supervisorGestor],
      ],
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
    });

    doc.setFontSize(8);
    doc.text(`${t('operationalForms.pdf.generatedAt')}: ${timestamp}`, 10, doc.internal.pageSize.height - 10);
    doc.save(`${t('operationalForms.failure')}_${data.colaboradorNome.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  };

  const handlePraiseChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPraiseData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'elogioNome' || name === 'quemElogiaNome' || name === 'elogioMatricula' || name === 'quemElogiaMatricula') {
      setSearchTerm(value);
      setShowSuggestions({ field: name, visible: value.length > 1 });
      
      // Auto-fill if exact matrícula match
      if (name === 'elogioMatricula' || name === 'quemElogiaMatricula') {
        const exactMatch = employees.find(emp => emp.matricula === value);
        if (exactMatch) {
          selectEmployee(exactMatch, name === 'elogioMatricula' ? 'elogioNome' : 'quemElogiaNome');
        }
      }
    }
  };

  const selectEmployee = (emp: Employee, field: string) => {
    if (field === 'elogioNome') {
      setPraiseData(prev => ({
        ...prev,
        elogioNome: emp.nome,
        elogioMatricula: emp.matricula,
        elogioDepartamento: emp.equipe,
        elogioFuncao: emp.funcao
      }));
    } else if (field === 'quemElogiaNome') {
      setPraiseData(prev => ({
        ...prev,
        quemElogiaNome: emp.nome,
        quemElogiaMatricula: emp.matricula,
        quemElogiaDepartamento: emp.equipe,
        quemElogiaFuncao: emp.funcao
      }));
    } else if (field === 'colaboradorNome') {
      setFailureData(prev => ({
        ...prev,
        colaboradorNome: emp.nome,
        colaboradorMatricula: emp.matricula,
        colaboradorDepartamento: emp.equipe,
        colaboradorFuncao: emp.funcao
      }));
    }
    setShowSuggestions({ field: '', visible: false });

    // Auto-detect team if it matches Turma type
    if (emp.equipe && (['A', 'B', 'C', 'D', 'ADM'] as string[]).includes(emp.equipe.toUpperCase())) {
       setDetectedScale(prev => ({ ...prev, turma: emp.equipe.toUpperCase() as Turma }));
    }
  };

  const handleFailureChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFailureData(prev => ({ ...prev, [name]: value }));

    if (name === 'colaboradorNome' || name === 'colaboradorMatricula') {
      setSearchTerm(value);
      setShowSuggestions({ field: name, visible: value.length > 1 });

      // Auto-fill if exact matrícula match
      if (name === 'colaboradorMatricula') {
        const exactMatch = employees.find(emp => emp.matricula === value);
        if (exactMatch) {
          selectEmployee(exactMatch, 'colaboradorNome');
        }
      }
    }
  };

  const handleFailureCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFailureData(prev => ({
      ...prev,
      causasProvaveis: checked
        ? [...prev.causasProvaveis, value]
        : prev.causasProvaveis.filter(causa => causa !== value),
    }));
  };

  const handlePraiseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventDate = praiseData.dataElogio ? new Date(praiseData.dataElogio) : new Date();
    // Se for a data de hoje, usamos o horário atual. Se for outra data, mantemos 12:00.
    const todayStr = new Date().toISOString().split('T')[0];
    if (praiseData.dataElogio === todayStr) {
      const now = new Date();
      eventDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    } else if (praiseData.dataElogio) {
      eventDate.setHours(12, 0, 0, 0);
    }

    const event: OperationalEvent = {
      id: `elogio-${Date.now()}`,
      timestamp: eventDate.getTime(),
      type: 'elogio',
      collaboratorName: praiseData.elogioNome,
      collaboratorMatricula: praiseData.elogioMatricula,
      collaboratorTeam: praiseData.elogioDepartamento,
      collaboratorRole: praiseData.elogioFuncao,
      authorName: praiseData.quemElogiaNome,
      authorMatricula: praiseData.quemElogiaMatricula,
      description: praiseData.motivoElogio,
      details: praiseData,
      synced: false
    };

    onSaveOperationalEvent(event);
    generatePraisePDF(praiseData);
    
    alert(t('operationalForms.praiseForm.successMessage'));
    navigate(-1);
  };

  const handleFailureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventDate = failureData.dataOcorrencia 
      ? new Date(`${failureData.dataOcorrencia}T${failureData.horaOcorrencia || '12:00'}`) 
      : new Date();

    const event: OperationalEvent = {
      id: `falha-${Date.now()}`,
      timestamp: eventDate.getTime(),
      type: 'falha',
      collaboratorName: failureData.colaboradorNome,
      collaboratorMatricula: failureData.colaboradorMatricula,
      collaboratorTeam: failureData.colaboradorDepartamento,
      collaboratorRole: failureData.colaboradorFuncao,
      authorName: failureData.responsavelRegisto,
      authorMatricula: '', // Não temos matrícula do autor no form de falha original, mas podemos extrair se necessário
      description: failureData.descricaoFalha,
      details: failureData,
      synced: false
    };

    onSaveOperationalEvent(event);
    generateFailurePDF(failureData);
    
    alert(t('operationalForms.failureForm.successMessage'));
    navigate(-1);
  };

  const causasOptions = [
    { key: 'procedure', label: t('operationalForms.failureForm.causas.procedure') },
    { key: 'communication', label: t('operationalForms.failureForm.causas.communication') },
    { key: 'technical', label: t('operationalForms.failureForm.causas.technical') },
    { key: 'human', label: t('operationalForms.failureForm.causas.human') },
    { key: 'training', label: t('operationalForms.failureForm.causas.training') },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);





  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'ULTRAADMIN') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError(t('operationalForms.wrongPassword'));
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldAlert size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t('operationalForms.restrictedAccess')}</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{t('operationalForms.adminPasswordDescription')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('operationalForms.passwordPlaceholder')}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-center tracking-[0.5em] focus:border-blue-500 focus:bg-white transition-all shadow-inner"
              autoFocus
            />
            {error && <p className="text-red-500 text-[10px] font-black uppercase text-center animate-bounce">{error}</p>}
          </div>
          <button type="submit" className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg">
            {t('operationalForms.enterButton')}
          </button>
          <button type="button" onClick={() => navigate('/')} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 transition-colors">
            {t('operationalForms.backToHome')}
          </button>
        </form>
      </div>
    );
  }

  // Manual Pending State
  // const [pendingData, setPendingData] = useState({
  //   operator: '',
  //   area: Area.DFP2,
  //   tag: '',
  //   description: '',
  //   priority: 'media' as 'baixa' | 'media' | 'alta',
  //   discipline: 'OPERAÇÃO' as Discipline,
  // });



  const getCollaboratorStats = (matricula: string) => {
    const events = operationalEvents.filter(oe => oe.collaboratorMatricula === matricula);
    const praises = events.filter(e => e.type === 'elogio').length;
    const failures = events.filter(e => e.type === 'falha').length;
    const balance = failures - praises;
    
    return { praises, failures, balance, warning: balance >= 3 };
  };

  const StatsBadge = ({ matricula }: { matricula: string }) => {
    if (!matricula) return null;
    const stats = getCollaboratorStats(matricula);
    return (
      <div className="flex gap-2 mt-2">
        <div className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md text-[9px] font-black uppercase border border-emerald-100">
          {stats.praises} {t('operationalForms.praisesCount')}
        </div>
        <div className="bg-red-50 text-red-600 px-2 py-1 rounded-md text-[9px] font-black uppercase border border-red-100">
          {stats.failures} {t('operationalForms.failuresCount')}
        </div>
        {stats.warning && (
          <div className="bg-amber-500 text-white px-2 py-1 rounded-md text-[9px] font-black uppercase animate-pulse">
            {t('operationalForms.warningRisk')}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeftIcon size={16} /> {t('operationalForms.back')}</button>
          <button 
            onClick={() => navigate('/performance-history')} 
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-800 transition-all shadow-lg"
          >
            <Award size={14} /> {t('operationalForms.viewHistory')}
          </button>
        </div>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('operationalForms.title')}</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">{t('operationalForms.subtitle')}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex bg-slate-100 p-1.5 rounded-[2rem] border-2 border-slate-200 shadow-inner">
        <button 
          onClick={() => setActiveTab('praise')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all ${activeTab === 'praise' ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Award size={20} /> {t('operationalForms.praise')}
        </button>
        <button 
          onClick={() => setActiveTab('failure')}
          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.5rem] font-black uppercase tracking-widest transition-all ${activeTab === 'failure' ? 'bg-white text-red-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Zap size={20} /> {t('operationalForms.failure')}
        </button>
      </div>

      {activeTab === 'praise' && (
        <form onSubmit={handlePraiseSubmit} className="space-y-8 pb-12">
          {/* Dados do Colaborador Elogiado */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-blue-500" /> {t('operationalForms.praiseForm.section1')}</h2>
            <div className="relative">
              <input type="text" name="elogioNome" placeholder={t('operationalForms.praiseForm.namePlaceholder')} value={praiseData.elogioNome || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required autoComplete="off" />
              <StatsBadge matricula={praiseData.elogioMatricula} />
              {showSuggestions.visible && showSuggestions.field === 'elogioNome' && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp, 'elogioNome')} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.matricula} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <input type="text" name="elogioMatricula" placeholder={t('operationalForms.praiseForm.matriculaPlaceholder')} value={praiseData.elogioMatricula || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required autoComplete="off" />
              {showSuggestions.visible && showSuggestions.field === 'elogioMatricula' && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.matricula.includes(searchTerm)).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp, 'elogioNome')} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.matricula}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.nome} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="text" name="elogioDepartamento" placeholder={t('operationalForms.praiseForm.deptPlaceholder')} value={praiseData.elogioDepartamento || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="elogioFuncao" placeholder={t('operationalForms.praiseForm.rolePlaceholder')} value={praiseData.elogioFuncao || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Dados de Quem Elogia */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-blue-500" /> {t('operationalForms.praiseForm.section2')}</h2>
            <div className="relative">
              <input type="text" name="quemElogiaNome" placeholder={t('operationalForms.praiseForm.namePlaceholder')} value={praiseData.quemElogiaNome || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required autoComplete="off" />
              {showSuggestions.visible && showSuggestions.field === 'quemElogiaNome' && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp, 'quemElogiaNome')} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.matricula} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <input type="text" name="quemElogiaMatricula" placeholder={t('operationalForms.praiseForm.matriculaPlaceholder')} value={praiseData.quemElogiaMatricula || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required autoComplete="off" />
              {showSuggestions.visible && showSuggestions.field === 'quemElogiaMatricula' && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.matricula.includes(searchTerm)).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp, 'quemElogiaNome')} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.matricula}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.nome} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="text" name="quemElogiaDepartamento" placeholder={t('operationalForms.praiseForm.deptRolePlaceholder')} value={praiseData.quemElogiaDepartamento || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="quemElogiaFuncao" placeholder={t('operationalForms.praiseForm.rolePlaceholder')} value={praiseData.quemElogiaFuncao || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Data do Elogio */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CalendarIcon size={16} className="text-blue-500" /> {t('operationalForms.praiseForm.section3')}</h2>
            <input type="date" name="dataElogio" value={praiseData.dataElogio || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Motivo do Elogio */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquareIcon size={16} className="text-blue-500" /> {t('operationalForms.praiseForm.section4')}</h2>
            <textarea name="motivoElogio" placeholder={t('operationalForms.praiseForm.reasonPlaceholder')} value={praiseData.motivoElogio || ''} onChange={handlePraiseChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Impacto da Ação Elogiada */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircleIcon size={16} className="text-blue-500" /> {t('operationalForms.praiseForm.section5')}</h2>
            <textarea name="impactoElogio" placeholder={t('operationalForms.praiseForm.impactPlaceholder')} value={praiseData.impactoElogio || ''} onChange={handlePraiseChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Assinaturas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><SignatureIcon size={16} className="text-blue-500" /> {t('operationalForms.praiseForm.section6')}</h2>
            <input type="text" name="assinaturaColaborador" placeholder={t('operationalForms.praiseForm.signatureRegistrar')} value={praiseData.assinaturaColaborador || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="assinaturaSupervisor" placeholder={t('operationalForms.praiseForm.signatureSupervisor')} value={praiseData.assinaturaSupervisor || ''} onChange={handlePraiseChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          <button type="submit" className="w-full py-6 rounded-[2rem] bg-emerald-600 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 text-sm">
            <Award size={20} /> {t('operationalForms.praiseForm.submitButton')}
          </button>
        </form>
      )}

      {activeTab === 'failure' && (
        <form onSubmit={handleFailureSubmit} className="space-y-8 pb-12">
          {/* Dados do Colaborador Envolvido */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section1')}</h2>
            <div className="relative">
              <input type="text" name="colaboradorNome" placeholder={t('operationalForms.failureForm.namePlaceholder')} value={failureData.colaboradorNome || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required autoComplete="off" />
              <StatsBadge matricula={failureData.colaboradorMatricula} />
              {showSuggestions.visible && showSuggestions.field === 'colaboradorNome' && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp, 'colaboradorNome')} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.nome}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.matricula} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <input type="text" name="colaboradorMatricula" placeholder={t('operationalForms.failureForm.matriculaPlaceholder')} value={failureData.colaboradorMatricula || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required autoComplete="off" />
              {showSuggestions.visible && showSuggestions.field === 'colaboradorMatricula' && (
                <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto">
                  {employees.filter(e => e.matricula.includes(searchTerm)).map(emp => (
                    <button key={emp.matricula + emp.nome} type="button" onClick={() => selectEmployee(emp, 'colaboradorNome')} className="w-full text-left px-6 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex flex-col">
                      <span className="font-black text-slate-900 text-xs uppercase">{emp.matricula}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{emp.nome} | {emp.funcao} | {emp.equipe}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input type="text" name="colaboradorDepartamento" placeholder={t('operationalForms.failureForm.deptPlaceholder')} value={failureData.colaboradorDepartamento || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="colaboradorFuncao" placeholder={t('operationalForms.failureForm.rolePlaceholder')} value={failureData.colaboradorFuncao || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Data e Hora da Ocorrência */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CalendarIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section2')}</h2>
            <input type="date" name="dataOcorrencia" value={failureData.dataOcorrencia || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="time" name="horaOcorrencia" value={failureData.horaOcorrencia || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Local da Ocorrência */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MapPinIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section3')}</h2>
            <input type="text" name="localOcorrencia" placeholder={t('operationalForms.failureForm.locationPlaceholder')} value={failureData.localOcorrencia || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          {/* Descrição da Falha Operacional */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquareIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section4')}</h2>
            <textarea name="descricaoFalha" placeholder={t('operationalForms.failureForm.descriptionPlaceholder')} value={failureData.descricaoFalha || ''} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Causas Prováveis */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><AlertTriangleIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section5')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {causasOptions.map(causa => (
                <label key={causa.key} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" value={causa.label} checked={failureData.causasProvaveis.includes(causa.label)} onChange={handleFailureCheckboxChange} className="form-checkbox h-5 w-5 text-red-600 rounded" />
                  {causa.label}
                </label>
              ))}
              <input type="text" name="outraCausa" placeholder={t('operationalForms.failureForm.otherCausaPlaceholder')} value={failureData.outraCausa || ''} onChange={handleFailureChange} className="w-full px-4 py-2 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" />
            </div>
          </div>

          {/* Consequências Observadas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><MessageSquareIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section6')}</h2>
            <textarea name="consequenciasObservadas" placeholder={t('operationalForms.failureForm.consequencesPlaceholder')} value={failureData.consequenciasObservadas || ''} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Ações Corretivas Imediatas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><CheckCircleIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section7')}</h2>
            <textarea name="acoesCorretivas" placeholder={t('operationalForms.failureForm.correctivePlaceholder')} value={failureData.acoesCorretivas || ''} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Medidas Preventivas Recomendadas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><AlertTriangleIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section8')}</h2>
            <textarea name="medidasPreventivas" placeholder={t('operationalForms.failureForm.preventivePlaceholder')} value={failureData.medidasPreventivas || ''} onChange={handleFailureChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-red-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          {/* Assinaturas */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><SignatureIcon size={16} className="text-red-500" /> {t('operationalForms.failureForm.section9')}</h2>
            <input type="text" name="responsavelRegisto" placeholder={t('operationalForms.failureForm.signatureRegistrar')} value={failureData.responsavelRegisto || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
            <input type="text" name="supervisorGestor" placeholder={t('operationalForms.failureForm.signatureSupervisor')} value={failureData.supervisorGestor || ''} onChange={handleFailureChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-red-500 focus:bg-white transition-all shadow-inner" required />
          </div>

          <button type="submit" className="w-full py-6 rounded-[2rem] bg-red-600 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-red-700 transition-all active:scale-95 text-sm">
            <Zap size={20} /> {t('operationalForms.failureForm.submitButton')}
          </button>
        </form>
      )}


    </div>
  );
};

export default OperationalForms;
