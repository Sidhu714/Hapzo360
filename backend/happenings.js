// happenings.js
//
// Event discovery without SerpAPI. Same idea as the PHP "N Events" crawler:
//
//   listing page (e.g. https://www.meetup.com/find/in--chennai/)
//     -> links to event pages
//     -> each event page's schema.org Event JSON-LD
//     -> normalized event cards
//
// Only explicit structured data becomes an event; free text is never guessed.
// Politeness: robots.txt is obeyed, requests to one host are spaced out,
// results are cached for hours and served from cache, and only the hosts in
// SOURCES are ever fetched.

import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const router = express.Router();

// --------------------------------------------------
// Config
// --------------------------------------------------

const USER_AGENT =
  process.env.CRAWLER_USER_AGENT ||
  "HapzoBot/1.0 (event discovery; +https://hapzo360.netlify.app)";
const ROBOTS_TOKEN = "hapzobot"; // matched against robots.txt User-agent lines

const MIN_DELAY_MS = Number(process.env.CRAWL_DELAY_MS) || 1500; // per host
const FETCH_TIMEOUT_MS = 20000;
const MAX_EVENT_PAGES = Number(process.env.CRAWL_MAX_EVENT_PAGES) || 20; // per city per run
const MAX_HTML_BYTES = 3_000_000;

const REFRESH_MS = 6 * 60 * 60 * 1000; // re-crawl a city at most every 6h
const RETRY_MS = 15 * 60 * 1000; // after a failed crawl, wait before retrying
const CACHE_DIR = path.resolve(process.env.EVENT_CACHE_DIR || ".cache");

// Cities crawled on server start (keeps the first visitor fast)
const WARM_CITIES = ["chennai", "coimbatore", "madurai"];

// District -> nearest city that has a Meetup page. The district's own page is
// tried first; this is only the fallback.
const HUB_FOR = {
  kancheepuram: "chennai", kanchipuram: "chennai", chengalpattu: "chennai",
  tiruvallur: "chennai", thiruvallur: "chennai", ranipet: "chennai",
  vellore: "chennai", tiruvannamalai: "chennai", kallakurichi: "chennai",
  tiruppur: "coimbatore", erode: "coimbatore", nilgiris: "coimbatore",
  namakkal: "coimbatore", salem: "coimbatore", karur: "coimbatore",
  dharmapuri: "coimbatore", krishnagiri: "coimbatore",
  theni: "madurai", dindigul: "madurai", virudhunagar: "madurai",
  sivaganga: "madurai", sivagangai: "madurai", ramanathapuram: "madurai",
  thoothukudi: "madurai", tirunelveli: "madurai", kanyakumari: "madurai",
  tenkasi: "madurai", pudukkottai: "madurai", tiruchirappalli: "madurai",
  trichy: "madurai", thanjavur: "madurai",
};

