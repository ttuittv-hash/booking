import { revalidatePath } from "next/cache";

// 회원 관리 화면 무효화 (2026-08-29).
//
// 승인 대기 · 처리 완료 · 회사별 담당자는 같은 경로(/admin/applicants)에 ?tab= 만 다른
// 세 화면이다. 지금까지는 변경 뒤 화면 쪽에서 router.refresh() 만 불렀는데, 그건
// **지금 보고 있는 경로의 Client Cache 만** 지운다. 그래서 처리 완료 탭에서 계정을
// 지워도, 탭을 옮기면 삭제 전에 받아 둔 회사별 담당자 화면이 그대로 나왔다.
//
// revalidatePath 는 Client Cache 를 통째로 비우므로 탭을 옮겨도 새로 받아 온다.
// 회원을 지우면 남은 사람이 없는 회사까지 지워지니(deleteUserCascade) 회사 상세도 같이
// 무효화한다 — "[id]" 는 특정 회사가 아니라 그 동적 경로 전체를 가리킨다.
export function revalidateMemberViews(): void {
  revalidatePath("/admin/applicants");
  revalidatePath("/admin/companies/[id]", "page");
}
