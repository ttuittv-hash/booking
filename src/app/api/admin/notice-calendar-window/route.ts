import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNoticeCalendarWindow, saveNoticeCalendarWindow } from "@/lib/db";
import {
  DEFAULT_NOTICE_CALENDAR_WINDOW,
  normalizeWindowMoment,
  type NoticeCalendarWindow,
} from "@/lib/content/noticeCalendarWindow";

// 공지 캘린더 공개 기간 설정 — 운영자 전용(/api/admin/* 는 인증 없이 열어 두면
// 외부에서 덮어쓸 수 있다, 2026-08-28 점검).
async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  return NextResponse.json({ window: await getNoticeCalendarWindow() });
}

export async function PUT(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const text = (value: unknown, fallback: string) =>
    typeof value === "string" ? value.slice(0, 300) : fallback;

  const next: NoticeCalendarWindow = {
    enabled: body?.enabled === true,
    startAt: normalizeWindowMoment(body?.startAt),
    endAt: normalizeWindowMoment(body?.endAt),
    beforeMessage: text(body?.beforeMessage, DEFAULT_NOTICE_CALENDAR_WINDOW.beforeMessage),
    afterMessage: text(body?.afterMessage, DEFAULT_NOTICE_CALENDAR_WINDOW.afterMessage),
  };

  // 시작이 종료보다 뒤면 어떤 순간에도 열리지 않는다 — 저장은 되지만 화면에서는
  // 캘린더가 영영 안 보이므로, 저장 전에 막아 원인을 바로 알려 준다.
  if (next.enabled && next.startAt && next.endAt && next.startAt > next.endAt) {
    return NextResponse.json(
      { error: "공개 시작이 종료보다 늦습니다. 기간을 다시 확인해 주세요." },
      { status: 400 },
    );
  }

  return NextResponse.json({ window: await saveNoticeCalendarWindow(next) });
}
