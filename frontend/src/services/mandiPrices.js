import API_BASE_URL from '../config/api';

const PRICES_URL = `${API_BASE_URL}/api/prices`;

export async function getPrices({ category = 'all', location = 'All Tamil Nadu', search = '', signal } = {}) {
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