import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { recordAnalyticsEvent, type AnalyticsEventType } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 트래픽 지표 수집 (2026-08-27) — 리포트 화면의 페이지뷰 · UV · 대관신청 버튼 클릭수.
//
// 외부 분석 도구를 붙이지 않는다. 대관사 명단과 신청 동선이 그대로 드러나는 화면들이라
// 방문 기록을 밖으로 내보내지 않는 편이 낫고, 지표도 이 정도면 충분하다.
//
// 저장하는 것: 이벤트 종류 · 경로 · 방문자 쿠키값 · (로그인 상태면) 계정 id.
// 저장하지 않는 것: IP · User-Agent · 리퍼러. 방문자 쿠키값은 개인을 식별하려는 값이
// 아니라 "같은 브라우저의 재방문"을 묶기 위한 난수다.

const VISITOR_COOKIE = "arena_vid";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1년

const VALID_TYPES: AnalyticsEventType[] = ["PAGE_VIEW", "APPLY_CLICK"];

/** 저장할 경로만 남긴다 — 쿼리스트링에는 토큰·검색어가 섞여 들어온다. */
function safePath(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/")) return null;
  const path = raw.split(/[?#]/)[0];
  return path.length > 0 && path.length <= 500 ? path : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const eventType = VALID_TYPES.includes(body?.type as AnalyticsEventType)
    ? (body.type as AnalyticsEventType)
    : null;
  const path = safePath(body?.path);
  if (!eventType || !path) {
    // 수집 실패가 화면 동작에 영향을 주면 안 되므로 본문 없이 조용히 받아넘긴다.
    return new NextResponse(null, { status: 204 });
  }

  // 한 브라우저가 초당 수백 건을 밀어 넣어 지표를 부풀리지 못하게 막는다. 통상적인
  // 열람(분당 수십 페이지)은 걸리지 않는 느슨한 한도다.
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`analytics:${ip}`, 300, 10 * 60 * 1000))) {
    return new NextResponse(null, { status: 204 });
  }

  const jar = await cookies();
  let visitorId = jar.get(VISITOR_COOKIE)?.value;
  let isNewVisitor = false;
  // 쿠키가 위조·조작돼도 지표만 흔들릴 뿐 권한과는 무관하다. 길이만 확인해 거른다.
  if (!visitorId || visitorId.length < 8 || visitorId.length > 64) {
    visitorId = crypto.randomUUID();
    isNewVisitor = true;
  }

  const user = await getCurrentUser();
  await recordAnalyticsEvent({
    id: crypto.randomUUID(),
    eventType,
    path,
    visitorId,
    userId: user?.id ?? null,
    createdAt: new Date().toISOString(),
  });

  const res = new NextResponse(null, { status: 204 });
  if (isNewVisitor) {
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_MAX_AGE,
    });
  }
  return res;
}
