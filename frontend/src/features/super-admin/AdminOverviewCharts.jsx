import { useState } from 'react';

const categories = [
  { key: 'people', label: 'People', color: '#315844' },
  { key: 'companies', label: 'Companies', color: '#8db86f' },
  { key: 'jobs', label: 'Openings', color: '#db9b62' },
  { key: 'events', label: 'Happenings', color: '#6c93b0' },
];

function AnalyticsPieCard({ title, total, description, segments }) {
  const chartTotal = segments.reduce((sum, segment) => sum + Number(segment.value || 0), 0);
  let progress = 0;
  const slices = segments.filter((segment) => Number(segment.value) > 0).map((segment) => {
    const start = progress;
    progress += Number(segment.value) / chartTotal * 100;
    return `${segment.color} ${start}% ${progress}%`;
  });
  return <section className="rounded-2xl border border-[#d9e4d7] bg-white p-4 shadow-sm sm:p-5" aria-label={`${title} analytics`}>
    <div className="min-w-0"><h2 className="text-base font-extrabold text-[#19342a]">{title}</h2><p className="mt-1 text-xs leading-5 text-[#6b786e]">{description}</p></div>
    <div className="mt-4 flex items-center gap-4">
      <div role="img" aria-label={`${title}: ${total} total`} className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: chartTotal ? `conic-gradient(${slices.join(', ')})` : '#e8eee6' }}>
        <div className="grid h-[72px] w-[72px] place-items-center rounded-full bg-white text-center shadow-[0_0_0_1px_#e8eee6]"><div><strong className="block text-2xl leading-none text-[#19342a]">{total}</strong><span className="mt-1 block text-[10px] font-semibold text-[#718475]">{title === 'Openings' || title === 'Happenings' ? 'posted' : 'items'}</span></div></div>
      </div>
      <dl className="min-w-0 flex-1 space-y-2">{segments.map((segment) => <div key={segment.label} className="flex items-center justify-between gap-3 text-xs"><dt className="flex min-w-0 items-center gap-2 font-medium text-[#51645a]"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: segment.color }} /><span className="truncate">{segment.label}</span></dt><dd className="font-extrabold text-[#19342a]">{Number(segment.value || 0)}</dd></div>)}</dl>
    </div>
  </section>;
}

