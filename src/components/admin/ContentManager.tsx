"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Faq, Notice } from "@/lib/pricing/types";
import type { HomeContent, LegalContent } from "@/lib/content/types";
import type {
  DocumentsContent,
  FeaturesContent,
  GuidePageContent,
  RatesContent,
  RulesContent,
  ScreenTextContent,
  SeoulArenaContent,
} from "@/lib/content/pageContent";
import { TagBadge } from "@/components/TagBadge";
import { FAQ_TAGS } from "@/lib/content/faqSeed";
import { Badge, btnClass } from "@/components/ui/kit";
import { NoticeEditor } from "./NoticeEditor";
import { HomeContentForm } from "./HomeContentForm";
import { formatDateTime } from "@/lib/format";
import { useQueryTab } from "@/components/admin/useQueryTab";
import { confirmDiscardUnsaved } from "./unsavedChanges";
import { LegalContentForm } from "./LegalContentForm";
import {
  DocumentsForm,
  FeaturesForm,
  GuideForm,
  RatesForm,
  RulesForm,
  ScreenTextForm,
  SeoulArenaForm,
} from "./PageContentForms";
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

type Tab =
  | "notices"
  | "faq"
  | "home"
  | "seoularena"
  | "features"
  | "guide"
  | "rates"
  | "rules"
  | "documents"
  | "screenText"
  | "legal";

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
  seoulArenaContent,
  featuresContent,
  guideContent,
  ratesContent,
  rulesContent,
  documentsContent,
  screenTextContent,
  termsContent,
  privacyContent,
}: {
  notices: Notice[];
  faqs: Faq[];
  homeContent: HomeContent;
  seoulArenaContent: SeoulArenaContent;
  featuresContent: FeaturesContent;
  guideContent: GuidePageContent;
  ratesContent: RatesContent;
  rulesContent: RulesContent;
  documentsContent: DocumentsContent;
  screenTextContent: ScreenTextContent;
  termsContent: LegalContent;
  privacyContent: LegalContent;
}) {
  const router = useRouter();
  // 탭을 URL(?tab=)에 싣는다 — 새로고침해도 유지되고 특정 탭을 링크로 줄 수 있다.
  const [tab, setTab] = useQueryTab<Tab>(
    "tab",
    [
      "notices",
      "faq",
      "home",
      "seoularena",
      "features",
      "guide",
      "rates",
      "rules",
      "documents",
      "screenText",
      "legal",
    ],
    "notices",
  );
  const [notices, setNotices] = useState(initialNotices);
  const [faqs, setFaqs] = useState(initialFaqs);

  return (
    <div className="mt-8">
      <div className={TAB_BAR}>
        {(
          [
            ["notices", `공지사항 (${notices.length})`],
            ["faq", `FAQ (${faqs.length})`],
            ["home", "홈"],
            ["seoularena", "서울아레나"],
            ["features", "시설 제원"],
            ["guide", "대관 절차"],
            ["rates", "대관료"],
            ["rules", "대관 규약"],
            ["documents", "대관 자료"],
            ["screenText", "화면 문구"],
            ["legal", "약관 · 정책"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            /* 탭을 바꾸면 그 탭의 폼이 통째로 사라진다 — 저장 안 한 편집이 있으면 먼저 묻는다.
               올린 파일이 저장 없이 사라져 공개 화면이 옛 파일을 계속 내려준 적이 있다. */
            onClick={() => {
              if (key !== tab && !confirmDiscardUnsaved()) return;
              setTab(key);
            }}
            className={tabCls(tab === key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "notices" && <NoticesTab notices={notices} setNotices={setNotices} router={router} />}
        {tab === "faq" && <FaqTab faqs={faqs} setFaqs={setFaqs} router={router} />}
        {tab === "home" && <HomeContentForm content={homeContent} />}
        {tab === "seoularena" && <SeoulArenaForm content={seoulArenaContent} />}
        {tab === "features" && <FeaturesForm content={featuresContent} />}
        {tab === "guide" && <GuideForm content={guideContent} />}
        {tab === "rates" && <RatesForm content={ratesContent} />}
        {tab === "rules" && <RulesForm content={rulesContent} />}
        {tab === "documents" && <DocumentsForm content={documentsContent} />}
        {tab === "screenText" && <ScreenTextForm content={screenTextContent} />}
        {tab === "legal" && (
          <div className="space-y-10">
            <LegalContentForm
              kind="terms"
              label="이용약관"
              content={termsContent}
              publicHref="/terms"
            />
            <LegalContentForm
              kind="privacy"
              label="개인정보처리방침"
              content={privacyContent}
              publicHref="/privacy"
            />
          </div>
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
  const [showBookingCalendar, setShowBookingCalendar] = useState(false);
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
    setShowBookingCalendar(false);
    setError(null);
  }

  // 편집 폼은 목록 아래에 있어 목록이 길면 화면 밖에 열린다 — 눌러도 아무 일이
  // 없어 보이지 않게 폼으로 데려간다.
  const formRef = useRef<HTMLDivElement>(null);
  function scrollToForm() {
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "start" }));
  }

  function startEdit(notice: Notice) {
    scrollToForm();
    setEditingId(notice.id);
    setTag(notice.tag ?? "");
    setTitle(notice.title);
    setBody(notice.body);
    setImageUrl(notice.imageUrl);
    setAttachmentUrl(notice.attachmentUrl);
    setAttachmentName(notice.attachmentName);
    setShowBookingCalendar(notice.showBookingCalendar);
  }

  function resetForm() {
    setEditingId(null);
    setTag("");
    setTitle("");
    setBody("");
    setImageUrl(null);
    setAttachmentUrl(null);
    setAttachmentName(null);
    setShowBookingCalendar(false);
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
    /*
      [수정 2026-09-04] 워드·페이지에서 그대로 붙여넣은 본문은 이미지가 base64 data:
      URL 로 문서 안에 박혀 몇백 KB~몇 MB 가 된다 — 편집기가 붙여넣기/드롭 시점에
      파일이면 가로채 업로드하지만(NoticeEditor), 붙여넣은 HTML 자체에 이미 data:
      URL 로 박혀 있던 이전 저장분·예외 경로는 여전히 남아 있을 수 있다. 이 상태로
      보내면 앞단(프록시/WAF)이 요청을 통째로 막아 413 뿐 아니라 403 으로도 돌아올
      수 있다 — 네트워크를 타기 전에 걸러 바로 알려준다.
    */
    if (body.includes("data:image")) {
      setError(
        "본문에 붙여넣기로 들어간 이미지가 있습니다 (밑줄로 보이지 않아도 본문이 매우 커집니다). " +
          "그 이미지를 지우고 [이미지 삽입] 버튼으로 다시 올려 주세요.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(isNew ? "/api/admin/notices" : `/api/admin/notices/${editingId}`, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag, title, body, imageUrl, attachmentUrl, attachmentName, showBookingCalendar }),
      });
      /*
        [수정 2026-09-02] 응답이 JSON 이 아닐 수 있다.

        페이지·워드에서 붙여넣은 본문은 이미지가 data: URL 로 딸려 와 수 MB 가 되는데,
        그러면 앞단(프록시)이 413 을 HTML 로 돌려준다. 예전 코드는 `res.json()` 에서
        그대로 예외가 나 catch 도 없이 끝났고, 화면에는 아무 일도 안 일어나
        "저장 버튼이 안 눌린다"로 보였다.
      */
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error ??
            (res.status === 413 || res.status === 403
              ? "저장이 막혔습니다 (본문이 너무 크거나 앞단에서 차단됨). 붙여넣은 이미지는 " +
                "[이미지 삽입] 버튼으로 올려 주세요. 계속되면 관리자에게 문의하세요."
              : `저장에 실패했습니다. (오류 ${res.status})`),
        );
        return;
      }
      if (!data?.notice) {
        setError("저장 결과를 읽지 못했습니다. 새로고침 후 다시 확인해 주세요.");
        return;
      }
      if (isNew) {
        setNotices([data.notice, ...notices]);
      } else {
        setNotices(notices.map((n) => (n.id === editingId ? data.notice : n)));
      }
      resetForm();
      router.refresh();
    } catch {
      setError("저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.");
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
                      {formatDateTime(notice.createdAt)}
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
        // [수정 2026-09-02] key 로 편집 대상마다 폼을 새로 만든다. 본문 편집기(TipTap)는
        // content 를 마운트할 때 한 번만 읽어서, 폼이 이미 열려 있는 상태로 다른 공지의
        // [수정] 을 누르면 제목만 바뀌고 본문은 앞 공지의 것이 그대로 남았다 —
        // 화면이 안 바뀌니 "버튼이 안 눌린다"로 보였다.
        <div key={editingId} ref={formRef} className={`mt-6 ${PANEL}`}>
          <h3 className={SUB_TITLE}>{editingId === "__new__" ? "새 공지사항 등록" : "공지사항 수정"}</h3>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="말머리 (예: 공지, 점검)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className={`w-32 shrink-0 ${FIELD}`}
              />
              <input
                type="text"
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={FIELD}
              />
            </div>
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

            <label className="flex cursor-pointer items-center gap-2 text-s">
              <input
                type="checkbox"
                checked={showBookingCalendar}
                onChange={(e) => setShowBookingCalendar(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              공지 상세에 &ldquo;대관 현황 캘린더&rdquo; 아이콘 표시(아레나·중형 예약 가능일 조회)
            </label>

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

  const formRef = useRef<HTMLDivElement>(null);
  function scrollToForm() {
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ block: "start" }));
  }

  function startEdit(faq: Faq) {
    scrollToForm();
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
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? `저장에 실패했습니다. (오류 ${res.status})`);
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
                  <div className="flex items-center gap-2 text-s font-bold">
                    {faq.tag && (
                      <span className="inline-flex align-middle">
                        <Badge tone="neutral">{faq.tag}</Badge>
                      </span>
                    )}
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
        // 공지와 같은 이유로 편집 대상마다 폼을 새로 만든다(위 주석 참고).
        <div key={editingId} ref={formRef} className={`mt-6 ${PANEL}`}>
          <h3 className={SUB_TITLE}>{editingId === "__new__" ? "새 FAQ 등록" : "FAQ 수정"}</h3>
          <div className="mt-4 space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                list="faq-tag-options"
                placeholder="말머리 (예: 대관 신청)"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className={`w-40 shrink-0 ${FIELD}`}
              />
              <datalist id="faq-tag-options">
                {FAQ_TAGS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
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
