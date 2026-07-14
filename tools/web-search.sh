#!/usr/bin/env bash
set -euo pipefail

provider="auto"
search_type="search"
count="10"
raw_json="false"

usage() {
  cat >&2 <<'EOF'
usage: web-search.sh [--provider auto|serper|brave|both]
                     [--type search|places|scholar|images|news|shopping]
                     [--count N] [--json] QUERY...

auto uses Serper first and falls back to Brave on a transient Serper failure
after one retry.
An empty Serper result asks for query reformulation instead of spending Brave.
Non-web types are Serper-only. Use both selectively because it spends one
request from each provider.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider) provider="${2:?missing provider}"; shift 2 ;;
    --type) search_type="${2:?missing type}"; shift 2 ;;
    --count) count="${2:?missing count}"; shift 2 ;;
    --json) raw_json="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    --) shift; break ;;
    -*) printf 'error: unknown option: %s\n' "$1" >&2; usage; exit 2 ;;
    *) break ;;
  esac
done

if [[ $# -eq 0 ]]; then usage; exit 2; fi
if [[ ! "$count" =~ ^[0-9]+$ ]] || (( count < 1 || count > 20 )); then
  printf 'error: count must be an integer from 1 to 20\n' >&2
  exit 2
fi
case "$provider" in auto|serper|brave|both) ;; *) printf 'error: invalid provider: %s\n' "$provider" >&2; exit 2 ;; esac
case "$search_type" in search|places|scholar|images|news|shopping) ;; *) printf 'error: invalid type: %s\n' "$search_type" >&2; exit 2 ;; esac
if [[ "$search_type" != "search" && ( "$provider" == "brave" || "$provider" == "both" ) ]]; then
  printf 'error: provider %s does not support type %s\n' "$provider" "$search_type" >&2
  exit 2
fi
if [[ "$raw_json" == "true" && ( "$provider" == "brave" || "$provider" == "both" ) ]]; then
  printf 'error: --json is supported only with Serper/auto\n' >&2
  exit 2
fi

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
query="$*"
serper_query="$query"

load_serper_key() {
  if [[ -z "${SERPER_API_KEY:-}" && -r "$root_dir/secrets/serper.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    . "$root_dir/secrets/serper.env"
    set +a
  fi
}

load_brave_key() {
  if [[ -z "${BRAVE_SEARCH_API_KEY:-}" && -r "$root_dir/secrets/brave-search.env" ]]; then
    set -a
    # shellcheck disable=SC1091
    . "$root_dir/secrets/brave-search.env"
    set +a
  fi
}

run_serper() {
  load_serper_key
  local json_args=()
  if [[ "$raw_json" == "true" ]]; then json_args+=(--json); fi
  SERPER_SEARCH_COUNT="$count" "$root_dir/tools/serper-search.sh" "${json_args[@]}" --type "$search_type" --count "$count" "$serper_query"
}

run_brave() {
  load_brave_key
  SEARCH_COUNT="$count" "$root_dir/tools/search.sh" "$query"
}

provider_notice() {
  printf 'notice: search_provider=%s search_type=%s\n' "$1" "$search_type" >&2
}

provider_output=""
provider_state=""

capture_provider() {
  local command_name="$1"
  local captured=""
  local command_status=0

  captured="$($command_name)" || command_status=$?
  if (( command_status != 0 )); then
    provider_output=""
    if [[ "$command_name" == "run_serper" ]]; then
      case "$command_status" in
        2) provider_state="configuration" ;;
        3) provider_state="rejected" ;;
        4) provider_state="transient" ;;
        *) provider_state="failed" ;;
      esac
    else
      provider_state="failed"
    fi
    return 1
  fi

  if [[ -z "$captured" || "$captured" =~ ^NO_[A-Z_]+_RESULTS$ ]]; then
    provider_output=""
    provider_state="empty"
    return 1
  fi

  provider_output="$captured"
  provider_state="success"
  return 0
}

run_serper_with_transient_retry() {
  local attempt=1

  while (( attempt <= 2 )); do
    if capture_provider run_serper; then
      return 0
    fi
    if [[ "$provider_state" != "transient" || "$attempt" -ge 2 ]]; then
      return 1
    fi
    printf 'notice: Serper transient failure; retrying once with the same query\n' >&2
    ((attempt += 1))
  done
  return 1
}

try_serper() {
  serper_query="$query"
  run_serper_with_transient_retry
}

report_provider_error() {
  local provider_name="$1"
  case "$provider_state" in
    empty) printf 'error: %s returned no results\n' "$provider_name" >&2 ;;
    configuration) printf 'error: %s configuration failed\n' "$provider_name" >&2 ;;
    rejected) printf 'error: %s request was rejected\n' "$provider_name" >&2 ;;
    transient) printf 'error: %s remained unavailable after retry\n' "$provider_name" >&2 ;;
    *) printf 'error: %s request failed\n' "$provider_name" >&2 ;;
  esac
}

case "$provider" in
  serper)
    if try_serper; then
      provider_notice serper
      printf '%s\n' "$provider_output"
    else
      report_provider_error Serper
      exit 1
    fi
    ;;
  brave)
    if capture_provider run_brave; then
      provider_notice brave
      printf '%s\n' "$provider_output"
    else
      report_provider_error Brave
      exit 1
    fi
    ;;
  both)
    both_success=0
    printf '== Serper ==\n'
    if try_serper; then
      provider_notice serper
      printf '%s\n' "$provider_output"
      both_success=1
    else
      printf 'notice: Serper %s; continuing with Brave\n' "$provider_state" >&2
      printf 'NO_SERPER_RESULTS\n'
    fi
    printf '\n== Brave ==\n'
    if capture_provider run_brave; then
      provider_notice brave
      printf '%s\n' "$provider_output"
      both_success=1
    else
      printf 'notice: Brave %s\n' "$provider_state" >&2
      printf 'NO_BRAVE_RESULTS\n'
    fi
    if (( both_success == 0 )); then exit 1; fi
    ;;
  auto)
    if [[ "$search_type" != "search" ]]; then
      if try_serper; then
        provider_notice serper
        printf '%s\n' "$provider_output"
      else
        printf 'error: Serper %s; no equivalent Brave endpoint for type %s\n' "$provider_state" "$search_type" >&2
        exit 1
      fi
      exit 0
    fi

    if try_serper; then
      provider_notice serper
      printf '%s\n' "$provider_output"
      exit 0
    fi

    if [[ "$provider_state" == "empty" ]]; then
      printf 'error: Serper returned no results; reformulate the Serper query or explicitly use --provider brave\n' >&2
      exit 1
    fi

    if [[ "$provider_state" != "transient" ]]; then
      report_provider_error Serper
      exit 1
    fi

    printf 'notice: Serper remained unavailable after retry; falling back to Brave\n' >&2
    if capture_provider run_brave; then
      provider_notice brave
      printf '%s\n' "$provider_output"
    else
      printf 'error: Brave fallback %s\n' "$provider_state" >&2
      exit 1
    fi
    ;;
esac
