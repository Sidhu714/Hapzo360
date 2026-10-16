import { useEffect, useMemo, useState } from "react";
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
  { value: "yarn", label: "Yarn & textiles" },
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

const numberFormat = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

function formatPrice(value, currency = "INR") {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

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

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "Update time unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Update time unavailable";
  }

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

function PriceRange({ item }) {
  const hasMin = item.minPrice !== null && item.minPrice !== undefined;
  const hasMax = item.maxPrice !== null && item.maxPrice !== undefined;

  if (!hasMin && !hasMax) {
    return <span className="text-stone-400">—</span>;
  }

  return (
    <div className="text-sm">
      <span className="font-semibold text-[#20372a]">
        {hasMin ? formatPrice(item.minPrice, item.currency) : "—"}
      </span>

      <span className="mx-1.5 text-stone-400">–</span>

      <span className="font-semibold text-[#20372a]">
        {hasMax ? formatPrice(item.maxPrice, item.currency) : "—"}
      </span>
    </div>
  );
}

function PriceChange({ item }) {
  const change = getPriceChange(item);

  if (change === null) {
    return (
      <span className="text-xs text-stone-400">No comparison</span>
    );
  }

  const increased = change > 0;
  const Icon = increased ? TrendingUp : TrendingDown;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
        increased
          ? "bg-rose-50 text-rose-700"
          : "bg-emerald-50 text-emerald-700"
      }`}
    >
      <Icon size={13} />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-[#edf0e8]">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="animate-pulse px-5 py-5">
          <div className="h-4 w-32 rounded bg-[#edf0e8]" />
          <div className="mt-3 h-3 w-48 rounded bg-[#f2f4ef]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Expected GET /api/prices response:
 * {
 *   "items": [{
 *     "id": "123",
 *     "name": "Tomato",
 *     "category": "vegetables",
 *     "priceType": "wholesale",
 *     "location": "Coimbatore",
 *     "market": "Market name",
 *     "minPrice": 1200,
 *     "maxPrice": 1800,
 *     "modalPrice": 1500,
 *     "unit": "quintal",
 *     "currency": "INR",
 *     "source": "AGMARKNET",
 *     "sourceUrl": "https://...",
 *     "marketDate": "2026-10-14",
 *     "updatedAt": "2026-10-14T08:00:00.000Z",
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

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrices() {
      setState((previous) => ({
        ...previous,
        loading: true,
        error: "",
      }));

      try {
        const data = await getPrices({
          category,
          location,
          search,
          signal: controller.signal,
        });

        if (!Array.isArray(data.items)) {
          throw new Error(
            "The price API response must contain an items array."
          );
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
  }, [category, location, search, refreshKey]);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();

    return state.items.filter((item) => {
      if (!term) return true;

      return [
        item.name,
        item.category,
        item.location,
        item.market,
        item.source,
        item.yarnCount,
        item.yarnType,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [state.items, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / pageSize)
  );

  const items = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return filteredItems.slice(startIndex, startIndex + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [category, location, search, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
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

    const escapeCsv = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;

    const csv = [
      columns.map(([label]) => escapeCsv(label)).join(","),
      ...filteredItems.map((item) =>
        columns
          .map(([, key]) => escapeCsv(item[key]))
          .join(",")
      ),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF", csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `hapzo360-prices-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function getPageNumbers() {
    const pages = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      if (
        pageNumber === 1 ||
        pageNumber === totalPages ||
        Math.abs(pageNumber - page) <= 1
      ) {
        pages.push(pageNumber);
      }
    }

    return pages;
  }

  return (
    <main className="min-h-screen bg-[#fbfcf8] text-[#20372a]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#172b20]">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#d4e99b]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[#d4e99b]/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-14 sm:px-8 md:py-20 lg:px-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
            <TrendingUp size={14} />
            Hapzo360 market watch
          </span>

          <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
                Know the price.
                <br />
                <span className="font-medium italic text-[#d4e99b]">
                  Make better moves.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-8 text-white/70">
                Check wholesale agricultural market prices and textile yarn
                rates across Tamil Nadu. Compare locations, understand price
                ranges, and check when each source last reported a price.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <div className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 backdrop-blur">
                <p className="text-xs text-white/55">
                  Commodities shown
                </p>

                <p className="mt-1 text-2xl font-extrabold text-white">
                  {state.loading ? "—" : filteredItems.length}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[.06] px-4 py-3 backdrop-blur">
                <p className="text-xs text-white/55">Price type</p>

                <p className="mt-1 text-sm font-bold text-[#d4e99b]">
                  Wholesale
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Price list */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-12 lg:py-16">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#66806c]">
              Market prices
            </p>

            <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
              Tamil Nadu wholesale price list
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-7 text-stone-500">
              Compare reported wholesale mandi prices by commodity, market and
              location. Prices are shown in the unit supplied by the source.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              disabled={state.loading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#dce4d4] bg-white px-4 py-3 text-sm font-bold transition hover:bg-[#f1f4eb] disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={state.loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={exportCsv}
              disabled={!filteredItems.length}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#20372a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#315844] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDownToLine size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-8 rounded-[24px] border border-[#e3e8dc] bg-white p-4 shadow-sm sm:p-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">
                Commodity category
              </span>

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
              >
                {CATEGORIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">
                District / market
              </span>

              <select
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className="w-full rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 text-sm outline-none focus:border-[#8da76e]"
              >
                {LOCATIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold text-stone-500">
                Search prices
              </span>

              <span className="flex items-center gap-2 rounded-xl border border-[#e3e8dc] bg-[#fbfcf8] px-3 py-3 focus-within:border-[#8da76e]">
                <Search
                  size={17}
                  className="shrink-0 text-stone-400"
                />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tomato, cotton yarn..."
                  className="min-w-0 w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                />
              </span>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-2 border-t border-[#edf0e8] pt-4 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between">
            <span className="inline-flex items-center gap-2">
              <CalendarDays size={14} />
              {state.updatedAt
                ? `API updated ${formatDateTime(state.updatedAt)}`
                : "Source update time will appear here"}
            </span>

            <span>
              {filteredItems.length} result
              {filteredItems.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* Loading */}
        {state.loading && (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e3e8dc] bg-white">
            <LoadingRows />
          </div>
        )}

        {/* Error */}
        {!state.loading && state.error && (
          <div className="mt-6 rounded-[24px] border-dashed border-[#cbd7c1] bg-white px-6 py-14 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#eaf1df] text-[#315844]">
              <ArrowUpDown size={22} />
            </div>

            <h3 className="mt-4 text-lg font-extrabold">
              Prices unavailable
            </h3>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-stone-500">
              {state.error}
            </p>

            <button
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
              className="mt-5 rounded-full bg-[#20372a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#315844]"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results */}
        {!state.loading && !state.error && filteredItems.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-[24px] border border-[#e3e8dc] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-[#f1f4eb]">
                  <tr className="text-xs font-bold uppercase tracking-wider text-[#66806c]">
                    <th className="px-5 py-4">Commodity</th>
                    <th className="px-5 py-4">Market</th>
                    <th className="px-5 py-4">Min – max</th>
                    <th className="px-5 py-4">Modal price</th>
                    <th className="px-5 py-4">Change</th>
                    <th className="px-5 py-4">Market date</th>
                    <th className="px-5 py-4">Source</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#edf0e8]">
                  {items.map((item, index) => (
                    <tr
                      key={
                        item.id ??
                        `${item.name}-${item.location}-${index}`
                      }
                      className="transition hover:bg-[#fbfcf8]"
                    >
                      <td className="px-5 py-5">
                        <p className="font-bold text-[#20372a]">
                          {item.name || "Unnamed commodity"}
                        </p>

                        <p className="mt-1 text-xs text-stone-500">
                          {titleCase(item.category)}
                          {item.yarnCount ? ` · ${item.yarnCount}` : ""}
                          {item.yarnType ? ` · ${item.yarnType}` : ""}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="text-sm font-semibold">
                          {item.market || item.location || "—"}
                        </p>

                        {item.market && item.location && (
                          <p className="mt-1 text-xs text-stone-500">
                            {item.location}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-5">
                        <PriceRange item={item} />

                        <p className="mt-1 text-xs text-stone-400">
                          per {item.unit || "unit"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <p className="font-extrabold text-[#20372a]">
                          {formatPrice(item.modalPrice, item.currency)}
                        </p>

                        <p className="mt-1 text-xs text-stone-400">
                          per {item.unit || "unit"}
                        </p>
                      </td>

                      <td className="px-5 py-5">
                        <PriceChange item={item} />
                      </td>

                      <td className="px-5 py-5 text-sm text-stone-600">
                        {formatDate(item.marketDate)}
                      </td>

                      <td className="px-5 py-5">
                        {item.sourceUrl ? (
                          <a
                            href={item.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-bold text-[#315844] underline decoration-[#b7c9a5] underline-offset-4 hover:text-[#6b8b42]"
                          >
                            {item.source || "View source"}
                          </a>
                        ) : (
                          <span className="text-sm text-stone-600">
                            {item.source || "Not specified"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-[#edf0e8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span>
                  Showing{" "}
                  <span className="font-bold text-[#20372a]">
                    {(page - 1) * pageSize + 1}
                  </span>
                  –
                  <span className="font-bold text-[#20372a]">
                    {Math.min(page * pageSize, filteredItems.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold text-[#20372a]">
                    {filteredItems.length}
                  </span>{" "}
                  records
                </span>

                <select
                  value={pageSize}
                  onChange={(event) =>
                    setPageSize(Number(event.target.value))
                  }
                  className="rounded-lg border border-[#e3e8dc] bg-[#fbfcf8] px-2 py-1.5 text-xs outline-none focus:border-[#8da76e]"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} / page
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
                >
                  First
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.max(1, value - 1))
                  }
                  disabled={page === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                  Prev
                </button>

                {getPageNumbers().map((pageNumber, index, pages) => (
                  <span
                    key={pageNumber}
                    className="flex items-center gap-1.5"
                  >
                    {index > 0 &&
                      pages[index - 1] !== pageNumber - 1 && (
                        <span className="px-1 text-stone-400">…</span>
                      )}

                    <button
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`min-w-8 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                        pageNumber === page
                          ? "bg-[#20372a] text-white"
                          : "border border-[#dce4d4] bg-white text-[#20372a] hover:bg-[#f1f4eb]"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  </span>
                ))}

                <button
                  type="button"
                  onClick={() =>
                    setPage((value) => Math.min(totalPages, value + 1))
                  }
                  disabled={page === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={14} />
                </button>

                <button
                  type="button"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
                >
                  Last
                </button>
              </div>
            </div>

            <div className="border-t border-[#edf0e8] px-5 py-4 text-xs leading-6 text-stone-500">
              Prices are wholesale mandi rates supplied by the listed source.
              Check the unit, market date and source before making a purchase
              decision.
            </div>
          </div>
        )}

        {/* Empty state */}
        {!state.loading && !state.error && filteredItems.length === 0 && (
          <div className="mt-6 rounded-[24px] border-dashed border-[#cbd7c1] bg-white px-6 py-16 text-center">
            <Search size={28} className="mx-auto text-stone-400" />

            <h3 className="mt-4 font-extrabold">
              No wholesale price records found
            </h3>

            <p className="mt-2 text-sm text-stone-500">
              Try a different category or location, or check again when the
              source publishes its next update.
            </p>
          </div>
        )}

        <p className="mt-6 text-xs leading-6 text-stone-400">
          Hapzo360 displays only wholesale prices received from verified
          sources. AGMARKNET mandi data can be delayed, and not every market
          reports every commodity each day.
        </p>
      </section>
    </main>
  );
}