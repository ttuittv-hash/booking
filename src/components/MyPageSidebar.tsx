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
    <aside className="w-full shrink-0 sm:w-44">
      <nav className="flex flex-col gap-y-5">
        {SECTIONS.map((section) => {
          const sectionActive =
            active === section.href || section.children?.some((c) => c.href === active);
          return (
            <div key={section.href}>
              <Link
                href={section.href}
                className={`block whitespace-nowrap text-[13.5px] font-medium ${
                  sectionActive ? "text-accent" : "text-foreground hover:text-accent"
                }`}
              >
                {section.label}
              </Link>
              {section.children && (
                <ul className="mt-2 space-y-1.5 border-l border-border pl-3 sm:mt-2.5">
                  {section.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className={`block whitespace-nowrap text-[12.5px] ${
                          active === child.href
                            ? "font-medium text-accent"
                            : "text-muted hover:text-foreground"
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
