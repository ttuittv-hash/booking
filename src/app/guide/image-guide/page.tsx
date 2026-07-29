import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "이미지 가이드 | 서울아레나",
};

export default async function GuideImagePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">STAGE</p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">이미지 가이드</h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          공연 홍보물·로고 사용 등에 필요한 서울아레나 시설 사진과 이미지 사용 가이드를
          이곳에서 확인할 수 있도록 준비 중입니다.
        </p>

        <div className="mt-8 flex items-center justify-between border border-dashed border-border px-4 py-3 text-[12.5px] text-muted">
          <span>시설 이미지 및 사용 가이드</span>
          <span className="rounded bg-panel-strong px-2 py-1 text-[11px] font-medium">자료 준비 중</span>
        </div>

        <Link href="/guide" className="mt-8 inline-block text-[13px] font-medium text-accent hover:underline">
          ← 대관 안내로 돌아가기
        </Link>
      </main>
    </div>
  );
}
