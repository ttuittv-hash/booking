import type { Metadata } from "next";
import { AnalyticsBeacon } from "@/components/AnalyticsBeacon";
import { ToastProvider } from "@/components/ui/Toast";
import { DialogProvider } from "@/components/ui/Dialog";
import "./globals.css";

// 모든 페이지가 PostgreSQL에서 데이터를 읽으므로 빌드 시점 정적 프리렌더링을 끈다 —
// 빌드 머신에서 DB에 접속할 수 없어도 빌드가 성공하고, 콘텐츠는 항상 요청 시점에 조회된다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SEOUL ARENA | 대관 견적·신청",
  description:
    "한계 없는 인프라 위에서 당신만의 무대를 지휘하세요. 서울아레나 대관 절차·견적 산출·신청 시스템.",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {/* 리포트의 페이지뷰·UV·대관신청 클릭수를 모으는 비콘. 아무것도 그리지 않는다. */}
        <AnalyticsBeacon />
        {/* 입력 오류·안내는 토스트로 띄운다 — 화면 어디를 보고 있든 눈에 들어온다. */}
        <ToastProvider>
          {/* 확인·알림·입력은 브라우저 기본 대화상자 대신 우리 팝업으로(useDialog). */}
          <DialogProvider>{children}</DialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
