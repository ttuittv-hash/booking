"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Attachment } from "@/lib/pricing/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentsPanel({
  quoteId,
  attachments,
  currentUserId,
  isAdmin,
}: {
  quoteId: string;
  attachments: Attachment[];
  currentUserId: string;
  isAdmin: boolean;
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
    <div className="rounded border border-border bg-panel/60 p-6">
      <h3 className="text-[15px] font-semibold">첨부서류</h3>
      <p className="mt-1 text-[12.5px] text-muted">
        사업자등록증, 공연기획서 등 관련 서류를 첨부하세요. (PDF/이미지/문서, 최대 20MB)
      </p>

      <ul className="mt-4 space-y-2">
        {attachments.length === 0 ? (
          <li className="text-[13px] text-muted">첨부된 서류가 없습니다.</li>
        ) : (
          attachments.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded border border-border bg-background px-3.5 py-2.5"
            >
              <a
                href={`/api/quotes/${quoteId}/attachments/${file.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-accent hover:underline"
              >
                {file.originalName}
              </a>
              <div className="flex items-center gap-3 text-[11.5px] text-muted">
                <span>{formatSize(file.size)}</span>
                <span>{new Date(file.createdAt).toLocaleDateString("ko-KR")}</span>
                {(isAdmin || file.uploadedBy === currentUserId) && (
                  <button
                    type="button"
                    onClick={() => remove(file.id)}
                    className="hover:text-red-600"
                  >
                    삭제
                  </button>
                )}
              </div>
            </li>
          ))
        )}
      </ul>

      <div className="mt-4 flex items-center gap-2">
        <input
          ref={fileInput}
          type="file"
          className="flex-1 text-[12.5px] text-muted file:mr-3 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={upload}
          className="shrink-0 whitespace-nowrap rounded bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {uploading ? "업로드 중..." : "업로드"}
        </button>
      </div>
      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
