"use client";

import { useRef, useState } from "react";
import { IconChartBar, IconClipboardList, IconUsers, IconCalendar, IconPackage, IconReceipt, IconFileText, IconBell, IconMessage, IconSettings, IconArrowUpRight, IconMenu2, IconX, IconSearch, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand } from "@tabler/icons-react";
import { Badge, btnClass } from "@/components/ui/kit";
import { FIELD } from "./adminUi";
import { AdminPackagesPreview } from "./AdminPackagesPreview";
import { AdminMembersPreview } from "./AdminMembersPreview";
import { AdminReportPreview } from "./AdminReportPreview";
import { AdminRatesPreview, AdminSchedulePreview } from "./AdminOperationsPreview";
import { AdminInquiriesPreview } from "./AdminInquiriesPreview";
import { AdminNotificationsPreview } from "./AdminNotificationsPreview";
import { AdminContentPreview } from "./AdminContentPreview";
import type { RegisterTermsContent } from "@/lib/terms";
import styles from "./AdminDesignPreview.module.css";

const groups = [
  { title: "업무", items: [["리포트", IconChartBar], ["신청 현황", IconClipboardList], ["회원 관리", IconUsers]] },
  { title: "대관 정보", items: [["패키지", IconPackage], ["요금표", IconReceipt], ["일정", IconCalendar]] },
  { title: "운영", items: [["콘텐츠 관리", IconFileText], ["알림 관리", IconBell], ["1:1 문의", IconMessage]] },
] as const;

const applications = [
 {id:"DEMO-2026-00001",company:"아레나기획",person:"김담당",venue:"아레나",package:"Rate A · 주중 + 주말",audience:"10,000명 / 회",dates:"2027.03.02 — 03.07",days:"준비 2일 · 공연 3일 · 철수 1일",amount:200000000,received:"2026.10.02 · 14:30"},
 {id:"DEMO-2026-00002",company:"서울라이브",person:"이담당",venue:"아레나",package:"Rate B · 주말",audience:"8,000명 / 회",dates:"2027.03.05 — 03.07",days:"준비 1일 · 공연 1일 · 철수 1일",amount:120000000,received:"2026.10.02 · 15:10"},
 {id:"DEMO-2026-00003",company:"한강문화",person:"박담당",venue:"중형공연장",package:"Rate A · 주중",audience:"2,000명 / 회",dates:"2027.03.03 — 03.05",days:"준비 1일 · 공연 1일 · 철수 1일",amount:45000000,received:"2026.10.02 · 16:00"},
];
type PreviewApplication = typeof applications[number];
const money = (n:number) => `₩${n.toLocaleString("ko-KR")}`;
function applicationFields(a:PreviewApplication) { return [["신청번호",a.id],["접수일",a.received],["회사",a.company],["신청자",a.person],["공간",a.venue],["패키지",a.package],["예상 관객",a.audience],["대관 일정",a.dates],["일정 구성",a.days],["신청 금액 (예시)",money(a.amount)],["상태","심사 대기"]]; }

