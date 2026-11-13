import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, Building2, UserRound } from 'lucide-react';

export default function AuthPageShell({ kind, title, description, children, showAudienceTabs = false }) {
  const location = useLocation();
  const mode = location.pathname === '/sign-up' ? 'signup' : 'signin';
  const company = kind === 'company';
  return <div className={`relative isolate min-h-[calc(100vh-88px)] overflow-hidden px-4 py-10 sm:px-6 lg:py-16 ${company ? 'bg-[#f8eee9]' : 'bg-[#edf5e7]'}`}>
    <div aria-hidden="true" className={`pointer-events-none absolute -right-24 -top-32 h-[500px] w-[500px] rounded-full blur-3xl ${company ? 'bg-[#e7a980]/35' : 'bg-[#b8da9c]/40'}`} />
    <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
      <div className="max-w-xl">
        <Link to="/" className={`inline-flex items-center gap-2 text-sm font-bold ${company ? 'text-[#9c4d37]' : 'text-[#315844]'}`}><ArrowLeft size={16} /> Back to Hapzo360</Link>
        <span className={`mt-14 flex h-14 w-14 items-center justify-center rounded-2xl ${company ? 'bg-[#9c4d37] text-white' : 'bg-[#315844] text-white'}`}>{company ? <Building2 size={26} /> : <UserRound size={26} />}</span>
        <p className={`mt-7 text-xs font-extrabold uppercase tracking-[.2em] ${company ? 'text-[#9c4d37]' : 'text-[#315844]'}`}>{company ? 'For employers' : 'For individuals'}</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-[-.05em] text-[#1d3028] sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-lg text-base leading-8 text-[#5b6960]">{description}</p>
      </div>
      <div className="rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_26px_80px_rgba(28,54,40,.12)] sm:p-8 lg:p-10">
        {showAudienceTabs && <div className="mb-6 grid grid-cols-2 gap-2 rounded-xl bg-stone-100 p-1" role="tablist" aria-label="Account type"><Link role="tab" aria-selected={!company} to={`/${mode === 'signup' ? 'sign-up' : 'sign-in'}?type=individual`} state={location.state} className={`rounded-lg px-3 py-3 text-center text-sm font-bold transition ${!company ? 'bg-white text-[#315844] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Individual</Link><Link role="tab" aria-selected={company} to={`/${mode === 'signup' ? 'sign-up' : 'sign-in'}?type=company`} state={location.state} className={`rounded-lg px-3 py-3 text-center text-sm font-bold transition ${company ? 'bg-white text-[#315844] shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}>Company</Link></div>}
        {children}
      </div>
    </div>
  </div>;
}
