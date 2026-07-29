import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSession, hashPassword } from "@/lib/auth";
import { createUser, findCompanyById, findOrCreateCompany, findUserByEmailWithPasswordHash, notifyAdmins } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const accountType = body?.accountType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORPORATE";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
  const businessRegistrationNumber =
    typeof body?.businessRegistrationNumber === "string" ? body.businessRegistrationNumber.trim() : "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "이름(담당자명)을 입력하세요." }, { status: 400 });
  }
  if (findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  // 법인회원 = 회사를 새로 등록(또는 동일명 회사에 합류), 개인회원 = 이미 등록된 회사 중에서 선택해 연결.
  // 두 경우 모두 최종적으로 같은 company_id를 공유하는 사용자끼리 서로의 신청 내역을 함께 관리할 수 있다.
  let company;
  if (accountType === "INDIVIDUAL") {
    if (!companyId) {
      return NextResponse.json({ error: "소속된 회사/기획사를 선택하세요." }, { status: 400 });
    }
    company = findCompanyById(companyId);
    if (!company) {
      return NextResponse.json({ error: "선택한 회사를 찾을 수 없습니다. 목록을 새로고침해주세요." }, { status: 400 });
    }
  } else {
    if (!companyName) {
      return NextResponse.json({ error: "회사/기획사명을 입력하세요." }, { status: 400 });
    }
    if (!/^\d{3}-?\d{2}-?\d{5}$/.test(businessRegistrationNumber)) {
      return NextResponse.json(
        { error: "사업자등록번호를 올바른 형식(10자리 숫자)으로 입력하세요." },
        { status: 400 },
      );
    }
    company = findOrCreateCompany(companyName, businessRegistrationNumber);
  }

  const createdAt = new Date().toISOString();
  const user = createUser({
    id: crypto.randomUUID(),
    email,
    passwordHash: hashPassword(password),
    name,
    companyName: company.name,
    companyId: company.id,
    role: "APPLICANT",
    approvalStatus: "PENDING",
    createdAt,
  });

  notifyAdmins({
    quoteId: "applicants",
    message: `신규 가입 승인 요청: ${name} (${company.name}, ${accountType === "INDIVIDUAL" ? "개인회원" : "법인회원"})`,
    createdAt,
  });

  await createSession(user.id, user.role);
  return NextResponse.json({ user });
}
