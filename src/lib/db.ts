import { DatabaseSync } from "node:sqlite";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./dataDir";
import { buildSeedRateTable } from "./pricing/seed";
import { SEED_PAGES } from "./pricing/pageSeed";
import { DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT, DEFAULT_VENUE_CONTENT } from "./content/seed";
import { FEATURE_SPEC_SEED } from "./featureSpecSeed";
import { FEATURE_SPEC_SHEET_KEYS } from "./pricing/types";
import type { GuideContent, HomeContent, VenueContent } from "./content/types";
import type {
  ApprovalStatus,
  AppNotification,
  AppUser,
  Attachment,
  AttachmentCategory,
  AuditLogEntry,
  Company,
  ContractAdjustment,
  ContractSignature,
  Deposit,
  DepositStatus,
  Faq,
  FacilityMeeting,
  FeatureSpecRow,
  FeatureSpecSheetKey,
  Inquiry,
  InquiryStatus,
  InvoicePurpose,
  InvoiceStatus,
  Notice,
  PageGroup,
  Quote,
  QuoteStatus,
  RateTable,
  Review,
  Settlement,
  DateBlock,
  StaticPage,
  TaxInvoice,
  TicketOpen,
  UserRole,
  AdminTier,
  WeekDemand,
} from "./pricing/types";

const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  var __seoulArenaDb: DatabaseSync | undefined;
}

