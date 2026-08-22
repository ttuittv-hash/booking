import { hash as bcryptHash, verify as bcryptVerify } from "@node-rs/bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { findSessionEpoch, findUserById, isUserWithdrawn } from "./db";
import { accountStateOf, canAccess, redirectFor } from "./accessPolicy";
import type { AppUser, Quote, UserRole } from "./pricing/types";

const SESSION_COOKIE = "sa_session";

// 세션 정책 (기획서 A15).
//   유휴 2시간  — 활동이 있으면 연장된다. 자리를 비운 사이 남이 이어 쓰는 것을 막는다.
//   절대 7일    — 아무리 계속 써도 7일이 지나면 다시 로그인해야 한다.
// 쿠키 자체의 만료는 절대 상한에 맞추고, 유휴 만료는 토큰 안의 마지막 활동 시각으로 판단한다.
const IDLE_TIMEOUT_SECONDS = 2 * 60 * 60;
const ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 7;

// 데모/개발 환경 기본 시크릿. 운영 배포 전 반드시 AUTH_SECRET 환경변수로 교체할 것.
const DEV_FALLBACK_SECRET = "seoularena-dev-only-secret-change-me-before-production-32b";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || DEV_FALLBACK_SECRET;
  // 운영 환경에서 AUTH_SECRET 없이 기동하면 세션 위조가 가능해지므로 기동을 막는다.
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET 환경변수가 설정되지 않았습니다. 운영 환경에서는 필수입니다.");
  }
  return new TextEncoder().encode(secret);
}

// 클라이언트가 SHA-256으로 해시해 보낸 값을 bcrypt로 한 번 더 감싸 저장한다
// (v2 스킴 — src/lib/passwordScheme.ts 참고).
//
// 네이티브(Rust) 구현을 비동기로 쓴다. 순수 JS 구현을 동기로 호출하면 bcrypt 계산(50~100ms)
// 동안 이벤트 루프가 막혀 그 서버의 다른 요청까지 전부 대기하게 된다.
// 저장되는 해시 형식은 동일하므로 기존 비밀번호는 그대로 검증된다.
const BCRYPT_COST = 10;

export function hashPassword(passwordSha256: string): Promise<string> {
  return bcryptHash(passwordSha256, BCRYPT_COST);
}

export function verifyPassword(passwordSha256: string, hash: string): Promise<boolean> {
  return bcryptVerify(passwordSha256, hash);
}

interface SessionPayload {
  [key: string]: unknown;
  sub: string;
  role: UserRole;
  /** 최초 로그인 시각(초). 절대 상한 판정에 쓴다 — 연장돼도 이 값은 바뀌지 않는다. */
  lif: number;
  /** 마지막 활동 시각(초). 유휴 판정에 쓴다. */
  lat: number;
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    // 쿠키·토큰의 만료는 절대 상한에 맞춘다. 유휴 만료는 lat 으로 따로 판정한다.
    .setExpirationTime(payload.lif + ABSOLUTE_TTL_SECONDS)
    .sign(getSecretKey());
}

export type SessionExpiry = "IDLE" | "ABSOLUTE" | null;

async function verifySession(
  token: string,
): Promise<{ payload: SessionPayload | null; expired: SessionExpiry }> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return { payload: null, expired: null };
    }
    const now = Math.floor(Date.now() / 1000);
    const lif = typeof payload.lif === "number" ? payload.lif : now;
    const lat = typeof payload.lat === "number" ? payload.lat : now;

    if (now - lif > ABSOLUTE_TTL_SECONDS) return { payload: null, expired: "ABSOLUTE" };
    if (now - lat > IDLE_TIMEOUT_SECONDS) return { payload: null, expired: "IDLE" };

    return {
      payload: { sub: payload.sub, role: payload.role as UserRole, lif, lat },
      expired: null,
    };
  } catch {
    // 서명 불일치이거나 절대 만료가 지난 토큰이다.
    return { payload: null, expired: "ABSOLUTE" };
  }
}

/*
  세션 쿠키의 Domain.

  운영자는 partner.* 에서 로그인한 채 "운영자 백오피스"를 눌러 bo.* 로 넘어간다.
  Domain 없이 host 전용 쿠키를 구우면 bo.* 에는 세션이 없어 다시 로그인해야 한다.
  bo./partner. 를 뗀 부모 도메인(dev.seoularena.net / seoularena.net)으로 구워
  두 호스트가 세션을 공유하게 한다. localhost 같은 단일 호스트에서는 붙이지 않는다.
*/
function sessionCookieDomain(host: string | null): string | undefined {
  if (!host) return undefined;
  const bare = host.split(":")[0];
  const m = /^(?:bo|partner)\.(.+)$/.exec(bare);
  if (!m || !m[1].includes(".")) return undefined;
  return m[1];
}

async function cookieDomainFromRequest(): Promise<string | undefined> {
  const h = await headers();
  return sessionCookieDomain(h.get("x-forwarded-host") ?? h.get("host"));
}

/** Route Handler / Server Function 안에서만 호출 가능 (쿠키 쓰기) */
export async function createSession(userId: string, role: UserRole) {
  const now = Math.floor(Date.now() / 1000);
  const token = await signSession({ sub: userId, role, lif: now, lat: now });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: await cookieDomainFromRequest(),
    maxAge: ABSOLUTE_TTL_SECONDS,
  });
}

/**
 * 활동이 있었으니 유휴 시계를 되감는다(절대 상한은 그대로 둔다).
 * 쿠키 쓰기가 가능한 곳(Route Handler·Server Action)에서만 호출할 수 있다.
 */
