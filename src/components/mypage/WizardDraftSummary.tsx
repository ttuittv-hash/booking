"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useDialog } from "@/components/ui/Dialog";
import { ButtonLink, btnClass } from "@/components/ui/kit";
import { defaultVenueName } from "@/lib/content/venueLabels";
import { clearWizardDraft, loadWizardDraft } from "@/lib/quotesStore";
import type { QuoteSelection } from "@/lib/pricing/types";

/*
 * [신규 2026-09-08] 마이페이지 "임시 저장 내역" — 대관 위저드의 "임시 저장"
 * (WizardShell.saveDraftNow)은 지금 브라우저 localStorage 한 칸에만 남는다
 * (quotesStore.ts DRAFT_KEY) — 여러 건을 동시에 두지 않고, 새로 임시 저장하면
 * 이전 것을 덮어쓴다. 그래서 이 화면은 "목록"이 아니라 그 하나뿐인 임시저장본의
 * 요약이다. 서버 컴포넌트는 브라우저 저장소를 못 읽으므로 마운트 시 클라이언트에서
 * 읽는다 — 서버(page.tsx)는 로그인·권한만 확인하고 이 컴포넌트에 맡긴다.
 */
function summarizeDraft(selection: QuoteSelection) {
  const eventName = selection.performanceInfo?.eventName?.trim() || "제목 없는 공연";
  const venueName = selection.venueId ? defaultVenueName(selection.venueId) : "공간 미선택";
  const week = selection.week;
  const weekLabel = week?.year ? `${week.year}.${week.month} ${week.weekOfMonth}주차` : null;
  return { eventName, venueName, weekLabel };
}

export function WizardDraftSummary() {
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

  // 서버 렌더와 클라이언트 첫 렌더를 맞추기 위해, localStorage를 읽기 전까지는 아무것도
  // 그리지 않는다(hydration mismatch 방지) — 화면이 짧아 로딩 표시 없이도 깜빡임이 적다.
  if (!ready) return null;

  if (!selection) {
    return (
      <div className="border-t border-border/25 border-b border-border/15 py-14 text-center text-s text-muted">
        임시 저장된 신청서가 없습니다.{" "}
        <Link
          href="/apply?new=1"
          className="inline-flex min-h-11 items-center font-bold text-foreground underline underline-offset-4 sm:min-h-0"
        >
          대관 신청하기
        </Link>
      </div>
    );
  }

  const { eventName, venueName, weekLabel } = summarizeDraft(selection);

  return (
    <div className="border border-border-soft bg-panel p-6">
      <p className="text-xs font-bold text-muted">이 브라우저에 저장된 임시 저장본</p>
      <h3 className="type-kr-heading mt-2 text-h6-m sm:text-h6">{eventName}</h3>
      <p className="mt-1 text-s text-muted">
        {venueName}
        {weekLabel ? ` · ${weekLabel}` : ""}
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <ButtonLink href="/apply" variant="primary" size="md">
          이어서 작성
        </ButtonLink>
        <button type="button" onClick={() => void handleDelete()} className={btnClass("danger", "md")}>
          삭제
        </button>
      </div>
    </div>
  );
}
