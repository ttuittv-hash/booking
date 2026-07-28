import Link from "next/link";
import type { Metadata } from "next";
import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "대관 견적·신청 | 서울아레나",
};

export default function ApplyPage() {
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
        </div>
      </header>
      <WizardShell />
    </div>
  );
}
