
export enum Area {
  DFP2 = 'DFP 2',
  BOMBEAMENTO = 'BOMBEAMENTO',
  ESPESADORES = 'ESPESADORES E REAGENTES',
  HBF_C = 'HBF-COLUNAS C',
  HBF_D = 'HBF- COLUNAS D'
}

export type Turma = 'A' | 'B' | 'C' | 'D';
export type Turno = 'MANHÃ' | 'TARDE' | 'NOITE';
export type Discipline = 'MECÂNICA' | 'ELÉTRICA' | 'INSTRUMENTAÇÃO' | 'OPERAÇÃO';
export type QualityCategory = 'DFP2' | 'DFP2_C' | 'DFP2_D' | 'COLUNAS_D' | 'HUMIDADE_PLY';

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  status: 'ok' | 'fail' | 'na' | 'warning';
  observation?: string;
  discipline?: Discipline; // Disciplina sugerida ou selecionada
  comments?: Comment[];
}

export interface Report {
  id: string;
  timestamp: number;
  area: Area;
  operator: string;
  matricula?: string;
  turma: Turma;
  turno: Turno;
  items: ChecklistItem[];
  pendingItems: PendingItem[];
  generalObservations: string;
  synced?: boolean;
}

export interface PendingItem {
  id: string;
  tag: string;
  description: string;
  priority: 'baixa' | 'media' | 'alta';
  discipline: Discipline; // Nova categorização
  status: 'aberto' | 'resolvido';
  area: Area;
  timestamp: number;
  operator: string;
  turma: Turma;
  turno: Turno; // Adicionado para suporte a planilhas por turno
  comments?: Comment[];
  synced?: boolean;
  resolvedBy?: string;
  resolvedByTurma?: Turma;
  resolvedAt?: number; // Data/Hora da resolução
  sourceReportId?: string;
}

export interface QualityReport {
  id: string;
  timestamp: number;
  area: Area;
  operator: string;
  turma: Turma;
  turno: Turno;
  category: QualityCategory;
  ply?: string;
  dfp2_c_cr?: number;
  dfp2_c_yield?: number;
  dfp2_c_reject_ash?: number;
  dfp2_c_conc_ash?: number;
  dfp2_d_cr?: number;
  dfp2_d_yield?: number;
  dfp2_d_reject_ash?: number;
  dfp2_d_conc_ash?: number;
  colunas_d_cr?: number;
  colunas_d_yield?: number;
  colunas_d_reject_ash?: number;
  colunas_d_conc_ash?: number;
  humidade_fundo?: number;
  humidade_oversize?: number;
  humidade_concentrado?: number;
  generalObservations: string;
  synced?: boolean;
}

export interface OperationalEvent {
  id: string;
  timestamp: number;
  type: 'elogio' | 'falha';
  collaboratorName: string;
  collaboratorMatricula: string;
  collaboratorTeam: string;
  collaboratorRole: string;
  authorName: string;
  authorMatricula: string;
  description: string;
  details?: any; // Para guardar campos específicos do formulário
  synced?: boolean;
}
