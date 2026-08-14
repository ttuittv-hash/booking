import { hash as bcryptHash, verify as bcryptVerify } from "@node-rs/bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { findUserById, isUserWithdrawn } from "./db";
import type { AppUser, Quote, UserRole } from "./pricing/types";

const SESSION_COOKIE = "sa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7일

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
}

async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { sub: payload.sub, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

/** Route Handler / Server Function 안에서만 호출 가능 (쿠키 쓰기) */
export async function createSession(userId: string, role: UserRole) {
  const token = await signSession({ sub: userId, role });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Route Handler / Server Function 안에서만 호출 가능 (쿠키 쓰기) */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Server Component/Route Handler 어디서든 호출 가능 (쿠키 읽기 전용) */
export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  if (await isUserWithdrawn(session.sub)) return null;
  const user = await findUserById(session.sub);
  return user ?? null;
}

// 마스터 관리자 전용 화면/API에서 사용. role=ADMIN이면서 adminTier=MASTER인 계정만 통과시킨다.
export function isMasterAdmin(user: AppUser | null): boolean {
  return !!user && user.role === "ADMIN" && user.adminTier === "MASTER";
}

export async function requireMasterAdmin(): Promise<AppUser | null> {
  const user = await getCurrentUser();
  return isMasterAdmin(user) ? user : null;
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
