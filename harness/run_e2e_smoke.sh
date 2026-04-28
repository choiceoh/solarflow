#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
sql_file="$script_dir/e2e_solarflow_smoke.sql"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql command not found. Install PostgreSQL client tools first." >&2
  exit 127
fi

if [[ $# -gt 0 ]]; then
  exec psql "$@" -v ON_ERROR_STOP=1 -f "$sql_file"
fi

db_url="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [[ -n "$db_url" ]]; then
  exec psql "$db_url" -v ON_ERROR_STOP=1 -f "$sql_file"
fi

exec psql -v ON_ERROR_STOP=1 -f "$sql_file"
