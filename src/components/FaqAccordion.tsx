"use client";

import { useState } from "react";
import type { Faq } from "@/lib/pricing/types";
import { FAQ_TAGS } from "@/lib/content/faqSeed";

/**
 * FAQ 아코디언 — 헤어라인 로우 + 샤프한 +/− 토글.
 *
 * **두 칼럼이다.** 좌(2col) 묶음 이름 / 우(4col) 질문 목록 — 대관 규약의 목차 + 본문,
 * 마이페이지의 메뉴 + 본문과 같은 `grid-site` 2/4 분할을 쓴다. 묶음 이름은 자기 질문들이
 * 흐르는 동안 왼쪽에 붙어 따라온다(sticky).
 *
 * 말머리는 원본 시트의 「구분」 8종을 그대로 쓰며, 그 순서대로 묶어 보여준다.
 * 목록에 없는 말머리는 마지막 "기타" 묶음으로 내린다.
 *
 * `01` · `Q` · `A` 표시는 **자기 옆 글과 같은 단**을 쓴다 — 크기·색이 다르면 본문에
 * 얹힌 다른 UI 처럼 보인다. 묶음 번호는 아이브로 규격(12 Archivo 캡스 muted, 자간
 * 0.08em)이고, Q·A 는 각각 질문(h6)·답변(18)과 같은 크기의 Archivo muted 다.
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

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);
  const groups = groupByTag(faqs);
  const useGroups = groups.length >= 2;

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
            {/* Q 는 질문과 같은 h6 단 — 작고 회색인 14 를 붙이면 글줄 위에 얹힌 딴 것이 된다 */}
            <span aria-hidden className="type-display mr-2.5 text-h6-m text-muted sm:text-h6">
              Q
            </span>
            <span className="type-kr-heading break-keep text-h6-m sm:text-h6">{faq.question}</span>
          </span>
          <span
            aria-hidden
            className="type-display flex h-8 w-8 shrink-0 items-center justify-center border border-border-soft text-s leading-none transition-colors group-hover:border-foreground"
          >
            {isOpen ? "−" : "+"}
          </span>
        </button>
        {isOpen && (
          /* 옐로 좌측 바를 쓰지 않는다 — 색면·컬러 바는 시스템에 없다(§선택 상태).
             답변임을 알리는 것은 A 말머리와 질문 아래라는 자리다 */
          <div id={panelId} className="pb-7">
            <p className="whitespace-pre-wrap break-keep text-m leading-8 text-muted-strong">
              <span aria-hidden className="type-display mr-2.5 text-m text-muted">
                A
              </span>
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
      {groups.map((group, i) => (
        <section key={group.tag} className="grid-site">
          <div className="lg:col-span-2">
            {/* 자기 질문들이 흐르는 동안 왼쪽에 붙어 따라온다 — 규약 목차와 같은 오프셋 */}
            <div className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
              <p className="type-display text-xs tracking-[0.08em] tabular-nums text-muted">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="type-kr-heading mt-2 break-keep text-h5-m sm:text-h5">{group.tag}</h3>
            </div>
          </div>
          <ul className="min-w-0 border-t border-border/25 lg:col-span-4">
            {group.items.map(renderItem)}
          </ul>
        </section>
      ))}
    </div>
  );
}
