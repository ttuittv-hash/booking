import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import {
  attachUserToCompany,
  findCompanyById,
  findOrCreateCompany,
  notifyAdmins,
  resolveCompanyJoin,
  setUserApprovalStatus,
  findUserByEmail,
  findUserByUsername,
  findUserPasswordHash,
  updateCompanyProfile,
  updateUserProfile,
  updateUserCertificates,
  isCompanyMaster,
} from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";
import { checkCompanyNumber, isBlockedCompanyStatus, isNiceConfigured } from "@/lib/nice";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9_]{3,19}$/;

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  const username = typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const officePhone = typeof body?.officePhone === "string" ? body.officePhone.trim() : "";
  const faxNumber = typeof body?.faxNumber === "string" ? body.faxNumber.trim() : "";
  const representativeName =
    typeof body?.representativeName === "string" ? body.representativeName.trim() : "";
  const representativePhone =
    typeof body?.representativePhone === "string" ? body.representativePhone.trim() : "";
  const representativeFax = typeof body?.representativeFax === "string" ? body.representativeFax.trim() : "";
  const corporateRegistrationNumber =
    typeof body?.corporateRegistrationNumber === "string" ? body.corporateRegistrationNumber.trim() : "";
  const postalCode = typeof body?.postalCode === "string" ? body.postalCode.trim() : "";
  const address = typeof body?.address === "string" ? body.address.trim() : "";
  // 회사 없는 계정이 기업 정보를 처음 등록할 때만 쓰는 값 (2026-09-03)
  const companyName = typeof body?.companyName === "string" ? body.companyName.trim() : "";
  const businessRegistrationNumber =
    typeof body?.businessRegistrationNumber === "string"
      ? body.businessRegistrationNumber.trim()
      : "";
  /*
    제출 서류 다시 올리기 (2026-09-02).

    반려 사유가 서류 문제일 때 고칠 자리가 없었다 — 가입 화면에서만 올릴 수 있어서,
    반려된 사람은 재심사를 요청할 방법이 없었다. 여기서 다시 받는다.
    주소는 우리가 발급한 업로드 주소만 받는다(2026-08-28 보안 점검과 같은 규칙) —
    임의 링크가 심사 화면에 걸리면 운영자를 향한 피싱 링크가 된다.
  */
  const ATTACHMENT_URL_RE = /^\/api\/auth\/register\/attachment\/[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;
  const certUrl = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const employmentCertUrl = certUrl(body?.employmentCertUrl);
  const businessCertUrl = certUrl(body?.businessCertUrl);
  for (const url of [employmentCertUrl, businessCertUrl]) {
    if (url && !ATTACHMENT_URL_RE.test(url)) {
      return NextResponse.json(
        { error: "첨부 파일 주소가 올바르지 않습니다. 다시 업로드해주세요." },
        { status: 400 },
      );
    }
  }
  const employmentCertName =
    typeof body?.employmentCertName === "string" ? body.employmentCertName.trim().slice(0, 200) : "";
  const businessCertName =
    typeof body?.businessCertName === "string" ? body.businessCertName.trim().slice(0, 200) : "";

  const currentPasswordHash =
    typeof body?.currentPasswordHash === "string" ? body.currentPasswordHash.toLowerCase() : "";
  const currentPassword = typeof body?.currentPassword === "string" ? body.currentPassword : "";

  if (!name) {
    return NextResponse.json({ error: "이름을 입력하세요." }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "휴대폰 번호를 입력하세요." }, { status: 400 });
  }
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "아이디는 영문 소문자/숫자로 시작하는 4~20자여야 합니다." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "올바른 이메일을 입력하세요." }, { status: 400 });
  }

  // 정보 수정은 현재 비밀번호 확인을 요구한다 — 비밀번호 변경과 동일한 검증 방식(v2/레거시 v1).
  const cred = await findUserPasswordHash(user.id);
  if (!cred) {
    return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
  }
  if (cred.passwordScheme === "v2") {
    const currentTransportHash = SHA256_HEX_RE.test(currentPasswordHash)
      ? currentPasswordHash
      : currentPassword
        ? sha256Hex(currentPassword)
        : "";
    if (!currentTransportHash || !(await verifyPassword(currentTransportHash, cred.passwordHash))) {
      return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
  } else {
    if (!currentPassword) {
      return NextResponse.json({ legacy: true, error: "레거시 계정 확인이 필요합니다." }, { status: 428 });
    }
    if (!(await verifyPassword(currentPassword, cred.passwordHash))) {
      return NextResponse.json({ error: "현재 비밀번호가 일치하지 않습니다." }, { status: 400 });
    }
  }

  if (username !== user.username) {
    const existing = await findUserByUsername(username);
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    }
  }
  if (email.toLowerCase() !== user.email.toLowerCase()) {
    const existing = await findUserByEmail(email);
    if (existing && existing.id !== user.id) {
      return NextResponse.json({ error: "이미 사용 중인 이메일입니다." }, { status: 409 });
    }
  }

  // 새로 올린 것만 바꾼다 — 한쪽만 다시 올렸을 때 다른 쪽이 지워지면 안 된다.
  if (employmentCertUrl || businessCertUrl) {
    await updateUserCertificates(user.id, {
      employmentCertUrl: employmentCertUrl || undefined,
      employmentCertName: employmentCertUrl ? employmentCertName || null : undefined,
      businessCertUrl: businessCertUrl || undefined,
      businessCertName: businessCertUrl ? businessCertName || null : undefined,
    });
  }

  const updated = await updateUserProfile(user.id, {
    name,
    phone,
    username,
    email,
    officePhone: officePhone || null,
    faxNumber: faxNumber || null,
  });

  /*
    [신규 2026-09-03] 소속 회사가 없으면 여기서 처음 등록한다.

    운영자 권한을 해제당한 계정은 신청자로 돌아오는데 소속 회사가 없다. 그 상태로
    재심사를 요청하면 심사할 기업 정보가 아예 없는데, 넣을 자리도 없었다 — 막다른
    길이었다. 가입 화면과 **같은 판정**(resolveCompanyJoin)으로 회사를 붙인다:
    처음 등록하는 사업자번호면 진위확인을 거치고, 이미 있는 회사면 그 회사에 합류한다.

    회사가 붙은 계정은 다시 심사를 받아야 하므로 승인 상태를 「대기」로 돌리고
    운영자에게 알린다 — 그러지 않으면 아무도 모르는 채로 남는다.
  */
  if (!user.companyId && companyName) {
    if (!businessRegistrationNumber) {
      return NextResponse.json({ error: "사업자등록번호를 입력해주세요." }, { status: 400 });
    }
    const join = await resolveCompanyJoin(businessRegistrationNumber);
    if (join.kind === "BLOCKED_SUSPENDED") {
      return NextResponse.json(
        { error: "휴업·폐업으로 확인된 사업자등록번호입니다. 담당자에게 문의해주세요." },
        { status: 400 },
      );
    }
    if (join.company === null) {
      // 새 회사일 때만 조회한다 — 가입 화면과 같은 규칙(미설정·조회 실패는 통과시키고 심사로 넘긴다).
      const verification = await checkCompanyNumber(businessRegistrationNumber);
      if (isBlockedCompanyStatus(verification)) {
        return NextResponse.json(
          {
            error: `국세청 조회 결과 ${verification.compStatusLabel} 상태인 사업자등록번호입니다. 담당자에게 문의해주세요.`,
          },
          { status: 400 },
        );
      }
      if (isNiceConfigured() && verification.status === "NOT_FOUND") {
        return NextResponse.json(
          { error: "조회되지 않는 사업자등록번호입니다. 번호를 다시 확인해주세요." },
          { status: 400 },
        );
      }
    }

    const company = await findOrCreateCompany(companyName, {
      businessRegistrationNumber,
      representativeName,
      postalCode,
      address,
      businessCertUrl,
      businessCertName,
      corporateNumber: corporateRegistrationNumber,
    });
    await attachUserToCompany(user.id, company.id);
    // 대표자·주소 등은 회사를 새로 만들 때만 채워진다 — 이미 있는 회사에 합류하는
    // 경우까지 덮어쓰면 남의 회사 정보를 바꾸게 된다(2026-08-28 보안 점검과 같은 이유).
    if (join.company === null) {
      await updateCompanyProfile(company.id, {
        representativeName: representativeName || null,
        representativePhone: representativePhone || null,
        representativeFax: representativeFax || null,
        corporateRegistrationNumber: corporateRegistrationNumber || null,
        postalCode: postalCode || null,
        address: address || null,
      });
    }
    const pending = await setUserApprovalStatus(user.id, "PENDING", null, null);
    await notifyAdmins({
      quoteId: "applicants",
      message: `가입 승인 요청: ${pending.name} (${company.name}, 기업 정보 등록)`,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ user: pending });
  }

  // 기업 정보(회사명·사업자등록번호 제외)는 소속 회사가 있을 때만, 그리고 대표 담당자만 갱신한다 —
  // 소속 담당자가 회사 전체 정보(대표자명·법인번호·주소)를 덮어쓸 수 있었다(2026-08-28 보안 점검).
  if (user.companyId && isCompanyMaster(user)) {
    const company = await findCompanyById(user.companyId);
    if (company) {
      await updateCompanyProfile(user.companyId, {
        representativeName: representativeName || null,
        representativePhone: representativePhone || null,
        representativeFax: representativeFax || null,
        corporateRegistrationNumber: corporateRegistrationNumber || null,
        postalCode: postalCode || null,
        address: address || null,
      });
    }
  }

  return NextResponse.json({ user: updated });
}
