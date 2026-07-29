"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppUser } from "@/lib/pricing/types";

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
    <div className="mt-8 space-y-8">
      <section className="rounded border border-border bg-background p-6">
        <h2 className="text-[15px] font-semibold">기본 정보</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">이메일</span>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full rounded-sm border border-border bg-panel-strong px-3.5 py-2.5 text-[14px] text-muted outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">소속 회사/기획사</span>
            <input
              type="text"
              value={user.companyName || "소속 없음"}
              disabled
              className="w-full rounded-sm border border-border bg-panel-strong px-3.5 py-2.5 text-[14px] text-muted outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">담당자명</span>
            <input
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">휴대폰 번호</span>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </label>
          <p className="text-[12px] text-muted">이메일과 소속 회사 변경은 운영자에게 문의해주세요.</p>
        </div>
        {profileError && <p className="mt-3 text-[13px] text-red-600">{profileError}</p>}
        {profileMessage && <p className="mt-3 text-[13px] text-good">{profileMessage}</p>}
        <button
          type="button"
          disabled={savingProfile}
          onClick={saveProfile}
          className="mt-4 rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {savingProfile ? "저장 중..." : "정보 저장"}
        </button>
      </section>

      <section className="rounded border border-border bg-background p-6">
        <h2 className="text-[15px] font-semibold">비밀번호 변경</h2>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">현재 비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium text-muted">새 비밀번호 (8자 이상)</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-sm border border-border bg-panel px-3.5 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </label>
        </div>
        {passwordError && <p className="mt-3 text-[13px] text-red-600">{passwordError}</p>}
        {passwordMessage && <p className="mt-3 text-[13px] text-good">{passwordMessage}</p>}
        <button
          type="button"
          disabled={savingPassword || !currentPassword || newPassword.length < 8}
          onClick={savePassword}
          className="mt-4 rounded-sm border border-border px-6 py-2.5 text-[13.5px] font-semibold text-foreground transition-colors hover:bg-panel disabled:opacity-50"
        >
          {savingPassword ? "변경 중..." : "비밀번호 변경"}
        </button>
      </section>
    </div>
  );
}
