import { PANEL, SUB_TITLE, HELP } from "./adminUi";

/**
 * YOUR STAGE 4개 페이지의 수치는 2026-08 정보구조 재구성으로 CMS 에서 코드 정본으로 옮겼다.
 *
 * 이유 — 제원 수치는 마케팅 카피가 아니라 시설소개자료 PDF 를 정본으로 하는 사실이다.
 * 두 곳에서 편집할 수 있으면 반드시 어긋나고, 수치 불일치는 대관 분쟁의 씨앗이 된다.
 * 편집 가능한 자리를 남겨 두면 "고쳤는데 화면이 안 바뀐다"는 더 나쁜 상태가 된다.
 */
export function VenueFactsNotice() {
  return (
    <div className={PANEL}>
      <h3 className={SUB_TITLE}>시설 정보는 코드 정본으로 관리합니다</h3>
      <p className={`mt-3 ${HELP}`}>
        시설 개요 · 무대 특장 · 시설 제원 · 부대시설 네 페이지의 수치는{" "}
        <code className="font-bold">src/lib/content/venueFacts.ts</code> 한 곳에서 관리하며,
        시설소개자료 PDF V1.0 (2026-08-18)을 정본으로 삼습니다. 이 화면에서 편집할 수 없습니다.
      </p>
      <ul className={`mt-4 list-disc space-y-1 pl-5 ${HELP}`}>
        <li>PDF 가 개정되면 개발팀에 갱신을 요청하고, 개정 이력과 함께 배포합니다.</li>
        <li>근거가 확인되지 않은 수치는 화면에 올리지 않습니다. 확정 전에는 “확정 후 안내”로 둡니다.</li>
        <li>요금 수치는 이 파일이 아니라 요금표 관리(대관료) 화면이 소유합니다.</li>
      </ul>
    </div>
  );
}
