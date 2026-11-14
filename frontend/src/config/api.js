
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const normalizedConfiguredBaseUrl = configuredBaseUrl
  ? (/^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`)
  : '';
// The production API runs behind the Hostinger VPS reverse proxy. Keep a
// configurable VITE_API_BASE_URL for future custom API domains, but never
// silently fall back to the retired Render service.
const productionFallbackUrl = 'https://srv2149512.hstgr.cloud';

// Netlify build variables override .env files. Ignore masked placeholders and
// use the app's production API if the configured value is missing or masked.
const hasPlaceholderHost = configuredBaseUrl.includes('*');
const API_BASE_URL = normalizedConfiguredBaseUrl && !hasPlaceholderHost
  ? normalizedConfiguredBaseUrl
  : (import.meta.env.PROD ? productionFallbackUrl : '');

export default API_BASE_URL;