export function AdminDesignPreview({ registerTerms, account = { username: "admin", tierLabel: "PRO 관리자 · 예시" } }: { registerTerms: RegisterTermsContent; account?: { username: string; tierLabel: string } }) {
  const [page, setPage] = useState("신청 현황");
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [venue, setVenue] = useState("전체");
  const [company, setCompany] = useState("");
  const [appliedCompany, setAppliedCompany] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [activeApplication,setActiveApplication] = useState(applications[0]);
  const comparison = useRef<HTMLDialogElement>(null);
  const detail = useRef<HTMLDialogElement>(null);
  const rows = applications.filter(a => (venue === "전체" || a.venue === venue) && (!appliedCompany || a.company === appliedCompany));
  const visible = rows.length > 0;
  function openDetail(a:PreviewApplication) {setActiveApplication(a);detail.current?.showModal();}
  function toggle(id:string) {setSelected(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);}
  function navigate(next: string) { setPage(next); setMenuOpen(false); }
  return <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
    {menuOpen && <button className={styles.scrim} aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />}
    <aside className={`${styles.sidebar} ${menuOpen ? styles.open : ""}`} aria-label="관리자 메뉴">
      <div className={styles.sidebarHeader}><div className={styles.brand}>SEOUL ARENA<span>ADMIN</span></div>
      <button className={styles.collapseToggle} aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <IconLayoutSidebarLeftExpand size={20} /> : <IconLayoutSidebarLeftCollapse size={20} />}</button></div>
      <nav>{groups.map(group => <section className={styles.navGroup} key={group.title}><h2>{group.title}</h2>{group.items.map(([label, Icon]) => <button key={label} title={["패키지", "요금표", "일정"].includes(label) ? `${label} 관리` : label} aria-label={["패키지", "요금표", "일정"].includes(label) ? `${label} 관리` : label} aria-current={page === label ? "page" : undefined} onClick={() => navigate(label)}><Icon size={19} stroke={1.6} /><span className={styles.navLabel}>{["패키지", "요금표", "일정"].includes(label) ? `${label} 관리` : label}</span>{label === "신청 현황" && <span className={styles.navCount}>{applications.length}</span>}</button>)}</section>)}</nav>
      <div className={styles.sidebarBottom}><button title="설정" aria-label="설정" aria-current={page === "설정" ? "page" : undefined} onClick={() => navigate("설정")}><IconSettings size={19} stroke={1.6} /><span className={styles.navLabel}>설정</span></button><div className={styles.profile}><div><strong>{account.username}</strong><small>{account.tierLabel}</small></div></div><a href="https://booking-design.onrender.com/" target="_blank" rel="noreferrer" title="프론트 페이지 보기" aria-label="프론트 페이지 보기"><span className={styles.navLabel}>프론트 페이지 보기</span><IconArrowUpRight size={17} /></a></div>
    </aside>
    <div className={styles.main}>
      <main className={styles.content}><div className={styles.heading}><button className={styles.menuToggle} aria-label="메뉴 열기" onClick={() => setMenuOpen(true)}><IconMenu2 size={22} /></button><div><h1>{["패키지", "요금표", "일정"].includes(page) ? `${page} 관리` : page}</h1><p>{page === "신청 현황" ? "접수된 대관 신청을 확인하고 진행 상태를 관리하세요." : page === "리포트" ? "방문부터 신청, 매출까지 운영 현황을 한눈에 확인하세요." : page === "회원 관리" ? "신청자 계정과 회사별 담당자를 관리하세요." : page === "1:1 문의" ? "대관사가 남긴 문의를 확인하고 답변합니다. 답변을 등록하면 신청자 화면에 바로 반영됩니다." : page === "알림 관리" ? "자동 알림의 발송 조건과 문구를 관리하세요." : page === "콘텐츠 관리" ? "공지사항과 공개 화면의 콘텐츠를 관리하세요." : page === "패키지" ? "패키지 구성과 기본 대관료를 관리하세요." : page === "요금표" ? "부대시설 단가와 공통 요율을 관리하세요." : page === "일정" ? "공간별 대관 일정과 예약 가능 기간을 관리하세요." : "공통 사이드바의 선택 상태를 확인하는 화면입니다."}</p></div><span className={styles.date}>2026년 10월 2일 금요일</span></div>
      {page === "리포트" ? <AdminReportPreview /> : page === "회원 관리" ? <AdminMembersPreview /> : page === "패키지" ? <AdminPackagesPreview /> : page === "콘텐츠 관리" ? <AdminContentPreview registerTerms={registerTerms}/> : page === "알림 관리" ? <AdminNotificationsPreview /> : page === "1:1 문의" ? <AdminInquiriesPreview /> : page === "요금표" ? <AdminRatesPreview /> : page === "일정" ? <AdminSchedulePreview /> : page !== "신청 현황" ? <section className={styles.card}><div className={styles.empty}><IconFileText size={32} /><h2>{page} 화면은 준비 중입니다</h2><p>이번 시안에서는 신청 현황을 먼저 확인해 주세요.</p><button className={btnClass("primary")} onClick={() => navigate("신청 현황")}>신청 현황 보기</button></div></section> : <>
      <div className={styles.tabs} aria-label="공간 필터">{["전체", "아레나", "중형공연장"].map(name => <button key={name} aria-pressed={venue === name} onClick={() => {setVenue(name);setSelected([]);}}>{name} ({applications.filter(a=>name==="전체"||a.venue===name).length.toLocaleString("ko-KR")})</button>)}</div><form className={styles.filters} onSubmit={e => {e.preventDefault();setAppliedCompany(company);setSelected([]);}}><label htmlFor="company-filter">회사별 보기</label><select id="company-filter" className={`${FIELD} ${styles.companySelect}`} value={company} onChange={e => setCompany(e.target.value)}><option value="">전체 회사</option>{applications.map(a=><option key={a.id} value={a.company}>{a.company}</option>)}</select><button className={btnClass("primary")} type="submit">적용</button></form>
      <section className={styles.card} aria-label="신청 현황 목록"><div className={styles.listHeading}><div><h2>신청 목록 ({rows.length})</h2><p>행을 누르면 상세로, 선택하면 신청서를 나란히 비교할 수 있습니다.</p></div><div className={styles.listActions}><button type="button" className={btnClass("secondary", "sm")} disabled={selected.length === 0} onClick={() => setSelected([])}>선택 해제</button><button type="button" className={btnClass("primary", "sm")} disabled={selected.length < 2} onClick={() => comparison.current?.showModal()} title={selected.length < 2 ? "비교하려면 신청 2건 이상이 필요합니다" : undefined}>선택 항목 비교 ({selected.length})</button></div></div><div className={styles.tableWrap}><table><thead><tr><th><input type="checkbox" aria-label="신청 전체 선택" checked={visible && rows.every(a=>selected.includes(a.id))} disabled={!visible} onChange={e => setSelected(e.target.checked ? rows.map(a=>a.id) : [])} /></th><th>신청번호 / 접수일</th><th>회사 / 신청자</th><th>공간 / 패키지</th><th>대관 일정</th><th>계약금액 / 정산</th><th>상태</th></tr></thead><tbody>{visible ? rows.map(a=><tr key={a.id} className={styles.applicationRow} onClick={() => openDetail(a)}><td onClick={e => e.stopPropagation()}><input type="checkbox" aria-label={`${a.company} 신청 선택`} checked={selected.includes(a.id)} onChange={() => toggle(a.id)} /></td><td><button className={styles.idLink} onClick={e => {e.stopPropagation();openDetail(a);}}>{a.id}<IconArrowUpRight size={14} /></button><small>{a.received}</small></td><td><strong>{a.company}</strong><small>{a.person}</small></td><td><strong>{a.venue}</strong><small>{a.package}</small><small>관객 {a.audience}</small></td><td><strong>{a.dates}</strong><small>{a.days}</small></td><td><strong>{money(a.amount)}</strong><small>추후 정산 ₩0</small><small>총액 {money(a.amount)}</small></td><td><Badge tone="warn">심사 대기</Badge></td></tr>) : <tr><td colSpan={7}><div className={styles.empty}><IconSearch size={28} /><h3>해당하는 신청이 없습니다</h3><p>공간 또는 회사를 변경해 주세요.</p></div></td></tr>}</tbody></table></div><div className={styles.listFooter}><span>{visible ? `총 ${rows.length}건 중 1–${rows.length}` : "총 0건"}</span><nav className={styles.pagination} aria-label="신청 목록 페이지"><button className={btnClass("secondary", "sm")} disabled>이전</button><span>{visible ? "1/1페이지" : "0/0페이지"}</span><button className={btnClass("secondary", "sm")} disabled>다음</button></nav></div></section><p className={styles.note}>예시 데이터는 화면 확인용이며, 실제 신청·계약·알림에 반영되지 않습니다.</p>
      </>}
      </main>
    </div>
    <dialog ref={detail} className={styles.dialog} aria-labelledby="preview-detail-title"><div className={styles.dialogHeading}><div><span className={styles.sampleTag}>예시 신청</span><h2 id="preview-detail-title">{activeApplication.company} 대관 신청</h2></div><button aria-label="상세 닫기" onClick={() => detail.current?.close()}><IconX size={24} /></button></div><Badge tone="warn">심사 대기</Badge><dl>{applicationFields(activeApplication).map(([k,v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><p className={styles.note}>화면 검토를 위한 가상 신청입니다. 금액은 실제 요금표 계산 결과가 아닙니다.</p><button className={btnClass("primary")} onClick={() => detail.current?.close()}>확인</button></dialog>
    <dialog ref={comparison} className={`${styles.dialog} ${styles.compareDialog}`} aria-labelledby="preview-compare-title"><div className={styles.dialogHeading}><div><span className={styles.sampleTag}>예시 신청 비교</span><h2 id="preview-compare-title">선택 항목 비교 ({selected.length})</h2></div><button aria-label="비교 닫기" onClick={()=>comparison.current?.close()}><IconX size={24}/></button></div><div className={styles.compareScroll}><table><thead><tr><th>항목</th>{applications.filter(a=>selected.includes(a.id)).map(a=><th key={a.id}>{a.company}</th>)}</tr></thead><tbody>{applicationFields(applications[0]).map(([label],i)=><tr key={label}><th scope="row">{label}</th>{applications.filter(a=>selected.includes(a.id)).map(a=><td key={a.id}>{applicationFields(a)[i][1]}</td>)}</tr>)}</tbody></table></div><p className={styles.note}>비교용 예시 데이터입니다. 실제 신청·계약에는 반영되지 않습니다.</p></dialog>
  </div>;
}
