import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "서울아레나 소개 | 서울아레나",
};

const HALLS = [
  {
    no: "01",
    title: "메인 아레나",
    titleEn: "Arena",
    stat: "최대 약 20,000명 수용",
    desc: "국내외 대형 콘서트와 라이브 공연을 위한 전문 공연장. 공연 연출에 따라 다양한 좌석 배치와 무대 구성이 가능하며, 최신 무대·음향·조명·반입반출 시스템을 갖춰 투어 공연은 물론 대규모 시상식, 방송 행사, 기업 이벤트까지 폭넓게 운영합니다.",
    image: null,
  },
  {
    no: "02",
    title: "중형공연장",
    titleEn: "Medium Hall",
    stat: "약 2,000석 규모",
    desc: "콘서트, 뮤지컬, 팬미팅, 쇼케이스, 기업행사 등 중형 규모 콘텐츠에 적합한 공연장. 관객과 아티스트 간 높은 몰입감을 제공하는 공간으로, 공연 특성에 맞는 유연한 운영이 가능합니다.",
    image: null,
  },
  {
    no: "03",
    title: "컨벤션 시설",
    titleEn: "Convention",
    stat: "MICE 복합 운영",
    desc: "회의, 전시, 세미나, 브랜드 행사, 기업 프로모션 등 다양한 MICE 행사를 운영할 수 있는 공간. 공연과 연계한 기자간담회, VIP 리셉션, 팬 이벤트 등 복합 프로그램 운영에도 활용할 수 있습니다.",
    image: null,
  },
];

const FEATURES = [
  "메인 아레나·중형공연장·컨벤션으로 구성된 복합 문화시설",
  "공연 규모와 행사 목적에 따른 다양한 공간 선택 가능",
  "공연 및 행사 간 연계 운영 가능",
  "공연 제작과 관객 동선을 고려한 시설 구성",
  "최신 공연 운영 환경을 고려한 전문 공연 인프라",
];

const SPECS = [
  {
    name: "메인 아레나",
    rows: [
      ["공연장 형태", "실내 아레나"],
      ["최대 수용인원", "약 20,000석"],
      ["공연 가능 형태", "콘서트, 시상식, 팬미팅, 방송행사, 기업행사 등"],
      ["좌석 운영", "공연 형태에 따라 가변 운영"],
      ["무대 구성", "공연 연출에 따른 다양한 무대 구성 가능"],
      ["반입·반출", "대형 공연 제작을 위한 전용 Loading Dock 및 반입·반출 시스템 운영"],
      ["운영 공간", "FOH 및 BOH 운영시설 제공"],
    ],
  },
  {
    name: "중형공연장",
    rows: [
      ["공연장 형태", "실내 공연장"],
      ["최대 수용인원", "약 2,000석"],
      ["공연 가능 형태", "콘서트, 팬미팅, 쇼케이스, 뮤지컬, 기업행사 등"],
      ["좌석 운영", "공연 특성에 따라 운영 가능"],
      ["무대 구성", "다양한 공연 형태에 대응 가능한 무대 운영"],
      ["운영 공간", "FOH 및 BOH 운영시설 제공"],
    ],
  },
];

const PROVIDED_FACILITIES = [
  "공연 무대 시스템",
  "공연 조명 시스템",
  "공연 음향 시스템",
  "Rigging 및 기계설비",
  "Loading Dock",
  "Freight Elevator",
  "Production Office",
  "Dressing Room",
  "Green Room",
  "FOH Control Position",
  "전력 및 통신 인프라",
  "운영지원 공간",
];

const ARENA_AMENITIES = [
  { name: "프로덕션 오피스 (Production Office)", desc: "공연 제작 및 운영 스태프 업무공간" },
  { name: "대기실 (Dressing Room)", desc: "출연진 분장 및 대기 공간 (수량: 추후 확정 예정)" },
  { name: "그린룸 (Green Room)", desc: "출연진 휴게 공간 (수량: 추후 확정 예정)" },
  { name: "샤워실 (Shower Room)", desc: "총 18개소 (공용 12개소, 대기실 내부 6개소)" },
  { name: "의무실 (Medical Room)", desc: "최대 3개소 운영 가능" },
  { name: "하역장 (Loading Dock)", desc: "대형 공연장비 반입·반출 전용" },
  { name: "화물용 엘리베이터 (Freight Elevator)", desc: "공연 장비 운반 전용" },
  { name: "FOH 컨트롤 포지션", desc: "음향·조명·영상 운영 공간" },
  { name: "관계자 주차 (Production Parking)", desc: "최대 200대 제공 (패키지별 상이)" },
  { name: "대형·중형버스 주차", desc: "대형버스 최대 7대 / 중형버스 최대 5대" },
  { name: "휠체어석", desc: "20석 (동반석 20석 별도)" },
  { name: "화장실 및 장애인 화장실", desc: "전층 운영" },
  { name: "운영지원 공간 (BOH Support Area)", desc: null },
];

