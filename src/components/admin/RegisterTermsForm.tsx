"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import type { RegisterTermsContent } from "@/lib/terms";

/**
 * 회원가입 동의 항목(약관 3종) 편집 — 2026-09-04.
 *
 * 가입 화면은 이 문서를 그대로 스크롤 박스에 보여준다. 서식 없는 글이라 리치텍스트가 아니라
 * 여러 줄 입력으로 받는다(줄바꿈이 그대로 화면 줄바꿈이다).
 *
 * 버전은 동의 이력을 특정하는 값이다. 본문을 고치고 버전을 그대로 두면 저장할 때 오늘 날짜로
 * 자동으로 올라간다 — 이전에 동의한 사람이 무엇에 동의했는지 남겨야 하기 때문이다.
 */
export function RegisterTermsForm({ content: initial }: { content: RegisterTermsContent }) {
  const router = useRouter();
  const [content, setContent] = useState<RegisterTermsContent>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(kind: string, patch: { title?: string; version?: string; body?: string }) {
    setContent((prev) => ({
      documents: prev.documents.map((d) => (d.kind === kind ? { ...d, ...patch } : d)),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/content/registerTerms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `저장에 실패했습니다. (오류 ${res.status})`);
        return;
      }
      setContent(data.content);
      setMessage("저장되었습니다. 회원가입 화면에 바로 반영됩니다.");
      router.refresh();
    } catch {
      setError("저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-h6-m font-bold">가입 약관 (회원가입 동의 항목)</h2>
        <p className="mt-1 text-xs text-muted">
          회원가입 첫 단계에 보이는 동의 항목입니다. 공개 페이지(이용약관 · 개인정보처리방침)와는 별개의 문서입니다.
        </p>
        <a
          href="/register"
          target="_blank"
          className="mt-2 inline-block text-xs text-accent hover:underline"
        >
          현재 가입 화면 보기 →
        </a>
      </div>

      {content.documents.map((doc) => (
        <section key={doc.kind} className="rounded-surface border border-border-soft bg-panel p-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-btn bg-panel-strong px-2 py-1 font-mono text-xs text-muted">{doc.kind}</span>
            <span className={`text-xs ${doc.required ? "text-danger" : "text-muted"}`}>
              {doc.required ? "필수 동의" : "선택 동의"}
            </span>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]">
            <label className="block">
              <span className="text-s font-bold">제목</span>
              <input
                type="text"
                value={doc.title}
                onChange={(e) => update(doc.kind, { title: e.target.value })}
                className="field-base mt-2"
              />
            </label>
            <label className="block">
              <span className="text-s font-bold">버전</span>
              <input
                type="text"
                value={doc.version}
                onChange={(e) => update(doc.kind, { version: e.target.value })}
                placeholder="예: 2026-09-04"
                className="field-base mt-2"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-s font-bold">본문</span>
            <textarea
              value={doc.body}
              onChange={(e) => update(doc.kind, { body: e.target.value })}
              rows={16}
              className="field-base mt-2 whitespace-pre-wrap font-mono text-xs leading-6"
            />
          </label>
          <p className="mt-2 text-xs text-muted">
            {doc.body.length.toLocaleString("ko-KR")}자 · 본문을 고치고 버전을 그대로 두면 저장할 때 오늘 날짜로 올라갑니다.
          </p>
        </section>
      ))}

      {error && <p className="text-s text-danger">{error}</p>}
      {message && <p className="text-s text-good">{message}</p>}
      <button type="button" disabled={saving} onClick={save} className={btnClass("primary", "md")}>
        {saving ? "저장 중..." : "저장"}
      </button>
    </div>
  );
}
