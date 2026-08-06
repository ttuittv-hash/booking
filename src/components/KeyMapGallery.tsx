"use client";

import { useState } from "react";
import type { VenueHighlight, VenueKeyMap } from "@/lib/content/types";
import { Media } from "@/components/ui/kit";

/* ============================================================================
   /venue 페이지의 클라이언트 인터랙션 모듈
     · KeyMapGallery    — 층별 키맵 언더라인 탭
     · StageFeatureTabs — 무대 특장 ARTIST / AUDIENCE / PRODUCER 언더라인 탭
   두 탭 모두 라운딩 없는 1px 언더라인으로만 상태를 표시한다 (디자인 시스템 5. 형태 규칙).
   ========================================================================= */

/* ------------------------------------------------------------ 공통 탭 ----- */

function TabButton({
  active,
  tone,
  controls,
  onSelect,
  children,
}: {
  active: boolean;
  tone: "light" | "dark";
  controls: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const inactive =
    tone === "dark"
      ? "border-transparent text-inverse-muted hover:text-inverse-fg"
      : "border-transparent text-muted hover:text-foreground";
  // 옐로 텍스트는 블랙 배경 위에서만 허용 (밝은 밴드에서는 검정 언더라인으로 표시)
  const selected =
    tone === "dark" ? "border-accent text-accent" : "border-foreground text-foreground";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onSelect}
      className={`type-label -mb-px shrink-0 whitespace-nowrap border-b-2 px-1 pb-4 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        active ? selected : inactive
      }`}
    >
      {children}
    </button>
  );
}

function TabBar({ tone, children }: { tone: "light" | "dark"; children: React.ReactNode }) {
  return (
    <div
      role="tablist"
      className={`flex gap-8 overflow-x-auto border-b ${
        tone === "dark" ? "border-inverse-fg/25" : "border-border/25"
      }`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------- KeyMapGallery ---- */

export function KeyMapGallery({ keyMaps }: { keyMaps: VenueKeyMap[] }) {
  const [active, setActive] = useState(0);

  // 키맵 이미지가 아직 등록되지 않은 단계 — Iconic 플레이스홀더로 자리를 유지한다.
  if (keyMaps.length === 0) {
    return <Media alt="층별 키맵" ratio="16 / 9" />;
  }

  const activeIndex = Math.min(active, keyMaps.length - 1);
  const activeMap = keyMaps[activeIndex];

  return (
    <div>
      <TabBar tone="light">
        {keyMaps.map((k, i) => (
          <TabButton
            key={i}
            active={activeIndex === i}
            tone="light"
            controls="keymap-panel"
            onSelect={() => setActive(i)}
          >
            {k.label || `키맵 ${i + 1}`}
          </TabButton>
        ))}
      </TabBar>

      <div id="keymap-panel" role="tabpanel" className="mt-8 bg-surface">
        {/* 도면은 잘림 없이 원본 비율로 보여준다 (Media의 고정 비율 크롭을 쓰지 않음) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activeMap.url}
          alt={activeMap.label || `키맵 ${activeIndex + 1}`}
          className="w-full border border-border/15"
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------- StageFeatureTabs ---- */

interface HighlightGroup {
  badge: string;
  items: VenueHighlight[];
}

/**
 * 탭 축은 콘텐츠에서 도출한다.
 * badges(ARTIST · AUDIENCE · PRODUCER) 순서를 그대로 탭 순서로 쓰고,
 * 각 특장은 highlightBadge 가 가리키는 탭에 정확히 한 번 배치한다.
 * 어느 탭에도 속하지 않는 항목이 생기지 않도록 마지막에 잔여 항목을 모아 붙인다.
 */
function buildGroups(highlights: VenueHighlight[]): HighlightGroup[] {
  const order: string[] = [];
  const push = (badge: string) => {
    if (badge && !order.includes(badge)) order.push(badge);
  };
  highlights.forEach((h) => h.badges.forEach(push));
  highlights.forEach((h) => push(h.highlightBadge));

  const tabOf = (h: VenueHighlight) => h.highlightBadge || h.badges[0] || "";
  const groups = order
    .map((badge) => ({ badge, items: highlights.filter((h) => tabOf(h) === badge) }))
    .filter((g) => g.items.length > 0);

  const orphans = highlights.filter((h) => !tabOf(h));
  if (orphans.length > 0) groups.push({ badge: "그 외", items: orphans });
  return groups;
}

export function StageFeatureTabs({ highlights }: { highlights: VenueHighlight[] }) {
  const [active, setActive] = useState(0);
  const groups = buildGroups(highlights);
  if (groups.length === 0) return null;

  const activeIndex = Math.min(active, groups.length - 1);
  const group = groups[activeIndex];

  return (
    <div>
      <TabBar tone="dark">
        {groups.map((g, i) => (
          <TabButton
            key={g.badge}
            active={activeIndex === i}
            tone="dark"
            controls="stage-feature-panel"
            onSelect={() => setActive(i)}
          >
            {g.badge}
          </TabButton>
        ))}
      </TabBar>

      <div id="stage-feature-panel" role="tabpanel" className="mt-14 space-y-16">
        {group.items.map((hl) => {
          const [lead, ...rest] = hl.cards;
          return (
            <article key={hl.title}>
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)] lg:gap-16">
                <h3 className="type-kr-heading text-h4-m sm:text-h4">{hl.title}</h3>
                {hl.subtitle && (
                  <p className="text-m text-inverse-fg/80 lg:pt-2">{hl.subtitle}</p>
                )}
              </div>

              {/* 하프블리드 — 이미지 좌 / 텍스트 우 */}
              {lead && (
                <div className="mt-10 grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-16">
                  <Media src={lead.image} alt={lead.title} ratio="4 / 3" />
                  <div>
                    <h4 className="type-kr-heading text-h5-m sm:text-h5">{lead.title}</h4>
                    {lead.desc && (
                      <p className="mt-4 text-m text-inverse-fg/80">{lead.desc}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 나머지 블록 — 헤어라인 로우 */}
              {rest.length > 0 && (
                <ul className="mt-12 border-t border-inverse-fg/25">
                  {rest.map((c, i) => (
                    <li
                      key={`${c.title}-${i}`}
                      className="flex flex-col gap-4 border-b border-inverse-fg/25 py-7 sm:flex-row sm:items-start sm:gap-8"
                    >
                      <div className="w-full shrink-0 sm:w-44">
                        <Media src={c.image} alt={c.title} ratio="4 / 3" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="type-kr-heading text-h6-m sm:text-h6">{c.title}</h4>
                        {c.desc && <p className="mt-2 text-s text-inverse-fg/80">{c.desc}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
