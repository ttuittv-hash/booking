"use client";

import { useState } from "react";

export function AdminPasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "변경에 실패했습니다.");
        return;
      }
      setMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded border border-border bg-background p-6">
      <h2 className="text-[15px] font-semibold">비밀번호 변경</h2>
      <div className="mt-4 max-w-sm space-y-3">
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
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      {message && <p className="mt-3 text-[13px] text-good">{message}</p>}
      <button
        type="button"
        disabled={saving || !currentPassword || newPassword.length < 8}
        onClick={save}
        className="mt-4 rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "변경 중..." : "비밀번호 변경"}
      </button>
    </section>
  );
}
