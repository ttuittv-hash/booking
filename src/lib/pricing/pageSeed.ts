import type { PageGroup } from "./types";

// 최초 배포 시 한 번만 심는 기본 안내 페이지 콘텐츠.
// 이후에는 전부 어드민 > 페이지 관리 화면에서 수정한다.
export interface SeedPage {
  group: PageGroup;
  slug: string;
  navLabel: string;
  title: string;
  body: string;
}

export const SEED_PAGES: SeedPage[] = [
  {
    group: "VENUE",
    slug: "intro",
    navLabel: "소개",
    title: "서울아레나 소개",
    body: `<p>서울아레나는 <strong>대한민국 최초의 K-POP 전문 아레나</strong>입니다. 공연 제작과 관객 경험을 중심으로 설계된 메인 아레나와 중형공연장, 컨벤션 시설을 하나의 복합 문화공간으로 운영하며, 공연·전시·컨벤션·기업행사 등 다양한 형태의 이벤트를 개최할 수 있습니다.</p><p>국내외 공연기획사와 아티스트에게 안정적인 공연 환경을, 관객에게는 수준 높은 문화 경험을 제공하는 것을 목표로 합니다.</p>`,
  },
  {
    group: "VENUE",
    slug: "overview",
    navLabel: "시설개요",
    title: "시설 개요",
    body: `<p>서울아레나는 <strong>메인 아레나·중형공연장·컨벤션</strong>으로 구성된 복합 공연문화시설입니다. 공연의 규모와 목적에 따라 다양한 공간을 선택하여 운영할 수 있으며, 각 시설은 독립적인 운영은 물론 행사 특성에 따라 연계 사용도 가능합니다.</p>
<h3>01. 메인 아레나 (Arena)</h3>
<p><strong>최대 약 20,000명 수용</strong><br/>국내외 대형 콘서트와 라이브 공연을 위한 전문 공연장. 공연 연출에 따라 다양한 좌석 배치와 무대 구성이 가능하며, 최신 무대·음향·조명·반입반출 시스템을 갖춰 투어 공연은 물론 대규모 시상식, 방송 행사, 기업 이벤트까지 폭넓게 운영합니다.</p>
<h3>02. 중형공연장 (Medium Hall)</h3>
<p><strong>약 2,000석 규모</strong><br/>콘서트, 뮤지컬, 팬미팅, 쇼케이스, 기업행사 등 중형 규모 콘텐츠에 적합한 공연장. 관객과 아티스트 간 높은 몰입감을 제공하는 공간으로, 공연 특성에 맞는 유연한 운영이 가능합니다.</p>
<h3>03. 컨벤션 시설 (Convention)</h3>
<p><strong>MICE 복합 운영</strong><br/>회의, 전시, 세미나, 브랜드 행사, 기업 프로모션 등 다양한 MICE 행사를 운영할 수 있는 공간. 공연과 연계한 기자간담회, VIP 리셉션, 팬 이벤트 등 복합 프로그램 운영에도 활용할 수 있습니다.</p>
<h3>주요 특징</h3>
<ul>
<li>메인 아레나·중형공연장·컨벤션으로 구성된 복합 문화시설</li>
<li>공연 규모와 행사 목적에 따른 다양한 공간 선택 가능</li>
<li>공연 및 행사 간 연계 운영 가능</li>
<li>공연 제작과 관객 동선을 고려한 시설 구성</li>
<li>최신 공연 운영 환경을 고려한 전문 공연 인프라</li>
</ul>`,
  },
  {
    group: "VENUE",
    slug: "arena-specs",
    navLabel: "아레나 제원/부대시설",
    title: "메인 아레나 제원 및 부대시설",
    body: `<h3>시설 제원</h3>
<ul>
<li><strong>공연장 형태</strong>: 실내 아레나</li>
<li><strong>최대 수용인원</strong>: 약 20,000석</li>
<li><strong>공연 가능 형태</strong>: 콘서트, 시상식, 팬미팅, 방송행사, 기업행사 등</li>
<li><strong>좌석 운영</strong>: 공연 형태에 따라 가변 운영</li>
<li><strong>무대 구성</strong>: 공연 연출에 따른 다양한 무대 구성 가능</li>
<li><strong>반입·반출</strong>: 대형 공연 제작을 위한 전용 Loading Dock 및 반입·반출 시스템 운영</li>
<li><strong>운영 공간</strong>: FOH 및 BOH 운영시설 제공</li>
</ul>
<h3>주요 제공 시설</h3>
<p>공연 무대 시스템 · 공연 조명 시스템 · 공연 음향 시스템 · Rigging 및 기계설비 · Loading Dock · Freight Elevator · Production Office · Dressing Room · Green Room · FOH Control Position · 전력 및 통신 인프라 · 운영지원 공간</p>
<h3>부대시설</h3>
<ul>
<li><strong>프로덕션 오피스 (Production Office)</strong> — 공연 제작 및 운영 스태프 업무공간</li>
<li><strong>대기실 (Dressing Room)</strong> — 출연진 분장 및 대기 공간 (수량 추후 확정 예정)</li>
<li><strong>그린룸 (Green Room)</strong> — 출연진 휴게 공간 (수량 추후 확정 예정)</li>
<li><strong>샤워실 (Shower Room)</strong> — 총 18개소 (공용 12개소, 대기실 내부 6개소)</li>
<li><strong>의무실 (Medical Room)</strong> — 최대 3개소 운영 가능</li>
<li><strong>하역장 (Loading Dock)</strong> — 대형 공연장비 반입·반출 전용</li>
<li><strong>화물용 엘리베이터 (Freight Elevator)</strong> — 공연 장비 운반 전용</li>
<li><strong>FOH 컨트롤 포지션</strong> — 음향·조명·영상 운영 공간</li>
<li><strong>관계자 주차 (Production Parking)</strong> — 최대 200대 제공 (패키지별 상이)</li>
<li><strong>대형·중형버스 주차</strong> — 대형버스 최대 7대 / 중형버스 최대 5대</li>
<li><strong>휠체어석</strong> — 20석 (동반석 20석 별도)</li>
<li><strong>화장실 및 장애인 화장실</strong> — 전층 운영</li>
<li><strong>운영지원 공간 (BOH Support Area)</strong></li>
</ul>
<p>※ 시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.</p>`,
  },
  {
    group: "VENUE",
    slug: "medium-specs",
    navLabel: "중형 제원/부대시설",
    title: "중형공연장 제원 및 부대시설",
    body: `<h3>시설 제원</h3>
<ul>
<li><strong>공연장 형태</strong>: 실내 공연장</li>
<li><strong>최대 수용인원</strong>: 약 2,000석</li>
<li><strong>공연 가능 형태</strong>: 콘서트, 팬미팅, 쇼케이스, 뮤지컬, 기업행사 등</li>
<li><strong>좌석 운영</strong>: 공연 특성에 따라 운영 가능</li>
<li><strong>무대 구성</strong>: 다양한 공연 형태에 대응 가능한 무대 운영</li>
<li><strong>운영 공간</strong>: FOH 및 BOH 운영시설 제공</li>
</ul>
<h3>부대시설</h3>
<ul>
<li><strong>프로덕션 오피스 (Production Office)</strong></li>
<li><strong>대기실 (Dressing Room)</strong> — 수량 추후 확정 예정</li>
<li><strong>그린룸 (Green Room)</strong> — 수량 추후 확정 예정</li>
<li><strong>의무실 (Medical Room)</strong> — 2개소</li>
<li><strong>하역장 (Loading Dock)</strong> — 공연 장비 반입·반출 전용</li>
<li><strong>화물용 엘리베이터 (Freight Elevator)</strong></li>
<li><strong>FOH 컨트롤 포지션</strong></li>
<li><strong>관계자 주차 (Production Parking)</strong> — 제공 대수 추후 확정 예정</li>
<li><strong>휠체어석</strong> — 총 20석 (1층 6석, 2층 14석 / 동반석 별도)</li>
<li><strong>화장실 및 장애인 화장실</strong> — 전층 운영</li>
<li><strong>운영지원 공간 (BOH Support Area)</strong></li>
</ul>
<p>※ 시설별 제공 범위는 공연 규모 및 계약 조건에 따라 달라질 수 있습니다.</p>`,
  },
  {
    group: "GUIDE",
    slug: "process",
    navLabel: "대관 절차",
    title: "대관 절차",
    body: `<p>서울아레나의 대관은 대관 신청부터 계약, 공연 준비, 공연 운영, 사후 정산까지 단계별 절차에 따라 진행됩니다. 원활한 공연 준비를 위해 각 단계별 제출서류 및 진행 일정을 반드시 확인하시기 바랍니다.</p>
<h3>01. 회원가입 및 로그인</h3>
<p>대관 신청을 위해서는 대관시스템 회원가입 및 로그인이 필요합니다. 신청자(대관사) 계정은 운영자 승인 후 이용할 수 있습니다.</p>
<h3>02. 대관안내 확인</h3>
<p>대관규약, 대관료, 대관 가능 일정 및 관련 안내사항을 확인합니다.</p>
<h3>03. 대관 신청</h3>
<p>공연 정보와 희망 대관일정을 입력하고 필요한 서류를 첨부하여 온라인으로 신청합니다.</p>
<h3>04. 대관 심사</h3>
<p>신청된 공연의 일정, 공연 내용, 시설 적합성 등을 종합적으로 검토하여 대관 가능 여부를 심사합니다. 필요한 경우 추가 자료 제출을 요청할 수 있습니다.</p>
<h3>05. 승인 및 계약</h3>
<p>대관 승인이 완료되면 계약을 체결하고 계약금 납부를 진행합니다. 계약이 완료되어야 대관이 확정됩니다.</p>
<h3>06. 공연 준비</h3>
<p>공연계획서, 기술자료, 운영계획, 홍보물, 안전관리계획 등 공연 운영에 필요한 자료를 제출하고 관계 부서와 협의를 진행합니다.</p>
<h3>07. 공연 운영</h3>
<p>공연장 반입, 설치, 리허설, 공연 진행 및 철수까지 공연 운영이 진행됩니다.</p>
<h3>08. 사후 정산</h3>
<p>추가 사용료 및 부대시설 이용료 등을 포함하여 최종 정산을 진행하며, 정산 완료 후 대관 절차가 종료됩니다.</p>
<h3>유의사항</h3>
<ul>
<li>공연 일정 및 제출기한은 계약 조건에 따라 달라질 수 있습니다.</li>
<li>제출서류가 미비한 경우 심사 또는 공연 준비 일정이 지연될 수 있습니다.</li>
<li>공연 준비 단계에서는 공연사업팀 및 관계 부서와의 협의가 필요합니다.</li>
<li>세부 일정은 대관 담당자의 안내에 따라 진행됩니다.</li>
</ul>`,
  },
  {
    group: "GUIDE",
    slug: "rates",
    navLabel: "대관료",
    title: "대관료",
    body: `<p>패키지별 대관료는 관객 규모에 따른 정찰제로 운영되며, 부대시설 사용료를 포함한 상세 구성은 대관 신청 화면에서 실시간으로 확인할 수 있습니다.</p><p><a href="/apply">패키지별 대관료 확인하기 →</a></p>`,
  },
  {
    group: "GUIDE",
    slug: "rules",
    navLabel: "대관 규약",
    title: "대관 규약",
    body: `<p>서울아레나의 대관은 「서울아레나 대관규약」에 따라 운영됩니다. 대관을 신청하는 모든 대관사는 대관규약의 내용을 충분히 숙지하고 이에 동의한 것으로 간주됩니다. 계약 체결 이후에도 대관규약은 계약의 일부로 적용되므로, 공연 준비 및 운영 전 반드시 확인하시기 바랍니다.</p><p>서울아레나 대관규약 전문: 자료 준비 중</p>`,
  },
];
