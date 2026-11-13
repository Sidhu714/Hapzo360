# Super admin implementation

The private `/super-admin/login` page calls `POST /api/admin/login`. The backend seeds an admin from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` on the first startup, hashes the password, and creates an HttpOnly session cookie after a valid login. `/super-admin` checks `GET /api/admin/session`. The admin API also provides logout, database counts, and recent People, Company, Opening, and Happenings records.

Configure MySQL and the initial admin in `backend/.env` as described in [backend/README.md](../backend/README.md). There is no public admin signup or navigation link.
