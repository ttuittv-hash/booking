import { Pool, type PoolClient } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { hash as bcryptHash } from "@node-rs/bcrypt";
import crypto from "node:crypto";
import { buildSeedRateTable, SEED_MID_HALL_RATE_CONFIG } from "./pricing/seed";
import { SEED_PAGES } from "./pricing/pageSeed";
import {
  DEFAULT_GUIDE_CONTENT,
  DEFAULT_HOME_CONTENT,
  DEFAULT_PRIVACY_CONTENT,
  DEFAULT_TERMS_CONTENT,
  DEFAULT_VENUE_CONTENT,
} from "./content/seed";
import { FEATURE_SPEC_SEED } from "./featureSpecSeed";
import { FEATURE_SPEC_SHEET_KEYS } from "./pricing/types";
import { sha256Hex } from "./passwordScheme";
import type { GuideContent, HomeContent, LegalContent, VenueContent } from "./content/types";
import type {
  ApprovalStatus,
  CompanyVerification,
  AppNotification,
  AppUser,
  Attachment,
  AttachmentCategory,
  AuditLogAction,
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

// 비밀번호 저장 방식 (passwordScheme.ts 참고):
//  - 'v2': bcrypt(sha256hex(비밀번호)) — 클라이언트가 SHA-256으로 해시해서 보내는 현행 방식
//  - 'v1': bcrypt(비밀번호 평문)      — SQLite 시절(마이그레이션으로 이관된) 레거시 계정.
//          로그인 시 1회 평문 검증 후 v2로 자동 승격된다 (api/auth/login 참고).
export type PasswordScheme = "v1" | "v2";

declare global {
  var __seoulArenaPool: Pool | undefined;
  var __seoulArenaInit: Promise<void> | undefined;
}

function createPool(): Pool {
  // 로컬 개발 기본값 — docker-compose.yml의 PostgreSQL(호스트 포트 5433)과 일치한다.
  const connectionString =
    process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5433/seoularena";
  // Render 등 외부 접속은 TLS가 필요할 수 있다 — URL에 sslmode=require가 있거나
  // DATABASE_SSL=true면 인증서 검증 없이 TLS로 접속한다(관리형 DB 자체 서명 인증서 대응).
  const useSsl = /sslmode=require/.test(connectionString) || process.env.DATABASE_SSL === "true";
  return new Pool({
    connectionString,
    max: 10,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
}

async function initSchema(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      business_registration_number TEXT,
      representative_name TEXT,
      postal_code TEXT,
      address TEXT,
      business_cert_url TEXT,
      business_cert_name TEXT,
      created_at TEXT NOT NULL,
      -- 사업자 진위확인(NICE 법인실명확인) 결과. 가입 시 1회 조회해 심사 화면에 그대로 보여준다.
      verification_status TEXT,
      verified_company_name TEXT,
      verified_representative_name TEXT,
      verified_comp_status TEXT,
      verified_comp_status_label TEXT,
      verified_comp_type_label TEXT,
      verification_message TEXT,
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      password_scheme TEXT NOT NULL DEFAULT 'v2',
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
      settlement_json TEXT,
      -- 주차는 selection_json 안에도 있지만, 경합 검사·수요 집계에서 조건 검색과 집계를
      -- 해야 해서 컬럼으로 따로 뽑아 둔다(JSON 문자열은 DB가 검색하지 못한다).
      week_year INTEGER,
      week_month INTEGER,
      week_of_month INTEGER
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

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      recipient_id TEXT NOT NULL REFERENCES users(id),
      quote_id TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
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

    -- 로그인·회원가입 시도 횟수 카운터. 서버가 여러 대여도 공유되고, 재시작해도 유지된다.
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      reset_at TIMESTAMPTZ NOT NULL
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
  `);

  // 이미 배포되어 있던 DB에는 CREATE TABLE IF NOT EXISTS가 새 컬럼을 추가해주지 않으므로,
  // 이후 세션에서 추가되는 컬럼은 여기서 마이그레이션한다 (PostgreSQL은 IF NOT EXISTS 지원).
  await pool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_scheme TEXT NOT NULL DEFAULT 'v2';
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_status TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_company_name TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_representative_name TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_comp_status TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_comp_status_label TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_comp_type_label TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verification_message TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS verified_at TEXT;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS week_year INTEGER;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS week_month INTEGER;
    ALTER TABLE quotes ADD COLUMN IF NOT EXISTS week_of_month INTEGER;
    ALTER TABLE rate_tables ADD COLUMN IF NOT EXISTS mid_hall_json TEXT;
    -- 나의 정보 수정 화면 확장(2026-08-20) — 기업 대표번호/대표팩스/법인등록번호,
    -- 개인 유선전화/팩스번호. 회사명·사업자등록번호는 여기 포함되지 않는다(변경 불가 —
    -- 탈퇴 후 재가입 안내).
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_phone TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS representative_fax TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS corporate_registration_number TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS office_phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS fax_number TEXT;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;

    -- 외래키 컬럼 인덱스. 없으면 신청서 상세·첨부 목록·알림 조회가 전부 테이블 전체 스캔이 된다.
    CREATE INDEX IF NOT EXISTS idx_quotes_applicant ON quotes(applicant_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_week ON quotes(week_year, week_month, week_of_month);
    CREATE INDEX IF NOT EXISTS idx_attachments_quote ON attachments(quote_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_quote ON audit_logs(quote_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_inquiries_user ON inquiries(user_id);
    CREATE INDEX IF NOT EXISTS idx_tax_invoices_quote ON tax_invoices(quote_id);
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
  `);

  // 주차 컬럼 도입 이전에 저장된 신청서는 selection_json 에서 값을 뽑아 한 번 채운다.
  await pool.query(`
    UPDATE quotes SET
      week_year     = (selection_json::json -> 'week' ->> 'year')::int,
      week_month    = (selection_json::json -> 'week' ->> 'month')::int,
      week_of_month = (selection_json::json -> 'week' ->> 'weekOfMonth')::int
    WHERE week_year IS NULL
  `);
}

async function seedData(pool: Pool) {
  // admin_tier 컬럼 도입 이전에 만들어진 운영자 계정 부트스트랩:
  // 마스터 관리자가 한 명도 없으면, 가장 먼저 만들어진 운영자 계정을 마스터로 승격하고
  // 나머지 운영자는 일반관리자(BASIC)로 채워둔다. (한 번만 실행되며, 이후엔 무동작)
  const masterCount = (
    await pool.query("SELECT COUNT(*)::int as n FROM users WHERE role = 'ADMIN' AND admin_tier = 'MASTER'")
  ).rows[0] as { n: number };
  if (masterCount.n === 0) {
    const oldestAdmin = (
      await pool.query("SELECT id FROM users WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1")
    ).rows[0] as { id: string } | undefined;
    if (oldestAdmin) {
      await pool.query("UPDATE users SET admin_tier = 'MASTER' WHERE id = $1", [oldestAdmin.id]);
    }
  }
  await pool.query("UPDATE users SET admin_tier = 'BASIC' WHERE role = 'ADMIN' AND admin_tier IS NULL");

  // MASTER_ADMIN_EMAILS(콤마로 구분된 이메일 목록) 환경변수에 있는 이메일로 이미 가입된
  // 계정이 있으면 마스터 관리자로 승격한다(신청자 계정이었다면 운영자로도 함께 전환).
  const masterEmails = (process.env.MASTER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  for (const email of masterEmails) {
    await pool.query(
      "UPDATE users SET role = 'ADMIN', admin_tier = 'MASTER', approval_status = 'APPROVED' WHERE email = $1",
      [email],
    );
  }

  const rateTableCount = (await pool.query("SELECT COUNT(*)::int as n FROM rate_tables")).rows[0] as {
    n: number;
  };
  if (rateTableCount.n === 0) {
    await insertRateTable(pool, buildSeedRateTable());
  }

  const adminCount = (
    await pool.query("SELECT COUNT(*)::int as n FROM users WHERE role = 'ADMIN'")
  ).rows[0] as { n: number };
  if (adminCount.n === 0) {
    const email = process.env.SEED_ADMIN_EMAIL || "admin@seoularena.kr";
    const username = process.env.SEED_ADMIN_USERNAME || "admin";
    // 운영(production)에서는 기본 비밀번호를 두지 않는다 — 초기 비밀번호를 반드시 환경변수로 지정.
    const password =
      process.env.SEED_ADMIN_PASSWORD ||
      (process.env.NODE_ENV !== "production" ? "admin1234!" : "");
    if (!password) {
      throw new Error(
        "운영자 계정이 없는데 SEED_ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. 초기 비밀번호를 지정하세요.",
      );
    }
    // v2 스킴: 클라이언트가 보내는 sha256(비밀번호)을 bcrypt로 감싼 값을 저장한다.
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, password_scheme, name, company_name, role, admin_tier, created_at)
       VALUES ($1, $2, $3, $4, 'v2', $5, NULL, 'ADMIN', 'MASTER', $6)`,
      [
        crypto.randomUUID(),
        username,
        email.toLowerCase(),
        await bcryptHash(sha256Hex(password), 10),
        "운영자",
        new Date().toISOString(),
      ],
    );
    console.log(
      `[seoularena] 초기 운영자 계정이 생성되었습니다 — 아이디: ${username} (배포 전 반드시 비밀번호를 변경하세요)`,
    );
  }

  // 내부 테스트용 — 승인 절차 없이 바로 대관 신청까지 이용 가능한 신청자 계정.
  // 운영(production)에서는 환경변수로 비밀번호를 지정한 경우에만 생성한다(기본 자격증명 방지).
  const testPassword =
    process.env.SEED_TEST_APPLICANT_PASSWORD ||
    (process.env.NODE_ENV !== "production" ? "test1234!" : "");
  const testApplicantEmail = (process.env.SEED_TEST_APPLICANT_EMAIL || "test@seoularena.kr").toLowerCase();
  const existingTestApplicant = testPassword
    ? (await pool.query("SELECT id FROM users WHERE email = $1", [testApplicantEmail])).rows[0]
    : undefined;
  if (testPassword && !existingTestApplicant) {
    const testUsername = process.env.SEED_TEST_APPLICANT_USERNAME || "test";
    await pool.query(
      `INSERT INTO users (id, username, email, password_hash, password_scheme, name, company_name, role, created_at)
       VALUES ($1, $2, $3, $4, 'v2', $5, $6, 'APPLICANT', $7)`,
      [
        crypto.randomUUID(),
        testUsername,
        testApplicantEmail,
        await bcryptHash(sha256Hex(testPassword), 10),
        "테스트 담당자",
        "테스트용 계정",
        new Date().toISOString(),
      ],
    );
    console.log(
      `[seoularena] 내부 테스트용 신청자 계정이 생성되었습니다 (승인 완료 상태) — 아이디: ${testUsername}`,
    );
  }

  // 서울아레나 소개 / 대관 안내 하위 페이지 — 최초 1회만 기본 콘텐츠로 시드한다.
  const pageCount = (await pool.query("SELECT COUNT(*)::int as n FROM pages")).rows[0] as { n: number };
  if (pageCount.n === 0) {
    const now = new Date().toISOString();
    for (let i = 0; i < SEED_PAGES.length; i++) {
      const p = SEED_PAGES[i];
      await pool.query(
        `INSERT INTO pages (id, page_group, slug, nav_label, title, body, sort_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [crypto.randomUUID(), p.group, p.slug, p.navLabel, p.title, p.body, i, now, now],
      );
    }
  }

  // 기능정의서(내부 기획 문서) — 시트별로 없는 것만 채운다. 이미 운영 중인 DB에 나중에
  // 새 시트가 추가돼도, 기존에 수동 편집된 다른 시트들을 건드리지 않는다.
  for (const key of FEATURE_SPEC_SHEET_KEYS) {
    const existing = (
      await pool.query("SELECT 1 FROM feature_spec_sheets WHERE sheet_key = $1", [key])
    ).rows[0];
    if (existing) continue;
    await pool.query(
      "INSERT INTO feature_spec_sheets (sheet_key, data, updated_at) VALUES ($1, $2, $3)",
      [key, JSON.stringify(FEATURE_SPEC_SEED[key] ?? []), new Date().toISOString()],
    );
  }

  // 더 이상 쓰지 않는 시트(예: 폐기된 "마일스톤")는 정리한다. 화면에서 접근할 방법이
  // 없는 죽은 데이터라, FEATURE_SPEC_SHEET_KEYS 에 없는 키는 일반화해서 지운다.
  await pool.query("DELETE FROM feature_spec_sheets WHERE sheet_key <> ALL($1)", [
    [...FEATURE_SPEC_SHEET_KEYS],
  ]);

  // 상세 정의 칸은 화면에서 입력할 때 첫 줄도 "· "로 시작하게 되어 있는데, 그 규칙이
  // 생기기 전에 입력된 값들은 첫머리에 점이 없다. 값이 있는데 "· "로 시작하지 않는
  // 행에만 앞머리를 붙인다(이미 붙어 있으면 건드리지 않는다).
  const DETAIL_DOT_SHEET_KEYS = ["기능정의(프론트)", "기능정의(어드민)", "약관"] as const;
  for (const key of DETAIL_DOT_SHEET_KEYS) {
    const row = (
      await pool.query<{ data: string }>(
        "SELECT data FROM feature_spec_sheets WHERE sheet_key = $1",
        [key],
      )
    ).rows[0];
    if (!row) continue;
    const rows = JSON.parse(row.data) as Record<string, string>[];
    if (!rows.some((r) => r["상세 정의"] && !r["상세 정의"].startsWith("· "))) continue;
    const fixed = rows.map((r) =>
      !r["상세 정의"] || r["상세 정의"].startsWith("· ")
        ? r
        : { ...r, "상세 정의": `· ${r["상세 정의"]}` },
    );
    await pool.query(
      "UPDATE feature_spec_sheets SET data = $1, updated_at = $2 WHERE sheet_key = $3",
      [JSON.stringify(fixed), new Date().toISOString(), key],
    );
  }
}

// 여러 인스턴스가 동시에 기동해도 DDL/시드가 한 번만 돌도록 잠그는 키(임의 상수).
// advisory lock은 커넥션(세션) 단위이므로 잠금·해제를 같은 커넥션에서 수행한다.
const INIT_LOCK_KEY = 8264125031;

async function ensureInit(): Promise<Pool> {
  if (!globalThis.__seoulArenaPool) {
    globalThis.__seoulArenaPool = createPool();
  }
  const pool = globalThis.__seoulArenaPool;
  if (!globalThis.__seoulArenaInit) {
    globalThis.__seoulArenaInit = (async () => {
      const client = await pool.connect();
      try {
        await client.query("SELECT pg_advisory_lock($1)", [INIT_LOCK_KEY]);
        await initSchema(pool);
        await seedData(pool);
      } finally {
        await client.query("SELECT pg_advisory_unlock($1)", [INIT_LOCK_KEY]).catch(() => {});
        client.release();
      }
    })().catch((err) => {
      // 초기화 실패 시 다음 요청에서 재시도할 수 있도록 초기화 프로미스를 비워둔다.
      globalThis.__seoulArenaInit = undefined;
      throw err;
    });
  }
  await globalThis.__seoulArenaInit;
  return pool;
}

// 트랜잭션 중이면 그 커넥션으로, 아니면 풀로 실행한다.
// AsyncLocalStorage 를 쓰는 이유: 조회/변경 함수 100여 개에 커넥션을 인자로 넘기지 않고도
// withTransaction() 안에서 호출된 것들이 같은 트랜잭션에 묶이게 하기 위함이다.
const txStorage = new AsyncLocalStorage<PoolClient>();

async function q<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const tx = txStorage.getStore();
  if (tx) {
    const result = await tx.query(sql, params);
    return result.rows as T[];
  }
  const pool = await ensureInit();
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

/**
 * 여러 건의 변경을 하나로 묶는다 — 도중에 실패하면 전부 되돌린다.
 * 예: 신청서 생성 + 감사로그 + 운영자 알림이 따로 커밋되면
 * "신청서는 있는데 이력이 없는" 상태가 남을 수 있다.
 *
 * 콜백 안에서 부르는 db 함수는 자동으로 같은 트랜잭션에 참여한다.
 * 중첩 호출은 바깥 트랜잭션에 합류한다(별도 트랜잭션을 새로 열지 않는다).
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  if (txStorage.getStore()) return fn();

  const pool = await ensureInit();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await txStorage.run(client, fn);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function one<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  const rows = await q<T>(sql, params);
  return rows[0];
}

async function insertRateTable(pool: Pool, rateTable: RateTable) {
  await pool.query(
    `INSERT INTO rate_tables (version, vat_rate, extra_week_ratio, day_exclusion_discount_ratio, packages_json, addons_json, mid_hall_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      rateTable.version,
      rateTable.vatRate,
      rateTable.extraWeekRatio,
      rateTable.dayExclusionDiscountRatio,
      JSON.stringify(rateTable.packages),
      JSON.stringify(rateTable.addons),
      JSON.stringify(rateTable.midHall),
      rateTable.updatedAt,
    ],
  );
}

// ---------------------------------------------------------------------------
// Rate table
// ---------------------------------------------------------------------------

interface RateTableRow {
  version: string;
  vat_rate: number;
  extra_week_ratio: number;
  day_exclusion_discount_ratio: number;
  packages_json: string;
  addons_json: string;
  mid_hall_json: string | null;
  updated_at: string;
}

function toRateTable(row: RateTableRow): RateTable {
  // 과거 버전(할인율 필드 추가 이전)에 저장된 패키지는 discountRatio가 없을 수 있으므로 기본값 0으로 보정한다.
  const rawPackages = JSON.parse(row.packages_json) as Array<
    RateTable["packages"][number] & { discountRatio?: number }
  >;
  const packages = rawPackages.map((pkg) => ({ ...pkg, discountRatio: pkg.discountRatio ?? 0 }));
  // mid_hall_json 컬럼 추가(2026-08-19) 이전에 저장된 버전은 NULL이므로 시드 기본값으로 보정한다.
  const midHall = row.mid_hall_json ? JSON.parse(row.mid_hall_json) : SEED_MID_HALL_RATE_CONFIG;
  return {
    version: row.version,
    vatRate: row.vat_rate,
    extraWeekRatio: row.extra_week_ratio,
    dayExclusionDiscountRatio: row.day_exclusion_discount_ratio,
    packages,
    addons: JSON.parse(row.addons_json),
    midHall,
    updatedAt: row.updated_at,
  };
}

export async function getCurrentRateTable(): Promise<RateTable> {
  const row = await one<RateTableRow>("SELECT * FROM rate_tables ORDER BY updated_at DESC LIMIT 1");
  if (!row) throw new Error("요금표가 초기화되지 않았습니다.");
  return toRateTable(row);
}

// 신청서 상세 화면에서 "신청 당시" 패키지명 등을 정확히 복원하기 위해, 현재 요금표가 아니라
// 견적 계산 시점의 버전(quote.rateTableVersion)을 그대로 조회한다. 해당 버전이 없으면(드묾)
// 현재 요금표로 대체한다.
export async function getRateTableByVersion(version: string): Promise<RateTable> {
  const row = await one<RateTableRow>("SELECT * FROM rate_tables WHERE version = $1", [version]);
  if (!row) return getCurrentRateTable();
  return toRateTable(row);
}

export async function saveNewRateTableVersion(
  next: Omit<RateTable, "version" | "updatedAt">,
): Promise<RateTable> {
  const pool = await ensureInit();
  const version = `v-${Date.now()}`;
  const rateTable: RateTable = { ...next, version, updatedAt: new Date().toISOString() };
  await insertRateTable(pool, rateTable);
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
  representative_phone: string | null;
  representative_fax: string | null;
  corporate_registration_number: string | null;
  postal_code: string | null;
  address: string | null;
  business_cert_url: string | null;
  business_cert_name: string | null;
  created_at: string;
  verification_status: string | null;
  verified_company_name: string | null;
  verified_representative_name: string | null;
  verified_comp_status: string | null;
  verified_comp_status_label: string | null;
  verified_comp_type_label: string | null;
  verification_message: string | null;
  verified_at: string | null;
}

function toCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    name: row.name,
    businessRegistrationNumber: row.business_registration_number,
    representativeName: row.representative_name,
    representativePhone: row.representative_phone,
    representativeFax: row.representative_fax,
    corporateRegistrationNumber: row.corporate_registration_number,
    postalCode: row.postal_code,
    address: row.address,
    businessCertUrl: row.business_cert_url,
    businessCertName: row.business_cert_name,
    createdAt: row.created_at,
    verification: row.verification_status
      ? {
          status: row.verification_status as CompanyVerification["status"],
          companyName: row.verified_company_name,
          representativeName: row.verified_representative_name,
          compStatus: row.verified_comp_status,
          compStatusLabel: row.verified_comp_status_label,
          compTypeLabel: row.verified_comp_type_label,
          message: row.verification_message,
          checkedAt: row.verified_at,
        }
      : null,
  };
}

// 사업자 진위확인 결과를 저장한다(가입 시 1회, 운영자가 재확인할 때 갱신).
export async function saveCompanyVerification(
  companyId: string,
  verification: {
    status: string;
    companyName: string | null;
    representativeName: string | null;
    compStatus: string | null;
    compStatusLabel: string | null;
    compTypeLabel: string | null;
    message: string | null;
    checkedAt: string;
  },
): Promise<void> {
  await q(
    `UPDATE companies SET
       verification_status = $1, verified_company_name = $2, verified_representative_name = $3,
       verified_comp_status = $4, verified_comp_status_label = $5, verified_comp_type_label = $6,
       verification_message = $7, verified_at = $8
     WHERE id = $9`,
    [
      verification.status,
      verification.companyName,
      verification.representativeName,
      verification.compStatus,
      verification.compStatusLabel,
      verification.compTypeLabel,
      verification.message,
      verification.checkedAt,
      companyId,
    ],
  );
}

// 회사명으로 기존 기획사를 찾거나 없으면 새로 만든다 (대소문자·공백 무시하고 매칭).
// 이미 등록된 회사라면 사업자등록번호 등 법인 정보는 최초 등록 값을 그대로 유지한다.
export async function findOrCreateCompany(
  name: string,
  extra?: {
    businessRegistrationNumber?: string;
    representativeName?: string;
    postalCode?: string;
    address?: string;
    businessCertUrl?: string;
    businessCertName?: string;
  },
): Promise<Company> {
  const trimmed = name.trim();
  const existing = await one<CompanyRow>("SELECT * FROM companies WHERE lower(name) = lower($1)", [
    trimmed,
  ]);
  if (existing) return toCompany(existing);

  const row: CompanyRow = {
    id: crypto.randomUUID(),
    name: trimmed,
    business_registration_number: extra?.businessRegistrationNumber?.trim() || null,
    representative_name: extra?.representativeName?.trim() || null,
    representative_phone: null,
    representative_fax: null,
    corporate_registration_number: null,
    postal_code: extra?.postalCode?.trim() || null,
    address: extra?.address?.trim() || null,
    business_cert_url: extra?.businessCertUrl || null,
    business_cert_name: extra?.businessCertName || null,
    created_at: new Date().toISOString(),
    verification_status: null,
    verified_company_name: null,
    verified_representative_name: null,
    verified_comp_status: null,
    verified_comp_status_label: null,
    verified_comp_type_label: null,
    verification_message: null,
    verified_at: null,
  };
  // 같은 회사명으로 동시에 가입하면 조회-후-삽입 사이에 경합이 나서 한쪽이 UNIQUE 위반으로 실패한다.
  // 충돌 시 무시하고 아래에서 기존 행을 다시 읽는다.
  await q(
    `INSERT INTO companies
      (id, name, business_registration_number, representative_name, postal_code, address, business_cert_url, business_cert_name, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (name) DO NOTHING`,
    [
      row.id,
      row.name,
      row.business_registration_number,
      row.representative_name,
      row.postal_code,
      row.address,
      row.business_cert_url,
      row.business_cert_name,
      row.created_at,
    ],
  );
  const stored = await one<CompanyRow>("SELECT * FROM companies WHERE lower(name) = lower($1)", [
    trimmed,
  ]);
  return toCompany(stored ?? row);
}

export async function findCompanyById(id: string): Promise<Company | undefined> {
  const row = await one<CompanyRow>("SELECT * FROM companies WHERE id = $1", [id]);
  return row ? toCompany(row) : undefined;
}

export async function listCompanies(): Promise<Company[]> {
  const rows = await q<CompanyRow>("SELECT * FROM companies ORDER BY name ASC");
  return rows.map(toCompany);
}

// 나의 정보 수정에서 회원이 직접 바꿀 수 있는 기업 정보만 갱신한다. 회사명·사업자등록번호는
// 여기 포함하지 않는다 — 바뀌면 다른 회사로 취급해야 하므로 탈퇴 후 재가입 안내로 유도한다.
export async function updateCompanyProfile(
  id: string,
  input: {
    representativeName: string | null;
    representativePhone: string | null;
    representativeFax: string | null;
    corporateRegistrationNumber: string | null;
    postalCode: string | null;
    address: string | null;
  },
): Promise<Company> {
  await q(
    `UPDATE companies SET
       representative_name = $1, representative_phone = $2, representative_fax = $3,
       corporate_registration_number = $4, postal_code = $5, address = $6
     WHERE id = $7`,
    [
      input.representativeName,
      input.representativePhone,
      input.representativeFax,
      input.corporateRegistrationNumber,
      input.postalCode,
      input.address,
      id,
    ],
  );
  return (await findCompanyById(id))!;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface UserRow {
  id: string;
  username: string | null;
  email: string;
  phone: string | null;
  office_phone: string | null;
  fax_number: string | null;
  password_hash: string;
  password_scheme: PasswordScheme;
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
    officePhone: row.office_phone,
    faxNumber: row.fax_number,
    name: row.name,
    companyName: row.company_name,
    companyId: row.company_id,
    role: row.role,
    approvalStatus: row.approval_status,
    adminTier: row.role === "ADMIN" ? (row.admin_tier ?? "BASIC") : null,
    createdAt: row.created_at,
  };
}

export async function createUser(input: {
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
}): Promise<AppUser> {
  const approvalStatus = input.approvalStatus ?? "APPROVED";
  const companyId = input.companyId ?? null;
  const phone = input.phone ?? null;
  const adminTier: AdminTier | null = input.role === "ADMIN" ? (input.adminTier ?? "BASIC") : null;
  await q(
    `INSERT INTO users (id, username, email, phone, password_hash, password_scheme, name, company_name, company_id, role, approval_status, admin_tier, terms_agreed_at, privacy_agreed_at, created_at)
     VALUES ($1, $2, $3, $4, $5, 'v2', $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
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
    ],
  );
  return {
    id: input.id,
    username: input.username,
    email: input.email.toLowerCase(),
    phone,
    officePhone: null,
    faxNumber: null,
    name: input.name,
    companyName: input.companyName,
    companyId,
    role: input.role,
    approvalStatus,
    adminTier,
    createdAt: input.createdAt,
  };
}

export async function findUserByEmailWithPasswordHash(
  email: string,
): Promise<(AppUser & { passwordHash: string; passwordScheme: PasswordScheme }) | undefined> {
  const row = await one<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!row || row.withdrawn_at) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash, passwordScheme: row.password_scheme };
}

// 승인 대기 중인 신청도 포함해 동일 전화번호로 이미 가입된 계정이 있는지 확인한다
// (승인 전에 이메일만 바꿔 중복 신청하는 것을 막기 위함).
export async function findUserByPhone(phone: string): Promise<AppUser | undefined> {
  const row = await one<UserRow>("SELECT * FROM users WHERE phone = $1", [phone.trim()]);
  return row ? toAppUser(row) : undefined;
}

export async function findUserByUsername(username: string): Promise<AppUser | undefined> {
  const row = await one<UserRow>("SELECT * FROM users WHERE username = $1", [username.trim()]);
  return row ? toAppUser(row) : undefined;
}

// 로그인 식별자로 아이디 또는 이메일을 모두 허용한다 (아이디 필드 도입 이전 계정과의 호환을 위함).
export async function findUserByLoginIdWithPasswordHash(
  loginId: string,
): Promise<(AppUser & { passwordHash: string; passwordScheme: PasswordScheme }) | undefined> {
  const trimmed = loginId.trim();
  const row = await one<UserRow>("SELECT * FROM users WHERE username = $1 OR email = $2", [
    trimmed,
    trimmed.toLowerCase(),
  ]);
  if (!row || row.withdrawn_at) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash, passwordScheme: row.password_scheme };
}

// 목록 화면에서 신청자/작성자를 한 번에 채울 때 사용한다 — id 개수만큼 쿼리를 날리는 대신
// IN 조건 한 방으로 읽는다.
export async function listUsersByIds(ids: string[]): Promise<AppUser[]> {
  if (ids.length === 0) return [];
  const rows = await q<UserRow>("SELECT * FROM users WHERE id = ANY($1)", [ids]);
  return rows.map(toAppUser);
}

export async function listUsers(filter?: {
  role?: UserRole;
  approvalStatus?: ApprovalStatus;
}): Promise<AppUser[]> {
  const conditions: string[] = [];
  const params: string[] = [];
  if (filter?.role) {
    params.push(filter.role);
    conditions.push(`role = $${params.length}`);
  }
  if (filter?.approvalStatus) {
    params.push(filter.approvalStatus);
    conditions.push(`approval_status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await q<UserRow>(`SELECT * FROM users ${where} ORDER BY created_at ASC`, params);
  return rows.map(toAppUser);
}

export async function listUsersPaged(
  filter: { role?: UserRole; approvalStatus?: ApprovalStatus; excludeApprovalStatus?: ApprovalStatus } = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Paged<AppUser>> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filter.role) {
    params.push(filter.role);
    conditions.push(`role = $${params.length}`);
  }
  if (filter.approvalStatus) {
    params.push(filter.approvalStatus);
    conditions.push(`approval_status = $${params.length}`);
  }
  if (filter.excludeApprovalStatus) {
    params.push(filter.excludeApprovalStatus);
    conditions.push(`approval_status <> $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM users ${where}`, params);
  const rows = await q<UserRow>(
    `SELECT * FROM users ${where} ORDER BY created_at ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return toPaged(rows.map(toAppUser), countRow?.n ?? 0, page, pageSize);
}

export async function setUserApprovalStatus(id: string, approvalStatus: ApprovalStatus): Promise<AppUser> {
  await q("UPDATE users SET approval_status = $1 WHERE id = $2", [approvalStatus, id]);
  return (await findUserById(id))!;
}

// 운영자 계정 등급 변경(일반관리자/프로 관리자/마스터 관리자). 호출부(API 라우트)에서
// "호출자가 마스터 관리자인지"는 이미 확인했다고 가정한다 — 여기서는 마지막 남은 마스터
// 관리자를 강등시키는 경우만 막아서, 시스템에 마스터가 0명이 되는 상태를 방지한다.
export async function setAdminTier(id: string, tier: AdminTier): Promise<AppUser> {
  const target = await findUserById(id);
  if (!target || target.role !== "ADMIN") {
    throw new Error("운영자 계정이 아닙니다.");
  }
  if (target.adminTier === "MASTER" && tier !== "MASTER") {
    const masterCount = await one<{ n: number }>(
      "SELECT COUNT(*)::int as n FROM users WHERE role = 'ADMIN' AND admin_tier = 'MASTER'",
    );
    if ((masterCount?.n ?? 0) <= 1) {
      throw new Error("마지막 남은 마스터 관리자는 강등할 수 없습니다.");
    }
  }
  await q("UPDATE users SET admin_tier = $1 WHERE id = $2", [tier, id]);
  return (await findUserById(id))!;
}

// 비밀번호 해시 없이 이메일로 계정을 찾는다(역할 무관 — 신청자든 운영자든).
// "기존 회원을 운영자로 승급" 기능에서 사용.
export async function findUserByEmail(email: string): Promise<AppUser | undefined> {
  const row = await one<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!row || row.withdrawn_at) return undefined;
  return toAppUser(row);
}

// 이미 가입된 계정(신청자 포함)을 운영자로 전환한다. 새 비밀번호를 만들지 않고
// 그 사람이 이미 쓰던 계정 그대로 role/등급만 바꾸는 것 — Render 환경변수
// (MASTER_ADMIN_EMAILS) 없이도 마스터 관리자가 화면에서 바로 할 수 있게 한다.
export async function promoteUserToAdmin(id: string, tier: AdminTier): Promise<AppUser> {
  await q("UPDATE users SET role = 'ADMIN', admin_tier = $1, approval_status = 'APPROVED' WHERE id = $2", [
    tier,
    id,
  ]);
  return (await findUserById(id))!;
}

export async function findUserById(id: string): Promise<AppUser | undefined> {
  const row = await one<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
  return row ? toAppUser(row) : undefined;
}

export async function updateUserProfile(
  id: string,
  input: {
    name: string;
    phone: string | null;
    username: string;
    email: string;
    officePhone: string | null;
    faxNumber: string | null;
  },
): Promise<AppUser> {
  await q(
    `UPDATE users SET name = $1, phone = $2, username = $3, email = $4, office_phone = $5, fax_number = $6
     WHERE id = $7`,
    [input.name, input.phone, input.username, input.email.toLowerCase(), input.officePhone, input.faxNumber, id],
  );
  return (await findUserById(id))!;
}

// 비밀번호를 변경하면 항상 현행 v2 스킴(bcrypt(sha256(비밀번호)))으로 저장한다 —
// 레거시(v1) 계정도 비밀번호 변경/로그인 승격 시점에 v2로 전환된다.
export async function updateUserPassword(id: string, passwordHash: string) {
  await q("UPDATE users SET password_hash = $1, password_scheme = 'v2' WHERE id = $2", [
    passwordHash,
    id,
  ]);
}

export async function findUserPasswordHash(
  id: string,
): Promise<{ passwordHash: string; passwordScheme: PasswordScheme } | undefined> {
  const row = await one<{ password_hash: string; password_scheme: PasswordScheme }>(
    "SELECT password_hash, password_scheme FROM users WHERE id = $1",
    [id],
  );
  return row ? { passwordHash: row.password_hash, passwordScheme: row.password_scheme } : undefined;
}

// 탈퇴는 신청서(applicant_id FK)·감사로그 등 기존 기록 보존을 위해 소프트 삭제로 처리한다.
export async function withdrawUser(id: string, withdrawnAt: string) {
  await q("UPDATE users SET withdrawn_at = $1 WHERE id = $2", [withdrawnAt, id]);
}

export async function isUserWithdrawn(id: string): Promise<boolean> {
  const row = await one<{ withdrawn_at: string | null }>(
    "SELECT withdrawn_at FROM users WHERE id = $1",
    [id],
  );
  return !!row?.withdrawn_at;
}


// ---------------------------------------------------------------------------
// 목록 페이지네이션
// ---------------------------------------------------------------------------

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const DEFAULT_PAGE_SIZE = 20;

// 1보다 작거나 숫자가 아닌 입력은 1페이지로 보정한다(쿼리스트링을 그대로 받기 때문).
export function normalizePage(input: unknown): number {
  const page = Number(input);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

function toPaged<T>(items: T[], total: number, page: number, pageSize: number): Paged<T> {
  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// ---------------------------------------------------------------------------
// 레이트리밋 (로그인·회원가입 시도 횟수)
// ---------------------------------------------------------------------------

// 고정 윈도우 카운터를 한 번의 upsert 로 갱신하고, 갱신된 값으로 허용 여부를 판단한다.
// 창이 만료됐으면 카운트를 1로 되돌리고 만료 시각을 새로 잡는다.
export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const row = await one<{ count: number }>(
    `INSERT INTO rate_limits (key, count, reset_at)
     VALUES ($1, 1, now() + ($2 || ' milliseconds')::interval)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at <= now()
                       THEN now() + ($2 || ' milliseconds')::interval
                       ELSE rate_limits.reset_at END
     RETURNING count`,
    [key, String(windowMs)],
  );
  return (row?.count ?? 1) <= limit;
}

// 만료된 카운터 정리 — 알림 스케줄러가 하루 한 번 함께 호출한다.
export async function purgeExpiredRateLimits(): Promise<void> {
  await q("DELETE FROM rate_limits WHERE reset_at <= now()");
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

export async function createQuote(input: {
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
}): Promise<Quote> {
  await q(
    `INSERT INTO quotes
      (id, applicant_id, rate_table_version, selection_json, line_items_json, subtotal, vat, total, metered_notice, status, created_at, review_json, contract_json, settlement_json, week_year, week_month, week_of_month)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ESTIMATE', $10, NULL, NULL, NULL, $11, $12, $13)`,
    [
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
      input.selection?.week?.year ?? null,
      input.selection?.week?.month ?? null,
      input.selection?.week?.weekOfMonth ?? null,
    ],
  );
  return (await getQuoteById(input.id))!;
}

export async function getQuoteById(id: string): Promise<Quote | undefined> {
  const row = await one<QuoteRow>("SELECT * FROM quotes WHERE id = $1", [id]);
  return row ? toQuote(row) : undefined;
}

export async function listQuotes(filter?: {
  applicantId?: string;
  companyId?: string;
}): Promise<Quote[]> {
  let rows: QuoteRow[];
  if (filter?.companyId) {
    rows = await q<QuoteRow>(
      `SELECT q.* FROM quotes q JOIN users u ON u.id = q.applicant_id
       WHERE u.company_id = $1 ORDER BY q.created_at DESC`,
      [filter.companyId],
    );
  } else if (filter?.applicantId) {
    rows = await q<QuoteRow>("SELECT * FROM quotes WHERE applicant_id = $1 ORDER BY created_at DESC", [
      filter.applicantId,
    ]);
  } else {
    rows = await q<QuoteRow>("SELECT * FROM quotes ORDER BY created_at DESC");
  }
  return rows.map(toQuote);
}

// 화면용 신청서 목록 — 전체를 한 번에 읽지 않고 페이지 단위로 끊어 온다.
export async function listQuotesPaged(
  filter: { applicantId?: string; companyId?: string; status?: Quote["status"][] } = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Paged<Quote>> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let from = "quotes q";
  if (filter.companyId) {
    from = "quotes q JOIN users u ON u.id = q.applicant_id";
    params.push(filter.companyId);
    conditions.push(`u.company_id = $${params.length}`);
  } else if (filter.applicantId) {
    params.push(filter.applicantId);
    conditions.push(`q.applicant_id = $${params.length}`);
  }
  if (filter.status && filter.status.length > 0) {
    params.push(filter.status);
    conditions.push(`q.status = ANY($${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRow = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM ${from} ${where}`, params);
  const total = countRow?.n ?? 0;

  const rows = await q<QuoteRow>(
    `SELECT q.* FROM ${from} ${where} ORDER BY q.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return toPaged(rows.map(toQuote), total, page, pageSize);
}

// 같은 주차에 이미 심사 승인된 "다른 회사"의 신청서가 있는지 확인한다.
// 한 주차는 하나의 대관사만 사용할 수 있으므로, 이미 승인된 건이 있으면 같은 주차의
// 다른 회사 신청서는 승인할 수 없다 (같은 회사 소속 신청서끼리는 충돌로 보지 않는다).
export async function findApprovedWeekConflict(
  quote: Quote,
): Promise<{ quote: Quote; companyName: string | null } | undefined> {
  const week = quote.selection?.week;
  if (!week) return undefined;

  // 같은 주차 신청서만 DB에서 골라 온다. 예전에는 전체 신청서를 읽어 앱에서 비교했는데,
  // 심사 1회마다 전체 건수를 훑는 구조라 신청이 쌓일수록 급격히 느려졌다.
  const rows = await q<QuoteRow & { applicant_company_id: string | null; applicant_company_name: string | null }>(
    `SELECT q.*, u.company_id AS applicant_company_id, u.company_name AS applicant_company_name
       FROM quotes q JOIN users u ON u.id = q.applicant_id
      WHERE q.week_year = $1 AND q.week_month = $2 AND q.week_of_month = $3 AND q.id <> $4
      ORDER BY q.created_at ASC`,
    [week.year, week.month, week.weekOfMonth, quote.id],
  );
  if (rows.length === 0) return undefined;

  const applicant = await findUserById(quote.applicantId);
  const companyId = applicant?.companyId ?? null;

  for (const row of rows) {
    const other = toQuote(row);
    // 승인 여부는 review_json 안에 있어 SQL 로 거르지 않는다 — 같은 주차 건만 남은 뒤라 양이 적다.
    if (other.review?.decision !== "APPROVED") continue;

    const otherCompanyId = row.applicant_company_id;
    const sameCompany =
      companyId && otherCompanyId ? companyId === otherCompanyId : quote.applicantId === other.applicantId;
    if (sameCompany) continue;

    return { quote: other, companyName: row.applicant_company_name };
  }
  return undefined;
}

// 캘린더 경합 현황 — 주차별로 신청서를 낸 회사(신청자) 수를 집계한다.
export async function listWeekDemand(): Promise<WeekDemand[]> {
  // 집계를 DB에서 끝낸다 — 예전에는 전체 신청서를 읽어 앱에서 JSON 을 파싱해 세었다.
  const rows = await q<{ year: number; month: number; week_of_month: number; company_count: number }>(
    `SELECT q.week_year AS year, q.week_month AS month, q.week_of_month AS week_of_month,
            COUNT(DISTINCT COALESCE(NULLIF(u.company_name, ''), u.id))::int AS company_count
       FROM quotes q JOIN users u ON u.id = q.applicant_id
      WHERE q.week_year IS NOT NULL
      GROUP BY q.week_year, q.week_month, q.week_of_month`,
  );
  return rows.map((row) => ({
    year: row.year,
    month: row.month,
    weekOfMonth: row.week_of_month,
    companyCount: row.company_count,
  }));
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

export async function listDateBlocks(): Promise<DateBlock[]> {
  const rows = await q<DateBlockRow>("SELECT * FROM date_blocks ORDER BY date ASC");
  return rows.map(toDateBlock);
}

// 신청서가 실제로 차지하는 날짜 목록(제외 요일 반영, 추가 일수 포함) 중 막힌 날짜가 있는지 확인한다.
export async function findBlockedDatesAmong(dates: string[]): Promise<DateBlock[]> {
  if (dates.length === 0) return [];
  const placeholders = dates.map((_, i) => `$${i + 1}`).join(",");
  const rows = await q<DateBlockRow>(
    `SELECT * FROM date_blocks WHERE date IN (${placeholders})`,
    dates,
  );
  return rows.map(toDateBlock);
}

export async function blockDate(date: string, reason: string | null): Promise<DateBlock> {
  await q(
    `INSERT INTO date_blocks (date, reason, created_at) VALUES ($1, $2, $3)
     ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`,
    [date, reason, new Date().toISOString()],
  );
  return { date, reason };
}

export async function unblockDate(date: string) {
  await q("DELETE FROM date_blocks WHERE date = $1", [date]);
}

// ESTIMATE 단계 신청서를 신청자가 직접 수정할 때 사용 — 심사 전 재계산된 산출내역으로 덮어쓴다.
export async function updateQuoteSelection(
  id: string,
  input: {
    rateTableVersion: string;
    selection: Quote["selection"];
    lineItems: Quote["lineItems"];
    subtotal: number;
    vat: number;
    total: number;
  },
): Promise<Quote> {
  await q(
    `UPDATE quotes
     SET rate_table_version = $1, selection_json = $2, line_items_json = $3, subtotal = $4, vat = $5, total = $6,
         week_year = $8, week_month = $9, week_of_month = $10
     WHERE id = $7`,
    [
      input.rateTableVersion,
      JSON.stringify(input.selection),
      JSON.stringify(input.lineItems),
      input.subtotal,
      input.vat,
      input.total,
      id,
      input.selection?.week?.year ?? null,
      input.selection?.week?.month ?? null,
      input.selection?.week?.weekOfMonth ?? null,
    ],
  );
  return (await getQuoteById(id))!;
}

export async function setQuoteReview(id: string, review: Review): Promise<Quote> {
  await q("UPDATE quotes SET review_json = $1 WHERE id = $2", [JSON.stringify(review), id]);
  return (await getQuoteById(id))!;
}

export async function setQuoteContract(id: string, contract: ContractAdjustment): Promise<Quote> {
  await q("UPDATE quotes SET status = 'CONTRACTED', contract_json = $1 WHERE id = $2", [
    JSON.stringify(contract),
    id,
  ]);
  return (await getQuoteById(id))!;
}

export async function setQuoteSettlement(id: string, settlement: Settlement): Promise<Quote> {
  await q("UPDATE quotes SET status = 'SETTLED', settlement_json = $1 WHERE id = $2", [
    JSON.stringify(settlement),
    id,
  ]);
  return (await getQuoteById(id))!;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function addAuditLog(entry: {
  id: string;
  quoteId: string;
  stage: AuditLogAction;
  snapshot: unknown;
  actorId: string;
  createdAt: string;
}) {
  await q(
    `INSERT INTO audit_logs (id, quote_id, stage, snapshot_json, actor_id, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [entry.id, entry.quoteId, entry.stage, JSON.stringify(entry.snapshot), entry.actorId, entry.createdAt],
  );
}

export async function listAuditLogsForQuote(quoteId: string): Promise<AuditLogEntry[]> {
  const rows = await q<{
    id: string;
    quote_id: string;
    stage: AuditLogAction;
    snapshot_json: string;
    actor_id: string;
    created_at: string;
  }>("SELECT * FROM audit_logs WHERE quote_id = $1 ORDER BY created_at ASC", [quoteId]);
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

export async function createDeposit(input: {
  id: string;
  quoteId: string;
  requiredAmount: number;
  depositRate: number;
  createdAt: string;
}): Promise<Deposit> {
  await q(
    `INSERT INTO deposits (id, quote_id, required_amount, deposit_rate, status, created_at)
     VALUES ($1, $2, $3, $4, 'PENDING', $5)`,
    [input.id, input.quoteId, input.requiredAmount, input.depositRate, input.createdAt],
  );
  return (await getDepositByQuoteId(input.quoteId))!;
}

export async function getDepositByQuoteId(quoteId: string): Promise<Deposit | undefined> {
  const row = await one<DepositRow>("SELECT * FROM deposits WHERE quote_id = $1", [quoteId]);
  return row ? toDeposit(row) : undefined;
}

export async function reportDeposit(
  quoteId: string,
  depositorName: string,
  reportedAt: string,
): Promise<Deposit> {
  await q(
    "UPDATE deposits SET status = 'REPORTED', depositor_name = $1, reported_at = $2 WHERE quote_id = $3",
    [depositorName, reportedAt, quoteId],
  );
  return (await getDepositByQuoteId(quoteId))!;
}

export async function confirmDeposit(
  quoteId: string,
  confirmedBy: string,
  confirmedAt: string,
): Promise<Deposit> {
  await q(
    "UPDATE deposits SET status = 'CONFIRMED', confirmed_by = $1, confirmed_at = $2 WHERE quote_id = $3",
    [confirmedBy, confirmedAt, quoteId],
  );
  return (await getDepositByQuoteId(quoteId))!;
}

// 정산 내역에 대한 신청자 상호 확인 — settlement_json에 필드만 덧붙인다 (기존 정산 확정 흐름은 그대로 둠).
export async function confirmSettlementMutual(
  quoteId: string,
  confirmedBy: string,
  confirmedAt: string,
): Promise<Quote> {
  const quote = await getQuoteById(quoteId);
  if (!quote?.settlement) throw new Error("정산 내역이 없습니다.");
  const settlement: Settlement = {
    ...quote.settlement,
    mutualConfirmedAt: confirmedAt,
    mutualConfirmedBy: confirmedBy,
  };
  await q("UPDATE quotes SET settlement_json = $1 WHERE id = $2", [JSON.stringify(settlement), quoteId]);
  return (await getQuoteById(quoteId))!;
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

export async function getContractSignatureByQuoteId(
  quoteId: string,
): Promise<ContractSignature | undefined> {
  const row = await one<ContractSignatureRow>(
    "SELECT * FROM contract_signatures WHERE quote_id = $1",
    [quoteId],
  );
  return row ? toContractSignature(row) : undefined;
}

// 계약 확정 시점에 빈 레코드를 만들어두고, 이후 양측이 각자 날인한다.
export async function ensureContractSignature(
  quoteId: string,
  createdAt: string,
): Promise<ContractSignature> {
  const existing = await getContractSignatureByQuoteId(quoteId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  await q("INSERT INTO contract_signatures (id, quote_id, created_at) VALUES ($1, $2, $3)", [
    id,
    quoteId,
    createdAt,
  ]);
  return (await getContractSignatureByQuoteId(quoteId))!;
}

export async function signContractAsVenue(
  quoteId: string,
  signedBy: string,
  signedAt: string,
): Promise<ContractSignature> {
  await q(
    "UPDATE contract_signatures SET venue_signed_at = $1, venue_signed_by = $2 WHERE quote_id = $3",
    [signedAt, signedBy, quoteId],
  );
  return (await getContractSignatureByQuoteId(quoteId))!;
}

export async function signContractAsApplicant(
  quoteId: string,
  signedBy: string,
  signedAt: string,
): Promise<ContractSignature> {
  await q(
    "UPDATE contract_signatures SET applicant_signed_at = $1, applicant_signed_by = $2 WHERE quote_id = $3",
    [signedAt, signedBy, quoteId],
  );
  return (await getContractSignatureByQuoteId(quoteId))!;
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

export async function getTaxInvoice(
  quoteId: string,
  purpose: InvoicePurpose,
): Promise<TaxInvoice | undefined> {
  const row = await one<TaxInvoiceRow>(
    "SELECT * FROM tax_invoices WHERE quote_id = $1 AND purpose = $2",
    [quoteId, purpose],
  );
  return row ? toTaxInvoice(row) : undefined;
}

// 계약/정산 확정 시점에 PENDING 상태로 미리 만들어두고, 운영자가 금액을 채워 발행한다.
export async function ensureTaxInvoice(
  quoteId: string,
  purpose: InvoicePurpose,
  amount: number,
  createdAt: string,
): Promise<TaxInvoice> {
  const existing = await getTaxInvoice(quoteId, purpose);
  if (existing) return existing;
  const id = crypto.randomUUID();
  await q(
    `INSERT INTO tax_invoices (id, quote_id, purpose, amount, status, created_at)
     VALUES ($1, $2, $3, $4, 'PENDING', $5)`,
    [id, quoteId, purpose, amount, createdAt],
  );
  return (await getTaxInvoice(quoteId, purpose))!;
}

export async function issueTaxInvoice(
  quoteId: string,
  purpose: InvoicePurpose,
  issuedBy: string,
  issuedAt: string,
): Promise<TaxInvoice> {
  await q(
    "UPDATE tax_invoices SET status = 'ISSUED', issued_at = $1, issued_by = $2, last_reminder_at = $3 WHERE quote_id = $4 AND purpose = $5",
    [issuedAt, issuedBy, issuedAt, quoteId, purpose],
  );
  return (await getTaxInvoice(quoteId, purpose))!;
}

export async function reportTaxInvoicePayment(
  quoteId: string,
  purpose: InvoicePurpose,
  payerName: string,
  reportedAt: string,
): Promise<TaxInvoice> {
  await q(
    "UPDATE tax_invoices SET status = 'REPORTED', payer_name = $1, reported_at = $2 WHERE quote_id = $3 AND purpose = $4",
    [payerName, reportedAt, quoteId, purpose],
  );
  return (await getTaxInvoice(quoteId, purpose))!;
}

export async function confirmTaxInvoicePayment(
  quoteId: string,
  purpose: InvoicePurpose,
  confirmedBy: string,
  paidAt: string,
): Promise<TaxInvoice> {
  await q(
    "UPDATE tax_invoices SET status = 'PAID', paid_at = $1, paid_confirmed_by = $2 WHERE quote_id = $3 AND purpose = $4",
    [paidAt, confirmedBy, quoteId, purpose],
  );
  return (await getTaxInvoice(quoteId, purpose))!;
}

// 알림 스케줄러가 전체를 한 번에 훑을 때 사용한다(신청서마다 따로 조회하면 N+1).
export async function listAllTaxInvoices(): Promise<TaxInvoice[]> {
  const rows = await q<TaxInvoiceRow>("SELECT * FROM tax_invoices");
  return rows.map(toTaxInvoice);
}

// 미입금 5일 경과 시 알림 재발송 대상 — lastReminderAt 기준으로 lazy하게(페이지 조회 시점에) 판단한다.
export function isInvoiceReminderDue(invoice: TaxInvoice, now: Date, intervalDays = 5): boolean {
  if (invoice.status !== "ISSUED" && invoice.status !== "REPORTED") return false;
  const base = invoice.lastReminderAt ?? invoice.issuedAt;
  if (!base) return false;
  const elapsedMs = now.getTime() - new Date(base).getTime();
  return elapsedMs >= intervalDays * 24 * 60 * 60 * 1000;
}

export async function touchInvoiceReminder(quoteId: string, purpose: InvoicePurpose, at: string) {
  await q("UPDATE tax_invoices SET last_reminder_at = $1 WHERE quote_id = $2 AND purpose = $3", [
    at,
    quoteId,
    purpose,
  ]);
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

export async function getTicketOpenByQuoteId(quoteId: string): Promise<TicketOpen | undefined> {
  const row = await one<TicketOpenRow>("SELECT * FROM ticket_opens WHERE quote_id = $1", [quoteId]);
  return row ? toTicketOpen(row) : undefined;
}

// 목록 화면(마이페이지 티켓오픈 정보)에서 신청서마다 조회하지 않도록 quoteId 목록을
// 한 번에 IN 조건으로 읽는다.
export async function listTicketOpensByQuoteIds(quoteIds: string[]): Promise<TicketOpen[]> {
  if (quoteIds.length === 0) return [];
  const rows = await q<TicketOpenRow>("SELECT * FROM ticket_opens WHERE quote_id = ANY($1)", [quoteIds]);
  return rows.map(toTicketOpen);
}

export async function ensureTicketOpen(quoteId: string, createdAt: string): Promise<TicketOpen> {
  const existing = await getTicketOpenByQuoteId(quoteId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  await q("INSERT INTO ticket_opens (id, quote_id, created_at) VALUES ($1, $2, $3)", [
    id,
    quoteId,
    createdAt,
  ]);
  return (await getTicketOpenByQuoteId(quoteId))!;
}

export async function setTicketOpenDate(quoteId: string, openDate: string): Promise<TicketOpen> {
  await q("UPDATE ticket_opens SET open_date = $1 WHERE quote_id = $2", [openDate, quoteId]);
  return (await getTicketOpenByQuoteId(quoteId))!;
}

export async function markTicketOpenMaterialsUploaded(quoteId: string, at: string) {
  await q("UPDATE ticket_opens SET materials_uploaded_at = $1 WHERE quote_id = $2", [at, quoteId]);
}

export async function listAllTicketOpens(): Promise<TicketOpen[]> {
  const rows = await q<TicketOpenRow>("SELECT * FROM ticket_opens");
  return rows.map(toTicketOpen);
}

// D-30 미업로드 알림 대상 — 오픈일까지 30일 이하 남았고, 자료 미업로드 상태
export function isTicketOpenReminderDue(ticketOpen: TicketOpen, now: Date): boolean {
  if (!ticketOpen.openDate || ticketOpen.materialsUploadedAt) return false;
  const daysUntilOpen = (new Date(ticketOpen.openDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilOpen > 30) return false;
  if (!ticketOpen.lastReminderAt) return true;
  return now.getTime() - new Date(ticketOpen.lastReminderAt).getTime() >= 24 * 60 * 60 * 1000;
}

export async function touchTicketOpenReminder(quoteId: string, at: string) {
  await q("UPDATE ticket_opens SET last_reminder_at = $1 WHERE quote_id = $2", [at, quoteId]);
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

export async function getFacilityMeetingByQuoteId(
  quoteId: string,
): Promise<FacilityMeeting | undefined> {
  const row = await one<FacilityMeetingRow>("SELECT * FROM facility_meetings WHERE quote_id = $1", [
    quoteId,
  ]);
  return row ? toFacilityMeeting(row) : undefined;
}

// 목록 화면(마이페이지 시설 회의)에서 신청서마다 조회하지 않도록 quoteId 목록을 한 번에
// IN 조건으로 읽는다.
export async function listFacilityMeetingsByQuoteIds(quoteIds: string[]): Promise<FacilityMeeting[]> {
  if (quoteIds.length === 0) return [];
  const rows = await q<FacilityMeetingRow>("SELECT * FROM facility_meetings WHERE quote_id = ANY($1)", [
    quoteIds,
  ]);
  return rows.map(toFacilityMeeting);
}

export async function ensureFacilityMeeting(
  quoteId: string,
  createdAt: string,
): Promise<FacilityMeeting> {
  const existing = await getFacilityMeetingByQuoteId(quoteId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  await q("INSERT INTO facility_meetings (id, quote_id, created_at) VALUES ($1, $2, $3)", [
    id,
    quoteId,
    createdAt,
  ]);
  return (await getFacilityMeetingByQuoteId(quoteId))!;
}

export async function setFacilityMeetingDate(
  quoteId: string,
  meetingDate: string,
): Promise<FacilityMeeting> {
  await q("UPDATE facility_meetings SET meeting_date = $1 WHERE quote_id = $2", [meetingDate, quoteId]);
  return (await getFacilityMeetingByQuoteId(quoteId))!;
}

export async function markFacilityMeetingMaterialsUploaded(quoteId: string, at: string) {
  await q("UPDATE facility_meetings SET materials_uploaded_at = $1 WHERE quote_id = $2", [at, quoteId]);
}

export async function listAllFacilityMeetings(): Promise<FacilityMeeting[]> {
  const rows = await q<FacilityMeetingRow>("SELECT * FROM facility_meetings");
  return rows.map(toFacilityMeeting);
}

// D-7 미업로드 알림 대상 — 회의일까지 7일 이하 남았고, 자료 미업로드 상태
export function isFacilityMeetingReminderDue(meeting: FacilityMeeting, now: Date): boolean {
  if (!meeting.meetingDate || meeting.materialsUploadedAt) return false;
  const daysUntilMeeting = (new Date(meeting.meetingDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilMeeting > 7) return false;
  if (!meeting.lastReminderAt) return true;
  return now.getTime() - new Date(meeting.lastReminderAt).getTime() >= 24 * 60 * 60 * 1000;
}

export async function touchFacilityMeetingReminder(quoteId: string, at: string) {
  await q("UPDATE facility_meetings SET last_reminder_at = $1 WHERE quote_id = $2", [at, quoteId]);
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

export async function createAttachment(input: {
  id: string;
  quoteId: string;
  storedName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  category?: AttachmentCategory;
  createdAt: string;
}): Promise<Attachment> {
  await q(
    `INSERT INTO attachments (id, quote_id, stored_name, original_name, mime_type, size, uploaded_by, category, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.id,
      input.quoteId,
      input.storedName,
      input.originalName,
      input.mimeType,
      input.size,
      input.uploadedBy,
      input.category ?? null,
      input.createdAt,
    ],
  );
  const row = await one<AttachmentRow>("SELECT * FROM attachments WHERE id = $1", [input.id]);
  return toAttachment(row!);
}

export async function listAttachments(
  quoteId: string,
  category?: AttachmentCategory,
): Promise<Attachment[]> {
  let rows: AttachmentRow[];
  if (category === undefined) {
    rows = await q<AttachmentRow>(
      "SELECT * FROM attachments WHERE quote_id = $1 ORDER BY created_at ASC",
      [quoteId],
    );
  } else if (category === null) {
    rows = await q<AttachmentRow>(
      "SELECT * FROM attachments WHERE quote_id = $1 AND category IS NULL ORDER BY created_at ASC",
      [quoteId],
    );
  } else {
    rows = await q<AttachmentRow>(
      "SELECT * FROM attachments WHERE quote_id = $1 AND category = $2 ORDER BY created_at ASC",
      [quoteId, category],
    );
  }
  return rows.map(toAttachment);
}

export async function getAttachmentById(id: string): Promise<Attachment | undefined> {
  const row = await one<AttachmentRow>("SELECT * FROM attachments WHERE id = $1", [id]);
  return row ? toAttachment(row) : undefined;
}

export async function deleteAttachment(id: string) {
  await q("DELETE FROM attachments WHERE id = $1", [id]);
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

export async function createNotification(input: {
  id: string;
  recipientId: string;
  quoteId: string;
  message: string;
  createdAt: string;
}) {
  await q(
    `INSERT INTO notifications (id, recipient_id, quote_id, message, is_read, created_at)
     VALUES ($1, $2, $3, $4, 0, $5)`,
    [input.id, input.recipientId, input.quoteId, input.message, input.createdAt],
  );
}

export async function notifyAdmins(input: { quoteId: string; message: string; createdAt: string }) {
  for (const admin of await listUsers({ role: "ADMIN" })) {
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: admin.id,
      quoteId: input.quoteId,
      message: input.message,
      createdAt: input.createdAt,
    });
  }
}

export async function listNotifications(recipientId: string, limit = 30): Promise<AppNotification[]> {
  const rows = await q<NotificationRow>(
    "SELECT * FROM notifications WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2",
    [recipientId, limit],
  );
  return rows.map(toNotification);
}

export async function countUnreadNotifications(recipientId: string): Promise<number> {
  const row = await one<{ n: number }>(
    "SELECT COUNT(*)::int as n FROM notifications WHERE recipient_id = $1 AND is_read = 0",
    [recipientId],
  );
  return row?.n ?? 0;
}

export async function markNotificationRead(id: string, recipientId: string) {
  await q("UPDATE notifications SET is_read = 1 WHERE id = $1 AND recipient_id = $2", [id, recipientId]);
}

export async function markAllNotificationsRead(recipientId: string) {
  await q("UPDATE notifications SET is_read = 1 WHERE recipient_id = $1", [recipientId]);
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

export async function createInquiry(input: {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
}): Promise<Inquiry> {
  await q(
    `INSERT INTO inquiries (id, user_id, title, content, status, created_at)
     VALUES ($1, $2, $3, $4, 'OPEN', $5)`,
    [input.id, input.userId, input.title, input.content, input.createdAt],
  );
  return (await getInquiryById(input.id))!;
}

export async function getInquiryById(id: string): Promise<Inquiry | undefined> {
  const row = await one<InquiryRow>("SELECT * FROM inquiries WHERE id = $1", [id]);
  return row ? toInquiry(row) : undefined;
}

export async function listInquiries(filter?: { userId?: string }): Promise<Inquiry[]> {
  const rows = filter?.userId
    ? await q<InquiryRow>("SELECT * FROM inquiries WHERE user_id = $1 ORDER BY created_at DESC", [
        filter.userId,
      ])
    : await q<InquiryRow>("SELECT * FROM inquiries ORDER BY created_at DESC");
  return rows.map(toInquiry);
}

export async function listInquiriesPaged(
  filter: { userId?: string } = {},
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Paged<Inquiry>> {
  const params: unknown[] = [];
  let where = "";
  if (filter.userId) {
    params.push(filter.userId);
    where = `WHERE user_id = $${params.length}`;
  }
  const countRow = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM inquiries ${where}`, params);
  const rows = await q<InquiryRow>(
    `SELECT * FROM inquiries ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, (page - 1) * pageSize],
  );
  return toPaged(rows.map(toInquiry), countRow?.n ?? 0, page, pageSize);
}

export async function answerInquiry(
  id: string,
  answer: string,
  answeredBy: string,
  answeredAt: string,
): Promise<Inquiry> {
  await q(
    "UPDATE inquiries SET status = 'ANSWERED', answer = $1, answered_by = $2, answered_at = $3 WHERE id = $4",
    [answer, answeredBy, answeredAt, id],
  );
  return (await getInquiryById(id))!;
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

export async function listNotices(): Promise<Notice[]> {
  const rows = await q<NoticeRow>("SELECT * FROM notices ORDER BY created_at DESC");
  return rows.map(toNotice);
}

export async function listNoticesPaged(page = 1, pageSize = DEFAULT_PAGE_SIZE): Promise<Paged<Notice>> {
  const countRow = await one<{ n: number }>("SELECT COUNT(*)::int AS n FROM notices");
  const rows = await q<NoticeRow>(
    "SELECT * FROM notices ORDER BY created_at DESC LIMIT $1 OFFSET $2",
    [pageSize, (page - 1) * pageSize],
  );
  return toPaged(rows.map(toNotice), countRow?.n ?? 0, page, pageSize);
}

export async function getNoticeById(id: string): Promise<Notice | undefined> {
  const row = await one<NoticeRow>("SELECT * FROM notices WHERE id = $1", [id]);
  return row ? toNotice(row) : undefined;
}

export async function createNotice(input: {
  id: string;
  tag?: string | null;
  title: string;
  body: string;
  imageUrl?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}): Promise<Notice> {
  await q(
    "INSERT INTO notices (id, tag, title, body, image_url, attachment_url, attachment_name, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
    [
      input.id,
      input.tag ?? null,
      input.title,
      input.body,
      input.imageUrl ?? null,
      input.attachmentUrl ?? null,
      input.attachmentName ?? null,
      input.createdAt,
      input.createdAt,
    ],
  );
  return (await getNoticeById(input.id))!;
}

export async function updateNotice(
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
): Promise<Notice | undefined> {
  await q(
    "UPDATE notices SET tag = $1, title = $2, body = $3, image_url = $4, attachment_url = $5, attachment_name = $6, updated_at = $7 WHERE id = $8",
    [
      input.tag ?? null,
      input.title,
      input.body,
      input.imageUrl ?? null,
      input.attachmentUrl ?? null,
      input.attachmentName ?? null,
      input.updatedAt,
      id,
    ],
  );
  return getNoticeById(id);
}

export async function deleteNotice(id: string) {
  await q("DELETE FROM notices WHERE id = $1", [id]);
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

export async function listFaqs(): Promise<Faq[]> {
  const rows = await q<FaqRow>("SELECT * FROM faqs ORDER BY created_at ASC");
  return rows.map(toFaq);
}

export async function getFaqById(id: string): Promise<Faq | undefined> {
  const row = await one<FaqRow>("SELECT * FROM faqs WHERE id = $1", [id]);
  return row ? toFaq(row) : undefined;
}

export async function createFaq(input: {
  id: string;
  tag?: string | null;
  question: string;
  answer: string;
  createdAt: string;
}): Promise<Faq> {
  await q(
    "INSERT INTO faqs (id, tag, question, answer, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)",
    [input.id, input.tag ?? null, input.question, input.answer, input.createdAt, input.createdAt],
  );
  return (await getFaqById(input.id))!;
}

export async function updateFaq(
  id: string,
  input: { tag?: string | null; question: string; answer: string; updatedAt: string },
): Promise<Faq | undefined> {
  await q("UPDATE faqs SET tag = $1, question = $2, answer = $3, updated_at = $4 WHERE id = $5", [
    input.tag ?? null,
    input.question,
    input.answer,
    input.updatedAt,
    id,
  ]);
  return getFaqById(id);
}

export async function deleteFaq(id: string) {
  await q("DELETE FROM faqs WHERE id = $1", [id]);
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

export async function listPages(group?: PageGroup): Promise<StaticPage[]> {
  const rows = group
    ? await q<PageRow>("SELECT * FROM pages WHERE page_group = $1 ORDER BY sort_order ASC", [group])
    : await q<PageRow>("SELECT * FROM pages ORDER BY page_group ASC, sort_order ASC");
  return rows.map(toStaticPage);
}

export async function getPageById(id: string): Promise<StaticPage | undefined> {
  const row = await one<PageRow>("SELECT * FROM pages WHERE id = $1", [id]);
  return row ? toStaticPage(row) : undefined;
}

export async function createPage(input: {
  id: string;
  group: PageGroup;
  slug: string;
  navLabel: string;
  title: string;
  body: string;
  sortOrder: number;
  createdAt: string;
}): Promise<StaticPage> {
  await q(
    `INSERT INTO pages (id, page_group, slug, nav_label, title, body, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.id,
      input.group,
      input.slug,
      input.navLabel,
      input.title,
      input.body,
      input.sortOrder,
      input.createdAt,
      input.createdAt,
    ],
  );
  return (await getPageById(input.id))!;
}

export async function updatePage(
  id: string,
  input: {
    slug: string;
    navLabel: string;
    title: string;
    body: string;
    sortOrder: number;
    updatedAt: string;
  },
): Promise<StaticPage | undefined> {
  await q(
    "UPDATE pages SET slug = $1, nav_label = $2, title = $3, body = $4, sort_order = $5, updated_at = $6 WHERE id = $7",
    [input.slug, input.navLabel, input.title, input.body, input.sortOrder, input.updatedAt, id],
  );
  return getPageById(id);
}

export async function deletePage(id: string) {
  await q("DELETE FROM pages WHERE id = $1", [id]);
}

async function getSiteContent<T>(page: string, fallback: T): Promise<T> {
  const row = await one<{ data: string }>("SELECT data FROM site_content WHERE page = $1", [page]);
  return row ? (JSON.parse(row.data) as T) : fallback;
}

async function saveSiteContent<T>(page: string, data: T): Promise<T> {
  await q(
    `INSERT INTO site_content (page, data, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(page) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [page, JSON.stringify(data), new Date().toISOString()],
  );
  return data;
}

export async function getVenueContent(): Promise<VenueContent> {
  const stored = await getSiteContent<Partial<VenueContent> | null>("venue", null);
  if (!stored) return DEFAULT_VENUE_CONTENT;
  return { ...DEFAULT_VENUE_CONTENT, ...stored };
}

export async function saveVenueContent(data: VenueContent): Promise<VenueContent> {
  return saveSiteContent("venue", data);
}

export async function getGuideContent(): Promise<GuideContent> {
  return getSiteContent<GuideContent>("guide", DEFAULT_GUIDE_CONTENT);
}

export async function saveGuideContent(data: GuideContent): Promise<GuideContent> {
  return saveSiteContent("guide", data);
}

export async function getHomeContent(): Promise<HomeContent> {
  const stored = await getSiteContent<Partial<HomeContent> | null>("home", null);
  if (!stored) return DEFAULT_HOME_CONTENT;
  return { ...DEFAULT_HOME_CONTENT, ...stored };
}

export async function saveHomeContent(data: HomeContent): Promise<HomeContent> {
  return saveSiteContent("home", data);
}

export async function getTermsContent(): Promise<LegalContent> {
  return getSiteContent<LegalContent>("terms", DEFAULT_TERMS_CONTENT);
}

export async function saveTermsContent(data: LegalContent): Promise<LegalContent> {
  return saveSiteContent("terms", data);
}

export async function getPrivacyContent(): Promise<LegalContent> {
  return getSiteContent<LegalContent>("privacy", DEFAULT_PRIVACY_CONTENT);
}

export async function savePrivacyContent(data: LegalContent): Promise<LegalContent> {
  return saveSiteContent("privacy", data);
}

// ---------------------------------------------------------------------------
// 기능정의서(내부 기획 문서) — 마스터 관리자 전용
// ---------------------------------------------------------------------------

export async function getFeatureSpecSheet(key: FeatureSpecSheetKey): Promise<FeatureSpecRow[]> {
  const row = await one<{ data: string }>(
    "SELECT data FROM feature_spec_sheets WHERE sheet_key = $1",
    [key],
  );
  return row ? (JSON.parse(row.data) as FeatureSpecRow[]) : (FEATURE_SPEC_SEED[key] ?? []);
}

export async function getAllFeatureSpecSheets(): Promise<Record<FeatureSpecSheetKey, FeatureSpecRow[]>> {
  const result = {} as Record<FeatureSpecSheetKey, FeatureSpecRow[]>;
  for (const key of FEATURE_SPEC_SHEET_KEYS) {
    result[key] = await getFeatureSpecSheet(key);
  }
  return result;
}

export async function saveFeatureSpecSheet(
  key: FeatureSpecSheetKey,
  rows: FeatureSpecRow[],
): Promise<FeatureSpecRow[]> {
  await q(
    `INSERT INTO feature_spec_sheets (sheet_key, data, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(sheet_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
    [key, JSON.stringify(rows), new Date().toISOString()],
  );
  return rows;
}
