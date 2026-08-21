import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHead, SpecTable } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "오시는길 | 서울아레나",
};

/**
 * 오시는길 — 아직 확정 내용이 없는 자리다. 메뉴에는 올리지 않고,
 * 주소·교통·주차가 확정되면 채운다.
 */
export default async function LocationPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/location" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHead
            en="LOCATION"
            ko="오시는길"
            lead="주소 · 대중교통 · 주차 안내는 준비 중입니다. 확정되는 대로 이 페이지에 업데이트됩니다."
          />
        </Band>

        <Band tone="light">
          <SpecTable
            rows={[
              ["주소", "서울특별시 도봉구 창동 1-24"],
              ["대중교통", "확정 후 안내"],
              ["주차", "확정 후 안내"],
            ]}
          />
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
