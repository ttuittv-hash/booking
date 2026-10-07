"use client";
import { useRef, useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { FIELD } from "./adminUi";
import s from "./AdminReportPreview.module.css";

export function AdminTrafficPreview() {
 const [granularity,setGranularity]=useState("일간");
 const [preset,setPreset]=useState(30);
 const [from,setFrom]=useState("2026-09-03");
 const [to,setTo]=useState("2026-10-02");
 const [range,setRange]=useState([from,to]);
 const [detail,setDetail]=useState("");
 const dialog=useRef<HTMLDialogElement>(null);
 const hasData=range[0]<= "2026-10-02" && range[1]>= "2026-10-02";
 function choose(days:number){const date=new Date("2026-10-02T00:00:00Z");date.setUTCDate(date.getUTCDate()-days+1);const start=date.toISOString().slice(0,10);setPreset(days);setFrom(start);setTo("2026-10-02");setRange([start,"2026-10-02"]);}
 function card(label:string,value:string,note:string,kind:string){return <article className={`${s.card} ${s.metricCard}`} key={label}><p>{label}</p><strong className={s.value}>{value}</strong>{note&&<small>{note}</small>}<button className={s.detailLink} onClick={()=>{setDetail(kind);dialog.current?.showModal();}}>자세히 보기 →</button></article>;}
 return <>
 <div className={s.trafficFilters}><div className={s.periodRow}><nav className={s.segmented} aria-label="집계 단위">{["일간","주간","월간"].map(g=><button key={g} aria-pressed={g===granularity} onClick={()=>setGranularity(g)}>{g}</button>)}</nav><select aria-label="최근 기간" className={`${FIELD} ${s.presetSelect}`} value={preset} onChange={e=>choose(Number(e.target.value))}>{preset===0&&<option value={0}>직접 설정</option>}{[7,30,90].map(d=><option key={d} value={d}>최근 {d}일</option>)}</select></div><form className={s.dateForm} onSubmit={e=>{e.preventDefault();setRange([from,to]);setPreset(0);}}><label>시작일<input className={FIELD} type="date" required value={from} max={to} onChange={e=>setFrom(e.target.value)}/></label><span className={s.dateSeparator} aria-hidden="true">~</span><label>종료일<input className={FIELD} type="date" required value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><button className={btnClass("secondary")} type="submit">기간 적용</button></form></div>
 <section className={s.trafficSection}><h2>유입</h2><div className={s.metrics}>{card("페이지뷰",hasData?"131회":"0회","화면 전환마다 1회","유입")}{card("순방문자(UV)",hasData?"2명":"0명","브라우저 기준 · 기간 전체 중복 제거","유입")}{card("대관신청 버튼 클릭",hasData?"1회":"0회","/apply 로 가는 모든 버튼","유입")}</div></section>
 <section className={s.trafficSection}><h2>가입</h2><div className={s.signupMetrics}>{card("가입자 수","1명","탈퇴 계정 제외","가입")}{card("이번 달 신규 가입자","1명","","가입")}{card("가입 회사 수","0곳","승인 여부 무관","가입")}{card("이번 달 신규 회사","0곳","","가입")}</div></section>
 <section className={s.trafficSection}><h2>{granularity} 유입 추이</h2><div className={s.scroll}><table><thead><tr>{["구간","페이지뷰","순방문자","대관신청 클릭"].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{hasData?<tr><td>{granularity==="일간"?"2026-10-02":granularity==="주간"?"2026-09-28 주":"2026-10"}</td><td>131</td><td>2</td><td>1</td></tr>:<tr><td colSpan={4}>이 기간에 수집된 방문 기록이 없습니다.</td></tr>}</tbody></table></div><p className={s.note}>구간별 순방문자를 더한 값은 위 순방문자 합계와 다릅니다 — 같은 방문자가 여러 구간에 나타나면 각 구간에서 한 번씩 세기 때문입니다.</p></section>
 <dialog className={s.detailDialog} ref={dialog} aria-label={`${detail} 상세 미리보기`}><h2>{detail} 상세</h2><p>현재는 첨부 화면 기준의 디자인 미리보기입니다. 기존 상세 페이지 연결은 실제 관리자 화면 적용 단계에서 유지합니다.</p><button className={btnClass("primary")} onClick={()=>dialog.current?.close()}>닫기</button></dialog>
 </>;
}
