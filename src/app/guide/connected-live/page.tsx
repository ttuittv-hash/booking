import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  LayoutCards,
  LayoutFeatures,
  Media,
  Note,
  PageHeading,
  SpecTable,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "커넥티드 라이브 | 서울아레나",
};

/**
 * Book It › 커넥티드 라이브.
 * Book It 은 카테고리 라벨이므로 페이지 타이틀은 "커넥티드 라이브" 이고 브레드크럼을 두지 않는다.
 * 본문은 Figma 레이아웃 모듈만 조합하고, 이미지 슬롯은 전부 Media 로 둔다.
 */

const BENEFITS: { title: string; desc: string }[] = [
  {
    title: "관객 규모 확장",
    desc: "본공연은 그대로 유지하면서 연계 베뉴를 통해 추가 관객을 확보합니다. 회차를 늘리지 않고도 관람 수요를 흡수합니다.",
  },
  {
    title: "중계 비용 절감",
    desc: "서울아레나가 중계 인프라를 갖추고 있어, 개별 구축 대비 중계 비용을 크게 절감할 수 있습니다.",
  },
  {
    title: "추가 수익 기회",
    desc: "티켓 매출 외에도 MD·스폰서 등 다양한 수익원을 통해 공연 한 편의 매출 잠재력을 확장합니다.",
  },
  {
    title: "단일 창구 계약",
    desc: "베뉴마다 개별 협상하던 기존 방식과 달리, 서울아레나 한 곳과의 계약으로 베뉴 연계·중계·송출·정산까지 일괄 처리됩니다.",
  },
];

const VENUE_TIERS: { title: string; desc: string; rows: [string, string][] }[] = [
  {
    title: "REAL LIVE · 서울아레나 본공연",
    desc: "최대 2.8만 명 규모의 아레나 공연장에서 펼쳐지는 원본 무대입니다. 모든 커넥티드 라이브의 중심이 됩니다.",
    rows: [["메인 아레나", "최대 28,000명"]],
  },
  {
    title: "서울아레나 연계 시설",
    desc: "같은 부지 안에서 무대를 실시간으로 나눠 즐길 수 있는 공간입니다.",
    rows: [
      ["중형공연장", "약 2,000~4,000명"],
      ["컨벤션홀", "약 1,400명"],
      ["야외 광장", "약 500~1,000명"],
    ],
  },
  {
    title: "공공 베뉴",
    desc: "도심 대형 광장을 활용해 대규모 관객을 수용하는 확장형 베뉴입니다.",
    rows: [
      ["서울광장", "약 5,000명"],
      ["광화문 광장", "약 10,000명 이상"],
      ["문정역 스포츠가든", "약 1,000명"],
    ],
  },
];

const HOW_IT_WORKS: { title: string; desc: string }[] = [
  {
    title: "본공연 확장형",
    desc: "본공연 매진 이후 커넥티드 라이브 좌석을 순차 오픈해, 티켓을 구하지 못한 팬에게 관람 기회를 제공합니다.",
  },
  {
    title: "대형 행사형",
    desc: "페스티벌·시상식 등을 처음부터 다채널로 기획해 도시 전역의 축제로 확장합니다.",
  },
  {
    title: "홍보·화제성형",
    desc: "쇼케이스·팬미팅 등을 여러 채널로 동시 송출해 미디어 임팩트를 극대화합니다.",
  },
  {
    title: "소셜라이브형",
    desc: "애프터파티, 생중계 파티 등 팬덤이 함께 모여 즐기고 소통할 수 있는 커뮤니티형 관람 경험을 더합니다.",
  },
];

export default async function ConnectedLivePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide/connected-live" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="커넥티드 라이브"
            lead="서울아레나의 공연을 여러 베뉴로 실시간 송출해, 하나의 무대를 도시 전체로 연결하는 오프라인 생중계 관람 모델입니다. 장거리 이동이나 티켓팅으로 공연장을 찾지 못한 국내외 팬도 가까운 공연장·영화관·컨벤션홀·광장에서 같은 무대를 실시간으로 즐길 수 있습니다."
          />
          <div className="mt-14">
            <Media src={null} alt="커넥티드 라이브" ratio="21 / 9" />
          </div>
        </Band>

        {/* 대관 신청자 관점의 이점 (Figma Layout / 2) */}
        <Band tone="white">
          <PageHeading
            as="h2"
            size="md"
            title="한 번의 공연으로 관객을 2~3배까지"
            lead="커넥티드 라이브가 대관 신청자에게 주는 이점입니다."
          />
          <LayoutFeatures columns={2} items={BENEFITS} />
        </Band>

        {/* 연계 베뉴 — 등급별 수용 규모 */}
        <Band tone="light">
          <PageHeading
            as="h2"
            size="md"
            title="연계 베뉴"
            lead="본공연은 서울아레나에서, 관람은 도시 곳곳에서. 공연 성격과 규모에 따라 베뉴를 연계해 관람 경험을 확장합니다."
          />
          <div className="mt-14 space-y-16">
            {VENUE_TIERS.map((tier) => (
              <div
                key={tier.title}
                className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:items-start lg:gap-16"
              >
                <div>
                  <h3 className="type-kr-heading text-h5-m sm:text-h5">{tier.title}</h3>
                  <p className="mt-4 max-w-md break-keep text-s text-muted">{tier.desc}</p>
                </div>
                <SpecTable dense rows={tier.rows} />
              </div>
            ))}
          </div>
          <Note className="mt-14 max-w-3xl">
            이외에도 상영·상업 시설 네트워크(전국 영화관, 펍·라운지, 커뮤니티 공간 등)를 통해 팬이
            가까운 곳에서 관람할 수 있고, 해외 상영 시설까지 연계해 글로벌 팬덤에게도 실시간으로
            무대를 전합니다. 연계 베뉴 구성과 수용 규모는 공연 기획과 협의 상황에 따라 달라질 수
            있습니다.
          </Note>
        </Band>

        {/* 구성 유형 (Figma Layout / 1) */}
        <Band tone="white">
          <LayoutCards
            columns={2}
            title="구성 유형"
            lead="공연 유형에 따라 유연하게 구성할 수 있습니다."
            items={HOW_IT_WORKS.map((h) => ({ title: h.title, desc: h.desc }))}
          />
        </Band>

        {/* 대관 심사 가점 */}
        <Band tone="dark">
          <PageHeading
            as="h2"
            size="md"
            title="대관 심사 가점"
            lead="커넥티드 라이브 연계 공연으로 신청하면 대관 심사에서 대관점수 가점이 부여됩니다. 운영자가 일정·공연 내용·시설 적합성을 검토하는 심사 단계에서 반영되며, 자세한 기준과 신청 방법은 대관 담당자에게 문의하세요."
          />
          <div className="mt-10">
            <ButtonLink href="/mypage/inquiries/new" variant="primary">
              1:1 문의하기
              <ArrowRight />
            </ButtonLink>
          </div>
        </Band>

        <CTABand
          title="연계 규모를 포함해 예상 대관료를 확인하세요."
          lead="대관 규모와 일정을 입력하면 예상 대관료를 즉시 확인할 수 있습니다."
          actions={
            <>
              <ButtonLink href="/apply" variant="primary">
                대관 신청하기
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/guide" variant="secondary">
                대관 안내 보기
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
