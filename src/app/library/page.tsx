import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, isPendingApplicant } from "@/lib/auth";
import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/ui/SiteFooter";
import { QueryTabs } from "@/components/ui/QueryTabs";
import {
  ArrowRight,
  Band,
  ButtonLink,
  CTABand,
  DownloadCard,
  Note,
  PageHeading,
} from "@/components/ui/kit";

export const metadata: Metadata = {
  title: "자료실 | 서울아레나",
};

/**
 * 기존 `/guide/forms`(대관 양식함)와 `/guide/image-guide`(이미지 가이드)를 폐지하고
 * 이 페이지로 흡수했다(둘 다 301 리다이렉트). 검토했던 대관 규약 전용 페이지도
 * 만들지 않고 이 페이지의 탭으로 흡수한다 — 다운로드 한 건을 위해 페이지를 세우지 않는다.
 *
 * 탭 축은 공간이 아니라 **자료 종류**다. 자료 종류가 다르면 딸려 오는 안내도 달라진다.
 * 시설 자료는 "어디에 무엇이 실려 있나"가 필요하고, 규약은 "어디에 적용되나"가 필요하다.
 * 한 목록에 섞으면 두 안내가 서로를 밀어낸다.
 *
 * 없는 자료는 만들지 않는다 — 신청 서식과 브랜드·이미지 자료는 확보 전까지 탭도 섹션도
 * 만들지 않는다. 빈 자리를 먼저 만들어 두면 자료가 있는 것처럼 보인다.
 */

/** 규약이 다루는 범위 — 조문이 아니라 "내가 찾는 내용이 이 문서에 있는가"를 판단할 목록 */
const RULES_SCOPE = [
  "대관 목적물과 기간, 기준 이용시간과 이용 제한시간, 기준 공연시간과 회차 할증",
  "신청과 심사, 계약 체결과 전자 날인, 계약금 납부와 대관 확정 시점",
  "대관료의 구성과 부가가치세, 추가 사용료와 부대시설 이용료, 수도광열비의 사후 정산",
  "취소와 위약금, 일정·일수 변경 시 적용되는 변경 대관료",
  "시설 이용수칙, 상부 리깅과 활하중 제한, 전력 사용 한도, 화기·특수효과 사용 조건",
  "안전 관리 책임과 보험, 손해배상, 계약 해제와 이용 제한, 분쟁해결",
];

export default async function LibraryPage() {
  const currentUser = await getCurrentUser();
  if (currentUser && isPendingApplicant(currentUser)) redirect("/pending");

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader active="/library" currentUser={currentUser} />

      <main className="flex flex-1 flex-col">
        <Band tone="light" size="lg">
          <PageHeading
            title="자료실"
            lead="대관 검토와 신청에 필요한 자료를 내려받으실 수 있습니다. 자료는 개정될 때마다 최신본으로 교체되므로, 내려받으신 파일의 버전과 갱신일을 확인해 주세요."
          />
        </Band>

        <Band tone="white">
          <QueryTabs
            param="doc"
            items={[
              {
                value: "facility",
                label: "시설 자료",
                panel: (
                  <div className="pt-14">
                    <DownloadCard
                      title="서울아레나 시설소개자료"
                      desc={
                        <>
                          <p>
                            아레나와 중형공연장의 제원, 층별 안내, 출입·차량 동선을 담은
                            자료입니다. 사업 개요, 단지 출입 경로와 차량 동선, 아레나 제원,
                            중형공연장 제원, 층별 안내, 조감도와 투시도가 순서대로 실려 있습니다.
                          </p>
                          <p className="mt-3">
                            웹 페이지에 싣지 않은 전기 분전함 회로별 용량, 배튼과 커튼 개별 규격,
                            부속실 실별 면적표, 층별 도면도 이 자료에 있습니다.
                          </p>
                        </>
                      }
                      meta={[
                        ["형식", "PDF · 54쪽"],
                        ["버전", "V1.0 (2026-08-18)"],
                        ["갱신일", "2026-08-18"],
                      ]}
                      disabledNote="파일 등록 후 다운로드가 활성화됩니다. 필요하시면 1:1 문의로 요청해 주세요."
                    />
                    <Note className="measure mt-10">
                      기술 검토와 프로덕션 노트 작성 단계에서는 웹 페이지보다 이 자료를 먼저 열어
                      보시기를 권합니다.
                    </Note>
                  </div>
                ),
              },
              {
                value: "rules",
                label: "대관 규약",
                panel: (
                  <div className="pt-14">
                    <DownloadCard
                      title="서울아레나 대관 규약"
                      desc="대관 신청과 계약, 시설 이용, 정산에 이르는 모든 단계에 적용되는 규약입니다. 대관을 신청하시면 규약에 동의하신 것으로 보며, 신청서 제출 단계에서 동의를 확인합니다."
                      meta={[
                        ["형식", "PDF"],
                        ["갱신일", "법무 확정본 입고 후 표기"],
                      ]}
                      disabledNote="법무 확정본 입고 후 게재합니다. 공개 전까지는 대관 담당자를 통해 확인해 주세요."
                    />

                    <section className="mt-14">
                      <h3 className="type-kr-heading text-h5-m sm:text-h5">규약이 다루는 범위</h3>
                      <ul className="measure mt-6 border-t border-border/25">
                        {RULES_SCOPE.map((t) => (
                          <li
                            key={t}
                            className="break-keep border-b border-border/15 py-4 text-s text-muted"
                          >
                            {t}
                          </li>
                        ))}
                      </ul>
                      <Note className="measure mt-8">
                        내려받으신 파일과 이 페이지에 표기된 갱신일이 다를 경우 최신 갱신본을
                        기준으로 판단해 주세요.
                      </Note>
                    </section>
                  </div>
                ),
              },
            ]}
          />
        </Band>

        <CTABand
          title="필요한 자료가 목록에 없나요?"
          lead="신청 서식과 이미지 사용 자료는 확보되는 대로 이 페이지에 탭으로 추가합니다. 그전에 필요하시면 1:1 문의로 요청해 주세요."
          actions={
            <>
              <ButtonLink href="/mypage/inquiries" variant="primary">
                1:1 문의하기
                <ArrowRight />
              </ButtonLink>
              <ButtonLink href="/guide" variant="secondary">
                대관 안내 보기
              </ButtonLink>
            </>
          }
        />
      </main>

      <SiteFooter />
    </div>
  );
}
