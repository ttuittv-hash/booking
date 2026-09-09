import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { AdminPasswordForm } from "@/components/admin/AdminPasswordForm";

export default async function AdminAccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/account" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-bold">계정 설정</h1>
        <p className="mt-2 max-w-2xl text-s leading-6 text-muted">
          {user.name} ({user.email})
        </p>

        <div className="mt-8">
          <AdminPasswordForm />
        </div>
      </main>
    </div>
  );
}
