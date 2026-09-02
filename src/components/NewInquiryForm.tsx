"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  INQUIRY_CATEGORIES,
  findInquiryCategory,
  type InquiryCategory,
} from "@/lib/inquiryCategories";
import { btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

const TITLE_MAX = 60;
const CONTENT_MAX = 2000;

export function NewInquiryForm({
  myQuoteIds,
  notifyEmail,
  defaultName,
  defaultPhone,
  guest = false,
}: {
  /** 로그인 계정이 제출한 신청번호 — 직접 입력은 예비 수단으로만 둔다 */
  myQuoteIds: string[];
  notifyEmail: string;
  defaultName: string;
  defaultPhone: string;
  /** 비로그인 접수(/inquiry) — 신청번호 칸을 두지 않고, 끝나면 접수 안내를 보여 준다 */
  guest?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [categoryId, setCategoryId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  /*
    답변받을 곳 (2026-09-02).

    계정 정보로 채워 두되 고칠 수 있게 둔다 — 가입 명의는 대표 담당자인데 실제로
    답을 기다리는 사람은 실무자일 때가 많다. 답변 메일·알림톡은 여기 적은 곳으로 간다.
  */
  const [contactName, setContactName] = useState(defaultName);
  const [contactEmail, setContactEmail] = useState(notifyEmail);
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 비회원은 돌아갈 목록이 없다 — 접수됐다는 사실과 조회 링크를 이 화면에서 준다 */
  const [done, setDone] = useState(false);
  const [viewUrl, setViewUrl] = useState<string | null>(null);

  const category: InquiryCategory | undefined = findInquiryCategory(categoryId);
  // 비회원은 신청 건이 있을 수 없다 — 칸을 두면 채우라는 뜻으로 읽힌다.
  const showQuote = !guest && !!category && category.quote !== "NONE";
  const quoteRequired = category?.quote === "REQUIRED";

  /**
   * 못 채운 칸이 있으면 그게 뭔지 돌려준다.
   * 버튼을 잠가 두면 눌러도 아무 일이 없어서 고장으로 보인다 — 고객이 실제로 그렇게 신고했다.
   * 그래서 버튼은 열어 두고, 누르면 무엇이 빠졌는지 알려 준다.
   */
  function firstMissing(): string | null {
    if (!categoryId) return "문의 유형을 선택해 주세요.";
    if (guest && quoteRequired) return "이 유형은 로그인 후 신청 건을 선택해 문의해 주세요.";
    if (!guest && quoteRequired && !quoteId.trim()) return "이 유형은 신청번호가 필요합니다.";
    if (!title.trim()) return "제목을 입력해 주세요.";
    if (!content.trim()) return "문의 내용을 입력해 주세요.";
    if (!contactName.trim()) return "답변받으실 분의 이름을 입력해 주세요.";
    if (!contactEmail.trim()) return "답변받으실 이메일 주소를 입력해 주세요.";
    if (!contactPhone.trim()) return "답변받으실 전화번호를 입력해 주세요.";
    return null;
  }

  async function submit() {
    const missing = firstMissing();
    if (missing) {
      setError(missing);
      toast.error(missing);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryId,
          quoteId: showQuote ? quoteId.trim() || null : null,
          title,
          content,
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error || "문의를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.";
        setError(message);
        toast.error(message);
        return;
      }
      if (guest) {
        // 메일이 스팸함으로 가거나 주소를 잘못 적었을 수 있다 — 조회 링크를 화면에도 준다.
        setViewUrl(
          data.inquiry?.accessToken
            ? `${window.location.origin}/inquiry/${data.inquiry.id}?t=${encodeURIComponent(data.inquiry.accessToken)}`
            : null,
        );
        setDone(true);
        return;
      }
      router.push(`/mypage/inquiries/${data.inquiry.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="border-t border-border/25 pt-6">
        <h2 className="type-kr-heading text-h6-m">문의가 접수되었습니다</h2>
        <p className="mt-4 break-keep text-s leading-7 text-muted">
          답변이 등록되면 <strong className="text-foreground">{contactEmail}</strong> 로 메일과
          카카오 알림톡을 보내 드립니다. 접수 순서대로 확인하며, 영업일 기준으로 답변드립니다.
        </p>
        {viewUrl && (
          <div className="mt-6 border-t border-border/25 pt-6">
            <p className="text-xs text-muted">
              아래 주소로 문의와 답변을 다시 열어 보실 수 있습니다. 이 주소를 아는 사람만
              볼 수 있으니 따로 보관해 주세요.
            </p>
            <a href={viewUrl} className="mt-2 block break-all text-s font-bold underline">
              {viewUrl}
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="border-t border-border/25 pt-6">
      <div className="space-y-6">
        <label className="block">
          <span className="mb-2 block text-xs font-bold">문의 유형</span>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setQuoteId("");
            }}
            className="field-base"
          >
            <option value="">문의하실 내용에 가장 가까운 유형을 선택해 주세요.</option>
            {INQUIRY_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {category && <span className="mt-2 block text-xs text-muted">{category.help}</span>}
        </label>

        {/* 계정·로그인은 신청번호가 발생하지 않는 유형이므로 필드를 감춘다 */}
        {showQuote && (
          <label className="block">
            <span className="mb-2 block text-xs font-bold">
              관련 신청번호
              {!quoteRequired && <span className="ml-1 font-normal text-muted">(선택)</span>}
            </span>
            {myQuoteIds.length > 0 ? (
              <select
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                className="field-base"
              >
                <option value="">
                  {quoteRequired
                    ? "문의하실 신청 건을 선택해 주세요."
                    : "특정 신청 건에 관한 문의라면 해당 신청번호를 선택해 주세요."}
                </option>
                {myQuoteIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={quoteId}
                onChange={(e) => setQuoteId(e.target.value)}
                placeholder="신청번호를 입력해 주세요."
                className="field-base"
              />
            )}
          </label>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-bold">제목</span>
          <input
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            className="field-base"
          />
          <span className="mt-2 block text-xs text-muted">
            문의 내용을 한 줄로 요약해 주세요. {title.length}/{TITLE_MAX}자
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold">내용</span>
          <textarea
            value={content}
            maxLength={CONTENT_MAX}
            onChange={(e) => setContent(e.target.value)}
            rows={10}
            className="field-base leading-7"
          />
          <span className="mt-2 block text-xs text-muted">
            확인이 필요한 내용을 구체적으로 적어 주세요. 희망 일정이나 공연 규모를 함께 알려 주시면
            더 정확히 답변드릴 수 있습니다. {content.length.toLocaleString()}/
            {CONTENT_MAX.toLocaleString()}자
          </span>
        </label>

        <div className="border-t border-border/25 pt-6">
          <span className="block text-xs font-bold">답변받으실 곳</span>
          <p className="mt-2 text-xs text-muted">
            {guest
              ? "답변이 등록되면 아래 이메일과 카카오 알림톡으로 알려 드립니다. 연락 가능한 곳으로 적어 주세요."
              : "답변이 등록되면 아래 이메일과 카카오 알림톡으로 알려 드립니다. 계정 정보로 채워 두었으니, 다른 분이 받으셔야 하면 고쳐 주세요."}
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-bold">이름</span>
              <input
                type="text"
                value={contactName}
                maxLength={40}
                onChange={(e) => setContactName(e.target.value)}
                className="field-base"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold">이메일</span>
              <input
                type="email"
                value={contactEmail}
                maxLength={120}
                onChange={(e) => setContactEmail(e.target.value)}
                className="field-base"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-bold">전화번호</span>
              <input
                type="tel"
                value={contactPhone}
                maxLength={20}
                placeholder="010-0000-0000"
                onChange={(e) => setContactPhone(e.target.value)}
                className="field-base"
              />
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-6 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}

      <p className="mt-8 border-t border-border/25 pt-3 text-xs leading-5 text-muted">
        문의는 접수 순서대로 확인하며, 영업일 기준으로 답변드립니다. 같은 내용을 여러 번 등록하시면
        답변이 늦어질 수 있습니다.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={submit}
        className={`${btnClass("primary")} mt-6 w-full sm:w-auto`}
      >
        {busy ? "등록 중..." : "문의 등록"}
      </button>
    </div>
  );
}
