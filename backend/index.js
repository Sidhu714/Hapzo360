import express from "express";
import "dotenv/config";

const app = express();
const PORT = process.env.PORT || 3001;

// Government agricultural mandi price API
const DATA_GOV_IN_API_KEY = process.env.DATA_GOV_IN_API_KEY;
const AGMARKNET_RESOURCE_ID = process.env.AGMARKNET_RESOURCE_ID;

// NewsData.io trends API
const NEWS_DATA_API_KEY = process.env.NEWSDATA_API_KEY;
const NEWS_COUNTRY = process.env.NEWS_COUNTRY || "in";

// Optional licensed yarn price provider
const YARN_PRICES_URL = process.env.YARN_PRICES_URL;
const YARN_PRICES_API_KEY = process.env.YARN_PRICES_API_KEY;

const TTL_MS = 60 * 60 * 1000; // 1 hour
const TIMEOUT_MS = 15000;
const MAX_LIMIT = 500;
const ALL_TRENDS_LIMIT = 12;

const cache = new Map();
const STATE = "Tamil Nadu";

const FEEDS = {
  manufacturing: {
    q: 'manufacturing OR factory OR "production line"',
  },
  garments: {
    q: "garment OR textile OR apparel",
  },
  technology: {
    category: "technology",
  },
  logistics: {
    q: 'logistics OR warehouse OR "supply chain"',
  },
};

if (!NEWS_DATA_API_KEY) {
  console.error("Missing NEWSDATA_API_KEY");
  process.exit(1);
}

// --------------------------------------------------
// Helpers
// --------------------------------------------------

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return value;
    }
  }

  return null;
}

