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
  {
    key: "all",
    label: "All India trends",
    icon: TrendingUp,
    color: "bg-[#eaf1df]",
  },
  {
    key: "manufacturing",
    label: "Manufacturing",
    icon: Factory,
    color: "bg-[#f4ead8]",
  },
  {
    key: "garments",
    label: "Garments & Textiles",
    icon: Shirt,
    color: "bg-[#eaf1df]",
  },
  {
    key: "technology",
    label: "Technology",
    icon: Wrench,
    color: "bg-[#e5edf4]",
  },
  {
    key: "logistics",
    label: "Logistics",
    icon: Truck,
    color: "bg-[#f2e6e8]",
  },
];

const DOMAIN_BY_KEY = Object.fromEntries(
  DOMAINS.map((domain) => [domain.key, domain])
);

const PAGE_SIZES = [9, 12, 24, 48];

function timeAgo(iso) {
  if (!iso) return "";

  const mins = Math.max(
    1,
    Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  );

  if (mins < 60) return `${mins}m ago`;

  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

function useTrends(domainKey, attempt) {
  const [state, setState] = useState({
    articles: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();

    setState((prev) => ({
      ...prev,
      loading: true,
      error: "",
    }));

    const params = new URLSearchParams({
      domain: domainKey,
      country: "in",
    });

    fetch(`${API_BASE_URL}/api/trends?${params}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Request failed");
        }

        return response.json();
      })
      .then((data) => {
        setState({
          articles: data.articles ?? [],
          loading: false,
          error: "",
        });
      })
      .catch((error) => {
        if (error.name === "AbortError") return;

        setState({
          articles: [],
          loading: false,
          error:
            "We couldn't load the latest India trends. Check your connection and try again.",
        });
      });

    return () => controller.abort();
  }, [domainKey, attempt]);

  return state;
}

// Falls back to a tinted tile when an article has no image or the image fails.
function ArticleImage({ src, domain }) {
  const [failed, setFailed] = useState(false);
  const Icon = domain.icon;

  if (!src || failed) {
    return (
      <div
        className={`grid h-full w-full place-items-center ${domain.color}`}
      >
        <Icon size={44} className="text-[#315844]/40" />
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
    <div className="animate-pulse overflow-hidden rounded-[24px] border border-[#e3e8dc] bg-white">
      <div className="h-48 bg-[#eef2e8]" />

      <div className="space-y-3 p-5">
        <div className="h-3 w-24 rounded bg-[#eef2e8]" />
        <div className="h-5 w-4/5 rounded bg-[#eef2e8]" />
        <div className="h-3 w-full rounded bg-[#eef2e8]" />
        <div className="h-3 w-2/3 rounded bg-[#eef2e8]" />
      </div>
    </div>
  );
}

const HERO_STYLES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes tech-float {
    0%,
    100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-9px);
    }
  }

  @keyframes tech-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .tech-float {
    animation: tech-float 6s ease-in-out infinite;
  }

  .tech-float-slow {
    animation: tech-float 8s ease-in-out -2s infinite;
  }

  .tech-spin {
    animation: tech-spin 70s linear infinite;
  }
}
`;

const TILE_TONES = [
  "bg-[#20372a] text-[#d4e99b]",
  "bg-[#d4e99b] text-[#20372a]",
  "bg-[#315844] text-white",
];

function TrendsHero({ articles, loading }) {
  const feed = articles.slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-[#172b20]">
      <style>{HERO_STYLES}</style>

      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#d4e99b]/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 h-48 w-48 rounded-full bg-[#d4e99b]/10 blur-3xl" />

        <div className="absolute right-10 top-1/2 hidden h-[340px] w-[340px] -translate-y-1/2 rounded-full border border-dashed border-[#d4e99b]/20 lg:block" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 md:py-16 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:px-12">
        {/* Left content */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
              <Sparkles size={14} />
              Hapzo industry journal
            </span>

            <span className="inline-flex items-center gap-2 rounded-full border border-[#d4e99b]/30 bg-[#d4e99b]/10 px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
              India trends
            </span>
          </div>

          <h1 className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-[-.05em] text-white sm:text-5xl lg:text-6xl">
            India’s industries are changing.
            <br />
            <span className="font-medium italic text-[#d4e99b]">
              Stay ahead.
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
            Discover the latest manufacturing, garment, technology and
            logistics developments from across India.
          </p>

          <a
            href="#explore-trends"
            className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#d4e99b] px-6 py-3.5 text-sm font-bold text-[#20372a] transition hover:bg-white"
          >
            Explore India trends
            <ArrowRight size={18} />
          </a>

          <div className="mt-8 flex items-center gap-3 text-xs text-white/60 sm:text-sm">
            <span className="h-px w-8 bg-[#d4e99b]" />
            Live headlines from Indian publishers.
          </div>
        </div>

        {/* Right: live headlines */}
        <div className="relative">
          <div className="rounded-[28px] border border-white/10 bg-white/[.06] p-4 backdrop-blur sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#6b8b42]" />

                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
                  Latest India trends
                </p>
              </div>

              <span className="rounded-full bg-[#d4e99b] px-3 py-1 text-[11px] font-bold text-[#172b20]">
                {loading ? "Loading" : `${articles.length} stories`}
              </span>
            </div>

            <ul className="space-y-2.5">
              {loading &&
                Array.from({ length: 3 }).map((_, index) => (
                  <li
                    key={index}
                    className="flex animate-pulse items-start gap-3 rounded-xl bg-[#f1f4eb] p-3"
                  >
                    <span className="h-10 w-10 shrink-0 rounded-lg bg-[#dfe6d3]" />

                    <span className="flex-1 space-y-2 pt-1">
                      <span className="block h-3 w-full rounded bg-[#dfe6d3]" />
                      <span className="block h-3 w-2/3 rounded bg-[#dfe6d3]" />
                    </span>
                  </li>
                ))}

              {!loading &&
                feed.map((article, index) => {
                  const domain =
                    DOMAIN_BY_KEY[article.domain] ?? DOMAINS[0];
                  const Icon = domain.icon;

                  return (
                    <li key={article.id ?? article.link}>
                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 rounded-xl bg-[#fbfcf8] p-3 transition hover:bg-[#eef3e4]"
                      >
                        <span
                          className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                            TILE_TONES[index % TILE_TONES.length]
                          }`}
                        >
                          <Icon size={16} />
                        </span>

                        <span className="min-w-0">
                          <span className="block line-clamp-2 text-sm font-bold leading-snug text-[#20372a]">
                            {article.title}
                          </span>

                          <span className="mt-1 block truncate text-[11px] text-stone-500">
                            {article.source}
                            {article.publishedAt
                              ? ` · ${timeAgo(article.publishedAt)}`
                              : ""}
                          </span>
                        </span>
                      </a>
                    </li>
                  );
                })}

              {!loading && feed.length === 0 && (
                <li className="rounded-xl bg-[#f1f4eb] p-4 text-sm text-stone-500">
                  Fresh India industry stories will appear here.
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
}) {
  const pageNumbers = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    if (
      pageNumber === 1 ||
      pageNumber === totalPages ||
      Math.abs(pageNumber - page) <= 1
    ) {
      pageNumbers.push(pageNumber);
    }
  }

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalItems);

  return (
    <div className="mt-8 flex flex-col gap-4 rounded-[24px] border border-[#e3e8dc] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
        <span>
          Showing{" "}
          <span className="font-bold text-[#20372a]">{startIndex}</span>
          –
          <span className="font-bold text-[#20372a]">{endIndex}</span> of{" "}
          <span className="font-bold text-[#20372a]">{totalItems}</span>{" "}
          stories
        </span>

        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          aria-label="Stories per page"
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
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
        >
          First
        </button>

        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
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
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
        >
          Next
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          className="rounded-lg border border-[#dce4d4] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#f1f4eb] disabled:opacity-40"
        >
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

      const searchable = [
        article.title,
        article.description,
        article.source,
        article.domain,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [articles, query]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTrends.length / pageSize)
  );

  const visibleTrends = useMemo(() => {
    const startIndex = (page - 1) * pageSize;

    return filteredTrends.slice(startIndex, startIndex + pageSize);
  }, [filteredTrends, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [activeKey, search, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <main className="bg-[#fbfcf8] text-[#20372a]">
      <TrendsHero articles={articles} loading={loading} />

      {/* Explore trends */}
      <section
        id="explore-trends"
        className="mx-auto max-w-7xl scroll-mt-20 px-5 py-12 sm:px-8 lg:px-12"
      >
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#66806c]">
              Explore what’s happening in India
            </p>

            <h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
              India trends worth your attention.
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-stone-500">
              Latest headlines from Indian publishers across manufacturing,
              garments, technology and logistics.
            </p>
          </div>

          <div className="flex w-full items-center gap-2 rounded-full border border-[#e3e8dc] bg-white px-4 py-2.5 md:max-w-xs">
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
                  ? "bg-[#20372a] text-white"
                  : "border border-[#e3e8dc] bg-white text-stone-600 hover:border-[#b7c9a5]"
              }`}
            >
              {domain.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="mt-6 rounded-2xl border border-dashed border-[#cbd7c1] py-12 text-center">
            <h3 className="font-bold">India trends are unavailable</h3>

            <p className="mt-1 text-sm text-stone-500">{error}</p>

            <button
              onClick={() => setAttempt((current) => current + 1)}
              className="mt-3 text-sm font-bold text-[#315844] underline underline-offset-4"
            >
              Try again
            </button>
          </div>
        )}

        {/* Articles */}
        {!loading && !error && filteredTrends.length > 0 && (
          <>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTrends.map((article, index) => {
                const domain =
                  DOMAIN_BY_KEY[article.domain] ?? DOMAINS[0];

                const featured = page === 1 && index === 0 && activeKey === "all";

                return (
                  <article
                    key={article.id ?? article.link}
                    className={`group overflow-hidden rounded-[24px] border border-[#e3e8dc] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#20372a]/[.06] ${
                      featured ? "lg:col-span-2" : ""
                    }`}
                  >
                    <div
                      className={`relative overflow-hidden ${
                        featured ? "h-60 sm:h-72" : "h-48"
                      }`}
                    >
                      <ArticleImage src={article.image} domain={domain} />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#172b20]/65 to-transparent" />

                      {article.source && (
                        <span className="absolute left-4 top-4 max-w-[70%] truncate rounded-full bg-[#fbfcf8] px-3 py-1.5 text-[11px] font-bold text-[#315844]">
                          {article.source}
                        </span>
                      )}

                      <span className="absolute bottom-4 left-4 grid h-10 w-10 place-items-center rounded-xl bg-[#d4e99b] text-[#20372a]">
                        <domain.icon size={18} />
                      </span>
                    </div>

                    <div className="p-5">
                      <p className="text-xs font-bold uppercase tracking-[.12em] text-[#66806c]">
                        {domain.label}

                        {article.publishedAt && (
                          <span className="ml-2 font-medium normal-case tracking-normal text-stone-400">
                            {timeAgo(article.publishedAt)}
                          </span>
                        )}
                      </p>

                      <h3 className="mt-2 line-clamp-3 text-lg font-extrabold leading-snug tracking-tight">
                        {article.title}
                      </h3>

                      {article.description && (
                        <p className="mt-2 line-clamp-2 text-xs leading-6 text-stone-500 sm:text-sm">
                          {article.description}
                        </p>
                      )}

                      <a
                        href={article.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#315844] hover:text-[#6b8b42] sm:text-sm"
                      >
                        Read full article
                        <ArrowUpRight
                          size={16}
                          className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>

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
          <div className="mt-6 rounded-2xl border border-dashed border-[#cbd7c1] py-12 text-center">
            <Search className="mx-auto text-stone-400" size={24} />

            <h3 className="mt-3 font-bold">No matching India trends found</h3>

            <p className="mt-1 text-sm text-stone-500">
              Try another search term or category.
            </p>

            <button
              onClick={() => {
                setSearch("");
                setActiveKey("all");
              }}
              className="mt-3 text-sm font-bold text-[#315844] underline underline-offset-4"
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

      {/* Bottom CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 lg:px-12">
        <div className="relative overflow-hidden rounded-[24px] bg-[#20372a] px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[40px] border-white/[.04]" />

          <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d4e99b]">
                Your next move
              </p>

              <h2 className="mt-2 max-w-2xl text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">
                Ready to find your place in India’s changing world of work?
              </h2>

              <p className="mt-2 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">
                Explore opportunities and discover where your skills can take
                you next.
              </p>
            </div>

            <Link
              to="/services/openings"
              className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#d4e99b] px-6 py-3.5 text-sm font-bold text-[#20372a] transition hover:bg-white"
            >
              Browse job openings
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}