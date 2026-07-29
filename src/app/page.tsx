import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

const MARQUEE_ITEMS = [
  "SEOUL K-POP ARENA",
  "MAIN ARENA · MEDIUM HALL · CONVENTION",
  "최대 약 20,000명 수용",
  "글로벌 TOP 수준 음향 인프라",
  "제작비 30% 절감",
];

const HIGHLIGHTS = [
  {
    no: "01",
    title: "몰입형 시청각 인프라",
    desc: "전 좌석 동일한 최고 품질의 사운드와 최단 시야거리를 구현합니다.",
  },
  {
    no: "02",
    title: "제작비 30% 절감",
    desc: "최첨단 리깅·전력 인프라로 초대형 규모의 연출도 효율적으로 지원합니다.",
  },
  {
    no: "03",
    title: "최대 약 20,000명",
    desc: "메인 아레나·중형공연장·컨벤션을 하나의 복합 공간으로 운영합니다.",
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
        <section className="relative isolate overflow-hidden px-6 pt-24 pb-20 text-center sm:pt-32 sm:pb-24">
          <div className="hero-grid pointer-events-none absolute inset-0 -z-20" aria-hidden />
          <div
            className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-accent-soft/80 blur-[110px]"
            aria-hidden
          />

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
            서울아레나는 베뉴를 넘어, 물리적 제약 없이 상상력을 현실로
            구현하는 캔버스입니다. 세계 최고 수준의 음향·리깅·무대 시스템이
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

        <section className="relative overflow-hidden border-y border-border/70 bg-panel/50 py-3.5">
          <div className="flex w-max animate-[marquee_32s_linear_infinite] gap-12 whitespace-nowrap">
            {[0, 1].map((dup) =>
              MARQUEE_ITEMS.map((item, i) => (
                <span
                  key={`${dup}-${i}`}
                  className="flex items-center gap-12 text-[12px] font-semibold uppercase tracking-[0.18em] text-muted"
                >
                  {item}
                  <span className="text-accent">✦</span>
                </span>
              )),
            )}
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {HIGHLIGHTS.map((h) => (
              <div
                key={h.no}
                className="group rounded border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:border-accent hover:shadow-[0_16px_32px_-20px_rgba(0,0,0,0.25)]"
              >
                <div className="text-[13px] font-semibold tabular-nums text-accent">{h.no}</div>
                <div className="mt-3 text-[16px] font-semibold">{h.title}</div>
                <p className="mt-2 text-[13px] leading-6 text-muted">{h.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-20 border-t border-border/70 pt-16 sm:mt-24 sm:pt-20">
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
        </div>
      </main>

      <footer className="border-t border-border/70 px-6 py-8 text-center text-[12px] text-muted">
        © 서울아레나. 모든 금액은 부가세 별도이며, 표시 금액은 확정 전
        예상치입니다.
      </footer>
    </div>
  );
}
