import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_LANG } from '../config';
import { STRINGS } from '../i18n/strings';
import { read, write } from '../services/storage';

const Ctx = createContext(null);

// Google rewrites the DOM, which makes React throw removeChild/insertBefore errors.
// This patch makes those two calls tolerant. Runs once.
if (typeof window !== 'undefined' && !window.__gtPatched) {
  window.__gtPatched = true;
  const rc = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return rc.apply(this, arguments);
  };
  const ib = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (ref && ref.parentNode !== this) return node;
    return ib.apply(this, arguments);
  };
}

const clearCookie = () => {
  const gone = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = gone;
  document.cookie = `${gone}; domain=${location.hostname}`;
  document.cookie = `${gone}; domain=.${location.hostname}`;
};

function loadWidget() {
  if (window.__gtLoading) return;
  window.__gtLoading = true;
  const box = document.createElement('div');
  box.id = 'google_translate_element';
  box.style.cssText = 'position:absolute;left:-9999px;top:0;';
  document.body.appendChild(box);
  window.googleTranslateElementInit = () =>
    new window.google.translate.TranslateElement(
      { pageLanguage: 'en', includedLanguages: 'ta,hi', autoDisplay: false },
      'google_translate_element'
    );
  const s = document.createElement('script');
  s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  s.async = true;
  document.body.appendChild(s);
}

// THIS is what "clicking Tamil" triggers: set the widget's dropdown and fire its change event.
function applyLang(lang, tries = 0) {
  if (lang === 'en') {
    if (/googtrans=\/[^;]+/.test(document.cookie)) { clearCookie(); location.reload(); }
    return;
  }
  document.cookie = `googtrans=/en/${lang}; path=/`;
  const sel = document.querySelector('select.goog-te-combo');
  if (sel) {
    sel.value = lang;
    sel.dispatchEvent(new Event('change'));
  } else if (tries < 40) {
    setTimeout(() => applyLang(lang, tries + 1), 250); // widget still loading
  }
}

export function LanguageProvider({ children }) {
  const [selected, setLang] = useState(() => read('lang', DEFAULT_LANG));

  useEffect(() => {
    write('lang', selected);
    if (selected !== 'en') document.cookie = `googtrans=/en/${selected}; path=/`; // translate on first load
    loadWidget();
    applyLang(selected);
  }, [selected]);

  // The app always renders English. Google translates it on screen.
  const t = useCallback((k) => STRINGS.en[k] ?? k, []);
  return <Ctx.Provider value={{ lang: 'en', selected, setLang, t }}>{children}</Ctx.Provider>;
}
export const useLanguage = () => useContext(Ctx);