import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createNotification, findCompanyById, setCompanyMasterByAdmin } from "@/lib/db";

// 운영자의 대표 담당자 변경 (기획서 A10 — 마스터 부재·퇴사 시 운영자가 안전망).
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  if (body?.action !== "setMaster" || !companyId || !targetId) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const company = await findCompanyById(companyId);
  if (!company) return NextResponse.json({ error: "회사를 찾을 수 없습니다." }, { status: 404 });

  const previousMasterId = company.masterUserId;
  const result = await setCompanyMasterByAdmin(companyId, targetId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  // 바뀐 사실을 양쪽에 알린다 — 권한이 조용히 바뀌면 아무도 모른다.
  const now = new Date().toISOString();
  await createNotification({
    id: crypto.randomUUID(),
    recipientId: targetId,
    quoteId: null,
    link: "/mypage/members",
    message: `${company.name}의 대표 담당자로 지정되었습니다.\n담당자 초대와 합류 승인을 하실 수 있습니다.`,
    createdAt: now,
  });
  if (previousMasterId && previousMasterId !== targetId) {
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: previousMasterId,
      quoteId: null,
      link: "/mypage",
      message: `${company.name}의 대표 담당자가 변경되었습니다.\n이제 소속 담당자로 이용하실 수 있습니다.`,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}
