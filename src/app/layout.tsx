import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEOUL ARENA | 대관 견적·신청",
  description:
    "한계 없는 인프라 위에서 당신만의 무대를 지휘하세요. 서울아레나 대관 안내·견적 산출·신청 시스템.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full">
      <head>
        {/*
          Figma Style Guide › Typography
            · Heading Typeface (English) : Archivo 700 / 800
            · Display Typeface (Korean)  : Gothic A1 900
            · Body Typeface (Korean)     : KakaoBig 400/700/800 · KakaoSmall 300/400/700

          카카오 큰글씨·작은글씨는 웹폰트 배포본이 없어 셀프호스팅이 필요하다.
          globals.css의 폰트 스택이 "KakaoBig"/"KakaoSmall"을 먼저 찾으므로,
          /public/fonts 에 웹폰트를 넣고 @font-face만 추가하면 그대로 승격된다.
          확보 전까지는 브랜드 가이드가 국문 대체로 지정한 Gothic A1로 폴백한다.

          next/font 대신 <link>를 쓰는 이유: 빌드 타임에 폰트 바이너리를 받아오지
          않아 배포 환경의 네트워크 조건에 빌드가 좌우되지 않는다.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Gothic+A1:wght@300;400;500;700;800;900&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
