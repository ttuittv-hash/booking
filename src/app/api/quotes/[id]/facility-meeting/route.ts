import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import {
  addAuditLog,
  ensureFacilityMeeting,
  getQuoteById,
  getTicketOpenByQuoteId,
  setFacilityMeetingDate,
} from "@/lib/db";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  // [보안 2026-09-18] 등급까지 본다 — 화면은 requireProAdminPage() 로 일반관리자(BASIC)를
  // 막는데 이 API 는 role 만 봐서, 콘텐츠 권한만 있는 운영자가 직접 호출할 수 있었다.
  if (!isProAdminOrAbove(user)) {
    return NextResponse.json({ error: "프로 관리자 이상만 시설 회의 자료를 다룰 수 있습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  const ticketOpen = await getTicketOpenByQuoteId(id);
  if (!ticketOpen?.openDate) {
    return NextResponse.json({ error: "티켓오픈 등록 후 등록할 수 있습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const meetingDate = typeof body?.meetingDate === "string" ? body.meetingDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    return NextResponse.json({ error: "시설회의일을 선택하세요." }, { status: 400 });
  }

  await ensureFacilityMeeting(id, new Date().toISOString());
  const facilityMeeting = await setFacilityMeetingDate(id, meetingDate);
  await addAuditLog({
    id: crypto.randomUUID(),
    quoteId: id,
    stage: "FACILITY_MEETING_SET",
    snapshot: facilityMeeting,
    actorId: user.id,
    createdAt: new Date().toISOString(),
  });
  return NextResponse.json({ facilityMeeting });
}
