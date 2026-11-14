import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Building2, CalendarDays, BriefcaseBusiness, Cpu, LogOut, Newspaper, Trash2, Users, X, Pencil } from 'lucide-react';
import { Logo } from '../../components/Navbar';
import AdminOverviewCharts from './AdminOverviewCharts';
import AdminContentInsights from './AdminContentInsights';
import AdminActionModal from './AdminActionModal';
import AdminCreateForm from './AdminCreateForm';
import EventEditModal from '../happenings/EventEditModal';
import JobEditModal from './JobEditModal';
import AdminOpeningForm from './AdminOpeningForm';
import SuperAdminReadOnlyOverview from './SuperAdminReadOnlyOverview';
import SuperAdminMetricPage from './SuperAdminMetricPage';
import { deleteAdminListing, deleteEditorialPost, getAdminClip, getAdminCollection, getAdminOverview, getAdminSession, getPendingReviews, reviewSubmission, getEditorialPosts, publishEditorialPost, uploadEditorialImage, logoutAdmin, updateAdminEvent, updateAdminJob } from './adminApi';

const sections = [
  { key: 'people', title: 'People', description: 'Individual accounts and activity', icon: Users },
  { key: 'companies', title: 'Companies', description: 'Company profiles and access', icon: Building2 },
  { key: 'jobs', title: 'Openings', description: 'Job listings and applications', icon: BriefcaseBusiness },
  { key: 'events', title: 'Happenings', description: 'Events and registrations', icon: CalendarDays },
];
const menuSections = [...sections,
  { key: 'trends', title: 'Trends', icon: Newspaper },
  { key: 'technology', title: 'Technologies', icon: Cpu },
];

function ReviewHistory({ history = [] }) {
  if (!history.length) return null;
  return <div className="mt-4 rounded-xl border border-[#d9e4d7] bg-[#f7faf4] p-3">
    <p className="text-xs font-extrabold uppercase tracking-wide text-[#52705b]">Review history</p>
    <ol className="mt-2 space-y-2">
      {history.map((review, index) => <li key={`${review.reviewedAt}-${index}`} className="text-xs leading-5 text-[#51645a]">
        <span className={`font-bold ${review.decision === 'reject' ? 'text-[#a43732]' : 'text-[#315844]'}`}>{review.decision === 'reject' ? 'Rejected' : 'Approved'}</span>
        {' by '}<span className="font-bold text-[#19342a]">{review.reviewerUsername}</span>
        {review.reviewedAt && <> · {new Date(review.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</>}
        {review.reason && <p className="mt-0.5 text-[#8e3b34]">Reason: {review.reason}</p>}
      </li>)}
    </ol>
  </div>;
}

export default function SuperAdminDashboard({ mode = 'overview' }) {
  const { metric } = useParams();
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    let active = true;
    getAdminSession().then((data) => { if (active) setSession(data); }).catch(() => { if (active) setSession(null); });
    return () => { active = false; };
  }, []);
  if (session === undefined) return <main className="grid min-h-screen place-items-center bg-[#101f1c] text-white">Checking administrator access…</main>;
  if (!session) return <Navigate to="/super-admin/login" replace />;
  if (session.role === 'super_admin') return mode === 'readonly-detail'
    ? <SuperAdminMetricPage session={session} metric={metric} />
    : <AdminManagementDashboard mode={mode} session={session} />;
  if (mode === 'readonly-detail') return <Navigate to="/super-admin" replace />;
  return <AdminManagementDashboard mode={mode} session={session} />;
}

