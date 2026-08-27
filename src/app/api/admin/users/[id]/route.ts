import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { deleteUserCascade, findUserById } from "@/lib/db";

// 신청자 계정 삭제 — 운영자 전용.
//
// 반려된 계정은 명의(DI)·휴대폰·이메일이 남아 같은 사람이 다시 가입할 수 없다(2026-08-27,
// 팀 가입 테스트 중 "반려시켰더니 재가입이 안 된다"). 탈퇴와 달리 기록째 지워 처음부터
// 다시 가입할 수 있게 한다. 신청서·알림 이력 등 그 사람에게 매인 데이터가 함께 사라지므로
// 화면에서 한 번 더 확인을 받는다.
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "운영자만 삭제할 수 있습니다." }, { status: 403 });

  const { id } = await context.params;
  const target = await findUserById(id);
  if (!target) return NextResponse.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
  if (target.role !== "APPLICANT") {
    return NextResponse.json({ error: "신청자 계정만 삭제할 수 있습니다." }, { status: 400 });
  }

  try {
    const result = await deleteUserCascade(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[admin] 계정 삭제 실패", id, error);
    return NextResponse.json(
      { error: "삭제하지 못했습니다. 연결된 데이터가 있어 실패했을 수 있습니다." },
      { status: 500 },
    );
  }
}
