import Link from "next/link";
import type { StaticPage } from "@/lib/pricing/types";

export function PageTreeNav({
  pages,
  basePath,
  activeSlug,
}: {
  pages: StaticPage[];
  basePath: string;
  activeSlug: string;
}) {
  if (pages.length <= 1) return null;

  return (
    <nav className="mt-8 flex items-center gap-1 overflow-x-auto whitespace-nowrap border-b border-border">
      {pages.map((page, i) => {
        const href = i === 0 ? basePath : `${basePath}/${page.slug}`;
        const isActive = page.slug === activeSlug;
        return (
          <Link
            key={page.id}
            href={href}
            className={[
              "shrink-0 border-b-2 px-3 py-3 text-[13px] font-medium transition-colors",
              isActive ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground",
            ].join(" ")}
          >
            {page.navLabel}
          </Link>
        );
      })}
    </nav>
  );
}