export default function AdminOverviewCharts({ overview }) {
  const [activeDay, setActiveDay] = useState(6);
  const daily = overview?.daily || [];
  const totals = categories.map((item) => ({ ...item, value: Number(overview?.[item.key] || 0) }));
  const totalRecords = totals.reduce((sum, item) => sum + item.value, 0);
  const dailyTotals = daily.map((row) => ({ ...row, total: categories.reduce((sum, item) => sum + Number(row[item.key] || 0), 0) }));
  const maxDaily = Math.max(1, ...dailyTotals.map((item) => item.total));
  const points = dailyTotals.map((row, index) => ({ x: 46 + index * 84, y: 178 - row.total * 132 / maxDaily, ...row }));
  const line = points.reduce((path, point, index) => {
    if (!index) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midpoint = (previous.x + point.x) / 2;
    return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const area = points.length ? `${line} L ${points.at(-1).x} 178 L ${points[0].x} 178 Z` : '';
  let progress = 0;
  const slices = totals.filter((item) => item.value > 0).map((item) => {
    const start = progress;
    progress += item.value / totalRecords * 100;
    return `${item.color} ${start}% ${progress}%`;
  });
  const selectedPoint = points[Math.min(activeDay, points.length - 1)];
  const stories = Number(overview?.publishedStories || 0);
  const analytics = overview?.analytics || {};
  const openings = analytics.openings || { posted: Number(overview?.jobs || 0), ...(overview?.moderation?.jobs || {}) };
  const happenings = analytics.happenings || { posted: Number(overview?.events || 0), ...(overview?.moderation?.events || {}) };
  const trends = analytics.trends || { posted: Number(overview?.content?.own?.trends || 0), internet: 0 };
  const technology = analytics.technology || { posted: Number(overview?.content?.own?.technology || 0), internet: 0 };

  return <>
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: 'Total accounts', value: Number(overview?.people || 0) + Number(overview?.companies || 0), hint: 'People and companies' },
        { label: 'Openings', value: overview?.jobs ?? 0, hint: `All statuses · ${overview?.pendingJobs ?? 0} awaiting approval` },
        { label: 'Happenings', value: overview?.events ?? 0, hint: `All statuses · ${overview?.pendingEvents ?? 0} awaiting approval` },
        { label: 'Published stories', value: stories, hint: `${overview?.content?.own?.technology || 0} in Technologies` },
      ].map((metric) => <div key={metric.label} className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#66806c]">{metric.label}</p><p className="mt-3 text-4xl font-extrabold tracking-tight text-[#19342a]">{metric.value}</p><p className="mt-2 text-xs text-[#6b786e]">{metric.hint}</p></div>)}
    </div>
    <section className="mt-5" aria-labelledby="content-analytics-title">
      <div className="mb-4"><h2 id="content-analytics-title" className="text-xl font-extrabold text-[#19342a]">Content analytics</h2><p className="mt-1 text-sm leading-6 text-[#6b786e]">Live moderation and content-source breakdown. Internet figures are unique items currently cached by the backend.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <AnalyticsPieCard title="Openings" total={Number(openings.posted || 0)} description="Every opening submitted to Hapzo360" segments={[{ label: 'Accepted', value: openings.approved, color: '#315844' }, { label: 'Pending', value: openings.pending, color: '#d99442' }, { label: 'Rejected', value: openings.rejected, color: '#a43732' }]} />
        <AnalyticsPieCard title="Happenings" total={Number(happenings.posted || 0)} description="Every community event submission" segments={[{ label: 'Accepted', value: happenings.approved, color: '#315844' }, { label: 'Pending', value: happenings.pending, color: '#d99442' }, { label: 'Rejected', value: happenings.rejected, color: '#a43732' }]} />
        <AnalyticsPieCard title="Trends" total={Number(trends.posted || 0) + Number(trends.internet || 0)} description="Hapzo360 stories and internet data" segments={[{ label: 'Posted by Hapzo360', value: trends.posted, color: '#315844' }, { label: 'Fetched from internet', value: trends.internet, color: '#6c93b0' }]} />
        <AnalyticsPieCard title="Technologies" total={Number(technology.posted || 0) + Number(technology.internet || 0)} description="Hapzo360 stories and internet data" segments={[{ label: 'Posted by Hapzo360', value: technology.posted, color: '#315844' }, { label: 'Fetched from internet', value: technology.internet, color: '#9272b0' }]} />
      </div>
    </section>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_1fr]">
      <section className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="activity-title">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="activity-title" className="text-lg font-extrabold">Activity over time</h2><p className="mt-1 text-sm text-[#6b786e]">New accounts, jobs and events · last 7 days</p></div><div className="rounded-xl bg-[#eef3e9] px-4 py-2 text-right"><strong className="block text-xl leading-none text-[#315844]">{selectedPoint?.total ?? 0}</strong><span className="text-[11px] text-[#66806c]">{selectedPoint ? new Date(`${selectedPoint.day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}</span></div></div>
        <div className="mt-6 overflow-x-auto"><svg viewBox="0 0 600 225" role="img" aria-label="Daily new activity line graph" className="min-w-[520px] w-full"><defs><linearGradient id="adminActivityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8db86f" stopOpacity="0.38" /><stop offset="100%" stopColor="#8db86f" stopOpacity="0.01" /></linearGradient></defs>{[46, 112, 178].map((y) => <line key={y} x1="46" x2="550" y1={y} y2={y} stroke="#e8eee6" strokeDasharray="4 6" />)}<text x="8" y="50" fill="#849487" fontSize="11">{maxDaily}</text><text x="18" y="182" fill="#849487" fontSize="11">0</text>{area && <path d={area} fill="url(#adminActivityFill)" />}{line && <path d={line} fill="none" stroke="#315844" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />}{points.map((point, index) => <g key={point.day} onMouseEnter={() => setActiveDay(index)} onFocus={() => setActiveDay(index)} tabIndex={0} role="button" aria-label={`${point.day}: ${point.total} new records`}><circle cx={point.x} cy={point.y} r="14" fill="transparent" /><circle cx={point.x} cy={point.y} r={index === activeDay ? 6 : 4} fill="#fff" stroke="#315844" strokeWidth="3" /><text x={point.x} y="210" textAnchor="middle" fill="#718475" fontSize="11">{new Date(`${point.day}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</text></g>)}</svg></div><p className="mt-1 text-xs text-[#8a998c]">Hover or focus on a point to see its daily total. Dates use UTC.</p>
      </section>
      <section className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-6" aria-labelledby="distribution-title"><h2 id="distribution-title" className="text-lg font-extrabold">Records by type</h2><p className="mt-1 text-sm text-[#6b786e]">Accounts and submissions stored in MySQL, across all statuses</p><div className="mt-6 flex flex-col items-center gap-6 sm:flex-row xl:flex-col 2xl:flex-row"><div role="img" aria-label={`Pie chart of ${totalRecords} records across people, companies, openings and happenings`} className="relative grid h-52 w-52 shrink-0 place-items-center rounded-full" style={{ background: totalRecords ? `conic-gradient(${slices.join(', ')})` : '#e8eee6' }}><div className="grid h-32 w-32 place-items-center rounded-full bg-white text-center shadow-[0_0_0_1px_#e8eee6]"><div><strong className="block text-3xl leading-none text-[#19342a]">{totalRecords}</strong><span className="mt-1 block text-xs text-[#718475]">total records</span></div></div></div><div className="w-full space-y-3">{totals.map((item) => <div key={item.key} className="flex items-center justify-between gap-4 text-sm"><span className="flex items-center gap-2"><i className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span><strong>{item.value} <span className="ml-1 text-xs font-normal text-[#8a998c]">{totalRecords ? Math.round(item.value / totalRecords * 100) : 0}%</span></strong></div>)}</div></div></section>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm"><p className="text-sm text-[#66806c]">Applications</p><p className="mt-2 text-3xl font-extrabold">{overview?.applications ?? 0}</p></div><div className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm"><p className="text-sm text-[#66806c]">Event registrations</p><p className="mt-2 text-3xl font-extrabold">{overview?.registrations ?? 0}</p></div></div>
  </>;
}
