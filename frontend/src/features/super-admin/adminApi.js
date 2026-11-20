import API_BASE_URL from '../../config/api';

const ADMIN_API = `${API_BASE_URL}/api/admin`;
const ADMIN_SESSION_TOKEN_KEY = 'hapzo_admin_session_token';

function adminSessionToken() {
  try { return window.sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY) || ''; } catch { return ''; }
}

function storeAdminSessionToken(token) {
  try {
    if (token) window.sessionStorage.setItem(ADMIN_SESSION_TOKEN_KEY, token);
    else window.sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
  } catch { /* Session storage may be unavailable in a restricted browser. */ }
}

async function request(path, options = {}) {
  let response;
  try {
    const token = adminSessionToken();
    response = await fetch(`${ADMIN_API}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
    });
  } catch {
    throw new Error('Cannot reach the admin backend. Check that the backend is running and the API URL is correct.');
  }

  // Static hosts can return index.html with HTTP 200 for an unknown /api path.
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error(`The admin API returned a webpage (HTTP ${response.status}). Restart the backend so the latest admin routes are available.`);
  }

  const data = await response.json();
  if (!response.ok) {
    const legacyAdminLogin = path === '/login' && response.status === 401 && /incorrect email or password/i.test(data.message || '');
    const error = new Error(legacyAdminLogin
      ? 'The admin backend is still running the old email login. Restart or redeploy the updated backend to use username sign-in.'
      : data.message || (response.status === 401 ? 'Incorrect username or password.' : 'Admin request failed.'));
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getAdminSession() {
  // Authentication state must never be served from an HTTP cache. A cached
  // unauthenticated response can otherwise redirect a user back to login
  // immediately after the server has accepted their credentials.
  const data = await request('/session', { cache: 'no-store' });
  return data.authenticated && ['admin', 'super_admin'].includes(data.role) ? data : null;
}

export async function loginAdmin(username, password) {
  const data = await request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (!['admin', 'super_admin'].includes(data.role)) throw new Error('This account does not have administrator access.');
  storeAdminSessionToken(data.sessionToken);
  return data;
}

export async function logoutAdmin() {
  try { return await request('/logout', { method: 'POST' }); }
  finally { storeAdminSessionToken(''); }
}

export async function getAdminOverview() { return request('/overview'); }
export async function getSuperAdminActivity() { return request('/activity'); }
export async function getPendingReviews() { return request('/pending'); }
export async function createAdminJob(job) { return request('/jobs', { method: 'POST', body: JSON.stringify(job) }); }
export async function updateAdminJob(id, job) { return (await request(`/jobs/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ job }) })).job; }
export async function createAdminEvent(event) { return (await request('/events', { method: 'POST', body: JSON.stringify(event) })).event; }
export async function updateAdminEvent(id, event) { return (await request(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ event }) })).event; }
export async function updateAdminListingOrder(kind, ids) {
  if (!['jobs', 'events'].includes(kind)) throw new Error('Unknown listing type.');
  return request(`/${kind}/display-order`, { method: 'PATCH', body: JSON.stringify({ ids }) });
}
export async function deleteAdminListing(kind, id) {
  if (!['jobs', 'events'].includes(kind)) throw new Error('Unknown listing type.');
  return request(`/${kind}/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function restoreAdminJob(id, expiry) {
  return (await request(`/jobs/${encodeURIComponent(id)}/restore`, { method: 'PATCH', body: JSON.stringify(expiry) })).job;
}
export async function reviewSubmission(kind, id, decision, reason = '') {
  if (!['jobs', 'events'].includes(kind)) throw new Error('Unknown review type.');
  return request(`/${kind}/${encodeURIComponent(id)}/review`, { method: 'PATCH', body: JSON.stringify({ decision, reason }) });
}
export async function getEditorialPosts() { return (await request('/editorial')).posts; }
export async function publishEditorialPost(post) {
  return (await request('/editorial', { method: 'POST', body: JSON.stringify(post) })).post;
}
export async function uploadEditorialImage(file) {
  let response;
  try {
    response = await fetch(`${ADMIN_API}/editorial/image`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': file.type }, body: file,
    });
  } catch { throw new Error('The image upload could not reach the backend.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The backend did not accept the image upload.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Could not upload the image.');
  return data.image;
}
export async function deleteEditorialPost(id) {
  return request(`/editorial/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
export async function getAdminCollection(name) {
  if (!['people', 'companies', 'jobs', 'events'].includes(name)) throw new Error('Unknown admin collection.');
  return (await request(`/${name}`))[name];
}

export async function getAdminJobApplications(jobId) {
  return (await request(`/jobs/${encodeURIComponent(jobId)}/applications`)).applications;
}

export async function updateAdminPerson(id, person) {
  return (await request(`/people/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ person }) })).person;
}

export async function deleteAdminPerson(id) {
  return request(`/people/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function updateAdminCompany(id, company) {
  return (await request(`/companies/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ company }) })).company;
}

export async function deleteAdminCompany(id) {
  return request(`/companies/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getAdminClip(eventId) {
  const response = await fetch(`${ADMIN_API}/events/${encodeURIComponent(eventId)}/clip`, { credentials: 'include' });
  if (!response.ok) throw new Error('Could not load the verification clip.');
  return response.blob();
}
