
import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, 
  RotateCw,
  Zap,
  Settings2,
  Database,
  Trophy,
  AlertTriangle,
  Wrench,
  Cpu,
  UserCog,
  CheckCircle2,
  BarChart3,
  TrendingUp,
  Target,
  History,
  ShieldAlert,
  BarChart,
  ChevronRight,
  Award,
  ExternalLink,
  Link2,
  FileSpreadsheet,
  RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Report, PendingItem, Area, Turma, Discipline } from '../types';

import { syncToGoogleSheets, testScriptConnection, DEFAULT_SCRIPT_URL, MASTER_SHEET_URL, CloudStats } from '../services/googleSync';

interface AnalyticsProps {
  reports: Report[];
  pendingItems: PendingItem[];
  cloudStats: CloudStats | null;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  syncSource: 'local' | 'cloud';
}

const Analytics: React.FC<AnalyticsProps> = ({ 
  reports = [], 
  pendingItems = [], 
  cloudStats, 
  onRefresh, 
  isRefreshing,
  syncSource 
}) => {
  const navigate = useNavigate();

  // Estatísticas de Carga Acumulada
  const disciplinePerformance = useMemo(() => {
    const disciplines: Discipline[] = ['MECÂNICA', 'ELÉTRICA', 'INSTRUMENTAÇÃO', 'OPERAÇÃO'];
    
    return disciplines.map(d => {
      const totalInMonth = pendingItems.filter(p => p.discipline === d);
      const openCount = totalInMonth.filter(p => p.status === 'aberto').length;
      const resolvedCount = totalInMonth.filter(p => p.status === 'resolvido').length;
      const totalVolume = totalInMonth.length;
      const efficiency = totalVolume > 0 ? (resolvedCount / totalVolume) * 100 : 0;
      
      let icon = <Wrench size={18} />;
      let color = "blue";
      if (d === 'MECÂNICA') { icon = <Wrench size={18} />; color = "orange"; }
      if (d === 'ELÉTRICA') { icon = <Zap size={18} />; color = "blue"; }
      if (d === 'INSTRUMENTAÇÃO') { icon = <Cpu size={18} />; color = "purple"; }
      if (d === 'OPERAÇÃO') { icon = <UserCog size={18} />; color = "emerald"; }

      return { 
        discipline: d, 
        volume: openCount, 
        open: openCount, 
        resolved: resolvedCount, 
        efficiency: Math.round(efficiency),
        icon,
        color
      };
    });
  }, [pendingItems]);

  const productionByTurma = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    
    // Data operacional de hoje (meio-dia para evitar problemas de fuso)
    const todayOp = new Date(now);
    if (hour < 6) todayOp.setDate(todayOp.getDate() - 1);
    todayOp.setHours(12, 0, 0, 0);

    const startOfMonth = new Date(todayOp.getFullYear(), todayOp.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(todayOp);
    startOfWeek.setDate(todayOp.getDate() - todayOp.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const getOpDate = (timestamp: number | string, turno: string) => {
      const d = new Date(timestamp);
      const h = d.getHours();
      const op = new Date(d);
      if (turno === 'NOITE' && h < 6) {
        op.setDate(op.getDate() - 1);
      }
      op.setHours(12, 0, 0, 0);
      return op;
    };

    const monthlyData = reports.filter(r => {
      const opDate = getOpDate(r.timestamp, r.turno || 'MANHÃ');
      return opDate >= startOfMonth;
    });

    const weeklyData = reports.filter(r => {
      const opDate = getOpDate(r.timestamp, r.turno || 'MANHÃ');
      return opDate >= startOfWeek;
    });

    const getTurmaData = (data: Report[]) => {
      const turmaMap: { [key: string]: number } = {};
      data.forEach(r => {
        const turma = r.turma || 'N/A';
        turmaMap[turma] = (turmaMap[turma] || 0) + 1;
      });
      return Object.entries(turmaMap).map(([name, value]) => ({ name: `Turma ${name}`, value }));
    };

    return {
      monthly: getTurmaData(monthlyData),
      weekly: getTurmaData(weeklyData)
    };
  }, [reports]);

  const turmaPerformance = useMemo(() => {
    const turmas: Turma[] = ['A', 'B', 'C', 'D'];
    return turmas.map(t => {
      const resolved = pendingItems.filter(p => p.resolvedByTurma === t && p.status === 'resolvido').length;
      return { turma: t, resolved };
    });
  }, [pendingItems]);

  const debtPerformance = useMemo(() => {
    const turmas: Turma[] = ['A', 'B', 'C', 'D'];
    return turmas.map(t => {
      const openDebt = pendingItems.filter(p => 
        p.turma === t && 
        (p.status === 'aberto' || (p.status === 'resolvido' && p.turma !== p.resolvedByTurma))
      ).length;
      return { turma: t, openDebt };
    }).sort((a,b) => b.openDebt - a.openDebt);
  }, [pendingItems]);


  const totalMonthlyVolume = pendingItems.length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-3">
            <BarChart className="text-blue-600" size={32} />
            Fechamento v1.4
          </h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">Auditagem de Volume Mensal Acumulado</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
            <span className={`w-2 h-2 rounded-full ${syncSource === 'cloud' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
            <span className="text-[10px] font-black text-slate-500 uppercase">Carga Mensal: {syncSource === 'cloud' ? 'Sincronizada' : 'Local'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-950 p-8 rounded-[3.5rem] shadow-2xl border-4 border-slate-900 space-y-10">
          <div className="flex justify-between items-center border-b border-white/5 pb-6">
            <div className="space-y-1">
              <h2 className="text-white text-lg font-black uppercase tracking-tight flex items-center gap-2">
                <BarChart3 size={20} className="text-blue-500" /> Carga Acumulada por Disciplina
              </h2>
              <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Ocorrências Totais Registradas no Mês</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-white">{totalMonthlyVolume}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Eventos Totais (Mês)</p>
            </div>
          </div>


          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            {disciplinePerformance.map(stat => (
              <button 
                key={stat.discipline}
                onClick={() => navigate(`/pending?status=Tudo&discipline=${encodeURIComponent(stat.discipline)}`)}
                className="space-y-4 group text-left w-full hover:bg-white/5 p-4 rounded-3xl transition-all border border-transparent hover:border-white/10"
              >
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-2xl bg-white/5 text-${stat.color}-400 border border-white/10 group-hover:scale-110 transition-transform`}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-white text-[11px] font-black uppercase tracking-wider">{stat.discipline}</p>
                      <p className="text-slate-500 text-[9px] font-bold uppercase">{stat.volume} Ocorrências em Aberto</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black text-slate-600 uppercase block mb-1">Taxa de Resolução</span>
                    <span className={`text-xl font-black text-${stat.color}-400`}>{stat.efficiency}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                    <div 
                      className={`h-full bg-${stat.color}-500 rounded-full transition-all duration-1000 flex items-center justify-end px-2`} 
                      style={{ width: `100%` }}
                    >
                       <span className="text-[8px] font-black text-white/40 uppercase">Mês Atual</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          
          <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-3xl">
             <div className="flex items-center gap-3 mb-2">
               <ShieldAlert className="text-blue-500" size={18} />
               <span className="text-white text-[10px] font-black uppercase tracking-widest">Regra de Fechamento v1.4</span>
             </div>
             <p className="text-slate-400 text-[10px] leading-relaxed uppercase font-bold">
               A contagem de carga por disciplina é acumulativa. Clique nos cards acima para auditar os registros.
             </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-8 rounded-[3.5rem] border-2 border-slate-100 shadow-xl space-y-6">
            <div className="space-y-1">
              <h2 className="text-slate-900 text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Trophy size={18} className="text-amber-500" /> Ranking Resolutivo
              </h2>
              <p className="text-slate-400 text-[9px] font-bold uppercase italic">Quem mais entregou no mês</p>
            </div>

            <div className="space-y-3">
              {turmaPerformance.sort((a,b) => b.resolved - a.resolved).map((t, idx) => (
                <button 
                  key={t.turma} 
                  onClick={() => navigate(`/pending?status=resolvido&resolvedByTurma=${t.turma}`)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all active:scale-[0.98] group ${
                  idx === 0 ? 'bg-amber-50 border-amber-200 shadow-md hover:bg-amber-100' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md text-sm ${
                      idx === 0 ? 'bg-amber-500' : 'bg-slate-900'
                    }`}>
                      {t.turma}
                    </div>
                    <div className="text-left">
                      <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight">TURMA {t.turma}</p>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600 transition-colors flex items-center gap-1">Auditar Baixas <ChevronRight size={10} /></span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">{t.resolved}</span>
                    <CheckCircle2 size={16} className="text-emerald-500" />
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="space-y-1 mb-4">
                <h2 className="text-red-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert size={14} /> Pendências Identificadas
                </h2>
                <p className="text-slate-400 text-[8px] font-bold uppercase italic">Pendências identificadas pela equipe</p>
              </div>

              <div className="space-y-2">
                {debtPerformance.map((t, idx) => (
                  <button 
                    key={t.turma} 
                    onClick={() => navigate(`/pending?status=aberto&turma=${t.turma}`)}
                    className="w-full flex items-center justify-between p-3 bg-red-50/50 rounded-xl border border-red-100 hover:bg-red-50 transition-colors active:scale-95 group"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-[10px] ${idx === 0 ? 'bg-red-600 text-white' : 'bg-red-200 text-red-700'}`}>
                        {t.turma}
                      </span>
                      <div className="text-left">
                        <span className="text-[10px] font-black text-slate-700 uppercase">Equipe {t.turma}</span>
                        <span className="text-[7px] font-black text-red-400 uppercase tracking-widest block group-hover:text-red-600 transition-colors">Ver Pendentes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-red-600">{t.openDebt}</span>
                      <History size={14} className="text-red-400" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {[
          { label: 'Ocorrências Mês', val: totalMonthlyVolume, icon: <BarChart3 className="text-blue-500" /> },
          { label: 'Falhas Críticas', val: pendingItems.filter(p => p.priority === 'alta').length, icon: <AlertTriangle className="text-red-500" /> },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
              {kpi.icon}
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
              <p className="text-xl font-black text-slate-900">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Google Sheets Integration Section */}
    </div>
  );
};

export default Analytics;
