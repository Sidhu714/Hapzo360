// import express from "express";
// import "dotenv/config";
// import cors from "cors"

// const app = express();
// const PORT = process.env.PORT || 3001;

// // Government agricultural mandi price API
// const DATA_GOV_IN_API_KEY = process.env.DATA_GOV_IN_API_KEY; 
// const AGMARKNET_RESOURCE_ID = process.env.AGMARKNET_RESOURCE_ID;

// // NewsData.io trends API
// const NEWS_DATA_API_KEY = process.env.NEWSDATA_API_KEY;
// const NEWS_COUNTRY = process.env.NEWS_COUNTRY || "in";

// // Optional licensed yarn price provider
// const YARN_PRICES_URL = process.env.YARN_PRICES_URL;
// const YARN_PRICES_API_KEY = process.env.YARN_PRICES_API_KEY;
// const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY;

// const TTL_MS = 60 * 60 * 1000; // 1 hour
// const TIMEOUT_MS = 15000;
// const MAX_LIMIT = 500;
// const ALL_TRENDS_LIMIT = 12;

// const cache = new Map();
// const STATE = "Tamil Nadu";


// app.use(cors({
//   origin: [
//     "https://hapzo360.netlify.app",
//     "http://localhost:5173",
//   ],
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
//   allowedHeaders: ["Content-Type", "Authorization"],
// }));


// const FEEDS = {
//   manufacturing: {
//     q: 'manufacturing OR factory OR "production line"',
//   },
//   garments: {
//     q: "garment OR textile OR apparel",
//   },
//   technology: {
//     category: "technology",
//   },
//   logistics: {
//     q: 'logistics OR warehouse OR "supply chain"',
//   },
// };

// if (!NEWS_DATA_API_KEY) {
//   console.error("Missing NEWSDATA_API_KEY");
//   process.exit(1);
// }

// // --------------------------------------------------
// // Helpers
// // --------------------------------------------------

// function toNumber(value) {
//   if (value === null || value === undefined || value === "") return null;

//   const number = Number(String(value).replace(/,/g, "").trim());
//   return Number.isFinite(number) ? number : null;
// }

// function firstValue(record, keys) {
//   for (const key of keys) {
//     const value = record?.[key];

//     if (
//       value !== undefined &&
//       value !== null &&
//       String(value).trim() !== ""
//     ) {
//       return value;
//     }
//   }

//   return null;
// }

// function normalizeCategory(name) {
//   const value = String(name || "").toLowerCase();

//   if (
//     /vegetable|tomato|onion|potato|brinjal|ladies.?finger|cabbage|carrot|chilli|beans|drumstick|cucumber|pumpkin|gourd|leafy/.test(
//       value
//     )
//   ) {
//     return "vegetables";
//   }

//   if (
//     /fruit|mango|banana|grapes|apple|orange|papaya|watermelon|guava|lemon/.test(
//       value
//     )
//   ) {
//     return "fruits";
//   }

//   if (
//     /cotton|groundnut|paddy|rice|maize|millet|turmeric|sugarcane|copra|pulse|gram/.test(
//       value
//     )
//   ) {
//     return "agriculture";
//   }

//   return "agriculture";
// }

// async function fetchJson(url, headers = {}) {
//   const controller = new AbortController();
//   const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

//   try {
//     const response = await fetch(url, {
//       headers,
//       signal: controller.signal,
//     });

//     if (!response.ok) {
//       throw new Error(`Upstream HTTP ${response.status}`);
//     }

//     return await response.json();
//   } finally {
//     clearTimeout(timeout);
//   }
// }

// // --------------------------------------------------
// // Cache with stale fallback
// // --------------------------------------------------

// async function cached(key, fetcher) {
//   const hit = cache.get(key);

//   if (hit && Date.now() - hit.at < TTL_MS) {
//     return {
//       data: hit.data,
//       cached: true,
//       stale: false,
//     };
//   }

//   try {
//     const data = await fetcher();

//     cache.set(key, {
//       at: Date.now(),
//       data,
//     });

//     return {
//       data,
//       cached: false,
//       stale: false,
//     };
//   } catch (error) {
//     if (hit) {
//       console.warn(`[cache] ${key} failed; using stale cache:`, error.message);

//       return {
//         data: hit.data,
//         cached: true,
//         stale: true,
//       };
//     }

//     throw error;
//   }
// }

// // --------------------------------------------------
// // AGMARKNET price normalization
// // --------------------------------------------------

// function normalizeCommodity(record, index) {
//   const name = firstValue(record, [
//     "commodity",
//     "Commodity",
//     "commodity_name",
//     "Commodity Name",
//   ]);

//   const market = firstValue(record, [
//     "market",
//     "Market",
//     "market_name",
//     "Market Name",
//   ]);

//   const district = firstValue(record, [
//     "district",
//     "District",
//     "district_name",
//   ]);

//   const state = firstValue(record, ["state", "State", "state_name"]);

//   const minPrice = toNumber(
//     firstValue(record, ["min_price", "Min Price", "minimum_price"])
//   );

//   const maxPrice = toNumber(
//     firstValue(record, ["max_price", "Max Price", "maximum_price"])
//   );

//   const modalPrice = toNumber(
//     firstValue(record, ["modal_price", "Modal Price", "modalPrice"])
//   );

//   const marketDate = firstValue(record, [
//     "arrival_date",
//     "Arrival Date",
//     "date",
//     "Date",
//   ]);

