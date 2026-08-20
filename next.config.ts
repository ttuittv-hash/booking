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
      { source: "/mypage", destination: "/mypage/process", permanent: true },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // 업로드 파일 등을 브라우저가 다른 MIME으로 추측 실행하지 못하게 한다
          { key: "X-Content-Type-Options", value: "nosniff" },
          // 클릭재킹 방지 — 이 사이트는 iframe에 embed될 일이 없다
          { key: "X-Frame-Options", value: "DENY" },
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
