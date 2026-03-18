
import { Turma, Turno } from '../types';

interface DayScale {
  morning: Turma;
  afternoon: Turma;
  night: Turma;
  off: Turma;
}

/**
 * Escala Oficial Vulcan Ultrafino Usina 2 2026
 * Transcrita fielmente do anexo (Jan-Jun) e projetada para Jul-Dez
 */
export const SHIFT_DATA_2026: Record<string, { morning: string; afternoon: string; night: string; off: string }> = {
  "2026-01": {
    morning:   "CDDDAAABBBCCCDDDAAABBBCCCDDDAAA",
    afternoon: "AAABBBCCCDDDAAABBBCCCDDDAAABBBC",
    night:     "BCCCDDDAAABBBCCCDDDAAABBBCCCDDD",
    off:       "DBBACCBDDCAADBBACCBDDCAADBBACCB" 
  },
  "2026-02": {
    morning:   "BBBCCCDDDAAABBBCCCDDDAAABBBC",
    afternoon: "CCDDDAAABBBCCCDDDAAABBBCCCDD",
    night:     "AAABBBCCCDDDAAABBBCCCDDDAAAB",
    off:       "DDCAADBBACCBDDCAADBBACCBDDCA"
  },
  "2026-03": {
    morning:   "CCDDDAAABBBCCCDDDAAABBBCCCDDDAA",
    afternoon: "DAAABBBCCCDDDAAABBBCCCDDDAAABBB",
    night:     "BBCCCDDDAAABBBCCCDDDAAABBBCCCDD",
    off:       "ADBBACCBDDCAADBBACCBDDCAADBBACC"
  },
  "2026-04": {
    morning:   "ABBBCCCDDDAAABBBCCCDDDAAABBBCC",
    afternoon: "CCCDDDAAABBBCCCDDDAAABBBCCCDDD",
    night:     "DAAABBBCCCDDDAAABBBCCCDDDAAABB",
    off:       "BDDCAADBBACCBDDCAADBBACCBDDCAA"
  },
  "2026-05": {
    morning:   "CDDDAAABBBCCCDDDAAABBBCCCDDDAAA",
    afternoon: "AAABBBCCCDDDAAABBBCCCDDDAAABBBC",
    night:     "BCCCDDDAAABBBCCCDDDAAABBBCCCDDD",
    off:       "DBBACCBDDCAADBBACCBDDCAADBBACCB"
  },
  "2026-06": {
    morning:   "BBBCCCDDDAAABBBCCCDDDAAABBBCCC",
    afternoon: "CCDDDAAABBBCCCDDDAAABBBCCCDDDA",
    night:     "AAABBBCCCDDDAAABBBCCCDDDAAABBB",
    off:       "DDCAADBBACCBDDCAADBBACCBDDCAAD"
  },
  "2026-07": {
    morning:   "DAAABBBCCCDDDAAABBBCCCDDDAAABBB",
    afternoon: "BBCCCDDDAAABBBCCCDDDAAABBBCCCDD",
    night:     "CCCDDDAAABBBCCCDDDAAABBBCCCDDDA",
    off:       "ADBBACCBDDCAADBBACCBDDCAADBBACC"
  },
  "2026-08": {
    morning:   "CCCDDDAAABBBCCCDDDAAABBBCCCDDDA",
    afternoon: "AAABBBCCCDDDAAABBBCCCDDDAAABBBC",
    night:     "BBBCCCDDDAAABBBCCCDDDAAABBBCCCD",
    off:       "DDCAADBBACCBDDCAADBBACCBDDCAADB"
  },
  "2026-09": {
    morning:   "AAABBBCCCDDDAAABBBCCCDDDAAABBB",
    afternoon: "CCCDDDAAABBBCCCDDDAAABBBCCCDDD",
    night:     "DDDAAABBBCCCDDDAAABBBCCCDDDAAA",
    off:       "BDDCAADBBACCBDDCAADBBACCBDDCAA"
  },
  "2026-10": {
    morning:   "CCCDDDAAABBBCCCDDDAAABBBCCCDDDA",
    afternoon: "AAABBBCCCDDDAAABBBCCCDDDAAABBBC",
    night:     "BBBCCCDDDAAABBBCCCDDDAAABBBCCCD",
    off:       "DDCAADBBACCBDDCAADBBACCBDDCAADB"
  },
  "2026-11": {
    morning:   "AAABBBCCCDDDAAABBBCCCDDDAAABBB",
    afternoon: "CCCDDDAAABBBCCCDDDAAABBBCCCDDD",
    night:     "DDDAAABBBCCCDDDAAABBBCCCDDDAAA",
    off:       "BDDCAADBBACCBDDCAADBBACCBDDCAA"
  },
  "2026-12": {
    morning:   "CDDDAAABBBCCCDDDAAABBBCCCDDDAAA",
    afternoon: "AAABBBCCCDDDAAABBBCCCDDDAAABBBC",
    night:     "BCCCDDDAAABBBCCCDDDAAABBBCCCDDD",
    off:       "DBBACCBDDCAADBBACCBDDCAADBBACCB"
  }
};

const getTurmaFromData = (monthKey: string, shift: 'morning' | 'afternoon' | 'night' | 'off', day: number): Turma => {
  const data = SHIFT_DATA_2026[monthKey];
  if (!data) return 'A';
  const sequence = data[shift].replace(/\s/g, '');
  return (sequence[day - 1] as Turma) || 'A';
};

