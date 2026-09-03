import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 2026-08 정보구조 재구성으로 없어지거나 옮겨진 경로.
   * 북마크·검색 유입·외부 공유 링크가 죽지 않도록 영구 리다이렉트한다.
   */
  async redirects() {
    return [
      // YOUR STAGE — 4페이지를 서울아레나 / 시설 소개 2페이지로 통합
      { source: "/venue", destination: "/seoularena", permanent: true },
      { source: "/venue/stage-features", destination: "/seoularena?tab=features", permanent: true },
      { source: "/venue/specs", destination: "/features", permanent: true },
      { source: "/venue/amenities", destination: "/features", permanent: true },
      // BOOK IT
      { source: "/packages", destination: "/rates", permanent: true },
      { source: "/guide/forms", destination: "/documents", permanent: true },
      { source: "/guide/image-guide", destination: "/documents", permanent: true },
      { source: "/guide/connected-live", destination: "/guide", permanent: true },
      { source: "/library", destination: "/documents", permanent: true },
      // HOST IT — 내 신청 내역이 신청 현황 / 진행 내역으로 갈렸다
      // 마이페이지는 개발 정본의 구조(진행 내역 · 티켓오픈 · 시설회의 · 정산)를 따른다.
      // 앞서 쓰던 두 경로는 그 안으로 흡수됐다.
      { source: "/mypage/process", destination: "/mypage", permanent: true },
      { source: "/mypage/history", destination: "/mypage", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 업로드 파일 등을 브라우저가 다른 MIME으로 추측 실행하지 못하게 한다
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 클릭재킹 방지 — 남의 사이트에 우리 화면을 끼워 넣지 못하게 한다.
          // [수정 2026-09-03] DENY 는 **같은 출처의 iframe 도** 막는다. 운영자 화면의
          // 「신청 내역 레이어로 보기」가 우리 화면을 그대로 띄우는데, 그것까지 빈 칸이
          // 됐다. SAMEORIGIN 이면 외부 삽입은 그대로 막으면서 우리 화면끼리는 된다.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HTTPS 강제 (Render는 TLS 종단을 제공한다)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
