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
- Treat an opened municipality, prefecture, ministry, public water/sewer authority, or other responsible public body's official page as primary evidence. It may be the first discovery source and is sufficient to add or update a card when the page clearly identifies the exact card and distribution facts; GKP confirmation is not required.
- Use GKP as a catalogue and later reconciliation source when available, not as a mandatory discovery source. Do not overwrite a more specific reviewed public-body source, address, schedule, condition, or stock statement with a generic GKP row.
- The scheduled importer may add a newly identified GKP card automatically, but it must not directly replace an existing record's reviewed place, address, schedule, condition, stock, status, distribution-place list, English-version facts, source links, or geocode fields. Catalogue metadata (`imageUrl`, `series`, and `issuedOn`) may still be reconciled.
- Existing-record differences observed in GKP must be written to `.tmp/gkp-review-candidates.json`, summarized by ID and changed fields in the PR body, and shown for every item with complete before/GKP values in synchronized PR comments and the open `[自動更新] GKP要確認候補` issue. When GitHub body limits require truncating a summary list, the omitted count must be explicit and every item must remain visible in the split comments. A candidate is not approval.
- If an existing GKP record is absent from the latest import, retain it and report `gkpListing` as a review candidate. Do not interpret a missing row as authorization to delete the card.
- Resolve a GKP candidate by opening the responsible public body's page and matching the exact card. When adopted, update the data from that official page and use `sourceType: "official_public_body_page"`; when the official page does not support the GKP change, preserve the reviewed data.
- After every displayed candidate has an explicit adopt/reject decision, run `npm run acknowledge:gkp-review -- --all-reviewed`. For a partial review, pass only the reviewed card IDs instead of `--all-reviewed`. This advances `data/gkp-review-baseline.json` to the reviewed GKP observation (or removes records converted to official sources), while leaving the generated candidate text available for the current PR explanation.
- Search result titles and snippets remain discovery hints. Open the official page and match the prefecture, municipality, card code/printed card image or uniquely identified design, distribution facility, and page context before applying data.
- For an official card discovered before GKP listing, use `sourceType: "official_public_body_page"` and keep the reviewed government page in `sourceUrl`. Derive the normal stable ID from the official card code or readable printed card image. If no stable card identity can be established, hold the candidate because the record cannot be mapped safely, not because GKP is absent.
- Keep issue date and distribution start separate. Do not infer `distributionStartsOn` from a later GKP issue date when the reviewed public-body page has not stated the start.
- If a later GKP row conflicts with the reviewed official-first card ID, stop and manually verify the printed card code. Do not rename the record automatically from the lower-priority catalogue source.
- For current distribution place, hours, closure, stock, eligibility, and restart information, prefer the responsible public body or distributor's current official page over GKP.
- Tourism-association and facility pages can support facility facts when they are the responsible operator. News articles, blogs, aggregators, maps, and social posts are leads only unless no primary source exists; clearly label any unresolved inference.
- Search with the full Japanese municipality/prefecture and card or facility name. Use `--type places` with the full Japanese location for local-listing discovery, but verify consequential details on official pages.
- When candidates are easy to confuse, match the prefecture, municipality, card code/series, distribution facility, and official URL before applying a result. GKP absence is not negative evidence. Never update one card from another card's similarly named facility or snippet.
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
