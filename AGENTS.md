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


# DB는 PostgreSQL이다 (2026-08-11 이관 완료)

**`node:sqlite` / `DatabaseSync` 는 더 이상 쓰지 않는다.** 학습 데이터나 예전 코드에
남아 있는 파일 DB(`data/app.db`) 패턴을 그대로 따라 쓰면 안 된다.

- 접속은 `src/lib/db.ts` 의 커넥션 풀 하나만 쓴다(`pg`). 자리표시자는 `$1, $2` 형식.
- **`db.ts` 의 모든 조회/변경 함수는 async 다 — 호출할 때 반드시 `await`.**
  특히 권한 검사에서 빼먹으면 조용히 뚫린다:
  ```ts
  if (!canAccessQuote(user, quote)) ...        // ✗ Promise 는 항상 truthy → 검사 무력화
  if (!(await canAccessQuote(user, quote))) ... // ✓
  ```
  같은 이유로 `if (await findUserByUsername(x))` 처럼 조건식에 쓰는 곳도 확인할 것.
- 스키마 변경은 `src/lib/db.ts` 의 `initSchema()` 에 한다 — 신규 테이블은
  `CREATE TABLE IF NOT EXISTS`, 기존 테이블 컬럼 추가는
  `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. 앱이 기동 후 첫 쿼리 직전에 한 번
  실행하며(advisory lock), 별도 마이그레이션 도구는 쓰지 않는다.
- 목록 화면에서 행마다 `findUserById()` 를 부르지 말 것(N+1). `listUsersByIds()` 처럼
  한 번에 읽어 `Map` 으로 만든다.
- 로컬 개발: `docker-compose up -d` (PostgreSQL 호스트 포트 5433) + `.env.example` 복사.
- 비밀번호는 v2 스킴 — 클라이언트가 SHA-256 해시로 보내고 서버가 bcrypt로 감싸 저장한다
  (`src/lib/passwordScheme.ts`). 시드/변경 코드를 새로 쓸 때 평문을 bcrypt 하면 로그인이
  안 된다. 기존 SQLite에서 이관된 계정은 `password_scheme='v1'` 로 표시되고 첫 로그인 때
  자동 승격된다.
- 리치텍스트(공지·안내 페이지 본문)는 저장할 때와 렌더링할 때 모두
  `sanitizeRichText()` 를 거친다 — `dangerouslySetInnerHTML` 앞에서 빼먹지 말 것.

## 배포 (판교 온프레미스 k8s)

`arena` 네임스페이스에 PostgreSQL StatefulSet + 앱 Deployment 로 뜬다. 매니페스트와
운영 문서는 인프라 repo 의 `application/arena/README.md`. 필수 환경변수는
`DATABASE_URL`, `AUTH_SECRET`(운영에서 없으면 기동 거부), 최초 1회 `SEED_ADMIN_PASSWORD`.

**업로드 파일은 로컬 디스크(`DATA_DIR`)에 저장되고 PVC 가 RWO 라 replicas 는 1 고정이다.**
스케일아웃하려면 파일 저장소부터 오브젝트 스토리지로 옮겨야 한다.
파일을 읽고 쓰는 라우트는 반드시 `DATA_DIR` 기준 경로를 쓴다(`process.cwd()` 금지 —
배포 환경에서 경로가 갈려 404 난다).
