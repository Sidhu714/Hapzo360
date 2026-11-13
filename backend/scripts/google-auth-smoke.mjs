import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import express from 'express';
import { createDatabase } from '../db.js';
import { platformRoutes } from '../platform.js';

const unique = randomUUID().slice(0, 8);
const personPhone = `9${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
const companyPhone = `8${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, '0')}`;
const personIdentity = { uid: `google-person-${unique}`, email: `google-person-${unique}@gmail.com`, name: 'Google Test Person' };
const companyIdentity = { uid: `google-company-${unique}`, email: `google-company-${unique}@gmail.com`, name: 'Google Test Owner' };
const identities = { person: personIdentity, company: companyIdentity };
const db = createDatabase();
const app = express();
app.use(express.json());
app.use('/api', platformRoutes(db, { verifyIdentity: async (token) => identities[token] || null }));
const server = app.listen(0, '127.0.0.1');
await new Promise((resolve) => server.once('listening', resolve));
const base = `http://127.0.0.1:${server.address().port}/api`;
let personId;
let companyId;

async function post(path, body) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json() };
}

try {
  const firstPerson = await post('/people/google', { idToken: 'person' });
  assert.equal(firstPerson.status, 200);
  assert.equal(firstPerson.data.needsPhone, true);
  const person = await post('/people/google', { idToken: 'person', phone: personPhone, termsAccepted: true });
  assert.equal(person.status, 200);
  personId = person.data.person.id;
  assert.equal(person.data.person.emailVerified, true);
  const personAgain = await post('/people/google', { idToken: 'person' });
  assert.equal(personAgain.data.person.id, personId);

  const firstCompany = await post('/companies/google', { idToken: 'company' });
  assert.equal(firstCompany.status, 200);
  assert.equal(firstCompany.data.needsProfile, true);
  const company = await post('/companies/google', { idToken: 'company', password: 'smokePassword123', termsAccepted: true,
    profile: { companyName: 'Google Test Company', phone: companyPhone, industry: 'Technology', location: 'Chennai', contactPerson: 'Google Test Owner' } });
  assert.equal(company.status, 200);
  companyId = company.data.company.id;
  assert.equal(company.data.company.emailVerified, true);
  const companyAgain = await post('/companies/google', { idToken: 'company' });
  assert.equal(companyAgain.data.company.id, companyId);

  const invalid = await post('/people/google', { idToken: 'invalid' });
  assert.equal(invalid.status, 401);
  console.log('Google account completion and repeat sign-in passed for individual and company.');
} finally {
  if (personId) {
    await db.execute("DELETE FROM sessions WHERE role = 'person' AND subject_id = ?", [personId]);
    await db.execute('DELETE FROM people WHERE id = ?', [personId]);
  }
  if (companyId) {
    await db.execute("DELETE FROM sessions WHERE role = 'company' AND subject_id = ?", [companyId]);
    await db.execute('DELETE FROM companies WHERE id = ?', [companyId]);
  }
  await new Promise((resolve) => server.close(resolve));
  await db.end();
}