// CREATE TABLE IF NOT EXISTS는 이미 존재하는(운영 중인) 테이블에는 새 컬럼을 추가해주지 않으므로,
// 스키마에 컬럼을 추가할 때는 반드시 이 헬퍼로 기존 DB에도 마이그레이션해야 한다.
function ensureColumn(db: DatabaseSync, table: string, column: string, definition: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function createConnection(): DatabaseSync {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      business_registration_number TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      company_name TEXT,
      company_id TEXT REFERENCES companies(id),
      role TEXT NOT NULL,
      approval_status TEXT NOT NULL DEFAULT 'APPROVED',
      terms_agreed_at TEXT,
      privacy_agreed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rate_tables (
      version TEXT PRIMARY KEY,
      vat_rate REAL NOT NULL,
      extra_week_ratio REAL NOT NULL,
      day_exclusion_discount_ratio REAL NOT NULL DEFAULT 0.1667,
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
      review_json TEXT,
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

    CREATE TABLE IF NOT EXISTS deposits (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL UNIQUE,
      required_amount REAL NOT NULL,
      deposit_rate REAL NOT NULL,
      status TEXT NOT NULL,
      depositor_name TEXT,
      reported_at TEXT,
      confirmed_at TEXT,
      confirmed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );

    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL,
      quote_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS notices (
      id TEXT PRIMARY KEY,
      tag TEXT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      image_url TEXT,
      attachment_url TEXT,
      attachment_name TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      tag TEXT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      page_group TEXT NOT NULL,
      slug TEXT NOT NULL,
      nav_label TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(page_group, slug)
    );

    CREATE TABLE IF NOT EXISTS site_content (
      page TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- 내부 기능정의서(기획 문서) — 시트별로 표 전체를 JSON 배열로 저장한다.
    -- 마스터 관리자만 편집 가능 (src/lib/auth.ts의 requireMasterAdmin 참고).
    CREATE TABLE IF NOT EXISTS feature_spec_sheets (
      sheet_key TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS date_blocks (
      date TEXT PRIMARY KEY,
      reason TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contract_signatures (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL UNIQUE,
      venue_signed_at TEXT,
      venue_signed_by TEXT,
      applicant_signed_at TEXT,
      applicant_signed_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );

    CREATE TABLE IF NOT EXISTS tax_invoices (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL,
      purpose TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      issued_at TEXT,
      issued_by TEXT,
      payer_name TEXT,
      reported_at TEXT,
      paid_at TEXT,
      paid_confirmed_by TEXT,
      last_reminder_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id),
      UNIQUE(quote_id, purpose)
    );

    CREATE TABLE IF NOT EXISTS ticket_opens (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL UNIQUE,
      open_date TEXT,
      materials_uploaded_at TEXT,
      last_reminder_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );

    CREATE TABLE IF NOT EXISTS facility_meetings (
      id TEXT PRIMARY KEY,
      quote_id TEXT NOT NULL UNIQUE,
      meeting_date TEXT,
      materials_uploaded_at TEXT,
      last_reminder_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (quote_id) REFERENCES quotes(id)
    );

    CREATE TABLE IF NOT EXISTS inquiries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      answer TEXT,
      answered_at TEXT,
      answered_by TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // 이미 배포되어 있던 DB(기존 users/rate_tables 등)에는 CREATE TABLE IF NOT EXISTS가 새 컬럼을
  // 추가해주지 않으므로, 이후 세션에서 추가된 컬럼들을 여기서 한 번에 마이그레이션한다.
  ensureColumn(db, "users", "company_id", "TEXT REFERENCES companies(id)");
  ensureColumn(db, "users", "approval_status", "TEXT NOT NULL DEFAULT 'APPROVED'");
  ensureColumn(db, "rate_tables", "day_exclusion_discount_ratio", "REAL NOT NULL DEFAULT 0.1667");
  ensureColumn(db, "notices", "image_url", "TEXT");
  ensureColumn(db, "notices", "tag", "TEXT");
  ensureColumn(db, "faqs", "tag", "TEXT");
  ensureColumn(db, "quotes", "review_json", "TEXT");
  ensureColumn(db, "companies", "business_registration_number", "TEXT");
  ensureColumn(db, "notices", "attachment_url", "TEXT");
  ensureColumn(db, "notices", "attachment_name", "TEXT");
  ensureColumn(db, "users", "phone", "TEXT");
  ensureColumn(db, "users", "terms_agreed_at", "TEXT");
  ensureColumn(db, "users", "privacy_agreed_at", "TEXT");
  ensureColumn(db, "users", "username", "TEXT");
  ensureColumn(db, "companies", "representative_name", "TEXT");
  ensureColumn(db, "companies", "postal_code", "TEXT");
  ensureColumn(db, "companies", "address", "TEXT");
  ensureColumn(db, "companies", "business_cert_url", "TEXT");
  ensureColumn(db, "companies", "business_cert_name", "TEXT");
  ensureColumn(db, "attachments", "category", "TEXT");
  ensureColumn(db, "users", "withdrawn_at", "TEXT");
  ensureColumn(db, "users", "admin_tier", "TEXT");
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL",
  );

  // admin_tier 컬럼 도입 이전에 만들어진 운영자 계정 부트스트랩:
  // 마스터 관리자가 한 명도 없으면, 가장 먼저 만들어진 운영자 계정을 마스터로 승격하고
  // 나머지 운영자는 일반관리자(BASIC)로 채워둔다. (한 번만 실행되며, 이후엔 무동작)
  const masterCount = db
    .prepare("SELECT COUNT(*) as n FROM users WHERE role = 'ADMIN' AND admin_tier = 'MASTER'")
    .get() as { n: number };
  if (masterCount.n === 0) {
    const oldestAdmin = db
      .prepare("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1")
      .get() as { id: string } | undefined;
    if (oldestAdmin) {
      db.prepare("UPDATE users SET admin_tier = 'MASTER' WHERE id = ?").run(oldestAdmin.id);
      db.prepare(
        "UPDATE users SET admin_tier = 'BASIC' WHERE role = 'ADMIN' AND admin_tier IS NULL",
      ).run();
    }
  } else {
    db.prepare(
      "UPDATE users SET admin_tier = 'BASIC' WHERE role = 'ADMIN' AND admin_tier IS NULL",
    ).run();
  }

  // MASTER_ADMIN_EMAILS(콤마로 구분된 이메일 목록) 환경변수에 있는 이메일로 이미 가입된
  // 계정이 있으면 마스터 관리자로 승격한다(신청자 계정이었다면 운영자로도 함께 전환).
  // 배포 환경변수로만 제어되고 코드에는 특정 개인 이메일을 박아두지 않는다 — 앱을 재시작할
  // 때마다 다시 확인하므로, 아직 가입 전이었던 이메일도 나중에 가입하면 다음 재시작 때 승격된다.
  const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  masterEmails.forEach((email) => {
    db.prepare(
      "UPDATE users SET role = 'ADMIN', admin_tier = 'MASTER', approval_status = 'APPROVED' WHERE email = ?",
    ).run(email);
  });

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
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, name, company_name, role, admin_tier, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, 'ADMIN', 'MASTER', ?)`,
    ).run(
      crypto.randomUUID(),
      username,
      email.toLowerCase(),
      bcrypt.hashSync(password, 10),
      "운영자",
      new Date().toISOString(),
    );
    console.log(
      `[seoularena] 초기 운영자 계정이 생성되었습니다 — 아이디: ${username} / password: ${password} (배포 전 반드시 변경하세요)`,
    );
  }

  // 내부 테스트용 — 승인 절차 없이 바로 대관 신청까지 이용 가능한 신청자 계정
  const testApplicantEmail = (process.env.SEED_TEST_APPLICANT_EMAIL || "test@seoularena.kr").toLowerCase();
  const existingTestApplicant = db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get(testApplicantEmail);
  if (!existingTestApplicant) {
    const testPassword = process.env.SEED_TEST_APPLICANT_PASSWORD || "test1234!";
    const testUsername = process.env.SEED_TEST_APPLICANT_USERNAME || "test";
    db.prepare(
      `INSERT INTO users (id, username, email, password_hash, name, company_name, role, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'APPLICANT', ?)`,
    ).run(
      crypto.randomUUID(),
      testUsername,
      testApplicantEmail,
      bcrypt.hashSync(testPassword, 10),
      "테스트 담당자",
      "테스트용 계정",
      new Date().toISOString(),
    );
    console.log(
      `[seoularena] 내부 테스트용 신청자 계정이 생성되었습니다 (승인 완료 상태) — 아이디: ${testUsername} / password: ${testPassword}`,
    );
  }

  // 서울아레나 소개 / 대관 안내 하위 페이지 — 최초 1회만 기본 콘텐츠로 시드한다.
  const pageCount = db.prepare("SELECT COUNT(*) as n FROM pages").get() as { n: number };
  if (pageCount.n === 0) {
    const now = new Date().toISOString();
    const insertPage = db.prepare(
      `INSERT INTO pages (id, page_group, slug, nav_label, title, body, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    SEED_PAGES.forEach((p, i) => {
      insertPage.run(crypto.randomUUID(), p.group, p.slug, p.navLabel, p.title, p.body, i, now, now);
    });
  }

  // 기능정의서(내부 기획 문서) — 최초 1회만 시드 데이터로 채운다.
  const featureSpecCount = db
    .prepare("SELECT COUNT(*) as n FROM feature_spec_sheets")
    .get() as { n: number };
  if (featureSpecCount.n === 0) {
    const now = new Date().toISOString();
    const insertSheet = db.prepare(
      "INSERT INTO feature_spec_sheets (sheet_key, data, updated_at) VALUES (?, ?, ?)",
    );
    FEATURE_SPEC_SHEET_KEYS.forEach((key) => {
      insertSheet.run(key, JSON.stringify(FEATURE_SPEC_SEED[key] ?? []), now);
    });
  }

  // 메뉴트리(프론트) 1회성 마이그레이션: "대분류" 하나였던 값을 "구분"(GNB/푸터) +
  // "대분류"(짧은 이름: 유어스테이지·북잇·노우잇·호스트잇·하단·마이)로 분리하고,
  // "마이"(신청자 마이페이지) 행들을 맨 뒤로 옮긴다. 이미 "구분" 필드가 있으면(=한 번
  // 실행됐으면) 다시 건드리지 않는다 — 그 뒤에 마스터 관리자가 손으로 고친 내용을
  // 덮어쓰지 않기 위함.
  const menuFrontRow = db
    .prepare("SELECT data FROM feature_spec_sheets WHERE sheet_key = ?")
    .get("메뉴트리(프론트)") as { data: string } | undefined;
  if (menuFrontRow) {
    const menuFrontRows = JSON.parse(menuFrontRow.data) as Record<string, string>[];
    const alreadyMigrated = menuFrontRows.some((r) => "구분" in r);
    if (!alreadyMigrated) {
      const LABEL_MAP: Record<string, [string, string]> = {
        "신청자 마이페이지": ["GNB", "마이"],
        "GNB·YOUR STAGE": ["GNB", "유어스테이지"],
        "GNB·BOOK IT": ["GNB", "북잇"],
        "GNB·KNOW IT": ["GNB", "노우잇"],
        "GNB·HOST IT": ["GNB", "호스트잇"],
        "GNB·하단": ["GNB", "하단"],
      };
      const transformed = menuFrontRows.map((row) => {
        const old = row["대분류"];
        const [gubun, daebunryu] = LABEL_MAP[old] ?? ["GNB", old];
        const next: Record<string, string> = { 구분: gubun, 대분류: daebunryu };
        for (const [k, v] of Object.entries(row)) {
          if (k === "대분류") continue;
          next[k] = v;
        }
        return next;
      });
      const mai = transformed.filter((r) => r["대분류"] === "마이");
      const others = transformed.filter((r) => r["대분류"] !== "마이");
      db.prepare(
        "UPDATE feature_spec_sheets SET data = ?, updated_at = ? WHERE sheet_key = ?",
      ).run(JSON.stringify([...others, ...mai]), new Date().toISOString(), "메뉴트리(프론트)");
    }
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
    `INSERT INTO rate_tables (version, vat_rate, extra_week_ratio, day_exclusion_discount_ratio, packages_json, addons_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    rateTable.version,
    rateTable.vatRate,
    rateTable.extraWeekRatio,
    rateTable.dayExclusionDiscountRatio,
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
        day_exclusion_discount_ratio: number;
        packages_json: string;
        addons_json: string;
        updated_at: string;
      }
    | undefined;
  if (!row) throw new Error("요금표가 초기화되지 않았습니다.");
  // 과거 버전(할인율 필드 추가 이전)에 저장된 패키지는 discountRatio가 없을 수 있으므로 기본값 0으로 보정한다.
  const rawPackages = JSON.parse(row.packages_json) as Array<
    RateTable["packages"][number] & { discountRatio?: number }
  >;
  const packages = rawPackages.map((pkg) => ({ ...pkg, discountRatio: pkg.discountRatio ?? 0 }));
  return {
    version: row.version,
    vatRate: row.vat_rate,
    extraWeekRatio: row.extra_week_ratio,
    dayExclusionDiscountRatio: row.day_exclusion_discount_ratio,
    packages,
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
// 기획사(법인)
// ---------------------------------------------------------------------------

interface CompanyRow {
  id: string;
  name: string;
  business_registration_number: string | null;
  representative_name: string | null;
  postal_code: string | null;
  address: string | null;
  business_cert_url: string | null;
  business_cert_name: string | null;
  created_at: string;
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    businessRegistrationNumber: row.business_registration_number,
    representativeName: row.representative_name,
    postalCode: row.postal_code,
    address: row.address,
    businessCertUrl: row.business_cert_url,
    businessCertName: row.business_cert_name,
    createdAt: row.created_at,
  };
}

// 회사명으로 기존 기획사를 찾거나 없으면 새로 만든다 (대소문자·공백 무시하고 매칭).
// 이미 등록된 회사라면 사업자등록번호 등 법인 정보는 최초 등록 값을 그대로 유지한다.
export function findOrCreateCompany(
  name: string,
  extra?: {
    businessRegistrationNumber?: string;
    representativeName?: string;
    postalCode?: string;
    address?: string;
    businessCertUrl?: string;
    businessCertName?: string;
  },
): Company {
  const db = getDb();
  const trimmed = name.trim();
  const existing = db
    .prepare("SELECT * FROM companies WHERE lower(name) = lower(?)")
    .get(trimmed) as CompanyRow | undefined;
  if (existing) return toCompany(existing);

  const row: CompanyRow = {
    id: crypto.randomUUID(),
    name: trimmed,
    business_registration_number: extra?.businessRegistrationNumber?.trim() || null,
    representative_name: extra?.representativeName?.trim() || null,
    postal_code: extra?.postalCode?.trim() || null,
    address: extra?.address?.trim() || null,
    business_cert_url: extra?.businessCertUrl || null,
    business_cert_name: extra?.businessCertName || null,
    created_at: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO companies
      (id, name, business_registration_number, representative_name, postal_code, address, business_cert_url, business_cert_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    row.id,
    row.name,
    row.business_registration_number,
    row.representative_name,
    row.postal_code,
    row.address,
    row.business_cert_url,
    row.business_cert_name,
    row.created_at,
  );
  return toCompany(row);
}

export function findCompanyById(id: string): Company | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM companies WHERE id = ?").get(id) as CompanyRow | undefined;
  return row ? toCompany(row) : undefined;
}

export function listCompanies(): Company[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM companies ORDER BY name ASC").all() as unknown as CompanyRow[];
  return rows.map(toCompany);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  username: string | null;
  email: string;
  phone: string | null;
  password_hash: string;
  name: string;
  company_name: string | null;
  company_id: string | null;
  role: UserRole;
  approval_status: ApprovalStatus;
  admin_tier: AdminTier | null;
  withdrawn_at: string | null;
  created_at: string;
}

function toAppUser(row: UserRow): AppUser {
  return {
    id: row.id,
    username: row.username ?? row.email,
    email: row.email,
    phone: row.phone,
    name: row.name,
    companyName: row.company_name,
    companyId: row.company_id,
    role: row.role,
    approvalStatus: row.approval_status,
    adminTier: row.role === "ADMIN" ? (row.admin_tier ?? "BASIC") : null,
    createdAt: row.created_at,
  };
}

export function createUser(input: {
  id: string;
  username: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
  name: string;
  companyName: string | null;
  companyId?: string | null;
  role: UserRole;
  approvalStatus?: ApprovalStatus;
  // role이 ADMIN일 때만 의미가 있다. 생략하면 신규 운영자는 일반관리자(BASIC)로 시작한다.
  adminTier?: AdminTier;
  termsAgreedAt?: string | null;
  privacyAgreedAt?: string | null;
  createdAt: string;
}): AppUser {
  const db = getDb();
  const approvalStatus = input.approvalStatus ?? "APPROVED";
  const companyId = input.companyId ?? null;
  const phone = input.phone ?? null;
  const adminTier: AdminTier | null = input.role === "ADMIN" ? (input.adminTier ?? "BASIC") : null;
  db.prepare(
    `INSERT INTO users (id, username, email, phone, password_hash, name, company_name, company_id, role, approval_status, admin_tier, terms_agreed_at, privacy_agreed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.username,
    input.email.toLowerCase(),
    phone,
    input.passwordHash,
    input.name,
    input.companyName,
    companyId,
    input.role,
    approvalStatus,
    adminTier,
    input.termsAgreedAt ?? null,
    input.privacyAgreedAt ?? null,
    input.createdAt,
  );
  return {
    id: input.id,
    username: input.username,
    email: input.email.toLowerCase(),
    phone,
    name: input.name,
    companyName: input.companyName,
    companyId,
    role: input.role,
    approvalStatus,
    adminTier,
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
  if (!row || row.withdrawn_at) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash };
}

// 승인 대기 중인 신청도 포함해 동일 전화번호로 이미 가입된 계정이 있는지 확인한다
// (승인 전에 이메일만 바꿔 중복 신청하는 것을 막기 위함).
export function findUserByPhone(phone: string): AppUser | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone.trim()) as UserRow | undefined;
  return row ? toAppUser(row) : undefined;
}

export function findUserByUsername(username: string): AppUser | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim()) as
    | UserRow
    | undefined;
  return row ? toAppUser(row) : undefined;
}

