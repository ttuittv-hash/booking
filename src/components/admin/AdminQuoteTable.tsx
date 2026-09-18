"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { QuoteStatus, ReviewDecision } from "@/lib/pricing/types";
import { Badge, btnClass } from "@/components/ui/kit";
import { useDialog } from "@/components/ui/Dialog";
import {
  NONE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_ACTIONS,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD,
  TD_EMPTY,
  TD_ID,
  TD_LINK,
  TD_MUTED,
  TD_NUM,
  REMOVE_BTN,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
  TR_HOVER,
} from "./adminUi";

const STATUS_LABEL: Record<QuoteStatus, string> = {
  ESTIMATE: "예상견적 (심사 대기)",
  CONTRACTED: "계약 확정 (정산 대기)",
  SETTLED: "정산 완료",
};

/** 상태 색은 kit 의 Badge tone 만 쓴다 (임의 색 금지) */
const STATUS_TONE: Record<QuoteStatus, "warn" | "accent" | "good"> = {
  ESTIMATE: "warn",
  CONTRACTED: "accent",
  SETTLED: "good",
};

/** 심사 결과 — 진행 단계(status)와 별개다. 승인해도 계약 전까지는 ESTIMATE 다. */
const REVIEW_LABEL: Record<ReviewDecision, string> = {
  APPROVED: "심사 승인",
  HOLD: "심사 보류",
  REJECTED: "심사 거절",
};
const REVIEW_TONE: Record<ReviewDecision, "good" | "warn" | "danger"> = {
  APPROVED: "good",
  HOLD: "warn",
  REJECTED: "danger",
};

export interface AdminQuoteRow {
  id: string;
  createdAtLabel: string;
  applicantName: string;
  companyName: string;
  venueLabel: string;
  packageLabel: string;
  weekLabel: string;
  /** 주 공간의 1회당 예상 관객 수 (중형 단독이면 중형 값) */
  audienceLabel: string;
  /** 동시 대관에서만 붙는 중형 몫 보조줄 — 단독 신청이면 null */
  audienceSubLabel?: string | null;
  /** 계약 시 확정되는 금액(대관료, VAT 포함) */
  contractLabel: string;
  /** 행사 후 정산에서 확정되는 금액(선택 옵션, VAT 포함) */
  additionalLabel: string;
  /** 정산 금액이 0보다 큰가 — 0이면 계약금액 = 총액이라 보조줄을 그리지 않는다 */
  hasAdditional: boolean;
  totalLabel: string;
  status: QuoteStatus;
  /** 심사 결과(없으면 아직 심사 전) */
  reviewDecision?: ReviewDecision | null;
}

