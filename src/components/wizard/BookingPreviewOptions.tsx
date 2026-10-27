"use client";
import { PreviewChevron } from "./PreviewChevron";
import { Fragment, useState } from "react";
import type { ComponentProps } from "react";
import type { StepConfigOptions } from "./StepConfigOptions";
import { clampAddonQuantity, findPackage, isAddonAvailable, maxRequestableQuantity, midHallSelectableAddons, packagesForVenue } from "@/lib/pricing/rateTableUtils";
import { won } from "@/lib/format";
import { useWizardText } from "@/lib/content/wizardText";
import type { AddonItem } from "@/lib/pricing/types";
import s from "./BookingPreview.module.css";
type Props = ComponentProps<typeof StepConfigOptions>;
const categoryNames: Record<string,string> = {SPACE:'공간',FACILITY:'시설',PRODUCTION:'무대·장비',SERVICE:'운영 서비스',PROMOTION:'홍보',SCHEDULE:'추가 대관',UTILITY:'유틸리티',OTHER:'기타',FEE:'수수료',PREMIUM:'프리미엄'};
export function BookingPreviewOptions(props: Props) {
 const {rateTable,selection,onSelectPackage,onChangeQuantity,addonQuantities,onChangeRevenue,expectedRevenue,liveHallRateContent}=props;
 const {tStr}=useWizardText();
 const [venueTab,setVenueTab]=useState('arena');
 const [category,setCategory]=useState('전체');
 const [onlySelected,setOnlySelected]=useState(false);
 const simultaneous=selection.bookingMode==='SIMULTANEOUS';
 const mid=selection.venueId==='medium-hall'||(simultaneous&&venueTab==='medium-hall');
 const packages=packagesForVenue(rateTable,selection.venueId || 'arena');
 const pkg=findPackage(rateTable,selection.packageId);
 const options=mid?midHallSelectableAddons(rateTable):pkg?rateTable.addons.filter(a=>isAddonAvailable(a,pkg)&&a.visibility==='VISIBLE'&&a.billingPhase!=='SETTLEMENT'):[];
 const categories=['전체',...new Set(options.map(a=>a.category))];
 const activeCategory=categories.includes(category)?category:'전체';
 const selectedCount=options.filter(a=>(addonQuantities[a.id]||0)>0).length;
 const visible=options.filter(a=>(activeCategory==='전체'||a.category===activeCategory)&&(!onlySelected||(addonQuantities[a.id]||0)>0));
 function optionCard(a:AddonItem){
   const quantity=addonQuantities[a.id]||0,max=maxRequestableQuantity(a,mid?undefined:pkg);
   const set=(value:number)=>onChangeQuantity(a.id,clampAddonQuantity(a,mid?undefined:pkg,value));
   return <article key={a.id} className={s.optionCard} data-selected={quantity>0}>
    <h3>{a.name}</h3><p className={s.optionDescription}>{a.spec || a.note || "—"}</p><span className={s.optionPrice}>{a.pricingType==='REVENUE_PERCENT'?`매출 ${a.unitPrice}%`:a.unitPrice === 0 ? a.unitLabel.replace('원/','') : `${won(a.unitPrice)} / ${a.unitLabel.replace('원/','')}`}{max!==undefined&&` · 최대 ${max}`}</span>
    {a.pricingType==='REVENUE_PERCENT'?<label className={s.optionToggle}><input type="checkbox" checked={quantity>0} onChange={e=>set(e.target.checked?1:0)}/>적용</label>:<div className={s.quantity}><button type="button" aria-label={`${a.name} 수량 줄이기`} disabled={quantity<=0} onClick={()=>set(quantity-1)}>−</button><input type="number" min={0} max={max} aria-label={`${a.name} 수량`} value={quantity} onChange={e=>set(Number(e.target.value))}/><button type="button" aria-label={`${a.name} 수량 늘리기`} disabled={max!==undefined&&quantity>=max} onClick={()=>set(quantity+1)}>+</button></div>}
    {a.pricingType==='REVENUE_PERCENT'&&quantity>0&&<label data-field-size="medium" className={s.revenue}>예상 매출 (원)<input type="number" min={0} value={expectedRevenue} onChange={e=>onChangeRevenue(Math.max(0,Number(e.target.value)))}/></label>}
   </article>;
 }
 const cardKeys=["audienceCapacity","recommendedStage","recommendedSeating","baseFee"];
 const order=[...(props.fieldOrders?.["configOptions.packageCard"] ?? []).filter(key=>cardKeys.includes(key)),...cardKeys.filter(key=>!props.fieldOrders?.["configOptions.packageCard"]?.includes(key))];
 const visibleRows=props.disabledFields?.includes("configOptions.packageCard")?[]:order.filter(key=>!props.disabledFields?.includes(`configOptions.packageCard.${key}`));
 const heading=simultaneous?props.stepText.configSimultaneousTitle:mid?props.stepText.configMidHallOnlyTitle:props.stepText.configArenaTitle;
 const lead=simultaneous?props.stepText.configSimultaneousLead:mid?props.stepText.configMidHallOnlyLead:tStr('configOptions.previewLead','기본 구성을 고른 후 필요한 옵션을 추가하세요. 선택한 내용은 예상 견적에 반영됩니다.');
 return <section><div className={s.heading}><h2 data-preview-heading={mid?"configMidHallOnlyTitle":simultaneous?"configSimultaneousTitle":"configArenaTitle"}>{heading}</h2>{(!props.disabledFields?.includes("configOptions.arenaSummaryLead") || mid || simultaneous)&&<p>{lead}</p>}</div>
 {simultaneous&&<div className={s.segment}><button aria-pressed={!mid} onClick={()=>setVenueTab('arena')}>아레나</button><button aria-pressed={mid} onClick={()=>setVenueTab('medium-hall')}>중형공연장</button></div>}
 {!mid?<section data-preview-group="configOptions.packageCard" className={s.panel}><div className={s.sectionHead}><h3>기본 구성 <span className="text-danger" aria-label="필수">*</span></h3><p>수용인원과 권장 무대를 비교해 선택하세요.</p></div><div className={s.rates}>{packages.map(p=><button key={p.id} aria-pressed={selection.packageId===p.id} onClick={()=>onSelectPackage(p.id)}><div><b>{p.name}</b><span className={s.radio}>{selection.packageId===p.id&&<span/>}</span></div>{p.tagline&&<p>{p.tagline}</p>}<dl>{visibleRows.map(key=><Fragment key={key}><dt>{tStr(({audienceCapacity:"configOptions.audienceCapacityLabel",recommendedStage:"configOptions.recommendedStageLabel",recommendedSeating:"configOptions.recommendedSeatingLabel",baseFee:"configOptions.baseFeeLabel"} as Record<string,string>)[key],({audienceCapacity:"수용인원",recommendedStage:"권장 무대",recommendedSeating:"권장 객석",baseFee:"대관료"} as Record<string,string>)[key])}</dt><dd>{({audienceCapacity:p.audienceTier.label,recommendedStage:p.stageType,recommendedSeating:p.seatingType,baseFee:won(p.baseFeePerWeek)} as Record<string,string>)[key]}</dd></Fragment>)}{p.customCardRows.map((r,i)=><Fragment key={i}><dt>{r.label}</dt><dd>{r.value}</dd></Fragment>)}</dl><footer>{p.discountRatio>0&&<span><del>{won(p.baseFeePerWeek)}</del> · {Math.round(p.discountRatio*100)}% 할인</span>}<strong>{won(p.baseFeePerWeek-Math.round(p.baseFeePerWeek*p.discountRatio))}</strong><small>VAT 별도 · {p.dayBreakdown}</small></footer></button>)}</div>
 {pkg&&<details className={s.includes}><summary>기본 포함 항목 ({pkg.includedItems.length})<PreviewChevron/></summary><ul>{pkg.includedItems.map(inc=>{const a=rateTable.addons.find(a=>a.id===inc.addonId);return a?<li key={a.id}><b>{a.name}</b><span>{a.spec||`${inc.quantity} ${a.unitLabel.replace('원/','')}`}</span></li>:null;})}</ul></details>}</section>:<section className={s.panel}><div className={s.sectionHead}><h3>중형공연장 일자별 대관료</h3><p>1단계에서 선택한 준비일·공연일·철수일에 따라 계산됩니다.</p></div><div className={s.rateCards}>{[['준비일',rateTable.midHall.setupDayFee],['평일 공연',rateTable.midHall.performanceWeekdayFee],['주말 공연',rateTable.midHall.performanceWeekendFee]].map(([label,fee])=><div key={label}><span>{label}</span><strong>{won(Number(fee))}</strong><small>1일 · VAT 별도</small></div>)}</div><details className={s.includes}><summary>요금 및 기본 포함 내역<PreviewChevron/></summary><div className={s.referenceContent}><p>{liveHallRateContent.intro}</p><div className={s.rateCards}>{liveHallRateContent.columns.map(c=><div key={c.key}><b>{c.name}</b>{liveHallRateContent.rowLabels.map((label,i)=><p key={label}>{label}: {c.values[i]}</p>)}{liveHallRateContent.detailLabels.map((label,i)=><p key={label}>{label}: {liveHallRateContent.detailColumns.find(d=>d.key===c.key)?.values[i]}</p>)}</div>)}</div><ul>{liveHallRateContent.includes.map((r,i)=><li key={i}><b>{r.label}</b><span>{r.value}</span></li>)}</ul>{liveHallRateContent.limits.map((r,i)=><p key={i}>{r.label}: {r.value}</p>)}{liveHallRateContent.charges.map((r,i)=><p key={i}>{r.group} · {r.item}: {r.cost} {r.note}</p>)}{liveHallRateContent.notes.map((n,i)=><p key={i}>{n}</p>)}</div></details></section>}
 {(mid||pkg)&&<section className={s.panel}><div className={s.optionsTitle}><div className={s.sectionHead}><h3>선택 옵션 <em>{selectedCount}개 선택</em></h3><p>{tStr('configOptions.selectedOptionsHint','필요한 항목의 수량을 선택하세요.')}</p></div><label><input type="checkbox" checked={onlySelected} onChange={e=>setOnlySelected(e.target.checked)}/>선택 항목만 보기</label></div><div className={s.categoryTabs} role="group" aria-label="옵션 카테고리">{categories.map(c=><button key={c} aria-pressed={activeCategory===c} onClick={()=>setCategory(c)}>{categoryNames[c]||c}</button>)}</div><div className={s.optionTableScroll}><div className={s.optionGrid}>{visible.map(optionCard)}</div></div>{visible.length===0&&<p className={s.empty}>선택한 항목이 없습니다.</p>}<p className={s.optionNote}>{tStr('configOptions.selectedOptionsFooterNote','선택 옵션은 예상 수요 확인용입니다. 이용 실적을 기준으로 공연 종료 후 정산됩니다.')}</p></section>}
 </section>;
}
