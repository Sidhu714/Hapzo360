import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Globe, LogOut, Menu, UserRound, X } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import { usePeopleAuth } from '../context/PeopleAuthContext';
import { useCompanyAuth } from '../context/CompanyAuthContext';
import LanguageSwitcher from './LanguageSwitcher';

import logo from '../assets/logo-main.png';
import hapzoWordmark from '../assets/hapzo-wordmark.png';
import './navbar.css';


const LINKS = [
  ['/', 'nav.home'],
  ['/about', 'nav.about'],
  ['/contact', 'nav.contact'],
];


export function Logo({ light = false }) {
  return (
    <Link
      to="/"
      aria-label="Hapzo360 home"
      className="navbar-brand flex items-center gap-2"
    >
      <span className="navbar-brand-mark grid h-9 w-9 place-items-center rounded-xl text-lg font-extrabold">
        <img src={logo} alt="" />
      </span>

      <span
        className={`logo-wordmark text-2xl font-extrabold tracking-tight ${
          light ? 'text-white' : 'text-[#20372a]'
        }`}
      >
        <img
          src={hapzoWordmark}
          alt="Hapzo"
          className={`logo-wordmark-image${light ? ' logo-wordmark-image--light' : ''}`}
        />
        <span className={`logo-360${light ? ' logo-360--light' : ''}`}>
          <span>36</span>
          <Globe className="logo-globe" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}


export default function Navbar() {
  const { t } = useLanguage();
  const { person, openPeopleAuth, signOutPeople } = usePeopleAuth();
  const { company, signOutCompany } = useCompanyAuth();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const isHomePage = location.pathname === '/';
  const isAboutOrContactPage =
    location.pathname === '/about' || location.pathname === '/contact';

  const isTrendsPage =
    location.pathname.startsWith('/services/trends');

  const isPriceListPage =
    location.pathname.startsWith('/services/price-list');

  const isTechnologyPage =
    location.pathname.startsWith('/services/technologies');

  const isHappeningsPage =
    location.pathname.startsWith('/services/happenings');

  const isOpeningsPage =
    location.pathname.startsWith('/services/openings');

  const isPostJobPage = location.pathname.startsWith('/post-job');
  const isExpiredJobsPage = location.pathname.startsWith('/company/expired-jobs');

  const isOpeningsTheme = isOpeningsPage || isPostJobPage || isExpiredJobsPage;
  const useHomepageNavbar = isHomePage || isAboutOrContactPage;

  const isDarkPage =
    isTrendsPage || isPriceListPage || isTechnologyPage || isOpeningsTheme;

  const showPostJob =
    location.pathname === '/services/openings' && !person;


  useEffect(() => {
    setOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);


  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open]);


  const linkClassName = ({ isActive }) => {
    if (useHomepageNavbar) {
      return `home-navbar-link ${
        isActive ? 'home-navbar-link--active' : ''
      }`;
    }

    return `rounded-full px-4 py-2.5 text-sm font-semibold transition ${
      isHappeningsPage
        ? isActive
          ? 'bg-[#1f46c9]/10 text-[#14308f]'
          : 'text-[#0b1220]/85 hover:bg-[#1f46c9]/10 hover:text-[#14308f]'
        : isDarkPage
          ? isActive
            ? 'bg-white/15 text-white'
            : 'text-white/85 hover:bg-white/10 hover:text-white'
          : isActive
            ? 'bg-[#eaf1df] text-[#315844]'
            : 'text-stone-600 hover:bg-stone-100 hover:text-[#20372a]'
    }`;
  };


  const renderLinks = () =>
    LINKS.map(([to, key]) => (
      <NavLink
        key={to}
        to={to}
        end={to === '/'}
        className={linkClassName}
        onClick={() => setOpen(false)}
      >
        {t(key)}
      </NavLink>
    ));


  const headerTheme = useHomepageNavbar
    ? 'navbar--home'
    : isOpeningsTheme
      ? 'navbar--openings border-white/15'
      : isTrendsPage
      ? 'navbar--trends border-white/15'
      : isPriceListPage
        ? 'navbar--price-list border-white/15'
        : isTechnologyPage
          ? 'navbar--technology border-white/15'
          : isHappeningsPage
            ? 'navbar--happenings border-white/15'
            : 'border-[#e3e8dc] bg-[#fbfcf8]/90';


  const mobileTheme = useHomepageNavbar
    ? 'home-navbar-mobile'
    : isOpeningsTheme
      ? 'border-white/15 bg-[#351019]/85'
      : isTrendsPage
      ? 'border-white/15 bg-[#052f2a]/30'
      : isPriceListPage
        ? 'border-white/15 bg-[#2b0720]/35'
        : isTechnologyPage
          ? 'border-white/15 bg-[#120a44]/35'
          : isHappeningsPage
            ? 'border-[#0b1220]/15 bg-[#f5f6f8]'
            : 'border-stone-200';


  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl ${headerTheme}`}
    >
      <div
        className={`navbar-main-row mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 ${
          useHomepageNavbar ? 'home-navbar-inner' : ''
        }`}
      >
        <Logo light={isDarkPage} />

        <nav
          aria-label="Main navigation"
          className={`hidden items-center gap-1 md:flex ${
            useHomepageNavbar ? 'home-navbar-desktop' : ''
          }`}
        >
          {renderLinks()}
        </nav>

        <div
          className={`flex items-center gap-2 ${
            useHomepageNavbar ? 'home-navbar-actions' : ''
          }`}
        >
          <div
            className={
              useHomepageNavbar ? 'home-navbar-language' : undefined
            }
          >
            <LanguageSwitcher dark={isDarkPage} />
          </div>

          <div className="relative">
            <button type="button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen} aria-label="Account options" className={`navbar-account-button inline-flex h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold transition ${isDarkPage ? 'text-white hover:bg-white/10' : 'text-[#315844] hover:bg-[#eaf1df]'}`}>
              <UserRound size={17} aria-hidden="true" /><span className="hidden sm:inline">{person ? person.name.split(' ')[0] : company ? company.companyName.split(' ')[0] : 'Account'}</span>
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full z-50 mt-3 w-64 rounded-2xl border border-stone-200 bg-white p-2 text-[#20372a] shadow-2xl">
                <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-stone-500">Your account</p>
                {!person && !company && (
                  <>
                    <button type="button" onClick={() => { openPeopleAuth('signin'); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-stone-100"><UserRound size={15} /> Sign in</button>
                    <button type="button" onClick={() => { openPeopleAuth('signup'); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-stone-100"><UserRound size={15} /> Sign up</button>
                  </>
                )}
                {person && <button type="button" onClick={() => { signOutPeople(); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 hover:text-red-800"><LogOut size={15} /> Sign out</button>}
                {company && <button type="button" onClick={() => { signOutCompany(); setAccountOpen(false); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50 hover:text-red-800"><LogOut size={15} /> Sign out of Company</button>}
              </div>
            )}
          </div>

          {showPostJob && (
            <Link
              to="/post-job"
              className={`btn-primary hidden sm:inline-flex ${isOpeningsPage ? 'navbar-openings-cta' : ''}`}
            >
              {t('nav.postJob')}
            </Link>
          )}

          <button
            type="button"
            className={`rounded-lg p-1 md:hidden ${
              useHomepageNavbar
                ? 'home-navbar-toggle'
                : isDarkPage
                  ? 'text-white'
                  : 'text-[#20372a]'
            }`}
            onClick={() => setOpen((current) => !current)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="navbar-mobile-menu"
          >
            {open ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="navbar-mobile-menu"
          aria-label="Mobile navigation"
          className={`flex flex-col gap-1 border-t p-3 md:hidden ${mobileTheme}`}
        >
          {renderLinks()}

          {showPostJob && (
            <Link
              to="/post-job"
              className={`btn-primary mt-2 ${isOpeningsPage ? 'navbar-openings-cta' : ''}`}
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
