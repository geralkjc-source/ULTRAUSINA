
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
import { QualityReport, PendingItem, Area, Turma, QualityReport as QualityReportType, OperationalEvent, QualityCategory, Report } from '../types';
import { getScaleForDate, getStatusForTurma, getCurrentShiftInfo } from '../services/shiftService';
import { useLanguage } from '../LanguageContext';

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
  const { t, language, translateArea, translateShift } = useLanguage();
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
      lastReport: areaReports.length > 0 ? new Date(areaReports[0].timestamp).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US') : t('dashboard.noRecords'),
      status: hasFailures ? `${areaPending.length} ${t('sidebar.pending')}` : t('dashboard.operational'),
      hasFailures
    };
  };

  const AreaCard = ({ area, icon, description }: { area: Area, icon: React.ReactNode, description: string }) => {
    const stats = getAreaStats(area);
    const isCritical = stats.hasFailures;
    const isVeryCritical = area === Area.DFP2 && pendingItems.filter(p => p.area === Area.DFP2 && p.status === 'aberto').length >= 50;

    return (
      <div className={`rounded-[2rem] border-2 shadow-sm hover:shadow-xl transition-all flex flex-col h-full overflow-hidden group ${
        isVeryCritical ? 'bg-red-50 border-red-200 hover:border-red-500' : 'bg-white border-slate-100 hover:border-blue-500'
      }`}>
        {/* Parte Superior: Direciona para o Checklist */}
        <button 
          onClick={() => navigate(`/checklist/${encodeURIComponent(area)}`)}
          className="p-6 text-left flex-grow w-full focus:outline-none"
        >
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-colors ${
            isVeryCritical ? 'bg-red-600 text-white' : isCritical ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
          } group-hover:bg-blue-600 group-hover:text-white`}>
            {icon}
          </div>
          
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">{translateArea(area)}</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2 leading-relaxed">{description}</p>
        </button>
        
        {/* Parte Inferior: Direciona para Pendências Filtradas */}
        <button 
          onClick={() => navigate(`/pending?area=${encodeURIComponent(area)}`)}
          className={`px-6 py-4 border-t flex items-center justify-between transition-colors ${
            isVeryCritical ? 'bg-red-100/50 hover:bg-red-200/80 border-red-200' : isCritical ? 'bg-amber-50/50 hover:bg-amber-100/80 border-slate-50' : 'hover:bg-slate-50 border-slate-50'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('dashboard.currentStatus')}</span>
            <div className="flex items-center gap-1.5">
              {isCritical && <AlertCircle size={10} className={isVeryCritical ? 'text-red-600 animate-bounce' : 'text-amber-600 animate-pulse'} />}
              <span className={`text-[10px] font-black uppercase ${isVeryCritical ? 'text-red-700' : isCritical ? 'text-amber-600' : 'text-emerald-600'}`}>
                {isVeryCritical ? `${t('dashboard.critical')}: ` : ''}{stats.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-black text-blue-600 uppercase opacity-0 group-hover:opacity-100 transition-all">
            {t('dashboard.viewPending')} <ChevronRight size={14} />
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
    if (!report) return { color: 'bg-slate-100', label: t('dashboard.qualityStatus.noData'), values: '-' };

    if (report.category === 'DFP2') {
      // Caso genérico ou fallback, mas agora usamos categorias específicas
      const vals = `YLD ${(report.dfp2_c_yield || 0).toFixed(1)}% | REJ ${(report.dfp2_c_reject_ash || 0).toFixed(1)}%`;
      return { color: 'bg-emerald-500', label: t('dashboard.qualityStatus.normal'), values: vals };
    }

    if (report.category === 'DFP2_C') {
      const yld = report.dfp2_c_yield || 0;
      const ra = report.dfp2_c_reject_ash || 0;
      const ca = report.dfp2_c_conc_ash || 0;
      const cr = report.dfp2_c_cr || 0;
      const vals = `📈 ${t('dashboard.yield')} ${yld.toFixed(1)}% | 📉 REJ ${ra.toFixed(1)}% | 💎 CONC ${ca.toFixed(1)}% | CR ${cr.toFixed(1)}%`;
      if (yld < 35 || ra < 30) return { color: 'bg-red-500', label: t('dashboard.qualityStatus.criticalAlert'), values: vals };
      if (ca > 11) return { color: 'bg-amber-500', label: t('dashboard.qualityStatus.attention'), values: vals };
      return { color: 'bg-emerald-500', label: t('dashboard.qualityStatus.normal'), values: vals };
    }

    if (report.category === 'DFP2_D') {
      const yld = report.dfp2_d_yield || 0;
      const ra = report.dfp2_d_reject_ash || 0;
      const ca = report.dfp2_d_conc_ash || 0;
      const cr = report.dfp2_d_cr || 0;
      const vals = `📈 ${t('dashboard.yield')} ${yld.toFixed(1)}% | 📉 REJ ${ra.toFixed(1)}% | 💎 CONC ${ca.toFixed(1)}% | CR ${cr.toFixed(1)}%`;
      if (yld < 35 || ra < 30) return { color: 'bg-red-500', label: t('dashboard.qualityStatus.criticalAlert'), values: vals };
      if (ca > 11) return { color: 'bg-amber-500', label: t('dashboard.qualityStatus.attention'), values: vals };
      return { color: 'bg-emerald-500', label: t('dashboard.qualityStatus.normal'), values: vals };
    }

    if (report.category === 'COLUNAS_D') {
      const pa = report.colunas_d_conc_ash || 0;
      const yld = report.colunas_d_yield || 0;
      const ta = report.colunas_d_reject_ash || 0;
      const cr = report.colunas_d_cr || 0;
      const vals = `💎 PRODUCT ASH ${pa}% | 📈 ${t('dashboard.yield')} ${yld}% | 📉 TAIL ASH ${ta}% | CR ${cr}%`;
      
      let color = 'bg-emerald-500';
      let label = t('dashboard.qualityStatus.normal');
      
      if (yld < 35) {
        color = 'bg-red-500';
        label = `${t('dashboard.qualityStatus.criticalAlert')} (${t('dashboard.yield')} < 35)`;
      } else if (yld >= 35 && yld <= 39) {
        color = 'bg-amber-500';
        label = `${t('dashboard.qualityStatus.attention')} (${t('dashboard.yield')} 35-39)`;
      } else if (yld >= 40) {
        color = 'bg-emerald-500';
        label = `${t('dashboard.qualityStatus.normal')} (${t('dashboard.yield')} >= 40)`;
      }
      
      return { color, label, values: vals };
    }

    if (report.category === 'HUMIDADE_PLY') {
      const tm = report.humidade_fundo || 0;
      const ply = report.ply || 'N/A';
      const vals = `🏷️ PLY: ${ply} | 💧 ${t('dashboard.qualitySections.moistureBottom')}: ${tm}%`;
      
      if (tm >= 14) return { color: 'bg-red-500', label: `${t('dashboard.qualityStatus.criticalAlert')} (>= 14)`, values: vals };
      if (tm <= 13) return { color: 'bg-emerald-500', label: `${t('dashboard.qualityStatus.normal')} (<= 13)`, values: vals };
      return { color: 'bg-amber-500', label: `${t('dashboard.qualityStatus.attention')} (13-14)`, values: vals };
    }

    return { color: 'bg-slate-100', label: t('dashboard.qualityStatus.unknown'), values: '-' };
  };

  const handleClearCache = () => {
    if (window.confirm(t('dashboard.confirmClearCache'))) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleRestoreDefault = () => {
    if (window.confirm(t('dashboard.confirmRestoreDefault'))) {
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('dashboard.controlPanel')}</h1>
          </div>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">{t('dashboard.realTimeManagement')}</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => navigate('/manual-pending')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <AlertCircle size={16} /> {t('dashboard.registerManualPending')}
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
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('dashboard.operationalScale')}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('dashboard.today')}, {new Date().toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
            {t('dashboard.viewFullScale')} <ExternalLink size={14} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(() => {
            const currentShift = getCurrentShiftInfo();
            return (['A', 'B', 'C', 'D'] as Turma[]).map(turma => {
              const status = getStatusForTurma(new Date(), turma);
              const isActive = currentShift.turma === turma;
              
              return (
                <div key={turma} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${isActive ? 'border-emerald-200 bg-emerald-50/30' : status.isWorking ? 'border-slate-200 bg-white' : 'border-slate-50 bg-slate-50/50'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg shadow-sm border ${status.isWorking ? getTurmaCardColor(turma) : 'bg-white text-slate-300 border-slate-100'}`}>
                      {turma}
                    </div>
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${status.isWorking ? 'text-slate-900' : 'text-slate-400'}`}>{t('team')} {turma}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {status.turno === 'FOLGA' ? <Coffee size={12} className="text-slate-300" /> : <Clock size={12} className="text-blue-500" />}
                        <span className={`text-[9px] font-bold uppercase ${status.turno === 'FOLGA' ? 'text-slate-300' : 'text-slate-600'}`}>
                          {translateShift(status.turno)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isActive && (
                    <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/20 animate-pulse`}>
                      {t('dashboard.activeNow')}
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
            <h3 className="text-lg font-black uppercase tracking-tighter">{t('dashboard.qualitySemaphore')}</h3>
            <p className="text-slate-400 text-[8px] font-bold uppercase tracking-widest mt-1">{t('dashboard.qualityStatusDescription')}</p>
          </div>
          <div className="flex items-center gap-2">
            {latestQuality?.ply && (
              <div className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-blue-500/30 mr-2">
                PLY: {latestQuality.ply}
              </div>
            )}
            <button 
              onClick={onRefreshCloud}
              disabled={isRefreshing}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all active:scale-95 disabled:opacity-50"
              title={t('dashboard.syncNow')}
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-blue-400' : 'text-slate-400'} />
            </button>
            <button 
              onClick={() => navigate('/dfp')}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
            >
              {t('dashboard.newRecord')}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-3">
          {[
            { id: 'DFP2_C', label: t('dashboard.qualitySections.dfp2c') },
            { id: 'DFP2_D', label: t('dashboard.qualitySections.dfp2d') },
            { id: 'COLUNAS_D', label: t('dashboard.qualitySections.colunasd') },
            { id: 'HUMIDADE_PLY', label: t('dashboard.qualitySections.humidade') },
          ].map(section => {
            const latestForSection = [...qualityReports]
              .filter(qr => {
                if (qr.timestamp <= 0) return false;
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
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${section.id === 'HUMIDADE_PLY' ? 'text-cyan-400' : 'text-slate-200'}`}>
                      {section.label}
                    </span>
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
                    {t('dashboard.last')}: {reportToProcess && reportToProcess.timestamp > 0 
                      ? new Date(reportToProcess.timestamp).toLocaleTimeString(language === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' }) 
                      : '--:--'}
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
          description={t('dashboard.areaDescriptions.HBF_C')}
        />
        <AreaCard 
          area={Area.HBF_D} 
          icon={<Zap size={28} />} 
          description={t('dashboard.areaDescriptions.HBF_D')}
        />
        <AreaCard 
          area={Area.BOMBEAMENTO} 
          icon={<Droplets size={28} />} 
          description={t('dashboard.areaDescriptions.BOMBEAMENTO')}
        />
        <AreaCard 
          area={Area.ESPESADORES} 
          icon={<Settings2 size={28} />} 
          description={t('dashboard.areaDescriptions.ESPESADORES')}
        />
        <AreaCard 
          area={Area.DFP2} 
          icon={<Filter size={28} />} 
          description={t('dashboard.areaDescriptions.DFP2')}
        />
        
        <div className={`p-6 rounded-[2.5rem] border-4 transition-all flex flex-col justify-between ${
          unsyncedCount > 0 
            ? 'bg-amber-50 border-amber-200 shadow-xl shadow-amber-200/20' 
            : 'bg-emerald-50 border-emerald-200 shadow-xl shadow-amber-200/20'
        }`}>
          <div className="flex justify-between items-start mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              unsyncedCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {unsyncedCount > 0 ? <WifiOff size={24} /> : <Wifi size={24} />}
            </div>
            <div className="text-right">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${unsyncedCount > 0 ? 'bg-amber-200 text-amber-800' : 'bg-emerald-200 text-emerald-800'}`}>
                {unsyncedCount > 0 ? t('dashboard.offlineMode') : t('dashboard.onlineMode')}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('dashboard.googleSync')}</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase mt-1 leading-relaxed">
              {unsyncedCount > 0 
                ? `${t('dashboard.unsyncedMessage')} (${unsyncedCount})`
                : t('dashboard.syncedMessage')}
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
            {isRefreshing ? t('dashboard.syncingButton') : t('dashboard.syncNowButton')}
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
