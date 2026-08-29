import { dispatchMessageInBackground } from "@/lib/message/dispatch";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  ensureCompanyMaster,
  isCompanyMaster,
  listCompanyMembers,
  removeCompanyMember,
  transferCompanyMaster,
  createNotification,
  setUserApprovalStatus,
} from "@/lib/db";
import crypto from "node:crypto";

// 소속 담당자 관리 — 마스터 전용(기획서 A10).
export async function GET() {
  const user = await getCurrentUser();
  if (!user?.companyId) {
    return NextResponse.json({ error: "소속 회사가 없습니다." }, { status: 403 });
  }
  const members = await listCompanyMembers(user.companyId);
  return NextResponse.json({
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      companyName: m.companyName,
      email: m.email,
      phone: m.phone,
      companyRole: m.companyRole,
      approvalStatus: m.approvalStatus,
      // 탈퇴자도 목록에 남긴다 — 화면이 [탈퇴] 로 표시하고 액션에서 빼려면 알아야 한다.
      withdrawnAt: m.withdrawnAt,
      createdAt: m.createdAt,
    })),
    isMaster: isCompanyMaster(user),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user?.companyId || !isCompanyMaster(user)) {
    return NextResponse.json({ error: "대표 담당자만 이용할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const targetId = typeof body?.targetId === "string" ? body.targetId : "";
  if (!targetId) return NextResponse.json({ error: "대상을 선택해주세요." }, { status: 400 });
  if (targetId === user.id) {
    return NextResponse.json({ error: "본인에게는 적용할 수 없습니다." }, { status: 400 });
  }

  const members = await listCompanyMembers(user.companyId);
  const target = members.find((m) => m.id === targetId);
  if (!target) {
    return NextResponse.json({ error: "소속 담당자가 아닙니다." }, { status: 404 });
  }

  if (action === "transfer") {
    // 마스터는 회사당 1명이라 이관 즉시 본인은 일반 담당자가 된다.
    if (target.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "승인 완료된 담당자에게만 이관할 수 있습니다." },
        { status: 400 },
      );
    }
    await transferCompanyMaster(user.companyId, user.id, targetId);
    // MB-09 권한을 받은 사람 / MB-10 넘긴 사람 (카카오 정본 00006·00007)
    dispatchMessageInBackground({
      templateCode: "MB-09",
      idempotencyKey: `MB-09:${targetId}:${Date.now()}`,
      recipient: { userId: targetId, phone: target.phone, email: target.email, name: target.name },
      variables: { 신청자명: target.name },
      request,
    });
    dispatchMessageInBackground({
      templateCode: "MB-10",
      idempotencyKey: `MB-10:${user.id}:${Date.now()}`,
      recipient: { userId: user.id, phone: user.phone, email: user.email, name: user.name },
      variables: { 마스터: user.name, 신청자명: target.name },
      request,
    });
    const now = new Date().toISOString();
    for (const [rid, msg] of [
      [targetId, "대표 담당자 권한이 이관되었습니다."],
      [user.id, `대표 담당자 권한을 ${target.name}님께 이관했습니다.`],
    ] as const) {
      await createNotification({ id: crypto.randomUUID(), recipientId: rid, quoteId: null, message: msg, createdAt: now });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "revoke") {
    // 승인 취소 — 승인 완료 상태를 되돌려 다시 승인 대기로 보낸다. 소속 해제와
    // 달리 회사 소속은 유지된다(2026-08-22, "담당자 초대" 상태값 정리 요청).
    if (target.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "승인 완료된 담당자만 승인을 취소할 수 있습니다." },
        { status: 400 },
      );
    }
    await setUserApprovalStatus(targetId, "PENDING");
    // 대표는 승인 완료된 계정만 될 수 있다 — 승인이 취소된 사람이 대표 표시를 쥐고 있으면
    // 여기서 내려오고, 남은 승인 계정이 있으면 그 자리를 잇는다(2026-08-28).
    await ensureCompanyMaster(user.companyId);
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: targetId,
      quoteId: null,
      message: "승인이 취소되어 다시 승인 대기 상태가 되었습니다. 자세한 사항은 회사 대표 담당자에게 문의해주세요.",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "remove") {
    // 계정을 지우지 않는다 — 그 사람이 낸 신청서·계약 이력이 끊긴다.
    await removeCompanyMember(user.companyId, targetId);
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: targetId,
      quoteId: null,
      message: "소속이 해제되었습니다. 자세한 사항은 회사 대표 담당자에게 문의해주세요.",
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
}
