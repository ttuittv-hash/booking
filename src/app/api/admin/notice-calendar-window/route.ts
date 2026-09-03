import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getNoticeCalendarWindow, saveNoticeCalendarWindow } from "@/lib/db";
import { normalizeDay, normalizeMonth, type NoticeCalendarWindow } from "@/lib/content/noticeCalendarWindow";

// 공지 캘린더 노출 월 설정 — 운영자 전용(/api/admin/* 는 인증 없이 열어 두면
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

  const next: NoticeCalendarWindow = {
    enabled: body?.enabled === true,
    startMonth: normalizeMonth(body?.startMonth),
    endMonth: normalizeMonth(body?.endMonth),
    endDay: normalizeDay(body?.endDay),
  };

  // 첫 달이 마지막 달보다 뒤면 볼 수 있는 달이 하나도 없다 — 저장은 되지만 캘린더가
  // 한 달도 안 열리므로, 저장 전에 막아 원인을 바로 알려 준다.
  if (next.enabled && next.startMonth && next.endMonth && next.startMonth > next.endMonth) {
    return NextResponse.json(
      { error: "시작 달이 종료 달보다 뒤입니다. 범위를 다시 확인해 주세요." },
      { status: 400 },
    );
  }

  return NextResponse.json({ window: await saveNoticeCalendarWindow(next) });
}