// Add another site by adding an entry here. `listing(slug)` builds a city page
// URL; `eventPattern` must match an event page URL (query and hash stripped).
const SOURCES = [
  {
    id: "meetup",
    name: "Meetup",
    enabled: true,
    hosts: ["www.meetup.com", "meetup.com"],
    defaultCategory: "Meetups",
    listing: (slug) => `https://www.meetup.com/find/in--${slug}/`,
    eventPattern: /^https:\/\/(www\.)?meetup\.com\/[^/?#]+\/events\/\d+\/?$/i,
  },
  {
    id: "eventbrite",
    name: "Eventbrite",
    enabled: process.env.CRAWL_EVENTBRITE === "1", // off unless you opt in
    hosts: ["www.eventbrite.com", "eventbrite.com"],
    defaultCategory: "Community",
    listing: (slug) => `https://www.eventbrite.com/d/india--${slug}/events/`,
    eventPattern: /^https:\/\/(www\.)?eventbrite\.com\/e\/[^/?#]+-\d{9,}\/?$/i,
  },
];

const ALLOWED_HOSTS = new Set(SOURCES.flatMap((s) => s.hosts));

// --------------------------------------------------
// Small helpers
// --------------------------------------------------

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pad = (n) => String(n).padStart(2, "0");
const sha = (s) => crypto.createHash("sha1").update(String(s)).digest("hex").slice(0, 16);
const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

const dayDiff = (a, b) =>
  Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / 86400000);

function decodeEntities(s) {
  return String(s)
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(s) {
  return decodeEntities(String(s).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);

function tryParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --------------------------------------------------
// robots.txt (RFC 9309 style: most specific group, longest match wins)
// --------------------------------------------------

function patternToRegex(pattern) {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

function parseRobots(text) {
  const groups = [];
  let current = null;
  let lastWasAgent = false;

  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === "user-agent") {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [], delay: 0 };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;

    if ((key === "allow" || key === "disallow") && value) {
      current.rules.push({
        allow: key === "allow",
        len: value.length,
        re: patternToRegex(value),
      });
    } else if (key === "crawl-delay") {
      current.delay = Math.min(30, Number(value) || 0);
    }
  }

  const specific = groups.filter((g) =>
    g.agents.some((a) => a !== "*" && a && ROBOTS_TOKEN.includes(a))
  );
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes("*"));

  return {
    rules: chosen.flatMap((g) => g.rules),
    delay: Math.max(0, ...chosen.map((g) => g.delay)),
  };
}

function robotsAllows(robots, pathAndQuery) {
  if (robots.blockAll) return false;
  let best = null;
  for (const rule of robots.rules) {
    if (!rule.re.test(pathAndQuery)) continue;
    if (!best || rule.len > best.len || (rule.len === best.len && rule.allow)) best = rule;
  }
  return best ? best.allow : true;
}

const robotsCache = new Map(); // origin -> { at, rules, delay, blockAll }

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getRobots(origin) {
  const hit = robotsCache.get(origin);
  if (hit && Date.now() - hit.at < 60 * 60 * 1000) return hit;

  let entry;
  try {
    const res = await fetchWithTimeout(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.status === 404 || res.status === 410) {
      entry = { rules: [], delay: 0 }; // no robots.txt = allowed
    } else if (!res.ok) {
      entry = { rules: [], delay: 0, blockAll: true }; // 401/403/5xx: don't crawl
    } else {
      entry = parseRobots(await res.text());
    }
  } catch {
    entry = { rules: [], delay: 0, blockAll: true }; // unreachable: don't crawl
  }
  entry.at = Date.now();
  robotsCache.set(origin, entry);
  return entry;
}

// --------------------------------------------------
// Polite fetching: allow-listed hosts, robots.txt, per-host spacing
// --------------------------------------------------

const hostQueue = new Map(); // host -> promise chain
const lastHit = new Map(); // host -> timestamp

function waitTurn(host, delayMs) {
  const previous = hostQueue.get(host) || Promise.resolve();
  const turn = previous.then(async () => {
    const wait = (lastHit.get(host) || 0) + delayMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastHit.set(host, Date.now());
  });
  hostQueue.set(host, turn.catch(() => {}));
  return turn;
}

async function politeGet(url) {
  const u = new URL(url);
  if (u.protocol !== "https:" || !ALLOWED_HOSTS.has(u.hostname)) {
    throw new Error(`Host not allowed: ${u.hostname}`);
  }

  const robots = await getRobots(u.origin);
  if (!robotsAllows(robots, u.pathname + u.search)) {
    const error = new Error("Disallowed by robots.txt");
    error.code = "ROBOTS";
    throw error;
  }

  await waitTurn(u.hostname, Math.max(MIN_DELAY_MS, robots.delay * 1000));

  const res = await fetchWithTimeout(url, {
    redirect: "follow",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-IN,en;q=0.9",
    },
  });

  // A redirect must not take us to a host we didn't allow
  if (res.url && !ALLOWED_HOSTS.has(new URL(res.url).hostname)) {
    throw new Error(`Redirected to a host that is not allowed: ${new URL(res.url).hostname}`);
  }
  if (!res.ok) {
    const error = new Error(`HTTP ${res.status} for ${u.pathname}`);
    error.status = res.status;
    throw error;
  }

  const html = await res.text();
  return html.length > MAX_HTML_BYTES ? html.slice(0, MAX_HTML_BYTES) : html;
}

// --------------------------------------------------
// Extraction: links + schema.org Event JSON-LD
// --------------------------------------------------

function extractLinks(html, baseUrl) {
  const out = new Set();
  const re = /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1/gis;
  let m;
  while ((m = re.exec(html))) {
    try {
      const abs = new URL(decodeEntities(m[2]), baseUrl);
      if (abs.protocol === "https:") out.add(abs.href);
    } catch {
      /* ignore bad hrefs */
    }
  }
  return [...out];
}

const isEventType = (type) =>
  (Array.isArray(type) ? type : [type]).some(
    (t) => typeof t === "string" && /^(https?:\/\/schema\.org\/)?[A-Za-z]*Event$/.test(t)
  );

