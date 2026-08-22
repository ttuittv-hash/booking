import { NextResponse } from "next/server";
import { findCompanyById } from "@/lib/db";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

// 불러오기로 선택한 회사의 기업정보를 돌려준다 (기획서 A5 — 자동 입력 · 읽기 전용).
//
// 검색 목록에서는 사업자번호를 가리고 주소도 시/군/구까지만 보여준다. 여기서는
// "그 회사로 합류 신청하겠다"고 고른 뒤라 가입서에 채워 넣을 값이 필요하다.
// 대신 id 를 알아야 하고(검색을 거쳐야 얻는다), 승인 완료된 회사만 응답하며,
// 호출 수를 제한해 목록을 훑는 데 쓰지 못하게 한다.
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`company-profile:${ip}`, 20, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { id } = await context.params;
  const company = await findCompanyById(id);
  if (!company || company.status !== "APPROVED") {
    return NextResponse.json({ error: "회사를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
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
