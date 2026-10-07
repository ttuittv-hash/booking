"use client";
import { useState } from "react";
import { ReportPeriodControls } from "./ReportPeriodControls";
import s from "./AdminReportPreview.module.css";
import {  TABLE, TABLE_HEAD, TABLE_HEAD_DESC,  TABLE_SCROLL, TD, TD_ID, TD_NUM, TH, TH_NUM, THEAD_ROW, TR } from "./adminUi";
const TABLE_CARD=s.card;
const num=(n:number)=>n.toLocaleString("ko-KR");
function StatCard({label,value,sub}:{label:string;value:string;sub?:string}){return <article className={s.card}><p>{label}</p><strong className={s.value}>{value}</strong>{sub&&<small>{sub}</small>}</article>;}
function BreakdownTable({title,rows,showTotal}:{title:string;rows:{key:string;label:string;count:number;total:number}[];showTotal?:boolean}){return <section className={s.card}><h2>{title}</h2><div className={s.scroll}><table><thead><tr><th>구분</th><th>건수</th>{showTotal&&<th>대관료 합계</th>}</tr></thead><tbody>{rows.map(r=><tr key={r.key}><td>{r.label}</td><td>{r.count}건</td>{showTotal&&<td>{num(r.total)}원</td>}</tr>)}</tbody></table></div></section>;}
const VENUE_TABS=[{key:"all",label:"전체"},{key:"arena",label:"아레나"},{key:"medium-hall",label:"중형공연장"}];
const tabCls=(active:boolean)=>active?"font-bold":"";
export function OriginalReportPreview({tab}:{tab:"퍼널"|"매출"|"모니터링"}){
 const [venueTab,setVenueTab]=useState("all");
 const [range,setRange]=useState(["2026-09-03","2026-10-02"]);
 const inRange=range[0]<="2026-10-02"&&range[1]>="2026-10-02";
 const venueLabel=VENUE_TABS.find(t=>t.key===venueTab)!.label;
 const scale=venueTab==="all"?3:venueTab==="arena"?2:1;
 const steps=[ ["방문",2,"명","브라우저 기준 순방문자"],["가입 화면",0,"명","/register 를 연 방문자"],["가입 완료",1,"명","기간 내 생성된 신청자 계정"],["회사 승인",0,"곳","운영자 승인을 받은 회사"],["대관신청 클릭",1,"명","/apply 로 가는 버튼을 누른 방문자"],["위저드 진입",1,"명","로그인 상태로 신청 화면에 들어온 회원"],["신청서 제출",0,"건","실제로 접수된 대관 신청서"] ] as const;
 const funnel=steps.map(([label,count,unit,hint],i)=>({key:label,label,count:inRange?count:0,unit,hint,rate:!inRange||i===0||steps[i-1][1]===0?null:Math.round(count/steps[i-1][1]*100)}));
 const stalled: {companyId:string;companyName:string;memberCount:number;reached:string;lastSeenAt:string|null;idleDays:number}[]=[];
 const ops={pendingReviews:3,pendingCompanies:2,openInquiries:1,oldestInquiryDays:4,adminsWithoutPhone:1,messagesSent:inRange?198:0,messagesFailed:inRange?2:0,messageFailureTop:inRange?[{templateCode:"DEMO_NOTICE",reason:"수신번호 오류 (예시)",count:2}]:[]};
 const aws={available:true,reason:"예시 데이터",runningTasks:3,cpuAvg:24,cpuMax:48,responseTime:0.182,serverErrors:0,clientErrors:4,blockedRequests:12,allowedRequests:9600,dbCpu:18,dbConnections:8};
 const breakdown=(labels:string[],counts:number[])=>labels.map((label,i)=>({key:label,label,count:counts[i],total:counts[i]*100000000}));
 const monthly=Array.from({length:6},(_,i)=>({key:`2026-${String(i+5).padStart(2,"0")}`,label:`2026.${String(i+5).padStart(2,"0")}`,count:scale,total:scale*100000000}));
 const stats={totalQuotes:scale*6,newThisMonth:scale,pendingReview:scale,contractedCount:scale*2,contractedTotal:scale*200000000,settledCount:scale,reviewBreakdown:breakdown(["승인","보류","거절"],[scale*3,scale,scale]),venueBreakdown:breakdown(venueTab==="all"?["아레나","중형공연장"]:[venueLabel],venueTab==="all"?[12,6]:[scale*6]),companyBreakdown:breakdown(["승인 대기","승인 완료","거절","정지"],[2,8,1,0]),monthly};
 const revenue={submittedCount:scale*6,submittedTotal:scale*600000000,contractedCount:scale*2,contractedTotal:scale*200000000,settledTotal:scale*100000000,settledCount:scale,pendingSettlementTotal:scale*100000000,pendingSettlementCount:scale,addendumTotal:0,monthly:monthly.map((m,i)=>({...m,submittedCount:scale,submittedTotal:m.total,contractedCount:i>=4?scale:0,contractedTotal:i>=4?scale*100000000:0,settledTotal:i===5?scale*100000000:0}))};
 return <div className={s.originalContent}>{tab==="퍼널"?<>
        <ReportPeriodControls onChange={setRange} inline />
        <section className={s.funnelSection}>
          <h2 className={s.sectionTitle}>신청 퍼널</h2>
          <div className="mt-4">
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>단계</th>
                    <th className={TH_NUM}>도달</th>
                    <th className={TH_NUM}>직전 대비</th>
                    <th className={TH}>세는 기준</th>
                  </tr>
                </thead>
                <tbody>
                  {funnel.map((step) => (
                    <tr key={step.key} className={TR}>
                      <td className={TD_ID}>{step.label}</td>
                      <td className={TD_NUM}>
                        {step.count.toLocaleString("ko-KR")}
                        {step.unit}
                      </td>
                      <td className={TD_NUM}>
                        {step.rate === null ? "—" : `${step.rate}%`}
                      </td>
                      <td className={TD}>{step.hint}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2.5 text-xs leading-5 text-muted">
            방문·가입 화면·대관신청 클릭·위저드 진입은 위 기간 안의 접속 기록 기준이고,
            가입 완료·회사 승인·신청서 제출은 그 기간에 실제로 만들어진 건수입니다.
            단계마다 세는 단위(명·곳·건)가 달라 통과율은 흐름을 보는 용도로만 읽어 주세요.
          </p>
        </section>

        <section className={s.funnelSection}>
          <h2 className={s.sectionTitle}>승인 후 아직 신청서를 내지 않은 회사</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            운영자 승인을 받았지만 신청서가 없는 회사입니다. 오래 멈춘 순으로 정렬했습니다 —
            연락이 필요한 곳을 여기서 고르시면 됩니다.
          </p>
          <div className="mt-3">
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>회사</th>
                    <th className={TH_NUM}>담당자</th>
                    <th className={TH}>도달 단계</th>
                    <th className={TH}>마지막 접속</th>
                    <th className={TH_NUM}>정체</th>
                  </tr>
                </thead>
                <tbody>
                  {stalled.length === 0 ? (
                    <tr className={TR}>
                      <td className={TD} colSpan={5}>
                        멈춘 회사가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    stalled.map((c) => (
                      <tr key={c.companyId} className={TR}>
                        <td className={TD_ID}>{c.companyName}</td>
                        <td className={TD_NUM}>{c.memberCount}명</td>
                        <td className={TD}>{c.reached}</td>
                        <td className={TD}>
                          {c.lastSeenAt
                            ? new Date(c.lastSeenAt).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })
                            : "—"}
                        </td>
                        <td className={TD_NUM}>{c.idleDays}일</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
</>:tab==="모니터링"?<>
        <section className={s.monitoringGroup}>
          <h2 className={s.sectionTitle}>지금 처리해야 할 것</h2>
          <p className="mt-1.5 text-xs leading-5 text-muted">
            운영진 손이 필요한 대기 항목입니다. 기간과 무관하게 현재 상태를 보여줍니다.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="심사 대기 신청서"
              value={`${ops.pendingReviews.toLocaleString("ko-KR")}건`}
              sub="접수됐지만 승인·보류·거절 미결정"
            />
            <StatCard
              label="가입 승인 대기"
              value={`${ops.pendingCompanies.toLocaleString("ko-KR")}곳`}
              sub="회사 심사 대기"
            />
            <StatCard
              label="미답변 문의"
              value={`${ops.openInquiries.toLocaleString("ko-KR")}건`}
              sub={ops.oldestInquiryDays === null ? "없음" : `가장 오래된 건 ${ops.oldestInquiryDays}일 경과`}
            />
            <StatCard
              label="휴대폰 없는 운영자"
              value={`${ops.adminsWithoutPhone.toLocaleString("ko-KR")}명`}
              sub="알림톡이 발송되지 않는 계정"
            />
          </div>
        </section>

        <section className={s.monitoringGroup}>
          <h2 className={s.sectionTitle}>알림톡·문자 발송</h2>
          <ReportPeriodControls onChange={setRange} inline />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="성공" value={`${ops.messagesSent.toLocaleString("ko-KR")}건`} sub="기간 내 발송 성공" />
            <StatCard label="실패" value={`${ops.messagesFailed.toLocaleString("ko-KR")}건`} sub="카카오·통신사가 거절" />
            <StatCard
              label="성공률"
              value={
                ops.messagesSent + ops.messagesFailed === 0
                  ? "—"
                  : `${Math.round((ops.messagesSent / (ops.messagesSent + ops.messagesFailed)) * 1000) / 10}%`
              }
            />
          </div>
          {ops.messageFailureTop.length > 0 && (
            <div className="mt-4">
              <div className={TABLE_SCROLL}>
                <table className={TABLE}>
                  <thead>
                    <tr className={THEAD_ROW}>
                      <th className={TH}>템플릿</th>
                      <th className={TH}>실패 사유</th>
                      <th className={TH_NUM}>건수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.messageFailureTop.map((r) => (
                      <tr key={`${r.templateCode}-${r.reason}`} className={TR}>
                        <td className={TD_ID}>{r.templateCode}</td>
                        <td className={TD}>{r.reason}</td>
                        <td className={TD_NUM}>{r.count.toLocaleString("ko-KR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className={s.monitoringGroup}>
          <h2 className={s.sectionTitle}>서버 · 차단</h2>
          {aws.available ? (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="가동 중인 서버"
                  value={aws.runningTasks === null ? "—" : `${aws.runningTasks}대`}
                  sub="자동 확장 3~12대"
                />
                <StatCard
                  label="CPU"
                  value={aws.cpuAvg === null ? "—" : `${aws.cpuAvg}%`}
                  sub={aws.cpuMax === null ? undefined : `최고 ${aws.cpuMax}%`}
                />
                <StatCard
                  label="평균 응답시간"
                  value={aws.responseTime === null ? "—" : `${Math.round(aws.responseTime * 1000)}ms`}
                />
                <StatCard
                  label="서버 오류(5xx)"
                  value={aws.serverErrors === null ? "—" : `${aws.serverErrors.toLocaleString("ko-KR")}건`}
                  sub={aws.clientErrors === null ? undefined : `요청 오류(4xx) ${aws.clientErrors.toLocaleString("ko-KR")}건`}
                />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard
                  label="방화벽 차단"
                  value={aws.blockedRequests === null ? "—" : `${aws.blockedRequests.toLocaleString("ko-KR")}건`}
                  sub="공격·과다 요청을 막은 횟수"
                />
                <StatCard
                  label="정상 통과"
                  value={aws.allowedRequests === null ? "—" : `${aws.allowedRequests.toLocaleString("ko-KR")}건`}
                />
                <StatCard
                  label="DB CPU"
                  value={aws.dbCpu === null ? "—" : `${aws.dbCpu}%`}
                />
                <StatCard
                  label="DB 접속"
                  value={aws.dbConnections === null ? "—" : `${aws.dbConnections}개`}
                  sub="최대 420개"
                />
              </div>
              <p className="mt-2.5 text-xs leading-5 text-muted">
                위 기간의 AWS 지표입니다. 차단 건수가 갑자기 늘면 공격일 수 있고, 서버 오류(5xx)가
                0이 아니면 확인이 필요합니다. 경보는 슬랙으로도 갑니다.
              </p>
            </>
          ) : (
            <div className={`mt-3 ${TABLE_CARD} p-5 text-s text-muted`}>{aws.reason}</div>
          )}
        </section>
</>:<>
          <nav
            className={s.segmented}
            aria-label="공간 탭"
          >
            {VENUE_TABS.map((t) => (
              <button
                key={t.key}
                aria-pressed={t.key === venueTab}
                onClick={() => setVenueTab(t.key)}
                className={tabCls(t.key === venueTab)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        <section className={s.revenueGroup}>
          <h2 className={s.sectionTitle}>공간별 신청 현황</h2>

          <p className="mt-3 text-xs text-muted">
            {venueTab === "all"
              ? "모든 공간의 신청서를 함께 집계합니다."
              : `${venueLabel}에 걸린 신청서만 집계합니다. 동시 대관(아레나+중형) 건은 두 공간 탭에 모두 잡히므로, 탭별 건수의 합은 전체보다 클 수 있습니다.`}
          </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="누적 신청 건수" value={`${stats.totalQuotes.toLocaleString("ko-KR")}건`} />
          <StatCard label="이번 달 신규 신청" value={`${stats.newThisMonth.toLocaleString("ko-KR")}건`} />
          <StatCard label="심사 대기" value={`${stats.pendingReview.toLocaleString("ko-KR")}건`} />
          <StatCard
            label="계약 확정"
            value={`${stats.contractedCount.toLocaleString("ko-KR")}건`}
            sub={`계약금액 합계 ${num(stats.contractedTotal)}원`}
          />
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BreakdownTable title="심사 결과 분포" rows={stats.reviewBreakdown} />
          <BreakdownTable title="공간별 신청 현황" rows={stats.venueBreakdown} showTotal />
          <BreakdownTable title="법인회원 승인 현황" rows={stats.companyBreakdown} />
          <div className={s.card}>
            <h2>정산 완료</h2>
            <strong className={s.value}>
              {stats.settledCount.toLocaleString("ko-KR")}건
            </strong>
            <p className="mt-1 text-xs text-muted">
              계약 확정 {stats.contractedCount.toLocaleString("ko-KR")}건 중 정산까지 마친 건수입니다.
            </p>
          </div>
        </section>

        {/* ── 매출 ───────────────────────────────────────────────────────
            금액은 접수 → 계약 → 확정 세 단계를 지난다. 한 숫자로 뭉치면
            "얼마를 벌었나"에 답할 수 없다. 공간 탭이 그대로 적용된다. */}
        <section className={s.revenueGroup}>
          <h2 className={s.sectionTitle}>매출 · {venueLabel}</h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            <b>접수</b>는 신청 시점의 견적, <b>계약</b>은 계약금액(부속합의 반영),{" "}
            <b>확정 매출</b>은 정산까지 끝난 최종 금액입니다. 계약만 되고 정산 전인 건은 금액이 더
            움직일 수 있어 확정 매출에 넣지 않고 따로 셉니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              label="접수 건수"
              value={`${revenue.submittedCount.toLocaleString("ko-KR")}건`}
              sub={`견적 합계 ${num(revenue.submittedTotal)}원`}
            />
            <StatCard
              label="계약 건수"
              value={`${revenue.contractedCount.toLocaleString("ko-KR")}건`}
              sub={`계약금액 ${num(revenue.contractedTotal)}원`}
            />
            <StatCard
              label="총 확정 매출"
              value={`${num(revenue.settledTotal)}원`}
              sub={`정산 완료 ${revenue.settledCount.toLocaleString("ko-KR")}건`}
            />
            <StatCard
              label="정산 예정"
              value={`${num(revenue.pendingSettlementTotal)}원`}
              sub={`계약 후 정산 전 ${revenue.pendingSettlementCount.toLocaleString("ko-KR")}건`}
            />
          </div>
          {revenue.addendumTotal !== 0 && (
            <p className="mt-3 text-xs text-muted">
              계약금액에는 부속합의 {num(revenue.addendumTotal)}원이 반영되어 있습니다.
            </p>
          )}

        </section>
        <section className={s.revenueGroup}>
            <div className={TABLE_HEAD}>
              <div>
                <h2 className={s.sectionTitle}>월별 매출 추이 (최근 6개월)</h2>
                <p className={TABLE_HEAD_DESC}>
                  단계마다 잡히는 날짜가 다릅니다 — 접수는 신청일, 계약은 계약금액 확정일, 확정
                  매출은 정산 확정일 기준입니다. 그래서 한 건이 서로 다른 달에 나타날 수 있습니다.
                </p>
              </div>
            </div>
            <div className={TABLE_SCROLL}>
              <table className={`${TABLE} min-w-[640px]`}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>월</th>
                    <th className={TH_NUM}>접수</th>
                    <th className={TH_NUM}>견적 금액</th>
                    <th className={TH_NUM}>계약</th>
                    <th className={TH_NUM}>계약금액</th>
                    <th className={TH_NUM}>확정 매출</th>
                  </tr>
                </thead>
                <tbody>
                  {revenue.monthly.map((m) => (
                    <tr key={m.key} className={TR}>
                      <td className={TD_ID}>{m.label}</td>
                      <td className={TD_NUM}>{m.submittedCount.toLocaleString("ko-KR")}건</td>
                      <td className={TD_NUM}>{num(m.submittedTotal)}원</td>
                      <td className={TD_NUM}>{m.contractedCount.toLocaleString("ko-KR")}건</td>
                      <td className={TD_NUM}>{num(m.contractedTotal)}원</td>
                      <td className={TD_NUM}>{num(m.settledTotal)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </section>

        <section className={s.revenueGroup}>
          <h2 className={s.sectionTitle}>월별 신청 추이 (최근 6개월)</h2>
          <div className="mt-3">
            <div className={TABLE_SCROLL}>
              <table className={TABLE}>
                <thead>
                  <tr className={THEAD_ROW}>
                    <th className={TH}>월</th>
                    <th className={TH_NUM}>신청 건수</th>
                    <th className={TH_NUM}>대관료 합계</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.monthly.map((m) => (
                    <tr key={m.key} className={TR}>
                      <td className={TD_ID}>{m.label}</td>
                      <td className={TD_NUM}>{m.count.toLocaleString("ko-KR")}건</td>
                      <td className={TD_NUM}>{num(m.total)}원</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
</>}<p className={s.note}>원안의 항목과 설명을 유지한 디자인 시안입니다. 표시된 데이터는 예시이며 실제 운영 상태가 아닙니다.</p></div>;
}
