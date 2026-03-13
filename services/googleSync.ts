
import { Report, PendingItem, Area, QualityReport, OperationalEvent } from '../types';

// Endpoint oficial v4.0
export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwD-nOQcYQkk__x5ZBuX2dE6PsQopSAZyrXyDOTlA13Re1e7Km6eL88oby_HcSuLHQ/exec'; 
export const MASTER_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1HjhTUldjn8Kk9mVF8GMw7ZQoPbqspMhqGV7OM5TPCTY/edit';

export interface SyncResponse {
  success: boolean;
  message: string;
}

export interface CloudStats {
  ok: number;
  warning: number;
  fail: number;
  na: number;
  total: number;
}

/**
 * Vulcan Date Parser v4.0 - Spreadsheet Priority
 * Captura EXATAMENTE o que está na planilha, seja objeto Date ou String.
 * NÃO utiliza Date.now() se o valor da nuvem for válido.
 */
const parseDateFromCloud = (dateVal: any): number => {
  if (!dateVal || dateVal === '-' || dateVal === 'undefined' || dateVal === 'null' || dateVal === '') return 0;
  
  // Se já for um objeto Date
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal.getTime();
  
  // Se for um timestamp numérico direto (ms)
  if (typeof dateVal === 'number' && dateVal > 1700000000000) return dateVal;

  // Se for um número pequeno (serial date do Google Sheets)
  if (typeof dateVal === 'number' && dateVal > 40000 && dateVal < 60000) {
    return Math.floor((dateVal - 25569) * 86400 * 1000);
  }

  try {
    const s = dateVal.toString().trim();
    
    // Se for um ISO string (YYYY-MM-DDTHH:mm:ss...)
    if (s.includes('T') && !isNaN(Date.parse(s))) {
      const parsed = Date.parse(s);
      const d = new Date(parsed);
      // Se o ano for 1899 ou 1900, é apenas uma hora vinda do Sheets
      if (d.getFullYear() < 1970) {
          return (d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()) * 1000;
      }
      return parsed;
    }

    // Tenta extrair data (DD/MM/YYYY ou YYYY-MM-DD) e hora (HH:mm:ss)
    const brDateMatch = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    const isoDateMatch = s.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    const timeMatch = s.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);

    let year = 0, month = 0, day = 0;
    let hasDate = false;

    if (brDateMatch) {
      day = parseInt(brDateMatch[1]);
      month = parseInt(brDateMatch[2]) - 1;
      year = parseInt(brDateMatch[3]);
      hasDate = true;
    } else if (isoDateMatch) {
      year = parseInt(isoDateMatch[1]);
      month = parseInt(isoDateMatch[2]) - 1;
      day = parseInt(isoDateMatch[3]);
      hasDate = true;
    }

    let hour = 0, min = 0, sec = 0;
    let hasTime = false;
    if (timeMatch) {
      hour = parseInt(timeMatch[1]);
      min = parseInt(timeMatch[2]);
      sec = parseInt(timeMatch[3] || '0');
      hasTime = true;
    }

    if (hasDate) {
      const d = new Date(year, month, day, hasTime ? hour : 12, min, sec);
      if (!isNaN(d.getTime())) return d.getTime();
    } else if (hasTime) {
      return (hour * 3600 + min * 60 + sec) * 1000;
    }

    const standardParse = Date.parse(s);
    if (!isNaN(standardParse)) return standardParse;
  } catch (e) {
    return 0;
  }
  return 0;
};

const sanitize = (str: any) => (str || '').toString().replace(/[\u0000-\u001F\u007F-\u009F]/g, "").trim().toUpperCase();

/**
 * Busca valor em objeto de forma insensível a maiúsculas/minúsculas
 */
const getCloudValue = (obj: any, ...keys: string[]): any => {
  if (!obj) return undefined;
  for (const key of keys) {
    const targetKey = key.trim().toLowerCase();
    // Tenta exato
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') return obj[key];
    // Tenta case-insensitive e trim
    const foundKey = Object.keys(obj).find(k => k.trim().toLowerCase() === targetKey);
    if (foundKey && obj[foundKey] !== undefined && obj[foundKey] !== null && obj[foundKey] !== '') return obj[foundKey];
  }
  return undefined;
};

