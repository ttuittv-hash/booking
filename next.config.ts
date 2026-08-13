import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
