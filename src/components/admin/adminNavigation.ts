import type { AdminTier } from "@/lib/pricing/types";
const rank:Record<AdminTier,number>={BASIC:0,PRO:1,MASTER:2};
const links = [
 {href:"/admin/reports",label:"리포트",group:"업무",minTier:"PRO",icon:"reports"},
 {href:"/admin",label:"신청 현황",group:"업무",minTier:"PRO",icon:"applications"},
 {href:"/admin/applicants",label:"회원 관리",group:"업무",minTier:"PRO",icon:"members"},
 {href:"/admin/packages",label:"패키지 관리",group:"대관 정보",minTier:"PRO",icon:"packages"},
 {href:"/admin/rates",label:"요금표 관리",group:"대관 정보",minTier:"PRO",icon:"rates"},
 {href:"/admin/schedule",label:"일정 관리",group:"대관 정보",minTier:"PRO",icon:"schedule"},
 {href:"/admin/content",label:"콘텐츠 관리",group:"운영",minTier:"BASIC",icon:"content"},
 {href:"/admin/notification-rules",label:"알림 관리",group:"운영",minTier:"BASIC",icon:"notifications"},
 {href:"/admin/inquiries",label:"1:1 문의",group:"운영",minTier:"BASIC",icon:"inquiries"},
] as const;
export function adminNavigationFor(tier:AdminTier){return links.filter(link=>rank[tier]>=rank[link.minTier]);}
