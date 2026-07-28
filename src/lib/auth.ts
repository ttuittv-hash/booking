import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { findUserById } from "./db";
import type { AppUser, UserRole } from "./pricing/types";

const SESSION_COOKIE = "sa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7일

// 데모/개발 환경 기본 시크릿. 운영 배포 전 반드시 AUTH_SECRET 환경변수로 교체할 것.
const DEV_FALLBACK_SECRET = "seoularena-dev-only-secret-change-me-before-production-32b";

function getSecretKey() {
  const secret = process.env.AUTH_SECRET || DEV_FALLBACK_SECRET;
  return new TextEncoder().encode(secret);
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
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
  const user = findUserById(session.sub);
  return user ?? null;
}

export async function requireRole(role: UserRole): Promise<AppUser | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== role) return null;
  return user;
}
