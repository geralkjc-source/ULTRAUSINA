
import React, { useState, useMemo } from 'react';
import { 
  Award, 
  Zap, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileText,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OperationalEvent } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface PerformanceHistoryProps {
  operationalEvents: OperationalEvent[];
}

const PerformanceHistory: React.FC<PerformanceHistoryProps> = ({ operationalEvents }) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'elogio' | 'falha'>('all');

  const filteredEvents = useMemo(() => {
    return operationalEvents.filter(event => {
      const matchesSearch = 
        event.collaboratorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.collaboratorMatricula.includes(searchTerm);
      const matchesType = filterType === 'all' || event.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [operationalEvents, searchTerm, filterType]);

  const statsByCollaborator = useMemo(() => {
    const stats: Record<string, { name: string, praises: number, failures: number, balance: number }> = {};
    
    operationalEvents.forEach(event => {
      if (!stats[event.collaboratorMatricula]) {
        stats[event.collaboratorMatricula] = {
          name: event.collaboratorName,
          praises: 0,
          failures: 0,
          balance: 0
        };
      }
      
      if (event.type === 'elogio') {
        stats[event.collaboratorMatricula].praises++;
      } else {
        stats[event.collaboratorMatricula].failures++;
      }
      
      stats[event.collaboratorMatricula].balance = stats[event.collaboratorMatricula].failures - stats[event.collaboratorMatricula].praises;
    });
    
    return Object.values(stats).sort((a, b) => b.praises - a.praises);
  }, [operationalEvents]);

  const topPraised = statsByCollaborator.slice(0, 3);
  const criticalAlerts = statsByCollaborator.filter(s => s.balance >= 3).sort((a, b) => b.balance - a.balance);

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Relatório de Performance Operacional', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
    doc.text(`Filtros: Tipo: ${filterType === 'all' ? 'Todos' : filterType.toUpperCase()} | Busca: ${searchTerm || 'Nenhuma'}`, 14, 34);

    const tableData = filteredEvents.map(event => [
      format(event.timestamp, "dd/MM/yyyy"),
      event.collaboratorName,
      event.collaboratorMatricula,
      event.type.toUpperCase(),
      event.type === 'elogio' ? event.description : event.description,
      event.authorName
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['Data', 'Colaborador', 'Matrícula', 'Tipo', 'Descrição/Motivo', 'Autor']],
      body: tableData,
      headStyles: { fillStyle: 'black', textColor: 'white', fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        4: { cellWidth: 60 }
      }
    });

    doc.save(`Performance_Report_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`);
  };

  const exportToExcel = () => {
    const data = filteredEvents.map(event => ({
      'Data': format(event.timestamp, "dd/MM/yyyy HH:mm"),
      'Colaborador': event.collaboratorName,
      'Matrícula': event.collaboratorMatricula,
      'Função': event.collaboratorRole,
      'Departamento': event.collaboratorTeam,
      'Tipo': event.type.toUpperCase(),
      'Descrição/Motivo': event.description,
      'Autor': event.authorName
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Performance");
    
    // Auto-size columns
    const maxWidths = data.reduce((acc: any, row: any) => {
      Object.keys(row).forEach((key, i) => {
        const val = row[key] ? row[key].toString().length : 10;
        acc[i] = Math.max(acc[i] || 0, val);
      });
      return acc;
    }, []);
    worksheet['!cols'] = maxWidths.map((w: number) => ({ w: w + 2 }));

    XLSX.writeFile(workbook, `Performance_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors mb-2"
          >
            <ArrowLeft size={14} /> Voltar
          </button>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Histórico de Performance</h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Monitoramento de Elogios e Falhas Operacionais</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all shadow-sm border border-slate-200"
            >
              <FileText size={14} className="text-red-500" /> PDF
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 bg-white text-slate-700 px-4 py-2 rounded-xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all shadow-sm border border-slate-200"
            >
              <Download size={14} className="text-emerald-500" /> Excel
            </button>
          </div>
          <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-2">
            <Award size={18} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase leading-none">Total Elogios</span>
              <span className="text-lg font-black leading-none">{operationalEvents.filter(e => e.type === 'elogio').length}</span>
            </div>
          </div>
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-2xl border border-red-100 flex items-center gap-2">
            <Zap size={18} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase leading-none">Total Falhas</span>
              <span className="text-lg font-black leading-none">{operationalEvents.filter(e => e.type === 'falha').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Praised */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <TrendingUp size={16} className="text-emerald-500" /> Destaques Positivos
          </h2>
          <div className="space-y-3">
            {topPraised.length > 0 ? topPraised.map((stat, idx) => (
              <div key={stat.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                    {idx + 1}º
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase text-slate-800 truncate max-w-[120px]">{stat.name}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">Saldo: {stat.praises - stat.failures}</span>
                  </div>
                </div>
                <div className="bg-emerald-500 text-white px-2 py-1 rounded-md text-[10px] font-black">
                  {stat.praises}
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-[10px] font-bold uppercase text-center py-4">Nenhum registro</p>
            )}
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 shadow-sm space-y-4">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Risco de Advertência
          </h2>
          <div className="space-y-3">
            {criticalAlerts.length > 0 ? criticalAlerts.map((stat) => (
              <div key={stat.name} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500 text-white rounded-lg flex items-center justify-center">
                    <Zap size={14} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black uppercase text-amber-900 truncate max-w-[120px]">{stat.name}</span>
                    <span className="text-[9px] font-bold text-amber-600 uppercase">Saldo Crítico: {stat.balance}</span>
                  </div>
                </div>
                <div className="bg-amber-600 text-white px-2 py-1 rounded-md text-[10px] font-black animate-pulse">
                  ALERTA
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-4 text-slate-400">
                <TrendingDown size={24} className="mb-2 opacity-20" />
                <p className="text-[10px] font-bold uppercase">Nenhum colaborador em risco</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Filter/Search */}
        <div className="bg-slate-900 p-6 rounded-[2rem] shadow-xl space-y-4 text-white">
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
            <Filter size={16} className="text-blue-400" /> Filtros Rápidos
          </h2>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input 
                type="text" 
                placeholder="BUSCAR COLABORADOR..." 
                value={searchTerm || ''}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none font-black uppercase text-[10px] focus:border-blue-500 transition-all"
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterType('all')}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filterType === 'all' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('elogio')}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filterType === 'elogio' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
              >
                Elogios
              </button>
              <button 
                onClick={() => setFilterType('falha')}
                className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${filterType === 'falha' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}
              >
                Falhas
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Registos de Performance</h2>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-white px-3 py-1 rounded-full border border-slate-100">
            {filteredEvents.length} Encontrados
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredEvents.length > 0 ? filteredEvents.map((event) => (
            <div key={event.id} className="p-6 hover:bg-slate-50 transition-colors group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${event.type === 'elogio' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {event.type === 'elogio' ? <Award size={20} /> : <Zap size={20} />}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{event.collaboratorName}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">{event.collaboratorMatricula}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <User size={12} />
                        <span className="text-[10px] font-bold uppercase">{event.collaboratorRole} | {event.collaboratorTeam}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar size={12} />
                        <span className="text-[10px] font-bold uppercase">
                          {format(event.timestamp, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-2 line-clamp-2 uppercase">
                      {event.description}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${event.type === 'elogio' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {event.type}
                  </div>
                  <div className="flex items-center gap-1 text-slate-400 text-[9px] font-bold uppercase">
                    Registado por: <span className="text-slate-600">{event.authorName}</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Search size={48} className="mb-4 opacity-10" />
              <p className="text-xs font-black uppercase tracking-widest">Nenhum registo encontrado</p>
              <button 
                onClick={() => { setSearchTerm(''); setFilterType('all'); }}
                className="mt-4 text-blue-500 hover:text-blue-600 font-black uppercase text-[10px] tracking-widest"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceHistory;
