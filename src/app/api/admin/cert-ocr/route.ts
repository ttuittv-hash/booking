import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findCompanyById, saveCertOcrResult } from "@/lib/db";
import { checkBusinessCert, isBusinessCertOcrConfigured } from "@/lib/businessCertOcr";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

/**
 * 사업자등록증 첨부파일 판독·대조 (운영자 심사 화면에서 실행).
 *
 * 저장된 결과는 심사 화면(서버 컴포넌트)이 직접 읽으므로 여기엔 실행(POST)만 둔다.
 * 외부 호출이라 비용·시간이 들어 운영자가 눌렀을 때만 돈다.
 *
 * 대조 기준값은 클라이언트가 보내는 게 아니라 서버가 회사 행에서 읽는다 —
 * 화면이 보낸 값을 믿으면 "무엇과 대조했는지"를 신뢰할 수 없다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "운영자 로그인이 필요합니다." }, { status: 401 });
  }

  if (!isBusinessCertOcrConfigured()) {
    return NextResponse.json(
      { error: "판독 기능이 설정되지 않았습니다. (ANTHROPIC_API_KEY 미설정)" },
      { status: 503 },
    );
  }

  // 외부 호출이 붙어 있어 누르는 만큼 비용이 난다. 운영자 계정 기준으로 막는다.
  // (프로세스 메모리가 아니라 rate_limits 테이블 — pod 가 여럿이다.)
  if (!(await rateLimit(`cert-ocr:${user.id}:${clientIpFrom(request)}`, 30, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "판독 요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    companyId?: unknown;
    fileUrl?: unknown;
  } | null;
  const companyId = typeof body?.companyId === "string" ? body.companyId : "";
  const fileUrl = typeof body?.fileUrl === "string" ? body.fileUrl : "";
  if (!companyId || !fileUrl) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const company = await findCompanyById(companyId);
  if (!company) return NextResponse.json({ error: "회사를 찾을 수 없습니다." }, { status: 404 });

  const result = await checkBusinessCert(fileUrl, {
    businessNumber: company.businessRegistrationNumber ?? "",
    companyName: company.name,
    representativeName: company.representativeName ?? "",
  });

  // 실패(ERROR)는 남기지 않는다 — 다음에 눌렀을 때 다시 시도해야 한다.
  if (result.status !== "ERROR") {
    await saveCertOcrResult(fileUrl, result.status, result, user.id);
  }

  return NextResponse.json({ result, checkedByName: user.name, checkedAt: result.checkedAt });
}
