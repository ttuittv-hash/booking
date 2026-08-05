import Link from "next/link";
import { Label } from "@/components/ui/kit";

/**
 * Figma Design 페이지 공통 Footer.
 * 구성(Notion 대관·비즈니스 사이트 구조 기획 › 글로벌 UI):
 *   운영정보 · 고객지원 · 이용약관 · 개인정보처리방침 · 사이트 전환 · SNS
 * 레이어 스위처(FAN · BUSINESS · PREMIUM)는 도메인 표기가 두 기획 문서에서
 * 엇갈려 있어(connect.kakaoseoul.com vs business.kakaoarena.com) 확정 전까지
 * 링크를 걸지 않고 자리만 잡아둔다.
 */

const NAV_COLUMNS: { label: string; links: { label: string; href: string }[] }[] = [
  {
    label: "Your Stage",
    links: [
      { label: "시설 개요", href: "/venue#overview" },
      { label: "시설 제원", href: "/venue#specs" },
      { label: "무대 특장", href: "/venue#stage-features" },
      { label: "부대시설", href: "/venue#amenities" },
    ],
  },
  {
    label: "Book It",
    links: [
      { label: "대관 개요", href: "/guide" },
      { label: "대관 절차", href: "/guide#process" },
      { label: "대관 패키지", href: "/packages" },
      { label: "대관 규약", href: "/guide#rules" },
      { label: "대관 양식함", href: "/guide/forms" },
      { label: "이미지 가이드", href: "/guide/image-guide" },
    ],
  },
  {
    label: "Know It",
    links: [
      { label: "공지사항", href: "/notices" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    label: "Host It",
    links: [
      { label: "대관 신청", href: "/apply" },
      { label: "내 신청 내역", href: "/mypage" },
      { label: "회원가입", href: "/register" },
      { label: "로그인", href: "/login" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-inverse-bg text-inverse-fg">
      <div className="container-site py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* 브랜드 */}
          <div>
            <Link href="/" className="type-display text-h4 leading-none">
              Seoul Arena
            </Link>
            <p className="mt-5 max-w-xs text-s text-inverse-muted">
              한계 없는 인프라 위에서
              <br />
              당신만의 무대를 지휘하세요.
            </p>

            <div className="mt-8">
              <Label className="text-inverse-muted">Layer</Label>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-s">
                <span className="text-inverse-muted" title="도메인 확정 후 연결 예정">
                  Fan
                </span>
                <span aria-hidden className="text-inverse-muted/40">
                  ·
                </span>
                <span className="border-b-2 border-accent pb-0.5 font-bold">Business</span>
                <span aria-hidden className="text-inverse-muted/40">
                  ·
                </span>
                <span className="text-inverse-muted" title="도메인 확정 후 연결 예정">
                  Premium
                </span>
              </div>
            </div>
          </div>

          {/* 사이트맵 */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {NAV_COLUMNS.map((col) => (
              <div key={col.label}>
                <Label className="text-inverse-muted">{col.label}</Label>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.href + l.label}>
                      <Link
                        href={l.href}
                        className="text-s text-inverse-fg/85 transition-colors hover:text-accent"
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

        {/* 하단 */}
        <div className="mt-14 flex flex-col gap-4 border-t border-inverse-fg/20 pt-8 text-xs text-inverse-muted sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/terms" className="hover:text-inverse-fg">
              이용약관
            </Link>
            <Link href="/privacy" className="hover:text-inverse-fg">
              개인정보처리방침
            </Link>
            <Link href="/faq" className="hover:text-inverse-fg">
              고객지원
            </Link>
          </div>
          <p>© {new Date().getFullYear()} Seoul Arena. All rights reserved.</p>
        </div>

        <p className="mt-5 text-xs text-inverse-muted/70">
          표시된 모든 금액은 부가세 별도이며, 확정 전 예상치입니다. 시설 제원·대관료는 정본 확정 시
          갱신됩니다.
        </p>
      </div>
    </footer>
  );
}