const MEDIUM_HALL_AMENITIES = [
  { name: "프로덕션 오피스 (Production Office)", desc: null },
  { name: "대기실 (Dressing Room)", desc: "수량 추후 확정 예정" },
  { name: "그린룸 (Green Room)", desc: "수량 추후 확정 예정" },
  { name: "의무실 (Medical Room)", desc: "2개소" },
  { name: "하역장 (Loading Dock)", desc: "공연 장비 반입·반출 전용" },
  { name: "화물용 엘리베이터 (Freight Elevator)", desc: null },
  { name: "FOH 컨트롤 포지션", desc: null },
  { name: "관계자 주차 (Production Parking)", desc: "제공 대수 추후 확정 예정" },
  { name: "휠체어석", desc: "총 20석 (1층 6석, 2층 14석 / 동반석 별도)" },
  { name: "화장실 및 장애인 화장실", desc: "전층 운영" },
  { name: "운영지원 공간 (BOH Support Area)", desc: null },
];

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 first:border-t-0 first:pt-0">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

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

export default async function VenuePage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
          THE VENUE
        </p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">
          서울아레나 소개
        </h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          서울아레나는 <strong className="font-semibold text-foreground">대한민국 최초의 K-POP 전문 아레나</strong>입니다.
          공연 제작과 관객 경험을 중심으로 설계된 메인 아레나와 중형공연장,
          컨벤션 시설을 하나의 복합 문화공간으로 운영하며, 공연·전시·컨벤션·기업행사
          등 다양한 형태의 이벤트를 개최할 수 있습니다. 국내외 공연기획사와
          아티스트에게 안정적인 공연 환경을, 관객에게는 수준 높은 문화 경험을
          제공하는 것을 목표로 합니다.
        </p>

        <Section id="overview" title="시설 개요">
          <p className="text-[13.5px] leading-7 text-muted">
            서울아레나는 <strong className="font-semibold text-accent">메인 아레나·중형공연장·컨벤션</strong>으로
            구성된 복합 공연문화시설입니다. 공연의 규모와 목적에 따라 다양한
            공간을 선택하여 운영할 수 있으며, 각 시설은 독립적인 운영은 물론
            행사 특성에 따라 연계 사용도 가능합니다.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {HALLS.map((h) => (
              <div key={h.title}>
                <ImagePlaceholder src={h.image} alt={h.title} />
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold text-border">{h.no}</span>
                  <span className="text-[13.5px] font-semibold">{h.title}</span>
                  <span className="text-[11px] text-muted">{h.titleEn}</span>
                </div>
                <div className="mt-1 text-[12.5px] font-semibold text-accent">{h.stat}</div>
                <p className="mt-2 text-[12.5px] leading-6 text-muted">{h.desc}</p>
              </div>
            ))}
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] text-muted sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-accent">·</span>
                {f}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="specs" title="아레나 / 중형공연장 시설 제원">
          <p className="text-[13.5px] leading-7 text-muted">
            공연 규모와 목적에 따라 적합한 공연장을 선택하여 운영할 수 있습니다.
            상세 기술자료는 Technical Package를 통해 확인하실 수 있습니다.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-10 sm:grid-cols-2">
            {SPECS.map((s) => (
              <div key={s.name}>
                <div className="text-[14px] font-semibold text-accent">{s.name}</div>
                <dl className="mt-3 divide-y divide-border/60">
                  {s.rows.map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-0.5 py-2.5 text-[13px] sm:flex-row sm:gap-4">
                      <dt className="shrink-0 text-muted sm:w-24">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <div className="text-[13px] font-semibold">주요 제공 시설</div>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px] text-muted sm:grid-cols-3">
              {PROVIDED_FACILITIES.map((f) => (
                <li key={f} className="flex gap-1.5">
                  <span className="text-accent">·</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex items-center justify-between border border-dashed border-border px-4 py-3 text-[12.5px] text-muted">
            <span>기술자료 (아레나·중형공연장 무대 장비/인프라 리스트)</span>
            <span className="rounded bg-panel-strong px-2 py-1 text-[11px] font-medium">
              자료 준비 중
            </span>
          </div>
        </Section>

        <Section id="amenities" title="부대 시설">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <div className="text-[13.5px] font-semibold text-accent">아레나 부대시설</div>
              <ul className="mt-3 divide-y divide-border/50">
                {ARENA_AMENITIES.map((f) => (
                  <li key={f.name} className="py-2.5 text-[12.5px]">
                    <div className="font-semibold">{f.name}</div>
                    {f.desc && <div className="mt-0.5 text-muted">{f.desc}</div>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[13.5px] font-semibold text-accent">중형공연장 부대시설</div>
              <ul className="mt-3 divide-y divide-border/50">
                {MEDIUM_HALL_AMENITIES.map((f) => (
                  <li key={f.name} className="py-2.5 text-[12.5px]">
                    <div className="font-semibold">{f.name}</div>
                    {f.desc && <div className="mt-0.5 text-muted">{f.desc}</div>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-muted">
            ※ 시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.
          </p>
        </Section>
      </main>
    </div>
  );
}
