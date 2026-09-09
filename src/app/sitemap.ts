import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { listNotices } from "@/lib/db";
import { isAdminHost, publicSiteOrigin } from "@/lib/seo";

// sitemap.xml — 로그인 없이 볼 수 있는 안내 페이지만 싣는다(2026-09-09, 검색 등록 요청).
// 로그인 뒤 화면(마이페이지·신청·문의)과 백오피스는 넣지 않는다 — robots.txt 에서도 막는다.
// 공지 상세는 운영자가 올린 만큼 늘어나므로 DB 에서 읽어 붙인다(lastModified = 수정 시각).
const STATIC_PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/seoularena", changeFrequency: "monthly", priority: 0.8 },
  { path: "/features", changeFrequency: "monthly", priority: 0.8 },
  { path: "/guide", changeFrequency: "monthly", priority: 0.8 },
  { path: "/rates", changeFrequency: "weekly", priority: 0.9 },
  { path: "/rules", changeFrequency: "monthly", priority: 0.6 },
  { path: "/documents", changeFrequency: "monthly", priority: 0.6 },
  { path: "/notices", changeFrequency: "daily", priority: 0.9 },
  { path: "/faq", changeFrequency: "monthly", priority: 0.6 },
  { path: "/location", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get("host") ?? "";
  // 백오피스에는 사이트맵을 주지 않는다(robots.txt 도 전면 차단).
  if (isAdminHost(host)) return [];

  const origin = publicSiteOrigin(host);
  const now = new Date();
  const pages: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: `${origin}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  // 공지가 없거나 DB 조회가 실패해도 사이트맵 자체는 나가야 한다.
  try {
    const notices = await listNotices();
    for (const notice of notices) {
      pages.push({
        url: `${origin}/notices/${notice.id}`,
        lastModified: new Date(notice.updatedAt || notice.createdAt),
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("[sitemap] 공지 목록 조회 실패", error);
  }

  return pages;
}
