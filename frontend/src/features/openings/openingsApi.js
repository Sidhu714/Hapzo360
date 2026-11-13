// Fake backend using localStorage. To go live, rewrite each function body as a fetch() call
// (endpoint hints in comments) and keep the same inputs/outputs, so components need no changes.
import {
  DEFAULT_JOB_EXPIRY_DAYS,
  JOB_EXPIRY_TEST_AFTER_MINUTES,
  JOB_EXPIRY_TEST_MODE,
  JOB_REACTIVATION_FEE,
  PRICING,
} from '../../config';
import { delay, read, uid, write } from '../../services/storage';
import { SEED_JOBS } from './seed';

const jobs = () => read('jobs', SEED_JOBS);
const companies = () => read('companies', []);
const now = () => new Date().toISOString();
const findCompany = (email) => companies().find((c) => c.email.toLowerCase() === email.toLowerCase());
const normalizeEmail = (email = '') => email.trim().toLowerCase();

export function calculateJobExpiry(expiryDays = DEFAULT_JOB_EXPIRY_DAYS, createdAt = now()) {
  const postedAt = new Date(createdAt);
  if (JOB_EXPIRY_TEST_MODE) {
    return new Date(postedAt.getTime() + JOB_EXPIRY_TEST_AFTER_MINUTES * 60_000).toISOString();
  }

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(postedAt);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const indiaMidnightUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) - 330 * 60_000;
  const days = Number(expiryDays) || DEFAULT_JOB_EXPIRY_DAYS;
  return new Date(indiaMidnightUtc + days * 86_400_000 - 1).toISOString();
}

export function isJobExpired(job, at = Date.now()) {
  if (job.companyId === 'seed') return false;
  let expiresAt = job.expiresAt;
  if (JOB_EXPIRY_TEST_MODE || !expiresAt) {
    expiresAt = calculateJobExpiry(job.expiryDays, job.createdAt);
  }
  return new Date(expiresAt).getTime() <= at;
}

