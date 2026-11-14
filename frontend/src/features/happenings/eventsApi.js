import API_BASE_URL from '../../config/api';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch { throw new Error('The Hapzo360 backend is unavailable.'); }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The Hapzo360 API did not return data.');
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function listCommunityEvents() { return (await request('/events')).events; }
export async function listMyCompanyEvents() { return (await request('/events/mine')).events; }
export async function publishCommunityEvent(event) { return (await request('/events', { method: 'POST', body: JSON.stringify({ event }) })).event; }
export async function updateCommunityEvent(id, event) { return (await request(`/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ event }) })).event; }
export async function deleteCommunityEvent(id) { return request(`/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); }
export async function uploadVerificationClip(eventId, blob) {
  const mime = blob.type.split(';')[0] || 'video/webm';
  const response = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(eventId)}/clip?mime=${encodeURIComponent(mime)}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/octet-stream' }, body: blob,
  });
  if (!response.ok) throw new Error('Could not upload the verification clip.');
}
export async function listMyEventRegistrations() { return (await request('/events/registrations/me')).registrations; }
export async function registerForExternalEvent(eventId, attendee) { return request(`/events/${encodeURIComponent(eventId)}/external-registration`, { method: 'POST', body: JSON.stringify(attendee) }); }
export async function registerForCommunityEvent(eventId, eventTitle) { return request(`/events/${encodeURIComponent(eventId)}/register`, { method: 'POST', body: JSON.stringify({ eventTitle }) }); }
