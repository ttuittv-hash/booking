"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/format";
import { btnClass } from "@/components/ui/kit";
import { FilePicker } from "@/components/ui/FilePicker";
import { ERROR_NOTE, HELP, INFO_NOTE, PANEL, SECTION_TITLE } from "./adminUi";

type State =
  | { kind: "IDLE" }
  | { kind: "LOADING" }
  | { kind: "OK"; lines: string[] }
  | { kind: "UNCONFIGURED" }
  | { kind: "ERROR"; message: string };

interface CriteriaDoc {
  fileName: string;
  uploadedAt: string;
}

/**
 * 심사 슬롯의 AI 분석 요약(2026-08-22 요청, 2026-08-22 심사 기준 문서 비교 확장).
 * 자동으로 호출하지 않고 운영자가 눌렀을 때만 생성한다 — 화면을 열 때마다 API를
 * 부르면 비용·지연이 매번 발생한다.
 *
 * 기본은 이미 계산된 구조화 데이터(금액·규모·검증 배지·첨부 유무·마케팅 동의)만
 * 근거로 쓴다. 운영자가 아래에서 "심사 기준" 문서(PDF/DOCX, 신청서 전체 공통 —
 * 신청서마다 올리는 게 아니다)를 등록해두면 그 문서 내용까지 실제로 읽어 비교한
 * 제안을 함께 준다.
 */
export function AiReviewBox({ quoteId }: { quoteId: string }) {
  const [state, setState] = useState<State>({ kind: "IDLE" });
  const [criteria, setCriteria] = useState<CriteriaDoc | null | undefined>(undefined);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/review-criteria")
      .then((res) => res.json())
      .then((data) => setCriteria(data.doc ?? null))
      .catch(() => setCriteria(null));
  }, []);

  async function generate() {
    setState({ kind: "LOADING" });
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/ai-review`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setState({ kind: "ERROR", message: data.error || "AI 분석에 실패했습니다." });
        return;
      }
      if (data.status === "UNCONFIGURED") {
        setState({ kind: "UNCONFIGURED" });
      } else if (data.status === "OK") {
        setState({ kind: "OK", lines: data.lines });
      } else {
        setState({ kind: "ERROR", message: data.message || "AI 분석에 실패했습니다." });
      }
    } catch {
      setState({ kind: "ERROR", message: "AI 분석 요청 중 오류가 발생했습니다." });
    }
  }

  async function uploadCriteria(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/review-criteria", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || "업로드에 실패했습니다.");
        return;
      }
      setCriteria(data.doc);
    } catch {
      setUploadError("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function removeCriteria() {
    setUploading(true);
    setUploadError(null);
    try {
      const res = await fetch("/api/admin/review-criteria", { method: "DELETE" });
      if (res.ok) setCriteria(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={PANEL}>
      <div className="flex items-center justify-between gap-3">
        <h3 className={SECTION_TITLE}>AI 분석</h3>
        {state.kind !== "OK" && (
          <button
            type="button"
            onClick={generate}
            disabled={state.kind === "LOADING"}
            className={btnClass("secondary", "sm")}
          >
            {state.kind === "LOADING" ? "분석 중…" : "AI 분석 생성"}
          </button>
        )}
      </div>
      <p className={`mt-2 ${HELP}`}>
        금액·규모·검증 결과·공공성 참여·마케팅 동의 등 이미 확인된 정보만 근거로 한 참고용
        요약입니다 — 심사 판단을 대신하지 않습니다.
      </p>

      <div className="mt-4 border-t border-border-soft pt-4">
        <p className="text-xs font-bold text-foreground">심사 기준 문서 (선택)</p>
        <p className={`mt-1 ${HELP}`}>
          등록해두면 모든 신청서의 AI 분석이 이 문서 내용과 비교한 제안을 함께 보여줍니다.
          신청서마다 올리는 게 아니라 기준이 바뀔 때만 교체합니다. PDF/DOCX만 지원합니다(HWP 불가).
        </p>
        {criteria === undefined ? null : criteria ? (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-xs text-foreground">
              <span className="font-bold">{criteria.fileName}</span>
              <span className="text-muted"> · {formatDateTime(criteria.uploadedAt)} 등록</span>
            </span>
            <button
              type="button"
              onClick={removeCriteria}
              disabled={uploading}
              className={btnClass("secondary", "sm")}
            >
              제거
            </button>
          </div>
        ) : (
          <div className="mt-2">
            <FilePicker
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadCriteria(file);
                e.target.value = "";
              }}
              /* 올리자마자 이 자리가 첨부된 파일 표시로 바뀐다 — 잠깐 남는 이름이
                 없도록 비운 상태로 둔다. */
              files={[]}
            />
          </div>
        )}
        {uploadError && <p className={`mt-2 ${ERROR_NOTE}`}>{uploadError}</p>}
      </div>

      {state.kind === "OK" && (
        <ul className="mt-4 space-y-1.5 text-s">
          {state.lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      {state.kind === "UNCONFIGURED" && (
        <p className={`mt-4 ${INFO_NOTE}`}>AI 분석이 설정되어 있지 않습니다(관리자 문의).</p>
      )}
      {state.kind === "ERROR" && <p className={`mt-4 ${ERROR_NOTE}`}>{state.message}</p>}
    </div>
  );
}
