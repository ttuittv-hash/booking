import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { findUserByEmail, promoteUserToAdmin, setUserPhone } from "@/lib/db";
import type { AdminTier } from "@/lib/pricing/types";

const VALID_TIERS: AdminTier[] = ["BASIC", "PRO", "MASTER"];

// 이미 가입된 계정(신청자든 운영자든)을 이메일로 찾아 운영자로 전환/승급한다.
// Render 환경변수(MASTER_ADMIN_EMAILS) 없이도 마스터 관리자가 화면에서 바로 할 수 있게 한다.
export async function POST(request: Request) {
  const user = await requireMasterAdmin();
  if (!user) {
    return NextResponse.json({ error: "마스터 관리자만 운영자로 승급할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const tier = body?.tier as AdminTier | undefined;
  // [신규 2026-09-02] 운영자 앞으로 나가는 알림톡은 휴대폰 번호로 발송된다. 시드로 만든
  // 운영자 계정에는 번호가 없어 여기서 채워 넣을 수 있게 한다. 비우면 기존 번호를 그대로 둔다.
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";

  if (!email) {
    return NextResponse.json({ error: "이메일을 입력하세요." }, { status: 400 });
  }
  if (!tier || !VALID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "올바르지 않은 등급입니다." }, { status: 400 });
  }

  const target = await findUserByEmail(email);
  if (!target) {
    return NextResponse.json(
      { error: "그 이메일로 가입된 계정을 찾을 수 없습니다. 먼저 회원가입이 되어 있어야 합니다." },
      { status: 404 },
    );
  }

  if (phone && phone.replace(/\D/g, "").length < 9) {
    return NextResponse.json({ error: "휴대폰 번호 형식을 확인해주세요." }, { status: 400 });
  }

  const promoted = await promoteUserToAdmin(target.id, tier);
  if (phone) await setUserPhone(target.id, phone);
  return NextResponse.json({ user: phone ? { ...promoted, phone } : promoted });
}
