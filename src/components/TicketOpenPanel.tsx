"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Attachment, TicketOpen, UserRole } from "@/lib/pricing/types";
import { Badge, btnClass } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

const FILE_FIELD =
  "field-base min-w-0 flex-1 file:mr-3 file:border file:border-foreground file:bg-transparent file:px-3 file:py-1 file:text-xs file:font-bold file:text-foreground";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function TicketOpenPanel({
  quoteId,
  depositConfirmed,
  ticketOpen,
  materials,
  viewerRole,
}: {
  quoteId: string;
  depositConfirmed: boolean;
  ticketOpen: TicketOpen | null;
  materials: Attachment[];
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [openDate, setOpenDate] = useState(ticketOpen?.openDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDate() {
    if (!openDate) {
      toast.error("티켓 오픈일을 선택해 주세요.");
      return;
    }
    if (!openDate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/ticket-open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "등록에 실패했습니다.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    const file = fileInput.current?.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "TICKET_OPEN");
      const res = await fetch(`/api/quotes/${quoteId}/attachments`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "업로드에 실패했습니다.");
        return;
      }
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!depositConfirmed) {
    return (
      <div>
        {/* AttachmentsPanel 과 헤딩 규격을 맞춘다 (2px 룰 + type-kr-heading) */}
        <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
          티켓오픈
        </h3>
        <p className="mt-3 text-s text-muted">보증금 입금 확인 후 티켓오픈일을 등록할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">티켓오픈</h3>
        {ticketOpen?.openDate && <Badge tone="accent">오픈일 등록됨</Badge>}
      </div>
      <p className="mt-3 text-s text-muted">
        포스터, 상세페이지, 좌석배치도 등 티켓오픈 자료를 오픈일 D-30 전까지 업로드해주세요.
      </p>

      {viewerRole === "ADMIN" ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            type="date"
            value={openDate}
            onChange={(e) => setOpenDate(e.target.value)}
            aria-label="티켓오픈일"
            className="field-base tabular-nums sm:w-52"
          />
          <button
            type="button"
            disabled={busy}
            onClick={saveDate}
            className={`${btnClass("primary", "md")} shrink-0`}
          >
            {ticketOpen?.openDate ? "오픈일 변경" : "오픈일 등록"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-s text-muted">
          티켓오픈일{" "}
          <b className="tabular-nums text-foreground">
            {ticketOpen?.openDate ?? "운영자 등록 대기"}
          </b>
        </p>
      )}
      {viewerRole === "ADMIN" && ticketOpen?.openDate && (
        <p className="mt-3 text-xs text-muted tabular-nums">등록된 오픈일: {ticketOpen.openDate}</p>
      )}

      {ticketOpen?.openDate && (
        <>
          <ul className="mt-6 border-t border-border/25">
            {materials.length === 0 ? (
              <li className="border-b border-border/25 py-4 text-s text-muted">
                업로드된 자료가 없습니다.
              </li>
            ) : (
              materials.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center justify-between gap-4 border-b border-border/25 py-4"
                >
                  <a
                    href={`/api/quotes/${quoteId}/attachments/${file.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-s font-bold text-foreground underline decoration-accent decoration-2 underline-offset-4"
                  >
                    {file.originalName}
                  </a>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {formatSize(file.size)}
                  </span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <input ref={fileInput} type="file" className={FILE_FIELD} />
            <button
              type="button"
              disabled={busy}
              onClick={upload}
              className={`${btnClass("primary", "md")} shrink-0`}
            >
              업로드
            </button>
          </div>
        </>
      )}
      {error && (
        <p className="mt-4 border-l-2 border-danger bg-danger-soft px-4 py-2.5 text-s text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
