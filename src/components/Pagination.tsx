import Link from "next/link";
import { btnClass as publicButtonClass } from "@/components/ui/kit";
import { btnClass as adminButtonClass } from "@/components/admin/adminButton";
import styles from "./Pagination.module.css";

/**
 * 목록 하단 페이지 이동 — 사이트 공용 컨트롤.
 *
 * 디자인 규칙(`docs/design-system.md`)
 * - 버튼 크기는 배치로 정한다. 목록 안 인라인 컨트롤이므로 `sm`(32px).
 * - 페이지 번호는 박스 없는 텍스트, 현재 페이지는 굵기로 표시한다.
 * - 목록과는 여백으로 구분한다.
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
  const btnClass = /^\/admin(?:\/|$)/.test(basePath.split("?")[0]) ? adminButtonClass : publicButtonClass;
  const count = <span className="tabular-nums">{total.toLocaleString("ko-KR")}</span>;

  if (totalPages <= 1) {
    return <p className={`mt-8 text-xs text-muted ${className}`}>전체 {count}건</p>;
  }

  // basePath 에 이미 쿼리스트링이 들어있는 호출부가 있다(예: "?tab=decided").
  // 그 뒤에 그냥 "?page=2" 를 또 붙이면 물음표가 두 번 생겨(`?tab=decided?page=2`)
  // tab 값 자체가 깨진다 — 항상 basePath 의 기존 쿼리까지 한 번에 파싱해 합친다.
  const [path, existingQuery] = basePath.split("?");
  const href = (target: number) => {
    const search = new URLSearchParams(existingQuery ?? "");
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (target > 1) search.set("page", String(target));
    else search.delete("page");
    const query = search.toString();
    return query ? `${path}?${query}` : path;
  };

  // 현재 페이지 주변 5개만 노출한다(페이지 수가 많아져도 줄바꿈이 나지 않도록).
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <div
      className={`mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-xs text-muted">
        전체 {count}건 · <span className="tabular-nums">{page}</span>/
        <span className="tabular-nums">{totalPages}</span> 페이지
      </p>
      <nav aria-label="페이지 이동" className="flex flex-wrap items-center gap-1">
        {page > 1 && (
          <Link href={href(page - 1)} className={`${btnClass("secondary", "sm")} ${styles.direction}`}>
            이전
          </Link>
        )}
        {pages.map((target) =>
          target === page ? (
            <span
              key={target}
              aria-current="page"
              className={`${styles.number} ${styles.current}`}
            >
              {target}
            </span>
          ) : (
            <Link
              key={target}
              href={href(target)}
              className={styles.number}
            >
              {target}
            </Link>
          ),
        )}
        {page < totalPages && (
          <Link href={href(page + 1)} className={`${btnClass("secondary", "sm")} ${styles.direction}`}>
            다음
          </Link>
        )}
      </nav>
    </div>
  );
}
