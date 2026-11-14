import { Link, useLocation } from 'react-router-dom';
import { Logo } from './Navbar';

function FooterLink({ to, children }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0, behavior: 'auto' }));
  };
  return <Link to={to} onClick={scrollToTop}>{children}</Link>;
}

export default function Footer() {
  const location = useLocation();
  const hasAnimatedBackdrop = location.pathname === '/' || location.pathname.startsWith('/services/technologies') || location.pathname.startsWith('/services/happenings');
  return <footer className={`hapzo-footer mt-16 ${hasAnimatedBackdrop ? 'hapzo-footer--above-backdrop' : ''}`}><div className="page-shell grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-12"><div><Logo light/><p className="footer-muted mt-4 max-w-sm text-sm leading-6">A friendlier place to discover local opportunities and make your next move.</p></div><nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold" aria-label="Footer navigation"><FooterLink to="/about">About Hapzo</FooterLink><FooterLink to="/services/happenings">Happenings</FooterLink><FooterLink to="/services/openings">Openings</FooterLink><FooterLink to="/terms-and-conditions">Terms &amp; Conditions</FooterLink></nav><div className="footer-muted border-t border-white/10 pt-5 text-xs md:col-span-2">© {new Date().getFullYear()} Hapzo360. Built for people and places.</div></div></footer>;
}
