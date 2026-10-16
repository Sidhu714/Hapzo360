// Fetches Tamil Nadu mandi prices straight from data.gov.in in the visitor's browser,
// so the request comes from the visitor's own (Indian) connection instead of a server.
// Returns the same { items, updatedAt } shape as the old /api/prices endpoint.
const KEY = import.meta.env.VITE_DATA_GOV_IN_API_KEY;
const RESOURCE_ID =
  import.meta.env.VITE_AGMARKNET_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070';
const STATE = 'Tamil Nadu';
const CACHE_KEY = 'hapzo.mandi_cache';
const TTL_MS = 30 * 60 * 1000;

const num = (v) => {
  const n = Number(String(v ?? '').replace(/,/g, '').trim());
  return v !== '' && v != null && Number.isFinite(n) ? n : null;
};
const first = (r, keys) => keys.map((k) => r?.[k]).find((v) => v != null && String(v).trim() !== '') ?? null;

function categoryOf(name) {
  const v = String(name || '').toLowerCase();
  if (/vegetable|tomato|onion|potato|brinjal|ladies.?finger|cabbage|carrot|chilli|beans|drumstick|cucumber|pumpkin|gourd|leafy/.test(v)) return 'vegetables';
  if (/fruit|mango|banana|grapes|apple|orange|papaya|watermelon|guava|lemon/.test(v)) return 'fruits';
  return 'agriculture';
}

// data.gov.in sends dd/mm/yyyy; the rest of the app expects a normal date string
const isoDate = (d) => {
  const m = String(d || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : (d ? String(d) : null);
};

function normalize(r, i) {
  const name = first(r, ['commodity', 'Commodity']);
  const state = first(r, ['state', 'State']);
  const modal = num(first(r, ['modal_price', 'Modal_x0020_Price', 'Modal Price']));
  if (!name || !state || modal === null) return null;
  const min = num(first(r, ['min_price', 'Min_x0020_Price', 'Min Price']));
  const max = num(first(r, ['max_price', 'Max_x0020_Price', 'Max Price']));
  const date = first(r, ['arrival_date', 'Arrival_Date', 'Arrival Date']);
  const perKg = (x) => (x === null ? null : Number((x / 100).toFixed(2))); // quintal -> kg
  return {
    id: `agmarknet-${i}-${name}-${date || ''}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    name: String(name),
    category: categoryOf(name),
    priceType: 'wholesale',
    location: String(state),
    district: first(r, ['district', 'District']),
    market: first(r, ['market', 'Market']),
    minPrice: perKg(min),
    maxPrice: perKg(max),
    modalPrice: perKg(modal),
    unit: 'kg',
    currency: 'INR',
    source: 'AGMARKNET / data.gov.in',
    sourceUrl: 'https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi',
    marketDate: isoDate(date),
    updatedAt: new Date().toISOString(),
    previousModalPrice: null,
  };
}

const PAGE = 500;
const MAX_PAGES = 30;

async function fetchPage(offset, signal) {
  const params = new URLSearchParams({
    'api-key': KEY, format: 'json', limit: String(PAGE), offset: String(offset), 'filters[state]': STATE,
  });
  const res = await fetch(`https://api.data.gov.in/resource/${RESOURCE_ID}?${params}`, { signal });
  if (!res.ok) throw new Error(`Price source returned HTTP ${res.status}.`);
  const body = await res.json();
  if (!Array.isArray(body.records)) {
    throw new Error(`Price source error: ${body.message || body.error || 'unexpected response'}`);
  }
  return body;
}

// Keep only the fields we use, so the cached copy stays small (a few thousand rows)
const slim = (r) => ({
  state: r.state, district: r.district, market: r.market, commodity: r.commodity,
  arrival_date: r.arrival_date, min_price: r.min_price, max_price: r.max_price, modal_price: r.modal_price,
});

async function loadAll(signal) {
  try {
    const hit = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (hit && Date.now() - hit.at < TTL_MS) return { at: hit.at, items: hit.rows.map(normalize).filter(Boolean) };
  } catch { /* ignore broken cache */ }

  if (!KEY) throw new Error('Missing VITE_DATA_GOV_IN_API_KEY in the frontend .env file.');

  // Tamil Nadu has thousands of rows a day, so read every page, not just the first 500
  const first = await fetchPage(0, signal);
  const rows = [...first.records];
  const step = first.records.length || PAGE;
  const total = Number(first.total) || rows.length;
  const offsets = [];
  for (let o = step; o < total && offsets.length < MAX_PAGES; o += step) offsets.push(o);
  for (let i = 0; i < offsets.length; i += 4) { // 4 at a time, to stay within rate limits
    const pages = await Promise.all(offsets.slice(i, i + 4).map((o) => fetchPage(o, signal)));
    pages.forEach((p) => rows.push(...p.records));
  }

  const slimRows = rows.map(slim);
  const items = slimRows.map(normalize).filter(Boolean);
  if (!items.length) throw new Error('No Tamil Nadu price records were published today.');
  const out = { at: Date.now() };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ...out, rows: slimRows })); } catch { /* storage full */ }
  return { ...out, items };
}

export async function getPrices({ category = 'all', location = 'All Tamil Nadu', search = '', signal } = {}) {
  const { at, items } = await loadAll(signal);
  const loc = location.toLowerCase();
  const term = search.trim().toLowerCase();
  return {
    items: items.filter((i) =>
      (category === 'all' || i.category === category) &&
      (loc === 'all tamil nadu' || [i.location, i.district, i.market].filter(Boolean).some((v) => v.toLowerCase().includes(loc))) &&
      (!term || [i.name, i.category, i.district, i.market].filter(Boolean).join(' ').toLowerCase().includes(term))),
    updatedAt: new Date(at).toISOString(),
  };
}