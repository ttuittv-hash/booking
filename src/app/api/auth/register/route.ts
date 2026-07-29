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
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
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
  if (!phone) {
    return NextResponse.json({ error: "휴대폰 번호를 입력하세요." }, { status: 400 });
  }
  if (findUserByEmailWithPasswordHash(email)) {
    return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
  }

  // 법인회원 = 회사를 새로 등록(또는 동일명 회사에 합류).
  // 개인회원 = 목록에서 기존 회사를 선택하거나, 목록에 없으면 이름을 직접 입력(신규 등록)하거나, 소속 회사 없이 가입 가능.
  // 어느 경우든 같은 company_id를 공유하는 사용자끼리 서로의 신청 내역을 함께 관리할 수 있다.
  let company;
  if (accountType === "INDIVIDUAL") {
    if (companyId) {
      company = findCompanyById(companyId);
      if (!company) {
        return NextResponse.json({ error: "선택한 회사를 찾을 수 없습니다. 목록을 새로고침해주세요." }, { status: 400 });
      }
    } else if (companyName) {
      company = findOrCreateCompany(companyName);
    } else {
      company = null;
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
    phone,
    passwordHash: hashPassword(password),
    name,
    companyName: company?.name ?? null,
    companyId: company?.id ?? null,
    role: "APPLICANT",
    approvalStatus: "PENDING",
    createdAt,
  });

  notifyAdmins({
    quoteId: "applicants",
    message: `신규 가입 승인 요청: ${name} (${company?.name ?? "소속 없음"}, ${accountType === "INDIVIDUAL" ? "개인회원" : "법인회원"})`,
    createdAt,
  });

  await createSession(user.id, user.role);
  return NextResponse.json({ user });
}
