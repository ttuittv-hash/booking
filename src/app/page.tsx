import { getCurrentUser } from "@/lib/auth";
import { getHomeContent, listNotices } from "@/lib/db";
import { PROCESS_SEGMENTS } from "@/lib/content/processFacts";
import { CAPACITY_DISCLAIMER, COMPLEX_PARKING } from "@/lib/content/venueFacts";
import { isRentalOpen, OPEN_PHASE_BADGE } from "@/lib/release";
import { PublicHeader } from "@/components/PublicHeader";
import { Manifesto } from "@/components/home/Manifesto";
import {
  findCurrentRentalNotice,
  NoRentalNotice,
  RentalNoticeCard,
} from "@/components/RentalNoticeCard";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Badge,
  Band,
  ButtonLink,
  CTABand,
  DownloadIcon,
  Media,
  Note,
  StatBand,
  Multiline,
  type StatItem,
} from "@/components/ui/kit";

/* ============================================================================
   홈

   8/20 시점의 홈은 브랜드 소개면이 아니라 공고 사이트의 첫 화면이다.
   방문자가 첫 화면에서 얻어야 하는 것 세 가지 순서로 섹션을 배치한다.
     ① 언제 무엇을 접수하는지 (공고)
     ② 이 무대가 내 공연 규모에 맞는지 (KEY NUMBERS)
     ③ 지금 당장 무엇을 해야 하는지 (회원가입)
   ========================================================================= */

/**
 * KEY NUMBERS — 8/20 에 열려 있는 페이지로만 보낸다.
 * 시설 제원은 9/1 공개이므로 이 밴드의 링크 대상으로 쓰지 않는다.
 * 9/1 이후에는 수용인원·활하중·그리드·반입구 링크를 시설 제원의 아레나 탭으로 옮기고,
 * 중형공연장 스탯 1개를 추가해 6개로 확장한다.
 */
function keyNumbers(open: boolean): StatItem[] {
  const specHref = open ? "/venue/specs?venue=arena" : "/venue/features";
  const base: StatItem[] = [
    {
      value: "22,500",
      label: "최대 수용인원 (명)",
      desc: "아레나 엔드 스테이지·스탠딩 구성 기준입니다. 무대 배치에 따라 달라집니다.",
      href: open ? specHref : "/venue",
    },
    {
      // 단위는 값이 아니라 라벨에 적는다 (디자인 가이드 §9.4).
      // type-display 가 대문자 변환이라 값에 붙인 소문자 단위가 `35M` 처럼 튄다.
      value: "180",
      label: "상부 활하중 (톤)",
      desc: "마더트러스 5기(A·B·C·L·R)의 활하중 합계입니다.",
      href: specHref,
    },
    {
      value: "35",
      label: "그리드 높이 (m)",
      desc: "플로어 기준 테크니컬 그리드 높이입니다.",
      href: specHref,
    },
    {
      value: "9.9 × 4.5",
      label: "반입구 (m)",
      desc: "40ft 컨테이너가 그대로 들어옵니다.",
      href: specHref,
    },
    {
      value: COMPLEX_PARKING.total.toLocaleString(),
      label: "주차 (대)",
      desc: `단지 전체 규모입니다 (B2F ${COMPLEX_PARKING.b2f}대, B1F ${COMPLEX_PARKING.b1f}대).`,
      href: "/faq",
    },
  ];
  if (!open) return base;
  return [
    ...base,
    {
      value: "24 × 12 × 13",
      label: "중형공연장 메인 스테이지 (m)",
      desc: "프로시니엄 무대 폭·높이·깊이입니다.",
      href: "/venue/specs?venue=live-hall",
    },
  ];
}

