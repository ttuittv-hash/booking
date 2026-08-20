import Link from "next/link";

export type MyPageSection =
  | "/mypage"
  | "/mypage/inquiries"
  | "/mypage/profile"
  | "/mypage/withdraw";

const SECTIONS: {
  href: MyPageSection;
  label: string;
  children?: { href: MyPageSection; label: string }[];
}[] = [
  {
    href: "/mypage",
    label: "대관 진행 내역",
    children: [{ href: "/mypage/inquiries", label: "1:1 문의" }],
  },
  {
    href: "/mypage/profile",
    label: "나의 정보 수정",
    children: [{ href: "/mypage/withdraw", label: "회원 탈퇴" }],
  },
];

export function MyPageSidebar({ active }: { active: MyPageSection }) {
  return (
    <aside className="w-full shrink-0 sm:w-48">
      <nav className="flex flex-col gap-y-1 rounded border border-border bg-panel/40 p-3">
        {SECTIONS.map((section) => {
          const sectionActive =
            active === section.href || section.children?.some((c) => c.href === active);
          return (
            <div key={section.href}>
              <Link
                href={section.href}
                className={`block rounded-sm px-2.5 py-2 text-[13.5px] font-medium whitespace-nowrap transition-colors ${
                  sectionActive
                    ? "bg-accent-soft text-accent"
                    : "text-foreground hover:bg-panel"
                }`}
              >
                {section.label}
              </Link>
              {section.children && (
                <ul className="mt-0.5 mb-1">
                  {section.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={`block rounded-sm px-2.5 py-1.5 pl-6 text-[12.5px] whitespace-nowrap transition-colors ${
                          active === child.href
                            ? "font-medium text-accent"
                            : "text-muted hover:bg-panel hover:text-foreground"
                        }`}
                      >
                        {child.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
