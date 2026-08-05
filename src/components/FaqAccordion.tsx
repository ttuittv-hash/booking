"use client";

import { useState } from "react";
import type { Faq } from "@/lib/pricing/types";
import { TagBadge } from "@/components/TagBadge";
import { Label } from "@/components/ui/kit";

/**
 * FAQ 아코디언 — 헤어라인 로우 + 샤프한 +/− 토글.
 *
 * Notion 기획 › FAQ 는 "호스트 진행 단계"(검토 → 신청·심의 → 계약·정산 → 준비·당일)
 * 순으로 읽히게 설계돼 있다. 데이터(운영자가 입력하는 자유 태그)는 그대로 두고
 * 표시 레벨에서만 단계 그룹으로 묶는다. 태그로 단계를 판정할 수 없으면
 * 그룹핑을 포기하고 기존 단일 목록으로 렌더한다(카테고리는 태그 배지로 계속 노출).
 */

type Stage = { id: string; en: string; kr: string; keywords: string[] };

/* 넓은 키워드(검토)를 마지막에 두어 좁은 단계가 먼저 잡히게 한다. */
const STAGES: Stage[] = [
  {
    id: "apply",
    en: "Apply",
    kr: "신청·심의",
    keywords: ["신청", "접수", "심사", "심의", "서류", "제출", "승인", "가입", "회원"],
  },
  {
    id: "contract",
    en: "Contract",
    kr: "계약·정산",
    keywords: ["계약", "정산", "보증금", "계약금", "납부", "입금", "세금", "환불", "취소", "변경"],
  },
  {
    id: "runday",
    en: "Run Day",
    kr: "준비·당일",
    keywords: [
      "준비",
      "리허설",
      "반입",
      "셋업",
      "당일",
      "운영",
      "안전",
      "주차",
      "티켓",
      "출입",
      "철수",
    ],
  },
  {
    id: "review",
    en: "Explore",
    kr: "검토",
    keywords: [
      "시설",
      "좌석",
      "무대",
      "규모",
      "제원",
      "장비",
      "견적",
      "요금",
      "대관료",
      "비용",
      "패키지",
      "일정",
      "예약",
      "문의",
    ],
  },
];

const OTHER: Stage = { id: "other", en: "More", kr: "기타", keywords: [] };

function stageOf(faq: Faq): Stage {
  const tag = faq.tag ?? "";
  const byTag = STAGES.find((s) => s.keywords.some((k) => tag.includes(k)));
  if (byTag) return byTag;
  const found = STAGES.find((s) => s.keywords.some((k) => faq.question.includes(k)));
  return found ?? OTHER;
}

function groupByStage(faqs: Faq[]): { stage: Stage; items: Faq[] }[] {
  const buckets = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const stage = stageOf(faq);
    const bucket = buckets.get(stage.id);
    if (bucket) bucket.push(faq);
    else buckets.set(stage.id, [faq]);
  }
  // 화면 순서는 호스트 진행 단계 순서(검토 → 신청·심의 → 계약·정산 → 준비·당일 → 기타)
  const order = [STAGES[3], STAGES[0], STAGES[1], STAGES[2], OTHER];
  return order
    .map((stage) => ({ stage, items: buckets.get(stage.id) ?? [] }))
    .filter((g) => g.items.length > 0);
}

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  const groups = groupByStage(faqs);
  // 단계 판정이 사실상 실패한 경우(전부 기타 · 단계가 하나뿐)는 그룹 헤딩을 숨긴다.
  const useStages = groups.filter((g) => g.stage.id !== OTHER.id).length >= 2;

  function renderItem(faq: Faq) {
    const isOpen = openId === faq.id;
    const panelId = `faq-panel-${faq.id}`;
    return (
      <li key={faq.id} className="border-b border-border/25">
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpenId(isOpen ? null : faq.id)}
          className="group flex w-full items-start justify-between gap-6 py-6 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span className="min-w-0">
            <TagBadge tag={faq.tag} />
            <span className="type-display mr-2 text-s text-muted">Q</span>
            <span className="type-kr-heading text-h6-m sm:text-h6">{faq.question}</span>
          </span>
          <span
            aria-hidden
            className="type-display flex h-8 w-8 shrink-0 items-center justify-center border border-border/30 text-r leading-none transition-colors group-hover:border-foreground"
          >
            {isOpen ? "−" : "+"}
          </span>
        </button>
        {isOpen && (
          <div id={panelId} className="border-l-2 border-accent pb-7 pl-5">
            <p className="whitespace-pre-wrap text-r leading-8 text-muted-strong">
              <span className="type-display mr-2 text-s text-foreground">A</span>
              {faq.answer}
            </p>
          </div>
        )}
      </li>
    );
  }

  if (!useStages) {
    return <ul className="border-t border-border/25">{faqs.map(renderItem)}</ul>;
  }

  return (
    <div className="space-y-14">
      {groups.map((group, i) => (
        <section key={group.stage.id}>
          <div className="flex items-baseline gap-3">
            <span className="type-display text-s tabular-nums text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <Label className="text-muted">
              {group.stage.en} · {group.stage.kr}
            </Label>
          </div>
          <ul className="mt-5 border-t border-border/25">{group.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  );
}
