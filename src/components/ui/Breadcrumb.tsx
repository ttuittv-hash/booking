import Link from "next/link";

/**
 * Figma Design 페이지 공통 Breadcrumb (높이 48).
 * 모든 하위 페이지 헤더 바로 아래에 놓는다.
 */
export function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="현재 위치" className="border-b border-border/15">
      <div className="container-site flex h-12 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-muted">
        <Link href="/" className="type-label hover:text-foreground">
          Home
        </Link>
        {items.map((item) => (
          <span key={item.label} className="flex items-center gap-2">
            <span aria-hidden className="text-border/40">
              /
            </span>
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="font-bold text-foreground">{item.label}</span>
            )}
          </span>
        ))}
      </div>
    </nav>
  );
}
