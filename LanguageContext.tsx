
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => any;
  translateArea: (area: string) => string;
  translateDiscipline: (discipline: string) => string;
  translateShift: (shift: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved as Language) || 'pt';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const translateArea = (area: string) => {
    const a = area.toUpperCase();
    if (a === 'DFP 2') return t('areas.dfp2');
    if (a === 'BOMBEAMENTO' || a === 'PUMPING') return t('areas.bombeamento');
    if (a === 'ESPESADORES E REAGENTES' || a === 'THICKENERS AND REAGENTS') return t('areas.espesadores');
    if (a === 'HBF-COLUNAS C' || a === 'HBF-COLUMNS C') return t('areas.hbf_c');
    if (a === 'HBF- COLUNAS D' || a === 'HBF- COLUMNS D') return t('areas.hbf_d');
    return area;
  };

  const translateDiscipline = (discipline: string) => {
    const d = discipline.toUpperCase();
    if (d === 'MECÂNICA' || d === 'MECHANICAL') return t('disciplines.mechanical');
    if (d === 'ELÉTRICA' || d === 'ELECTRICAL') return t('disciplines.electrical');
    if (d === 'INSTRUMENTAÇÃO' || d === 'INSTRUMENTATION') return t('disciplines.instrumentation');
    if (d === 'OPERAÇÃO' || d === 'OPERATION') return t('disciplines.operation');
    return discipline;
  };

  const translateShift = (shift: string) => {
    const s = shift.toUpperCase();
    if (s === 'MANHÃ' || s === 'MORNING') return t('shifts.morning');
    if (s === 'TARDE' || s === 'AFTERNOON') return t('shifts.afternoon');
    if (s === 'NOITE' || s === 'NIGHT') return t('shifts.night');
    if (s === 'FOLGA' || s === 'OFF') return t('shiftCalendar.off');
    return shift;
  };

  const t = (key: string): any => {
    const keys = key.split('.');
    
    // Helper to traverse object
    const getValue = (obj: any, path: string[]) => {
      let current = obj;
      for (const k of path) {
        if (current && typeof current === 'object' && k in current) {
          current = current[k];
        } else {
          return undefined;
        }
      }
      return current;
    };

    // Try current language
    let value = getValue(translations[language], keys);
    
    // If not found, try Portuguese fallback
    if (value === undefined && language !== 'pt') {
      value = getValue(translations['pt'], keys);
    }

    // If still not found, return the key itself
    if (value === undefined || (typeof value === 'object' && value !== null && !Array.isArray(value))) {
      return key;
    }

    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateArea, translateDiscipline, translateShift }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
