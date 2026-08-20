import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { createNotification, findUserById, setUserApprovalStatus } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action === "approve" ? "approve" : body?.action === "reject" ? "reject" : null;
  if (!id || !action) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const target = await findUserById(id);
  if (!target || target.role !== "APPLICANT") {
    return NextResponse.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await setUserApprovalStatus(id, action === "approve" ? "APPROVED" : "REJECTED");

  await createNotification({
    id: crypto.randomUUID(),
    recipientId: id,
    quoteId: "",
    message:
      action === "approve"
        ? "가입이 승인되었습니다. 이제 대관료 열람과 신청서 작성을 이용하실 수 있습니다."
        : "가입이 승인되지 않았습니다. 자세한 사항은 운영자에게 문의해주세요.",
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({ user: updated });
}
