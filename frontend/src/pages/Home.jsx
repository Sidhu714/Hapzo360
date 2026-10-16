import { Link } from 'react-router-dom';
import {
  ArrowUpRight, BriefcaseBusiness, CalendarDays, Cpu, IndianRupee, TrendingUp,
} from 'lucide-react';

import { PRICING } from '../config';
import { useLanguage } from '../context/LanguageContext';

/* ------------------------------------------------------------------ */
/*  Sample content for the mini infographics. Replace with real data.  */
/* ------------------------------------------------------------------ */
const SAMPLE_JOBS = [
  { title: 'Machine Operator', meta: 'Coimbatore · ₹18,000', tag: 'Full-time', tile: 'bg-[#d4e99b]' },
  { title: 'Quality Inspector', meta: 'Tiruppur · ₹16,000', tag: 'Part-time', tile: 'bg-[#f4ead8]' },
  { title: 'Warehouse Assistant', meta: 'Chennai · ₹15,000', tag: 'Women', tile: 'bg-[#e5edf4]' },
];
const SAMPLE_SPLIT = { fullTime: 58, partTime: 42 };
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const EVENT_DAYS = [1, 4];
const BAR_HEIGHTS = [18, 30, 24, 42, 36, 58, 72];
const TECH_CHIPS = [
  { label: 'Automation', className: 'left-[1%] top-[4%]' },
  { label: 'Analytics', className: 'left-[30%] top-[60%]' },
  { label: 'Cloud', className: 'right-[1%] top-[16%]' },
];