export function AdminQuoteTable({
  rows,
  total,
  canDelete = false,
}: {
  rows: AdminQuoteRow[];
  /**
   * [신규 2026-09-18] 전체 접수 건수. "개수 카운트가 페이지별로 되어 있습니다. 총 31개인가
   * 접수된 것 같은데 페이지별로 20개, 10개 이런 식으로 되어 있네요"(niki) — 제목이
   * rows.length(현재 페이지의 행 수)를 세고 있었다. 안 넘기면 예전처럼 동작한다.
   */
  total?: number;
  /** 삭제는 되돌릴 수 없어 PRO 등급 이상에게만 보인다(서버도 같은 선에서 막는다) */
  canDelete?: boolean;
}) {
  const router = useRouter();
  const dialog = useDialog();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  /**
   * 신청서 삭제 (2026-09-02).
   *
   * 심사·계약금·계약·정산·첨부·이력이 함께 사라지고 되돌릴 수 없다. 회원 삭제와 같은
   * 방식으로 두 번 확인한다 — 두 번째는 신청번호를 그대로 받아친다(표에서 옆 행을
   * 잘못 누르는 사고가 실제로 계정 삭제에서 있었다).
   */
  async function remove(row: AdminQuoteRow) {
    const ok = await dialog.confirm(
      `신청서 ${row.id} (${row.companyName} · ${row.applicantName})를 삭제합니다.\n\n` +
        "심사 결과 · 계약금 · 계약 · 정산 · 첨부 · 처리 이력이 함께 지워지고 되돌릴 수 없습니다.\n" +
        "달력의 신청 현황에서도 빠집니다.\n\n계속할까요?",
      { title: "신청서 삭제", okLabel: "삭제" },
    );
    if (!ok) return;
    const typed = await dialog.prompt("정말 지우려면 신청번호를 그대로 입력하세요.", {
      title: "삭제 확인",
      okLabel: "삭제",
      placeholder: row.id,
    });
    if (typed !== row.id) return;

    setBusyId(row.id);
    try {
      const res = await fetch(`/api/admin/quotes/${row.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        await dialog.alert(`신청서 ${row.id} 를 삭제했습니다.`);
        router.refresh();
      } else {
        await dialog.alert(data?.error ?? "삭제하지 못했습니다.");
      }
    } finally {
      setBusyId(null);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function compare() {
    router.push(`/admin/compare?ids=${[...selected].join(",")}`);
  }

  return (
    <div className={TABLE_CARD}>
      {/* Table / 1 헤더 행 — 좌: 제목 + 한 줄 설명 / 우: secondary + primary */}
      <div className={TABLE_HEAD}>
        <div>
          <p className={TABLE_HEAD_TITLE}>신청 목록 ({total ?? rows.length})</p>
          <p className={TABLE_HEAD_DESC}>
            {selected.size > 0
              ? `${selected.size}건 선택됨 — 같은 주차를 두고 경합 중인 신청서를 나란히 비교하세요.`
              : total !== undefined && total > rows.length
                ? `이 페이지 ${rows.length}건 · 전체 ${total}건 — 행을 누르면 상세로, 선택하면 나란히 비교할 수 있습니다.`
                : "행을 누르면 상세로, 선택하면 신청서를 나란히 비교할 수 있습니다."}
          </p>
        </div>
        <div className={TABLE_HEAD_ACTIONS}>
          <button
            type="button"
            disabled={selected.size === 0}
            onClick={() => setSelected(new Set())}
            className={btnClass("secondary", "sm")}
          >
            선택 해제
          </button>
          <button
            type="button"
            disabled={selected.size < 2}
            onClick={compare}
            className={btnClass("primary", "sm")}
          >
            선택 항목 비교 ({selected.size})
          </button>
        </div>
      </div>

      <div className={TABLE_SCROLL}>
        <table className={`${TABLE} min-w-[960px]`}>
          <thead>
            <tr className={THEAD_ROW}>
              <th className={`${TH} w-10`} />
              <th className={TH}>신청번호</th>
              <th className={TH_NUM}>신청일시</th>
              <th className={TH}>신청자</th>
              <th className={TH}>회사</th>
              <th className={TH}>공간</th>
              <th className={TH}>패키지</th>
              <th className={TH}>주차</th>
              {/* [개정 2026-09-18] 값은 **1회당** 관객 수인데 제목이 그걸 안 밝혀, 3일
                  공연을 12,000명으로 읽을 수 있었다 — 심사표 「예상 관객 규모」도 1회당
                  기준이라 여기서 어긋나면 심사 판단이 틀어진다. */}
              <th className={TH_NUM}>1회당 관객 (명)</th>
              {/* [개정 2026-09-18] "계약 ㅇㅇ원 / 추후 정산 금액 / 총 금액 이렇게 3열로"(niki)
                  — 한 칸에 총액 + 보조줄로 쌓아 두었더니 세 금액의 성격이 눈에 안 들어왔다. */}
              <th className={TH_NUM}>계약금액 (₩)</th>
              <th className={TH_NUM}>추후 정산 (₩)</th>
              <th className={TH_NUM}>총 예상금액 (₩)</th>
              <th className={TH}>상태</th>
              <th className={TH} />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={14} className={TD_EMPTY}>
                  아직 접수된 신청서가 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const isSelected = selected.has(row.id);
                return (
                  /* [신규 2026-09-18] "클릭이 안 되네요.. 상세화면으로 안 들어가져요"(niki)
                     — hover 효과(TR_HOVER)로 "눌린다"고 약속해 놓고 <tr>에 onClick 이 없어
                     아무 일도 일어나지 않았다. 상세로 가는 유일한 길이 가로 스크롤 너머의
                     「상세 →」 링크였다. 회사 목록(CompanyDirectory)과 같은 방식으로 행
                     전체를 누를 수 있게 한다 — 행 안의 조작(체크박스·링크·삭제)은 각자
                     stopPropagation 으로 이동을 막는다. */
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/admin/${row.id}`)}
                    className={`cursor-pointer ${isSelected ? `${TR} bg-accent/15` : TR_HOVER}`}
                  >
                    <td className={TD}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(row.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`${row.id} 비교 선택`}
                      />
                    </td>
                    {/* 신청번호 자체를 링크로 둔다 — 표가 넓어 「상세 →」가 가로 스크롤
                        너머로 밀려도 왼쪽 끝의 이 링크는 언제나 닿는다. */}
                    {/* [2026-09-18] 열이 12개로 늘면서 브라우저가 폭을 맞추려고 텍스트를
                        마구 접었다 — 신청번호가 「2026-」/「00006」 두 줄로 쪼개졌다. 식별자·
                        날짜·주차처럼 접히면 안 되는 열은 nowrap 으로 고정해 표가 "필요한
                        최소 폭"을 정직하게 요구하게 하고, 남는 폭은 회사명·신청자가 흡수한다. */}
                    <td className={`${TD_ID} tabular-nums whitespace-nowrap`}>
                      <Link
                        href={`/admin/${row.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="underline decoration-border-soft underline-offset-4 transition-colors hover:decoration-foreground"
                      >
                        {row.id}
                      </Link>
                    </td>
                    <td className={`${TD_NUM} whitespace-nowrap text-muted`}>{row.createdAtLabel}</td>
                    {/* [2026-09-18] 신청자·회사는 길이에 상한이 없어 표 폭이 데이터에 따라
                        무한정 커졌다 — 운영의 「에이이지프레젠츠엘엘씨 (AEG PRESENTS LLC)」
                        같은 이름 하나가 가로 스크롤을 만든다. 상한을 두고 넘치면 말줄임하되
                        전체 이름은 title 로 띄운다. 이래야 내일 더 긴 회사가 들어와도 안 깨진다. */}
                    <td className={TD} title={row.applicantName}>
                      <span className="block max-w-[120px] truncate">{row.applicantName}</span>
                    </td>
                    {/* 상한은 <td> 가 아니라 안쪽 블록에 건다 — 표 레이아웃은 셀의
                        max-width 를 무시하고 내용대로 열을 넓힌다(실측으로 확인). */}
                    <td className={TD_MUTED} title={row.companyName}>
                      <span className="block max-w-[160px] truncate">{row.companyName}</span>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>{row.venueLabel}</td>
                    <td className={`${TD} whitespace-nowrap`}>{row.packageLabel}</td>
                    <td className={`${TD} tabular-nums whitespace-nowrap`}>{row.weekLabel}</td>
                    <td className={TD_NUM}>
                      {row.audienceLabel}
                      {row.audienceSubLabel && (
                        <div className="text-xs text-muted">{row.audienceSubLabel}</div>
                      )}
                    </td>
                    {/* [재개정 2026-09-18] 세 금액을 각자의 열로 나눈다(niki) — 계약 시 내는
                        돈과 행사 후 정산할 돈은 성격이 다른데, 한 칸에 쌓아 두니 구분이
                        읽히지 않았다. 정산이 없으면 0 대신 「—」로 둬서 실제로 정산이 붙는
                        건이 눈에 띄게 한다. */}
                    <td className={`${TD_NUM} whitespace-nowrap text-muted`}>{row.contractLabel}</td>
                    <td className={`${TD_NUM} whitespace-nowrap text-muted`}>
                      {row.hasAdditional ? row.additionalLabel : NONE}
                    </td>
                    <td className={`${TD_NUM} font-bold whitespace-nowrap`}>{row.totalLabel}</td>
                    <td className={TD}>
                      {/* 심사 결과가 있으면 그것을 먼저 보여 준다 — 운영자가 목록에서
                          찾는 것은 "이 건을 심사했는가" 다. 진행 단계는 그 아래 줄. */}
                      <span className="flex flex-col items-start gap-1 whitespace-nowrap">
                        {row.reviewDecision && (
                          <Badge tone={REVIEW_TONE[row.reviewDecision]}>
                            {REVIEW_LABEL[row.reviewDecision]}
                          </Badge>
                        )}
                        <Badge tone={STATUS_TONE[row.status]}>
                          {/* 심사를 마친 건에 "심사 대기" 가 같이 뜨면 서로 어긋나 보인다 */}
                          {row.status === "ESTIMATE" && row.reviewDecision
                            ? "계약 대기"
                            : STATUS_LABEL[row.status]}
                        </Badge>
                      </span>
                    </td>
                    <td className={TD_LINK}>
                      {/* [삭제 2026-09-18] 「상세 →」 링크를 뺐다 — 행 전체 클릭과 왼쪽 끝
                          신청번호 링크가 이미 상세 진입로를 둘 제공하고, 이 열이 표를 넓혀
                          가로 스크롤을 만들고 있었다(운영 조건 실측 269px 초과). */}
                      <span className="flex items-center justify-end gap-3">
                        {canDelete && (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void remove(row);
                          }}
                          className={REMOVE_BTN}
                        >
                          {busyId === row.id ? "삭제 중..." : "삭제"}
                        </button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
