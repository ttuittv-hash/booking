import crypto from "node:crypto";
import { all, one, run } from "./pg";
import { FEATURE_SPEC_SEED } from "./featureSpecSeed";
import { FEATURE_SPEC_SHEET_KEYS } from "./pricing/types";
import { DEFAULT_GUIDE_CONTENT, DEFAULT_HOME_CONTENT, DEFAULT_VENUE_CONTENT } from "./content/seed";
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

// 스키마 생성/시드는 initDb.ts 가 담당한다 (pg.ts 가 첫 쿼리 직전에 한 번 실행).
// 요금표 INSERT 는 시드와 이 파일이 공유하므로 여기서 내보낸다.
export const INSERT_RATE_TABLE_SQL = `INSERT INTO rate_tables
    (version, vat_rate, extra_week_ratio, day_exclusion_discount_ratio, packages_json, addons_json, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`;

export function rateTableParams(rateTable: RateTable): unknown[] {
  return [
    rateTable.version,
    rateTable.vatRate,
    rateTable.extraWeekRatio,
    rateTable.dayExclusionDiscountRatio,
    JSON.stringify(rateTable.packages),
    JSON.stringify(rateTable.addons),
    rateTable.updatedAt,
  ];
}

// ---------------------------------------------------------------------------
// Rate table
// ---------------------------------------------------------------------------

export async function getCurrentRateTable(): Promise<RateTable> {
  const row = (await one("SELECT * FROM rate_tables ORDER BY updated_at DESC LIMIT 1")) as
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

export async function saveNewRateTableVersion(
  next: Omit<RateTable, "version" | "updatedAt">,
): Promise<RateTable> {
  const version = `v-${Date.now()}`;
  const rateTable: RateTable = { ...next, version, updatedAt: new Date().toISOString() };
  await run(INSERT_RATE_TABLE_SQL, rateTableParams(rateTable));
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
  const existing = (await one("SELECT * FROM companies WHERE lower(name) = lower(?)", [trimmed])) as CompanyRow | undefined;
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
  (await run(`INSERT INTO companies
      (id, name, business_registration_number, representative_name, postal_code, address, business_cert_url, business_cert_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [row.id,
    row.name,
    row.business_registration_number,
    row.representative_name,
    row.postal_code,
    row.address,
    row.business_cert_url,
    row.business_cert_name,
    row.created_at]));
  return toCompany(row);
}

export async function findCompanyById(id: string): Promise<Company | undefined> {
  const row = (await one("SELECT * FROM companies WHERE id = ?", [id])) as CompanyRow | undefined;
  return row ? toCompany(row) : undefined;
}

export async function listCompanies(): Promise<Company[]> {
  const rows = (await all("SELECT * FROM companies ORDER BY name ASC")) as unknown as CompanyRow[];
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
  (await run(`INSERT INTO users (id, username, email, phone, password_hash, name, company_name, company_id, role, approval_status, admin_tier, terms_agreed_at, privacy_agreed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.id,
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
    input.createdAt]));
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

export async function findUserByEmailWithPasswordHash(
  email: string,
): Promise<(AppUser & { passwordHash: string }) | undefined> {
  const row = (await one("SELECT * FROM users WHERE email = ?", [email.toLowerCase()])) as
    | UserRow
    | undefined;
  if (!row || row.withdrawn_at) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash };
}

// 승인 대기 중인 신청도 포함해 동일 전화번호로 이미 가입된 계정이 있는지 확인한다
// (승인 전에 이메일만 바꿔 중복 신청하는 것을 막기 위함).
export async function findUserByPhone(phone: string): Promise<AppUser | undefined> {
  const row = (await one("SELECT * FROM users WHERE phone = ?", [phone.trim()])) as UserRow | undefined;
  return row ? toAppUser(row) : undefined;
}

export async function findUserByUsername(username: string): Promise<AppUser | undefined> {
  const row = (await one("SELECT * FROM users WHERE username = ?", [username.trim()])) as
    | UserRow
    | undefined;
  return row ? toAppUser(row) : undefined;
}

// 로그인 식별자로 아이디 또는 이메일을 모두 허용한다 (아이디 필드 도입 이전 계정과의 호환을 위함).
export async function findUserByLoginIdWithPasswordHash(
  loginId: string,
): Promise<(AppUser & { passwordHash: string }) | undefined> {
  const trimmed = loginId.trim();
  const row = (await one("SELECT * FROM users WHERE username = ? OR email = ?", [trimmed,
    trimmed.toLowerCase()])) as UserRow | undefined;
  if (!row || row.withdrawn_at) return undefined;
  return { ...toAppUser(row), passwordHash: row.password_hash };
}

export async function listUsers(filter?: { role?: UserRole; approvalStatus?: ApprovalStatus }): Promise<AppUser[]> {
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
  const rows = (await all(`SELECT * FROM users ${where} ORDER BY created_at ASC`, params)) as unknown as UserRow[];
  return rows.map(toAppUser);
}

export async function setUserApprovalStatus(id: string, approvalStatus: ApprovalStatus): Promise<AppUser> {
  (await run("UPDATE users SET approval_status = ? WHERE id = ?", [approvalStatus, id]));
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
    const masterCount = (await one("SELECT COUNT(*) as n FROM users WHERE role = 'ADMIN' AND admin_tier = 'MASTER'")) as { n: number };
    if (masterCount.n <= 1) {
      throw new Error("마지막 남은 마스터 관리자는 강등할 수 없습니다.");
    }
  }
  (await run("UPDATE users SET admin_tier = ? WHERE id = ?", [tier, id]));
  return (await findUserById(id))!;
}