// 로그인 식별자로 아이디 또는 이메일을 모두 허용한다 (아이디 필드 도입 이전 계정과의 호환을 위함).
export function findUserByLoginIdWithPasswordHash(
  loginId: string,
): (AppUser & { passwordHash: string }) | undefined {
  const db = getDb();
  const trimmed = loginId.trim();
  const row = db.prepare("SELECT * FROM users WHERE username = ? OR email = ?").get(
    trimmed,
    trimmed.toLowerCase(),
  ) as UserRow | undefined;
  if (!row || row.withdrawn_at) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash };
}

export function listUsers(filter?: { role?: UserRole; approvalStatus?: ApprovalStatus }): AppUser[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter?.role) {
    conditions.push("role = ?");
    params.push(filter.role);
  }
  if (filter?.approvalStatus) {
    conditions.push("approval_status = ?");
    params.push(filter.approvalStatus);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = db
    .prepare(`SELECT * FROM users ${where} ORDER BY created_at ASC`)
    .all(...params) as unknown as UserRow[];
  return rows.map(toAppUser);
}

export function setUserApprovalStatus(id: string, approvalStatus: ApprovalStatus): AppUser {
  const db = getDb();
  db.prepare("UPDATE users SET approval_status = ? WHERE id = ?").run(approvalStatus, id);
  return findUserById(id)!;
}

// 운영자 계정 등급 변경(일반관리자/프로 관리자/마스터 관리자). 호출부(API 라우트)에서
// "호출자가 마스터 관리자인지"는 이미 확인했다고 가정한다 — 여기서는 마지막 남은 마스터
// 관리자를 강등시키는 경우만 막아서, 시스템에 마스터가 0명이 되는 상태를 방지한다.
export function setAdminTier(id: string, tier: AdminTier): AppUser {
  const db = getDb();
  const target = findUserById(id);
  if (!target || target.role !== "ADMIN") {
    throw new Error("운영자 계정이 아닙니다.");
  }
  if (target.adminTier === "MASTER" && tier !== "MASTER") {
    const masterCount = db
      .prepare("SELECT COUNT(*) as n FROM users WHERE role = 'ADMIN' AND admin_tier = 'MASTER'")
      .get() as { n: number };
    if (masterCount.n <= 1) {
      throw new Error("마지막 남은 마스터 관리자는 강등할 수 없습니다.");
    }
  }
  db.prepare("UPDATE users SET admin_tier = ? WHERE id = ?").run(tier, id);
  return findUserById(id)!;
}

