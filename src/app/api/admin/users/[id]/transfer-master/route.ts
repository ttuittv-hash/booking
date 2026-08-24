import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { listUsers, transferMasterAdmin } from "@/lib/db";

/**
 * 마스터 관리자 권한 이관 — 대상 계정을 마스터로 올리고, 이관을 실행한 본인은
 * 프로 관리자로 내린다(2026-08-24, "마스터 관리자가 권한을 이관하는것도 추가해").
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const master = await requireMasterAdmin();
  if (!master) {
    return NextResponse.json({ error: "마스터 관리자만 권한을 이관할 수 있습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (id === master.id) {
    return NextResponse.json({ error: "자기 자신에게는 이관할 수 없습니다." }, { status: 400 });
  }

  const admins = await listUsers({ role: "ADMIN" });
  const target = admins.find((a) => a.id === id);
  if (!target) {
    return NextResponse.json({ error: "운영자 계정을 찾을 수 없습니다." }, { status: 404 });
  }

  const updated = await transferMasterAdmin(master.id, id);
  return NextResponse.json({ user: updated });
}