export const testScriptConnection = async (url: string): Promise<{success: boolean, message: string, details?: string}> => {
  if (!url || !url.startsWith('https://script.google.com')) return { success: false, message: "URL inválida." };
  try {
    // Teste 1: Handshake Simples
    const response = await fetch(`${url}?action=test&t=${Date.now()}`, { method: 'GET' }).catch(() => null);
    if (!response) return { success: false, message: "Script Inacessível (CORS/Rede)." };
    
    const text = await response.text();
    const isV4 = text.includes("v4") || text.includes("v3.2") || text.includes("v3");
    
    // Teste 2: Verificar se as ações de leitura estão respondendo (opcional mas útil)
    const testAction = await fetch(`${url}?action=getStats&t=${Date.now()}`).catch(() => null);
    const actionsOk = testAction && testAction.ok;

    if (isV4 && actionsOk) {
      return { success: true, message: "Protocolo Vulcan v4.0 Totalmente Ativo!" };
    } else if (isV4) {
      return { success: true, message: "Script v4.0 Detectado (Ações Limitadas)." };
    } else {
      return { success: false, message: "Script v4.0 Requerido.", details: "O script atual parece ser uma versão antiga ou incompatível." };
    }
  } catch (error) { 
    return { success: false, message: "Falha de conexão.", details: "Verifique se o script está publicado como 'Qualquer pessoa'." }; 
  }
};

