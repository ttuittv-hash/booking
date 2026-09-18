"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PUBLIC_INTEREST_ITEM_LABEL, type Attachment } from "@/lib/pricing/types";
import { FilePicker } from "@/components/ui/FilePicker";
import { btnClass } from "@/components/ui/kit";
import { formatDate } from "@/lib/format";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentsPanel({
  quoteId,
  attachments,
  locked = false,
}: {
  quoteId: string;
  attachments: Attachment[];
  /**
   * [신규 2026-09-18] 접수 마감 뒤 신청자가 첨부를 올리거나 지우지 못하게 잠근다(nora).
   *
   * 이 컴포넌트는 신청자 화면(mypage/[id])과 운영자 화면(admin/[id])이 **함께 쓴다** —
   * 여기서 스스로 잠그면 운영진까지 막힌다. 잠글지는 화면이 정해서 내려준다.
   * 내려받기는 잠가도 열어 둔다 — 자기가 낸 서류를 다시 못 보는 건 과하다.
   */
  locked?: boolean;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/quotes/${quoteId}/attachments`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "업로드에 실패했습니다.");
        return;
      }
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  async function remove(attachmentId: string) {
    await fetch(`/api/quotes/${quoteId}/attachments/${attachmentId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
        첨부서류
      </h3>
      <p className="mt-3 text-xs text-muted">
        사업자등록증, 공연기획서 등 관련 서류를 첨부하세요. (PDF/이미지/문서, 최대 500MB)
      </p>

      <ul className="mt-6 border-t border-border/25">
        {attachments.length === 0 ? (
          <li className="border-b border-border/25 py-4 text-s text-muted">
            첨부된 서류가 없습니다.
          </li>
        ) : (
          attachments.map((file) => (
            <li
              key={file.id}
              className="flex flex-col gap-2 border-b border-border/25 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            >
              <a
                href={`/api/quotes/${quoteId}/attachments/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-s font-bold text-foreground"
              >
                {file.originalName}
              </a>
              {/* 공공/공익 STEP 에서 항목에 붙여 올린 자료면 어느 항목인지 같이 보여준다
                  (2026-08-27) — 그전에는 파일명만 남아 심사에서 되물어야 했다. */}
              {file.publicInterestItem && (
                <span className="shrink-0 border border-border/25 px-2 py-1 text-xs text-muted">
                  공공/공익 · {PUBLIC_INTEREST_ITEM_LABEL[file.publicInterestItem]}
                </span>
              )}
              <div className="flex shrink-0 items-center gap-4 text-xs text-muted tabular-nums">
                <span>{formatSize(file.size)}</span>
                <span>{formatDate(file.createdAt)}</span>
                {!locked && (
                  <button
                    type="button"
                    onClick={() => remove(file.id)}
                    className="cursor-pointer transition-colors hover:text-danger"
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      {locked ? (
        <p className="mt-6 border-l-2 border-border px-3 py-2 text-s text-muted">
          접수가 마감되어 서류를 추가하거나 지울 수 없습니다. 이미 제출한 서류는 위에서 내려받을
          수 있고, 변경이 필요하면 운영자에게 문의해 주세요.
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {/* 파일 목록은 위 <ul> 이 그리므로 상태 줄은 끈다 */}
          <FilePicker inputRef={fileInput} emptyLabel="" className="min-w-0 flex-1" />
          <button
            type="button"
            disabled={uploading}
            onClick={upload}
            className={`${btnClass("primary")} shrink-0`}
          >
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
