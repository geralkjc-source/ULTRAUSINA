import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft as ArrowLeftIcon, 
  User as UserIcon, 
  Clock as ClockIcon, 
  AlertTriangle as AlertTriangleIcon,
  Zap,
  ClipboardList,
  ShieldAlert,
  Wrench,
  Cpu,
  UserCog,
  Search
} from 'lucide-react';
import { Area, Turma, Turno, Discipline, PendingItem } from '../types';
import { getCurrentShiftInfo } from '../services/shiftService';
import { CHECKLIST_TEMPLATES } from '../constants';
import { fetchEmployees, Employee } from '../services/employeeService';

interface ManualPendingFormProps {
  onAddManualPending: (pending: PendingItem) => void;
}

const ManualPendingForm: React.FC<ManualPendingFormProps> = ({ onAddManualPending }) => {
  const navigate = useNavigate();
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showOperatorSuggestions, setShowOperatorSuggestions] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();

    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const [pendingData, setPendingData] = useState({
    operator: '',
    area: Area.DFP2,
    tag: '',
    description: '',
    priority: 'media' as 'baixa' | 'media' | 'alta',
    discipline: 'OPERAÇÃO' as Discipline,
  });

  const getAvailableTags = () => {
    const templates = CHECKLIST_TEMPLATES[pendingData.area] || [];
    return templates.filter(item => !item.startsWith('SECTION:'));
  };

  const filteredTags = getAvailableTags().filter(tag => 
    tag.toLowerCase().includes(pendingData.tag.toLowerCase())
  );

  const filteredEmployees = employees.filter(emp => 
    emp.nome.toLowerCase().includes(pendingData.operator.toLowerCase())
  );

  const handlePendingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPendingData(prev => ({ ...prev, [name]: value }));
    if (name === 'tag') setShowSuggestions(true);
    if (name === 'operator') setShowOperatorSuggestions(true);
  };

  const handlePendingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newPending: PendingItem = {
      id: `pend-manual-${Date.now()}`,
      tag: pendingData.tag.toUpperCase(),
      description: pendingData.description.toUpperCase(),
      priority: pendingData.priority,
      discipline: pendingData.discipline,
      status: 'aberto',
      area: pendingData.area,
      timestamp: Date.now(),
      operator: pendingData.operator.toUpperCase(),
      turma: detectedScale.turma,
      turno: detectedScale.turno,
      synced: false
    };

    onAddManualPending(newPending);
    alert('Pendência Registrada com Sucesso!');
    navigate('/pending');
  };

  const getShiftColor = (turno: Turno) => {
    if (turno === 'MANHÃ') return 'bg-blue-600';
    if (turno === 'TARDE') return 'bg-orange-500';
    if (turno === 'NOITE') return 'bg-indigo-700';
    return 'bg-slate-900';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeftIcon size={16} /> Voltar</button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Registro de Pendência</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Plataforma Ultrafino Usina 2</p>
        </div>
      </div>

      <form onSubmit={handlePendingSubmit} className="space-y-8 pb-12">
        {/* Identificação */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserIcon size={16} className="text-blue-500" /> Identificação</h2>
          <div className="relative">
            <input 
              type="text" 
              name="operator" 
              placeholder="Seu Nome" 
              value={pendingData.operator || ''} 
              onChange={handlePendingChange} 
              onFocus={() => setShowOperatorSuggestions(true)}
              className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
              required 
            />
            {showOperatorSuggestions && pendingData.operator && filteredEmployees.length > 0 && (
              <div className="absolute z-20 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                {filteredEmployees.map(emp => (
                  <button 
                    key={emp.matricula} 
                    type="button" 
                    onClick={() => { 
                      setPendingData(prev => ({ ...prev, operator: emp.nome })); 
                      setShowOperatorSuggestions(false); 
                    }} 
                    className="w-full text-left px-6 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <div className="text-[10px] font-black uppercase text-slate-700">{emp.nome}</div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{emp.funcao} • {emp.equipe}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* PAINEL DE ESCALA AUTOMÁTICA */}
          <div className="space-y-3 pt-4">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
               Escala Vigente (Auto)
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
          </div>
        </div>

        {/* Detalhes da Pendência */}
        <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><AlertTriangleIcon size={16} className="text-blue-500" /> Detalhes da Pendência</h2>
          
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Área</label>
            <select name="area" value={pendingData.area} onChange={handlePendingChange} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner">
              {Object.values(Area).map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2 relative">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">TAG / Ativo</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" name="tag" placeholder="Ex: 06C-VP-101" value={pendingData.tag || ''} onChange={handlePendingChange} onFocus={() => setShowSuggestions(true)} className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" required />
            </div>
            {showSuggestions && pendingData.tag && filteredTags.length > 0 && (
              <div className="absolute z-10 w-full bg-white border-2 border-slate-100 rounded-2xl shadow-xl mt-1 max-h-48 overflow-y-auto">
                {filteredTags.map(tag => (
                  <button key={tag} type="button" onClick={() => { setPendingData(prev => ({ ...prev, tag })); setShowSuggestions(false); }} className="w-full text-left px-6 py-3 hover:bg-blue-50 text-[10px] font-black uppercase text-slate-700 transition-colors">
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Descrição da Falha</label>
            <textarea name="description" placeholder="Descreva o problema com detalhes..." value={pendingData.description} onChange={handlePendingChange} className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] text-xs font-black uppercase outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" rows={4} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2"><ShieldAlert size={14} className="text-red-500" /> Prioridade</label>
              <div className="flex gap-2">
                {(['baixa', 'media', 'alta'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPendingData(prev => ({ ...prev, priority: p }))} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase border-2 transition-all ${pendingData.priority === p ? 'bg-slate-900 text-white border-transparent shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{p}</button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block flex items-center gap-2"><Wrench size={14} className="text-blue-500" /> Disciplina</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'MECÂNICA', icon: <Wrench size={12} /> },
                  { id: 'ELÉTRICA', icon: <Zap size={12} /> },
                  { id: 'INSTRUMENTAÇÃO', icon: <Cpu size={12} /> },
                  { id: 'OPERAÇÃO', icon: <UserCog size={12} /> }
                ].map(disc => (
                  <button key={disc.id} type="button" onClick={() => setPendingData(prev => ({ ...prev, discipline: disc.id as Discipline }))} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[8px] font-black uppercase border-2 transition-all ${pendingData.discipline === disc.id ? 'bg-blue-600 text-white border-transparent shadow-lg' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}>{disc.icon} {disc.id}</button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="w-full py-6 rounded-[2rem] bg-blue-600 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-blue-700 transition-all active:scale-95 text-sm">
          <ClipboardList size={20} /> REGISTRAR PENDÊNCIA
        </button>
      </form>
    </div>
  );
};

export default ManualPendingForm;
