import { NextResponse } from "next/server";
import { isNiceAuthConfigured } from "@/lib/niceAuth";
import { dispatchMessage } from "@/lib/message/dispatch";
import { verifyIdentityTicket } from "@/lib/identityTicket";
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
  assignCompanyRoleOnJoin,
  resolveCompanyJoin,
  attachIdentityToUser,
  findCompletedIdentity,
  findUserByDi,
  saveTermsAgreements,
  listUsers,
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
  // 본인인증 티켓 — 인증을 마친 사람만 가입할 수 있다(기획서 A4).
  // 미설정 환경(로컬 등)에서는 인증 단계를 건너뛰므로 티켓이 없어도 진행한다.
  const identityTicket = typeof body?.identityTicket === "string" ? body.identityTicket : "";
  // 약관 동의 스냅샷 — 화면이 보낸 버전·본문 해시를 그대로 기록한다(기획서 1-25).
  const agreements = Array.isArray(body?.agreements) ? body.agreements : [];
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

  // 본인인증 결과 확인. 티켓은 서명돼 있고, 실제 값은 서버가 이력에서 다시 읽는다 —
  // 클라이언트가 보낸 이름·휴대폰을 그대로 믿지 않는다.
  let identity: Awaited<ReturnType<typeof findCompletedIdentity>> = undefined;
  if (isNiceAuthConfigured()) {
    if (!identityTicket) {
      return NextResponse.json({ error: "휴대폰 본인인증을 먼저 진행해주세요." }, { status: 400 });
    }
    const payload = await verifyIdentityTicket(identityTicket);
    if (!payload || payload.purpose !== "REGISTER") {
      return NextResponse.json(
        { error: "본인인증 정보가 만료되었습니다. 다시 인증해주세요." },
        { status: 400 },
      );
    }
    identity = await findCompletedIdentity(payload.verificationId);
    if (!identity || !identity.di) {
      return NextResponse.json(
        { error: "본인인증 결과를 확인할 수 없습니다. 다시 인증해주세요." },
        { status: 400 },
      );
    }
    // 인증 시점 이후에 같은 명의로 가입이 끼어들 수 있으므로 여기서 한 번 더 본다.
    if (await findUserByDi(identity.di)) {
      return NextResponse.json(
        { error: "이미 가입된 명의입니다. 아이디 찾기로 진행해주세요." },
        { status: 409 },
      );
    }
  }

  // 법인회원 = 회사를 새로 등록(또는 동일명 회사에 합류).
  // 개인회원 = 목록에서 기존 회사를 선택하거나, 목록에 없으면 이름을 직접 입력(신규 등록)하거나, 소속 회사 없이 가입 가능.
  // 어느 경우든 같은 company_id를 공유하는 사용자끼리 서로의 신청 내역을 함께 관리할 수 있다.
  let company;
  // 기업회원 가입의 합류 판정 결과 — 가입 완료 응답에 안내 문구로 실린다.
  let joinKind: import("@/lib/db").CompanyJoinKind = "NEW";
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
    // 사업자등록증 첨부는 권장이되 필수는 아니다 — 입력값은 사업자번호 진위확인으로 검증되고,
    // 첨부 여부는 운영자 심사 화면에 그대로 표시돼 판단에 쓰인다.
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

    // 최초 가입자인지 기존 회사 합류인지는 서버가 등록 이력으로 판정한다(기획서 A11).
    // 사용자가 고르게 두면 남의 회사에 붙거나 같은 회사를 둘로 만든다.
    const join = await resolveCompanyJoin(businessRegistrationNumber);
    if (join.kind === "BLOCKED_SUSPENDED") {
      return NextResponse.json(
        { error: "휴업·폐업으로 확인된 사업자등록번호입니다. 담당자에게 문의해주세요." },
        { status: 400 },
      );
    }
    joinKind = join.kind;

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

    // 동의 이력. 선택 약관은 미동의(false)도 남겨야 "물어봤고 거절했다"가 증명된다.
    if (agreements.length > 0) {
      await saveTermsAgreements(
        created.id,
        agreements
          .filter((a: { kind?: unknown; version?: unknown; bodyHash?: unknown }) =>
            typeof a?.kind === "string" && typeof a?.version === "string" && typeof a?.bodyHash === "string",
          )
          .map((a: { kind: string; version: string; bodyHash: string; agreed?: boolean }) => ({
            kind: a.kind,
            version: a.version,
            bodyHash: a.bodyHash,
            agreed: a.agreed === true,
            agreedAt: createdAt,
            requestIp: clientIpFrom(request),
          })),
      );
    }

    // 본인인증 결과(CI/DI)를 계정에 붙인다. 암호문으로 들어가고 DI 는 블라인드 인덱스도 함께 남는다.
    if (identity?.ci && identity.di) {
      await attachIdentityToUser(created.id, {
        ci: identity.ci,
        di: identity.di,
        verifiedAt: createdAt,
      });
      created.identityVerifiedAt = createdAt;
    }

    // 회사에 붙은 계정이면 최초 가입자인지 판정해 MASTER/STAFF 를 정한다.
    if (company) {
      created.companyRole = await assignCompanyRoleOnJoin(created.id, company.id);
    }

    // 최초 가입자는 운영자가 전담하고, 이후 가입자는 그 회사 마스터도 처리할 수 있다(기획서 1-42).
    // 마스터가 부재·지연이어도 운영자가 안전망이므로 운영자 알림은 두 경우 모두 보낸다.
    const joinLabel =
      created.companyRole === "MASTER" ? "회사 신규 등록" : `${company?.name ?? ""} 합류 신청`;
    await notifyAdmins({
      quoteId: "applicants",
      message: `신규 가입 승인 요청: ${name} (${company?.name ?? "소속 없음"}, ${accountType === "INDIVIDUAL" ? "개인회원" : "법인회원"}, ${joinLabel})`,
      createdAt,
    });

    // MB-04 합류 신청 발생 → 그 회사 마스터
    if (company && created.companyRole === "STAFF" && company.masterUserId) {
      await dispatchMessage({
        templateCode: "MB-04",
        idempotencyKey: `MB-04:${created.id}`,
        recipient: { userId: company.masterUserId, phone: null, email: null, name: null },
        variables: { 신청자명: name },
        request,
      });
    }

    return created;
  });

  // MB-01 가입 신청 접수 → 신청자 본인
  await dispatchMessage({
    templateCode: "MB-01",
    idempotencyKey: `MB-01:${user.id}`,
    recipient: { userId: user.id, phone, email, name },
    request,
  });
  // MB-05 회사 신규 등록 → 운영자
  if (company && user.companyRole === "MASTER") {
    for (const admin of await listUsers({ role: "ADMIN" })) {
      await dispatchMessage({
        templateCode: "MB-05",
        idempotencyKey: `MB-05:${company.id}:${admin.id}`,
        recipient: { userId: admin.id, phone: admin.phone, email: admin.email, name: admin.name },
        variables: { 회사명: company.name, 신청자명: name },
        request,
      });
    }
  }

  await createSession(user.id, user.role);
  // 합류 상황에 따라 안내 문구가 달라진다 — "심사 중인 회사"인지 "미승인 이력이 있는 회사"인지
  // 알려주지 않으면 사용자는 왜 대기가 길어지는지 알 수 없다.
  const joinNotice =
    joinKind === "JOIN_PENDING"
      ? "이미 심사가 진행 중인 회사입니다. 앞선 심사가 끝난 뒤 함께 처리됩니다."
      : joinKind === "REAPPLY_REJECTED"
        ? "이전에 미승인 처리된 회사입니다. 운영자가 다시 심사합니다."
        : joinKind === "JOIN_APPROVED"
          ? "등록된 회사에 합류 신청되었습니다. 회사 대표 담당자 또는 운영자가 승인합니다."
          : null;
  return NextResponse.json({ user, joinKind, joinNotice });
}
