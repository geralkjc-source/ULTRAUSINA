
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  ClipboardCheck, 
  AlertCircle, 
  FileSpreadsheet, 
  LayoutDashboard,
  Menu,
  Cloud,
  CloudOff,
  RefreshCw,
  PieChart,
  Settings,
  Calendar,
  Award,
  Zap
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import ChecklistArea from './pages/ChecklistArea';
import PendingList from './pages/PendingList';
import ReportsHistory from './pages/ReportsHistory';
import SyncDashboard from './pages/SyncDashboard';
import Analytics from './pages/Analytics';
import ShiftCalendar from './pages/ShiftCalendar';
import OperationalForms from './pages/OperationalForms';
import PerformanceHistory from './pages/PerformanceHistory';
import DFPResults from './pages/DFPResults';
import ManualPendingForm from './pages/ManualPendingForm';
import { Area, Report, PendingItem, Turma, QualityReport, OperationalEvent } from './types';
import { syncToGoogleSheets, fetchCloudItems, fetchCloudReports, fetchCloudQualityReports, fetchCloudOperationalEvents, fetchCloudData, CloudStats, DEFAULT_SCRIPT_URL } from './services/googleSync';
import { backendService } from './services/backendService';

const VulcanLogo = ({ className = "" }: { className?: string }) => (
  <span className={`font-black tracking-tighter select-none ${className}`}>VULCAN</span>
);

/**
 * Omni-Sync Monitor
 * Componente interno que observa a mudança de rotas para disparar o sincronismo automático.
 */
const OmniSyncMonitor = ({ onNavigate }: { onNavigate: () => void }) => {
  const location = useLocation();
  const lastPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== lastPath.current) {
      onNavigate();
      lastPath.current = location.pathname;
    }
  }, [location, onNavigate]);

  return null;
};