//   if (!name || modalPrice === null || !state) return null;

//   return {
//     id: `agmarknet-${index}-${name}-${marketDate || ""}`
//       .toLowerCase()
//       .replace(/[^a-z0-9-]+/g, "-"),

//     name: String(name),
//     category: normalizeCategory(name),
//     priceType: "wholesale",

//     location: String(state),
//     district: district ? String(district) : null,
//     market: market ? String(market) : null,

//     minPrice: minPrice !== null ? Number((minPrice / 100).toFixed(2)) : null,
//     maxPrice: maxPrice !== null ? Number((maxPrice / 100).toFixed(2)) : null,
//     modalPrice: Number((modalPrice / 100).toFixed(2)),

//     unit: "kg",
//     currency: "INR",

//     source: "AGMARKNET / data.gov.in",
//     sourceUrl:
//       "https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi",

//     marketDate: marketDate ? String(marketDate) : null,
//     updatedAt: new Date().toISOString(),

//     previousModalPrice: null,
//   };
// }

// async function fetchAgriculturalPrices() {
//   if (!DATA_GOV_IN_API_KEY || !AGMARKNET_RESOURCE_ID) {
//     throw new Error("Missing DATA_GOV_IN_API_KEY or AGMARKNET_RESOURCE_ID");
//   }

//   const params = new URLSearchParams({
//     "api-key": DATA_GOV_IN_API_KEY,
//     format: "json",
//     limit: String(MAX_LIMIT),
//     offset: "0",
//     "filters[state]": STATE,
//   });

//   const url =
//     `https://api.data.gov.in/resource/` +
//     `${encodeURIComponent(AGMARKNET_RESOURCE_ID.trim())}?${params}`;

//   const body = await fetchJson(url);

//   // data.gov.in reports bad keys / resource ids inside the body, often with HTTP 200
//   if (!Array.isArray(body.records)) {
//     throw new Error(
//       `data.gov.in: ${body.message || body.error || "unexpected response"}`
//     );
//   }

//   const items = body.records
//     .map(normalizeCommodity)
//     .filter(Boolean)
//     .filter((item) => item.location.toLowerCase() === STATE.toLowerCase());

//   if (items.length === 0) {
//     console.warn(
//       `[prices] data.gov.in sent ${body.records.length} records (total ${body.total}) ` +
//         `but 0 were usable for ${STATE}. First record:`,
//       JSON.stringify(body.records[0] ?? null)
//     );
//     throw new Error("No usable price records");
//   }

//   return items;
// }

// // --------------------------------------------------
// // Optional yarn provider
// // --------------------------------------------------

// function normalizeYarn(record, index) {
//   const name = firstValue(record, ["name", "product", "commodity", "yarn"]);

//   const modalPrice = toNumber(
//     firstValue(record, ["modalPrice", "modal_price", "price"])
//   );

//   if (!name || modalPrice === null) return null;

//   return {
//     id: String(record.id || `yarn-${index}-${name}`).replace(
//       /[^a-zA-Z0-9_-]/g,
//       "-"
//     ),

//     name: String(name),
//     category: "yarn",

//     priceType:
//       String(record.priceType || "wholesale").toLowerCase() === "retail"
//         ? "retail"
//         : "wholesale",

//     location: String(record.location || STATE),
//     district: record.district || null,
//     market: record.market || null,

//     minPrice: toNumber(record.minPrice ?? record.min_price),
//     maxPrice: toNumber(record.maxPrice ?? record.max_price),
//     modalPrice,

//     unit: String(record.unit || "kg"),
//     currency: String(record.currency || "INR"),

//     source: String(record.source || "Yarn price provider"),
//     sourceUrl:
//       record.sourceUrl || record.source_url || YARN_PRICES_URL || null,

//     marketDate:
//       record.marketDate || record.market_date || record.date || null,

//     updatedAt:
//       record.updatedAt || record.updated_at || new Date().toISOString(),

//     previousModalPrice: toNumber(
//       record.previousModalPrice ?? record.previous_modal_price
//     ),

//     yarnCount: record.yarnCount || record.yarn_count || null,
//     yarnType: record.yarnType || record.yarn_type || null,
//   };
// }

// async function fetchYarnPrices() {
//   if (!YARN_PRICES_URL) return [];

//   const headers = {};

//   if (YARN_PRICES_API_KEY) {
//     headers.Authorization = `Bearer ${YARN_PRICES_API_KEY}`;
//   }

//   const body = await fetchJson(YARN_PRICES_URL, headers);

//   const records = Array.isArray(body)
//     ? body
//     : body.items || body.records || body.data || [];

//   if (!Array.isArray(records)) {
//     throw new Error("Invalid yarn provider response");
//   }

//   return records.map(normalizeYarn).filter(Boolean);
// }

// // --------------------------------------------------
// // Price filtering
// // --------------------------------------------------

// function matchesSearch(item, query) {
//   if (!query) return true;

//   const searchable = [
//     item.name,
//     item.category,
//     item.location,
//     item.district,
//     item.market,
//     item.yarnType,
//     item.yarnCount,
//   ]
//     .filter(Boolean)
//     .join(" ")
//     .toLowerCase();

//   return searchable.includes(query.toLowerCase());
// }

// function matchesLocation(item, location) {
//   if (!location || location.toLowerCase() === "all tamil nadu") return true;

