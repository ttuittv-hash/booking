import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export const metadata: Metadata = {
  title: "오시는길 | 서울아레나",
};

export default async function LocationPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/location" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">LOCATION</p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight sm:text-[32px]">오시는길</h1>
        <p className="mt-4 text-[13.5px] leading-6 text-muted">
          주소 · 대중교통 · 주차 안내는 준비 중입니다. 확정되는 대로 이 페이지에 업데이트됩니다.
        </p>

        <div className="mt-10 space-y-8 text-[13.5px] leading-7 text-muted">
          <section>
            <h2 className="text-[15px] font-semibold text-foreground">주소</h2>
            <p className="mt-2">준비 중</p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold text-foreground">대중교통</h2>
            <p className="mt-2">준비 중</p>
          </section>
          <section>
            <h2 className="text-[15px] font-semibold text-foreground">주차 안내</h2>
            <p className="mt-2">준비 중</p>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