function collectEvents(node, out, depth = 0) {
  if (!node || typeof node !== "object" || depth > 8) return;
  if (!Array.isArray(node) && isEventType(node["@type"]) && str(node.name)) out.push(node);
  for (const [key, value] of Object.entries(node)) {
    if (value && typeof value === "object" && !["location", "organizer", "offers"].includes(key)) {
      collectEvents(value, out, depth + 1);
    }
  }
}

function extractLdEvents(html) {
  const found = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const raw = m[1].trim();
    const data = tryParse(raw) ?? tryParse(decodeEntities(raw));
    if (data) collectEvents(data, found);
  }

  const seen = new Set();
  return found.filter((ev) => {
    const key = `${String(ev.name).toLowerCase().trim()}|${String(ev.startDate || "").slice(0, 16)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// --------------------------------------------------
// Normalization -> the card shape the frontend already uses
// --------------------------------------------------

// ISO string -> { date: "YYYY-MM-DD", time: "6:30 PM" } in India time.
// A timestamp with no zone is treated as India time.
function toIST(raw) {
  const s = str(raw);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return { date: s, time: "" };

  const d = new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(s) ? s : `${s}+05:30`);
  if (Number.isNaN(d.getTime())) return null;

  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((part) => [part.type, part.value])
  );
  const hour = Number(p.hour);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${hour % 12 || 12}:${p.minute} ${hour >= 12 ? "PM" : "AM"}`,
  };
}

function categorize(title, description, fallback) {
  const text = `${title} ${description}`.toLowerCase();
  if (/hackathon/.test(text)) return "Hackathon";
  if (/webinar|online session/.test(text)) return "Webinar";
  if (/expo|exhibition|trade show/.test(text)) return "Expo";
  if (/conference|summit|convention/.test(text)) return "Conference";
  if (/workshop|hands.on|bootcamp/.test(text)) return "Workshops";
  if (/startup|entrepreneur|business|founder/.test(text)) return "Business";
  if (/meet.?up|networking/.test(text)) return "Meetups";
  return fallback;
}

function firstOf(v) {
  return Array.isArray(v) ? v[0] : v;
}

function imageUrl(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = imageUrl(item);
      if (result) return result;
    }
    return "";
  }
  if (typeof value === "string") {
    const candidate = value.trim();
    if (/^https?:\/\//i.test(candidate)) return candidate;
    if (candidate.startsWith("//")) return `https:${candidate}`;
    return "";
  }
  if (value && typeof value === "object") {
    return imageUrl(value.url || value.contentUrl || value.thumbnailUrl || value.thumbnail || value.src || value.image);
  }
  return "";
}

function attributeValue(tag, name) {
  const match = String(tag).match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? decodeEntities(match[2]).trim() : "";
}

function openGraphImage(html, baseUrl) {
  const tags = String(html).match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const property = attributeValue(tag, 'property').toLowerCase();
    const name = attributeValue(tag, 'name').toLowerCase();
    if (property !== 'og:image' && name !== 'twitter:image') continue;
    const value = attributeValue(tag, 'content');
    if (!value) continue;
    try { return new URL(value, baseUrl).href; }
    catch { /* Ignore malformed provider metadata. */ }
  }
  return "";
}

function formatAddress(address) {
  if (typeof address === "string") return address.trim();
  if (!address || typeof address !== "object") return "";
  return [address.streetAddress, address.addressLocality, address.addressRegion]
    .map(str)
    .filter(Boolean)
    .join(", ");
}

function countryOf(address) {
  if (!address || typeof address !== "object") return "";
  const c = address.addressCountry;
  return (typeof c === "string" ? c : c?.name || "").trim();
}

function priceOf(offers) {
  const o = firstOf(offers);
  if (!o || typeof o !== "object") return "";
  const price = Number(o.price);
  if (o.price === 0 || o.price === "0" || price === 0) return "Free";
  if (!Number.isFinite(price) || price <= 0) return "";
  const cur = String(o.priceCurrency || "").toUpperCase();
  return cur === "INR" || !cur ? `₹${price}` : `${cur} ${price}`;
}

