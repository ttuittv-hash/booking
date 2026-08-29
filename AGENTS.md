<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

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

업로드 파일은 로컬 디스크(`DATA_DIR`)에 저장되지만 볼륨이 **CephFS(RWX)** 라
pod 를 여러 개 띄울 수 있고 롤링 업데이트도 된다. 파일을 읽고 쓰는 라우트는 반드시
`DATA_DIR` 기준 경로를 쓴다(`process.cwd()` 금지 — 배포 환경에서 경로가 갈려 404 난다).

pod 를 여러 개 띄울 수 있으므로, **프로세스 메모리에 상태를 두면 안 된다**(카운터·캐시 등).
레이트리밋 카운터가 그래서 `rate_limits` 테이블에 있다.

## 알림은 스케줄러가 보낸다

세금계산서 미입금(5일 간격)·티켓오픈 자료 미업로드(D-30)·시설회의 자료 미업로드(D-7)
알림은 CronJob(`arena-reminders`, 매일 09:00 KST)이 `POST /api/internal/reminders` 를
호출해 발송한다(`src/lib/reminders.ts` 의 `runReminderSweep`).

**화면 조회 시점에 알림을 보내는 코드를 다시 넣지 말 것.** 예전에 그렇게 돼 있었는데,
아무도 그 화면을 열지 않으면 알림이 누락되고 조회(GET)가 DB 쓰기를 유발했다.
새 알림 종류를 추가할 때도 `runReminderSweep` 안에 넣는다.


## 사업자 진위확인 (NICE 법인실명확인)

법인회원 가입 시 사업자등록번호로 상호·대표자·기업상태를 조회한다(`src/lib/nice.ts`).

- `NICE_CLIENT_ID`/`NICE_CLIENT_SECRET` 이 없으면 **조회를 건너뛰고 가입은 그대로 진행**된다.
  외부 서비스 장애로 가입이 막히면 안 되므로, 조회 실패도 마찬가지로 가입을 막지 않고
  `companies.verification_status = 'UNCHECKED'` 로 남긴다.
- 휴업(7)·폐업(8)·부도(6)로 확인되면 가입을 **차단**한다.
- 상호·대표자명이 입력값과 다르면 차단하지 않고 기록만 한다(표기 차이가 흔하다).
  운영자 심사 화면(`/admin/applicants/[id]`)에 뱃지와 함께 노출된다.
- 접근 IP 제한이 있는 서비스다 — 서버 아웃바운드 IP를 NICE 이용기관 포털에 등록해야 한다.

# E2E 실행 전제 (dev)

E2E 스펙은 `/tmp/arena-dev-stub.env`(`NICE_AUTH_DEV_STUB=…`)를 읽어 우회 인증 헤더를 붙인다. `/tmp` 는
재부팅·계정 전환으로 비워지므로 `ENOENT: /tmp/arena-dev-stub.env` 가 나면 dev 시크릿에서 복원한다:
`kubectl --kubeconfig=../tmp/pangyo/kubeconfig/pangyo-kubeconfig --insecure-skip-tls-verify -n arena-dev get secret arena-secret -o jsonpath='{.data.NICE_AUTH_DEV_STUB}' | base64 -d`
→ `NICE_AUTH_DEV_STUB=<값>` 한 줄로 저장. 실행 순서: `./e2e/reset-dev.sh` → full-flow → register → wizard → validation → api →
layout → admin-layout → `U=<승인된 m… 아이디> node e2e/features.spec.mjs` → `PHONE=<번호> node e2e/alimtalk.spec.mjs`.

# 브랜치 운영 (2026-08-21 합의)

| 브랜치 | 역할 | 배포 대상 |
|---|---|---|
| `feat/phase-1` | 개발 통합 정본. 모든 작업이 여기로 모인다 | `arena-dev` (dev) |
| `release/vX.Y.Z` | 운영에 나간 코드 그대로(현재 `release/v1.0.0`). **직접 커밋 금지** | `arena` (운영, ArgoCD) |

- 운영 배포 = dev 에서 검증된 `feat/phase-1` 커밋으로 `release` 를 fast-forward
  하고(새 릴리스면 `release/vX.Y.Z` 새로 생성), `vX.Y.Z` 태그를 남긴 뒤 `tmp/pangyo` 의
  `application/arena/manifests.yaml` 이미지 태그를 올려 커밋·푸시한다(ArgoCD 자동 sync).