//   const wanted = location.toLowerCase();

//   return [item.location, item.district, item.market]
//     .filter(Boolean)
//     .some((value) => value.toLowerCase().includes(wanted));
// }

// // --------------------------------------------------
// // NewsData trends
// // --------------------------------------------------

// function parseNewsDate(value) {
//   if (!value) return null;

//   const date = new Date(`${value.replace(" ", "T")}Z`);
//   return Number.isNaN(date.getTime()) ? null : date.toISOString();
// }

// async function fetchTrendFeed(domain) {
//   const params = new URLSearchParams({
//     apikey: NEWS_DATA_API_KEY,
//     country: NEWS_COUNTRY,
//     language: "en",
//     size: "10",
//     removeduplicate: "1",
//     ...FEEDS[domain],
//   });

//   const body = await fetchJson(
//     `https://newsdata.io/api/1/latest?${params}`
//   );

//   if (body.status !== "success") {
//     throw new Error(body.results?.message || "NewsData request failed");
//   }

//   return (body.results || []).map((item) => ({
//     id: item.article_id,
//     domain,
//     title: item.title,
//     description: item.description,
//     link: item.link,
//     image: item.image_url,
//     source: item.source_name || item.source_id,
//     publishedAt: parseNewsDate(item.pubDate),
//   }));
// }

// function mixTrendFeeds(lists) {
//   const seen = new Set();
//   const result = [];
//   const longest = Math.max(...lists.map((list) => list.length), 0);

//   for (let i = 0; i < longest; i++) {
//     for (const list of lists) {
//       const article = list[i];

//       if (article && !seen.has(article.link)) {
//         seen.add(article.link);
//         result.push(article);
//       }
//     }
//   }

//   return result.slice(0, ALL_TRENDS_LIMIT);
// }

// // --------------------------------------------------
// // Routes
// // --------------------------------------------------

// app.get("/api/health", (_req, res) => {
//   res.json({
//     ok: true,
//     service: "prices-and-trends-proxy",
//     features: {
//       prices: Boolean(DATA_GOV_IN_API_KEY && AGMARKNET_RESOURCE_ID),
//       yarn: Boolean(YARN_PRICES_URL),
//       trends: Boolean(NEWS_DATA_API_KEY),
//       happenings: Boolean(SERPAPI_API_KEY),
//     },
//   });
// });

// app.get("/api/prices", async (req, res) => {
//   const category = String(req.query.category || "all").toLowerCase();
//   const priceType = String(req.query.priceType || "all").toLowerCase();
//   const location = String(req.query.location || "All Tamil Nadu").trim();
//   const query = String(req.query.q || req.query.search || "").trim();

//   const requestedLimit = Number.parseInt(req.query.limit, 10);
//   const limit = Math.min(Math.max(requestedLimit || 200, 1), MAX_LIMIT);

//   const validCategories = [
//     "all",
//     "vegetables",
//     "fruits",
//     "yarn",
//     "agriculture",
//   ];

//   if (!validCategories.includes(category)) {
//     return res.status(400).json({ error: "Unknown category" });
//   }

//   if (!["all", "wholesale", "retail"].includes(priceType)) {
//     return res.status(400).json({
//       error: "priceType must be all, wholesale, or retail",
//     });
//   }

//   try {
//     const results = await Promise.allSettled([
//       cached("agmarknet", fetchAgriculturalPrices),
//       cached("yarn", fetchYarnPrices),
//     ]);

//     results.forEach((r, i) => {
//       if (r.status === "rejected") {
//         console.error(`[prices] ${i === 0 ? "agmarknet" : "yarn"} failed:`, r.reason?.message);
//       }
//     });

//     const successful = results
//       .filter((result) => result.status === "fulfilled")
//       .map((result) => result.value);

//     if (successful.length === 0) {
//       throw new Error("All price providers failed");
//     }

//     const allItems = successful.flatMap((result) => result.data);

//     const items = allItems
//       .filter(
//         (item) => category === "all" || item.category === category
//       )
//       .filter(
//         (item) =>
//           priceType === "all" || item.priceType === priceType
//       )
//       .filter((item) => matchesLocation(item, location))
//       .filter((item) => matchesSearch(item, query))
//       .sort((a, b) => {
//         const dateA = a.marketDate
//           ? new Date(a.marketDate).getTime() || 0
//           : 0;

//         const dateB = b.marketDate
//           ? new Date(b.marketDate).getTime() || 0
//           : 0;

//         return dateB - dateA || a.name.localeCompare(b.name);
//       })
//       .slice(0, limit);

//     res.set("Cache-Control", "public, max-age=300");

//     res.json({
//       items,
//       updatedAt: new Date().toISOString(),
//       stale: successful.some((result) => result.stale),

//       sources: results.map((r, i) => ({
//         id: i === 0 ? "agmarknet" : "yarn",
//         ok: r.status === "fulfilled",
//         error: r.status === "rejected" ? r.reason?.message : undefined,
//         count: r.status === "fulfilled" ? r.value.data.length : 0,
//       })),

//       meta: {
//         category,
//         priceType,
//         location,
//         count: items.length,
//         cacheTtlMs: TTL_MS,
//         note:
//           "AGMARKNET records are wholesale mandi prices, " +
//           "generally quoted per quintal. Yarn prices require " +
//           "a configured provider.",
//       },
//     });
//   } catch (error) {
//     console.error("[prices] Request failed:", error.message);

