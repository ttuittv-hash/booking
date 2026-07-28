# 서울아레나 대관 견적·신청 시스템

Next.js(App Router) + TypeScript 기반 대관 견적·신청·심사·계약·정산 시스템.
DB는 내장 `node:sqlite`(파일 기반), 로그인은 자체 세션(JWT 쿠키) 기반입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

http://localhost:3000 접속. 최초 실행 시 운영자 계정이 자동 생성됩니다
(`admin@seoularena.kr` / `admin1234!`, `.env.example` 참고해 변경 가능).

## 테스트 / 빌드

```bash
npm run test    # 가격 계산 엔진 단위 테스트
npm run lint
npm run build && npm run start
```

## 배포 (Render 권장)

이 앱은 로컬 SQLite 파일과 로컬 디스크에 업로드 파일을 저장합니다. **Vercel 같은
서버리스 플랫폼은 배포 시 파일시스템이 읽기 전용이라 코드 수정 없이는 동작하지
않습니다.** Render, Railway처럼 일반 Node.js 서버로 계속 떠 있는 플랫폼을 쓰면
코드 수정 없이 그대로 배포됩니다.

### Render로 배포하기

1. [render.com](https://render.com) 가입/로그인 (GitHub 계정으로 로그인 추천)
2. **New +** → **Blueprint** 선택
3. 이 저장소(`ttuittv-hash/booking`)를 연결 — 저장소 루트의 `render.yaml`을
   Render가 자동으로 읽어 빌드/실행 명령과 환경변수를 구성합니다
4. **Apply** 클릭 → 빌드가 끝나면 `https://seoul-arena-booking-XXXX.onrender.com`
   같은 URL이 발급됩니다
5. 운영자 계정: `admin@seoularena.kr` / `admin1234!` (배포 후 반드시 변경 권장)

무료 플랜은 15분간 요청이 없으면 슬립 상태가 되고, 슬립 상태에서 재시작되면
로컬 디스크 데이터(신청 내역, 첨부파일 등)가 초기화됩니다. 데모/미리보기 용도로는
충분하지만, 실제 운영 데이터를 유지하려면 외부 DB(Postgres 등)와 파일
스토리지(S3 등) 연동이 필요합니다.

Render 대시보드에서 직접 Web Service를 만들 경우 수동 설정값:
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Node 버전: 22 이상 (`node:sqlite` 사용)
- 환경변수: `AUTH_SECRET`(임의의 긴 문자열) 필수, 그 외 `.env.example` 참고
