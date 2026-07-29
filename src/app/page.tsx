import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/" currentUser={user} />

      <main className="flex flex-1 flex-col items-center px-6 py-20 text-center sm:py-24">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
          HOST IT.
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          한계 없는 무대,
          <br />
          당신의 상상력대로.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-8 text-muted">
          서울아레나는 베뉴를 넘어, 물리적 제약 없이 상상력을 현실로
          구현하는 캔버스입니다. 세계 최고 수준의 음향·리깅·무대 시스템이
          당신의 비전을 가장 온전하게 담아냅니다.
        </p>

        <Link
          href="/apply"
          className="mt-10 rounded-sm bg-accent px-9 py-3.5 text-[15.5px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,113,227,0.55)] transition-colors hover:bg-accent-hover"
        >
          대관 신청하기 →
        </Link>

        <div className="mt-20 w-full max-w-5xl border-t border-border/70 pt-16 sm:mt-24 sm:pt-20">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent">
            APPLICATION PROCESS
          </p>
          <h2 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[26px]">
            신청 절차는 단 3단계입니다
          </h2>

          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded border border-border bg-border text-left sm:grid-cols-3">
            {[
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
                title: "신청서 제출로 절차 시작",
                desc: "제출한 신청서는 운영자 심사를 거쳐 계약과 정산으로 이어집니다.",
              },
            ].map((s) => (
              <div key={s.no} className="bg-background p-7">
                <div className="text-[26px] font-semibold tabular-nums text-border">
                  {s.no}
                </div>
                <div className="mt-3 text-[15px] font-semibold">{s.title}</div>
                <p className="mt-2 text-[13px] leading-6 text-muted">{s.desc}</p>
              </div>
            ))}
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
