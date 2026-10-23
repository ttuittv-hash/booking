import { notFound } from "next/navigation";
import { CARD, FIELD, PAGE_TITLE, PAGE_LEAD, SECTION_TITLE, TAB_BAR, tabCls } from "@/components/admin/adminUi";

/** 실제 관리자 공통 클래스 확인용. 업무 데이터와 인증을 우회하지 않는다. */
export default function AdminSystemPreview() {
  if (process.env.NODE_ENV !== "development" || process.env.ADMIN_DESIGN_PREVIEW !== "1") notFound();
  return <div className="admin-page">
    <aside className="admin-sidebar"><div className="admin-brand">SEOUL ARENA<span>관리자 공통 디자인 검토</span></div></aside>
    <main>
      <header><h1 className={PAGE_TITLE}>신청 현황</h1><p className={PAGE_LEAD}>실제 관리자 화면과 동일한 공통 스타일을 사용하는 디자인 샘플입니다.</p></header>
      <nav className={`${TAB_BAR} admin-venue-tabs`} aria-label="공간 탭 샘플">
        <span className={tabCls(true)}>전체 (3)</span><span className={tabCls(false)}>아레나 (2)</span><span className={tabCls(false)}>중형공연장 (1)</span>
      </nav>
      <section className={CARD}>
        <h2 className={SECTION_TITLE}>신청 목록</h2>
        <p className="mt-2 text-xs text-muted">공통 제목·패널·입력창·탭의 연결을 검토합니다. 아래 내용은 예시입니다.</p>
        <label className="mt-6 block max-w-sm text-xs text-muted">회사별 보기
          <select className={`${FIELD} mt-2`} defaultValue="all"><option value="all">전체 회사</option><option value="sample">예시 기획사</option></select>
        </label>
        <div className="mt-6 overflow-x-auto"><table className="admin-table w-full text-left"><thead><tr className="border-b border-border-soft"><th>신청번호</th><th>공간</th><th>진행 상태</th></tr></thead><tbody><tr><td>예시-001</td><td>아레나</td><td><span className="admin-tag" data-tone="pending">심사 대기</span></td></tr></tbody></table></div>
      </section>
    </main>
  </div>;
}