//     res.status(502).json({
//       error: "Could not load prices",
//       message:
//         "Check the API credentials, resource ID, and provider status.",
//     });
//   }
// });

// app.get("/api/trends", async (req, res) => {
//   const domain = String(req.query.domain || "all").toLowerCase();

//   try {
//     let articles;

//     if (domain === "all") {
//       const settled = await Promise.allSettled(
//         Object.keys(FEEDS).map((feedDomain) =>
//           cached(`trend-${feedDomain}`, () => fetchTrendFeed(feedDomain))
//         )
//       );

//       const lists = settled
//         .filter((result) => result.status === "fulfilled")
//         .map((result) => result.value.data);

//       if (lists.length === 0) {
//         throw new Error("All trend feeds failed");
//       }

//       articles = mixTrendFeeds(lists);
//     } else if (FEEDS[domain]) {
//       const result = await cached(`trend-${domain}`, () =>
//         fetchTrendFeed(domain)
//       );

//       articles = result.data;
//     } else {
//       return res.status(400).json({ error: "Unknown domain" });
//     }

//     res.set("Cache-Control", "public, max-age=300");

//     res.json({
//       articles,
//       stale: false,
//     });
//   } catch (error) {
//     console.error("[trends] Request failed:", error.message);

//     res.status(502).json({
//       error: "Could not load trends",
//     });
//   }
// });

// // --------------------------------------------------
// // Happenings (SerpAPI Google Events)
// // --------------------------------------------------

// const EVENT_PAGES = 2; // 10 events per page, 1 SerpAPI credit per page
// const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
// const MONTH_RE = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?";

// const pad = (n) => String(n).padStart(2, "0");
// const dayDiff = (a, b) =>
//   Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

// // YYYY-MM-DD in India time, regardless of server timezone
// const todayIST = () =>
//   new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

// // "Oct 30", "Fri, Oct 30, 10 AM", "30 Oct 2026", "2026-10-30" -> { date: "YYYY-MM-DD", end }
// function parseSerpDate(text) {
//   if (typeof text !== "string" || !text) return null;

//   const iso = text.match(/\b20\d{2}-\d{2}-\d{2}\b/);
//   if (iso) return { date: iso[0], end: iso.index + iso[0].length };

//   const mdy = text.match(new RegExp(`\\b${MONTH_RE}\\s+(\\d{1,2})\\b(?:,?\\s+(20\\d{2}))?`, "i"));
//   const dmy = text.match(new RegExp(`\\b(\\d{1,2})\\s+${MONTH_RE}(?:,?\\s+(20\\d{2}))?`, "i"));

//   let match, month, day, year;
//   if (mdy && (!dmy || mdy.index <= dmy.index)) {
//     [match, month, day, year] = [mdy, mdy[1], mdy[2], mdy[3]];
//   } else if (dmy) {
//     [match, day, month, year] = [dmy, dmy[1], dmy[2], dmy[3]];
//   } else {
//     return null;
//   }

//   const monthIndex = MONTHS[month.slice(0, 3).toLowerCase()];
//   const today = todayIST();
//   const baseYear = Number(year || today.slice(0, 4));
//   let date = `${baseYear}-${pad(monthIndex + 1)}-${pad(Number(day))}`;
//   // No year given and the date is well in the past -> it's next year's event
//   if (!year && dayDiff(today, date) < -30) {
//     date = `${baseYear + 1}-${pad(monthIndex + 1)}-${pad(Number(day))}`;
//   }

//   return { date, end: match.index + match[0].length };
// }

// // "10 – 11 AM IST" -> "10:00 AM" (start time, in a format the frontend's eventHour() reads)
// function parseStartTime(when, from = 0) {
//   if (typeof when !== "string") return "";
//   const rest = when.slice(from).replace(/\b(?:GMT|UTC)\s*[+-]\s*[\d:]+/gi, " ");
//   const times = [...rest.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?m\b)?/gi)];
//   if (!times.length) return "";

//   const first = times[0];
//   let hour = Number(first[1]);
//   const minute = first[2] || "00";
//   let mer = first[3]?.toLowerCase();

//   // "10 – 11 AM": the start inherits the end's am/pm (unless it wraps, e.g. "11 – 1 PM")
//   if (!mer) {
//     const end = times.slice(1).find((t) => t[3]);
//     if (end) {
//       const endMer = end[3].toLowerCase();
//       const wraps = hour !== 12 && hour % 12 > Number(end[1]) % 12;
//       mer = wraps ? (endMer === "a" ? "p" : "a") : endMer;
//     }
//   }
//   // 24-hour fallback ("18:00")
//   if (!mer) {
//     if (hour < 13 || hour > 23) return "";
//     hour -= 12;
//     mer = "p";
//   }
//   if (hour < 1 || hour > 12) return "";
//   return `${hour}:${minute} ${mer.toUpperCase()}M`;
// }

// // google_events only supports preset date chips, so pick the narrowest one that
// // contains the chosen day, then filter to the exact day afterwards.
// function dateChip(selected) {
//   if (!selected) return "";
//   const today = todayIST();
//   const diff = dayDiff(today, selected);
//   if (diff < 0) return "";
//   if (diff === 0) return "date:today";
//   if (diff === 1) return "date:tomorrow";

