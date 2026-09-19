"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PUBLIC_INTEREST_ITEM_LABEL, type Attachment } from "@/lib/pricing/types";
import { FilePicker } from "@/components/ui/FilePicker";
import { btnClass } from "@/components/ui/kit";
import { formatDateTime } from "@/lib/format";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentsPanel({
  quoteId,
  attachments,
  mode = "open",
}: {
  quoteId: string;
  attachments: Attachment[];
  /**
   * [신규 2026-09-18] 접수 마감 뒤 신청자의 첨부 조작을 제한한다(nora).
   *
   *   open       — 올리기·지우기 모두 가능 (운영자, 그리고 마감 전 신청자)
   *   supplement — **올리기만** 가능. 보류(보완 요청) 중인 신청서다. 이미 낸 자료는
   *                심의 근거라 지우지 못하게 둔 채로 새 자료만 받는다("기존것은 삭제못하도록
   *                막은채로 신규 첨부파일 업로드 기능이 활성화", nora)
   *   locked     — 둘 다 불가. 마감됐고 보완 요청도 없는 상태
   *
   * 이 컴포넌트는 신청자 화면(mypage/[id])과 운영자 화면(admin/[id])이 **함께 쓴다** —
   * 여기서 스스로 판단하면 운영진까지 막힌다. 어느 모드인지는 화면이 정해서 내려준다.
   * 내려받기는 어느 모드에서도 막지 않는다 — 자기가 낸 서류를 다시 못 보는 건 과하다.
   */
  mode?: "open" | "supplement" | "locked";
}) {
  const canUpload = mode !== "locked";
  const canDelete = mode === "open";
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
                {/* [수정 2026-09-19] 날짜만 찍던 것을 시각까지 보여준다(nora) — 같은 날 여러 번
                    올린 자료의 선후를 날짜만으로는 가릴 수 없다. 24시간제인 이유는 format.ts 참고. */}
                <span>{formatDateTime(file.createdAt)}</span>
                {canDelete && (
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

      {mode === "supplement" && (
        <p className="mt-6 border-l-2 border-foreground px-3 py-2 text-s">
          보완 요청을 받은 신청서입니다. <b>새 자료를 추가로 올릴 수 있습니다.</b> 이미 제출한
          서류는 심의 근거라 지울 수 없습니다.
        </p>
      )}

      {canUpload ? (
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
      ) : (
        <p className="mt-6 border-l-2 border-border px-3 py-2 text-s text-muted">
          접수가 마감되어 서류를 추가하거나 지울 수 없습니다. 이미 제출한 서류는 위에서 내려받을
          수 있고, 변경이 필요하면 운영자에게 문의해 주세요.
        </p>
      )}
      {error && (
        <p className="mt-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
