"use client";
import { useContentTransport } from "./ContentTransport";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/admin/adminButton";
import { FIELD } from "./adminUi";
import s from "./LegalContentForm.module.css";
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
  const { request, isPreview } = useContentTransport();

  const router = useRouter();
  const [content, setContent] = useState<RegisterTermsContent>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function update(kind: string, patch: { title?: string; version?: string; body?: string; hidden?: boolean }) {
    setContent((prev) => ({
      documents: prev.documents.map((d) => (d.kind === kind ? { ...d, ...patch } : d)),
    }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await request("/api/admin/content/registerTerms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `저장에 실패했습니다. (오류 ${res.status})`);
        return;
      }
      setContent(data.content ?? content);
      setMessage(isPreview ? "예시 화면에 저장했습니다. 실제 공개 콘텐츠에는 반영되지 않습니다." : "저장되었습니다. 회원가입 화면에 바로 반영됩니다.");
      if (!isPreview) router.refresh();
    } catch {
      setError("저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={s.document} aria-label="가입 동의 항목 편집">
      <header className={s.header}><div><span className={s.eyebrow}>회원가입 문서</span><h2>가입 동의 항목</h2><p>회원가입 첫 단계에서 확인하는 동의 문서입니다. 공개 이용약관·개인정보처리방침과 별도로 관리합니다.</p></div></header>
      <div className={s.notice}>필수 동의 항목은 항상 표시됩니다. 선택 동의 항목은 노출 여부를 변경할 수 있습니다.</div>
      <div className={s.consentList}>{content.documents.map(doc=><div key={doc.kind} className={s.consentCard}>
        <div className={s.consentHeading}><div><span className={s.badge}>{doc.required?"필수 동의":"선택 동의"}</span><h3>{doc.title || "제목 없는 동의 항목"}</h3></div>{!doc.required && <label className={s.toggle}><input type="checkbox" checked={!doc.hidden} onChange={e=>update(doc.kind,{hidden:!e.target.checked})}/>가입 화면에 표시</label>}</div>
        <div className={s.metadata}><label>동의 항목 제목<input className={FIELD} value={doc.title} onChange={e=>update(doc.kind,{title:e.target.value})}/></label><label>문서 버전<input className={FIELD} value={doc.version} onChange={e=>update(doc.kind,{version:e.target.value})} placeholder="예: 2026-09-04"/></label></div>
        <label className={s.consentBody}>동의 문서 본문<textarea className={FIELD} value={doc.body} onChange={e=>update(doc.kind,{body:e.target.value})} rows={10}/></label>
        <p className={s.help}>{doc.body.length.toLocaleString("ko-KR")}자 · 본문을 수정하고 버전을 유지하면 저장 시 오늘 날짜로 자동 변경됩니다.</p>
      </div>)}</div>
      <footer className={s.footer}><button type="button" disabled={saving} onClick={save} className={btnClass("primary","md")}>{saving?"저장 중...":"가입 동의 항목 저장"}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className={s.error}>{error}</p>}</footer>
    </article>
  );
}
