import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_LANG } from '../config';
import { STRINGS } from '../i18n/strings';
import { read, write } from '../services/storage';

const Ctx = createContext(null);

const validLanguage = (value) => (STRINGS[value] ? value : DEFAULT_LANG);

export function LanguageProvider({ children }) {
  const [lang, setLanguage] = useState(() => validLanguage(read('lang', DEFAULT_LANG)));

  useEffect(() => {
    write('lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((nextLanguage) => {
    setLanguage(validLanguage(nextLanguage));
  }, []);

  const t = useCallback((key) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key, [lang]);

  return <Ctx.Provider value={{ lang, selected: lang, setLang, t }}>{children}</Ctx.Provider>;
}
export const useLanguage = () => useContext(Ctx);
