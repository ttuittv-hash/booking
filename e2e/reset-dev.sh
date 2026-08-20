#!/usr/bin/env bash
# full-flow.spec.mjs 를 돌리기 전에 실행한다.
#
# 이 테스트는 카카오(120-81-47521)로 "최초 가입자 = 대표 담당자" 흐름을 확인한다.
# 진위확인을 통과하려면 실제로 존재하는 사업자번호여야 해서 실행마다 번호를 바꿀 수 없고,
# 그래서 직전 실행이 만든 회사가 남아 있으면 이번 사용자는 대표 담당자가 아니라
# 소속 담당자로 붙는다 — 담당자 관리(A10)부터 줄줄이 실패한다. 그 회사만 지운다.
#
# 지우는 순서가 있다. companies.master_user_id 가 users 를 붙잡고 있어 먼저 끊어야 한다.
set -euo pipefail

# 판교 클러스터에 붙어야 한다. 이미 잡혀 있으면 그대로 쓴다.
: "${KUBECONFIG:=$(cd "$(dirname "$0")/../.." && pwd)/tmp/pangyo/kubeconfig/pangyo-kubeconfig}"
export KUBECONFIG

BRN="${1:-1208147521}"
NS="${E2E_NAMESPACE:-arena-dev}"

kubectl -n "$NS" exec -i arena-db-0 -- psql -U arena -d arena -q -v ON_ERROR_STOP=1 <<SQL
UPDATE companies SET master_user_id = NULL WHERE business_registration_number = '$BRN';
CREATE TEMP VIEW _t AS
  SELECT id FROM users
   WHERE company_id IN (SELECT id FROM companies WHERE business_registration_number = '$BRN');
DELETE FROM message_sends          WHERE recipient_id IN (SELECT id FROM _t);
DELETE FROM identity_verifications WHERE user_id      IN (SELECT id FROM _t);
DELETE FROM notifications          WHERE recipient_id IN (SELECT id FROM _t);
DELETE FROM terms_agreements       WHERE user_id      IN (SELECT id FROM _t);
DELETE FROM company_invitations
  WHERE company_id IN (SELECT id FROM companies WHERE business_registration_number = '$BRN');
DELETE FROM users     WHERE id IN (SELECT id FROM _t);
DELETE FROM companies WHERE business_registration_number = '$BRN';
-- 연속 실행이 로그인 레이트리밋에 걸리지 않게 같이 비운다.
DELETE FROM rate_limits;
SQL

echo "정리 완료 — 사업자번호 $BRN"
