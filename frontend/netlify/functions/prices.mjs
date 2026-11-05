const STATE = 'Tamil Nadu';
const TTL_MS = 60 * 60 * 1000;
const MAX_LIMIT = 500;
const TIMEOUT_MS = 15000;
const cache = new Map();

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return null;
}

function normalizeCategory(name) {
  const value = String(name || '').toLowerCase();
  if (/vegetable|tomato|onion|potato|brinjal|ladies.?finger|cabbage|carrot|chilli|beans|drumstick|cucumber|pumpkin|gourd|leafy/.test(value)) {
    return 'vegetables';
  }
  if (/fruit|mango|banana|grapes|apple|orange|papaya|watermelon|guava|lemon/.test(value)) {
    return 'fruits';
  }
  return 'agriculture';
}

function normalizeCommodity(record, index) {
  const name = firstValue(record, ['commodity', 'Commodity', 'commodity_name', 'Commodity Name']);
  const market = firstValue(record, ['market', 'Market', 'market_name', 'Market Name']);
  const district = firstValue(record, ['district', 'District', 'district_name']);
  const state = firstValue(record, ['state', 'State', 'state_name']);
  const minPrice = toNumber(firstValue(record, ['min_price', 'Min Price', 'minimum_price']));
  const maxPrice = toNumber(firstValue(record, ['max_price', 'Max Price', 'maximum_price']));
  const modalPrice = toNumber(firstValue(record, ['modal_price', 'Modal Price', 'modalPrice']));
  const marketDate = firstValue(record, ['arrival_date', 'Arrival Date', 'date', 'Date']);

  if (!name || modalPrice === null || !state) return null;

  return {
    id: `agmarknet-${index}-${name}-${marketDate || ''}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
    name: String(name),
    category: normalizeCategory(name),
    priceType: 'wholesale',
    location: String(state),
    district: district ? String(district) : null,
    market: market ? String(market) : null,
    minPrice: minPrice !== null ? Number((minPrice / 100).toFixed(2)) : null,
    maxPrice: maxPrice !== null ? Number((maxPrice / 100).toFixed(2)) : null,
    modalPrice: Number((modalPrice / 100).toFixed(2)),
    unit: 'kg',
    currency: 'INR',
    source: 'AGMARKNET / data.gov.in',
    sourceUrl: 'https://www.data.gov.in/catalog/current-daily-price-various-commodities-various-markets-mandi',
    marketDate: marketDate ? String(marketDate) : null,
    updatedAt: new Date().toISOString(),
    previousModalPrice: null,
  };
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    const code = error?.cause?.code || error?.code;
    const detail = controller.signal.aborted
      ? `Upstream request timed out after ${TIMEOUT_MS}ms`
      : code ? `${error.message} (${code})` : error.message;
    throw new Error(detail || 'Upstream request failed', { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

async function cached(key, fetcher) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return { data: hit.data, stale: false };
  }
  try {
    const data = await fetcher();
    cache.set(key, { at: Date.now(), data });
    return { data, stale: false };
  } catch (error) {
    if (hit) return { data: hit.data, stale: true, warning: error.message };
    throw error;
  }
}

async function fetchAgriculturalPrices() {
  const apiKey = process.env.VITE_DATA_GOV_IN_API_KEY;
  const resourceId = process.env.VITE_AGMARKNET_RESOURCE_ID;
  if (!apiKey || !resourceId) {
    throw new Error('Missing VITE_DATA_GOV_IN_API_KEY or AGMARKNET_RESOURCE_ID in Netlify environment');
  }

  const params = new URLSearchParams({
    'api-key': apiKey,
    format: 'json',
    limit: String(MAX_LIMIT),
    offset: '0',
    'filters[state]': STATE,
  });
  const url = `https://api.data.gov.in/resource/${encodeURIComponent(resourceId.trim())}?${params}`;
  const body = await fetchJson(url);
  if (!Array.isArray(body.records)) {
    throw new Error(`data.gov.in: ${body.message || body.error || 'unexpected response'}`);
  }

  const items = body.records
    .map(normalizeCommodity)
    .filter(Boolean)
    .filter((item) => item.location.toLowerCase() === STATE.toLowerCase());
  if (!items.length) throw new Error('No usable price records returned by data.gov.in');
  return items;
}

function normalizeYarn(record, index) {
  const name = firstValue(record, ['name', 'product', 'commodity', 'yarn']);
  const modalPrice = toNumber(firstValue(record, ['modalPrice', 'modal_price', 'price']));
  if (!name || modalPrice === null) return null;
  return {
    id: String(record.id || `yarn-${index}-${name}`).replace(/[^a-zA-Z0-9_-]/g, '-'),
    name: String(name),
    category: 'yarn',
    priceType: String(record.priceType || 'wholesale').toLowerCase() === 'retail' ? 'retail' : 'wholesale',
    location: String(record.location || STATE),
    district: record.district || null,
    market: record.market || null,
    minPrice: toNumber(record.minPrice ?? record.min_price),
    maxPrice: toNumber(record.maxPrice ?? record.max_price),
    modalPrice,
    unit: String(record.unit || 'kg'),
    currency: String(record.currency || 'INR'),
    source: String(record.source || 'Yarn price provider'),
    sourceUrl: record.sourceUrl || record.source_url || process.env.YARN_PRICES_URL || null,
    marketDate: record.marketDate || record.market_date || record.date || null,
    updatedAt: record.updatedAt || record.updated_at || new Date().toISOString(),
    previousModalPrice: toNumber(record.previousModalPrice ?? record.previous_modal_price),
    yarnCount: record.yarnCount || record.yarn_count || null,
    yarnType: record.yarnType || record.yarn_type || null,
  };
}

async function fetchYarnPrices() {
  const url = process.env.YARN_PRICES_URL;
  if (!url) return [];
  const headers = process.env.YARN_PRICES_API_KEY
    ? { Authorization: `Bearer ${process.env.YARN_PRICES_API_KEY}` }
    : {};
  const body = await fetchJson(url, headers);
  const records = Array.isArray(body) ? body : body.items || body.records || body.data || [];
  if (!Array.isArray(records)) throw new Error('Invalid yarn provider response');
  return records.map(normalizeYarn).filter(Boolean);
}

function matchesSearch(item, query) {
  if (!query) return true;
  return [item.name, item.category, item.location, item.district, item.market, item.yarnType, item.yarnCount]
    .filter(Boolean).join(' ').toLowerCase().includes(query.toLowerCase());
}

function matchesLocation(item, location) {
  if (!location || location.toLowerCase() === 'all tamil nadu') return true;
  return [item.location, item.district, item.market]
    .filter(Boolean).some((value) => value.toLowerCase().includes(location.toLowerCase()));
}

export default async (request) => {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, { Allow: 'GET' });

  const params = new URL(request.url).searchParams;
  const category = String(params.get('category') || 'all').toLowerCase();
  const priceType = String(params.get('priceType') || 'all').toLowerCase();
  const location = String(params.get('location') || 'All Tamil Nadu').trim();
  const query = String(params.get('q') || params.get('search') || '').trim();
  const limit = Math.min(Math.max(Number.parseInt(params.get('limit'), 10) || 200, 1), MAX_LIMIT);

  if (!['all', 'vegetables', 'fruits', 'yarn', 'agriculture'].includes(category)) {
    return json({ error: 'Unknown category' }, 400);
  }
  if (!['all', 'wholesale', 'retail'].includes(priceType)) {
    return json({ error: 'priceType must be all, wholesale, or retail' }, 400);
  }

  const results = await Promise.allSettled([
    cached('agmarknet', fetchAgriculturalPrices),
    cached('yarn', fetchYarnPrices),
  ]);
  const providers = results.map((result, index) => ({
    id: index === 0 ? 'agmarknet' : 'yarn',
    ok: result.status === 'fulfilled' && result.value.data.length > 0,
    error: result.status === 'rejected'
      ? result.reason?.message || 'Provider request failed'
      : result.value.warning || (result.value.data.length ? undefined : 'No records returned'),
    count: result.status === 'fulfilled' ? result.value.data.length : 0,
  }));
  const successful = results.filter((result) => result.status === 'fulfilled').map((result) => result.value);
  const hasPriceData = successful.some((result) => result.data.length > 0);

  if (!hasPriceData) {
    return json({
      error: 'No price providers returned data',
      message: 'The price source is unavailable. Check the provider configuration and try again.',
      sources: providers,
    }, 502);
  }

  const items = successful.flatMap((result) => result.data)
    .filter((item) => category === 'all' || item.category === category)
    .filter((item) => priceType === 'all' || item.priceType === priceType)
    .filter((item) => matchesLocation(item, location))
    .filter((item) => matchesSearch(item, query))
    .sort((a, b) => {
      const dateA = a.marketDate ? new Date(a.marketDate).getTime() || 0 : 0;
      const dateB = b.marketDate ? new Date(b.marketDate).getTime() || 0 : 0;
      return dateB - dateA || a.name.localeCompare(b.name);
    })
    .slice(0, limit);

  return json({
    items,
    updatedAt: new Date().toISOString(),
    stale: successful.some((result) => result.stale),
    sources: providers,
    meta: {
      category,
      priceType,
      location,
      count: items.length,
      cacheTtlMs: TTL_MS,
      note: 'AGMARKNET records are wholesale mandi prices, generally quoted per quintal. Yarn prices require a configured provider.',
    },
  }, 200, { 'Cache-Control': 'public, max-age=300' });
};
