import { NextResponse } from "next/server";
import { isNiceAuthConfigured } from "@/lib/niceAuth";
import { dispatchMessageInBackground } from "@/lib/message/dispatch";
import { verifyIdentityTicket } from "@/lib/identityTicket";
import { USERNAME_HINT, USERNAME_RE } from "@/lib/validation";
import {
  hashInviteToken,
  inviteEmailMatches,
  inviteNameMatches,
  invitePhoneMatches,
  maskInvitePhone,
} from "@/lib/invitation";
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
  joinCompanyAsStaff,
  resolveCompanyJoin,
  attachIdentityToUser,
  findCompletedIdentity,
  findUserByDi,
  freeRejectedIdentity,
  saveTermsAgreements,
  listUsers,
  findUserByEmailWithPasswordHash,
  findUserByPhone,
  findUserByUsername,
  notifyAdmins,
  saveCompanyVerification,
  withTransaction,
  findUserById,
  findCompanyMaster,
  findValidInvitation,
  findPendingInvitationByEmail,
  consumeInvitation,
} from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";
import { clientIpFrom, rateLimit } from "@/lib/rateLimit";
import { APPLICANT_COMPANY_TYPE_LABEL, type ApplicantCompanyType } from "@/lib/pricing/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 규칙은 src/lib/validation.ts 한 곳에만 둔다 — 예전에는 여기와 중복확인 API 가
// 서로 다른 정규식을 써서, 중복확인은 통과하는데 가입에서 거부되는 조합이 있었다.

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
  let phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const accountType = body?.accountType === "INDIVIDUAL" ? "INDIVIDUAL" : "CORPORATE";
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const companyId = typeof body?.companyId === "string" ? body.companyId.trim() : "";
  // 초대 링크로 들어온 경우에만 실린다. 회사를 정하고, 본인인증 번호 대조의 기준이 된다.
  const inviteToken = typeof body?.inviteToken === "string" ? body.inviteToken.trim() : "";
  const businessRegistrationNumber =
    typeof body?.businessRegistrationNumber === "string" ? body.businessRegistrationNumber.trim() : "";
  const representativeName = typeof body?.representativeName === "string" ? body.representativeName.trim() : "";
  const companyType =
    typeof body?.companyType === "string" &&
    (Object.keys(APPLICANT_COMPANY_TYPE_LABEL) as string[]).includes(body.companyType)
      ? (body.companyType as ApplicantCompanyType)
      : null;
  const companyPhone = typeof body?.companyPhone === "string" ? body.companyPhone.trim() : "";
  const companyFax = typeof body?.companyFax === "string" ? body.companyFax.trim() : "";
  const corporateNumber = typeof body?.corporateNumber === "string" ? body.corporateNumber.trim() : "";
  const postalCode = typeof body?.postalCode === "string" ? body.postalCode.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  const businessCertUrl = typeof body?.businessCertUrl === "string" ? body.businessCertUrl.trim() : "";
  const businessCertName = typeof body?.businessCertName === "string" ? body.businessCertName.trim() : "";
  // 재직증명서(선택) — 사업자등록증과 달리 회사가 아닌 가입자 개인 소속 증빙이라 users에 저장한다.
  const employmentCertUrl = typeof body?.employmentCertUrl === "string" ? body.employmentCertUrl.trim() : "";
  // 첨부 URL 은 우리가 발급한 업로드 주소만 받는다 — 임의 링크가 심사 화면에 그대로 걸리면
  // 운영자를 향한 피싱 링크가 된다(2026-08-28 보안 점검).
  const ATTACHMENT_URL_RE = /^\/api\/auth\/register\/attachment\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;
  for (const url of [businessCertUrl, employmentCertUrl]) {
    if (url && !ATTACHMENT_URL_RE.test(url)) {
      return NextResponse.json({ error: "첨부 파일 주소가 올바르지 않습니다. 다시 업로드해주세요." }, { status: 400 });
    }
  }
  const employmentCertName = typeof body?.employmentCertName === "string" ? body.employmentCertName.trim() : "";
  // 본인인증 티켓 — 인증을 마친 사람만 가입할 수 있다(기획서 A4).
  // 미설정 환경(로컬 등)에서는 인증 단계를 건너뛰므로 티켓이 없어도 진행한다.
  const identityTicket = typeof body?.identityTicket === "string" ? body.identityTicket : "";
  // 약관 동의 스냅샷 — 화면이 보낸 버전·본문 해시를 그대로 기록한다(기획서 1-25).
  const agreements = Array.isArray(body?.agreements) ? body.agreements : [];
  const agreedTerms = body?.agreedTerms === true;
  const agreedPrivacy = body?.agreedPrivacy === true;

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: `아이디는 ${USERNAME_HINT}이어야 합니다.` },
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
  // 운영자가 반려(REJECTED)한 신청자는 재가입할 수 있어야 한다(R5) — 막는 대신 예전
  // 반려 계정의 이메일·아이디 자리를 비우고 계속 진행한다. 계정 자체(및 이력)는 남는다.
  const existingByEmail = await findUserByEmailWithPasswordHash(email);
  if (existingByEmail) {
    if (existingByEmail.approvalStatus === "REJECTED") {
      await freeRejectedIdentity(existingByEmail.id);
    } else {
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
  }
  // 승인 대기 중에 이메일만 바꿔 중복으로 재신청하는 것을 막기 위해 전화번호도 함께 확인한다.
  const existingByPhone = await findUserByPhone(phone);
  if (existingByPhone) {
    if (existingByPhone.approvalStatus === "REJECTED") {
      await freeRejectedIdentity(existingByPhone.id);
    } else {
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
    // 본인인증으로 확인된 번호를 쓴다 — 화면 입력값을 그대로 저장하면 남의 번호로 알림톡을 보낼 수 있다
    // (2026-08-28 보안 점검). 인증 결과에 번호가 없을 때만 입력값을 쓴다.
    if (identity?.mobileNo) phone = identity.mobileNo.replace(/\D/g, "");
    if (!identity || !identity.di) {
      return NextResponse.json(
        { error: "본인인증 결과를 확인할 수 없습니다. 다시 인증해주세요." },
        { status: 400 },
      );
    }
    // 인증 시점 이후에 같은 명의로 가입이 끼어들 수 있으므로 여기서 한 번 더 본다.
    // 반려된 계정이면 이메일·휴대폰과 같은 규칙으로 자리를 비워 주고 계속 진행한다 —
    // di_index 는 유니크라 비우지 않으면 INSERT 자체가 실패한다.
    // role !== "ADMIN" — 운영자 계정은 공개 가입으로 만들어지는 게 아니라 이 대조에서
    // 뺀다. 서울아레나 직원이 운영자 계정을 가진 채로 같은 명의로 일반 신청자 계정도
    // 가입할 수 있어야 하는데, 원래 신청자였다가 운영자로 승격된 계정이면 di_index 가
    // 남아 있어 여기 걸렸다(휴대폰 중복확인과 같은 이유, 2026-09-04).
    const existingByDi = await findUserByDi(identity.di);
    if (existingByDi && existingByDi.role !== "ADMIN") {
      if (existingByDi.approvalStatus === "REJECTED") {
        await freeRejectedIdentity(existingByDi.id);
      } else {
        return NextResponse.json(
          { error: "이미 가입된 명의입니다. 아이디 찾기로 진행해주세요." },
          { status: 409 },
        );
      }
    }
  }

  /*
    초대 링크 가입 (2026-08-28, 마일스 의견 / 2026-09-02 개정).

    대표 담당자가 이미 "이 번호의 이 사람"을 지목해 부른 것이므로, 운영자·대표가 다시
    심사하지 않고 바로 승인한다. 다만 링크는 전달되다 새어 나갈 수 있으므로 **본인인증한
    휴대폰 번호와 가입 이메일이 초대장과 같을 때만** 그 특권을 준다.

    [개정 2026-09-02] 어긋나면 가입 자체를 막는다.

    예전에는 초대장만 무시하고 평범한 합류 신청으로 흘려보냈다. 그런데 그러면
      · 다른 번호로 인증해도 가입이 되고,
      · 다른 이메일로 가입하면 초대장이 소진되지 않아 담당자 관리 목록에 같은 사람이
        "초대 발송(미가입)" 행과 가입자 행으로 두 줄 남았다(대표가 직접 지워야 했다).
    링크를 잘못 받은 사람은 초대 링크가 아니라 /register 로 들어오면 되므로,
    안내에 그 경로를 적어 준다.
  */
  const invitation = inviteToken ? await findValidInvitation(hashInviteToken(inviteToken)) : undefined;

  if (inviteToken) {
    // 토큰이 있는데 살아 있는 초대장이 아니다 — 만료·취소·이미 사용됐거나, 재발송으로
    // 무효가 된 이전 링크다. 여기서 막지 않으면 옛 링크로도 가입이 되어 "재발송하면
    // 이전 링크는 못 쓴다"가 지켜지지 않는다.
    if (!invitation) {
      return NextResponse.json(
        {
          error:
            "초대 링크가 만료되었거나 이미 사용되었습니다. 대표 담당자에게 재발송을 요청해주세요.",
        },
        { status: 400 },
      );
    }
    // 대조 규칙은 invitation.ts 한 곳에 있다(테스트로 고정). 본인인증을 쓰지 않는
    // 환경에서는 identity 가 없어 항상 불일치 — 인증 없이 번호만 맞춰 적으면 통과하는
    // 문이 되어서는 안 된다.
    if (!invitePhoneMatches(identity?.mobileNo, invitation.phone)) {
      return NextResponse.json(
        {
          error: `초대장을 받은 휴대폰 번호(${maskInvitePhone(invitation.phone)})로 본인인증해 주세요. 다른 번호로 가입하시려면 초대 링크가 아닌 회원가입 페이지에서 진행해주세요.`,
        },
        { status: 400 },
      );
    }
    if (!inviteEmailMatches(email, invitation.email)) {
      return NextResponse.json(
        {
          error: `초대장을 받은 이메일(${invitation.email})로 가입해 주세요. 다른 이메일로 가입하시려면 초대 링크가 아닌 회원가입 페이지에서 진행해주세요.`,
        },
        { status: 400 },
      );
    }
    // 링크는 전달된다 — 초대받은 1 이 2 에게 넘기면 2 가 가입할 수 있었다.
    // 이름은 본인인증 결과라 신청자가 바꿀 수 없어, 번호·이메일과 함께 보면
    // "링크를 받은 그 사람인가"를 가장 확실하게 가른다.
    if (!inviteNameMatches(identity?.name ?? name, invitation.inviteeName)) {
      return NextResponse.json(
        {
          error: `초대장에 적힌 이름과 본인인증한 이름이 다릅니다. 초대받은 본인만 이 링크로 가입할 수 있습니다. 이름이 잘못 적혔다면 대표 담당자에게 초대 재발송을 요청해주세요.`,
        },
        { status: 400 },
      );
    }
  }

  // 여기까지 왔으면 초대장이 있는 경우 번호·이메일이 모두 맞은 것이다.
  const invitePhoneMatched = !!invitation;

  // 법인회원 = 회사를 새로 등록(또는 동일명 회사에 합류).
  // 개인회원 = 목록에서 기존 회사를 선택하거나, 목록에 없으면 이름을 직접 입력(신규 등록)하거나, 소속 회사 없이 가입 가능.
  // 어느 경우든 같은 company_id를 공유하는 사용자끼리 서로의 신청 내역을 함께 관리할 수 있다.
  let company;
  // 기업회원 가입의 합류 판정 결과 — 가입 완료 응답에 안내 문구로 실린다.
  let joinKind: import("@/lib/db").CompanyJoinKind = "NEW";
  if (invitePhoneMatched && invitation) {
    // 초대장이 회사를 정한다. 그 회사는 초대를 보낼 때 이미 등록·확인이 끝난 상태라
    // 사업자번호 중복확인·진위확인을 다시 묻지 않는다(기획서 A5 와 같은 이유).
    company = await findCompanyById(invitation.companyId);
    if (!company) {
      return NextResponse.json(
        { error: "초대한 회사를 찾을 수 없습니다. 대표 담당자에게 문의해주세요." },
        { status: 400 },
      );
    }
    joinKind = "JOIN_APPROVED";
    // 사업자등록증은 묻지 않는다 — 회사는 초대장이 정했고 등록증은 이미 회사 행에 있다.
    // 재직증명서는 받는다: 심사를 건너뛰는 경로일수록 "이 사람이 그 회사 소속"이라는
    // 근거를 남겨 둬야 나중에 되짚을 수 있다.
    if (!employmentCertUrl) {
      return NextResponse.json({ error: "재직증명서를 첨부해주세요." }, { status: 400 });
    }
  } else if (accountType === "INDIVIDUAL") {
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
    // [개정 2026-08-28] 사업자등록증·재직증명서를 필수로 바꿨다. 예전에는 선택이라 첨부
    // 없이 접수된 건이 그대로 심사로 넘어가, 운영자가 판단 근거 없이 되묻는 일이 반복됐다.
    // 화면에서도 막지만 서버가 최종 판정자여야 폼을 우회해도 막힌다.
    if (!businessCertUrl) {
      return NextResponse.json({ error: "사업자등록증을 첨부해주세요." }, { status: 400 });
    }
    if (!employmentCertUrl) {
      return NextResponse.json({ error: "재직증명서를 첨부해주세요." }, { status: 400 });
    }
    // 등록 이력을 먼저 본다. 순서가 중요하다 —
    // 이미 등록된 회사에 합류하는 경우까지 국세청에 다시 물으면, 최초 등록 때 확인이
    // 끝난 회사인데도 조회가 실패하면 합류가 막힌다(실제로 그랬다).
    // 기획서 A5 도 "불러오기로 채운 회사는 중복확인·진위확인을 생략한다"고 정한다.
    const join = await resolveCompanyJoin(businessRegistrationNumber);
    if (join.kind === "BLOCKED_SUSPENDED") {
      return NextResponse.json(
        { error: "휴업·폐업으로 확인된 사업자등록번호입니다. 담당자에게 문의해주세요." },
        { status: 400 },
      );
    }
    joinKind = join.kind;

    // 새 회사를 만드는 경우에만 진위확인을 돌린다.
    // 휴업·폐업·부도 업체는 대관 계약 상대로 부적격이므로 가입을 막는다.
    // 미설정이거나 조회에 실패하면 가입은 진행하고 "미확인"으로 남겨 운영자 심사에 넘긴다.
    const isNewCompany = join.company === null;
    const verification = isNewCompany
      ? await checkCompanyNumber(businessRegistrationNumber)
      : null;
    if (verification && isBlockedCompanyStatus(verification)) {
      return NextResponse.json(
        { error: `국세청 조회 결과 ${verification.compStatusLabel} 상태인 사업자등록번호입니다. 담당자에게 문의해주세요.` },
        { status: 400 },
      );
    }
    if (verification && isNiceConfigured() && verification.status === "NOT_FOUND") {
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
      companyPhone,
      companyFax,
      corporateNumber,
      companyType,
    });

    // 조회된 상호·대표자명이 입력값과 다르면 그대로 기록해 둔다 — 가입은 막지 않고
    // (표기 차이가 흔하다) 운영자 심사 화면에서 확인하도록 한다.
    // 기존 회사에 합류하는 경우엔 조회를 돌리지 않았으므로 기록할 것도 없다.
    if (verification) {
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
      // 초대장의 번호로 본인인증까지 마친 사람은 대표가 이미 지목한 사람이라 심사를 건너뛴다.
      approvalStatus: invitePhoneMatched ? "APPROVED" : "PENDING",
      termsAgreedAt: createdAt,
      privacyAgreedAt: createdAt,
      employmentCertUrl: employmentCertUrl || null,
      employmentCertName: employmentCertName || null,
      // 회사 행에는 회사를 처음 등록한 사람의 것만 남는다 — 합류 가입자가 올린 사업자등록증도
      // 버리지 않고 계정에 함께 남겨 심사 화면에서 보이게 한다(2026-08-27).
      businessCertUrl: businessCertUrl || null,
      businessCertName: businessCertName || null,
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
      created.companyRole = await joinCompanyAsStaff(created.id, company.id);
    }

    // 초대장을 소진한다. 안 하면 담당자 관리 화면에 "초대 발송"(미가입) 행과 방금 가입한
    // 담당자 행이 같은 사람으로 두 줄 남는다. 토큰으로 들어왔으면 그 초대장을, 아니면
    // 같은 회사·같은 이메일로 보낸 초대장을 찾아 닫는다.
    if (invitation) {
      await consumeInvitation(invitation.id, created.id);
    } else if (company) {
      const pendingInvite = await findPendingInvitationByEmail(company.id, email);
      if (pendingInvite) {
        await consumeInvitation(pendingInvite.id, created.id);
        // MB-08 초대받은 담당자 등록 완료 → 본인. 전용 수락 화면이 사라지고 회원가입으로
        // 합쳐졌으므로(2026-08-28 병합) 초대장이 소진되는 이 지점이 "초대 수락"이다.
        const master = company.masterUserId ? await findUserById(company.masterUserId) : null;
        dispatchMessageInBackground({
          templateCode: "MB-08",
          idempotencyKey: `MB-08:${created.id}`,
          recipient: { userId: created.id, phone, email, name },
          variables: { 신청자명: name, 마스터: master?.name ?? "대표 담당자", 회사명: company.name },
          request,
        });
      }
    }

    // 회사의 첫 건은 운영자가 전담하고, 이후 가입자는 그 회사 대표도 처리할 수 있다(기획서 1-42).
    // 대표가 부재·지연이어도 운영자가 안전망이므로 운영자 알림은 두 경우 모두 보낸다.
    //
    // [개정 2026-08-28] "회사 신규 등록"인지를 created.companyRole === 'MASTER' 로 보던 걸
    // 대표 담당자의 존재 여부로 바꿨다 — 대표는 이제 가입이 아니라 첫 승인이 정하므로
    // 가입 시점에는 아무도 MASTER 가 아니다.
    //
    // 수신자도 companies.master_user_id 포인터가 아니라 users 의 실제 대표를 읽는다.
    // 포인터가 어긋나 있으면 엉뚱한 사람에게 알림이 갔다("초대한 대표는 노라인데 합류 신청
    // 알림이 테드에게 발송").
    const master = company ? await findCompanyMaster(company.id) : undefined;
    const joinLabel = master ? `${company?.name ?? ""} 합류 신청` : "회사 신규 등록";
    // 초대 링크로 들어와 이미 승인된 계정은 승인할 것이 없다 — 요청 알림을 만들지 않는다.
    if (!invitePhoneMatched) {
      await notifyAdmins({
        quoteId: "applicants",
        message: `신규 가입 승인 요청: ${name} (${company?.name ?? "소속 없음"}, ${accountType === "INDIVIDUAL" ? "개인회원" : "법인회원"}, ${joinLabel})`,
        createdAt,
      });
    }

    // MB-04 합류 신청 발생 → 그 회사 대표. 인앱 알림을 누르면 그 신청자의 상세로 바로 간다.
    if (company && master && !invitePhoneMatched) {
      dispatchMessageInBackground({
        templateCode: "MB-04",
        idempotencyKey: `MB-04:${created.id}`,
        recipient: {
          userId: master.id,
          phone: master.phone,
          email: master.email,
          name: master.name,
        },
        variables: { 신청자명: name, 대표담당자: master.name },
        inAppLink: `/mypage/members/${created.id}`,
        request,
      });
    }

    return created;
  });

  // MB-01 가입 신청 접수 → 신청자 본인 (기존 회사 합류면 카카오 정본이 따로 있어 MB-01J).
  // 초대로 곧장 승인된 계정은 "접수됐으니 기다리라"는 안내가 맞지 않아 대신 승인 완료(MB-02)를 보낸다.
  {
    const code = invitePhoneMatched ? "MB-02" : user.companyRole === "STAFF" ? "MB-01J" : "MB-01";
    dispatchMessageInBackground({
      templateCode: code,
      idempotencyKey: `${code}:${user.id}`,
      recipient: { userId: user.id, phone, email, name },
      variables: { 신청자명: name },
      request,
    });
  }
  // MB-05 회사 신규 등록 → 운영자
  if (company && user.companyRole === "MASTER") {
    for (const admin of await listUsers({ role: "ADMIN" })) {
      dispatchMessageInBackground({
        templateCode: "MB-05",
        idempotencyKey: `MB-05:${company.id}:${admin.id}`,
        recipient: { userId: admin.id, phone: admin.phone, email: admin.email, name: admin.name },
        variables: { 운영자명: admin.name },
        request,
      });
    }
  }

  await createSession(user.id, user.role);
  // 합류 상황에 따라 안내 문구가 달라진다 — "심사 중인 회사"인지 "미승인 이력이 있는 회사"인지
  // 알려주지 않으면 사용자는 왜 대기가 길어지는지 알 수 없다.
  const joinNotice = invitePhoneMatched
    ? `${company?.name ?? ""} 담당자로 합류했습니다. 바로 이용하실 수 있습니다.`
    : joinKind === "JOIN_PENDING"
      ? "이미 심사가 진행 중인 회사입니다. 앞선 심사가 끝난 뒤 함께 처리됩니다."
      : joinKind === "REAPPLY_REJECTED"
        ? "이전에 미승인 처리된 회사입니다. 운영자가 다시 심사합니다."
        : joinKind === "JOIN_APPROVED"
          ? "등록된 회사에 합류 신청되었습니다. \n회사 대표 담당자 또는 운영자가 승인합니다."
          : null;
  return NextResponse.json({ user, joinKind, joinNotice });
}