// 비밀번호 해시 없이 이메일로 계정을 찾는다(역할 무관 — 신청자든 운영자든).
// "기존 회원을 운영자로 승급" 기능에서 사용.
export async function findUserByEmail(email: string): Promise<AppUser | undefined> {
  const row = (await one("SELECT * FROM users WHERE email = ?", [email.toLowerCase()])) as
    | UserRow
    | undefined;
  if (!row || row.withdrawn_at) return undefined;
  return toAppUser(row);
}

// 이미 가입된 계정(신청자 포함)을 운영자로 전환한다. 새 비밀번호를 만들지 않고
// 그 사람이 이미 쓰던 계정 그대로 role/등급만 바꾸는 것 — Render 환경변수
// (MASTER_ADMIN_EMAILS) 없이도 마스터 관리자가 화면에서 바로 할 수 있게 한다.
export async function promoteUserToAdmin(id: string, tier: AdminTier): Promise<AppUser> {
  (await run("UPDATE users SET role = 'ADMIN', admin_tier = ?, approval_status = 'APPROVED' WHERE id = ?", [tier, id]));
  return (await findUserById(id))!;
}

export async function findUserById(id: string): Promise<AppUser | undefined> {
  const row = (await one("SELECT * FROM users WHERE id = ?", [id])) as UserRow | undefined;
  return row ? toAppUser(row) : undefined;
}

export async function updateUserProfile(id: string, input: { name: string; phone: string | null }): Promise<AppUser> {
  (await run("UPDATE users SET name = ?, phone = ? WHERE id = ?", [input.name, input.phone, id]));
  return (await findUserById(id))!;
}

