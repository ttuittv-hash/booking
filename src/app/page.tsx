import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getHomeContent } from "@/lib/db";
import { PublicHeader } from "@/components/PublicHeader";

const FEATURES = [
  {
    title: "K-컬처 × 첨단기술",
    desc: "한국의 대중문화와 AR·VR·AI를 결합한 몰입형 문화 공간입니다.",
    href: "/venue#stage-features",
  },
  {
    title: "글로벌 문화 허브",
    desc: "전 세계 관광객과 팬을 잇는 글로벌 문화 명소로 도약합니다.",
    href: "/venue",
  },
  {
    title: "몰입형 시청각 인프라",
    desc: "글로벌 스탠다드 이상의 사운드와 무대 연출 환경을 갖췄습니다.",
    href: "/venue#specs",
  },
  {
    title: "지역사회와의 상생",
    desc: "도봉·노원 지역과 함께 성장하는 문화 허브가 됩니다.",
    href: "/venue",
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
  const { heroImage } = getHomeContent();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col">
        {/* 슬롯 1: 카피 + 버튼 + 이미지 */}
        <section className="px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-24">
          <div className="flex animate-[fade-up_0.7s_ease_both] items-center justify-center gap-3">
            <span className="h-px w-8 bg-accent" />
            <span className="text-[13px] font-semibold uppercase tracking-[0.2em] text-accent">HOST IT.</span>
            <span className="h-px w-8 bg-accent" />
          </div>

          <h1 className="mx-auto mt-7 max-w-2xl animate-[fade-up_0.7s_ease_both] text-4xl font-semibold tracking-tight text-foreground [animation-delay:80ms] sm:text-5xl">
            한계 없는 무대,
            <br />
            당신의 상상력대로.
          </h1>

          <p className="mx-auto mt-7 max-w-xl animate-[fade-up_0.7s_ease_both] text-[16px] leading-8 text-muted [animation-delay:160ms] sm:text-[17px]">
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
              className="group inline-flex items-center gap-1.5 whitespace-nowrap text-[14px] font-semibold uppercase tracking-[0.06em] text-foreground transition-colors hover:text-accent"
            >
              About Seoul Arena
              <svg
                aria-hidden
                viewBox="0 0 16 16"
                fill="none"
                className="h-3 w-3 shrink-0 transition-transform group-hover:translate-x-1"
              >
                <path
                  d="M5.5 3L10.5 8L5.5 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </div>

          {heroImage && (
            <div className="mx-auto mt-16 max-w-5xl animate-[fade-up_0.7s_ease_both] [animation-delay:320ms]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImage}
                alt="서울아레나"
                className="aspect-video w-full rounded-lg border border-border object-cover shadow-[0_24px_48px_-24px_rgba(0,0,0,0.25)]"
              />
            </div>
          )}
        </section>

        {/* 미션 / 비전 */}
        <section className="border-t border-border/70 px-6 py-20 sm:py-24">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-14 lg:grid-cols-[1fr_1px_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">MISSION</p>
              <p className="mt-5 text-[17px] font-semibold leading-8 text-foreground">
                K-컬처와 첨단 기술을 융합해 새로운 경험을 창조하고, 지역과 세계를
                연결하는 혁신적인 복합 문화 공간을 제공합니다.
              </p>
            </div>
            <div className="hidden bg-border/70 lg:block" aria-hidden />
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-accent">VISION</p>
              <p className="mt-5 text-[17px] font-semibold leading-8 text-foreground">
                글로벌 문화 중심지로 자리매김하여, 예술과 기술, 지역과 세계를
                연결하는 가장 혁신적이고 미래지향적인 복합 문화 공간이 됩니다.
              </p>
            </div>
          </div>
        </section>

        {/* 슬롯 2: 특징 버튼 */}
        <section className="border-t border-border/70 px-6 py-16 sm:py-20">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group block rounded border border-border bg-background p-6 text-left transition-all hover:-translate-y-1 hover:border-accent hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.25)]"
              >
                <span className="text-[14.5px] font-semibold">{f.title}</span>
                <p className="mt-2 text-[12.5px] leading-6 text-muted">{f.desc}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* 슬롯 3: 신청 절차 */}
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
