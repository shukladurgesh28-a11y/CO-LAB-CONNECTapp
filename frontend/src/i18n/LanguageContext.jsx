import { createContext, useContext, useState, useCallback } from 'react';
import { translations } from './translations';
import { DEFAULT_LANG, isSupportedLang } from './languages';
const LanguageContext = createContext();
const lookup = (bundle, key) => {
  let val = bundle;
  for (const k of key.split('.')) val = val?.[k];
  return val;
};
export function LanguageProvider({ children }) {
  const stored = localStorage.getItem('lang');
  const [lang, setLang] = useState(isSupportedLang(stored) ? stored : DEFAULT_LANG);
  const t = useCallback((key) => {
    // Selected language first, English fallback second, raw key last.
    return lookup(translations[lang], key) ?? lookup(translations[DEFAULT_LANG], key) ?? key;
  }, [lang]);
  const changeLang = (l) => {
    const next = isSupportedLang(l) ? l : DEFAULT_LANG;
    localStorage.setItem('lang', next);
    setLang(next);
  };
  return <LanguageContext.Provider value={{ lang, setLanguage: changeLang, t }}>{children}</LanguageContext.Provider>;
}
export const useLanguage = () => useContext(LanguageContext);
