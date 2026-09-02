import { getCurrentUser } from "@/lib/auth";
import { accountStateOf, canAccess } from "@/lib/accessPolicy";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { Manifesto } from "@/components/home/Manifesto";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { ArrowRight, Band, ButtonLink, CTABand, Media, Multiline } from "@/components/ui/kit";

/* ============================================================================
   홈 — Notion 「콘텐츠 전문 · 홈」

     히어로 (디스플레이 H1 + 국문 리드 + 대관 신청)
     → 블랙 지면 선언문 (디스플레이 H1 + 리드 + 진술 4개)
     → 옐로 CTA
   ========================================================================= */

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const [user, content, params] = await Promise.all([
    getCurrentUser(),
    getHomeContent(),
    searchParams,
  ]);

  // 승인 대기 화면(/pending)에서 승인이 확인되면 ?welcome=approved 를 달고 여기로 보낸다.
  // 그냥 홈만 열리면 화면이 조용히 바뀌어 무슨 일이 일어난 건지 알 수 없다.
  //
  // 주소로 붙일 수 있는 값이라 로그인 상태를 함께 본다 — 승인 완료된 신청자에게만 뜬다.
  const justApproved =
    params.welcome === "approved" &&
    user?.role === "APPLICANT" &&
    user.approvalStatus === "APPROVED";

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      {justApproved ? (
        <div className="border-b border-accent bg-accent-soft">
          <p className="container-site flex flex-wrap items-center gap-x-3 gap-y-1 py-3 text-s leading-6 break-keep">
            <b>가입이 승인되었습니다.</b>
            <span className="text-muted">
              이제 대관 패키지 안내와 예상 견적, 대관 신청을 이용하실 수 있습니다.
            </span>
          </p>
        </div>
      ) : null}

      <main className="flex flex-1 flex-col">
        {/* ── 히어로 ─────────────────────────────────────────────────────── */}
        <Band tone="light" size="lg">
          <h1 className="type-display max-w-4xl animate-[fade-up_0.7s_ease_both] text-d2-m lg:text-d2">
            <Multiline text={content.heroTitle} />
          </h1>

          <p className="type-kr-heading mt-6 max-w-2xl animate-[fade-up_0.7s_ease_both] break-keep text-h5-m [animation-delay:120ms] sm:text-h5">
            <Multiline text={content.heroSubtitle} />
          </p>

          <div className="mt-8 flex animate-[fade-up_0.7s_ease_both] flex-col items-stretch gap-3 [animation-delay:200ms] sm:flex-row sm:items-center">
            <ButtonLink href={content.heroPrimaryHref} variant="primary">
              {content.heroPrimaryLabel}
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href={content.heroSecondaryHref} variant="secondary">
              {content.heroSecondaryLabel}
            </ButtonLink>
          </div>

          <div className="mt-10">
            <Media src={content.heroImage} alt="서울아레나" ratio="21 / 9" />
          </div>
        </Band>

        {/* ── 브랜드 선언문 — 옐로 강조를 쓰기 위해 블랙 지면 위에 둔다 ──── */}
        <Band tone="dark" size="lg">
          <Manifesto
            title={content.narrativeTitle}
            lead={content.narrativeLead}
            statements={content.narrativeStatements}
          />
        </Band>

        {/* ── 전환 CTA ─────────────────────────────────────────────────────
            [개정 2026-09-02] 대관 절차가 승인 완료 전용이 되면서, 승인 전 계정에게는
            누르면 대기 안내로 되돌아오는 버튼이 됐다. 상태별로 갈 수 있는 곳을 준다.
            판정은 헤더 메뉴와 같은 accessPolicy 를 쓴다. */}
        {canAccess("/guide", accountStateOf(user)) ? (
          <CTABand
            title="당신의 무대를 지금 설계하세요."
            lead="대관 절차와 단계별 준비 사항을 먼저 확인해 보세요."
            actions={
              <ButtonLink href="/guide" variant="primary">
                대관 절차
                <ArrowRight />
              </ButtonLink>
            }
          />
        ) : user ? (
          <CTABand
            title="승인이 완료되면 바로 시작할 수 있습니다."
            lead="심사 결과는 알림으로 안내해 드립니다. 그동안 서울아레나를 둘러보세요."
            actions={
              <ButtonLink href="/seoularena" variant="primary">
                서울아레나 둘러보기
                <ArrowRight />
              </ButtonLink>
            }
          />
        ) : (
          <CTABand
            title="당신의 무대를 지금 설계하세요."
            lead="회원가입 후 승인이 완료되면 대관 절차와 예상 견적을 확인할 수 있습니다."
            actions={
              <ButtonLink href="/register" variant="primary">
                회원가입
                <ArrowRight />
              </ButtonLink>
            }
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
