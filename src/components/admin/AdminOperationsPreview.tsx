"use client";
import { Suspense, useCallback, useRef, useState } from "react";
import { buildSeedRateTable } from "@/lib/pricing/seed";
import type { DateBlock } from "@/lib/pricing/types";
import { DEFAULT_RATES_CONTENT } from "@/lib/content/pageContent";
import { DEFAULT_NOTICE_CALENDAR_WINDOW, noticeCalendarMonthBounds, nextMonthKey, clampMonthKey, normalizeMonth, normalizeDay } from "@/lib/content/noticeCalendarWindow";
import { ContentTransport, type ContentRequest } from "./ContentTransport";
import { RatesForm } from "./RatesForm";
import { ScheduleManager } from "./ScheduleManager";
import { NoticeCalendarWindowForm } from "./NoticeCalendarWindowForm";
import styles from "./AdminOperationsPreview.module.css";

export function AdminRatesPreview() {
  const [rates] = useState(buildSeedRateTable);
  const version = useRef(0);
  const request: ContentRequest = async () => Response.json({rateTable:{version:`PREVIEW-${++version.current}`}});
  const hall = DEFAULT_RATES_CONTENT.liveHall;
  const number = (text?:string) => text?.replace(/[^0-9]/g,"") ? Number(text.replace(/[^0-9]/g,"")) : null;
  const refs = Object.fromEntries((["setup","weekday","weekend"] as const).map(key=>{
    const detail=hall.detailColumns.find(c=>c.key===key)?.values;
    return [key,{total:number(hall.columns.find(c=>c.key===key)?.values[0]),exclusive:number(detail?.[0]),facility:number(detail?.[1])}];
  })) as Record<"setup"|"weekday"|"weekend",{total:number|null;exclusive:number|null;facility:number|null}>;
  return <div className={`${styles.preview} ${styles.rates}`}>
    <p className={styles.lead}>현재 버전: {rates.version} · 저장하면 새 버전이 생성되며, 이미 제출된 신청서의 금액에는 영향을 주지 않습니다. 패키지별 기본 대관료는 “패키지 관리”에서 편집하세요. 이 요금표는 대관 신청의 견적 계산에 쓰입니다. 공개 대관료 페이지의 표는 “콘텐츠 관리 &gt; 대관료”에서 수정합니다.</p>
    <p className={styles.note}>원본 기본값을 사용한 시안입니다. 편집·저장은 이 화면에만 반영됩니다.</p>
    <ContentTransport.Provider value={{request,isPreview:true}}><Suspense fallback={<p>요금표를 불러오는 중입니다.</p>}><RatesForm rateTable={rates} publicMidHall={refs}/></Suspense></ContentTransport.Provider>
  </div>;
}
export function AdminSchedulePreview() {
  const [window,setWindow] = useState(DEFAULT_NOTICE_CALENDAR_WINDOW);
  const blocks = useRef<DateBlock[]>([{date:"2026-10-15",venueId:"arena",reason:"시설 점검 (예시)"}]);
  const request = useCallback<ContentRequest>(async (url,init)=>{
    if (url.includes("notice-calendar-window")) {
      const body=JSON.parse(String(init?.body ?? "{}"));
      const next={enabled:body.enabled===true,startMonth:normalizeMonth(body.startMonth),endMonth:normalizeMonth(body.endMonth),endDay:normalizeDay(body.endDay)};
      setWindow(next);
      return Response.json({window:next});
    }
    if (!init?.method || init.method === "GET") return Response.json({blocks:blocks.current,occupancy:{}});
    const body=JSON.parse(String(init.body ?? "{}"));
    blocks.current=blocks.current.filter(item=>!(item.date===body.date && (item.venueId===body.venueId || item.venueId==="ALL")));
    if(init.method==="POST") blocks.current.push(body);
    return Response.json({ok:true});
  },[]);
  const range=noticeCalendarMonthBounds(window);
  const bounds={start:range.start,end:range.end && range.endDay ? nextMonthKey(range.end) : range.end};
  const opening=clampMonthKey("2026-10",bounds);
  const [year,month]=opening.split("-").map(Number);
  return <div className={`${styles.preview} ${styles.schedule}`}>
    <p className={styles.lead}>한 달씩 달력을 보면서 아레나·중형공연장 예약 현황을 확인하고, 날짜별로 대관 신청 가능/불가를 설정합니다.</p>
    <p className={styles.note}>예시 일정 시안입니다. 예약 데이터는 연결하지 않았으며, 노출 기간과 대관 불가 설정은 이 화면에만 반영됩니다.</p>
    <ContentTransport.Provider value={{request,isPreview:true}}>
      <NoticeCalendarWindowForm initial={window} nowMonth="2026-10"/>
      <div className={styles.calendar}><ScheduleManager key={`${bounds.start}~${bounds.end}`} initialYear={year} initialMonth={month} monthBounds={bounds}/></div>
    </ContentTransport.Provider>
  </div>;
}
