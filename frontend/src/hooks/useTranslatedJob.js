import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { translateJob } from '../services/translate';

// Returns the job in the selected language (original text shows until the translation arrives).
// Pass only the fields you display, e.g. ['title', 'location'], to avoid needless translation calls.
export function useTranslatedJob(job, fields) {
  const { lang } = useLanguage();
  const [view, setView] = useState(job);
  const key = fields?.join();
  useEffect(() => {
    let live = true;
    setView(job);
    translateJob(job, lang, fields).then((v) => live && setView(v));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job, lang, key]);
  return view;
}
