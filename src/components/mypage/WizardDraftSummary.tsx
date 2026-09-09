"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import { ButtonLink } from "@/components/ui/kit";
import { DataTable, type Column } from "@/components/mypage/DataTable";
import { won } from "@/lib/format";
import { calculateQuote } from "@/lib/pricing/calculateQuote";
import { clearWizardDraft, loadWizardDraft } from "@/lib/quotesStore";
import type { QuoteSelection, RateTable } from "@/lib/pricing/types";

/*
 * [신규 2026-09-08] 마이페이지 "임시 저장 내역" — 대관 위저드의 "임시 저장"
 * (WizardShell.saveDraftNow)은 지금 브라우저 localStorage 한 칸에만 남는다
 * (quotesStore.ts DRAFT_KEY) — 여러 건을 동시에 두지 않고, 새로 임시 저장하면
 * 이전 것을 덮어쓴다. 그래서 이 화면은 "목록"이 아니라 그 하나뿐인 임시저장본을
 * /mypage 「대관 진행 내역」 표와 같은 형식(신청번호 칸만 제외)으로 보여준다.
 * 서버 컴포넌트는 브라우저 저장소를 못 읽으므로 마운트 시 클라이언트에서 읽는다 —
 * 서버(page.tsx)는 로그인·권한 확인과 예상금액 계산에 필요한 rateTable만 내려준다.
 */

const COLUMNS: Column[] = [
  { key: "event", label: "공연명" },
  { key: "week", label: "주차" },
  { key: "estimate", label: "예상금액", align: "right" },
  { key: "contract", label: "계약금액", align: "right" },
  { key: "settlement", label: "정산금액", align: "right" },
  { key: "status", label: "상태", align: "right" },
];

/** /mypage 「대관 진행 내역」의 weekLabel과 같은 표기 — 임시저장본은 Quote가 아니라
 * QuoteSelection 뿐이라 그 필드를 직접 받는다. */
function weekLabel(selection: QuoteSelection) {
  const arena = `${selection.week.year}.${selection.week.month} ${selection.week.weekOfMonth}주차`;
  const midDays = Object.keys(selection.midHallDays).length;
  if (selection.bookingMode === "SIMULTANEOUS") {
    return (
      <>
        아레나 {arena}
        <br />
        <span className="text-muted">중형 {midDays}일</span>
      </>
    );
  }
  if (selection.venueId === "medium-hall") return `중형 ${midDays}일`;
  return arena;
}

export function WizardDraftSummary({ rateTable }: { rateTable: RateTable }) {
  const dialog = useDialog();
  const [ready, setReady] = useState(false);
  const [selection, setSelection] = useState<QuoteSelection | null>(null);

  useEffect(() => {
    // localStorage는 리액트 외부 저장소이므로 마운트 시 1회만 읽는다(WizardShell.tsx의
    // 임시저장본 복원과 같은 패턴).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelection(loadWizardDraft()?.selection ?? null);
    setReady(true);
  }, []);

  async function handleDelete() {
    if (!(await dialog.confirm("임시 저장한 내용을 삭제할까요?", { okLabel: "삭제" }))) return;
    clearWizardDraft();
    setSelection(null);
  }

  // 서버 렌더와 클라이언트 첫 렌더를 맞추기 위해, localStorage를 읽기 전까지는 빈 표를
  // 그린다(hydration mismatch 방지).
  if (!ready) {
    return <DataTable columns={COLUMNS} rows={[]} empty={null} minWidth="44rem" />;
  }

  const eventName = selection?.performanceInfo?.eventName?.trim() || "제목 없는 공연";
  // 제출 전이라 계약금액·정산금액은 항상 없음 — /mypage 목록의 ESTIMATE 상태 행과 같은 표기.
  const estimate = selection ? calculateQuote(selection, rateTable).total : 0;

  return (
    <DataTable
      columns={COLUMNS}
      minWidth="44rem"
      empty={
        <>
          임시 저장된 신청서가 없습니다.{" "}
          <Link
            href="/apply?new=1"
            className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4 sm:min-h-0"
          >
            대관 신청하기
          </Link>
        </>
      }
      rows={
        selection
          ? [
              {
                id: "draft",
                cells: {
                  event: <span className="font-bold">{eventName}</span>,
                  week: weekLabel(selection),
                  estimate: won(estimate),
                  contract: "—",
                  settlement: "—",
                  status: (
                    <span className="whitespace-nowrap">
                      <ButtonLink href="/apply" variant="secondary" size="sm">
                        수정하기
                      </ButtonLink>
                      <button
                        type="button"
                        onClick={() => void handleDelete()}
                        className="ml-3 text-xs font-bold text-muted underline underline-offset-4 hover:text-danger"
                      >
                        삭제
                      </button>
                    </span>
                  ),
                },
              },
            ]
          : []
      }
    />
  );
}
