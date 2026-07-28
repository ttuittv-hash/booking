import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { buildSeedRateTable } from "./pricing/seed";
import type {
  AppUser,
  AuditLogEntry,
  ContractAdjustment,
  Quote,
  QuoteStatus,
  RateTable,
  Settlement,
  UserRole,
} from "./pricing/types";

const DB_PATH = path.join(process.cwd(), "data", "app.db");

declare global {
  var __seoulArenaDb: DatabaseSync | undefined;
}

function createConnection(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_tables (
      version TEXT PRIMARY KEY,
      vat_rate REAL NOT NULL,
      extra_week_ratio REAL NOT NULL,
      packages_json TEXT NOT NULL,
      addons_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      applicant_id TEXT NOT NULL,
      rate_table_version TEXT NOT NULL,
      selection_json TEXT NOT NULL,
      line_items_json TEXT NOT NULL,
      subtotal REAL NOT NULL,
      vat REAL NOT NULL,
      total REAL NOT NULL,
      metered_notice TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      contract_json TEXT,
      settlement_json TEXT,
      FOREIGN KEY (applicant_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      stage TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      actor_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const rateTableCount = db.prepare("SELECT COUNT(*) as n FROM rate_tables").get() as { n: number };
  if (rateTableCount.n === 0) {
    insertRateTable(db, buildSeedRateTable());
  }

  const adminCount = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'ADMIN'").get() as {
    n: number;
  };
  if (adminCount.n === 0) {
    const email = process.env.SEED_ADMIN_EMAIL || "admin@seoularena.kr";
    const password = process.env.SEED_ADMIN_PASSWORD || "admin1234!";
    db.prepare(
      `INSERT INTO users (id, email, password_hash, name, company_name, role, created_at)
       VALUES (?, ?, ?, ?, NULL, 'ADMIN', ?)`,
    ).run(crypto.randomUUID(), email.toLowerCase(), bcrypt.hashSync(password, 10), "운영자", new Date().toISOString());
    console.log(
      `[seoularena] 초기 운영자 계정이 생성되었습니다 — email: ${email} / password: ${password} (배포 전 반드시 변경하세요)`,
    );
  }

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__seoulArenaDb) {
    globalThis.__seoulArenaDb = createConnection();
  }
  return globalThis.__seoulArenaDb;
}

