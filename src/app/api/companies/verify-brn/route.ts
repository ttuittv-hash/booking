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
      title: "인증 실패",
      message: "사업자등록번호 10자리를 정확히 입력해 주세요.",
    });
  }

  // 1) 이미 등록된 회사인지
  const join = await resolveCompanyJoin(brn);
  if (join.kind === "BLOCKED_SUSPENDED") {
    return NextResponse.json({
      state: "BLOCKED",
      title: "인증 실패",
      message: "휴업·폐업으로 확인된 사업자등록번호입니다. 담당자에게 문의해 주세요.",
    });
  }
  if (join.company) {
    // 이미 등록된 회사면 회사정보 불러오기와 똑같이 기업정보를 그대로 채워준다.
    // 사업자번호를 정확히 아는 사람만 여기까지 오고, 어차피 그 회사로 합류하게 된다.
    const c = join.company;
    return NextResponse.json({
      state: "REGISTERED",
      title: "이미 등록된 회사입니다",
      joinKind: join.kind,
      companyName: c.name,
      company: {
        id: c.id,
        name: c.name,
        businessRegistrationNumber: c.businessRegistrationNumber,
        representativeName: c.representativeName,
        postalCode: c.postalCode,
        address: c.address,
        companyPhone: c.companyPhone,
        companyFax: c.companyFax,
        corporateNumber: c.corporateNumber,
        companyType: c.companyType,
      },
      // 회사명을 문구에 끼워 넣지 않는다 — 제목 옆에 이어 붙어 "이미 등록된 회사주식회사
      // ○○"처럼 읽혔고, 어차피 바로 아래 회사명 칸이 그 값으로 채워진다.
      // 평범한 합류는 화면이 고정 안내문을 쓰므로 여기서는 빈 문자열을 준다.
      message:
        join.kind === "JOIN_PENDING"
          ? "이미 심사가 진행 중입니다. 앞선 심사가 끝난 뒤 함께 처리됩니다."
          : join.kind === "REAPPLY_REJECTED"
            ? "이전에 미승인 처리된 회사입니다. 운영자가 다시 심사합니다."
            : "",
    });
  }

  // 2) 국세청 진위확인
  if (!isNiceConfigured()) {
    return NextResponse.json({
      state: "UNCHECKED",
      title: "확인 생략",
      message: "진위확인을 사용할 수 없어 확인 없이 진행됩니다. 운영자 심사에서 확인됩니다.",
    });
  }
  const verification = await checkCompanyNumber(brn);
  if (isBlockedCompanyStatus(verification)) {
    return NextResponse.json({
      state: "BLOCKED",
      title: "인증 실패",
      message: `국세청 조회 결과 ${verification.compStatusLabel} 상태인 사업자등록번호입니다.`,
    });
  }
  if (verification.status === "NOT_FOUND") {
    return NextResponse.json({
      state: "NOT_FOUND",
      title: "인증 실패",
      message: "조회되지 않는 사업자등록번호입니다. 번호를 다시 확인해 주세요.",
    });
  }
  if (verification.status !== "VERIFIED") {
    return NextResponse.json({
      state: "UNCHECKED",
      title: "확인 생략",
      message: verification.message ?? "진위확인을 완료하지 못했습니다. 운영자 심사에서 확인됩니다.",
    });
  }

  // 기업상태가 "정보없음"(코드 0)이면 국세청에 상태가 없다는 뜻이다.
  // 조회 자체는 성공했지만 실재하는 정상 사업자라고 단정할 수 없으므로 완료로 표시하지 않는다.
  // 가입은 막지 않고(외부 조회로 가입을 끊지 않는다는 기존 방침) 운영자 심사로 넘긴다.
  if (!verification.compStatus || verification.compStatus === "0") {
    return NextResponse.json({
      state: "UNCHECKED",
      title: "확인 필요",
      companyName: verification.companyName,
      representativeName: verification.representativeName,
      message: `${verification.companyName ?? "조회된 상호 없음"} — 국세청에 사업자 상태 정보가 없습니다. 운영자 심사에서 확인합니다.`,
    });
  }

  return NextResponse.json({
    state: "VERIFIED",
    title: "인증 완료",
    // 조회된 상호·대표자를 돌려줘 화면에서 그대로 채운다.
    companyName: verification.companyName,
    representativeName: verification.representativeName,
    compStatusLabel: verification.compStatusLabel,
    message: `${verification.companyName ?? ""} (${verification.compStatusLabel ?? ""})`,
  });
}