// GET /jobs
export async function listJobs() {
  await delay();
  return jobs().filter((job) => !isJobExpired(job)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listExpiredCompanyJobs(email) {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  const company = findCompany(normalizedEmail);
  return jobs()
    .filter((job) =>
      (normalizeEmail(job.contactEmail) === normalizedEmail || (company && job.companyId === company.id)) &&
      isJobExpired(job),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// GET /pricing?email=...   First job 1500, every new job after that 500.
export async function getCompanyByEmail(email) {
  await delay(150);
  if (!email?.trim()) return null;
  const found = findCompany(email.trim());
  return found ? { ...found } : null;
}

export async function saveCompanyProfile(company) {
  await delay(150);
  const email = normalizeEmail(company.email);
  if (!email || !getDemoAccounts().some((account) => account.email === email)) {
    throw new Error('Sign in or create a company account before saving its profile.');
  }
  const existing = findCompany(email);
  const saved = existing
    ? { ...existing, ...company, email }
    : { id: uid(), ...company, email, jobsPosted: 0, createdAt: now() };
  write('companies', existing
    ? companies().map((item) => item.id === existing.id ? saved : item)
    : [...companies(), saved]);
  return saved;
}

export async function getPostingFee(email) {
  await delay(150);
  return (findCompany(email)?.jobsPosted || 0) === 0 ? PRICING.firstJob : PRICING.additionalJob;
}

// POST /payments   (demo: always succeeds. Plug the real gateway in here.)
export async function processPayment(amount) {
  await delay(900);
  return { id: uid(), amount, status: 'paid', paidAt: now() };
}

// POST /jobs   (server must verify the payment and its amount before saving)
export async function publishJob({ company, job, payment }) {
  await delay();
  const fee = await getPostingFee(company.email);
  if (payment?.status !== 'paid' || payment.amount !== fee) throw new Error('Payment is required before posting a job.');

  let all = companies();
  let c = findCompany(company.email);
  if (!c) { c = { id: uid(), ...company, jobsPosted: 0, createdAt: now() }; all = [...all, c]; }

  const createdAt = now();
  const expiryDays = Number(job.expiryDays) || DEFAULT_JOB_EXPIRY_DAYS;
  const newJob = {
    id: uid(), companyId: c.id, companyName: c.companyName,
    contactEmail: c.email, contactPhone: c.phone, ...job,
    expiryDays, createdAt, expiresAt: calculateJobExpiry(expiryDays, createdAt), status: 'active',
  };
  write('jobs', [newJob, ...jobs()]);
  write('payments', [...read('payments', []), { ...payment, companyId: c.id, jobId: newJob.id }]);
  write('companies', all.map((x) => (x.id === c.id ? { ...x, ...company, jobsPosted: x.jobsPosted + 1 } : x)));
  return newJob;
}

export async function removeExpiredCompanyJob(jobId, email) {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  const job = jobs().find((item) => item.id === jobId);
  const company = findCompany(normalizedEmail);
  const belongsToCompany = job && (
    normalizeEmail(job.contactEmail) === normalizedEmail ||
    (company && job.companyId === company.id)
  );
  if (!belongsToCompany || !isJobExpired(job)) {
    throw new Error('This expired job could not be removed.');
  }
  write('jobs', jobs().filter((item) => item.id !== jobId));
}

export async function reactivateExpiredCompanyJob(jobId, email, payment) {
  await delay();
  const normalizedEmail = normalizeEmail(email);
  const allJobs = jobs();
  const job = allJobs.find((item) => item.id === jobId);
  const company = findCompany(normalizedEmail);
  const belongsToCompany = job && (
    normalizeEmail(job.contactEmail) === normalizedEmail ||
    (company && job.companyId === company.id)
  );
  if (!belongsToCompany || !isJobExpired(job)) {
    throw new Error('This expired job could not be reactivated.');
  }
  if (payment?.status !== 'paid' || payment.amount !== JOB_REACTIVATION_FEE) {
    throw new Error('Payment is required to reactivate this job.');
  }

  const renewedAt = now();
  const updatedJob = {
    ...job,
    status: 'active',
    renewedAt,
    expiresAt: calculateJobExpiry(job.expiryDays, renewedAt),
  };
  write('jobs', allJobs.map((item) => item.id === jobId ? updatedJob : item));
  write('payments', [...read('payments', []), {
    ...payment, type: 'job-reactivation', companyId: job.companyId, jobId,
  }]);
  return updatedJob;
}

export async function processJobReactivationPayment() {
  return processPayment(JOB_REACTIVATION_FEE);
}

// POST /applications
export async function submitApplication({ jobId, jobTitle, name, phone, personId }) {
  await delay();
  const job = jobs().find((item) => item.id === jobId);
  if (!job || isJobExpired(job)) {
    throw new Error('This job is no longer accepting applications.');
  }
  write('applications', [...read('applications', []), { id: uid(), jobId, jobTitle, personId, name, phone, createdAt: now() }]);
}

const getDemoAccounts = () => read('demoCompanyAccounts', []);

export async function companyAccountExists(email) {
  await delay(150);

  const normalizedEmail = normalizeEmail(email);
  return getDemoAccounts().some(
    (account) => account.email === normalizedEmail
  );
}

export async function registerCompanyAccount({ email, password }) {
  await delay(150);

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  if (await companyAccountExists(normalizedEmail)) {
    throw new Error('An account already exists with this email.');
  }

  // Demo only: use a secure backend for real authentication.
  write('demoCompanyAccounts', [
    ...getDemoAccounts(),
    {
      email: normalizedEmail,
      password,
      createdAt: now(),
    },
  ]);

  return { email: normalizedEmail };
}

export async function loginCompanyAccount({ email, password }) {
  await delay(150);

  const normalizedEmail = normalizeEmail(email);

  const account = getDemoAccounts().find(
    (item) => item.email === normalizedEmail
  );

  if (!account || account.password !== password) {
    throw new Error('Incorrect email or password.');
  }

  return { email: account.email };
}
