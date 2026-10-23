"use client";
import { useContentTransport } from "./ContentTransport";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnClass } from "@/components/admin/adminButton";
import type { LegalContent } from "@/lib/content/types";
import { NoticeEditor } from "./NoticeEditor";
import { FIELD } from "./adminUi";
import s from "./LegalContentForm.module.css";
export function LegalContentForm({
  kind,
  label,
  content: initial,
}: {
  kind: "terms" | "privacy";
  label: string;
  content: LegalContent;
}) {
  const { request, isPreview } = useContentTransport();

  const router = useRouter();
  const [content, setContent] = useState<LegalContent>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error,setError]=useState<string|null>(null);

  async function save() {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await request("/api/admin/content/legal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, content }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      setContent(data.content ?? content);
      setMessage(isPreview ? "예시 화면에 저장했습니다. 실제 공개 콘텐츠에는 반영되지 않습니다." : `저장되었습니다. '${label}' 페이지에 바로 반영됩니다.`);
      if (!isPreview) router.refresh();
    } catch {
      setError("저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className={s.document} aria-label={`${label} 편집`}>
      <header className={s.header}>
        <div><span className={s.eyebrow}>공개 문서</span><h2>{label}</h2><p>{kind === "terms" ? "서비스 이용 조건과 회원의 권리·의무를 안내하는 문서입니다." : "개인정보의 수집·이용·보관 및 보호 기준을 안내하는 문서입니다."}</p></div>

      </header>
      <div className={s.notice}>수정한 내용은 아래 ‘{label} 저장’을 눌러야 공개 페이지에 반영됩니다.</div>
      <div className={s.single}>
        <div className={s.editPane}>
          <label className={s.dateField}>시행일<input type="text" className={FIELD} value={content.effectiveDate} onChange={e=>setContent(prev=>({...prev,effectiveDate:e.target.value}))} placeholder="예: 2026년 8월 1일" /></label>
          <div className={s.bodyLabel}>{label} 본문</div>
          <NoticeEditor value={content.bodyHtml} onChange={bodyHtml=>setContent(prev=>({...prev,bodyHtml}))}/>
        </div>

      </div>
      <footer className={s.footer}><button type="button" disabled={saving} onClick={save} className={btnClass("primary","md")}>{saving?"저장 중...":`${label} 저장`}</button>{message&&<p role="status">{message}</p>}{error&&<p role="alert" className={s.error}>{error}</p>}</footer>
    </article>
  );
}
