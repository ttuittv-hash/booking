"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { NoticeEditor } from "./NoticeEditor";
import { ERROR_NOTE, HELP, OK_NOTE, SUB_TITLE } from "./adminUi";

/**
 * 리드 문구 편집기.
 *
 * 2026-08 정보구조 재구성으로 시설 정보·대관 절차·요금은 코드 정본으로 옮겼고,
 * CMS 에는 화면 맨 위 **리드 문단 하나**만 남겼다. 편집해도 반영되지 않는
 * 죽은 입력란을 두지 않기 위해서다.
 */
export function LeadContentForm({
  endpoint,
  title,
  help,
  initialIntro,
}: {
  /** PUT 대상 — `/api/admin/content/venue` 또는 `/api/admin/content/guide` */
  endpoint: string;
  title: string;
  help: string;
  initialIntro: string;
}) {
  const router = useRouter();
  const [intro, setIntro] = useState(initialIntro);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: { intro } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      setMessage("저장했습니다.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className={SUB_TITLE}>{title}</h3>
        <p className={`mt-2 ${HELP}`}>{help}</p>
        <div className="mt-3">
          <NoticeEditor value={intro} onChange={setIntro} />
        </div>
      </section>

      {message && <p className={OK_NOTE}>{message}</p>}
      {error && <p className={ERROR_NOTE}>{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className={btnClass("primary", "md")}
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