// 비밀번호 해시 없이 이메일로 계정을 찾는다(역할 무관 — 신청자든 운영자든).
// "기존 회원을 운영자로 승급" 기능에서 사용.
export function findUserByEmail(email: string): AppUser | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase()) as
    | UserRow
    | undefined;
  if (!row || row.withdrawn_at) return undefined;
  return toAppUser(row);
}

// 이미 가입된 계정(신청자 포함)을 운영자로 전환한다. 새 비밀번호를 만들지 않고
// 그 사람이 이미 쓰던 계정 그대로 role/등급만 바꾸는 것 — Render 환경변수
// (MASTER_ADMIN_EMAILS) 없이도 마스터 관리자가 화면에서 바로 할 수 있게 한다.
export function promoteUserToAdmin(id: string, tier: AdminTier): AppUser {
  const db = getDb();
  db.prepare(
    "UPDATE users SET role = 'ADMIN', admin_tier = ?, approval_status = 'APPROVED' WHERE id = ?",
  ).run(tier, id);
  return findUserById(id)!;
}

export function findUserById(id: string): AppUser | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
  return row ? toAppUser(row) : undefined;
}

export function updateUserProfile(id: string, input: { name: string; phone: string | null }): AppUser {
  const db = getDb();
  db.prepare("UPDATE users SET name = ?, phone = ? WHERE id = ?").run(input.name, input.phone, id);
  return findUserById(id)!;
}

export function updateUserPassword(id: string, passwordHash: string) {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

export function findUserPasswordHash(id: string): string | undefined {
  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(id) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash;
}

// 탈퇴는 신청서(applicant_id FK)·감사로그 등 기존 기록 보존을 위해 소프트 삭제로 처리한다.
export function withdrawUser(id: string, withdrawnAt: string) {
  const db = getDb();
  db.prepare("UPDATE users SET withdrawn_at = ? WHERE id = ?").run(withdrawnAt, id);
}

export function isUserWithdrawn(id: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT withdrawn_at FROM users WHERE id = ?").get(id) as
    | { withdrawn_at: string | null }
    | undefined;
  return !!row?.withdrawn_at;
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
  review_json: string | null;
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
    review: row.review_json ? JSON.parse(row.review_json) : null,
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
      (id, applicant_id, rate_table_version, selection_json, line_items_json, subtotal, vat, total, metered_notice, status, created_at, review_json, contract_json, settlement_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ESTIMATE', ?, NULL, NULL, NULL)`,
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

export function listQuotes(filter?: { applicantId?: string; companyId?: string }): Quote[] {
  const db = getDb();
  let rows: QuoteRow[];
  if (filter?.companyId) {
    rows = db
      .prepare(
        `SELECT q.* FROM quotes q JOIN users u ON u.id = q.applicant_id
         WHERE u.company_id = ? ORDER BY q.created_at DESC`,
      )
      .all(filter.companyId) as unknown as QuoteRow[];
  } else if (filter?.applicantId) {
    rows = db
      .prepare("SELECT * FROM quotes WHERE applicant_id = ? ORDER BY created_at DESC")
      .all(filter.applicantId) as unknown as QuoteRow[];
  } else {
    rows = db.prepare("SELECT * FROM quotes ORDER BY created_at DESC").all() as unknown as QuoteRow[];
  }
  return rows.map(toQuote);
}

// 같은 주차에 이미 심사 승인된 "다른 회사"의 신청서가 있는지 확인한다.
// 한 주차는 하나의 대관사만 사용할 수 있으므로, 이미 승인된 건이 있으면 같은 주차의
// 다른 회사 신청서는 승인할 수 없다 (같은 회사 소속 신청서끼리는 충돌로 보지 않는다).
export function findApprovedWeekConflict(
  quote: Quote,
): { quote: Quote; companyName: string | null } | undefined {
  const week = quote.selection?.week;
  if (!week) return undefined;

  const applicant = findUserById(quote.applicantId);
  const companyId = applicant?.companyId ?? null;

  for (const other of listQuotes()) {
    if (other.id === quote.id) continue;
    if (other.review?.decision !== "APPROVED") continue;
    const otherWeek = other.selection?.week;
    if (!otherWeek) continue;
    const sameWeek =
      otherWeek.year === week.year &&
      otherWeek.month === week.month &&
      otherWeek.weekOfMonth === week.weekOfMonth;
    if (!sameWeek) continue;

    const otherApplicant = findUserById(other.applicantId);
    const otherCompanyId = otherApplicant?.companyId ?? null;
    const sameCompany = companyId && otherCompanyId ? companyId === otherCompanyId : quote.applicantId === other.applicantId;
    if (sameCompany) continue;

    return { quote: other, companyName: otherApplicant?.companyName ?? null };
  }
  return undefined;
}

// 캘린더 경합 현황 — 주차별로 신청서를 낸 회사(신청자) 수를 집계한다.
export function listWeekDemand(): WeekDemand[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT q.selection_json as selection_json, u.company_name as company_name, u.id as user_id
       FROM quotes q JOIN users u ON u.id = q.applicant_id`,
    )
    .all() as { selection_json: string; company_name: string | null; user_id: string }[];

  const groups = new Map<string, Set<string>>();
  for (const row of rows) {
    const selection = JSON.parse(row.selection_json) as Quote["selection"];
    const key = `${selection.week.year}-${selection.week.month}-${selection.week.weekOfMonth}`;
    const companies = groups.get(key) ?? new Set<string>();
    companies.add(row.company_name || row.user_id);
    groups.set(key, companies);
  }

  return [...groups.entries()].map(([key, companies]) => {
    const [year, month, weekOfMonth] = key.split("-").map(Number);
    return { year, month, weekOfMonth, companyCount: companies.size };
  });
}

// ---------------------------------------------------------------------------
// 일정 관리 — 관리자가 특정 날짜를 대관 신청 불가로 막아둘 수 있다 (정기 대관 등).
// ---------------------------------------------------------------------------

interface DateBlockRow {
  date: string;
  reason: string | null;
}

function toDateBlock(row: DateBlockRow): DateBlock {
  return { date: row.date, reason: row.reason };
}

export function listDateBlocks(): DateBlock[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM date_blocks ORDER BY date ASC").all() as unknown as DateBlockRow[];
  return rows.map(toDateBlock);
}

export function isDateBlocked(date: string): DateBlock | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM date_blocks WHERE date = ?").get(date) as DateBlockRow | undefined;
  return row ? toDateBlock(row) : undefined;
}

// 신청서가 실제로 차지하는 날짜 목록(제외 요일 반영, 추가 일수 포함) 중 막힌 날짜가 있는지 확인한다.
export function findBlockedDatesAmong(dates: string[]): DateBlock[] {
  if (dates.length === 0) return [];
  const db = getDb();
  const placeholders = dates.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM date_blocks WHERE date IN (${placeholders})`)
    .all(...dates) as unknown as DateBlockRow[];
  return rows.map(toDateBlock);
}

export function blockDate(date: string, reason: string | null): DateBlock {
  const db = getDb();
  db.prepare(
    `INSERT INTO date_blocks (date, reason, created_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`,
  ).run(date, reason, new Date().toISOString());
  return { date, reason };
}

export function unblockDate(date: string) {
  const db = getDb();
  db.prepare("DELETE FROM date_blocks WHERE date = ?").run(date);
}

// ESTIMATE 단계 신청서를 신청자가 직접 수정할 때 사용 — 심사 전 재계산된 산출내역으로 덮어쓴다.
export function updateQuoteSelection(
  id: string,
  input: {
    rateTableVersion: string;
    selection: Quote["selection"];
    lineItems: Quote["lineItems"];
    subtotal: number;
    vat: number;
    total: number;
  },
): Quote {
  const db = getDb();
  db.prepare(
    `UPDATE quotes
     SET rate_table_version = ?, selection_json = ?, line_items_json = ?, subtotal = ?, vat = ?, total = ?
     WHERE id = ?`,
  ).run(
    input.rateTableVersion,
    JSON.stringify(input.selection),
    JSON.stringify(input.lineItems),
    input.subtotal,
    input.vat,
    input.total,
    id,
  );
  return getQuoteById(id)!;
}

export function setQuoteReview(id: string, review: Review): Quote {
  const db = getDb();
  db.prepare("UPDATE quotes SET review_json = ? WHERE id = ?").run(JSON.stringify(review), id);
  return getQuoteById(id)!;
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

// ---------------------------------------------------------------------------
// 보증금 (계좌이체 확인 방식)
// ---------------------------------------------------------------------------

interface DepositRow {
  id: string;
  quote_id: string;
  required_amount: number;
  deposit_rate: number;
  status: DepositStatus;
  depositor_name: string | null;
  reported_at: string | null;
  confirmed_at: string | null;
  confirmed_by: string | null;
  created_at: string;
}

function toDeposit(row: DepositRow): Deposit {
  return {
    id: row.id,
    quoteId: row.quote_id,
    requiredAmount: row.required_amount,
    depositRate: row.deposit_rate,
    status: row.status,
    depositorName: row.depositor_name,
    reportedAt: row.reported_at,
    confirmedAt: row.confirmed_at,
    confirmedBy: row.confirmed_by,
    createdAt: row.created_at,
  };
}

export function createDeposit(input: {
  id: string;
  quoteId: string;
  requiredAmount: number;
  depositRate: number;
  createdAt: string;
}): Deposit {
  const db = getDb();
  db.prepare(
    `INSERT INTO deposits (id, quote_id, required_amount, deposit_rate, status, created_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`,
  ).run(input.id, input.quoteId, input.requiredAmount, input.depositRate, input.createdAt);
  return getDepositByQuoteId(input.quoteId)!;
}

export function getDepositByQuoteId(quoteId: string): Deposit | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM deposits WHERE quote_id = ?").get(quoteId) as
    | DepositRow
    | undefined;
  return row ? toDeposit(row) : undefined;
}

export function reportDeposit(quoteId: string, depositorName: string, reportedAt: string): Deposit {
  const db = getDb();
  db.prepare(
    "UPDATE deposits SET status = 'REPORTED', depositor_name = ?, reported_at = ? WHERE quote_id = ?",
  ).run(depositorName, reportedAt, quoteId);
  return getDepositByQuoteId(quoteId)!;
}

export function confirmDeposit(quoteId: string, confirmedBy: string, confirmedAt: string): Deposit {
  const db = getDb();
  db.prepare(
    "UPDATE deposits SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = ? WHERE quote_id = ?",
  ).run(confirmedBy, confirmedAt, quoteId);
  return getDepositByQuoteId(quoteId)!;
}

// 정산 내역에 대한 신청자 상호 확인 — settlement_json에 필드만 덧붙인다 (기존 정산 확정 흐름은 그대로 둠).
export function confirmSettlementMutual(quoteId: string, confirmedBy: string, confirmedAt: string): Quote {
  const db = getDb();
  const quote = getQuoteById(quoteId);
  if (!quote?.settlement) throw new Error("정산 내역이 없습니다.");
  const settlement: Settlement = {
    ...quote.settlement,
    mutualConfirmedAt: confirmedAt,
    mutualConfirmedBy: confirmedBy,
  };
  db.prepare("UPDATE quotes SET settlement_json = ? WHERE id = ?").run(
    JSON.stringify(settlement),
    quoteId,
  );
  return getQuoteById(quoteId)!;
}

// ---------------------------------------------------------------------------
// 전자 날인 (계약서 상호 날인 — 정식 전자서명 서비스 연동 전 운영자 수동 확인 방식)
// ---------------------------------------------------------------------------

interface ContractSignatureRow {
  id: string;
  quote_id: string;
  venue_signed_at: string | null;
  venue_signed_by: string | null;
  applicant_signed_at: string | null;
  applicant_signed_by: string | null;
  created_at: string;
}

function toContractSignature(row: ContractSignatureRow): ContractSignature {
  return {
    id: row.id,
    quoteId: row.quote_id,
    venueSignedAt: row.venue_signed_at,
    venueSignedBy: row.venue_signed_by,
    applicantSignedAt: row.applicant_signed_at,
    applicantSignedBy: row.applicant_signed_by,
    createdAt: row.created_at,
  };
}

export function getContractSignatureByQuoteId(quoteId: string): ContractSignature | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM contract_signatures WHERE quote_id = ?").get(quoteId) as
    | ContractSignatureRow
    | undefined;
  return row ? toContractSignature(row) : undefined;
}

// 계약 확정 시점에 빈 레코드를 만들어두고, 이후 양측이 각자 날인한다.
export function ensureContractSignature(quoteId: string, createdAt: string): ContractSignature {
  const existing = getContractSignatureByQuoteId(quoteId);
  if (existing) return existing;
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    "INSERT INTO contract_signatures (id, quote_id, created_at) VALUES (?, ?, ?)",
  ).run(id, quoteId, createdAt);
  return getContractSignatureByQuoteId(quoteId)!;
}

