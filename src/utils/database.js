import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH  = join(DATA_DIR, 'blackbook.db');

let db;

export async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (existsSync(DB_PATH)) {
    db = new SQL.Database(readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  initSchema();
  // Safe migrations for existing databases
  try { db.run(`ALTER TABLE tasks ADD COLUMN warned_expiry INTEGER DEFAULT 0`); saveDb(); } catch {}
  return db;
}

function saveDb() {
  writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      category      TEXT    NOT NULL,
      title         TEXT    NOT NULL,
      description   TEXT    NOT NULL,
      deadline      TEXT,
      slots         INTEGER DEFAULT NULL,
      warned_expiry INTEGER DEFAULT 0,
      created_at    TEXT    DEFAULT (datetime('now')),
      created_by    TEXT    NOT NULL
    );
    CREATE TABLE IF NOT EXISTS claims (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id    INTEGER NOT NULL,
      user_id    TEXT    NOT NULL,
      username   TEXT    NOT NULL,
      claimed_at TEXT    DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS submissions (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id      INTEGER NOT NULL,
      claim_id     INTEGER NOT NULL,
      user_id      TEXT    NOT NULL,
      username     TEXT    NOT NULL,
      proof        TEXT    NOT NULL,
      image_url    TEXT    DEFAULT NULL,
      status       TEXT    DEFAULT 'pending',
      submitted_at TEXT    DEFAULT (datetime('now'))
    );
  `);
  saveDb();
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  return queryAll(sql, params)[0] ?? null;
}

function run(sql, params = []) {
  db.run(sql, params);
  const row = queryOne('SELECT last_insert_rowid() as id');
  saveDb();
  return row?.id ?? null;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function addTask({ category, title, description, deadline, slots, createdBy }) {
  await getDb();
  const id = run(`INSERT INTO tasks (category, title, description, deadline, slots, created_by) VALUES (?, ?, ?, ?, ?, ?)`,
    [category, title, description, deadline ?? null, slots ?? null, createdBy]);
  return { lastInsertRowid: id };
}

export async function removeTask(id) {
  await getDb();
  run('DELETE FROM tasks WHERE id = ?', [id]);
}

export async function getTaskById(id) {
  await getDb();
  return queryOne('SELECT * FROM tasks WHERE id = ?', [id]);
}

export async function clearTasksByCategory(category) {
  await getDb();
  run('DELETE FROM tasks WHERE category = ?', [category]);
}

export async function clearAllTasks() {
  await getDb();
  run('DELETE FROM tasks');
}

export async function getTasksByCategory(category) {
  await getDb();
  return queryAll(`
    SELECT t.*, COUNT(DISTINCT c.id) as claim_count
    FROM tasks t
    LEFT JOIN claims c ON c.task_id = t.id
    WHERE t.category = ?
    AND (
      t.slots IS NULL
      OR (SELECT COUNT(*) FROM submissions s WHERE s.task_id = t.id AND s.status IN ('pending', 'approved')) < t.slots
    )
    GROUP BY t.id
    ORDER BY t.id ASC
  `, [category]);
}

export async function getTasksWithClaimCounts() {
  await getDb();
  return queryAll(`
    SELECT t.*, COUNT(DISTINCT c.id) as claim_count
    FROM tasks t
    LEFT JOIN claims c ON c.task_id = t.id
    GROUP BY t.id
    ORDER BY t.category, t.id ASC
  `);
}

// ── Claims ────────────────────────────────────────────────────────────────────

export async function claimTask({ taskId, userId, username }) {
  await getDb();
  const id = run('INSERT INTO claims (task_id, user_id, username) VALUES (?, ?, ?)', [taskId, userId, username]);
  return { lastInsertRowid: id };
}

// FIX: check if user already has an active (unsubmitted) claim on this task
export async function hasActiveClaimOnTask(taskId, userId) {
  await getDb();
  const row = queryOne(`
    SELECT c.id FROM claims c
    WHERE c.task_id = ? AND c.user_id = ?
    AND c.id NOT IN (
      SELECT claim_id FROM submissions WHERE status IN ('pending', 'approved')
    )
  `, [taskId, userId]);
  return !!row;
}

export async function getClaimsForTask(taskId) {
  await getDb();
  return queryAll('SELECT * FROM claims WHERE task_id = ? ORDER BY claimed_at ASC', [taskId]);
}

export async function getClaimCount(taskId) {
  await getDb();
  const row = queryOne('SELECT COUNT(*) as count FROM claims WHERE task_id = ?', [taskId]);
  return row?.count ?? 0;
}

export async function getActiveClaimsForUser(userId) {
  await getDb();
  return queryAll(`
    SELECT c.id as claim_id, c.task_id, c.claimed_at,
           t.title, t.description, t.category, t.deadline
    FROM claims c
    JOIN tasks t ON t.id = c.task_id
    WHERE c.user_id = ?
    AND c.id NOT IN (
      SELECT claim_id FROM submissions WHERE status IN ('pending', 'approved')
    )
    ORDER BY c.claimed_at DESC
  `, [userId]);
}

export async function unclaimTask({ taskId, userId }) {
  await getDb();
  run(`DELETE FROM claims WHERE task_id = ? AND user_id = ?`, [taskId, userId]);
  run(`DELETE FROM submissions WHERE task_id = ? AND user_id = ? AND status = 'pending'`, [taskId, userId]);
}

// ── Submissions ───────────────────────────────────────────────────────────────

export async function addSubmission({ taskId, claimId, userId, username, proof, imageUrl }) {
  await getDb();
  const id = run(`INSERT INTO submissions (task_id, claim_id, user_id, username, proof, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
    [taskId, claimId, userId, username, proof, imageUrl ?? null]);
  console.log(`[DB] addSubmission inserted ID: ${id}`);
  return { lastInsertRowid: id };
}

export async function getSubmission(id) {
  await getDb();
  const result = queryOne('SELECT * FROM submissions WHERE id = ?', [id]);
  console.log(`[DB] getSubmission(${id}):`, result);
  return result;
}

export async function approveSubmission(id) {
  await getDb();
  run(`UPDATE submissions SET status = 'approved' WHERE id = ?`, [id]);
}

export async function rejectSubmission(id) {
  await getDb();
  run(`UPDATE submissions SET status = 'rejected' WHERE id = ?`, [id]);
}

// ── Expiry ────────────────────────────────────────────────────────────────────

export async function getTasksExpiringSoon(withinMs) {
  await getDb();
  const cutoff = new Date(Date.now() + withinMs).toISOString();
  const now    = new Date().toISOString();
  return queryAll(`
    SELECT * FROM tasks
    WHERE deadline IS NOT NULL
    AND deadline > ? AND deadline <= ?
    AND (warned_expiry IS NULL OR warned_expiry = 0)
  `, [now, cutoff]);
}

export async function getExpiredTasks() {
  await getDb();
  const now = new Date().toISOString();
  return queryAll(`SELECT * FROM tasks WHERE deadline IS NOT NULL AND deadline <= ?`, [now]);
}

export async function markExpiryWarned(taskId) {
  await getDb();
  run(`UPDATE tasks SET warned_expiry = 1 WHERE id = ?`, [taskId]);
}

export async function getUnsubmittedClaimants(taskId) {
  await getDb();
  return queryAll(`
    SELECT c.user_id, c.username FROM claims c
    WHERE c.task_id = ?
    AND c.id NOT IN (SELECT claim_id FROM submissions WHERE status IN ('pending', 'approved'))
  `, [taskId]);
}
