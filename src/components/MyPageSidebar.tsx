import Link from "next/link";

export type MyPageSection =
  | "/mypage"
  | "/mypage/ticket-open"
  | "/mypage/facility-meeting"
  | "/mypage/settlement"
  | "/mypage/inquiries"
  | "/mypage/profile"
  | "/mypage/withdraw";

const SECTIONS: {
  label: string;
  items: { href: MyPageSection; label: string }[];
}[] = [
  {
    label: "대관 현황",
    items: [
      { href: "/mypage", label: "대관 진행 내역" },
      { href: "/mypage/ticket-open", label: "티켓 오픈 정보" },
      { href: "/mypage/facility-meeting", label: "시설 회의" },
      { href: "/mypage/settlement", label: "정산" },
      { href: "/mypage/inquiries", label: "1:1 문의" },
    ],
  },
  {
    label: "나의 정보",
    items: [
      { href: "/mypage/profile", label: "나의 정보 수정" },
      { href: "/mypage/withdraw", label: "탈퇴" },
    ],
  },
];

export function MyPageSidebar({ active }: { active: MyPageSection }) {
  return (
    <aside className="w-full shrink-0 sm:w-48">
      <nav className="flex flex-col gap-y-4 rounded border border-border bg-panel/40 p-3">
        {SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="px-2.5 text-[15px] font-bold text-foreground">{section.label}</p>
            <ul className="mt-1.5 space-y-0.5 pl-4">
              {section.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-sm px-2.5 py-2 text-[13px] whitespace-nowrap transition-colors ${
                      active === item.href
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-foreground hover:bg-panel"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
