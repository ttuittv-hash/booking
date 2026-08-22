import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRateTable, getRatesContent } from "@/lib/db";
import { RatesForm } from "@/components/admin/RatesForm";
import { AdminNav } from "@/components/admin/AdminNav";
import { PAGE_LEAD, PAGE_TITLE } from "@/components/admin/adminUi";

export default async function AdminRatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "ADMIN") redirect("/apply");

  const rateTable = await getCurrentRateTable();

  // 공개 대관료 페이지(/rates)의 표기 금액 — 요금표 입력칸 옆에 나란히 보여 준다.
  // 견적 계산(이 요금표)과 공개 표기(콘텐츠 관리)는 별도 데이터라 자동으로 맞춰지지
  // 않는다. 어긋난 채 운영되면 공개가와 실제 견적이 달라지므로, 여기서 눈으로 잡는다.
  const ratesContent = await getRatesContent();
  const toNumber = (v: string | undefined) => {
    const digits = (v ?? "").replace(/[^0-9]/g, "");
    return digits ? Number(digits) : null;
  };
  const liveHall = ratesContent.liveHall;
  const findCol = (key: string) => liveHall.columns.find((c) => c.key === key);
  const findDetail = (key: string) => liveHall.detailColumns.find((c) => c.key === key);
  const publicMidHall = Object.fromEntries(
    (["setup", "weekday", "weekend"] as const).map((key) => {
      const detail = findDetail(key)?.values ?? [];
      return [
        key,
        {
          total: toNumber(findCol(key)?.values[0]),
          exclusive: toNumber(detail[0]),
          facility: toNumber(detail[1]),
        },
      ];
    }),
  ) as Record<
    "setup" | "weekday" | "weekend",
    { total: number | null; exclusive: number | null; facility: number | null }
  >;

  return (
    <div className="flex flex-1 flex-col">
      <AdminNav active="/admin/rates" user={user} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8 sm:py-10">
        <header className="border-b border-border/20 pb-6">
          <h1 className={PAGE_TITLE}>요금표 관리</h1>
          <p className={PAGE_LEAD}>
            현재 버전: <span className="font-bold tabular-nums text-foreground">{rateTable.version}</span> · 저장하면
            새 버전이 생성되며, 이미 제출된 신청서의 금액에는 영향을 주지 않습니다(재현성 보장).
            패키지별 기본 대관료는 &ldquo;패키지 관리&rdquo;에서 편집하세요. 이 요금표는 대관
            신청의 <b>견적 계산</b>에 쓰입니다 — 공개 대관료 페이지(/rates)의 표는 별도
            콘텐츠로, &ldquo;콘텐츠 관리 &gt; 대관료&rdquo;에서 수정합니다.
          </p>
        </header>

        <RatesForm rateTable={rateTable} publicMidHall={publicMidHall} />
      </main>
    </div>
  );
}