function normalizeEvent(ev, pageUrl, source, fallbackImage = "") {
  if (/cancel|postpone/i.test(String(ev.eventStatus || ""))) return null;

  const start = toIST(ev.startDate);
  if (!start) return null; // no usable date -> not an event we can place

  // Skip events that are already over
  const last = toIST(ev.endDate)?.date || start.date;
  if (dayDiff(todayIST(), last) < 0) return null;

  const loc = firstOf(ev.location);
  const locObj = loc && typeof loc === "object" ? loc : typeof loc === "string" ? { address: loc } : {};
  const mode = String(ev.eventAttendanceMode || "");
  const online = /OnlineEventAttendanceMode$/.test(mode) || /VirtualLocation/i.test(String(locObj["@type"] || ""));

  // India only for in-person events
  const country = countryOf(locObj.address);
  if (!online && country && !/^(IN|IND|India)$/i.test(country)) return null;

  const venueName = str(locObj.name);
  const address = formatAddress(locObj.address);
  const venue = online
    ? "Online"
    : [...new Set([venueName, address].filter(Boolean))].join(", ") || "Venue to be announced";

  let url = pageUrl;
  const own = str(ev.url);
  if (own) {
    try {
      url = new URL(own, pageUrl).href;
    } catch {
      /* keep pageUrl */
    }
  }

  const image = imageUrl(ev.image) || fallbackImage;

  const title = stripTags(ev.name);
  const description = stripTags(ev.description || "").slice(0, 600);
  const organizerRaw = firstOf(ev.organizer);
  const organizer = typeof organizerRaw === "string" ? organizerRaw : str(organizerRaw?.name) || "";

  return {
    id: `web-${sha(`${url}|${title}|${start.date}`)}`,
    title,
    date: start.date,
    time: start.time,
    mode: online ? "Online" : "Offline",
    venue,
    location: venue,
    description,
    image,
    category: categorize(title, description, source.defaultCategory),
    organizer,
    price: priceOf(ev.offers),
    url,
    link: url,
    sourceName: source.name,
    scraped: true,
    registeredCount: 0,
  };
}

function dedupe(events) {
  const seen = new Map();
  const result = [];
  for (const event of events) {
    const e = event;
    const key = `${e.url}|${e.title.toLowerCase()}|${e.date}`;
    const previous = seen.get(key);
    if (previous === undefined) {
      seen.set(key, result.length);
      result.push(e);
    } else if (!result[previous].image && e.image) {
      result[previous] = e;
    }
  }
  return result;
}

const byDate = (a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);

// --------------------------------------------------
// Crawl one source for one city
// --------------------------------------------------

async function crawlSource(source, slug) {
  const listingUrl = source.listing(slug);

  let html;
  try {
    html = await politeGet(listingUrl);
  } catch (error) {
    if (error.status === 404) return { missing: true, events: [] }; // no page for this city
    throw error;
  }

  const eventUrls = new Set();
  const addIfEvent = (href) => {
    const clean = String(href).split(/[?#]/)[0];
    if (source.eventPattern.test(clean)) eventUrls.add(clean);
  };

  extractLinks(html, listingUrl).forEach(addIfEvent);

  // Listing pages can carry full Event data (and event URLs) in JSON-LD too
  const listingEvents = extractLdEvents(html);
  for (const ev of listingEvents) {
    if (str(ev.url)) {
      try {
        addIfEvent(new URL(ev.url, listingUrl).href);
      } catch {
        /* ignore */
      }
    }
  }

  const events = listingEvents
    .map((ev) => normalizeEvent(ev, listingUrl, source, openGraphImage(html, listingUrl)))
    .filter(Boolean);

  for (const url of [...eventUrls].slice(0, MAX_EVENT_PAGES)) {
    try {
      const page = await politeGet(url);
      const fallbackImage = openGraphImage(page, url);
      for (const ev of extractLdEvents(page)) {
        const normalized = normalizeEvent(ev, url, source, fallbackImage);
        if (normalized) events.push(normalized);
      }
    } catch (error) {
      if (error.code !== "ROBOTS") {
        console.warn(`[happenings] ${source.id} page failed (${url}): ${error.message}`);
      }
    }
  }

  return { missing: false, events: dedupe(events) };
}

// --------------------------------------------------
// City refresh + cache (memory, with a copy on disk for restarts)
// --------------------------------------------------

const store = new Map(); // slug -> { at, slug, missing, events }
const inflight = new Map(); // slug -> Promise
const lastAttempt = new Map(); // slug -> timestamp
const CACHE_VERSION = 2;

const cacheFile = (slug) => path.join(CACHE_DIR, `events-${slug}.json`);

async function loadFromDisk(slug) {
  try {
    const entry = JSON.parse(await fs.readFile(cacheFile(slug), "utf8"));
    if (entry && Array.isArray(entry.events)) {
      store.set(slug, entry);
      return entry;
    }
  } catch {
    /* no cache yet */
  }
  return null;
}

async function saveToDisk(entry) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cacheFile(entry.slug), JSON.stringify(entry));
  } catch {
    /* disk may be read-only; memory cache still works */
  }
}

