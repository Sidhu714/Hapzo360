// Fake backend using localStorage. To go live, rewrite each function body as a fetch() call
// (endpoint hints in comments) and keep the same inputs/outputs, so components need no changes.
import { PRICING } from '../../config';
import { delay, read, uid, write } from '../../services/storage';
import { SEED_JOBS } from './seed';

const jobs = () => read('jobs', SEED_JOBS);
const companies = () => read('companies', []);
const now = () => new Date().toISOString();
const findCompany = (email) => companies().find((c) => c.email.toLowerCase() === email.toLowerCase());

// GET /jobs
export async function listJobs() {
  await delay();
  return [...jobs()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// GET /pricing?email=...   First job 1500, every new job after that 500.
export async function getCompanyByEmail(email) {
  await delay(150);
  if (!email?.trim()) return null;
  const found = findCompany(email.trim());
  return found ? { ...found } : null;
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

  const newJob = { id: uid(), companyId: c.id, companyName: c.companyName, contactEmail: c.email, contactPhone: c.phone, ...job, createdAt: now() };
  write('jobs', [newJob, ...jobs()]);
  write('payments', [...read('payments', []), { ...payment, companyId: c.id, jobId: newJob.id }]);
  write('companies', all.map((x) => (x.id === c.id ? { ...x, ...company, jobsPosted: x.jobsPosted + 1 } : x)));
  return newJob;
}

// POST /applications
export async function submitApplication({ jobId, jobTitle, name, phone }) {
  await delay();
  write('applications', [...read('applications', []), { id: uid(), jobId, jobTitle, name, phone, createdAt: now() }]);
}

const normalizeEmail = (email = '') => email.trim().toLowerCase();

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
