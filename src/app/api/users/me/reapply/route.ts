import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  findCompanyById,
  findCompanyMaster,
  notifyAdmins,
  setUserApprovalStatus,
} from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";
import { revalidateMemberViews } from "@/lib/revalidateAdmin";

/**
 * 재심사 요청 (2026-09-02).
 *
 * 반려된 사람은 지금까지 아무것도 할 수 없었다 — 사유를 다시 볼 방법도, 정보를 고쳐
 * 다시 봐 달라고 할 방법도, 탈퇴할 방법도 없어서 운영자가 기록을 직접 지워 줘야 했다.
 *
 * 여기서는 상태만 되돌린다(REJECTED → PENDING). 반려 사유는 setUserApprovalStatus 가
 * 함께 지운다 — 다시 심사를 기다리는 사람의 화면에 옛 사유가 남아 있으면 안 된다.
 * 실제 재심사는 운영자(첫 건) 또는 회사 대표가 기존 승인 화면에서 그대로 한다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (user.role !== "APPLICANT") {
    return NextResponse.json({ error: "신청자 계정만 요청할 수 있습니다." }, { status: 403 });
  }
  if (user.approvalStatus !== "REJECTED") {
    return NextResponse.json(
      { error: "반려된 계정만 재심사를 요청할 수 있습니다." },
      { status: 400 },
    );
  }
  if (user.withdrawnAt) {
    return NextResponse.json({ error: "탈퇴한 계정입니다." }, { status: 400 });
  }

  // 눌러 두고 계속 누르면 운영자 알림이 쌓인다. 사람 단위로 막는다
  // (카운터는 rate_limits 테이블 — pod 가 여러 개라 프로세스 메모리에 두면 안 된다).
  if (!(await rateLimit(`reapply:${user.id}`, 3, 24 * 60 * 60 * 1000))) {
    return NextResponse.json(
      { error: "재심사 요청은 하루 3회까지 가능합니다. 자세한 사항은 운영자에게 문의해주세요." },
      { status: 429 },
    );
  }
  // 아이디 기준이 실질 방어다. IP 는 보조로만 본다.
  if (!(await rateLimit(`reapply-ip:${clientIpFrom(request)}`, 20, 24 * 60 * 60 * 1000))) {
    return NextResponse.json({ error: "요청이 너무 많습니다." }, { status: 429 });
  }

  const updated = await setUserApprovalStatus(user.id, "PENDING", null, null);

  const company = user.companyId ? await findCompanyById(user.companyId) : null;
  const master = company ? await findCompanyMaster(company.id) : undefined;
  // 회사의 첫 건은 운영자가 전담하고 이후 가입자는 대표도 처리한다 — 가입 때와 같은 규칙이라
  // 알림도 같은 곳으로 보낸다. 대표가 부재·지연이어도 운영자가 안전망이다.
  await notifyAdmins({
    quoteId: "applicants",
    message: `재심사 요청: ${user.name} (${company?.name ?? "소속 없음"}${master ? `, ${company?.name ?? ""} 합류 신청` : ", 회사 신규 등록"})`,
    createdAt: new Date().toISOString(),
  });

  // 승인 대기 목록에 다시 떠야 한다 — 운영자 화면은 캐시를 타므로 여기서 무효화한다.
  revalidateMemberViews();

  return NextResponse.json({ ok: true, approvalStatus: updated.approvalStatus });
}
