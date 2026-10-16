// localStorage helpers. Only the openings API (and translate cache) use this.
// When you add a backend, these go away along with the localStorage-based API functions.
const P = 'hapzo.';
export const read = (k, fallback) => {
  try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
};
export const write = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
export const remove = (k) => localStorage.removeItem(P + k);
export const uid = () => crypto.randomUUID();
export const delay = (ms = 300) => new Promise((r) => setTimeout(r, ms));
