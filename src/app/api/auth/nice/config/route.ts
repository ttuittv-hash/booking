import { NextResponse } from "next/server";

// 화면이 "개발용 우회 버튼을 보여줘도 되는가"를 묻는 곳.
// NICE_AUTH_DEV_STUB 이 설정된 환경(개발)에서만 true 다. 운영 매니페스트에는 없다.
export async function GET() {
  return NextResponse.json({ devBypass: Boolean(process.env.NICE_AUTH_DEV_STUB) });
}