export async function touchSession(session: { sub: string; role: UserRole; lif: number }) {
  const now = Math.floor(Date.now() / 1000);
  const token = await signSession({ sub: session.sub, role: session.role, lif: session.lif, lat: now });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: await cookieDomainFromRequest(),
    // 쿠키 수명은 최초 로그인 기준 절대 상한까지만 남긴다.
    maxAge: Math.max(0, session.lif + ABSOLUTE_TTL_SECONDS - now),
  });
}

/**
 * 세션 쿠키를 지운다 — 응답에 직접 Set-Cookie 를 싣는다.
 *
 * cookies() API 로는 안 된다: 같은 이름은 하나만 내보내서, Domain 붙인 삭제와
 * host 전용 삭제를 둘 다 걸면 뒤의 것이 앞의 것을 덮는다. 실제로 그렇게 배포됐고
 * Domain 없는 삭제만 나가 도메인 쿠키가 살아남았다 — "로그아웃이 안 된다"는
 * 신고가 이것이다. 두 변형(도메인 공유 쿠키 + 공유 이전의 host 전용 쿠키)을
 * 각각의 Set-Cookie 헤더로 내보내야 한다.
 */
export async function appendSessionClear(response: Response): Promise<void> {
  const expired = [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    "Max-Age=0",
    "HttpOnly",
    "SameSite=Lax",
    ...(process.env.NODE_ENV === "production" ? ["Secure"] : []),
  ].join("; ");
  response.headers.append("Set-Cookie", expired);
  const domain = await cookieDomainFromRequest();
  if (domain) response.headers.append("Set-Cookie", `${expired}; Domain=${domain}`);
}

/** Server Component/Route Handler 어디서든 호출 가능 (쿠키 읽기 전용) */
export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { payload } = await verifySession(token);
  if (!payload) return null;
  if (await isUserWithdrawn(payload.sub)) return null;
  // 비밀번호 변경·탈퇴 이후 발급된 토큰만 유효하다.
  const epoch = await findSessionEpoch(payload.sub);
  if (epoch && payload.lif * 1000 < Date.parse(epoch)) return null;
  const user = await findUserById(payload.sub);
  return user ?? null;
}

/** 현재 세션의 원시 값 — 유휴 연장(touchSession)에 필요하다. */
export async function getSessionRaw(): Promise<{ sub: string; role: UserRole; lif: number } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { payload } = await verifySession(token);
  return payload ? { sub: payload.sub, role: payload.role, lif: payload.lif } : null;
}

/** 왜 끊겼는지 구분한다 — 화면에서 "유휴로 종료" 와 "기간 만료" 안내를 다르게 하기 위함. */
export async function getSessionExpiry(): Promise<SessionExpiry> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return (await verifySession(token)).expired;
}

// 마스터 관리자 전용 화면/API에서 사용. role=ADMIN이면서 adminTier=MASTER인 계정만 통과시킨다.
export function isMasterAdmin(user: AppUser | null): boolean {
  return !!user && user.role === "ADMIN" && user.adminTier === "MASTER";
}

// 심사(승인/보류/거절) 등 프로 관리자 이상만 할 수 있는 동작에 사용.
// 일반관리자(BASIC)는 심사 권한이 없다(2026-08-22 정정 — "일반 관리자는 심사 못해").
export function isProAdminOrAbove(user: AppUser | null): boolean {
  return !!user && user.role === "ADMIN" && (user.adminTier === "PRO" || user.adminTier === "MASTER");
}

export async function requireMasterAdmin(): Promise<AppUser | null> {
  const user = await getCurrentUser();
  return isMasterAdmin(user) ? user : null;
}

/**
 * 접근권한 매트릭스(기획서 A15)를 한 곳에서 적용한다.
 * 페이지마다 조건을 따로 쓰면 표와 어긋나기 시작한다 — 규칙은 accessPolicy.ts 한 곳에만 둔다.
 *
 * 미들웨어에서 처리하지 않는 이유: 승인 상태는 DB 를 봐야 알 수 있는데
 * 미들웨어(edge)에서는 DB 에 붙을 수 없다. 세션 토큰에 넣어두면 운영자가 승인한 뒤에도
 * 재로그인 전까지 옛 상태로 남는다.
 */
export async function requireAccess(pathname: string): Promise<AppUser | null> {
  const user = await getCurrentUser();
  const state = accountStateOf(user);
  if (!canAccess(pathname, state)) {
    redirect(redirectFor(state, pathname));
  }
  return user;
}

/**
 * 비로그인이 막히는 경로 전용 requireAccess.
 * 통과했다면 매트릭스상 반드시 로그인 상태이므로, 호출부가 매번 null 을 풀지 않아도 된다.
 */
export async function requireAccessedUser(pathname: string): Promise<AppUser> {
  const user = await requireAccess(pathname);
  // 매트릭스상 도달하지 않는다(GUEST 는 위에서 막힌다). 타입을 좁히려고 남겨 둔다.
  if (!user) redirect("/login");
  return user;
}

// 승인 대기·거절 상태의 신청자(대관사) 계정 여부 — 대관 안내/신청 관련 화면 접근 제한에 사용
export function isPendingApplicant(user: AppUser): boolean {
  return user.role === "APPLICANT" && user.approvalStatus !== "APPROVED";
}

// 신청서 열람/관리 권한 — 운영자, 본인, 또는 같은 회사(기획사) 소속 실무자까지 허용
export async function canAccessQuote(user: AppUser, quote: Quote): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  if (quote.applicantId === user.id) return true;
  if (!user.companyId) return false;
  const applicant = await findUserById(quote.applicantId);
  return applicant?.companyId === user.companyId;
}