function normalizeCategory(name) {
  const value = String(name || "").toLowerCase();

  if (
    /vegetable|tomato|onion|potato|brinjal|ladies.?finger|cabbage|carrot|chilli|beans|drumstick|cucumber|pumpkin|gourd|leafy/.test(
      value
    )
  ) {
    return "vegetables";
  }

  if (
    /fruit|mango|banana|grapes|apple|orange|papaya|watermelon|guava|lemon/.test(
      value
    )
  ) {
    return "fruits";
  }

  if (
    /cotton|groundnut|paddy|rice|maize|millet|turmeric|sugarcane|copra|pulse|gram/.test(
      value
    )
  ) {
    return "agriculture";
  }

  return "agriculture";
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Upstream HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

// --------------------------------------------------
// Cache with stale fallback
// --------------------------------------------------

async function cached(key, fetcher) {
  const hit = cache.get(key);

  if (hit && Date.now() - hit.at < TTL_MS) {
    return {
      data: hit.data,
      cached: true,
      stale: false,
    };
  }

  try {
    const data = await fetcher();

    cache.set(key, {
      at: Date.now(),
      data,
    });

    return {
      data,
      cached: false,
      stale: false,
    };
  } catch (error) {
    if (hit) {
      console.warn(`[cache] ${key} failed; using stale cache:`, error.message);

      return {
        data: hit.data,
        cached: true,
        stale: true,
      };
    }

    throw error;
  }
}

// --------------------------------------------------
// AGMARKNET price normalization
// --------------------------------------------------

function normalizeCommodity(record, index) {
  const name = firstValue(record, [
    "commodity",
    "Commodity",
    "commodity_name",
    "Commodity Name",
  ]);

  const market = firstValue(record, [
    "market",
    "Market",
    "market_name",
    "Market Name",
  ]);

  const district = firstValue(record, [
    "district",
    "District",
    "district_name",
  ]);

  const state = firstValue(record, ["state", "State", "state_name"]);

  const minPrice = toNumber(
    firstValue(record, ["min_price", "Min Price", "minimum_price"])
  );

  const maxPrice = toNumber(
    firstValue(record, ["max_price", "Max Price", "maximum_price"])
  );

  const modalPrice = toNumber(
    firstValue(record, ["modal_price", "Modal Price", "modalPrice"])
  );

  const marketDate = firstValue(record, [
    "arrival_date",
    "Arrival Date",
    "date",
    "Date",
  ]);

  if (!name || modalPrice === null || !state) return null;

  return {
    id: `agmarknet-${index}-${name}-${marketDate || ""}`
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-"),

    name: String(name),
    category: normalizeCategory(name),
    priceType: "wholesale",

    location: String(state),
    district: district ? String(district) : null,
    market: market ? String(market) : null,

    minPrice: minPrice !== null ? Number((minPrice / 100).toFixed(2)) : null,
    maxPrice: maxPrice !== null ? Number((maxPrice / 100).toFixed(2)) : null,
    modalPrice: Number((modalPrice / 100).toFixed(2)),

    unit: "kg",
    currency: "INR",

    source: "AGMARKNET / data.gov.in",
    sourceUrl:
      "https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi",

    marketDate: marketDate ? String(marketDate) : null,
    updatedAt: new Date().toISOString(),

    previousModalPrice: null,
  };
}

async function fetchAgriculturalPrices() {
  if (!DATA_GOV_IN_API_KEY || !AGMARKNET_RESOURCE_ID) {
    throw new Error("Missing DATA_GOV_IN_API_KEY or AGMARKNET_RESOURCE_ID");
  }

  const params = new URLSearchParams({
    "api-key": DATA_GOV_IN_API_KEY,
    format: "json",
    limit: String(MAX_LIMIT),
    offset: "0",
    "filters[state]": STATE,
  });

  const url =
    `https://api.data.gov.in/resource/` +
    `${encodeURIComponent(AGMARKNET_RESOURCE_ID.trim())}?${params}`;

  const body = await fetchJson(url);

  // data.gov.in reports bad keys / resource ids inside the body, often with HTTP 200
  if (!Array.isArray(body.records)) {
    throw new Error(
      `data.gov.in: ${body.message || body.error || "unexpected response"}`
    );
  }

  const items = body.records
    .map(normalizeCommodity)
    .filter(Boolean)
    .filter((item) => item.location.toLowerCase() === STATE.toLowerCase());

  if (items.length === 0) {
    console.warn(
      `[prices] data.gov.in sent ${body.records.length} records (total ${body.total}) ` +
        `but 0 were usable for ${STATE}. First record:`,
      JSON.stringify(body.records[0] ?? null)
    );
    throw new Error("No usable price records");
  }

  return items;
}

// --------------------------------------------------
// Optional yarn provider
// --------------------------------------------------

function normalizeYarn(record, index) {
  const name = firstValue(record, ["name", "product", "commodity", "yarn"]);

  const modalPrice = toNumber(
    firstValue(record, ["modalPrice", "modal_price", "price"])
  );

  if (!name || modalPrice === null) return null;

  return {
    id: String(record.id || `yarn-${index}-${name}`).replace(
      /[^a-zA-Z0-9_-]/g,
      "-"
    ),

    name: String(name),
    category: "yarn",

    priceType:
      String(record.priceType || "wholesale").toLowerCase() === "retail"
        ? "retail"
        : "wholesale",

    location: String(record.location || STATE),
    district: record.district || null,
    market: record.market || null,

    minPrice: toNumber(record.minPrice ?? record.min_price),
    maxPrice: toNumber(record.maxPrice ?? record.max_price),
    modalPrice,

    unit: String(record.unit || "kg"),
    currency: String(record.currency || "INR"),

    source: String(record.source || "Yarn price provider"),
    sourceUrl:
      record.sourceUrl || record.source_url || YARN_PRICES_URL || null,

    marketDate:
      record.marketDate || record.market_date || record.date || null,

    updatedAt:
      record.updatedAt || record.updated_at || new Date().toISOString(),

    previousModalPrice: toNumber(
      record.previousModalPrice ?? record.previous_modal_price
    ),

    yarnCount: record.yarnCount || record.yarn_count || null,
    yarnType: record.yarnType || record.yarn_type || null,
  };
}

async function fetchYarnPrices() {
  if (!YARN_PRICES_URL) return [];

  const headers = {};

  if (YARN_PRICES_API_KEY) {
    headers.Authorization = `Bearer ${YARN_PRICES_API_KEY}`;
  }

  const body = await fetchJson(YARN_PRICES_URL, headers);

  const records = Array.isArray(body)
    ? body
    : body.items || body.records || body.data || [];

  if (!Array.isArray(records)) {
    throw new Error("Invalid yarn provider response");
  }

  return records.map(normalizeYarn).filter(Boolean);
}

// --------------------------------------------------
// Price filtering
// --------------------------------------------------

function matchesSearch(item, query) {
  if (!query) return true;

  const searchable = [
    item.name,
    item.category,
    item.location,
    item.district,
    item.market,
    item.yarnType,
    item.yarnCount,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchable.includes(query.toLowerCase());
}

function matchesLocation(item, location) {
  if (!location || location.toLowerCase() === "all tamil nadu") return true;

  const wanted = location.toLowerCase();

  return [item.location, item.district, item.market]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(wanted));
}

// --------------------------------------------------
// NewsData trends
// --------------------------------------------------

function parseNewsDate(value) {
  if (!value) return null;

  const date = new Date(`${value.replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchTrendFeed(domain) {
  const params = new URLSearchParams({
    apikey: NEWS_DATA_API_KEY,
    country: NEWS_COUNTRY,
    language: "en",
    size: "10",
    removeduplicate: "1",
    ...FEEDS[domain],
  });

  const body = await fetchJson(
    `https://newsdata.io/api/1/latest?${params}`
  );

  if (body.status !== "success") {
    throw new Error(body.results?.message || "NewsData request failed");
  }

  return (body.results || []).map((item) => ({
    id: item.article_id,
    domain,
    title: item.title,
    description: item.description,
    link: item.link,
    image: item.image_url,
    source: item.source_name || item.source_id,
    publishedAt: parseNewsDate(item.pubDate),
  }));
}

function mixTrendFeeds(lists) {
  const seen = new Set();
  const result = [];
  const longest = Math.max(...lists.map((list) => list.length), 0);

  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const article = list[i];

      if (article && !seen.has(article.link)) {
        seen.add(article.link);
        result.push(article);
      }
    }
  }

  return result.slice(0, ALL_TRENDS_LIMIT);
}

