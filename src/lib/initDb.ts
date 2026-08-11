import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import type { PoolClient, QueryResultRow } from "pg";
import { getPool, toPgPlaceholders } from "./pg";
import { INSERT_RATE_TABLE_SQL, rateTableParams } from "./db";
import { buildSeedRateTable } from "./pricing/seed";
import { SEED_PAGES } from "./pricing/pageSeed";
import { FEATURE_SPEC_SEED } from "./featureSpecSeed";
import { FEATURE_SPEC_SHEET_KEYS } from "./pricing/types";

// 스키마 생성과 시드. pg.ts 의 ready() 가 프로세스당 한 번 호출한다.
//
// 주의: 이 파일 안에서는 db.ts 의 조회/변경 함수를 쓰면 안 된다 — 그 함수들은
// ready() 를 다시 기다리므로 초기화 중에 호출하면 교착 상태가 된다. 아래 q() 만 쓴다.

// advisory lock 은 커넥션(세션) 단위라 잠금·해제·그 사이 작업이 같은 커넥션이어야 한다.
type Runner = <T extends QueryResultRow>(sql: string, params?: readonly unknown[]) => Promise<T[]>;

function runnerFor(client: PoolClient): Runner {
  return async <T extends QueryResultRow>(sql: string, params: readonly unknown[] = []) => {
    const result = params.length
      ? await client.query<T>(toPgPlaceholders(sql), params as unknown[])
      : await client.query<T>(sql);
    return result.rows;
  };
}

// 여러 인스턴스가 동시에 기동해도 DDL/시드가 한 번만 돌도록 잠그는 키(임의 상수).
const INIT_LOCK_KEY = 8264125031;

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    business_registration_number TEXT,
    representative_name TEXT,
    postal_code TEXT,
    address TEXT,
    business_cert_url TEXT,
    business_cert_name TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    company_name TEXT,
    company_id TEXT REFERENCES companies(id),
    role TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'APPROVED',
    admin_tier TEXT,
    terms_agreed_at TEXT,
    privacy_agreed_at TEXT,
    withdrawn_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username
    ON users(username) WHERE username IS NOT NULL;

  CREATE TABLE IF NOT EXISTS rate_tables (
    version TEXT PRIMARY KEY,
    vat_rate DOUBLE PRECISION NOT NULL,
    extra_week_ratio DOUBLE PRECISION NOT NULL,
    day_exclusion_discount_ratio DOUBLE PRECISION NOT NULL DEFAULT 0.1667,
    packages_json TEXT NOT NULL,
    addons_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY,
    applicant_id TEXT NOT NULL REFERENCES users(id),
    rate_table_version TEXT NOT NULL,
    selection_json TEXT NOT NULL,
    line_items_json TEXT NOT NULL,
    subtotal DOUBLE PRECISION NOT NULL,
    vat DOUBLE PRECISION NOT NULL,
    total DOUBLE PRECISION NOT NULL,
    metered_notice TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    review_json TEXT,
    contract_json TEXT,
    settlement_json TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_quotes_applicant ON quotes(applicant_id);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL,
    stage TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_logs_quote ON audit_logs(quote_id);

  CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),
    required_amount DOUBLE PRECISION NOT NULL,
    deposit_rate DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL,
    depositor_name TEXT,
    reported_at TEXT,
    confirmed_at TEXT,
    confirmed_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id),
    stored_name TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    category TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_attachments_quote ON attachments(quote_id);

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL REFERENCES users(id),
    quote_id TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);

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
  -- 마스터 관리자만 편집 가능 (src/lib/auth.ts 의 requireMasterAdmin 참고).
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
    quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),
    venue_signed_at TEXT,
    venue_signed_by TEXT,
    applicant_signed_at TEXT,
    applicant_signed_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tax_invoices (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL REFERENCES quotes(id),
    purpose TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    status TEXT NOT NULL,
    issued_at TEXT,
    issued_by TEXT,
    payer_name TEXT,
    reported_at TEXT,
    paid_at TEXT,
    paid_confirmed_by TEXT,
    last_reminder_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE(quote_id, purpose)
  );

  CREATE TABLE IF NOT EXISTS ticket_opens (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),
    open_date TEXT,
    materials_uploaded_at TEXT,
    last_reminder_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS facility_meetings (
    id TEXT PRIMARY KEY,
    quote_id TEXT NOT NULL UNIQUE REFERENCES quotes(id),
    meeting_date TEXT,
    materials_uploaded_at TEXT,
    last_reminder_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inquiries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN',
    answer TEXT,
    answered_at TEXT,
    answered_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id);
