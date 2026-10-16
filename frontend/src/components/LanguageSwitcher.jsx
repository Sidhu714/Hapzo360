import { LANGUAGES } from '../config';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { selected, setLang } = useLanguage();
  return (
    <div translate="no" className="notranslate language-switcher inline-flex rounded-full p-1">
      {LANGUAGES.map((l) => (
        <button key={l.code} onClick={() => setLang(l.code)}
          className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${selected === l.code ? 'bg-[#315844] text-white shadow-sm' : 'text-stone-600 hover:text-[#20372a]'}`}>
          {l.label}
        </button>
      ))}
    </div>
  );
}