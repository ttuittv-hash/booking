import { NextResponse } from "next/server";
import { normalizeBusinessNumber, resolveCompanyJoin } from "@/lib/db";
import { checkCompanyNumber, isBlockedCompanyStatus, isNiceConfigured } from "@/lib/nice";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 사업자등록번호 중복확인 + 진위확인 (기획서 A5 · 1-34).
//
// 두 가지를 한 번에 답한다:
//   1) 이미 등록된 번호인가 → 그 회사로 합류하는 흐름으로 넘긴다
//   2) 국세청에 실재하는 번호인가 → 휴·폐업이면 여기서 막는다
//
// 가입 제출 시점에도 서버가 다시 확인한다. 이 API 는 사용자가 먼저 알 수 있게 하는 용도지
// 검증의 최종 관문이 아니다.
export async function POST(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`verify-brn:${ip}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "확인 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const raw = typeof body?.businessRegistrationNumber === "string" ? body.businessRegistrationNumber : "";
  const brn = normalizeBusinessNumber(raw);
  if (!brn || brn.length !== 10) {
    return NextResponse.json({
      state: "INVALID",
      message: "사업자등록번호 10자리를 정확히 입력해 주세요.",
    });
  }

  // 1) 이미 등록된 회사인지
  const join = await resolveCompanyJoin(brn);
  if (join.kind === "BLOCKED_SUSPENDED") {
    return NextResponse.json({
      state: "BLOCKED",
      message: "휴업·폐업으로 확인된 사업자등록번호입니다. 담당자에게 문의해 주세요.",
    });
  }
  if (join.company) {
    return NextResponse.json({
      state: "REGISTERED",
      companyName: join.company.name,
      joinKind: join.kind,
      message:
        join.kind === "JOIN_PENDING"
          ? `이미 심사가 진행 중인 회사입니다. (${join.company.name})`
          : join.kind === "REAPPLY_REJECTED"
            ? `이전에 미승인 처리된 회사입니다. (${join.company.name})`
            : `이미 등록된 회사입니다. '${join.company.name}'(으)로 합류 신청됩니다.`,
    });
  }

  // 2) 국세청 진위확인
  if (!isNiceConfigured()) {
    return NextResponse.json({
      state: "UNCHECKED",
      message: "진위확인을 사용할 수 없어 확인 없이 진행됩니다.",
    });
  }
  const verification = await checkCompanyNumber(brn);
  if (isBlockedCompanyStatus(verification)) {
    return NextResponse.json({
      state: "BLOCKED",
      message: `국세청 조회 결과 ${verification.compStatusLabel} 상태인 사업자등록번호입니다.`,
    });
  }
  if (verification.status === "NOT_FOUND") {
    return NextResponse.json({
      state: "NOT_FOUND",
      message: "조회되지 않는 사업자등록번호입니다. 번호를 다시 확인해 주세요.",
    });
  }
  if (verification.status !== "VERIFIED") {
    return NextResponse.json({
      state: "UNCHECKED",
      message: verification.message ?? "진위확인을 완료하지 못했습니다. 운영자 심사에서 확인됩니다.",
    });
  }

  return NextResponse.json({
    state: "VERIFIED",
    // 조회된 상호·대표자를 돌려줘 입력값과 맞춰볼 수 있게 한다.
    companyName: verification.companyName,
    representativeName: verification.representativeName,
    compStatusLabel: verification.compStatusLabel,
    message: `국세청 조회 완료 — ${verification.companyName ?? ""} (${verification.compStatusLabel ?? ""})`,
  });
}
