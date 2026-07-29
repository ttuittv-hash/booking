import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { AddAdminForm } from "@/components/admin/AddAdminForm";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const admins = listUsers({ role: "ADMIN" });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/users" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
        <h1 className="text-[22px] font-semibold">운영자 계정 관리</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-6 text-muted">
          이 화면에서 생성한 계정은 모두 운영자(ADMIN) 권한을 가지며, 신청 심사·계약·정산·요금표
          관리에 접근할 수 있습니다.
        </p>

        <div className="mt-8 overflow-hidden rounded-md border border-border">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-border bg-panel text-left text-[11.5px] font-medium text-muted">
                <th className="px-4 py-3">이름</th>
                <th className="px-4 py-3">이메일</th>
                <th className="px-4 py-3">가입일</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-b border-border/70">
                  <td className="px-4 py-3 font-medium">
                    {a.name} {a.id === user.id && <span className="text-muted">(나)</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{a.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8">
          <AddAdminForm />
        </div>
      </main>
    </div>
  );
}
