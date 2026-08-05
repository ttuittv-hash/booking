import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { Label } from "@/components/ui/kit";
import { AdminNav } from "@/components/admin/AdminNav";
import { AddAdminForm } from "@/components/admin/AddAdminForm";
import {
  PAGE_LEAD,
  PAGE_TITLE,
  TABLE,
  TABLE_WRAP,
  TD,
  TH,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const admins = listUsers({ role: "ADMIN" });

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/users" />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <Label className="mb-3 text-muted">Admins</Label>
          <h1 className={PAGE_TITLE}>운영자 계정 관리</h1>
          <p className={PAGE_LEAD}>
            이 화면에서 생성한 계정은 모두 운영자(ADMIN) 권한을 가지며, 신청 심사·계약·정산·요금표
            관리에 접근할 수 있습니다.
          </p>
        </header>

        <div className={`mt-8 ${TABLE_WRAP}`}>
          <table className={TABLE}>
            <thead>
              <tr className={THEAD_ROW}>
                <th className={TH}>이름</th>
                <th className={TH}>이메일</th>
                <th className={TH}>가입일</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className={TR}>
                  <td className={`${TD} font-bold`}>
                    {a.name} {a.id === user.id && <span className="font-normal text-muted">(나)</span>}
                  </td>
                  <td className={`${TD} text-muted`}>{a.email}</td>
                  <td className={`${TD} tabular-nums text-muted`}>
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
