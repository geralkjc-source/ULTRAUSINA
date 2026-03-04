
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  CloudSun,
  Coffee,
  Star,
  Activity
} from 'lucide-react';
import { SHIFT_DATA_2026 } from '../services/shiftService';

const ShiftCalendar: React.FC = () => {
  const navigate = useNavigate();
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const weekDaysShort = ["D", "S", "T", "Q", "Q", "S", "S"];
  const [currentMonthIdx, setCurrentMonthIdx] = useState(new Date().getMonth());
  const year = 2026;

  const monthKeys = [
    "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06",
    "2026-07", "2026-08", "2026-09", "2026-10", "2026-11", "2026-12"
  ];
  const monthKey = monthKeys[currentMonthIdx];

  const daysInMonth = new Date(year, currentMonthIdx + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, currentMonthIdx, 1).getDay();

  const getTurmaColor = (turma: string, isOff: boolean = false) => {
    if (!turma || turma === ' ') return 'bg-slate-100 text-slate-300 border-slate-200';
    
    switch (turma?.toUpperCase()) {
      case 'A': return isOff ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 'bg-yellow-400 text-slate-900 border-yellow-500';
      case 'B': return isOff ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-orange-500 text-white border-orange-600';
      case 'C': return isOff ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-emerald-500 text-white border-emerald-600';
      case 'D': return isOff ? 'bg-sky-100 text-sky-700 border-sky-200' : 'bg-sky-500 text-white border-sky-600';
      default: return 'bg-slate-200 text-slate-400 border-slate-300';
    }
  };

  const getShiftForDay = (day: number) => {
    const data = SHIFT_DATA_2026[monthKey];
    if (!data) return null;
    return {
      morning: data.morning.replace(/\s/g, '')[day - 1],
      afternoon: data.afternoon.replace(/\s/g, '')[day - 1],
      night: data.night.replace(/\s/g, '')[day - 1],
      off: data.off.replace(/\s/g, '')[day - 1],
    };
  };

  const handlePrevMonth = () => setCurrentMonthIdx(prev => (prev > 0 ? prev - 1 : 11));
  const handleNextMonth = () => setCurrentMonthIdx(prev => (prev < 11 ? prev + 1 : 0));

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500 px-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-black uppercase text-[10px] tracking-widest transition-colors">
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="text-right">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase flex items-center justify-end gap-3">
            <Activity className="text-blue-600" size={32} />
            Escala 2026
          </h1>
          <p className="text-slate-400 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Sincronizado com Anexo de Março</p>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border-2 border-slate-100 shadow-2xl overflow-hidden">
        <div className="p-8 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-6 border-b-8 border-blue-600">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg">
              <CalendarIcon size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight leading-none">{months[currentMonthIdx]}</h2>
              <p className="text-blue-400 text-[11px] font-black uppercase tracking-[0.3em] mt-2">Calendário Operacional {year}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handlePrevMonth} className="p-4 hover:bg-white/10 rounded-2xl transition-all border-2 border-white/5 bg-white/5"><ChevronLeft size={28} /></button>
            <button onClick={handleNextMonth} className="p-4 hover:bg-white/10 rounded-2xl transition-all border-2 border-white/5 bg-white/5"><ChevronRight size={28} /></button>
          </div>
        </div>

        <div className="p-4 sm:p-8 overflow-x-auto custom-scrollbar">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 mb-6 px-2">
              {weekDaysShort.map((day, i) => (
                <div key={i} className={`text-center text-xs font-black uppercase py-2 tracking-widest ${i === 0 || i === 6 ? 'text-red-500' : 'text-slate-400'}`}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-[2.5rem] overflow-hidden border-2 border-slate-200">
              {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                <div key={`empty-${i}`} className="bg-slate-50/50 h-44" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const shifts = getShiftForDay(day);
                const isToday = new Date().getDate() === day && new Date().getMonth() === currentMonthIdx && new Date().getFullYear() === year;

                return (
                  <div 
                    key={day} 
                    className={`bg-white h-44 p-3 flex flex-col relative transition-all duration-300 ${
                      isToday 
                        ? 'bg-blue-50/90 ring-[6px] ring-blue-600 ring-inset z-10 shadow-2xl' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all ${
                        isToday ? 'bg-blue-600 text-white shadow-xl scale-110' : 'text-slate-400'
                      }`}>
                        {day}
                      </span>
                      {isToday && (
                        <div className="flex flex-col items-end animate-bounce">
                          <span className="text-[8px] font-black bg-blue-600 text-white px-3 py-1 rounded-full tracking-widest shadow-lg">HOJE</span>
                          <Star size={12} className="text-blue-600 mt-1 fill-blue-600" />
                        </div>
                      )}
                    </div>

                    {shifts && (
                      <div className="space-y-1 mt-auto">
                        <div className="flex items-center justify-between">
                          <Sun size={10} className="text-yellow-500 shrink-0" />
                          <span className="text-[7px] font-black text-slate-400 uppercase ml-1 mr-auto">06-14</span>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${getTurmaColor(shifts.morning)}`}>
                            {shifts.morning}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <CloudSun size={10} className="text-orange-500 shrink-0" />
                          <span className="text-[7px] font-black text-slate-400 uppercase ml-1 mr-auto">14-22</span>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${getTurmaColor(shifts.afternoon)}`}>
                            {shifts.afternoon}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <Moon size={10} className="text-indigo-600 shrink-0" />
                          <span className="text-[7px] font-black text-slate-400 uppercase ml-1 mr-auto">22-06</span>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${getTurmaColor(shifts.night)}`}>
                            {shifts.night}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 mt-1">
                          <Coffee size={10} className="text-slate-400 shrink-0" />
                          <span className="text-[7px] font-black text-slate-400 uppercase ml-1 mr-auto">OFF</span>
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border ${getTurmaColor(shifts.off, true)}`}>
                            {shifts.off}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Equipe A', color: 'bg-yellow-400', desc: 'Amarelo' },
          { label: 'Equipe B', color: 'bg-orange-500', desc: 'Laranja' },
          { label: 'Equipe C', color: 'bg-emerald-500', desc: 'Verde' },
          { label: 'Equipe D', color: 'bg-sky-500', desc: 'Azul' },
        ].map(t => (
          <div key={t.label} className="bg-white p-6 rounded-[2rem] border-2 border-slate-100 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-2xl ${t.color} flex items-center justify-center font-black text-white border shadow-lg`}>
              {t.label.split(' ')[1]}
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 uppercase tracking-tight">{t.label}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShiftCalendar;
