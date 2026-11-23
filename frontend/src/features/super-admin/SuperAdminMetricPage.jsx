import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, BadgeCheck, BriefcaseBusiness, CalendarDays, LogOut, Newspaper, ShieldCheck, Users, XCircle } from 'lucide-react';
import { Logo } from '../../components/Navbar';
import { getSuperAdminActivity, logoutAdmin } from './adminApi';

const pages = {
  accounts: { title: 'Admin accounts', description: 'Team members with access to the administration workspace.', icon: Users, color: '#609575' },
  published: { title: 'Published content', description: 'Openings, happenings and stories currently available on Hapzo360.', icon: Newspaper, color: '#94ad57' },
  approved: { title: 'Approved submissions', description: 'Company submissions accepted by your admin team.', icon: BadgeCheck, color: '#c98d4b' },
  rejected: { title: 'Rejected submissions', description: 'Company submissions declined by your admin team, including the recorded reason.', icon: XCircle, color: '#cb7e6d' },
};

const teamOrder = ['raghul gowtham', 'navaneethan', 'karpagam', 'sentamil selvi', 'girija ramalingam'];
const orderTeam = (admins = []) => [...admins].sort((a, b) => {
  const ai = teamOrder.indexOf(String(a.username || '').trim().toLowerCase());
  const bi = teamOrder.indexOf(String(b.username || '').trim().toLowerCase());
  return (ai < 0 ? teamOrder.length : ai) - (bi < 0 ? teamOrder.length : bi)
    || String(a.username || '').localeCompare(String(b.username || ''));
});
const dateLabel = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not recorded';
const titleCase = (value) => String(value).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, (letter) => letter.toUpperCase());
const simpleValue = (value) => value == null || value === '' ? '' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : typeof value === 'object' ? '' : String(value);

