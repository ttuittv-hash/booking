"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChartBar, IconClipboardList, IconUsers, IconPackage, IconReceipt, IconCalendar, IconFileText, IconBell, IconMessage, IconSettings, IconArrowUpRight, IconLayoutSidebarLeftCollapse, IconLayoutSidebarLeftExpand, IconMenu2, IconX } from "@tabler/icons-react";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/NotificationBell";
import type { AdminTier, AppUser } from "@/lib/pricing/types";
import { adminNavigationFor } from "./adminNavigation";

const icons = {reports:IconChartBar,applications:IconClipboardList,members:IconUsers,packages:IconPackage,rates:IconReceipt,schedule:IconCalendar,content:IconFileText,notifications:IconBell,inquiries:IconMessage};

/** Navigation only presents permitted routes; page and API authorization remain server-side. */
export function AdminNav({active,user}:{active:string;user?:AppUser|null}) {
  const tier:AdminTier = user?.role === "ADMIN" ? user.adminTier ?? "BASIC" : "BASIC";
  const [collapsed,setCollapsed]=useState(false);
  const [open,setOpen]=useState(false);
  const [settings,setSettings]=useState(active==="/admin/account" || active==="/admin/users");
  const [frontHref,setFrontHref]=useState("/");
  useEffect(()=>{
    const {hostname,protocol,port}=window.location;
    const host=hostname.startsWith("bo.") ? "partner."+hostname.slice(3) : hostname;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resolve current deployment's partner origin after hydration
    setFrontHref(`${protocol}//${host}${port ? `:${port}` : ""}/`);
  },[]);
  useEffect(()=>{
    if(!open)return;
    function escape(event:KeyboardEvent){if(event.key==="Escape")setOpen(false);}
    document.addEventListener("keydown",escape);
    return ()=>document.removeEventListener("keydown",escape);
  },[open]);
  const links=adminNavigationFor(tier);
  return <>
    <div className="admin-mobile-bar"><button type="button" aria-label="메뉴 열기" aria-expanded={open} aria-controls="admin-sidebar" onClick={()=>setOpen(true)}><IconMenu2 size={22}/></button><span>SEOUL ARENA · ADMIN</span></div>
    {open && <button type="button" className="admin-scrim" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}/>}
    <aside id="admin-sidebar" className="admin-sidebar" data-collapsed={collapsed} data-open={open} aria-label="관리자 메뉴">
      <div className="admin-brand-row"><Link href={tier==="BASIC"?"/admin/content":"/admin/reports"} className="admin-brand">SEOUL ARENA<span>ADMIN</span></Link><button type="button" className="admin-collapse" aria-label={collapsed?"사이드바 펼치기":"사이드바 접기"} aria-expanded={!collapsed} onClick={()=>setCollapsed(!collapsed)}>{collapsed?<IconLayoutSidebarLeftExpand size={20}/>:<IconLayoutSidebarLeftCollapse size={20}/>}</button><button type="button" className="admin-mobile-close" aria-label="메뉴 닫기" onClick={()=>setOpen(false)}><IconX size={20}/></button></div>
      <nav aria-label="백오피스 메뉴">{["", "업무", "대관 정보", "운영"].map(group=>{
        const items=links.filter(link=>link.group===group);
        return items.length ? <div className="admin-nav-group" key={group}>{group&&<h2>{group}</h2>}{items.map(link=>{const Icon=icons[link.icon];return <Link key={link.href} href={link.href} title={link.label} aria-label={link.label} aria-current={link.href===active?"page":undefined} onClick={()=>setOpen(false)}><Icon size={20}/><span className="admin-nav-label">{link.label}</span></Link>;})}</div>:null;
      })}</nav>
      <div className="admin-sidebar-bottom"><button type="button" className="admin-settings" title="설정" aria-expanded={settings} onClick={()=>{setSettings(!settings);if(collapsed)setCollapsed(false);}}><IconSettings size={20}/><span className="admin-nav-label">설정</span></button>
      {settings && <nav className="admin-settings-links" aria-label="계정 관리">{tier==="MASTER"&&<Link href="/admin/users" aria-current={active==="/admin/users"?"page":undefined}>운영자 계정</Link>}<Link href="/admin/account" aria-current={active==="/admin/account"?"page":undefined}>계정 설정</Link></nav>}
      <div className="admin-profile"><strong>{user?.name || user?.username || "운영자"}</strong><small>{tier} 관리자</small></div>
      <a className="admin-front" href={frontHref} target="_blank" rel="noopener noreferrer" title="프론트 페이지 보기"><span className="admin-nav-label">프론트 페이지 보기</span><IconArrowUpRight size={17}/></a>
      </div>
    </aside>
    <div className="admin-account-tools"><NotificationBell role="ADMIN"/><LogoutButton className="text-xs font-bold hover:underline"/></div>
  </>;
}