function insertRateTable(db: DatabaseSync, rateTable: RateTable) {
  db.prepare(
    `INSERT INTO rate_tables (version, vat_rate, extra_week_ratio, packages_json, addons_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    rateTable.version,
    rateTable.vatRate,
    rateTable.extraWeekRatio,
    JSON.stringify(rateTable.packages),
    JSON.stringify(rateTable.addons),
    rateTable.updatedAt,
  );
}

// ---------------------------------------------------------------------------
// Rate table
// ---------------------------------------------------------------------------

export function getCurrentRateTable(): RateTable {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM rate_tables ORDER BY updated_at DESC LIMIT 1")
    .get() as
    | {
        version: string;
        vat_rate: number;
        extra_week_ratio: number;
        packages_json: string;
        addons_json: string;
        updated_at: string;
      }
    | undefined;
  if (!row) throw new Error("요금표가 초기화되지 않았습니다.");
  return {
    version: row.version,
    vatRate: row.vat_rate,
    extraWeekRatio: row.extra_week_ratio,
    packages: JSON.parse(row.packages_json),
    addons: JSON.parse(row.addons_json),
    updatedAt: row.updated_at,
  };
}

export function saveNewRateTableVersion(
  next: Omit<RateTable, "version" | "updatedAt">,
): RateTable {
  const db = getDb();
  const version = `v-${Date.now()}`;
  const rateTable: RateTable = { ...next, version, updatedAt: new Date().toISOString() };
  insertRateTable(db, rateTable);
  return rateTable;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  company_name: string | null;
  role: UserRole;
  created_at: string;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    companyName: row.company_name,
    role: row.role,
    createdAt: row.created_at,
  };
}

export function createUser(input: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  companyName: string | null;
  role: UserRole;
  createdAt: string;
}): AppUser {
  const db = getDb();
  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, company_name, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.email.toLowerCase(),
    input.passwordHash,
    input.name,
    input.companyName,
    input.role,
    input.createdAt,
  );
  return {
    id: input.id,
    email: input.email.toLowerCase(),
    name: input.name,
    companyName: input.companyName,
    role: input.role,
    createdAt: input.createdAt,
  };
}

export function findUserByEmailWithPasswordHash(
  email: string,
): (AppUser & { passwordHash: string }) | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | UserRow
    | undefined;
  if (!row) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash };
}

export function findUserById(id: string): AppUser | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toAppUser(row) : undefined;
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------

interface QuoteRow {
  id: string;
  applicant_id: string;
  rate_table_version: string;
  selection_json: string;
  line_items_json: string;
  subtotal: number;
  vat: number;
  total: number;
  metered_notice: string;
  status: QuoteStatus;
  created_at: string;
  contract_json: string | null;
  settlement_json: string | null;
}

function toQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    rateTableVersion: row.rate_table_version,
    selection: JSON.parse(row.selection_json),
    lineItems: JSON.parse(row.line_items_json),
    subtotal: row.subtotal,
    vat: row.vat,
    total: row.total,
    meteredNotice: row.metered_notice,
    status: row.status,
    createdAt: row.created_at,
    contract: row.contract_json ? JSON.parse(row.contract_json) : null,
    settlement: row.settlement_json ? JSON.parse(row.settlement_json) : null,
  };
}

export function createQuote(input: {
  id: string;
  applicantId: string;
  rateTableVersion: string;
  selection: Quote["selection"];
  lineItems: Quote["lineItems"];
  subtotal: number;
  vat: number;
  total: number;
  meteredNotice: string;
  createdAt: string;
}): Quote {
  const db = getDb();
  db.prepare(
    `INSERT INTO quotes
      (id, applicant_id, rate_table_version, selection_json, line_items_json, subtotal, vat, total, metered_notice, status, created_at, contract_json, settlement_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ESTIMATE', ?, NULL, NULL)`,
  ).run(
    input.id,
    input.applicantId,
    input.rateTableVersion,
    JSON.stringify(input.selection),
    JSON.stringify(input.lineItems),
    input.subtotal,
    input.vat,
    input.total,
    input.meteredNotice,
    input.createdAt,
  );
  return getQuoteById(input.id)!;
}

export function getQuoteById(id: string): Quote | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM quotes WHERE id = ?").get(id) as QuoteRow | undefined;
  return row ? toQuote(row) : undefined;
}

export function listQuotes(filter?: { applicantId?: string }): Quote[] {
  const db = getDb();
  const rows = filter?.applicantId
    ? (db
        .prepare("SELECT * FROM quotes WHERE applicant_id = ? ORDER BY created_at DESC")
        .all(filter.applicantId) as unknown as QuoteRow[])
    : (db.prepare("SELECT * FROM quotes ORDER BY created_at DESC").all() as unknown as QuoteRow[]);
  return rows.map(toQuote);
}

export function setQuoteContract(id: string, contract: ContractAdjustment): Quote {
  const db = getDb();
  db.prepare("UPDATE quotes SET status = 'CONTRACTED', contract_json = ? WHERE id = ?").run(
    JSON.stringify(contract),
    id,
  );
  return getQuoteById(id)!;
}

export function setQuoteSettlement(id: string, settlement: Settlement): Quote {
  const db = getDb();
  db.prepare("UPDATE quotes SET status = 'SETTLED', settlement_json = ? WHERE id = ?").run(
    JSON.stringify(settlement),
    id,
  );
  return getQuoteById(id)!;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export function addAuditLog(entry: {
  id: string;
  quoteId: string;
  stage: QuoteStatus;
  snapshot: unknown;
  actorId: string;
  createdAt: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO audit_logs (id, quote_id, stage, snapshot_json, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(entry.id, entry.quoteId, entry.stage, JSON.stringify(entry.snapshot), entry.actorId, entry.createdAt);
}

export function listAuditLogsForQuote(quoteId: string): AuditLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM audit_logs WHERE quote_id = ? ORDER BY created_at ASC")
    .all(quoteId) as {
    id: string;
    quote_id: string;
    stage: QuoteStatus;
    snapshot_json: string;
    actor_id: string;
    created_at: string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    quoteId: row.quote_id,
    stage: row.stage,
    snapshot: JSON.parse(row.snapshot_json),
    actorId: row.actor_id,
    createdAt: row.created_at,
  }));
}
