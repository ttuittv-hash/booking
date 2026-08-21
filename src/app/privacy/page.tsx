import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { Band, PageHeading } from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 서울아레나",
};

/** 조문 1개 — 헤어라인 구분 + 본문 폭 제한 타이포 */
function Clause({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/25 pt-7">
      <h2 className="type-kr-heading text-h6-m sm:text-h6">{title}</h2>
      <div className="mt-4 space-y-3 text-r leading-8 text-muted-strong [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

export default async function PrivacyPage() {
  const currentUser = await getCurrentUser();

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/privacy" currentUser={currentUser} />
      {/* 2뎁스 — items 가 1개라 렌더되지 않는다 */}
      <Breadcrumb items={[{ label: "개인정보처리방침" }]} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading title="개인정보처리방침" lead="시행일 2026년 8월 1일" />
        </Band>

        <Band tone="white" size="md">
          <div className="max-w-3xl">
            <p className="text-m leading-8 text-muted">
              서울아레나(이하 &ldquo;회사&rdquo;)는 이용자의 개인정보를 중요시하며, 「개인정보
              보호법」 등 관련 법령을 준수하고 있습니다. 회사는 개인정보처리방침을 통해 이용자가
              제공하는 개인정보가 어떠한 목적과 방식으로 이용되고 있으며, 개인정보보호를 위해
              어떠한 조치가 취해지고 있는지 알려드립니다.
            </p>

            <div className="mt-10 space-y-8">
              <Clause title="1. 수집하는 개인정보 항목 및 수집 방법">
                <p>회사는 회원가입 및 대관 신청 과정에서 아래와 같은 개인정보를 수집합니다.</p>
                <ul>
                  <li>필수 항목: 이메일 주소, 비밀번호, 담당자명, 휴대폰 번호</li>
                  <li>법인회원 추가 항목: 회사(기획사)명, 사업자등록번호</li>
                  <li>대관 신청 시: 공연 정보, 희망 일정, 예상 관객 수, 첨부서류(사업자등록증, 공연기획서 등)</li>
                  <li>계약·정산 단계: 입금자명, 계좌이체 확인 정보 등 결제 관련 정보</li>
                  <li>자동 수집 항목: 접속 로그, 서비스 이용기록</li>
                </ul>
                <p>
                  개인정보는 회원가입, 대관 신청서 작성, 첨부서류 업로드 시 이용자가 직접 입력하는
                  방식으로 수집됩니다.
                </p>
              </Clause>

              <Clause title="2. 개인정보의 수집 및 이용 목적">
                <ul>
                  <li>회원 가입 의사 확인, 본인 확인, 회원자격 관리(승인/거절 처리 포함)</li>
                  <li>대관 신청·심사·계약·정산 등 대관시스템 서비스 제공</li>
                  <li>공지사항 전달, 심사 결과 및 처리 상태 등 고지사항 안내</li>
                  <li>서비스 부정이용 방지 및 민원 처리</li>
                </ul>
              </Clause>

              <Clause title="3. 개인정보의 보유 및 이용 기간">
                <p>
                  회사는 원칙적으로 개인정보 수집·이용 목적이 달성된 후에는 해당 정보를 지체 없이
                  파기합니다. 단, 관계 법령에 따라 보존할 필요가 있는 경우 회사는 아래와 같이 관계
                  법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
                </p>
                <ul>
                  <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)</li>
                  <li>회원 탈퇴 시: 지체 없이 파기 (단, 위 법정 보존 항목 제외)</li>
                </ul>
              </Clause>

              <Clause title="4. 개인정보의 제3자 제공">
                <p>
                  회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 다만, 이용자가
                  사전에 동의한 경우 또는 법령의 규정에 의거한 경우에는 예외로 합니다.
                </p>
              </Clause>

              <Clause title="5. 개인정보처리의 위탁">
                <p>
                  회사는 서비스 제공을 위해 필요한 범위 내에서 서버 호스팅 등 일부 업무를 외부
                  업체에 위탁할 수 있으며, 위탁계약 시 개인정보가 안전하게 관리될 수 있도록 필요한
                  사항을 규정합니다.
                </p>
              </Clause>

              <Clause title="6. 정보주체의 권리·의무 및 행사방법">
                <p>
                  이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며,
                  가입 해지(회원탈퇴)를 요청할 수 있습니다. 개인정보 조회, 수정, 삭제를 원하시는
                  경우 운영자에게 문의해주시기 바랍니다.
                </p>
              </Clause>

              <Clause title="7. 개인정보의 안전성 확보조치">
                <p>
                  회사는 비밀번호 암호화, 접근권한 관리(운영자 승인 절차) 등 개인정보를 안전하게
                  관리하기 위한 기술적·관리적 조치를 취하고 있습니다.
                </p>
              </Clause>

              <Clause title="8. 개인정보 보호책임자">
                <p>
                  회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한
                  정보주체의 불만처리 및 피해구제를 위하여 개인정보 보호책임자를 지정하고 있습니다.
                  문의사항은 서비스 내 운영자 연락처를 통해 접수해주시기 바랍니다.
                </p>
              </Clause>

              <Clause title="9. 개인정보처리방침의 변경">
                <p>
                  이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 정책 변경에 따른 내용 추가,
                  삭제 및 수정이 있는 경우 변경사항의 시행 7일 전부터 공지사항을 통해 고지합니다.
                </p>
              </Clause>
            </div>
          </div>
        </Band>
      </main>

      <SiteFooter />
    </div>
  );
}
