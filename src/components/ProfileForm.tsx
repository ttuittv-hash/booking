"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppUser } from "@/lib/pricing/types";
import { btnClass } from "@/components/ui/kit";

export function ProfileForm({ user }: { user: AppUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? "");
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
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setProfileError(data.error || "저장에 실패했습니다.");
        return;
      }
      setProfileMessage("회원정보가 수정되었습니다.");
      router.refresh();
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
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
    <div className="space-y-12">
      <section className="border-t border-border/25 pt-6">
        <div className="flex items-baseline gap-3">
          <span className="type-display text-xs tabular-nums text-muted">01</span>
          <h2 className="type-kr-heading text-h6-m sm:text-h6">기본 정보</h2>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs text-muted">이메일</span>
            <input type="email" value={user.email} disabled className="field-base text-muted" />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-muted">소속 회사/기획사</span>
            <input
              type="text"
              value={user.companyName || "소속 없음"}
              disabled
              className="field-base text-muted"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-muted">담당자명</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field-base"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-muted">휴대폰 번호</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field-base"
            />
          </label>
          <p className="text-xs text-muted">이메일과 소속 회사 변경은 운영자에게 문의해주세요.</p>
        </div>

        {profileError && (
          <p className="mt-4 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
            {profileError}
          </p>
        )}
        {profileMessage && (
          <p className="mt-4 border-l-2 border-good bg-good-soft px-3 py-2 text-s text-good">
            {profileMessage}
          </p>
        )}

        <button
          type="button"
          disabled={savingProfile}
          onClick={saveProfile}
          className={`${btnClass("primary")} mt-6`}
        >
          {savingProfile ? "저장 중..." : "정보 저장"}
        </button>
      </section>

      <section className="border-t border-border/25 pt-6">
        <div className="flex items-baseline gap-3">
          <span className="type-display text-xs tabular-nums text-muted">02</span>
          <h2 className="type-kr-heading text-h6-m sm:text-h6">비밀번호 변경</h2>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs text-muted">현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="field-base"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs text-muted">새 비밀번호 (8자 이상)</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="field-base"
            />
          </label>
        </div>

        {passwordError && (
          <p className="mt-4 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
            {passwordError}
          </p>
        )}
        {passwordMessage && (
          <p className="mt-4 border-l-2 border-good bg-good-soft px-3 py-2 text-s text-good">
            {passwordMessage}
          </p>
        )}

        <button
          type="button"
          disabled={savingPassword || !currentPassword || newPassword.length < 8}
          onClick={savePassword}
          className={`${btnClass("secondary")} mt-6`}
        >
          {savingPassword ? "변경 중..." : "비밀번호 변경"}
        </button>
      </section>
    </div>
  );
}
