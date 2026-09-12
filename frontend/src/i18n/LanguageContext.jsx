import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations';
const LanguageContext = createContext();
export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem('lang') || 'en');
  const t = useCallback((key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) val = val?.[k];
    return val || key;
  }, [lang]);
  const changeLang = (l) => { localStorage.setItem('lang', l); setLang(l); };
  return <LanguageContext.Provider value={{ lang, setLanguage: changeLang, t }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
