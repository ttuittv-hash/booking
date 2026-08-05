"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Attachment, TicketOpen, UserRole } from "@/lib/pricing/types";

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
  const [openDate, setOpenDate] = useState(ticketOpen?.openDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDate() {
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
      <div className="rounded border border-border bg-panel/60 p-6">
        <h3 className="text-[15px] font-semibold">티켓오픈</h3>
        <p className="mt-2 text-[13px] text-muted">보증금 입금 확인 후 티켓오픈일을 등록할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <h3 className="text-[15px] font-semibold">티켓오픈</h3>
      <p className="mt-1 text-[12.5px] text-muted">
        포스터, 상세페이지, 좌석배치도 등 티켓오픈 자료를 오픈일 D-30 전까지 업로드해주세요.
      </p>

      {viewerRole === "ADMIN" ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="date"
            value={openDate}
            onChange={(e) => setOpenDate(e.target.value)}
            className="rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={busy || !openDate}
            onClick={saveDate}
            className="shrink-0 whitespace-nowrap rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {ticketOpen?.openDate ? "오픈일 변경" : "오픈일 등록"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[13px]">
          티켓오픈일:{" "}
          <span className="font-semibold text-foreground">
            {ticketOpen?.openDate ?? "운영자 등록 대기"}
          </span>
        </p>
      )}
      {viewerRole === "ADMIN" && ticketOpen?.openDate && (
        <p className="mt-2 text-[12.5px] text-muted">등록된 오픈일: {ticketOpen.openDate}</p>
      )}

      {ticketOpen?.openDate && (
        <>
          <ul className="mt-4 space-y-2">
            {materials.length === 0 ? (
              <li className="text-[13px] text-muted">업로드된 자료가 없습니다.</li>
            ) : (
              materials.map((file) => (
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
                  <span className="text-[11.5px] text-muted">{formatSize(file.size)}</span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={fileInput}
              type="file"
              className="flex-1 text-[12.5px] text-muted file:mr-3 file:rounded file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-[12.5px] file:font-medium"
            />
            <button
              type="button"
              disabled={busy}
              onClick={upload}
              className="shrink-0 whitespace-nowrap rounded bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              업로드
            </button>
          </div>
        </>
      )}
      {error && <p className="mt-2 text-[12.5px] text-red-600">{error}</p>}
    </div>
  );
}