export function signContractAsVenue(quoteId: string, signedBy: string, signedAt: string): ContractSignature {
  const db = getDb();
  db.prepare(
    "UPDATE contract_signatures SET venue_signed_at = ?, venue_signed_by = ? WHERE quote_id = ?",
  ).run(signedAt, signedBy, quoteId);
  return getContractSignatureByQuoteId(quoteId)!;
}

export function signContractAsApplicant(quoteId: string, signedBy: string, signedAt: string): ContractSignature {
  const db = getDb();
  db.prepare(
    "UPDATE contract_signatures SET applicant_signed_at = ?, applicant_signed_by = ? WHERE quote_id = ?",
  ).run(signedAt, signedBy, quoteId);
  return getContractSignatureByQuoteId(quoteId)!;
}

// ---------------------------------------------------------------------------
// 세금계산서 (계약금액/정산금액 공용) — 발행 → 입금신청 → 입금확인
// ---------------------------------------------------------------------------

interface TaxInvoiceRow {
  id: string;
  quote_id: string;
  purpose: InvoicePurpose;
  amount: number;
  status: InvoiceStatus;
  issued_at: string | null;
  issued_by: string | null;
  payer_name: string | null;
  reported_at: string | null;
  paid_at: string | null;
  paid_confirmed_by: string | null;
  last_reminder_at: string | null;
  created_at: string;
}

function toTaxInvoice(row: TaxInvoiceRow): TaxInvoice {
  return {
    id: row.id,
    quoteId: row.quote_id,
    purpose: row.purpose,
    amount: row.amount,
    status: row.status,
    issuedAt: row.issued_at,
    issuedBy: row.issued_by,
    payerName: row.payer_name,
    reportedAt: row.reported_at,
    paidAt: row.paid_at,
    paidConfirmedBy: row.paid_confirmed_by,
    lastReminderAt: row.last_reminder_at,
    createdAt: row.created_at,
  };
}

