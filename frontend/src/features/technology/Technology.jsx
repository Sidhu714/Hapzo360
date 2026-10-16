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
    TrendingUp,
} from "lucide-react";
import API_BASE_URL from "../../config/api";

// Uses the same proxy as the Trends page (see trends-proxy.mjs). The "technology"
// feed there is already set to NewsData's technology category.
const FEED_URL = `${API_BASE_URL}/api/trends?domain=technology`;

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

function useTechNews(attempt) {
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

        fetch(FEED_URL, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) throw new Error("Request failed");

                return res.json();
            })
            .then((data) =>
                setState({
                    articles: data.articles ?? [],
                    loading: false,
                    error: "",
                })
            )
            .catch((err) => {
                if (err.name === "AbortError") return;

                setState({
                    articles: [],
                    loading: false,
                    error:
                        "We couldn't load the latest technology news. Check your connection and try again.",
                });
            });

        return () => controller.abort();
    }, [attempt]);

    return state;
}

// Tinted tile with an icon when an article has no image or the image fails to load
function ArticleImage({ src }) {
    const [failed, setFailed] = useState(false);

    if (!src || failed) {
        return (
            <div className="grid h-full w-full place-items-center bg-[#e5edf4]">
                <Cpu size={44} className="text-[#315844]/40" />
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
            <div className="h-56 bg-[#eef2e8]" />

            <div className="space-y-3 p-6">
                <div className="h-3 w-24 rounded bg-[#eef2e8]" />
                <div className="h-5 w-4/5 rounded bg-[#eef2e8]" />
                <div className="h-3 w-full rounded bg-[#eef2e8]" />
                <div className="h-3 w-2/3 rounded bg-[#eef2e8]" />
            </div>
        </div>
    );
}

// Subtle motion only for people who haven't asked for reduced motion
const HERO_STYLES = `
@media (prefers-reduced-motion: no-preference) {
  @keyframes tech-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
  @keyframes tech-spin { to { transform: rotate(360deg); } }
  .tech-float { animation: tech-float 6s ease-in-out infinite; }
  .tech-float-slow { animation: tech-float 8s ease-in-out -2s infinite; }
  .tech-spin { animation: tech-spin 70s linear infinite; }
}
`;

const BUZZ_BARS = [14, 24, 18, 32, 26, 40, 52];

const TILE_TONES = [
    "bg-[#20372a] text-[#d4e99b]",
    "bg-[#d4e99b] text-[#20372a]",
    "bg-[#315844] text-white",
];

function TechHero({ articles, loading }) {
    const feed = articles.slice(0, 3);

    return (
        <section className="relative overflow-hidden bg-[#172b20]">
            <style>{HERO_STYLES}</style>

            <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#d4e99b]/10 blur-3xl" />
            <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-[#d4e99b]/10 blur-3xl" />

            <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:px-12">
                <div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] text-[#d4e99b]">
                        <Sparkles size={14} />
                        Technology news
                    </span>

                    <h1 className="mt-7 max-w-2xl text-5xl font-extrabold leading-[1.04] tracking-[-.055em] text-white sm:text-6xl lg:text-7xl">
                        Tech moves fast.
                        <br />
                        <span className="font-medium italic text-[#d4e99b]">
                            Keep up.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-xl text-base leading-8 text-white/70">
                        The latest technology headlines, gathered in one place and
                        refreshed through the day.
                    </p>

                    <a
                        href="#latest-news"
                        className="mt-8 inline-flex items-center gap-3 rounded-full bg-[#d4e99b] px-6 py-4 text-sm font-bold text-[#20372a] transition hover:bg-white"
                    >
                        Read the latest
                        <ArrowRight size={18} />
                    </a>

                    <div className="mt-10 flex items-center gap-3 text-sm text-white/60">
                        <span className="h-px w-10 bg-[#d4e99b]" />
                        Stories link to the original publisher.
                    </div>
                </div>

                {/* Infographic stage */}
                <div className="relative h-[460px] overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/[.07] to-white/[.02] sm:h-[480px]">
                    {/* Orbit rings */}
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 grid place-items-center"
                    >
                        <div className="h-[560px] w-[560px] rounded-full border border-white/[.07]" />
                    </div>

                    <div
                        aria-hidden="true"
                        className="absolute inset-0 grid place-items-center"
                    >
                        <div className="tech-spin relative h-[380px] w-[380px] rounded-full border border-dashed border-[#d4e99b]/25">
                            <span className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[#d4e99b]" />
                            <span className="absolute -bottom-1 left-[18%] h-2 w-2 rounded-full bg-white/60" />
                        </div>
                    </div>

                    <div
                        aria-hidden="true"
                        className="absolute -bottom-10 right-10 h-52 w-52 rounded-full bg-[#d4e99b]/15 blur-3xl"
                    />

                    {/* Floating tags */}
                    <div
                        className="absolute left-6 top-5 hidden sm:block"
                        aria-hidden="true"
                    >
                        <span className="tech-float-slow inline-flex rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-[#d4e99b] backdrop-blur">
                            AI
                        </span>
                    </div>

                    <div
                        className="absolute bottom-6 right-6 hidden sm:block"
                        aria-hidden="true"
                    >
                        <span className="tech-float inline-flex rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-[#d4e99b] backdrop-blur">
                            Cloud
                        </span>
                    </div>

                    {/* Main card: latest headlines */}
                    <div className="absolute left-4 right-4 top-6 sm:left-6 sm:right-auto sm:top-1/2 sm:w-[72%] sm:-translate-y-1/2">
                        <div className="rounded-3xl bg-[#fbfcf8] p-5 shadow-2xl shadow-black/30">
                            <div className="mb-4 flex items-center gap-2.5">
                                <span className="h-2.5 w-2.5 rounded-full bg-[#6b8b42]" />

                                <p className="text-xs font-bold uppercase tracking-[.16em] text-[#315844]">
                                    Latest headlines
                                </p>
                            </div>

                            <ul className="space-y-3">
                                {loading &&
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <li
                                            key={i}
                                            className="flex animate-pulse items-start gap-3 rounded-2xl bg-[#f1f4eb] p-3"
                                        >
                                            <span className="h-10 w-10 shrink-0 rounded-xl bg-[#dfe6d3]" />

                                            <span className="flex-1 space-y-2 pt-1">
                                                <span className="block h-3 w-full rounded bg-[#dfe6d3]" />
                                                <span className="block h-3 w-2/3 rounded bg-[#dfe6d3]" />
                                            </span>
                                        </li>
                                    ))}

                                {!loading &&
                                    feed.map((article, index) => (
                                        <li key={article.id ?? article.link}>
                                            <a
                                                href={article.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-start gap-3 rounded-2xl bg-[#f1f4eb] p-3 transition hover:bg-[#e6edd9]"
                                            >
                                                <span
                                                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-extrabold ${
                                                        TILE_TONES[
                                                            index %
                                                                TILE_TONES.length
                                                        ]
                                                    }`}
                                                >
                                                    {(
                                                        article.source || "T"
                                                    )[0].toUpperCase()}
                                                </span>

                                                <span className="min-w-0">
                                                    <span className="block line-clamp-2 text-sm font-bold leading-snug text-[#20372a]">
                                                        {article.title}
                                                    </span>

                                                    <span className="mt-1 block truncate text-xs text-stone-500">
                                                        {article.source}
                                                        {article.publishedAt
                                                            ? ` · ${timeAgo(
                                                                  article.publishedAt
                                                              )}`
                                                            : ""}
                                                    </span>
                                                </span>
                                            </a>
                                        </li>
                                    ))}

                                {!loading && feed.length === 0 && (
                                    <li className="rounded-2xl bg-[#f1f4eb] p-4 text-sm text-stone-500">
                                        Fresh technology stories will appear here.
                                    </li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Floating chart card */}
                    <div
                        className="absolute right-4 top-5 hidden sm:block"
                        aria-hidden="true"
                    >
                        <div className="tech-float w-[150px] rounded-2xl bg-[#d4e99b] p-4 text-[#172b20] shadow-xl shadow-black/25">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold uppercase tracking-wider">
                                    Tech buzz
                                </span>

                                <TrendingUp size={15} />
                            </div>

                            <svg
                                viewBox="0 0 112 56"
                                className="mt-3 h-14 w-full"
                            >
                                {BUZZ_BARS.map((height, index) => (
                                    <rect
                                        key={index}
                                        x={index * 16}
                                        y={56 - height}
                                        width="10"
                                        height={height}
                                        rx="3"
                                        fill="#172b20"
                                        opacity={
                                            index === BUZZ_BARS.length - 1
                                                ? 1
                                                : 0.28
                                        }
                                    />
                                ))}
                            </svg>
                        </div>
                    </div>

                    {/* Floating story count */}
                    <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                        <div className="tech-float-slow flex items-center gap-3 rounded-2xl border border-white/15 bg-[#20372a]/90 px-4 py-3 text-white shadow-xl shadow-black/25 backdrop-blur">
                            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#d4e99b] text-[#172b20]">
                                <Newspaper size={20} />
                            </span>

                            <span>
                                <b className="block text-lg font-extrabold leading-none">
                                    {loading ? "–" : articles.length}
                                </b>

                                <span className="mt-1 block text-xs text-white/60">
                                    latest stories
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function Pagination({
    page,
    totalPages,
    totalItems,
    pageSize,
    onPageChange,
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
        <div className="mt-10 flex flex-col gap-4 rounded-[24px] border border-[#e3e8dc] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                <span>
                    Showing{" "}
                    <span className="font-bold text-[#20372a]">
                        {startIndex}
                    </span>
                    –
                    <span className="font-bold text-[#20372a]">
                        {endIndex}
                    </span>{" "}
                    of{" "}
                    <span className="font-bold text-[#20372a]">
                        {totalItems}
                    </span>{" "}
                    stories
                </span>

                <select
                    value={pageSize}
                    onChange={(event) =>
                        onPageSizeChange(Number(event.target.value))
                    }
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
                    <span
                        key={pageNumber}
                        className="flex items-center gap-1.5"
                    >
                        {index > 0 &&
                            pageNumbers[index - 1] !== pageNumber - 1 && (
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
                    onClick={() =>
                        onPageChange(Math.min(totalPages, page + 1))
                    }
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
                `${article.title} ${article.description ?? ""} ${
                    article.source ?? ""
                }`
                    .toLowerCase()
                    .includes(query)
        );
    }, [articles, query]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredArticles.length / pageSize)
    );

    const visibleArticles = useMemo(() => {
        const startIndex = (page - 1) * pageSize;

        return filteredArticles.slice(startIndex, startIndex + pageSize);
    }, [filteredArticles, page, pageSize]);

    useEffect(() => {
        setPage(1);
    }, [search, pageSize]);

    useEffect(() => {
        if (page > totalPages) {
            setPage(totalPages);
        }
    }, [page, totalPages]);

    return (
        <main className="bg-[#fbfcf8] text-[#20372a]">
            <TechHero articles={articles} loading={loading} />

            {/* News */}
            <section
                id="latest-news"
                className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20 sm:px-8 lg:px-12"
            >
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[.18em] text-[#66806c]">
                            What's new in tech
                        </p>

                        <h2 className="mt-3 text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                            Latest technology news.
                        </h2>

                        <p className="mt-3 max-w-xl text-sm leading-7 text-stone-500">
                            Stay informed about the tools, platforms and breakthroughs
                            shaping how we work.
                        </p>
                    </div>

                    <div className="flex w-full items-center gap-2 rounded-full border border-[#e3e8dc] bg-white px-4 py-3 md:max-w-xs">
                        <Search
                            size={18}
                            className="shrink-0 text-stone-400"
                        />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Search technology news..."
                            aria-label="Search technology news"
                            className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                        />
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <SkeletonCard key={i} />
                        ))}
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <div className="mt-8 rounded-2xl border border-dashed border-[#cbd7c1] py-16 text-center">
                        <h3 className="font-bold">News is unavailable</h3>

                        <p className="mt-2 text-sm text-stone-500">
                            {error}
                        </p>

                        <button
                            onClick={() => setAttempt((n) => n + 1)}
                            className="mt-4 text-sm font-bold text-[#315844] underline underline-offset-4"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* Articles */}
                {!loading &&
                    !error &&
                    filteredArticles.length > 0 && (
                        <>
                            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                {visibleArticles.map((article, index) => {
                                    const featured =
                                        page === 1 &&
                                        index === 0 &&
                                        !query;

                                    return (
                                        <article
                                            key={article.id ?? article.link}
                                            className={`group overflow-hidden rounded-[24px] border border-[#e3e8dc] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#20372a]/[.06] ${
                                                featured
                                                    ? "lg:col-span-2"
                                                    : ""
                                            }`}
                                        >
                                            <div
                                                className={`relative overflow-hidden ${
                                                    featured
                                                        ? "h-64 sm:h-80"
                                                        : "h-56"
                                                }`}
                                            >
                                                <ArticleImage
                                                    src={article.image}
                                                />

                                                <div className="absolute inset-0 bg-gradient-to-t from-[#172b20]/65 to-transparent" />

                                                {article.source && (
                                                    <span className="absolute left-5 top-5 max-w-[70%] truncate rounded-full bg-[#fbfcf8] px-3 py-2 text-[11px] font-bold text-[#315844]">
                                                        {article.source}
                                                    </span>
                                                )}

                                                <span className="absolute bottom-5 left-5 grid h-11 w-11 place-items-center rounded-xl bg-[#d4e99b] text-[#20372a]">
                                                    <Cpu size={21} />
                                                </span>
                                            </div>

                                            <div className="p-6">
                                                <p className="text-xs font-bold uppercase tracking-[.12em] text-[#66806c]">
                                                    Technology
                                                    {article.publishedAt && (
                                                        <span className="ml-2 font-medium normal-case tracking-normal text-stone-400">
                                                            {timeAgo(
                                                                article.publishedAt
                                                            )}
                                                        </span>
                                                    )}
                                                </p>

                                                <h3 className="mt-3 line-clamp-3 text-xl font-extrabold leading-snug tracking-tight">
                                                    {article.title}
                                                </h3>

                                                {article.description && (
                                                    <p className="mt-3 line-clamp-3 text-sm leading-7 text-stone-500">
                                                        {article.description}
                                                    </p>
                                                )}

                                                <a
                                                    href={article.link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#315844] hover:text-[#6b8b42]"
                                                >
                                                    Read full article
                                                    <ArrowUpRight
                                                        size={17}
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
                                totalItems={filteredArticles.length}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={setPageSize}
                            />
                        </>
                    )}

                {/* No results */}
                {!loading &&
                    !error &&
                    filteredArticles.length === 0 && (
                        <div className="mt-8 rounded-2xl border border-dashed border-[#cbd7c1] py-16 text-center">
                            <Search
                                className="mx-auto text-stone-400"
                                size={28}
                            />

                            <h3 className="mt-4 font-bold">
                                No matching stories found
                            </h3>

                            <p className="mt-2 text-sm text-stone-500">
                                {query
                                    ? "Try another search term."
                                    : "There are no technology stories right now. Please check back soon."}
                            </p>

                            {query && (
                                <button
                                    onClick={() => setSearch("")}
                                    className="mt-4 text-sm font-bold text-[#315844] underline underline-offset-4"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    )}

                <p className="mt-8 text-xs text-stone-400">
                    Headlines provided by NewsData.io. Stories link to the original
                    publisher.
                </p>
            </section>

            {/* Bottom CTA */}
            <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
                <div className="relative overflow-hidden rounded-[28px] bg-[#20372a] px-6 py-12 text-white sm:px-12 sm:py-16">
                    <div className="absolute -right-12 -top-20 h-64 w-64 rounded-full border-[40px] border-white/[.04]" />

                    <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#d4e99b]">
                                Your next move
                            </p>

                            <h2 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-[-.04em] sm:text-4xl">
                                Ready to put your tech skills to work?
                            </h2>

                            <p className="mt-4 max-w-xl text-sm leading-7 text-white/65">
                                Explore opportunities and discover where your skills can take
                                you next.
                            </p>
                        </div>

                        <Link
                            to="/services/openings"
                            className="inline-flex shrink-0 items-center justify-center gap-3 rounded-full bg-[#d4e99b] px-6 py-4 text-sm font-bold text-[#20372a] transition hover:bg-white"
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