export const syncToGoogleSheets = async (
  scriptUrl: string, 
  reports: Report[], 
  pending: PendingItem[],
  qualityReports: QualityReport[],
  operationalEvents: OperationalEvent[] = []
): Promise<SyncResponse> => {
  if (!scriptUrl) return { success: false, message: "URL ausente." };
  try {
    const now = new Date();
    const mesRef = `${(now.getMonth() + 1).toString().padStart(2, '0')}_${now.getFullYear()}`;
    
    const formatForSheet = (ts: number, turno?: string) => {
      if (!ts || ts === 0) return { date: '-', time: '-' };
      const d = new Date(ts);
      const h = d.getHours();
      
      // Ajuste operacional para o turno da NOITE (22h - 06h)
      // Se for entre 00h e 06h, operacionalmente pertence ao dia anterior
      const opDate = new Date(d);
      if (turno === 'NOITE' && h < 6) {
        opDate.setDate(opDate.getDate() - 1);
      }

      const day = opDate.getDate().toString().padStart(2, '0');
      const month = (opDate.getMonth() + 1).toString().padStart(2, '0');
      const year = opDate.getFullYear();
      const hour = d.getHours().toString().padStart(2, '0');
      const min = d.getMinutes().toString().padStart(2, '0');
      return { date: `${day}/${month}/${year}`, time: `${hour}:${min}` };
    };

    const payload = {
      action: "sync",
      version: "4.0",
      mes_referencia: mesRef,
      reports: (reports || []).map(r => {
        const fmt = formatForSheet(r.timestamp, r.turno);
        return {
          id: r.id,
          data: fmt.date,
          hora: fmt.time,
          area: r.area,
          operador: sanitize(r.operator),
          turma: r.turma,
          turno: r.turno,
          itens_falha: r.items.filter(i => i.status === 'fail' || i.status === 'warning').map(i => sanitize(i.label)).join(', '),
          obs: sanitize(r.generalObservations)
        };
      }),
      pending: (pending || []).map(p => {
        const fmt = formatForSheet(p.timestamp, p.turno);
        const fmtRes = p.resolvedAt ? formatForSheet(p.resolvedAt, p.resolvedByTurma ? 'NOITE' : undefined) : null; // Simplificado, idealmente teríamos o turno da resolução
        return {
          id: p.id,
          tag: sanitize(p.tag),
          area: p.area,
          disciplina: sanitize(p.discipline),
          descricao: sanitize(p.description),
          prioridade: sanitize(p.priority),
          status: sanitize(p.status),
          operador_origem: sanitize(p.operator),
          turma_origem: p.turma,
          turno_origem: sanitize(p.turno),
          operador_resolucao: sanitize(p.resolvedBy || '-'),
          turma_resolucao: sanitize(p.resolvedByTurma || '-'),
          data: `${fmt.date} ${fmt.time}`,
          data_resolucao: fmtRes ? `${fmtRes.date} ${fmtRes.time}` : '-'
        };
      }),
      qualityReports: (qualityReports || []).map(qr => {
        const fmt = formatForSheet(qr.timestamp, qr.turno);
        return {
          id: qr.id,
          data: fmt.date,
          hora: fmt.time,
          categoria: qr.category,
          operador: sanitize(qr.operator),
          turma: qr.turma,
          turno: qr.turno,
          ply: sanitize(qr.ply),
          dfp2_c_cr: qr.dfp2_c_cr,
          dfp2_c_yield: qr.dfp2_c_yield,
          dfp2_c_reject_ash: qr.dfp2_c_reject_ash,
          dfp2_c_conc_ash: qr.dfp2_c_conc_ash,
          dfp2_d_cr: qr.dfp2_d_cr,
          dfp2_d_yield: qr.dfp2_d_yield,
          dfp2_d_reject_ash: qr.dfp2_d_reject_ash,
          dfp2_d_conc_ash: qr.dfp2_d_conc_ash,
          colunas_d_cr: qr.colunas_d_cr,
          colunas_d_yield: qr.colunas_d_yield,
          colunas_d_reject_ash: qr.colunas_d_reject_ash,
          colunas_d_conc_ash: qr.colunas_d_conc_ash,
          humidade_fundo: qr.humidade_fundo,
          humidade_oversize: qr.humidade_oversize,
          humidade_concentrado: qr.humidade_concentrado,
          obs: sanitize(qr.generalObservations)
        };
      }),
      operationalEvents: (operationalEvents || []).map(oe => {
        const fmt = formatForSheet(oe.timestamp); // Eventos operacionais geralmente usam data real
        return {
          id: oe.id,
          data: fmt.date,
          hora: fmt.time,
          tipo: oe.type.toUpperCase(),
          colaborador: sanitize(oe.collaboratorName),
          matricula: oe.collaboratorMatricula,
          equipe: sanitize(oe.collaboratorTeam),
          funcao: sanitize(oe.collaboratorRole),
          autor: sanitize(oe.authorName),
          autor_matricula: oe.authorMatricula,
          descricao: sanitize(oe.description),
          detalhes: oe.details ? JSON.stringify(oe.details) : ''
        };
      })
    };
    await fetch(scriptUrl, { method: 'POST', mode: 'no-cors', cache: 'no-cache', body: JSON.stringify(payload) });
    return { success: true, message: "Sincronizado!" };
  } catch (error) { return { success: false, message: "Erro de Transmissão." }; }
};

