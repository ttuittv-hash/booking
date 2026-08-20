import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  isCompanyMaster,
  listCompanyMembers,
  removeCompanyMember,
  transferCompanyMaster,
  createNotification,
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
      email: m.email,
      phone: m.phone,
      companyRole: m.companyRole,
      approvalStatus: m.approvalStatus,
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
    const now = new Date().toISOString();
    for (const [rid, msg] of [
      [targetId, "대표 담당자 권한이 이관되었습니다."],
      [user.id, `대표 담당자 권한을 ${target.name}님께 이관했습니다.`],
    ] as const) {
      await createNotification({ id: crypto.randomUUID(), recipientId: rid, quoteId: null, message: msg, createdAt: now });
    }
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