- 협업 브랜치는 두 갈래가 들어온다: `design/venue-booking-ui`(디자이너)와
  `claude/venue-fee-spec-revamp`(다른 세션의 기능 작업). **디자인 브랜치가
  기능 브랜치를 먼저 흡수하는 패턴**이므로, 보통 디자인 브랜치 하나만 병합하면 된다.
  병합 때마다 확인할 것: ① 레거시 isPendingApplicant 게이트 부활(세 번 재발)
  ② 기획서 A13 링크·A15 매트릭스 ③ 잠긴 버튼 패턴 ④ toLocale* 시간대 의존.
- 운영/개발 환경 차이는 시크릿·env 로만 낸다. dev 전용: `NICE_AUTH_DEV_STUB`,
  `SEED_SAMPLE_COMPANY=true`. 운영 전용: 별도 `FIELD_*` 암호화 키.


## 2026-08-28 보안·성능 점검에서 정한 것

- 신청서 API(`/api/quotes*` 의 신청자 쪽 변경)는 `canActOnQuotes(user)`(승인 완료 또는 운영자)를 거친다 —
  화면만 막고 API 는 로그인만 보던 구멍. 새 신청자 변경 라우트를 만들면 이 검사를 넣을 것.
- `/api/admin/feature-spec/*` 는 운영자 로그인 필수(예전 "로그인 없이" 요청은 인증 자체가 없어 외부에서 덮어쓸 수 있었음).
- `publicOrigin()` 은 호스트 헤더를 우리 도메인(`(bo|partner).(dev.)?seoularena.net`, localhost)만 믿는다.
  다른 호스트는 `PUBLIC_TRUSTED_HOSTS`(쉼표) 로 추가. 위조 헤더가 초대·인증 링크에 박히는 걸 막는다.
- 회원가입은 본인인증 결과의 휴대폰(`identity.mobileNo`)을 저장한다(입력값 무시). 첨부 URL 은
  `/api/auth/register/attachment/{uuid}.{ext}` 형식만 받는다. 회사 정보 수정은 대표 담당자만.
- `getCurrentUser` 는 `React.cache` — 요청당 1회. `notifyAdmins` 는 INSERT…SELECT 한 문장.
  운영자 신청서 상세는 독립 조회를 `Promise.all` 로. 자주 쓰는 WHERE/ORDER 컬럼 인덱스는 `initSchema` 끝에 추가.
- 미사용 export·기본 SVG·SQLite 이관 스크립트는 지웠다. 새로 지울 땐 grep 으로 확인 후 삭제(자동 도구 없음).

## 회원 삭제(운영자) — 탈퇴와 다르다

`/admin/applicants` 승인 대기·처리 완료 표의 [삭제] → `DELETE /api/admin/users/{id}` →
`deleteUserCascade()`. 탈퇴(`withdrawn_at`)는 명의·휴대폰이 남아 같은 사람이 재가입 못 하지만,
삭제는 users 를 참조하는 모든 테이블을 카탈로그에서 찾아 지우고(세이브포인트로 자식→부모 재시도),
담당자가 남지 않으면 회사도 지워 같은 사업자번호로 최초 가입자로 다시 올 수 있게 한다.
회사당 MASTER 는 유니크(`idx_users_company_master`) — 대표를 바꿀 때 `ensureCompanyMaster` 가
옛 MASTER 표시를 먼저 내린다(탈퇴한 옛 대표가 MASTER 로 남아 충돌한 적 있음, 2026-08-27).

## 카카오 알림톡 (DK테크인 BizMsg)

`src/lib/message/kakaoBizTalk.ts`. 환경변수 `BIZTALK_*` 5종(BASE_URL·CLIENT_ID·CLIENT_SECRET·
SENDER_KEY·**SENDER_NO**)이 모두 있어야 채널이 켜진다 — 없으면 인앱 알림만 나간다.

2026-08-25 검증(CBT) 서버 실측으로 확정된 것:
- **알림톡도 `sender_no`(발신번호) 필수**. 발신번호 사전등록은 유저웹(서류 첨부)에서만 된다.
- 발송 경로 `/v2/request/{cid}/kakao` 의 cid 는 어떤 값이든 경로로 인정된다(발송 이력 id 사용,
  `BIZTALK_CID` 로 덮어쓰기 가능).
