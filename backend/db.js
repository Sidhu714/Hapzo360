import mysql from 'mysql2/promise';

const required = ['DB_USER', 'DB_PASSWORD'];

export function createDatabase() {
  const missing = required.filter((key) => process.env[key] === undefined);
  if (missing.length) throw new Error(`Missing MySQL settings: ${missing.join(', ')}`);
  return mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'hapzo360',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true,
    timezone: 'Z',
  });
}

export async function initializeDatabase(db) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS people (
      id CHAR(36) PRIMARY KEY, name VARCHAR(100) NOT NULL, phone VARCHAR(10) NOT NULL UNIQUE,
      email VARCHAR(254) NULL UNIQUE, email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      phone_verified BOOLEAN NOT NULL DEFAULT FALSE, google_uid VARCHAR(128) NULL UNIQUE,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`,
    `CREATE TABLE IF NOT EXISTS people_email_codes (
      email VARCHAR(254) PRIMARY KEY, phone VARCHAR(10) NOT NULL, code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME(3) NOT NULL, sent_at DATETIME(3) NOT NULL,
      attempts INT NOT NULL DEFAULT 0, INDEX people_email_codes_expiry (expires_at)
    )`,
    `CREATE TABLE IF NOT EXISTS companies (
      id CHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
      company_name VARCHAR(120) NULL, phone VARCHAR(10) NULL, email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      phone_verified BOOLEAN NOT NULL DEFAULT FALSE, google_uid VARCHAR(128) NULL UNIQUE,
      profile_json JSON NULL, jobs_posted INT NOT NULL DEFAULT 0,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`,
    `CREATE TABLE IF NOT EXISTS company_email_codes (
      email VARCHAR(254) PRIMARY KEY, phone VARCHAR(10) NOT NULL, code_hash VARCHAR(255) NOT NULL,
      expires_at DATETIME(3) NOT NULL, sent_at DATETIME(3) NOT NULL,
      attempts INT NOT NULL DEFAULT 0, verified_token_hash CHAR(64) NULL,
      INDEX company_email_codes_expiry (expires_at)
    )`,
    `CREATE TABLE IF NOT EXISTS jobs (
      id CHAR(36) PRIMARY KEY, company_id CHAR(36) NULL, created_by_admin CHAR(36) NULL, data_json JSON NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending', created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      expires_at DATETIME(3) NOT NULL, renewed_at DATETIME(3) NULL, deleted_at DATETIME(3) NULL,
      reviewed_at DATETIME(3) NULL, reviewed_by CHAR(36) NULL, rejection_reason VARCHAR(500) NULL,
      INDEX jobs_active (status, expires_at), INDEX jobs_company (company_id),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )`,
    `CREATE TABLE IF NOT EXISTS applications (
      id CHAR(36) PRIMARY KEY, job_id CHAR(36) NOT NULL, person_id CHAR(36) NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY one_application (job_id, person_id),
      FOREIGN KEY (job_id) REFERENCES jobs(id), FOREIGN KEY (person_id) REFERENCES people(id)
    )`,
    `CREATE TABLE IF NOT EXISTS events (
      id VARCHAR(100) PRIMARY KEY, company_id CHAR(36) NULL, created_by_admin CHAR(36) NULL, data_json JSON NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), status VARCHAR(20) NOT NULL DEFAULT 'pending',
      reviewed_at DATETIME(3) NULL, reviewed_by CHAR(36) NULL, rejection_reason VARCHAR(500) NULL,
      deleted_at DATETIME(3) NULL,
      INDEX events_company (company_id), INDEX events_status (status),
      FOREIGN KEY (company_id) REFERENCES companies(id)
    )`,
    `CREATE TABLE IF NOT EXISTS event_clips (
      event_id VARCHAR(100) PRIMARY KEY, mime_type VARCHAR(80) NOT NULL, clip LONGBLOB NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS event_registrations (
      id CHAR(36) PRIMARY KEY, event_id TEXT NOT NULL, event_key CHAR(64) NOT NULL, event_title VARCHAR(255) NOT NULL,
      person_id CHAR(36) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      UNIQUE KEY one_registration (event_key, person_id), INDEX registration_event (event_key),
      FOREIGN KEY (person_id) REFERENCES people(id)
    )`,
    `CREATE TABLE IF NOT EXISTS payments (
      id CHAR(36) PRIMARY KEY, company_id CHAR(36) NOT NULL, kind VARCHAR(32) NOT NULL,
      amount DECIMAL(10,2) NOT NULL, status VARCHAR(20) NOT NULL, used_at DATETIME(3) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX payments_company (company_id), FOREIGN KEY (company_id) REFERENCES companies(id)
    )`,
    `CREATE TABLE IF NOT EXISTS admin_users (
      id CHAR(36) PRIMARY KEY, username VARCHAR(64) NULL UNIQUE, email VARCHAR(254) NULL UNIQUE, password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'admin',
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`,
    `CREATE TABLE IF NOT EXISTS moderation_reviews (
      id CHAR(36) PRIMARY KEY, content_type VARCHAR(10) NOT NULL, content_id VARCHAR(100) NOT NULL,
      decision VARCHAR(10) NOT NULL, reviewer_id CHAR(36) NULL, reviewer_username VARCHAR(64) NOT NULL,
      reason VARCHAR(500) NULL, reviewed_at DATETIME(3) NOT NULL,
      UNIQUE KEY review_once (content_type, content_id, reviewed_at),
      INDEX reviews_content (content_type, content_id, reviewed_at)
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash CHAR(64) PRIMARY KEY, role VARCHAR(20) NOT NULL, subject_id CHAR(36) NOT NULL,
      expires_at DATETIME(3) NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX sessions_subject (role, subject_id), INDEX sessions_expiry (expires_at)
    )`,
    `CREATE TABLE IF NOT EXISTS editorial_posts (
      id CHAR(36) PRIMARY KEY, domain VARCHAR(32) NOT NULL, title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL, body MEDIUMTEXT NOT NULL, image_url VARCHAR(2048) NULL,
      author_id CHAR(36) NOT NULL, published_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      INDEX editorial_domain_date (domain, published_at),
      FOREIGN KEY (author_id) REFERENCES admin_users(id)
    )`,
    `CREATE TABLE IF NOT EXISTS editorial_images (
      id CHAR(36) PRIMARY KEY, mime_type VARCHAR(30) NOT NULL, image LONGBLOB NOT NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    )`,
  ];
  for (const statement of statements) await db.query(statement);
  const [personEmailColumns] = await db.query("SHOW COLUMNS FROM people LIKE 'email'");
  if (!personEmailColumns.length) await db.query('ALTER TABLE people ADD COLUMN email VARCHAR(254) NULL UNIQUE AFTER phone');
  const [personEmailVerifiedColumns] = await db.query("SHOW COLUMNS FROM people LIKE 'email_verified'");
  if (!personEmailVerifiedColumns.length) await db.query('ALTER TABLE people ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER email');
  const [personGoogleColumns] = await db.query("SHOW COLUMNS FROM people LIKE 'google_uid'");
  if (!personGoogleColumns.length) await db.query('ALTER TABLE people ADD COLUMN google_uid VARCHAR(128) NULL UNIQUE AFTER phone_verified');
  const [companyEmailVerifiedColumns] = await db.query("SHOW COLUMNS FROM companies LIKE 'email_verified'");
  if (!companyEmailVerifiedColumns.length) await db.query('ALTER TABLE companies ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE AFTER phone');
  const [companyGoogleColumns] = await db.query("SHOW COLUMNS FROM companies LIKE 'google_uid'");
  if (!companyGoogleColumns.length) await db.query('ALTER TABLE companies ADD COLUMN google_uid VARCHAR(128) NULL UNIQUE AFTER phone_verified');
  const [adminUsernameColumns] = await db.query("SHOW COLUMNS FROM admin_users LIKE 'username'");
  if (!adminUsernameColumns.length) await db.query('ALTER TABLE admin_users ADD COLUMN username VARCHAR(64) NULL UNIQUE AFTER id');
  const [adminEmailColumns] = await db.query("SHOW COLUMNS FROM admin_users LIKE 'email'");
  if (adminEmailColumns[0]?.Null === 'NO') await db.query('ALTER TABLE admin_users MODIFY COLUMN email VARCHAR(254) NULL');
  const [adminRoleColumns] = await db.query("SHOW COLUMNS FROM admin_users LIKE 'role'");
  if (!adminRoleColumns.length) await db.query("ALTER TABLE admin_users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'admin' AFTER password_hash");
  for (const [oldUsername, newUsername] of [['admin1', 'Ragul Gowtham'], ['admin2', 'Navaneethan'], ['sadmin', 'Lordminds']]) {
    const [[oldAccount]] = await db.execute('SELECT id FROM admin_users WHERE username = ? LIMIT 1', [oldUsername]);
    if (!oldAccount) continue;
    const [[nameInUse]] = await db.execute('SELECT id FROM admin_users WHERE username = ? LIMIT 1', [newUsername]);
    if (!nameInUse) await db.execute('UPDATE admin_users SET username = ? WHERE id = ?', [newUsername, oldAccount.id]);
  }
  const [[ragulAdmin]] = await db.execute('SELECT id FROM admin_users WHERE username = ? LIMIT 1', ['Ragul Gowtham']);
  if (ragulAdmin) {
    await db.execute("UPDATE moderation_reviews SET reviewer_username = ? WHERE reviewer_id = ? OR reviewer_username IN ('admin1', 'Raghul Gowtham')", ['Ragul Gowtham', ragulAdmin.id]);
  }
  for (const [table, column, definition] of [
    ['jobs', 'reviewed_at', 'DATETIME(3) NULL'],
    ['jobs', 'created_by_admin', 'CHAR(36) NULL'],
    ['jobs', 'reviewed_by', 'CHAR(36) NULL'],
    ['jobs', 'rejection_reason', 'VARCHAR(500) NULL'],
    ['events', 'status', "VARCHAR(20) NOT NULL DEFAULT 'approved'"],
    ['events', 'created_by_admin', 'CHAR(36) NULL'],
    ['events', 'reviewed_at', 'DATETIME(3) NULL'],
    ['events', 'reviewed_by', 'CHAR(36) NULL'],
    ['events', 'rejection_reason', 'VARCHAR(500) NULL'],
    ['events', 'deleted_at', 'DATETIME(3) NULL'],
  ]) {
    const [columns] = await db.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
    if (!columns.length) await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  for (const table of ['jobs', 'events']) {
    const [companyColumns] = await db.query(`SHOW COLUMNS FROM ${table} LIKE 'company_id'`);
    if (companyColumns[0]?.Null === 'NO') await db.query(`ALTER TABLE ${table} MODIFY COLUMN company_id CHAR(36) NULL`);
  }
  await db.query("ALTER TABLE events ALTER COLUMN status SET DEFAULT 'pending'");
  const [eventKeyColumns] = await db.query("SHOW COLUMNS FROM event_registrations LIKE 'event_key'");
  if (!eventKeyColumns.length) {
    await db.query('ALTER TABLE event_registrations ADD COLUMN event_key CHAR(64) NULL AFTER event_id');
    await db.query('UPDATE event_registrations SET event_key = SHA2(event_id, 256)');
    await db.query('ALTER TABLE event_registrations DROP INDEX one_registration, DROP INDEX registration_event');
    await db.query('ALTER TABLE event_registrations MODIFY event_id TEXT NOT NULL, MODIFY event_key CHAR(64) NOT NULL, ADD UNIQUE KEY one_registration (event_key, person_id), ADD INDEX registration_event (event_key)');
  }
  await db.query('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP(3)');
  await db.query('DELETE FROM people_email_codes WHERE expires_at <= UTC_TIMESTAMP(3)');
  await db.query('DELETE FROM company_email_codes WHERE expires_at <= UTC_TIMESTAMP(3)');
  for (const [table, contentType, approvedStatus] of [['jobs', 'job', 'active'], ['events', 'event', 'approved']]) {
    await db.query(`INSERT IGNORE INTO moderation_reviews (id, content_type, content_id, decision, reviewer_id, reviewer_username, reason, reviewed_at)
      SELECT UUID(), ?, item.id, IF(item.status = ?, 'approve', 'reject'), item.reviewed_by,
        COALESCE(admin.username, 'Former admin'), item.rejection_reason, item.reviewed_at
      FROM ${table} item LEFT JOIN admin_users admin ON admin.id = item.reviewed_by
      WHERE item.reviewed_at IS NOT NULL AND item.reviewed_by IS NOT NULL
        AND item.status IN (?, 'expired', 'rejected')`, [contentType, approvedStatus, approvedStatus]);
  }
}
