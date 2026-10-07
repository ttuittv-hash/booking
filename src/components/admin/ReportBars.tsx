"use client";
import { useState } from "react";
import s from "./ReportTrendChart.module.css";
export type ReportBar = {label:string;value:number;unit?:string;detail?:string};
export function ReportBars({rows}:{rows:ReportBar[]}) {
 const [active,setActive]=useState<number|null>(null);
 const max=Math.max(1,...rows.map(r=>r.value));
 return <div className={s.bars}>{rows.length?rows.map((r,i)=><button type="button" key={`${r.label}-${i}`} className={s.bar} onMouseEnter={()=>setActive(i)} onFocus={()=>setActive(i)} onClick={()=>setActive(i)} aria-label={`${r.label} ${r.value.toLocaleString('ko-KR')}${r.unit??'건'} ${r.detail??''}`}><span>{r.label}</span><span className={s.track}><i style={{width:`${r.value/max*100}%`}}/></span><b>{r.value.toLocaleString('ko-KR')}{r.unit??'건'}</b></button>):<p className={s.empty}>이 기간에 표시할 기록이 없습니다.</p>}{active!==null&&rows[active]&&<div className={s.readout} aria-live="polite"><strong>{rows[active].label}</strong><span>{rows[active].value.toLocaleString('ko-KR')}{rows[active].unit??'건'}</span><span>{rows[active].detail}</span></div>}</div>;
}
