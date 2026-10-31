
const configuredBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const normalizedConfiguredBaseUrl = configuredBaseUrl
  ? (/^https?:\/\//i.test(configuredBaseUrl) ? configuredBaseUrl : `https://${configuredBaseUrl}`)
  : '';
const productionFallbackUrl = 'https://hapzo360.onrender.com';

// Netlify build variables override .env files. Ignore masked placeholders and
// use the app's production API if the configured value is missing or masked.
const hasPlaceholderHost = configuredBaseUrl.includes('*');
const API_BASE_URL = normalizedConfiguredBaseUrl && !hasPlaceholderHost
  ? normalizedConfiguredBaseUrl
  : (import.meta.env.PROD ? productionFallbackUrl : '');

export default API_BASE_URL;
