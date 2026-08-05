# 리디자인 미리보기 배포

## 왜 기존 링크로는 안 보이는가

`render.yaml` 의 배포 브랜치가 고정되어 있습니다.

```yaml
services:
  - type: web
    name: seoul-arena-booking
    branch: claude/seoul-arena-booking-system-k6ivh4   # ← 여기
```

`seoul-arena-booking.onrender.com` 은 이 브랜치만 배포합니다. `design/venue-booking-ui` 에 무엇을
올려도 그 URL에는 반영되지 않습니다.

이 파일은 그래서 `render.yaml` 을 **수정하지 않았습니다.** 디자인 브랜치의 `render.yaml` 을 건드리면
나중에 블루프린트를 동기화할 때 운영 중인 서비스 설정까지 함께 바뀔 수 있습니다.

---

## 방법 A — 브랜치만 잠깐 바꿔 보기 (가장 빠름, 추가 비용 0)

Render 대시보드 → `seoul-arena-booking` 서비스 → **Settings → Build & Deploy → Branch** 를
`design/venue-booking-ui` 로 바꾸고 저장하면 자동 재배포됩니다. 확인이 끝나면 원래 브랜치로 되돌립니다.

- 장점: 필드 하나, 비용 없음, 기존 URL 그대로
- 주의: 되돌리기 전까지 기존 프로토타입 URL이 새 디자인을 보여줍니다. 공유 중이라면 방법 B.
- 주의: 디스크(`/var/data`)를 공유하므로 **기존 저장 데이터가 그대로 쓰입니다.** 홈 콘텐츠는
  스키마가 개정되었으니 `/admin/content` → 홈 → **"최신 기본값 불러오기"** 를 눌러 브랜드 내러티브를
  불러온 뒤 저장하세요. 누르지 않으면 예전 MISSION/VISION 문구가 남아 히어로가 옛 카피로 보입니다.

## 방법 B — 별도 미리보기 서비스 만들기 (권장)

Render 대시보드 → **New + → Web Service** → `ttuittv-hash/booking` 연결

| 항목 | 값 |
|---|---|
| Name | `seoul-arena-booking-design` |
| Branch | `design/venue-booking-ui` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |

환경변수

| Key | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `DATA_DIR` | `/var/data` |
| `AUTH_SECRET` | 아무 랜덤 문자열 (Generate) |
| `SEED_ADMIN_EMAIL` | `admin@seoularena.kr` |
| `SEED_ADMIN_PASSWORD` | 임의 값 (미리보기용) |

- 디스크는 **붙이지 않아도 됩니다.** 미리보기라면 재배포 시 데이터가 초기화되는 게 오히려 낫습니다 —
  빈 DB로 뜨면서 `seed.ts` 의 새 기본값(브랜드 내러티브, Notion 수치)이 그대로 반영됩니다.
  디스크를 붙이려면 `DATA_DIR` 과 같은 경로(`/var/data`)로 마운트하세요.
- 결과 URL: `https://seoul-arena-booking-design.onrender.com`
- 첫 배포는 3~5분 걸립니다.

## 방법 C — PR 미리보기

블루프린트에서 Preview Environments 를 켜두면 `design/venue-booking-ui` → 기본 브랜치로 PR을 열 때
미리보기 URL이 자동 생성됩니다. 이미 켜져 있다면 PR만 열면 됩니다.

---

## 미리보기에서 확인할 계정

빈 DB로 처음 뜨면 서버 로그에 시드 계정이 출력됩니다.

- 운영자: `admin` / `SEED_ADMIN_PASSWORD` 로 넣은 값
- 신청자(승인 완료 상태): `test` / `test1234!` — 로그인 구간(`/packages`, `/apply`, `/mypage`) 확인용

**미리보기 배포 후 비밀번호를 반드시 바꾸세요.**

## 확인 경로

| | 경로 |
|---|---|
| 공개 | `/` `/venue` `/guide` `/guide/forms` `/guide/image-guide` `/notices` `/faq` `/terms` `/privacy` |
| 로그인 | `/login` `/register` `/packages` `/apply` `/mypage` `/mypage/profile` |
| 백오피스 | `/admin` `/admin/rates` `/admin/packages` `/admin/content` `/admin/applicants` `/admin/schedule` `/admin/users` `/admin/pages` |
