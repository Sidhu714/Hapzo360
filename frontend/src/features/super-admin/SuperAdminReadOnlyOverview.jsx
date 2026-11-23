import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, BriefcaseBusiness, CalendarDays, Check, Clock3, LogOut, Newspaper, ShieldCheck, X } from 'lucide-react';
import { Logo } from '../../components/Navbar';
import { getSuperAdminActivity, logoutAdmin } from './adminApi';

const countPosts = (admin) => Object.values(admin.posted).reduce((total, value) => total + Number(value), 0);
const countReviews = (admin) => Number(admin.reviews.approved) + Number(admin.reviews.rejected);
const teamOrder = ['raghul gowtham', 'navaneethan', 'karpagam', 'sentamil selvi', 'girija ramalingam'];
const orderTeam = (admins = []) => [...admins].sort((a, b) => {
  const aIndex = teamOrder.indexOf(String(a.username || '').trim().toLowerCase());
  const bIndex = teamOrder.indexOf(String(b.username || '').trim().toLowerCase());
  return (aIndex < 0 ? teamOrder.length : aIndex) - (bIndex < 0 ? teamOrder.length : bIndex)
    || String(a.username || '').localeCompare(String(b.username || ''));
});
const dateLabel = (value) => value ? new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

function Metric({ label, value, caption, color, to }) {
  return <Link to={to} className="group block rounded-[22px] border border-[#e1e9df] bg-white px-5 py-5 shadow-[0_16px_32px_-28px_#19362b88] transition hover:-translate-y-0.5 hover:border-[#a9c0a9] hover:shadow-[0_20px_38px_-28px_#19362b99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315844] sm:px-6">
    <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-extrabold uppercase tracking-[.13em] text-[#718274]">{label}</p><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} /></div>
    <p className="mt-4 text-[34px] font-extrabold leading-none tracking-[-.055em] text-[#183b2e]">{value}</p>
    <p className="mt-3 text-xs text-[#849185]">{caption}</p>
    <p className="mt-4 flex items-center gap-1 text-xs font-bold text-[#315844]">View details <ArrowUpRight size={14} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></p>
  </Link>;
}

function ActivityIcon({ action }) {
  const rejected = action === 'Rejected';
  const approved = action === 'Approved';
  const Icon = rejected ? X : approved ? Check : action.includes('opening') ? BriefcaseBusiness : action.includes('happening') ? CalendarDays : Newspaper;
  return <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${rejected ? 'bg-[#f9e8e2] text-[#ac5947]' : approved ? 'bg-[#e1f0e7] text-[#2b7554]' : 'bg-[#eff1e6] text-[#667440]'}`}><Icon size={17} strokeWidth={2.25} /></span>;
}

export default function SuperAdminReadOnlyOverview({ session }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getSuperAdminActivity().then((value) => { if (active) setData(value); }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  const signOut = async () => {
    setBusy(true);
    try { await logoutAdmin(); navigate('/super-admin/login', { replace: true }); }
    catch (cause) { setError(cause.message); setBusy(false); }
  };

  const orderedAdmins = orderTeam(data?.admins);
  const selected = orderedAdmins.find((admin) => admin.id === selectedId) || orderedAdmins[0];
  const posts = selected ? countPosts(selected) : 0;
  const reviews = selected ? countReviews(selected) : 0;
  const publicationTypes = selected ? [
    { label: 'Openings', count: selected.posted.openings, icon: BriefcaseBusiness, color: '#719a7d' },
    { label: 'Happenings', count: selected.posted.happenings, icon: CalendarDays, color: '#9db66b' },
    { label: 'Trends', count: selected.posted.trends, icon: Newspaper, color: '#d2a26d' },
    { label: 'Technologies', count: selected.posted.technologies, icon: Newspaper, color: '#9c9bc2' },
  ] : [];

  return <main className="min-h-screen bg-[#f5f7f2] text-[#19372b]">
    <header className="navbar--home relative z-10 border-b border-[#dce5db] bg-[#fcfdf9] text-[#20372a]">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center gap-4"><Logo /><span className="hidden h-7 w-px bg-[#dce5db] sm:block" /><span className="rounded-full border border-[#dce5db] bg-[#f2f7ef] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#315b47]">Super Admin</span></div>
        <div className="flex items-center gap-4 text-sm"><span className="hidden font-semibold text-[#62796b] sm:inline">{session.username}</span><button type="button" onClick={signOut} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2d7] bg-white px-4 py-2.5 font-bold text-[#345546] transition hover:border-[#b5cdb8] hover:bg-[#f1f6ee] disabled:opacity-50"><LogOut size={16} /> Sign out</button></div>
      </div>
    </header>

    <section className="relative overflow-hidden bg-[#183b2f] text-white">
      <div className="pointer-events-none absolute -right-20 -top-56 h-[520px] w-[520px] rounded-full border border-white/[.09]" />
      <div className="pointer-events-none absolute -right-5 -top-40 h-[400px] w-[400px] rounded-full border border-white/[.08]" />
      <div className="pointer-events-none absolute right-16 top-8 h-[220px] w-[220px] rounded-full bg-[#b7d885]/10 blur-[70px]" />
      <div className="relative mx-auto max-w-[1440px] px-5 pb-24 pt-12 sm:px-8 sm:pb-28 sm:pt-16">
        <div className="flex flex-wrap items-start justify-between gap-7">
          <div><p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.24em] text-[#b9d99d]"><span className="h-px w-6 bg-[#b9d99d]" /> Site administration</p><h1 className="mt-5 text-4xl font-extrabold tracking-[-.055em] sm:text-5xl lg:text-[56px]">Admin activity<span className="text-[#c3dc9d]">.</span></h1><p className="mt-4 max-w-xl text-sm leading-7 text-[#d3e1d4] sm:text-base">A clear view of what your team has published and the decisions they have made.</p></div>
          <div className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-[#e1efd6]"><ShieldCheck size={15} /> Read-only access</div>
        </div>
      </div>
    </section>

    <div className="relative mx-auto -mt-12 max-w-[1440px] px-5 pb-20 sm:px-8">
      {error && <p role="alert" className="mb-5 rounded-xl border border-[#efc7bd] bg-[#fff1ed] p-4 text-sm text-[#9b4c3e]">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric to="/super-admin/overview/accounts" label="Admin accounts" value={data?.admins.length ?? '—'} caption="Team members" color="#6c9d7d" />
        <Metric to="/super-admin/overview/published" label="Published content" value={data?.totals.posted ?? '—'} caption="Openings, events and stories" color="#a9bc69" />
        <Metric to="/super-admin/overview/approved" label="Approved" value={data?.totals.approved ?? '—'} caption="Company submissions accepted" color="#d6a365" />
        <Metric to="/super-admin/overview/rejected" label="Rejected" value={data?.totals.rejected ?? '—'} caption="Company submissions declined" color="#d68d79" />
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-[#6b866e]">Team performance</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">Activity by admin</h2></div><p className="text-sm text-[#788a7b]">Select an admin to see their work</p></div>
      {!data && !error && <div className="mt-5 rounded-[24px] border border-[#e0e8de] bg-white p-8 text-sm text-[#718275]" role="status">Loading admin activity…</div>}
      {data?.admins.length === 0 && <div className="mt-5 rounded-[24px] border border-[#e0e8de] bg-white p-8 text-sm text-[#718275]">No admin accounts yet.</div>}

      {selected && <div className="mt-5 grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[24px] border border-[#e0e8de] bg-white p-3 shadow-[0_20px_45px_-38px_#1d483a88]" aria-label="Select an admin">
          <p className="px-3 pb-3 pt-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#87988b]">Your team · {data.admins.length}</p>
          <div className="flex gap-2 overflow-x-auto lg:flex-col">{orderedAdmins.map((admin) => { const active = admin.id === selected.id; return <button key={admin.id} type="button" aria-current={active ? 'true' : undefined} onClick={() => setSelectedId(admin.id)} className={`flex min-w-[190px] flex-1 items-center gap-3 rounded-2xl px-3 py-3 text-left transition lg:min-w-0 ${active ? 'bg-[#eaf2e7] text-[#183f30]' : 'text-[#5c7063] hover:bg-[#f5f8f2]'}`}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold uppercase ${active ? 'bg-[#275641] text-white' : 'bg-[#f0f3ed] text-[#4a7359]'}`}>{admin.username.slice(0, 1)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{admin.username}</strong><small className="mt-0.5 block text-xs font-medium opacity-70">{countPosts(admin)} published · {countReviews(admin)} reviewed</small></span>{active && <ArrowUpRight size={16} className="shrink-0" />}</button>; })}</div>
        </aside>

        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-[26px] border border-[#e0e8de] bg-white shadow-[0_20px_45px_-38px_#1d483a88]">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#edf1ea] px-6 py-5 sm:px-7"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e8f0e5] text-lg font-extrabold uppercase text-[#2d684b]">{selected.username.slice(0, 1)}</span><div><h3 className="text-xl font-extrabold tracking-tight">{selected.username}</h3><p className="text-xs text-[#819087]">Admin account</p></div></div><span className="rounded-full bg-[#eff4eb] px-3 py-1.5 text-xs font-bold text-[#51715b]">Activity overview</span></div>
            <div className="grid gap-8 px-6 py-6 sm:px-7 xl:grid-cols-[1fr_250px]">
              <div><p className="text-xs font-bold uppercase tracking-[.13em] text-[#87978a]">Content published</p><p className="mt-2 text-3xl font-extrabold tracking-tight">{posts} <span className="text-sm font-medium text-[#809084]">total</span></p><div className="mt-6 space-y-4">{publicationTypes.map(({ label, count, icon: Icon, color }) => <div key={label} className="grid grid-cols-[110px_1fr_25px] items-center gap-3 sm:grid-cols-[125px_1fr_30px]"><span className="flex items-center gap-2 text-xs font-semibold text-[#617368]"><Icon size={15} />{label}</span><span className="h-2 overflow-hidden rounded-full bg-[#f0f3ee]"><span className="block h-full rounded-full" style={{ width: posts ? `${count / posts * 100}%` : '0%', backgroundColor: color }} /></span><strong className="text-right text-sm">{count}</strong></div>)}</div></div>
              <div className="rounded-2xl bg-[#f5f8f2] p-5"><p className="text-xs font-bold uppercase tracking-[.13em] text-[#87978a]">Review decisions</p><p className="mt-2 text-3xl font-extrabold tracking-tight">{reviews} <span className="text-sm font-medium text-[#809084]">total</span></p><div className="mt-5 flex h-2.5 gap-1 overflow-hidden rounded-full bg-[#e7ece4]"><span className="rounded-full bg-[#74a688]" style={{ width: reviews ? `${selected.reviews.approved / reviews * 100}%` : '0%' }} /><span className="rounded-full bg-[#d58b75]" style={{ width: reviews ? `${selected.reviews.rejected / reviews * 100}%` : '0%' }} /></div><div className="mt-5 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#617368]"><i className="h-2 w-2 rounded-full bg-[#74a688]" />Approved</span><strong>{selected.reviews.approved}</strong></div><div className="mt-3 flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-[#617368]"><i className="h-2 w-2 rounded-full bg-[#d58b75]" />Rejected</span><strong>{selected.reviews.rejected}</strong></div></div>
            </div>
          </section>

          <section className="rounded-[26px] border border-[#e0e8de] bg-white px-6 py-6 shadow-[0_20px_45px_-38px_#1d483a88] sm:px-7"><div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-extrabold uppercase tracking-[.15em] text-[#819386]">Audit trail</p><h3 className="mt-1 text-xl font-extrabold tracking-tight">Recent activity</h3></div><Clock3 size={19} className="text-[#8ea291]" /></div>{selected.recent.length ? <ol className="mt-5 divide-y divide-[#eef2ec]">{selected.recent.map((item, index) => <li key={`${item.action}-${item.date}-${index}`} className="flex items-start gap-4 py-4"><ActivityIcon action={item.action} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"><p className="text-sm font-extrabold text-[#213c2e]">{item.action}</p><time className="text-xs text-[#8b998d]">{dateLabel(item.date)}</time></div><p className="mt-1 break-words text-sm leading-6 text-[#697c6d]">{item.title}{item.detail ? <span className="ml-2 text-xs font-semibold text-[#87958a]">· {item.detail}</span> : null}</p></div></li>)}</ol> : <p className="mt-5 rounded-2xl bg-[#f7f9f5] p-5 text-sm text-[#788a7d]">No activity recorded yet.</p>}</section>
        </div>
      </div>}
    </div>
  </main>;
}