export function getTaxInvoice(quoteId: string, purpose: InvoicePurpose): TaxInvoice | undefined {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM tax_invoices WHERE quote_id = ? AND purpose = ?")
    .get(quoteId, purpose) as TaxInvoiceRow | undefined;
  return row ? toTaxInvoice(row) : undefined;
}

// 계약/정산 확정 시점에 PENDING 상태로 미리 만들어두고, 운영자가 금액을 채워 발행한다.
export function ensureTaxInvoice(
  quoteId: string,
  purpose: InvoicePurpose,
  amount: number,
  createdAt: string,
): TaxInvoice {
  const existing = getTaxInvoice(quoteId, purpose);
  if (existing) return existing;
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO tax_invoices (id, quote_id, purpose, amount, status, created_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`,
  ).run(id, quoteId, purpose, amount, createdAt);
  return getTaxInvoice(quoteId, purpose)!;
}

export function issueTaxInvoice(
  quoteId: string,
  purpose: InvoicePurpose,
  issuedBy: string,
  issuedAt: string,
): TaxInvoice {
  const db = getDb();
  db.prepare(
    "UPDATE tax_invoices SET status = 'ISSUED', issued_at = ?, issued_by = ?, last_reminder_at = ? WHERE quote_id = ? AND purpose = ?",
  ).run(issuedAt, issuedBy, issuedAt, quoteId, purpose);
  return getTaxInvoice(quoteId, purpose)!;
}

export function reportTaxInvoicePayment(
  quoteId: string,
  purpose: InvoicePurpose,
  payerName: string,
  reportedAt: string,
): TaxInvoice {
  const db = getDb();
  db.prepare(
    "UPDATE tax_invoices SET status = 'REPORTED', payer_name = ?, reported_at = ? WHERE quote_id = ? AND purpose = ?",
  ).run(payerName, reportedAt, quoteId, purpose);
  return getTaxInvoice(quoteId, purpose)!;
}

export function confirmTaxInvoicePayment(
  quoteId: string,
  purpose: InvoicePurpose,
  confirmedBy: string,
  paidAt: string,
): TaxInvoice {
  const db = getDb();
  db.prepare(
    "UPDATE tax_invoices SET status = 'PAID', paid_at = ?, paid_confirmed_by = ? WHERE quote_id = ? AND purpose = ?",
  ).run(paidAt, confirmedBy, quoteId, purpose);
  return getTaxInvoice(quoteId, purpose)!;
}

// 미입금 5일 경과 시 알림 재발송 대상 — lastReminderAt 기준으로 lazy하게(페이지 조회 시점에) 판단한다.
export function isInvoiceReminderDue(invoice: TaxInvoice, now: Date, intervalDays = 5): boolean {
  if (invoice.status !== "ISSUED" && invoice.status !== "REPORTED") return false;
  const base = invoice.lastReminderAt ?? invoice.issuedAt;
  if (!base) return false;
  const elapsedMs = now.getTime() - new Date(base).getTime();
  return elapsedMs >= intervalDays * 24 * 60 * 60 * 1000;
}

export function touchInvoiceReminder(quoteId: string, purpose: InvoicePurpose, at: string) {
  const db = getDb();
  db.prepare(
    "UPDATE tax_invoices SET last_reminder_at = ? WHERE quote_id = ? AND purpose = ?",
  ).run(at, quoteId, purpose);
}

// ---------------------------------------------------------------------------
// 티켓오픈
// ---------------------------------------------------------------------------

interface TicketOpenRow {
  id: string;
  quote_id: string;
  open_date: string | null;
  materials_uploaded_at: string | null;
  last_reminder_at: string | null;
  created_at: string;
}

function toTicketOpen(row: TicketOpenRow): TicketOpen {
  return {
    id: row.id,
    quoteId: row.quote_id,
    openDate: row.open_date,
    materialsUploadedAt: row.materials_uploaded_at,
    lastReminderAt: row.last_reminder_at,
    createdAt: row.created_at,
  };
}

export function getTicketOpenByQuoteId(quoteId: string): TicketOpen | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM ticket_opens WHERE quote_id = ?").get(quoteId) as
    | TicketOpenRow
    | undefined;
  return row ? toTicketOpen(row) : undefined;
}

export function ensureTicketOpen(quoteId: string, createdAt: string): TicketOpen {
  const existing = getTicketOpenByQuoteId(quoteId);
  if (existing) return existing;
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO ticket_opens (id, quote_id, created_at) VALUES (?, ?, ?)").run(
    id,
    quoteId,
    createdAt,
  );
  return getTicketOpenByQuoteId(quoteId)!;
}

export function setTicketOpenDate(quoteId: string, openDate: string): TicketOpen {
  const db = getDb();
  db.prepare("UPDATE ticket_opens SET open_date = ? WHERE quote_id = ?").run(openDate, quoteId);
  return getTicketOpenByQuoteId(quoteId)!;
}

export function markTicketOpenMaterialsUploaded(quoteId: string, at: string) {
  const db = getDb();
  db.prepare("UPDATE ticket_opens SET materials_uploaded_at = ? WHERE quote_id = ?").run(at, quoteId);
}

// D-30 미업로드 알림 대상 — 오픈일까지 30일 이하 남았고, 자료 미업로드 상태
export function isTicketOpenReminderDue(ticketOpen: TicketOpen, now: Date): boolean {
  if (!ticketOpen.openDate || ticketOpen.materialsUploadedAt) return false;
  const daysUntilOpen = (new Date(ticketOpen.openDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilOpen > 30) return false;
  if (!ticketOpen.lastReminderAt) return true;
  return now.getTime() - new Date(ticketOpen.lastReminderAt).getTime() >= 24 * 60 * 60 * 1000;
}

export function touchTicketOpenReminder(quoteId: string, at: string) {
  const db = getDb();
  db.prepare("UPDATE ticket_opens SET last_reminder_at = ? WHERE quote_id = ?").run(at, quoteId);
}

// ---------------------------------------------------------------------------
// 시설회의
// ---------------------------------------------------------------------------

interface FacilityMeetingRow {
  id: string;
  quote_id: string;
  meeting_date: string | null;
  materials_uploaded_at: string | null;
  last_reminder_at: string | null;
  created_at: string;
}

function toFacilityMeeting(row: FacilityMeetingRow): FacilityMeeting {
  return {
    id: row.id,
    quoteId: row.quote_id,
    meetingDate: row.meeting_date,
    materialsUploadedAt: row.materials_uploaded_at,
    lastReminderAt: row.last_reminder_at,
    createdAt: row.created_at,
  };
}

export function getFacilityMeetingByQuoteId(quoteId: string): FacilityMeeting | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM facility_meetings WHERE quote_id = ?").get(quoteId) as
    | FacilityMeetingRow
    | undefined;
  return row ? toFacilityMeeting(row) : undefined;
}

export function ensureFacilityMeeting(quoteId: string, createdAt: string): FacilityMeeting {
  const existing = getFacilityMeetingByQuoteId(quoteId);
  if (existing) return existing;
  const db = getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO facility_meetings (id, quote_id, created_at) VALUES (?, ?, ?)").run(
    id,
    quoteId,
    createdAt,
  );
  return getFacilityMeetingByQuoteId(quoteId)!;
}

export function setFacilityMeetingDate(quoteId: string, meetingDate: string): FacilityMeeting {
  const db = getDb();
  db.prepare("UPDATE facility_meetings SET meeting_date = ? WHERE quote_id = ?").run(
    meetingDate,
    quoteId,
  );
  return getFacilityMeetingByQuoteId(quoteId)!;
}

export function markFacilityMeetingMaterialsUploaded(quoteId: string, at: string) {
  const db = getDb();
  db.prepare("UPDATE facility_meetings SET materials_uploaded_at = ? WHERE quote_id = ?").run(
    at,
    quoteId,
  );
}

// D-7 미업로드 알림 대상 — 회의일까지 7일 이하 남았고, 자료 미업로드 상태
export function isFacilityMeetingReminderDue(meeting: FacilityMeeting, now: Date): boolean {
  if (!meeting.meetingDate || meeting.materialsUploadedAt) return false;
  const daysUntilMeeting = (new Date(meeting.meetingDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilMeeting > 7) return false;
  if (!meeting.lastReminderAt) return true;
  return now.getTime() - new Date(meeting.lastReminderAt).getTime() >= 24 * 60 * 60 * 1000;
}

export function touchFacilityMeetingReminder(quoteId: string, at: string) {
  const db = getDb();
  db.prepare("UPDATE facility_meetings SET last_reminder_at = ? WHERE quote_id = ?").run(at, quoteId);
}

// ---------------------------------------------------------------------------
// 첨부서류
// ---------------------------------------------------------------------------

interface AttachmentRow {
  id: string;
  quote_id: string;
  stored_name: string;
  original_name: string;
  mime_type: string;
  size: number;
  uploaded_by: string;
  category: string | null;
  created_at: string;
}

function toAttachment(row: AttachmentRow): Attachment {
  return {
    id: row.id,
    quoteId: row.quote_id,
    storedName: row.stored_name,
    originalName: row.original_name,
    mimeType: row.mime_type,
    size: row.size,
    uploadedBy: row.uploaded_by,
    category: (row.category as AttachmentCategory) ?? null,
    createdAt: row.created_at,
  };
}

export function createAttachment(input: {
  id: string;
  quoteId: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  category?: AttachmentCategory;
  createdAt: string;
}): Attachment {
  const db = getDb();
  db.prepare(
    `INSERT INTO attachments (id, quote_id, stored_name, original_name, mime_type, size, uploaded_by, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.quoteId,
    input.storedName,
    input.originalName,
    input.mimeType,
    input.size,
    input.uploadedBy,
    input.category ?? null,
    input.createdAt,
  );
  return toAttachment(
    db.prepare("SELECT * FROM attachments WHERE id = ?").get(input.id) as unknown as AttachmentRow,
  );
}

export function listAttachments(quoteId: string, category?: AttachmentCategory): Attachment[] {
  const db = getDb();
  let rows: unknown[];
  if (category === undefined) {
    rows = db.prepare("SELECT * FROM attachments WHERE quote_id = ? ORDER BY created_at ASC").all(quoteId);
  } else if (category === null) {
    rows = db
      .prepare("SELECT * FROM attachments WHERE quote_id = ? AND category IS NULL ORDER BY created_at ASC")
      .all(quoteId);
  } else {
    rows = db
      .prepare("SELECT * FROM attachments WHERE quote_id = ? AND category = ? ORDER BY created_at ASC")
      .all(quoteId, category);
  }
  return (rows as AttachmentRow[]).map(toAttachment);
}

export function getAttachmentById(id: string): Attachment | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM attachments WHERE id = ?").get(id) as
    | AttachmentRow
    | undefined;
  return row ? toAttachment(row) : undefined;
}

