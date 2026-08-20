"use client";

import { useState } from "react";
import type { VenueHighlight, VenueKeyMap } from "@/lib/content/types";
import { CenterHeading, LayoutFeatures, Media } from "@/components/ui/kit";

/* ============================================================================
   /venue 페이지의 클라이언트 인터랙션 모듈
     · KeyMapGallery    — 층별 키맵 언더라인 탭
     · StageFeatureTabs — 무대 특장 ARTIST / AUDIENCE / PRODUCER 언더라인 탭
   탭은 라운딩 없는 1px 언더라인으로만 상태를 표시한다.
   색은 시맨틱 토큰만 쓴다 — Band 가 톤별로 토큰을 뒤집으므로 tone prop 은 두지 않는다.
   ========================================================================= */

/* ------------------------------------------------------------ 공통 탭 ----- */

function TabButton({
  active,
  controls,
  onSelect,
  children,
}: {
  active: boolean;
  controls: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onSelect}
      className={`-mb-px shrink-0 border-b-2 px-1 pb-4 text-s font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function TabBar({ children }: { children: React.ReactNode }) {
  return (
    <div role="tablist" className="flex gap-8 overflow-x-auto border-b border-border/25">
      {children}
    </div>
  );
}

/* ------------------------------------------------------- KeyMapGallery ---- */

/**
 * 층 선택 — Figma Style Guide › UI Elements 의 세그먼트 버튼("Option one").
 * 선택된 층은 검정 채움, 나머지는 1px 아웃라인. 샤프 코너.
 */
function FloorButton({
  active,
  controls,
  onSelect,
  children,
}: {
  active: boolean;
  controls: string;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onSelect}
      className={`h-10 min-w-[3.5rem] shrink-0 border px-4 text-s font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border-soft text-muted hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function KeyMapGallery({ keyMaps }: { keyMaps: VenueKeyMap[] }) {
  const [active, setActive] = useState(0);

  // 키맵 이미지가 아직 등록되지 않은 단계 — Media 플레이스홀더로 자리를 유지한다.
  if (keyMaps.length === 0) {
    return <Media alt="층별 키맵" ratio="16 / 9" />;
  }

  const activeIndex = Math.min(active, keyMaps.length - 1);
  const activeMap = keyMaps[activeIndex];

  return (
    <div>
      <div role="tablist" aria-label="층 선택" className="flex flex-wrap gap-2">
        {keyMaps.map((k, i) => (
          <FloorButton
            key={i}
            active={activeIndex === i}
            controls="keymap-panel"
            onSelect={() => setActive(i)}
          >
            {k.label || `키맵 ${i + 1}`}
          </FloorButton>
        ))}
      </div>

      <div id="keymap-panel" role="tabpanel" className="mt-8">
        <Media
          src={activeMap.url}
          alt={`${activeMap.label || `키맵 ${activeIndex + 1}`} 키맵`}
          ratio="16 / 9"
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
      <TabBar>
        {groups.map((g, i) => (
          <TabButton
            key={g.badge}
            active={activeIndex === i}
            controls="stage-feature-panel"
            onSelect={() => setActive(i)}
          >
            {g.badge}
          </TabButton>
        ))}
      </TabBar>

      {/* 특장 묶음마다 센터 헤더 + Figma Layout / 2 특징 그리드 */}
      <div id="stage-feature-panel" role="tabpanel" className="mt-16 space-y-20">
        {group.items.map((hl, i) => (
          <section key={`${hl.title}-${i}`}>
            <CenterHeading title={hl.title} lead={hl.subtitle || undefined} />
            <div className="mt-14">
              <LayoutFeatures
                columns={3}
                items={hl.cards.map((c) => ({
                  title: c.title,
                  desc: c.desc || undefined,
                  image: c.image,
                }))}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