//   const nextMonth = new Date(`${today.slice(0, 7)}-15T12:00:00Z`);
//   nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
//   if (selected.slice(0, 7) === today.slice(0, 7)) return "date:month";
//   if (selected.slice(0, 7) === nextMonth.toISOString().slice(0, 7)) return "date:next_month";
//   return "";
// }

// function categorizeHappening(event) {
//   const text = `${event.title || ""} ${event.description || ""}`.toLowerCase();
//   if (/hackathon/.test(text)) return "Hackathon";
//   if (/meet.?up|networking/.test(text)) return "Meetups";
//   if (/expo|exhibition|trade show/.test(text)) return "Expo";
//   if (/workshop|hands.on/.test(text)) return "Workshops";
//   if (/webinar|online session/.test(text)) return "Webinar";
//   if (/conference|summit|convention/.test(text)) return "Conference";
//   if (/business|startup|entrepreneur/.test(text)) return "Business";
//   return "Community";
// }

// const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

// function mapSerpEvent(event, district) {
//   const link = typeof event.link === "string" ? event.link : "";
//   const dateObj = event.date && typeof event.date === "object" ? event.date : {};
//   const when = typeof event.date === "string" ? event.date : dateObj.when || "";

//   const startParsed = parseSerpDate(dateObj.start_date);
//   const whenParsed = parseSerpDate(when);
//   const date = (startParsed || whenParsed)?.date || "";
//   const time = parseStartTime(when, whenParsed?.end ?? 0);

//   const address = Array.isArray(event.address) ? event.address : event.address ? [event.address] : [];
//   const venueName = typeof event.venue === "string" ? event.venue : event.venue?.name;
//   const venue = [...new Set([venueName, ...address].filter(Boolean))].join(", ") || district;

//   let sourceName = event.ticket_info?.[0]?.source || "Online listing";
//   if (sourceName === "Online listing") {
//     try {
//       const host = new URL(link).hostname.replace(/^www\./, "");
//       if (host && !/google\./i.test(host)) sourceName = host;
//     } catch { /* keep generic label */ }
//   }

//   return {
//     id: `serp-${slug(event.title || "event")}-${date || "undated"}`,
//     title: event.title || "",
//     date,
//     time,
//     venue,
//     location: venue,
//     description: event.description || "",
//     image: event.image || event.thumbnail || "",
//     category: categorizeHappening(event),
//     url: link,
//     link,
//     sourceName,
//     scraped: true,
//     registeredCount: 0,
//   };
// }

// async function fetchSerpEvents({ district, state, selectedDate }) {
//   const chip = dateChip(selectedDate);

//   const pages = await Promise.allSettled(
//     Array.from({ length: EVENT_PAGES }, (_, page) => {
//       const params = new URLSearchParams({
//         engine: "google_events",
//         q: `Events in ${district}, ${state}`,
//         hl: "en",
//         gl: "in",
//         start: String(page * 10),
//         api_key: SERPAPI_API_KEY,
//       });
//       if (chip) params.set("htichips", chip);
//       return fetchJson(`https://serpapi.com/search.json?${params}`);
//     })
//   );

//   const raw = [];
//   pages.forEach((page, index) => {
//     if (page.status === "rejected") {
//       if (index === 0) throw page.reason; // first page failing = real failure
//       return;
//     }
//     const data = page.value;
//     if (data.error) {
//       // SerpAPI sends "no results" as an error string; that's an empty list, not a failure
//       if (index === 0 && !/hasn't returned any results/i.test(data.error)) throw new Error(data.error);
//       return;
//     }
//     if (Array.isArray(data.events_results)) raw.push(...data.events_results);
//   });

//   const seen = new Set();
//   return raw
//     .map((event) => mapSerpEvent(event, district))
//     .filter((event) => event.title)
//     .filter((event) => !seen.has(event.id) && seen.add(event.id))
//     .filter((event) => !selectedDate || event.date === selectedDate);
// }

// app.get("/api/happenings/search", async (req, res) => {
//   const district = String(req.query.district || "").trim().slice(0, 80);
//   const state = String(req.query.state || "Tamil Nadu").trim().slice(0, 80);
//   const selectedDate = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ""))
//     ? String(req.query.date)
//     : "";

//   if (!district) return res.status(400).json({ error: "Choose a district to search." });
//   if (!SERPAPI_API_KEY) {
//     return res.status(503).json({ events: [], available: false, error: "Online event search is not configured." });
//   }

//   try {
//     // Time of day is filtered on the client; it isn't part of the cache key
//     const result = await cached(
//       `happenings-${state}-${district}-${selectedDate || "upcoming"}`.toLowerCase(),
//       () => fetchSerpEvents({ district, state, selectedDate })
//     );

//     res.set("Cache-Control", "public, max-age=300");
//     res.json({
//       events: result.data,
//       available: true,
//       stale: result.stale,
//       district,
//       state,
//       date: selectedDate || null,
//       source: "SerpAPI",
//     });
//   } catch (error) {
//     console.error("[happenings] SerpAPI request failed:", error.message);
//     res.status(502).json({ events: [], available: false, error: "Could not retrieve online event listings." });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`Prices and trends proxy running at http://localhost:${PORT}`);

//   if (!DATA_GOV_IN_API_KEY || !AGMARKNET_RESOURCE_ID) {
//     console.warn(
//       "[prices] Configure DATA_GOV_IN_API_KEY and " +
//         "AGMARKNET_RESOURCE_ID in .env"
//     );
//   }

