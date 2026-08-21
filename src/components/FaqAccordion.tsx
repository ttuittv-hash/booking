"use client";

import { useState } from "react";
import type { Faq } from "@/lib/pricing/types";
import { FAQ_TAGS } from "@/lib/content/faqSeed";
import { TagBadge } from "@/components/TagBadge";

/**
 * FAQ 아코디언 — 헤어라인 로우 + 샤프한 +/− 토글.
 *
 * 말머리는 원본 시트의 「구분」 8종을 그대로 쓰며, 그 순서대로 묶어 보여준다.
 * 목록에 없는 말머리는 마지막 "기타" 묶음으로 내린다.
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
            <span className="type-display mr-2 text-s text-muted">Q</span>
            <span className="type-kr-heading break-keep text-h6-m sm:text-h6">{faq.question}</span>
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
            <p className="whitespace-pre-wrap break-keep text-r leading-8 text-muted-strong">
              <span className="type-display mr-2 text-s text-foreground">A</span>
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
        <section key={group.tag}>
          <div className="flex items-baseline gap-3">
            <span className="type-display text-s tabular-nums text-muted">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="type-kr-heading text-h5-m sm:text-h5">{group.tag}</h3>
          </div>
          <ul className="mt-5 border-t border-border/25">{group.items.map(renderItem)}</ul>
        </section>
      ))}
    </div>
  );
}
