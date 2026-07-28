import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { LogoutButton } from "@/components/LogoutButton";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 견적·신청 | 서울아레나",
};

export default async function ApplyPage() {
  const [rateTable, currentUser] = await Promise.all([
    getCurrentRateTable(),
    getCurrentUser(),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-4">
          <Link href="/" className="text-[15px] font-semibold tracking-tight">
            SEOUL ARENA
          </Link>
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
            대관 견적·신청
          </span>
          <div className="ml-auto flex items-center gap-4 text-[13px] text-muted">
            {currentUser ? (
              <>
                <span>{currentUser.name} 님</span>
                <Link href="/mypage" className="hover:text-foreground">
                  내 신청 내역
                </Link>
                <LogoutButton className="hover:text-foreground" />
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-foreground">
                  로그인
                </Link>
                <Link href="/register" className="hover:text-foreground">
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
      <WizardShell rateTable={rateTable} currentUser={currentUser} />
    </div>
  );
}
