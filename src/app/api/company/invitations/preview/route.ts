import { NextResponse } from "next/server";
import { findCompanyById, findValidInvitation } from "@/lib/db";
import { hashInviteToken, maskInvitePhone } from "@/lib/invitation";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 초대 링크로 연 회원가입 화면이 회사 정보를 미리 채우기 위해 부른다(2026-08-28).
//
// 토큰을 쥔 사람에게만 답한다 — 초대받은 본인이거나, 링크를 전달받은 사람이다. 어차피
// 그 회사로 합류하게 될 사람이고, 예전 전용 수락 화면도 회사명을 보여줬다.
// 다만 회사를 훑는 데 쓰이지 않도록 호출 수를 제한하고, 사업자등록증 같은 서류는 주지 않는다.
export async function GET(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`invite-preview:${ip}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const token = new URL(request.url).searchParams.get("token") ?? "";
  const invitation = token ? await findValidInvitation(hashInviteToken(token)) : undefined;
  if (!invitation) {
    // 만료·취소·오타를 구분해 알려 주지 않는다 — 유효한 토큰인지 떠보는 데 쓰이지 않게.
    return NextResponse.json(
      { state: "INVALID", message: "초대 링크가 만료되었거나 이미 사용되었습니다. 대표 담당자에게 재발송을 요청해주세요." },
      { status: 200 },
    );
  }

  const company = await findCompanyById(invitation.companyId);
  if (!company) {
    return NextResponse.json({ state: "INVALID", message: "초대한 회사를 찾을 수 없습니다." }, { status: 200 });
  }

  return NextResponse.json({
    state: "OK",
    // 번호는 가운데를 가려 준다(2026-09-02) — 링크를 쥔 사람에게 "어느 번호로
    // 인증해야 하는지"는 알려 주되 번호 전체는 주지 않는다. 실제 대조는 서버가 한다.
    invitee: {
      email: invitation.email,
      name: invitation.inviteeName,
      phoneMasked: maskInvitePhone(invitation.phone),
    },
    company: {
      id: company.id,
      name: company.name,
      businessRegistrationNumber: company.businessRegistrationNumber,
      representativeName: company.representativeName,
      postalCode: company.postalCode,
      address: company.address,
      companyPhone: company.companyPhone,
      companyFax: company.companyFax,
      corporateNumber: company.corporateNumber,
      companyType: company.companyType,
    },
  });
}