`;

async function seed(q: Runner): Promise<void> {
  // MASTER_ADMIN_EMAILS(콤마 구분)에 있는 이메일로 이미 가입된 계정을 마스터 관리자로
  // 승격한다. 코드에 특정 개인 이메일을 박아두지 않고 배포 환경변수로만 제어하며,
  // 재시작할 때마다 확인하므로 아직 가입 전인 이메일도 나중에 가입하면 승격된다.
  const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  for (const email of masterEmails) {
    await q(
      "UPDATE users SET role = 'ADMIN', admin_tier = 'MASTER', approval_status = 'APPROVED' WHERE email = ?",
      [email],
    );
  }

  const [rateTables] = await q<{ n: number }>("SELECT COUNT(*) as n FROM rate_tables");
  if (rateTables.n === 0) {
    await q(INSERT_RATE_TABLE_SQL, rateTableParams(buildSeedRateTable()));
  }

  // 운영자가 한 명도 없을 때만 최초 운영자 계정을 만든다.
  const [admins] = await q<{ n: number }>("SELECT COUNT(*) as n FROM users WHERE role = 'ADMIN'");
  if (admins.n === 0) {
    const email = (process.env.SEED_ADMIN_EMAIL || "admin@seoularena.net").toLowerCase();
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) {
      throw new Error(
        "운영자 계정이 없는데 SEED_ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. 초기 비밀번호를 지정하세요.",
      );
    }
    await q(
      `INSERT INTO users (id, username, email, password_hash, name, company_name, role, admin_tier, created_at)
       VALUES (?, ?, ?, ?, ?, NULL, 'ADMIN', 'MASTER', ?)`,
      [crypto.randomUUID(), username, email, bcrypt.hashSync(password, 10), "운영자", new Date().toISOString()],
    );
    // 비밀번호는 로그에 남기지 않는다 — 배포 시크릿으로만 전달한다.
    console.log(`[seoularena] 초기 운영자 계정을 생성했습니다 — 아이디: ${username}`);
  }

  // 내부 테스트용 신청자 계정은 환경변수를 준 경우에만 만든다.
  // (예전에는 test/test1234! 로 항상 만들어졌는데, 운영 환경에 기본 계정이 상주하는 셈이라
  //  로그인 가능한 취약점이 된다.)
  const testEmail = process.env.SEED_TEST_APPLICANT_EMAIL?.trim().toLowerCase();
  const testPassword = process.env.SEED_TEST_APPLICANT_PASSWORD;
  if (testEmail && testPassword) {
    const [existing] = await q<{ id: string }>("SELECT id FROM users WHERE email = ?", [testEmail]);
    if (!existing) {
      const testUsername = process.env.SEED_TEST_APPLICANT_USERNAME || "test";
      await q(
        `INSERT INTO users (id, username, email, password_hash, name, company_name, role, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'APPLICANT', ?)`,
        [
          crypto.randomUUID(),
          testUsername,
          testEmail,
          bcrypt.hashSync(testPassword, 10),
          "테스트 담당자",
          "테스트용 계정",
          new Date().toISOString(),
        ],
      );
      console.log(`[seoularena] 내부 테스트용 신청자 계정을 생성했습니다 — 아이디: ${testUsername}`);
    }
  }

  // 서울아레나 소개 / 대관 안내 하위 페이지 — 최초 1회만 기본 콘텐츠로 시드한다.
  const [pages] = await q<{ n: number }>("SELECT COUNT(*) as n FROM pages");
  if (pages.n === 0) {
    const now = new Date().toISOString();
    for (const [index, page] of SEED_PAGES.entries()) {
      await q(
        `INSERT INTO pages (id, page_group, slug, nav_label, title, body, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), page.group, page.slug, page.navLabel, page.title, page.body, index, now, now],
      );
    }
  }

  // 기능정의서 — 시트 단위로 없는 것만 채운다. 이렇게 해야 나중에 새 시트가 추가돼도
  // 마스터 관리자가 이미 손으로 고친 다른 시트를 건드리지 않는다.
  for (const key of FEATURE_SPEC_SHEET_KEYS) {
    await q(
      `INSERT INTO feature_spec_sheets (sheet_key, data, updated_at) VALUES (?, ?, ?)
       ON CONFLICT (sheet_key) DO NOTHING`,
      [key, JSON.stringify(FEATURE_SPEC_SEED[key] ?? []), new Date().toISOString()],
    );
  }
}

export async function initSchema(): Promise<void> {
  const client = await getPool().connect();
  const q = runnerFor(client);
  try {
    await q("SELECT pg_advisory_lock(?)", [INIT_LOCK_KEY]);
    try {
      await q(SCHEMA_SQL);
      await seed(q);
    } finally {
      await q("SELECT pg_advisory_unlock(?)", [INIT_LOCK_KEY]);
    }
  } finally {
    client.release();
  }
}
