import API_BASE_URL from '../config/api';

async function request(path, options = {}, unwrap = true) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/people${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch { throw new Error('The Hapzo360 backend is unavailable.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The Hapzo360 API did not return data.');
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return unwrap ? data.person : data;
}

export const sendPersonEmailCode = (email, phone) => request('/email-code', { method: 'POST', body: JSON.stringify({ email, phone }) });
export const registerPerson = (name, phone, email, code) => request('/register', { method: 'POST', body: JSON.stringify({ name, phone, email, code }) });
export const loginPerson = (phone) => request('/login', { method: 'POST', body: JSON.stringify({ phone }) });
export const googlePerson = (idToken, phone, termsAccepted) => request('/google', { method: 'POST', body: JSON.stringify({ idToken, phone, termsAccepted }) }, false);
export const getPersonSession = () => request('/session');
export const logoutPerson = () => request('/logout', { method: 'POST' });
