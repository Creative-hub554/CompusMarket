#!/usr/bin/env bash
# First-boot smoke test for the champey production stack
# (docker/compose.prod.yml). Wipes ALL champey volumes, brings the stack up
# from nothing, and asserts every health probe — the single command that
# proves a bare host can serve the site.
#
# DESTRUCTIVE: deletes all champey compose data volumes (pgdata, minio,
# redis, meili, ...). The site has no pre-live data worth keeping; run on a
# host you intend to initialize.
#
# Usage:
#   ./docker/smoke-first-boot.sh                # wipe + up --build + assert
#   SMOKE_NO_WIPE=1  ...                        # keep volumes, just up + assert
#   SMOKE_NO_BUILD=1 ...                        # reuse existing images
#   HTTP_PORT=8080 ...                          # if 80 is taken on the host

set -euo pipefail

cd "$(dirname "$0")/.."   # repo root (works from anywhere)

COMPOSE=(docker compose -f docker/compose.prod.yml)
HTTP_PORT="${HTTP_PORT:-80}"

echo "== smoke: champey first-boot test =="

if [[ "${SMOKE_NO_WIPE:-0}" != "1" ]]; then
  echo "== tearing down + wiping champey volumes =="
  "${COMPOSE[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  leftover=$(docker volume ls -q | grep '^champey_' || true)
  if [[ -n "$leftover" ]]; then
    echo "removing leftover volumes: ${leftover//$'\n'/ }"
    # shellcheck disable=SC2086
    docker volume rm -f $leftover
  fi
fi

build_flag=()
if [[ "${SMOKE_NO_BUILD:-0}" != "1" ]]; then
  build_flag=(--build)
fi

echo "== bringing the stack up =="
"${COMPOSE[@]}" up -d "${build_flag[@]}"

echo "== waiting for backend-db-init =="
for _ in $(seq 1 60); do
  state=$(docker inspect champey-backend-db-init-1 --format '{{.State.Status}}' 2>/dev/null || echo missing)
  [[ "$state" == "exited" ]] && break
  sleep 5
done
init_code=$(docker inspect champey-backend-db-init-1 --format '{{.State.ExitCode}}')
echo "db-init exit code: $init_code"
if [[ "$init_code" != "0" ]]; then
  echo "FAIL: backend-db-init exited $init_code"
  "${COMPOSE[@]}" logs backend-db-init
  exit 1
fi

echo "== waiting for all containers healthy =="
deadline=$((SECONDS + 300))
while (( SECONDS < deadline )); do
  unhealthy=$(docker ps --filter name=champey- --format '{{.Names}} {{.Status}}' | grep -v 'healthy' || true)
  [[ -z "$unhealthy" ]] && { echo "all containers healthy"; break; }
  sleep 5
done
unhealthy=$(docker ps --filter name=champey- --format '{{.Names}} {{.Status}}' | grep -v 'healthy' || true)
if [[ -n "$unhealthy" ]]; then
  echo "FAIL: not all healthy:"
  echo "$unhealthy"
  exit 1
fi

echo "== asserting probes =="
fail=0
probe() { # name expected-code url
  local name=$1 expected=$2 url=$3 code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url" || echo 000)
  if [[ "$code" == "$expected" ]]; then
    echo "PASS  $name ($code)"
  else
    echo "FAIL  $name: expected $expected got $code"
    fail=1
  fi
}

probe "nginx health"       200 "http://127.0.0.1:$HTTP_PORT/healthz"
probe "frontend /en/feed"  200 "http://127.0.0.1:3000/en/feed"
probe "backend live"       200 "http://127.0.0.1:$HTTP_PORT/api/health/live"
probe "backend health"     200 "http://127.0.0.1:$HTTP_PORT/api/health"
probe "admin via nginx"    307 "http://127.0.0.1:$HTTP_PORT/admin"   # Clerk redirect when unauthenticated
probe "api products"       200 "http://127.0.0.1:$HTTP_PORT/api/products"

if [[ "$fail" == "0" ]]; then
  echo "== SMOKE TEST PASSED =="
else
  echo "== SMOKE TEST FAILED =="
  exit 1
fi