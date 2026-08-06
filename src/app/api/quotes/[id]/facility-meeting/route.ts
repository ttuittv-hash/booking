import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
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

  const { id } = await ctx.params;
  const quote = getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  const ticketOpen = getTicketOpenByQuoteId(id);
  if (!ticketOpen?.openDate) {
    return NextResponse.json({ error: "티켓오픈 등록 후 등록할 수 있습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const meetingDate = typeof body?.meetingDate === "string" ? body.meetingDate : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    return NextResponse.json({ error: "시설회의일을 선택하세요." }, { status: 400 });
  }

  ensureFacilityMeeting(id, new Date().toISOString());
  const facilityMeeting = setFacilityMeetingDate(id, meetingDate);
  return NextResponse.json({ facilityMeeting });
}
