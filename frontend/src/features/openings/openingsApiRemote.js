import API_BASE_URL from '../../config/api';
import { JOB_REACTIVATION_FEE } from '../../config';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new Error('The Hapzo360 backend is unavailable. Check that it is running and connected to MySQL.');
  }
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('The Hapzo360 API did not return data. Check the API URL.');
  }
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

const json = (value) => JSON.stringify(value);

export async function listJobs() { return (await request('/jobs')).jobs; }
export async function listExpiredCompanyJobs() { return (await request('/jobs/expired')).jobs; }
export async function companyAccountExists(email) { return (await request(`/companies/exists?email=${encodeURIComponent(email)}`)).exists; }
export async function sendCompanyEmailCode(email, phone) { return request('/companies/email-code', { method: 'POST', body: json({ email, phone }) }); }
export async function verifyCompanyEmailCode(email, phone, code) { return (await request('/companies/verify-email-code', { method: 'POST', body: json({ email, phone, code }) })).verificationToken; }
export async function registerCompanyAccount({ email, password, profile, verificationToken, termsAccepted }) { return (await request('/companies/register', { method: 'POST', body: json({ email, password, profile, verificationToken, termsAccepted }) })).company; }
export async function loginCompanyAccount({ email, password }) { return (await request('/companies/login', { method: 'POST', body: json({ email, password }) })).company; }
export async function googleCompany(idToken, profile, password, termsAccepted) { return request('/companies/google', { method: 'POST', body: json({ idToken, profile, password, termsAccepted }) }); }
export async function getCompanySession() { return (await request('/companies/me')).company; }
export async function getCompanyByEmail(email) {
  try {
    const company = await getCompanySession();
    return company?.email === email.trim().toLowerCase() ? company : null;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}
export async function saveCompanyProfile(company) { return (await request('/companies/me', { method: 'PUT', body: json(company) })).company; }
export async function logoutCompany() { return request('/companies/logout', { method: 'POST' }); }
export async function getPostingFee() { return (await request('/jobs/posting-fee')).amount; }
export async function processPayment(amount) { return (await request('/payments/demo', { method: 'POST', body: json({ kind: 'job-posting', amount }) })).payment; }
export async function publishJob({ job, payment }) { return (await request('/jobs', { method: 'POST', body: json({ job, paymentId: payment?.id }) })).job; }
export async function removeExpiredCompanyJob(jobId) { return request(`/jobs/${encodeURIComponent(jobId)}`, { method: 'DELETE' }); }
export async function processJobReactivationPayment() { return (await request('/payments/demo', { method: 'POST', body: json({ kind: 'job-reactivation', amount: JOB_REACTIVATION_FEE }) })).payment; }
export async function reactivateExpiredCompanyJob(jobId, email, payment) { return (await request(`/jobs/${encodeURIComponent(jobId)}/reactivate`, { method: 'POST', body: json({ paymentId: payment?.id }) })).job; }
export async function submitApplication({ jobId }) { return request('/applications', { method: 'POST', body: json({ jobId }) }); }
