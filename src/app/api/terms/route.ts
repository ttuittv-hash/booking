import { NextResponse } from "next/server";
import { termsForClient } from "@/lib/terms";

// 약관 전문과 버전을 내려준다. 화면은 이 응답을 그대로 스크롤 박스에 담는다(기획서 A3).
export async function GET() {
  return NextResponse.json({ terms: termsForClient() });
}