export async function updateUserPassword(id: string, passwordHash: string): Promise<void> {
  (await run("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, id]));
}

export async function findUserPasswordHash(id: string): Promise<string | undefined> {
  const row = (await one("SELECT password_hash FROM users WHERE id = ?", [id])) as
    | { password_hash: string }
    | undefined;
  return row?.password_hash;
}

// 탈퇴는 신청서(applicant_id FK)·감사로그 등 기존 기록 보존을 위해 소프트 삭제로 처리한다.
export async function withdrawUser(id: string, withdrawnAt: string): Promise<void> {
  (await run("UPDATE users SET withdrawn_at = ? WHERE id = ?", [withdrawnAt, id]));
}

export async function isUserWithdrawn(id: string): Promise<boolean> {
  const row = (await one("SELECT withdrawn_at FROM users WHERE id = ?", [id])) as
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
  (await run(`INSERT INTO quotes
      (id, applicant_id, rate_table_version, selection_json, line_items_json, subtotal, vat, total, metered_notice, status, created_at, review_json, contract_json, settlement_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ESTIMATE', ?, NULL, NULL, NULL)`, [input.id,
    input.applicantId,
    input.rateTableVersion,
    JSON.stringify(input.selection),
    JSON.stringify(input.lineItems),
    input.subtotal,
    input.vat,
    input.total,
    input.meteredNotice,
    input.createdAt]));
  return (await getQuoteById(input.id))!;
}

export async function getQuoteById(id: string): Promise<Quote | undefined> {
  const row = (await one("SELECT * FROM quotes WHERE id = ?", [id])) as QuoteRow | undefined;
  return row ? toQuote(row) : undefined;
}

export async function listQuotes(filter?: { applicantId?: string; companyId?: string }): Promise<Quote[]> {
  let rows: QuoteRow[];
  if (filter?.companyId) {
    rows = (await all(`SELECT q.* FROM quotes q JOIN users u ON u.id = q.applicant_id
         WHERE u.company_id = ? ORDER BY q.created_at DESC`, [filter.companyId])) as unknown as QuoteRow[];
  } else if (filter?.applicantId) {
    rows = (await all("SELECT * FROM quotes WHERE applicant_id = ? ORDER BY created_at DESC", [filter.applicantId])) as unknown as QuoteRow[];
  } else {
    rows = (await all("SELECT * FROM quotes ORDER BY created_at DESC")) as unknown as QuoteRow[];
  }
  return rows.map(toQuote);
}

// 같은 주차에 이미 심사 승인된 "다른 회사"의 신청서가 있는지 확인한다.
// 한 주차는 하나의 대관사만 사용할 수 있으므로, 이미 승인된 건이 있으면 같은 주차의
// 다른 회사 신청서는 승인할 수 없다 (같은 회사 소속 신청서끼리는 충돌로 보지 않는다).
export async function findApprovedWeekConflict(
  quote: Quote,
): Promise<{ quote: Quote; companyName: string | null } | undefined> {
  const week = quote.selection?.week;
  if (!week) return undefined;

  const applicant = await findUserById(quote.applicantId);
  const companyId = applicant?.companyId ?? null;

  for (const other of await listQuotes()) {
    if (other.id === quote.id) continue;
    if (other.review?.decision !== "APPROVED") continue;
    const otherWeek = other.selection?.week;
    if (!otherWeek) continue;
    const sameWeek =
      otherWeek.year === week.year &&
      otherWeek.month === week.month &&
      otherWeek.weekOfMonth === week.weekOfMonth;
    if (!sameWeek) continue;

    const otherApplicant = await findUserById(other.applicantId);
    const otherCompanyId = otherApplicant?.companyId ?? null;
    const sameCompany = companyId && otherCompanyId ? companyId === otherCompanyId : quote.applicantId === other.applicantId;
    if (sameCompany) continue;

    return { quote: other, companyName: otherApplicant?.companyName ?? null };
  }
  return undefined;
}

// 캘린더 경합 현황 — 주차별로 신청서를 낸 회사(신청자) 수를 집계한다.
export async function listWeekDemand(): Promise<WeekDemand[]> {
  const rows = (await all(`SELECT q.selection_json as selection_json, u.company_name as company_name, u.id as user_id
       FROM quotes q JOIN users u ON u.id = q.applicant_id`)) as { selection_json: string; company_name: string | null; user_id: string }[];

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

export async function listDateBlocks(): Promise<DateBlock[]> {
  const rows = (await all("SELECT * FROM date_blocks ORDER BY date ASC")) as unknown as DateBlockRow[];
  return rows.map(toDateBlock);
}

export async function isDateBlocked(date: string): Promise<DateBlock | undefined> {
  const row = (await one("SELECT * FROM date_blocks WHERE date = ?", [date])) as DateBlockRow | undefined;
  return row ? toDateBlock(row) : undefined;
}

// 신청서가 실제로 차지하는 날짜 목록(제외 요일 반영, 추가 일수 포함) 중 막힌 날짜가 있는지 확인한다.
export async function findBlockedDatesAmong(dates: string[]): Promise<DateBlock[]> {
  if (dates.length === 0) return [];
  const placeholders = dates.map(() => "?").join(",");
  const rows = (await all(`SELECT * FROM date_blocks WHERE date IN (${placeholders})`, dates)) as unknown as DateBlockRow[];
  return rows.map(toDateBlock);
}

export async function blockDate(date: string, reason: string | null): Promise<DateBlock> {
  (await run(`INSERT INTO date_blocks (date, reason, created_at) VALUES (?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET reason = excluded.reason`, [date, reason, new Date().toISOString()]));
  return { date, reason };
}

export async function unblockDate(date: string): Promise<void> {
  (await run("DELETE FROM date_blocks WHERE date = ?", [date]));
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
  (await run(`UPDATE quotes
     SET rate_table_version = ?, selection_json = ?, line_items_json = ?, subtotal = ?, vat = ?, total = ?
     WHERE id = ?`, [input.rateTableVersion,
    JSON.stringify(input.selection),
    JSON.stringify(input.lineItems),
    input.subtotal,
    input.vat,
    input.total,
    id]));
  return (await getQuoteById(id))!;
}

export async function setQuoteReview(id: string, review: Review): Promise<Quote> {
  (await run("UPDATE quotes SET review_json = ? WHERE id = ?", [JSON.stringify(review), id]));
  return (await getQuoteById(id))!;
}

export async function setQuoteContract(id: string, contract: ContractAdjustment): Promise<Quote> {
  (await run("UPDATE quotes SET status = 'CONTRACTED', contract_json = ? WHERE id = ?", [JSON.stringify(contract),
    id]));
  return (await getQuoteById(id))!;
}

export async function setQuoteSettlement(id: string, settlement: Settlement): Promise<Quote> {
  (await run("UPDATE quotes SET status = 'SETTLED', settlement_json = ? WHERE id = ?", [JSON.stringify(settlement),
    id]));
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
}): Promise<void> {
  (await run(`INSERT INTO audit_logs (id, quote_id, stage, snapshot_json, actor_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`, [entry.id, entry.quoteId, entry.stage, JSON.stringify(entry.snapshot), entry.actorId, entry.createdAt]));
}

export async function listAuditLogsForQuote(quoteId: string): Promise<AuditLogEntry[]> {
  const rows = (await all("SELECT * FROM audit_logs WHERE quote_id = ? ORDER BY created_at ASC", [quoteId])) as {
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

export async function createDeposit(input: {
  id: string;
  quoteId: string;
  requiredAmount: number;
  depositRate: number;
  createdAt: string;
}): Promise<Deposit> {
  (await run(`INSERT INTO deposits (id, quote_id, required_amount, deposit_rate, status, created_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`, [input.id, input.quoteId, input.requiredAmount, input.depositRate, input.createdAt]));
  return (await getDepositByQuoteId(input.quoteId))!;
}

export async function getDepositByQuoteId(quoteId: string): Promise<Deposit | undefined> {
  const row = (await one("SELECT * FROM deposits WHERE quote_id = ?", [quoteId])) as
    | DepositRow
    | undefined;
  return row ? toDeposit(row) : undefined;
}

export async function reportDeposit(quoteId: string, depositorName: string, reportedAt: string): Promise<Deposit> {
  (await run("UPDATE deposits SET status = 'REPORTED', depositor_name = ?, reported_at = ? WHERE quote_id = ?", [depositorName, reportedAt, quoteId]));
  return (await getDepositByQuoteId(quoteId))!;
}

export async function confirmDeposit(quoteId: string, confirmedBy: string, confirmedAt: string): Promise<Deposit> {
  (await run("UPDATE deposits SET status = 'CONFIRMED', confirmed_by = ?, confirmed_at = ? WHERE quote_id = ?", [confirmedBy, confirmedAt, quoteId]));
  return (await getDepositByQuoteId(quoteId))!;
}

// 정산 내역에 대한 신청자 상호 확인 — settlement_json에 필드만 덧붙인다 (기존 정산 확정 흐름은 그대로 둠).
export async function confirmSettlementMutual(quoteId: string, confirmedBy: string, confirmedAt: string): Promise<Quote> {
  const quote = await getQuoteById(quoteId);
  if (!quote?.settlement) throw new Error("정산 내역이 없습니다.");
  const settlement: Settlement = {
    ...quote.settlement,
    mutualConfirmedAt: confirmedAt,
    mutualConfirmedBy: confirmedBy,
  };
  (await run("UPDATE quotes SET settlement_json = ? WHERE id = ?", [JSON.stringify(settlement),
    quoteId]));
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

export async function getContractSignatureByQuoteId(quoteId: string): Promise<ContractSignature | undefined> {
  const row = (await one("SELECT * FROM contract_signatures WHERE quote_id = ?", [quoteId])) as
    | ContractSignatureRow
    | undefined;
  return row ? toContractSignature(row) : undefined;
}

// 계약 확정 시점에 빈 레코드를 만들어두고, 이후 양측이 각자 날인한다.
export async function ensureContractSignature(quoteId: string, createdAt: string): Promise<ContractSignature> {
  const existing = await getContractSignatureByQuoteId(quoteId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  (await run("INSERT INTO contract_signatures (id, quote_id, created_at) VALUES (?, ?, ?)", [id, quoteId, createdAt]));
  return (await getContractSignatureByQuoteId(quoteId))!;
}

export async function signContractAsVenue(quoteId: string, signedBy: string, signedAt: string): Promise<ContractSignature> {
  (await run("UPDATE contract_signatures SET venue_signed_at = ?, venue_signed_by = ? WHERE quote_id = ?", [signedAt, signedBy, quoteId]));
  return (await getContractSignatureByQuoteId(quoteId))!;
}

export async function signContractAsApplicant(quoteId: string, signedBy: string, signedAt: string): Promise<ContractSignature> {
  (await run("UPDATE contract_signatures SET applicant_signed_at = ?, applicant_signed_by = ? WHERE quote_id = ?", [signedAt, signedBy, quoteId]));
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

export async function getTaxInvoice(quoteId: string, purpose: InvoicePurpose): Promise<TaxInvoice | undefined> {
  const row = (await one("SELECT * FROM tax_invoices WHERE quote_id = ? AND purpose = ?", [quoteId, purpose])) as TaxInvoiceRow | undefined;
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
  (await run(`INSERT INTO tax_invoices (id, quote_id, purpose, amount, status, created_at)
     VALUES (?, ?, ?, ?, 'PENDING', ?)`, [id, quoteId, purpose, amount, createdAt]));
  return (await getTaxInvoice(quoteId, purpose))!;
}

export async function issueTaxInvoice(
  quoteId: string,
  purpose: InvoicePurpose,
  issuedBy: string,
  issuedAt: string,
): Promise<TaxInvoice> {
  (await run("UPDATE tax_invoices SET status = 'ISSUED', issued_at = ?, issued_by = ?, last_reminder_at = ? WHERE quote_id = ? AND purpose = ?", [issuedAt, issuedBy, issuedAt, quoteId, purpose]));
  return (await getTaxInvoice(quoteId, purpose))!;
}

export async function reportTaxInvoicePayment(
  quoteId: string,
  purpose: InvoicePurpose,
  payerName: string,
  reportedAt: string,
): Promise<TaxInvoice> {
  (await run("UPDATE tax_invoices SET status = 'REPORTED', payer_name = ?, reported_at = ? WHERE quote_id = ? AND purpose = ?", [payerName, reportedAt, quoteId, purpose]));
  return (await getTaxInvoice(quoteId, purpose))!;
}

export async function confirmTaxInvoicePayment(
  quoteId: string,
  purpose: InvoicePurpose,
  confirmedBy: string,
  paidAt: string,
): Promise<TaxInvoice> {
  (await run("UPDATE tax_invoices SET status = 'PAID', paid_at = ?, paid_confirmed_by = ? WHERE quote_id = ? AND purpose = ?", [paidAt, confirmedBy, quoteId, purpose]));
  return (await getTaxInvoice(quoteId, purpose))!;
}

// 미입금 5일 경과 시 알림 재발송 대상 — lastReminderAt 기준으로 lazy하게(페이지 조회 시점에) 판단한다.
export function isInvoiceReminderDue(invoice: TaxInvoice, now: Date, intervalDays = 5): boolean {
  if (invoice.status !== "ISSUED" && invoice.status !== "REPORTED") return false;
  const base = invoice.lastReminderAt ?? invoice.issuedAt;
  if (!base) return false;
  const elapsedMs = now.getTime() - new Date(base).getTime();
  return elapsedMs >= intervalDays * 24 * 60 * 60 * 1000;
}

export async function touchInvoiceReminder(quoteId: string, purpose: InvoicePurpose, at: string): Promise<void> {
  (await run("UPDATE tax_invoices SET last_reminder_at = ? WHERE quote_id = ? AND purpose = ?", [at, quoteId, purpose]));
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
  const row = (await one("SELECT * FROM ticket_opens WHERE quote_id = ?", [quoteId])) as
    | TicketOpenRow
    | undefined;
  return row ? toTicketOpen(row) : undefined;
}

export async function ensureTicketOpen(quoteId: string, createdAt: string): Promise<TicketOpen> {
  const existing = await getTicketOpenByQuoteId(quoteId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  (await run("INSERT INTO ticket_opens (id, quote_id, created_at) VALUES (?, ?, ?)", [id,
    quoteId,
    createdAt]));
  return (await getTicketOpenByQuoteId(quoteId))!;
}

export async function setTicketOpenDate(quoteId: string, openDate: string): Promise<TicketOpen> {
  (await run("UPDATE ticket_opens SET open_date = ? WHERE quote_id = ?", [openDate, quoteId]));
  return (await getTicketOpenByQuoteId(quoteId))!;
}

export async function markTicketOpenMaterialsUploaded(quoteId: string, at: string): Promise<void> {
  (await run("UPDATE ticket_opens SET materials_uploaded_at = ? WHERE quote_id = ?", [at, quoteId]));
}

// D-30 미업로드 알림 대상 — 오픈일까지 30일 이하 남았고, 자료 미업로드 상태
export function isTicketOpenReminderDue(ticketOpen: TicketOpen, now: Date): boolean {
  if (!ticketOpen.openDate || ticketOpen.materialsUploadedAt) return false;
  const daysUntilOpen = (new Date(ticketOpen.openDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilOpen > 30) return false;
  if (!ticketOpen.lastReminderAt) return true;
  return now.getTime() - new Date(ticketOpen.lastReminderAt).getTime() >= 24 * 60 * 60 * 1000;
}

export async function touchTicketOpenReminder(quoteId: string, at: string): Promise<void> {
  (await run("UPDATE ticket_opens SET last_reminder_at = ? WHERE quote_id = ?", [at, quoteId]));
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

export async function getFacilityMeetingByQuoteId(quoteId: string): Promise<FacilityMeeting | undefined> {
  const row = (await one("SELECT * FROM facility_meetings WHERE quote_id = ?", [quoteId])) as
    | FacilityMeetingRow
    | undefined;
  return row ? toFacilityMeeting(row) : undefined;
}

export async function ensureFacilityMeeting(quoteId: string, createdAt: string): Promise<FacilityMeeting> {
  const existing = await getFacilityMeetingByQuoteId(quoteId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  (await run("INSERT INTO facility_meetings (id, quote_id, created_at) VALUES (?, ?, ?)", [id,
    quoteId,
    createdAt]));
  return (await getFacilityMeetingByQuoteId(quoteId))!;
}

export async function setFacilityMeetingDate(quoteId: string, meetingDate: string): Promise<FacilityMeeting> {
  (await run("UPDATE facility_meetings SET meeting_date = ? WHERE quote_id = ?", [meetingDate,
    quoteId]));
  return (await getFacilityMeetingByQuoteId(quoteId))!;
}

export async function markFacilityMeetingMaterialsUploaded(quoteId: string, at: string): Promise<void> {
  (await run("UPDATE facility_meetings SET materials_uploaded_at = ? WHERE quote_id = ?", [at,
    quoteId]));
}

// D-7 미업로드 알림 대상 — 회의일까지 7일 이하 남았고, 자료 미업로드 상태
export function isFacilityMeetingReminderDue(meeting: FacilityMeeting, now: Date): boolean {
  if (!meeting.meetingDate || meeting.materialsUploadedAt) return false;
  const daysUntilMeeting = (new Date(meeting.meetingDate).getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  if (daysUntilMeeting > 7) return false;
  if (!meeting.lastReminderAt) return true;
  return now.getTime() - new Date(meeting.lastReminderAt).getTime() >= 24 * 60 * 60 * 1000;
}

export async function touchFacilityMeetingReminder(quoteId: string, at: string): Promise<void> {
  (await run("UPDATE facility_meetings SET last_reminder_at = ? WHERE quote_id = ?", [at, quoteId]));
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
  (await run(`INSERT INTO attachments (id, quote_id, stored_name, original_name, mime_type, size, uploaded_by, category, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.id,
    input.quoteId,
    input.storedName,
    input.originalName,
    input.mimeType,
    input.size,
    input.uploadedBy,
    input.category ?? null,
    input.createdAt]));
  return toAttachment(
    (await one("SELECT * FROM attachments WHERE id = ?", [input.id])) as unknown as AttachmentRow,
  );
}

export async function listAttachments(quoteId: string, category?: AttachmentCategory): Promise<Attachment[]> {
  let rows: unknown[];
  if (category === undefined) {
    rows = (await all("SELECT * FROM attachments WHERE quote_id = ? ORDER BY created_at ASC", [quoteId]));
  } else if (category === null) {
    rows = (await all("SELECT * FROM attachments WHERE quote_id = ? AND category IS NULL ORDER BY created_at ASC", [quoteId]));
  } else {
    rows = (await all("SELECT * FROM attachments WHERE quote_id = ? AND category = ? ORDER BY created_at ASC", [quoteId, category]));
  }
  return (rows as AttachmentRow[]).map(toAttachment);
}

export async function getAttachmentById(id: string): Promise<Attachment | undefined> {
  const row = (await one("SELECT * FROM attachments WHERE id = ?", [id])) as
    | AttachmentRow
    | undefined;
  return row ? toAttachment(row) : undefined;
}

export async function deleteAttachment(id: string): Promise<void> {
  (await run("DELETE FROM attachments WHERE id = ?", [id]));
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
}): Promise<void> {
  (await run(`INSERT INTO notifications (id, recipient_id, quote_id, message, is_read, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`, [input.id, input.recipientId, input.quoteId, input.message, input.createdAt]));
}

export async function notifyAdmins(input: { quoteId: string; message: string; createdAt: string }): Promise<void> {
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
  const rows = (await all("SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC LIMIT ?", [recipientId, limit])) as unknown as NotificationRow[];
  return rows.map(toNotification);
}

export async function countUnreadNotifications(recipientId: string): Promise<number> {
  const row = (await one("SELECT COUNT(*) as n FROM notifications WHERE recipient_id = ? AND is_read = 0", [recipientId])) as { n: number };
  return row.n;
}

export async function markNotificationRead(id: string, recipientId: string): Promise<void> {
  (await run("UPDATE notifications SET is_read = 1 WHERE id = ? AND recipient_id = ?", [id,
    recipientId]));
}

export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  (await run("UPDATE notifications SET is_read = 1 WHERE recipient_id = ?", [recipientId]));
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
  (await run(`INSERT INTO inquiries (id, user_id, title, content, status, created_at)
     VALUES (?, ?, ?, ?, 'OPEN', ?)`, [input.id, input.userId, input.title, input.content, input.createdAt]));
  return (await getInquiryById(input.id))!;
}

export async function getInquiryById(id: string): Promise<Inquiry | undefined> {
  const row = (await one("SELECT * FROM inquiries WHERE id = ?", [id])) as InquiryRow | undefined;
  return row ? toInquiry(row) : undefined;
}

export async function listInquiries(filter?: { userId?: string }): Promise<Inquiry[]> {
  const rows = (
    filter?.userId
      ? (await all("SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC", [filter.userId]))
      : (await all("SELECT * FROM inquiries ORDER BY created_at DESC"))
  ) as unknown as InquiryRow[];
  return rows.map(toInquiry);
}

export async function answerInquiry(
  id: string,
  answer: string,
  answeredBy: string,
  answeredAt: string,
): Promise<Inquiry> {
  (await run("UPDATE inquiries SET status = 'ANSWERED', answer = ?, answered_by = ?, answered_at = ? WHERE id = ?", [answer, answeredBy, answeredAt, id]));
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
  const rows = (await all("SELECT * FROM notices ORDER BY created_at DESC")) as unknown as NoticeRow[];
  return rows.map(toNotice);
}

export async function getNoticeById(id: string): Promise<Notice | undefined> {
  const row = (await one("SELECT * FROM notices WHERE id = ?", [id])) as NoticeRow | undefined;
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
  (await run("INSERT INTO notices (id, tag, title, body, image_url, attachment_url, attachment_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", [input.id,
    input.tag ?? null,
    input.title,
    input.body,
    input.imageUrl ?? null,
    input.attachmentUrl ?? null,
    input.attachmentName ?? null,
    input.createdAt,
    input.createdAt]));
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
  (await run("UPDATE notices SET tag = ?, title = ?, body = ?, image_url = ?, attachment_url = ?, attachment_name = ?, updated_at = ? WHERE id = ?", [input.tag ?? null,
    input.title,
    input.body,
    input.imageUrl ?? null,
    input.attachmentUrl ?? null,
    input.attachmentName ?? null,
    input.updatedAt,
    id]));
  return await getNoticeById(id);
}

export async function deleteNotice(id: string): Promise<void> {
  (await run("DELETE FROM notices WHERE id = ?", [id]));
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
  const rows = (await all("SELECT * FROM faqs ORDER BY created_at ASC")) as unknown as FaqRow[];
  return rows.map(toFaq);
}

export async function getFaqById(id: string): Promise<Faq | undefined> {
  const row = (await one("SELECT * FROM faqs WHERE id = ?", [id])) as FaqRow | undefined;
  return row ? toFaq(row) : undefined;
}

export async function createFaq(input: {
  id: string;
  tag?: string | null;
  question: string;
  answer: string;
  createdAt: string;
}): Promise<Faq> {
  (await run("INSERT INTO faqs (id, tag, question, answer, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)", [input.id, input.tag ?? null, input.question, input.answer, input.createdAt, input.createdAt]));
  return (await getFaqById(input.id))!;
}

export async function updateFaq(
  id: string,
  input: { tag?: string | null; question: string; answer: string; updatedAt: string },
): Promise<Faq | undefined> {
  (await run("UPDATE faqs SET tag = ?, question = ?, answer = ?, updated_at = ? WHERE id = ?", [input.tag ?? null,
    input.question,
    input.answer,
    input.updatedAt,
    id]));
  return await getFaqById(id);
}

export async function deleteFaq(id: string): Promise<void> {
  (await run("DELETE FROM faqs WHERE id = ?", [id]));
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
    ? ((await all("SELECT * FROM pages WHERE page_group = ? ORDER BY sort_order ASC", [group])) as unknown as PageRow[])
    : ((await all("SELECT * FROM pages ORDER BY page_group ASC, sort_order ASC")) as unknown as PageRow[]);
  return rows.map(toStaticPage);
}

export async function getPageById(id: string): Promise<StaticPage | undefined> {
  const row = (await one("SELECT * FROM pages WHERE id = ?", [id])) as PageRow | undefined;
  return row ? toStaticPage(row) : undefined;
}

export async function getPageBySlug(group: PageGroup, slug: string): Promise<StaticPage | undefined> {
  const row = (await one("SELECT * FROM pages WHERE page_group = ? AND slug = ?", [group, slug])) as
    | PageRow
    | undefined;
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
  (await run(`INSERT INTO pages (id, page_group, slug, nav_label, title, body, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.id,
    input.group,
    input.slug,
    input.navLabel,
    input.title,
    input.body,
    input.sortOrder,
    input.createdAt,
    input.createdAt]));
  return (await getPageById(input.id))!;
}

export async function updatePage(
  id: string,
  input: { slug: string; navLabel: string; title: string; body: string; sortOrder: number; updatedAt: string },
): Promise<StaticPage | undefined> {
  (await run("UPDATE pages SET slug = ?, nav_label = ?, title = ?, body = ?, sort_order = ?, updated_at = ? WHERE id = ?", [input.slug, input.navLabel, input.title, input.body, input.sortOrder, input.updatedAt, id]));
  return await getPageById(id);
}

export async function deletePage(id: string): Promise<void> {
  (await run("DELETE FROM pages WHERE id = ?", [id]));
}

async function getSiteContent<T>(page: string, fallback: T): Promise<T> {
  const row = (await one("SELECT data FROM site_content WHERE page = ?", [page])) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as T) : fallback;
}

async function saveSiteContent<T>(page: string, data: T): Promise<T> {
  (await run(`INSERT INTO site_content (page, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(page) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`, [page, JSON.stringify(data), new Date().toISOString()]));
  return data;
}

export async function getVenueContent(): Promise<VenueContent> {
  const stored = await getSiteContent<Partial<VenueContent> | null>("venue", null);
  if (!stored) return DEFAULT_VENUE_CONTENT;
  return { ...DEFAULT_VENUE_CONTENT, ...stored };
}

export async function saveVenueContent(data: VenueContent): Promise<VenueContent> {
  return await saveSiteContent("venue", data);
}

export async function getGuideContent(): Promise<GuideContent> {
  return await getSiteContent<GuideContent>("guide", DEFAULT_GUIDE_CONTENT);
}

export async function saveGuideContent(data: GuideContent): Promise<GuideContent> {
  return await saveSiteContent("guide", data);
}

export async function getHomeContent(): Promise<HomeContent> {
  const stored = await getSiteContent<Partial<HomeContent> | null>("home", null);
  if (!stored) return DEFAULT_HOME_CONTENT;
  return { ...DEFAULT_HOME_CONTENT, ...stored };
}

export async function saveHomeContent(data: HomeContent): Promise<HomeContent> {
  return await saveSiteContent("home", data);
}

// ---------------------------------------------------------------------------
// 기능정의서(내부 기획 문서) — 마스터 관리자 전용
// ---------------------------------------------------------------------------

export async function getFeatureSpecSheet(key: FeatureSpecSheetKey): Promise<FeatureSpecRow[]> {
  const row = (await one("SELECT data FROM feature_spec_sheets WHERE sheet_key = ?", [key])) as
    | { data: string }
    | undefined;
  return row ? (JSON.parse(row.data) as FeatureSpecRow[]) : (FEATURE_SPEC_SEED[key] ?? []);
}

export async function getAllFeatureSpecSheets(): Promise<Record<FeatureSpecSheetKey, FeatureSpecRow[]>> {
  const result = {} as Record<FeatureSpecSheetKey, FeatureSpecRow[]>;
  for (const key of FEATURE_SPEC_SHEET_KEYS) {
    result[key] = await getFeatureSpecSheet(key);
  }
  return result;
}

export async function saveFeatureSpecSheet(key: FeatureSpecSheetKey, rows: FeatureSpecRow[]): Promise<FeatureSpecRow[]> {
  (await run(`INSERT INTO feature_spec_sheets (sheet_key, data, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(sheet_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`, [key, JSON.stringify(rows), new Date().toISOString()]));
  return rows;
}
