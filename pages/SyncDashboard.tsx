
import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Lock, 
  Settings2, 
  Copy, 
  Check, 
  Globe,
  Wifi,
  WifiOff,
  AlertTriangle,
  Terminal,
  Save,
  Activity,
  Database,
  ShieldCheck,
  Code,
  CheckCircle2,
  FileSpreadsheet,
  ExternalLink
} from 'lucide-react';

import { syncToGoogleSheets, testScriptConnection, DEFAULT_SCRIPT_URL, MASTER_SHEET_URL } from '../services/googleSync';
import { backendService } from '../services/backendService';
import { Report, PendingItem, QualityReport, OperationalEvent } from '../types';

import { useLanguage } from '../LanguageContext';

const ADMIN_PASSWORD = 'ULTRAADMIN'; 


interface SyncDashboardProps {
  reports: Report[];
  pendingItems: PendingItem[];
  qualityReports: QualityReport[];
  operationalEvents: OperationalEvent[];
  onSyncSuccess: (syncedReportIds: string[], syncedPendingIds: string[], syncedQualityReportIds: string[], syncedOperationalIds: string[]) => void;
  onRefreshCloud?: () => void;
}

const SyncDashboard: React.FC<SyncDashboardProps> = ({ reports, pendingItems, qualityReports, operationalEvents, onSyncSuccess, onRefreshCloud }) => {
  const { t } = useLanguage();
  const [isSyncing, setIsSyncing] = useState(false);
  const [scriptUrl, setScriptUrl] = useState(localStorage.getItem('google_apps_script_url') || DEFAULT_SCRIPT_URL);
  const [showConfig, setshowConfig] = useState(false);
  const [password, setPassword] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [logs, setLogs] = useState<string[]>([]);
  const [fullConfig, setFullConfig] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await backendService.getConfig();
        setFullConfig(config);
        if (config.googleScriptUrl) {
          setScriptUrl(config.googleScriptUrl);
          localStorage.setItem('google_apps_script_url', config.googleScriptUrl);
        }
      } catch (error) {
        console.error('Failed to load config', error);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    if (scriptUrl) localStorage.setItem('google_apps_script_url', scriptUrl);
  }, [scriptUrl]);

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString('pt-BR', { hour12: false })}] ${msg}`, ...prev].slice(0, 10));
  };

  const handleTestConnection = async () => {
    setTestStatus('loading');
    addLog(t('sync.testingConnection') || "Iniciando Handshake SIGO v4.0...");
    
    try {
      // Testa o Backend Express primeiro
      const health = await fetch('/api/health').then(r => r.json());
      if (health.version === "4.0") {
        addLog(t('sync.backendActive') || "Sucesso: Backend Express v4.0 Ativo.");
      }
    } catch (e) {
      addLog(t('sync.backendNoResponse') || "Aviso: Backend Express não responde.");
    }

    const result = await testScriptConnection(scriptUrl);
    if (result.success) {
      setTestStatus('success');
      addLog(`${t('sync.syncSuccess') || 'Sucesso'}: ${result.message}`);
    } else {
      setTestStatus('error');
      addLog(`${t('sync.syncFailure') || 'Erro'}: ${result.message}`);
      if (result.details) addLog(`${t('sync.hint') || 'Dica'}: ${result.details}`);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    addLog(t('sync.startingSync') || "Transmissão SIGO v4.0 em curso...");
    const unsyncedReports = reports.filter(r => !r.synced);
    const unsyncedPending = pendingItems.filter(p => !p.synced);
    const unsyncedQualityReports = qualityReports.filter(qr => !qr.synced);
    const unsyncedOperational = operationalEvents.filter(oe => !oe.synced);
    
    try {
      // 1. Sincroniza com Backend Express
      addLog(t('sync.syncingBackend') || "Sincronizando com Backend Express...");
      let backendOk = false;
      try {
        await backendService.sync({
          reports: unsyncedReports,
          pending: unsyncedPending,
          qualityReports: unsyncedQualityReports,
          operationalEvents: unsyncedOperational,
          version: "4.0"
        });
        addLog(t('sync.backendOk') || "Backend Express: OK.");
        backendOk = true;
      } catch (backendError: any) {
        if (backendError.message === 'BACKEND_UNAVAILABLE') {
          addLog(t('sync.backendUnavailable') || "Aviso: Backend Express não disponível neste ambiente (Modo Cloud Direto).");
        } else {
          addLog(`${t('sync.backendError') || 'Erro Backend'}: ${backendError.message || 'Falha na conexão'}`);
          // Se for um erro real (não apenas indisponibilidade), podemos optar por parar ou continuar
          // Para SIGO v4.0, vamos tentar continuar com Google Sheets se o backend falhar
        }
      }

      // 2. Sincroniza com Google Sheets
      addLog(t('sync.syncingSheets') || "Sincronizando com Google Sheets...");
      addLog(t('sync.fetchingHistory') || "Buscando Histórico de Performance...");
      const result = await syncToGoogleSheets(scriptUrl, unsyncedReports, unsyncedPending, unsyncedQualityReports, unsyncedOperational);
      if (result.success) {
        onSyncSuccess(
          unsyncedReports.map(r => r.id), 
          unsyncedPending.map(p => p.id), 
          unsyncedQualityReports.map(qr => qr.id),
          unsyncedOperational.map(oe => oe.id)
        );
        if (onRefreshCloud) onRefreshCloud();
        addLog(t('sync.syncComplete') || "Sincronismo v4.0 Concluído.");
      } else {
        addLog(`${t('sync.sheetsFailure') || 'Falha Google Sheets'}: ${result.message}`);
      }
    } catch (error: any) {
      addLog(`${t('sync.fatalError') || 'Erro crítico'}: ${error.message || 'Erro desconhecido'}`);
      console.error(error);
    }
    setIsSyncing(false);
  };

  const handleForceCloudRefresh = async () => {
    if (!window.confirm(t('sync.clearCacheConfirm') || "Isso irá apagar seus dados locais e baixar tudo novamente da nuvem. Deseja continuar?")) return;
    
    setIsSyncing(true);
    setLogs([]);
    addLog(t('sync.forcingRefresh') || "Iniciando Limpeza de Cache e Refresh Total...");
    
    try {
      localStorage.removeItem('ultrafino_reports');
      localStorage.removeItem('ultrafino_pending');
      localStorage.removeItem('ultrafino_quality');
      localStorage.removeItem('ultrafino_operational');
      addLog(t('sync.cacheCleared') || "Cache Local Limpo.");
      
      if (onRefreshCloud) await onRefreshCloud();
      addLog(t('sync.refreshSuccess') || "Dados da Nuvem Recarregados.");
    } catch (error: any) {
      addLog(`${t('sync.refreshError') || 'Erro no Refresh'}: ${error.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const appsScriptCode = `/**
 * PLATAFORMA ULTRAFINO USINA 2 - SCRIPT DE SINCRONIZAÇÃO v4.0 (ESTÁVEL)
 * 
 * INSTRUÇÕES DE IMPLANTAÇÃO:
 * 1. No Editor de Script, clique em "Implantar" > "Nova implantação".
 * 2. Selecione o tipo "App da Web".
 * 3. Descrição: "SIGO v4.0".
 * 4. Quem pode acessar: "Qualquer pessoa" (IMPORTANTE).
 * 5. Clique em "Implantar" e COPIE O NOVO URL.
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // 1. Sincronizar Checklists
    if (data.reports && data.reports.length > 0) {
      var sheet = getOrCreateSheet(ss, "Checklists");
      data.reports.forEach(function(r) {
        if (!isIdExists(sheet, r.id)) {
          sheet.appendRow([r.id, r.data, r.hora, r.area, r.operador, r.turma, r.turno, r.itens_falha, r.obs]);
        }
      });
    }
    
    // 2. Sincronizar Pendências
    if (data.pending && data.pending.length > 0) {
      var sheet = getOrCreateSheet(ss, "Pendencias");
      data.pending.forEach(function(p) {
        var rowIdx = findRowById(sheet, p.id);
        var rowData = [p.id, p.tag, p.area, p.disciplina, p.descricao, p.prioridade, p.status, p.operador_origem, p.turma_origem, p.turno_origem, p.operador_resolucao, p.turma_resolucao, p.data, p.data_resolucao];
        if (rowIdx === -1) {
          sheet.appendRow(rowData);
        } else {
          sheet.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
        }
      });
    }
    
    // 3. Sincronizar Qualidade (Yield)
    if (data.qualityReports && data.qualityReports.length > 0) {
      var sheet = getOrCreateSheet(ss, "Qualidade");
      data.qualityReports.forEach(function(qr) {
        if (!isIdExists(sheet, qr.id)) {
          sheet.appendRow([
            qr.id, qr.data, qr.hora, qr.categoria || qr.category || "DFP2", qr.operador, qr.turma, qr.turno, qr.ply,
            qr.dfp2_c_cr, qr.dfp2_c_yield, qr.dfp2_c_reject_ash, qr.dfp2_c_conc_ash,
            qr.dfp2_d_cr, qr.dfp2_d_yield, qr.dfp2_d_reject_ash, qr.dfp2_d_conc_ash,
            qr.colunas_d_cr, qr.colunas_d_yield, qr.colunas_d_reject_ash, qr.colunas_d_conc_ash,
            qr.humidade_fundo, qr.humidade_oversize, qr.humidade_concentrado, qr.obs
          ]);
        }
      });
    }

    // 4. Sincronizar Performance (Elogios/Falhas)
    if (data.operationalEvents && data.operationalEvents.length > 0) {
      var sheet = getOrCreateSheet(ss, "Performance");
      data.operationalEvents.forEach(function(oe) {
        if (!isIdExists(sheet, oe.id)) {
          sheet.appendRow([
            oe.id, oe.data, oe.hora, oe.tipo, oe.colaborador, oe.matricula, 
            oe.equipe, oe.funcao, oe.autor, oe.autor_matricula, oe.descricao
          ]);
        }
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: true, version: "4.0"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (f) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: f.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var action = e.parameter.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (action === "getReports") {
    return fetchSheetData(ss, "Checklists");
  }
  
  if (action === "getPendencies") {
    return fetchSheetData(ss, "Pendencias");
  }
  
  if (action === "getQualityReports") {
    return fetchSheetData(ss, "Qualidade");
  }
  
  if (action === "getOperationalEvents") {
    return fetchSheetData(ss, "Performance");
  }
  
  if (action === "getStats") {
    return getStats(ss);
  }
  
  return ContentService.createTextOutput("Protocolo SIGO v4.0 Ativo").setMimeType(ContentService.MimeType.TEXT);
}

function getStats(ss) {
  var sheet = ss.getSheetByName("Checklists");
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ok:0, warning:0, fail:0, na:0, total:0})).setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  var stats = {ok:0, warning:0, fail:0, na:0, total:0};
  
  for (var i = 1; i < data.length; i++) {
    var failures = data[i][7] ? data[i][7].toString().split(",") : [];
    if (failures.length > 0) stats.fail++;
    else stats.ok++;
    stats.total++;
  }
  
  return ContentService.createTextOutput(JSON.stringify(stats)).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    var headers = {
      "Checklists": ["ID", "Data", "Hora", "Área", "Operador", "Turma", "Turno", "Itens Falha", "Observações"],
      "Pendencias": ["ID", "Tag", "Área", "Disciplina", "Descrição", "Prioridade", "Status", "Operador Origem", "Turma Origem", "Turno Origem", "Operador Resolução", "Turma Resolução", "Data Criação", "Data Resolução"],
      "Qualidade": ["ID", "Data", "Hora", "Categoria", "Operador", "Turma", "Turno", "PLY", "DFP2_C_CR", "DFP2_C_YIELD", "DFP2_C_REJECT_ASH", "DFP2_C_CONC_ASH", "DFP2_D_CR", "DFP2_D_YIELD", "DFP2_D_REJECT_ASH", "DFP2_D_CONC_ASH", "COLUNAS_D_CR", "COLUNAS_D_YIELD", "COLUNAS_D_REJECT_ASH", "COLUNAS_D_CONC_ASH", "HUM_FUNDO", "HUM_OVERSIZE", "HUM_CONC", "OBS"],
      "Performance": ["ID", "Data", "Hora", "Tipo", "Colaborador", "Matrícula", "Equipe", "Função", "Autor", "Autor Matrícula", "Descrição"]
    };
    sheet.appendRow(headers[name]);
    sheet.getRange(1, 1, 1, headers[name].length).setFontWeight("bold").setBackground("#f3f3f3");
  }
  return sheet;
}

function isIdExists(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) return true;
  }
  return false;
}

function findRowById(sheet, id) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) return i + 1;
  }
  return -1;
}

function fetchSheetData(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var results = [];
  
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var key = headers[j].toString().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ /g, "_");
      obj[key] = data[i][j];
    }
    results.push(obj);
  }
  
  return ContentService.createTextOutput(JSON.stringify(results))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{t('sync.title')}</h1>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">{t('sync.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setshowConfig(!showConfig)} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all">
            <Settings2 size={16} /> {showConfig ? t('sync.closePanel') : t('sync.configScript')}
          </button>
          <button 
            onClick={handleForceCloudRefresh}
            disabled={isSyncing}
            className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl hover:scale-105 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} /> {t('sync.forceRefresh')}
          </button>
        </div>
      </div>

      {!showConfig ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] border-2 border-slate-100 shadow-sm space-y-8">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center shadow-inner">
                    <Database size={40} className={isSyncing ? 'animate-bounce' : ''} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('sync.masterLoad')}</h2>
                  <p className="text-slate-500 text-xs font-bold uppercase leading-relaxed max-w-sm">
                    {t('sync.bidirectionalSync')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase border ${
                    testStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {testStatus === 'success' ? <Wifi size={14} /> : <WifiOff size={14} />}
                    SIGO v4.0 {testStatus === 'success' ? t('sync.online') : t('sync.offline')}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">{t('sync.localQueue')}</p>
                  <p className="text-2xl font-black text-slate-900">{reports.filter(r => !r.synced).length + pendingItems.filter(p => !p.synced).length + qualityReports.filter(qr => !qr.synced).length + operationalEvents.filter(oe => !oe.synced).length} {t('sync.items')}</p>
                </div>
                <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-600 uppercase">{t('sync.timeFidelity')}</p>
                  <p className="text-xl font-black text-slate-900 uppercase text-[10px] mt-1">{t('sync.sheetToApp')}</p>
                </div>
              </div>

              <button onClick={handleSync} disabled={isSyncing || !scriptUrl} className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-4 text-sm shadow-2xl transition-all active:scale-95 ${
                  !scriptUrl ? 'bg-slate-100 text-slate-300' : isSyncing ? 'bg-slate-900 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                }`}>
                {isSyncing ? <RefreshCw className="animate-spin" /> : <Globe />} {isSyncing ? t('sync.transmitting') : t('sync.syncButton')}
              </button>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  onClick={() => {
                    if(confirm(t('sync.restoreConfirm'))) {
                      setScriptUrl(DEFAULT_SCRIPT_URL);
                      addLog(t('sync.urlRestored'));
                    }
                  }}
                  className="py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw size={12} /> {t('sync.restoreDefault')}
                </button>
                <button 
                  onClick={() => {
                    if(confirm(t('sync.clearCacheConfirm'))) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="py-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <WifiOff size={12} /> {t('sync.clearCache')}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-8 rounded-[3rem] text-white shadow-2xl border-4 border-slate-900 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><Terminal size={16} className="text-blue-500" /> {t('sync.telemetry')}</h3>
              <Activity size={16} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="flex-grow space-y-3 font-mono text-[9px] text-slate-400 overflow-y-auto max-h-[350px] custom-scrollbar">
              {logs.length === 0 ? <p className="italic opacity-30">{t('sync.waitingTelemetry')}</p> : logs.map((log, i) => <div key={i} className="border-l-2 border-emerald-500/30 pl-3 py-1 bg-white/5">{log}</div>)}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] border-2 border-blue-100 shadow-2xl overflow-hidden animate-in slide-in-from-bottom-12 duration-500">
          {!isAdmin ? (
            <div className="p-16 text-center space-y-8">
              <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-inner"><Lock size={40} /></div>
              <h2 className="text-2xl font-black text-slate-900 uppercase">{t('sync.security')}</h2>
              <form onSubmit={(e) => { e.preventDefault(); if(password === ADMIN_PASSWORD) setIsAdmin(true); else alert(t('operationalForms.wrongPassword')); }} className="max-w-xs mx-auto space-y-4">
                <input type="password" placeholder={t('sync.adminPassword')} value={password || ''} onChange={(e) => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-center font-black focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl">{t('sync.enterAdmin')}</button>
              </form>
              <button onClick={() => setshowConfig(false)} className="text-[10px] font-black text-slate-400 uppercase">{t('sync.back')}</button>
            </div>
          ) : (
            <div className="p-12 space-y-10">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm"><ShieldCheck size={32} /></div>
                  <div><h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{t('sync.backendAdmin')}</h3><p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{t('sync.syncControl')}</p></div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={MASTER_SHEET_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl">
                    <FileSpreadsheet size={18} /> {t('sync.masterSheet')} <ExternalLink size={14} />
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(appsScriptCode); setCopySuccess(true); setTimeout(()=>setCopySuccess(false), 2000); }} className={`flex items-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all shadow-xl ${copySuccess ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                    <Code size={16} /> {copySuccess ? t('sync.copied') : t('sync.copyScript')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-2"><Terminal size={14} /> {t('sync.backendCode')}</h4>
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] border border-slate-800 shadow-inner overflow-hidden">
                    <pre className="text-[10px] text-slate-300 font-mono overflow-y-auto max-h-[400px] custom-scrollbar leading-relaxed">{appsScriptCode}</pre>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="bg-emerald-50 p-10 rounded-[3rem] border-2 border-emerald-100 space-y-8">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{t('sync.endpointLabel')}</label>
                        <button 
                          onClick={() => {
                            if(confirm(t('sync.restoreConfirm'))) {
                              setScriptUrl(DEFAULT_SCRIPT_URL);
                            }
                          }}
                          className="text-[9px] font-black text-blue-600 uppercase hover:underline"
                        >
                          {t('sync.restoreDefault')}
                        </button>
                      </div>
                      <input type="text" value={scriptUrl || ''} onChange={(e) => setScriptUrl(e.target.value)} placeholder="https://script.google.com/macros/s/..." className="w-full px-6 py-5 bg-white border-2 border-slate-200 rounded-2xl font-bold text-xs text-blue-600 focus:border-blue-500 outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleTestConnection} className="py-5 rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 bg-slate-900 text-white shadow-xl">{t('sync.validate')}</button>
                      <button onClick={async () => {
                        try {
                          const currentConfig = fullConfig || await backendService.getConfig().catch(() => ({ emailRecipients: '', emailCc: '' }));
                          await backendService.saveConfig({
                            ...currentConfig,
                            googleScriptUrl: scriptUrl
                          });
                        } catch (e) {
                          console.error('Failed to save script URL to backend', e);
                        }
                        setshowConfig(false);
                      }} className="py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] flex items-center justify-center gap-2 shadow-xl">{t('sync.saveExit')}</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SyncDashboard;
