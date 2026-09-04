import { NextResponse } from "next/server";
import { getRegisterTermsContent } from "@/lib/db";
import { termsForClient } from "@/lib/terms";

// 약관 전문과 버전을 내려준다. 화면은 이 응답을 그대로 스크롤 박스에 담는다(기획서 A3).
// 본문은 DB(백오피스 [약관 · 정책] → 가입 약관)에서 읽는다 — 예전에는 코드 상수를 그대로
// 내려줘, 백오피스에서 고쳐도 가입 화면이 그대로였다(2026-09-04).
export async function GET() {
  const { documents } = await getRegisterTermsContent();
  return NextResponse.json({ terms: termsForClient(documents) });
}
