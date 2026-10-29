import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Newspaper,
  Search,
  Sparkles,
} from "lucide-react";
import API_BASE_URL from "../../config/api";
import techBackgroundVideo from "../../assets/tech.webm";

// Uses the same proxy as the Trends page (see trends-proxy.mjs). The "technology"
// feed there is already set to NewsData's technology category.
const FEED_URL = `${API_BASE_URL}/api/trends?domain=technology`;

const PAGE_SIZES = [9, 12, 24, 48];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function timeAgo(iso) {
  if (!iso) return "";

  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

function useTechNews(attempt) {
  const [state, setState] = useState({ articles: [], loading: true, error: "" });

  useEffect(() => {
    const controller = new AbortController();

    setState((prev) => ({ ...prev, loading: true, error: "" }));

    fetch(FEED_URL, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => setState({ articles: data.articles ?? [], loading: false, error: "" }))
      .catch((err) => {
        if (err.name === "AbortError") return;

        setState({
          articles: [],
          loading: false,
          error: "We couldn't load the latest technology news. Check your connection and try again.",
        });
      });

    return () => controller.abort();
  }, [attempt]);

  return state;
}

/** Smoothly counts a number up/down whenever `target` changes. */
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  const [from, setFrom] = useState(0);

  useEffect(() => {
    const to = Number(target);
    if (!Number.isFinite(to)) return undefined;

    if (prefersReducedMotion()) {
      setValue(to);
      setFrom(to);
      return undefined;
    }

    const start = performance.now();
    let raf = 0;

    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      const next = from + (to - from) * eased;
      setValue(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setFrom(to);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

/** Steps through `length` items on a timer; clicking/hovering can jump to one. */
function useCycle(length, ms = 4500) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (length < 2 || prefersReducedMotion()) return undefined;
    const id = setTimeout(() => setActive((current) => (current + 1) % length), ms);
    return () => clearTimeout(id);
  }, [active, length, ms]);

  useEffect(() => {
    setActive(0);
  }, [length]);

  return [active, setActive];
}

// Tinted tile with an icon when an article has no image or the image fails to load
function ArticleImage({ src }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="tp-editorial-image-fallback relative grid h-full w-full place-items-center overflow-hidden bg-gradient-to-br from-[#081823] via-[#0b2637] to-[#102d42]">
        <span className="tp-fallback-orbit tp-fallback-orbit--one" />
        <span className="tp-fallback-orbit tp-fallback-orbit--two" />
        <span className="relative grid h-16 w-16 place-items-center rounded-2xl border border-white/25 bg-white/10 text-[#c9f36a] backdrop-blur-sm">
          <Cpu size={31} strokeWidth={1.4} />
        </span>
        <span className="absolute bottom-4 left-5 text-[9px] font-bold tracking-[.22em] text-white/65">TECH / FIELD NOTE</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
    />
  );
}

