
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import logo from "../assets/logo.png";

const LINKS = [
  ['/', 'nav.home'],
  ['/about', 'nav.about'],
  // ['/services', 'nav.services'],
  ['/contact', 'nav.contact'],
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl text-lg font-extrabold">
        <img src={logo} alt="Logo" />
      </span>
      <span className="text-xl font-extrabold tracking-tight text-[#20372a]">
        Hapzo360
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { t } = useLanguage();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  // Show Post a Job only on the job openings page
  const showPostJob = location.pathname === '/services/openings';

  const cls = ({ isActive }) =>
    `rounded-full px-4 py-2.5 text-sm font-semibold transition ${
      isActive
        ? 'bg-[#eaf1df] text-[#315844]'
        : 'text-stone-600 hover:bg-stone-100 hover:text-[#20372a]'
    }`;

  const items = LINKS.map(([to, k]) => (
    <NavLink
      key={to}
      to={to}
      end={to === '/'}
      className={cls}
      onClick={() => setOpen(false)}
    >
      {t(k)}
    </NavLink>
  ));

  return (
    <header className="sticky top-0 z-40 border-b border-[#e3e8dc] bg-[#fbfcf8]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {items}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          {showPostJob && (
            <Link
              to="/post-job"
              className="btn-primary hidden sm:inline-flex"
            >
              {t('nav.postJob')}
            </Link>
          )}

          <button
            type="button"
            className="rounded-lg p-1 md:hidden"
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-stone-200 p-3 md:hidden">
          {items}

          {showPostJob && (
            <Link
              to="/post-job"
              className="btn-primary mt-2"
              onClick={() => setOpen(false)}
            >
              {t('nav.postJob')}
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
