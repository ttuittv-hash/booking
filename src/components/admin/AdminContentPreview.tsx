"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { ContentManager } from "./ContentManager";
import { ContentTransport, type ContentRequest } from "./ContentTransport";
import { DEFAULT_HOME_CONTENT, DEFAULT_TERMS_CONTENT, DEFAULT_PRIVACY_CONTENT } from "@/lib/content/seed";
import { DEFAULT_SEOULARENA_CONTENT, DEFAULT_FEATURES_CONTENT, DEFAULT_GUIDE_PAGE_CONTENT, DEFAULT_RATES_CONTENT, DEFAULT_RULES_CONTENT, DEFAULT_DOCUMENTS_CONTENT, DEFAULT_SCREEN_TEXT_CONTENT } from "@/lib/content/pageContent";
import { SEED_FAQS } from "@/lib/content/faqSeed";
import { buildSeedRateTable } from "@/lib/pricing/seed";
import type { RegisterTermsContent } from "@/lib/terms";
import type { Notice } from "@/lib/pricing/types";
import s from "./AdminContentPreview.module.css";
const stamp="2026-10-02T09:00:00.000Z";
const notices:Notice[]=[{id:"preview-notice-1",tag:"대관공지",title:"2027년 서울아레나 대관 신청 안내",body:"<p>대관 신청 일정과 절차를 확인해 주세요.</p><p>화면 확인을 위한 예시 공지입니다.</p>",imageUrl:null,attachmentUrl:null,attachmentName:null,showBookingCalendar:true,pinned:true,createdAt:stamp,updatedAt:stamp},{id:"preview-notice-2",tag:"공지",title:"대관 시스템 이용 안내",body:"<p>회원 가입 후 승인된 계정으로 대관 신청을 진행할 수 있습니다.</p>",imageUrl:null,attachmentUrl:null,attachmentName:null,showBookingCalendar:false,pinned:false,createdAt:stamp,updatedAt:stamp}];
const faqs=SEED_FAQS.map((item,i)=>({id:`preview-faq-${i}`,tag:item.tag,question:item.question,answer:item.answer,createdAt:stamp,updatedAt:stamp}));
export function AdminContentPreview({registerTerms}:{registerTerms:RegisterTermsContent}) {
 const [content,setContent]=useState({home:DEFAULT_HOME_CONTENT,seoularena:DEFAULT_SEOULARENA_CONTENT,features:DEFAULT_FEATURES_CONTENT,guide:DEFAULT_GUIDE_PAGE_CONTENT,rates:DEFAULT_RATES_CONTENT,rules:DEFAULT_RULES_CONTENT,documents:DEFAULT_DOCUMENTS_CONTENT,screenText:DEFAULT_SCREEN_TEXT_CONTENT,terms:DEFAULT_TERMS_CONTENT,privacy:DEFAULT_PRIVACY_CONTENT,registerTerms});
 const [rateTable,setRateTable]=useState(()=>buildSeedRateTable());
 const urls=useRef<string[]>([]);
 const [message,setMessage]=useState("");
 useEffect(()=>()=>urls.current.forEach(url=>URL.revokeObjectURL(url)),[]);
 const request:ContentRequest=async(url,init)=>{
  if(init?.body instanceof FormData){const file=init.body.get("file");if(!(file instanceof File))return Response.json({error:"파일을 선택해 주세요."},{status:400});const local=URL.createObjectURL(file);urls.current.push(local);return Response.json({url:local,name:file.name});}
  const data=typeof init?.body==="string"?JSON.parse(init.body):{};
  const resource=url.split("/").filter(Boolean);const kind=resource[2];
  setMessage("예시 변경사항을 저장했습니다. 실제 공개 콘텐츠에는 반영되지 않습니다.");
  if(kind==="notices"||kind==="faq")return Response.json({[kind==="notices"?"notice":"faq"]:{...data,id:resource[3]??crypto.randomUUID(),createdAt:stamp,updatedAt:stamp}});
  if(kind==="content") {const key=resource[3];if(key==="legal")setContent(prev=>({...prev,[data.kind]:data.content}));else setContent(prev=>({...prev,[key]:data.content}));return Response.json({ok:true});}
  if(kind==="packages"){setRateTable(prev=>({...prev,...data}));return Response.json({ok:true,rateTable:{...rateTable,...data}});}
  return Response.json({error:"이 시안에서 지원하지 않는 요청입니다."},{status:400});
 };
 return <div className={s.preview}>
  <p className={s.lead}>공지사항·FAQ와 공개 화면(홈 · 서울아레나 · 시설 제원 · 대관 절차 · 대관료 · 대관 규약 · 대관 자료)의 내용을 여기서 관리합니다. 공지사항·FAQ·대관 신청·오시는 길처럼 본문이 게시물이나 폼인 화면의 문구는 ‘화면 문구’ 탭에 있습니다. 여러 줄 입력칸에서는 Enter로 줄을 바꾸고 빈 줄로 문단을 나누면 화면에도 그대로 나갑니다.</p>
  <p className={s.note}>디자인 시안: 원본 기본 콘텐츠와 예시 공지를 사용합니다. 편집·저장·파일 선택은 현재 화면에서만 적용됩니다.</p>
  {message&&<p role="status" className={s.message}>{message}</p>}
  <ContentTransport.Provider value={{request,isPreview:true}}><Suspense fallback={<p>콘텐츠를 불러오는 중입니다.</p>}><ContentManager notices={notices} faqs={faqs} homeContent={content.home} seoulArenaContent={content.seoularena} featuresContent={content.features} guideContent={content.guide} ratesContent={content.rates} rulesContent={content.rules} documentsContent={content.documents} screenTextContent={content.screenText} termsContent={content.terms} privacyContent={content.privacy} registerTermsContent={content.registerTerms} rateTable={rateTable} liveHallRateContent={content.rates.liveHall}/></Suspense></ContentTransport.Provider>
 </div>;
}
