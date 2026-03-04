
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  ChevronRight,
  Zap,
  Droplets,
  Settings2,
  Filter,
  Cloud,
  CloudOff,
  RefreshCw,
  RotateCw,
  Wifi,
  WifiOff,
  Calendar,
  Clock,
  Coffee,
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { Report, PendingItem, Area, Turma, QualityReport, OperationalEvent, QualityCategory } from '../types';
import { getScaleForDate, getStatusForTurma, getCurrentShiftInfo } from '../services/shiftService';

interface DashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
  qualityReports: QualityReport[];
  operationalEvents: OperationalEvent[];
  onRefreshCloud: () => Promise<void>;
  isRefreshing: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ reports, pendingItems, qualityReports, operationalEvents, onRefreshCloud, isRefreshing }) => {
  const navigate = useNavigate();
  const [todayScale, setTodayScale] = useState(getScaleForDate(new Date()));

  const unsyncedCount = 
    reports.filter(r => !r.synced).length + 
    pendingItems.filter(p => !p.synced).length +
    qualityReports.filter(qr => !qr.synced).length +
    operationalEvents.filter(oe => !oe.synced).length;
  
  const getAreaStats = (area: Area) => {
    const areaReports = reports.filter(r => r.area === area);
    const areaPending = pendingItems.filter(p => p.area === area && p.status === 'aberto');
    const hasFailures = areaPending.length > 0;
    
    return {
      lastReport: areaReports.length > 0 ? new Date(areaReports[0].timestamp).toLocaleDateString() : 'Sem registros',
      status: hasFailures ? `${areaPending.length} Pendências` : 'Operacional',
      hasFailures
    };
  };

  const AreaCard = ({ area, icon, description }: { area: Area, icon: React.ReactNode, description: string }) => {
    const stats = getAreaStats(area);
    const isCritical = stats.hasFailures;

    return (
      <div className="bg-white rounded-[2rem] border-2 border-slate-100 shadow-sm hover:border-blue-500 hover:shadow-xl transition-all flex flex-col h-full overflow-hidden group">
        {/* Parte Superior: Direciona para o Checklist */}
        <button 
          onClick={() => navigate(`/checklist/${encodeURIComponent(area)}`)}
          className="p-6 text-left flex-grow w-full focus:outline-none"
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${
            isCritical ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
          } group-hover:bg-blue-600 group-hover:text-white`}>
            {icon}
          </div>
          
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{area}</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 leading-relaxed">{description}</p>
        </button>
        
        {/* Parte Inferior: Direciona para Pendências Filtradas */}
        <button 
          onClick={() => navigate(`/pending?area=${encodeURIComponent(area)}`)}
          className={`px-6 py-4 border-t border-slate-50 flex items-center justify-between transition-colors ${
            isCritical ? 'bg-amber-50/50 hover:bg-amber-100/80' : 'hover:bg-slate-50'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Status Atual</span>
            <div className="flex items-center gap-1.5">
              {isCritical && <AlertCircle size={10} className="text-amber-600 animate-pulse" />}
              <span className={`text-[10px] font-black uppercase ${isCritical ? 'text-amber-600' : 'text-emerald-600'}`}>
                {stats.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase opacity-0 group-hover:opacity-100 transition-all">
            Ver Pendências <ChevronRight size={14} />
          </div>
        </button>
      </div>
    );
  };

  const getTurmaCardColor = (turma: Turma) => {
    switch (turma) {
      case 'A': return 'bg-yellow-400 text-slate-900 border-yellow-500';
      case 'B': return 'bg-orange-500 text-white border-orange-600';
      case 'C': return 'bg-emerald-500 text-white border-emerald-600';
      case 'D': return 'bg-sky-500 text-white border-sky-600';
      default: return 'bg-slate-900 text-white border-slate-900';
    }
  };

  const latestQuality = [...qualityReports].sort((a, b) => b.timestamp - a.timestamp)[0];

  const getQualityStatus = (report: QualityReport | undefined) => {
    if (!report) return { color: 'bg-slate-100', label: 'Sem dados', values: '-' };

    if (report.category === 'DFP2') {
      // Caso genérico ou fallback, mas agora usamos categorias específicas
      const vals = `YLD ${(report.dfp2_c_yield || 0).toFixed(1)}% | REJ ${(report.dfp2_c_reject_ash || 0).toFixed(1)}%`;
      return { color: 'bg-emerald-500', label: 'Normal', values: vals };
    }

    if (report.category === 'DFP2_C') {
      const yld = report.dfp2_c_yield || 0;
      const ra = report.dfp2_c_reject_ash || 0;
      const ca = report.dfp2_c_conc_ash || 0;
      const cr = report.dfp2_c_cr || 0;
      const vals = `📈 YLD ${yld.toFixed(1)}% | 📉 REJ ${ra.toFixed(1)}% | 💎 CONC ${ca.toFixed(1)}% | CR ${cr.toFixed(1)}%`;
      if (yld < 35 || ra < 30) return { color: 'bg-red-500', label: 'Alerta Crítico', values: vals };
      if (ca > 11) return { color: 'bg-amber-500', label: 'Atenção', values: vals };
      return { color: 'bg-emerald-500', label: 'Normal', values: vals };
    }

    if (report.category === 'DFP2_D') {
      const yld = report.dfp2_d_yield || 0;
      const ra = report.dfp2_d_reject_ash || 0;
      const ca = report.dfp2_d_conc_ash || 0;
      const cr = report.dfp2_d_cr || 0;
      const vals = `📈 YLD ${yld.toFixed(1)}% | 📉 REJ ${ra.toFixed(1)}% | 💎 CONC ${ca.toFixed(1)}% | CR ${cr.toFixed(1)}%`;
      if (yld < 35 || ra < 30) return { color: 'bg-red-500', label: 'Alerta Crítico', values: vals };
      if (ca > 11) return { color: 'bg-amber-500', label: 'Atenção', values: vals };
      return { color: 'bg-emerald-500', label: 'Normal', values: vals };
    }

    if (report.category === 'COLUNAS_D') {
      const pa = report.colunas_d_conc_ash || 0;
      const yld = report.colunas_d_yield || 0;
      const ta = report.colunas_d_reject_ash || 0;
      const cr = report.colunas_d_cr || 0;
      const vals = `💎 PRODUCT ASH ${pa}% | 📈 YIELD ${yld}% | 📉 TAIL ASH ${ta}% | CR ${cr}%`;
      if (pa > 11 || yld < 55 || ta < 45) return { color: 'bg-red-500', label: 'Fora de Spec', values: vals };
      return { color: 'bg-emerald-500', label: 'Normal', values: vals };
    }

    if (report.category === 'HUMIDADE_PLY') {
      const tm = report.humidade_fundo || 0;
      const ply = report.ply || 'N/A';
      const vals = `🏷️ PLY: ${ply} | 💧 HUMIDADE FUNDO: ${tm}%`;
      if (tm > 14.0) return { color: 'bg-red-500', label: 'Muito Alta', values: vals };
      if (tm > 13.5) return { color: 'bg-amber-500', label: 'Acima Target', values: vals };
      if (tm < 12.0) return { color: 'bg-blue-500', label: 'Muito Seco', values: vals };
      return { color: 'bg-emerald-500', label: 'Normal', values: vals };
    }

    return { color: 'bg-slate-100', label: 'Desconhecido', values: '-' };
  };

  const handleClearCache = () => {
    if (window.confirm('Deseja realmente apagar o cache local? Todos os dados não sincronizados serão perdidos.')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleRestoreDefault = () => {
    if (window.confirm('Deseja restaurar as configurações padrão?')) {
      localStorage.removeItem('google_apps_script_url');
      localStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Painel de Controle</h1>
          </div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Gestão de Checklists e Ativos em Tempo Real</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/manual-pending')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <AlertCircle size={16} /> Registrar Pendência Manual
          </button>
        </div>
      </div>

      <button 
        onClick={() => navigate('/calendar')}
        className="w-full text-left bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm p-6 overflow-hidden relative group hover:border-blue-500 transition-all cursor-pointer"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-900 text-white rounded-lg group-hover:bg-blue-600 transition-colors">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Escala Operacional 2026</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
            Ver Escala Completa <ExternalLink size={14} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const currentShift = getCurrentShiftInfo();
            return (['A', 'B', 'C', 'D'] as Turma[]).map(t => {
              const status = getStatusForTurma(new Date(), t);
              const isActive = currentShift.turma === t;
              
              return (
                <div key={t} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isActive ? 'border-emerald-200 bg-emerald-50/30' : status.isWorking ? 'border-slate-200 bg-white' : 'border-slate-50 bg-slate-50/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border ${status.isWorking ? getTurmaCardColor(t) : 'bg-white text-slate-300 border-slate-100'}`}>
                      {t}
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${status.isWorking ? 'text-slate-900' : 'text-slate-400'}`}>Turma {t}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {status.turno === 'FOLGA' ? <Coffee size={12} className="text-slate-300" /> : <Clock size={12} className="text-blue-500" />}
                        <span className={`text-[9px] font-bold uppercase ${status.turno === 'FOLGA' ? 'text-slate-300' : 'text-slate-600'}`}>
                          {status.turno}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 animate-pulse`}>
                      Ativo Agora
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
      </button>

      {/* Semáforo de Qualidade - Horizontal Full Width */}
      <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-lg border-2 border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
          <div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Semáforo de Qualidade</h3>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1">Status de Produção e Qualidade em Tempo Real</p>
          </div>
          <div className="flex items-center gap-4">
            {latestQuality?.ply && (
              <div className="px-3 py-1.5 bg-blue-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-white border border-blue-500 shadow-lg shadow-blue-600/20">
                PLY: {latestQuality.ply}
              </div>
            )}
            <button 
              onClick={() => navigate('/dfp')}
              className="px-6 py-2 bg-white text-slate-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all active:scale-95 shadow-lg"
            >
              Atualizar
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          {[
            { id: 'DFP2_C', label: 'DFP2 - PLANTA C' },
            { id: 'DFP2_D', label: 'DFP2 - PLANTA D' },
            { id: 'COLUNAS_D', label: 'COLUNAS D' },
            { id: 'HUMIDADE_PLY', label: 'HUMIDADE' },
          ].map(section => {
            const latestForSection = [...qualityReports]
              .filter(qr => {
                if (section.id === 'DFP2_C') return (qr.category === 'DFP2_C') || (qr.category === 'DFP2' && qr.dfp2_c_cr !== undefined);
                if (section.id === 'DFP2_D') return (qr.category === 'DFP2_D') || (qr.category === 'DFP2' && qr.dfp2_d_cr !== undefined);
                if (section.id === 'COLUNAS_D') return (qr.category === 'COLUNAS_D') || (qr.category === 'DFP2' && qr.colunas_d_cr !== undefined);
                if (section.id === 'HUMIDADE_PLY') return (qr.category === 'HUMIDADE_PLY') || (qr.category === 'DFP2' && qr.humidade_fundo !== undefined);
                return qr.category === section.id;
              })
              .sort((a, b) => b.timestamp - a.timestamp)[0];
            
            const reportToProcess = latestForSection ? { ...latestForSection, category: section.id as QualityCategory } : undefined;
            const status = getQualityStatus(reportToProcess);
            
            return (
              <div key={section.id} className="flex items-center justify-between bg-slate-800/40 p-3 rounded-xl border border-slate-800 hover:border-slate-600 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${status.color} shadow-[0_0_10px_rgba(0,0,0,0.5)] animate-pulse`} />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 block">{section.label}</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{status.label}</span>
                  </div>
                </div>
                
                <div className="text-[9px] font-black text-white tracking-tight leading-relaxed text-right flex flex-wrap gap-1.5 justify-end">
                  {status.values.split(' | ').map((v, i) => (
                    <span key={i} className="bg-slate-700/50 px-2 py-0.5 rounded">
                      {v}
                    </span>
                  ))}
                  <span className="text-slate-500 text-[8px] block mt-0.5 w-full">
                    Último: {reportToProcess ? new Date(reportToProcess.timestamp).toLocaleTimeString('pt-BR', { hour12: false }) : '--:--'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AreaCard 
          area={Area.HBF_C} 
          icon={<Zap size={28} />} 
          description="Filtros de Esteira Planta C. Controle de vácuo e velocidades."
        />
        <AreaCard 
          area={Area.HBF_D} 
          icon={<Zap size={28} />} 
          description="Filtros de Esteira Planta D. Inspeção de sprays e panos."
        />
        <AreaCard 
          area={Area.BOMBEAMENTO} 
          icon={<Droplets size={28} />} 
          description="Bombas de vácuo e filtrado. Motores e selagem."
        />
        <AreaCard 
          area={Area.ESPESADORES} 
          icon={<Settings2 size={28} />} 
          description="Torque, rake e reagentes. Densidade do underflow."
        />
        <AreaCard 
          area={Area.DFP2} 
          icon={<Filter size={28} />} 
          description="Filtros de lona DFP 2. Sopragem e hidráulica."
        />
        
        <div className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col justify-between ${
          unsyncedCount > 0 
            ? 'bg-amber-50 border-amber-200 shadow-xl shadow-amber-200/20' 
            : 'bg-emerald-50 border-emerald-200 shadow-xl shadow-emerald-200/20'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              unsyncedCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {unsyncedCount > 0 ? <WifiOff size={24} /> : <Wifi size={24} />}
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${unsyncedCount > 0 ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                {unsyncedCount > 0 ? 'MODO OFFLINE' : 'MODO ONLINE'}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Sincronização Google</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 leading-relaxed">
              {unsyncedCount > 0 
                ? `Existem ${unsyncedCount} registros locais para enviar.`
                : 'Seu banco de dados local está totalmente sincronizado.'}
            </p>
          </div>

          <button 
            onClick={onRefreshCloud}
            disabled={isRefreshing}
            className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 ${
              isRefreshing 
                ? 'bg-slate-900 text-white animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
          >
            {isRefreshing ? <RefreshCw size={18} className="animate-spin" /> : <Cloud size={18} />}
            {isRefreshing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
