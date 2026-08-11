import { NextResponse } from "next/server";
import { listCompanies } from "@/lib/db";

// 회원가입(개인회원)에서 소속 회사를 선택할 때 쓰는 공개 목록 — 회사명만 노출한다.
export async function GET() {
  const companies = (await listCompanies()).map((c) => ({ id: c.id, name: c.name }));
  return NextResponse.json({ companies });
}
