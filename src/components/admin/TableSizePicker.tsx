"use client";
import { useState } from "react";
import s from "./NoticeEditor.module.css";
export function TableSizePicker({onSelect,disabled=false}:{disabled?:boolean;onSelect:(rows:number,cols:number)=>void}) {
  const [open,setOpen]=useState(false);
  const [size,setSize]=useState([1,1]);
  return <div className={s.tablePicker} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={event=>{if(event.key==="Escape")setOpen(false);}}>
    <button type="button" disabled={disabled} aria-expanded={open} onClick={()=>setOpen(!open)}>표 넣기 ▾</button>
    {open && <div className={s.tablePickerPanel}><strong>{size[0]}행 × {size[1]}열</strong><div className={s.tableGrid}>{Array.from({length:80},(_,index)=>{const row=Math.floor(index/10)+1,col=index%10+1;return <button key={index} type="button" aria-label={`${row}행 ${col}열 표 삽입`} data-selected={row<=size[0]&&col<=size[1]} onMouseEnter={()=>setSize([row,col])} onFocus={()=>setSize([row,col])} onClick={()=>{onSelect(row,col);setOpen(false);}} />;})}</div></div>}
  </div>;
}
