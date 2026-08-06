import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "커넥티드 라이브 | 서울아레나",
};

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

// 실제 이미지는 추후 어드민 콘텐츠 관리 화면에서 업로드해 교체할 예정 — 지금은 자리만 잡아둔다.
function ImagePlaceholder({ src, alt }: { src: string | null; alt: string }) {
  if (src) {
    return (
      <div className="aspect-video overflow-hidden rounded-sm border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div className="flex aspect-video items-center justify-center rounded-sm border border-dashed border-border bg-panel/60">
      <span className="text-[11.5px] text-muted">이미지 준비 중</span>
    </div>
  );
}

const BENEFITS: { tag: string; title: string; desc: string; image: string | null }[] = [
  {
    tag: "AUDIENCE EXPANSION",
    title: "관객 규모 확장",
    desc: "본공연은 그대로 유지하면서 연계 베뉴를 통해 추가 관객을 확보합니다. 회차를 늘리지 않고도 관람 수요를 흡수합니다.",
    image: null,
  },
  {
    tag: "COST EFFICIENCY",
    title: "중계 비용 절감",
    desc: "서울아레나가 중계 인프라를 갖추고 있어, 개별 구축 대비 중계 비용을 크게 절감할 수 있습니다.",
    image: null,
  },
  {
    tag: "MORE REVENUE",
    title: "추가 수익 기회",
    desc: "티켓 매출 외에도 MD·스폰서 등 다양한 수익원(RS)을 통해 공연 한 편의 매출 잠재력을 확장합니다.",
    image: null,
  },
  {
    tag: "ONE-STOP CONTRACT",
    title: "단일 창구 계약",
    desc: "베뉴마다 개별 협상하던 기존 방식과 달리, 서울아레나 한 곳과의 계약으로 베뉴 연계·중계·송출·정산까지 일괄 처리됩니다.",
    image: null,
  },
];

const VENUE_TIERS: { title: string; desc: string; items: string[] | null; image: string | null }[] = [
  {
    title: "REAL LIVE · 서울아레나 본공연",
    desc: "최대 2.8만 명 규모의 아레나 공연장에서 펼쳐지는 원본 무대입니다. 모든 커넥티드 라이브의 중심이 됩니다.",
    items: null,
    image: null,
  },
  {
    title: "서울아레나 연계 시설",
    desc: "같은 부지 안에서 무대를 실시간으로 나눠 즐길 수 있는 공간들입니다.",
    items: ["중형공연장 · 약 2,000~4,000명", "컨벤션홀 · 약 1,400명", "야외 광장 · 약 500~1,000명"],
    image: null,
  },
  {
    title: "공공 베뉴",
    desc: "도심 대형 광장을 활용해 대규모 관객을 수용하는 확장형 베뉴입니다.",
    items: [
      "서울광장 · 약 5,000명 수용 가능",
      "광화문 광장 · 약 10,000명 이상 수용 가능",
      "문정역 스포츠가든 · 약 1,000명 수용 가능",
    ],
    image: null,
  },
];

const HOW_IT_WORKS: { tag: string; desc: string; image: string | null }[] = [
  {
    tag: "본공연 확장형",
    desc: "본공연 매진 이후 커넥티드 라이브 좌석을 순차 오픈해, 티켓을 구하지 못한 팬에게 관람 기회를 제공합니다.",
    image: null,
  },
  {
    tag: "대형 행사형",
    desc: "페스티벌·시상식 등을 처음부터 다채널로 기획해 도시 전역의 축제로 확장합니다.",
    image: null,
  },
  {
    tag: "홍보·화제성형",
    desc: "쇼케이스·팬미팅 등을 여러 채널로 동시 송출해 미디어 임팩트를 극대화합니다.",
    image: null,
  },
  {
    tag: "소셜라이브형",
    desc: "애프터파티, 생중계 파티 등 팬덤이 함께 모여 즐기고 소통할 수 있는 커뮤니티형 관람 경험을 더합니다.",
    image: null,
  },
];

export default async function ConnectedLivePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">CONNECTED LIVE</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">
          한 번의 공연, 끝나지 않는 경험
        </h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          커넥티드 라이브는 서울아레나의 공연을 여러 베뉴로 실시간 송출하여, 하나의 무대를 도시 전체로
          연결·확산하는 오프라인 생중계 관람 모델입니다. 장거리 이동이나 티켓팅으로 공연장을 찾지 못한
          국내외 팬들도, 가까운 공연장·영화관·컨벤션홀·광장에서 같은 무대를 실시간으로 즐길 수
          있습니다. 본공연 한 번으로 관객을 2~3배 이상 확장하는 새로운 관람 구조입니다.
        </p>

        <div className="mt-8">
          <ImagePlaceholder src={null} alt="커넥티드 라이브 소개" />
        </div>

        <Section id="why" title="WHY CONNECTED LIVE — 대관 신청자에게 어떤 이점이 있나요?">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div key={b.tag} className="border border-border bg-panel/60 p-5">
                <ImagePlaceholder src={b.image} alt={b.title} />
                <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent">
                  {b.tag}
                </div>
                <div className="mt-2 text-[14px] font-semibold">{b.title}</div>
                <p className="mt-2 text-[12.5px] leading-6 text-muted">{b.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="venues" title="CONNECTED LIVE VENUES">
          <p className="text-[13.5px] leading-7 text-muted">
            본공연은 서울아레나에서, 관람은 도시 곳곳에서. 공연 성격과 규모에 따라 다양한 베뉴를 연계해
            관람 경험을 확장합니다.
          </p>
          <div className="mt-6 space-y-5">
            {VENUE_TIERS.map((tier) => (
              <div key={tier.title} className="border border-border bg-panel/60 p-5">
                <div className="max-w-sm">
                  <ImagePlaceholder src={tier.image} alt={tier.title} />
                </div>
                <div className="mt-4 text-[13.5px] font-semibold text-accent">{tier.title}</div>
                <p className="mt-2 text-[12.5px] leading-6 text-muted">{tier.desc}</p>
                {tier.items && (
                  <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-[12.5px] text-muted sm:grid-cols-3">
                    {tier.items.map((it) => (
                      <li key={it} className="flex gap-1.5">
                        <span className="text-accent">·</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12.5px] leading-6 text-muted">
            이외에도 상영·상업 시설 네트워크(전국 영화관, 펍·라운지, 커뮤니티 공간 등)를 통해 팬들이
            가까운 곳에서 관람할 수 있으며, 해외 상영 시설까지 연계해 글로벌 팬덤에게도 실시간으로
            무대를 전합니다.
          </p>
          <p className="mt-2 text-[11.5px] text-muted">
            * 연계 베뉴 구성 및 수용 규모는 공연 기획과 협의 상황에 따라 달라질 수 있습니다.
          </p>
        </Section>

        <Section id="how-it-works" title="HOW IT WORKS">
          <p className="text-[13.5px] leading-7 text-muted">공연 유형에 따라 유연하게 구성할 수 있습니다.</p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            {HOW_IT_WORKS.map((h) => (
              <div key={h.tag} className="border border-border bg-panel/60 p-5">
                <ImagePlaceholder src={h.image} alt={h.tag} />
                <div className="mt-4 text-[13.5px] font-semibold">{h.tag}</div>
                <p className="mt-2 text-[12.5px] leading-6 text-muted">{h.desc}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section id="benefit" title="APPLICATION BENEFIT — 대관 심사 가점 안내">
          <p className="text-[13.5px] leading-7 text-muted">
            커넥티드 라이브 연계 공연으로 신청하시는 경우, 대관 심사 시 대관점수 가점이 부여됩니다.
            심사 단계(운영자가 일정·공연 내용·시설 적합성 등을 검토하는 절차)에서 반영되며, 자세한
            기준과 신청 방법은 대관 담당자에게 문의해 주세요.
          </p>
        </Section>

        <Link href="/guide" className="mt-4 inline-block text-[13px] font-medium text-accent hover:underline">
          ← 대관 안내로 돌아가기
        </Link>
      </main>
    </div>
  );
}
