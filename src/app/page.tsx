import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <span className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
            SEOUL ARENA
          </span>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted">
            <Link href="/apply" className="whitespace-nowrap hover:text-foreground">
              대관 신청하기
            </Link>
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="whitespace-nowrap hover:text-foreground">
                운영자 백오피스
              </Link>
            ) : user ? (
              <Link href="/mypage" className="whitespace-nowrap hover:text-foreground">
                내 신청 내역
              </Link>
            ) : (
              <Link href="/login" className="whitespace-nowrap hover:text-foreground">
                로그인
              </Link>
            )}
            {user && <LogoutButton className="whitespace-nowrap hover:text-foreground" />}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-28 text-center">
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
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/apply"
            className="rounded bg-accent px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            대관 신청하기
          </Link>
        </div>

        <div className="mt-24 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            {
              step: "STEP 1",
              title: "신청 예상금액",
              desc: "패키지 + 선택 옵션을 자동 계산합니다. '예상' 금액임을 명시합니다.",
            },
            {
              step: "STEP 2",
              title: "계약금액",
              desc: "운영자 심사·협의·특약을 반영해 확정합니다.",
            },
            {
              step: "STEP 3",
              title: "최종 정산금액",
              desc: "행사 후 현장 추가·미사용·유틸리티 실사용을 반영합니다.",
            },
          ].map((s) => (
            <div
              key={s.step}
              className="rounded-md border border-border bg-panel/60 p-6"
            >
              <div className="text-[11px] font-semibold tracking-wide text-accent">
                {s.step}
              </div>
              <div className="mt-2 text-[15px] font-semibold">{s.title}</div>
              <p className="mt-2 text-[13px] leading-6 text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border/70 px-6 py-8 text-center text-[12px] text-muted">
        © 서울아레나. 모든 금액은 부가세 별도이며, 표시 금액은 확정 전
        예상치입니다.
      </footer>
    </div>
  );
}