const Sidebar = ({ isOpen, toggle, unsyncedCount }: { isOpen: boolean; toggle: () => void, unsyncedCount: number }) => {
  const location = useLocation();
  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/calendar', label: 'Escala 2026', icon: <Calendar size={20} /> },
    { path: '/charts', label: 'Supervisório', icon: <PieChart size={20} /> },
    { path: '/pending', label: 'Pendências', icon: <AlertCircle size={20} /> },
    { path: '/history', label: 'Histórico', icon: <FileSpreadsheet size={20} /> },
    { 
      path: '/sync', 
      label: 'Sincronização', 
      icon: <Cloud size={20} />, 
      badge: unsyncedCount > 0 ? unsyncedCount : null 
    },
    { path: '/dfp', label: 'Qualidade e Yield', icon: <PieChart size={20} /> },
    { path: '/forms', label: 'Formulários Operacionais', icon: <FileSpreadsheet size={20} /> },
    { path: '/performance-history', label: 'Histórico de Performance', icon: <Award size={20} /> },
  ];

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden" onClick={toggle} />}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-white px-3 py-2 rounded-lg flex items-center justify-center shrink-0 shadow-inner">
               <VulcanLogo className="text-xl text-slate-900" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight tracking-tight text-white">USINA 2</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">Gestão Operacional</p>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Menu Principal</p>
              <div className="space-y-1">
                {menuItems.map(item => (
                  <Link key={item.path} to={item.path} onClick={() => window.innerWidth < 1024 && toggle()} className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${location.pathname === item.path ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {item.badge && <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">{item.badge}</span>}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <p className="text-slate-500 text-xs font-bold uppercase mb-4 px-2">Checklists</p>
              <div className="space-y-1">
                {Object.values(Area).map(area => (
                  <Link key={area} to={`/checklist/${encodeURIComponent(area)}`} onClick={() => window.innerWidth < 1024 && toggle()} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${location.pathname.includes(encodeURIComponent(area)) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <ClipboardCheck size={20} />
                    <span className="font-medium text-sm">{area}</span>
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
};

const Header = ({ onToggleSidebar, unsyncedCount, isSyncing, onSync }: { onToggleSidebar: () => void, unsyncedCount: number, isSyncing: boolean, onSync: () => void }) => (
  <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-4">
      <button onClick={onToggleSidebar} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md"><Menu size={24} /></button>
      <div className="flex flex-col">
        <h2 className="text-slate-800 font-black uppercase text-xs tracking-tight">Plataforma Ultrafino Usina 2</h2>
        {isSyncing && (
          <div className="flex items-center gap-1.5 text-blue-600 text-[8px] font-black uppercase animate-pulse">
            <RefreshCw size={8} className="animate-spin" /> Atualizando Nuvem...
          </div>
        )}
      </div>
    </div>
    <div className="flex items-center gap-4">
      {unsyncedCount > 0 ? (
        <button 
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-amber-50 text-amber-600 px-3 py-1.5 rounded-full border border-amber-100 text-[9px] font-black uppercase tracking-wider hover:bg-amber-100 transition-all shadow-sm"
        >
          {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <CloudOff size={14} />} 
          {isSyncing ? 'Sincronizando...' : `${unsyncedCount} Pendentes`}
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-full border border-emerald-100 text-[9px] font-black uppercase tracking-wider">
          <Cloud size={14} /> Sincronizado
        </div>
      )}
      <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400"><Settings size={18} /></div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [qualityReports, setQualityReports] = useState<QualityReport[]>([]);
  const [operationalEvents, setOperationalEvents] = useState<OperationalEvent[]>([]);
  const [isGlobalSyncing, setIsGlobalSyncing] = useState(false);
  const [cloudStats, setCloudStats] = useState<CloudStats | null>(null);
  const [lastSyncSource, setLastSyncSource] = useState<'local' | 'cloud'>('local');

  // Carregamento Inicial
  useEffect(() => {
    // Migração de URL do Google Script (v3.2)
    const currentUrl = localStorage.getItem('google_apps_script_url');
    const previousUrls = [
      'https://script.google.com/macros/s/AKfycbxtvbBGbkqymcbFIKjKRXfy_GFW7b9pb_FaH6smuAUrosTbs3l02FYe753qx_1Lg19oZA/exec',
      'https://script.google.com/macros/s/AKfycbyvYthvTERVFx9Vy4M3iVVbQj7vxzX-HaDkrM6M_DhCvddyWZevMr5omoquK5Z8PxnP/exec'
    ];
    if (!currentUrl || previousUrls.includes(currentUrl)) {
      localStorage.setItem('google_apps_script_url', DEFAULT_SCRIPT_URL);
    }

    const loadInitialData = async () => {
      try {
        // Tenta carregar do backend primeiro
        const [bReports, bPending, bQuality, bOperational] = await Promise.all([
          backendService.getReports().catch(() => []),
          backendService.getPendingItems().catch(() => []),
          backendService.getQualityReports().catch(() => []),
          backendService.getOperationalEvents().catch(() => [])
        ]);

        if (bReports.length > 0) setReports(bReports.sort((a, b) => b.timestamp - a.timestamp));
        else {
          const savedReports = localStorage.getItem('ultrafino_reports');
          if (savedReports) setReports(JSON.parse(savedReports).sort((a: any, b: any) => b.timestamp - a.timestamp));
        }

        if (bPending.length > 0) setPendingItems(bPending.sort((a, b) => b.timestamp - a.timestamp));
        else {
          const savedPending = localStorage.getItem('ultrafino_pending');
          if (savedPending) setPendingItems(JSON.parse(savedPending).sort((a: any, b: any) => b.timestamp - a.timestamp));
        }

        if (bQuality.length > 0) setQualityReports(bQuality.sort((a, b) => b.timestamp - a.timestamp));
        else {
          const savedQuality = localStorage.getItem('ultrafino_quality');
          if (savedQuality) setQualityReports(JSON.parse(savedQuality).sort((a: any, b: any) => b.timestamp - a.timestamp));
        }

        if (bOperational.length > 0) setOperationalEvents(bOperational.sort((a, b) => b.timestamp - a.timestamp));
        else {
          const savedOperational = localStorage.getItem('ultrafino_operational');
          if (savedOperational) setOperationalEvents(JSON.parse(savedOperational).sort((a: any, b: any) => b.timestamp - a.timestamp));
        }
      } catch (e) {
        console.error("Initial Load Error", e);
        // Fallback para localStorage
        const savedReports = localStorage.getItem('ultrafino_reports');
        const savedPending = localStorage.getItem('ultrafino_pending');
        const savedQuality = localStorage.getItem('ultrafino_quality');
        const savedOperational = localStorage.getItem('ultrafino_operational');
        if (savedReports) setReports(JSON.parse(savedReports));
        if (savedPending) setPendingItems(JSON.parse(savedPending));
        if (savedQuality) setQualityReports(JSON.parse(savedQuality));
        if (savedOperational) setOperationalEvents(JSON.parse(savedOperational));
      }
    };
    loadInitialData();
  }, []);

  const unsyncedCount = reports.filter(r => !r.synced).length + 
                       pendingItems.filter(p => !p.synced).length + 
                       qualityReports.filter(qr => !qr.synced).length +
                       operationalEvents.filter(oe => !oe.synced).length;

  /**
   * Omni-Sync Function
   * Sincroniza dados locais com a nuvem e busca novidades.
   */
  const refreshDataFromCloud = useCallback(async (manualReports?: Report[], manualPending?: PendingItem[], manualQualityReports?: QualityReport[], manualOperational?: OperationalEvent[]) => {
    setIsGlobalSyncing(true);
    try {
      const reportsToSync = manualReports || reports;
      const pendingToSync = manualPending || pendingItems;
      const qualityReportsToSync = manualQualityReports || qualityReports;
      const operationalToSync = manualOperational || operationalEvents;

      const unsyncedReports = reportsToSync.filter(r => !r.synced);
      const unsyncedPending = pendingToSync.filter(p => !p.synced);
      const unsyncedQualityReports = qualityReportsToSync.filter(qr => !qr.synced);
      const unsyncedOperational = operationalToSync.filter(oe => !oe.synced);

      // 1. Sincroniza com o Backend v3.2 (Express)
      if (unsyncedReports.length > 0 || unsyncedPending.length > 0 || unsyncedQualityReports.length > 0 || unsyncedOperational.length > 0) {
        await backendService.sync({
          reports: unsyncedReports,
          pending: unsyncedPending,
          qualityReports: unsyncedQualityReports,
          operationalEvents: unsyncedOperational,
          version: "4.0"
        });
        
        // Marca como sincronizado localmente IMEDIATAMENTE após sucesso no backend
        setReports(prev => prev.map(r => unsyncedReports.some(ur => ur.id === r.id) ? { ...r, synced: true } : r));
        setPendingItems(prev => prev.map(p => unsyncedPending.some(up => up.id === p.id) ? { ...p, synced: true } : p));
        setQualityReports(prev => prev.map(qr => unsyncedQualityReports.some(uqr => uqr.id === qr.id) ? { ...qr, synced: true } : qr));
        setOperationalEvents(prev => prev.map(oe => unsyncedOperational.some(uoe => uoe.id === oe.id) ? { ...oe, synced: true } : oe));
      }

      // 2. Busca dados atualizados do Backend
      const [bReports, bPending, bQuality, bOperational] = await Promise.all([
        backendService.getReports(),
        backendService.getPendingItems(),
        backendService.getQualityReports(),
        backendService.getOperationalEvents()
      ]);

      // 3. Sincroniza com Google Sheets (Opcional/Legado)
      const scriptUrl = localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL;
      let cloudReports: Report[] = [];
      let cloudPending: PendingItem[] = [];
      let cloudQuality: QualityReport[] = [];
      let cloudOperational: OperationalEvent[] = [];
      
      if (scriptUrl) {
        await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending, unsyncedQualityReports, unsyncedOperational).catch(() => null);
        
        // Busca TODOS os históricos da nuvem
        const [cReports, cPending, cQuality, cOperational] = await Promise.all([
          fetchCloudReports(scriptUrl).catch(() => []),
          fetchCloudItems(scriptUrl).catch(() => []),
          fetchCloudQualityReports(scriptUrl).catch(() => []),
          fetchCloudOperationalEvents(scriptUrl).catch(() => [])
        ]);
        
        cloudReports = cReports;
        cloudPending = cPending;
        cloudQuality = cQuality;
        cloudOperational = cOperational;
      }

      // Mesclagem e Ordenação
      const mergeData = <T extends { id: string; timestamp: number }>(local: T[], cloud: T[]) => {
        const map = new Map<string, T>();
        [...cloud, ...local].forEach(item => {
          const existing = map.get(item.id);
          if (!existing || item.timestamp > existing.timestamp) {
            map.set(item.id, item);
          }
        });
        return Array.from(map.values());
      };

      const finalReports = mergeData(bReports, cloudReports).map(r => ({ ...r, synced: true })).sort((a, b) => b.timestamp - a.timestamp);
      const finalPending = mergeData(bPending, cloudPending).map(p => ({ ...p, synced: true })).sort((a, b) => b.timestamp - a.timestamp);
      const finalQuality = mergeData(bQuality, cloudQuality).map(qr => ({ ...qr, synced: true })).sort((a, b) => b.timestamp - a.timestamp);
      const finalOperational = mergeData(bOperational, cloudOperational).map(oe => ({ ...oe, synced: true })).sort((a, b) => b.timestamp - a.timestamp);

      setReports(finalReports);
      setPendingItems(finalPending);
      setQualityReports(finalQuality);
      setOperationalEvents(finalOperational);
      
      localStorage.setItem('ultrafino_reports', JSON.stringify(finalReports));
      localStorage.setItem('ultrafino_pending', JSON.stringify(finalPending));
      localStorage.setItem('ultrafino_quality', JSON.stringify(finalQuality));
      localStorage.setItem('ultrafino_operational', JSON.stringify(finalOperational));
      setLastSyncSource('cloud');
    } catch (error) {
      console.error("Sync Error", error);
      setLastSyncSource('local');
    } finally {
      setIsGlobalSyncing(false);
    }
  }, [reports, pendingItems, qualityReports, operationalEvents]);

  // Sincronismo Automático a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      refreshDataFromCloud();
    }, 30 * 1000);
    return () => clearInterval(interval);
  }, [refreshDataFromCloud]);

  // Disparo de Sync ao entrar no App
  useEffect(() => {
    refreshDataFromCloud();
  }, []);

  const addReport = (report: Report) => {
    const newReport = { ...report, synced: false };
    const updatedReports = [newReport, ...reports];
    setReports(updatedReports);
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    
    // Sync imediato após envio
    refreshDataFromCloud(updatedReports, pendingItems);
  };

  const resolvePending = (id: string, operatorName: string, resolvedTurma: Turma) => {
    const updated = pendingItems.map(p => 
      p.id === id ? { 
        ...p, 
        status: 'resolvido' as const, 
        resolvedBy: operatorName, 
        resolvedByTurma: resolvedTurma,
        resolvedAt: Date.now(), 
        synced: false
      } : p
    );
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
    
    // Sync imediato após resolução
    refreshDataFromCloud(reports, updated);
  };

  const addManualPending = (pending: PendingItem) => {
    const updated = [...pendingItems, { ...pending, synced: false }];
    setPendingItems(updated);
    localStorage.setItem('ultrafino_pending', JSON.stringify(updated));
    refreshDataFromCloud(reports, updated);
  };

  const addQualityReport = (report: QualityReport) => {
    const newReport = { ...report, synced: false };
    const updated = [newReport, ...qualityReports];
    setQualityReports(updated);
    localStorage.setItem('ultrafino_quality', JSON.stringify(updated));
    refreshDataFromCloud(reports, pendingItems, updated);
  };

  const addOperationalEvent = (event: OperationalEvent) => {
    const newEvent = { ...event, synced: false };
    const updated = [newEvent, ...operationalEvents];
    setOperationalEvents(updated);
    localStorage.setItem('ultrafino_operational', JSON.stringify(updated));
    refreshDataFromCloud(reports, pendingItems, qualityReports, updated);
  };

  const onSyncSuccess = (syncedReportIds: string[], syncedPendingIds: string[], syncedQualityReportIds: string[], syncedOperationalIds: string[] = []) => {
    const updatedReports = reports.map(r => syncedReportIds.includes(r.id) ? { ...r, synced: true } : r);
    const updatedPending = pendingItems.map(p => syncedPendingIds.includes(p.id) ? { ...p, synced: true } : p);
    const updatedQualityReports = qualityReports.map(qr => syncedQualityReportIds.includes(qr.id) ? { ...qr, synced: true } : qr);
    const updatedOperational = operationalEvents.map(oe => syncedOperationalIds.includes(oe.id) ? { ...oe, synced: true } : oe);
    
    setReports(updatedReports);
    setPendingItems(updatedPending);
    setQualityReports(updatedQualityReports);
    setOperationalEvents(updatedOperational);
    
    localStorage.setItem('ultrafino_reports', JSON.stringify(updatedReports));
    localStorage.setItem('ultrafino_pending', JSON.stringify(updatedPending));
    localStorage.setItem('ultrafino_quality', JSON.stringify(updatedQualityReports));
    localStorage.setItem('ultrafino_operational', JSON.stringify(updatedOperational));
  };

  return (
    <HashRouter>
      <OmniSyncMonitor onNavigate={() => refreshDataFromCloud()} />
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar isOpen={isSidebarOpen} toggle={() => setIsSidebarOpen(!isSidebarOpen)} unsyncedCount={unsyncedCount} />
        <main className="flex-1 lg:ml-72 flex flex-col">
          <Header 
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
            unsyncedCount={unsyncedCount} 
            isSyncing={isGlobalSyncing} 
            onSync={() => refreshDataFromCloud()}
          />
          
          {pendingItems.filter(p => p.area === Area.DFP2 && p.status === 'aberto').length > 5 && (
            <div className="mx-6 mt-6 animate-in slide-in-from-top-4 duration-500">
              <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-6 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-red-900 font-black uppercase text-sm tracking-tight">Atenção: Volume de Pendências DFP</h3>
                    <p className="text-red-600 text-[10px] font-bold uppercase tracking-widest mt-1">
                      Existem {pendingItems.filter(p => p.area === Area.DFP2 && p.status === 'aberto').length} pendências em aberto na área DFP 2.
                    </p>
                  </div>
                </div>
                <Link 
                  to="/pending?area=DFP%202&status=aberto" 
                  className="bg-red-600 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md hover:bg-red-700 transition-all active:scale-95"
                >
                  Verificar Agora
                </Link>
              </div>
            </div>
          )}

          <div className="flex-1 p-6">
            <Routes>
              <Route path="/" element={<Dashboard reports={reports} pendingItems={pendingItems} qualityReports={qualityReports} operationalEvents={operationalEvents} onRefreshCloud={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} />} />
              <Route path="/calendar" element={<ShiftCalendar />} />
              <Route path="/charts" element={<Analytics reports={reports} pendingItems={pendingItems} cloudStats={cloudStats} onRefresh={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} syncSource={lastSyncSource} />} />
              <Route path="/checklist/:areaName" element={<ChecklistArea onSaveReport={addReport} />} />
              <Route path="/pending" element={<PendingList pendingItems={pendingItems} onResolve={resolvePending} onRefresh={() => refreshDataFromCloud()} isRefreshing={isGlobalSyncing} onAddComment={() => {}} />} />
              <Route path="/history" element={<ReportsHistory reports={reports} pendingItems={pendingItems} onAddItemComment={() => {}} />} />
              <Route path="/sync" element={<SyncDashboard reports={reports} pendingItems={pendingItems} qualityReports={qualityReports} operationalEvents={operationalEvents} onSyncSuccess={onSyncSuccess} onRefreshCloud={() => refreshDataFromCloud()} />} />
              <Route path="/dfp" element={<DFPResults onSaveQualityReport={addQualityReport} qualityReports={qualityReports} />} />
              <Route path="/forms" element={<OperationalForms onAddManualPending={addManualPending} onSaveOperationalEvent={addOperationalEvent} operationalEvents={operationalEvents} />} />
              <Route path="/performance-history" element={<PerformanceHistory operationalEvents={operationalEvents} />} />
              <Route path="/manual-pending" element={<ManualPendingForm onAddManualPending={addManualPending} />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
