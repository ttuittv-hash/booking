import { NextResponse } from "next/server";
import { requireMasterAdmin } from "@/lib/auth";
import { demoteAdminToApplicant } from "@/lib/db";
import { revalidateMemberViews } from "@/lib/revalidateAdmin";

/**
 * 운영자 권한 해제 — 계정은 남기고 신청자로 되돌린다 (2026-09-03).
 *
 * 예전에는 화면의 [권한 해제] 가 계정 삭제 라우트(DELETE)를 불렀는데, 그 라우트는
 * 신청자만 받아 「신청자 계정만 삭제할 수 있습니다」로 되돌아왔다 — 눌러도 아무 일도
 * 일어나지 않는 버튼이었다. 해제와 삭제는 결과가 다르므로 라우트를 나눈다.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await requireMasterAdmin();
  if (!actor) {
    return NextResponse.json(
      { error: "마스터 관리자만 운영자 권한을 해제할 수 있습니다." },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  // 자기 권한을 스스로 내리면 그 즉시 이 화면을 잃는다 — 되돌릴 사람이 자기뿐일 수 있다.
  if (id === actor.id) {
    return NextResponse.json({ error: "자기 계정은 해제할 수 없습니다." }, { status: 400 });
  }

  try {
    const updated = await demoteAdminToApplicant(id);
    revalidateMemberViews();
    return NextResponse.json({ user: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "권한을 해제하지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