- 템플릿은 MNG API(`/mng/v1/template/create`, 토큰은 `/mng/v1/oauth/token`)로 등록한다.
  MB-01~07 은 등록됨(kepStatus I=검수 진행중). 본문은 `templates.ts` 와 글자 단위로 같아야 한다 —
  템플릿 문구를 고치면 MNG 에서도 수정(`template/modify`)해야 발송이 거절되지 않는다.
- `API_402 발송 권한 없음` 은 코드 문제가 아니라 DKT 쪽 계정 활성화 전 상태다.
- 결과 폴링 응답의 그룹번호 키는 `report_group_no`. 완료 처리는 **PUT** `/v2/info/message/results/complete/{그룹번호}`
  — HTTP 는 항상 200 이고 본문 `code` 로 성패. 안내 메일의 `cbt-ceb` 호스트는 DNS 없는 오타.
- 공식 스펙(v2.2.1, 2026-05-28 개정) 기준으로 맞춘 것: 발송 body 에 `subtitle` 은 없다(강조 부제목은 템플릿
  등록값 고정, `title` ≤50자만 보냄) / 폴링 결과 필드는 `status_code`·`error_message`·`kko_status_code`
  (`state_code` 는 구 표기) / 실패 상세코드 `result.detail_code`(ERRxxxxx) 로 분류 — ERR11000 수신거부→문자 대체,
  ERR50025 번호 오류, ERR41001 미등록 템플릿·ERR42009 세칙검사 불통과→템플릿 오류. 결과 수신은 polling 외에
  webhook(POST JSON, 2xx 응답, uid/cid 멱등)도 가능하나 URL 을 DKT(Kicm.dkt@kakaocorp.com)에 등록해야 해서 미도입.
- 2026-08-26 CBT 실발송 성공(발신번호 070-8080-5634, DKT 등록). dev 매니페스트에 `BIZTALK_SENDER_NO` 와
  **`BIZTALK_RECIPIENT_ALLOWLIST`**(쉼표 구분 번호)가 있다 — 목록 밖 번호는 외부 발송을 건너뛰고
  `message_sends.status='SKIPPED'` 로 남긴다(E2E 가짜 번호 오발송 방지, `src/lib/message/allowlist.ts`).
  운영에는 허용목록을 두지 않는다. 회원가입 "개발용 우회" 버튼은 알림톡 받을 번호를 물어 `stubPhone` 으로 보낸다.
- 2026-08-28: dev 허용목록 제거(전원 발송, 실사용 테스트). 신청서(대관) 이벤트 알림톡 **RT-01~09**
  (`templates.ts` QUOTE_TEMPLATES, 코드 = 카카오 코드) — `src/lib/message/quoteEvents.ts`
  `notifyQuoteApplicant()` 로 보내며 라우트의 기존 인앱 알림(createNotification)은 그대로 두고
  `inApp:false` 로 알림톡만 얹는다. **트랜잭션 밖에서 호출**할 것(백그라운드 발송이 커밋된
  커넥션을 물면 안 된다). 템플릿 등록은 `scripts/biztalk-register-templates.mjs`(MNG create, 파드 안에서).
  MNG 로 만든 템플릿은 바로 검수 진행(kepStatus I)에 들어간다 — 승인(O) 전엔 카카오가 거절한다.
- 2026-08-28 버튼 링크는 템플릿 등록값 고정(수정 시 재검수·발송 중단). dev 링크용 **신규** 템플릿
  `MB-02/03/04/07/08/09-DEV` 를 CBT 에 등록(검수 중). 승인되면 dev 매니페스트에
  `BIZTALK_TEMPLATE_OVERRIDES=MB-02=MB-02-DEV,…` + `BIZTALK_BUTTON_URL=https://partner.dev.seoularena.net/`
  를 넣어 갈아탄다(`src/lib/message/templateOverrides.ts`, 코드 배포 불필요). 둘은 항상 함께.
  PC 카카오톡에 버튼이 보이려면 템플릿에 `linkPc` 가 있어야 한다 — `MB-0x-DEV-PC` 6종을 PC 링크 포함으로
  따로 등록(검수 중은 수정 불가 API_4434, 삭제 API 없음). 그걸로 갈아탈 땐 `BIZTALK_BUTTON_PC=true` 도 같이
  (없는데 url_pc 를 보내면 3027). 운영 템플릿 등록 때도 PC 링크를 넣을 것.
- 점검: `kubectl -n arena-dev exec deploy/arena -- node scripts/biztalk-check.mjs` (클러스터 안에서만
  닿는다 — 방화벽이 발신 IP 211.213.60.30 기준).
