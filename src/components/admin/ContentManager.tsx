"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Faq, Notice } from "@/lib/pricing/types";
import type { GuideContent, HomeContent, LegalContent, VenueContent } from "@/lib/content/types";
import { TagBadge } from "@/components/TagBadge";
import { NoticeEditor } from "./NoticeEditor";
import { VenueContentForm } from "./VenueContentForm";
import { GuideContentForm } from "./GuideContentForm";
import { HomeContentForm } from "./HomeContentForm";
import { LegalContentForm } from "./LegalContentForm";

type Tab = "notices" | "faq" | "home" | "venue" | "guide" | "terms" | "privacy";

function isHtmlBodyEmpty(html: string): boolean {
  return html.replace(/<[^>]+>/g, "").trim().length === 0 && !html.includes("<img");
}

function stripHtml(html: string, max = 100): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text || "(이미지만 포함된 공지)";
}

export function ContentManager({
  notices: initialNotices,
  faqs: initialFaqs,
  homeContent,
  venueContent,
  guideContent,
  termsContent,
  privacyContent,
}: {
  notices: Notice[];
  faqs: Faq[];
  homeContent: HomeContent;
  venueContent: VenueContent;
  guideContent: GuideContent;
  termsContent: LegalContent;
  privacyContent: LegalContent;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notices");
  const [notices, setNotices] = useState(initialNotices);
  const [faqs, setFaqs] = useState(initialFaqs);

  return (
    <div className="mt-8">
      <div className="sticky top-14 z-10 -mx-6 flex h-11 items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border bg-background px-6 sm:top-16">
        {(
          [
            ["notices", `공지사항 (${notices.length})`],
            ["faq", `FAQ (${faqs.length})`],
            ["home", "홈 화면"],
            ["venue", "서울아레나 소개"],
            ["guide", "대관 안내"],
            ["terms", "이용약관"],
            ["privacy", "개인정보처리방침"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={[
              "shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium outline-none transition-colors",
              tab === key
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "notices" && <NoticesTab notices={notices} setNotices={setNotices} router={router} />}
        {tab === "faq" && <FaqTab faqs={faqs} setFaqs={setFaqs} router={router} />}
        {tab === "home" && <HomeContentForm content={homeContent} />}
        {tab === "venue" && <VenueContentForm content={venueContent} />}
        {tab === "guide" && <GuideContentForm content={guideContent} />}
        {tab === "terms" && (
          <LegalContentForm kind="terms" label="이용약관" content={termsContent} publicHref="/terms" />
        )}
        {tab === "privacy" && (
          <LegalContentForm kind="privacy" label="개인정보처리방침" content={privacyContent} publicHref="/privacy" />
        )}
      </div>
    </div>
  );
}

function NoticesTab({
  notices,
  setNotices,
  router,
}: {
  notices: Notice[];
  setNotices: (n: Notice[]) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [tag, setTag] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setEditingId("__new__");
    setTag("");
    setTitle("");
    setBody("");
    setImageUrl(null);
    setAttachmentUrl(null);
    setAttachmentName(null);
    setError(null);
  }

  function startEdit(notice: Notice) {
    setEditingId(notice.id);
    setTag(notice.tag ?? "");
    setTitle(notice.title);
    setBody(notice.body);
    setImageUrl(notice.imageUrl);
    setAttachmentUrl(notice.attachmentUrl);
    setAttachmentName(notice.attachmentName);
  }

  function resetForm() {
    setEditingId(null);
    setTag("");
    setTitle("");
    setBody("");
    setImageUrl(null);
    setAttachmentUrl(null);
    setAttachmentName(null);
    setError(null);
  }

  async function uploadImage(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/notices/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "이미지 업로드에 실패했습니다.");
        return;
      }
      setImageUrl(data.url);
    } finally {
      setUploading(false);
    }
  }

  async function uploadAttachment(file: File) {
    setUploadingAttachment(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/notices/attachment", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "파일 업로드에 실패했습니다.");
        return;
      }
      setAttachmentUrl(data.url);
      setAttachmentName(data.name);
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function save() {
    const isNew = editingId === "__new__";
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/notices" : `/api/admin/notices/${editingId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, title, body, imageUrl, attachmentUrl, attachmentName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      if (isNew) {
        setNotices([data.notice, ...notices]);
      } else {
        setNotices(notices.map((n) => (n.id === editingId ? data.notice : n)));
      }
      resetForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/notices/${id}`, { method: "DELETE" });
    setNotices(notices.filter((n) => n.id !== id));
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div>
      <ul className="space-y-2">
        {notices.length === 0 ? (
          <li className="text-[13px] text-muted">등록된 공지사항이 없습니다.</li>
        ) : (
          notices.map((notice) => (
            <li key={notice.id} className="border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => startEdit(notice)}
                  className="flex flex-1 gap-3 text-left outline-none"
                >
                  {notice.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={notice.imageUrl}
                      alt=""
                      className="h-14 w-20 shrink-0 rounded-sm border border-border object-cover"
                    />
                  )}
                  <div>
                    <div className="flex items-center text-[13.5px] font-semibold">
                      <TagBadge tag={notice.tag} />
                      {notice.title}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-5 text-muted">{stripHtml(notice.body)}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                      {new Date(notice.createdAt).toLocaleString("ko-KR")}
                      {notice.attachmentUrl && <span className="text-accent">· 첨부파일</span>}
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 gap-3 text-[12.5px]">
                  <button type="button" onClick={() => startEdit(notice)} className="text-accent hover:underline">
                    수정
                  </button>
                  <button type="button" onClick={() => remove(notice.id)} className="text-muted hover:text-red-600">
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {editingId ? (
        <div className="mt-6 border border-border bg-panel/60 p-5">
          <h3 className="text-[14px] font-semibold">{editingId === "__new__" ? "새 공지사항 등록" : "공지사항 수정"}</h3>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="말머리 (예: 공지, 점검)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-32 shrink-0 rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <div>
              <span className="mb-1.5 block text-[12px] text-muted">내용</span>
              <NoticeEditor value={body} onChange={setBody} />
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] text-muted">대표 이미지 (목록에 표시, 선택)</span>
              {imageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="h-20 w-32 rounded-sm border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="text-[12.5px] text-muted hover:text-red-600"
                  >
                    이미지 제거
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadImage(file);
                  }}
                  className="w-full text-[12.5px] text-muted file:mr-3 file:rounded-sm file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
                />
              )}
              {uploading && <p className="mt-1 text-[11.5px] text-muted">업로드 중...</p>}
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] text-muted">
                첨부파일 (규약/상세문서 등, 선택 · PDF/Word/한글/Excel/PowerPoint/ZIP, 20MB 이하)
              </span>
              {attachmentUrl ? (
                <div className="flex items-center gap-3">
                  <span className="rounded-sm border border-border bg-panel px-3 py-1.5 text-[12.5px]">
                    {attachmentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl(null);
                      setAttachmentName(null);
                    }}
                    className="text-[12.5px] text-muted hover:text-red-600"
                  >
                    파일 제거
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.hwp,.hwpx,.xls,.xlsx,.ppt,.pptx,.zip"
                  disabled={uploadingAttachment}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAttachment(file);
                  }}
                  className="w-full text-[12.5px] text-muted file:mr-3 file:rounded-sm file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
                />
              )}
              {uploadingAttachment && <p className="mt-1 text-[11.5px] text-muted">업로드 중...</p>}
            </div>

            {error && <p className="text-[12.5px] text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saving || uploading || !title.trim() || isHtmlBodyEmpty(body)}
                onClick={save}
                className="rounded-sm bg-accent px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={resetForm} className="text-[12.5px] text-muted hover:text-foreground">
                취소
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startCreate}
          className="mt-6 border border-dashed border-border px-4 py-3 text-[12.5px] text-muted hover:border-accent hover:text-accent"
        >
          + 새 공지사항 등록
        </button>
      )}
    </div>
  );
}

function FaqTab({
  faqs,
  setFaqs,
  router,
}: {
  faqs: Faq[];
  setFaqs: (f: Faq[]) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [tag, setTag] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startCreate() {
    setEditingId("__new__");
    setTag("");
    setQuestion("");
    setAnswer("");
    setError(null);
  }

  function startEdit(faq: Faq) {
    setEditingId(faq.id);
    setTag(faq.tag ?? "");
    setQuestion(faq.question);
    setAnswer(faq.answer);
  }

  function resetForm() {
    setEditingId(null);
    setTag("");
    setQuestion("");
    setAnswer("");
    setError(null);
  }

  async function save() {
    const isNew = editingId === "__new__";
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/faq" : `/api/admin/faq/${editingId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, question, answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        return;
      }
      if (isNew) {
        setFaqs([...faqs, data.faq]);
      } else {
        setFaqs(faqs.map((f) => (f.id === editingId ? data.faq : f)));
      }
      resetForm();
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await fetch(`/api/admin/faq/${id}`, { method: "DELETE" });
    setFaqs(faqs.filter((f) => f.id !== id));
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div>
      <ul className="space-y-2">
        {faqs.length === 0 ? (
          <li className="text-[13px] text-muted">등록된 FAQ가 없습니다.</li>
        ) : (
          faqs.map((faq) => (
            <li key={faq.id} className="border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={() => startEdit(faq)} className="flex-1 text-left outline-none">
                  <div className="flex items-center text-[13.5px] font-semibold">
                    <TagBadge tag={faq.tag} />
                    Q. {faq.question}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] leading-5 text-muted">A. {faq.answer}</p>
                </button>
                <div className="flex shrink-0 gap-3 text-[12.5px]">
                  <button type="button" onClick={() => startEdit(faq)} className="text-accent hover:underline">
                    수정
                  </button>
                  <button type="button" onClick={() => remove(faq.id)} className="text-muted hover:text-red-600">
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {editingId ? (
        <div className="mt-6 border border-border bg-panel/60 p-5">
          <h3 className="text-[14px] font-semibold">{editingId === "__new__" ? "새 FAQ 등록" : "FAQ 수정"}</h3>
          <div className="mt-3 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="말머리 (예: 신청, 정산)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-32 shrink-0 rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="질문"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
              />
            </div>
            <textarea
              placeholder="답변"
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-sm border border-border bg-panel px-3 py-2 text-[13px] outline-none focus:border-accent"
            />
            {error && <p className="text-[12.5px] text-red-600">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={saving || !question.trim() || !answer.trim()}
                onClick={save}
                className="rounded-sm bg-accent px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={resetForm} className="text-[12.5px] text-muted hover:text-foreground">
                취소
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startCreate}
          className="mt-6 border border-dashed border-border px-4 py-3 text-[12.5px] text-muted hover:border-accent hover:text-accent"
        >
          + 새 FAQ 등록
        </button>
      )}
    </div>
  );
}
