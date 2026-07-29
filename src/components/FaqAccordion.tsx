"use client";

import { useState } from "react";
import type { Faq } from "@/lib/pricing/types";
import { TagBadge } from "@/components/TagBadge";

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null);

  return (
    <div className="mt-10 divide-y divide-border border-t border-border">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div key={faq.id}>
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              className="flex w-full items-center justify-between gap-6 py-6 text-left outline-none"
            >
              <span className="text-[15px] font-semibold">
                <TagBadge tag={faq.tag} />
                <span className="mr-2 text-accent">Q.</span>
                {faq.question}
              </span>
              <span
                className={`shrink-0 text-[18px] font-light text-muted transition-transform ${isOpen ? "rotate-45" : ""}`}
              >
                +
              </span>
            </button>
            {isOpen && (
              <p className="whitespace-pre-wrap pb-6 text-[13.5px] leading-7 text-muted">
                <span className="mr-2 font-semibold text-foreground">A.</span>
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
