import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { PackagesForm } from "@/components/admin/PackagesForm";

export default async function AdminPackagesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const rateTable = getCurrentRateTable();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/packages" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">패키지 관리</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-muted">
          패키지 구성(객석 규모·매체 등급·기본 포함 항목)을 편집합니다. 요금은 &ldquo;요금표 관리&rdquo;에서 수정하세요.
        </p>

        <PackagesForm rateTable={rateTable} />
      </main>
    </div>
  );
}
