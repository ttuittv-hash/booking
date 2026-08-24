"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { FIELD, FIELD_LABEL } from "@/components/admin/adminUi";
import { hashPasswordForTransport } from "@/lib/clientPassword";
import type { AppUser, Company } from "@/lib/pricing/types";
import { useToast } from "@/components/ui/Toast";

/* 입력·라벨은 시스템 토큰만 쓴다 — 한 줄 입력의 높이는 field-base 가 40 으로 못 박아
   같은 줄 버튼(40)과 아래위가 맞는다 */
const inputCls = FIELD;
const lockedInputCls = `${FIELD} bg-panel-strong text-muted`;
const labelCls = FIELD_LABEL;

export function ProfileForm({ user, company }: { user: AppUser; company: Company | null }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [officePhone, setOfficePhone] = useState(user.officePhone ?? "");
  const [faxNumber, setFaxNumber] = useState(user.faxNumber ?? "");

  const [representativeName, setRepresentativeName] = useState(company?.representativeName ?? "");
  const [representativePhone, setRepresentativePhone] = useState(company?.representativePhone ?? "");
  const [representativeFax, setRepresentativeFax] = useState(company?.representativeFax ?? "");
  const [corporateRegistrationNumber, setCorporateRegistrationNumber] = useState(
    company?.corporateRegistrationNumber ?? "",
  );
  const [postalCode, setPostalCode] = useState(company?.postalCode ?? "");
  const [address, setAddress] = useState(company?.address ?? "");

  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      if (!confirmPassword) {
        setProfileError("현재 비밀번호를 입력하세요.");
        return;
      }
      const currentPasswordHash = await hashPasswordForTransport(confirmPassword);
      let res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          username,
          email,
          officePhone,
          faxNumber,
          representativeName,
          representativePhone,
          representativeFax,
          corporateRegistrationNumber,
          postalCode,
          address,
          currentPasswordHash,
        }),
      });
      if (res.status === 428) {
        res = await fetch("/api/users/me", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            phone,
            username,
            email,
            officePhone,
            faxNumber,
            representativeName,
            representativePhone,
            representativeFax,
            corporateRegistrationNumber,
            postalCode,
            address,
            currentPasswordHash,
            currentPassword: confirmPassword,
          }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "저장에 실패했습니다.");
        return;
      }
      setProfileMessage("회원정보가 수정되었습니다.");
      setConfirmPassword("");
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    if (!currentPassword) {
      toast.error("현재 비밀번호를 입력해 주세요.");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      if (newPassword.length < 8) {
        setPasswordError("새 비밀번호는 8자 이상이어야 합니다.");
        return;
      }
      // 비밀번호 평문 대신 SHA-256 해시를 전송한다. 구(SQLite) 시절 계정은 서버가
      // 428을 돌려주며, 이때만 현재 비밀번호 평문을 함께 재전송해 검증한다.
      const [currentPasswordHash, newPasswordHash] = await Promise.all([
        hashPasswordForTransport(currentPassword),
        hashPasswordForTransport(newPassword),
      ]);
      let res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPasswordHash, newPasswordHash }),
      });
      if (res.status === 428) {
        res = await fetch("/api/users/me/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPasswordHash, newPasswordHash, currentPassword }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || "변경에 실패했습니다.");
        return;
      }
      setPasswordMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <section className="border border-border bg-background p-5">
        <h2 className="type-kr-heading text-h6-m">개인 정보</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className={labelCls}>담당자명</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>휴대폰 번호</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>전화번호</span>
            <input
              type="tel"
              placeholder="02-0000-0000 (선택)"
              value={officePhone}
              onChange={(e) => setOfficePhone(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>팩스번호</span>
            <input
              type="tel"
              placeholder="02-0000-0000 (선택)"
              value={faxNumber}
              onChange={(e) => setFaxNumber(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>로그인 ID</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>이메일</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
      </section>

      <section className="border border-border bg-background p-5">
        <h2 className="type-kr-heading text-h6-m">기업 정보</h2>
        {company ? (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className={labelCls}>회사명</span>
              <input type="text" value={company.name} disabled className={lockedInputCls} />
            </label>
            <label className="block">
              <span className={labelCls}>사업자등록번호</span>
              <input
                type="text"
                value={company.businessRegistrationNumber ?? ""}
                disabled
                className={lockedInputCls}
              />
            </label>
            <p className="text-xs text-muted">
              회사명·사업자등록번호는 다른 회사로 바뀌는 것과 같아 여기서 바로 수정할 수 없습니다. 변경이
              필요하면{" "}
              <Link href="/mypage/withdraw" className="inline-flex min-h-11 items-center text-accent hover:underline sm:min-h-0">
                회원 탈퇴
              </Link>{" "}
              후 새 정보로 다시 가입해주세요.
            </p>

            <label className="block">
              <span className={labelCls}>대표자성명</span>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>대표번호</span>
              <input
                type="tel"
                placeholder="02-0000-0000"
                value={representativePhone}
                onChange={(e) => setRepresentativePhone(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>대표팩스</span>
              <input
                type="tel"
                placeholder="02-0000-0000 (선택)"
                value={representativeFax}
                onChange={(e) => setRepresentativeFax(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>법인등록번호</span>
              <input
                type="text"
                value={corporateRegistrationNumber}
                onChange={(e) => setCorporateRegistrationNumber(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>우편번호</span>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className={labelCls}>회사주소</span>
              <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </label>
          </div>
        ) : (
          <p className="mt-3 text-s text-muted">소속된 회사가 없습니다.</p>
        )}
      </section>

      <section className="border border-border bg-background p-5">
        <h2 className="type-kr-heading text-h6-m">저장하려면 현재 비밀번호를 입력하세요</h2>
        <div className="mt-4">
          <label className="block">
            <span className={labelCls}>현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        {profileError && <p className="mt-3 text-s text-danger">{profileError}</p>}
        {profileMessage && <p className="mt-3 text-s text-good">{profileMessage}</p>}
        <button
          type="button"
          disabled={savingProfile}
          onClick={saveProfile}
          className={`mt-4 ${btnClass("primary", "md")}`}
        >
          {savingProfile ? "저장 중..." : "정보 저장"}
        </button>
      </section>

      <section className="border border-border bg-background p-5">
        <h2 className="type-kr-heading text-h6-m">비밀번호 변경</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className={labelCls}>현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>새 비밀번호 (8자 이상)</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>
        {passwordError && <p className="mt-3 text-s text-danger">{passwordError}</p>}
        {passwordMessage && <p className="mt-3 text-s text-good">{passwordMessage}</p>}
        <button
          type="button"
          disabled={savingPassword}
          onClick={savePassword}
          className={`mt-4 ${btnClass("secondary", "md")}`}
        >
          {savingPassword ? "변경 중..." : "비밀번호 변경"}
        </button>
      </section>
    </div>
  );
}
