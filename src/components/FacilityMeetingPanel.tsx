"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Attachment, FacilityMeeting, UserRole } from "@/lib/pricing/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function FacilityMeetingPanel({
  quoteId,
  ticketOpenRegistered,
  facilityMeeting,
  materials,
  viewerRole,
}: {
  quoteId: string;
  ticketOpenRegistered: boolean;
  facilityMeeting: FacilityMeeting | null;
  materials: Attachment[];
  viewerRole: UserRole;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [meetingDate, setMeetingDate] = useState(facilityMeeting?.meetingDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDate() {
    if (!meetingDate) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quotes/${quoteId}/facility-meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meetingDate }),
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
      formData.append("category", "FACILITY_MEETING");
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

  if (!ticketOpenRegistered) {
    return (
      <div className="rounded border border-border bg-panel/60 p-6">
        <h3 className="text-[15px] font-semibold">시설회의</h3>
        <p className="mt-2 text-[13px] text-muted">티켓오픈 등록 후 시설회의일을 등록할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-panel/60 p-6">
      <h3 className="text-[15px] font-semibold">시설회의</h3>
      <p className="mt-1 text-[12.5px] text-muted">
        운영 매뉴얼, 프로덕션 노트 등 시설회의 자료를 회의일 D-7 전까지 업로드해주세요.
      </p>

      {viewerRole === "ADMIN" ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="rounded-sm border border-border bg-background px-3 py-2 text-[13px] outline-none focus:border-accent"
          />
          <button
            type="button"
            disabled={busy || !meetingDate}
            onClick={saveDate}
            className="shrink-0 whitespace-nowrap rounded-sm bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-50"
          >
            {facilityMeeting?.meetingDate ? "회의일 변경" : "회의일 등록"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[13px]">
          시설회의일:{" "}
          <span className="font-semibold text-foreground">
            {facilityMeeting?.meetingDate ?? "운영자 등록 대기"}
          </span>
        </p>
      )}

      {facilityMeeting?.meetingDate && (
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
