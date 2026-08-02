import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { config } from "dotenv";
import mysql from "mysql2/promise";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { addMonths, PLANS } from "./plans.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: join(root, ".env") });
config({ path: join(root, ".env.local") });

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function createPool() {
  if (process.env.DATABASE_URL) {
    return mysql.createPool(process.env.DATABASE_URL);
  }

  // Prefer 127.0.0.1 over "localhost" — Node may resolve localhost to ::1 and
  // mysql2 then fails with ECONNREFUSED on Hostinger / shared MySQL.
  const rawHost = process.env.MYSQL_HOST || "127.0.0.1";
  const host = rawHost === "localhost" ? "127.0.0.1" : rawHost;

  return mysql.createPool({
    host,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: requireEnv("MYSQL_USER"),
    password: process.env.MYSQL_PASSWORD ?? "",
    database: requireEnv("MYSQL_DATABASE"),
    waitForConnections: true,
    connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
    namedPlaceholders: false,
  });
}

const pool = createPool();

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

function now() {
  return new Date().toISOString();
}

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NULL,
      role VARCHAR(32) NOT NULL DEFAULT 'subscriber',
      terms_accepted_at VARCHAR(40) NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      plan_id VARCHAR(64) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      amount_ngn INT NOT NULL,
      paystack_reference VARCHAR(128) NULL,
      receipt_code VARCHAR(128) NULL,
      tracks_allowed INT NULL,
      tracks_used INT NOT NULL DEFAULT 0,
      starts_at VARCHAR(40) NULL,
      expires_at VARCHAR(40) NULL,
      paid_at VARCHAR(40) NULL,
      created_at VARCHAR(40) NOT NULL,
      UNIQUE KEY uq_subscriptions_paystack_reference (paystack_reference),
      UNIQUE KEY uq_subscriptions_receipt_code (receipt_code),
      KEY idx_subscriptions_user (user_id),
      CONSTRAINT fk_subscriptions_user
        FOREIGN KEY (user_id) REFERENCES users(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS mix_requests (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      subscription_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      artist_name VARCHAR(255) NULL,
      genre VARCHAR(128) NULL,
      bpm VARCHAR(32) NULL,
      musical_key VARCHAR(32) NULL,
      stem_link TEXT NULL,
      reference_links TEXT NULL,
      notes TEXT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'submitted',
      revision_count INT NOT NULL DEFAULT 0,
      admin_notes TEXT NULL,
      created_at VARCHAR(40) NOT NULL,
      updated_at VARCHAR(40) NOT NULL,
      KEY idx_mix_requests_user (user_id),
      CONSTRAINT fk_mix_requests_user
        FOREIGN KEY (user_id) REFERENCES users(id),
      CONSTRAINT fk_mix_requests_subscription
        FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureMixRequestColumns();
}

async function ensureMixRequestColumns() {
  const rows = await query(
    `SELECT COLUMN_NAME AS name
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mix_requests'`,
  );
  const columns = new Set(rows.map((col) => col.name));

  const additions = [
    ["artist_name", "VARCHAR(255) NULL"],
    ["genre", "VARCHAR(128) NULL"],
    ["bpm", "VARCHAR(32) NULL"],
    ["musical_key", "VARCHAR(32) NULL"],
    ["stem_link", "TEXT NULL"],
    ["reference_links", "TEXT NULL"],
    ["revision_count", "INT NOT NULL DEFAULT 0"],
    ["admin_notes", "TEXT NULL"],
  ];

  for (const [name, type] of additions) {
    if (!columns.has(name)) {
      await query(`ALTER TABLE mix_requests ADD COLUMN ${name} ${type}`);
    }
  }
}

export async function ensureAdminUser() {
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin_change_me";
  const existing = await queryOne("SELECT id FROM users WHERE email = ?", [email]);
  if (existing) return;

  const id = randomUUID();
  const timestamp = now();
  const passwordHash = bcrypt.hashSync(password, 10);

  await query(
    `INSERT INTO users (id, email, full_name, password_hash, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'admin', ?, ?)`,
    [id, email, "Dashboard Admin", passwordHash, timestamp, timestamp],
  );
}

export async function upsertSubscriber({ email, fullName, termsAccepted = false }) {
  const normalizedEmail = email.trim().toLowerCase();
  const timestamp = now();
  const existing = await queryOne("SELECT * FROM users WHERE email = ?", [normalizedEmail]);

  if (existing) {
    await query(
      `UPDATE users SET full_name = ?, terms_accepted_at = COALESCE(?, terms_accepted_at), updated_at = ?
       WHERE id = ?`,
      [fullName.trim(), termsAccepted ? timestamp : null, timestamp, existing.id],
    );
    return getUserById(existing.id);
  }

  const id = randomUUID();
  await query(
    `INSERT INTO users (id, email, full_name, role, terms_accepted_at, created_at, updated_at)
     VALUES (?, ?, ?, 'subscriber', ?, ?, ?)`,
    [
      id,
      normalizedEmail,
      fullName.trim(),
      termsAccepted ? timestamp : null,
      timestamp,
      timestamp,
    ],
  );

  return getUserById(id);
}

export async function markTermsAccepted(email) {
  const user = await queryOne("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
  if (!user) return null;
  const timestamp = now();
  await query("UPDATE users SET terms_accepted_at = ?, updated_at = ? WHERE id = ?", [
    timestamp,
    timestamp,
    user.id,
  ]);
  return getUserById(user.id);
}

export async function getUserByEmail(email) {
  return queryOne("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
}

export async function getUserById(id) {
  return queryOne("SELECT * FROM users WHERE id = ?", [id]);
}

export async function setUserPassword(userId, password) {
  const passwordHash = bcrypt.hashSync(password, 10);
  const timestamp = now();
  await query("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?", [
    passwordHash,
    timestamp,
    userId,
  ]);
  return getUserById(userId);
}

export function verifyUserPassword(user, password) {
  if (!user?.password_hash) return false;
  return bcrypt.compareSync(password, user.password_hash);
}

export async function createPendingSubscription(userId, planId, reference, receiptCode) {
  const plan = PLANS[planId];
  const id = randomUUID();
  const timestamp = now();

  await query(
    `INSERT INTO subscriptions
      (id, user_id, plan_id, status, amount_ngn, paystack_reference, receipt_code,
       tracks_allowed, tracks_used, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, 0, ?)`,
    [id, userId, planId, plan.priceNgn, reference, receiptCode, plan.tracksAllowed, timestamp],
  );

  return getSubscriptionByReference(reference);
}

export async function activateSubscription(reference, paidAt) {
  const sub = await getSubscriptionByReference(reference);
  if (!sub) return null;

  const plan = PLANS[sub.plan_id];
  const startsAt = paidAt || now();
  const expiresAt = addMonths(startsAt, plan.durationMonths);

  await query(
    `UPDATE subscriptions
     SET status = 'active', paid_at = ?, starts_at = ?, expires_at = ?
     WHERE paystack_reference = ?`,
    [startsAt, startsAt, expiresAt, reference],
  );

  return getSubscriptionByReference(reference);
}

export async function getSubscriptionByReference(reference) {
  return queryOne("SELECT * FROM subscriptions WHERE paystack_reference = ?", [reference]);
}

export async function getSubscriptionByReceipt(receiptCode) {
  return queryOne("SELECT * FROM subscriptions WHERE receipt_code = ?", [receiptCode]);
}

export async function getActiveSubscriptionForUser(userId) {
  return queryOne(
    `SELECT * FROM subscriptions
     WHERE user_id = ? AND status = 'active'
     ORDER BY paid_at DESC LIMIT 1`,
    [userId],
  );
}

export async function getSubscriptionsForUser(userId) {
  return query("SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC", [userId]);
}

export async function createMixRequest(userId, subscriptionId, payload) {
  const id = randomUUID();
  const timestamp = now();
  const {
    title,
    artistName,
    genre,
    bpm,
    musicalKey,
    stemLink,
    referenceLinks,
    notes,
  } = payload;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `INSERT INTO mix_requests (
        id, user_id, subscription_id, title, artist_name, genre, bpm, musical_key,
        stem_link, reference_links, notes, status, revision_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', 0, ?, ?)`,
      [
        id,
        userId,
        subscriptionId,
        title.trim(),
        artistName?.trim() || null,
        genre?.trim() || null,
        bpm?.trim() || null,
        musicalKey?.trim() || null,
        stemLink?.trim() || null,
        referenceLinks?.trim() || null,
        notes?.trim() || null,
        timestamp,
        timestamp,
      ],
    );
    await conn.execute("UPDATE subscriptions SET tracks_used = tracks_used + 1 WHERE id = ?", [
      subscriptionId,
    ]);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getMixRequestById(id);
}

export async function updateMixRequestBySubscriber(id, userId, payload) {
  const existing = await getMixRequestById(id);
  if (!existing || existing.user_id !== userId) return null;
  if (!["submitted", "revision"].includes(existing.status)) {
    return { error: "This mix can no longer be edited." };
  }

  const timestamp = now();
  await query(
    `UPDATE mix_requests SET
      title = COALESCE(?, title),
      artist_name = COALESCE(?, artist_name),
      genre = COALESCE(?, genre),
      bpm = COALESCE(?, bpm),
      musical_key = COALESCE(?, musical_key),
      stem_link = COALESCE(?, stem_link),
      reference_links = COALESCE(?, reference_links),
      notes = COALESCE(?, notes),
      updated_at = ?
     WHERE id = ?`,
    [
      payload.title?.trim() || null,
      payload.artistName?.trim() || null,
      payload.genre?.trim() || null,
      payload.bpm?.trim() || null,
      payload.musicalKey?.trim() || null,
      payload.stemLink?.trim() || null,
      payload.referenceLinks?.trim() || null,
      payload.notes?.trim() || null,
      timestamp,
      id,
    ],
  );

  return getMixRequestById(id);
}

export async function getMixRequestById(id) {
  return queryOne("SELECT * FROM mix_requests WHERE id = ?", [id]);
}

export async function getMixRequestsForUser(userId) {
  return query("SELECT * FROM mix_requests WHERE user_id = ? ORDER BY created_at DESC", [userId]);
}

export async function getAdminStats() {
  const subscribers = (await queryOne("SELECT COUNT(*) AS count FROM users WHERE role = 'subscriber'"))
    .count;
  const activeSubs = (
    await queryOne("SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'")
  ).count;
  const revenue = (
    await queryOne(
      "SELECT COALESCE(SUM(amount_ngn), 0) AS total FROM subscriptions WHERE status = 'active'",
    )
  ).total;
  const pendingMixes = (
    await queryOne(
      "SELECT COUNT(*) AS count FROM mix_requests WHERE status IN ('submitted', 'in_progress')",
    )
  ).count;

  return {
    subscribers: Number(subscribers),
    activeSubs: Number(activeSubs),
    revenue: Number(revenue),
    pendingMixes: Number(pendingMixes),
  };
}

export async function listSubscribers() {
  const rows = await query(
    `SELECT u.id, u.email, u.full_name, u.role, u.created_at, u.terms_accepted_at,
            (u.password_hash IS NOT NULL) AS has_password,
            (
              SELECT COUNT(*) FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active'
            ) AS active_plans
     FROM users u
     WHERE u.role = 'subscriber'
     ORDER BY u.created_at DESC`,
  );

  return rows.map((row) => ({
    ...row,
    has_password: Boolean(row.has_password),
    active_plans: Number(row.active_plans),
  }));
}

export async function listAllSubscriptions() {
  return query(
    `SELECT s.*, u.email, u.full_name
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC`,
  );
}

export async function listAllMixRequests() {
  return query(
    `SELECT m.*, u.email, u.full_name, s.receipt_code, s.plan_id
     FROM mix_requests m
     JOIN users u ON u.id = m.user_id
     JOIN subscriptions s ON s.id = m.subscription_id
     ORDER BY m.created_at DESC`,
  );
}

export async function updateMixRequestStatus(id, status, adminNotes) {
  const existing = await getMixRequestById(id);
  if (!existing) return null;

  const timestamp = now();
  const revisionBump = status === "revision" && existing.status !== "revision" ? 1 : 0;

  await query(
    `UPDATE mix_requests
     SET status = ?,
         admin_notes = COALESCE(?, admin_notes),
         revision_count = revision_count + ?,
         updated_at = ?
     WHERE id = ?`,
    [status, adminNotes?.trim() || null, revisionBump, timestamp, id],
  );

  return getMixRequestById(id);
}

export async function updateSubscriptionAdmin(id, { tracksUsed, status }) {
  if (tracksUsed !== undefined) {
    await query("UPDATE subscriptions SET tracks_used = ? WHERE id = ?", [tracksUsed, id]);
  }
  if (status) {
    await query("UPDATE subscriptions SET status = ? WHERE id = ?", [status, id]);
  }
  return queryOne("SELECT * FROM subscriptions WHERE id = ?", [id]);
}

export { pool };
