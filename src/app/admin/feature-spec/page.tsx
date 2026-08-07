import { redirect } from "next/navigation";
import { getCurrentUser, isMasterAdmin } from "@/lib/auth";
import { getAllFeatureSpecSheets } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { FeatureSpecManager } from "@/components/admin/FeatureSpecManager";

export default async function AdminFeatureSpecPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");
  if (!isMasterAdmin(user)) redirect("/admin");

  const sheets = getAllFeatureSpecSheets();

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/feature-spec" user={user} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">기능정의서</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          내부 기획 문서입니다. 마스터 관리자만 보고 수정할 수 있으며, 수정 내용은 즉시
          서버에 저장되어 다른 마스터 관리자에게도 동일하게 보입니다.
        </p>

        <FeatureSpecManager initialSheets={sheets} />
      </main>
    </div>
  );
}