export default async function Home() {
  const [user, content, notices] = await Promise.all([
    getCurrentUser(),
    getHomeContent(),
    listNotices(),
  ]);
  const current = findCurrentRentalNotice(notices);
  const open = isRentalOpen();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        {/* ── ① 히어로 ───────────────────────────────────────────────────── */}
        <Band tone="light" size="lg">
          <h1 className="type-display max-w-4xl animate-[fade-up_0.7s_ease_both] text-d2-m sm:text-h1 lg:text-d2">
            <Multiline text={content.heroTitle} />
          </h1>

          <p className="measure mt-10 animate-[fade-up_0.7s_ease_both] break-keep text-m text-muted [animation-delay:120ms]">
            {content.heroSubtitle}
          </p>

          <div className="mt-12 flex animate-[fade-up_0.7s_ease_both] flex-col items-stretch gap-3 [animation-delay:200ms] sm:flex-row sm:items-center">
            {open ? (
              <>
                <ButtonLink href="/apply" variant="primary">
                  대관 신청하기
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/packages" variant="secondary">
                  대관료 확인
                </ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href={content.heroPrimaryHref} variant="primary">
                  {content.heroPrimaryLabel}
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href={content.heroSecondaryHref} variant="secondary">
                  {content.heroSecondaryLabel}
                </ButtonLink>
              </>
            )}
          </div>

          <div className="mt-16">
            <Media src={content.heroImage} alt="서울아레나" ratio="21 / 9" />
            <p className="mt-3 text-xs text-muted">
              개관 전 조감도이며 준공 시 실제 모습과 다를 수 있습니다.
            </p>
          </div>
        </Band>

        {/* ── ② 대관 공고 — 8/20 최상단 우선순위 블록 ─────────────────────── */}
        <Band tone="white">
          <p className="type-display text-h6-m sm:text-h6">CURRENT NOTICE</p>
          <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">진행 중인 대관 공고</h2>
          <p className="measure mt-6 break-keep text-m text-muted">
            대관 접수 일정과 변경 사항은 공지사항으로 안내합니다. 아래 공고의 상세 내용과 최신 갱신
            내역을 공지사항에서 확인해 주세요.
          </p>
          <div className="mt-12">
            {current ? <RentalNoticeCard notice={current} /> : <NoRentalNotice />}
          </div>
        </Band>

        {/* ── ③ KEY NUMBERS ──────────────────────────────────────────────── */}
        <Band tone="light">
          <p className="type-display text-h6-m sm:text-h6">KEY NUMBERS</p>
          <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">
            내 공연이 이 무대에서 되는가
          </h2>
          <div className="mt-14">
            <StatBand items={keyNumbers(open)} />
          </div>
          <Note className="measure mt-10">{CAPACITY_DISCLAIMER}</Note>
        </Band>

        {/* ── 브랜드 선언문 — 옐로 강조를 쓰기 위해 블랙 지면 위에 둔다 ──── */}
        <Band tone="dark" size="lg">
          <Manifesto
            title={content.narrativeTitle}
            lead={content.narrativeLead}
            statements={content.narrativeStatements}
          />
          <div className="mt-12 flex flex-wrap gap-3">
            <ButtonLink href="/venue/features" variant="secondary">
              무대 특장 자세히 보기
              <ArrowRight />
            </ButtonLink>
            <ButtonLink href="/library" variant="secondary">
              시설소개자료 다운로드
              <DownloadIcon />
            </ButtonLink>
          </div>
        </Band>

        {/* ── HOW IT WORKS — 8단계를 3구간으로 압축 (홈 전용 5단계를 만들지 않는다) */}
        <Band tone="light">
          <p className="type-display text-h6-m sm:text-h6">HOW IT WORKS</p>
          <h2 className="type-kr-heading mt-4 text-h3-m sm:text-h3">대관은 세 구간으로 진행됩니다</h2>
          <p className="measure mt-6 break-keep text-m text-muted">
            신청 전 구간은 접수가 열리기 전에 끝내 두실 수 있고, 신청 이후 구간은 심사와 계약 일정에
            따라 진행됩니다. 회원 승인에 시간이 걸리므로 가입은 접수 개시 전에 마쳐 두시는 편이
            좋습니다.
          </p>

          <ol className="mt-14 border-t border-border/25">
            {PROCESS_SEGMENTS.map((seg) => (
              <li
                key={seg.title}
                className="grid gap-3 border-b border-border/15 py-8 lg:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] lg:gap-[var(--gutter)]"
              >
                <div className="flex items-baseline gap-4">
                  <span className="type-display text-s tabular-nums text-muted">{seg.steps}</span>
                  <h3 className="type-kr-heading text-h6-m sm:text-h6">{seg.title}</h3>
                </div>
                <p className="measure break-keep text-s text-muted">{seg.desc}</p>
              </li>
            ))}
          </ol>

          <div className="mt-12">
            <ButtonLink href="/guide" variant="primary">
              대관 절차 8단계 전체 보기
              <ArrowRight />
            </ButtonLink>
          </div>
        </Band>

        {/* ── 하단 CTA ───────────────────────────────────────────────────── */}
        {open ? (
          <CTABand
            title="공연 규모와 일정이 정해지셨다면 지금 신청하세요."
            lead="신청 화면에서 예상 대관료를 확인하고 그대로 제출하실 수 있습니다."
            actions={
              <>
                <ButtonLink href="/apply" variant="primary">
                  대관 신청
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/packages" variant="secondary">
                  대관료 확인
                </ButtonLink>
              </>
            }
          />
        ) : (
          <CTABand
            title="먼저 회원가입을 해 두세요."
            lead="대관 신청 접수는 2026년 9월 1일에 시작합니다. 신청자 계정은 사업자등록증 확인을 포함한 운영자 승인을 거쳐 이용할 수 있으므로, 접수가 시작된 뒤에 가입하시면 승인을 기다리는 동안 신청을 진행하실 수 없습니다."
            actions={
              <>
                <ButtonLink href="/register" variant="primary">
                  회원가입
                  <ArrowRight />
                </ButtonLink>
                <ButtonLink href="/apply" variant="secondary">
                  대관 신청 안내
                </ButtonLink>
                <span className="inline-flex items-center gap-2 self-center text-xs">
                  <Badge>{OPEN_PHASE_BADGE}</Badge> 신청서 작성
                </span>
              </>
            }
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