//   if (!YARN_PRICES_URL) {
//     console.warn(
//       "[prices] Yarn prices disabled; configure YARN_PRICES_URL " +
//         "to enable a licensed yarn feed."
//     );
//   }
// });


import express from "express";
import "dotenv/config";
import cors from "cors";
import dns from "node:dns";
import { createHash } from "node:crypto";
import happenings, { warmHappenings } from "./happenings.js";
import { createDatabase, initializeDatabase } from "./db.js";
import { platformRoutes, seedSuperAdmin, seedReadOnlySuperAdmin } from "./platform.js";

const app = express();
const PORT = process.env.PORT || 3001;
dns.setDefaultResultOrder("ipv4first");

// Government agricultural mandi price API
const DATA_GOV_IN_API_KEY = process.env.DATA_GOV_IN_API_KEY;
const AGMARKNET_RESOURCE_ID = process.env.AGMARKNET_RESOURCE_ID || "9ef84268-d588-465a-a308-a864a43d0070";

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

// This is deliberately marked as reference-only data. It keeps the public
// Price List useful if its live Government provider cannot be reached from
// the VPS; it must never be presented as a current trading quote.
const REFERENCE_PRICE_ROWS = [
  ['Tomato', 'vegetables', 'Coimbatore', 'Mettupalayam Market', 12, 18, 15, 'kg'],
  ['Onion', 'vegetables', 'Salem', 'Salem Market', 20, 28, 24, 'kg'],
  ['Potato', 'vegetables', 'Chennai', 'Koyambedu Market', 22, 30, 26, 'kg'],
  ['Banana', 'fruits', 'Madurai', 'Madurai Market', 28, 40, 34, 'kg'],
  ['Mango', 'fruits', 'Dindigul', 'Dindigul Market', 55, 80, 68, 'kg'],
  ['Coconut', 'agriculture', 'Thanjavur', 'Thanjavur Market', 28, 38, 33, 'kg'],
  ['Turmeric (dry)', 'agriculture', 'Erode', 'Erode Market', 135, 170, 150, 'kg'],
  ['Paddy', 'agriculture', 'Tiruchirappalli', 'Trichy Market', 22, 30, 26, 'kg'],
  ['Cotton yarn', 'yarn', 'Tiruppur', 'Tiruppur textile market', 220, 280, 250, 'kg'],
];

function referencePriceItems() {
  const updatedAt = new Date().toISOString();
  return REFERENCE_PRICE_ROWS.map(([name, category, location, market, minPrice, maxPrice, modalPrice, unit]) => ({
    id: `reference-${name}-${location}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name, category, priceType: 'wholesale', location, district: location, market,
    minPrice, maxPrice, modalPrice, unit, currency: 'INR',
    source: 'Hapzo360 reference guide — not live', sourceUrl: null,
    marketDate: null, updatedAt, previousModalPrice: null, isReference: true,
  }));
}

// CORS must come before any routes/routers so every response gets the headers
app.use(
  cors({
    // Both canonical domain variants are in use. Browsers require an exact
    // CORS-origin match, so visitors using www must be allowed too.
    origin: ["https://hapzo360.netlify.app", "https://hapzo360.com", "https://www.hapzo360.com", "http://localhost:5173", "http://127.0.0.1:5173", process.env.FRONTEND_ORIGIN].filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: '8mb' }));

// Happenings crawler (GET /api/happenings/search)
app.use("/api/happenings", happenings);

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
  console.info("[trends] NEWSDATA_API_KEY is missing; using publisher RSS fallbacks.");
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
  } catch (error) {
    const errorCode = error?.cause?.code || error?.code;
    const detail = controller.signal.aborted
      ? `Upstream request timed out after ${TIMEOUT_MS}ms`
      : errorCode
        ? `${error.message} (${errorCode})`
        : error.message;
    throw new Error(detail || "Upstream request failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchText(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    const errorCode = error?.cause?.code || error?.code;
    const detail = controller.signal.aborted ? `Upstream request timed out after ${TIMEOUT_MS}ms` : errorCode ? `${error.message} (${errorCode})` : error.message;
    throw new Error(detail || 'Upstream request failed', { cause: error });
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

const RSS_QUERIES = {
  manufacturing: 'manufacturing India',
  garments: 'garments textile India',
  technology: 'technology India',
  logistics: 'logistics supply chain India',
};

const PUBLISHER_RSS_FEEDS = {
  manufacturing: { url: 'https://www.thehindu.com/business/Industry/feeder/default.rss', source: 'The Hindu' },
  garments: { url: 'https://www.livemint.com/rss/industry', source: 'Mint' },
  technology: { url: 'https://www.thehindu.com/sci-tech/technology/feeder/default.rss', source: 'The Hindu' },
  logistics: { url: 'https://www.livemint.com/rss/industry', source: 'Mint' },
};

function decodeXml(value = '') {
  return String(value).replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code))).trim();
}

function rssValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function rssAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=["']([^"']+)["']`, 'i'));
  return match ? decodeXml(match[1]) : '';
}

function rssImage(item) {
  const media = item.match(/<media:(?:content|thumbnail)\b[^>]*>/i)?.[0];
  return media ? rssAttribute(media, 'url') : '';
}

async function fetchPublisherRssFeed(domain) {
  const feed = PUBLISHER_RSS_FEEDS[domain];
  if (!feed) return fetchGoogleNewsFeed(domain);
  const xml = await fetchText(feed.url, { 'User-Agent': 'Hapzo360/1.0' });
  const articles = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const link = rssValue(item, 'link');
    const title = rssValue(item, 'title');
    if (!link || !title) continue;
    const published = new Date(rssValue(item, 'pubDate'));
    articles.push({ id: `publisher-rss-${createHash('sha256').update(link).digest('hex').slice(0, 20)}`, domain, title, description: rssValue(item, 'description').replace(/<[^>]+>/g, '').trim(), link, image: rssImage(item) || null, source: feed.source, publishedAt: Number.isNaN(published.getTime()) ? null : published.toISOString() });
  }
  if (!articles.length) throw new Error(`${feed.source} RSS returned no usable articles`);
  return articles.slice(0, 10);
}

