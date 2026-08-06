import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SEOUL ARENA | 대관 견적·신청",
  description:
    "한계 없는 인프라 위에서 당신만의 무대를 지휘하세요. 서울아레나 대관 안내·견적 산출·신청 시스템.",
};

/**
 * 첫 페인트 전에 테마를 확정해 화면이 번쩍이는 것을 막는다.
 * 저장된 선택이 없으면 OS 설정(prefers-color-scheme)을 따른다.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('sa-theme');
if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/*
          Figma Style Guide › Typography
            · Heading Typeface (English) : Archivo 700 / 800
            · Display Typeface (Korean)  : Gothic A1 900
            · Body Typeface (Korean)     : KakaoBig / KakaoSmall
          카카오 큰글씨·작은글씨는 웹폰트 배포본이 없어 셀프호스팅이 필요하다.
          폰트 스택이 "KakaoBig"/"KakaoSmall" 을 먼저 찾으므로 /public/fonts 에 넣고
          @font-face 만 추가하면 그대로 승격된다. 확보 전까지는 Gothic A1 로 폴백.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Gothic+A1:wght@300;400;500;700;800;900&display=swap"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