export const fetchCloudItems = async (scriptUrl: string): Promise<PendingItem[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getPendencies&t=${Date.now()}`);
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    
    return data.map((item: any): PendingItem => {
      const statusText = (getCloudValue(item, 'status') || '').toUpperCase();
      const isResolved = statusText === 'RESOLVIDO' || statusText === 'CONCLUÍDO';
      const turno = (getCloudValue(item, 'turno_origem', 'turno') || 'MANHÃ') as any;
      
      // PRIORIDADE TOTAL PARA OS DADOS DA PLANILHA
      const rawDate = getCloudValue(item, 'data_criacao', 'data', 'timestamp');
      let sheetTimestamp = parseDateFromCloud(rawDate);
      
      // Ajuste reverso do "Dia Operacional" para reconstruir o timestamp real
      if (sheetTimestamp && turno === 'NOITE') {
        const d = new Date(sheetTimestamp);
        if (d.getHours() < 6) {
          // Se na planilha está como NOITE e hora < 6, o sync original subtraiu 1 dia.
          // Precisamos somar 1 dia para ter o timestamp real.
          sheetTimestamp += 24 * 3600 * 1000;
        }
      }

      // Fallback para o ID se a data falhar
      const id = item.id || '';
      if (!sheetTimestamp && id.includes('-')) {
          const tsPart = id.split('-')[1];
          if (tsPart && !isNaN(parseInt(tsPart)) && parseInt(tsPart) > 1700000000000) {
              sheetTimestamp = parseInt(tsPart);
          }
      }

      const sheetResolvedAt = parseDateFromCloud(getCloudValue(item, 'data_resolucao', 'resolvido_em'));

      return {
        id: id || `cl-${Date.now()}`,
        tag: sanitize(getCloudValue(item, 'tag')),
        area: getCloudValue(item, 'area') as Area,
        discipline: sanitize(getCloudValue(item, 'disciplina')) as any,
        description: sanitize(getCloudValue(item, 'descricao')),
        priority: (getCloudValue(item, 'prioridade') || 'baixa').toLowerCase() as any,
        status: isResolved ? 'resolvido' : 'aberto',
        operator: sanitize(getCloudValue(item, 'operador_origem', 'operador')),
        turma: getCloudValue(item, 'turma_origem', 'turma') || 'A',
        turno: turno,
        resolvedBy: getCloudValue(item, 'operador_resolucao') !== '-' ? sanitize(getCloudValue(item, 'operador_resolucao')) : undefined,
        resolvedByTurma: getCloudValue(item, 'turma_resolucao') !== '-' ? (getCloudValue(item, 'turma_resolucao') as any) : undefined,
        resolvedAt: sheetResolvedAt || undefined, 
        timestamp: sheetTimestamp || Date.now(),
        synced: true
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) { return []; }
};

export const fetchCloudReports = async (scriptUrl: string): Promise<Report[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getReports&t=${Date.now()}`);
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data.map((r: any): Report => {
      const dateRaw = getCloudValue(r, 'data', 'date') || '';
      const hourRaw = getCloudValue(r, 'hora', 'time') || '';
      const turno = (getCloudValue(r, 'turno', 'shift') || 'MANHÃ') as any;
      
      let sheetTimestamp = 0;
      if (dateRaw) {
          const datePart = parseDateFromCloud(dateRaw);
          const timePart = hourRaw ? parseDateFromCloud(hourRaw) : (12 * 3600 * 1000);
          
          if (timePart < 86400000 && datePart > 86400000) {
              const d = new Date(datePart);
              d.setHours(0, 0, 0, 0);
              sheetTimestamp = d.getTime() + timePart;
              
              // Ajuste reverso do "Dia Operacional" para reconstruir o timestamp real
              if (turno === 'NOITE' && new Date(sheetTimestamp).getHours() < 6) {
                sheetTimestamp += 24 * 3600 * 1000;
              }
          } else {
              sheetTimestamp = datePart || Date.now();
          }
      }

      const id = getCloudValue(r, 'id_ref', 'id') || '';
      // Fallback para o ID se a data falhar
      if (!sheetTimestamp && id.startsWith('rep-')) {
          const tsPart = id.split('-')[1];
          if (tsPart && !isNaN(parseInt(tsPart)) && parseInt(tsPart) > 1700000000000) {
              sheetTimestamp = parseInt(tsPart);
          }
      }

      const failures = (getCloudValue(r, 'falhas', 'itens_falha', 'itens_com_falha') || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      const items = failures.map((f: string, i: number) => ({
        id: `fail-${i}`,
        label: f,
        status: 'fail' as const,
        observation: 'FALHA IMPORTADA DA PLANILHA'
      }));

      return {
        id: id || `rep-${Date.now()}-${Math.random()}`,
        timestamp: sheetTimestamp || Date.now(),
        area: getCloudValue(r, 'area') as Area,
        operator: sanitize(getCloudValue(r, 'operador', 'operator')),
        turma: (getCloudValue(r, 'turma', 'team') || 'A') as any,
        turno: turno,
        items: items,
        pendingItems: [],
        generalObservations: sanitize(getCloudValue(r, 'observacoes', 'obs', 'observations')),
        synced: true
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) { return []; }
};

export const fetchCloudData = async (scriptUrl: string): Promise<CloudStats | null> => {
  if (!scriptUrl) return null;
  try {
    const response = await fetch(`${scriptUrl}?action=getStats&t=${Date.now()}`).catch(() => null);
    if (!response || !response.ok) return null;
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return null;
    return await response.json();
  } catch (error) { return null; }
};

export const fetchCloudQualityReports = async (scriptUrl: string): Promise<QualityReport[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getQualityReports&t=${Date.now()}`);
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    // 1. Parse all rows into a temporary structure, keeping only non-empty fields
    const allReports = data.map((qr: any) => {
      const dateRaw = getCloudValue(qr, 'data', 'date') || '';
      const hourRaw = getCloudValue(qr, 'hora', 'time') || '';
      const turno = (getCloudValue(qr, 'turno', 'shift') || 'MANHÃ') as any;
      
      let sheetTimestamp = 0;
      if (dateRaw) {
          const datePart = parseDateFromCloud(dateRaw);
          const timePart = hourRaw ? parseDateFromCloud(hourRaw) : (12 * 3600 * 1000);
          
          if (timePart < 86400000 && datePart > 86400000) {
              const d = new Date(datePart);
              d.setHours(0, 0, 0, 0);
              sheetTimestamp = d.getTime() + timePart;

              // Ajuste reverso do "Dia Operacional" para reconstruir o timestamp real
              if (turno === 'NOITE' && new Date(sheetTimestamp).getHours() < 6) {
                sheetTimestamp += 24 * 3600 * 1000;
              }
          } else {
              sheetTimestamp = datePart || Date.now();
          }
      }

      const report: any = {
        timestamp: sheetTimestamp || Date.now(),
        category: (() => {
          const cat = (getCloudValue(qr, 'categoria', 'category') || 'DFP2');
          if (cat === 'COLUNAS D' || cat === 'COLUNAS_D') return 'COLUNAS_D';
          if (cat === 'HUMIDADE E PLY' || cat === 'HUMIDADE_PLY' || cat === 'HUMIDADE') return 'HUMIDADE_PLY';
          
          // Detecção por campos se a categoria for genérica (DFP2)
          if (cat.includes('DFP2') || cat.includes('DFP 2') || cat === 'DFP2') {
            // Se tiver campos de Colunas D, assume Colunas D
            if (
              (getCloudValue(qr, 'colunas_d_cr') !== undefined) ||
              (getCloudValue(qr, 'colunas_d_yield') !== undefined)
            ) return 'COLUNAS_D';

            // Se tiver campos de Humidade, assume Humidade
            if (
              (getCloudValue(qr, 'humidade_fundo') !== undefined) ||
              (getCloudValue(qr, 'hum_fundo') !== undefined) ||
              (getCloudValue(qr, 'ply') !== undefined)
            ) return 'HUMIDADE_PLY';

            // Diferenciação DFP2 C vs D
            if (
              (getCloudValue(qr, 'dfp2_c_cr') !== undefined) ||
              (getCloudValue(qr, 'dfp2_c_yield') !== undefined)
            ) return 'DFP2_C';
            
            if (
              (getCloudValue(qr, 'dfp2_d_cr') !== undefined) ||
              (getCloudValue(qr, 'dfp2_d_yield') !== undefined)
            ) return 'DFP2_D';
          }
          
          return cat as any;
        })(),
        area: (getCloudValue(qr, 'area') || 'DFP 2') as Area,
        operator: sanitize(getCloudValue(qr, 'operador', 'operator')),
        turma: (getCloudValue(qr, 'turma', 'team') || 'A') as any,
        turno: turno,
      };

      // Only include fields if they have data
      const fields = [
        'ply', 'dfp2_c_cr', 'dfp2_c_yield', 'dfp2_c_reject_ash', 'dfp2_c_conc_ash',
        'dfp2_d_cr', 'dfp2_d_yield', 'dfp2_d_reject_ash', 'dfp2_d_conc_ash',
        'colunas_d_cr', 'colunas_d_yield', 'colunas_d_reject_ash', 'colunas_d_conc_ash',
        'humidade_fundo', 'humidade_oversize', 'humidade_concentrado'
      ];

      fields.forEach(field => {
        let val = getCloudValue(qr, field);
        
        // Fallback para nomes alternativos de colunas (legado ou variações de header)
        if (val === undefined || val === null || val === '') {
          if (field === 'humidade_fundo') val = getCloudValue(qr, 'hum_fundo', 'humidade fundo');
          else if (field === 'humidade_oversize') val = getCloudValue(qr, 'hum_oversize', 'humidade oversize');
          else if (field === 'humidade_concentrado') val = getCloudValue(qr, 'hum_conc', 'humidade concentrado');
          else if (field === 'dfp2_c_cr') val = getCloudValue(qr, 'dfp2 c cr', 'c_cr');
          else if (field === 'dfp2_d_cr') val = getCloudValue(qr, 'dfp2 d cr', 'd_cr');
        }

        if (val !== undefined && val !== null && val !== '') {
          report[field] = typeof val === 'number' ? val : sanitize(val);
        }
      });

      return report;
    });

    // 2. Group by category
    const grouped = allReports.reduce((acc, report) => {
      const key = report.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(report);
      return acc;
    }, {} as Record<string, any[]>);

    // 3. Merge for each category
    const mergedReports: QualityReport[] = [];

    for (const cat in grouped) {
      const reports = grouped[cat].sort((a, b) => a.timestamp - b.timestamp);

      // Initial state - Stable ID based on category to prevent duplicates in merge
      let state: any = {
        id: `qr-stable-${cat}`, 
        timestamp: 0,
        category: cat,
        area: 'DFP 2',
        operator: '',
        turma: 'A',
        turno: 'MANHÃ',
        generalObservations: '',
        synced: true
      };

      for (const report of reports) {
        // Only update if the new report is newer or equal
        if (report.timestamp >= state.timestamp) {
          state.timestamp = report.timestamp;
          state.area = report.area || state.area;
          state.operator = report.operator || state.operator;
          state.turma = report.turma || state.turma;
          state.turno = report.turno || state.turno;
        }
        
        // Merge fields (latest value for each field across all rows of this category)
        Object.keys(report).forEach(key => {
          if (report[key] !== undefined && report[key] !== null && report[key] !== '' && key !== 'timestamp' && key !== 'category' && key !== 'id') {
            state[key] = report[key];
          }
        });
      }
      mergedReports.push(state);
    }

    return mergedReports;
  } catch (error) { return []; }
};

export const fetchCloudOperationalEvents = async (scriptUrl: string): Promise<OperationalEvent[]> => {
  if (!scriptUrl) return [];
  try {
    const response = await fetch(`${scriptUrl}?action=getOperationalEvents&t=${Date.now()}`);
    if (!response.ok) return [];
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map((oe: any): OperationalEvent => {
      const dateRaw = getCloudValue(oe, 'data', 'date') || '';
      const hourRaw = getCloudValue(oe, 'hora', 'time') || '';
      
      let sheetTimestamp = 0;
      if (dateRaw) {
          const datePart = parseDateFromCloud(dateRaw);
          const timePart = hourRaw ? parseDateFromCloud(hourRaw) : (12 * 3600 * 1000);
          
          if (timePart < 86400000 && datePart > 86400000) {
              const d = new Date(datePart);
              d.setHours(0, 0, 0, 0);
              sheetTimestamp = d.getTime() + timePart;
          } else {
              sheetTimestamp = datePart || Date.now();
          }
      }

      return {
        id: getCloudValue(oe, 'id') || `oe-${Date.now()}-${Math.random()}`,
        timestamp: sheetTimestamp || Date.now(),
        type: (getCloudValue(oe, 'tipo', 'type') || 'ELOGIO').toLowerCase() as any,
        collaboratorName: sanitize(getCloudValue(oe, 'colaborador', 'collaborator')),
        collaboratorMatricula: getCloudValue(oe, 'matricula', 'id_number'),
        collaboratorTeam: sanitize(getCloudValue(oe, 'equipe', 'team')),
        collaboratorRole: sanitize(getCloudValue(oe, 'funcao', 'role')),
        authorName: sanitize(getCloudValue(oe, 'autor', 'author')),
        authorMatricula: getCloudValue(oe, 'autor_matricula'),
        description: sanitize(getCloudValue(oe, 'descricao', 'description')),
        synced: true
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) { return []; }
};
