import type { Metadata } from "next";
import { AnalyticsBeacon } from "@/components/AnalyticsBeacon";
import { ToastProvider } from "@/components/ui/Toast";
import { DialogProvider } from "@/components/ui/Dialog";
import "./globals.css";

// 모든 페이지가 PostgreSQL에서 데이터를 읽으므로 빌드 시점 정적 프리렌더링을 끈다 —
// 빌드 머신에서 DB에 접속할 수 없어도 빌드가 성공하고, 콘텐츠는 항상 요청 시점에 조회된다.
export const dynamic = "force-dynamic";

// 브라우저 탭 제목이자 링크를 공유했을 때 미리보기에 뜨는 이름이다.
// [개정 2026-09-02] "대관 견적·신청" 은 기능 설명이라 공유 링크에서 무슨 서비스인지
// 읽히지 않았다. 서비스 이름으로 바꾼다.
export const metadata: Metadata = {
  // template 은 **자식 라우트**의 title 에만 붙는다. 각 페이지는 "대관료" 처럼
  // 제 이름만 적고, 뒤에 붙는 서비스명은 여기서 한 번에 관리한다 — 페이지마다
  // 접미사를 손으로 달던 때는 이름을 바꿔도 한두 곳이 옛 이름으로 남았다.
  title: {
    default: "서울아레나 대관 플랫폼",
    template: "%s | 서울아레나 대관 플랫폼",
  },
  description:
    "한계 없는 인프라 위에서 당신만의 무대를 지휘하세요. 서울아레나 대관 절차·견적 산출·신청 플랫폼.",
  openGraph: {
    title: "서울아레나 대관 플랫폼",
    description:
      "한계 없는 인프라 위에서 당신만의 무대를 지휘하세요. 서울아레나 대관 절차·견적 산출·신청 플랫폼.",
    siteName: "서울아레나 대관 플랫폼",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "서울아레나 대관 플랫폼",
    description:
      "한계 없는 인프라 위에서 당신만의 무대를 지휘하세요. 서울아레나 대관 절차·견적 산출·신청 플랫폼.",
  },
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
