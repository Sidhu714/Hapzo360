import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import { LANGUAGES } from '../config';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher({ dark = false }) {
  const { selected, setLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const selectedLanguage = LANGUAGES.find((language) => language.code === selected) || LANGUAGES[0];

  const chooseLanguage = (code) => {
    setLang(code);
    setMobileOpen(false);
  };

  return (
    <div translate="no" className={`notranslate language-switcher ${dark ? 'language-switcher--dark' : ''}`}>
      <div className="language-switcher-desktop inline-flex rounded-full p-1">
        {LANGUAGES.map((language) => (
          <button key={language.code} type="button" onClick={() => setLang(language.code)}
            className={`rounded-full px-2.5 py-1.5 text-xs font-semibold transition ${selected === language.code ? 'language-switcher-active bg-[#315844] text-white shadow-sm' : 'text-stone-600 hover:text-[#20372a]'}`}>
            {language.label}
          </button>
        ))}
      </div>

      <div className="language-switcher-mobile">
        <button
          type="button"
          className="language-switcher-mobile-trigger"
          onClick={() => setMobileOpen((isOpen) => !isOpen)}
          aria-label="Choose language"
          aria-expanded={mobileOpen}
        >
          <span>{selectedLanguage.label}</span>
          <ChevronDown size={14} aria-hidden="true" />
        </button>
        {mobileOpen && (
          <div className="language-switcher-mobile-menu" role="menu" aria-label="Choose language">
            {LANGUAGES.map((language) => (
              <button
                key={language.code}
                type="button"
                role="menuitem"
                onClick={() => chooseLanguage(language.code)}
                className={selected === language.code ? 'language-switcher-active' : ''}
              >
                {language.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
