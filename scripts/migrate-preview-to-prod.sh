#!/usr/bin/env bash
# preview(Render) → 운영(arena) 콘텐츠 이관. 판교 kubeconfig 접근되는 장비에서 실행.
#
#   백업+미리보기(안전, 아무 것도 안 바꿈):
#     bash scripts/migrate-preview-to-prod.sh
#
#   실제 적용:
#     bash scripts/migrate-preview-to-prod.sh apply
#
# dev 에서 검증한 절차와 동일: 요금표는 기존 버전 보존(신청서 참조 안 깨짐),
# preview 버전을 현재본으로 올림. 콘텐츠·공지·페이지·알림규칙·차단일·기능정의서 upsert.
set -euo pipefail

# kubeconfig 위치 자동 인식 (booking 안 / 형제 폴더 tmp/pangyo 둘 다 지원)
KC=""
for c in "${KUBECONFIG_PATH:-}" tmp/pangyo/kubeconfig/pangyo-kubeconfig ../tmp/pangyo/kubeconfig/pangyo-kubeconfig ../../tmp/pangyo/kubeconfig/pangyo-kubeconfig; do
  if [ -n "$c" ] && [ -f "$c" ]; then KC="$c"; break; fi
done
if [ -z "$KC" ]; then echo "✗ pangyo-kubeconfig 를 못 찾음. KUBECONFIG_PATH=경로 로 지정해 주세요."; exit 1; fi
echo "  kubeconfig: $KC"
K="kubectl --kubeconfig=$KC --insecure-skip-tls-verify"
SRC="postgresql://seoularena:G5rWppcaSROxUoIUqqFEWsTNP9S0slF4@dpg-da23nb0u01pc73dpr5a0-a.oregon-postgres.render.com/seoularena_feepreview?sslmode=require"
PORT=15433
TARGET="postgresql://arena@localhost:${PORT}/arena"
STAMP="$(date +%Y%m%d-%H%M)"
BK="prod-content-backup-${STAMP}"

echo "▶ 운영 DB(arena-db-0) 포트포워드 시작..."
$K -n arena port-forward pod/arena-db-0 ${PORT}:5432 >/tmp/pf-prod.log 2>&1 &
PF=$!
trap 'kill $PF 2>/dev/null || true' EXIT
sleep 6

echo "▶ 운영 콘텐츠 백업 → ${BK}/"
mkdir -p "$BK"
for t in rate_tables site_content notices faqs pages notification_rules date_blocks feature_spec_sheets; do
  psql "$TARGET" -c "\copy $t to '${BK}/$t.csv' csv header"
done
echo "  백업 완료: $(ls "$BK" | wc -l) 개 표"

if [ "${1:-}" != "apply" ]; then
  echo "▶ 미리보기(dry-run) — 아무 것도 바뀌지 않습니다"
  SOURCE_DATABASE_URL="$SRC" TARGET_DATABASE_URL="$TARGET" node scripts/migrate-content.mjs
  echo
  echo "※ 실제 적용하려면:  bash scripts/migrate-preview-to-prod.sh apply"
  exit 0
fi

echo "▶ 실제 이관(apply)"
SOURCE_DATABASE_URL="$SRC" TARGET_DATABASE_URL="$TARGET" node scripts/migrate-content.mjs --apply

echo "▶ preview 요금표를 현재본으로 올림"
psql "$TARGET" -c "UPDATE rate_tables SET updated_at = to_char(now() at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') WHERE version='2026-08-notion-v1'"

echo "▶ FAQ 를 preview 와 동일하게 정리(중복 제거)"
SOURCE_DATABASE_URL="$SRC" TARGET_DATABASE_URL="$TARGET" node scripts/migrate-content.mjs --apply --replace --tables=faqs

echo "▶ 현재 요금표 확인"
psql "$TARGET" -tAc "select version, updated_at from rate_tables order by updated_at desc limit 1"
echo "✓ 운영 이관 완료. 백업: ${BK}/  (되돌리려면 이 CSV 로 복원)"
