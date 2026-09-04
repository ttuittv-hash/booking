import Link from "next/link";

/**
 * 2차 헤더(브레드크럼)는 3뎁스 페이지에서만 노출한다.
 *   HOME / 내 신청 내역 / 1:1 문의   ← 여기서부터
 *   HOME / 대관 절차                ← 이 레벨은 표시하지 않음
 * 그래서 items 가 2개 미만이면 아무것도 렌더하지 않는다.
 */
export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  if (items.length < 2) return null;

  return (
    <nav aria-label="현재 위치" className="border-b border-border/25">
      <div className="container-site flex h-12 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-muted">
        <Link
          href="/"
          className="flex h-full items-center font-extrabold uppercase tracking-[0.08em] [font-family:Archivo,sans-serif] hover:text-foreground"
        >
          Home
        </Link>
        {items.map((item) => (
          <span key={item.label} className="flex h-full items-center gap-2">
            <span aria-hidden className="opacity-40">
              /
            </span>
            {item.href ? (
              <Link href={item.href} className="flex h-full items-center hover:text-foreground">
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
