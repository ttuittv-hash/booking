"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { HomeContent } from "@/lib/content/types";

const addBtnCls =
  "mt-2 rounded-sm border border-dashed border-border px-3 py-1.5 text-[12.5px] text-muted hover:border-accent hover:text-accent";
const removeBtnCls = "shrink-0 text-[12px] text-red-600 hover:underline";

export function HomeContentForm({ content: initial }: { content: HomeContent }) {
  const router = useRouter();
  const [content, setContent] = useState<HomeContent>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function uploadHeroImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) setContent({ heroImage: data.url });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/content/home", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "저장에 실패했습니다.");
        return;
      }
      setMessage("저장되었습니다. 홈 화면에 바로 반영됩니다.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-[14px] font-semibold">히어로 배경 이미지</h3>
        <p className="mt-1 text-[12px] text-muted">
          홈 화면 최상단에 흐림 처리되어 배경으로 표시됩니다. 비워두면 기본 배경이 표시됩니다.
        </p>
        <div className="mt-3">
          {content.heroImage ? (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={content.heroImage}
                alt="히어로 배경"
                className="h-24 w-40 rounded-sm border border-border object-cover"
              />
              <button type="button" onClick={() => setContent({ heroImage: null })} className={removeBtnCls}>
                이미지 삭제
              </button>
            </div>
          ) : (
            <label className="inline-block">
              <span className={addBtnCls}>{uploading ? "업로드 중..." : "+ 이미지 업로드"}</span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={uploadHeroImage}
                className="hidden"
              />
            </label>
          )}
        </div>
      </section>

      {message && <p className="text-[13px] text-good">{message}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="rounded-sm bg-accent px-6 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
