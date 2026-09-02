import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser, isProAdminOrAbove } from "@/lib/auth";
import { deleteQuoteCascade, getQuoteById } from "@/lib/db";

/**
 * 대관 신청서 삭제 — 운영자 전용 (2026-09-02).
 *
 * 잘못 들어온 건·시험 삼아 넣은 건을 신청 현황에서 지운다. 심사·계약금·계약·정산·첨부·
 * 이력·알림이 함께 사라지는 되돌릴 수 없는 작업이라, 계정 삭제와 같은 선에서 PRO 이상만
 * 허용하고 화면에서 신청번호를 직접 입력받아 한 번 더 확인한다.
 *
 * 첨부 **파일 자체**(DATA_DIR)는 지우지 않는다 — 여러 파드가 같은 볼륨을 보고 있고,
 * 지우다 실패하면 트랜잭션을 되돌릴 수 없다. 참조가 사라진 파일은 주소를 알아야만
 * 닿을 수 있고, 정리는 운영에서 따로 한다.
 */
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isProAdminOrAbove(actor)) {
    return NextResponse.json(
      { error: "PRO 등급 이상 운영자만 삭제할 수 있습니다." },
      { status: 403 },
    );
  }

  const { id } = await context.params;
  const quote = await getQuoteById(id);
  if (!quote) return NextResponse.json({ error: "신청서를 찾을 수 없습니다." }, { status: 404 });

  try {
    const removed = await deleteQuoteCascade(id);
    // 목록·상세·일정(달력 집계)이 모두 이 신청서를 읽는다 — 한 화면만 새로 받으면
    // 다른 탭에서 지운 건이 계속 보인다.
    revalidatePath("/admin");
    revalidatePath("/admin/[id]", "page");
    revalidatePath("/admin/schedule");
    return NextResponse.json({ removed });
  } catch (error) {
    console.error("[admin] 신청서 삭제 실패", id, error);
    return NextResponse.json(
      { error: "삭제하지 못했습니다. 연결된 데이터가 있어 실패했을 수 있습니다." },
      { status: 500 },
    );
  }
}
