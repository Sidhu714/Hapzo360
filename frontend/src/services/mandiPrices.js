import API_BASE_URL from '../config/api';

// In production Netlify rewrites this path to its server-side function. During
// local development, keep using the configured API proxy/backend.
const PRICES_URL = import.meta.env.PROD
  ? '/api/prices'
  : `${API_BASE_URL}/api/prices`;
const DATA_GOV_API_KEY = import.meta.env.VITE_DATA_GOV_IN_API_KEY?.trim();
const AGMARKNET_RESOURCE_ID = import.meta.env.VITE_AGMARKNET_RESOURCE_ID?.trim();

function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(String(value).replace(/,/g, '').trim());
  return Number.isFinite(number) ? number : null;
}

function firstValue(record, keys) {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function normalizeCategory(name) {
  const value = String(name || '').toLowerCase();
  if (/vegetable|tomato|onion|potato|brinjal|ladies.?finger|cabbage|carrot|chilli|beans|drumstick|cucumber|pumpkin|gourd|leafy/.test(value)) return 'vegetables';
  if (/fruit|mango|banana|grapes|apple|orange|papaya|watermelon|guava|lemon/.test(value)) return 'fruits';
  return 'agriculture';
}

function normalizeCommodity(record, index) {
  const name = firstValue(record, ['commodity', 'Commodity', 'commodity_name', 'Commodity Name']);
  const state = firstValue(record, ['state', 'State', 'state_name']);
  const modalPrice = toNumber(firstValue(record, ['modal_price', 'Modal Price', 'modalPrice']));
  if (!name || !state || modalPrice === null) return null;

  const marketDate = firstValue(record, ['arrival_date', 'Arrival Date', 'date', 'Date']);
  const minPrice = toNumber(firstValue(record, ['min_price', 'Min Price', 'minimum_price']));
  const maxPrice = toNumber(firstValue(record, ['max_price', 'Max Price', 'maximum_price']));
  const district = firstValue(record, ['district', 'District', 'district_name']);
  const market = firstValue(record, ['market', 'Market', 'market_name', 'Market Name']);

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

async function getDirectDataGovPrices({ category, location, search, signal }) {
  
  console.log('key len:', DATA_GOV_API_KEY?.length,
  'start:', DATA_GOV_API_KEY?.slice(0, 4),
  'end:', DATA_GOV_API_KEY?.slice(-4));
console.log('resource len:', AGMARKNET_RESOURCE_ID?.length,
  'start:', AGMARKNET_RESOURCE_ID?.slice(0, 4));

  const params = new URLSearchParams({
    'api-key': DATA_GOV_API_KEY,
    format: 'json',
    limit: '500',
    offset: '0',
    'filters[state]': 'Tamil Nadu',
  });
  const url = `https://api.data.gov.in/resource/${encodeURIComponent(AGMARKNET_RESOURCE_ID)}?${params}`;
  const response = await fetch(url, { signal });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || `AGMARKNET returned HTTP ${response.status}.`);
  }
  if (!Array.isArray(body.records)) {
    throw new Error(body.message || body.error || 'AGMARKNET returned an unexpected response.');
  }

  const query = search.trim().toLowerCase();
  const wantedLocation = location.trim().toLowerCase();
  const items = body.records.map(normalizeCommodity).filter(Boolean)
    .filter((item) => item.location.toLowerCase() === 'tamil nadu')
    .filter((item) => category === 'all' || item.category === category)
    .filter((item) => !wantedLocation || wantedLocation === 'all tamil nadu' || [item.location, item.district, item.market].filter(Boolean).some((value) => value.toLowerCase().includes(wantedLocation)))
    .filter((item) => !query || [item.name, item.category, item.location, item.district, item.market].filter(Boolean).join(' ').toLowerCase().includes(query))
    .sort((a, b) => {
      const dateA = a.marketDate ? new Date(a.marketDate).getTime() || 0 : 0;
      const dateB = b.marketDate ? new Date(b.marketDate).getTime() || 0 : 0;
      return dateB - dateA || a.name.localeCompare(b.name);
    });

  return { items, updatedAt: new Date().toISOString() };
}

export async function getPrices({ category = 'all', location = 'All Tamil Nadu', search = '', signal } = {}) {
  // Temporary browser-side testing path. VITE_ variables are public in the
  // production bundle; remove them after testing and return to the function.
  if (DATA_GOV_API_KEY && AGMARKNET_RESOURCE_ID && category !== 'yarn') {
    return getDirectDataGovPrices({ category, location, search, signal });
  }

  const params = new URLSearchParams({
    category,
    location,
    q: search,
    priceType: 'all',
    limit: '500',
  });

  const response = await fetch(`${PRICES_URL}?${params}`, { signal });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || `Price service returned HTTP ${response.status}.`);
  }

  if (!Array.isArray(data.items)) {
    throw new Error('The price service response must contain an items array.');
  }

  return {
    items: data.items,
    updatedAt: data.updatedAt ?? null,
  };
}
