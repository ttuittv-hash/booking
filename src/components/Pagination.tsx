import { ButtonLink } from "@/components/ui/kit";

/**
 * 목록 하단 페이지 이동 — 사이트 공용 컨트롤.
 *
 * 디자인 규칙(`docs/design-system.md`)
 * - 버튼 크기는 배치로 정한다. 목록 안 인라인 컨트롤이므로 `sm`(32px).
 * - 현재 페이지는 시스템의 단일 선택 언어(검정 채움)로만 표시한다. 강조색 금지.
 * - 색면 박스 대신 헤어라인으로 목록과 분리한다.
 *
 * 현재 쿼리스트링은 유지한 채 page 만 바꾼다.
 */
export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  params = {},
  className = "",
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
  className?: string;
}) {
  const count = <span className="tabular-nums">{total.toLocaleString("ko-KR")}</span>;

  if (totalPages <= 1) {
    return <p className={`mt-8 text-xs text-muted ${className}`}>전체 {count}건</p>;
  }

  const href = (target: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  // 현재 페이지 주변 5개만 노출한다(페이지 수가 많아져도 줄바꿈이 나지 않도록).
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div
      className={`mt-8 flex flex-col gap-4 border-t border-border/25 pt-6 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-xs text-muted">
        전체 {count}건 · <span className="tabular-nums">{page}</span>/
        <span className="tabular-nums">{totalPages}</span> 페이지
      </p>
      <nav aria-label="페이지 이동" className="flex flex-wrap items-center gap-2">
        {page > 1 && (
          <ButtonLink href={href(page - 1)} variant="secondary" size="sm">
            이전
          </ButtonLink>
        )}
        {pages.map((target) =>
          target === page ? (
            <span
              key={target}
              aria-current="page"
              className="inline-flex h-8 min-w-8 items-center justify-center border border-foreground bg-inverse-bg px-3 text-xs font-bold tabular-nums text-inverse-fg"
            >
              {target}
            </span>
          ) : (
            <ButtonLink
              key={target}
              href={href(target)}
              variant="secondary"
              size="sm"
              className="min-w-8 tabular-nums"
            >
              {target}
            </ButtonLink>
          ),
        )}
        {page < totalPages && (
          <ButtonLink href={href(page + 1)} variant="secondary" size="sm">
            다음
          </ButtonLink>
        )}
      </nav>
    </div>
  );
}
