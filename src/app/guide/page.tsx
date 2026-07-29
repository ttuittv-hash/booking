import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";

export const metadata: Metadata = {
  title: "대관 안내 | 서울아레나",
};

const STEPS = [
  { no: "01", title: "회원가입 및 로그인", desc: "대관 신청을 위해서는 대관시스템 회원가입 및 로그인이 필요합니다. 신청자(대관사) 계정은 운영자 승인 후 이용할 수 있습니다." },
  { no: "02", title: "대관안내 확인", desc: "대관규약, 대관료, 대관 가능 일정 및 관련 안내사항을 확인합니다." },
  { no: "03", title: "대관 신청", desc: "공연 정보와 희망 대관일정을 입력하고 필요한 서류를 첨부하여 온라인으로 신청합니다." },
  { no: "04", title: "대관 심사", desc: "신청된 공연의 일정, 공연 내용, 시설 적합성 등을 종합적으로 검토하여 대관 가능 여부를 심사합니다. 필요한 경우 추가 자료 제출을 요청할 수 있습니다." },
  { no: "05", title: "승인 및 계약", desc: "대관 승인이 완료되면 계약을 체결하고 계약금 납부를 진행합니다. 계약이 완료되어야 대관이 확정됩니다." },
  { no: "06", title: "공연 준비", desc: "공연계획서, 기술자료, 운영계획, 홍보물, 안전관리계획 등 공연 운영에 필요한 자료를 제출하고 관계 부서와 협의를 진행합니다." },
  { no: "07", title: "공연 운영", desc: "공연장 반입, 설치, 리허설, 공연 진행 및 철수까지 공연 운영이 진행됩니다." },
  { no: "08", title: "사후 정산", desc: "추가 사용료 및 부대시설 이용료 등을 포함하여 최종 정산을 진행하며, 정산 완료 후 대관 절차가 종료됩니다." },
];

const NOTICES = [
  "공연 일정 및 제출기한은 계약 조건에 따라 달라질 수 있습니다.",
  "제출서류가 미비한 경우 심사 또는 공연 준비 일정이 지연될 수 있습니다.",
  "공연 준비 단계에서는 공연사업팀 및 관계 부서와의 협의가 필요합니다.",
  "세부 일정은 대관 담당자의 안내에 따라 진행됩니다.",
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-border py-14 first-of-type:border-t-0 first-of-type:pt-0">
      <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function GuidePage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/guide" currentUser={currentUser} />

      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-accent">
          STAGE
        </p>
        <h1 className="mt-3 text-[30px] font-semibold tracking-tight sm:text-[36px]">
          대관 안내
        </h1>
        <p className="mt-6 max-w-3xl text-[15px] leading-8 text-muted">
          서울아레나의 대관은 대관 신청부터 계약, 공연 준비, 공연 운영, 사후
          정산까지 단계별 절차에 따라 진행됩니다. 원활한 공연 준비를 위해
          각 단계별 제출서류 및 진행 일정을 반드시 확인하시기 바랍니다.
        </p>

        <Section id="process" title="대관 절차">
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.no} className="flex gap-4 border border-border bg-panel/60 p-5">
                <div className="w-10 shrink-0 text-[15px] font-semibold text-accent">{s.no}</div>
                <div>
                  <div className="text-[13.5px] font-semibold">{s.title}</div>
                  <p className="mt-1.5 text-[12.5px] leading-6 text-muted">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-l-2 border-border bg-panel/60 px-4 py-3.5">
            <div className="text-[12.5px] font-medium">유의사항</div>
            <ul className="mt-2 space-y-1 text-[12px] leading-5 text-muted">
              {NOTICES.map((n) => (
                <li key={n} className="flex gap-1.5">
                  <span className="text-accent">·</span>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <Section id="rates" title="대관 패키지 구성">
          <p className="text-[13.5px] leading-7 text-muted">
            서울아레나의 대관료는 객석 규모별 패키지 단위의 정찰제로 운영됩니다.
            각 패키지에는 기본 대관료와 함께 대기실·프로덕션 장비 등 기본
            포함 항목이 정해져 있으며, 필요한 부대시설은 항목별로 선택하여
            추가할 수 있습니다.
          </p>
          <ul className="mt-4 space-y-1.5 text-[13px] text-muted">
            <li className="flex gap-1.5">
              <span className="text-accent">·</span>
              객석 규모에 따라 4단계 패키지 중 선택하며, 패키지별 기본
              대관료는 화~일 1주 기준 고정가로 운영됩니다.
            </li>
            <li className="flex gap-1.5">
              <span className="text-accent">·</span>
              대기실·연습실 등 공간과 프로덕션 장비 일부는 패키지에 기본
              포함되며, 초과 사용분만 추가 과금됩니다.
            </li>
            <li className="flex gap-1.5">
              <span className="text-accent">·</span>
              세팅/공연 일수 조정, 청소비, 홍보 매체 등은 신청 화면에서
              실시간으로 반영되어 예상 대관료를 바로 확인할 수 있습니다.
            </li>
          </ul>
          <Link
            href="/apply"
            className="mt-5 inline-flex items-center gap-1 rounded bg-accent px-6 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            패키지 구성 확인하기
            <span aria-hidden>›</span>
          </Link>
        </Section>

        <Section id="rules" title="대관 규약">
          <p className="text-[13.5px] leading-7 text-muted">
            서울아레나의 대관은 「서울아레나 대관규약」에 따라 운영됩니다.
            대관을 신청하는 모든 대관사는 대관규약의 내용을 충분히 숙지하고
            이에 동의한 것으로 간주됩니다. 계약 체결 이후에도 대관규약은
            계약의 일부로 적용되므로, 공연 준비 및 운영 전 반드시 확인하시기
            바랍니다.
          </p>
          <div className="mt-4 flex items-center justify-between border border-dashed border-border px-4 py-3 text-[12.5px] text-muted">
            <span>서울아레나 대관규약 전문</span>
            <span className="rounded bg-panel-strong px-2 py-1 text-[11px] font-medium">
              자료 준비 중
            </span>
          </div>
        </Section>

      </main>
    </div>
  );
}
