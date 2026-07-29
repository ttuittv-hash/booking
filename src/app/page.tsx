import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

const GOALS = [
  {
    no: "01",
    title: "K-컬처의 글로벌 허브",
    desc: "세계 각국의 관광객과 팬을 끌어들이는 글로벌 문화 명소로 도약합니다.",
  },
  {
    no: "02",
    title: "미래 기술과 문화의 융합",
    desc: "AR·VR·메타버스·AI를 접목한 새로운 몰입형 경험을 제공합니다.",
  },
  {
    no: "03",
    title: "지역 경제 및 문화 활성화",
    desc: "도봉구·노원구를 포함한 동북권 지역 사회와 상생합니다.",
  },
  {
    no: "04",
    title: "다양한 콘텐츠 창출",
    desc: "공연·영화·드라마·웹툰 등 다양한 콘텐츠를 기획하고 확장합니다.",
  },
  {
    no: "05",
    title: "온라인-오프라인 통합",
    desc: "실시간 생중계와 메타버스 공연으로 전 세계 팬과 소통을 극대화합니다.",
  },
];

const STRATEGIES = [
  {
    no: "01",
    title: "최고의 몰입 경험 제공",
    desc: "글로벌 스탠다드 이상의 시청각 인프라와 유연한 무대 연출로 프리미엄 문화 체험을 제공합니다.",
  },
  {
    no: "02",
    title: "콘텐츠 다각화와 복합화",
    desc: "공연은 물론 영화·드라마·웹툰과 연계한 복합 콘텐츠로 차별화된 문화 경험을 기획합니다.",
  },
  {
    no: "03",
    title: "미래 기술과의 융합",
    desc: "AR·VR·메타버스를 접목해 온·오프라인 경계 없는 몰입형 공연을 선보입니다.",
  },
  {
    no: "04",
    title: "지역사회와의 상생",
    desc: "도봉·노원 지역 브랜드 및 주민과 함께 성장하는 문화 허브가 됩니다.",
  },
];