async function fetchGoogleNewsFeed(domain) {
  const query = RSS_QUERIES[domain] || 'India business';
  const params = new URLSearchParams({ q: `${query} when:7d`, hl: 'en-IN', gl: 'IN', ceid: 'IN:en' });
  const xml = await fetchText(`https://news.google.com/rss/search?${params}`, { 'User-Agent': 'Hapzo360/1.0' });
  const articles = [];
  for (const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = match[1];
    const link = rssValue(item, 'link');
    const title = rssValue(item, 'title');
    if (!link || !title) continue;
    const published = new Date(rssValue(item, 'pubDate'));
    articles.push({ id: `google-rss-${createHash('sha256').update(link).digest('hex').slice(0, 20)}`, domain, title, description: rssValue(item, 'description').replace(/<[^>]+>/g, '').trim(), link, image: null, source: rssValue(item, 'source') || 'Google News', publishedAt: Number.isNaN(published.getTime()) ? null : published.toISOString() });
  }
  if (!articles.length) throw new Error('Google News RSS returned no usable articles');
  return articles.slice(0, 10);
}

async function fetchTrendFeed(domain) {
  if (!NEWS_DATA_API_KEY) {
    try { return await fetchPublisherRssFeed(domain); }
    catch (error) {
      console.warn(`[trends] ${domain} publisher RSS failed; using Google News RSS:`, error.message);
      return fetchGoogleNewsFeed(domain);
    }
  }
  const params = new URLSearchParams({
    apikey: NEWS_DATA_API_KEY,
    country: NEWS_COUNTRY,
    language: "en",
    size: "10",
    removeduplicate: "1",
    ...FEEDS[domain],
  });

  const body = await fetchJson(`https://newsdata.io/api/1/latest?${params}`);

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
      trends: true,
      happenings: true,
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

  const validCategories = ["all", "vegetables", "fruits", "yarn", "agriculture"];

  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: "Unknown category" });
  }

  if (!["all", "wholesale", "retail"].includes(priceType)) {
    return res.status(400).json({
      error: "priceType must be all, wholesale, or retail",
    });
  }

  if (!DATA_GOV_IN_API_KEY || !AGMARKNET_RESOURCE_ID) {
    return res.status(503).json({
      error: 'Price provider is not configured',
      message: 'Set DATA_GOV_IN_API_KEY in backend/.env to load official mandi prices. AGMARKNET_RESOURCE_ID already has a project default and can be overridden if needed.',
      configured: { dataGovApiKey: Boolean(DATA_GOV_IN_API_KEY), agmarknetResourceId: Boolean(AGMARKNET_RESOURCE_ID), yarnProvider: Boolean(YARN_PRICES_URL) },
    });
  }

  try {
    const results = await Promise.allSettled([
      cached("agmarknet", fetchAgriculturalPrices),
      cached("yarn", fetchYarnPrices),
    ]);

    results.forEach((r, i) => {
      if (r.status === "rejected") {
        console.error(
          `[prices] ${i === 0 ? "agmarknet" : "yarn"} failed:`,
          r.reason?.message
        );
      }
    });

    const successful = results
      .filter((result) => result.status === "fulfilled")
      .map((result) => result.value);

    const hasPriceData = successful.some(
      (result) => Array.isArray(result.data) && result.data.length > 0
    );

    if (!hasPriceData) {
      const items = referencePriceItems()
        .filter((item) => category === 'all' || item.category === category)
        .filter((item) => priceType === 'all' || item.priceType === priceType)
        .filter((item) => matchesLocation(item, location))
        .filter((item) => matchesSearch(item, query))
        .slice(0, limit);

      res.set('Cache-Control', 'no-store');
      return res.json({
        items,
        updatedAt: null,
        stale: true,
        reference: true,
        message: 'Live mandi prices are temporarily unavailable. These rows are indicative reference data, not current market quotes.',
        sources: results.map((result, index) => ({
          id: index === 0 ? "agmarknet" : "yarn",
          ok: result.status === "fulfilled" && result.value.data.length > 0,
          error: result.status === "rejected"
            ? result.reason?.message || "Provider request failed"
            : "No records returned",
          count: result.status === "fulfilled" ? result.value.data.length : 0,
        })),
        meta: {
          category, priceType, location, count: items.length, cacheTtlMs: 0,
          note: 'Reference data is shown only while the live provider is unavailable. It is not a current market quote.',
        },
      });
    }

    const allItems = successful.flatMap((result) => result.data);

    const items = allItems
      .filter((item) => category === "all" || item.category === category)
      .filter((item) => priceType === "all" || item.priceType === priceType)
      .filter((item) => matchesLocation(item, location))
      .filter((item) => matchesSearch(item, query))
      .sort((a, b) => {
        const dateA = a.marketDate ? new Date(a.marketDate).getTime() || 0 : 0;
        const dateB = b.marketDate ? new Date(b.marketDate).getTime() || 0 : 0;

        return dateB - dateA || a.name.localeCompare(b.name);
      })
      .slice(0, limit);

    res.set("Cache-Control", "public, max-age=300");

    res.json({
      items,
      updatedAt: new Date().toISOString(),
      stale: successful.some((result) => result.stale),

      sources: results.map((r, i) => ({
        id: i === 0 ? "agmarknet" : "yarn",
        ok: r.status === "fulfilled",
        error: r.status === "rejected" ? r.reason?.message : undefined,
        count: r.status === "fulfilled" ? r.value.data.length : 0,
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
      message: "Check the API credentials, resource ID, and provider status.",
    });
  }
});

let editorialDb;

app.get("/api/trends", async (req, res) => {
  const domain = String(req.query.domain || "all").toLowerCase();
  if (domain !== 'all' && !FEEDS[domain]) return res.status(400).json({ error: 'Unknown domain' });
  const [posts] = editorialDb ? await editorialDb.execute(
    domain === 'all'
      ? 'SELECT id, domain, title, description, image_url, published_at FROM editorial_posts ORDER BY published_at DESC LIMIT 100'
      : 'SELECT id, domain, title, description, image_url, published_at FROM editorial_posts WHERE domain = ? ORDER BY published_at DESC LIMIT 100',
    domain === 'all' ? [] : [domain]
  ) : [[]];
  const origin = `${req.get('x-forwarded-proto')?.split(',')[0]?.trim() === 'https' ? 'https' : req.protocol}://${req.get('host')}`;
  const editorial = posts.map((post) => ({
    id: post.id, domain: post.domain === 'all' ? 'manufacturing' : post.domain,
    title: post.title, description: post.description,
    link: `${origin}/api/editorial/${post.id}`,
    image: post.image_url?.startsWith('/') ? `${origin}${post.image_url}` : post.image_url, source: 'Hapzo360',
    publishedAt: new Date(`${String(post.published_at).replace(' ', 'T')}Z`).toISOString(),
  }));

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

      if (lists.length === 0 && editorial.length === 0) {
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

    res.set("Cache-Control", "no-store");

    res.json({
      articles: [...editorial, ...articles],
      stale: false,
    });
  } catch (error) {
    console.error("[trends] Request failed:", error.message);
    if (editorial.length) return res.json({ articles: editorial, stale: true });
    res.status(502).json({
      error: "Could not load trends",
    });
  }
});

// --------------------------------------------------
// Start
// --------------------------------------------------

async function start() {
  const db = createDatabase();
  await initializeDatabase(db);
  await seedSuperAdmin(db);
  await seedReadOnlySuperAdmin(db);
  editorialDb = db;
  app.use('/api', platformRoutes(db, { getExternalStats: () => {
    const trendEntries = [...cache.entries()].filter(([key]) => key.startsWith('trend-'));
    const trendArticles = trendEntries.flatMap(([, value]) => value.data || []);
    const uniqueNews = new Map(trendArticles.map((article) => [article.link || article.id, article]));
    const uniqueNewsForDomains = (domains) => {
      const articles = trendEntries
        .filter(([key]) => domains.includes(key.replace(/^trend-/, '')))
        .flatMap(([, value]) => value.data || []);
      return new Map(articles.map((article) => [article.link || article.id, article])).size;
    };
    const agmarknetCache = cache.get('agmarknet');
    const yarnCache = cache.get('yarn');
    return {
      news: uniqueNews.size,
      newsLoaded: trendEntries.length > 0,
      newsProvider: NEWS_DATA_API_KEY ? 'NewsData.io' : 'Publisher RSS feeds',
      newsByDomain: {
        trends: uniqueNewsForDomains(['manufacturing', 'garments', 'logistics']),
        technology: uniqueNewsForDomains(['technology']),
      },
      newsPublishers: [...new Set([...uniqueNews.values()].map((article) => article.source).filter(Boolean))].sort(),
      agmarknet: agmarknetCache?.data?.length || 0,
      agmarknetLoaded: Boolean(agmarknetCache),
      yarn: yarnCache?.data?.length || 0,
      yarnLoaded: Boolean(yarnCache),
      yarnEnabled: Boolean(YARN_PRICES_URL),
      newsEnabled: true,
      agmarknetEnabled: Boolean(DATA_GOV_IN_API_KEY && AGMARKNET_RESOURCE_ID),
      eventbriteEnabled: process.env.CRAWL_EVENTBRITE === '1',
    };
  } }));
  app.use((error, req, res, next) => {
    console.error('[api] Request failed:', error);
    if (res.headersSent) return next(error);
    res.status(500).json({ message: 'The server could not complete this request.' });
  });

  app.listen(PORT, () => {
  console.log(`Hapzo360 API running at http://localhost:${PORT}`);

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

  // Pre-crawl Chennai, Coimbatore and Madurai so the first visitor is fast
  warmHappenings();
  });
}

start().catch((error) => {
  console.error('[startup] Could not connect to MySQL or initialize the schema:', error.message);
  process.exitCode = 1;
});
