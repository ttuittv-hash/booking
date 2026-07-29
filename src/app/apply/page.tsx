import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, listWeekDemand } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 견적·신청 | 서울아레나",
};

export default async function ApplyPage() {
  const [rateTable, currentUser] = await Promise.all([
    getCurrentRateTable(),
    getCurrentUser(),
  ]);
  const weekDemand = listWeekDemand();

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
            SEOUL ARENA
          </Link>
          <span className="shrink-0 whitespace-nowrap rounded border border-border px-2.5 py-1 text-[11px] text-muted">
            대관 견적·신청
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
            {currentUser ? (
              <>
                <span className="hidden whitespace-nowrap sm:inline">{currentUser.name} 님</span>
                <Link href="/mypage" className="whitespace-nowrap hover:text-foreground">
                  내 신청 내역
                </Link>
                <NotificationBell role={currentUser.role} />
                <LogoutButton className="whitespace-nowrap hover:text-foreground" />
              </>
            ) : (
              <>
                <Link href="/login" className="whitespace-nowrap hover:text-foreground">
                  로그인
                </Link>
                <Link href="/register" className="whitespace-nowrap hover:text-foreground">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <WizardShell rateTable={rateTable} currentUser={currentUser} weekDemand={weekDemand} />
    </div>
  );
}
