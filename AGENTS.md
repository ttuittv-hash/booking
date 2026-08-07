<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 기능정의서 업데이트 (필수)

`/admin/feature-spec` (마스터 관리자 전용)은 실제 DB(`feature_spec_sheets` 테이블)에
저장되는 라이브 내부 기획 문서다. 에이전트는 이 DB에 직접 쓸 수 없으므로(로그인 필요),
새 기능을 구현하거나 기존 동작을 바꾼 작업을 끝낼 때마다 **응답 마지막에** 문서에
반영할 내용을 정리해서 사용자에게 준다:

- 기존 행이 바뀌었으면: 어느 시트·어느 행(#)을 무엇으로 바꿔야 하는지
- 새 기능이면: 표 형태로 (#, 영역, 기능, 상세 정의, 검토 필요 사항) 붙여넣기 좋게 정리

사용자가 그대로 복사해서 `/admin/feature-spec`에 붙여넣을 수 있게 한다. 이 관례는
2026-08-07 세션에서 합의됨.
