"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Attachment } from "@/lib/pricing/types";
import { btnClass, FILE_INPUT } from "@/components/ui/kit";
import { formatDate } from "@/lib/format";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentsPanel({
  quoteId,
  attachments,
}: {
  quoteId: string;
  attachments: Attachment[];
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
                className="min-w-0 truncate text-s font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
              >
                {file.originalName}
              </a>
              <div className="flex shrink-0 items-center gap-4 text-xs text-muted tabular-nums">
                <span>{formatSize(file.size)}</span>
                <span>{formatDate(file.createdAt)}</span>
                <button
                  type="button"
                  onClick={() => remove(file.id)}
                  className="cursor-pointer transition-colors hover:text-danger"
                >
                  삭제
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          ref={fileInput}
          type="file"
          className={`${FILE_INPUT} min-w-0 flex-1`}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={upload}
          className={`${btnClass("primary")} shrink-0`}
        >
          {uploading ? "업로드 중..." : "업로드"}
        </button>
      </div>
      {error && (
        <p className="mt-3 border-l-2 border-danger bg-danger-soft px-3 py-2 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