export function deleteAttachment(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM attachments WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// 인앱 알림
// ---------------------------------------------------------------------------

interface NotificationRow {
  id: string;
  recipient_id: string;
  quote_id: string;
  message: string;
  is_read: number;
  created_at: string;
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    quoteId: row.quote_id,
    message: row.message,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

export function createNotification(input: {
  id: string;
  recipientId: string;
  quoteId: string;
  message: string;
  createdAt: string;
}) {
  const db = getDb();
  db.prepare(
    `INSERT INTO notifications (id, recipient_id, quote_id, message, is_read, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`,
  ).run(input.id, input.recipientId, input.quoteId, input.message, input.createdAt);
}

export function notifyAdmins(input: { quoteId: string; message: string; createdAt: string }) {
  for (const admin of listUsers({ role: "ADMIN" })) {
    createNotification({
      id: crypto.randomUUID(),
      recipientId: admin.id,
      quoteId: input.quoteId,
      message: input.message,
      createdAt: input.createdAt,
    });
  }
}

export function listNotifications(recipientId: string, limit = 30): AppNotification[] {
  const db = getDb();
  const rows = db
    .prepare("SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?")
    .all(recipientId, limit) as unknown as NotificationRow[];
  return rows.map(toNotification);
}

export function countUnreadNotifications(recipientId: string): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as n FROM notifications WHERE recipient_id = ? AND is_read = 0")
    .get(recipientId) as { n: number };
  return row.n;
}

export function markNotificationRead(id: string, recipientId: string) {
  const db = getDb();
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?").run(
    id,
    recipientId,
  );
}

export function markAllNotificationsRead(recipientId: string) {
  const db = getDb();
  db.prepare("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?").run(recipientId);
}

// ---------------------------------------------------------------------------
// 1:1 문의
// ---------------------------------------------------------------------------

interface InquiryRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: InquiryStatus;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  created_at: string;
}

function toInquiry(row: InquiryRow): Inquiry {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    status: row.status,
    answer: row.answer,
    answeredAt: row.answered_at,
    answeredBy: row.answered_by,
    createdAt: row.created_at,
  };
}

export function createInquiry(input: {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
}): Inquiry {
  const db = getDb();
  db.prepare(
    `INSERT INTO inquiries (id, user_id, title, content, status, created_at)
     VALUES (?, ?, ?, ?, 'OPEN', ?)`,
  ).run(input.id, input.userId, input.title, input.content, input.createdAt);
  return getInquiryById(input.id)!;
}

export function getInquiryById(id: string): Inquiry | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM inquiries WHERE id = ?").get(id) as InquiryRow | undefined;
  return row ? toInquiry(row) : undefined;
}

export function listInquiries(filter?: { userId?: string }): Inquiry[] {
  const db = getDb();
  const rows = (
    filter?.userId
      ? db.prepare("SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC").all(filter.userId)
      : db.prepare("SELECT * FROM inquiries ORDER BY created_at DESC").all()
  ) as unknown as InquiryRow[];
  return rows.map(toInquiry);
}

export function answerInquiry(
  id: string,
  answer: string,
  answeredBy: string,
  answeredAt: string,
): Inquiry {
  const db = getDb();
  db.prepare(
    "UPDATE inquiries SET status = 'ANSWERED', answer = ?, answered_by = ?, answered_at = ? WHERE id = ?",
  ).run(answer, answeredBy, answeredAt, id);
  return getInquiryById(id)!;
}

// ---------------------------------------------------------------------------
// 공지사항
// ---------------------------------------------------------------------------

interface NoticeRow {
  id: string;
  tag: string | null;
  title: string;
  body: string;
  image_url: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
  updated_at: string;
}

