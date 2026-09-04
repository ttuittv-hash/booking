import { getCurrentUser } from "@/lib/auth";
import { accountStateOf, canAccess } from "@/lib/accessPolicy";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";
import { PhotoStage } from "@/components/home/PhotoStage";
import { StackedStatements } from "@/components/home/StackedStatements";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  ButtonLink,
  CTABand,
  INVERSE_SURFACE_VARS,
  Multiline,
} from "@/components/ui/kit";

/* ============================================================================
   홈

     히어로 — 문장만으로 화면 한 판. 제목은 위(내비 아래 +80), 리드와 버튼은 아래에 붙는다.
     사진   — 스크롤을 내리면 올라와 붙고, 2칼럼에서 지면 전체로 자란 뒤 옅어진다.
     선언   — 검정 지면. 섹션을 붙여 둔 채 항목이 한 장씩 쌓이고, 다 붙은 뒤 흘러 나간다.
     CTA    — 화면 한 판을 채우는 라운드 색면.
     푸터   — 검정. 아래 절반이 검정 지면이라 푸터도 같은 지면으로 이어 둔다.
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
          <p className="container-site flex flex-wrap items-center gap-x-3 gap-y-1 break-keep py-3 text-s leading-6">
            <b>가입이 승인되었습니다.</b>
            <span className="text-muted">
              이제 대관 패키지 안내와 예상 견적, 대관 신청을 이용하실 수 있습니다.
            </span>
          </p>
        </div>
      ) : null}

      <main className="flex flex-1 flex-col">
        {/*
          ── 히어로 ───────────────────────────────────────────────────────
          첫 화면은 문장만이다. 제목·리드·버튼 한 덩어리가 화면 **세로 가운데**에 선다 —
          위에 붙여 두면 아래가 통째로 비어 화면을 반만 쓴 것처럼 보였다.
          사진은 이 아래에 있어, 스크롤을 내려야 보이기 시작한다.
        */}
        <section
          className="container-site flex flex-col justify-center pb-section-lg"
          // 첫 섹션이라 위 여백은 상단바 높이 + 섹션 위 여백이다
          style={{
            minHeight: "100vh",
            // 상단바에 가리지만 않으면 된다 — 나머지 자리는 justify-center 가 위아래로
            // 고르게 나눈다. 위에만 섹션 여백을 더 얹으면 덩어리가 아래로 밀린다.
            paddingTop: "var(--header-h)",
          }}
        >
          {/*
            히어로 한정 크기다. 좁은 화면에서 영문 제목과 국문 리드가 둘 다 40 이라
            어느 쪽이 제목인지 알 수 없었다 — 영문은 키우고 국문은 낮춰 위계를 벌린다.
          */}
          <h1 className="type-display text-d2-m lg:text-d2">
            <Multiline text={content.heroTitle} />
          </h1>

          {/*
            [수정] 리드를 화면 맨 아래로 밀지 않는다 — `mt-auto` 로 붙여 두었더니 큰 화면일수록
            제목과 멀어져 둘이 다른 섹션처럼 읽혔다. 제목 아래 80 에서 시작하고, 남는 자리는
            버튼 아래에 둔다.
          */}
          <div className="mt-hero-lead">
            <p className="text-lead-m break-keep font-extrabold lg:text-lead">
              <Multiline text={content.heroSubtitle} />
            </p>

            {/* 워딩 아래 버튼까지는 40 — 사이트 전체에서 같은 값이다 */}
            <div className="mt-lead-action flex flex-wrap items-center gap-inline">
              <ButtonLink href={content.heroPrimaryHref} variant="primary" size="lg">
                {content.heroPrimaryLabel}
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href={content.heroSecondaryHref} variant="secondary" size="lg">
                {content.heroSecondaryLabel}
              </ButtonLink>
            </div>
          </div>
        </section>

        {/*
          사진 무대와 검정 지면은 **같은 부모** 안에 있어야 한다 — 사진이 `sticky` 로 붙어
          있는 동안 검정 지면이 그 위를 지나가야 하기 때문이다. 부모가 갈리면 붙어 있지
          못하고 그냥 밀려 올라간다.
        */}
        <div className="relative">
          <PhotoStage image={content.heroImage} alt="서울아레나" />

          {/* 검정 지면은 토큰을 통째로 뒤집는다 — 안 그러면 헤어라인이 검정 위 검정이 된다 */}
          <section
            style={INVERSE_SURFACE_VARS}
            className="relative z-10 bg-inverse-bg text-inverse-fg"
          >
            <StackedStatements title={content.narrativeTitle} items={content.narrativeStatements} />

            {/* ── 전환 CTA ─────────────────────────────────────────────────
                [개정 2026-09-02] 대관 절차가 승인 완료 전용이 되면서, 승인 전 계정에게는
                누르면 대기 안내로 되돌아오는 버튼이 됐다. 상태별로 갈 수 있는 곳을 준다.
                판정은 헤더 메뉴와 같은 accessPolicy 를 쓴다. */}
            {canAccess("/guide", accountStateOf(user)) ? (
              <CTABand
                title={
                  <>
                    당신의 무대를
                    <br />
                    지금 설계하세요.
                  </>
                }
                lead="대관 절차와 단계별 준비 사항을 먼저 확인해 보세요."
                actions={
                  <ButtonLink href="/guide" variant="primary" size="lg">
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
                  <ButtonLink href="/seoularena" variant="primary" size="lg">
                    서울아레나 둘러보기
                    <ArrowRight />
                  </ButtonLink>
                }
              />
            ) : (
              <CTABand
                title={
                  <>
                    당신의 무대를
                    <br />
                    지금 설계하세요.
                  </>
                }
                lead="회원가입 후 승인이 완료되면 대관 절차와 예상 견적을 확인할 수 있습니다."
                actions={
                  <ButtonLink href="/register" variant="primary" size="lg">
                    회원가입
                    <ArrowRight />
                  </ButtonLink>
                }
              />
            )}
          </section>
        </div>
      </main>

      <SiteFooter tone="dark" />
    </div>
  );
}
