import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { usePeopleAuth } from '../../context/PeopleAuthContext';
import { useCompanyAuth } from '../../context/CompanyAuthContext';
import Loader from '../../components/Loader';
import FilterSidebar from './FilterSidebar';
import JobCard from './JobCard';
import JobDetail from './JobDetail';
import ApplyModal from './ApplyModal';
import SearchSelect from './SearchSelect';
import HiringPipeline from './HiringPipeline';
import * as api from './openingsApiRemote';
import { DISTRICTS } from '../../data/indiaLocations';
import './openings.css';

const DISTRICT_OPTIONS = [...new Set(Object.values(DISTRICTS).flat())].sort((a, b) => a.localeCompare(b));

const DAYS = { day: 1, week: 7, month: 30 };

function matches(j, f) {
  if (
    f.q &&
    !`${j.title} ${j.companyName}`
      .toLowerCase()
      .includes(f.q.toLowerCase())
  ) return false;

  if (
    f.loc &&
    !j.location.toLowerCase().includes(f.loc.toLowerCase())
  ) return false;

  if (
    f.date !== 'all' &&
    Date.now() - new Date(j.createdAt) > DAYS[f.date] * 864e5
  ) return false;

  return true;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Smoothly counts a number up/down whenever `target` changes. */
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const to = Number(target);
    if (!Number.isFinite(to)) return undefined;

    if (prefersReducedMotion()) {
      current.current = to;
      setValue(to);
      return undefined;
    }

    const from = current.current;
    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      current.current = from + (to - from) * eased;
      setValue(current.current);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

/** Scrolling strip of real openings. */
function TickerTape({ jobs, onOpen }) {
  const rows = jobs.slice(0, 14);
  if (rows.length < 3) return null;

  const group = (suffix) => (
    <div className="op-tape-group" key={suffix} aria-hidden={suffix === 'b' ? 'true' : undefined}>
      {rows.map((job) => (
        <button
          key={`${suffix}-${job.id}`}
          type="button"
          tabIndex={suffix === 'b' ? -1 : undefined}
          onClick={() => onOpen(job)}
          className="op-tape-item"
        >
          <Briefcase size={14} className="shrink-0 text-[#ffb04d]" />
          <span className="max-w-[260px] truncate font-bold text-white">{job.title}</span>
          <span className="max-w-[200px] truncate text-white/60">{job.companyName}</span>
          {job.location && <span className="max-w-[160px] truncate text-white/40">{job.location}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className="op-tape" role="marquee" aria-label="Latest job openings">
      <div className="op-tape-track">
        {group('a')}
        {group('b')}
      </div>
    </div>
  );
}

const STAGE_BACKGROUND = `
  radial-gradient(60% 45% at 92% 0%, rgba(255,176,77,.30), transparent 70%),
  radial-gradient(55% 45% at 0% 100%, rgba(214,51,108,.30), transparent 70%),
  linear-gradient(135deg, #1b0a12 0%, #4a1320 38%, #8f2b1d 76%, #c2411f 100%)
`;

const STYLES = `
.op-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.055) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:60px 60px;-webkit-mask-image:radial-gradient(ellipse at 70% 12%,#000 0%,transparent 72%);mask-image:radial-gradient(ellipse at 70% 12%,#000 0%,transparent 72%)}
.op-blob{position:absolute;border-radius:9999px;filter:blur(90px)}
.op-blob--a{top:-10%;right:-8%;width:560px;height:560px;background:#ff8a3d;opacity:.28;animation:op-drift 18s ease-in-out infinite alternate}
.op-blob--b{bottom:-14%;left:-10%;width:620px;height:620px;background:#d6336c;opacity:.26;animation:op-drift 24s ease-in-out infinite alternate-reverse}
@keyframes op-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(-60px,50px) scale(1.12)}}

.op-tape{overflow:hidden;border:1px solid rgba(255,255,255,.14);border-radius:18px;background:rgba(0,0,0,.22);-webkit-mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent);mask-image:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent)}
.op-tape-track{display:flex;width:max-content;animation:op-marquee 80s linear infinite}
.op-tape:hover .op-tape-track,.op-tape:focus-within .op-tape-track{animation-play-state:paused}
.op-tape-group{display:flex;flex-shrink:0}
.op-tape-item{display:inline-flex;align-items:center;gap:10px;padding:14px 26px;font-size:14px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.1);transition:background .2s}
.op-tape-item:hover{background:rgba(255,255,255,.09)}
@keyframes op-marquee{to{transform:translateX(-50%)}}

@media (prefers-reduced-motion:reduce){
  .op-blob,.op-tape-track{animation:none!important}
  .op-tape{overflow-x:auto}
}
`;

export default function OpeningsPage() {
  const { t } = useLanguage();
  const { person, requestPeopleAuth } = usePeopleAuth();
  const { company } = useCompanyAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState(null);
  const [loadError, setLoadError] = useState('');

  const [f, setF] = useState(() => ({
    q: params.get('q') || '',
    loc: params.get('loc') || '',
    date: 'all',
  }));

  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState(null);
  const [applyTo, setApplyTo] = useState(null);

  useEffect(() => {
    let active = true;
    const refreshJobs = () => api.listJobs().then((items) => {
      if (active) { setJobs(items); setLoadError(''); }
    }).catch((error) => {
      if (active) { setJobs((current) => current || []); setLoadError(error.message); }
    });
    refreshJobs();
    const interval = setInterval(refreshJobs, 30_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const action = location.state?.authAction;
    if (action?.type !== 'applyJob' || !person || company || !jobs) return;
    const job = jobs.find((item) => item.id === action.jobId);
    if (job) setApplyTo(job);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
  }, [location.state, location.pathname, location.search, person, company, jobs, navigate]);

  const list = useMemo(
    () => (jobs || []).filter((j) => matches(j, f)),
    [jobs, f]
  );

  const openRoles = useCountUp(jobs ? jobs.length : 0);

  if (!jobs) return <Loader />;

  const clear = () =>
    setF({
      ...f,
      date: 'all',
    });

  const startApply = (job) => {
    if (company) return;
    setDetail(null);
    requestPeopleAuth({
      purpose: 'application',
      action: { type: 'applyJob', jobId: job.id },
      onAuthenticated: () => setApplyTo(job),
    });
  };

  return (
    <div
      className="openings-page relative isolate min-h-screen overflow-x-clip text-white"
      style={{ background: STAGE_BACKGROUND }}
    >
      <style>{STYLES}</style>

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="op-grid" />
        <div className="op-blob op-blob--a" />
        <div className="op-blob op-blob--b" />
      </div>
      <HiringPipeline />

      <div className="page-shell relative z-10 py-8 md:py-11">
        {loadError && <p role="alert" className="mb-5 rounded-xl border border-white/20 bg-white/10 px-5 py-4 text-sm text-white">{loadError}</p>}
        {/* Hero */}
        <section className="py-6 md:py-10">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#ffc37a]">
              <Briefcase size={14} />
              Find your next move
            </span>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-[-.05em] text-white sm:text-5xl lg:text-6xl">
              {t('openings.title')}
            </h1>

            <p className="mt-4 max-w-xl text-base leading-7 text-white/75">
              Discover roles, compare what fits, and take the next step
              with confidence.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur">
                <p className="text-xs text-white/60">Open roles</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">{Math.round(openRoles)}</p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-3 backdrop-blur">
                <p className="text-xs text-white/60">Matching your filters</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-[#ffc37a]">{list.length}</p>
              </div>
            </div>
          </div>

        </section>

        {/* Ticker tape of real openings */}
        <TickerTape jobs={jobs} onOpen={setDetail} />

        {/* Search */}
        <div className="mt-6 grid gap-3 rounded-[20px] border border-white/50 bg-white p-3 text-[#26372d] shadow-xl shadow-[#1b0a12]/30 sm:grid-cols-2 sm:items-end lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <label htmlFor="openings-search" className="label mb-2 flex items-center gap-2">
              <Search className="h-4 w-4" />{t('home.search')}
            </label>
            <input
              id="openings-search"
              className="w-full rounded-xl border border-[#e8dcd8] bg-white px-4 py-3 text-sm text-[#26372d] outline-none transition placeholder:text-stone-400 focus:border-[#d9482b] focus:ring-4 focus:ring-[#d9482b]/10"
              placeholder={t('home.jobPlaceholder')}
              value={f.q}
              onChange={(e) => setF({ ...f, q: e.target.value })}
            />
          </div>

          <div className="min-w-0">
            <SearchSelect
              id="openings-district"
              label={<span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{t('home.location')}</span>}
              options={DISTRICT_OPTIONS}
              selected={f.loc ? [f.loc] : []}
              onSelect={(loc) => setF({ ...f, loc })}
              placeholder={t('home.location')}
              allowCustom
              customLabel={(value) => `Use “${value}”`}
            />
          </div>

          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#d9482b]/30 bg-[#fff3ee] px-4 py-3 text-sm font-bold text-[#8f2b1d] transition hover:bg-[#ffe6dc] sm:col-span-2 lg:col-span-1 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t('filters.title')}
          </button>
        </div>

        {/* Filters + job grid */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside
            className={`${
              showFilters ? 'block' : 'hidden'
            } lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto`}
          >
            <FilterSidebar
              filters={f}
              onChange={setF}
              onClear={clear}
            />
          </aside>

          <section className="min-w-0">
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white/85">
                {list.length} {t('openings.found')}
              </p>
            </div>

            {list.length ? (
              <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((j) => (
                  <JobCard
                    key={j.id}
                    job={j}
                    onOpen={setDetail}
                    onApply={company ? undefined : startApply}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/35 bg-white px-6 py-16 text-center">
                <Search className="mx-auto h-8 w-8 text-stone-400" />

                <p className="mt-4 font-bold text-[#3a1208]">
                  {t('openings.none')}
                </p>

                <p className="mt-2 text-sm text-stone-500">
                  Try changing your search or filters.
                </p>
              </div>
            )}
          </section>
        </div>

        {detail && (
          <JobDetail
            job={detail}
            onClose={() => setDetail(null)}
            onApply={company ? undefined : startApply}
          />
        )}

        {applyTo && !company && (
          <ApplyModal
            job={applyTo}
            person={person}
            onClose={() => setApplyTo(null)}
          />
        )}
      </div>
    </div>
  );
}
