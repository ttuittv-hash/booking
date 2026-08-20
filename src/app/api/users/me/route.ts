import { NextResponse } from "next/server";
import { getCurrentUser, verifyPassword } from "@/lib/auth";
import {
  findCompanyById,
  findUserByEmail,
  findUserByUsername,
  findUserPasswordHash,
  updateCompanyProfile,
  updateUserProfile,
} from "@/lib/db";
import { SHA256_HEX_RE, sha256Hex } from "@/lib/passwordScheme";

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

  const updated = await updateUserProfile(user.id, {
    name,
    phone,
    username,
    email,
    officePhone: officePhone || null,
    faxNumber: faxNumber || null,
  });

  // 기업 정보(회사명·사업자등록번호 제외)는 소속 회사가 있을 때만 갱신한다.
  if (user.companyId) {
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
