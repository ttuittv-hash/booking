"use client";
import { useRouter } from "next/navigation";
export function ReportPresetSelect({value,options}:{value:string;options:{value:string;label:string;href:string}[]}) {
 const router=useRouter();
 return <select className="admin-field field-base" aria-label="조회 기간" value={value} onChange={event=>{const option=options.find(item=>item.value===event.target.value);if(option)router.push(option.href,{scroll:false});}}>{value==="custom"&&<option value="custom">직접 지정</option>}{options.map(item=><option value={item.value} key={item.value}>{item.label}</option>)}</select>;
}
