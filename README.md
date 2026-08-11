# 서울아레나 대관 견적·신청 시스템

Next.js(App Router) + TypeScript 기반 대관 견적·신청·심사·계약·정산 시스템.
DB는 **PostgreSQL**, 로그인은 자체 세션(JWT 쿠키) 기반입니다. 업로드된 첨부파일만
로컬 디스크(`DATA_DIR`)에 저장합니다.

## 로컬 실행

PostgreSQL 이 필요합니다(예: `docker run -e POSTGRES_PASSWORD=... -p 5432:5432 postgres:17`).

```bash
cp .env.example .env.local   # DATABASE_URL, AUTH_SECRET, SEED_ADMIN_PASSWORD 채우기
npm install
npm run dev
```

http://localhost:3000 접속. 스키마는 첫 요청 때 자동 생성되고, 운영자가 한 명도 없으면
`SEED_ADMIN_*` 환경변수로 최초 운영자 계정이 만들어집니다.

## 테스트 / 빌드

```bash
npm run test    # 가격 계산 엔진 단위 테스트
npm run lint
npm run build && npm run start
```

## 배포

판교 온프레미스 Kubernetes(namespace `arena`)에 배포합니다. 매니페스트와 배포 절차는
인프라 repo 의 `application/arena/` 를 참고하세요. 이미지는 저장소 루트의 `Dockerfile`
(Node 24 / `next start`) 로 빌드합니다.

필수 환경변수는 `.env.example` 참고 — `DATABASE_URL`, `AUTH_SECRET` 은 없으면 기동에
실패하고, `SEED_ADMIN_PASSWORD` 는 최초 운영자 계정 생성 시에만 필요합니다.
