import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "이용약관 | 서울아레나",
};

export default async function TermsPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/terms" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">TERMS</p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-tight sm:text-[32px]">이용약관</h1>
        <p className="mt-4 text-[12.5px] text-muted">시행일: 2026년 8월 1일</p>

        <div className="mt-10 space-y-8 text-[13.5px] leading-7 text-muted">
          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제1조 (목적)</h2>
            <p className="mt-2">
              이 약관은 서울아레나(이하 &ldquo;회사&rdquo;)가 제공하는 대관시스템(이하
              &ldquo;서비스&rdquo;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및
              책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제2조 (정의)</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>&ldquo;서비스&rdquo;란 회사가 운영하는 서울아레나 대관 신청·심사·계약·정산 온라인 시스템을 말합니다.</li>
              <li>&ldquo;이용자&rdquo;란 이 약관에 따라 서비스를 이용하는 회원(신청자) 및 운영자를 말합니다.</li>
              <li>&ldquo;대관사&rdquo;란 공연·행사 목적으로 서울아레나 시설의 대관을 신청하는 법인 또는 개인 이용자를 말합니다.</li>
              <li>&ldquo;신청서&rdquo;란 대관사가 서비스를 통해 제출하는 대관 신청 내역 및 예상 견적을 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제3조 (약관의 효력 및 변경)</h2>
            <p className="mt-2">
              이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력을
              발생합니다. 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며,
              변경된 약관은 적용일자 및 변경사유를 명시하여 시행일 7일 전부터 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제4조 (회원가입)</h2>
            <p className="mt-2">
              이용자는 회사가 정한 절차에 따라 회원가입을 신청하며, 회사는 신청자(대관사) 계정에
              대해 운영자 승인 절차를 거쳐 서비스 이용을 허가합니다. 법인회원은 사업자등록번호
              등 실제 정보를 정확히 기재하여야 하며, 허위 정보 기재로 발생하는 불이익은 이용자
              본인이 부담합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제5조 (회원의 의무)</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>회원은 관계 법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
              <li>회원은 계정 정보(이메일, 비밀번호 등)를 제3자에게 양도·대여할 수 없으며, 계정 관리 소홀로 인한 책임은 회원 본인에게 있습니다.</li>
              <li>대관 신청 시 공연 내용, 일정, 관객 규모 등 정보를 사실에 근거하여 정확하게 기재하여야 합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제6조 (대관 신청 및 계약)</h2>
            <p className="mt-2">
              서비스를 통해 제출된 신청서의 견적금액은 예상금액이며, 회사의 심사 및 계약 체결
              절차를 거쳐야 최종 확정됩니다. 회사는 공연 내용, 일정, 시설 적합성 등을 종합적으로
              검토하여 대관 승인 여부를 결정할 수 있으며, 승인되지 않은 신청에 대해서는 계약이
              체결되지 않습니다. 계약 체결 이후의 세부 조건은 별도의 대관계약서에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제7조 (요금 및 정산)</h2>
            <p className="mt-2">
              대관료는 서비스에 게시된 요금표를 기준으로 산정되며, 전기·상하수도·냉난방 등
              유틸리티 비용은 실사용량 기준으로 사후 정산됩니다. 계약금 및 정산금 납부 방법과
              일정은 계약서에 별도로 명시됩니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제8조 (서비스의 제공 및 변경·중단)</h2>
            <p className="mt-2">
              회사는 시스템 점검, 설비 장애, 기타 불가피한 사유가 있는 경우 서비스 제공을
              일시적으로 중단할 수 있으며, 이 경우 사전에 공지사항을 통해 안내합니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제9조 (면책조항)</h2>
            <p className="mt-2">
              회사는 천재지변, 불가항력적 사유로 서비스를 제공할 수 없는 경우 책임이 면제됩니다.
              또한 이용자의 귀책사유로 인한 서비스 이용 장애에 대해서는 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">제10조 (분쟁해결)</h2>
            <p className="mt-2">
              이 약관과 관련하여 회사와 이용자 간 분쟁이 발생한 경우, 양 당사자는 원만한 해결을
              위해 성실히 협의하며, 협의가 이루어지지 않을 경우 관련 법령 및 상관례에 따릅니다.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-semibold text-foreground">부칙</h2>
            <p className="mt-2">이 약관은 2026년 8월 1일부터 시행합니다.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
