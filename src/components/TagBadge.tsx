import { Badge } from "@/components/ui/kit";

/**
 * 말머리 태그 — kit `Badge` 로 렌더한다.
 * 샤프 코너 · Archivo 라벨 · 대비 안전(옐로 면 위 텍스트는 항상 검정).
 *
 * 데이터 구조는 그대로 두고(태그는 운영자가 입력하는 자유 문자열) 표시 레벨에서만
 * 대관 공고 계열 태그를 옐로 면으로 승격한다.
 */
const PINNED_TAGS = ["대관", "공고", "대관공고", "대관공모", "모집"];

/** 진행 중 대관 공고로 취급할 태그인지 — 목록 상단 고정 판단에 함께 쓴다. */
export function isPinnedTag(tag: string | null): boolean {
  if (!tag) return false;
  const t = tag.replace(/\s/g, "");
  return PINNED_TAGS.some((k) => t.includes(k));
}

export function TagBadge({
  tag,
  /** 뒤따르는 텍스트와의 간격. 인라인 말머리로 쓸 때 true (기본) */
  spacing = true,
}: {
  tag: string | null;
  spacing?: boolean;
}) {
  if (!tag) return null;
  return (
    <span className={`inline-flex align-middle ${spacing ? "mr-2" : ""}`}>
      <Badge tone={isPinnedTag(tag) ? "accent" : "neutral"}>{tag}</Badge>
    </span>
  );
}