function refresh(slug) {
  if (inflight.has(slug)) return inflight.get(slug);
  lastAttempt.set(slug, Date.now());

  const job = (async () => {
    const events = [];
    const errors = [];
    let anyPage = false;

    for (const source of SOURCES.filter((s) => s.enabled)) {
      try {
        const result = await crawlSource(source, slug);
        if (!result.missing) anyPage = true;
        events.push(...result.events);
      } catch (error) {
        errors.push(`${source.id}: ${error.message}`);
      }
    }

    // Every source failed: report it instead of caching an empty list
    if (!events.length && !anyPage && errors.length) throw new Error(errors.join("; "));
    if (errors.length) console.warn(`[happenings] ${slug} partial: ${errors.join("; ")}`);

    const entry = {
      at: Date.now(),
      slug,
      version: CACHE_VERSION,
      missing: !anyPage,
      events: dedupe(events).sort(byDate),
    };
    store.set(slug, entry);
    await saveToDisk(entry);
    return entry;
  })().finally(() => inflight.delete(slug));

  inflight.set(slug, job);
  return job;
}

// Serve from cache; refresh in the background when stale. Only the very first
// request for a city (no cache anywhere) waits for the crawl.
async function getCity(slug) {
  let entry = store.get(slug) || (await loadFromDisk(slug));

  const stale = !entry || entry.version !== CACHE_VERSION || Date.now() - entry.at > REFRESH_MS;
  const canTry = Date.now() - (lastAttempt.get(slug) || 0) > RETRY_MS;
  const shouldVerifyEmpty = Boolean(entry && entry.events.length === 0 && canTry);

  if ((stale && (canTry || !entry)) || shouldVerifyEmpty) {
    const job = refresh(slug);
    // Never silently treat an old empty cache as a successful online search.
    // Waiting here lets the route report a blocked/unavailable source correctly.
    if (!entry || entry.events.length === 0) entry = await job;
    else job.catch((e) => console.warn(`[happenings] background refresh ${slug} failed: ${e.message}`));
  }
  return entry;
}

export function warmHappenings() {
  const run = async () => {
    for (const slug of WARM_CITIES) {
      try {
        const entry = await getCity(slug);
        if (Date.now() - entry.at > REFRESH_MS) await refresh(slug);
      } catch (error) {
        console.warn(`[happenings] warm-up ${slug} failed: ${error.message}`);
      }
    }
  };
  setTimeout(run, 3000).unref?.();
  setInterval(run, REFRESH_MS).unref?.();
}

// --------------------------------------------------
// Route: GET /api/happenings/search?district=Tiruppur&state=Tamil%20Nadu
// --------------------------------------------------

router.get("/search", async (req, res) => {
  const district = String(req.query.district || "").trim().slice(0, 80);
  if (!district) return res.status(400).json({ error: "Choose a district to search." });
  // Nationwide happenings are published by Hapzo360 users and returned by the
  // main events route. Third-party crawlers are city based, so do not invent a
  // misleading city result for the explicit All India selection.
  if (district.toLowerCase() === 'all india') {
    return res.json({ events: [], available: true, district: 'All India', nationwide: true, sources: [] });
  }
  if (!SOURCES.some((s) => s.enabled)) {
    return res.status(503).json({ events: [], available: false, error: "No event source is enabled." });
  }

  const own = slugify(district);
  const candidates = [...new Set([own, HUB_FOR[own]].filter(Boolean))];

  let chosen = null;
  let entry = null;
  let lastError = null;

  for (const slug of candidates) {
    try {
      const result = await getCity(slug);
      if (!entry) entry = result;
      if (result.events.length) {
        chosen = slug;
        entry = result;
        break;
      }
    } catch (error) {
      lastError = error;
      console.error(`[happenings] ${slug} failed: ${error.message}`);
    }
  }

  if (!entry) {
    return res.status(502).json({
      events: [],
      available: false,
      error: "Could not retrieve online event listings.",
      detail: lastError?.message,
    });
  }

  const usedSlug = chosen || candidates[0];
  res.set("Cache-Control", "public, max-age=300");
  res.json({
    events: entry.events,
    available: true,
    district,
    city: usedSlug,
    nearby: usedSlug !== own,
    updatedAt: new Date(entry.at).toISOString(),
    sources: SOURCES.filter((s) => s.enabled).map((s) => s.name),
  });
});

export default router;

// Exposed for tests
export const __test = {
  parseRobots, robotsAllows, extractLdEvents, extractLinks, normalizeEvent, toIST,
  crawlSource, SOURCES, slugify,
};
