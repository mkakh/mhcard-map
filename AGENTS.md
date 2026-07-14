# Manhole Card Map Workspace Instructions

Preserve unrelated user changes in this repository. The worktree may contain active data and geocoding work; do not rewrite, stage, discard, or commit those changes unless the user explicitly includes them in the current task.

## Change authorization

- Treat requests framed as investigation, confirmation, explanation, reconsideration, consideration, opinion, or review (`調査`, `確認`, `説明`, `再考`, `検討`, `意見`, `レビュー`) as read-only unless the user also gives an explicit implementation instruction.
- Finding a root cause or a likely fix does not authorize a repository change. Report the evidence, options, tradeoffs, and affected scope, then wait for an explicit instruction such as `修正`, `実装`, or `採用`.
- Do not change product features, UI behavior, data policy, external providers, dependencies, deployment configuration, or operational workflows solely because an investigation suggests an improvement.
- When implementation is explicitly authorized, keep it within the adopted scope. Do not bundle adjacent feature or policy changes without separate approval.

## Web discovery

- Use `./tools/web-search.sh QUERY` for ordinary public-web discovery. Do not use the platform's built-in web search or scrape Google, Bing, or DuckDuckGo HTML result pages.
- Serper is the default because its credit pool is ample. Reformulate empty or low-relevance Serper queries before spending the constrained Brave quota. Let `auto` use Brave only after the helper's transient-failure retry; use `--provider brave` or `--provider both` deliberately when an independent index is useful.
- If a target URL is already known, skip search and fetch it directly. Treat search results and snippets as discovery hints, not evidence sufficient to modify `data/locations.json`.
- For current distribution place, hours, closure, stock, eligibility, and restart information, prefer the distributing municipality, water/sewer authority, or facility's official page. Use GKP as the catalogue baseline and for card identity, then verify time-sensitive operating facts on the responsible distributor's current page when available.
- Tourism-association and facility pages can support facility facts when they are the responsible operator. News articles, blogs, aggregators, maps, and social posts are leads only unless no primary source exists; clearly label any unresolved inference.
- Search with the full Japanese municipality/prefecture and card or facility name. Use `--type places` with the full Japanese location for local-listing discovery, but verify consequential details on official pages.
- When candidates are easy to confuse, match the prefecture, municipality, card code/series, distribution facility, and official URL before applying a result. Never update one card from another card's similarly named facility or snippet.
- Record the source URL and the date checked in the task notes or relevant output. Preserve the repository's existing source fields and validation flow; do not invent a schema field solely for a search result.
- The existing `scripts/search-official-design-name-candidates.js` uses a separate cached Bing RSS workflow. Do not silently redirect or rewrite it as part of ordinary interactive discovery; change it only in a dedicated, tested task.
- Search credentials live only in ignored `secrets/serper.env` and `secrets/brave-search.env`. Never print, commit, or place a key in a URL.

After changing repository data, run the existing relevant validation commands, including `npm run validate:data` when applicable.

## Geocode review

- Do not treat an ordinary geocoder result as a defect merely because it lacks independent manual review. There is no recurring all-unreviewed backlog or seven-way review shard.
- Review every changed or newly added top-level and nested geocode target immediately. PR comments must expose the rows; do not leave the reviewer to discover them only inside CSV or JSON artifacts.
- Report objective coordinate, geocoder, missing-query/title, and known address-input errors regardless of prior review status. A suspended card with no published distribution location is exempt from missing-query/title warnings until its distribution data changes.
- Treat the legacy precision filter as manual diagnostic output only. Coordinate movement can be wrong even when the before/after address is identical or differs only in formatting.
- Keep candidate sources separate. Nominatim is reference-only and cannot be applied. A Places coordinate can be adopted only after the exact facility is matched to a card-level official source. An embedded map coordinate must be bound by page context to the exact facility.
- Require explicit target ID, approved coordinates, official URL, coordinate source/evidence, review date, notes, and a current snapshot hash before applying a coordinate.
- Record the current address, before/after coordinates, movement, map links, official source, and decision evidence in the generated PR review output.
- After manual geocode changes, run `npm run sync:geocode-review-cache`, `npm run update:codes`, `npm run validate:data`, `npm test`, and `node scripts/summarize-location-diff.js`.