/* ------------------------------------------------------------------ */
/*  Mini infographics (decorative, hidden from screen readers)         */
/* ------------------------------------------------------------------ */
function OpeningsGraphic() {
  return (
    <div className="space-y-5">
      <ul className="space-y-3">
        {SAMPLE_JOBS.map((job) => (
          <li
            key={job.title}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-3"
          >
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold text-[#172b20] ${job.tile}`}>
              {job.title[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold">{job.title}</span>
              <span className="block truncate text-xs text-white/55">{job.meta}</span>
            </span>
            <span className="shrink-0 rounded-full bg-[#d4e99b]/15 px-2.5 py-1 text-[11px] font-bold text-[#d4e99b]">
              {job.tag}
            </span>
          </li>
        ))}
      </ul>

      <div>
        <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
          <span className="h-full bg-[#d4e99b]" style={{ width: `${SAMPLE_SPLIT.fullTime}%` }} />
          <span className="h-full bg-[#8ca76b]" style={{ width: `${SAMPLE_SPLIT.partTime}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-white/60">
          <span>Full-time {SAMPLE_SPLIT.fullTime}%</span>
          <span>Part-time {SAMPLE_SPLIT.partTime}%</span>
        </div>
      </div>
    </div>
  );
}

function HappeningsGraphic() {
  return (
    <div>
      <div className="flex justify-between">
        {WEEK.map((day, index) => (
          <span
            key={index}
            className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${
              EVENT_DAYS.includes(index)
                ? 'bg-[#20372a] text-[#d4e99b]'
                : 'bg-white/70 text-[#8a7a58]'
            }`}
          >
            {day}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/80 p-3">
        <span className="h-10 w-1.5 shrink-0 rounded-full bg-[#20372a]" />
        <span>
          <span className="block text-sm font-bold">Hiring drive</span>
          <span className="block text-xs text-stone-500">Meet employers in person</span>
        </span>
      </div>
    </div>
  );
}

function TrendsGraphic() {
  return (
    <div className="relative">
      <span className="absolute right-0 top-0 inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#315844]">
        <TrendingUp size={13} /> Rising
      </span>
      <svg viewBox="0 0 220 90" className="h-28 w-full" preserveAspectRatio="none">
        {BAR_HEIGHTS.map((height, index) => (
          <rect
            key={index}
            x={8 + index * 30}
            y={90 - height}
            width="18"
            height={height}
            rx="5"
            fill={index === BAR_HEIGHTS.length - 1 ? '#315844' : '#bccfdc'}
          />
        ))}
        <polyline
          points="17,62 47,50 77,56 107,38 137,44 167,22 197,8"
          fill="none"
          stroke="#315844"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="197" cy="8" r="5" fill="#d4e99b" stroke="#315844" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

function PriceGraphic() {
  const rows = [
    { label: 'Consumables', price: PRICING.firstJob },
    { label: 'Yarn Price', price: PRICING.additionalJob },
  ];
  return (
    <div className="space-y-3 rounded-2xl bg-white/80 p-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold">{row.label}</span>
          <span className="flex-1 border-b border-dotted border-stone-300" />
          <span className="font-extrabold text-[#20372a]">₹</span>
        </div>
      ))}
    </div>
  );
}

function TechGraphic() {
  return (
    <div className="relative h-28">
      <svg
        viewBox="0 0 220 112"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <path
          d="M40 24 C95 24 85 78 140 78 C175 78 170 36 195 36"
          fill="none"
          stroke="#8ca76b"
          strokeWidth="2"
          strokeDasharray="4 5"
          strokeLinecap="round"
        />
      </svg>
      {TECH_CHIPS.map((chip) => (
        <span
          key={chip.label}
          className={`absolute inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#20372a] shadow-sm ${chip.className}`}
        >
          <span className="h-2 w-2 rounded-full bg-[#6b8b42]" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card definitions                                                   */
/* ------------------------------------------------------------------ */
const TONES = {
  forest: {
    card: 'bg-[#172b20] text-white',
    desc: 'text-white/65',
    badge: 'bg-[#d4e99b] text-[#172b20]',
    arrow: 'bg-[#d4e99b] text-[#172b20]',
  },
  sand: {
    card: 'bg-[#f4ead8] text-[#20372a]',
    desc: 'text-[#6f6248]',
    badge: 'bg-[#20372a] text-[#d4e99b]',
    arrow: 'bg-[#20372a] text-white',
  },
  sky: {
    card: 'bg-[#e5edf4] text-[#20372a]',
    desc: 'text-[#52677a]',
    badge: 'bg-[#20372a] text-[#d4e99b]',
    arrow: 'bg-[#20372a] text-white',
  },
  rose: {
    card: 'bg-[#f2e6e8] text-[#20372a]',
    desc: 'text-[#7a5c62]',
    badge: 'bg-[#20372a] text-[#d4e99b]',
    arrow: 'bg-[#20372a] text-white',
  },
  moss: {
    card: 'bg-[#eaf1df] text-[#20372a]',
    desc: 'text-[#56694a]',
    badge: 'bg-[#20372a] text-[#d4e99b]',
    arrow: 'bg-[#20372a] text-white',
  },
};

// `id` is also used for translation keys: services.<id>.title / .desc / .cta
// If a key is missing, the English text below is shown.
const SERVICES = [
  {
    id: 'openings',
    to: '/services/openings',
    icon: BriefcaseBusiness,
    tone: 'forest',
    title: 'Openings',
    desc: 'Browse jobs by type, gender and category. Apply with just your name and phone number.',
    cta: 'View all jobs',
    Graphic: OpeningsGraphic,
    className: 'md:col-span-2 lg:col-span-1 lg:row-span-2',
  },
  {
    id: 'happenings',
    to: '/services/happenings',
    icon: CalendarDays,
    tone: 'sand',
    title: 'Happenings',
    desc: 'Hiring drives, workshops and events happening around you.',
    cta: 'See what is on',
    Graphic: HappeningsGraphic,
  },
  {
    id: 'trends',
    to: '/services/trends',
    icon: TrendingUp,
    tone: 'sky',
    title: 'Trends',
    desc: 'See how industries are changing and which skills are in demand.',
    cta: 'Read the trends',
    Graphic: TrendsGraphic,
  },
  {
    id: 'price-list',
    to: '/services/price-list',
    icon: IndianRupee,
    tone: 'rose',
    title: 'Price List',
    desc: 'Clear rates for every service, so there are no surprises.',
    cta: 'View prices',
    Graphic: PriceGraphic,
  },
  {
    id: 'technologies',
    to: '/services/technologies',
    icon: Cpu,
    tone: 'moss',
    title: 'Technologies',
    desc: 'The tools and platforms that power modern workplaces.',
    cta: 'Explore tools',
    Graphic: TechGraphic,
  },
];

const translate = (t, key, fallback) => {
  const value = t(key);
  return typeof value === 'string' && value && value !== key ? value : fallback;
};

export default function ServiceGrid() {
  const { t } = useLanguage();

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 p-5">
      {SERVICES.map((service) => {
        const tone = TONES[service.tone];
        const Icon = service.icon;
        const Graphic = service.Graphic;

        return (
          <Link
            key={service.id}
            to={service.to}
            className={`group relative flex flex-col overflow-hidden rounded-[28px] p-6 outline-none focus-visible:ring-4 focus-visible:ring-[#70a879]/40 md:p-7 ${tone.card} ${service.className ?? ''}`}
          >
            {service.tone === 'forest' && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[36px] border-white/[.04]"
              />
            )}

            <div className="relative flex items-start gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${tone.badge}`}>
                <Icon size={22} />
              </span>
              <div>
                <h3 className="text-xl font-extrabold tracking-tight">
                  {translate(t, `services.${service.id}.title`, service.title)}
                </h3>
                <p className={`mt-1.5 max-w-sm text-sm leading-6 ${tone.desc}`}>
                  {translate(t, `services.${service.id}.desc`, service.desc)}
                </p>
              </div>
            </div>

            <div aria-hidden="true" className="relative mt-7 flex flex-1 flex-col justify-end">
              <Graphic />
            </div>

            <div className="relative mt-7 flex items-center justify-between text-sm font-bold">
              {translate(t, `services.${service.id}.cta`, service.cta)}
              <span
                className={`grid h-10 w-10 place-items-center rounded-full motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:translate-x-1 motion-safe:group-hover:-translate-y-1 ${tone.arrow}`}
              >
                <ArrowUpRight size={18} />
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}






    {/* <section className="page-shell mt-16 md:mt-20"><div className="grid gap-5 md:grid-cols-3">{[[<Search size={20}/>, 'Find your fit', t('how.1')],[<UsersRound size={20}/>, 'Meet local teams', t('how.2')],[<Check size={20}/>, 'Make your next move', t('how.3')]].map(([icon,title,desc],i)=><div key={title} className="surface-card relative overflow-hidden p-6 md:p-7"><span className="absolute right-5 top-3 text-5xl font-black tracking-tighter text-[#f0f3e9]">0{i+1}</span><span className="relative grid h-11 w-11 place-items-center rounded-xl bg-[#eaf1df] text-[#315844]">{icon}</span><h3 className="relative mt-5 text-lg font-bold text-[#23392c]">{title}</h3><p className="relative mt-2 text-sm leading-6 text-stone-500">{desc}</p></div>)}</div></section> */}


{/* <div className="page-hero px-6 py-12 md:px-14 md:py-16">
        <div className="relative z-10 max-w-3xl">
          <span className="page-kicker"><Sparkles size={14}/> Work that fits your life</span>
          <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-[-.055em] md:text-6xl">{t('home.heroTitle')} <span className="text-[#d4e99b]">closer to home.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-[#c5d0c7] md:text-lg">{t('home.heroSub')}</p>
          <form onSubmit={go} className="mt-8 flex max-w-3xl flex-col gap-2 rounded-2xl border border-white/15 bg-white p-2 shadow-2xl shadow-black/10 sm:flex-row sm:items-center sm:rounded-full">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 sm:pl-4"><Search className="h-5 w-5 shrink-0 text-[#66806b]"/><input aria-label={t('home.jobPlaceholder')} className="w-full bg-transparent text-sm text-[#24382c] outline-none placeholder:text-stone-400" placeholder={t('home.jobPlaceholder')} value={q} onChange={e=>setQ(e.target.value)}/></label>
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border-t border-stone-100 px-3 py-2 sm:border-l sm:border-t-0 sm:pl-4"><MapPin className="h-5 w-5 shrink-0 text-[#66806b]"/><input aria-label={t('home.location')} className="w-full bg-transparent text-sm text-[#24382c] outline-none placeholder:text-stone-400" placeholder={t('home.location')} value={loc} onChange={e=>setLoc(e.target.value)}/></label>
            <button className="btn-primary rounded-xl px-7 py-3 sm:rounded-full">{t('home.search')} <ArrowRight size={16}/></button>
          </form>
          <div className="mt-5 flex flex-wrap items-center gap-2"><span className="mr-1 text-xs font-semibold text-[#aebdb0]">Explore:</span>{CHIPS.map(([k,v])=><Link key={v} to={`/services/openings?${k}=${v}`} className="rounded-full border border-white/15 bg-white/[.06] px-3.5 py-1.5 text-xs font-semibold text-[#e7eee5] transition hover:border-[#d4e99b70] hover:bg-white/10">{t(`${k==='type'?'type':'gender'}.${v}`)}</Link>)}</div>
        </div>
        <div className="pointer-events-none absolute bottom-8 right-12 hidden w-52 rotate-[-5deg] rounded-2xl border border-white/15 bg-[#f8f8f0] p-4 text-[#1f382a] shadow-2xl lg:block"><div className="flex items-center justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#dce9b8]"><BriefcaseBusiness size={18}/></span><span className="rounded-full bg-[#e8f0dc] px-2 py-1 text-[10px] font-bold text-[#315844]">NEW ROLE</span></div><div className="mt-5 h-2 w-28 rounded-full bg-[#9eafa0]"/><div className="mt-2 h-2 w-20 rounded-full bg-[#d8dfd5]"/><div className="mt-4 flex gap-1.5"><i className="h-5 w-12 rounded-md bg-[#e8eedf]"/><i className="h-5 w-14 rounded-md bg-[#e8eedf]"/></div><div className="mt-5 flex items-center justify-between"><span className="text-xs font-bold">Your next chapter</span><ArrowDownRight size={18}/></div></div>
      </div> */}

      {/* <HeroCarousel/> */}