// --------------------------------------------------
// Routes
// --------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "prices-and-trends-proxy",
    features: {
      prices: Boolean(DATA_GOV_IN_API_KEY && AGMARKNET_RESOURCE_ID),
      yarn: Boolean(YARN_PRICES_URL),
      trends: Boolean(NEWS_DATA_API_KEY),
    },
  });
});

app.get("/api/prices", async (req, res) => {
  const category = String(req.query.category || "all").toLowerCase();
  const priceType = String(req.query.priceType || "all").toLowerCase();
  const location = String(req.query.location || "All Tamil Nadu").trim();
  const query = String(req.query.q || req.query.search || "").trim();

  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Math.min(Math.max(requestedLimit || 200, 1), MAX_LIMIT);

  const validCategories = [
    "all",
    "vegetables",
    "fruits",
    "yarn",
    "agriculture",
  ];

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Unknown category" });
  }

  if (!["all", "wholesale", "retail"].includes(priceType)) {
    return res.status(400).json({
      error: "priceType must be all, wholesale, or retail",
    });
  }

  try {
    const results = await Promise.allSettled([
      cached("agmarknet", fetchAgriculturalPrices),
      cached("yarn", fetchYarnPrices),
    ]);

    const successful = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    if (successful.length === 0) {
      throw new Error("All price providers failed");
    }

    const allItems = successful.flatMap((result) => result.data);

    const items = allItems
      .filter(
        (item) => category === "all" || item.category === category
      )
      .filter(
        (item) =>
          priceType === "all" || item.priceType === priceType
      )
      .filter((item) => matchesLocation(item, location))
      .filter((item) => matchesSearch(item, query))
      .sort((a, b) => {
        const dateA = a.marketDate
          ? new Date(a.marketDate).getTime() || 0
          : 0;

        const dateB = b.marketDate
          ? new Date(b.marketDate).getTime() || 0
          : 0;

        return dateB - dateA || a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    res.set("Cache-Control", "public, max-age=300");

    res.json({
      items,
      updatedAt: new Date().toISOString(),
      stale: successful.some((result) => result.stale),

      sources: successful.map((result, index) => ({
        id: index === 0 ? "agmarknet" : "yarn",
        cached: result.cached,
        stale: result.stale,
        count: result.data.length,
      })),

      meta: {
        category,
        priceType,
        location,
        count: items.length,
        cacheTtlMs: TTL_MS,
        note:
          "AGMARKNET records are wholesale mandi prices, " +
          "generally quoted per quintal. Yarn prices require " +
          "a configured provider.",
      },
    });
  } catch (error) {
    console.error("[prices] Request failed:", error.message);

    res.status(502).json({
      error: "Could not load prices",
      message:
        "Check the API credentials, resource ID, and provider status.",
    });
  }
});

app.get("/api/trends", async (req, res) => {
  const domain = String(req.query.domain || "all").toLowerCase();

  try {
    let articles;

    if (domain === "all") {
      const settled = await Promise.allSettled(
        Object.keys(FEEDS).map((feedDomain) =>
          cached(`trend-${feedDomain}`, () => fetchTrendFeed(feedDomain))
        )
      );

      const lists = settled
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value.data);

      if (lists.length === 0) {
        throw new Error("All trend feeds failed");
      }

      articles = mixTrendFeeds(lists);
    } else if (FEEDS[domain]) {
      const result = await cached(`trend-${domain}`, () =>
        fetchTrendFeed(domain)
      );

      articles = result.data;
    } else {
      return res.status(400).json({ error: "Unknown domain" });
    }

    res.set("Cache-Control", "public, max-age=300");

    res.json({
      articles,
      stale: false,
    });
  } catch (error) {
    console.error("[trends] Request failed:", error.message);

    res.status(502).json({
      error: "Could not load trends",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Prices and trends proxy running at http://localhost:${PORT}`);

  if (!DATA_GOV_IN_API_KEY || !AGMARKNET_RESOURCE_ID) {
    console.warn(
      "[prices] Configure DATA_GOV_IN_API_KEY and " +
        "AGMARKNET_RESOURCE_ID in .env"
    );
  }

  if (!YARN_PRICES_URL) {
    console.warn(
      "[prices] Yarn prices disabled; configure YARN_PRICES_URL " +
        "to enable a licensed yarn feed."
    );
  }
});