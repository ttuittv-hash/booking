import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { listCompanyMembers } from "@/lib/db";

// 회사 소속 담당자 목록 (운영자 화면에서 회사를 펼칠 때 불러온다).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }
  const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
  if (!companyId) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const members = await listCompanyMembers(companyId);
  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      username: m.username,
      email: m.email,
      phone: m.phone,
      companyRole: m.companyRole,
      approvalStatus: m.approvalStatus,
      createdAt: m.createdAt,
    })),
  });
}
