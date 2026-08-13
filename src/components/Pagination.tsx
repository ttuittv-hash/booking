import Link from "next/link";

// 목록 화면 공통 페이지 이동. 현재 쿼리스트링을 유지한 채 page 만 바꾼다.
export function Pagination({
  page,
  totalPages,
  total,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  total: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) {
    return <p className="mt-4 text-[12.5px] text-muted">전체 {total.toLocaleString("ko-KR")}건</p>;
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

  const linkClass = "rounded border border-border px-2.5 py-1 hover:bg-panel";

  return (
    <div className="mt-4 flex items-center justify-between gap-4 text-[12.5px]">
      <p className="text-muted">
        전체 {total.toLocaleString("ko-KR")}건 · {page}/{totalPages} 페이지
      </p>
      <nav className="flex items-center gap-1.5">
        {page > 1 && (
          <Link href={href(page - 1)} className={linkClass}>
            이전
          </Link>
        )}
        {pages.map((target) => (
          <Link
            key={target}
            href={href(target)}
            aria-current={target === page ? "page" : undefined}
            className={
              target === page
                ? "rounded border border-accent bg-accent/10 px-2.5 py-1 font-medium text-accent"
                : linkClass
            }
          >
            {target}
          </Link>
        ))}
        {page < totalPages && (
          <Link href={href(page + 1)} className={linkClass}>
            다음
          </Link>
        )}
      </nav>
    </div>
  );
}
