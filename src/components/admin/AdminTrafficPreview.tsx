"use client";
import { useState } from "react";
import { ReportTimeTabs } from "./ReportTimeTabs";
import { ReportBars } from "./ReportBars";

import { ReportTrendChart } from "./ReportTrendChart";
import s from "./AdminReportPreview.module.css";

export function AdminTrafficPreview() {
 const [granularity,setGranularity]=useState("일간");const [mode,setMode]=useState("day");const [range,setRange]=useState(["2026-09-26","2026-10-02"]);
 const hasData=range[0]<= "2026-10-02" && range[1]>= "2026-10-02";
 function card(label:string,value:string,note:string){return <article className={`${s.card} ${s.metricCard}`} key={label}><p>{label}</p><strong className={s.value}>{value}</strong>{note&&<small>{note}</small>}</article>;}
 return <>
 <ReportTimeTabs from={range[0]} to={range[1]} mode={mode} onChange={(next,from,to)=>{setMode(next);setGranularity(next==='week'?'주간':next==='month'?'월간':'일간');setRange([from,to]);}}/>
 <section className={s.trafficSection}><h2>유입</h2><div className={s.metrics}>{card("페이지뷰",hasData?"131회":"0회","화면 전환마다 1회")}{card("순방문자(UV)",hasData?"2명":"0명","브라우저 기준 · 기간 전체 중복 제거")}{card("대관신청 버튼 클릭",hasData?"1회":"0회","/apply 로 가는 모든 버튼")}</div></section>

 <section className={s.trafficSection}><h2>{granularity} 유입 추이</h2><ReportTrendChart points={hasData ? [{label:granularity==="일간"?"2026-10-02":granularity==="주간"?"2026-09-28 주":"2026-10",values:[131,2,1]}] : []} series={[{label:"페이지뷰",unit:"회",color:"#222222"},{label:"순방문자",unit:"명",color:"#337a9a"},{label:"대관신청 클릭",unit:"회",color:"#b78317"}]}/><p className={s.note}>구간별 순방문자를 더한 값은 위 순방문자 합계와 다릅니다 — 같은 방문자가 여러 구간에 나타나면 각 구간에서 한 번씩 세기 때문입니다.</p></section>
 <section className={s.trafficSection}><h2>가입</h2><div className={s.signupMetrics}>{card("가입자 수","1명","탈퇴 계정 제외")}{card("이번 달 신규 가입자","1명","")}{card("가입 회사 수","0곳","승인 여부 무관")}{card("이번 달 신규 회사","0곳","")}</div></section>
 <section className={s.trafficSection}><h2>가입 추이</h2><ReportTrendChart points={hasData?[{label:'2026-10-02',values:[1,0]}]:[]} series={[{label:'신규 가입자',unit:'명',color:'#337a9a'},{label:'신규 회사',unit:'곳',color:'#222222'}]}/></section>
 <section className={s.trafficSection}><h2>화면별 조회 (예시)</h2><ReportBars rows={hasData?[{label:'/',value:131,unit:'회',detail:'순방문자 2명'}]:[]}/></section>
 </>;
}
