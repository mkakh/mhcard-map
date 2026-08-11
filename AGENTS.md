# Manhole Card Map Workspace Instructions

## Repository safety and authorization

- Preserve unrelated user changes. The worktree may contain active data or
  geocoding work; do not rewrite, stage, discard, or commit it unless the user
  explicitly includes it in the current task.
- Treat investigation, confirmation, explanation, reconsideration,
  consideration, opinion, and review requests (`調査`, `確認`, `説明`, `再考`,
  `検討`, `意見`, `レビュー`) as read-only unless the user also explicitly asks
  for implementation.
- Finding a root cause or likely fix does not authorize a repository change.
  Report the evidence, options, tradeoffs, and affected scope, then wait for an
  instruction such as `修正`, `実装`, or `採用`.
- Do not change product behavior, UI, data policy, external providers,
  dependencies, deployment, or operations merely because an investigation
  suggests an improvement.
- Once implementation is authorized, stay inside the adopted scope. Do not
  bundle adjacent features or policy changes without separate approval.

## Manual location-data changes

This procedure applies whenever an interactive task changes
`data/locations.json`, directly or through a local script. It does not apply to
code-only work or to `.github/workflows/data-update.yml`, which already
snapshots locations and generates history.

1. Before the first location-data mutation, preserve the exact starting state:

   ```bash
   mkdir -p .tmp
   cp data/locations.json .tmp/locations-before-manual-update.json
   ```

   If the task resumes after data was already changed and this snapshot is not
   available, identify the exact pre-task Git ref or file first. Do not guess a
   baseline or include unrelated pre-existing changes in the task history.
2. Complete all research, data edits, normalization, geocoding, and code
   generation. Review and correct the location diff before generating history.
3. Run the applicable pre-history checks. At minimum run
   `npm run validate:data`, `npm test`,
   `npm run audit:geocode-review:issues`, and
   `node scripts/summarize-location-diff.js` for location-data work.
4. Only after `data/locations.json` is final, generate the user-facing history
   batch once:

   ```bash
   npm run update:history -- --before .tmp/locations-before-manual-update.json --source "<concise reviewed change label>"
   ```

   Use `--before-ref <exact-ref>` only when that ref is the verified pre-task
   location state. `addedBatch: null` is valid when the task changed only
   internal, non-user-facing metadata. Do not invent or hand-edit a batch.
5. Re-run `npm run validate:data` and `npm test`, inspect both
   `data/locations.json` and `data/update-history.json`, and include both in the
   reviewed diff when a batch was added. If locations must change after history
   generation, replace the batch created by this task and regenerate it from
   the original snapshot; do not accumulate stale task batches or overwrite
   unrelated history work.

Before any PR or merge, also run `git diff --check`. Run `actionlint` when a
workflow changes.

## Public-web discovery

### Search routing

- Use `./tools/web-search.sh QUERY` for ordinary public-web discovery. Do not
  use the platform's built-in web search or scrape Google, Bing, or DuckDuckGo
  result pages.
- Serper is the default because its credit pool is ample. Reformulate empty or
  low-relevance Serper queries before spending the constrained Brave quota.
  Let `auto` use Brave only after the helper's transient-failure retry; select
  `--provider brave` or `--provider both` deliberately when an independent
  index is useful.
- If the target URL is known, fetch it directly. Otherwise search with the full
  Japanese prefecture/municipality and card or facility name. Use
  `--type places` with the full Japanese location for local-listing discovery,
  then verify consequential details on an official page.
- `scripts/search-official-design-name-candidates.js` has a separate cached
  Bing RSS workflow. Do not redirect or rewrite it during ordinary discovery;
  change it only in a dedicated, tested task.
- Search credentials belong only in ignored `secrets/serper.env` and
  `secrets/brave-search.env`. Never print, commit, or put a key in a URL.

### Evidence and record matching

- Search results and snippets are discovery hints, never evidence sufficient
  to change `data/locations.json`. Open the source before applying data.
- A responsible municipality, prefecture, ministry, public water/sewer
  authority, or other public body's official page is primary evidence. It may
  establish a card and its distribution facts without GKP confirmation.
- Tourism-association and facility pages may support facts when they are the
  responsible operator. News, blogs, aggregators, maps, and social posts are
  leads only unless no primary source exists; label unresolved inference.
