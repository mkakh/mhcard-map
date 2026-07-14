# Project Web Search

These scripts are a repository-local copy of the Serper-first search helpers.
The copy is intentionally independent so this project's search policy and
implementation can evolve without changing other repositories.

Requirements: Bash, `curl`, and `jq`.

Local ignored credentials:

```text
secrets/serper.env       # SERPER_API_KEY=...
secrets/brave-search.env # BRAVE_SEARCH_API_KEY=...
```

Examples:

```bash
./tools/web-search.sh '金沢市 マンホールカード 配布場所 在庫'
./tools/web-search.sh --type places '石川県金沢市 マンホールカード 配布場所'
./tools/web-search.sh --type places --json '石川県金沢市 マンホールカード 配布場所'
./tools/web-search.sh 'site:city.kanazawa.ishikawa.jp マンホールカード'
./tools/web-search.sh --provider both 'マンホールカード 配布休止 自治体名'
```

`auto` uses Serper first. It retries transient Serper failures once before a
Brave fallback, while valid empty results and configuration/client errors do
not consume Brave. Empty searches should normally be reformulated. Known URLs
should be fetched directly, and search snippets must not be used alone to edit
the location dataset. `--json` is available with Serper/auto and is intended for
structured candidate tooling; it is rejected for Brave/both.
