import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { NewInquiryForm } from "@/components/NewInquiryForm";

export const metadata: Metadata = {
  title: "문의하기 | 서울아레나",
};

export default async function NewInquiryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/inquiries");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/mypage" currentUser={user} />

      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <Link href="/mypage/inquiries" className="text-[12.5px] font-medium text-accent hover:underline">
          ← 1:1 문의
        </Link>

        <h1 className="mt-4 text-[22px] font-semibold">문의하기</h1>

        <NewInquiryForm />
      </main>

      <PublicFooter />
    </div>
  );
}
