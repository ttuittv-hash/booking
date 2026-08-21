import { NextResponse } from "next/server";
import { getCurrentUser, requireMasterAdmin } from "@/lib/auth";
import { demoteAdminToApplicant, listUsers } from "@/lib/db";

/**
 * 운영자 권한 해제 — 계정을 삭제하지 않고 신청자로 되돌린다.
 * 계정을 지우면 그 사람이 남긴 심사·정산 기록의 작성자가 사라져 이력을 못 읽는다.
 *
 * 두 가지를 막는다.
 *   · 자기 자신은 해제할 수 없다 (스스로 백오피스에서 잠겨 나가는 것)
 *   · 마지막 마스터 관리자는 해제할 수 없다 (등급을 올릴 사람이 아무도 남지 않는다)
 */
export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const master = await requireMasterAdmin();
  if (!master) {
    return NextResponse.json(
      { error: "마스터 관리자만 운영자 권한을 해제할 수 있습니다." },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  const me = await getCurrentUser();
  if (me?.id === id) {
    return NextResponse.json({ error: "자신의 운영자 권한은 해제할 수 없습니다." }, { status: 400 });
  }

  const admins = await listUsers({ role: "ADMIN" });
  const target = admins.find((a) => a.id === id);
  if (!target) {
    return NextResponse.json({ error: "운영자 계정을 찾을 수 없습니다." }, { status: 404 });
  }
  if (target.adminTier === "MASTER" && admins.filter((a) => a.adminTier === "MASTER").length <= 1) {
    return NextResponse.json(
      { error: "마지막 마스터 관리자는 해제할 수 없습니다. 다른 계정을 마스터로 올린 뒤 해제하세요." },
      { status: 400 },
    );
  }

  const updated = await demoteAdminToApplicant(id);
  return NextResponse.json({ user: updated });
}