const PROCESS_STEPS = [
  {
    no: "01",
    title: "규모에 맞는 패키지 선택",
    desc: "예상 관객 규모를 입력하면 가장 적합한 패키지가 자동으로 추천됩니다.",
  },
  {
    no: "02",
    title: "구성과 예상 대관료 확인",
    desc: "패키지 포함 사항과 추가 옵션을 반영한 예상 대관료를 한눈에 확인합니다.",
  },
  {
    no: "03",
    title: "신청서 제출",
    desc: "입력한 내용으로 대관 신청서를 접수합니다.",
  },
  {
    no: "04",
    title: "심사",
    desc: "운영자가 일정·공연 내용·시설 적합성 등을 종합적으로 검토합니다.",
  },
  {
    no: "05",
    title: "결과 안내",
    desc: "승인·보류·거절 결과를 알림으로 안내해 드립니다.",
  },
];

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        <section className="relative px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-24">
          <div className="flex animate-[fade-up_0.7s_ease_both] items-center justify-center gap-3">
            <span className="h-px w-8 bg-accent" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.2em] text-accent">HOST IT.</span>
            <span className="h-px w-8 bg-accent" />
          </div>

          <h1
            className="mx-auto mt-7 max-w-4xl animate-[fade-up_0.7s_ease_both] text-[42px] font-bold leading-[1.05] tracking-tight text-foreground [animation-delay:80ms] sm:text-[64px] md:text-[78px]"
          >
            한계 없는 무대,
            <br />
            당신의 <span className="text-accent">상상력</span>대로.
          </h1>

          <p
            className="mx-auto mt-7 max-w-xl animate-[fade-up_0.7s_ease_both] text-[16px] leading-8 text-muted [animation-delay:160ms] sm:text-[17px]"
          >
            서울아레나는 K-컬처와 첨단 기술을 융합해 새로운 경험을 창조하는
            복합 문화 공간입니다. 세계 최고 수준의 음향·리깅·무대 시스템이
            당신의 비전을 가장 온전하게 담아냅니다.
          </p>

          <div
            className="mt-10 flex animate-[fade-up_0.7s_ease_both] flex-col items-center justify-center gap-4 [animation-delay:240ms] sm:flex-row sm:gap-7"
          >
            <Link
              href="/apply"
              className="whitespace-nowrap rounded-sm bg-accent px-9 py-3.5 text-[15px] font-semibold uppercase tracking-[0.06em] text-white shadow-[0_8px_24px_-8px_rgba(0,113,227,0.55)] transition-colors hover:bg-accent-hover"
            >
              Apply Now
            </Link>
            <Link
              href="/venue"
              className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] font-medium text-foreground transition-colors hover:text-accent"
            >
              SEOUL ARENA 살펴보기
              <span aria-hidden className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </section>

        <section className="border-t border-border/70 px-6 py-20 sm:py-28">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 lg:grid-cols-[1.3fr_1px_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">MISSION</p>
              <blockquote className="mt-5 text-[21px] font-semibold leading-[1.55] tracking-tight text-foreground sm:text-[25px]">
                <span className="text-accent">“</span>
                K-컬처와 첨단 기술을 융합해 새로운 경험을 창조하고, 지역과
                세계를 연결하는 혁신적인 복합 문화 공간을 제공합니다.
                <span className="text-accent">”</span>
              </blockquote>
              <p className="mt-6 max-w-md text-[13.5px] leading-7 text-muted">
                지역 주민과 전 세계 관객 모두가 혁신적이고 몰입적인 문화
                체험을 할 수 있도록, K-컬처와 첨단 기술을 융합한 복합 예술
                공간을 제공합니다.
              </p>
            </div>
            <div className="hidden bg-border/70 lg:block" aria-hidden />
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">VISION</p>
              <p className="mt-5 text-[16px] font-medium leading-8 text-foreground">
                글로벌 문화 중심지로 자리매김하여, 예술과 기술, 지역과 세계를
                연결하는 가장 혁신적이고 미래지향적인 복합 문화 공간이
                됩니다.
              </p>
              <p className="mt-4 text-[13px] leading-7 text-muted">
                K-팝을 비롯한 한국의 대중문화와 미래형 기술로 세계와
                소통하며, 지역 사회를 활성화하고 글로벌 무대에서 새로운
                문화를 선도합니다.
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">GOALS</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">
              우리가 그리는 서울아레나
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-8 text-left sm:grid-cols-2">
              {GOALS.map((g) => (
                <div key={g.no} className="flex gap-5 border-b border-border/60 pb-8">
                  <span className="text-[13px] font-semibold tabular-nums text-border">{g.no}</span>
                  <div>
                    <div className="text-[14.5px] font-semibold">{g.title}</div>
                    <p className="mt-1.5 text-[13px] leading-6 text-muted">{g.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">STRATEGY</p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">
              서울아레나의 전략
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
              {STRATEGIES.map((s) => (
                <div
                  key={s.no}
                  className="group rounded border border-border bg-background p-6 transition-all hover:-translate-y-1 hover:border-accent hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.25)]"
                >
                  <div className="text-[13px] font-semibold tabular-nums text-accent">{s.no}</div>
                  <div className="mt-3 text-[15px] font-semibold">{s.title}</div>
                  <p className="mt-2 text-[12.5px] leading-6 text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border/70 px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
              APPLICATION PROCESS
            </p>
            <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">
              신청 절차 안내
            </h2>

            <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
              {PROCESS_STEPS.map((s) => (
                <div
                  key={s.no}
                  className="group rounded border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:border-accent hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.25)]"
                >
                  <div className="text-[26px] font-semibold tabular-nums text-border transition-colors group-hover:text-accent">
                    {s.no}
                  </div>
                  <div className="mt-3 text-[15px] font-semibold">{s.title}</div>
                  <p className="mt-2 text-[13px] leading-6 text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/70 px-6 py-8 text-center text-[12px] text-muted">
        © 서울아레나. 모든 금액은 부가세 별도이며, 표시 금액은 확정 전
        예상치입니다.
      </footer>
    </div>
  );
}
