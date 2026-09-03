"use client";

import { useState } from "react";
import type { Faq } from "@/lib/pricing/types";
import { FAQ_TAGS } from "@/lib/content/faqSeed";

/**
 * FAQ 아코디언 — 헤어라인 로우 + 셰브런 토글.
 *
 * **두 칼럼이다.** 좌(2col) 묶음 이름 / 우(4col) 질문 목록 — 대관 규약의 목차 + 본문,
 * 마이페이지의 메뉴 + 본문과 같은 `grid-site` 2/4 분할을 쓴다. 묶음 이름은 자기 질문들이
 * 흐르는 동안 왼쪽에 붙어 따라온다(sticky).
 *
 * 말머리는 원본 시트의 「구분」 8종을 그대로 쓰며, 그 순서대로 묶어 보여준다.
 * 목록에 없는 말머리는 마지막 "기타" 묶음으로 내린다.
 *
 * 글자는 **본문 단 하나**로 간다 — 질문 14 Bold / 답변 14 Regular. 묶음 번호(01~)와
 * `Q` · `A` 말머리는 두지 않는다. 목록의 구조(묶음 이름 · 헤어라인 · 셰브런)가 이미
 * 같은 말을 하고 있어서, 크기·색이 다른 표시를 덧붙이면 본문 위에 얹힌 다른 UI 처럼 보였다.
 */
const OTHER = "기타";

function groupByTag(faqs: Faq[]): { tag: string; items: Faq[] }[] {
  const buckets = new Map<string, Faq[]>();
  for (const faq of faqs) {
    const tag = (faq.tag ?? "").trim();
    const key = (FAQ_TAGS as readonly string[]).includes(tag) ? tag : OTHER;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(faq);
    else buckets.set(key, [faq]);
  }
  return [...FAQ_TAGS, OTHER]
    .map((tag) => ({ tag, items: buckets.get(tag) ?? [] }))
    .filter((g) => g.items.length > 0);
}

/**
 * Figma 2607 › Style Guide › Icons › Material Symbols **keyboard_arrow_down**.
 * 펼친 상태는 같은 글리프를 180° 돌려 `keyboard_arrow_up` 으로 쓴다 — 두 벡터를
 * 따로 두면 획 두께가 미세하게 어긋난다.
 */
function ChevronToggle({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={`h-5 w-5 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
    >
      <path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z" />
    </svg>
  );
}

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  const groups = groupByTag(faqs);
  const useGroups = groups.length >= 2;

  function renderItem(faq: Faq) {
    const isOpen = openId === faq.id;
    const panelId = `faq-panel-${faq.id}`;
    return (
      <li key={faq.id} className="border-b border-border/25">
        {/*
          좌우 패딩(16)이 있어야 호버 색면이 글자·셰브런에 닿지 않는다 —
          패딩 없이 두면 채워진 면의 양끝이 글자에 딱 붙어 겹쳐 보였다.
          헤어라인은 칼럼 폭 전체를 그대로 쓴다(줄이 끊기면 목록이 흐트러진다).
        */}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setOpenId(isOpen ? null : faq.id)}
          className="group flex w-full items-start justify-between gap-6 px-4 py-5 text-left transition-colors hover:bg-foreground/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
        >
          <span className="min-w-0 break-keep text-s font-bold">{faq.question}</span>
          <span className="mt-px text-muted transition-colors group-hover:text-foreground">
            <ChevronToggle open={isOpen} />
          </span>
        </button>
        {isOpen && (
          <div id={panelId} className="px-4 pb-6">
            <p className="whitespace-pre-wrap break-keep text-s leading-7 text-muted-strong">
              {faq.answer}
            </p>
          </div>
        )}
      </li>
    );
  }

  if (!useGroups) {
    return <ul className="border-t border-border/25">{faqs.map(renderItem)}</ul>;
  }

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.tag} className="grid-site">
          <div className="lg:col-span-3">
            {/* 첫 질문의 글줄과 같은 높이에서 시작한다(행 패딩 20 만큼 내린다).
                자기 질문들이 흐르는 동안 왼쪽에 붙어 따라온다 — 규약 목차와 같은 오프셋 */}
            <h3 className="type-kr-heading break-keep text-h5-m sm:text-h5 lg:sticky lg:top-[calc(var(--header-h)+2.5rem)] lg:pt-5">
              {group.tag}
            </h3>
          </div>
          <ul className="min-w-0 border-t border-border/25 lg:col-span-9">
            {group.items.map(renderItem)}
          </ul>
        </section>
      ))}
    </div>
  );
}
