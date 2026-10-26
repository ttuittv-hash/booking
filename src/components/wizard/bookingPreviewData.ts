import { buildSeedRateTable } from "@/lib/pricing/seed";
import { DEFAULT_SCREEN_TEXT_CONTENT, DEFAULT_RATES_CONTENT } from "@/lib/content/pageContent";
import type { AddonItem } from "@/lib/pricing/types";
// Public-facing values transcribed from the authenticated application UI, 2026-10-08.
// Booking availability is deliberately illustrative so every interaction can be reviewed locally.
const arenaIncludes = [
 ['아레나 야외 광장','3,861㎡'],['아레나 티켓박스','17개 창구'],['하역 공간','604㎡'],['대기실','14개실(B1F 8실, 1F 6실)'],['부속공간','9개실(식당,프레스룸,다목적실,운영사무실 등)'],['스카이박스','1개실'],['마더트러스','5SET (A/B/C/L/R)'],['리덕션 커튼','1SET (L, R)'],['스마트 스테이지','2EA (2.73m x 4.55m)'],['계단 LED','1 SET'],['딜레이 스피커','6 Point (12 Line Array)'],['프로덕션 전력','조명, 음향, 영상, 특효 등'],['주차 공간','200대'],['미화','기본 미화 및 특효류 포함'],
];
const mediumIncludes = [['중형공연장 야외 광장','1,080㎡'],['티켓박스','5개 창구'],['하역 공간','180㎡'],['수도광열비','냉난방비 수도비 포함'],['대기실 / 다목적실','5개실 (2F 1실·3F 4실) / 2개실'],['샤막','25m x 13m'],['팔로우 스팟','4개'],['무대 리프트','3개 (24m x 4m)'],['프로덕션 전력','조명, 음향, 영상, 특효 등'],['주차 공간','100대'],['미화','기본 미화 및 특효류 포함']];
function addon(id:string,name:string,category:AddonItem['category'],unitPrice:number,unitLabel:string,spec:string,max?:number,venueId:AddonItem['venueId']='arena'):AddonItem {
 return {id,name,category,unitPrice,unitLabel,spec,venueId,pricingType:'PER_DAY',availability:{mode:'ALWAYS',maxAddQuantity:max??'UNLIMITED'},visibility:'VISIBLE',billingPhase:'ESTIMATE'};
}
export function buildBookingPreviewRates(){
 const rates=structuredClone(buildSeedRateTable());
 const prices=[518300000,547700000,613100000,660300000];
 rates.packages.filter(p=>p.venueId==='arena').forEach((p,i)=>{
  p.baseFeePerWeek=prices[i];p.discountRatio=.1;p.tagline='';p.stageType=i<2?'END STAGE':'CENTER STAGE';p.seatingType='';
  p.audienceTier.label=['up to 12,000','up to 15,000','up to 18,000','over 18,000'][i];
  p.includedItems=arenaIncludes.map((_,i)=>({addonId:`preview-included-${i}`,quantity:1}));
 });
 rates.addons=[...arenaIncludes.map(([name,spec],i)=>({...addon(`preview-included-${i}`,name,'FACILITY',0,'',spec),visibility:'ITEM_ONLY' as const})),
  addon('booth','상업 부스','SPACE',50000,'원/㎡','아레나 야외 광장 (설치면적x사용일수 부과)'),
  addon('popup','팝업 부스','SPACE',0,'원/별도 협의','상업 시설 내 일부 공간',1),
  addon('practice_room','연습실','SPACE',1000000,'원/일','지하 1층 (379.97m²)',1),
  addon('center_lift','센터리프트','PRODUCTION',1500000,'원/일','플로어 (5,000mm x 5,000mm)',1),
  addon('follow_spot','팔로우 스팟','PRODUCTION',150000,'원/개⋅일','1,800W',15),
  addon('wireless_intercom','무선인터컴','PRODUCTION',30000,'원/팩','',20),
  addon('broadcast','송출수수료','FEE',0,'원/회⋅3%','온라인 티켓 매출 수수료'),
  addon('advertising','옥외 광고구좌','PROMOTION',0,'원/별도 협의','위치·규격별 상이',1),
  addon('utilities','수도광열비','UTILITY',0,'원/사후 정산',''),
  addon('parking_extra','추가 주차권','SERVICE',12000,'원/개','아레나',50),
  addon('mid_booth','상업 부스','SPACE',50000,'원/㎡','중형 야외 광장 (설치면적x사용일수 부과)',undefined,'medium-hall'),
  addon('mid_practice','연습실','SPACE',1000000,'원/일','지하 1층 (379.97m²)',1,'medium-hall'),
  addon('mid_ad','옥외 광고구좌','PROMOTION',0,'원/별도 협의','위치·규격별 상이',undefined,'medium-hall'),
  addon('mid_broadcast','송출 수수료','FEE',0,'원/회⋅3%','온라인 티켓 매출 수수료',undefined,'medium-hall'),
  addon('mid_parking','추가 주차권','SERVICE',12000,'원/개','중형 공연장',20,'medium-hall'),
 ];
 rates.midHall={...rates.midHall,setupDayFee:13900000,performanceWeekdayFee:21400000,performanceWeekendFee:25000000,secondShowSurchargeRatio:.25,cleaningUnitPrice:0};
 return rates;
}
export const previewLiveHallContent = {
 ...DEFAULT_RATES_CONTENT.liveHall,
 rowLabels:['금액'],columns:[{key:'setup',name:'평일/주말 준비 RATE',values:['13,900,000원/일당']},{key:'weekday',name:'평일 공연 (월~목) RATE',values:['21,400,000원/일당']},{key:'weekend',name:'주말 공연 (금~일) RATE',values:['25,000,000원/일당']}],
 detailLabels:[],detailColumns:[],charges:[],includes:mediumIncludes.map(([label,value])=>({label,value})),
 limits:[{label:'기준 공연시간',value:'1회 기준 최대 3시간 (180분)'},{label:'1일 2회 공연',value:'1일 공연 추가 대관료의 25% 할증'},{label:'기본 이용시간',value:'09:00–22:00'},{label:'이용 제한시간',value:'12:00–13:00 / 18:00–19:00'}],
 notes:['상기 금액은 모두 부가세 별도 입니다.','이용 제한시간의 변경은 별도 협의 가능합니다.','운영 상황에 따라 목록에 포함되지 않은 추가적인 부대사용료가 발생할 수 있습니다.'],
};
export const previewScreenText={
 ...DEFAULT_SCREEN_TEXT_CONTENT,
 wizardDisabledFields:['performanceInfo.applicantCompanyType','performanceInfo.eventTypes','performanceInfo.ageRating','performanceInfo.seatingTypes','performanceInfo.stageTypes','audience.ancillaryPlans','configOptions.packageCard.recommendedSeating'],
 wizardSteps:{...DEFAULT_SCREEN_TEXT_CONTENT.wizardSteps,performanceInfoTitle:'신청할 공연을 알려주세요',marketingTitle:'마케팅 및 프로모션 계획'},
 wizardStrings:{
 'venue.arena.name':'아레나','venue.medium-hall.name':'중형공연장','venue.special-hall.name':'All in One',
 'stepNav.step.applicantInfo':'대관사 및 행사 정보','stepNav.step.marketing':'마케팅 및 프로모션 계획',
 'configOptions.selectedOptionsHint':'필요한 항목의 예상 수량을 선택해 주세요.',
 'configOptions.selectedOptionsFooterNote':'선택 옵션은 대관 신청 단계에서 예상 수요를 사전에 파악하기 위한 항목입니다. 실제 이용 여부와 사용량은 공연 준비 및 운영 과정에서 최종 확정되며, 이용 실적을 기준으로 공연 종료 후 정산됩니다.',
 'performanceInfo.applicantSectionHeading':'대관사 정보','performanceInfo.applicantCompanyNameLabel':'대관사명',
 'performanceInfo.applicantSectionHint':'실제 계약 체결 주체의 정보를 기입합니다. ※ 대관사와 실제 계약주체가 상이할 경우 별도 사업자등록증 별첨 필수',
 'performanceInfo.pastPerformancesLabel':'대관사 실적(최근 3년)','performanceInfo.applicantContactNameLabel':'성명',
 'performanceInfo.eventBasicsSectionHeading':'공연⋅행사 정보','performanceInfo.eventBasicsSectionHint':'신청하는 공연⋅행사의 세부적인 정보를 기입합니다.',
 'performanceInfo.eventNameLabel':'공연⋅행사명','performanceInfo.artistLabel':'아티스트⋅출연자명','performanceInfo.organizerLabel':'주최⋅주관⋅기획 정보',
 'performanceInfo.artistHistoryGroupLabel':'공연⋅행사 세부 정보','performanceInfo.artistMainHistoryLabel':'① 아티스트⋅출연자 주요 이력','performanceInfo.artistRecentPerformancesLabel':'② 공연⋅행사 이력(최근 3년)',
 'performanceInfo.credibilitySectionHeading':'개최 신뢰성','performanceInfo.credibilitySectionHint':'출연 계약 증빙(계약서⋅출연확약서)의 금액⋅개인정보는 마스킹 제출 가능합니다.',
 'audience.sectionHeading':'공연⋅행사 판매 규모','audience.ticketTypesLabel':'티켓 상품 예상 구성','marketing.channelsHeading':'공연⋅행사 프로모션','marketing.channelsHint':'예정하는 홍보 및 프로모션 채널을 기입합니다.',
 },
};
