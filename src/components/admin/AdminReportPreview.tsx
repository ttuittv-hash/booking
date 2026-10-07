"use client";
import { useState } from "react";
import { AdminTrafficPreview } from "./AdminTrafficPreview";
import { OriginalReportPreview } from "./OriginalReportPreview";
import s from "./AdminReportPreview.module.css";
export function AdminReportPreview(){
 const [tab,setTab]=useState<"유입"|"퍼널"|"매출"|"모니터링">("유입");
 return <div className={s.report}><nav aria-label="리포트 탭" className={s.tabs}>{(["유입","퍼널","매출","모니터링"] as const).map(t=><button key={t} aria-pressed={t===tab} onClick={()=>setTab(t)}>{t}</button>)}</nav>{tab==="유입"?<AdminTrafficPreview/>:<OriginalReportPreview tab={tab}/>}</div>;
}
