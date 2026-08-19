"use client";

import { useState } from "react";
import type { VenueHighlight } from "@/lib/content/types";

function ImagePlaceholder({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      <div className="aspect-video overflow-hidden rounded-sm border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex aspect-video items-center justify-center rounded-sm border border-dashed border-border bg-panel/60">
      <span className="text-[11.5px] text-muted">이미지 준비 중</span>
    </div>
  );
}

const TAB_ORDER = ["ARTIST", "AUDIENCE", "PRODUCER"] as const;
const TAB_LABEL: Record<(typeof TAB_ORDER)[number], string> = {
  ARTIST: "아티스트",
  AUDIENCE: "오디언스",
  PRODUCER: "프로듀서",
};

// 무대 특장을 세로로 전부 나열하면 스크롤이 길어져, 관점(아티스트/오디언스/프로듀서)별로
// 탭을 나눠 한 번에 하나의 관점만 보여준다. 각 항목은 highlightBadge로 이미 하나의
// 관점에 매칭돼 있어(어드민 CMS에서 지정) 그 값을 그대로 탭 그룹핑에 재사용한다.
export function StageFeaturesTabs({ highlights }: { highlights: VenueHighlight[] }) {
  const groups = TAB_ORDER.map((tab) => ({
    tab,
    items: highlights.filter((hl) => hl.highlightBadge === tab),
  })).filter((g) => g.items.length > 0);

  const [activeTab, setActiveTab] = useState<string | undefined>(groups[0]?.tab);
  const active = groups.find((g) => g.tab === activeTab) ?? groups[0];

  if (!active) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-1 border-b border-border">
        {groups.map((g) => (
          <button
            key={g.tab}
            type="button"
            onClick={() => setActiveTab(g.tab)}
            className={[
              "border-b-2 px-4 py-2.5 text-[13.5px] font-medium transition-colors",
              active.tab === g.tab
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {TAB_LABEL[g.tab]}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-10">
        {active.items.map((hl) => (
          <div key={hl.title}>
            <h3 className="text-[17px] font-semibold tracking-tight text-foreground sm:text-[19px]">{hl.title}</h3>
            <p className="mt-1.5 text-[13px] text-muted">{hl.subtitle}</p>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hl.cards.map((c) => (
                <div key={c.title} className="rounded-sm border border-border bg-panel/50 p-4">
                  <ImagePlaceholder src={c.image} alt={c.title} />
                  <div className="mt-3 text-[13.5px] font-semibold">{c.title}</div>
                  {c.desc && <p className="mt-1 text-[12.5px] leading-6 text-muted">{c.desc}</p>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
