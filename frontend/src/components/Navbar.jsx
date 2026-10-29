import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

import logo from '../assets/logo.png';
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
        Hapzo<span className="logo-360">360</span>
      </span>
    </Link>
  );
}


export default function Navbar() {
  const { t } = useLanguage();
  const location = useLocation();

  const [open, setOpen] = useState(false);

  const isHomePage = location.pathname === '/';

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
  const useHomepageNavbar = isHomePage;

  const isDarkPage =
    isTrendsPage || isPriceListPage || isTechnologyPage || isOpeningsTheme;

  const showPostJob =
    location.pathname === '/services/openings';


  useEffect(() => {
    setOpen(false);
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
          ? 'bg-[#11192f]/10 text-[#11192f]'
          : 'text-[#11192f]/85 hover:bg-[#11192f]/10 hover:text-[#11192f]'
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
            ? 'border-[#11192f]/15 bg-[#ffe66d]'
            : 'border-stone-200';


  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-xl ${headerTheme}`}
    >
      <div
        className={`mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-3 px-4 ${
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
