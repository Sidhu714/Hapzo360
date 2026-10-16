// import { useEffect, useMemo, useState } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
// import { useLanguage } from '../../context/LanguageContext';
// import Loader from '../../components/Loader';
// import FilterSidebar from './FilterSidebar';
// import JobCard from './JobCard';
// import JobDetail from './JobDetail';
// import ApplyModal from './ApplyModal';
// import * as api from './openingsApi';

// const DAYS = { week: 7, month: 30 };

// // One place that decides whether a job passes the current filters.
// function matches(j, f) {
//   if (f.q && !`${j.title} ${j.companyName}`.toLowerCase().includes(f.q.toLowerCase())) return false;
//   if (f.loc && !j.location.toLowerCase().includes(f.loc.toLowerCase())) return false;
//   if (f.date !== 'all' && Date.now() - new Date(j.createdAt) > DAYS[f.date] * 864e5) return false;
//   if (f.types.length && !f.types.includes(j.jobType)) return false;
//   if (f.genders.length && j.gender !== 'any' && !f.genders.includes(j.gender)) return false;
//   if (f.categories.length && !f.categories.includes(j.category)) return false;
//   return true;
// }

// export default function OpeningsPage() {
//   const { t } = useLanguage();
//   const [params] = useSearchParams();
//   const [jobs, setJobs] = useState(null);
//   const [f, setF] = useState(() => ({
//     q: params.get('q') || '', loc: params.get('loc') || '', date: 'all',
//     types: params.get('type') ? [params.get('type')] : [],
//     genders: params.get('gender') ? [params.get('gender')] : [],
//     categories: [],
//   }));
//   const [showFilters, setShowFilters] = useState(false);
//   const [detail, setDetail] = useState(null);
//   const [applyTo, setApplyTo] = useState(null);

//   useEffect(() => { api.listJobs().then(setJobs); }, []);
//   const list = useMemo(() => (jobs || []).filter((j) => matches(j, f)), [jobs, f]);
//   if (!jobs) return <Loader />;

//   const clear = () => setF({ ...f, date: 'all', types: [], genders: [], categories: [] });
//   const startApply = (job) => { setDetail(null); setApplyTo(job); };

//   return (
//     <div className="page-shell py-8 md:py-11">
//       <section className="page-hero px-6 py-9 md:px-10 md:py-11"><p className="page-kicker">Find your next move</p><h1 className="mt-4 text-3xl font-extrabold tracking-[-.05em] md:text-5xl">{t('openings.title')}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d0c7]">Discover roles, compare what fits, and take the next step with confidence.</p></section>

//       <div className="mt-5 flex flex-col gap-2 rounded-[20px] border border-[#e3e8dc] bg-white p-2 shadow-sm sm:flex-row">
//         <label className="flex flex-1 items-center gap-2 px-3 py-2">
//           <Search className="h-5 w-5 text-stone-400" />
//           <input className="w-full bg-transparent text-sm outline-none" placeholder={t('home.jobPlaceholder')} value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
//         </label>
//         <label className="flex flex-1 items-center gap-2 border-t border-stone-200 px-3 py-2 sm:border-l sm:border-t-0">
//           <MapPin className="h-5 w-5 text-stone-400" />
//           <input className="w-full bg-transparent text-sm outline-none" placeholder={t('home.location')} value={f.loc} onChange={(e) => setF({ ...f, loc: e.target.value })} />
//         </label>
//         <button className="btn-outline lg:hidden" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="h-4 w-4" />{t('filters.title')}</button>
//       </div>

//       <div className="mt-6 grid gap-6 lg:grid-cols-[19rem_1fr]">
//         <aside className={`${showFilters ? 'block' : 'hidden'} lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:self-start lg:overflow-y-auto`}>
//           <FilterSidebar jobs={jobs} filters={f} onChange={setF} onClear={clear} />
//         </aside>

