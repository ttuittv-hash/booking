import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";

export function ApplicantHeader({
  label,
  backHref,
  role = "APPLICANT",
}: {
  label: string;
  backHref?: string;
  role?: "ADMIN" | "APPLICANT";
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight">
          SEOUL ARENA
        </Link>
        {backHref ? (
          <Link
            href={backHref}
            className="shrink-0 whitespace-nowrap text-[13px] text-muted hover:text-foreground"
          >
            {label}
          </Link>
        ) : (
          <span className="shrink-0 whitespace-nowrap rounded-sm border border-border px-2.5 py-1 text-[11px] text-muted">
            {label}
          </span>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-4 text-[13px] text-muted">
          <NotificationBell role={role} />
          <LogoutButton className="whitespace-nowrap hover:text-foreground" />
        </div>
      </div>
    </header>
  );
}
