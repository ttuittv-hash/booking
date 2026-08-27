"use client";

import Link from "next/link";
import { useState } from "react";
import { won } from "@/lib/format";
import { btnClass } from "@/components/ui/kit";
import type { CompetingCandidateFacts } from "@/lib/scoring/competingCandidate";
import {
  ERROR_NOTE,
  INFO_NOTE,
  NONE,
  SECTION_TITLE,
  TABLE,
  TABLE_SCROLL,
  TD,
  TD_ID,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "./adminUi";

type AiState =
  | { kind: "IDLE" }
  | { kind: "LOADING" }
  | { kind: "OK"; lines: string[] }
  | { kind: "UNCONFIGURED" }
  | { kind: "ERROR"; message: string };

/**
 * [신규 2026-08-26] "동일 기간 내 다른 대관사 비교" 슬롯 — findApprovedWeekConflict가
 * 승인 충돌 1건만 확인하는 것과 달리, 같은 주차·같은 공간에 겹치는 신청서 전체를
 * scoreQuote 잠정 점수와 함께 나란히 보여준다. AI 추천은 이 표에 이미 보이는 구조화된
 * 값만 근거로 삼는다(첨부파일 원문 X) — 최종 판단이 아니라 참고용이라는 점을
 * AiReviewBox와 같은 관례로 명시한다.
 */
export function CompetingQuotesPanel({
  quoteId,
  candidates,
}: {
  quoteId: string;
  candidates: CompetingCandidateFacts[];
}) {
  const [ai, setAi] = useState<AiState>({ kind: "IDLE" });
  const sorted = [...candidates].sort((a, b) => b.provisionalScore - a.provisionalScore);

  async function generate() {
    setAi({ kind: "LOADING" });
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}/ai-compare`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setAi({ kind: "ERROR", message: data.error || "AI 추천에 실패했습니다." });
        return;
      }
      if (data.status === "UNCONFIGURED") setAi({ kind: "UNCONFIGURED" });
      else if (data.status === "OK") setAi({ kind: "OK", lines: data.lines });
      else setAi({ kind: "ERROR", message: data.message || "AI 추천에 실패했습니다." });
    } catch {
      setAi({ kind: "ERROR", message: "AI 추천 요청 중 오류가 발생했습니다." });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className={SECTION_TITLE}>동일 기간 내 다른 대관사 비교</h3>
          <p className="mt-1 text-xs text-muted">
            같은 주차·같은 공간에 겹치는 신청서를 채점 초안(자동 산정) 잠정 합계 기준으로 나열합니다.
          </p>
        </div>
        {ai.kind !== "OK" && (
          <button
            type="button"
            onClick={generate}
            disabled={ai.kind === "LOADING"}
            className={`${btnClass("secondary", "sm")} shrink-0`}
          >
            {ai.kind === "LOADING" ? "추천 생성 중…" : "AI 추천 생성"}
          </button>
        )}
      </div>

      <div className={`mt-4 ${TABLE_SCROLL}`}>
        <table className={TABLE}>
          <thead className={THEAD_ROW}>
            <tr>
              <th className={TH}>대관사</th>
              <th className={TH}>공간</th>
              <th className={TH}>상태</th>
              <th className={TH_NUM}>채점(잠정)</th>
              <th className={TH}>적격</th>
              <th className={TH_NUM}>예상 관객</th>
              <th className={TH_NUM}>예상금액</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.quoteId} className={TR}>
                <td className={TD_ID}>
                  {c.isCurrent ? (
                    <span>{c.companyName ?? NONE} (현재)</span>
                  ) : (
                    <Link href={`/admin/${c.quoteId}`} className="underline decoration-accent decoration-2 underline-offset-4">
                      {c.companyName ?? NONE}
                    </Link>
                  )}
                  <div className="mt-0.5 text-xs font-normal text-muted">{c.quoteId}</div>
                </td>
                <td className={TD}>{c.venueLabel}</td>
                <td className={TD}>{c.statusLabel}</td>
                <td className={TD_NUM}>
                  <span className="font-bold tabular-nums">{c.provisionalScore}</span>
                  {c.unresolvedMax > 0 && <span className="text-muted"> (+미산정 {c.unresolvedMax})</span>}
                </td>
                <td className={TD}>
                  <span className={`text-xs font-bold ${c.eligible ? "text-good" : "text-danger"}`}>
                    {c.eligible ? "잠정 적격" : "잠정 미달"}
                  </span>
                </td>
                <td className={TD_NUM}>{c.expectedAudience.toLocaleString("ko-KR")}명</td>
                <td className={TD_NUM}>{won(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {ai.kind === "OK" && (
        <ul className="mt-4 space-y-1.5 text-s">
          {ai.lines.map((line, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-muted">·</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
      {ai.kind === "UNCONFIGURED" && (
        <p className={`mt-4 ${INFO_NOTE}`}>AI 추천이 설정되어 있지 않습니다(관리자 문의).</p>
      )}
      {ai.kind === "ERROR" && <p className={`mt-4 ${ERROR_NOTE}`}>{ai.message}</p>}
    </div>
  );
}