function SkeletonCard() {
  return (
    <div className="flex gap-5 border-t border-white/15 py-5">
      <div className="tp-skeleton h-24 w-28 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-3 py-1">
        <div className="tp-skeleton h-3 w-28 rounded" />
        <div className="tp-skeleton h-4 w-5/6 rounded" />
        <div className="tp-skeleton h-3 w-full rounded" />
        <div className="tp-skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tech animations                                                    */
/* ------------------------------------------------------------------ */

function TechBackdrop() {
  const motionAllowed = !prefersReducedMotion();
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <video className="tp-tech-video" autoPlay={motionAllowed} muted loop={motionAllowed} playsInline preload="auto" tabIndex={-1}>
        <source src={techBackgroundVideo} type="video/webm" />
      </video>
      <div className="tp-tech-video-wash" />
    </div>
  );
}

const HUB = { x: 250, y: 92 };
const NODES = [
  { x: 62, y: 40, label: "AI" },
  { x: 150, y: 160, label: "Cloud" },
  { x: 438, y: 34, label: "Chips" },
  { x: 352, y: 158, label: "Web" },
  { x: 470, y: 112, label: "Data" },
  { x: 28, y: 122, label: "Code" },
];

/** A cutaway-style circuit map with a signal travelling between system nodes. */
function NetworkGraphic() {
  const animate = !prefersReducedMotion();
  const routes = [
    { node: NODES[0], d: "M250 92H175V40H62", reverse: "M62 40H175V92H250" },
    { node: NODES[1], d: "M250 92H150V160", reverse: "M150 160V92H250" },
    { node: NODES[2], d: "M250 92H438V34", reverse: "M438 34V92H250" },
    { node: NODES[3], d: "M250 92H352V158", reverse: "M352 158V92H250" },
    { node: NODES[4], d: "M250 92H470V112", reverse: "M470 112V92H250" },
    { node: NODES[5], d: "M250 92H28V122", reverse: "M28 122V92H250" },
  ];

  return (
    <svg viewBox="0 0 500 190" className="h-full w-full" aria-hidden="true">
      {routes.map(({ node, d, reverse }, index) => (
        <g key={node.label}>
          <path d={d} className="tp-network-trace" />

          {animate && (
            <circle r="3.6" className={index % 2 ? "tp-network-packet tp-network-packet--aqua" : "tp-network-packet"}>
              <animateMotion
                dur={`${2.6 + index * 0.45}s`}
                begin={`${index * 0.5}s`}
                repeatCount="indefinite"
                path={index % 2 ? reverse : d}
              />
            </circle>
          )}

          <circle
            className="tp-node"
            cx={node.x}
            cy={node.y}
            r="6.5"
            fill="#081823"
            stroke="#52d9e7"
            strokeWidth="2"
            style={{ animationDelay: `${index * 0.35}s` }}
          />

          <text
            x={node.x}
            y={node.y - 13}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill="rgba(255,255,255,.78)"
          >
            {node.label}
          </text>
        </g>
      ))}

      <circle className="tp-hub-ring" cx={HUB.x} cy={HUB.y} r="24" fill="none" stroke="#c9f36a" strokeWidth="2" />
      <circle
        className="tp-hub-ring"
        cx={HUB.x}
        cy={HUB.y}
        r="24"
        fill="none"
        stroke="#c9f36a"
        strokeWidth="2"
        style={{ animationDelay: "1.2s" }}
      />
      <circle cx={HUB.x} cy={HUB.y} r="24" fill="#c9f36a" />
      <rect x={HUB.x - 10} y={HUB.y - 10} width="20" height="20" rx="4" fill="#081823" />
      <g stroke="#081823" strokeWidth="2" strokeLinecap="round">
        <path d={`M${HUB.x - 5} ${HUB.y - 15}v5M${HUB.x + 5} ${HUB.y - 15}v5M${HUB.x - 5} ${HUB.y + 10}v5M${HUB.x + 5} ${HUB.y + 10}v5`} />
        <path d={`M${HUB.x - 15} ${HUB.y - 5}h5M${HUB.x - 15} ${HUB.y + 5}h5M${HUB.x + 10} ${HUB.y - 5}h5M${HUB.x + 10} ${HUB.y + 5}h5`} />
      </g>
      <rect x={HUB.x - 4} y={HUB.y - 4} width="8" height="8" rx="2" fill="#c9f36a" />
    </svg>
  );
}

/** Hero stage: network graphic on top, auto-cycling live headlines below. */
function LiveFeed({ articles, loading }) {
  const feed = articles.slice(0, 4);
  const [active, setActive] = useCycle(feed.length);
  const count = useCountUp(articles.length);

  return (
    <div className="tp-board">
      <div className="h-[170px]">
        <NetworkGraphic />
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <span className="tp-live" />
          Live tech feed
        </span>

        <span className="inline-flex items-center gap-2 text-xs text-white/65">
          <Newspaper size={14} className="text-[#c9f36a]" />
          <b className="text-sm tabular-nums text-white">{loading ? "–" : Math.round(count)}</b>
          latest stories
        </span>
      </div>

      <ul className="mt-3 space-y-2">
        {loading &&
          Array.from({ length: 3 }).map((_, index) => (
            <li key={index} className="tp-skeleton h-[62px] rounded-2xl" />
          ))}

        {!loading &&
          feed.map((article, index) => {
            const isActive = index === active;

            return (
              <li key={article.id ?? article.link}>
                <a
                  href={article.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setActive(index)}
                  onFocus={() => setActive(index)}
                  className={`tp-feed-item ${isActive ? "tp-feed-item--active" : ""}`}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${
                      isActive ? "bg-[#c9f36a] text-[#081823]" : "bg-white/15 text-white"
                    }`}
                  >
                    {(article.source || "T")[0].toUpperCase()}
                  </span>

                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-sm font-bold leading-snug text-white">
                      {article.title}
                    </span>
                    <span className="mt-1 block truncate text-xs text-white/55">
                      {article.source}
                      {article.publishedAt ? ` · ${timeAgo(article.publishedAt)}` : ""}
                    </span>
                  </span>

                  {isActive && feed.length > 1 && <span key={active} className="tp-progress" />}
                </a>
              </li>
            );
          })}

        {!loading && feed.length === 0 && (
          <li className="rounded-2xl border border-dashed border-white/20 p-5 text-center text-sm text-white/60">
            Fresh technology stories will appear here.
          </li>
        )}
      </ul>
    </div>
  );
}

/** Scrolling ticker tape of real headlines. */
function TickerTape({ articles }) {
  const rows = articles.slice(0, 12);
  if (rows.length < 3) return null;

  const group = (suffix) => (
    <div className="tp-tape-group" key={suffix} aria-hidden={suffix === "b" ? "true" : undefined}>
      {rows.map((article, index) => (
        <a
          key={`${suffix}-${article.id ?? index}`}
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={suffix === "b" ? -1 : undefined}
          className="tp-tape-item"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#c9f36a]" />
          <span className="font-bold text-[#c9f36a]">{article.source || "Tech"}</span>
          <span className="max-w-[360px] truncate text-white">{article.title}</span>
          {article.publishedAt && <span className="text-white/45">{timeAgo(article.publishedAt)}</span>}
        </a>
      ))}
    </div>
  );

  return (
    <div className="tp-tape" role="marquee" aria-label="Latest technology headlines">
      <div className="tp-tape-track">
        {group("a")}
        {group("b")}
      </div>
    </div>
  );
}

const STYLES = `
.tp-tech-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;opacity:.66}
.tp-tech-video-wash{position:absolute;inset:0;background:linear-gradient(115deg,rgba(8,24,35,.82),rgba(16,45,66,.7) 52%,rgba(8,24,35,.62)),linear-gradient(180deg,rgba(8,24,35,.08),rgba(8,24,35,.58))}
.tp-network-trace{fill:none;stroke:rgba(82,217,231,.32);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.tp-network-packet{fill:#c9f36a;filter:drop-shadow(0 0 4px rgba(201,243,106,.9))}
.tp-network-packet--aqua{fill:#52d9e7;filter:drop-shadow(0 0 4px rgba(82,217,231,.9))}
.tp-editorial-image-fallback::before{content:"";position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:28px 28px;mask-image:linear-gradient(135deg,#000,transparent 75%)}
.tp-fallback-orbit{position:absolute;border:1px solid rgba(255,255,255,.18);border-radius:50%;transform:rotate(-28deg)}
.tp-fallback-orbit--one{width:240px;height:90px}
.tp-fallback-orbit--two{width:170px;height:64px;transform:rotate(42deg)}
.tp-editorial-lead{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);border-block:1px solid rgba(255,255,255,.2)}
.tp-editorial-lead-visual{position:relative;min-height:350px;overflow:hidden;background:#081823}
.tp-editorial-lead-copy{display:flex;flex-direction:column;justify-content:center;padding:38px 0 38px 42px}
.tp-editorial-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:42px}
.tp-editorial-story{min-width:0;border-top:1px solid rgba(255,255,255,.2);padding:21px 0}
@media(max-width:767px){.tp-editorial-lead{grid-template-columns:1fr}.tp-editorial-lead-visual{min-height:250px}.tp-editorial-lead-copy{padding:26px 0 32px}.tp-editorial-list{grid-template-columns:1fr;column-gap:0}}

.tp-board{border-radius:30px;padding:18px 20px 20px;background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.2);box-shadow:0 30px 60px -30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.25);backdrop-filter:blur(18px)}
.tp-node{transform-box:fill-box;transform-origin:center;animation:tp-pulse 2.4s ease-in-out infinite}
.tp-hub-ring{transform-box:fill-box;transform-origin:center;animation:tp-ring 2.4s ease-out infinite}
@keyframes tp-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.35)}}
@keyframes tp-ring{0%{transform:scale(1);opacity:.8}100%{transform:scale(2);opacity:0}}

.tp-live{position:relative;width:9px;height:9px;border-radius:50%;background:#c9f36a}
.tp-live::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #c9f36a;animation:tp-ping 1.8s ease-out infinite}
@keyframes tp-ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(3);opacity:0}}

.tp-feed-item{position:relative;display:flex;align-items:flex-start;gap:12px;overflow:hidden;border-radius:16px;padding:10px 12px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);transition:background .3s,border-color .3s,transform .3s;animation:tp-up .6s cubic-bezier(.2,.7,.2,1) backwards}
.tp-feed-item--active{background:rgba(255,255,255,.16);border-color:rgba(201,243,106,.7);transform:translateX(4px)}
.tp-progress{position:absolute;left:0;bottom:0;height:3px;width:100%;background:#c9f36a;transform-origin:left;animation:tp-fill 4.5s linear forwards}
@keyframes tp-fill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes tp-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

.tp-tape{overflow:hidden;border-block:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.tp-tape-track{display:flex;width:max-content;animation:tp-marquee 90s linear infinite}
.tp-tape:hover .tp-tape-track,.tp-tape:focus-within .tp-tape-track{animation-play-state:paused}
.tp-tape-group{display:flex;flex-shrink:0}
.tp-tape-item{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;font-size:14px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.1);transition:background .2s}
.tp-tape-item:hover{background:rgba(255,255,255,.08)}
@keyframes tp-marquee{to{transform:translateX(-50%)}}

.tp-skeleton{background:linear-gradient(100deg,rgba(255,255,255,.07) 30%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.07) 70%) 0 0/200% 100%;animation:tp-shimmer 1.4s linear infinite}
.tp-skeleton-light{background:linear-gradient(100deg,#edf4f5 30%,#f7fafb 50%,#edf4f5 70%) 0 0/200% 100%;animation:tp-shimmer 1.4s linear infinite}
@keyframes tp-shimmer{to{background-position:-200% 0}}

.tp-card{animation:tp-up .6s cubic-bezier(.2,.7,.2,1) backwards}

@media (prefers-reduced-motion:reduce){
  .tp-node,.tp-hub-ring,.tp-live::after,.tp-feed-item,.tp-progress,.tp-tape-track,.tp-skeleton,.tp-skeleton-light,.tp-card{animation:none!important}
  .tp-network-packet{display:none}
  .tp-tape{overflow-x:auto}
}
`;

function TechHero({ articles, loading }) {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1fr_1.05fr] lg:px-12">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#c9f36a]">
            <Sparkles size={14} />
            Technology news
          </span>

          <h1 className="mt-7 max-w-2xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
            Tech moves fast.
            <br />
            <span className="font-medium italic text-[#c9f36a]">Keep up.</span>
          </h1>

          <p className="mt-6 max-w-xl text-base leading-8 text-white/75">
            The latest technology headlines, gathered in one place and refreshed through the day.
          </p>

          <a
            href="#latest-news"
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#c9f36a] px-6 py-4 text-sm font-bold text-[#081823] shadow-lg shadow-[#c9f36a]/25 transition hover:bg-white"
          >
            Read the latest
            <ArrowRight size={18} />
          </a>

          <div className="mt-10 flex items-center gap-3 text-sm text-white/65">
            <span className="h-px w-10 bg-[#c9f36a]" />
            Stories link to the original publisher.
          </div>
        </div>

        <LiveFeed articles={articles} loading={loading} />
      </div>
    </section>
  );
}

function Pagination({ page, totalPages, totalItems, pageSize, onPageChange, onPageSizeChange }) {
  const pageNumbers = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    if (pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1) {
      pageNumbers.push(pageNumber);
    }
  }

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  const button =
    "rounded-lg border border-[#dce8ec] bg-white px-3 py-2 text-xs font-bold text-[#081823] transition hover:bg-[#eff7f8] disabled:opacity-40";

  return (
    <div className="mt-10 flex flex-col gap-4 rounded-[24px] border border-white/60 bg-white px-5 py-4 text-[#081823] shadow-xl shadow-[#02090b]/25 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <span>
          Showing <span className="font-bold text-[#081823]">{startIndex}</span>–
          <span className="font-bold text-[#081823]">{endIndex}</span> of{" "}
          <span className="font-bold text-[#081823]">{totalItems}</span> stories
        </span>

        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Stories per page"
          className="rounded-lg border border-[#dce8ec] bg-[#f5f9fa] px-2 py-1.5 text-xs text-[#081823] outline-none focus:border-[#52d9e7]"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => onPageChange(1)} disabled={page === 1} className={button}>
          First
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className={`inline-flex items-center gap-1 ${button}`}
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        {pageNumbers.map((pageNumber, index) => (
          <span key={pageNumber} className="flex items-center gap-1.5">
            {index > 0 && pageNumbers[index - 1] !== pageNumber - 1 && (
              <span className="px-1 text-stone-400">…</span>
            )}

            <button
              type="button"
              onClick={() => onPageChange(pageNumber)}
              className={`min-w-8 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                pageNumber === page
                  ? "bg-[#52d9e7] text-white"
                  : "border border-[#dce8ec] bg-white text-[#081823] hover:bg-[#eff7f8]"
              }`}
            >
              {pageNumber}
            </button>
          </span>
        ))}

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className={`inline-flex items-center gap-1 ${button}`}
        >
          Next
          <ChevronRight size={14} />
        </button>

        <button type="button" onClick={() => onPageChange(totalPages)} disabled={page === totalPages} className={button}>
          Last
        </button>
      </div>
    </div>
  );
}

export default function TechnologyPage() {
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const { articles, loading, error } = useTechNews(attempt);

  const query = search.trim().toLowerCase();

  const filteredArticles = useMemo(() => {
    return articles.filter(
      (article) =>
        !query ||
        `${article.title} ${article.description ?? ""} ${article.source ?? ""}`
          .toLowerCase()
          .includes(query)
    );
  }, [articles, query]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / pageSize));

  const visibleArticles = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredArticles.slice(startIndex, startIndex + pageSize);
  }, [filteredArticles, page, pageSize]);
  const featuredArticle = page === 1 && !query ? visibleArticles[0] : null;
  const listArticles = featuredArticle ? visibleArticles.slice(1) : visibleArticles;

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-gradient-to-br from-[#081823] via-[#0b2637] to-[#102d42] text-white">
      <style>{STYLES}</style>
      <TechBackdrop />

      <div className="relative z-10">
        <TechHero articles={articles} loading={loading} />

        {/* Ticker tape of real headlines */}
        {!loading && !error && <TickerTape articles={articles} />}

        {/* News */}
        <section id="latest-news" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#52d9e7]">What's new in tech</p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                Latest technology news.
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
                Stay informed about the tools, platforms and breakthroughs shaping how we work.
              </p>
            </div>

            <div className="flex w-full items-center gap-2 rounded-full border border-white/50 bg-white/95 px-4 py-3 text-[#081823] shadow-lg shadow-[#02090b]/25 md:max-w-xs">
              <Search size={18} className="shrink-0 text-stone-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search technology news..."
                aria-label="Search technology news"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-10 grid grid-cols-1 gap-x-10 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/35 bg-white/95 py-16 text-center text-[#081823]">
              <h3 className="font-bold">News is unavailable</h3>
              <p className="mt-2 text-sm text-stone-500">{error}</p>
              <button
                onClick={() => setAttempt((n) => n + 1)}
                className="mt-4 text-sm font-bold text-[#52d9e7] underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {/* Articles */}
          {!loading && !error && filteredArticles.length > 0 && (
            <>
              {featuredArticle && (
                <article className="tp-editorial-lead group mt-10">
                  <a
                    href={featuredArticle.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Read featured story: ${featuredArticle.title}`}
                    className="tp-editorial-lead-visual block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9f36a]"
                  >
                    <ArticleImage src={featuredArticle.image} />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#081823]/75 via-[#081823]/5 to-transparent" />
                    <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#081823]/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-white backdrop-blur-sm">
                      <Cpu size={13} className="text-[#c9f36a]" />
                      {featuredArticle.source || 'Technology'}
                    </span>
                    <span className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#081823]/40 text-white backdrop-blur-sm transition group-hover:bg-[#c9f36a] group-hover:text-[#081823]">
                      <ArrowUpRight size={19} />
                    </span>
                  </a>

                  <div className="tp-editorial-lead-copy">
                    <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#c9f36a]">
                      <span className="h-px w-7 bg-[#c9f36a]" />
                      Lead story
                      {featuredArticle.publishedAt && <span className="font-medium tracking-normal text-white/55">· {timeAgo(featuredArticle.publishedAt)}</span>}
                    </p>
                    <h3 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-[-.045em] text-white sm:text-4xl lg:text-[2.7rem]">
                      {featuredArticle.title}
                    </h3>
                    {featuredArticle.description && (
                      <p className="mt-5 line-clamp-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                        {featuredArticle.description}
                      </p>
                    )}
                    <a
                      href={featuredArticle.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-7 inline-flex w-fit items-center gap-2 border-b border-[#c9f36a]/60 pb-2 text-sm font-bold text-[#c9f36a] transition hover:border-white hover:text-white"
                    >
                      Read the full story
                      <ArrowUpRight size={16} />
                    </a>
                  </div>
                </article>
              )}

              {listArticles.length > 0 && (
                <div className={`tp-editorial-list ${featuredArticle ? 'mt-9' : 'mt-10'}`}>
                  {listArticles.map((article, index) => (
                    <article key={article.id ?? article.link} className="tp-editorial-story group">
                      <div className="flex items-start gap-4 sm:gap-5">
                        <a
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={`Read story: ${article.title}`}
                          className="h-[88px] w-[104px] shrink-0 overflow-hidden bg-[#081823] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c9f36a] sm:h-[96px] sm:w-[120px]"
                        >
                          <ArticleImage src={article.image} />
                        </a>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#c9f36a]">
                            <span>{article.source || 'Technology'}</span>
                            {article.publishedAt && <><span className="text-white/30">/</span><span className="font-medium normal-case tracking-normal text-white/50">{timeAgo(article.publishedAt)}</span></>}
                          </p>
                          <a href={article.link} target="_blank" rel="noopener noreferrer" className="mt-2 block text-base font-bold leading-snug text-white transition group-hover:text-[#c9f36a] sm:text-lg">
                            {article.title}
                          </a>
                          {article.description && <p className="mt-2 line-clamp-1 text-xs leading-5 text-white/55 sm:text-sm">{article.description}</p>}
                        </div>
                        <span className="hidden pt-1 font-mono text-xs tabular-nums text-white/35 sm:block">{String(index + (featuredArticle ? 2 : 1)).padStart(2, '0')}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={filteredArticles.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}

          {/* No results */}
          {!loading && !error && filteredArticles.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-white/35 bg-white/95 py-16 text-center text-[#081823]">
              <Search className="mx-auto text-stone-400" size={28} />

              <h3 className="mt-4 font-bold">No matching stories found</h3>

              <p className="mt-2 text-sm text-stone-500">
                {query
                  ? "Try another search term."
                  : "There are no technology stories right now. Please check back soon."}
              </p>

              {query && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-4 text-sm font-bold text-[#52d9e7] underline underline-offset-4"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          <p className="mt-8 text-xs text-white/70">
            Headlines provided by NewsData.io. Stories link to the original publisher.
          </p>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
          <div className="relative overflow-hidden rounded-[28px] border border-white/20 bg-gradient-to-r from-[#0b2637]/90 via-[#102d42]/90 to-[#081823]/90 px-6 py-12 text-white shadow-2xl shadow-[#02090b]/30 backdrop-blur-sm sm:px-12 sm:py-16">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[40px] border-white/[.04]" />

            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#c9f36a]">Your next move</p>

                <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                  Ready to put your tech skills to work?
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-white/70">
                  Explore opportunities and discover where your skills can take you next.
                </p>
              </div>

              <Link
                to="/services/openings"
                className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#c9f36a] px-6 py-4 text-sm font-bold text-[#081823] transition hover:bg-white"
              >
                Browse job openings
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
