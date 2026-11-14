import express from 'express';
import { randomBytes, randomInt, randomUUID, scryptSync, createHash, timingSafeEqual } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { verifyGoogleIdentity } from './googleAuth.js';

const COOKIE = { person: 'hapzo_person', company: 'hapzo_company', super_admin: 'hapzo_admin' };
const SESSION_DAYS = 7;
const EMAIL_CODE_TTL_SECONDS = 180;
const emailOf = (value) => String(value || '').trim().toLowerCase();
const adminUsernameOf = (value) => String(value || '').trim().toLowerCase();
const adminDisplayUsername = (admin) => admin.role === 'super_admin' && adminUsernameOf(process.env.READ_ONLY_SUPER_ADMIN_USERNAME) === adminUsernameOf(admin.username)
  ? process.env.READ_ONLY_SUPER_ADMIN_USERNAME : admin.username;
const phoneOf = (value) => String(value || '').replace(/\D/g, '').slice(-10);
const parseJson = (value) => typeof value === 'string' ? JSON.parse(value) : value;
const iso = (value) => value ? `${String(value).replace(' ', 'T').replace(/Z$/, '')}Z` : null;
const mysqlDate = (value) => new Date(value).toISOString().slice(0, 23).replace('T', ' ');
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');
const now = () => new Date().toISOString();
const fail = (res, status, message) => res.status(status).json({ message });

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password, saved) {
  const [algorithm, salt, hex] = String(saved || '').split('$');
  if (algorithm !== 'scrypt' || !salt || !hex) return false;
  const expected = Buffer.from(hex, 'hex');
  const actual = scryptSync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((item) => item.trim().split('=')).filter(([key, value]) => key && value));
}

function cookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return { httpOnly: true, secure, sameSite: secure ? 'none' : 'lax', path: '/api', maxAge: SESSION_DAYS * 86_400_000 };
}

async function createSession(db, req, res, role, subjectId) {
  if (role === 'person') await clearSession(db, req, res, 'company');
  if (role === 'company') await clearSession(db, req, res, 'person');
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.execute('INSERT INTO sessions (token_hash, role, subject_id, expires_at) VALUES (?, ?, ?, ?)', [tokenHash(token), role, subjectId, mysqlDate(expires)]);
  res.cookie(COOKIE[role], token, cookieOptions());
}

async function findSession(db, req, role) {
  const token = cookies(req)[COOKIE[role]];
  if (!token) return null;
  const [rows] = await db.execute('SELECT subject_id FROM sessions WHERE token_hash = ? AND role = ? AND expires_at > UTC_TIMESTAMP(3)', [tokenHash(token), role]);
  return rows[0]?.subject_id || null;
}

function requireRole(db, role) {
  return async (req, res, next) => {
    try {
      const id = await findSession(db, req, role);
      if (!id) return fail(res, 401, 'Sign in to continue.');
      req.accountId = id;
      next();
    } catch (error) { next(error); }
  };
}

function requireAdminRole(db, allowedRoles) {
  return async (req, res, next) => {
    try {
      const id = await findSession(db, req, 'super_admin');
      if (!id) return fail(res, 401, 'Sign in to continue.');
      const [[admin]] = await db.execute('SELECT role FROM admin_users WHERE id = ?', [id]);
      if (!admin || !allowedRoles.includes(admin.role)) return fail(res, 403, 'This admin account cannot perform that action.');
      req.accountId = id;
      req.adminRole = admin.role;
      next();
    } catch (error) { next(error); }
  };
}

async function clearSession(db, req, res, role) {
  const token = cookies(req)[COOKIE[role]];
  if (token) await db.execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHash(token)]);
  res.clearCookie(COOKIE[role], { ...cookieOptions(), maxAge: undefined });
}

function companyPublic(row) {
  if (!row) return null;
  const profile = row.profile_json ? parseJson(row.profile_json) : {};
  return {
    ...profile, id: row.id, email: row.email,
    companyName: row.company_name || profile.companyName || '',
    phone: row.phone || profile.phone || '', emailVerified: Boolean(row.email_verified), phoneVerified: Boolean(row.phone_verified),
    jobsPosted: row.jobs_posted, createdAt: iso(row.created_at),
  };
}

function personPublic(row) {
  return row ? { id: row.id, type: 'person', name: row.name, phone: row.phone, email: row.email || '', emailVerified: Boolean(row.email_verified), phoneVerified: Boolean(row.phone_verified), createdAt: iso(row.created_at) } : null;
}

function emailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST, port: Number(SMTP_PORT || 587),
    secure: Number(SMTP_PORT || 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

async function companyById(db, id) {
  const [rows] = await db.execute('SELECT * FROM companies WHERE id = ?', [id]);
  return rows[0] || null;
}

async function companyByEmail(db, email) {
  const [rows] = await db.execute('SELECT * FROM companies WHERE email = ?', [email]);
  return rows[0] || null;
}

function jobExpiry(created, days = 3) {
  if (process.env.JOB_EXPIRY_TEST_MODE === 'true') {
    return new Date(new Date(created).getTime() + Number(process.env.JOB_EXPIRY_TEST_AFTER_MINUTES || 1) * 60_000);
  }
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(created));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const midnightUtc = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) - 330 * 60_000;
  return new Date(midnightUtc + Math.max(1, Number(days) || 3) * 86_400_000 - 1);
}

function jobPublic(row) {
  const job = parseJson(row.data_json);
  const { contactPhone, contactEmail, contactName, positions, ...safe } = job;
  const scrub = (value) => typeof value === 'string' ? value.replace(/(?:^|\s)Contact:\s*[^.]*\.?/gi, ' ').trim() : value;
  return {
    ...safe,
    description: scrub(safe.description),
    requirements: scrub(safe.requirements),
    positions: Array.isArray(positions) ? positions.map(({ contactName: ignoredName, contactPhone: ignoredPhone, ...position }) => ({ ...position, remarks: scrub(position.remarks) })) : [],
    id: row.id, companyId: row.company_id, status: row.status,
    createdAt: iso(row.created_at), expiresAt: iso(row.expires_at), renewedAt: iso(row.renewed_at),
  };
}

function jobOwner(row) {
  return { ...parseJson(row.data_json), id: row.id, companyId: row.company_id, createdByAdmin: Boolean(row.created_by_admin), creatorUsername: row.creator_username || '', status: row.status, createdAt: iso(row.created_at), expiresAt: iso(row.expires_at), renewedAt: iso(row.renewed_at), reviewedAt: iso(row.reviewed_at), rejectionReason: row.rejection_reason || '' };
}

function eventOwner(row) {
  return { ...parseJson(row.data_json), id: row.id, companyId: row.company_id, createdByAdmin: Boolean(row.created_by_admin), creatorUsername: row.creator_username || '', status: row.status, createdAt: iso(row.created_at), reviewedAt: iso(row.reviewed_at), rejectionReason: row.rejection_reason || '' };
}

function registrationUrlOf(value, fallback = '') {
  const registrationUrl = String(value === undefined ? fallback : value || '').trim().slice(0, 2048);
  if (registrationUrl && !/^https:\/\//i.test(registrationUrl)) {
    throw Object.assign(new Error('Use a valid HTTPS registration link.'), { status: 400 });
  }
  return registrationUrl;
}