function toNotice(row: NoticeRow): Notice {
  return {
    id: row.id,
    tag: row.tag,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url,
    attachmentUrl: row.attachment_url,
    attachmentName: row.attachment_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listNotices(): Notice[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM notices ORDER BY created_at DESC").all() as unknown as NoticeRow[];
  return rows.map(toNotice);
}

export function getNoticeById(id: string): Notice | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM notices WHERE id = ?").get(id) as NoticeRow | undefined;
  return row ? toNotice(row) : undefined;
}

export function createNotice(input: {
  id: string;
  tag?: string | null;
  title: string;
  body: string;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}): Notice {
  const db = getDb();
  db.prepare(
    "INSERT INTO notices (id, tag, title, body, image_url, attachment_url, attachment_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    input.id,
    input.tag ?? null,
    input.title,
    input.body,
    input.imageUrl ?? null,
    input.attachmentUrl ?? null,
    input.attachmentName ?? null,
    input.createdAt,
    input.createdAt,
  );
  return getNoticeById(input.id)!;
}

export function updateNotice(
  id: string,
  input: {
    tag?: string | null;
    title: string;
    body: string;
    imageUrl?: string | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    updatedAt: string;
  },
): Notice | undefined {
  const db = getDb();
  db.prepare(
    "UPDATE notices SET tag = ?, title = ?, body = ?, image_url = ?, attachment_url = ?, attachment_name = ?, updated_at = ? WHERE id = ?",
  ).run(
    input.tag ?? null,
    input.title,
    input.body,
    input.imageUrl ?? null,
    input.attachmentUrl ?? null,
    input.attachmentName ?? null,
    input.updatedAt,
    id,
  );
  return getNoticeById(id);
}

export function deleteNotice(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM notices WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

interface FaqRow {
  id: string;
  tag: string | null;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

function toFaq(row: FaqRow): Faq {
  return {
    id: row.id,
    tag: row.tag,
    question: row.question,
    answer: row.answer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listFaqs(): Faq[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM faqs ORDER BY created_at ASC").all() as unknown as FaqRow[];
  return rows.map(toFaq);
}

export function getFaqById(id: string): Faq | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM faqs WHERE id = ?").get(id) as FaqRow | undefined;
  return row ? toFaq(row) : undefined;
}

export function createFaq(input: {
  id: string;
  tag?: string | null;
  question: string;
  answer: string;
  createdAt: string;
}): Faq {
  const db = getDb();
  db.prepare(
    "INSERT INTO faqs (id, tag, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(input.id, input.tag ?? null, input.question, input.answer, input.createdAt, input.createdAt);
  return getFaqById(input.id)!;
}

export function updateFaq(
  id: string,
  input: { tag?: string | null; question: string; answer: string; updatedAt: string },
): Faq | undefined {
  const db = getDb();
  db.prepare("UPDATE faqs SET tag = ?, question = ?, answer = ?, updated_at = ? WHERE id = ?").run(
    input.tag ?? null,
    input.question,
    input.answer,
    input.updatedAt,
    id,
  );
  return getFaqById(id);
}

export function deleteFaq(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM faqs WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// 정적 안내 페이지 (서울아레나 소개 / 대관 안내)
// ---------------------------------------------------------------------------

interface PageRow {
  id: string;
  page_group: PageGroup;
  slug: string;
  nav_label: string;
  title: string;
  body: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function toStaticPage(row: PageRow): StaticPage {
  return {
    id: row.id,
    group: row.page_group,
    slug: row.slug,
    navLabel: row.nav_label,
    title: row.title,
    body: row.body,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listPages(group?: PageGroup): StaticPage[] {
  const db = getDb();
  const rows = group
    ? (db
        .prepare("SELECT * FROM pages WHERE page_group = ? ORDER BY sort_order ASC")
        .all(group) as unknown as PageRow[])
    : (db.prepare("SELECT * FROM pages ORDER BY page_group ASC, sort_order ASC").all() as unknown as PageRow[]);
  return rows.map(toStaticPage);
}

export function getPageById(id: string): StaticPage | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pages WHERE id = ?").get(id) as PageRow | undefined;
  return row ? toStaticPage(row) : undefined;
}

export function getPageBySlug(group: PageGroup, slug: string): StaticPage | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM pages WHERE page_group = ? AND slug = ?").get(group, slug) as
    | PageRow
    | undefined;
  return row ? toStaticPage(row) : undefined;
}

export function createPage(input: {
  id: string;
  group: PageGroup;
  slug: string;
  navLabel: string;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
}): StaticPage {
  const db = getDb();
  db.prepare(
    `INSERT INTO pages (id, page_group, slug, nav_label, title, body, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.id,
    input.group,
    input.slug,
    input.navLabel,
    input.title,
    input.body,
    input.sortOrder,
    input.createdAt,
    input.createdAt,
  );
  return getPageById(input.id)!;
}

export function updatePage(
  id: string,
  input: { slug: string; navLabel: string; title: string; body: string; sortOrder: number; updatedAt: string },
): StaticPage | undefined {
  const db = getDb();
  db.prepare(
    "UPDATE pages SET slug = ?, nav_label = ?, title = ?, body = ?, sort_order = ?, updated_at = ? WHERE id = ?",
  ).run(input.slug, input.navLabel, input.title, input.body, input.sortOrder, input.updatedAt, id);
  return getPageById(id);
}

export function deletePage(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM pages WHERE id = ?").run(id);
}

function getSiteContent<T>(page: string, fallback: T): T {
  const db = getDb();
  const row = db.prepare("SELECT data FROM site_content WHERE page = ?").get(page) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as T) : fallback;
}

function saveSiteContent<T>(page: string, data: T): T {
  const db = getDb();
  db.prepare(
    `INSERT INTO site_content (page, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(page) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(page, JSON.stringify(data), new Date().toISOString());
  return data;
}

export function getVenueContent(): VenueContent {
  const stored = getSiteContent<Partial<VenueContent> | null>("venue", null);
  if (!stored) return DEFAULT_VENUE_CONTENT;
  return { ...DEFAULT_VENUE_CONTENT, ...stored };
}

export function saveVenueContent(data: VenueContent): VenueContent {
  return saveSiteContent("venue", data);
}

export function getGuideContent(): GuideContent {
  return getSiteContent<GuideContent>("guide", DEFAULT_GUIDE_CONTENT);
}

export function saveGuideContent(data: GuideContent): GuideContent {
  return saveSiteContent("guide", data);
}

export function getHomeContent(): HomeContent {
  const stored = getSiteContent<Partial<HomeContent> | null>("home", null);
  if (!stored) return DEFAULT_HOME_CONTENT;
  return { ...DEFAULT_HOME_CONTENT, ...stored };
}

export function saveHomeContent(data: HomeContent): HomeContent {
  return saveSiteContent("home", data);
}

// ---------------------------------------------------------------------------
// 기능정의서(내부 기획 문서) — 마스터 관리자 전용
// ---------------------------------------------------------------------------

export function getFeatureSpecSheet(key: FeatureSpecSheetKey): FeatureSpecRow[] {
  const db = getDb();
  const row = db.prepare("SELECT data FROM feature_spec_sheets WHERE sheet_key = ?").get(key) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as FeatureSpecRow[]) : (FEATURE_SPEC_SEED[key] ?? []);
}

export function getAllFeatureSpecSheets(): Record<FeatureSpecSheetKey, FeatureSpecRow[]> {
  const result = {} as Record<FeatureSpecSheetKey, FeatureSpecRow[]>;
  FEATURE_SPEC_SHEET_KEYS.forEach((key) => {
    result[key] = getFeatureSpecSheet(key);
  });
  return result;
}

export function saveFeatureSpecSheet(key: FeatureSpecSheetKey, rows: FeatureSpecRow[]): FeatureSpecRow[] {
  const db = getDb();
  db.prepare(
    `INSERT INTO feature_spec_sheets (sheet_key, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(sheet_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
  ).run(key, JSON.stringify(rows), new Date().toISOString());
  return rows;
}
