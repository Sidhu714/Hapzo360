const statusRows = [
  { key: 'pending', label: 'Waiting for approval', color: '#d99442', tint: '#fff3df' },
  { key: 'approved', label: 'Accepted', color: '#315844', tint: '#e7f1e5' },
  { key: 'rejected', label: 'Rejected', color: '#a43732', tint: '#fcebea' },
];

export default function AdminContentInsights({ overview }) {
  const moderation = overview?.moderation || {};
  const content = overview?.content || {};
  const own = content.own || {};
  const external = content.external || {};
  const ownTotal = Number(own.jobs || 0) + Number(own.events || 0) + Number(own.trends || 0) + Number(own.technology || 0);
  const discoveredTotal = Number(external.happenings || 0);
  const apiTotal = Number(external.news || 0) + Number(external.prices || 0);
  const loadedApiCount = Number(Boolean(external.newsLoaded)) + Number(Boolean(external.pricesLoaded));
  const apiSummary = [
    external.newsLoaded ? `${external.news || 0} news` : 'News not loaded',
    external.pricesLoaded ? `${external.prices || 0} prices` : 'Prices not loaded',
  ].join(' · ');

  return <div className="mt-5 space-y-5">
    <section className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-extrabold">Approval status</h2>
      <p className="mt-1 text-sm text-[#6b786e]">Company-submitted Openings and Happenings. Accepted openings include expired listings.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {[["jobs", "Openings"], ["events", "Happenings"]].map(([key, title]) => <div key={key} className="rounded-2xl border border-[#e4ebe0] p-4">
          <h3 className="font-bold">{title}</h3>
          <div className="mt-4 grid grid-cols-3 gap-2">{statusRows.map((status) => <div key={status.key} className="rounded-xl p-3" style={{ backgroundColor: status.tint }}>
            <strong className="block text-2xl" style={{ color: status.color }}>{moderation[key]?.[status.key] ?? 0}</strong>
            <span className="mt-1 block text-xs leading-4 text-[#5d6d62]">{status.label}</span>
          </div>)}</div>
        </div>)}
      </div>
    </section>

    <section className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-extrabold">Hapzo360 and external content</h2>
      <p className="mt-1 text-sm text-[#6b786e]">Published site content alongside saved event discoveries and API data loaded since the server started.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-[#e8f1e6] p-5">
          <p className="text-sm font-semibold text-[#315844]">Published by Hapzo360</p>
          <strong className="mt-2 block text-4xl">{ownTotal}</strong>
          <p className="mt-2 text-xs leading-5 text-[#5d6d62]">{own.jobs || 0} live jobs · {own.events || 0} approved events · {(own.trends || 0) + (own.technology || 0)} stories</p>
        </div>
        <div className="rounded-2xl bg-[#eaf0f5] p-5">
          <p className="text-sm font-semibold text-[#426781]">Saved event discoveries</p>
          <strong className="mt-2 block text-4xl">{discoveredTotal}</strong>
          <p className="mt-2 text-xs leading-5 text-[#5d6d62]">Unique events in saved district searches</p>
        </div>
        <div className="rounded-2xl bg-[#faf0e4] p-5">
          <p className="text-sm font-semibold text-[#9c6134]">External API cache</p>
          <strong className="mt-2 block text-4xl">{loadedApiCount ? apiTotal : '—'}</strong>
          <p className="mt-2 text-xs leading-5 text-[#5d6d62]">{apiSummary}{loadedApiCount === 1 ? ' · Partial cache' : ''}</p>
        </div>
      </div>
    </section>

    <section className="rounded-2xl border border-[#d9e4d7] bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-extrabold">External sources</h2>
      <p className="mt-1 text-sm text-[#6b786e]">API counts appear after the corresponding page loads data. A dash means this server has not loaded that source yet.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {(content.sources || []).map((source) => {
          const status = !source.enabled ? 'Disabled' : source.loaded === false ? 'Not loaded' : source.loaded === undefined ? 'Saved results' : 'Loaded in memory';
          return <div key={source.name} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4ebe0] p-4">
            <div><strong className="text-sm">{source.name}</strong><p className="mt-1 text-xs text-[#718475]">{source.area} · {source.method}</p></div>
            <div className="text-right"><strong className="block text-lg">{source.enabled && source.loaded === false ? '—' : source.count}</strong><span className={`text-[11px] font-bold ${source.enabled && source.loaded !== false ? 'text-[#315844]' : 'text-[#9b8c80]'}`}>{status}</span></div>
          </div>;
        })}
      </div>
      {(content.newsPublishers || []).length > 0 && <p className="mt-5 text-xs leading-5 text-[#718475]">News publishers in cache: {content.newsPublishers.slice(0, 8).join(', ')}{content.newsPublishers.length > 8 ? ` and ${content.newsPublishers.length - 8} more` : ''}.</p>}
    </section>
  </div>;
}
