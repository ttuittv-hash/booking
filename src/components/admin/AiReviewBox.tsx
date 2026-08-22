"use client";

import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { ERROR_NOTE, HELP, INFO_NOTE, PANEL, SECTION_TITLE } from "./adminUi";

type State =
  | { kind: "IDLE" }
  | { kind: "LOADING" }
  | { kind: "OK"; lines: string[] }
  | { kind: "UNCONFIGURED" }
  | { kind: "ERROR"; message: string };

/**
 * 심사 슬롯의 AI 분석 3줄 요약(2026-08-22 요청). 자동으로 호출하지 않고 운영자가
 * 눌렀을 때만 생성한다 — 화면을 열 때마다 API를 부르면 비용·지연이 매번 발생한다.
 * 첨부파일 내용은 읽지 않고 이미 계산된 구조화 데이터(금액·규모·검증 배지·첨부
 * 유무·마케팅 동의)만 근거로 쓴다(요청 시 합의된 범위).
 */
export function AiReviewBox({ quoteId }: { quoteId: string }) {
  const [state, setState] = useState<State>({ kind: "IDLE" });

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
