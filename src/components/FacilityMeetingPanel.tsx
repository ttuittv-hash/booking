"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Attachment, FacilityMeeting, UserRole } from "@/lib/pricing/types";
import { Badge, btnClass, FILE_INPUT } from "@/components/ui/kit";
import { useToast } from "@/components/ui/Toast";

const FILE_FIELD = `${FILE_INPUT} min-w-0 flex-1`;

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
  const toast = useToast();
  const [meetingDate, setMeetingDate] = useState(facilityMeeting?.meetingDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveDate() {
    if (!meetingDate) {
      toast.error("회의 일자를 선택해 주세요.");
      return;
    }
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
      <div>
        {/* AttachmentsPanel 과 헤딩 규격을 맞춘다 (2px 룰 + type-kr-heading) */}
        <h3 className="type-kr-heading border-t-2 border-foreground pt-4 text-h6-m sm:text-h6">
          시설회의
        </h3>
        <p className="mt-3 text-s text-muted">티켓오픈 등록 후 시설회의일을 등록할 수 있습니다.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-t-2 border-foreground pt-4">
        <h3 className="type-kr-heading text-h6-m sm:text-h6">시설회의</h3>
        {facilityMeeting?.meetingDate && <Badge tone="accent">회의일 등록됨</Badge>}
      </div>
      <p className="mt-3 text-s text-muted">
        운영 매뉴얼, 프로덕션 노트 등 시설회의 자료를 회의일 D-7 전까지 업로드해주세요.
      </p>

      {viewerRole === "ADMIN" ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            aria-label="시설회의일"
            className="field-base tabular-nums sm:w-52"
          />
          <button
            type="button"
            disabled={busy}
            onClick={saveDate}
            className={`${btnClass("primary", "md")} shrink-0`}
          >
            {facilityMeeting?.meetingDate ? "회의일 변경" : "회의일 등록"}
          </button>
        </div>
      ) : (
        <p className="mt-4 text-s text-muted">
          시설회의일{" "}
          <b className="tabular-nums text-foreground">
            {facilityMeeting?.meetingDate ?? "운영자 등록 대기"}
          </b>
        </p>
      )}

      {facilityMeeting?.meetingDate && (
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
