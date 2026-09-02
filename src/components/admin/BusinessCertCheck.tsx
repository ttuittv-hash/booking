"use client";

// 심사 화면의 "사업자등록증 대조" 패널 (2026-09-02).
//
// 첨부된 등록증을 실제로 읽어 등록번호·상호·대표자를 가입 입력값과 맞춰 본다.
// 결과는 표시만 한다 — 승인/거절 판단은 운영자가 한다. 판독은 사진 품질에 따라
// 흔히 실패하므로, 실패를 위조 신호로 읽히게 두면 멀쩡한 신청자가 막힌다.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/kit";
import { HELP, INFO_NOTE, LINK_BTN, TABLE, TD, TH, THEAD_ROW, TR } from "@/components/admin/adminUi";

type FieldState = "MATCH" | "MISMATCH" | "UNREADABLE" | "NONE";

type CheckStatus = "MATCH" | "PARTIAL" | "MISMATCH" | "UNREADABLE" | "NOT_CERT" | "ERROR";

export interface CertCheckView {
  status: CheckStatus;
  fields: { key: string; label: string; expected: string; extracted: string; state: FieldState }[];
  openedOn: string;
  message: string;
  checkedAt: string;
  extraction: { note?: string } | null;
}

const STATUS_LABEL: Record<CheckStatus, string> = {
  MATCH: "일치",
  PARTIAL: "일부 확인 필요",
  MISMATCH: "불일치",
  UNREADABLE: "판독 실패",
  NOT_CERT: "등록증 아님",
  ERROR: "오류",
};

const STATUS_TONE: Record<CheckStatus, "good" | "warn" | "danger" | "neutral"> = {
  MATCH: "good",
  PARTIAL: "warn",
  MISMATCH: "danger",
  UNREADABLE: "neutral",
  NOT_CERT: "danger",
  ERROR: "neutral",
};

const FIELD_MARK: Record<FieldState, string> = {
  MATCH: "일치",
  MISMATCH: "다름",
  UNREADABLE: "못 읽음",
  NONE: "—",
};

const FIELD_TONE: Record<FieldState, string> = {
  MATCH: "text-ok",
  MISMATCH: "text-danger",
  UNREADABLE: "text-muted",
  NONE: "text-muted",
};

export function BusinessCertCheck({
  companyId,
  fileUrl,
  configured,
  initial,
  checkedByName,
}: {
  companyId: string;
  fileUrl: string;
  /** ANTHROPIC_API_KEY 가 있는 환경인가 */
  configured: boolean;
  /** 이전에 판독해 둔 결과 */
  initial: CertCheckView | null;
  checkedByName: string | null;
}) {
  const router = useRouter();
  const [result, setResult] = useState<CertCheckView | null>(initial);
  const [by, setBy] = useState<string | null>(checkedByName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/admin/cert-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, fileUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "판독하지 못했습니다.");
      if (data.result?.status === "ERROR") {
        setError(data.result.message);
        return;
      }
      setResult(data.result);
      setBy(data.checkedByName ?? null);
      // 다른 화면(목록 등)이 같은 결과를 읽을 수 있게 서버 데이터를 새로 고친다.
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "판독하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <p className={`mt-2 ${HELP}`}>
        자동 대조는 이 환경에서 꺼져 있습니다. 첨부 파일을 열어 직접 확인해 주세요.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <span className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void run()} disabled={busy} className={LINK_BTN}>
          {busy ? "판독 중…" : result ? "다시 대조" : "등록증과 입력값 대조"}
        </button>
        {result ? <Badge tone={STATUS_TONE[result.status]}>{STATUS_LABEL[result.status]}</Badge> : null}
      </span>

      {busy ? (
        <p className={`mt-2 ${HELP}`}>첨부 파일을 읽고 있습니다. 10초 남짓 걸립니다.</p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}

      {result ? (
        <>
          <p className="mt-3 break-keep text-s leading-6">{result.message}</p>

          <div className="mt-3 overflow-x-auto border border-border-soft">
            <table className={TABLE}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>항목</th>
                  <th className={TH}>가입 입력값</th>
                  <th className={TH}>등록증에서 읽은 값</th>
                  <th className={TH}>대조</th>
                </tr>
              </thead>
              <tbody>
                {result.fields.map((f) => (
                  <tr key={f.key} className={TR}>
                    <td className={`${TD} whitespace-nowrap text-muted`}>{f.label}</td>
                    <td className={TD}>{f.expected || "—"}</td>
                    <td className={TD}>{f.extracted || "—"}</td>
                    <td className={`${TD} whitespace-nowrap font-bold ${FIELD_TONE[f.state]}`}>
                      {FIELD_MARK[f.state]}
                    </td>
                  </tr>
                ))}
                {result.openedOn ? (
                  <tr className={TR}>
                    <td className={`${TD} whitespace-nowrap text-muted`}>개업연월일</td>
                    <td className={`${TD} text-muted`}>—</td>
                    <td className={TD}>{result.openedOn}</td>
                    <td className={`${TD} text-muted`}>참고</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {result.extraction?.note ? (
            <p className={`mt-2 ${HELP}`}>판독 메모: {result.extraction.note}</p>
          ) : null}

          <p className={`mt-2 ${HELP}`}>
            {new Date(result.checkedAt).toLocaleString("ko-KR")}
            {by ? ` · ${by}` : ""} 실행
          </p>

          {/* 자동 판독을 근거로 반려하는 일이 생기지 않도록, 한계를 결과 옆에 붙여 둔다. */}
          <p className={`mt-3 ${INFO_NOTE}`}>
            자동 판독은 참고 자료입니다. 사진 각도 · 도장 겹침 등으로 잘못 읽을 수 있으니,
            불일치가 뜨면 첨부 파일을 직접 열어 확인한 뒤 판단해 주세요.
          </p>
        </>
      ) : (
        <p className={`mt-2 ${HELP}`}>
          아직 대조하지 않았습니다. 누르면 첨부된 등록증을 읽어 가입 입력값과 맞춰 봅니다.
        </p>
      )}
    </div>
  );
}
