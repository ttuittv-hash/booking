import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { runReminderSweep } from "@/lib/reminders";

// 알림 스케줄러 전용 엔드포인트. k8s CronJob 이 하루 한 번 호출한다.
// 외부에 열려 있는 경로이므로 공유 시크릿(CRON_SECRET)을 아는 호출만 통과시킨다.
export async function POST(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "스케줄러가 설정되지 않았습니다." }, { status: 503 });
  }

  const provided = request.headers.get("x-cron-secret") ?? "";
  // 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 확인한다.
  const ok =
    provided.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  if (!ok) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const result = await runReminderSweep();
  console.log(
    `[seoularena] 알림 스케줄러 실행 — 미입금 ${result.invoice}건, 티켓오픈 ${result.ticketOpen}건, 시설회의 ${result.facilityMeeting}건`,
  );
  return NextResponse.json({ ok: true, ...result });
}
