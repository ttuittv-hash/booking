"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {reportPeriod} from "@/lib/reportPeriod";
import { btnClass } from "@/components/admin/adminButton";
import { FIELD } from "./adminUi";
import editor from "./AdminEditor.module.css";
import tabs from "./ContentTabs.module.css";
import s from "./ReportTimeTabs.module.css";
export function ReportTimeTabs({from,to,mode,extra={},hourly=false,onChange}:{from:string;to:string;mode:string;extra?:Record<string,string|undefined>;hourly?:boolean;onChange?:(mode:string,from:string,to:string)=>void}) {
 const router=useRouter();const [custom,setCustom]=useState(mode==='custom');
 function select(value:string,start?:string,end?:string){setCustom(value==='custom');if(onChange){const next=reportPeriod({period:value,from:start??from,to:end??to},to);onChange(value,next.range.from,next.range.to);return;}const p=new URLSearchParams();for(const[k,v]of Object.entries(extra))if(v)p.set(k,v);p.set('period',value);if(value==='custom'){p.set('from',start??from);p.set('to',end??to);}router.push(`/admin/reports?${p}`,{scroll:false});}
 return <div className={s.controls} data-report-time-controls><div className={s.row}><nav className={tabs.subtabs} aria-label="조회 시간대">{[...(hourly?[['hour','시간별']]:[]),['day','일별'],['week','주간별'],['month','월별'],['custom','기간 지정']].map(([key,label])=><button className={tabs.tab} type="button" key={key} aria-pressed={custom?key==='custom':key===mode} onClick={()=>key==='custom'?setCustom(true):select(key)}>{label}</button>)}</nav><span>{mode==='hour'&&!custom?'최근 24시간':`${from} ~ ${to}`} · 한국 시간</span><button className={`${btnClass("secondary","md")} ${editor.actionButton}`} type="button" onClick={()=>router.refresh()}>새로고침</button></div>{custom&&<form key={`${from}-${to}`} className={s.form} onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);select('custom',String(data.get('from')),String(data.get('to')));}}><label>시작일<input className={FIELD} name="from" type="date" defaultValue={from} required/></label><span>~</span><label>종료일<input className={FIELD} name="to" type="date" defaultValue={to} required/></label><button className={`${btnClass("primary","md")} ${editor.actionButton}`} type="submit">기간 적용</button></form>}</div>;
}
