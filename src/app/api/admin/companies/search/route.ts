import { NextResponse } from "next/server";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import { listCompaniesPaged } from "@/lib/db";

// 대표자 뱃지 미공개 설정용 "회사 찾기"(2026-09-11) — /api/companies/search 와 달리
// 운영자 전용이라 승인 여부와 무관하게 등록된 모든 회사를 대상으로 하고, 사업자등록번호도
// 마스킹하지 않는다(운영자는 이미 회사 목록·상세를 볼 수 있는 권한이 있다).
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user || !isProAdminOrAbove(user)) {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const url = new URL(request.url);
  const keyword = (url.searchParams.get("q") ?? "").trim();
  if (keyword.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const { items } = await listCompaniesPaged({ keyword }, 1, 8);
  return NextResponse.json({
    results: items.map((c) => ({
      id: c.id,
      name: c.name,
      businessRegistrationNumber: c.businessRegistrationNumber,
      status: c.status,
      masterBadgeHidden: c.masterBadgeHidden,
    })),
  });
}
