import Link from "next/link";
import { FOOTER_CATEGORIES } from "@/components/ui/nav-items";
import { INVERSE_SURFACE_VARS } from "@/components/ui/kit";

/**
 * 푸터 — 밝은 지면과 검정 지면 두 벌.
 *
 *   상단   6칼럼 위에 — 1·2 주소·연락처 / 3 빈칸 / 4 소셜 / 5·6 사이트맵 묶음
 *          주소와 이메일은 한 칼럼(213px)에서 중간에 접혀 두 칼럼을 준다.
 *          나머지는 한 칼럼씩이라 각 열이 지면 격자에 그대로 떨어진다.
 *   중단   컨테이너 전폭 워드마크  ← 푸터의 주인공. 로고를 좌상단에 작게 두지 않는다
 *   하단   헤어라인 → 좌 카피라이트 / 우 약관·정책
 *
 * [개정 2026-09-03] 소셜은 **아이콘 대신 이름**으로 둔다. 아이콘 세 개가 나란히 있으면
 * 주소·연락처와 다른 종류의 덩어리로 보여, 왼쪽 열이 두 겹으로 읽혔다. 링크가 없는
 * 채널(YouTube)은 아예 싣지 않는다 — 눌러야 없다는 걸 아는 링크는 고장으로 보인다.
 */
const ADDRESS = "서울특별시 도봉구 창동 1-24";
const CONTACT = "booking.arena@kakaocorp.com";

const SOCIALS: { label: string; href: string }[] = [
  { label: "Instagram", href: "https://www.instagram.com/seoularena.official/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/seoularena/" },
];

/** 사이트맵에 올리는 묶음 — `지원` 은 상단바 우측 유틸에 있으므로 뺀다 */
const SITEMAP = FOOTER_CATEGORIES.filter((c) => c.label !== "지원");

/*
  푸터 타이포 (2026-09-03)
    열 머리  KakaoBig Regular 14 · 대문자 · 옅게 — 아래 여백 16
    본문     KakaoBig Regular 16 — 주소부터 페이지 이름까지 한 크기다
  머리와 본문을 굵기가 아니라 **크기와 색**으로만 가른다 — 굵기까지 섞으면 열이
  네 종류의 글자로 보인다.
*/
const FOOT_LABEL = "text-[0.875rem] font-normal uppercase text-muted [font-family:var(--font-sans)]";
const FOOT_BODY = "text-[1rem] font-normal [font-family:var(--font-sans)]";

/** 열 머리 — 대문자 작은 라벨 */
function ColLabel({ children }: { children: string }) {
  return <p className={FOOT_LABEL}>{children}</p>;
}

export function SiteFooter({ tone = "light" }: { tone?: "light" | "dark" }) {
  const dark = tone === "dark";
  return (
    <footer
      // 검정 푸터는 토큰을 통째로 뒤집는다 — 보더·보조 텍스트가 자동으로 지면에 맞는다
      style={dark ? INVERSE_SURFACE_VARS : undefined}
      className={`mt-auto ${dark ? "bg-inverse-bg text-inverse-fg" : "bg-surface text-foreground"}`}
    >
      <div className="container-site pb-10 pt-16 sm:pt-24">
        <div className="grid-site gap-y-12">
          {/* 주소·이메일은 두 칼럼을 쓴다 — 한 칼럼(213)에서는 둘 다 중간에 접혔다 */}
          <div className="space-y-8 lg:col-span-2">
            <div>
              <ColLabel>Address</ColLabel>
              <p className={`mt-4 lg:whitespace-nowrap ${FOOT_BODY}`}>{ADDRESS}</p>
            </div>
            <div>
              <ColLabel>Contact</ColLabel>
              <a
                href={`mailto:${CONTACT}`}
                className={`mt-4 inline-block underline underline-offset-4 hover:text-accent lg:whitespace-nowrap ${FOOT_BODY}`}
              >
                {CONTACT}
              </a>
            </div>
          </div>

          {/* 3칼럼은 비운다 — 소셜은 4, 사이트맵 묶음은 5·6 칼럼에 선다 */}
          <div className="lg:col-span-1 lg:col-start-4">
            <ColLabel>Socials</ColLabel>
            <ul className="mt-3">
              {SOCIALS.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-block py-1 transition-colors hover:text-accent ${FOOT_BODY}`}
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {SITEMAP.map((col) => (
            <div key={col.label} className="lg:col-span-1">
              <ColLabel>{col.label}</ColLabel>
              <ul className="mt-3">
                {col.pages.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className={`inline-block py-1 transition-colors hover:text-accent ${FOOT_BODY}`}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/*
          중단 — 워드마크. 글자를 늘리지(stretch) 않는다.
          `type-wordmark` 가 컨테이너 폭(cqw)에 비례해 font-size 만 키우므로
          자폭 비율은 언제나 그대로다. textLength 로 억지로 늘리면 자형이 망가진다.
        */}
        <div className="mt-20 sm:mt-28 [container-type:inline-size]">
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
        <div className="mt-8 flex flex-col gap-4 border-t border-border pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
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
