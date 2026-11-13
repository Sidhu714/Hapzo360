import 'dotenv/config';

const base = process.env.SMOKE_API_BASE || 'http://127.0.0.1:3002/api';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLZ4QAAAABJRU5ErkJggg==', 'base64');
const login = await fetch(`${base}/admin/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL?.split('@')[0], password: process.env.SUPER_ADMIN_PASSWORD }),
});
if (!login.ok) throw new Error(`Admin login failed: ${login.status}`);
const cookie = login.headers.getSetCookie().find((value) => value.startsWith('hapzo_admin='))?.split(';')[0];
if (!cookie) throw new Error('Admin session cookie missing.');
let postId;
try {
  const upload = await fetch(`${base}/admin/editorial/image`, {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'image/png' }, body: png,
  });
  if (!upload.ok) throw new Error(`Image upload failed: ${upload.status} ${await upload.text()}`);
  const { image } = await upload.json();
  const publication = await fetch(`${base}/admin/editorial`, {
    method: 'POST', headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ domain: 'technology', title: 'Temporary image smoke story', description: 'Upload integration test.', body: 'Temporary.', image }),
  });
  if (!publication.ok) throw new Error(`Story publication failed: ${publication.status} ${await publication.text()}`);
  postId = (await publication.json()).post.id;
  const served = await fetch(new URL(image, base));
  if (!served.ok || !Buffer.from(await served.arrayBuffer()).equals(png)) throw new Error('Uploaded image was not served correctly.');
  const feed = await fetch(`${base}/trends?domain=technology`);
  const story = (await feed.json()).articles?.find((item) => item.id === postId);
  if (!story?.image?.includes(image)) throw new Error('Uploaded image missing from technology feed.');
  process.stdout.write('Editorial image upload and public serving passed.\n');
} finally {
  if (postId) await fetch(`${base}/admin/editorial/${postId}`, { method: 'DELETE', headers: { Cookie: cookie } });
}
