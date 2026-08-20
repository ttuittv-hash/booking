import { Badge } from "@/components/ui/kit";

/* ============================================================================
   공지사항 말머리

   2026-08 이전에는 자유 입력 문자열이었고, 표시 레벨에서 `대관`·`공고`·`대관공고`·
   `대관공모`·`모집` 다섯 문자열이 **포함**되어 있으면 상단으로 승격했다.
   이 방식은 두 가지 문제를 낳았다.
     · 운영자가 매번 다른 말머리를 적으면 같은 성격의 게시물이 서로 다르게 분류된다
     · 문자열 포함 매칭이므로 `대관료 변경 안내` 처럼 공고가 아닌 게시물도 상단으로 올라간다

   말머리를 아래 6개 닫힌 목록으로 확정하고, 승격 조건을 `대관공고` **완전 일치**로 바꿨다.
   관리 화면도 자유 입력 대신 선택형이다.
   ========================================================================= */

export const NOTICE_TAGS = [
  "대관공고",
  "접수일정",
  "요금안내",
  "시설안내",
  "시스템점검",
  "일반안내",
] as const;

export type NoticeTag = (typeof NOTICE_TAGS)[number];

/** 각 말머리를 언제 쓰는지 — 관리 화면 보조 문구 */
export const NOTICE_TAG_HELP: Record<NoticeTag, string> = {
  대관공고: "대관 접수를 개시하는 공고 본문. 대상 공간·자격·접수 기간·심사 방식을 담는 게시물",
  접수일정: "접수 개시일·마감일의 확정, 연장, 변경, 심사 결과 통보 시점 안내",
  요금안내: "대관료·부대사용료 항목이나 산정 기준의 변경",
  시설안내: "개관 일정, 시설·장비·공간 구성의 변경",
  시스템점검: "사이트 점검, 장애, 기능 공개 일정",
  일반안내: "위 다섯 가지에 들어가지 않는 안내",
};

/** 상단 승격 대상 — `대관공고` 하나뿐이며 완전 일치로만 판정한다. */
export const PINNED_NOTICE_TAG: NoticeTag = "대관공고";

/**
 * 진행 중 대관 공고로 취급할 말머리인지.
 * 포함 매칭으로 되돌리지 말 것 — `접수일정`·`요금안내`가 함께 승격된다.
 */
export function isPinnedTag(tag: string | null): boolean {
  return normalizeNoticeTag(tag) === PINNED_NOTICE_TAG;
}

/**
 * 기존에 등록된 자유 문자열 말머리를 6개 중 하나로 매핑한다.
 * 매핑되지 않으면 `일반안내` 로 둔다.
 */
export function normalizeNoticeTag(tag: string | null): NoticeTag | null {
  if (!tag) return null;
  const t = tag.replace(/\s/g, "");
  if ((NOTICE_TAGS as readonly string[]).includes(t)) return t as NoticeTag;
  if (/^(대관공모|대관모집|모집공고|공고)$/.test(t)) return "대관공고";
  if (/(접수|일정|마감|연장)/.test(t)) return "접수일정";
  if (/(요금|대관료|단가|정산)/.test(t)) return "요금안내";
  if (/(시설|장비|공간|개관)/.test(t)) return "시설안내";
  if (/(점검|장애|시스템)/.test(t)) return "시스템점검";
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
