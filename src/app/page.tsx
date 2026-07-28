import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-[15px] font-semibold tracking-tight">
            SEOUL ARENA
          </span>
          <nav className="flex items-center gap-6 text-[13px] text-muted">
            <Link href="/apply" className="hover:text-foreground">
              대관 견적·신청
            </Link>
            {user?.role === "ADMIN" ? (
              <Link href="/admin" className="hover:text-foreground">
                운영자 백오피스
              </Link>
            ) : user ? (
              <Link href="/mypage" className="hover:text-foreground">
                내 신청 내역
              </Link>
            ) : (
              <Link href="/login" className="hover:text-foreground">
                로그인
              </Link>
            )}
            {user && <LogoutButton className="hover:text-foreground" />}
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-28 text-center">
        <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
          정찰제 대관 견적 시스템
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          규모를 고르면,
          <br />
          견적은 바로 나옵니다.
        </h1>
        <p className="mt-6 max-w-xl text-[17px] leading-8 text-muted">
          관객 규모로 패키지를 선택하고 대관 주차를 정하면 기본 대관료가
          즉시 확정됩니다. 초과분과 추가 옵션만 별도로 계산해 드립니다.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/apply"
            className="rounded-full bg-accent px-7 py-3 text-[15px] font-medium text-white transition-colors hover:bg-accent-hover"
          >
            견적 산출 시작하기
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border px-7 py-3 text-[15px] font-medium text-foreground transition-colors hover:bg-panel"
          >
            운영자 로그인
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
              className="rounded-2xl border border-border bg-panel/60 p-6"
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
