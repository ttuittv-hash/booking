import { NextResponse } from "next/server";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import { deleteUserCascade, findUserById } from "@/lib/db";
import { revalidateMemberViews } from "@/lib/revalidateAdmin";

// 신청자 계정 삭제 — 운영자 전용.
//
// 반려된 계정은 명의(DI)·휴대폰·이메일이 남아 같은 사람이 다시 가입할 수 없다(2026-08-27,
// 팀 가입 테스트 중 "반려시켰더니 재가입이 안 된다"). 탈퇴와 달리 기록째 지워 처음부터
// 다시 가입할 수 있게 한다. 신청서·알림 이력 등 그 사람에게 매인 데이터가 함께 사라지므로
// 화면에서 한 번 더 확인을 받는다.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  // 계정+회사까지 카탈로그 전체를 되돌릴 수 없이 지우는 파괴적 작업이라, 등급/대표이관·심사와
  // 같은 선에서 PRO 이상만 허용한다(BASIC 관리자는 캐스케이드 삭제 불가).
  if (!isProAdminOrAbove(actor)) {
    return NextResponse.json({ error: "PRO 등급 이상 운영자만 삭제할 수 있습니다." }, { status: 403 });
  }

  const { id } = await context.params;
  const target = await findUserById(id);
  if (!target) return NextResponse.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
  if (target.role !== "APPLICANT") {
    return NextResponse.json({ error: "신청자 계정만 삭제할 수 있습니다." }, { status: 400 });
  }

  try {
    const result = await deleteUserCascade(id);
    // 남은 사람이 없으면 회사까지 지워진다 — 회사별 담당자 탭도 같이 무효화해야
    // 지운 회사가 계속 보이지 않는다.
    revalidateMemberViews();
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin] 계정 삭제 실패", id, error);
    return NextResponse.json(
      { error: "삭제하지 못했습니다. 연결된 데이터가 있어 실패했을 수 있습니다." },
      { status: 500 },
    );
  }
}
