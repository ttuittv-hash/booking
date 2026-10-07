"use client";
import { useState } from "react";
import { btnClass } from "@/components/ui/kit";
import { FIELD } from "./adminUi";
import s from "./AdminReportPreview.module.css";
export function ReportPeriodControls({onChange,inline=false}:{onChange:(range:string[])=>void;inline?:boolean}){
 const [g,setG]=useState("일간"); const [preset,setPreset]=useState(30);const [from,setFrom]=useState("2026-09-03");const [to,setTo]=useState("2026-10-02");
 function choose(days:number){const d=new Date("2026-10-02T00:00:00Z");d.setUTCDate(d.getUTCDate()-days+1);const start=d.toISOString().slice(0,10);setFrom(start);setTo("2026-10-02");setPreset(days);onChange([start,"2026-10-02"]);}
 return <div className={inline?s.trafficFilters:s.sharedPeriod}><div className={s.periodRow}><nav className={s.segmented} aria-label="집계 단위">{["일간","주간","월간"].map(t=><button key={t} aria-pressed={t===g} onClick={()=>setG(t)}>{t}</button>)}</nav><select className={`${FIELD} ${s.presetSelect}`} aria-label="최근 기간" value={preset} onChange={e=>choose(Number(e.target.value))}>{preset===0&&<option value={0}>직접 설정</option>}{[7,30,90].map(d=><option key={d} value={d}>최근 {d}일</option>)}</select></div><form className={s.dateForm} onSubmit={e=>{e.preventDefault();setPreset(0);onChange([from,to]);}}><label>시작일<input className={FIELD} type="date" required max={to} value={from} onChange={e=>setFrom(e.target.value)}/></label>{inline&&<span className={s.dateSeparator} aria-hidden="true">~</span>}<label>종료일<input className={FIELD} type="date" required min={from} value={to} onChange={e=>setTo(e.target.value)}/></label><button className={btnClass("secondary")} type="submit">기간 적용</button></form></div>;
}