function DetailValue({ value }) {
  if (value == null || value === '') return null;
  if (Array.isArray(value)) return <div className="mt-1 space-y-2">{value.map((item, index) => <div key={index} className="rounded-xl bg-white/80 p-3">{typeof item === 'object' && item !== null ? <DetailObject value={item} /> : <p>{String(item)}</p>}</div>)}</div>;
  if (typeof value === 'object') return <div className="mt-1 rounded-xl bg-white/80 p-3"><DetailObject value={value} /></div>;
  return <span>{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>;
}

function DetailObject({ value }) {
  return <dl className="grid gap-x-5 gap-y-2 sm:grid-cols-2">{Object.entries(value || {}).filter(([, item]) => item != null && item !== '').map(([key, item]) => <div key={key} className="min-w-0"><dt className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#809085]">{titleCase(key)}</dt><dd className="mt-0.5 break-words text-sm leading-5 text-[#3b5144]">{simpleValue(item) || <DetailValue value={item} />}</dd></div>)}</dl>;
}

function ItemDetails({ item }) {
  const data = item.details || {};
  return <details className="mt-4 rounded-xl border border-[#e7ede3] bg-[#f7f9f5] p-3">
    <summary className="cursor-pointer text-xs font-extrabold text-[#315844]">View full submission details</summary>
    <div className="mt-3"><DetailObject value={data} /></div>
  </details>;
}

function Meta({ label, value }) {
  return <div className="min-w-0"><dt className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#839185]">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-[#3a5144]">{value || 'Not provided'}</dd></div>;
}

function SubmissionCard({ item, rejected = false }) {
  const Icon = item.type === 'Opening' ? BriefcaseBusiness : CalendarDays;
  return <article className="min-w-0 rounded-[22px] border border-[#e0e8de] bg-white p-5 shadow-[0_16px_36px_-30px_#19362b88] sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eff4eb] text-[#456d51]"><Icon size={18} /></span><div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#78907c]">{item.type} · Company submission</p><h3 className="mt-1 break-words text-base font-extrabold leading-6 text-[#1e3a2d]">{item.title}</h3></div></div><span className={`rounded-full px-3 py-1 text-xs font-extrabold ${rejected ? 'bg-[#fbebe7] text-[#a34f41]' : 'bg-[#e9f3e8] text-[#38664b]'}`}>{rejected ? 'Rejected' : 'Approved'}</span></div>
    <dl className="mt-5 grid gap-4 border-t border-[#edf1ea] pt-4 sm:grid-cols-2"><Meta label="Submitted by" value={item.companyName} /><Meta label="Company email" value={item.companyEmail} /><Meta label="Submitted" value={dateLabel(item.submittedAt)} /><Meta label={rejected ? 'Rejected by' : 'Approved by'} value={item.reviewedBy} /><Meta label="Decision recorded" value={dateLabel(item.reviewedAt)} />{rejected && <Meta label="Rejection reason" value={item.reason} />}</dl>
    <ItemDetails item={item} />
  </article>;
}

function PublishedCard({ item }) {
  const Icon = item.type === 'Opening' ? BriefcaseBusiness : item.type === 'Happening' ? CalendarDays : Newspaper;
  return <article className="min-w-0 rounded-[22px] border border-[#e0e8de] bg-white p-5 shadow-[0_16px_36px_-30px_#19362b88] sm:p-6">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eff4eb] text-[#456d51]"><Icon size={18} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[.14em] text-[#78907c]">{item.type}</span><span className="rounded-full bg-[#edf5e9] px-2.5 py-1 text-[10px] font-extrabold text-[#426c4e]">Published</span></div><h3 className="mt-1 break-words text-base font-extrabold leading-6 text-[#1e3a2d]">{item.title}</h3></div></div>
    {item.description && <p className="mt-4 line-clamp-4 text-sm leading-6 text-[#64766a]">{item.description}</p>}
    <dl className="mt-5 grid gap-4 border-t border-[#edf1ea] pt-4 sm:grid-cols-2"><Meta label="Submitted / created by" value={item.submittedBy} />{item.companyName && <Meta label="Company" value={item.companyName} />}{item.submitterEmail && <Meta label="Company email" value={item.submitterEmail} />}{item.submitterPhone && <Meta label="Company phone" value={item.submitterPhone} />}{item.location && <Meta label="Location" value={item.location} />}<Meta label="Published by" value={item.publishedBy} /><Meta label="Published on" value={dateLabel(item.publishedAt)} /><Meta label="Status" value={titleCase(item.status || 'published')} /></dl>
    {item.imageUrl && <img src={item.imageUrl} alt="" className="mt-4 max-h-56 w-full rounded-xl object-cover" loading="lazy" />}
    {item.details && <ItemDetails item={item} />}
    {item.body && <details className="mt-3 rounded-xl border border-[#e7ede3] bg-[#f7f9f5] p-3"><summary className="cursor-pointer text-xs font-extrabold text-[#315844]">Read full story</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#53675a]">{item.body}</p></details>}
  </article>;
}

export default function SuperAdminMetricPage({ session, metric }) {
  const navigate = useNavigate();
  const page = pages[metric];
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getSuperAdminActivity().then((value) => { if (active) setData(value); }).catch((cause) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  if (!page) return <Navigate to="/super-admin" replace />;
  const signOut = async () => {
    setBusy(true);
    try { await logoutAdmin(); navigate('/super-admin/login', { replace: true }); }
    catch (cause) { setError(cause.message); setBusy(false); }
  };
  const Icon = page.icon;
  let content;
  if (metric === 'accounts') {
    content = <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{orderTeam(data?.admins).map((admin) => <article key={admin.id} className="rounded-[22px] border border-[#e0e8de] bg-white p-5 shadow-[0_16px_36px_-30px_#19362b88]"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf2e7] text-lg font-extrabold text-[#315844]">{admin.username.slice(0, 1)}</span><div><h2 className="font-extrabold text-[#1e3a2d]">{admin.username}</h2><p className="text-xs text-[#809085]">Administrator</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#edf1ea] pt-4"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#819084]">Published</p><p className="mt-1 text-xl font-extrabold">{Object.values(admin.posted).reduce((sum, value) => sum + Number(value), 0)}</p></div><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-[#819084]">Reviewed</p><p className="mt-1 text-xl font-extrabold">{Number(admin.reviews.approved) + Number(admin.reviews.rejected)}</p></div></div></article>)}</div>;
  } else if (metric === 'published') {
    content = data?.publishedItems?.length ? <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{data.publishedItems.map((item) => <PublishedCard key={`${item.type}-${item.id}`} item={item} />)}</div> : <Empty>No published openings, happenings or stories to show.</Empty>;
  } else {
    const items = data?.submissions?.[metric] || [];
    content = items.length ? <div className="grid gap-4 xl:grid-cols-2">{items.map((item, index) => <SubmissionCard key={`${item.type}-${item.id}-${item.reviewedAt}-${index}`} item={item} rejected={metric === 'rejected'} />)}</div> : <Empty>No company submissions have been {metric} yet.</Empty>;
  }

  const apiNeedsUpdate = data && data.detailsVersion !== 1;

  return <main className="min-h-screen bg-[#f5f7f2] text-[#19372b]">
    <header className="navbar--home relative z-10 border-b border-[#dce5db] bg-[#fcfdf9] text-[#20372a]"><div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-5 py-4 sm:px-8"><div className="flex items-center gap-4"><Logo /><span className="hidden h-7 w-px bg-[#dce5db] sm:block" /><span className="rounded-full border border-[#dce5db] bg-[#f2f7ef] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.12em] text-[#315b47]">Super Admin</span></div><div className="flex items-center gap-4 text-sm"><span className="hidden font-semibold text-[#62796b] sm:inline">{session.username}</span><button type="button" onClick={signOut} disabled={busy} className="inline-flex items-center gap-2 rounded-xl border border-[#d8e2d7] bg-white px-4 py-2.5 font-bold text-[#345546] transition hover:bg-[#f1f6ee] disabled:opacity-50"><LogOut size={16} /> Sign out</button></div></div></header>
    <section className="relative overflow-hidden bg-[#183b2f] text-white"><div className="pointer-events-none absolute -right-20 -top-48 h-[420px] w-[420px] rounded-full border border-white/10" /><div className="relative mx-auto max-w-[1440px] px-5 py-10 sm:px-8 sm:py-14"><Link to="/super-admin" className="inline-flex items-center gap-2 text-sm font-bold text-[#d3e1d4] transition hover:text-white"><ArrowLeft size={16} /> Admin overview</Link><div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.2em] text-[#b9d99d]"><span className="h-px w-6 bg-[#b9d99d]" /> Administration detail</p><h1 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">{page.title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#d3e1d4] sm:text-base">{page.description}</p></div><span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/15 bg-white/10" style={{ color: page.color }}><Icon size={22} /></span></div></div></section>
    <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 sm:py-10">{error && <p role="alert" className="mb-5 rounded-xl border border-[#efc7bd] bg-[#fff1ed] p-4 text-sm text-[#9b4c3e]">{error}</p>}{apiNeedsUpdate && <div role="alert" className="mb-5 rounded-2xl border border-[#ead7ae] bg-[#fff9e8] p-5 text-sm leading-6 text-[#775a23]"><strong className="block text-[#5c451b]">The admin API needs an update</strong><span className="mt-1 block">This server returns dashboard counts but not the detailed records yet. Deploy or restart the updated backend, then reload this page.</span></div>}{!data && !error ? <div className="rounded-2xl border border-[#e0e8de] bg-white p-6 text-sm text-[#718275]" role="status">Loading details…</div> : !apiNeedsUpdate && content}</section>
  </main>;
}

function Empty({ children }) {
  return <div className="rounded-[22px] border border-dashed border-[#cddbc9] bg-white px-6 py-12 text-center text-sm text-[#718275]">{children}</div>;
}