export const getScaleForDate = (date: Date): DayScale => {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  const day = date.getDate();
  const monthKey = `${year}-${month}`;

  return {
    morning: getTurmaFromData(monthKey, 'morning', day),
    afternoon: getTurmaFromData(monthKey, 'afternoon', day),
    night: getTurmaFromData(monthKey, 'night', day),
    off: getTurmaFromData(monthKey, 'off', day)
  };
};

export const getCurrentShiftInfo = (): { turma: Turma; turno: Turno } => {
  const now = new Date();
  const hour = now.getHours();
  
  // Se for antes das 6h, operacionalmente ainda pertence ao dia anterior
  const operationalDate = new Date(now);
  if (hour < 6) {
    operationalDate.setDate(operationalDate.getDate() - 1);
  }
  
  const scale = getScaleForDate(operationalDate);

  if (hour >= 6 && hour < 14) return { turno: 'MANHÃ', turma: scale.morning };
  if (hour >= 14 && hour < 22) return { turno: 'TARDE', turma: scale.afternoon };
  
  // Turno da Noite (22h às 06h)
  // Se hour >= 22, usamos a escala de hoje (operationalDate = now)
  // Se hour < 6, usamos a escala de ontem (operationalDate = now - 1 dia)
  return { turno: 'NOITE', turma: scale.night };
};

/**
 * Retorna o range de timestamps do turno ATUAL.
 * Essencial para filtrar o que foi resolvido "neste turno".
 */
export const getCurrentShiftRange = () => {
  const now = new Date();
  const start = new Date(now);
  const hour = now.getHours();

  if (hour >= 6 && hour < 14) {
    start.setHours(6, 0, 0, 0);
  } else if (hour >= 14 && hour < 22) {
    start.setHours(14, 0, 0, 0);
  } else {
    if (hour < 6) {
      start.setDate(start.getDate() - 1);
    }
    start.setHours(22, 0, 0, 0);
  }

  return {
    start: start.getTime(),
    end: now.getTime()
  };
};

/**
 * Retorna as informações do turno ANTERIOR ao atual.
 */
export const getPreviousShiftInfo = (): { turma: Turma; turno: Turno; date: Date } => {
  const now = new Date();
  const hour = now.getHours();
  let prevDate = new Date(now);
  let prevTurno: Turno;

  if (hour >= 6 && hour < 14) {
    // Atual é Manhã, anterior foi Noite (dia anterior)
    prevDate.setDate(prevDate.getDate() - 1);
    prevTurno = 'NOITE';
  } else if (hour >= 14 && hour < 22) {
    // Atual é Tarde, anterior foi Manhã
    prevTurno = 'MANHÃ';
  } else {
    // Atual é Noite
    if (hour < 6) {
      // Estamos na madrugada, anterior foi Tarde (dia anterior)
      prevDate.setDate(prevDate.getDate() - 1);
      prevTurno = 'TARDE';
    } else {
      // Estamos entre 22h e 00h, anterior foi Tarde
      prevTurno = 'TARDE';
    }
  }

  const scale = getScaleForDate(prevDate);
  let prevTurma: Turma;
  if (prevTurno === 'MANHÃ') prevTurma = scale.morning;
  else if (prevTurno === 'TARDE') prevTurma = scale.afternoon;
  else prevTurma = scale.night;

  return { turma: prevTurma, turno: prevTurno, date: prevDate };
};

/**
 * Retorna o range de timestamps do turno ANTERIOR.
 */
export const getPreviousShiftRange = () => {
  const now = new Date();
  const hour = now.getHours();
  const start = new Date(now);
  const end = new Date(now);

  if (hour >= 6 && hour < 14) {
    // Atual Manhã (06-14). Anterior Noite (22-06)
    start.setDate(start.getDate() - 1);
    start.setHours(22, 0, 0, 0);
    end.setHours(6, 0, 0, 0);
  } else if (hour >= 14 && hour < 22) {
    // Atual Tarde (14-22). Anterior Manhã (06-14)
    start.setHours(6, 0, 0, 0);
    end.setHours(14, 0, 0, 0);
  } else {
    // Atual Noite (22-06). Anterior Tarde (14-22)
    if (hour < 6) {
      // Madrugada. Anterior Tarde foi no dia anterior
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }
    start.setHours(14, 0, 0, 0);
    end.setHours(22, 0, 0, 0);
  }

  return {
    start: start.getTime(),
    end: end.getTime()
  };
};

export const getStatusForTurma = (date: Date, turma: Turma): { turno: Turno | 'ADM' | 'FOLGA'; isWorking: boolean } => {
  const hour = date.getHours();

  // ADM Team Logic: Fixed shift from 08:00 to 16:00
  if (turma === 'ADM') {
    const isWorking = hour >= 8 && hour < 16;
    return { turno: isWorking ? 'ADM' : 'FOLGA', isWorking };
  }

  const operationalDate = new Date(date);
  
  // Ajuste para o dia operacional (troca às 06:00)
  if (hour < 6) {
    operationalDate.setDate(operationalDate.getDate() - 1);
  }
  
  const scale = getScaleForDate(operationalDate);
  if (scale.morning === turma) return { turno: 'MANHÃ', isWorking: true };
  if (scale.afternoon === turma) return { turno: 'TARDE', isWorking: true };
  if (scale.night === turma) return { turno: 'NOITE', isWorking: true };
  return { turno: 'FOLGA', isWorking: false };
};
