import Link from "next/link";
import { FOOTER_CATEGORIES } from "@/components/ui/nav-items";

/**
 * Figma Design › Footer / 1 규격.
 *
 *   상단   좌 : Address / Contact + SNS   우 : 사이트맵 3열
 *   중단   컨테이너 전폭 워드마크  ← 푸터의 주인공. 로고를 좌상단에 작게 두지 않는다
 *   하단   헤어라인 → 좌 카피라이트 / 우 약관·정책
 *
 * 지면은 오프화이트, 글자는 검정. 블랙 밴드가 아니다.
 * 사이트맵은 **3열**(Your Stage / Your Guide / Book It) — 지원(공지·FAQ·문의)은
 * 상단바 우측 유틸에 있으므로 푸터에서 중복시키지 않는다.
 */
const ADDRESS = "서울특별시 도봉구 창동 1-24";
const CONTACT = "booking.arena@kakaocorp.com";

/** 사이트맵에 올리는 묶음 — `지원` 은 뺀다 */
const SITEMAP = FOOTER_CATEGORIES.filter((c) => c.label !== "지원");

/* Figma `2607 서울아레나 웹사이트 Full › Style Guide › Icons` 의 브랜드 로고 */
const BRAND_ICONS = {
  instagram:
    "M16 3.24268H8C5.23858 3.24268 3 5.48126 3 8.24268V16.2427C3 19.0041 5.23858 21.2427 8 21.2427H16C18.7614 21.2427 21 19.0041 21 16.2427V8.24268C21 5.48126 18.7614 3.24268 16 3.24268ZM19.25 16.2427C19.2445 18.0353 17.7926 19.4872 16 19.4927H8C6.20735 19.4872 4.75549 18.0353 4.75 16.2427V8.24268C4.75549 6.45003 6.20735 4.99817 8 4.99268H16C17.7926 4.99817 19.2445 6.45003 19.25 8.24268V16.2427ZM16.75 8.49268C17.3023 8.49268 17.75 8.04496 17.75 7.49268C17.75 6.9404 17.3023 6.49268 16.75 6.49268C16.1977 6.49268 15.75 6.9404 15.75 7.49268C15.75 8.04496 16.1977 8.49268 16.75 8.49268ZM12 7.74268C9.51472 7.74268 7.5 9.7574 7.5 12.2427C7.5 14.728 9.51472 16.7427 12 16.7427C14.4853 16.7427 16.5 14.728 16.5 12.2427C16.5027 11.0484 16.0294 9.90225 15.1849 9.05776C14.3404 8.21327 13.1943 7.74002 12 7.74268ZM9.25 12.2427C9.25 13.7615 10.4812 14.9927 12 14.9927C13.5188 14.9927 14.75 13.7615 14.75 12.2427C14.75 10.7239 13.5188 9.49268 12 9.49268C10.4812 9.49268 9.25 10.7239 9.25 12.2427Z",
  linkedin:
    "M4.5 3.24268C3.67157 3.24268 3 3.91425 3 4.74268V19.7427C3 20.5711 3.67157 21.2427 4.5 21.2427H19.5C20.3284 21.2427 21 20.5711 21 19.7427V4.74268C21 3.91425 20.3284 3.24268 19.5 3.24268H4.5ZM8.52076 7.2454C8.52639 8.20165 7.81061 8.79087 6.96123 8.78665C6.16107 8.78243 5.46357 8.1454 5.46779 7.24681C5.47201 6.40165 6.13998 5.72243 7.00764 5.74212C7.88795 5.76181 8.52639 6.40728 8.52076 7.2454ZM12.2797 10.0044H9.75971H9.7583V18.5643H12.4217V18.3646C12.4217 17.9847 12.4214 17.6047 12.4211 17.2246C12.4203 16.2108 12.4194 15.1959 12.4246 14.1824C12.426 13.9363 12.4372 13.6804 12.5005 13.4455C12.7381 12.568 13.5271 12.0013 14.4074 12.1406C14.9727 12.2291 15.3467 12.5568 15.5042 13.0898C15.6013 13.423 15.6449 13.7816 15.6491 14.129C15.6605 15.1766 15.6589 16.2242 15.6573 17.2719C15.6567 17.6417 15.6561 18.0117 15.6561 18.3815V18.5629H18.328V18.3576C18.328 17.9056 18.3278 17.4537 18.3275 17.0018C18.327 15.8723 18.3264 14.7428 18.3294 13.6129C18.3308 13.1024 18.276 12.599 18.1508 12.1054C17.9638 11.3713 17.5771 10.7638 16.9485 10.3251C16.5027 10.0129 16.0133 9.81178 15.4663 9.78928C15.404 9.78669 15.3412 9.7833 15.2781 9.77989C14.9984 9.76477 14.7141 9.74941 14.4467 9.80334C13.6817 9.95662 13.0096 10.3068 12.5019 10.9241C12.4429 10.9949 12.3852 11.0668 12.2991 11.1741L12.2797 11.1984V10.0044ZM5.68164 18.5671H8.33242V10.01H5.68164V18.5671Z",
  youtube:
    "M21.5928 7.20301C21.4789 6.78041 21.2563 6.39501 20.9472 6.08518C20.6381 5.77534 20.2532 5.55187 19.8308 5.43701C18.2648 5.00701 11.9998 5.00001 11.9998 5.00001C11.9998 5.00001 5.73584 4.99301 4.16884 5.40401C3.74677 5.52415 3.36266 5.75078 3.05341 6.06214C2.74415 6.3735 2.52013 6.75913 2.40284 7.18201C1.98984 8.74801 1.98584 11.996 1.98584 11.996C1.98584 11.996 1.98184 15.26 2.39184 16.81C2.62184 17.667 3.29684 18.344 4.15484 18.575C5.73684 19.005 11.9848 19.012 11.9848 19.012C11.9848 19.012 18.2498 19.019 19.8158 18.609C20.2383 18.4943 20.6236 18.2714 20.9335 17.9622C21.2434 17.653 21.4672 17.2682 21.5828 16.846C21.9968 15.281 21.9998 12.034 21.9998 12.034C21.9998 12.034 22.0198 8.76901 21.5928 7.20301ZM9.99584 15.005L10.0008 9.00501L15.2078 12.01L9.99584 15.005Z",
} as const;

