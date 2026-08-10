import { redirect } from "next/navigation";
import { getCurrentUser, isMasterAdmin } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { AddAdminForm } from "@/components/admin/AddAdminForm";
import { AdminTierControl, TierBadge } from "@/components/admin/AdminTierControl";
import { PromoteUserForm } from "@/components/admin/PromoteUserForm";
import {
  PAGE_LEAD,
  PAGE_TITLE,
  TABLE,
  TABLE_CARD,
  TABLE_HEAD,
  TABLE_HEAD_DESC,
  TABLE_HEAD_TITLE,
  TABLE_SCROLL,
  TD,
  TD_ID,
  TD_MUTED,
  TD_NUM,
  TH,
  TH_NUM,
  THEAD_ROW,
  TR,
} from "@/components/admin/adminUi";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const admins = listUsers({ role: "ADMIN" });
  const master = isMasterAdmin(user);

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/users" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>운영자 계정 관리</h1>
          <p className={PAGE_LEAD}>
            이 화면에서 생성한 계정은 일반관리자로 시작하며, 신청 심사·계약·정산·요금표 관리에
            접근할 수 있습니다. 프로 관리자·마스터 관리자 승급은 마스터 관리자만 할 수 있습니다.
          </p>
        </header>

        <div className={`mt-8 ${TABLE_CARD}`}>
          <div className={TABLE_HEAD}>
            <div>
              <p className={TABLE_HEAD_TITLE}>운영자 계정 ({admins.length})</p>
              <p className={TABLE_HEAD_DESC}>백오피스에 접근할 수 있는 전체 계정입니다.</p>
            </div>
          </div>
          <div className={TABLE_SCROLL}>
            <table className={TABLE}>
              <thead>
                <tr className={THEAD_ROW}>
                  <th className={TH}>이름</th>
                  <th className={TH}>이메일</th>
                  <th className={TH_NUM}>가입일</th>
                  <th className={TH_NUM}>등급</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => (
                  <tr key={a.id} className={TR}>
                    <td className={TD_ID}>
                      {a.name}{" "}
                      {a.id === user.id && <span className="font-normal text-muted">(나)</span>}
                    </td>
                    <td className={TD_MUTED}>{a.email}</td>
                    <td className={`${TD_NUM} text-muted`}>
                      {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className={TD}>
                      <div className="flex justify-end">
                        {master ? (
                          <AdminTierControl userId={a.id} tier={a.adminTier ?? "BASIC"} />
                        ) : (
                          <TierBadge tier={a.adminTier ?? "BASIC"} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {master && (
          <div className="mt-8">
            <PromoteUserForm />
          </div>
        )}

        <div className="mt-8">
          <AddAdminForm />
        </div>
      </main>
    </div>
  );
}
