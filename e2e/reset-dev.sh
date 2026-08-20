#!/usr/bin/env bash
# full-flow.spec.mjs 를 돌리기 전에 실행한다.
#
# 이 테스트는 카카오(120-81-47521)로 "최초 가입자 = 대표 담당자" 흐름을 확인한다.
# 진위확인을 통과하려면 실제로 존재하는 사업자번호여야 해서 실행마다 번호를 바꿀 수 없고,
# 그래서 직전 실행이 만든 회사가 남아 있으면 이번 사용자는 대표 담당자가 아니라
# 소속 담당자로 붙는다 — 담당자 관리(A10)부터 줄줄이 실패한다. 그 회사만 지운다.
#
# 참조 테이블을 손으로 적어 두면 새 테이블이 생길 때마다 여기서 걸린다(실제로 그랬다 —
# inquiries·quotes·message_sends 가 빠져 있었다). 그래서 users 를 참조하는 외래키를
# 카탈로그에서 읽어 자동으로 지운다.
set -euo pipefail

# 판교 클러스터에 붙어야 한다. 이미 잡혀 있으면 그대로 쓴다.
: "${KUBECONFIG:=$(cd "$(dirname "$0")/../.." && pwd)/tmp/pangyo/kubeconfig/pangyo-kubeconfig}"
export KUBECONFIG

BRN="${1:-1208147521}"
NS="${E2E_NAMESPACE:-arena-dev}"

kubectl -n "$NS" exec -i arena-db-0 -- psql -U arena -d arena -q -v ON_ERROR_STOP=1 <<SQL
DO \$\$
DECLARE
  company_ids text[];
  user_ids    text[];
  fk          record;
BEGIN
  SELECT array_agg(id) INTO company_ids
    FROM companies WHERE business_registration_number = '$BRN';
  IF company_ids IS NULL THEN RETURN; END IF;

  SELECT array_agg(id) INTO user_ids FROM users WHERE company_id = ANY(company_ids);

  -- companies 가 대표 담당자를 붙잡고 있어 먼저 끊는다.
  UPDATE companies SET master_user_id = NULL WHERE id = ANY(company_ids);

  -- users 를 참조하는 모든 테이블을 카탈로그에서 찾아 지운다.
  IF user_ids IS NOT NULL THEN
    FOR fk IN
      SELECT tc.table_name AS tbl, kcu.column_name AS col
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
       WHERE tc.constraint_type = 'FOREIGN KEY'
         AND ccu.table_name = 'users'
         AND tc.table_name <> 'companies'
    LOOP
      EXECUTE format('DELETE FROM %I WHERE %I = ANY(\$1)', fk.tbl, fk.col) USING user_ids;
    END LOOP;
    DELETE FROM users WHERE id = ANY(user_ids);
  END IF;

  DELETE FROM company_invitations WHERE company_id = ANY(company_ids);
  DELETE FROM companies WHERE id = ANY(company_ids);
END
\$\$;

-- 연속 실행이 로그인 레이트리밋에 걸리지 않게 같이 비운다.
DELETE FROM rate_limits;
SQL

echo "정리 완료 — 사업자번호 $BRN"
