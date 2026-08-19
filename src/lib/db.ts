import { Pool, type PoolClient } from "pg";
import { AsyncLocalStorage } from "node:async_hooks";
import { hash as bcryptHash } from "@node-rs/bcrypt";
import crypto from "node:crypto";
import { buildSeedRateTable } from "./pricing/seed";
import { SEED_PAGES } from "./pricing/pageSeed";
import { DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT, DEFAULT_VENUE_CONTENT } from "./content/seed";
import { FEATURE_SPEC_SEED } from "./featureSpecSeed";
import { FEATURE_SPEC_SHEET_KEYS } from "./pricing/types";
import { sha256Hex } from "./passwordScheme";
import {
  blindIndex,
  blindIndexOptional,
  decryptField,
  decryptOptional,
  encryptField,
  encryptOptional,
} from "./fieldCrypto";
import type { GuideContent, HomeContent, VenueContent } from "./content/types";
import type {
  ApprovalStatus,
  CompanyVerification,
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
  MemberType,
  CompanyRole,
  CompanyStatus,
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

    -- ─────────────────────────────────────────────────────────────────────
    -- 가입·인증 개편 (기획서 2026-08-18) — Phase 1 기반 테이블
    -- ─────────────────────────────────────────────────────────────────────

    -- 약관 동의 이력. "언제 동의했나"만으로는 분쟁에 대응할 수 없어서,
    -- 동의 시점의 약관 버전과 본문 해시를 함께 박아 둔다(사후에 약관을 고쳐도
    -- 그때 무엇에 동의했는지 되짚을 수 있다).
    CREATE TABLE IF NOT EXISTS terms_agreements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      terms_kind TEXT NOT NULL,          -- SERVICE / PRIVACY_REQUIRED / PRIVACY_OPTIONAL / MARKETING
      terms_version TEXT NOT NULL,       -- 약관 버전 코드
      body_hash TEXT NOT NULL,           -- 동의 시점 본문의 SHA-256
      agreed INTEGER NOT NULL,           -- 선택 약관은 0(미동의)도 남긴다
      agreed_at TEXT NOT NULL,           -- 초 단위 ISO8601
      request_ip TEXT
    );

    -- 본인인증(NICE 통합인증) 시도 이력. 성공 건만이 아니라 실패도 남겨야
    -- "누가 언제 인증했는가"를 되짚을 수 있다. CI/DI 는 암호문으로만 들어간다.
    CREATE TABLE IF NOT EXISTS identity_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),   -- 가입 전 인증이라 시점상 NULL 일 수 있다
      request_no TEXT NOT NULL,
      transaction_id TEXT,
      succeeded INTEGER NOT NULL DEFAULT 0,
      result_code TEXT,
      result_message TEXT,
      ci_encrypted TEXT,
      di_encrypted TEXT,
      di_index TEXT,                       -- 중복 가입 판별용 블라인드 인덱스
      name TEXT,
      birthdate TEXT,
      gender TEXT,
      national_info TEXT,
      mobile_co TEXT,
      mobile_no TEXT,
      created_at TEXT NOT NULL
    );

    -- 마스터가 소속 담당자를 부를 때 쓰는 초대. 계정을 미리 만들지 않고 링크만 보내고,
    -- 본인이 인증한 뒤 비밀번호를 직접 정한다(임시 비밀번호를 남이 아는 상태를 만들지 않는다).
    CREATE TABLE IF NOT EXISTS company_invitations (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      invited_by TEXT NOT NULL REFERENCES users(id),
      email TEXT NOT NULL,
      token_hash TEXT NOT NULL,          -- 원문 토큰은 저장하지 않는다
      status TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING / ACCEPTED / EXPIRED / CANCELLED
      expires_at TEXT NOT NULL,          -- 발급 +7일
      accepted_at TEXT,
      accepted_user_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    -- 카카오 알림톡 템플릿. 문안을 코드에 하드코딩하면 심사 통과분만 골라 켜는 게 불가능하다.
    CREATE TABLE IF NOT EXISTS message_templates (
      code TEXT PRIMARY KEY,             -- MB-01 / BK-08 / ST-04 / NT-01 …
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      variables_json TEXT NOT NULL DEFAULT '[]',
      channel TEXT NOT NULL DEFAULT 'ALIMTALK',  -- ALIMTALK / FRIENDTALK
      release_phase TEXT NOT NULL DEFAULT 'TBD', -- FIRST / SECOND / TBD
      review_status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT / SUBMITTED / APPROVED / REJECTED
      enabled INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    -- 발송 이력. idempotency_key 로 같은 이벤트가 두 번 나가는 것을 막는다
    -- (배치 재실행·재시도에서 중복 발송이 제일 흔한 사고다).
    CREATE TABLE IF NOT EXISTS message_sends (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT NOT NULL,
      template_code TEXT NOT NULL,
      recipient_id TEXT REFERENCES users(id),
      recipient_phone TEXT,
      channel TEXT NOT NULL,             -- INAPP / EMAIL / ALIMTALK / LMS
      status TEXT NOT NULL DEFAULT 'QUEUED', -- QUEUED / SENT / FAILED / FALLBACK
      attempt INTEGER NOT NULL DEFAULT 0,
      result_code TEXT,
      result_message TEXT,
      payload_json TEXT,
      scheduled_at TEXT,                 -- 반복 알람의 다음 발송 예정 시각
      sent_at TEXT,
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

    -- ── 가입·인증 개편 (기획서 2026-08-18) ────────────────────────────────
    -- 회원 유형. 지금은 기업회원만 열지만 컬럼을 먼저 두어, 개인회원을 열 때
    -- 기존 행 전체를 마이그레이션하지 않아도 되게 한다.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS member_type TEXT NOT NULL DEFAULT 'CORPORATE';
    -- 회사 안에서의 권한(MASTER/STAFF). 운영자 등급인 admin_tier 와 다른 축이다.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS company_role TEXT;
    -- 본인인증 결과. 고유식별정보라 암호문으로만 넣고, 검색은 di_index 로 한다.
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ci_encrypted TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS di_encrypted TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS di_index TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_verified_at TEXT;
    -- 세션 일괄 무효화 기준시각. 세션은 서명 토큰이라 서버에 목록이 없어서,
    -- 이 값보다 먼저 발급된 토큰을 전부 무효로 본다(비밀번호 변경·탈퇴·강제 로그아웃).
    ALTER TABLE users ADD COLUMN IF NOT EXISTS session_epoch TEXT;

    -- 초대로 만들어진 계정은 본인이 비밀번호를 정하기 전까지 해시가 없다.
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

    ALTER TABLE companies ADD COLUMN IF NOT EXISTS master_user_id TEXT REFERENCES users(id);
    -- 회사 자체의 승인 상태. 회원 개인의 approval_status 와 다른 축이다.
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING';
    -- 기획서 A5 기업정보 항목 — 대표번호·대표팩스·법인등록번호
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_phone TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS company_fax TEXT;
    ALTER TABLE companies ADD COLUMN IF NOT EXISTS corporate_number TEXT;

    -- 진행 중인 본인인증 건을 콜백에서 다시 집어들기 위한 값들.
    -- pod 가 여러 개라 프로세스 메모리에 두면 콜백이 다른 pod 로 가서 깨진다.
    -- ticket 은 복호화 키의 씨앗이라 암호문으로만 보관한다.
    ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'REGISTER';
    ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS access_token TEXT;
    ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS ticket_encrypted TEXT;
    ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS iterations INTEGER;
    ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS consumed_at TEXT;
    -- 콜백 상관관계 키. NICE 는 완료 시 web_transaction_id 만 돌려주므로,
    -- 우리가 만든 nonce 를 return_url 경로에 박아 두고 그것으로 진행 건을 찾는다.
    -- "가장 최근 미소비 건"으로 찾으면 동시 가입자끼리 남의 인증 결과를 집어간다.
    ALTER TABLE identity_verifications ADD COLUMN IF NOT EXISTS nonce TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_nonce ON identity_verifications(nonce) WHERE nonce IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_request_no ON identity_verifications(request_no);
    CREATE INDEX IF NOT EXISTS idx_identity_transaction ON identity_verifications(transaction_id);

    -- 가입·계정 알림(승인/반려/비밀번호 변경)은 신청서와 무관하다.
    -- quote_id 가 NOT NULL 이면 이런 알림은 저장 자체가 안 된다.
    ALTER TABLE notifications ALTER COLUMN quote_id DROP NOT NULL;
    -- 알림을 눌렀을 때 갈 곳. 예전에는 신청서 상세로만 갈 수 있어서 비즈메시지는
    -- 본문에 URL 을 그대로 적어 넣었다 — 링크로 저장해 화면에서 누르게 한다.
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link TEXT;

    -- 회사의 유일 키는 회사명이 아니라 사업자등록번호다.
    -- 동명 회사가 실제로 있어서 name UNIQUE 는 오히려 정상 가입을 막는다.
    ALTER TABLE companies DROP CONSTRAINT IF EXISTS companies_name_key;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_brn
      ON companies(business_registration_number)
      WHERE business_registration_number IS NOT NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_di ON users(di_index) WHERE di_index IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id) WHERE company_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_terms_agreements_user ON terms_agreements(user_id);
    CREATE INDEX IF NOT EXISTS idx_identity_verifications_di ON identity_verifications(di_index);
    CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON company_invitations(company_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_company_invitations_token ON company_invitations(token_hash);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_message_sends_idem ON message_sends(idempotency_key);
    CREATE INDEX IF NOT EXISTS idx_message_sends_recipient ON message_sends(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_message_sends_scheduled
      ON message_sends(scheduled_at) WHERE scheduled_at IS NOT NULL;
  `);

  // 사업자등록번호는 숫자만 남긴 형태로 통일한다 — 하이픈 유무로 같은 회사가
  // 둘로 갈리면 UNIQUE 인덱스가 제 역할을 못 한다.
  await pool.query(`
    UPDATE companies
       SET business_registration_number = regexp_replace(business_registration_number, '\\D', '', 'g')
     WHERE business_registration_number IS NOT NULL
       AND business_registration_number <> regexp_replace(business_registration_number, '\\D', '', 'g')
  `);

  // 회사별 최초 가입자를 마스터로 세운다. 마스터가 0명인 회사가 생기면
  // 소속 담당자를 승인할 사람이 없어져 가입 흐름이 멈춘다.
  await pool.query(`
    UPDATE users SET company_role = 'MASTER'
     WHERE company_role IS NULL
       AND role = 'APPLICANT'
       AND company_id IS NOT NULL
       AND id = (
         SELECT u2.id FROM users u2
          WHERE u2.company_id = users.company_id
            AND u2.role = 'APPLICANT'
            AND u2.withdrawn_at IS NULL
          ORDER BY u2.created_at ASC
          LIMIT 1
       )
  `);
  await pool.query(`
    UPDATE users SET company_role = 'STAFF'
     WHERE company_role IS NULL AND role = 'APPLICANT' AND company_id IS NOT NULL
  `);
  await pool.query(`
    UPDATE companies SET master_user_id = (
      SELECT u.id FROM users u
       WHERE u.company_id = companies.id AND u.company_role = 'MASTER'
       ORDER BY u.created_at ASC LIMIT 1
    )
    WHERE master_user_id IS NULL
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

  // 회사정보 불러오기(기획서 A6)를 바로 시험해 볼 수 있게 표본 회사를 하나 둔다.
  // 승인 완료 상태여야 검색에 잡힌다. 이미 있으면 건드리지 않는다.
  const sampleBrn = "1018116510";
  const sampleExists = (
    await pool.query("SELECT 1 FROM companies WHERE business_registration_number = $1", [sampleBrn])
  ).rowCount;
  if (!sampleExists) {
    await pool.query(
      `INSERT INTO companies
         (id, name, business_registration_number, representative_name, postal_code, address,
          company_phone, company_fax, corporate_number, status, created_at,
          verification_status, verified_company_name, verified_representative_name,
          verified_comp_status, verified_comp_status_label, verified_comp_type_label, verified_at)
       VALUES ($1, '주식회사 서울아레나', $2, '박○○', '01411',
               '서울특별시 도봉구 창동 1-24 대운빌딩 2층',
               '02-1234-4567', '02-544-0966', '1101111234567', 'APPROVED', $3,
               'VERIFIED', '주식회사 서울아레나', '박○○', '1', '계속사업자', '일반', $3)`,
      [crypto.randomUUID(), sampleBrn, new Date().toISOString()],
    );
    console.log("[seoularena] 표본 회사(주식회사 서울아레나)를 등록했습니다 — 회사정보 불러오기 시험용");
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
    `INSERT INTO rate_tables (version, vat_rate, extra_week_ratio, day_exclusion_discount_ratio, packages_json, addons_json, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      rateTable.version,
      rateTable.vatRate,
      rateTable.extraWeekRatio,
      rateTable.dayExclusionDiscountRatio,
      JSON.stringify(rateTable.packages),
      JSON.stringify(rateTable.addons),
      rateTable.updatedAt,
    ],
  );
}

// ---------------------------------------------------------------------------
// Rate table
// ---------------------------------------------------------------------------

export async function getCurrentRateTable(): Promise<RateTable> {
  const row = await one<{
    version: string;
    vat_rate: number;
    extra_week_ratio: number;
    day_exclusion_discount_ratio: number;
    packages_json: string;
    addons_json: string;
    updated_at: string;
  }>("SELECT * FROM rate_tables ORDER BY updated_at DESC LIMIT 1");
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
  status: string | null;
  master_user_id: string | null;
  company_phone: string | null;
  company_fax: string | null;
  corporate_number: string | null;
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
    status: (row.status as CompanyStatus | null) ?? "PENDING",
    companyPhone: row.company_phone ?? null,
    companyFax: row.company_fax ?? null,
    corporateNumber: row.corporate_number ?? null,
    masterUserId: row.master_user_id ?? null,
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

/**
 * 사업자등록번호를 숫자만 남긴 형태로 통일한다.
 * "333-33-33333" 과 "3333333333" 이 다른 회사로 갈리면 유일 키가 무의미해진다.
 */
export function normalizeBusinessNumber(value: string | null | undefined): string | null {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length > 0 ? digits : null;
}

// 기존 기획사를 찾거나 없으면 새로 만든다.
// 회사의 유일 키는 회사명이 아니라 사업자등록번호다(기획서 1-35) — 동명 회사가 실재하므로
// 이름으로는 같은 회사인지 판단할 수 없다. 사업자번호가 없는 예전 데이터만 이름으로 찾는다.
// 이미 등록된 회사라면 법인 정보는 최초 등록 값을 그대로 유지한다.
export async function findOrCreateCompany(
  name: string,
  extra?: {
    businessRegistrationNumber?: string;
    representativeName?: string;
    postalCode?: string;
    address?: string;
    businessCertUrl?: string;
    businessCertName?: string;
    companyPhone?: string;
    companyFax?: string;
    corporateNumber?: string;
  },
): Promise<Company> {
  const trimmed = name.trim();
  const brn = normalizeBusinessNumber(extra?.businessRegistrationNumber);

  if (brn) {
    // 사업자번호가 있으면 그것만이 유일 키다.
    // 못 찾았다고 회사명으로 되짚으면 안 된다 — 동명 회사가 실재하므로
    // "이름이 같다"는 이유로 남의 회사에 합류시켜 버린다.
    const byBrn = await one<CompanyRow>(
      "SELECT * FROM companies WHERE business_registration_number = $1",
      [brn],
    );
    if (byBrn) return toCompany(byBrn);
  } else {
    // 사업자번호 없이 등록된 예전 데이터와의 호환 경로.
    const existing = await one<CompanyRow>("SELECT * FROM companies WHERE lower(name) = lower($1)", [
      trimmed,
    ]);
    if (existing) return toCompany(existing);
  }

  const row: CompanyRow = {
    id: crypto.randomUUID(),
    name: trimmed,
    business_registration_number: brn,
    representative_name: extra?.representativeName?.trim() || null,
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
    status: "PENDING",
    master_user_id: null,
    company_phone: extra?.companyPhone?.trim() || null,
    company_fax: extra?.companyFax?.trim() || null,
    corporate_number: extra?.corporateNumber?.replace(/\D/g, "") || null,
  };
  // 같은 사업자번호로 동시에 가입하면 조회-후-삽입 사이에 경합이 나서 한쪽이 UNIQUE 위반으로 실패한다.
  // 충돌 시 무시하고 아래에서 기존 행을 다시 읽는다.
  // 충돌 대상은 사업자번호 부분 인덱스(idx_companies_brn)다 — 회사명 UNIQUE 는 제거됐다.
  await q(
    `INSERT INTO companies
      (id, name, business_registration_number, representative_name, postal_code, address, business_cert_url, business_cert_name, created_at,
       company_phone, company_fax, corporate_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (business_registration_number) WHERE business_registration_number IS NOT NULL DO NOTHING`,
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
      row.company_phone,
      row.company_fax,
      row.corporate_number,
    ],
  );
  // 경합에 밀렸으면 먼저 들어간 행이 정본이다. 사업자번호가 있으면 그걸로 다시 읽는다.
  const stored = brn
    ? await one<CompanyRow>("SELECT * FROM companies WHERE business_registration_number = $1", [brn])
    : await one<CompanyRow>("SELECT * FROM companies WHERE lower(name) = lower($1)", [trimmed]);
  return toCompany(stored ?? row);
}

/**
 * 회사에 합류한 계정의 회사 내 권한을 정한다.
 * 마스터가 아직 없으면 이 사람이 최초 가입자이므로 MASTER, 있으면 STAFF 다(기획서 1-38·1-42).
 *
 * 기동 시 백필만으로는 부족하다 — 백필 이후에 만들어지는 회사는 마스터가 0명인 채로
 * 남아 소속 담당자를 승인할 사람이 없어진다. 그래서 합류 시점에 매번 정한다.
 * 동시 가입 경합에서 두 명이 동시에 MASTER 가 되지 않도록 회사 행을 잠그고 판단한다.
 */
export async function assignCompanyRoleOnJoin(
  userId: string,
  companyId: string,
): Promise<CompanyRole> {
  const locked = await one<{ master_user_id: string | null }>(
    "SELECT master_user_id FROM companies WHERE id = $1 FOR UPDATE",
    [companyId],
  );
  const isFirst = !locked?.master_user_id;
  const role: CompanyRole = isFirst ? "MASTER" : "STAFF";
  await q("UPDATE users SET company_role = $1 WHERE id = $2", [role, userId]);
  if (isFirst) {
    await q("UPDATE companies SET master_user_id = $1 WHERE id = $2", [userId, companyId]);
  }
  return role;
}

/**
 * 사업자등록번호로 "이 사람이 최초 가입자인지 기존 회사 합류인지"를 서버가 판정한다(기획서 A11).
 * 사용자가 고르는 값이 아니다 — 고르게 두면 남의 회사에 붙거나 같은 회사를 둘로 만든다.
 *
 * 판정 케이스 6종:
 *   NEW              등록 이력 없음        → 최초 가입자. 회사를 만들고 본인이 마스터가 된다.
 *   JOIN_APPROVED    승인된 회사           → 합류. 마스터 또는 운영자가 승인한다.
 *   JOIN_PENDING     심사 중인 회사        → 합류하되 앞선 심사가 끝날 때까지 함께 기다린다.
 *   REAPPLY_REJECTED 미승인 처리된 회사    → 최초 가입자 심사로 되돌린다(이전 사유를 참고).
 *   BLOCKED_SUSPENDED 휴·폐업 확인된 회사  → 가입을 막는다. 대관 계약 상대로 부적격.
 *   (NEW 는 회사 행이 아직 없으므로 company 가 null 이다)
 */
export type CompanyJoinKind =
  | "NEW"
  | "JOIN_APPROVED"
  | "JOIN_PENDING"
  | "REAPPLY_REJECTED"
  | "BLOCKED_SUSPENDED";

export interface CompanyJoinDecision {
  kind: CompanyJoinKind;
  company: Company | null;
}

export async function resolveCompanyJoin(
  businessRegistrationNumber: string | null | undefined,
): Promise<CompanyJoinDecision> {
  const brn = normalizeBusinessNumber(businessRegistrationNumber);
  if (!brn) return { kind: "NEW", company: null };

  const row = await one<CompanyRow>(
    "SELECT * FROM companies WHERE business_registration_number = $1",
    [brn],
  );
  if (!row) return { kind: "NEW", company: null };

  const company = toCompany(row);
  switch (company.status) {
    case "SUSPENDED":
      return { kind: "BLOCKED_SUSPENDED", company };
    case "REJECTED":
      return { kind: "REAPPLY_REJECTED", company };
    case "APPROVED":
      return { kind: "JOIN_APPROVED", company };
    default:
      return { kind: "JOIN_PENDING", company };
  }
}

/** 회사 상태를 바꾼다. 최초 가입자 심사 결과가 그대로 회사의 상태가 된다. */
export async function setCompanyStatus(companyId: string, status: CompanyStatus): Promise<void> {
  await q("UPDATE companies SET status = $1 WHERE id = $2", [status, companyId]);
}

/**
 * 회사에 남아 있는 마스터가 없으면 가장 오래된 승인 계정을 마스터로 올린다.
 * 마스터가 0명이면 소속 담당자의 합류를 승인할 사람이 없어져 가입 흐름이 멈춘다.
 */
export async function ensureCompanyMaster(companyId: string): Promise<void> {
  await q(
    `UPDATE companies SET master_user_id = (
       SELECT u.id FROM users u
        WHERE u.company_id = $1 AND u.role = 'APPLICANT' AND u.withdrawn_at IS NULL
        ORDER BY (u.approval_status = 'APPROVED') DESC, u.created_at ASC
        LIMIT 1
     )
     WHERE id = $1
       AND (master_user_id IS NULL
            OR NOT EXISTS (SELECT 1 FROM users u2
                            WHERE u2.id = companies.master_user_id AND u2.withdrawn_at IS NULL))`,
    [companyId],
  );
  await q(
    `UPDATE users SET company_role = 'MASTER'
      WHERE id = (SELECT master_user_id FROM companies WHERE id = $1)
        AND company_role IS DISTINCT FROM 'MASTER'`,
    [companyId],
  );
}

/** 회사 소속 담당자 목록 — 마스터의 담당자 관리 화면(기획서 A10). */
export async function listCompanyMembers(companyId: string): Promise<AppUser[]> {
  const rows = await q<UserRow>(
    `SELECT * FROM users
      WHERE company_id = $1 AND role = 'APPLICANT'
      ORDER BY (company_role = 'MASTER') DESC, created_at ASC`,
    [companyId],
  );
  return rows.map(toAppUser);
}

/**
 * 마스터 권한을 다른 소속 담당자에게 넘긴다.
 * 회사당 마스터는 1명이므로 이관자는 즉시 일반 담당자가 된다.
 * 한 트랜잭션 안에서 처리하지 않으면 마스터가 0명이거나 2명인 순간이 생긴다.
 */
export async function transferCompanyMaster(
  companyId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  await withTransaction(async () => {
    await q("UPDATE users SET company_role = 'STAFF' WHERE id = $1 AND company_id = $2", [
      fromUserId,
      companyId,
    ]);
    await q("UPDATE users SET company_role = 'MASTER' WHERE id = $1 AND company_id = $2", [
      toUserId,
      companyId,
    ]);
    await q("UPDATE companies SET master_user_id = $1 WHERE id = $2", [toUserId, companyId]);
  });
}

/**
 * 소속 담당자를 해제한다. 계정 삭제가 아니라 소속 해제 + 비활성이다(기획서 A10).
 * 계정을 지우면 그 사람이 낸 신청서·계약 이력이 함께 끊긴다.
 */
export async function removeCompanyMember(companyId: string, userId: string): Promise<void> {
  await q(
    `UPDATE users
        SET company_id = NULL, company_role = NULL, approval_status = 'REJECTED'
      WHERE id = $1 AND company_id = $2 AND company_role <> 'MASTER'`,
    [userId, companyId],
  );
}

// ── 담당자 초대 (기획서 A11) ────────────────────────────────────────────────

export interface CompanyInvitation {
  id: string;
  companyId: string;
  email: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

/**
 * 초대장을 만든다. 계정을 미리 만들지 않고 링크만 보낸다 —
 * 임시 비밀번호를 마스터가 정하면 그 사람이 남의 비밀번호를 아는 상태가 되고,
 * 본인이 직접 설정하지 않았으므로 실명 확인 근거도 사라진다.
 *
 * 원문 토큰은 저장하지 않는다. 유출돼도 DB 만으로는 링크를 만들 수 없게 한다.
 */
export async function createCompanyInvitation(input: {
  id: string;
  companyId: string;
  invitedBy: string;
  email: string;
  tokenHash: string;
  expiresAt: string;
  createdAt: string;
}): Promise<void> {
  await q(
    `INSERT INTO company_invitations (id, company_id, invited_by, email, token_hash, status, expires_at, created_at)
     VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)`,
    [
      input.id,
      input.companyId,
      input.invitedBy,
      input.email.toLowerCase(),
      input.tokenHash,
      input.expiresAt,
      input.createdAt,
    ],
  );
}

export async function listCompanyInvitations(companyId: string): Promise<CompanyInvitation[]> {
  const rows = await q<{
    id: string;
    company_id: string;
    email: string;
    status: string;
    expires_at: string;
    created_at: string;
  }>(
    `SELECT id, company_id, email, status, expires_at, created_at
       FROM company_invitations WHERE company_id = $1 ORDER BY created_at DESC`,
    [companyId],
  );
  return rows.map((r) => ({
    id: r.id,
    companyId: r.company_id,
    email: r.email,
    status: r.status,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
  }));
}

/** 토큰 해시로 유효한 초대를 찾는다. 만료·소비된 건은 돌려주지 않는다. */
export async function findValidInvitation(tokenHash: string): Promise<
  { id: string; companyId: string; email: string; companyName: string } | undefined
> {
  const row = await one<{
    id: string;
    company_id: string;
    email: string;
    expires_at: string;
    company_name: string;
  }>(
    `SELECT i.id, i.company_id, i.email, i.expires_at, c.name AS company_name
       FROM company_invitations i JOIN companies c ON c.id = i.company_id
      WHERE i.token_hash = $1 AND i.status = 'PENDING'`,
    [tokenHash],
  );
  if (!row) return undefined;
  if (Date.parse(row.expires_at) < Date.now()) return undefined;
  return {
    id: row.id,
    companyId: row.company_id,
    email: row.email,
    companyName: row.company_name,
  };
}

export async function consumeInvitation(id: string, userId: string): Promise<void> {
  await q(
    `UPDATE company_invitations
        SET status = 'ACCEPTED', accepted_at = $2, accepted_user_id = $3
      WHERE id = $1 AND status = 'PENDING'`,
    [id, new Date().toISOString(), userId],
  );
}

export async function cancelInvitation(id: string, companyId: string): Promise<void> {
  await q(
    "UPDATE company_invitations SET status = 'CANCELLED' WHERE id = $1 AND company_id = $2 AND status = 'PENDING'",
    [id, companyId],
  );
}

/** 이 계정이 자기 회사의 마스터인가 — 담당자 관리·합류 승인 권한 검사에 쓴다. */
export function isCompanyMaster(user: AppUser | null | undefined): boolean {
  return !!user && user.role === "APPLICANT" && user.companyRole === "MASTER";
}

/** 사업자등록번호를 앞 3자리만 남기고 가린다 — 목록에서 번호를 수집하지 못하게 한다. */
function maskBusinessNumber(brn: string | null): string | null {
  if (!brn) return null;
  return brn.length <= 3 ? brn : `${brn.slice(0, 3)}-**-*****`;
}

/**
 * 주소를 시/군/구까지만 남긴다. 상세 주소는 가입 전에 알 이유가 없다.
 *
 * 한국 주소는 단계 수가 일정하지 않다 —
 *   "서울특별시 도봉구 창동 1-24"          → 2단계에서 구가 끝난다
 *   "경기도 성남시 분당구 판교역로 166"    → 3단계까지 가야 구가 나온다
 * 그래서 개수로 자르지 않고 구/군이 나오면 거기서 끊는다.
 */
function coarseAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const kept: string[] = [];
  for (const part of parts.slice(0, 3)) {
    kept.push(part);
    if (/(구|군)$/.test(part)) break;
  }
  return kept.join(" ") || null;
}

export interface CompanySearchItem {
  id: string;
  name: string;
  businessNumberMasked: string | null;
  region: string | null;
}

/**
 * 합류할 회사를 찾는 검색. 승인 완료된 회사만 대상으로 한다 —
 * 심사 중이거나 미승인·휴폐업 처리된 회사는 존재 자체를 알리지 않는다.
 * total 은 자르기 전 건수라 "결과가 너무 많음"을 판정하는 데 쓴다.
 */
export async function searchCompaniesForJoin(
  field: "name" | "brn",
  keyword: string,
  limit = 6,
): Promise<{ total: number; results: CompanySearchItem[] }> {
  const rows =
    field === "brn"
      ? await q<CompanyRow>(
          `SELECT * FROM companies
            WHERE status = 'APPROVED' AND business_registration_number = $1
            ORDER BY name ASC LIMIT $2`,
          [normalizeBusinessNumber(keyword), limit],
        )
      : await q<CompanyRow>(
          `SELECT * FROM companies
            WHERE status = 'APPROVED' AND name ILIKE $1
            ORDER BY (lower(name) = lower($2)) DESC, name ASC
            LIMIT $3`,
          [`%${keyword.replace(/[%_]/g, (m) => "\\" + m)}%`, keyword, limit],
        );

  return {
    total: rows.length,
    results: rows.slice(0, 3).map((row) => ({
      id: row.id,
      name: row.name,
      businessNumberMasked: maskBusinessNumber(row.business_registration_number),
      region: coarseAddress(row.address),
    })),
  };
}

/** 약관 동의 이력을 남긴다. 선택 약관은 미동의(0)도 남겨야 "물어봤고 거절했다"가 증명된다. */
export async function saveTermsAgreements(
  userId: string,
  agreements: {
    kind: string;
    version: string;
    bodyHash: string;
    agreed: boolean;
    agreedAt: string;
    requestIp: string | null;
  }[],
): Promise<void> {
  for (const a of agreements) {
    await q(
      `INSERT INTO terms_agreements (id, user_id, terms_kind, terms_version, body_hash, agreed, agreed_at, request_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        crypto.randomUUID(),
        userId,
        a.kind,
        a.version,
        a.bodyHash,
        a.agreed ? 1 : 0,
        a.agreedAt,
        a.requestIp,
      ],
    );
  }
}

// ── 본인인증 (NICE 통합인증) ────────────────────────────────────────────────

export interface IdentityPending {
  id: string;
  nonce: string;
  requestNo: string;
  transactionId: string;
  purpose: string;
  accessToken: string;
  ticket: string;
  iterations: number;
  createdAt: string;
}

/** 표준창을 띄우기 직전에 진행 건을 남긴다. 콜백이 이 행을 찾아 결과를 조회한다. */
export async function saveIdentityPending(input: IdentityPending): Promise<void> {
  await q(
    `INSERT INTO identity_verifications
       (id, nonce, request_no, transaction_id, purpose, access_token, ticket_encrypted, iterations, succeeded, created_at)
     VALUES ($1, $9, $2, $3, $4, $5, $6, $7, 0, $8)`,
    [
      input.id,
      input.requestNo,
      input.transactionId,
      input.purpose,
      input.accessToken,
      encryptField(input.ticket),
      input.iterations,
      input.createdAt,
      input.nonce,
    ],
  );
}

/**
 * 콜백에서 진행 건을 집어든다. nonce 로 정확히 한 건만 찾는다.
 * 이미 소비된 건은 돌려주지 않는다 — 같은 인증을 두 번 쓰지 못하게 한다.
 */
export async function takeIdentityPending(nonce: string): Promise<IdentityPending | undefined> {
  const row = await one<{
    id: string;
    nonce: string;
    request_no: string;
    transaction_id: string;
    purpose: string;
    access_token: string | null;
    ticket_encrypted: string | null;
    iterations: number | null;
    created_at: string;
  }>(
    `SELECT id, nonce, request_no, transaction_id, purpose, access_token, ticket_encrypted, iterations, created_at
       FROM identity_verifications
      WHERE nonce = $1 AND consumed_at IS NULL
      LIMIT 1`,
    [nonce],
  );
  if (!row || !row.access_token || !row.ticket_encrypted || row.iterations == null) return undefined;
  return {
    id: row.id,
    nonce: row.nonce,
    requestNo: row.request_no,
    transactionId: row.transaction_id,
    purpose: row.purpose,
    accessToken: row.access_token,
    ticket: decryptField(row.ticket_encrypted),
    iterations: row.iterations,
    createdAt: row.created_at,
  };
}

/**
 * 인증 결과를 기록한다. CI/DI 는 암호문으로만 넣고, 중복 판별용 블라인드 인덱스를 함께 남긴다.
 * access_token·ticket 은 더 쓸 일이 없으므로 지운다(오래 들고 있을 이유가 없다).
 */
export async function completeIdentityVerification(
  id: string,
  result: {
    succeeded: boolean;
    resultCode?: string | null;
    resultMessage?: string | null;
    name?: string | null;
    birthdate?: string | null;
    gender?: string | null;
    nationalInfo?: string | null;
    mobileCo?: string | null;
    mobileNo?: string | null;
    ci?: string | null;
    di?: string | null;
  },
): Promise<void> {
  await q(
    `UPDATE identity_verifications
        SET succeeded = $2, result_code = $3, result_message = $4,
            name = $5, birthdate = $6, gender = $7, national_info = $8,
            mobile_co = $9, mobile_no = $10,
            ci_encrypted = $11, di_encrypted = $12, di_index = $13,
            access_token = NULL, ticket_encrypted = NULL,
            consumed_at = $14
      WHERE id = $1`,
    [
      id,
      result.succeeded ? 1 : 0,
      result.resultCode ?? null,
      result.resultMessage ?? null,
      result.name ?? null,
      result.birthdate ?? null,
      result.gender ?? null,
      result.nationalInfo ?? null,
      result.mobileCo ?? null,
      result.mobileNo ?? null,
      encryptOptional(result.ci ?? null),
      encryptOptional(result.di ?? null),
      blindIndexOptional(result.di ?? null),
      new Date().toISOString(),
    ],
  );
}

/** 서명 티켓의 verificationId 로 인증 이력을 되읽는다. 성공 건만 돌려준다. */
export async function findCompletedIdentity(id: string): Promise<
  | {
      id: string;
      purpose: string;
      name: string | null;
      birthdate: string | null;
      gender: string | null;
      nationalInfo: string | null;
      mobileCo: string | null;
      mobileNo: string | null;
      ci: string | null;
      di: string | null;
    }
  | undefined
> {
  const row = await one<{
    id: string;
    purpose: string;
    name: string | null;
    birthdate: string | null;
    gender: string | null;
    national_info: string | null;
    mobile_co: string | null;
    mobile_no: string | null;
    ci_encrypted: string | null;
    di_encrypted: string | null;
    succeeded: number;
  }>(
    `SELECT id, purpose, name, birthdate, gender, national_info, mobile_co, mobile_no,
            ci_encrypted, di_encrypted, succeeded
       FROM identity_verifications WHERE id = $1`,
    [id],
  );
  if (!row || row.succeeded !== 1) return undefined;
  return {
    id: row.id,
    purpose: row.purpose,
    name: row.name,
    birthdate: row.birthdate,
    gender: row.gender,
    nationalInfo: row.national_info,
    mobileCo: row.mobile_co,
    mobileNo: row.mobile_no,
    ci: decryptOptional(row.ci_encrypted),
    di: decryptOptional(row.di_encrypted),
  };
}

/**
 * 개발 환경 전용 — 인증을 통과한 것처럼 이력을 만들어 둔다.
 * 표준창 인증은 실제 사람이 해야 해서 E2E 자동화가 불가능하다.
 * 호출부(/api/auth/nice/start)에서 이중 잠금을 확인한 뒤에만 들어온다.
 */
export async function saveStubIdentity(input: {
  id: string;
  name: string;
  mobileNo: string;
  ci: string;
  di: string;
  purpose: string;
  createdAt: string;
}): Promise<void> {
  await q(
    `INSERT INTO identity_verifications
       (id, nonce, request_no, transaction_id, purpose, succeeded, result_code, result_message,
        name, birthdate, gender, national_info, mobile_co, mobile_no,
        ci_encrypted, di_encrypted, di_index, consumed_at, created_at)
     VALUES ($1, $2, $3, $4, $5, 1, 'STUB', '개발 환경 스텁',
             $6, '19900101', '1', '0', '1', $7, $8, $9, $10, $11, $11)`,
    [
      input.id,
      "stub-" + input.id,
      "STUB-" + input.id,
      "STUB-TX-" + input.id,
      input.purpose,
      input.name,
      input.mobileNo,
      encryptField(input.ci),
      encryptField(input.di),
      blindIndex(input.di),
      input.createdAt,
    ],
  );
}

/** DI 로 이미 가입한 계정을 찾는다 — 중복 가입 판별(기획서 1-28). */
export async function findUserByDi(di: string): Promise<AppUser | undefined> {
  const row = await one<UserRow>(
    "SELECT * FROM users WHERE di_index = $1 AND withdrawn_at IS NULL",
    [blindIndex(di)],
  );
  return row ? toAppUser(row) : undefined;
}

/** 이 시각보다 먼저 발급된 세션을 모두 무효로 만든다. */
export async function setSessionEpoch(userId: string, at: string): Promise<void> {
  await q("UPDATE users SET session_epoch = $1 WHERE id = $2", [at, userId]);
}

export async function findSessionEpoch(userId: string): Promise<string | null> {
  const row = await one<{ session_epoch: string | null }>(
    "SELECT session_epoch FROM users WHERE id = $1",
    [userId],
  );
  return row?.session_epoch ?? null;
}

// ── 비즈메시지 발송 이력 (기획서 B1) ────────────────────────────────────────

export async function findSendByIdempotencyKey(key: string): Promise<{ id: string } | undefined> {
  return one<{ id: string }>("SELECT id FROM message_sends WHERE idempotency_key = $1", [key]);
}

export async function recordSendAttempt(input: {
  id: string;
  idempotencyKey: string;
  templateCode: string;
  recipientId: string | null;
  recipientPhone: string | null;
  channel: string;
  status: string;
  resultCode?: string | null;
  resultMessage?: string | null;
  payloadJson?: string | null;
  createdAt: string;
}): Promise<void> {
  await q(
    `INSERT INTO message_sends
       (id, idempotency_key, template_code, recipient_id, recipient_phone, channel, status,
        attempt, result_code, result_message, payload_json, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11)
     ON CONFLICT (idempotency_key) DO NOTHING`,
    [
      input.id,
      input.idempotencyKey,
      input.templateCode,
      input.recipientId,
      input.recipientPhone,
      input.channel,
      input.status,
      input.resultCode ?? null,
      input.resultMessage ?? null,
      input.payloadJson ?? null,
      input.createdAt,
    ],
  );
}

export async function updateSendResult(
  id: string,
  result: { status: string; resultCode: string | null; resultMessage: string | null; sentAt: string | null },
): Promise<void> {
  await q(
    `UPDATE message_sends
        SET status = $2, result_code = $3, result_message = $4, sent_at = $5
      WHERE id = $1`,
    [id, result.status, result.resultCode, result.resultMessage, result.sentAt],
  );
}

/** 백오피스 발송 이력 조회 (기획서 1-60). */
export async function listMessageSends(limit = 100) {
  return q<{
    id: string;
    template_code: string;
    channel: string;
    status: string;
    recipient_phone: string | null;
    result_code: string | null;
    result_message: string | null;
    created_at: string;
    sent_at: string | null;
  }>(
    `SELECT id, template_code, channel, status, recipient_phone, result_code, result_message, created_at, sent_at
       FROM message_sends ORDER BY created_at DESC LIMIT $1`,
    [limit],
  );
}

/** 마스킹된 아이디 — 전체를 그대로 보여주면 목록화가 가능해진다(기획서 A13). */
export function maskUsername(username: string): string {
  if (username.length <= 2) return username[0] + "*";
  const head = username.slice(0, 4 > username.length - 2 ? 1 : 4);
  const tail = username.slice(-2);
  return `${head}${"*".repeat(Math.max(2, username.length - head.length - tail.length))}${tail}`;
}

/** 가입 확정 시 본인인증 결과를 계정에 붙인다. */
export async function attachIdentityToUser(
  userId: string,
  identity: { ci: string; di: string; verifiedAt: string },
): Promise<void> {
  await q(
    `UPDATE users
        SET ci_encrypted = $2, di_encrypted = $3, di_index = $4, identity_verified_at = $5
      WHERE id = $1`,
    [
      userId,
      encryptField(identity.ci),
      encryptField(identity.di),
      blindIndex(identity.di),
      identity.verifiedAt,
    ],
  );
}

export async function findCompanyById(id: string): Promise<Company | undefined> {
  const row = await one<CompanyRow>("SELECT * FROM companies WHERE id = $1", [id]);
  return row ? toCompany(row) : undefined;
}

export async function listCompanies(): Promise<Company[]> {
  const rows = await q<CompanyRow>("SELECT * FROM companies ORDER BY name ASC");
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
  password_hash: string | null;
  password_scheme: PasswordScheme;
  member_type: string | null;
  session_epoch: string | null;
  company_role: string | null;
  ci_encrypted: string | null;
  di_encrypted: string | null;
  di_index: string | null;
  identity_verified_at: string | null;
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
    memberType: (row.member_type as MemberType | null) ?? "CORPORATE",
    companyRole: row.role === "APPLICANT" ? ((row.company_role as CompanyRole | null) ?? null) : null,
    identityVerifiedAt: row.identity_verified_at ?? null,
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
  // 회원 유형. 지금은 기업회원만 열려 있어 생략하면 CORPORATE 다.
  memberType?: MemberType;
  // 회사 소속 신청자의 회사 내 권한. 최초 가입자는 MASTER, 합류자는 STAFF.
  companyRole?: CompanyRole | null;
  createdAt: string;
}): Promise<AppUser> {
  const approvalStatus = input.approvalStatus ?? "APPROVED";
  const companyId = input.companyId ?? null;
  const phone = input.phone ?? null;
  const adminTier: AdminTier | null = input.role === "ADMIN" ? (input.adminTier ?? "BASIC") : null;
  const memberType: MemberType = input.memberType ?? "CORPORATE";
  const companyRole: CompanyRole | null = input.role === "APPLICANT" ? (input.companyRole ?? null) : null;
  await q(
    `INSERT INTO users (id, username, email, phone, password_hash, password_scheme, name, company_name, company_id, role, approval_status, admin_tier, terms_agreed_at, privacy_agreed_at, member_type, company_role, created_at)
     VALUES ($1, $2, $3, $4, $5, 'v2', $6, $7, $8, $9, $10, $11, $12, $13, $15, $16, $14)`,
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
      memberType,
      companyRole,
    ],
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
    memberType,
    companyRole,
    identityVerifiedAt: null,
    createdAt: input.createdAt,
  };
}

