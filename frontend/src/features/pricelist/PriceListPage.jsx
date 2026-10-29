import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { getPrices } from "../../services/mandiPrices";

const CATEGORIES = [
  { value: "all", label: "All commodities" },
  { value: "vegetables", label: "Vegetables" },
  { value: "fruits", label: "Fruits" },
  { value: "yarn", label: "Yarn" },
  { value: "agriculture", label: "Other agricultural" },
];

const LOCATIONS = [
  "All Tamil Nadu",
  "Chennai",
  "Coimbatore",
  "Tiruppur",
  "Erode",
  "Salem",
  "Madurai",
  "Dindigul",
  "Thanjavur",
  "Tiruchirappalli",
];

const PAGE_SIZES = [10, 25, 50, 100];

const numberFormat = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

function formatPrice(value, currency = "INR") {
  if (value === null || value === undefined || value === "") return "—";

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `₹${numberFormat.format(Number(value))}`;
  }
}

function formatDate(value) {
  if (!value) return "Date not provided";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Update time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Update time unavailable";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function titleCase(value = "") {
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getPriceChange(item) {
  const current = Number(item.modalPrice);
  const previous = Number(item.previousModalPrice);

  if (
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous <= 0 ||
    current === previous
  ) {
    return null;
  }

  return ((current - previous) / previous) * 100;
}

const hasPrice = (item) =>
  item.modalPrice !== null &&
  item.modalPrice !== undefined &&
  Number.isFinite(Number(item.modalPrice));

/* ------------------------------------------------------------------ */
/*  Small hooks                                                        */
/* ------------------------------------------------------------------ */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Smoothly counts a number up/down whenever `target` changes. */
function useCountUp(target, duration = 1000) {
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

function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}

/* ------------------------------------------------------------------ */
/*  Price visuals                                                      */
/* ------------------------------------------------------------------ */
function AnimatedPrice({ value, currency }) {
  const animated = useCountUp(value);
  const display = Number(value) >= 100 ? Math.round(animated) : animated;
  return <>{formatPrice(display, currency)}</>;
}

/** Shows where the modal price sits between the minimum and maximum. */
function RangeBar({ item, tone = "light" }) {
  const min = Number(item.minPrice);
  const max = Number(item.maxPrice);
  const modal = Number(item.modalPrice);

  if (![min, max, modal].every(Number.isFinite) || max <= min) return null;

  const position = Math.min(100, Math.max(0, ((modal - min) / (max - min)) * 100));

  return (
    <div
      className={`pl-range ${tone === "dark" ? "pl-range--dark" : ""}`}
      style={{ "--pos": `${position}%` }}
      aria-hidden="true"
    >
      <span className="pl-range-fill" />
      <span className="pl-range-dot" />
    </div>
  );
}

function PriceRange({ item }) {
  const hasMin = item.minPrice !== null && item.minPrice !== undefined;
  const hasMax = item.maxPrice !== null && item.maxPrice !== undefined;

  if (!hasMin && !hasMax) return <span className="text-stone-400">—</span>;

  return (
    <div className="text-sm">
      <span className="font-semibold text-[#35121d]">
        {hasMin ? formatPrice(item.minPrice, item.currency) : "—"}
      </span>
      <span className="mx-1.5 text-stone-400">–</span>
      <span className="font-semibold text-[#35121d]">
        {hasMax ? formatPrice(item.maxPrice, item.currency) : "—"}
      </span>
    </div>
  );
}

function PriceChange({ item, tone = "light" }) {
  const change = getPriceChange(item);
  if (change === null) return null;

  const increased = change > 0;
  const Icon = increased ? TrendingUp : TrendingDown;
  const colors =
    tone === "dark"
      ? increased
        ? "bg-rose-400/20 text-rose-200"
        : "bg-emerald-400/20 text-emerald-200"
      : increased
        ? "bg-rose-50 text-rose-700"
        : "bg-emerald-50 text-emerald-700";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${colors}`}>
      <Icon size={12} />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

/** Live board in the hero: real prices counting up, with range bars. */
function LiveBoard({ items, loading, error, location, updatedAt }) {
  const rows = items.filter(hasPrice).slice(0, 4);

  return (
    <div className="pl-board">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
          <span className="pl-live" />
          Live market board
        </span>
        <span className="truncate text-xs text-white/60">{location}</span>
      </div>

      <div className="mt-4 space-y-2.5">
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="pl-skeleton h-[74px] rounded-2xl" />
          ))}

        {!loading &&
          !error &&
          rows.map((item, index) => (
            <div
              key={item.id ?? `${item.name}-${index}`}
              className="pl-board-row"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">{item.name}</p>
                  <p className="mt-0.5 truncate text-xs text-white/55">
                    {item.market || item.location || "—"} · per {item.unit || "unit"}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-lg font-extrabold tabular-nums text-white">
                    <AnimatedPrice value={item.modalPrice} currency={item.currency} />
                  </p>
                  <PriceChange item={item} tone="dark" />
                </div>
              </div>

              <RangeBar item={item} tone="dark" />
            </div>
          ))}

        {!loading && (error || rows.length === 0) && (
          <div className="grid h-[200px] place-items-center rounded-2xl border border-dashed border-white/20 px-6 text-center text-sm text-white/60">
            Live prices appear here as soon as the market data loads.
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] leading-5 text-white/45">
        Bar shows where the modal price sits between the day’s minimum and maximum.
        {updatedAt ? ` Updated ${formatDateTime(updatedAt)}.` : ""}
      </p>
    </div>
  );
}

/** Scrolling ticker tape of real prices. */
function TickerTape({ items }) {
  const rows = items.filter(hasPrice).slice(0, 16);
  if (rows.length < 3) return null;

  const group = (suffix) => (
    <div className="pl-tape-group" key={suffix} aria-hidden={suffix === "b" ? "true" : undefined}>
      {rows.map((item, index) => {
        const change = getPriceChange(item);
        return (
          <span key={`${suffix}-${item.id ?? index}`} className="pl-tape-item">
            <span className="font-bold text-white">{item.name}</span>
            <span className="tabular-nums text-[#ffafd1]">
              {formatPrice(item.modalPrice, item.currency)}
            </span>
            <span className="text-white/45">/{item.unit || "unit"}</span>
            {change !== null && (
              <span className={change > 0 ? "text-rose-300" : "text-emerald-300"}>
                {change > 0 ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
              </span>
            )}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="pl-tape" role="marquee" aria-label="Latest wholesale prices">
      <div className="pl-tape-track">
        {group("a")}
        {group("b")}
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-[#faeaf1]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="px-5 py-5">
          <div className="pl-skeleton-light h-4 w-32 rounded" />
          <div className="pl-skeleton-light mt-3 h-3 w-48 rounded" />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Live price backdrop: candlesticks scroll past a glowing price line  */
/* ------------------------------------------------------------------ */
const CANDLES = 28; // candles in one repeating cycle (the chart loops seamlessly)
const STEP = 36; // horizontal spacing between candles (chart units)
const VW = 1440;
const VH = 420;
const MARK_X = 1130; // where the live marker sits
const SPEED = 24; // chart units per second
const TAU = Math.PI * 2;

// a smooth, endlessly repeating "price" curve (0..1)
const level = (u) =>
  0.5 + 0.17 * Math.sin((TAU * u) / CANDLES) + 0.1 * Math.sin((TAU * 3 * u) / CANDLES + 1) + 0.05 * Math.sin((TAU * 7 * u) / CANDLES + 2);
const yOf = (v) => 36 + (1 - v) * (VH - 130);
const noise = (i) => {
  const n = ((i % CANDLES) + CANDLES) % CANDLES;
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function PriceBackdrop() {
  const groupRef = useRef(null);
  const markerRef = useRef(null);

  // three repeating cycles of static candles, volume bars and the price line
  const chart = useMemo(() => {
    const total = CANDLES * 3;
    const shapes = [];

    for (let i = 0; i < total; i += 1) {
      const open = level(i);
      const close = level(i + 1);
      const high = Math.max(open, close) + 0.02 + 0.05 * noise(i);
      const low = Math.min(open, close) - 0.02 - 0.05 * noise(i + 7);
      const cx = (i + 0.5) * STEP;
      const up = close >= open;
      const colour = up ? "#ffb3d6" : "#a78bfa";
      const bodyTop = yOf(Math.max(open, close));
      const bodyHeight = Math.max(3, Math.abs(yOf(open) - yOf(close)));
      const volume = 14 + 46 * noise(i + 3);

      shapes.push(
        <rect key={`v${i}`} x={cx - 8} y={VH - 8 - volume} width="16" height={volume} rx="2" fill={colour} opacity=".28" />,
        <line key={`w${i}`} className="pl-wick" x1={cx} x2={cx} y1={yOf(high)} y2={yOf(low)} stroke={colour} />,
        <rect key={`b${i}`} x={cx - 8} y={bodyTop} width="16" height={bodyHeight} rx="2.5" fill={colour} opacity={up ? 0.95 : 0.8} />
      );
    }

    let d = "";
    for (let k = 0; k <= total * 2; k += 1) {
      const u = k / 2;
      d += `${k ? "L" : "M"}${(u * STEP).toFixed(1)} ${yOf(level(u)).toFixed(1)}`;
    }

    return { shapes, d };
  }, []);

  useEffect(() => {
    const group = groupRef.current;
    const marker = markerRef.current;
    if (!group || !marker) return undefined;

    const span = CANDLES * STEP;

    const draw = (seconds) => {
      const offset = (seconds * SPEED) % span;
      group.setAttribute("transform", `translate(${(-offset).toFixed(2)} 0)`);
      const y = yOf(level((offset + MARK_X) / STEP));
      marker.style.transform = `translateY(${((y / VH) * 100).toFixed(3)}%)`;
    };

    if (prefersReducedMotion()) {
      draw(4);
      return undefined;
    }

    const start = performance.now();
    let raf = 0;
    const loop = (now) => {
      draw((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="pl-grid" />
      <div className="pl-blob pl-blob--a" />
      <div className="pl-blob pl-blob--b" />

      <div className="pl-backdrop-chart">
        <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none">
          {[70, 140, 210, 280, 350].map((y) => (
            <line key={y} x1="0" x2={VW} y1={y} y2={y} stroke="rgba(255,255,255,.1)" strokeDasharray="3 8" />
          ))}

          <g ref={groupRef}>
            {chart.shapes}
            <path d={chart.d} className="pl-line-glow" />
            <path d={chart.d} className="pl-line" />
          </g>
        </svg>

        <div ref={markerRef} className="pl-marker">
          <i className="pl-rule" />
          <i className="pl-dot" />
          <b className="pl-tag">₹ Live</b>
        </div>
      </div>
    </div>
  );
}

const STYLES = `
.pl-blob{position:absolute;border-radius:9999px;filter:blur(70px);opacity:.5}
.pl-blob--a{top:-12%;right:-8%;width:640px;height:640px;background:#ff5fa8;animation:pl-drift 12s ease-in-out infinite alternate}
.pl-blob--b{bottom:-14%;left:-10%;width:680px;height:680px;background:#6d3df0;animation:pl-drift 16s ease-in-out infinite alternate-reverse}
@keyframes pl-drift{from{transform:translate(0,0) scale(1)}to{transform:translate(-60px,50px) scale(1.12)}}

.pl-board{border-radius:28px;padding:22px;background:linear-gradient(160deg,rgba(255,255,255,.14),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.2);box-shadow:0 30px 60px -30px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.25);backdrop-filter:blur(18px)}
.pl-board-row{border-radius:16px;padding:12px 14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);animation:pl-up .6s cubic-bezier(.2,.7,.2,1) backwards}
.pl-live{position:relative;width:9px;height:9px;border-radius:50%;background:#4ade80}
.pl-live::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #4ade80;animation:pl-ping 1.8s ease-out infinite}
@keyframes pl-ping{0%{transform:scale(1);opacity:.8}100%{transform:scale(3);opacity:0}}
@keyframes pl-up{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

.pl-range{position:relative;margin-top:10px;height:6px;border-radius:99px;background:#f5dce8}
.pl-range--dark{background:rgba(255,255,255,.16)}
.pl-range-fill{position:absolute;inset:0 auto 0 0;width:var(--pos);border-radius:99px;background:linear-gradient(90deg,#ff9ac6,#ff4f9a);transform-origin:left;animation:pl-grow 1s cubic-bezier(.2,.7,.2,1) backwards}
.pl-range-dot{position:absolute;top:50%;left:var(--pos);width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#fff;border:3px solid #ff4f9a;box-shadow:0 0 0 4px rgba(255,79,154,.2);animation:pl-dot 1s cubic-bezier(.2,.7,.2,1) backwards}
@keyframes pl-grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pl-dot{from{left:0;opacity:0}to{left:var(--pos);opacity:1}}

.pl-tape{overflow:hidden;border-block:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.18);-webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent);mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
.pl-tape-track{display:flex;width:max-content;animation:pl-marquee 60s linear infinite}
.pl-tape:hover .pl-tape-track{animation-play-state:paused}
.pl-tape-group{display:flex;flex-shrink:0}
.pl-tape-item{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;font-size:14px;white-space:nowrap;border-right:1px solid rgba(255,255,255,.1)}
@keyframes pl-marquee{to{transform:translateX(-50%)}}

.pl-skeleton{background:linear-gradient(100deg,rgba(255,255,255,.07) 30%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.07) 70%) 0 0/200% 100%;animation:pl-shimmer 1.4s linear infinite}
.pl-skeleton-light{background:linear-gradient(100deg,#faeaf1 30%,#fff5f9 50%,#faeaf1 70%) 0 0/200% 100%;animation:pl-shimmer 1.4s linear infinite}
@keyframes pl-shimmer{to{background-position:-200% 0}}

.pl-row{animation:pl-up .5s cubic-bezier(.2,.7,.2,1) backwards}

.pl-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:100% 64px,64px 100%;-webkit-mask-image:radial-gradient(ellipse at 75% 15%,#000 0%,transparent 70%);mask-image:radial-gradient(ellipse at 75% 15%,#000 0%,transparent 70%)}
.pl-backdrop-chart{position:absolute;left:0;top:4vh;width:100%;height:76vh;min-height:420px;max-height:780px;opacity:.55;-webkit-mask-image:linear-gradient(90deg,transparent 0,#000 10%,#000 88%,transparent 100%),linear-gradient(180deg,#000 0,#000 72%,transparent 100%);-webkit-mask-composite:source-in;mask-image:linear-gradient(90deg,transparent 0,#000 10%,#000 88%,transparent 100%),linear-gradient(180deg,#000 0,#000 72%,transparent 100%);mask-composite:intersect}
.pl-backdrop-chart svg{display:block;width:100%;height:100%}
.pl-wick{vector-effect:non-scaling-stroke;stroke-width:1.6;stroke-linecap:round}
.pl-line-glow{fill:none;stroke:#ff9ac6;stroke-width:12;opacity:.2;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.pl-line{fill:none;stroke:#ffe1ee;stroke-width:3;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke}
.pl-marker{position:absolute;inset:0;will-change:transform}
.pl-rule{position:absolute;top:0;left:78.5%;right:0;border-top:1px dashed rgba(255,255,255,.45)}
.pl-dot{position:absolute;top:0;left:78.5%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgba(255,143,192,.25),0 0 24px 6px rgba(255,143,192,.75);animation:pl-beat 1.8s ease-in-out infinite}
.pl-tag{position:absolute;top:0;left:calc(78.5% + 20px);transform:translateY(-50%);padding:6px 13px;border-radius:99px;background:linear-gradient(90deg,#ff9ac6,#ff5fa8);color:#3a0a26;font-size:13px;font-weight:800;line-height:1;white-space:nowrap;box-shadow:0 8px 20px -8px rgba(255,95,168,.8)}
@keyframes pl-beat{0%,100%{transform:scale(1)}50%{transform:scale(1.25)}}

@media (prefers-reduced-motion:reduce){
  .pl-blob,.pl-dot,.pl-tape-track,.pl-board-row,.pl-row,.pl-range-fill,.pl-range-dot,.pl-live::after,.pl-skeleton,.pl-skeleton-light{animation:none!important}
  .pl-tape{overflow-x:auto}
}
`;

/**
 * Expected GET /api/prices response:
 * {
 *   "items": [{
 *     "id": "123", "name": "Tomato", "category": "vegetables", "priceType": "wholesale",
 *     "location": "Coimbatore", "market": "Market name",
 *     "minPrice": 1200, "maxPrice": 1800, "modalPrice": 1500,
 *     "unit": "quintal", "currency": "INR", "source": "AGMARKNET", "sourceUrl": "https://...",
 *     "marketDate": "2026-10-14", "updatedAt": "2026-10-14T08:00:00.000Z",
 *     "previousModalPrice": 1400
 *   }],
 *   "updatedAt": "2026-10-14T08:00:00.000Z"
 * }
 */
export default function PriceList() {
  const [category, setCategory] = useState("all");
  const [location, setLocation] = useState("All Tamil Nadu");
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [state, setState] = useState({
    items: [],
    loading: true,
    error: "",
    updatedAt: null,
  });

  // wait for the person to stop typing before calling the API
  const apiSearch = useDebounced(search);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrices() {
      setState((previous) => ({ ...previous, loading: true, error: "" }));

      try {
        const data = await getPrices({
          category,
          location,
          search: apiSearch,
          signal: controller.signal,
        });

        if (!Array.isArray(data.items)) {
          throw new Error("The price API response must contain an items array.");
        }

        setState({
          items: data.items,
          loading: false,
          error: "",
          updatedAt: data.updatedAt ?? null,
        });
      } catch (error) {
        if (error.name === "AbortError") return;

        setState({
          items: [],
          loading: false,
          error:
            error.message ||
            "We couldn't load prices. Please check your connection and try again.",
          updatedAt: null,
        });
      }
    }

    loadPrices();

    return () => controller.abort();
  }, [category, location, apiSearch, refreshKey]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return state.items.filter((item) => {
      if (!term) return true;

      return [item.name, item.category, item.location, item.market, item.source, item.yarnCount, item.yarnType]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [state.items, search]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const items = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [category, location, search, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function exportCsv() {
    if (!filteredItems.length) return;

    const columns = [
      ["Commodity", "name"],
      ["Category", "category"],
      ["Price type", "priceType"],
      ["Location", "location"],
      ["Market", "market"],
      ["Minimum price", "minPrice"],
      ["Maximum price", "maxPrice"],
      ["Modal price", "modalPrice"],
      ["Unit", "unit"],
      ["Source", "source"],
      ["Market date", "marketDate"],
      ["Updated at", "updatedAt"],
    ];

    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(","),
      ...filteredItems.map((item) => columns.map(([, key]) => escapeCsv(item[key])).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `hapzo360-prices-${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function getPageNumbers() {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      if (pageNumber === 1 || pageNumber === totalPages || Math.abs(pageNumber - page) <= 1) {
        pages.push(pageNumber);
      }
    }

    return pages;
  }

  const pageButton =
    "rounded-lg border border-[#f3cddd] bg-white px-3 py-2 text-xs font-bold text-[#35121d] transition hover:bg-[#ffedf5] disabled:opacity-40";

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-gradient-to-br from-[#2b0720] via-[#5a0f3b] to-[#9c1c5c] text-white">
      <style>{STYLES}</style>
      <PriceBackdrop />

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1.1fr_.9fr] lg:gap-14 lg:px-12">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[.08] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#ffafd1]">
              <TrendingUp size={14} />
              Hapzo360 market watch
            </span>

            <h1 className="mt-7 max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
              Know the price.
              <br />
              <span className="font-medium italic text-[#ffafd1]">Make better moves.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-white/75">
              Check wholesale agricultural market prices and textile yarn rates across Tamil Nadu.
              Compare locations, understand price ranges, and check when each source last reported a price.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/[.08] px-5 py-3 backdrop-blur">
                <p className="text-xs text-white/60">Commodities shown</p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums">
                  {state.loading ? "—" : filteredItems.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/[.08] px-5 py-3 backdrop-blur">
                <p className="text-xs text-white/60">Price type</p>
                <p className="mt-1 text-lg font-extrabold text-[#ffafd1]">Wholesale</p>
              </div>
            </div>
          </div>

          <LiveBoard
            items={filteredItems}
            loading={state.loading}
            error={state.error}
            location={location}
            updatedAt={state.updatedAt}
          />
        </div>
      </section>

      {/* Ticker tape of real prices */}
      {!state.loading && !state.error && <TickerTape items={filteredItems} />}

      {/* Price list */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#ffafd1]">Market prices</p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
              Tamil Nadu wholesale price list
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-white/75">
              Compare reported wholesale mandi prices by commodity, market and location. Prices are
              shown in the unit supplied by the source.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={state.loading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20 disabled:opacity-50"
            >
              <RefreshCw size={16} className={state.loading ? "animate-spin" : ""} />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredItems.length}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#ff9ac6] to-[#ff5fa8] px-5 py-3 text-sm font-bold text-[#3a0a26] shadow-lg shadow-[#ff5fa8]/25 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDownToLine size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 rounded-[24px] border border-white/50 bg-white/95 p-4 text-[#35121d] shadow-xl shadow-[#1d0414]/30 backdrop-blur-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">Commodity category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-[#f3cddd] bg-[#fffafb] px-3 py-3 text-sm outline-none focus:border-[#c0266b]"
              >
                {CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">District / market</span>
              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-xl border border-[#f3cddd] bg-[#fffafb] px-3 py-3 text-sm outline-none focus:border-[#c0266b]"
              >
                {LOCATIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">Search prices</span>
              <span className="flex items-center gap-2 rounded-xl border border-[#f3cddd] bg-[#fffafb] px-3 py-3 focus-within:border-[#c0266b]">
                <Search size={17} className="shrink-0 text-stone-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tomato, cotton yarn..."
                  className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-[#faeaf1] pt-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={14} />
              {state.updatedAt
                ? `API updated ${formatDateTime(state.updatedAt)}`
                : "Source update time will appear here"}
            </span>

            <span>
              {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Loading */}
        {state.loading && (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/50 bg-white">
            <LoadingRows />
          </div>
        )}

        {/* Error */}
        {!state.loading && state.error && (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#f0bfd3] bg-white/95 px-6 py-14 text-center text-[#35121d]">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#ffedf5] text-[#8f1a4e]">
              <ArrowUpDown size={22} />
            </div>

            <h3 className="mt-4 text-lg font-extrabold">Prices unavailable</h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-stone-500">{state.error}</p>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="mt-5 rounded-full bg-[#35121d] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#8f1a4e]"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {!state.loading && !state.error && filteredItems.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/50 bg-white/95 text-[#35121d] shadow-xl shadow-[#1d0414]/30 backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-[#fff0f6]">
                  <tr className="text-xs font-bold uppercase tracking-wider text-[#a3185a]">
                    <th className="px-5 py-4">Commodity</th>
                    <th className="px-5 py-4">Market</th>
                    <th className="px-5 py-4">Min – max</th>
                    <th className="px-5 py-4">Modal price</th>
                    {/* <th className="px-5 py-4">Change</th> */}
                    <th className="px-5 py-4">Market date</th>
                    <th className="px-5 py-4">Source</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#faeaf1]">
                  {items.map((item, index) => (
                    <tr
                      key={item.id ?? `${item.name}-${item.location}-${index}`}
                      className="pl-row transition hover:bg-[#fff7fa]"
                      style={{ animationDelay: `${Math.min(index, 12) * 28}ms` }}
                    >
                      <td className="px-5 py-5">
                        <p className="font-bold text-[#35121d]">{item.name || "Unnamed commodity"}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {titleCase(item.category)}
                          {item.yarnCount ? ` · ${item.yarnCount}` : ""}
                          {item.yarnType ? ` · ${item.yarnType}` : ""}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-semibold">{item.market || item.location || "—"}</p>
                        {item.market && item.location && (
                          <p className="mt-1 text-xs text-stone-500">{item.location}</p>
                        )}
                      </td>

                      <td className="min-w-[190px] px-5 py-5">
                        <PriceRange item={item} />
                        <RangeBar item={item} />
                        <p className="mt-1.5 text-xs text-stone-400">per {item.unit || "unit"}</p>
                      </td>

                      <td className="px-5 py-5">
                        <span className="inline-block rounded-xl bg-[#fff0f6] px-3 py-1.5 text-base font-extrabold tabular-nums text-[#8f1a4e]">
                          {formatPrice(item.modalPrice, item.currency)}
                        </span>
                        <p className="mt-1.5 text-xs text-stone-400">per {item.unit || "unit"}</p>
                      </td>

                      {/* <td className="px-5 py-5"><PriceChange item={item} /></td> */}

                      <td className="px-5 py-5 text-sm text-stone-600">{formatDate(item.marketDate)}</td>

                      <td className="px-5 py-5">
                        {item.sourceUrl ? (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-[#8f1a4e] underline decoration-[#ee91b8] underline-offset-4 hover:text-[#c0266b]"
                          >
                            {item.source || "View source"}
                          </a>
                        ) : (
                          <span className="text-sm text-stone-600">{item.source || "Not specified"}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-[#faeaf1] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span>
                  Showing <span className="font-bold text-[#35121d]">{(page - 1) * pageSize + 1}</span>–
                  <span className="font-bold text-[#35121d]">
                    {Math.min(page * pageSize, filteredItems.length)}
                  </span>{" "}
                  of <span className="font-bold text-[#35121d]">{filteredItems.length}</span> records
                </span>

                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-lg border border-[#f5dce8] bg-[#fffafb] px-2 py-1.5 text-xs text-[#35121d] outline-none focus:border-[#c0266b]"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => setPage(1)} disabled={page === 1} className={pageButton}>
                  First
                </button>

                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page === 1}
                  className={`inline-flex items-center gap-1 ${pageButton}`}
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {getPageNumbers().map((pageNumber, index, pages) => (
                  <span key={pageNumber} className="flex items-center gap-1.5">
                    {index > 0 && pages[index - 1] !== pageNumber - 1 && (
                      <span className="px-1 text-stone-400">…</span>
                    )}

                    <button
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`min-w-8 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                        pageNumber === page
                          ? "bg-[#8f1a4e] text-white"
                          : "border border-[#f3cddd] bg-white text-[#35121d] hover:bg-[#ffedf5]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page === totalPages}
                  className={`inline-flex items-center gap-1 ${pageButton}`}
                >
                  Next
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className={pageButton}
                >
                  Last
                </button>
              </div>
            </div>

            <div className="border-t border-[#faeaf1] px-5 py-4 text-xs leading-6 text-stone-500">
              Prices are wholesale mandi rates supplied by the listed source. Check the unit, market date
              and source before making a purchase decision.
            </div>
          </div>
        )}

        {/* Empty state */}
        {!state.loading && !state.error && filteredItems.length === 0 && (
          <div className="mt-6 rounded-[24px] border border-dashed border-[#f0bfd3] bg-white/95 px-6 py-16 text-center text-[#35121d]">
            <Search size={28} className="mx-auto text-stone-400" />
            <h3 className="mt-4 font-extrabold">No wholesale price records found</h3>
            <p className="mt-2 text-sm text-stone-500">
              Try a different category or location, or check again when the source publishes its next update.
            </p>
          </div>
        )}

        <p className="mt-6 text-xs leading-6 text-white/70">
          Hapzo360 displays only wholesale prices received from verified sources. AGMARKNET mandi data can
          be delayed, and not every market reports every commodity each day.
        </p>
      </section>
    </main>
  );
}