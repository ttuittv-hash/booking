import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createNotification, findCompanyById, findUserById, setCompanyMasterByAdmin } from "@/lib/db";
import { dispatchMessageInBackground } from "@/lib/message/dispatch";
import { revalidateMemberViews } from "@/lib/revalidateAdmin";

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

  // MB-09 새 대표 / MB-10 이전 대표 — 알림톡(카카오 정본 00006·00007)
  {
    const next = await findUserById(targetId);
    const prev = previousMasterId && previousMasterId !== targetId ? await findUserById(previousMasterId) : null;
    if (next) {
      dispatchMessageInBackground({
        templateCode: "MB-09",
        idempotencyKey: `MB-09:${targetId}:${Date.now()}`,
        recipient: { userId: next.id, phone: next.phone, email: next.email, name: next.name },
        variables: { 신청자명: next.name },
        request,
      });
    }
    if (prev) {
      dispatchMessageInBackground({
        templateCode: "MB-10",
        idempotencyKey: `MB-10:${prev.id}:${Date.now()}`,
        recipient: { userId: prev.id, phone: prev.phone, email: prev.email, name: prev.name },
        variables: { 마스터: prev.name, 신청자명: next?.name ?? "" },
        request,
      });
    }
  }

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

  // 대표가 바뀌면 회사별 담당자 목록의 '대표 담당자' 칸도 바뀐다.
  revalidateMemberViews();

  return NextResponse.json({ ok: true });
}
