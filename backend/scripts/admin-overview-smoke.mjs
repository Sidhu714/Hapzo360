import 'dotenv/config';

const base = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3002/api';
const login = await fetch(`${base}/admin/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL?.split('@')[0], password: process.env.SUPER_ADMIN_PASSWORD }),
});
if (!login.ok) throw new Error(`Admin login failed: ${login.status}`);
const cookie = login.headers.getSetCookie().find((value) => value.startsWith('hapzo_admin='))?.split(';')[0];
if (!cookie) throw new Error('Admin session cookie missing.');
const response = await fetch(`${base}/admin/overview`, { headers: { Cookie: cookie } });
if (!response.ok) throw new Error(`Admin overview failed: ${response.status} ${await response.text()}`);
const data = await response.json();
if (!data.moderation?.jobs || !data.moderation?.events || !data.content?.own || !data.content?.external || !Array.isArray(data.content?.sources)) throw new Error('Admin overview metrics are incomplete.');
if (data.publishedStories !== data.content.own.trends + data.content.own.technology) throw new Error('Published story total does not match database story counts.');
if (data.content.own.jobs > data.moderation.jobs.approved) throw new Error('Live job count exceeds accepted job count.');
if (typeof data.content.external.newsLoaded !== 'boolean' || typeof data.content.external.pricesLoaded !== 'boolean') throw new Error('External cache status is missing.');
process.stdout.write('Admin overview moderation and content metrics passed.\n');
