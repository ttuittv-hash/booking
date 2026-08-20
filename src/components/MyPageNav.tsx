import Link from "next/link";

const TABS = [
  { href: "/mypage", label: "대관 진행 내역" },
  { href: "/mypage/profile", label: "나의 정보 수정" },
] as const;

export function MyPageNav({ active }: { active: "/mypage" | "/mypage/profile" }) {
  return (
    <nav className="flex gap-x-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`px-4 py-2.5 text-[13px] font-medium transition-colors ${
            tab.href === active
              ? "border-b-2 border-accent text-foreground"
              : "text-muted hover:text-foreground"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
