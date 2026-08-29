import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { dispatchMessageInBackground } from "@/lib/message/dispatch";
import {
  companyHasApprovedMember,
  ensureCompanyMaster,
  findUserById,
  setCompanyStatus,
  setUserApprovalStatus,
} from "@/lib/db";
import { revalidateMemberViews } from "@/lib/revalidateAdmin";

// 가입 승인/반려.
//
// 승인 주체가 둘이다(기획서 1-42):
//   - 회사의 첫 승인 건은 운영자 전담. 진위확인 결과를 보고 판단해야 하고, 애초에 그 회사엔
//     아직 대표 담당자가 없어 승인해 줄 사람도 없다.
//   - 이후 가입자(기존 회사 합류)는 운영자와 그 회사 대표 양쪽 큐에 뜨고, 먼저 처리한 쪽이 확정된다.
//
// [개정 2026-08-28] "회사의 첫 건"을 target.companyRole === 'MASTER' 로 판정하던 걸
// **그 회사에 승인 완료된 담당자가 아직 없는가**로 바꿨다. 대표는 가입 시점이 아니라
// 첫 승인이 정하므로(joinCompanyAsStaff 주석 참고), 심사 전에는 아무도 MASTER 가 아니다.
//
// 먼저 처리한 쪽이 확정되므로 이미 처리된 건에 다시 들어오면 409 로 되돌린다 —
// 두 사람이 동시에 열어 두고 각각 승인/반려를 누르는 상황이 실제로 생긴다.
export async function POST(request: Request) {
  const actor = await getCurrentUser();
  if (!actor) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  const action = body?.action === "approve" ? "approve" : body?.action === "reject" ? "reject" : null;
  // MB-03 의 필수 변수. 사유 없이 반려하면 빈 값이 그대로 발송되므로 여기서 막는다(기획서 B2).
  const rejectReason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!id || !action) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const target = await findUserById(id);
  if (!target || target.role !== "APPLICANT") {
    return NextResponse.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
  }

  // 그 회사의 첫 승인 결정인가 — 본인을 빼고 승인 완료된 담당자가 아직 없으면 그렇다.
  const isFirstDecision = target.companyId
    ? !(await companyHasApprovedMember(target.companyId, target.id))
    : false;
  const isAdmin = actor.role === "ADMIN";

  if (!isAdmin) {
    // 대표가 처리할 수 있는 건 자기 회사의 합류 신청뿐이다.
    const actorIsMaster = actor.role === "APPLICANT" && actor.companyRole === "MASTER";
    const sameCompany = !!actor.companyId && actor.companyId === target.companyId;
    if (!actorIsMaster || !sameCompany) {
      return NextResponse.json({ error: "승인 권한이 없습니다." }, { status: 403 });
    }
    if (isFirstDecision) {
      return NextResponse.json(
        { error: "회사의 첫 가입 승인은 운영자가 처리합니다." },
        { status: 403 },
      );
    }
    if (actor.approvalStatus !== "APPROVED") {
      return NextResponse.json(
        { error: "본인 계정이 승인된 뒤에 처리할 수 있습니다." },
        { status: 403 },
      );
    }
  }

  // 이미 다른 쪽에서 처리한 건이면 되돌린다(운영자·마스터 동시 처리 방지).
  if (target.approvalStatus !== "PENDING") {
    return NextResponse.json(
      {
        error:
          target.approvalStatus === "APPROVED"
            ? "이미 승인 처리된 신청입니다."
            : "이미 미승인 처리된 신청입니다.",
        approvalStatus: target.approvalStatus,
      },
      { status: 409 },
    );
  }

  if (action === "reject" && !rejectReason) {
    return NextResponse.json(
      { error: "반려 사유를 입력해주세요. 신청자에게 그대로 안내됩니다." },
      { status: 400 },
    );
  }

  const approved = action === "approve";
  // 처리자를 남긴다 — 운영자와 대표 담당자 둘 다 승인할 수 있어, 나중에 "누가 승인했나"를
  // 되짚으려면 여기서 박아 두는 수밖에 없다(회원 승인은 audit_logs 대상이 아니다).
  const updated = await setUserApprovalStatus(id, approved ? "APPROVED" : "REJECTED", actor.id);

  // 회사의 첫 심사 결과가 그대로 회사의 상태가 된다(기획서 1-37).
  // 이후 가입자의 반려는 그 사람만의 문제라 회사 상태를 건드리지 않는다.
  if (isFirstDecision && target.companyId) {
    await setCompanyStatus(target.companyId, approved ? "APPROVED" : "REJECTED");
  }
  if (target.companyId) {
    // 대표 담당자는 여기서 정해진다 — 회사에 대표가 없으면 방금 승인된 사람(= 승인 완료된
    // 담당자 중 가장 먼저 가입한 사람)이 대표가 된다. 반대로 대표가 반려·승인취소되면
    // 자격을 잃고 내려오며, 남은 승인 계정이 있으면 그 자리를 잇는다.
    await ensureCompanyMaster(target.companyId);
  }

  // MB-02 가입 승인 / MB-03 가입 반려
  dispatchMessageInBackground({
    templateCode: approved ? "MB-02" : "MB-03",
    idempotencyKey: `${approved ? "MB-02" : "MB-03"}:${id}`,
    recipient: { userId: id, phone: target.phone, email: target.email, name: target.name },
    variables: approved ? { 신청자명: target.name } : { 신청자명: target.name, 거절사유: rejectReason },
    request,
  });

  // 승인·반려는 회사 상태와 대표 담당자까지 바꾼다(위 setCompanyStatus·ensureCompanyMaster).
  // 화면 쪽 router.refresh() 는 보고 있던 탭만 새로 받으므로 여기서 전부 무효화한다.
  revalidateMemberViews();

  return NextResponse.json({ user: updated, processedBy: isAdmin ? "ADMIN" : "MASTER" });
}