//         <section>
//           <p className="mb-4 text-sm font-semibold text-[#526750]">{list.length} {t('openings.found')}</p>
//           {list.length ? (
//             <div className="space-y-4">{list.map((j) => <JobCard key={j.id} job={j} onOpen={setDetail} onApply={startApply} />)}</div>
//           ) : <p className="card p-10 text-center text-stone-500">{t('openings.none')}</p>}
//         </section>
//       </div>

//       {detail && <JobDetail job={detail} onClose={() => setDetail(null)} onApply={startApply} />}
//       {applyTo && <ApplyModal job={applyTo} onClose={() => setApplyTo(null)} />}
//     </div>
//   );
// }




import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapPin, Search, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import Loader from '../../components/Loader';
import FilterSidebar from './FilterSidebar';
import JobCard from './JobCard';
import JobDetail from './JobDetail';
import ApplyModal from './ApplyModal';
import * as api from './openingsApi';

const DAYS = { week: 7, month: 30 };

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

  if (f.types.length && !f.types.includes(j.jobType)) return false;

  if (
    f.genders.length &&
    j.gender !== 'any' &&
    !f.genders.includes(j.gender)
  ) return false;

  if (f.categories.length && !f.categories.includes(j.category)) {
    return false;
  }

  return true;
}

export default function OpeningsPage() {
  const { t } = useLanguage();
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState(null);

  const [f, setF] = useState(() => ({
    q: params.get('q') || '',
    loc: params.get('loc') || '',
    date: 'all',
    types: params.get('type') ? [params.get('type')] : [],
    genders: params.get('gender') ? [params.get('gender')] : [],
    categories: [],
  }));

  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState(null);
  const [applyTo, setApplyTo] = useState(null);

  useEffect(() => {
    api.listJobs().then(setJobs);
  }, []);

  const list = useMemo(
    () => (jobs || []).filter((j) => matches(j, f)),
    [jobs, f]
  );

  if (!jobs) return <Loader />;

  const clear = () =>
    setF({
      ...f,
      date: 'all',
      types: [],
      genders: [],
      categories: [],
    });

  const startApply = (job) => {
    setDetail(null);
    setApplyTo(job);
  };

  return (
    <div className="page-shell py-8 md:py-11">
      {/* Hero */}
      <section className="page-hero px-6 py-9 md:px-10 md:py-11">
        <p className="page-kicker">Find your next move</p>

        <h1 className="mt-4 text-3xl font-extrabold tracking-[-.05em] md:text-5xl">
          {t('openings.title')}
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#c5d0c7]">
          Discover roles, compare what fits, and take the next step
          with confidence.
        </p>
      </section>

      {/* Search */}
      <div className="mt-5 flex flex-col gap-2 rounded-[20px] border border-[#e3e8dc] bg-white p-2 shadow-sm sm:flex-row">
        <label className="flex flex-1 items-center gap-2 px-3 py-2">
          <Search className="h-5 w-5 text-stone-400" />

          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder={t('home.jobPlaceholder')}
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
          />
        </label>

        <label className="flex flex-1 items-center gap-2 border-t border-stone-200 px-3 py-2 sm:border-l sm:border-t-0">
          <MapPin className="h-5 w-5 text-stone-400" />

          <input
            className="w-full bg-transparent text-sm outline-none"
            placeholder={t('home.location')}
            value={f.loc}
            onChange={(e) => setF({ ...f, loc: e.target.value })}
          />
        </label>

        <button
          type="button"
          className="btn-outline lg:hidden"
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
            jobs={jobs}
            filters={f}
            onChange={setF}
            onClear={clear}
          />
        </aside>

        <section className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#526750]">
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
                  onApply={startApply}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9e2d1] bg-white px-6 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-stone-400" />

              <p className="mt-4 font-bold text-[#20372a]">
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
          onApply={startApply}
        />
      )}

      {applyTo && (
        <ApplyModal
          job={applyTo}
          onClose={() => setApplyTo(null)}
        />
      )}
    </div>
  );
}
