import { isMasterAdmin, requireMasterAdminPage } from "@/lib/auth";
import { listUsers } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";
import { AddAdminForm } from "@/components/admin/AddAdminForm";
import {
  AdminDemoteButton,
  AdminTierControl,
  TierBadge,
} from "@/components/admin/AdminTierControl";
import { MasterTransferForm } from "@/components/admin/MasterTransferForm";
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
  // [신규 2026-09-06] "마스터 관리자: 다 가능하고 계정 권한 변경" — 운영자 계정
  // 관리 자체를 마스터 전용 화면으로 뗀다. 이전엔 아무 운영자나 이 화면을 볼 수
  // 있었고(등급 변경 UI만 마스터로 가려져 있었다), 이제 화면 자체를 막는다.
  const user = await requireMasterAdminPage();

  const admins = await listUsers({ role: "ADMIN" });
  const master = isMasterAdmin(user);
  const transferCandidates = admins
    .filter((a) => a.id !== user.id)
    .map((a) => ({ id: a.id, name: a.name, email: a.email }));

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/users" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>운영자 계정 관리</h1>
          <p className={PAGE_LEAD}>
            이 화면에서 생성한 계정은 일반관리자로 시작하며, 콘텐츠 관리·알림 관리·1:1 문의만
            접근할 수 있습니다. 가입 승인·신청서 심사·대관 자료 접근은 프로 관리자부터,
            운영자 계정 관리(이 화면)와 등급 변경은 마스터 관리자만 할 수 있습니다.
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
                  {/* 운영자 앞 알림톡 수신번호 — 비어 있으면 그 계정은 알림톡을 못 받는다(2026-09-02) */}
                  <th className={TH}>휴대폰 번호</th>
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
                    <td className={a.phone ? TD_MUTED : `${TD} text-warn`}>
                      {a.phone || "미등록"}
                    </td>
                    <td className={`${TD_NUM} text-muted`}>
                      {new Date(a.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className={TD}>
                      <div className="flex items-center justify-end gap-3">
                        {master ? (
                          <>
                            <AdminTierControl userId={a.id} tier={a.adminTier ?? "BASIC"} />
                            {a.id !== user.id && <AdminDemoteButton userId={a.id} name={a.name} />}
                          </>
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

        {master && transferCandidates.length > 0 && (
          <div className="mt-8">
            <MasterTransferForm candidates={transferCandidates} />
          </div>
        )}

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