/** 유튜브 채널 주소는 아직 없다 — 생기면 href 만 채운다 */
const SOCIALS: { key: keyof typeof BRAND_ICONS; label: string; href: string | null }[] = [
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/seoularena.official/" },
  { key: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/company/seoularena/" },
  { key: "youtube", label: "YouTube", href: null },
];

function BrandIcon({ path }: { path: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
      <path fillRule="evenodd" clipRule="evenodd" d={path} />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-surface">
      <div className="container-site pb-10 pt-12 sm:pt-16">
        {/* 상단 — 좌: 연락처 + SNS / 우: 사이트맵 */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
          <div className="space-y-6">
            <FooterField label="Address" value={ADDRESS} />
            <FooterField label="Contact" value={CONTACT} href={`mailto:${CONTACT}`} />

            <ul className="flex items-center gap-2">
              {SOCIALS.map((s) =>
                s.href ? (
                  <li key={s.key}>
                    <a
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={s.label}
                      title={s.label}
                      className="flex h-11 w-11 items-center justify-center transition-colors hover:text-accent"
                    >
                      <BrandIcon path={BRAND_ICONS[s.key]} />
                    </a>
                  </li>
                ) : (
                  // 링크가 없는 채널은 눌리지 않게 두고 흐리게만 보여 준다
                  <li key={s.key}>
                    <span
                      aria-label={`${s.label} (준비 중)`}
                      title={`${s.label} — 준비 중`}
                      className="flex h-11 w-11 items-center justify-center text-muted opacity-40"
                    >
                      <BrandIcon path={BRAND_ICONS[s.key]} />
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-8 sm:grid-cols-3 lg:gap-x-14">
            {SITEMAP.map((col) => (
              <div key={col.label}>
                <p className="type-display text-xs tracking-[0.08em] text-muted">{col.label}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.pages.map((l) => (
                    <li key={l.href + l.label}>
                      <Link
                        href={l.href}
                        className="inline-flex min-h-9 items-center text-s transition-colors hover:text-accent"
                      >
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
        <div className="mt-14 sm:mt-16 [container-type:inline-size]">
          <Link
            href="/"
            aria-label="Seoul Arena 홈"
            title="Seoul Arena"
            className="type-wordmark block"
          >
            SEOUL ARENA
          </Link>
        </div>

        {/* 하단 — 헤어라인 + 카피라이트 / 약관·정책 */}
        <div className="mt-8 flex flex-col gap-4 border-t border-border/25 pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Seoul Arena. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/terms" className="flex min-h-11 items-center hover:text-foreground">
              이용약관
            </Link>
            <Link href="/privacy" className="flex min-h-11 items-center hover:text-foreground">
              개인정보처리방침
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterField({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div>
      <p className="text-s text-muted">{label}</p>
      {href ? (
        // 글자 높이만큼만 잡히면 터치 타깃이 14px 밖에 안 된다. 아래 푸터 링크들과 같이 맞춘다.
        <a
          href={href}
          className="inline-flex min-h-11 items-center text-s underline underline-offset-4 hover:text-accent"
        >
          {value}
        </a>
      ) : (
        <p className="text-s">{value}</p>
      )}
    </div>
  );
}
