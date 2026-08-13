import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createSession, hashPassword } from "@/lib/auth";
import {
  checkCompanyNumber,
  isBlockedCompanyStatus,
  isNiceConfigured,
  normalizeCompanyName,
} from "@/lib/nice";
import {
  createUser,
  findCompanyById,
  findOrCreateCompany,
  findUserByEmailWithPasswordHash,
  findUserByPhone,
  findUserByUsername,
  notifyAdmins,
  saveCompanyVerification,
  withTransaction,
} from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9_]{3,19}$/;

export async function POST(request: Request) {
  const ip = clientIpFrom(request);
  if (!(await rateLimit(`register:${ip}`, 10, 10 * 60 * 1000))) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const passwordHashInput = typeof body?.passwordHash === "string" ? body.passwordHash.toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const accountType = body?.accountType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORPORATE";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
  const businessRegistrationNumber =
    typeof body?.businessRegistrationNumber === "string" ? body.businessRegistrationNumber.trim() : "";
  const representativeName = typeof body?.representativeName === "string" ? body.representativeName.trim() : "";
  const postalCode = typeof body?.postalCode === "string" ? body.postalCode.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const businessCertUrl = typeof body?.businessCertUrl === "string" ? body.businessCertUrl.trim() : "";
  const businessCertName = typeof body?.businessCertName === "string" ? body.businessCertName.trim() : "";
  const agreedTerms = body?.agreedTerms === true;
  const agreedPrivacy = body?.agreedPrivacy === true;

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "아이디는 영문 소문자/숫자로 시작하는 4~20자여야 합니다." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }
  // 비밀번호는 클라이언트에서 SHA-256으로 해시해 전송한다(길이 검증도 클라이언트에서 수행).
  // 평문 폴백(직접 API 호출)일 때만 서버에서 길이를 검증한다.
  let transportHash = "";
  if (SHA256_HEX_RE.test(passwordHashInput)) {
    transportHash = passwordHashInput;
  } else if (password) {
    if (password.length < 8) {
      return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
    }
    transportHash = sha256Hex(password);
  }
  if (!transportHash) {
    return NextResponse.json({ error: "비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "이름(담당자명)을 입력하세요." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "휴대폰 번호를 입력하세요." }, { status: 400 });
  }
  if (!agreedTerms) {
    return NextResponse.json({ error: "이용약관에 동의해주세요." }, { status: 400 });
  }
  if (!agreedPrivacy) {
    return NextResponse.json({ error: "개인정보 수집·이용에 동의해주세요." }, { status: 400 });
  }
  if (await findUserByUsername(username)) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }
  const existingByEmail = await findUserByEmailWithPasswordHash(email);
  if (existingByEmail) {
    return NextResponse.json(
      {
        error:
          existingByEmail.approvalStatus === "PENDING"
            ? `이미 신청이 접수된 ${existingByEmail.name}님입니다. 운영자 승인을 기다려주세요.`
            : "이미 가입된 이메일입니다.",
      },
      { status: 409 },
    );
  }
  // 승인 대기 중에 이메일만 바꿔 중복으로 재신청하는 것을 막기 위해 전화번호도 함께 확인한다.
  const existingByPhone = await findUserByPhone(phone);
  if (existingByPhone) {
    return NextResponse.json(
      {
        error:
          existingByPhone.approvalStatus === "PENDING"
            ? `이미 신청이 접수된 ${existingByPhone.name}님입니다. 운영자 승인을 기다려주세요.`
            : "이미 가입된 휴대폰 번호입니다.",
      },
      { status: 409 },
    );
  }

  // 법인회원 = 회사를 새로 등록(또는 동일명 회사에 합류).
  // 개인회원 = 목록에서 기존 회사를 선택하거나, 목록에 없으면 이름을 직접 입력(신규 등록)하거나, 소속 회사 없이 가입 가능.
  // 어느 경우든 같은 company_id를 공유하는 사용자끼리 서로의 신청 내역을 함께 관리할 수 있다.
  let company;
  if (accountType === "INDIVIDUAL") {
    if (companyId) {
      company = await findCompanyById(companyId);
      if (!company) {
        return NextResponse.json({ error: "선택한 회사를 찾을 수 없습니다. 목록을 새로고침해주세요." }, { status: 400 });
      }
    } else if (companyName) {
      company = await findOrCreateCompany(companyName);
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
    if (!representativeName) {
      return NextResponse.json({ error: "대표자 성명을 입력하세요." }, { status: 400 });
    }
    if (!postalCode || !address) {
      return NextResponse.json({ error: "우편번호 찾기로 주소를 입력하세요." }, { status: 400 });
    }
    if (!businessCertUrl) {
      return NextResponse.json({ error: "사업자등록증을 첨부하세요." }, { status: 400 });
    }
    // 사업자등록번호 진위·상태 확인(NICE 법인실명확인).
    // 휴업·폐업·부도 업체는 대관 계약 상대로 부적격이므로 가입을 막는다.
    // 미설정이거나 조회에 실패하면 가입은 진행하고 "미확인"으로 남겨 운영자 심사에 넘긴다.
    const verification = await checkCompanyNumber(businessRegistrationNumber);
    if (isBlockedCompanyStatus(verification)) {
      return NextResponse.json(
        { error: `국세청 조회 결과 ${verification.compStatusLabel} 상태인 사업자등록번호입니다. 담당자에게 문의해주세요.` },
        { status: 400 },
      );
    }
    if (isNiceConfigured() && verification.status === "NOT_FOUND") {
      return NextResponse.json(
        { error: "조회되지 않는 사업자등록번호입니다. 번호를 다시 확인해주세요." },
        { status: 400 },
      );
    }

    company = await findOrCreateCompany(companyName, {
      businessRegistrationNumber,
      representativeName,
      postalCode,
      address,
      businessCertUrl,
      businessCertName,
    });

    // 조회된 상호·대표자명이 입력값과 다르면 그대로 기록해 둔다 — 가입은 막지 않고
    // (표기 차이가 흔하다) 운영자 심사 화면에서 확인하도록 한다.
    const mismatches: string[] = [];
    if (
      verification.status === "VERIFIED" &&
      verification.companyName &&
      normalizeCompanyName(verification.companyName) !== normalizeCompanyName(companyName)
    ) {
      mismatches.push(`상호 불일치(등록: ${verification.companyName})`);
    }
    if (
      verification.status === "VERIFIED" &&
      verification.representativeName &&
      verification.representativeName.replace(/\s+/g, "") !== representativeName.replace(/\s+/g, "")
    ) {
      mismatches.push(`대표자 불일치(등록: ${verification.representativeName})`);
    }
    await saveCompanyVerification(company.id, {
      ...verification,
      message: [verification.message, ...mismatches].filter(Boolean).join(" / ") || null,
    });
  }

  const createdAt = new Date().toISOString();
  const passwordHash = await hashPassword(transportHash);

  // 계정 생성과 운영자 알림은 한 묶음이다 — 알림만 실패해 승인 요청이 묻히면 안 된다.
  const user = await withTransaction(async () => {
    const created = await createUser({
      id: crypto.randomUUID(),
      username,
      email,
      phone,
      passwordHash,
      name,
      companyName: company?.name ?? null,
      companyId: company?.id ?? null,
      role: "APPLICANT",
      approvalStatus: "PENDING",
      termsAgreedAt: createdAt,
      privacyAgreedAt: createdAt,
      createdAt,
    });

    await notifyAdmins({
      quoteId: "applicants",
      message: `신규 가입 승인 요청: ${name} (${company?.name ?? "소속 없음"}, ${accountType === "INDIVIDUAL" ? "개인회원" : "법인회원"})`,
      createdAt,
    });

    return created;
  });

  await createSession(user.id, user.role);
  return NextResponse.json({ user });
}
