import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Factory,
  Search,
  Shirt,
  Sparkles,
  TrendingUp,
  Truck,
  Wrench,
} from "lucide-react";
import API_BASE_URL from "../../config/api";

// `key` must match the keys in FEEDS inside your Express trends server.
const DOMAINS = [
  { key: "all", label: "All India trends", icon: TrendingUp, color: "bg-[#d9f2e5]" },
  { key: "manufacturing", label: "Manufacturing", icon: Factory, color: "bg-[#f4ead8]" },
  { key: "garments", label: "Garments & Textiles", icon: Shirt, color: "bg-[#d9f2e5]" },
  { key: "technology", label: "Technology", icon: Wrench, color: "bg-[#e5edf4]" },
  { key: "logistics", label: "Logistics", icon: Truck, color: "bg-[#f2e6e8]" },
];

const DOMAIN_BY_KEY = Object.fromEntries(DOMAINS.map((domain) => [domain.key, domain]));

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

function useTrends(domainKey, attempt) {
  const [state, setState] = useState({ articles: [], loading: true, error: "" });

  useEffect(() => {
    const controller = new AbortController();

    setState((prev) => ({ ...prev, loading: true, error: "" }));

    const params = new URLSearchParams({ domain: domainKey, country: "in" });

    fetch(`${API_BASE_URL}/api/trends?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Request failed");
        return response.json();
      })
      .then((data) => setState({ articles: data.articles ?? [], loading: false, error: "" }))
      .catch((error) => {
        if (error.name === "AbortError") return;

        setState({
          articles: [],
          loading: false,
          error: "We couldn't load the latest India trends. Check your connection and try again.",
        });
      });

    return () => controller.abort();
  }, [domainKey, attempt]);

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
      setValue(from + (to - from) * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setFrom(to);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return value;
}

/** Slowly rotates through a list when it is longer than `minLength`. */
function useRotate(length, ms = 5200, minLength = 5) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (length < minLength || prefersReducedMotion()) return undefined;
    const id = setInterval(() => setOffset((current) => (current + 1) % length), ms);
    return () => clearInterval(id);
  }, [length, ms, minLength]);

  useEffect(() => {
    setOffset(0);
  }, [length]);

  return offset;
}

// Falls back to a tinted tile when an article has no image or the image fails.
function ArticleImage({ src, domain }) {
  const [failed, setFailed] = useState(false);
  const Icon = domain.icon;

  if (!src || failed) {
    return (
      <div className={`grid h-full w-full place-items-center ${domain.color}`}>
        <Icon size={44} className="text-[#0d8560]/40" />
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
      <div className="tr-skeleton h-24 w-28 shrink-0 rounded-xl" />
      <div className="flex-1 space-y-3 py-1">
        <div className="tr-skeleton h-3 w-28 rounded" />
        <div className="tr-skeleton h-4 w-5/6 rounded" />
        <div className="tr-skeleton h-3 w-full rounded" />
        <div className="tr-skeleton h-3 w-2/3 rounded" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Trend animations                                                   */
/* ------------------------------------------------------------------ */

/** Background: faint chart grid, soft glow, and an animated market chart. */
function TrendBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="tr-grid" />
      <div className="tr-blob tr-blob--a" />
      <div className="tr-blob tr-blob--b" />
      <div className="tr-backdrop-chart">
        <PulseChart variant="background" />
      </div>
    </div>
  );
}

const STOCK_PRICE_LINE = "M10 96 L46 86 L82 90 L118 72 L154 78 L190 59 L226 65 L262 43 L298 50 L334 29 L370 36 L406 14 L442 21 L488 8";
const STOCK_VOLUME = [12, 20, 15, 26, 18, 32, 22, 38, 27, 44, 30, 48, 37];

/** Stock-style price line, volume bars, and a glowing marker tracking the market movement. */
function PulseChart({ variant = "hero" }) {
  const animate = !prefersReducedMotion();
  const areaId = `tr-area-${variant}`;

  return (
    <svg viewBox="0 0 500 180" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd166" stopOpacity=".34" />
          <stop offset="1" stopColor="#ffd166" stopOpacity="0" />
        </linearGradient>
      </defs>

      {[25, 55, 85, 115, 145].map((y) => (
        <line key={y} x1="0" x2="500" y1={y} y2={y} stroke="rgba(255,255,255,.1)" strokeDasharray="3 7" />
      ))}
      {[60, 120, 180, 240, 300, 360, 420, 480].map((x) => (
        <line key={x} x1={x} x2={x} y1="16" y2="148" stroke="rgba(255,255,255,.055)" />
      ))}

      <path className="tr-area" d={`${STOCK_PRICE_LINE} L488 150 L10 150Z`} fill={`url(#${areaId})`} />
      {STOCK_VOLUME.map((height, index) => (
        <rect key={index} x={20 + index * 36} y={174 - height / 2} width="12" height={height / 2} rx="2" fill={index % 4 === 1 ? "#ff8fb3" : "#ffd166"} opacity=".48" />
      ))}

      <path className="tr-line" pathLength="1" d={STOCK_PRICE_LINE} fill="none" stroke="#ffe18a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

      {animate && (
        <g>
          <circle r="12" fill="#ffd166" opacity=".4">
            <animateMotion dur="7s" repeatCount="indefinite" path={STOCK_PRICE_LINE} keyPoints="0;1;1" keyTimes="0;.6;1" calcMode="linear" />
            <animate attributeName="opacity" values=".3;.3;0;0" keyTimes="0;.6;.72;1" dur="7s" repeatCount="indefinite" />
          </circle>
          <circle r="5" fill="#fff">
            <animateMotion dur="7s" repeatCount="indefinite" path={STOCK_PRICE_LINE} keyPoints="0;1;1" keyTimes="0;.6;1" calcMode="linear" />
            <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.6;.72;1" dur="7s" repeatCount="indefinite" />
          </circle>
        </g>
      )}
    </svg>
  );
}

const ROW = 80;
const SHOW = 4;

/** Hero stage: ranked headlines that climb and swap below. */
function TrendBoard({ articles, loading }) {
  const feed = articles.slice(0, 6);
  const count = feed.length;
  const visible = Math.min(SHOW, count);
  const offset = useRotate(count);
  const total = useCountUp(articles.length);

  return (
    <div className="tr-board">
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <span className="tr-live" />
          Trending now
        </span>

        <span className="rounded-full bg-[#ff4f86] px-3 py-1 text-[11px] font-bold text-[#052f2a]">
          {loading ? "Loading" : `${Math.round(total)} stories`}
        </span>
      </div>

      {loading && (
        <div className="mt-3 space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="tr-skeleton h-[72px] rounded-2xl" />
          ))}
        </div>
      )}

      {!loading && count > 0 && (
        <div className="relative mt-3" style={{ height: visible * ROW - 8 }}>
          {feed.map((article, index) => {
            const position = (index - offset + count) % count;
            const shown = position < visible;
            const domain = DOMAIN_BY_KEY[article.domain] ?? DOMAINS[0];
            const Icon = domain.icon;

            return (
              <a
                key={article.id ?? article.link}
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                tabIndex={shown ? 0 : -1}
                className={`tr-row ${position === 0 ? "tr-row--top" : ""}`}
                style={{
                  transform: `translateY(${Math.min(position, visible) * ROW}px)`,
                  opacity: shown ? 1 : 0,
                  pointerEvents: shown ? "auto" : "none",
                }}
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${
                    position === 0 ? "bg-[#ff4f86] text-[#052f2a]" : "bg-white/15 text-white"
                  }`}
                >
                  {position + 1}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-bold leading-snug text-white">
                    {article.title}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 truncate text-xs text-white/55">
                    <Icon size={12} className="shrink-0 text-[#6ee7b7]" />
                    <span className="truncate">
                      {article.source}
                      {article.publishedAt ? ` · ${timeAgo(article.publishedAt)}` : ""}
                    </span>
                  </span>
                </span>
              </a>
            );
          })}
        </div>
      )}

      {!loading && count === 0 && (
        <div className="mt-3 rounded-2xl border border-dashed border-white/20 p-5 text-center text-sm text-white/60">
          Fresh India industry stories will appear here.
        </div>
      )}
    </div>
  );
}

/** Scrolling ticker tape of real headlines. */
function TickerTape({ articles }) {
  const rows = articles.slice(0, 12);
  if (rows.length < 3) return null;

  const group = (suffix) => (
    <div className="tr-tape-group" key={suffix} aria-hidden={suffix === "b" ? "true" : undefined}>
      {rows.map((article, index) => {
        const domain = DOMAIN_BY_KEY[article.domain] ?? DOMAINS[0];
        const Icon = domain.icon;

        return (
          <a
            key={`${suffix}-${article.id ?? index}`}
            href={article.link}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={suffix === "b" ? -1 : undefined}
            className="tr-tape-item"
          >
            <Icon size={14} className="shrink-0 text-[#ff4f86]" />
            <span className="font-bold text-[#6ee7b7]">{article.source || domain.label}</span>
            <span className="max-w-[360px] truncate text-white">{article.title}</span>
            {article.publishedAt && <span className="text-white/45">{timeAgo(article.publishedAt)}</span>}
          </a>
        );
      })}
    </div>
  );

  return (
    <div className="tr-tape" role="marquee" aria-label="Latest India trend headlines">
      <div className="tr-tape-track">
        {group("a")}
        {group("b")}
      </div>
    </div>
  );
}

const STYLES = `
.tr-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:100% 64px,64px 100%;-webkit-mask-image:radial-gradient(ellipse at 75% 15%,#000 0%,transparent 70%);mask-image:radial-gradient(ellipse at 75% 15%,#000 0%,transparent 70%)}
.tr-backdrop-chart{position:absolute;left:0;top:3vh;width:100%;height:78vh;min-height:420px;max-height:760px;opacity:.58;transform:none;-webkit-mask-image:none;mask-image:none}
.tr-backdrop-chart svg{overflow:visible}
.tr-blob{position:absolute;border-radius:9999px;filter:blur(80px);opacity:.45}
.tr-blob--a{top:-10%;right:-8%;width:660px;height:660px;background:#34d399;animation:tr-drift 12s ease-in-out infinite alternate}
.tr-blob--b{bottom:-16%;left:-10%;width:640px;height:640px;background:#ff4f86;opacity:.22;animation:tr-drift 16s ease-in-out infinite alternate-reverse}
@keyframes tr-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(-60px,50px) scale(1.12)}}

.tr-board{border-radius:30px;padding:18px 20px 20px;background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.2);box-shadow:0 30px 60px -30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.25);backdrop-filter:blur(18px)}
.tr-line{stroke-dasharray:1;stroke-dashoffset:1;filter:drop-shadow(0 0 7px rgba(255,209,102,.85));animation:tr-draw 7s cubic-bezier(.5,0,.3,1) infinite}
.tr-area{opacity:0;animation:tr-areafade 7s ease-in-out infinite}
@keyframes tr-draw{0%{stroke-dashoffset:1;opacity:1}60%,80%{stroke-dashoffset:0;opacity:1}95%,100%{stroke-dashoffset:0;opacity:0}}
@keyframes tr-areafade{0%,20%{opacity:0}60%,80%{opacity:1}95%,100%{opacity:0}}

.tr-live{position:relative;width:9px;height:9px;border-radius:50%;background:#4ade80}
.tr-live::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #4ade80;animation:tr-ping 1.8s ease-out infinite}
@keyframes tr-ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(3);opacity:0}}

.tr-row{position:absolute;left:0;right:0;top:0;height:72px;display:flex;align-items:flex-start;gap:12px;padding:10px 12px;border-radius:16px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);transition:transform .9s cubic-bezier(.6,.05,.2,1),opacity .6s ease,background .4s,border-color .4s}
.tr-row--top{background:rgba(255,255,255,.18);border-color:rgba(255,79,134,.75)}
.tr-row:hover{background:rgba(255,255,255,.2)}

.tr-tape{overflow:hidden;border-block:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.2);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.tr-tape-track{display:flex;width:max-content;animation:tr-marquee 90s linear infinite}
.tr-tape:hover .tr-tape-track,.tr-tape:focus-within .tr-tape-track{animation-play-state:paused}
.tr-tape-group{display:flex;flex-shrink:0}
.tr-tape-item{display:inline-flex;align-items:center;gap:10px;padding:14px 28px;font-size:14px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.1);transition:background .2s}
.tr-tape-item:hover{background:rgba(255,255,255,.08)}
@keyframes tr-marquee{to{transform:translateX(-50%)}}

.tr-editorial-lead{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);border-block:1px solid rgba(255,255,255,.2)}
.tr-editorial-lead-visual{position:relative;min-height:350px;overflow:hidden;background:#052f2a}
.tr-editorial-lead-copy{display:flex;flex-direction:column;justify-content:center;padding:38px 0 38px 42px}
.tr-editorial-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:42px}
.tr-editorial-story{min-width:0;border-top:1px solid rgba(255,255,255,.2);padding:21px 0}
@media(max-width:767px){.tr-editorial-lead{grid-template-columns:1fr}.tr-editorial-lead-visual{min-height:250px}.tr-editorial-lead-copy{padding:26px 0 32px}.tr-editorial-list{grid-template-columns:1fr;column-gap:0}}

.tr-skeleton{background:linear-gradient(100deg,rgba(255,255,255,.07) 30%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.07) 70%) 0 0/200% 100%;animation:tr-shimmer 1.4s linear infinite}
.tr-skeleton-light{background:linear-gradient(100deg,#e3f5ec 30%,#f4fcf8 50%,#e3f5ec 70%) 0 0/200% 100%;animation:tr-shimmer 1.4s linear infinite}
@keyframes tr-shimmer{to{background-position:-200% 0}}

@media (prefers-reduced-motion:reduce){
  .tr-blob,.tr-live::after,.tr-tape-track,.tr-skeleton,.tr-skeleton-light{animation:none!important}
  .tr-line{animation:none!important;stroke-dashoffset:0}
  .tr-area{animation:none!important;opacity:1}
  .tr-row{transition:none}
  .tr-tape{overflow-x:auto}
}
`;

function TrendsHero({ articles, loading }) {
  return (
    <section className="relative">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:px-12">
        {/* Left content */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#ff8fb3]">
              <Sparkles size={14} />
              Hapzo industry journal
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff4f86]/40 bg-[#ff4f86]/15 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#ff8fb3]">
              India trends
            </span>
          </div>

          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-[-.05em] text-white sm:text-5xl lg:text-6xl">
            India’s industries are changing.
            <br />
            <span className="font-medium italic text-[#ff8fb3]">Stay ahead.</span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">
            Discover the latest manufacturing, garment, technology and logistics developments from across
            India.
          </p>

          <a
            href="#explore-trends"
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#ff4f86] px-6 py-3.5 text-sm font-bold text-[#052f2a] shadow-lg shadow-[#ff4f86]/25 transition hover:bg-white"
          >
            Explore India trends
            <ArrowRight size={18} />
          </a>

          <div className="mt-8 flex items-center gap-3 text-xs text-white/65 sm:text-sm">
            <span className="h-px w-8 bg-[#ff4f86]" />
            Live headlines from Indian publishers.
          </div>
        </div>

        <TrendBoard articles={articles} loading={loading} />
      </div>
    </section>
  );
}

function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, onPageSizeChange }) {
  const pageNumbers = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    if (pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1) {
      pageNumbers.push(pageNumber);
    }
  }

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  const button =
    "rounded-lg border border-[#ccebdd] bg-white px-3 py-2 text-xs font-bold text-[#052f2a] transition hover:bg-[#e7f7ed] disabled:opacity-40";

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-[24px] border border-white/60 bg-white px-5 py-4 text-[#052f2a] shadow-xl shadow-black/20 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <span>
          Showing <span className="font-bold text-[#052f2a]">{startIndex}</span>–
          <span className="font-bold text-[#052f2a]">{endIndex}</span> of{" "}
          <span className="font-bold text-[#052f2a]">{totalItems}</span> stories
        </span>

        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Stories per page"
          className="rounded-lg border border-[#d8eee4] bg-[#f7fcf8] px-2 py-1.5 text-xs text-[#052f2a] outline-none focus:border-[#34d399]"
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
                  ? "bg-[#0d8560] text-white"
                  : "border border-[#ccebdd] bg-white text-[#052f2a] hover:bg-[#e7f7ed]"
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

export default function TrendsPage() {
  const [activeKey, setActiveKey] = useState("all");
  const [search, setSearch] = useState("");
  const [attempt, setAttempt] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const { articles, loading, error } = useTrends(activeKey, attempt);

  const query = search.trim().toLowerCase();

  const filteredTrends = useMemo(() => {
    return articles.filter((article) => {
      if (!query) return true;

      const searchable = [article.title, article.description, article.source, article.domain]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [articles, query]);

  const totalPages = Math.max(1, Math.ceil(filteredTrends.length / pageSize));

  const visibleTrends = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredTrends.slice(startIndex, startIndex + pageSize);
  }, [filteredTrends, page, pageSize]);
  const featuredTrend = page === 1 && activeKey === "all" && !query ? visibleTrends[0] : null;
  const listedTrends = featuredTrend ? visibleTrends.slice(1) : visibleTrends;

  useEffect(() => {
    setPage(1);
  }, [activeKey, search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-gradient-to-br from-[#052f2a] via-[#075c49] to-[#0d8560] text-white">
      <style>{STYLES}</style>
      <TrendBackdrop />

      <div className="relative z-10">
        <TrendsHero articles={articles} loading={loading} />

        {/* Ticker tape of real headlines */}
        {!loading && !error && <TickerTape articles={articles} />}

        {/* Explore trends */}
        <section id="explore-trends" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 text-white sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#a7f3d0]">
                Explore what’s happening in India
              </p>

              <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
                India trends worth your attention.
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                Latest headlines from Indian publishers across manufacturing, garments, technology and logistics.
              </p>
            </div>

            <div className="flex w-full items-center gap-2 rounded-full border border-white/50 bg-white/95 px-4 py-2.5 text-[#052f2a] shadow-lg shadow-black/10 md:max-w-xs">
              <Search size={16} className="shrink-0 text-stone-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search India trends..."
                aria-label="Search India trends"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
            {DOMAINS.map((domain) => (
              <button
                key={domain.key}
                onClick={() => setActiveKey(domain.key)}
                className={`shrink-0 rounded-full px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                  activeKey === domain.key
                    ? "bg-[#ff4f86] text-[#052f2a] shadow-lg shadow-[#ff4f86]/25"
                    : "border border-white/45 bg-white/95 text-stone-600 hover:border-[#ff4f86]"
                }`}
              >
                {domain.label}
              </button>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div className="mt-8 grid grid-cols-1 gap-x-10 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="mt-6 rounded-2xl border border-dashed border-[#b9ead5] bg-white/95 py-12 text-center text-[#052f2a]">
              <h3 className="font-bold">India trends are unavailable</h3>
              <p className="mt-1 text-sm text-stone-500">{error}</p>
              <button
                onClick={() => setAttempt((current) => current + 1)}
                className="mt-3 text-sm font-bold text-[#0d8560] underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {/* Articles */}
          {!loading && !error && filteredTrends.length > 0 && (
            <>
              {featuredTrend && (() => {
                const domain = DOMAIN_BY_KEY[featuredTrend.domain] ?? DOMAINS[0];
                return (
                  <article className="tr-editorial-lead group mt-8">
                    <a
                      href={featuredTrend.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Read featured story: ${featuredTrend.title}`}
                      className="tr-editorial-lead-visual block focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f86]"
                    >
                      <ArticleImage src={featuredTrend.image} domain={domain} />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#052f2a]/75 via-[#052f2a]/5 to-transparent" />
                      <span className="absolute bottom-5 left-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#052f2a]/55 px-3 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-white backdrop-blur-sm">
                        <domain.icon size={13} className="text-[#ff8fb3]" />
                        {featuredTrend.source || domain.label}
                      </span>
                      <span className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-[#052f2a]/40 text-white backdrop-blur-sm transition group-hover:bg-[#ff4f86] group-hover:text-[#052f2a]">
                        <ArrowUpRight size={19} />
                      </span>
                    </a>
                    <div className="tr-editorial-lead-copy">
                      <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#ff8fb3]">
                        <span className="h-px w-7 bg-[#ff4f86]" />
                        Lead story
                        <span className="text-white/55">· {domain.label}</span>
                        {featuredTrend.publishedAt && <span className="font-medium tracking-normal text-white/55">· {timeAgo(featuredTrend.publishedAt)}</span>}
                      </p>
                      <h3 className="mt-5 max-w-2xl text-3xl font-extrabold leading-[1.08] tracking-[-.045em] text-white sm:text-4xl lg:text-[2.7rem]">
                        {featuredTrend.title}
                      </h3>
                      {featuredTrend.description && (
                        <p className="mt-5 line-clamp-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                          {featuredTrend.description}
                        </p>
                      )}
                      <a href={featuredTrend.link} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex w-fit items-center gap-2 border-b border-[#ff4f86]/60 pb-2 text-sm font-bold text-[#ff8fb3] transition hover:border-white hover:text-white">
                        Read the full story <ArrowUpRight size={16} />
                      </a>
                    </div>
                  </article>
                );
              })()}

              {listedTrends.length > 0 && (
                <div className="tr-editorial-list mt-8">
                  {listedTrends.map((article, index) => {
                    const domain = DOMAIN_BY_KEY[article.domain] ?? DOMAINS[0];
                    return (
                      <article key={article.id ?? article.link} className="tr-editorial-story group">
                        <div className="flex items-start gap-4 sm:gap-5">
                          <a
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Read story: ${article.title}`}
                            className="h-[88px] w-[104px] shrink-0 overflow-hidden bg-[#052f2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4f86] sm:h-[96px] sm:w-[120px]"
                          >
                            <ArticleImage src={article.image} domain={domain} />
                          </a>
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#ff8fb3]">
                              <span>{domain.label}</span>
                              {article.source && <><span className="text-white/30">/</span><span className="text-white/55">{article.source}</span></>}
                              {article.publishedAt && <><span className="text-white/30">/</span><span className="font-medium normal-case tracking-normal text-white/50">{timeAgo(article.publishedAt)}</span></>}
                            </p>
                            <a href={article.link} target="_blank" rel="noopener noreferrer" className="mt-2 block text-base font-bold leading-snug text-white transition group-hover:text-[#ff8fb3] sm:text-lg">
                              {article.title}
                            </a>
                            {article.description && <p className="mt-2 line-clamp-1 text-xs leading-5 text-white/55 sm:text-sm">{article.description}</p>}
                          </div>
                          <span className="hidden pt-1 font-mono text-xs tabular-nums text-white/35 sm:block">{String(index + (featuredTrend ? 2 : 1)).padStart(2, '0')}</span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              <Pagination
                page={page}
                totalPages={totalPages}
                totalItems={filteredTrends.length}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </>
          )}

          {/* No results */}
          {!loading && !error && filteredTrends.length === 0 && (
            <div className="mt-6 rounded-2xl border border-dashed border-[#b9ead5] bg-white/95 py-12 text-center text-[#052f2a]">
              <Search className="mx-auto text-stone-400" size={24} />

              <h3 className="mt-3 font-bold">No matching India trends found</h3>

              <p className="mt-1 text-sm text-stone-500">Try another search term or category.</p>

              <button
                onClick={() => {
                  setSearch("");
                  setActiveKey("all");
                }}
                className="mt-3 text-sm font-bold text-[#0d8560] underline underline-offset-4"
              >
                Clear filters
              </button>
            </div>
          )}
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
          <div className="relative overflow-hidden rounded-[24px] border border-white/20 bg-gradient-to-r from-[#063c36]/90 via-[#08755d]/90 to-[#052f2a]/90 px-6 py-10 text-white shadow-2xl shadow-black/20 backdrop-blur-sm sm:px-10 sm:py-12">
            <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[40px] border-white/[.04]" />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ff8fb3]">Your next move</p>

                <h2 className="mt-2 max-w-2xl text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
                  Ready to find your place in India’s changing world of work?
                </h2>

                <p className="mt-2 max-w-xl text-xs leading-6 text-white/70 sm:text-sm">
                  Explore opportunities and discover where your skills can take you next.
                </p>
              </div>

              <Link
                to="/services/openings"
                className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#ff4f86] px-6 py-3.5 text-sm font-bold text-[#052f2a] transition hover:bg-white"
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