export async function findUserByEmailWithPasswordHash(
  email: string,
): Promise<(AppUser & { passwordHash: string; passwordScheme: PasswordScheme }) | undefined> {
  const row = await one<UserRow>("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  if (!row || row.withdrawn_at) return undefined;
  // 초대만 받고 아직 비밀번호를 정하지 않은 계정은 password_hash 가 NULL 이다.
  // 이런 계정으로는 로그인이 성립하지 않으므로 여기서 잘라낸다(빈 해시로 검증에 들어가면 안 된다).
  if (!row.password_hash) return undefined;
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
  // 초대만 받고 아직 비밀번호를 정하지 않은 계정은 password_hash 가 NULL 이다.
  // 이런 계정으로는 로그인이 성립하지 않으므로 여기서 잘라낸다(빈 해시로 검증에 들어가면 안 된다).
  if (!row.password_hash) return undefined;
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
  input: { name: string; phone: string | null },
): Promise<AppUser> {
  await q("UPDATE users SET name = $1, phone = $2 WHERE id = $3", [input.name, input.phone, id]);
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
  const row = await one<{ password_hash: string | null; password_scheme: PasswordScheme }>(
    "SELECT password_hash, password_scheme FROM users WHERE id = $1",
    [id],
  );
  // 비밀번호를 아직 정하지 않은 계정(초대 대기)은 "해시 없음"으로 다룬다.
  return row && row.password_hash
    ? { passwordHash: row.password_hash, passwordScheme: row.password_scheme }
    : undefined;
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
  filter: { applicantId?: string; companyId?: string } = {},
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
  stage: QuoteStatus;
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
    stage: QuoteStatus;
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
  quote_id: string | null;
  link: string | null;
  message: string;
  is_read: number;
  created_at: string;
}

function toNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    quoteId: row.quote_id,
    link: row.link ?? null,
    message: row.message,
    isRead: row.is_read === 1,
    createdAt: row.created_at,
  };
}

export async function createNotification(input: {
  id: string;
  recipientId: string;
  /** 가입 승인·비밀번호 변경처럼 신청서가 없는 알림은 null 로 넣는다. */
  quoteId: string | null;
  /** 눌렀을 때 갈 곳. 없으면 기본 목록으로 간다. */
  link?: string | null;
  message: string;
  createdAt: string;
}) {
  await q(
    `INSERT INTO notifications (id, recipient_id, quote_id, link, message, is_read, created_at)
     VALUES ($1, $2, $3, $6, $4, 0, $5)`,
    [input.id, input.recipientId, input.quoteId, input.message, input.createdAt, input.link ?? null],
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
