import type { Metadata } from "next";

// [신규 2026-09-09] 백오피스는 검색에 잡히면 안 된다 — /admin/* 전체에 noindex 를 건다.
// robots.txt(bo 호스트 전면 차단)만으로는 부족하다: robots.txt 는 "수집하지 말라"는 요청이라
// 외부에 링크가 하나라도 있으면 주소·제목만으로 색인되는 경우가 있다. 메타 태그는 페이지를
// 읽은 뒤 "색인하지 말라"는 지시라 그 경로까지 막는다. 둘 다 둔다.
// partner 호스트로 /admin 을 열면 proxy.ts 가 bo 로 되돌리지만, 그 경우에도 이 레이아웃을 거친다.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
