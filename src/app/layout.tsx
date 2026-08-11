import type { Metadata } from "next";
import "./globals.css";

// 모든 페이지가 PostgreSQL에서 데이터를 읽으므로 빌드 시점 정적 프리렌더링을 끈다 —
// 빌드 머신에서 DB에 접속할 수 없어도 빌드가 성공하고, 콘텐츠는 항상 요청 시점에 조회된다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "서울아레나 대관 견적·신청 시스템",
  description: "서울아레나 대관 견적 산출 및 신청 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