function updatedEventData(input, current, { allowOrganizer = false } = {}) {
  const date = new Date(input?.date);
  const title = String(input?.title || '').trim().slice(0, 120);
  const venue = String(input?.venue || '').trim().slice(0, 200);
  if (!title || !venue || !Number.isFinite(date.getTime()) || date.getTime() < Date.now() - 86_400_000) {
    throw Object.assign(new Error('Add an event name, venue and a current or future date.'), { status: 400 });
  }
  const contactPhone = input?.contactPhone ? phoneOf(input.contactPhone) : '';
  if (contactPhone && !/^[6-9]\d{9}$/.test(contactPhone)) throw Object.assign(new Error('Enter a valid 10-digit contact phone number.'), { status: 400 });
  const image = String(input?.image || '').trim().slice(0, 2048);
  if (image && !/^https:\/\//i.test(image) && !image.startsWith('data:image/') && !/^\/api\/editorial\/images\/[0-9a-f-]{36}$/i.test(image)) throw Object.assign(new Error('Use an HTTPS image URL or a valid uploaded image.'), { status: 400 });
  const registrationUrl = registrationUrlOf(input?.registrationUrl, current.registrationUrl || '');
  return {
    ...current,
    title, venue, date: date.toISOString(), contactPhone, image, registrationUrl,
    location: String(input?.location || '').trim().slice(0, 120), time: String(input?.time || '').trim().slice(0, 20),
    category: String(input?.category || 'Community').trim().slice(0, 80), sector: String(input?.sector || '').trim().slice(0, 80),
    specialty: String(input?.specialty || '').trim().slice(0, 80), description: String(input?.description || '').trim().slice(0, 1200),
    ...(allowOrganizer ? { organizer: String(input?.organizer || '').trim().slice(0, 120) || current.organizer || '' } : {}),
  };
}

function updatedJobData(input, current) {
  const title = String(input?.title || '').trim().slice(0, 120);
  const companyName = String(input?.companyName || current.companyName || '').trim().slice(0, 120);
  const location = String(input?.location || '').trim().slice(0, 120);
  const description = String(input?.description || '').trim().slice(0, 5000);
  if (!title || !companyName || !location || !description) throw Object.assign(new Error('Add an opening title, company name, location and description.'), { status: 400 });
  const contactName = String(input?.contactName || '').trim().slice(0, 100);
  const contactPhone = input?.contactPhone ? phoneOf(input.contactPhone) : '';
  const contactEmail = emailOf(input?.contactEmail);
  if (contactPhone && !/^[6-9]\d{9}$/.test(contactPhone)) throw Object.assign(new Error('Enter a valid 10-digit contact phone number.'), { status: 400 });
  if (contactEmail && (!/^\S+@\S+\.\S+$/.test(contactEmail) || contactEmail.length > 254)) throw Object.assign(new Error('Enter a valid contact email.'), { status: 400 });
  const positions = Array.isArray(current.positions) && current.positions.length
    ? current.positions.map((position, index) => index ? position : { ...position, title, remarks: description, contactName: contactName || position.contactName || '', contactPhone: contactPhone || position.contactPhone || '' })
    : [{ title, experiences: [], remarks: description, contactName, contactPhone }];
  return {
    ...current, title, companyName, location, description, positions,
    requirements: String(input?.requirements || '').trim().slice(0, 3000),
    experience: String(input?.experience || '').trim().slice(0, 100), salary: String(input?.salary || '').trim().slice(0, 100),
    contactName, contactPhone, contactEmail,
    jobType: ['full-time', 'part-time', 'contract'].includes(input?.jobType) ? input.jobType : (current.jobType || 'full-time'),
  };
}

async function reviewHistory(db, contentType, ids) {
  if (!ids.length) return new Map();
  const [rows] = await db.query(`SELECT content_id, decision, reviewer_username, reason, reviewed_at
    FROM moderation_reviews WHERE content_type = ? AND content_id IN (${ids.map(() => '?').join(',')})
    ORDER BY reviewed_at DESC`, [contentType, ...ids]);
  const history = new Map();
  for (const row of rows) {
    if (!history.has(row.content_id)) history.set(row.content_id, []);
    history.get(row.content_id).push({ decision: row.decision, reviewerUsername: row.reviewer_username, reason: row.reason || '', reviewedAt: iso(row.reviewed_at) });
  }
  return history;
}

export async function seedSuperAdmin(db) {
  const email = emailOf(process.env.SUPER_ADMIN_EMAIL);
  const username = String(process.env.SUPER_ADMIN_USERNAME || email.split('@')[0] || '').trim();
  const password = process.env.SUPER_ADMIN_PASSWORD;
  if (!username || !password) {
    console.warn('[admin] Set SUPER_ADMIN_USERNAME and SUPER_ADMIN_PASSWORD to seed the first administrator.');
    return;
  }
  if (!/^[a-z0-9 ._-]{3,64}$/.test(adminUsernameOf(username))) throw new Error('SUPER_ADMIN_USERNAME must be 3–64 letters, numbers, spaces, dots, underscores, or hyphens.');
  if (password.length < 12) throw new Error('SUPER_ADMIN_PASSWORD must be at least 12 characters.');
  const [rows] = await db.execute('SELECT id, username FROM admin_users WHERE username = ? OR email = ? LIMIT 1', [username, email || null]);
  if (rows.length) {
    if (rows[0].username !== username) await db.execute('UPDATE admin_users SET username = ? WHERE id = ?', [username, rows[0].id]);
  } else {
    await db.execute("INSERT INTO admin_users (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, 'admin')", [randomUUID(), username, email || null, hashPassword(password)]);
  }
}

export async function seedReadOnlySuperAdmin(db) {
  const username = String(process.env.READ_ONLY_SUPER_ADMIN_USERNAME || '').trim();
  const password = process.env.READ_ONLY_SUPER_ADMIN_PASSWORD;
  if (!username || !password) return;
  if (!/^[a-z0-9 ._-]{3,64}$/.test(adminUsernameOf(username)) || password.length < 8) throw new Error('Read-only super admin requires a valid username and a password of at least 8 characters.');
  const [rows] = await db.execute('SELECT id, role FROM admin_users WHERE username = ? LIMIT 1', [username]);
  if (rows.length) {
    if (rows[0].role !== 'super_admin') throw new Error('The read-only super admin username is already used by an admin.');
    return;
  }
  await db.execute("INSERT INTO admin_users (id, username, password_hash, role) VALUES (?, ?, ?, 'super_admin')", [randomUUID(), username, hashPassword(password)]);
}

export function platformRoutes(db, { getExternalStats = () => ({}), verifyIdentity = verifyGoogleIdentity } = {}) {
  const router = express.Router();
  const personOnly = requireRole(db, 'person');
  const companyOnly = requireRole(db, 'company');
  const adminOnly = requireAdminRole(db, ['admin']);
  const anyAdmin = requireAdminRole(db, ['admin', 'super_admin']);
  const superAdminOnly = requireAdminRole(db, ['super_admin']);

  router.get('/editorial/images/:id', async (req, res) => {
    const [[image]] = await db.execute('SELECT mime_type, image FROM editorial_images WHERE id = ?', [req.params.id]);
    if (!image) return res.status(404).send('Image not found');
    res.set('X-Content-Type-Options', 'nosniff').set('Cache-Control', 'public, max-age=86400').type(image.mime_type).send(image.image);
  });

  router.get('/editorial/:id', async (req, res) => {
    const [[post]] = await db.execute('SELECT title, description, body, image_url, published_at FROM editorial_posts WHERE id = ?', [req.params.id]);
    if (!post) return res.status(404).type('text/plain').send('Article not found');
    const escape = (value) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    const title = escape(post.title);
    const paragraphs = String(post.body).split(/\n\s*\n/).map((paragraph) => `<p>${escape(paragraph).replace(/\n/g, '<br>')}</p>`).join('');
    const image = post.image_url ? `<img src="${escape(post.image_url)}" alt="" loading="lazy">` : '';
    res.set('Content-Security-Policy', "default-src 'none'; img-src 'self' https:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'");
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | Hapzo360</title><meta name="description" content="${escape(post.description)}"><style>body{margin:0;background:#f5f6f1;color:#142b23;font:18px/1.75 system-ui,sans-serif}main{max-width:760px;margin:auto;padding:48px 22px 100px}header{font-size:14px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#397455}h1{font-size:clamp(2.3rem,6vw,4rem);line-height:1.08;letter-spacing:-.05em}img{width:100%;max-height:440px;object-fit:cover;border-radius:18px}p{white-space:normal}p.lead{font-size:1.3rem;color:#496158}</style></head><body><main><header>Hapzo360 / Editorial</header><h1>${title}</h1><p class="lead">${escape(post.description)}</p>${image}<article>${paragraphs}</article></main></body></html>`);
  });

  router.get('/health/db', async (req, res) => { await db.query('SELECT 1'); res.json({ ok: true, database: process.env.DB_NAME || 'hapzo360' }); });

  router.post('/people/email-code', async (req, res) => {
    const email = emailOf(req.body?.email);
    const phone = phoneOf(req.body?.phone);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid email and WhatsApp number.');
    const transport = emailTransport();
    if (!transport) return fail(res, 503, 'Email delivery is not configured. Set the SMTP settings on the backend.');
    const [existing] = await db.execute('SELECT id FROM people WHERE email = ? OR phone = ? LIMIT 1', [email, phone]);
    if (existing.length) return fail(res, 409, 'An account already exists for this email or number.');
    const [previous] = await db.execute('SELECT sent_at FROM people_email_codes WHERE email = ?', [email]);
    if (previous.length && Date.now() - new Date(`${String(previous[0].sent_at).replace(' ', 'T')}Z`).getTime() < 60_000) return fail(res, 429, 'Wait a minute before requesting another code.');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM, to: email,
        subject: 'Your Hapzo360 verification code',
        text: `Your Hapzo360 signup code is ${code}. It expires in 3 minutes. If you did not request it, ignore this email.`,
      });
    } catch (error) {
      console.error('[people] verification email failed:', error.message);
      return fail(res, 502, 'Could not send the verification email. Please try again.');
    }
    await db.execute(`INSERT INTO people_email_codes (email, phone, code_hash, expires_at, sent_at, attempts)
      VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), 0)
      ON DUPLICATE KEY UPDATE phone = VALUES(phone), code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), sent_at = UTC_TIMESTAMP(3), attempts = 0`,
    [email, phone, hashPassword(code), mysqlDate(new Date(Date.now() + EMAIL_CODE_TTL_SECONDS * 1000))]);
    res.json({ ok: true, expiresInSeconds: EMAIL_CODE_TTL_SECONDS });
  });

  router.post('/people/register', async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const phone = phoneOf(req.body?.phone);
    const email = emailOf(req.body?.email);
    const code = String(req.body?.code || '');
    if (!name || name.length > 100 || !/^[6-9]\d{9}$/.test(phone) || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !/^\d{6}$/.test(code)) return fail(res, 400, 'Enter your name, email, WhatsApp number and 6-digit code.');
    const [codes] = await db.execute('SELECT * FROM people_email_codes WHERE email = ? AND phone = ? AND expires_at > UTC_TIMESTAMP(3)', [email, phone]);
    if (!codes.length) return fail(res, 400, 'This code expired or was not sent to this email and number.');
    if (codes[0].attempts >= 5) return fail(res, 429, 'Too many incorrect codes. Request a new code.');
    if (!verifyPassword(code, codes[0].code_hash)) {
      await db.execute('UPDATE people_email_codes SET attempts = attempts + 1 WHERE email = ?', [email]);
      return fail(res, 400, 'That code does not match.');
    }
    const [existing] = await db.execute('SELECT id FROM people WHERE phone = ? OR email = ? LIMIT 1', [phone, email]);
    if (existing.length) return fail(res, 409, 'An account already exists for this email or number.');
    const id = randomUUID();
    await db.execute('INSERT INTO people (id, name, phone, email, email_verified, phone_verified) VALUES (?, ?, ?, ?, TRUE, FALSE)', [id, name, phone, email]);
    await db.execute('DELETE FROM people_email_codes WHERE email = ?', [email]);
    await createSession(db, req, res, 'person', id);
    res.status(201).json({ person: { id, type: 'person', name, phone, email, emailVerified: true, phoneVerified: false, createdAt: now() } });
  });

  router.post('/people/login', async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM people WHERE phone = ?', [phoneOf(req.body?.phone)]);
    if (!rows.length) return fail(res, 401, 'No account found for this number.');
    await createSession(db, req, res, 'person', rows[0].id);
    res.json({ person: personPublic(rows[0]) });
  });

  router.post('/people/google', async (req, res) => {
    const identity = await verifyIdentity(req.body?.idToken);
    if (!identity) return fail(res, 401, 'Google sign-in could not be verified. Please try again.');
    const [matches] = await db.execute('SELECT * FROM people WHERE google_uid = ? OR email = ? LIMIT 2', [identity.uid, identity.email]);
    let person = matches.find((row) => row.google_uid === identity.uid);
    if (person && person.email !== identity.email) return fail(res, 409, 'This Google account is linked to a different email. Contact support.');
    if (!person) {
      person = matches.find((row) => row.email === identity.email);
      if (person) {
        if (person.google_uid && person.google_uid !== identity.uid) return fail(res, 409, 'This email is linked to another Google account.');
        if (!person.email_verified) return fail(res, 409, 'Verify your existing email before using Google sign-in.');
        await db.execute('UPDATE people SET google_uid = ? WHERE id = ? AND google_uid IS NULL', [identity.uid, person.id]);
      }
    }
    if (!person) {
      const phone = phoneOf(req.body?.phone);
      if (!phone) return res.json({ needsPhone: true, name: identity.name, email: identity.email });
      if (!/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid 10-digit WhatsApp number.');
      if (req.body?.termsAccepted !== true) return fail(res, 400, 'Accept the Terms & Conditions to create your account.');
      const [phoneMatch] = await db.execute('SELECT id FROM people WHERE phone = ? LIMIT 1', [phone]);
      if (phoneMatch.length) return fail(res, 409, 'This number already has an account. Sign in with your mobile number.');
      const id = randomUUID();
      try {
        await db.execute('INSERT INTO people (id, name, phone, email, email_verified, phone_verified, google_uid) VALUES (?, ?, ?, ?, TRUE, FALSE, ?)', [id, identity.name || identity.email.split('@')[0], phone, identity.email, identity.uid]);
      } catch (error) { if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'An account already exists for this email or number.'); throw error; }
      const [[created]] = await db.execute('SELECT * FROM people WHERE id = ?', [id]);
      person = created;
    }
    await createSession(db, req, res, 'person', person.id);
    res.json({ person: personPublic(person) });
  });

  router.get('/people/session', personOnly, async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM people WHERE id = ?', [req.accountId]);
    res.json({ person: personPublic(rows[0]) });
  });
  router.post('/people/logout', async (req, res) => { await clearSession(db, req, res, 'person'); res.json({ ok: true }); });

  router.get('/companies/exists', async (req, res) => res.json({ exists: Boolean(await companyByEmail(db, emailOf(req.query.email))) }));
  router.post('/companies/email-code', async (req, res) => {
    const email = emailOf(req.body?.email);
    const phone = phoneOf(req.body?.phone);
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a valid company email and WhatsApp number.');
    const transport = emailTransport();
    if (!transport) return fail(res, 503, 'Email delivery is not configured. Set the SMTP settings on the backend.');
    if (await companyByEmail(db, email)) return fail(res, 409, 'A company account already exists for this email.');
    const [previous] = await db.execute('SELECT sent_at FROM company_email_codes WHERE email = ?', [email]);
    if (previous.length && Date.now() - new Date(`${String(previous[0].sent_at).replace(' ', 'T')}Z`).getTime() < 60_000) return fail(res, 429, 'Wait a minute before requesting another code.');
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    try {
      await transport.sendMail({
        from: process.env.SMTP_FROM, to: email,
        subject: 'Your Hapzo360 company verification code',
        text: `Your Hapzo360 company signup code is ${code}. It expires in 3 minutes. If you did not request it, ignore this email.`,
      });
    } catch (error) {
      console.error('[companies] verification email failed:', error.message);
      return fail(res, 502, 'Could not send the verification email. Please try again.');
    }
    await db.execute(`INSERT INTO company_email_codes (email, phone, code_hash, expires_at, sent_at, attempts, verified_token_hash)
      VALUES (?, ?, ?, ?, UTC_TIMESTAMP(3), 0, NULL)
      ON DUPLICATE KEY UPDATE phone = VALUES(phone), code_hash = VALUES(code_hash), expires_at = VALUES(expires_at), sent_at = UTC_TIMESTAMP(3), attempts = 0, verified_token_hash = NULL`,
    [email, phone, hashPassword(code), mysqlDate(new Date(Date.now() + EMAIL_CODE_TTL_SECONDS * 1000))]);
    res.json({ ok: true, expiresInSeconds: EMAIL_CODE_TTL_SECONDS });
  });
  router.post('/companies/verify-email-code', async (req, res) => {
    const email = emailOf(req.body?.email);
    const phone = phoneOf(req.body?.phone);
    const code = String(req.body?.code || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || !/^[6-9]\d{9}$/.test(phone) || !/^\d{6}$/.test(code)) return fail(res, 400, 'Enter the 6-digit code from your email.');
    const [codes] = await db.execute('SELECT * FROM company_email_codes WHERE email = ? AND phone = ? AND expires_at > UTC_TIMESTAMP(3)', [email, phone]);
    if (!codes.length) return fail(res, 400, 'This code expired or was not sent to this email and number.');
    if (codes[0].attempts >= 5) return fail(res, 429, 'Too many incorrect codes. Request a new code.');
    if (!verifyPassword(code, codes[0].code_hash)) {
      await db.execute('UPDATE company_email_codes SET attempts = attempts + 1 WHERE email = ?', [email]);
      return fail(res, 400, 'That code does not match.');
    }
    const verificationToken = randomBytes(32).toString('hex');
    await db.execute('UPDATE company_email_codes SET verified_token_hash = ?, expires_at = DATE_ADD(UTC_TIMESTAMP(3), INTERVAL 30 MINUTE) WHERE email = ?', [tokenHash(verificationToken), email]);
    res.json({ verificationToken });
  });
  router.post('/companies/register', async (req, res) => {
    const email = emailOf(req.body?.email);
    const password = String(req.body?.password || '');
    const profile = req.body?.profile || {};
    const companyName = String(profile.companyName || '').trim();
    const phone = phoneOf(profile.phone);
    const businessRegistrationNumber = String(profile.businessRegistrationNumber || profile.gstNumber || profile.msmeNumber || '').trim().toUpperCase().slice(0, 30);
    const verificationToken = String(req.body?.verificationToken || '');
    if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return fail(res, 400, 'Enter a valid email and a password of at least 6 characters.');
    if (profile.companyName && (!companyName || !/^[6-9]\d{9}$/.test(phone))) return fail(res, 400, 'Enter valid company information and WhatsApp number.');
    if (!companyName || !/^[6-9]\d{9}$/.test(phone) || !/^[0-9a-f]{64}$/.test(verificationToken)) return fail(res, 400, 'Verify your company email before registering.');
    if (!businessRegistrationNumber) return fail(res, 400, 'Enter your GST or NSME registration number.');
    if (req.body?.termsAccepted !== true) return fail(res, 400, 'Accept the Terms & Conditions to create your company account.');
    const [codes] = await db.execute('SELECT verified_token_hash FROM company_email_codes WHERE email = ? AND phone = ? AND expires_at > UTC_TIMESTAMP(3)', [email, phone]);
    if (!codes.length || codes[0].verified_token_hash !== tokenHash(verificationToken)) return fail(res, 400, 'Email verification expired. Request a new code.');
    if (await companyByEmail(db, email)) return fail(res, 409, 'A company account already exists for this email.');
    const id = randomUUID();
    await db.execute('INSERT INTO companies (id, email, password_hash, company_name, phone, email_verified, phone_verified, profile_json) VALUES (?, ?, ?, ?, ?, TRUE, FALSE, ?)', [id, email, hashPassword(password), companyName, phone, JSON.stringify({ ...profile, companyName, phone, businessRegistrationNumber, phoneVerified: false })]);
    await db.execute('DELETE FROM company_email_codes WHERE email = ?', [email]);
    await createSession(db, req, res, 'company', id);
    res.status(201).json({ company: companyPublic(await companyById(db, id)) });
  });
  router.post('/companies/login', async (req, res) => {
    const company = await companyByEmail(db, emailOf(req.body?.email));
    if (!company || !verifyPassword(String(req.body?.password || ''), company.password_hash)) return fail(res, 401, 'Incorrect email or password.');
    await createSession(db, req, res, 'company', company.id);
    res.json({ company: companyPublic(company) });
  });
  router.post('/companies/google', async (req, res) => {
    const identity = await verifyIdentity(req.body?.idToken);
    if (!identity) return fail(res, 401, 'Google sign-in could not be verified. Please try again.');
    const [matches] = await db.execute('SELECT * FROM companies WHERE google_uid = ? OR email = ? LIMIT 2', [identity.uid, identity.email]);
    let company = matches.find((row) => row.google_uid === identity.uid);
    if (company && company.email !== identity.email) return fail(res, 409, 'This Google account is linked to a different email. Contact support.');
    if (!company) {
      company = matches.find((row) => row.email === identity.email);
      if (company) {
        if (company.google_uid && company.google_uid !== identity.uid) return fail(res, 409, 'This email is linked to another Google account.');
        if (!company.email_verified) return fail(res, 409, 'Verify your existing company email before using Google sign-in.');
        await db.execute('UPDATE companies SET google_uid = ? WHERE id = ? AND google_uid IS NULL', [identity.uid, company.id]);
      }
    }
    if (!company) {
      const profile = req.body?.profile;
      if (!profile) return res.json({ needsProfile: true, name: identity.name, email: identity.email });
      const companyName = String(profile.companyName || '').trim().slice(0, 120);
      const phone = phoneOf(profile.phone);
      const businessRegistrationNumber = String(profile.businessRegistrationNumber || profile.gstNumber || profile.msmeNumber || '').trim().toUpperCase().slice(0, 30);
      const password = String(req.body?.password || '');
      if (!companyName || !/^[6-9]\d{9}$/.test(phone) || password.length < 6) return fail(res, 400, 'Add a company name, WhatsApp number and password of at least 6 characters.');
      if (!businessRegistrationNumber) return fail(res, 400, 'Enter your GST or NSME registration number.');
      if (req.body?.termsAccepted !== true) return fail(res, 400, 'Accept the Terms & Conditions to create your company account.');
      const id = randomUUID();
      const safeProfile = { companyName, phone, businessRegistrationNumber, industry: String(profile.industry || '').trim().slice(0, 100), location: String(profile.location || '').trim().slice(0, 100), contactPerson: String(profile.contactPerson || '').trim().slice(0, 100), contactDesignation: String(profile.contactDesignation || '').trim().slice(0, 100), website: String(profile.website || '').trim().slice(0, 500), phoneVerified: false };
      if (!safeProfile.industry || !safeProfile.location || !safeProfile.contactPerson) return fail(res, 400, 'Complete your company name, industry, contact person and location.');
      try {
        await db.execute('INSERT INTO companies (id, email, password_hash, company_name, phone, email_verified, phone_verified, google_uid, profile_json) VALUES (?, ?, ?, ?, ?, TRUE, FALSE, ?, ?)', [id, identity.email, hashPassword(password), companyName, phone, identity.uid, JSON.stringify(safeProfile)]);
      } catch (error) { if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'A company account already exists for this email.'); throw error; }
      company = await companyById(db, id);
    }
    await createSession(db, req, res, 'company', company.id);
    res.json({ company: companyPublic(company) });
  });
  router.get('/companies/me', companyOnly, async (req, res) => res.json({ company: companyPublic(await companyById(db, req.accountId)) }));
  router.put('/companies/me', companyOnly, async (req, res) => {
    const profile = req.body || {};
    const companyName = String(profile.companyName || '').trim();
    const phone = phoneOf(profile.phone);
    if (!companyName || companyName.length > 120 || !/^[6-9]\d{9}$/.test(phone)) return fail(res, 400, 'Enter a company name and valid phone number.');
    const existing = await companyById(db, req.accountId);
    if (!existing) return fail(res, 401, 'Company account not found.');
    const savedProfile = existing.profile_json ? parseJson(existing.profile_json) : {};
    const safe = { companyName, phone, businessRegistrationNumber: String(profile.businessRegistrationNumber ?? savedProfile.businessRegistrationNumber ?? savedProfile.gstNumber ?? savedProfile.msmeNumber ?? '').trim().toUpperCase().slice(0, 30), industry: String(profile.industry || '').trim(), location: String(profile.location || '').trim(), contactPerson: String(profile.contactPerson || '').trim(), contactDesignation: String(profile.contactDesignation || '').trim(), website: String(profile.website || '').trim() };
    await db.execute('UPDATE companies SET company_name = ?, phone = ?, phone_verified = ?, profile_json = ? WHERE id = ?', [companyName, phone, Boolean(profile.phoneVerified), JSON.stringify(safe), req.accountId]);
    res.json({ company: companyPublic(await companyById(db, req.accountId)) });
  });
  router.post('/companies/logout', async (req, res) => { await clearSession(db, req, res, 'company'); res.json({ ok: true }); });

  router.get('/jobs', async (req, res) => {
    const [rows] = await db.execute("SELECT * FROM jobs WHERE status = 'active' AND expires_at > UTC_TIMESTAMP(3) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 500");
    res.json({ jobs: rows.map(jobPublic) });
  });
  router.get('/jobs/expired', companyOnly, async (req, res) => {
    const [rows] = await db.execute("SELECT * FROM jobs WHERE company_id = ? AND deleted_at IS NULL AND (status = 'expired' OR expires_at <= UTC_TIMESTAMP(3)) ORDER BY created_at DESC", [req.accountId]);
    res.json({ jobs: rows.map(jobOwner) });
  });
  router.get('/jobs/mine', companyOnly, async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM jobs WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100', [req.accountId]);
    res.json({ jobs: rows.map(jobOwner) });
  });
  router.get('/jobs/posting-fee', companyOnly, async (req, res) => {
    const company = await companyById(db, req.accountId);
    res.json({ amount: Number(company?.jobs_posted || 0) === 0 ? 1500 : 500 });
  });

  router.post('/payments/demo', companyOnly, async (req, res) => {
    const kind = req.body?.kind === 'job-reactivation' ? 'job-reactivation' : 'job-posting';
    const amount = Number(req.body?.amount);
    const company = await companyById(db, req.accountId);
    const expected = kind === 'job-reactivation' ? 100 : (Number(company.jobs_posted) === 0 ? 1500 : 500);
    if (amount !== expected) return fail(res, 400, `Expected demo payment amount is ₹${expected}.`);
    const id = randomUUID();
    await db.execute('INSERT INTO payments (id, company_id, kind, amount, status) VALUES (?, ?, ?, ?, ?)', [id, req.accountId, kind, amount, 'paid']);
    res.status(201).json({ payment: { id, amount, status: 'paid', paidAt: now() } });
  });

  router.post('/jobs', companyOnly, async (req, res) => {
    const job = req.body?.job;
    const paymentId = req.body?.paymentId;
    if (!job?.title?.trim() || !job?.location?.trim()) return fail(res, 400, 'Job title and location are required.');
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[company]] = await connection.execute('SELECT * FROM companies WHERE id = ? FOR UPDATE', [req.accountId]);
      if (!company?.company_name) { await connection.rollback(); return fail(res, 400, 'Complete your company profile first.'); }
      const expected = Number(company.jobs_posted) === 0 ? 1500 : 500;
      const [paid] = await connection.execute("UPDATE payments SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND company_id = ? AND kind = 'job-posting' AND status = 'paid' AND amount = ? AND used_at IS NULL", [paymentId, req.accountId, expected]);
      if (!paid.affectedRows) { await connection.rollback(); return fail(res, 402, 'A valid demo payment is required.'); }
      const id = randomUUID();
      const createdAt = now();
      const expiryDays = Number(job.expiryDays) || 3;
      const expiresAt = jobExpiry(createdAt, expiryDays);
      const data = { ...job, companyName: company.company_name, contactEmail: company.email, contactPhone: company.phone, expiryDays };
      await connection.execute("INSERT INTO jobs (id, company_id, data_json, status, expires_at) VALUES (?, ?, ?, 'pending', ?)", [id, req.accountId, JSON.stringify(data), mysqlDate(expiresAt)]);
      await connection.execute('UPDATE companies SET jobs_posted = jobs_posted + 1 WHERE id = ?', [req.accountId]);
      await connection.commit();
      res.status(201).json({ job: { ...data, id, companyId: req.accountId, createdAt, expiresAt: expiresAt.toISOString(), status: 'pending' } });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  });

  router.delete('/jobs/:id', companyOnly, async (req, res) => {
    const [result] = await db.execute('UPDATE jobs SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ? AND company_id = ? AND expires_at <= UTC_TIMESTAMP(3) AND deleted_at IS NULL', [req.params.id, req.accountId]);
    if (!result.affectedRows) return fail(res, 404, 'This expired job could not be removed.');
    res.json({ ok: true });
  });
  router.post('/jobs/:id/reactivate', companyOnly, async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[job]] = await connection.execute('SELECT * FROM jobs WHERE id = ? AND company_id = ? FOR UPDATE', [req.params.id, req.accountId]);
      if (!job || job.deleted_at || new Date(iso(job.expires_at)).getTime() > Date.now()) { await connection.rollback(); return fail(res, 404, 'This expired job could not be reactivated.'); }
      const [paid] = await connection.execute("UPDATE payments SET used_at = UTC_TIMESTAMP(3) WHERE id = ? AND company_id = ? AND kind = 'job-reactivation' AND status = 'paid' AND amount = 100 AND used_at IS NULL", [req.body?.paymentId, req.accountId]);
      if (!paid.affectedRows) { await connection.rollback(); return fail(res, 402, 'A valid demo reactivation payment is required.'); }
      const renewedAt = now();
      const expiresAt = jobExpiry(renewedAt, parseJson(job.data_json).expiryDays);
      await connection.execute("UPDATE jobs SET status = 'pending', renewed_at = ?, expires_at = ?, reviewed_at = NULL, reviewed_by = NULL, rejection_reason = NULL WHERE id = ?", [mysqlDate(renewedAt), mysqlDate(expiresAt), job.id]);
      await connection.commit();
      res.json({ job: { ...jobOwner(job), status: 'pending', renewedAt, expiresAt: expiresAt.toISOString() } });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  });

  router.post('/applications', personOnly, async (req, res) => {
    const [[job]] = await db.execute("SELECT * FROM jobs WHERE id = ? AND status = 'active' AND expires_at > UTC_TIMESTAMP(3) AND deleted_at IS NULL", [req.body?.jobId]);
    if (!job) return fail(res, 404, 'This job is no longer accepting applications.');
    try {
      await db.execute('INSERT INTO applications (id, job_id, person_id) VALUES (?, ?, ?)', [randomUUID(), job.id, req.accountId]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'You have already applied for this job.');
      throw error;
    }
    const saved = parseJson(job.data_json);
    const position = saved.positions?.[0] || {};
    res.status(201).json({ contactName: position.contactName || saved.contactName || '', contactPhone: position.contactPhone || saved.contactPhone || '' });
  });

  router.get('/events', async (req, res) => {
    const [rows] = await db.execute("SELECT e.*, (SELECT COUNT(*) FROM event_registrations r WHERE BINARY r.event_id = BINARY e.id) + (SELECT COUNT(*) FROM event_external_registrations er WHERE BINARY er.event_id = BINARY e.id) AS registered_count FROM events e WHERE e.status = 'approved' AND e.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 500");
    res.json({ events: rows.map((row) => ({ ...parseJson(row.data_json), id: row.id, registeredCount: Number(row.registered_count) })) });
  });
  router.post('/events', companyOnly, async (req, res) => {
    const event = req.body?.event || {};
    if (!event.title?.trim() || !event.date || !event.venue?.trim()) return fail(res, 400, 'Event name, date and venue are required.');
    if (new Date(event.date).getTime() < Date.now() - 86_400_000) return fail(res, 400, 'Choose today or a future date.');
    let registrationUrl;
    try { registrationUrl = registrationUrlOf(event.registrationUrl); }
    catch (error) { return fail(res, error.status || 400, error.message); }
    const id = `happening-${randomUUID()}`;
    const company = await companyById(db, req.accountId);
    const data = { ...event, registrationUrl, id, organizer: company.company_name, organizerId: company.id, source: 'Community', createdByUser: true, registeredCount: 0 };
    await db.execute("INSERT INTO events (id, company_id, data_json, status) VALUES (?, ?, ?, 'pending')", [id, req.accountId, JSON.stringify(data)]);
    res.status(201).json({ event: { ...data, status: 'pending' } });
  });
  router.get('/events/mine', companyOnly, async (req, res) => {
    const [rows] = await db.execute('SELECT * FROM events WHERE company_id = ? AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 100', [req.accountId]);
    res.json({ events: rows.map(eventOwner) });
  });
  router.patch('/events/:id', companyOnly, async (req, res) => {
    const [[event]] = await db.execute('SELECT * FROM events WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [req.params.id, req.accountId]);
    if (!event) return fail(res, 404, 'This happening was not found for your company.');
    let data;
    try { data = updatedEventData(req.body?.event, parseJson(event.data_json)); }
    catch (error) { return fail(res, error.status || 400, error.message); }
    await db.execute("UPDATE events SET data_json = ?, status = 'pending', reviewed_at = NULL, reviewed_by = NULL, rejection_reason = NULL WHERE id = ?", [JSON.stringify(data), event.id]);
    res.json({ event: { ...eventOwner(event), ...data, status: 'pending', reviewedAt: null, rejectionReason: '' } });
  });
  router.delete('/events/:id', companyOnly, async (req, res) => {
    const [result] = await db.execute('UPDATE events SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ? AND company_id = ? AND deleted_at IS NULL', [req.params.id, req.accountId]);
    if (!result.affectedRows) return fail(res, 404, 'This happening was not found for your company.');
    res.json({ ok: true });
  });
  router.put('/events/:id/clip', companyOnly, express.raw({ type: 'application/octet-stream', limit: '8mb' }), async (req, res) => {
    const [[event]] = await db.execute('SELECT id FROM events WHERE id = ? AND company_id = ?', [req.params.id, req.accountId]);
    if (!event) return fail(res, 404, 'Event not found for this company.');
    if (!Buffer.isBuffer(req.body) || !req.body.length) return fail(res, 400, 'A video clip is required.');
    const mime = String(req.query.mime || 'video/webm').slice(0, 80);
    if (!['video/webm', 'video/mp4'].includes(mime)) return fail(res, 400, 'Unsupported video format.');
    await db.execute('INSERT INTO event_clips (event_id, mime_type, clip) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE mime_type = VALUES(mime_type), clip = VALUES(clip)', [event.id, mime, req.body]);
    res.json({ ok: true });
  });
  router.get('/events/:id/clip', companyOnly, async (req, res) => {
    const [[clip]] = await db.execute('SELECT c.mime_type, c.clip FROM event_clips c JOIN events e ON e.id = c.event_id WHERE e.id = ? AND e.company_id = ?', [req.params.id, req.accountId]);
    if (!clip) return fail(res, 404, 'Verification clip not found.');
    res.type(clip.mime_type).set('Cache-Control', 'private, no-store').send(clip.clip);
  });
  router.get('/events/registrations/me', personOnly, async (req, res) => {
    const [rows] = await db.execute('SELECT event_id, event_title, created_at FROM event_registrations WHERE person_id = ? ORDER BY created_at DESC', [req.accountId]);
    res.json({ registrations: rows.map((row) => ({ eventId: row.event_id, eventTitle: row.event_title, registeredAt: iso(row.created_at) })) });
  });
  router.post('/events/:id/external-registration', async (req, res) => {
    const attendeeEmail = String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
    const attendeePhone = phoneOf(req.body?.phone);
    const password = String(req.body?.password || '');
    if (!/^\S+@\S+\.\S+$/.test(attendeeEmail)) return fail(res, 400, 'Enter a valid email address.');
    if (!/^[6-9]\d{9}$/.test(attendeePhone)) return fail(res, 400, 'Enter a valid 10-digit WhatsApp number.');
    if (password.length < 6) return fail(res, 400, 'Create a password with at least 6 characters.');
    const [[event]] = await db.execute("SELECT id, data_json FROM events WHERE id = ? AND status = 'approved' AND deleted_at IS NULL", [req.params.id]);
    if (!event) return fail(res, 404, 'This event is not open for registration.');
    const eventData = parseJson(event.data_json);
    const registrationUrl = registrationUrlOf(eventData.registrationUrl);
    if (!registrationUrl) return fail(res, 400, 'The organiser has not added a registration link for this event.');
    const personId = await findSession(db, req, 'person');
    const passwordHash = hashPassword(password);
    if (personId) {
      await db.execute('INSERT INTO event_registration_profiles (person_id, email, phone, password_hash) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), phone = VALUES(phone), password_hash = VALUES(password_hash), updated_at = CURRENT_TIMESTAMP(3)', [personId, attendeeEmail, attendeePhone, passwordHash]);
    }
    await db.execute('INSERT INTO event_external_registrations (id, event_id, event_key, event_title, person_id, attendee_email, attendee_phone, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE person_id = VALUES(person_id), attendee_phone = VALUES(attendee_phone), password_hash = VALUES(password_hash), created_at = CURRENT_TIMESTAMP(3)', [randomUUID(), event.id, tokenHash(event.id), String(eventData.title || eventData.name || 'Event').slice(0, 255), personId, attendeeEmail, attendeePhone, passwordHash]);
    res.status(201).json({ ok: true, registrationUrl });
  });
  router.post('/events/:id/external-registration/continue', personOnly, async (req, res) => {
    const [[event]] = await db.execute("SELECT id, data_json FROM events WHERE id = ? AND status = 'approved' AND deleted_at IS NULL", [req.params.id]);
    if (!event) return fail(res, 404, 'This event is not open for registration.');
    const [[profile]] = await db.execute('SELECT email, phone, password_hash FROM event_registration_profiles WHERE person_id = ?', [req.accountId]);
    if (!profile) return fail(res, 409, 'Complete event registration details first.');
    const eventData = parseJson(event.data_json);
    const registrationUrl = registrationUrlOf(eventData.registrationUrl);
    if (!registrationUrl) return fail(res, 400, 'The organiser has not added a registration link for this event.');
    await db.execute('INSERT INTO event_external_registrations (id, event_id, event_key, event_title, person_id, attendee_email, attendee_phone, password_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE person_id = VALUES(person_id), attendee_phone = VALUES(attendee_phone), password_hash = VALUES(password_hash), created_at = CURRENT_TIMESTAMP(3)', [randomUUID(), event.id, tokenHash(event.id), String(eventData.title || eventData.name || 'Event').slice(0, 255), req.accountId, profile.email, profile.phone, profile.password_hash]);
    res.json({ ok: true, registrationUrl });
  });
  router.post('/events/:id/register', personOnly, async (req, res) => {
    const title = String(req.body?.eventTitle || '').trim().slice(0, 255);
    if (!title) return fail(res, 400, 'Event title is required.');
    try {
      if (req.params.id.startsWith('happening-')) {
        const [[event]] = await db.execute("SELECT id FROM events WHERE id = ? AND status = 'approved' AND deleted_at IS NULL", [req.params.id]);
        if (!event) return fail(res, 404, 'This event is not open for registration.');
      }
      await db.execute('INSERT INTO event_registrations (id, event_id, event_key, event_title, person_id) VALUES (?, ?, ?, ?, ?)', [randomUUID(), req.params.id, tokenHash(req.params.id), title, req.accountId]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'You are already registered for this event.');
      throw error;
    }
    res.status(201).json({ ok: true });
  });

  router.post('/admin/login', async (req, res) => {
    const username = adminUsernameOf(req.body?.username);
    const [rows] = await db.execute('SELECT * FROM admin_users WHERE username = ?', [username]);
    const admin = rows[0];
    if (!admin || !verifyPassword(String(req.body?.password || ''), admin.password_hash)) {
      return fail(res, 401, 'Incorrect username or password.');
    }
    await createSession(db, req, res, 'super_admin', admin.id);
    res.json({ role: admin.role, username: adminDisplayUsername(admin) });
  });
  router.get('/admin/session', async (req, res) => {
    const id = await findSession(db, req, 'super_admin');
    if (!id) return res.json({ authenticated: false });
    const [[admin]] = await db.execute('SELECT username, role FROM admin_users WHERE id = ?', [id]);
    if (!admin || !['admin', 'super_admin'].includes(admin.role)) return res.json({ authenticated: false });
    res.json({ authenticated: true, role: admin.role, username: adminDisplayUsername(admin) });
  });
  router.post('/admin/logout', async (req, res) => { await clearSession(db, req, res, 'super_admin'); res.json({ ok: true }); });
  router.get('/admin/activity', superAdminOnly, async (req, res) => {
    const [adminRows] = await db.query(`SELECT id, username FROM admin_users WHERE role = 'admin'
      ORDER BY CASE LOWER(username)
        WHEN 'raghul gowtham' THEN 0
        WHEN 'navaneethan' THEN 1
        WHEN 'karpagham' THEN 2
        WHEN 'senthamil selvi' THEN 3
        WHEN 'girju ramalingam' THEN 4
        ELSE 5
      END, username`);
    const admins = adminRows.map((row) => ({ id: row.id, username: row.username,
      posted: { openings: 0, happenings: 0, trends: 0, technologies: 0 },
      reviews: { approved: 0, rejected: 0 }, recent: [] }));
    const byId = new Map(admins.map((admin) => [admin.id, admin]));
    const [jobRows, eventRows, storyRows, reviewRows, publishedJobRows, publishedEventRows, publishedStoryRows] = await Promise.all([
      db.query('SELECT id, created_by_admin AS admin_id, data_json, created_at, deleted_at FROM jobs WHERE created_by_admin IS NOT NULL'),
      db.query('SELECT id, created_by_admin AS admin_id, data_json, created_at, deleted_at FROM events WHERE created_by_admin IS NOT NULL'),
      db.query('SELECT id, author_id AS admin_id, domain, title, published_at AS created_at FROM editorial_posts WHERE author_id IS NOT NULL'),
      db.query(`SELECT m.reviewer_id AS admin_id, m.content_type, m.content_id, m.decision, m.reason,
        m.reviewed_at AS created_at, m.reviewer_username,
        COALESCE(j.data_json, e.data_json) AS data_json,
        COALESCE(j.created_at, e.created_at) AS submitted_at,
        c.company_name, c.email AS company_email, c.phone AS company_phone
        FROM moderation_reviews m
        LEFT JOIN jobs j ON m.content_type = 'job' AND m.content_id = j.id
        LEFT JOIN events e ON m.content_type = 'event' AND m.content_id = e.id
        LEFT JOIN companies c ON c.id = COALESCE(j.company_id, e.company_id)
        WHERE (m.content_type = 'job' AND j.company_id IS NOT NULL)
           OR (m.content_type = 'event' AND e.company_id IS NOT NULL)`),
      db.query(`SELECT j.id, j.data_json, j.created_at, j.reviewed_at, j.status, j.company_id, j.created_by_admin,
        c.company_name, c.email AS company_email, c.phone AS company_phone,
        creator.username AS creator_username, reviewer.username AS reviewer_username
        FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
        LEFT JOIN admin_users creator ON creator.id = j.created_by_admin
        LEFT JOIN admin_users reviewer ON reviewer.id = j.reviewed_by
        WHERE j.status = 'active' AND j.deleted_at IS NULL ORDER BY COALESCE(j.reviewed_at, j.created_at) DESC`),
      db.query(`SELECT e.id, e.data_json, e.created_at, e.reviewed_at, e.status, e.company_id, e.created_by_admin,
        c.company_name, c.email AS company_email, c.phone AS company_phone,
        creator.username AS creator_username, reviewer.username AS reviewer_username
        FROM events e LEFT JOIN companies c ON c.id = e.company_id
        LEFT JOIN admin_users creator ON creator.id = e.created_by_admin
        LEFT JOIN admin_users reviewer ON reviewer.id = e.reviewed_by
        WHERE e.status = 'approved' AND e.deleted_at IS NULL ORDER BY COALESCE(e.reviewed_at, e.created_at) DESC`),
      db.query(`SELECT p.id, p.domain, p.title, p.description, p.body, p.image_url, p.published_at,
        author.username AS creator_username
        FROM editorial_posts p LEFT JOIN admin_users author ON author.id = p.author_id
        ORDER BY p.published_at DESC`),
    ]).then((results) => results.map(([rows]) => rows));
    const addRecent = (admin, action, title, date, detail = '') => admin.recent.push({ action, title, date: iso(date), detail });
    for (const row of jobRows) {
      const admin = byId.get(row.admin_id); if (!admin) continue;
      admin.posted.openings += 1;
      addRecent(admin, 'Posted opening', parseJson(row.data_json)?.title || 'Untitled opening', row.created_at, row.deleted_at ? 'Removed' : '');
    }
    for (const row of eventRows) {
      const admin = byId.get(row.admin_id); if (!admin) continue;
      admin.posted.happenings += 1;
      addRecent(admin, 'Posted happening', parseJson(row.data_json)?.title || 'Untitled happening', row.created_at, row.deleted_at ? 'Removed' : '');
    }
    for (const row of storyRows) {
      const admin = byId.get(row.admin_id); if (!admin) continue;
      const category = row.domain === 'technology' ? 'technologies' : 'trends';
      admin.posted[category] += 1;
      addRecent(admin, category === 'trends' ? 'Published trend' : 'Published technology', row.title, row.created_at);
    }
    for (const row of reviewRows) {
      const admin = byId.get(row.admin_id); if (!admin) continue;
      admin.reviews[row.decision === 'reject' ? 'rejected' : 'approved'] += 1;
      addRecent(admin, row.decision === 'reject' ? 'Rejected' : 'Approved', parseJson(row.data_json)?.title || 'Untitled submission', row.created_at, row.content_type === 'job' ? 'Opening' : 'Happening');
    }
    const toPublishedListing = (row, type) => {
      const details = parseJson(row.data_json) || {};
      return {
        id: row.id, type, title: details.title || details.position || details.name || (type === 'Opening' ? 'Untitled opening' : 'Untitled happening'),
        companyName: row.company_name || details.companyName || details.company || '',
        submittedBy: row.company_id ? (row.company_name || 'Company') : (row.creator_username || 'Hapzo360 admin'),
        submitterEmail: row.company_email || '', submitterPhone: row.company_phone || '',
        publishedBy: row.reviewer_username || row.creator_username || 'Hapzo360',
        createdAt: iso(row.created_at), publishedAt: iso(row.reviewed_at || row.created_at), status: row.status,
        location: details.location || details.city || details.venue || '',
        description: details.description || details.remarks || '', details,
      };
    };
    const publishedItems = [
      ...publishedJobRows.map((row) => toPublishedListing(row, 'Opening')),
      ...publishedEventRows.map((row) => toPublishedListing(row, 'Happening')),
      ...publishedStoryRows.map((row) => ({
        id: row.id, type: row.domain === 'technology' ? 'Technology story' : 'Trend story',
        title: row.title, description: row.description || '', body: row.body || '', imageUrl: row.image_url || '',
        submittedBy: row.creator_username || 'Hapzo360 admin', publishedBy: row.creator_username || 'Hapzo360 admin',
        createdAt: iso(row.published_at), publishedAt: iso(row.published_at), status: 'published',
      })),
    ].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const submissions = {
      approved: reviewRows.filter((row) => row.decision === 'approve').map((row) => ({
        id: row.content_id, type: row.content_type === 'job' ? 'Opening' : 'Happening',
        title: parseJson(row.data_json)?.title || 'Untitled submission', companyName: row.company_name || 'Company',
        companyEmail: row.company_email || '', companyPhone: row.company_phone || '',
        submittedAt: iso(row.submitted_at), reviewedAt: iso(row.created_at), reviewedBy: row.reviewer_username,
        details: parseJson(row.data_json) || {},
      })),
      rejected: reviewRows.filter((row) => row.decision === 'reject').map((row) => ({
        id: row.content_id, type: row.content_type === 'job' ? 'Opening' : 'Happening',
        title: parseJson(row.data_json)?.title || 'Untitled submission', companyName: row.company_name || 'Company',
        companyEmail: row.company_email || '', companyPhone: row.company_phone || '',
        submittedAt: iso(row.submitted_at), reviewedAt: iso(row.created_at), reviewedBy: row.reviewer_username,
        reason: row.reason || '', details: parseJson(row.data_json) || {},
      })),
    };
    for (const admin of admins) admin.recent = admin.recent.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);
    const totals = admins.reduce((sum, admin) => ({
      posted: sum.posted + Object.values(admin.posted).reduce((count, value) => count + value, 0),
      approved: sum.approved + admin.reviews.approved, rejected: sum.rejected + admin.reviews.rejected,
    }), { posted: 0, approved: 0, rejected: 0 });
    res.json({ detailsVersion: 1, admins, totals: { ...totals, posted: publishedItems.length }, publishedItems, submissions });
  });
  router.post('/admin/jobs', anyAdmin, async (req, res) => {
    const input = req.body || {};
    const entries = Array.isArray(input.jobs) ? input.jobs : [input];
    if (!entries.length || entries.length > 10) return fail(res, 400, 'Add between 1 and 10 positions.');
    const companyName = String(input.companyName || entries[0]?.companyName || '').trim().slice(0, 120);
    const location = String(input.location || entries[0]?.location || '').trim().slice(0, 120);
    if (!companyName || !location) return fail(res, 400, 'Add a company name and location.');
    const normalized = [];
    for (const entry of entries) {
      const title = String(entry?.title || '').trim().slice(0, 120);
      const position = Array.isArray(entry?.positions) ? entry.positions[0] : null;
      const contactName = String(position?.contactName || entry?.contactName || '').trim().slice(0, 100);
      const contactPhone = phoneOf(position?.contactPhone || entry?.contactPhone);
      const contactEmail = emailOf(entry?.contactEmail || input.contactEmail);
      const description = String(entry?.description || '').trim().slice(0, 5000);
      const requirements = String(entry?.requirements || '').trim().slice(0, 3000);
      const experience = String(entry?.experience || '').trim().slice(0, 100);
      const salaryInput = String(entry?.salary || '').trim().slice(0, 100);
      if (!title || !description || !contactName || !/^[6-9]\d{9}$/.test(contactPhone)) return fail(res, 400, 'Each position needs a title, remarks, contact person and valid 10-digit contact number.');
      if (contactEmail && (!/^\S+@\S+\.\S+$/.test(contactEmail) || contactEmail.length > 254)) return fail(res, 400, 'Enter a valid contact email.');
      const salary = salaryInput && !salaryInput.includes('₹') ? `₹${salaryInput}` : salaryInput;
      const experiences = Array.isArray(position?.experiences) ? position.experiences.slice(0, 20).map((level) => ({
        level: String(level?.level || '').trim().slice(0, 40),
        count: Math.max(1, Math.min(999, Number(level?.count) || 1)),
        salary: String(level?.salary || '').trim().slice(0, 100),
      })) : [];
      if (position && !experiences.length) return fail(res, 400, 'Select at least one experience level for each position.');
      normalized.push({ title, companyName, location, description, requirements, experience, salary, contactName, contactPhone, contactEmail,
        jobType: ['full-time', 'part-time', 'contract'].includes(entry?.jobType || input.jobType) ? (entry.jobType || input.jobType) : 'full-time',
        positions: [{ title, experiences, remarks: String(position?.remarks || description).trim().slice(0, 5000), contactName, contactPhone }], expiryDays: 3, source: 'Hapzo360' });
    }
    const createdAt = now();
    const reviewedAt = mysqlDate(new Date());
    const expiresAt = jobExpiry(createdAt, 3);
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[admin]] = await connection.execute('SELECT username FROM admin_users WHERE id = ?', [req.accountId]);
      const jobs = [];
      for (const data of normalized) {
        const id = randomUUID();
        await connection.execute("INSERT INTO jobs (id, company_id, created_by_admin, data_json, status, expires_at, reviewed_at, reviewed_by) VALUES (?, NULL, ?, ?, 'active', ?, ?, ?)", [id, req.accountId, JSON.stringify(data), mysqlDate(expiresAt), reviewedAt, req.accountId]);
        await connection.execute('INSERT INTO moderation_reviews (id, content_type, content_id, decision, reviewer_id, reviewer_username, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [randomUUID(), 'job', id, 'approve', req.accountId, admin?.username || 'Former admin', reviewedAt]);
        jobs.push({ ...data, id, createdAt, expiresAt: expiresAt.toISOString(), status: 'active', createdByAdmin: true });
      }
      await connection.commit();
      res.status(201).json({ job: jobs[0], jobs });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  });
  router.post('/admin/events', anyAdmin, async (req, res) => {
    const input = req.body || {};
    const title = String(input.title || '').trim().slice(0, 120);
    const organizer = String(input.organizer || '').trim().slice(0, 120);
    const venue = String(input.venue || '').trim().slice(0, 200);
    const date = new Date(input.date);
    const contactPhone = input.contactPhone ? phoneOf(input.contactPhone) : '';
    const image = String(input.image || '').trim().slice(0, 2048);
    if (!title || !organizer || !venue || !Number.isFinite(date.getTime()) || date.getTime() < Date.now() - 86_400_000) return fail(res, 400, 'Add an event name, organiser, venue and a current or future date.');
    if (contactPhone && !/^[6-9]\d{9}$/.test(contactPhone)) return fail(res, 400, 'Enter a valid 10-digit contact number.');
    if (image && !/^https:\/\//i.test(image) && !/^\/api\/editorial\/images\/[0-9a-f-]{36}$/i.test(image)) return fail(res, 400, 'Use an HTTPS image URL or upload an image.');
    let registrationUrl;
    try { registrationUrl = registrationUrlOf(input.registrationUrl); }
    catch (error) { return fail(res, error.status || 400, error.message); }
    if (image.startsWith('/api/editorial/images/')) {
      const [[savedImage]] = await db.execute('SELECT id FROM editorial_images WHERE id = ?', [image.split('/').at(-1)]);
      if (!savedImage) return fail(res, 400, 'Upload the image again.');
    }
    const id = `happening-${randomUUID()}`;
    const reviewedAt = mysqlDate(new Date());
    const data = { id, title, organizer, venue, location: String(input.location || '').trim().slice(0, 120), date: date.toISOString(), time: String(input.time || '').trim().slice(0, 20),
      category: String(input.category || 'Community').trim().slice(0, 80), sector: String(input.sector || '').trim().slice(0, 80),
      specialty: String(input.specialty || '').trim().slice(0, 80), description: String(input.description || '').trim().slice(0, 1200),
      contactPhone, image, registrationUrl, source: 'Hapzo360', createdByUser: true, createdByAdmin: true, registeredCount: 0 };
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[admin]] = await connection.execute('SELECT username FROM admin_users WHERE id = ?', [req.accountId]);
      await connection.execute("INSERT INTO events (id, company_id, created_by_admin, data_json, status, reviewed_at, reviewed_by) VALUES (?, NULL, ?, ?, 'approved', ?, ?)", [id, req.accountId, JSON.stringify(data), reviewedAt, req.accountId]);
      await connection.execute('INSERT INTO moderation_reviews (id, content_type, content_id, decision, reviewer_id, reviewer_username, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?)', [randomUUID(), 'event', id, 'approve', req.accountId, admin?.username || 'Former admin', reviewedAt]);
      await connection.commit();
      res.status(201).json({ event: { ...data, status: 'approved', createdAt: now() } });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  });
  router.delete('/admin/jobs/:id', anyAdmin, async (req, res) => {
    const [result] = await db.execute('UPDATE jobs SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!result.affectedRows) return fail(res, 404, 'Opening not found.');
    res.json({ ok: true });
  });
  router.patch('/admin/jobs/:id', anyAdmin, async (req, res) => {
    const [[job]] = await db.execute('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!job) return fail(res, 404, 'Opening not found.');
    let data;
    try { data = updatedJobData(req.body?.job, parseJson(job.data_json)); }
    catch (error) { return fail(res, error.status || 400, error.message); }
    await db.execute('UPDATE jobs SET data_json = ? WHERE id = ?', [JSON.stringify(data), job.id]);
    res.json({ job: { ...jobOwner(job), ...data } });
  });
  router.patch('/admin/events/:id', anyAdmin, async (req, res) => {
    const [[event]] = await db.execute('SELECT * FROM events WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!event) return fail(res, 404, 'Happening not found.');
    let data;
    try { data = updatedEventData(req.body?.event, parseJson(event.data_json), { allowOrganizer: true }); }
    catch (error) { return fail(res, error.status || 400, error.message); }
    await db.execute('UPDATE events SET data_json = ? WHERE id = ?', [JSON.stringify(data), event.id]);
    res.json({ event: { ...eventOwner(event), ...data } });
  });
  router.delete('/admin/events/:id', anyAdmin, async (req, res) => {
    const [result] = await db.execute('UPDATE events SET deleted_at = UTC_TIMESTAMP(3) WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!result.affectedRows) return fail(res, 404, 'Happening not found.');
    res.json({ ok: true });
  });
  router.get('/admin/overview', anyAdmin, async (req, res) => {
    const [[people]] = await db.query('SELECT COUNT(*) AS count FROM people');
    const [[companies]] = await db.query('SELECT COUNT(*) AS count FROM companies');
    const [[jobs]] = await db.query('SELECT COUNT(*) AS count FROM jobs WHERE deleted_at IS NULL');
    const [[events]] = await db.query('SELECT COUNT(*) AS count FROM events WHERE deleted_at IS NULL');
    const [[applications]] = await db.query('SELECT COUNT(*) AS count FROM applications');
    const [[registrations]] = await db.query('SELECT (SELECT COUNT(*) FROM event_registrations) + (SELECT COUNT(*) FROM event_external_registrations) AS count');
    const [[pendingJobs]] = await db.query("SELECT COUNT(*) AS count FROM jobs WHERE status = 'pending' AND deleted_at IS NULL");
    const [[pendingEvents]] = await db.query("SELECT COUNT(*) AS count FROM events WHERE status = 'pending' AND deleted_at IS NULL");
    const [jobStates] = await db.query("SELECT status, COUNT(*) AS count FROM jobs WHERE deleted_at IS NULL GROUP BY status");
    const [eventStates] = await db.query('SELECT status, COUNT(*) AS count FROM events WHERE deleted_at IS NULL GROUP BY status');
    const stateCounts = (rows, accepted) => ({
      approved: rows.filter((row) => accepted.includes(row.status)).reduce((sum, row) => sum + Number(row.count), 0),
      rejected: Number(rows.find((row) => row.status === 'rejected')?.count || 0),
      pending: Number(rows.find((row) => row.status === 'pending')?.count || 0),
    });
    const [[storyCounts]] = await db.query("SELECT SUM(domain = 'all') AS trends, SUM(domain = 'technology') AS technology, COUNT(*) AS total FROM editorial_posts");
    const [[liveJobs]] = await db.query("SELECT COUNT(*) AS count FROM jobs WHERE status = 'active' AND expires_at > UTC_TIMESTAMP(3) AND deleted_at IS NULL");
    const external = getExternalStats();
    const discovered = new Map();
    try {
      const cacheDir = path.resolve(process.env.EVENT_CACHE_DIR || '.cache');
      const files = (await readdir(cacheDir)).filter((file) => /^events-[a-z0-9-]+\.json$/.test(file));
      for (const file of files) {
        const cached = JSON.parse(await readFile(path.join(cacheDir, file), 'utf8'));
        for (const event of cached.events || []) {
          const key = event.url || event.link || event.id;
          if (key) discovered.set(key, event.sourceName || 'Other website');
        }
      }
    } catch (error) { if (error.code !== 'ENOENT') console.warn('[admin] Could not read event cache:', error.message); }
    const meetupCount = [...discovered.values()].filter((name) => name === 'Meetup').length;
    const eventbriteCount = [...discovered.values()].filter((name) => name === 'Eventbrite').length;
    const sourceStats = [
      { name: 'Meetup', area: 'Happenings', method: 'Website crawl', count: meetupCount, enabled: true },
      { name: 'Eventbrite', area: 'Happenings', method: 'Website crawl', count: eventbriteCount, enabled: Boolean(external.eventbriteEnabled) },
      { name: external.newsProvider || 'NewsData.io', area: 'Trends & Technologies', method: external.newsProvider === 'Publisher RSS feeds' ? 'RSS feed' : 'News API', count: Number(external.news || 0), enabled: Boolean(external.newsEnabled), loaded: Boolean(external.newsLoaded) },
      { name: 'AGMARKNET / data.gov.in', area: 'Price List', method: 'Government API', count: Number(external.agmarknet || 0), enabled: Boolean(external.agmarknetEnabled), loaded: Boolean(external.agmarknetLoaded) },
    ];
    if (external.yarnEnabled) sourceStats.push({ name: 'Yarn provider', area: 'Price List', method: 'Provider API', count: Number(external.yarn || 0), enabled: true, loaded: Boolean(external.yarnLoaded) });
    const activity = {};
    for (const [key, table] of [['people', 'people'], ['companies', 'companies'], ['jobs', 'jobs'], ['events', 'events']]) {
      const [rows] = await db.query(`SELECT DATE(created_at) AS day, COUNT(*) AS count FROM ${table} WHERE created_at >= UTC_DATE() - INTERVAL 6 DAY GROUP BY DATE(created_at)`);
      activity[key] = Object.fromEntries(rows.map((row) => [String(row.day).slice(0, 10), Number(row.count)]));
    }
    const daily = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(Date.now() - (6 - index) * 86_400_000).toISOString().slice(0, 10);
      return { day, people: activity.people[day] || 0, companies: activity.companies[day] || 0, jobs: activity.jobs[day] || 0, events: activity.events[day] || 0 };
    });
    const jobModeration = stateCounts(jobStates, ['active', 'expired']);
    const eventModeration = stateCounts(eventStates, ['approved']);
    const trendsPosted = Number(storyCounts.trends || 0);
    const technologyPosted = Number(storyCounts.technology || 0);
    const trendsInternet = Number(external.newsByDomain?.trends || 0);
    const technologyInternet = Number(external.newsByDomain?.technology || 0);
    res.json({ people: people.count, companies: companies.count, jobs: jobs.count, events: events.count, applications: applications.count, registrations: registrations.count, pendingJobs: pendingJobs.count, pendingEvents: pendingEvents.count, publishedStories: Number(storyCounts.total || 0), daily,
      moderation: { jobs: jobModeration, events: eventModeration },
      analytics: {
        openings: { posted: Number(jobs.count), ...jobModeration },
        happenings: { posted: Number(events.count), ...eventModeration },
        trends: { posted: trendsPosted, internet: trendsInternet },
        technology: { posted: technologyPosted, internet: technologyInternet },
      },
      content: { own: { jobs: Number(liveJobs.count), events: eventModeration.approved, trends: trendsPosted, technology: technologyPosted }, external: { happenings: discovered.size, news: Number(external.news || 0), prices: Number(external.agmarknet || 0) + Number(external.yarn || 0), newsLoaded: Boolean(external.newsLoaded), pricesLoaded: Boolean(external.agmarknetLoaded || external.yarnLoaded) }, sources: sourceStats, newsPublishers: external.newsPublishers || [] },
    });
  });
  router.get('/admin/pending', anyAdmin, async (req, res) => {
    const [jobRows] = await db.query("SELECT j.*, c.company_name FROM jobs j JOIN companies c ON c.id = j.company_id WHERE j.status = 'pending' AND j.deleted_at IS NULL ORDER BY j.created_at ASC LIMIT 100");
    const [eventRows] = await db.query("SELECT e.*, c.company_name, (v.event_id IS NOT NULL) AS clip_available FROM events e JOIN companies c ON c.id = e.company_id LEFT JOIN event_clips v ON v.event_id = e.id WHERE e.status = 'pending' AND e.deleted_at IS NULL ORDER BY e.created_at ASC LIMIT 100");
    res.json({ jobs: jobRows.map((row) => ({ ...jobOwner(row), companyName: row.company_name })), events: eventRows.map((row) => ({ ...parseJson(row.data_json), id: row.id, companyId: row.company_id || '', companyName: row.company_name, createdAt: iso(row.created_at), status: row.status, clipAvailable: Boolean(row.clip_available) })) });
  });
  router.patch('/admin/jobs/:id/review', anyAdmin, async (req, res) => {
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return fail(res, 400, 'Choose approve or reject.');
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (decision === 'reject' && !reason) return fail(res, 400, 'A reason is required when rejecting a job.');
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[job]] = await connection.execute("SELECT * FROM jobs WHERE id = ? AND status = 'pending' AND deleted_at IS NULL FOR UPDATE", [req.params.id]);
      if (!job) { await connection.rollback(); return fail(res, 409, 'This job is no longer pending review.'); }
      const expiry = jobExpiry(now(), parseJson(job.data_json).expiryDays);
      const reviewedAt = mysqlDate(new Date());
      const [[reviewer]] = await connection.execute('SELECT username FROM admin_users WHERE id = ?', [req.accountId]);
      await connection.execute('UPDATE jobs SET status = ?, expires_at = ?, reviewed_at = ?, reviewed_by = ?, rejection_reason = ? WHERE id = ?', [decision === 'approve' ? 'active' : 'rejected', mysqlDate(expiry), reviewedAt, req.accountId, decision === 'reject' ? reason : null, job.id]);
      await connection.execute('INSERT INTO moderation_reviews (id, content_type, content_id, decision, reviewer_id, reviewer_username, reason, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), 'job', job.id, decision, req.accountId, reviewer?.username || 'Former admin', decision === 'reject' ? reason : null, reviewedAt]);
      await connection.commit();
      res.json({ ok: true, status: decision === 'approve' ? 'active' : 'rejected' });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  });
  router.patch('/admin/events/:id/review', anyAdmin, async (req, res) => {
    const decision = req.body?.decision;
    if (!['approve', 'reject'].includes(decision)) return fail(res, 400, 'Choose approve or reject.');
    const reason = String(req.body?.reason || '').trim().slice(0, 500);
    if (decision === 'reject' && !reason) return fail(res, 400, 'A reason is required when rejecting an event.');
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[event]] = await connection.execute("SELECT id FROM events WHERE id = ? AND status = 'pending' AND deleted_at IS NULL FOR UPDATE", [req.params.id]);
      if (!event) { await connection.rollback(); return fail(res, 409, 'This event is no longer pending review.'); }
      const reviewedAt = mysqlDate(new Date());
      const [[reviewer]] = await connection.execute('SELECT username FROM admin_users WHERE id = ?', [req.accountId]);
      await connection.execute('UPDATE events SET status = ?, reviewed_at = ?, reviewed_by = ?, rejection_reason = ? WHERE id = ?', [decision === 'approve' ? 'approved' : 'rejected', reviewedAt, req.accountId, decision === 'reject' ? reason : null, event.id]);
      await connection.execute('INSERT INTO moderation_reviews (id, content_type, content_id, decision, reviewer_id, reviewer_username, reason, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [randomUUID(), 'event', event.id, decision, req.accountId, reviewer?.username || 'Former admin', decision === 'reject' ? reason : null, reviewedAt]);
      await connection.commit();
      res.json({ ok: true, status: decision === 'approve' ? 'approved' : 'rejected' });
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
  });
  router.get('/admin/editorial', anyAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT id, domain, title, description, image_url, published_at FROM editorial_posts ORDER BY published_at DESC LIMIT 100');
    res.json({ posts: rows.map((row) => ({ id: row.id, domain: row.domain, title: row.title, description: row.description, image: row.image_url, publishedAt: iso(row.published_at) })) });
  });
  router.post('/admin/editorial/image', anyAdmin, express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '5mb' }), async (req, res) => {
    const mime = String(req.get('content-type') || '').split(';')[0].toLowerCase();
    const bytes = req.body;
    if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > 5 * 1024 * 1024) return fail(res, 400, 'Choose a JPEG, PNG or WebP image under 5 MB.');
    const valid = mime === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : mime === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : mime === 'image/webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' : false;
    if (!valid) return fail(res, 400, 'The selected file is not a valid JPEG, PNG or WebP image.');
    const id = randomUUID();
    await db.execute('INSERT INTO editorial_images (id, mime_type, image) VALUES (?, ?, ?)', [id, mime, bytes]);
    res.status(201).json({ image: `/api/editorial/images/${id}` });
  });
  router.post('/admin/editorial', anyAdmin, async (req, res) => {
    const domain = String(req.body?.domain || '').trim();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    const body = String(req.body?.body || '').trim();
    const image = String(req.body?.image || '').trim();
    if (!['all', 'technology'].includes(domain)) return fail(res, 400, 'Choose Trends or Technologies.');
    if (!title || title.length > 255 || !description || description.length > 2000 || !body || body.length > 30000) return fail(res, 400, 'Add a title, summary and article within the allowed lengths.');
    if (image && (!/^https:\/\//i.test(image) && !/^\/api\/editorial\/images\/[0-9a-f-]{36}$/i.test(image) || image.length > 2048)) return fail(res, 400, 'Use an HTTPS image URL or upload an image.');
    if (image.startsWith('/api/editorial/images/')) {
      const [[savedImage]] = await db.execute('SELECT id FROM editorial_images WHERE id = ?', [image.split('/').at(-1)]);
      if (!savedImage) return fail(res, 400, 'Upload the image again.');
    }
    const id = randomUUID();
    await db.execute('INSERT INTO editorial_posts (id, domain, title, description, body, image_url, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, domain, title, description, body, image || null, req.accountId]);
    res.status(201).json({ post: { id, domain, title, description, image: image || null, publishedAt: now() } });
  });
  router.delete('/admin/editorial/:id', anyAdmin, async (req, res) => {
    const [[post]] = await db.execute('SELECT image_url FROM editorial_posts WHERE id = ?', [req.params.id]);
    const [result] = await db.execute('DELETE FROM editorial_posts WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) return fail(res, 404, 'Story not found.');
    if (post?.image_url?.startsWith('/api/editorial/images/')) await db.execute('DELETE FROM editorial_images WHERE id = ?', [post.image_url.split('/').at(-1)]);
    res.json({ ok: true });
  });
  router.get('/admin/people', anyAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT * FROM people ORDER BY created_at DESC LIMIT 100');
    res.json({ people: rows.map(personPublic) });
  });
  router.patch('/admin/people/:id', anyAdmin, async (req, res) => {
    const name = String(req.body?.person?.name || '').trim();
    const email = emailOf(req.body?.person?.email);
    const phone = phoneOf(req.body?.person?.phone);
    if (!name || name.length > 100 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !/^[6-9]\d{9}$/.test(phone)) {
      return fail(res, 400, 'Enter a name, valid email address and 10-digit WhatsApp number.');
    }
    const [[existing]] = await db.execute('SELECT id FROM people WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 404, 'Person not found.');
    try {
      await db.execute('UPDATE people SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, req.params.id]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'That email address or WhatsApp number belongs to another person.');
      throw error;
    }
    const [[updated]] = await db.execute('SELECT * FROM people WHERE id = ?', [req.params.id]);
    res.json({ person: personPublic(updated) });
  });
  router.delete('/admin/people/:id', anyAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[person]] = await connection.execute('SELECT id, email FROM people WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!person) { await connection.rollback(); return fail(res, 404, 'Person not found.'); }
      await connection.execute('DELETE FROM applications WHERE person_id = ?', [person.id]);
      await connection.execute('DELETE FROM event_registrations WHERE person_id = ?', [person.id]);
      await connection.execute('DELETE FROM event_external_registrations WHERE person_id = ?', [person.id]);
      await connection.execute('DELETE FROM event_registration_profiles WHERE person_id = ?', [person.id]);
      await connection.execute("DELETE FROM sessions WHERE role = 'person' AND subject_id = ?", [person.id]);
      if (person.email) await connection.execute('DELETE FROM people_email_codes WHERE email = ?', [person.email]);
      await connection.execute('DELETE FROM people WHERE id = ?', [person.id]);
      await connection.commit();
      res.json({ ok: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  });
  router.get('/admin/companies', anyAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT * FROM companies ORDER BY created_at DESC LIMIT 100');
    res.json({ companies: rows.map(companyPublic) });
  });
  router.patch('/admin/companies/:id', anyAdmin, async (req, res) => {
    const companyName = String(req.body?.company?.companyName || '').trim();
    const email = emailOf(req.body?.company?.email);
    const phone = phoneOf(req.body?.company?.phone);
    if (!companyName || companyName.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || !/^[6-9]\d{9}$/.test(phone)) {
      return fail(res, 400, 'Enter a company name, valid email address and 10-digit WhatsApp number.');
    }
    const [[existing]] = await db.execute('SELECT * FROM companies WHERE id = ?', [req.params.id]);
    if (!existing) return fail(res, 404, 'Company not found.');
    const profile = { ...parseJson(existing.profile_json), companyName, phone };
    try {
      await db.execute('UPDATE companies SET company_name = ?, email = ?, phone = ?, profile_json = ? WHERE id = ?', [companyName, email, phone, JSON.stringify(profile), req.params.id]);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') return fail(res, 409, 'That email address belongs to another company.');
      throw error;
    }
    res.json({ company: companyPublic(await companyById(db, req.params.id)) });
  });
  router.delete('/admin/companies/:id', anyAdmin, async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      const [[company]] = await connection.execute('SELECT id, email FROM companies WHERE id = ? FOR UPDATE', [req.params.id]);
      if (!company) { await connection.rollback(); return fail(res, 404, 'Company not found.'); }
      await connection.execute('UPDATE jobs SET deleted_at = COALESCE(deleted_at, UTC_TIMESTAMP(3)), company_id = NULL WHERE company_id = ?', [company.id]);
      await connection.execute('UPDATE events SET deleted_at = COALESCE(deleted_at, UTC_TIMESTAMP(3)), company_id = NULL WHERE company_id = ?', [company.id]);
      await connection.execute("DELETE FROM sessions WHERE role = 'company' AND subject_id = ?", [company.id]);
      await connection.execute('DELETE FROM payments WHERE company_id = ?', [company.id]);
      await connection.execute('DELETE FROM company_email_codes WHERE email = ?', [company.email]);
      await connection.execute('DELETE FROM companies WHERE id = ?', [company.id]);
      await connection.commit();
      res.json({ ok: true });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally { connection.release(); }
  });
  router.get('/admin/jobs', anyAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT j.*, a.username AS creator_username, c.company_name, (SELECT COUNT(*) FROM applications application WHERE application.job_id = j.id) AS application_count FROM jobs j LEFT JOIN admin_users a ON a.id = j.created_by_admin LEFT JOIN companies c ON c.id = j.company_id WHERE j.deleted_at IS NULL ORDER BY j.created_at DESC LIMIT 100');
    const history = await reviewHistory(db, 'job', rows.map((row) => row.id));
    res.json({ jobs: rows.map((row) => ({ ...jobOwner(row), companyName: row.company_name || parseJson(row.data_json).companyName || '', applicationCount: Number(row.application_count || 0), reviewHistory: history.get(row.id) || [] })) });
  });
  router.get('/admin/jobs/:id/applications', anyAdmin, async (req, res) => {
    const [[job]] = await db.execute('SELECT id FROM jobs WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (!job) return fail(res, 404, 'Opening not found.');
    const [rows] = await db.execute('SELECT application.id, application.created_at, person.name, person.email, person.phone FROM applications application INNER JOIN people person ON person.id = application.person_id WHERE application.job_id = ? ORDER BY application.created_at DESC', [job.id]);
    res.json({ applications: rows.map((row) => ({ id: row.id, name: row.name || '', email: row.email || '', phone: row.phone || '', appliedAt: iso(row.created_at) })) });
  });
  router.get('/admin/events', anyAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT e.*, a.username AS creator_username, co.company_name, (ec.event_id IS NOT NULL) AS clip_available FROM events e LEFT JOIN admin_users a ON a.id = e.created_by_admin LEFT JOIN companies co ON co.id = e.company_id LEFT JOIN event_clips ec ON ec.event_id = e.id WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC LIMIT 100');
    const history = await reviewHistory(db, 'event', rows.map((row) => row.id));
    res.json({ events: rows.map((row) => ({ ...parseJson(row.data_json), id: row.id, companyId: row.company_id || '', companyName: row.company_name || '', createdAt: iso(row.created_at), createdByAdmin: Boolean(row.created_by_admin), creatorUsername: row.creator_username || '', status: row.status, reviewedAt: iso(row.reviewed_at), rejectionReason: row.rejection_reason || '', clipAvailable: Boolean(row.clip_available), reviewHistory: history.get(row.id) || [] })) });
  });
  router.get('/admin/events/:id/clip', anyAdmin, async (req, res) => {
    const [[clip]] = await db.execute('SELECT mime_type, clip FROM event_clips WHERE event_id = ?', [req.params.id]);
    if (!clip) return fail(res, 404, 'Verification clip not found.');
    res.type(clip.mime_type).set('Cache-Control', 'private, no-store').send(clip.clip);
  });

  return router;
}
