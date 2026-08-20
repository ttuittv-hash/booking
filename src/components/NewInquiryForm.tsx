"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  INQUIRY_CATEGORIES,
  findInquiryCategory,
  type InquiryCategory,
} from "@/lib/inquiryCategories";
import { btnClass } from "@/components/ui/kit";

const TITLE_MAX = 60;
const CONTENT_MAX = 2000;

export function NewInquiryForm({
  myQuoteIds,
  notifyEmail,
}: {
  /** 로그인 계정이 제출한 신청번호 — 직접 입력은 예비 수단으로만 둔다 */
  myQuoteIds: string[];
  notifyEmail: string;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const category: InquiryCategory | undefined = findInquiryCategory(categoryId);
  const showQuote = !!category && category.quote !== "NONE";
  const quoteRequired = category?.quote === "REQUIRED";

  const ready =
    !!categoryId &&
    title.trim().length > 0 &&
    content.trim().length > 0 &&
    (!quoteRequired || quoteId.trim().length > 0);

  async function submit() {
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
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "문의를 등록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      router.push(`/mypage/inquiries/${data.inquiry.id}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
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

        <div>
          <span className="mb-2 block text-xs font-bold">답변 알림 이메일</span>
          <p className="break-all text-s">{notifyEmail}</p>
          <span className="mt-2 block text-xs text-muted">
            답변이 등록되면 이 주소로 알려 드립니다. 주소를 바꾸시려면 내 정보에서 수정해 주세요.
          </span>
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
        disabled={busy || !ready}
        onClick={submit}
        className={`${btnClass("primary")} mt-6 w-full sm:w-auto`}
      >
        {busy ? "등록 중..." : "문의 등록"}
      </button>
    </div>
  );
}
