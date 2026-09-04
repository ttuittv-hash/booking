import { Badge } from "@/components/ui/kit";

/* ============================================================================
   공지사항 말머리

   재구성 이전에는 자유 입력 문자열이었고, 표시 레벨에서 `대관`·`공고`·`대관공고`·
   `대관공모`·`모집` 다섯 문자열이 **포함**되어 있으면 상단으로 승격했다. 두 가지 문제가 있었다.
     · 운영자가 매번 다른 말머리를 적으면 같은 성격의 게시물이 서로 다르게 분류된다
     · 포함 매칭이므로 `대관료 변경 안내` 처럼 공고가 아닌 게시물도 상단으로 올라간다

   말머리를 6개 닫힌 목록으로 확정하고, 승격 조건을 완전 일치로 바꿨다.
   승격 말머리의 이름은 2026-09-04 에 `대관공고` → `대관공지` 로 바뀌었다 — 예전 이름으로
   저장된 공지도 아래 매핑을 타고 같은 말머리로 보인다(데이터는 손대지 않아도 된다).
   ========================================================================= */

export const NOTICE_TAGS = [
  "대관공지",
  "접수일정",
  "요금안내",
  "시설안내",
  "시스템",
  "일반안내",
] as const;

export type NoticeTag = (typeof NOTICE_TAGS)[number];

/** 상단 승격 대상 — `대관공지` 하나뿐이며 완전 일치로만 판정한다. */
export const PINNED_NOTICE_TAG: NoticeTag = "대관공지";

/**
 * 진행 중 대관 공고로 취급할 말머리인지.
 * 포함 매칭으로 되돌리지 말 것 — `접수일정`·`요금안내`가 함께 승격된다.
 */
export function isPinnedTag(tag: string | null): boolean {
  return normalizeNoticeTag(tag) === PINNED_NOTICE_TAG;
}

/** 기존에 등록된 자유 문자열 말머리를 6개 중 하나로 매핑한다. */
export function normalizeNoticeTag(tag: string | null): NoticeTag | null {
  if (!tag) return null;
  const t = tag.replace(/\s/g, "");
  if ((NOTICE_TAGS as readonly string[]).includes(t)) return t as NoticeTag;
  // 옛 이름(대관공고)과 자유 입력분을 승격 말머리로 모은다.
  if (/^(대관공고|대관공모|대관모집|모집공고|공고|대관공지)$/.test(t)) return "대관공지";
  if (/(접수|일정|마감|연장)/.test(t)) return "접수일정";
  if (/(요금|대관료|단가|정산)/.test(t)) return "요금안내";
  if (/(시설|장비|공간|개관)/.test(t)) return "시설안내";
  if (/(점검|장애|시스템)/.test(t)) return "시스템";
  return "일반안내";
}

export function TagBadge({
  tag,
  /** 뒤따르는 텍스트와의 간격. 인라인 말머리로 쓸 때 true (기본) */
  spacing = true,
}: {
  tag: string | null;
  spacing?: boolean;
}) {
  const normalized = normalizeNoticeTag(tag);
  if (!normalized) return null;
  return (
    <span className={`inline-flex align-middle ${spacing ? "mr-2" : ""}`}>
      <Badge tone={normalized === PINNED_NOTICE_TAG ? "accent" : "neutral"}>{normalized}</Badge>
    </span>
  );
}
