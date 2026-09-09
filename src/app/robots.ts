import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { isAdminHost, publicSiteOrigin } from "@/lib/seo";

// robots.txt — 호스트마다 다르게 준다(2026-09-09, 구글·네이버 검색 등록 요청).
//
//  · bo.seoularena.net(백오피스): 전면 차단. 운영 도구라 색인되면 안 된다. /admin/* 화면에는
//    robots 메타(noindex)도 함께 걸어 두었다(src/app/admin/layout.tsx) — robots.txt 는 "수집하지
//    말라"는 요청일 뿐이라, 외부에 링크가 있으면 주소만으로 색인될 수 있다. 둘 다 필요하다.
//  · partner.seoularena.net(신청자): 안내 페이지만 열고 로그인 뒤 화면·API·인쇄본은 막는다.
//    막는 이유는 보안이 아니라(그쪽은 서버 권한 검사가 한다) 검색 결과에 로그인 화면이나
//    남의 신청서 주소가 뜨는 걸 막기 위해서다.
//
// dev(partner.dev.seoularena.net)도 신청자 규칙을 그대로 쓰되, 아래 isAdminHost 가 아닌 모든
// 비운영 호스트는 색인 자체를 막는다 — 개발본이 검색에 잡히면 운영과 중복 콘텐츠가 된다.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get("host") ?? "";
  const origin = publicSiteOrigin(host);

  if (isAdminHost(host) || !host.endsWith("partner.seoularena.net")) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin",
          "/login",
          "/register",
          "/find-id",
          "/reset-password",
          "/pending",
          "/invite",
          "/mypage",
          "/apply",
          "/print/",
          "/inquiry",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
