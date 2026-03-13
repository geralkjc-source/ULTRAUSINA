import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft as ArrowLeftIcon, 
  MapPin as MapPinIcon, 
  AlertTriangle as AlertTriangleIcon,
  Award,
  FlaskConical,
  Activity,
  Percent,
  UserCog,
  Droplets,
  Columns
} from 'lucide-react';
import { Turma, Turno, QualityReport, QualityCategory } from '../types';
import { getCurrentShiftInfo } from '../services/shiftService';
import { fetchEmployees, Employee } from '../services/employeeService';
import { formatQualityReportForWhatsApp, copyToClipboard } from '../services/whatsappShare';

interface DFPResultsProps {
  onSaveQualityReport: (report: QualityReport) => void;
  qualityReports: QualityReport[];
}

const DFPResults: React.FC<DFPResultsProps> = ({ onSaveQualityReport, qualityReports }) => {
  const navigate = useNavigate();
  const [detectedScale, setDetectedScale] = useState<{ turma: Turma; turno: Turno }>(getCurrentShiftInfo());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<QualityCategory | null>(null);

  useEffect(() => {
    const loadEmployees = async () => {
      const data = await fetchEmployees();
      setEmployees(data);
    };
    loadEmployees();
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    operator: '',
    ply: '',
    timestamp: new Date().toISOString().split('T')[0],
    turno: detectedScale.turno,
    dfp2_c_yield: '',
    dfp2_c_cr: '',
    dfp2_c_reject_ash: '',
    dfp2_c_conc_ash: '',
    dfp2_c_colector: '',
    dfp2_c_frother: '',
    dfp2_d_yield: '',
    dfp2_d_cr: '',
    dfp2_d_reject_ash: '',
    dfp2_d_conc_ash: '',
    dfp2_d_colector: '',
    dfp2_d_frother: '',
    colunas_d_yield: '',
    colunas_d_cr: '',
    colunas_d_reject_ash: '',
    colunas_d_conc_ash: '',
    colunas_d_colector: '',
    colunas_d_frother: '',
    humidade_fundo: '',
    humidade_oversize: '',
    humidade_concentrado: '',
    generalObservations: ''
  });

  // ================= VALIDATION LOGIC =================
  const verificarDFP2 = (d: any) => {
    if (!d.yield && !d.rejectAsh && !d.concAsh) return [];
    let alertas = [];
    const yld = parseFloat(d.yield || '0');
    const ra = parseFloat(d.rejectAsh || '0');
    const ca = parseFloat(d.concAsh || '0');

    if (yld < 40) alertas.push("🔴 Yield baixo");
    if (ra < 30) alertas.push("🔴 Perda de carvão no rejeito");
    if (ca > 10) alertas.push("🔴 Cinza alta no concentrado");

    return alertas.length ? alertas : ["🟢 DFP2 Normal"];
  };

  const verificarColunaD = (d: any) => {
    if (!d.productAsh && !d.yield && !d.tailAsh) return [];
    let alertas = [];
    const pa = parseFloat(d.productAsh || '0');
    const yld = parseFloat(d.yield || '0');
    const ta = parseFloat(d.tailAsh || '0');

    if (pa > 10) alertas.push("🔴 Produto fora de especificação");
    if (yld < 40) alertas.push("🔴 Yield baixo");
    if (ta < 45) alertas.push("🔴 Carvão no tail");

    return alertas.length ? alertas : ["🟢 Coluna D Normal"];
  };

  const verificarHumidade = (tmStr: string | number) => {
    if (!tmStr) return [];
    const TM = parseFloat(tmStr as string || '0');
    if (isNaN(TM)) return [];

    if (TM > 13.0) return ["🔴 Humidade Alta"];
    if (TM < 12.0) return ["🔵 Produto muito seco"];

    return ["🟢 Humidade Normal"];
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'operator') {
      setSearchTerm(value);
      setShowSuggestions(value.length > 1);
    }
  };

  const selectEmployee = (emp: Employee) => {
    setFormData(prev => ({ ...prev, operator: emp.nome.toUpperCase() }));
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCategory) return;
    
    const reportDate = formData.timestamp ? new Date(formData.timestamp) : new Date();
    // Se for a data de hoje, usamos o horário atual. Se for outra data, mantemos 12:00 para evitar problemas de fuso.
    const todayStr = new Date().toISOString().split('T')[0];
    if (formData.timestamp === todayStr) {
      const now = new Date();
      reportDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    } else if (formData.timestamp) {
      reportDate.setHours(12, 0, 0, 0);
    }
    const timestamp = reportDate.getTime();

    const baseReport = {
      id: `qual-${Date.now()}`,
      timestamp: timestamp,
      operator: formData.operator,
      turma: detectedScale.turma,
      turno: detectedScale.turno,
      generalObservations: formData.generalObservations
    };

    const parseValue = (val: string) => parseFloat(val.replace(',', '.') || '0');

    const reportsToSave: QualityReport[] = [];

    if (selectedCategory === 'DFP2') {
      if (formData.dfp2_c_yield || formData.dfp2_c_cr || formData.dfp2_c_reject_ash || formData.dfp2_c_conc_ash) {
        reportsToSave.push({
          ...baseReport,
          id: `qual-c-${Date.now()}`,
          category: 'DFP2_C',
          dfp2_c_yield: parseValue(formData.dfp2_c_yield),
          dfp2_c_cr: parseValue(formData.dfp2_c_cr),
          dfp2_c_reject_ash: parseValue(formData.dfp2_c_reject_ash),
          dfp2_c_conc_ash: parseValue(formData.dfp2_c_conc_ash),
          dfp2_c_colector: parseValue(formData.dfp2_c_colector),
          dfp2_c_frother: parseValue(formData.dfp2_c_frother),
        } as QualityReport);
      }
      if (formData.dfp2_d_yield || formData.dfp2_d_cr || formData.dfp2_d_reject_ash || formData.dfp2_d_conc_ash || formData.dfp2_d_colector || formData.dfp2_d_frother) {
        reportsToSave.push({
          ...baseReport,
          id: `qual-d-${Date.now() + 1}`,
          category: 'DFP2_D',
          dfp2_d_yield: parseValue(formData.dfp2_d_yield),
          dfp2_d_cr: parseValue(formData.dfp2_d_cr),
          dfp2_d_reject_ash: parseValue(formData.dfp2_d_reject_ash),
          dfp2_d_conc_ash: parseValue(formData.dfp2_d_conc_ash),
          dfp2_d_colector: parseValue(formData.dfp2_d_colector),
          dfp2_d_frother: parseValue(formData.dfp2_d_frother),
        } as QualityReport);
      }
    } else if (selectedCategory === 'COLUNAS_D') {
      reportsToSave.push({
        ...baseReport,
        category: 'COLUNAS_D',
        colunas_d_yield: parseValue(formData.colunas_d_yield),
        colunas_d_cr: parseValue(formData.colunas_d_cr),
        colunas_d_reject_ash: parseValue(formData.colunas_d_reject_ash),
        colunas_d_conc_ash: parseValue(formData.colunas_d_conc_ash),
        colunas_d_colector: parseValue(formData.colunas_d_colector),
        colunas_d_frother: parseValue(formData.colunas_d_frother),
      } as QualityReport);
    } else if (selectedCategory === 'HUMIDADE_PLY') {
      reportsToSave.push({
        ...baseReport,
        category: 'HUMIDADE_PLY',
        ply: formData.ply,
        humidade_fundo: parseValue(formData.humidade_fundo),
        humidade_oversize: parseValue(formData.humidade_oversize),
        humidade_concentrado: parseValue(formData.humidade_concentrado),
      } as QualityReport);
    }

    reportsToSave.forEach(report => onSaveQualityReport(report));
    
    const text = reportsToSave.map(formatQualityReportForWhatsApp).join('\n\n');
    copyToClipboard(text).then(success => {
      if (success) {
        alert('Registrado e Texto Copiado para o WhatsApp!');
      } else {
        alert('Registrado, mas falha ao copiar texto.');
      }
    });

    setSelectedCategory(null);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setDetectedScale(getCurrentShiftInfo());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const categories: { id: QualityCategory; label: string; icon: any; color: string }[] = [
    { id: 'DFP2', label: 'DFP2 - PLANTAS C/D', icon: Activity, color: 'text-blue-500' },
    { id: 'COLUNAS_D', label: 'COLUNAS D', icon: Columns, color: 'text-indigo-500' },
    { id: 'HUMIDADE_PLY', label: 'HUMIDADE E PLY', icon: Droplets, color: 'text-cyan-500' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors"><ArrowLeftIcon size={16} /> Voltar</button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Qualidade e Yield</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Plataforma Ultrafino Usina 2</p>
        </div>
      </div>

      {!selectedCategory ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(cat => {
              const lastEntry = [...qualityReports]
                .filter(qr => qr.category === cat.id)
                .sort((a, b) => b.timestamp - a.timestamp)[0];

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm hover:border-slate-300 transition-all flex flex-col items-center gap-4 group relative overflow-hidden"
                >
                  <cat.icon size={40} className={`${cat.color} group-hover:scale-110 transition-transform`} />
                  <div className="text-center">
                    <span className="text-sm font-black text-slate-900 uppercase tracking-widest block">{cat.label}</span>
                    {lastEntry && (
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-1 block">
                        Último: {new Date(lastEntry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {!lastEntry && (
                    <div className="absolute top-4 right-4">
                      <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Pendente" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {qualityReports.length > 0 && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
              <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={16} className="text-slate-400" /> Registros Recentes (Hoje)
              </h2>
              <div className="space-y-3">
                {[...qualityReports]
                  .filter(qr => {
                    const reportDate = new Date(qr.timestamp).toDateString();
                    const today = new Date().toDateString();
                    return reportDate === today;
                  })
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .slice(0, 5)
                  .map(qr => {
                    const category = categories.find(c => c.id === qr.category);
                    const Icon = category?.icon;
                    return (
                      <div key={qr.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className={`p-2 rounded-xl bg-white shadow-sm`}>
                            {Icon && <Icon size={16} className={category?.color} />}
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">
                              {category?.label || 'Categoria Desconhecida'}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">
                              {qr.operator} • {new Date(qr.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const text = formatQualityReportForWhatsApp(qr);
                              copyToClipboard(text).then(success => {
                                if (success) alert('Texto copiado para o WhatsApp!');
                              });
                            }}
                            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                            title="Copiar para WhatsApp"
                          >
                            <Activity size={14} />
                          </button>
                          {qr.synced ? (
                            <span className="text-[8px] font-black text-emerald-500 uppercase bg-emerald-50 px-2 py-1 rounded-full">Sincronizado</span>
                          ) : (
                            <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-50 px-2 py-1 rounded-full">Pendente Sinc.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 pb-12">
          <button 
            type="button" 
            onClick={() => setSelectedCategory(null)}
            className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 flex items-center gap-2"
          >
            <ArrowLeftIcon size={12} /> Trocar Área
          </button>

          {/* DFP2 PLANTS C & D SECTION */}
          {selectedCategory === 'DFP2' && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={16} className="text-blue-500" /> DFP2 - PLANTA C
                  </h2>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {verificarDFP2({yield: formData.dfp2_c_yield, rejectAsh: formData.dfp2_c_reject_ash, concAsh: formData.dfp2_c_conc_ash}).map((a, i) => (
                      <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Yield (%)', field: 'yield' },
                    { label: 'CR (%)', field: 'cr' },
                    { label: 'Reject Ash (%)', field: 'reject_ash' },
                    { label: 'Conc Ash (%)', field: 'conc_ash' },
                    { label: 'Colector (m³/h)', field: 'colector' },
                    { label: 'Frother (m³/h)', field: 'frother' },
                  ].map(item => (
                    <div key={item.field} className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{item.label}</label>
                      <input 
                        type="number" step="0.01" 
                        value={(formData as any)[`dfp2_c_${item.field}`] || ''} 
                        onChange={(e) => handleInputChange(`dfp2_c_${item.field}`, e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={16} className="text-blue-600" /> DFP2 - PLANTA D
                  </h2>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {verificarDFP2({yield: formData.dfp2_d_yield, rejectAsh: formData.dfp2_d_reject_ash, concAsh: formData.dfp2_d_conc_ash}).map((a, i) => (
                      <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Yield (%)', field: 'yield' },
                    { label: 'CR (%)', field: 'cr' },
                    { label: 'Reject Ash (%)', field: 'reject_ash' },
                    { label: 'Conc Ash (%)', field: 'conc_ash' },
                    { label: 'Colector (m³/h)', field: 'colector' },
                    { label: 'Frother (m³/h)', field: 'frother' },
                  ].map(item => (
                    <div key={item.field} className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{item.label}</label>
                      <input 
                        type="number" step="0.01" 
                        value={(formData as any)[`dfp2_d_${item.field}`] || ''} 
                        onChange={(e) => handleInputChange(`dfp2_d_${item.field}`, e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-blue-600 focus:bg-white transition-all shadow-inner"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COLUNA D SECTION */}
          {selectedCategory === 'COLUNAS_D' && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Columns size={16} className="text-indigo-500" /> COLUNAS D
                </h2>
                <div className="flex flex-wrap gap-2 justify-end">
                  {verificarColunaD({productAsh: formData.colunas_d_conc_ash, yield: formData.colunas_d_yield, tailAsh: formData.colunas_d_reject_ash}).map((a, i) => (
                    <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Product Ash (%)', field: 'conc_ash' },
                  { label: 'Yield (%)', field: 'yield' },
                  { label: 'CR (%)', field: 'cr' },
                  { label: 'Tail Ash (%)', field: 'reject_ash' },
                  { label: 'Colector (m³/h)', field: 'colector' },
                  { label: 'Frother (m³/h)', field: 'frother' },
                ].map(item => (
                  <div key={item.field} className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2">{item.label}</label>
                    <input 
                      type="number" step="0.01" 
                      value={(formData as any)[`colunas_d_${item.field}`] || ''} 
                      onChange={(e) => handleInputChange(`colunas_d_${item.field}`, e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
                      placeholder="0.00"
                      required
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* HUMIDADE HBF & PLY SECTION */}
          {selectedCategory === 'HUMIDADE_PLY' && (
            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Droplets size={16} className="text-cyan-500" /> HUMIDADE E PLY
                </h2>
                <div className="flex flex-wrap gap-2 justify-end">
                  {verificarHumidade(formData.humidade_fundo).map((a, i) => (
                    <span key={i} className="text-[9px] font-black px-2 py-1 rounded-full bg-slate-100 text-slate-600 uppercase tracking-tighter">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">TM (%)</label>
                  <input 
                    type="number" step="0.01" 
                    value={formData.humidade_fundo || ''} 
                    onChange={(e) => handleInputChange('humidade_fundo', e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-cyan-500 focus:bg-white transition-all shadow-inner"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2">PLY</label>
                  <input 
                    type="text" 
                    value={formData.ply || ''} 
                    onChange={(e) => handleInputChange('ply', e.target.value)}
                    placeholder="EX: BTA1" 
                    className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none font-black text-sm focus:border-cyan-500 focus:bg-white transition-all shadow-inner" 
                    required 
                  />
                </div>
              </div>
            </div>
          )}

          {/* Identificação */}
          <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-6">
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2"><UserCog size={16} className="text-slate-500" /> Identificação</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.operator || ''} 
                  onChange={(e) => handleInputChange('operator', e.target.value)}
                  placeholder="NOME DO OPERADOR" 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                  required 
                  autoComplete="off"
                />
                {showSuggestions && (
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
              <input 
                type="date" 
                value={formData.timestamp || ''} 
                onChange={(e) => handleInputChange('timestamp', e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black uppercase text-sm focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                required 
              />
            </div>
          </div>

          <div className="flex justify-center">
            <button 
              type="submit"
              className="w-full max-w-md py-6 rounded-[2rem] bg-emerald-600 text-white font-black uppercase tracking-[0.3em] flex items-center justify-center gap-4 shadow-2xl hover:bg-emerald-700 transition-all active:scale-95 text-sm"
            >
              <Activity size={20} /> REGISTRAR E COPIAR TEXTO
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default DFPResults;