- Match the prefecture, municipality, card code or printed image, uniquely
  identified design, series, distribution facility, official URL, and page
  context as applicable. Never update one card from a similarly named card,
  facility, or snippet. GKP absence is not negative evidence.
- Record the source URL and checked date in the task notes or output. Preserve
  the existing source fields and validation flow; do not invent a schema field
  solely for a search result.

## Source priority and official-first cards

- Use GKP as a catalogue and reconciliation source, not as mandatory discovery
  evidence. Never replace a more specific reviewed public-body source, place,
  address, schedule, condition, stock statement, or other current distribution
  fact with a generic GKP row.
- For current place, hours, closure, stock, eligibility, and restart facts,
  prefer the responsible public body or distributor's current official page.
- For an official card found before GKP listing, use
  `sourceType: "official_public_body_page"`, keep the reviewed government page
  in `sourceUrl`, and derive the stable ID from the official card code or a
  readable printed card image. If the exact identity is unavailable, hold the
  candidate; do not invent an ID merely because GKP has not listed it.
- Keep issue date and distribution start separate. Do not derive
  `distributionStartsOn` from a later GKP issue date unless the reviewed
  public-body page states the start.
- If a later GKP row conflicts with an official-first card ID, stop and verify
  the printed card code manually. Never rename it automatically from the
  lower-priority catalogue source.

## GKP import and candidate review

- The scheduled importer may add a newly identified GKP card. For an existing
  record it must not replace reviewed place, address, schedule, condition,
  stock, status, distribution-place list, English-version facts, source links,
  or geocode fields. It may reconcile catalogue metadata: `imageUrl`, `series`,
  and `issuedOn`.
- If an existing GKP record disappears from the latest import, retain it and
  emit a `gkpListing` review candidate. Absence never authorizes deletion.
- Write existing-record GKP differences to
  `.tmp/gkp-review-candidates.json`. Summarize every candidate by ID and changed
  fields in the PR body, and publish complete before/GKP values for every item
  in synchronized PR comments and the open `[自動更新] GKP要確認候補` issue. If
  the PR body is truncated, state the omitted count and retain every item in
  the split comments. A candidate is not approval.
- Resolve each candidate against the responsible public body's page and the
  exact card. When adopted, update from that official page and use
  `sourceType: "official_public_body_page"`; when unsupported, preserve the
  reviewed data.
- After every displayed candidate has an explicit adopt/reject decision, run
  `npm run acknowledge:gkp-review -- --all-reviewed`. For a partial review,
  pass only the reviewed IDs. This advances the accepted GKP observation or
  removes official-source records from `data/gkp-review-baseline.json`, while
  leaving candidate text available for the current PR explanation. Never
  acknowledge unresolved candidates.

## Geocode review

- Do not call an ordinary geocoder result defective merely because it lacks an
  independent manual review. There is no recurring all-unreviewed backlog or
  seven-way review shard.
- Review every changed or added top-level and nested geocode target
  immediately. Expose the rows in PR comments; do not leave them discoverable
  only in CSV or JSON artifacts.
- Report objective coordinate, geocoder, missing query/title, and known
  address-input errors regardless of earlier review status. A suspended card
  with no published distribution location is exempt from missing-query/title
  warnings until its distribution data changes.
- Treat the legacy precision filter as a manual diagnostic only. Coordinate
  movement can be wrong even when before/after addresses are identical or
  differ only in formatting.
- Keep candidate sources distinct. Nominatim is reference-only and cannot be
  applied. Adopt a Places coordinate only after matching the exact facility to
  a card-level official source. Bind an embedded-map coordinate to the exact
  facility through the page context.
- Before applying a coordinate, require the target ID, approved coordinates,
  official URL, coordinate source/evidence, review date, notes, and current
  snapshot hash.
- In generated PR review output, record the current address, before/after
  coordinates, movement, map links, official source, and decision evidence.
- After manual geocode changes, run `npm run sync:geocode-review-cache` and
  `npm run update:codes` before the pre-history checks. Then complete the
  manual history procedure above; its required checks include
  `npm run validate:data`, `npm test`, and
  `node scripts/summarize-location-diff.js`.
