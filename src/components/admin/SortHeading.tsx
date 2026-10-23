"use client";
import { IconArrowsSort, IconArrowUp, IconArrowDown } from "@tabler/icons-react";
export function SortHeading({label,active,direction,onClick}:{label:string;active:boolean;direction:"asc"|"desc";onClick:()=>void}) {
 const Icon=active?(direction==="asc"?IconArrowUp:IconArrowDown):IconArrowsSort;
 return <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 whitespace-nowrap" aria-label={`${label} ${active&&direction==="asc"?"내림차순":"오름차순"} 정렬`}><span>{label}</span><Icon size={14} aria-hidden="true" /></button>;
}
