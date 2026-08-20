import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * 2026-08 정보구조 재구성으로 없어진 경로.
   * 북마크·검색 유입·외부 공유 링크가 죽지 않도록 영구 리다이렉트한다.
   *   대관 양식함 · 이미지 가이드 → 자료실로 흡수
   *   무대 특장 → `/venue/features` 로 개칭
   */
  async redirects() {
    return [
      { source: "/guide/forms", destination: "/library", permanent: true },
      { source: "/guide/image-guide", destination: "/library", permanent: true },
      { source: "/guide/rules", destination: "/library?doc=rules", permanent: true },
      { source: "/venue/stage-features", destination: "/venue/features", permanent: true },
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
