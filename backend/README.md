# Hapzo360 MySQL backend

Admin and Super Admin share `/super-admin/login`. Admin accounts can post and moderate content. The separate Super Admin account has a read-only overview of each admin's published openings, happenings, stories, and approval or rejection decisions. The backend checks the database role on every admin request. Configure `READ_ONLY_SUPER_ADMIN_USERNAME` and `READ_ONLY_SUPER_ADMIN_PASSWORD` privately in `backend/.env` to seed that account with a hashed password; an existing password is not overwritten on startup. The original `SUPER_ADMIN_USERNAME` and `SUPER_ADMIN_PASSWORD` settings continue to seed a working Admin account.

Google sign-in uses the existing Firebase web project. Enable the Google provider in Firebase Authentication, add `localhost` and the deployed frontend domain to Firebase authorized domains, and set `FIREBASE_PROJECT_ID` on the backend (the local default is `hapzo360`). The frontend sends a Firebase ID token to the backend, which verifies it before creating a Hapzo session. New individual accounts still collect a WhatsApp number; new company accounts still collect a profile, WhatsApp number, password, and Terms acceptance. Existing verified-email accounts are linked to the verified Google identity on first use.

The backend now stores People accounts, company accounts, jobs, applications, community events, event registrations, demo payments, super admin users, and login sessions in the `hapzo360` MySQL database. It creates its tables automatically at startup. Existing trend, price, and event-search integrations remain in `index.js` and `happenings.js`.

## Local setup

1. Create the empty MySQL database: `CREATE DATABASE hapzo360 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;` (skip this if you already created it).
2. In `backend/.env`, add `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD` using `backend/.env.example` as a guide. Keep your existing API keys.
3. Set `SUPER_ADMIN_USERNAME` and a unique `SUPER_ADMIN_PASSWORD` of at least 12 characters. The first startup creates that admin in MySQL with a salted password hash. Later changes to the environment password do not overwrite an existing admin account. For an existing admin created with `SUPER_ADMIN_EMAIL`, set `SUPER_ADMIN_USERNAME` and keep the old email setting for one restart; startup will attach the username to that account. If no username is set, the part before `@` in the old email is used.
4. Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` to `backend/.env` so individual and company signup codes can be delivered by email. The code expires after three minutes and is checked by the backend. Keep these settings out of the frontend.
5. Run `npm install` and `npm run dev` in `backend`. Run `npm run dev` in `frontend` in a second terminal.
6. Open `http://localhost:3001/api/health/db`. A working connection returns `{"ok":true,"database":"hapzo360"}`. The private admin login is at `http://localhost:5173/super-admin/login`.

The frontend development server proxies `/api` to `http://localhost:3001`. For production, `VITE_API_BASE_URL` must point to a deployed backend with network access to the MySQL server. A MySQL instance running only on your computer is not reachable from Render or Netlify.

Run `node scripts/smoke.mjs` while the backend is running to check the core API. It creates temporary accounts, a job, an event, and an editorial story; verifies approval, application, and registration; then removes them.

New company jobs and events enter the super admin approval queue and stay hidden from public listings until approved. Job listing duration starts on approval. Rejected submissions remain in the admin records with their reason. The dashboard can also publish original stories into Trends and Technologies alongside provider news.

Super admins can create openings from `/super-admin/jobs/new` or a happening from `/super-admin/events/new`, using the Create action in each section. The admin opening form follows the company posting form: state and district, multiple positions, experience levels, headcount, salary, contacts and editable remarks. Each position is published as a separate opening in one submission, without a company account or demo payment. The admin happening form follows Add Event: date, time, venue, contact, category, sector, specialty, suggestions and image. It uses the admin session and does not require a terms checkbox or verification video. Admin listings publish immediately. Openings run for three days, and their contact details stay hidden until a person applies. The database stores the creating admin and an approval history entry for each listing. Company submissions continue through moderation.

Admin-created openings and happenings have a Delete action in their super admin record cards. The backend hides deleted entries from public and admin listings and blocks new applications or registrations. Existing applications, registrations and moderation history remain stored. The admin deletion routes reject company-created entries.

Every job or event approval and rejection is recorded in `moderation_reviews` with the admin username, decision, time, and rejection reason. The super admin Openings and Happenings record cards show this history, including decisions before a job is renewed.

Existing records stored only in a browser's localStorage are not automatically copied into MySQL. New records created through the updated frontend use the shared database.

## Current demo boundaries

- Individual and company signup verify an email code through SMTP and retain the WhatsApp number for a future WhatsApp verification flow. People sign-in uses only the mobile number, as requested; it is not suitable for production authentication.
- Job posting and reactivation payments are demo payments. The backend records and checks each demo payment before using it, but no real charge occurs.
- Event information, images, and verification clips are stored in MySQL. A failed clip upload falls back to the posting device's IndexedDB and shows a clear message.
- The super admin login is server-verified and has no public signup. Its dashboard reviews jobs and events, views event verification clips, and publishes editorial stories.

Do not put MySQL credentials or super admin credentials into any `VITE_` variable or frontend file.
