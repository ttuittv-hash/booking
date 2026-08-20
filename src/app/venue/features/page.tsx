import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { VenueFeaturesView } from "@/components/venue/VenueSections";

export const metadata: Metadata = {
  title: "무대 특장 | 서울아레나",
};

/**
 * 기존 `/venue/stage-features` 를 개칭한 페이지 (구 경로는 301 리다이렉트).
 * 1차 탭은 공간이고, ARTIST·AUDIENCE·PRODUCER 세 관점은 각 탭 안의 섹션으로 내린다.
 * 3관점을 탭으로 두면 공간 탭과 축이 겹쳐 지금 무엇을 보고 있는지 알 수 없게 된다.
 */
export default async function VenueFeaturesPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/venue/features" currentUser={currentUser} />
      <main className="flex flex-1 flex-col">
        <VenueFeaturesView />
      </main>
      <SiteFooter />
    </div>
  );
}
