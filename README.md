# 서울아레나 대관 견적·신청 시스템

Next.js(App Router) + TypeScript 기반 대관 견적·신청·심사·계약·정산 시스템.
DB는 **PostgreSQL**, 로그인은 자체 세션(JWT 쿠키) 기반입니다.
비밀번호는 클라이언트에서 SHA-256으로 해시해 전송하고, 서버에서 bcrypt로
한 번 더 해시해 저장합니다 (`src/lib/passwordScheme.ts` 참고).

## 로컬 실행

```bash
docker compose up -d   # 로컬 PostgreSQL 기동 (localhost:5433, db=seoularena)
npm install
npm run dev
```

http://localhost:3000 접속. 최초 실행 시 스키마가 자동 생성되고 운영자 계정이
자동 시드됩니다 (`admin` / `admin1234!`, `.env.example` 참고해 변경 가능).

별도 PostgreSQL을 쓰려면 `DATABASE_URL` 환경변수로 접속 문자열을 지정하세요.

## 테스트 / 빌드

```bash
npm run test    # 가격 계산 엔진 단위 테스트
npm run lint
npm run build && npm run start
```

빌드 시점에는 DB에 접속하지 않습니다(모든 페이지가 요청 시점 렌더링) —
DB 없이도 `npm run build`가 성공합니다.

## 배포 (Render 권장)

저장소 루트의 `render.yaml`(Blueprint)에 웹 서비스 + PostgreSQL + 업로드
파일용 영구 디스크가 모두 정의되어 있습니다.

1. [render.com](https://render.com) 가입/로그인
2. **New +** → **Blueprint** 선택
3. 이 저장소를 연결 — `render.yaml`을 Render가 자동으로 읽어 웹 서비스와
   PostgreSQL(`seoul-arena-db`)을 함께 만듭니다
4. `SEED_ADMIN_PASSWORD` 환경변수 값을 대시보드에서 입력 (초기 운영자 비밀번호)
5. **Apply** 클릭 → 빌드가 끝나면 서비스 URL이 발급됩니다
6. 운영자 계정: `SEED_ADMIN_EMAIL`(기본 `admin@seoularena.kr`) / 4에서 정한 비밀번호
   — 로그인 후 반드시 비밀번호를 변경하세요

업로드 파일(사업자등록증, 공지 이미지·첨부파일 등)은 여전히 영구 디스크
(`/var/data`)에 저장됩니다. DB 데이터는 PostgreSQL에 저장되므로 재배포·재시작에
안전합니다.

### 기존 SQLite 데이터 이전 (1회)

이전 버전(내장 SQLite)으로 운영하던 데이터가 있다면, 새 버전 배포 후
Render 쉘(Shell 탭)에서 한 번 실행:

```bash
node scripts/migrate-sqlite-to-pg.mjs   # $DATA_DIR/app.db → PostgreSQL
```

- 이미 존재하는 행(PK 충돌)은 건너뜁니다. 새로 시드된 admin/test 계정과
  이메일이 겹치는 기존 계정도 건너뜁니다.
- 이관된 기존 사용자는 첫 로그인 때 비밀번호 저장 방식이 자동으로 새 방식
  (bcrypt(sha256))으로 전환됩니다.

### 수동 설정 시 참고

- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Node 버전: 22 이상
- 환경변수: `DATABASE_URL`(PostgreSQL 접속 문자열)과 `AUTH_SECRET`(임의의 긴
  문자열) 필수 — production에서 `AUTH_SECRET`이 없으면 서버가 기동을 거부합니다.
  그 외 `.env.example` 참고
