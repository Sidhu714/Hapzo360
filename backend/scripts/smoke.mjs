import 'dotenv/config';
import { randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { createDatabase } from '../db.js';

const base = `${process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3001'}/api`;
const db = createDatabase();
const cleanup = { personId: null, personEmail: null, companyId: null, companyEmail: null, jobId: null, rejectedJobId: null, adminJobIds: [], eventId: null, rejectedEventId: null, adminEventId: null, adminEventImageId: null, postId: null };

async function call(path, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`${method} ${path}: expected JSON, got ${response.status} ${raw.slice(0, 80)}`); }
  if (!response.ok) throw new Error(`${method} ${path}: ${response.status} ${data.message || 'failed'}`);
  return { data, cookie: response.headers.getSetCookie().at(-1)?.split(';')[0] };
}

try {
  const unique = randomUUID().replace(/-/g, '').slice(0, 9);
  const phone = `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
  const companyPhone = `8${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
  const personEmail = `smoke-person-${unique}@example.invalid`;
  cleanup.personEmail = personEmail;
  const code = '123456';
  const salt = randomBytes(16).toString('hex');
  const codeHash = `scrypt$${salt}$${scryptSync(code, salt, 64).toString('hex')}`;
  await db.execute('INSERT INTO people_email_codes (email, phone, code_hash, expires_at, sent_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 3 MINUTE), UTC_TIMESTAMP(3))', [personEmail, phone, codeHash]);
  const personResult = await call('/people/register', { method: 'POST', body: { name: 'Smoke Test Person', phone, email: personEmail, code } });
  cleanup.personId = personResult.data.person.id;
  const personCookie = personResult.cookie;
  const companyEmail = `smoke-${unique}@example.invalid`;
  cleanup.companyEmail = companyEmail;
  const companySalt = randomBytes(16).toString('hex');
  const companyCodeHash = `scrypt$${companySalt}$${scryptSync(code, companySalt, 64).toString('hex')}`;
  await db.execute('INSERT INTO company_email_codes (email, phone, code_hash, expires_at, sent_at) VALUES (?, ?, ?, DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 3 MINUTE), UTC_TIMESTAMP(3))', [companyEmail, companyPhone, companyCodeHash]);
  const verificationToken = (await call('/companies/verify-email-code', { method: 'POST', body: { email: companyEmail, phone: companyPhone, code } })).data.verificationToken;
  const companyResult = await call('/companies/register', { method: 'POST', body: { email: companyEmail, password: `smoke-${randomUUID()}`, verificationToken, profile: { companyName: 'Smoke Test Company', phone: companyPhone, industry: 'Testing', location: 'Chennai', contactPerson: 'Tester' } } });
  cleanup.companyId = companyResult.data.company.id;
  const companyCookie = companyResult.cookie;
  const fee = (await call('/jobs/posting-fee', { cookie: companyCookie })).data.amount;
  const payment = (await call('/payments/demo', { method: 'POST', cookie: companyCookie, body: { kind: 'job-posting', amount: fee } })).data.payment;
  const posted = await call('/jobs', { method: 'POST', cookie: companyCookie, body: { paymentId: payment.id, job: { title: 'Smoke Test Role', location: 'Chennai, Tamil Nadu', description: 'Temporary integration test.', positions: [{ title: 'Smoke Test Role', contactName: 'Hiring Tester', contactPhone: companyPhone }], expiryDays: 3 } } });
  cleanup.jobId = posted.data.job.id;
  if (posted.data.job.status !== 'pending') throw new Error('Job should await approval.');
  const publicJobs = (await call('/jobs')).data.jobs;
  if (publicJobs.some((item) => item.id === cleanup.jobId)) throw new Error('Pending job appeared publicly.');
  const event = (await call('/events', { method: 'POST', cookie: companyCookie, body: { event: { title: 'Smoke Test Event', venue: 'Chennai', location: 'Chennai, Tamil Nadu', state: 'Tamil Nadu', district: 'Chennai', date: new Date(Date.now() + 86_400_000).toISOString(), category: 'Community' } } })).data.event;
  cleanup.eventId = event.id;
  const clipBody = Buffer.from('temporary verification clip');
  const clipResponse = await fetch(`${base}/events/${encodeURIComponent(event.id)}/clip?mime=video%2Fwebm`, { method: 'PUT', headers: { Cookie: companyCookie, 'Content-Type': 'application/octet-stream' }, body: clipBody });
  if (!clipResponse.ok) throw new Error(`Verification clip upload failed: ${clipResponse.status} ${await clipResponse.text()}`);
  const events = (await call('/events')).data.events;
  if (events.some((item) => item.id === event.id)) throw new Error('Pending event appeared publicly.');
  const adminUsername = process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL?.split('@')[0];
  if (!adminUsername || !process.env.SUPER_ADMIN_PASSWORD) throw new Error('Admin credentials required for approval smoke check.');
  {
    const admin = await call('/admin/login', { method: 'POST', body: { username: adminUsername, password: process.env.SUPER_ADMIN_PASSWORD } });
    const adminCookie = admin.cookie;
    const adminJobs = (await call('/admin/jobs', { method: 'POST', cookie: adminCookie, body: { companyName: 'Smoke Test Organisation', location: 'Chennai, Tamil Nadu', jobs: ['Production Supervisor', 'Quality Inspector'].map((title) => ({ title, description: `Hiring for ${title}.`, experience: '2+ years', salary: '₹20,000 / month', positions: [{ title, experiences: [{ level: '2+ years', count: 2, salary: '₹20,000 / month' }], remarks: `Hiring for ${title}.`, contactName: 'Hiring Tester', contactPhone: companyPhone }] })) } })).data.jobs;
    cleanup.adminJobIds = adminJobs.map((job) => job.id);
    const adminJob = adminJobs[0];
    if (adminJobs.length !== 2 || adminJobs.some((job) => job.status !== 'active' || !job.createdByAdmin || !job.salary.startsWith('₹'))) throw new Error('Admin positions were not published as separate openings.');
    const imageBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/3ZkAAAAASUVORK5CYII=', 'base64');
    const imageResponse = await fetch(`${base}/admin/editorial/image`, { method: 'POST', headers: { Cookie: adminCookie, 'Content-Type': 'image/png' }, body: imageBytes });
    if (!imageResponse.ok) throw new Error(`Admin event image upload failed: ${imageResponse.status}`);
    const imagePath = (await imageResponse.json()).image;
    cleanup.adminEventImageId = imagePath.split('/').at(-1);
    const adminEvent = (await call('/admin/events', { method: 'POST', cookie: adminCookie, body: { title: 'Smoke Test Admin Event', organizer: 'Hapzo360', venue: 'Chennai', location: 'Chennai, Tamil Nadu', state: 'Tamil Nadu', district: 'Chennai', date: new Date(Date.now() + 86_400_000).toISOString(), category: 'Community', sector: 'Textile', specialty: 'Dyeing', image: imagePath } })).data.event;
    cleanup.adminEventId = adminEvent.id;
    if (adminEvent.status !== 'approved' || !adminEvent.createdByAdmin || adminEvent.image !== imagePath || adminEvent.specialty !== 'Dyeing') throw new Error('Admin happening was not published correctly.');
    const servedImage = await fetch(new URL(imagePath, base));
    if (!servedImage.ok || !(await servedImage.arrayBuffer()).byteLength) throw new Error('Admin happening image is unavailable.');
    const publicAdminJobs = (await call('/jobs')).data.jobs.filter((item) => cleanup.adminJobIds.includes(item.id));
    if (publicAdminJobs.length !== 2 || publicAdminJobs.some((item) => item.contactPhone || item.positions?.[0]?.contactPhone)) throw new Error('Admin openings are missing publicly or expose contact details.');
    if (!(await call('/events')).data.events.some((item) => item.id === adminEvent.id)) throw new Error('Admin happening is missing publicly.');
    const adminApplication = (await call('/applications', { method: 'POST', cookie: personCookie, body: { jobId: adminJob.id } })).data;
    if (adminApplication.contactPhone !== companyPhone) throw new Error('Admin opening did not reveal contact details after application.');
    await call(`/events/${encodeURIComponent(adminEvent.id)}/register`, { method: 'POST', cookie: personCookie, body: { eventTitle: adminEvent.title } });
    const adminCreatedRecords = [
      ...(await call('/admin/jobs', { cookie: adminCookie })).data.jobs.filter((item) => cleanup.adminJobIds.includes(item.id)),
      (await call('/admin/events', { cookie: adminCookie })).data.events.find((item) => item.id === adminEvent.id),
    ];
    if (adminCreatedRecords.some((item) => !item?.createdByAdmin || item.creatorUsername !== adminUsername || item.reviewHistory?.[0]?.reviewerUsername !== adminUsername) || adminCreatedRecords.at(-1).clipAvailable) throw new Error('Admin-created listing provenance or video-free status is incorrect.');
    const withoutAdmin = await fetch(`${base}/admin/jobs/${adminJob.id}`, { method: 'DELETE' });
    if (withoutAdmin.status !== 401) throw new Error('Deleting an opening without admin access should fail.');
    const companyDelete = await fetch(`${base}/admin/jobs/${cleanup.jobId}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
    const companyEventDelete = await fetch(`${base}/admin/events/${encodeURIComponent(event.id)}`, { method: 'DELETE', headers: { Cookie: adminCookie } });
    if (companyDelete.status !== 404 || companyEventDelete.status !== 404) throw new Error('Admin delete must be limited to admin-created listings.');
    await call(`/admin/jobs/${adminJob.id}`, { method: 'DELETE', cookie: adminCookie });
    await call(`/admin/events/${encodeURIComponent(adminEvent.id)}`, { method: 'DELETE', cookie: adminCookie });
    if ((await call('/jobs')).data.jobs.some((item) => item.id === adminJob.id) || (await call('/events')).data.events.some((item) => item.id === adminEvent.id)) throw new Error('Deleted admin listings remain public.');
    if ((await call('/admin/jobs', { cookie: adminCookie })).data.jobs.some((item) => item.id === adminJob.id) || (await call('/admin/events', { cookie: adminCookie })).data.events.some((item) => item.id === adminEvent.id)) throw new Error('Deleted admin listings remain in the admin list.');
    const registerDeleted = await fetch(`${base}/events/${encodeURIComponent(adminEvent.id)}/register`, { method: 'POST', headers: { Cookie: personCookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ eventTitle: adminEvent.title }) });
    if (registerDeleted.status !== 404) throw new Error('Deleted admin event still accepts registration.');
    if (!(await call('/events/registrations/me', { cookie: personCookie })).data.registrations.some((item) => item.eventId === adminEvent.id)) throw new Error('Existing event registration was lost after deletion.');
    const queue = (await call('/admin/pending', { cookie: adminCookie })).data;
    if (!queue.jobs.some((item) => item.id === cleanup.jobId) || !queue.events.some((item) => item.id === event.id)) throw new Error('Pending items missing from admin queue.');
    const adminClip = await fetch(`${base}/admin/events/${encodeURIComponent(event.id)}/clip`, { headers: { Cookie: adminCookie } });
    if (!adminClip.ok || !Buffer.from(await adminClip.arrayBuffer()).equals(clipBody)) throw new Error('Admin could not read the verification clip.');
    await call(`/admin/jobs/${cleanup.jobId}/review`, { method: 'PATCH', cookie: adminCookie, body: { decision: 'approve' } });
    await call(`/admin/events/${encodeURIComponent(event.id)}/review`, { method: 'PATCH', cookie: adminCookie, body: { decision: 'approve' } });
    const reviewedJob = (await call('/admin/jobs', { cookie: adminCookie })).data.jobs.find((item) => item.id === cleanup.jobId);
    const reviewedEvent = (await call('/admin/events', { cookie: adminCookie })).data.events.find((item) => item.id === event.id);
    for (const item of [reviewedJob, reviewedEvent]) {
      if (item?.reviewHistory?.[0]?.decision !== 'approve' || item.reviewHistory[0].reviewerUsername !== adminUsername || !item.reviewHistory[0].reviewedAt) {
        throw new Error('Moderation history did not record the approving admin and time.');
      }
    }
    const rejectFee = (await call('/jobs/posting-fee', { cookie: companyCookie })).data.amount;
    const rejectPayment = (await call('/payments/demo', { method: 'POST', cookie: companyCookie, body: { kind: 'job-posting', amount: rejectFee } })).data.payment;
    const rejectJob = (await call('/jobs', { method: 'POST', cookie: companyCookie, body: { paymentId: rejectPayment.id, job: { title: 'Smoke Test Rejected Role', location: 'Chennai', positions: [{ title: 'Smoke Test Rejected Role', contactName: 'Hiring Tester', contactPhone: companyPhone }], expiryDays: 3 } } })).data.job;
    cleanup.rejectedJobId = rejectJob.id;
  const rejectEvent = (await call('/events', { method: 'POST', cookie: companyCookie, body: { event: { title: 'Smoke Test Rejected Event', venue: 'Chennai', location: 'Chennai, Tamil Nadu', state: 'Tamil Nadu', district: 'Chennai', date: new Date(Date.now() + 86_400_000).toISOString(), category: 'Community' } } })).data.event;
    cleanup.rejectedEventId = rejectEvent.id;
    await call(`/admin/jobs/${rejectJob.id}/review`, { method: 'PATCH', cookie: adminCookie, body: { decision: 'reject', reason: 'Temporary test rejection' } });
    await call(`/admin/events/${encodeURIComponent(rejectEvent.id)}/review`, { method: 'PATCH', cookie: adminCookie, body: { decision: 'reject', reason: 'Temporary test rejection' } });
    const rejectedJob = (await call('/admin/jobs', { cookie: adminCookie })).data.jobs.find((item) => item.id === rejectJob.id);
    const rejectedEvent = (await call('/admin/events', { cookie: adminCookie })).data.events.find((item) => item.id === rejectEvent.id);
    for (const item of [rejectedJob, rejectedEvent]) {
      if (item?.reviewHistory?.[0]?.decision !== 'reject' || item.reviewHistory[0].reviewerUsername !== adminUsername || item.reviewHistory[0].reason !== 'Temporary test rejection') {
        throw new Error('Moderation history did not record the rejecting admin and reason.');
      }
    }
    const overview = (await call('/admin/overview', { cookie: adminCookie })).data;
    if (overview.jobs < 1 || overview.events < 1) throw new Error('Admin overview did not count the temporary records.');
    const post = (await call('/admin/editorial', { method: 'POST', cookie: adminCookie, body: { domain: 'technology', title: 'Smoke Test Technology Story', description: 'Temporary integration test article.', body: 'First paragraph.\n\nSecond paragraph.' } })).data.post;
    cleanup.postId = post.id;
    if (!(await call('/admin/editorial', { cookie: adminCookie })).data.posts.some((item) => item.id === post.id)) throw new Error('Published article missing from admin list.');
    if (!(await call('/trends?domain=technology')).data.articles.some((item) => item.id === post.id)) throw new Error('Published article missing from technology feed.');
    const storyResponse = await fetch(`${base}/editorial/${post.id}`);
    if (!storyResponse.ok || !(await storyResponse.text()).includes('Smoke Test Technology Story')) throw new Error('Published article page unavailable.');
    await call('/admin/logout', { method: 'POST', cookie: adminCookie });
  }
  const publicJob = (await call('/jobs')).data.jobs.find((item) => item.id === cleanup.jobId);
  if (!publicJob || publicJob.positions?.[0]?.contactPhone) throw new Error('Approved public job did not hide contact details.');
  const application = (await call('/applications', { method: 'POST', cookie: personCookie, body: { jobId: cleanup.jobId } })).data;
  if (application.contactPhone !== companyPhone) throw new Error('Application did not reveal contact details.');
  if (!(await call('/events')).data.events.some((item) => item.id === event.id)) throw new Error('Approved event did not appear publicly.');
  await call(`/events/${encodeURIComponent(event.id)}/register`, { method: 'POST', cookie: personCookie, body: { eventTitle: event.title } });
  const registrations = (await call('/events/registrations/me', { cookie: personCookie })).data.registrations;
  if (!registrations.some((item) => item.eventId === event.id)) throw new Error('Event registration was not saved.');
  process.stdout.write('MySQL API smoke check passed: accounts, approvals, admin publishing, job, payment, application, event, clip, registration, editorial feed, contact privacy.\n');
} finally {
  try {
    if (cleanup.personEmail) await db.execute('DELETE FROM people_email_codes WHERE email = ?', [cleanup.personEmail]);
    if (cleanup.companyEmail) await db.execute('DELETE FROM company_email_codes WHERE email = ?', [cleanup.companyEmail]);
    if (cleanup.postId) await db.execute('DELETE FROM editorial_posts WHERE id = ?', [cleanup.postId]);
    if (cleanup.personId) {
      await db.execute('DELETE FROM event_registrations WHERE person_id = ?', [cleanup.personId]);
      await db.execute('DELETE FROM applications WHERE person_id = ?', [cleanup.personId]);
    }
    if (cleanup.eventId) await db.execute('DELETE FROM moderation_reviews WHERE content_type = ? AND content_id = ?', ['event', cleanup.eventId]);
    if (cleanup.rejectedEventId) await db.execute('DELETE FROM moderation_reviews WHERE content_type = ? AND content_id = ?', ['event', cleanup.rejectedEventId]);
    if (cleanup.adminEventId) await db.execute('DELETE FROM moderation_reviews WHERE content_type = ? AND content_id = ?', ['event', cleanup.adminEventId]);
    if (cleanup.jobId) await db.execute('DELETE FROM moderation_reviews WHERE content_type = ? AND content_id = ?', ['job', cleanup.jobId]);
    if (cleanup.rejectedJobId) await db.execute('DELETE FROM moderation_reviews WHERE content_type = ? AND content_id = ?', ['job', cleanup.rejectedJobId]);
    for (const id of cleanup.adminJobIds) await db.execute('DELETE FROM moderation_reviews WHERE content_type = ? AND content_id = ?', ['job', id]);
    if (cleanup.eventId) await db.execute('DELETE FROM events WHERE id = ?', [cleanup.eventId]);
    if (cleanup.rejectedEventId) await db.execute('DELETE FROM events WHERE id = ?', [cleanup.rejectedEventId]);
    if (cleanup.adminEventId) await db.execute('DELETE FROM events WHERE id = ?', [cleanup.adminEventId]);
    if (cleanup.adminEventImageId) await db.execute('DELETE FROM editorial_images WHERE id = ?', [cleanup.adminEventImageId]);
    if (cleanup.jobId) await db.execute('DELETE FROM jobs WHERE id = ?', [cleanup.jobId]);
    if (cleanup.rejectedJobId) await db.execute('DELETE FROM jobs WHERE id = ?', [cleanup.rejectedJobId]);
    for (const id of cleanup.adminJobIds) await db.execute('DELETE FROM jobs WHERE id = ?', [id]);
    if (cleanup.companyId) {
      await db.execute('DELETE FROM payments WHERE company_id = ?', [cleanup.companyId]);
      await db.execute("DELETE FROM sessions WHERE role = 'company' AND subject_id = ?", [cleanup.companyId]);
      await db.execute('DELETE FROM companies WHERE id = ?', [cleanup.companyId]);
    }
    if (cleanup.personId) {
      await db.execute("DELETE FROM sessions WHERE role = 'person' AND subject_id = ?", [cleanup.personId]);
      await db.execute('DELETE FROM people WHERE id = ?', [cleanup.personId]);
    }
  } finally { await db.end(); }
}
