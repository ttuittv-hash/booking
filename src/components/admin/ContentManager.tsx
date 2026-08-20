"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Faq, Notice } from "@/lib/pricing/types";
import type { HomeContent } from "@/lib/content/types";
import { NOTICE_TAGS, NOTICE_TAG_HELP, PINNED_NOTICE_TAG, TagBadge, type NoticeTag } from "@/components/TagBadge";
import { FAQ_TAGS } from "@/components/FaqAccordion";
import { btnClass } from "@/components/ui/kit";
import { NoticeEditor } from "./NoticeEditor";
import { GuideFactsNotice, VenueFactsNotice } from "./VenueFactsNotice";
import { HomeContentForm } from "./HomeContentForm";
import {
  ADD_BTN_LG,
  CARD,
  ERROR_NOTE,
  FIELD,
  FIELD_LABEL,
  HELP,
  LINK_BTN,
  PANEL,
  QUIET_BTN,
  REMOVE_BTN,
  SUB_TITLE,
  TAB_BAR,
  tabCls,
} from "./adminUi";

/** 파일 선택 input — 샤프 코너 · border-soft */
const FILE_INPUT =
  "w-full text-xs text-muted file:mr-3 file:border file:border-border-soft file:bg-panel file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-foreground";

type Tab = "notices" | "faq" | "home" | "venue" | "guide";

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
}: {
  notices: Notice[];
  faqs: Faq[];
  homeContent: HomeContent;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("notices");
  const [notices, setNotices] = useState(initialNotices);
  const [faqs, setFaqs] = useState(initialFaqs);

  return (
    <div className="mt-8">
      <div className={TAB_BAR}>
        {(
          [
            ["notices", `공지사항 (${notices.length})`],
            ["faq", `FAQ (${faqs.length})`],
            ["home", "홈 화면"],
            ["venue", "시설 정보"],
            ["guide", "대관 안내"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={tabCls(tab === key)}>
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "notices" && <NoticesTab notices={notices} setNotices={setNotices} router={router} />}
        {tab === "faq" && <FaqTab faqs={faqs} setFaqs={setFaqs} router={router} />}
        {tab === "home" && <HomeContentForm content={homeContent} />}
        {tab === "venue" && <VenueFactsNotice />}
        {tab === "guide" && <GuideFactsNotice />}
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
  // 대관공고 게시물만 갖는 접수 정보 — 대관 일정의 정본은 이 게시물이다
  const [applyStart, setApplyStart] = useState("");
  const [applyEnd, setApplyEnd] = useState("");
  const [targetVenues, setTargetVenues] = useState("");
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
    setApplyStart("");
    setApplyEnd("");
    setTargetVenues("");
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
    setApplyStart(notice.applyStart ?? "");
    setApplyEnd(notice.applyEnd ?? "");
    setTargetVenues(notice.targetVenues ?? "");
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
        body: JSON.stringify({
          tag,
          title,
          body,
          imageUrl,
          attachmentUrl,
          attachmentName,
          applyStart,
          applyEnd,
          targetVenues,
        }),
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
          <li className="text-s text-muted">등록된 공지사항이 없습니다.</li>
        ) : (
          notices.map((notice) => (
            <li key={notice.id} className={CARD}>
              <div className="flex items-start justify-between gap-4">
                <button
                  type="button"
                  onClick={() => startEdit(notice)}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                  {notice.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={notice.imageUrl}
                      alt=""
                      className="h-14 w-20 shrink-0 border border-border-soft object-cover"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center text-s font-bold">
                      <TagBadge tag={notice.tag} />
                      {notice.title}
                    </div>
                    <p className={`mt-1.5 ${HELP}`}>{stripHtml(notice.body)}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs tabular-nums text-muted">
                      {new Date(notice.createdAt).toLocaleString("ko-KR")}
                      {notice.attachmentUrl && <span className="font-bold text-foreground">· 첨부파일</span>}
                    </div>
                  </div>
                </button>
                <div className="flex shrink-0 gap-4">
                  <button
                    type="button"
                    onClick={() => startEdit(notice)}
                    className={LINK_BTN}
                  >
                    수정
                  </button>
                  <button type="button" onClick={() => remove(notice.id)} className={REMOVE_BTN}>
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {editingId ? (
        <div className={`mt-6 ${PANEL}`}>
          <h3 className={SUB_TITLE}>{editingId === "__new__" ? "새 공지사항 등록" : "공지사항 수정"}</h3>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              {/* 말머리는 닫힌 목록에서만 고른다 — 자유 입력을 허용하면 같은 성격의 게시물이 갈린다 */}
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className={`w-36 shrink-0 ${FIELD}`}
              >
                <option value="">말머리 없음</option>
                {NOTICE_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={FIELD}
              />
            </div>
            {tag && <p className={HELP}>{NOTICE_TAG_HELP[tag as NoticeTag]}</p>}

            {tag === PINNED_NOTICE_TAG && (
              <div className="border border-border-soft p-4">
                <span className={FIELD_LABEL}>접수 정보 (대관공고 전용)</span>
                <p className={HELP}>
                  홈과 대관 안내의 공고 카드가 이 값을 그대로 끌어다 씁니다. 대관 일정은 이
                  게시물에만 적고 다른 화면에 복제하지 않습니다.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="접수 개시 (예: 2026년 9월 1일)"
                    value={applyStart}
                    onChange={(e) => setApplyStart(e.target.value)}
                    className={FIELD}
                  />
                  <input
                    type="text"
                    placeholder="접수 마감 (미정이면 추후 공지)"
                    value={applyEnd}
                    onChange={(e) => setApplyEnd(e.target.value)}
                    className={FIELD}
                  />
                  <input
                    type="text"
                    placeholder="대상 공간 (예: 아레나, 중형공연장)"
                    value={targetVenues}
                    onChange={(e) => setTargetVenues(e.target.value)}
                    className={FIELD}
                  />
                </div>
              </div>
            )}
            <div>
              <span className={FIELD_LABEL}>내용</span>
              <NoticeEditor value={body} onChange={setBody} />
            </div>

            <div>
              <span className={FIELD_LABEL}>대표 이미지 (목록에 표시, 선택)</span>
              {imageUrl ? (
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="h-20 w-32 border border-border-soft object-cover" />
                  <button type="button" onClick={() => setImageUrl(null)} className={REMOVE_BTN}>
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
                  className={FILE_INPUT}
                />
              )}
              {uploading && <p className={`mt-1 ${HELP}`}>업로드 중...</p>}
            </div>

            <div>
              <span className={FIELD_LABEL}>
                첨부파일 (규약/상세문서 등, 선택 · PDF/Word/한글/Excel/PowerPoint/ZIP, 20MB 이하)
              </span>
              {attachmentUrl ? (
                <div className="flex items-center gap-3">
                  <span className="border border-border-soft bg-panel px-3 py-1.5 text-xs">
                    {attachmentName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl(null);
                      setAttachmentName(null);
                    }}
                    className={REMOVE_BTN}
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
                  className={FILE_INPUT}
                />
              )}
              {uploadingAttachment && <p className={`mt-1 ${HELP}`}>업로드 중...</p>}
            </div>

            {error && <p className={ERROR_NOTE}>{error}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={saving || uploading || !title.trim() || isHtmlBodyEmpty(body)}
                onClick={save}
                className={btnClass("primary", "md")}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={resetForm} className={QUIET_BTN}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startCreate} className={`mt-6 ${ADD_BTN_LG}`}>
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
          <li className="text-s text-muted">등록된 FAQ가 없습니다.</li>
        ) : (
          faqs.map((faq) => (
            <li key={faq.id} className={CARD}>
              <div className="flex items-start justify-between gap-4">
                <button type="button" onClick={() => startEdit(faq)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center text-s font-bold">
                    <TagBadge tag={faq.tag} />
                    Q. {faq.question}
                  </div>
                  <p className={`mt-1.5 whitespace-pre-wrap ${HELP}`}>A. {faq.answer}</p>
                </button>
                <div className="flex shrink-0 gap-4">
                  <button
                    type="button"
                    onClick={() => startEdit(faq)}
                    className={LINK_BTN}
                  >
                    수정
                  </button>
                  <button type="button" onClick={() => remove(faq.id)} className={REMOVE_BTN}>
                    삭제
                  </button>
                </div>
              </div>
            </li>
          ))
        )}
      </ul>

      {editingId ? (
        <div className={`mt-6 ${PANEL}`}>
          <h3 className={SUB_TITLE}>{editingId === "__new__" ? "새 FAQ 등록" : "FAQ 수정"}</h3>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className={`w-36 shrink-0 ${FIELD}`}
              >
                <option value="">말머리 없음</option>
                {FAQ_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="질문"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className={FIELD}
              />
            </div>
            <textarea
              placeholder="답변"
              rows={4}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className={FIELD}
            />
            {error && <p className={ERROR_NOTE}>{error}</p>}
            <div className="flex items-center gap-4">
              <button
                type="button"
                disabled={saving || !question.trim() || !answer.trim()}
                onClick={save}
                className={btnClass("primary", "md")}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
              <button type="button" onClick={resetForm} className={QUIET_BTN}>
                취소
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button type="button" onClick={startCreate} className={`mt-6 ${ADD_BTN_LG}`}>
          + 새 FAQ 등록
        </button>
      )}
    </div>
  );
}
