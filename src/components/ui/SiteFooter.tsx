import Link from "next/link";
import { NAV_CATEGORIES } from "@/components/ui/nav-items";

/**
 * Figma Design › Footer / 1 규격.
 *
 *   상단   좌 : Address / Contact (라벨 14 · 값 14)   우 : 링크 리스트 2열 (16, 행 40)
 *   중단   컨테이너 전폭 워드마크  ← 푸터의 주인공. 로고를 좌상단에 작게 두지 않는다
 *   하단   헤어라인 → 좌 카피라이트 / 우 정책 링크
 *
 * 지면은 오프화이트, 글자는 검정. 블랙 밴드가 아니다.
 */
const ADDRESS = "서울특별시 도봉구 창동 1-24";
const CONTACT = "booking.arena@kakaocorp.com";

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface">
      <div className="container-site pb-10 pt-16 sm:pt-20">
        {/* 상단 — 좌: 연락처 / 우: 사이트맵 */}
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
          <div className="space-y-6">
            <FooterField label="Address" value={ADDRESS} />
            <FooterField label="Contact" value={CONTACT} href={`mailto:${CONTACT}`} />
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-4 lg:gap-x-14">
            {NAV_CATEGORIES.map((col) => (
              <div key={col.label}>
                <p className="type-display text-xs tracking-[0.08em] text-muted">{col.label}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.pages.map((l) => (
                    <li key={l.href + l.label}>
                      <Link href={l.href} className="inline-flex min-h-9 items-center text-r transition-colors hover:text-accent">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/*
          중단 — 워드마크. 글자를 늘리지(stretch) 않는다.
          `type-wordmark` 가 컨테이너 폭(cqw)에 비례해 font-size 만 키우므로
          자폭 비율은 언제나 그대로다. textLength 로 억지로 늘리면 자형이 망가진다.
        */}
        <div className="mt-20 sm:mt-24 [container-type:inline-size]">
          <Link
            href="/"
            aria-label="Seoul Arena 홈"
            title="Seoul Arena"
            className="type-wordmark block"
          >
            SEOUL ARENA
          </Link>
        </div>

        {/* 하단 — 헤어라인 + 카피라이트 / 정책 */}
        <div className="mt-10 flex flex-col gap-4 border-t border-border/25 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Seoul Arena. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/notices" className="flex min-h-11 items-center hover:text-foreground">
              운영정보
            </Link>
            <Link href="/faq" className="flex min-h-11 items-center hover:text-foreground">
              고객지원
            </Link>
            <Link href="/terms" className="flex min-h-11 items-center hover:text-foreground">
              이용약관
            </Link>
            <Link href="/privacy" className="flex min-h-11 items-center hover:text-foreground">
              개인정보처리방침
            </Link>
          </div>
        </div>

        <p className="mt-5 text-xs text-muted">
          표시된 모든 금액은 부가세 별도이며, 확정 전 예상치입니다. 시설 제원·대관료는 정본 확정 시
          갱신됩니다.
        </p>
      </div>
    </footer>
  );
}

function FooterField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-s text-muted">{label}</p>
      {href ? (
        <a href={href} className="text-s underline underline-offset-4 hover:text-accent">
          {value}
        </a>
      ) : (
        <p className="text-s">{value}</p>
      )}
    </div>
  );
}
