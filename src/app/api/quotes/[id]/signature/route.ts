import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { canAccessQuote, getCurrentUser } from "@/lib/auth";
import {
  createNotification,
  getQuoteById,
  notifyAdmins,
  signContractAsApplicant,
  signContractAsVenue,
} from "@/lib/db";

// 정식 전자서명 서비스 연동 전까지는, 로그인 사용자가 본인 역할(운영자=공연장 / 신청자=대관사)로
// "날인" 버튼을 누르는 것을 곧 날인으로 간주하는 운영자 수동 확인 방식이다.
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { id } = await ctx.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });
  if (!(await canAccessQuote(user, quote))) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }
  if (!quote.contract) {
    return NextResponse.json({ error: "계약 확정 후 날인할 수 있습니다." }, { status: 409 });
  }

  const now = new Date().toISOString();

  if (user.role === "ADMIN") {
    const signature = await signContractAsVenue(id, user.id, now);
    await createNotification({
      id: crypto.randomUUID(),
      recipientId: quote.applicantId,
      quoteId: id,
      message: `${id} 계약서에 공연장측 날인이 완료되었습니다. 확인 후 날인해주세요.`,
      createdAt: now,
    });
    return NextResponse.json({ signature });
  }

  const signature = await signContractAsApplicant(id, user.id, now);
  await notifyAdmins({
    quoteId: id,
    message: `${id} 계약서에 대관사측 날인이 완료되었습니다.`,
    createdAt: now,
  });
  return NextResponse.json({ signature });
}
