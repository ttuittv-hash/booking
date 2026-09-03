/**
 * 일정 달력 범주(대관 확정 · 심사 중 · 대관 불가)의 문구와 색 (2026-09-03 팀 요청).
 *
 * 운영자가 bo > 콘텐츠 관리 > 화면 문구에서 고친다. 값은 `screenText.wizardStrings` 에
 * 문자열 키로 저장하므로 스키마를 바꾸지 않는다. 비우면 지금까지의 기본 문구·색 그대로다.
 *
 * 색은 사이트 토큰 4개만 고른다(임의 색을 받으면 Tailwind 가 클래스를 만들지 못한다).
 * "심사 중" 색은 비워 두면 예전처럼 공간별(아레나 accent · 중형 good)로 나간다.
 */
export const LEGEND_COLORS = ["foreground", "accent", "good", "danger"] as const;
export type LegendColor = (typeof LEGEND_COLORS)[number];

export const LEGEND_COLOR_LABELS: Record<LegendColor, string> = {
  foreground: "검정",
  accent: "노랑(포인트)",
  good: "초록",
  danger: "빨강",
};

/** 범례 점 · 날짜 셀 배지에 쓰는 클래스. 리터럴로 적어야 Tailwind 가 빌드에 넣는다. */
const DOT: Record<LegendColor, string> = {
  foreground: "bg-foreground",
  accent: "bg-accent",
  good: "bg-good",
  danger: "bg-danger",
};
const BADGE: Record<LegendColor, string> = {
  foreground: "bg-foreground text-background",
  accent: "bg-accent-soft text-foreground",
  good: "bg-good-soft text-good",
  danger: "bg-danger-soft text-danger",
};

export const LEGEND_KEYS = {
  confirmedLabel: "schedule.legend.confirmed.label",
  confirmedColor: "schedule.legend.confirmed.color",
  reviewingLabel: "schedule.legend.reviewing.label",
  reviewingColor: "schedule.legend.reviewing.color",
  blockedLabel: "schedule.legend.blocked.label",
  blockedColor: "schedule.legend.blocked.color",
} as const;

export interface ScheduleLegend {
  confirmed: { label: string; dot: string; badge: string };
  /** color 를 안 골랐으면 dot/badge 가 null — 호출부가 예전 공간별 색을 그대로 쓴다 */
  reviewing: { label: string; dot: string | null; badge: string | null };
  blocked: { label: string; dot: string; badge: string };
}

function pick(value: string | undefined): LegendColor | null {
  return (LEGEND_COLORS as readonly string[]).includes(value ?? "") ? (value as LegendColor) : null;
}
function text(value: string | undefined, fallback: string): string {
  const t = value?.trim();
  return t ? t : fallback;
}

export function scheduleLegend(strings?: Record<string, string> | null): ScheduleLegend {
  const s = strings ?? {};
  const confirmed = pick(s[LEGEND_KEYS.confirmedColor]) ?? "foreground";
  const reviewing = pick(s[LEGEND_KEYS.reviewingColor]);
  const blocked = pick(s[LEGEND_KEYS.blockedColor]) ?? "danger";
  return {
    confirmed: { label: text(s[LEGEND_KEYS.confirmedLabel], "대관 확정"), dot: DOT[confirmed], badge: BADGE[confirmed] },
    reviewing: {
      label: text(s[LEGEND_KEYS.reviewingLabel], "심사 중"),
      dot: reviewing ? DOT[reviewing] : null,
      badge: reviewing ? BADGE[reviewing] : null,
    },
    blocked: { label: text(s[LEGEND_KEYS.blockedLabel], "대관 불가 일정"), dot: DOT[blocked], badge: BADGE[blocked] },
  };
}