function AdminManagementDashboard({ mode, session }) {
  const navigate = useNavigate();
  const { section } = useParams();
  const location = useLocation();
  const selected = section || '';
  const createKind = mode === 'create-job' ? 'jobs' : mode === 'create-event' ? 'events' : '';
  const [busy, setBusy] = useState(false);
  const [overview, setOverview] = useState(null);
  const [records, setRecords] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [clipUrl, setClipUrl] = useState('');
  const [clipBusy, setClipBusy] = useState(false);
  const [pending, setPending] = useState({ jobs: [], events: [] });
  const [editorial, setEditorial] = useState([]);
  const [draft, setDraft] = useState({ domain: new URLSearchParams(location.search).get('domain') === 'technology' ? 'technology' : 'all', title: '', description: '', body: '', image: '' });
  const [imageMode, setImageMode] = useState('upload');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [actionBusy, setActionBusy] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingJob, setEditingJob] = useState(null);
  const [editError, setEditError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [reviewReason, setReviewReason] = useState('');
  const [modalError, setModalError] = useState('');

  const refreshAdmin = async () => {
    const [summary, queue, posts] = await Promise.all([getAdminOverview(), getPendingReviews(), getEditorialPosts()]);
    setOverview(summary);
    setPending(queue);
    setEditorial(posts);
  };

  useEffect(() => {
    if (!session) return undefined;
    let active = true;
    Promise.all([getAdminOverview(), getPendingReviews(), getEditorialPosts()]).then(([summary, queue, posts]) => { if (active) { setOverview(summary); setPending(queue); setEditorial(posts); } }).catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!session || !['people', 'companies', 'jobs', 'events'].includes(selected)) return undefined;
    let active = true;
    setRecords([]);
    setLoadError('');
    getAdminCollection(selected).then((items) => { if (active) setRecords(items); }).catch((error) => { if (active) setLoadError(error.message); });
    return () => { active = false; };
  }, [session, selected]);

  const signOut = async () => {
    setBusy(true);
    try {
      await logoutAdmin();
      navigate('/super-admin/login', { replace: true });
    } catch {
      setBusy(false);
    }
  };

  const closeClip = () => {
    if (clipUrl) URL.revokeObjectURL(clipUrl);
    setClipUrl('');
  };

  const openClip = async (eventId) => {
    setClipBusy(true);
    setLoadError('');
    try { setClipUrl(URL.createObjectURL(await getAdminClip(eventId))); }
    catch (error) { setLoadError(error.message); }
    finally { setClipBusy(false); }
  };

  const decide = (kind, item, decision) => {
    setReviewReason('');
    setModalError('');
    setActionModal({ type: 'review', kind, item, decision });
  };

  const confirmAction = async () => {
    if (!actionModal) return;
    const { item, kind, decision, type } = actionModal;
    if (type === 'review' && decision === 'reject' && !reviewReason.trim()) { setModalError('Add a reason for rejection.'); return; }
    setActionBusy(item.id);
    setModalError('');
    try {
      if (type === 'delete') {
        await deleteEditorialPost(item.id);
        setEditorial((current) => current.filter((post) => post.id !== item.id));
        setNotice('Story deleted from the public feed.');
      } else if (type === 'delete-listing') {
        await deleteAdminListing(kind, item.id);
        setRecords((current) => current.filter((record) => record.id !== item.id));
        await refreshAdmin();
        setNotice(`${kind === 'jobs' ? 'Opening' : 'Happening'} removed from public listings.`);
      } else {
        await reviewSubmission(kind, item.id, decision, reviewReason.trim());
        await refreshAdmin();
        if (selected === kind) setRecords(await getAdminCollection(kind));
        setNotice(`${item.title} ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      }
      setActionModal(null);
      setReviewReason('');
    } catch (error) { setModalError(error.message); }
    finally { setActionBusy(''); }
  };

  const publishPost = async (event) => {
    event.preventDefault();
    setActionBusy('editorial');
    setLoadError('');
    try {
      const image = imageMode === 'upload' && imageFile ? await uploadEditorialImage(imageFile) : imageMode === 'link' ? draft.image.trim() : '';
      await publishEditorialPost({ ...draft, image });
      setDraft({ domain: 'all', title: '', description: '', body: '', image: '' });
      setImageFile(null);
      await refreshAdmin();
      setNotice('Article published to the live feed.');
    } catch (error) { setLoadError(error.message); }
    finally { setActionBusy(''); }
  };

  const deleteStory = (post) => {
    setModalError('');
    setActionModal({ type: 'delete', item: post });
  };

  const deleteListing = (kind, item) => {
    setModalError('');
    setActionModal({ type: 'delete-listing', kind, item });
  };

  const saveAdminEvent = async (event) => {
    if (!editingEvent) return;
    setActionBusy(editingEvent.id); setEditError('');
    try {
      await updateAdminEvent(editingEvent.id, event);
      setEditingEvent(null);
      setRecords(await getAdminCollection('events'));
      await refreshAdmin();
      setNotice('Happening updated.');
    } catch (error) { setEditError(error.message || 'Could not update this happening.'); }
    finally { setActionBusy(''); }
  };

  const saveAdminJob = async (job) => {
    if (!editingJob) return;
    setActionBusy(editingJob.id); setEditError('');
    try {
      await updateAdminJob(editingJob.id, job);
      setEditingJob(null);
      setRecords(await getAdminCollection('jobs'));
      await refreshAdmin();
      setNotice('Opening updated.');
    } catch (error) { setEditError(error.message || 'Could not update this opening.'); }
    finally { setActionBusy(''); }
  };

  useEffect(() => () => { if (clipUrl) URL.revokeObjectURL(clipUrl); }, [clipUrl]);
  useEffect(() => {
    if (!imageFile) { setImagePreview(''); return undefined; }
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const chooseImage = (file) => {
    if (!file) { setImageFile(null); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setImageFile(null);
      setLoadError('Choose a JPEG, PNG or WebP image under 5 MB.');
      return;
    }
    setLoadError('');
    setImageFile(file);
  };

  if (selected && ![...sections.map((item) => item.key), 'trends', 'technology'].includes(selected)) return <Navigate to="/super-admin" replace />;

  return <main className="min-h-screen bg-[#eef3e9] text-[#19342a]">
    <header className="navbar--home border-b border-[#d7e3d5] text-[#20372a]">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
        <div className="flex items-center gap-4"><Logo /><span className="border-l border-[#d7e3d5] pl-4 text-xs font-semibold text-[#52705b]">Admin</span></div>
        <div className="flex items-center gap-4 text-sm"><span className="max-w-[180px] truncate text-[#52705b]">{session.username}</span><button type="button" onClick={signOut} disabled={busy} className="inline-flex items-center gap-2 rounded-lg border border-[#d7e3d5] px-3 py-2 font-semibold hover:bg-[#e9eee5]"><LogOut size={15} /> Sign out</button></div>
      </div>
    </header>
    <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-5 py-8 lg:flex-row lg:gap-8 lg:py-12">
      <aside className="shrink-0 lg:w-60" aria-label="Admin menu"><div className="rounded-2xl border border-[#d9e4d7] bg-white p-3 shadow-sm lg:sticky lg:top-5"><p className="px-3 py-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#66806c]">Management</p><nav className="flex gap-1 overflow-x-auto lg:flex-col"><Link to="/super-admin" className={`shrink-0 rounded-xl px-3 py-3 text-sm font-bold transition ${!selected && mode === 'overview' ? 'bg-[#315844] text-white' : 'text-[#315844] hover:bg-[#eef3e9]'}`}>Overview</Link>{menuSections.map(({ key, title, icon: Icon }) => <Link key={key} to={`/super-admin/${key}`} className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition ${selected === key || createKind === key ? 'bg-[#315844] text-white' : 'text-[#315844] hover:bg-[#eef3e9]'}`}><Icon size={17} />{title}{(key === 'jobs' || key === 'events') && overview?.[key === 'jobs' ? 'pendingJobs' : 'pendingEvents'] > 0 && <span className="ml-auto rounded-full bg-[#e5efcf] px-2 py-0.5 text-[10px] text-[#315844]">{overview[key === 'jobs' ? 'pendingJobs' : 'pendingEvents']}</span>}</Link>)}</nav></div></aside>
      <div className="min-w-0 flex-1">
      {(selected || mode !== 'overview') && <Link to="/super-admin" className="mb-8 inline-flex text-sm font-bold text-[#315844] underline underline-offset-4">← Site overview</Link>}
      {!selected && mode === 'overview' && <>
      <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#52705b]">Administration</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Overview</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#5d6d62]">A shared view of accounts, openings and community events.</p>
      <AdminOverviewCharts overview={overview} />
      <AdminContentInsights overview={overview} />
      </>}
      {createKind === 'jobs' && <AdminOpeningForm onCreated={() => navigate('/super-admin/jobs')} />}
      {createKind === 'events' && <AdminCreateForm kind="events" onCreated={() => navigate('/super-admin/events')} />}
      {selected && <><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#52705b]">Administration</p><h1 className="mt-3 text-4xl font-extrabold tracking-tight">{sections.find((item) => item.key === selected)?.title || (selected === 'trends' ? 'Trends' : 'Technologies')}</h1></>}
      {(selected === 'jobs' || selected === 'events') && <Link to={`/super-admin/${selected}/new`} className="mt-5 inline-flex rounded-xl bg-[#315844] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#244936]">Create {selected === 'jobs' ? 'opening' : 'happening'} →</Link>}
      {(selected === 'jobs' || selected === 'events') && <section className="mt-10" aria-labelledby="review-heading">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#52705b]">Moderation</p><h2 id="review-heading" className="mt-2 text-2xl font-extrabold">Awaiting approval</h2></div><span className="rounded-full bg-[#dcebd4] px-4 py-2 text-sm font-bold">{pending.jobs.length + pending.events.length} pending</span></div>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {([selected]).map((kind) => <div key={kind}><h3 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-[#52705b]">{kind === 'jobs' ? 'Job posts' : 'Events'} · {pending[kind].length}</h3><div className="grid gap-4">{pending[kind].length ? pending[kind].map((item) => <article key={item.id} className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-[#66806c]">{item.companyName || 'Company'} · {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : ''}</p><h4 className="mt-2 text-lg font-extrabold">{item.title || 'Untitled'}</h4><p className="mt-1 text-sm text-[#596c5f]">{kind === 'jobs' ? item.location : `${item.venue || ''} · ${item.date ? new Date(item.date).toLocaleDateString('en-IN') : ''}`}</p><p className="mt-2 line-clamp-3 text-sm leading-6 text-[#586b5e]">{item.description || item.requirements || 'No description provided.'}</p><div className="mt-4 flex flex-wrap gap-2 border-t border-[#ecf0e9] pt-4">{kind === 'events' && item.clipAvailable && <button type="button" onClick={() => openClip(item.id)} disabled={clipBusy} className="rounded-lg border border-[#c5d5c5] px-3 py-2 text-xs font-bold">View clip</button>}<button type="button" disabled={Boolean(actionBusy)} onClick={() => decide(kind, item, 'approve')} className="rounded-lg bg-[#315844] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Approve</button><button type="button" disabled={Boolean(actionBusy)} onClick={() => decide(kind, item, 'reject')} className="rounded-lg border border-[#e3c0bd] px-3 py-2 text-xs font-bold text-[#9f3932] disabled:opacity-50">Reject</button></div></article>) : <p className="rounded-2xl border border-[#d9e4d7] bg-white p-5 text-sm text-[#6b786e] shadow-sm">Nothing to review.</p>}</div></div>)}
        </div>
      </section>}
      {mode === 'publish' && <section className="mt-12" aria-labelledby="editorial-heading"><p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#52705b]">Editorial</p><h2 id="editorial-heading" className="mt-2 text-2xl font-extrabold">Publish a story</h2><p className="mt-2 text-sm text-[#5d6d62]">Your article appears alongside the live news on Trends or Technologies.</p><form onSubmit={publishPost} className="mt-5 grid gap-4 rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-6"><label className="grid gap-2 text-sm font-bold">Page<select value={draft.domain} onChange={(event) => setDraft((current) => ({ ...current, domain: event.target.value }))} className="rounded-lg border border-[#cbd9ca] p-3"><option value="all">Trends</option><option value="technology">Technologies</option></select></label><label className="grid gap-2 text-sm font-bold">Headline<input required maxLength={255} value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} className="rounded-lg border border-[#cbd9ca] p-3" /></label><label className="grid gap-2 text-sm font-bold">Summary<textarea required maxLength={2000} rows={2} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="rounded-lg border border-[#cbd9ca] p-3" /></label><label className="grid gap-2 text-sm font-bold">Article<textarea required maxLength={30000} rows={8} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} className="rounded-lg border border-[#cbd9ca] p-3" /></label><div className="grid gap-3"><span className="text-sm font-bold">Story image <span className="font-normal text-[#6b786e]">(optional)</span></span><div className="flex gap-2" role="group" aria-label="Image source"><button type="button" onClick={() => setImageMode('upload')} className={`rounded-lg px-4 py-2 text-sm font-bold ${imageMode === 'upload' ? 'bg-[#315844] text-white' : 'border border-[#cbd9ca] text-[#315844]'}`}>Upload image</button><button type="button" onClick={() => setImageMode('link')} className={`rounded-lg px-4 py-2 text-sm font-bold ${imageMode === 'link' ? 'bg-[#315844] text-white' : 'border border-[#cbd9ca] text-[#315844]'}`}>Image link</button></div>{imageMode === 'upload' ? <label className="grid gap-2 text-sm text-[#6b786e]">JPEG, PNG or WebP · up to 5 MB<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseImage(event.target.files?.[0])} className="rounded-lg border border-[#cbd9ca] bg-white p-3 text-sm text-[#19342a]" /></label> : <label className="grid gap-2 text-sm text-[#6b786e]">HTTPS image URL<input type="url" value={draft.image} onChange={(event) => setDraft((current) => ({ ...current, image: event.target.value }))} className="rounded-lg border border-[#cbd9ca] p-3 text-[#19342a]" placeholder="https://example.com/image.jpg" /></label>}{(imageMode === 'upload' ? imagePreview : draft.image.startsWith('https://') ? draft.image : '') && <img src={imageMode === 'upload' ? imagePreview : draft.image} alt="Story image preview" className="h-48 w-full rounded-xl border border-[#d9e4d7] object-cover" />}</div><button type="submit" disabled={Boolean(actionBusy)} className="justify-self-start rounded-lg bg-[#315844] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Publish story</button></form>{editorial.length > 0 && <div className="mt-7"><h3 className="font-extrabold">Recent stories</h3><div className="mt-3 grid gap-4 sm:grid-cols-2">{editorial.map((post) => <article key={post.id} className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm"><span className="text-xs font-extrabold uppercase tracking-wide text-[#52705b]">{post.domain === 'technology' ? 'Technologies' : 'Trends'}</span><h4 className="mt-2 text-base font-extrabold">{post.title}</h4><p className="mt-2 line-clamp-2 text-sm text-[#6b786e]">{post.description}</p><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#ecf0e9] pt-3"><span className="text-xs text-[#86968a]">Published {new Date(post.publishedAt).toLocaleDateString('en-IN')}</span><button type="button" onClick={() => deleteStory(post)} disabled={Boolean(actionBusy)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#a43732] hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${post.title}`}><Trash2 size={14} /> Delete</button></div></article>)}</div></div>}</section>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-[#b4d4b1] bg-[#e3f1df] p-4 text-sm text-[#25513a]">{notice}</p>}
      {loadError && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</p>}
      {(selected === 'trends' || selected === 'technology') && <section className="mt-10"><div className="flex flex-wrap items-center justify-between gap-4"><div><h2 className="text-xl font-extrabold">Published stories</h2><p className="mt-1 text-sm text-[#6b786e]">Stories written by the Hapzo360 team</p></div><Link to={`/super-admin/stories/new?domain=${selected === 'technology' ? 'technology' : 'all'}`} className="rounded-xl bg-[#315844] px-5 py-3 text-sm font-bold text-white">Publish a story →</Link></div>{editorial.filter((post) => post.domain === (selected === 'technology' ? 'technology' : 'all')).length ? <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{editorial.filter((post) => post.domain === (selected === 'technology' ? 'technology' : 'all')).map((post) => <article key={post.id} className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm"><span className="text-xs font-extrabold uppercase tracking-wide text-[#52705b]">{selected === 'technology' ? 'Technologies' : 'Trends'}</span><h3 className="mt-2 text-base font-extrabold">{post.title}</h3><p className="mt-2 line-clamp-3 text-sm text-[#6b786e]">{post.description}</p><div className="mt-4 flex items-center justify-between gap-3 border-t border-[#ecf0e9] pt-3"><span className="text-xs text-[#86968a]">Published {new Date(post.publishedAt).toLocaleDateString('en-IN')}</span><button type="button" onClick={() => deleteStory(post)} disabled={Boolean(actionBusy)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#a43732] hover:bg-red-50 disabled:opacity-50" aria-label={`Delete ${post.title}`}><Trash2 size={14} /> Delete</button></div></article>)}</div> : <p className="mt-5 rounded-2xl border border-[#d9e4d7] bg-white p-6 text-sm text-[#6b786e] shadow-sm">No stories published yet.</p>}</section>}
      {['people', 'companies', 'jobs', 'events'].includes(selected) && <section className="mt-10">
        <div><h2 className="text-xl font-extrabold">{sections.find((item) => item.key === selected)?.title}</h2><p className="mt-1 text-xs text-[#6b786e]">Most recent 100 records</p></div>
        {records.length ? <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{records.map((item) => <article key={item.id} className="rounded-2xl border border-[#d9e4d7] bg-white p-5 text-sm shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wide text-[#66806c]">{sections.find((section) => section.key === selected)?.title}</span>
          <h3 className="mt-2 break-words text-base font-extrabold">{item.name || item.companyName || item.title || 'Untitled'}</h3>
          <p className="mt-2 break-words text-[#64736a]">{item.email || item.phone || item.location || item.venue || ''}</p>
          {item.createdByAdmin && <p className="mt-2 text-xs font-semibold text-[#315844]">Published by admin {item.creatorUsername}</p>}
          {item.status && <span className="mt-3 inline-block rounded-full bg-[#eef3e9] px-3 py-1 text-xs font-bold capitalize">{item.status}</span>}
          {(selected === 'jobs' || selected === 'events') && <ReviewHistory history={item.reviewHistory} />}
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#ecf0e9] pt-3">
            <span className="text-xs text-[#86968a]">{item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : ''}</span>
            <div className="flex items-center gap-3">
              {selected === 'events' && item.clipAvailable && <button type="button" disabled={clipBusy} onClick={() => openClip(item.id)} className="text-xs font-bold text-[#315844] underline underline-offset-2">View clip</button>}
              {selected === 'jobs' && <button type="button" onClick={() => { setEditError(''); setEditingJob(item); }} disabled={Boolean(actionBusy)} className="inline-flex items-center gap-1 text-xs font-bold text-[#315844] hover:underline disabled:opacity-50" aria-label={`Edit ${item.title}`}><Pencil size={14} /> Edit</button>}
              {selected === 'events' && <button type="button" onClick={() => { setEditError(''); setEditingEvent(item); }} disabled={Boolean(actionBusy)} className="inline-flex items-center gap-1 text-xs font-bold text-[#315844] hover:underline disabled:opacity-50" aria-label={`Edit ${item.title}`}><Pencil size={14} /> Edit</button>}
              {(selected === 'jobs' || selected === 'events') && <button type="button" onClick={() => deleteListing(selected, item)} disabled={Boolean(actionBusy)} className="inline-flex items-center gap-1 text-xs font-bold text-[#a43732] hover:underline disabled:opacity-50" aria-label={`Delete ${item.title}`}><Trash2 size={14} /> Delete</button>}
            </div>
          </div>
        </article>)}</div> : <p className="mt-4 rounded-2xl border border-[#d9e4d7] bg-white p-6 text-sm text-[#6b786e] shadow-sm">No records in this section yet.</p>}
      </section>}
      {clipUrl && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4" onClick={closeClip}><div className="w-full max-w-2xl rounded-2xl bg-white p-4" onClick={(event) => event.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h2 className="font-bold">Event verification clip</h2><button type="button" onClick={closeClip} aria-label="Close clip" className="rounded-lg p-2 hover:bg-stone-100"><X size={19} /></button></div><video src={clipUrl} controls className="max-h-[70vh] w-full rounded-xl bg-black" /></div></div>}
      {actionModal && <AdminActionModal action={actionModal} reason={reviewReason} onReasonChange={setReviewReason} onClose={() => setActionModal(null)} onConfirm={confirmAction} busy={actionBusy === actionModal.item.id} error={modalError} />}
      {editingEvent && <EventEditModal event={editingEvent} allowOrganizer onClose={() => !actionBusy && setEditingEvent(null)} onSave={saveAdminEvent} busy={actionBusy === editingEvent.id} error={editError} />}
      {editingJob && <JobEditModal job={editingJob} onClose={() => !actionBusy && setEditingJob(null)} onSave={saveAdminJob} busy={actionBusy === editingJob.id} error={editError} />}
      <Link to="/" className="mt-10 inline-flex text-sm font-bold text-[#315844] underline underline-offset-4">View public site</Link>
      </div>
    </div>
  </main>;
}





