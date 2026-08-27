import { NextResponse } from "next/server";
import { listCompanies } from "@/lib/db";

// 회원가입(개인회원)에서 소속 회사를 선택할 때 쓰는 공개 목록 — 회사명만 노출한다.
export async function GET() {
  // 심사 중·반려된 회사까지 열거되면 존재 자체가 새어 나간다 — 승인된 회사만(2026-08-28 보안 점검).
  const companies = (await listCompanies())
    .filter((c) => c.status === "APPROVED")
    .map((c) => ({ id: c.id, name: c.name }));
  return NextResponse.json({ companies });
}
