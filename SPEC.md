# Manhole Card Map Specification

## 1. Overview

Manhole Card Map is a free static web application for manhole card collectors.
It shows distribution locations on a real map, supports search and filtering,
and lets users track collected cards and notes on their own device.

The production domain is:

```text
https://mhcard-map.com/
```

The app is intentionally loginless. User collection state is stored only in the
browser. Public distribution data is maintained in repository JSON files and
updated by GitHub Actions pull requests.

## 2. Current Policy

- The app is completely free to use.
- Login and user accounts are not provided.
- Collected state, collected date, and memo are stored in `localStorage`.
- Update requests are submitted through Google Forms.
- Google Form responses are imported through GitHub Actions and reviewed by PR.
- Hosting uses GitHub Pages with a static HTML deployment workflow.
- The custom domain is `mhcard-map.com`.
- The core map library is MapLibre GL JS.
- Mapcode support is removed. Plus Code and latitude/longitude are used instead.

## 3. Repository Structure

```text
index.html
app.js
card-catalog.js
collection-backup.js
styles.css
data/locations.json
data/update-history.json
data/update-form-config.json
data/update-requests.json
scripts/import-gkp-data.js
scripts/geocode-locations.js
scripts/normalize-source-links.js
scripts/update-location-codes.js
scripts/update-location-history.js
scripts/update-history-utils.js
scripts/sync-reviewed-geocode-cache.js
scripts/import-form-requests.js
scripts/validate-data.js
scripts/summarize-location-diff.js
scripts/sync-location-review-comments.js
scripts/list-geocode-precision-candidates.js
scripts/enrich-geocode-precision-candidates.js
scripts/summarize-geocode-review-candidates.js
scripts/audit-geocode-official-evidence.js
scripts/report-nominatim-geocode-coverage.js
scripts/apply-geocode-candidate-updates.js
scripts/prepare-geocode-review-approvals.js
scripts/geocode-precision-utils.js
scripts/location-change-utils.js
scripts/geocode-candidate-approval-utils.js
scripts/geocode-cache-utils.js
scripts/plus-code-utils.js
test/
tools/web-search.sh
.github/workflows/pages.yml
.github/workflows/data-update.yml
.github/workflows/ci.yml
.github/workflows/codeql.yml
.github/dependabot.yml
CNAME
LICENSE
NOTICE.md
```

## 4. Runtime Architecture

The app runs as static files.

- No backend server is required for production.
- No database is required for production.
- `server.js` is only for local development.
- Map and data are loaded in the browser.
- `data/locations.json` is the main public dataset.
- `data/update-history.json` stores bounded, machine-readable user-facing changes.
- `data/update-form-config.json` configures the Google Form prefill URL.
- `data/update-requests.json` stores imported update request summaries.
- Location data is required for the initial application render. The form
  configuration, update-request summaries, and update history are independent
  optional resources and are loaded without blocking that first render.

Local development:

```bash
npm run dev
```

## 5. Screen Layout

### 5.1 Desktop

Desktop layout has three columns:

- Left: search, filters, summary, location list
- Center: MapLibre map
- Right: selected location detail

### 5.2 Mobile

Mobile layout uses tabs:

```text
地図 / 検索 / 詳細
```

Initial mobile view is `地図`.

Mobile interactions:

- Tapping a list item switches to `地図`, focuses the marker, and opens a popup.
- Tapping a map marker opens a popup only.
- Tapping the popup switches to `詳細`.

## 6. Map Specification

Map rendering uses MapLibre GL JS with the Geospatial Information Authority of
Japan standard raster tiles. The style includes the required GSI attribution;
OpenFreeMap serves only the glyphs used by the app's shaped status markers.

Features:

- Individual location points at every zoom level
- Current location button
- Fallback to Tokyo station area if geolocation fails
- Viewport filter
- Selected/list-focused marker popup
- Card image shown in popup when available

Marker states:

- Uncollected
- Collected
- Paused
- Review needed
- Distribution stopped with known address
- Distribution stopped with unknown address
- Geocode failed
- Approximate coordinate
- Current location

Stopped and geocode-failed locations use shaped symbol markers rather than only
round pins, so they remain distinguishable from normal collection state.

## 7. Search And Filters

Search target fields:

- Card name
- Card number
- Prefecture
- Municipality
- Distribution place
- Address
- Plus Code
- User memo

Filters:

- Prefecture
- Collection state
- Distribution status
- Current viewport only

Sort modes:

- Prefecture order
- Distance from current location
- Card number
- Updated date

Filter reset behavior:

- Clears search and filters
- Disables viewport-only filter
- Uses current location when available
- Falls back to Tokyo center when current location is unavailable

## 8. Location Detail

The detail panel shows:

- Card image
- Card name
- Card number
- Prefecture and municipality
- Distribution status badge
- Scheduled distribution start date
- Collection badge
- Coordinate accuracy badge when needed
- Plus Code
- Address
- Distribution place
- Distribution hours
- Closed days
- Distribution status
- Distribution condition
- Stock information
- Coordinate accuracy explanation
- Google Maps link
- Source links
- Collected toggle
- Collected date
- Memo
- Update request action

Clickable source fields:

- Distribution place uses `facilityUrl`
- Distribution condition uses `conditionUrl`
- Stock uses `stockUrl`
- Main source button uses `sourceUrl`

## 9. Collection And Memo Storage

Browser storage key:

```text
localStorage.mhc_collections
```

Stored per location:

- `collected`
- `collectedOn`
- `placeMemos` (keyed by distribution-place ID)

Storage rules:

- Data stays on the user's browser/device.
- Data is not uploaded.
- Data is not synced across devices.
- Clearing browser storage removes collection data.
- A storage write must complete before the in-memory collection state is
  committed. Quota, security, and other `localStorage` failures retain the
  previous state and show an error instead of presenting an unsaved change as
  successful.
- Newly collected cards and backup filenames use the current Asia/Tokyo
  calendar date, so Japan midnight does not retain the previous UTC date.

The `取得数・メモ` dialog shows:

- An `概要・メモ` tab with collected/uncollected counts, completion rate,
  prefecture-level counts, saved memo count, and memo list
- A `カードリスト` tab with all card images and collection states
- A `バックアップ` tab for downloading and restoring collection data as JSON

Collection backups use the versioned `mhcard-map-collections` JSON format and
contain collected state, collected date, and per-place memos. Import validates
the entire file before changing browser storage. The default safe merge keeps
existing values when they conflict, treats a card as collected when either copy
is collected, and adds non-conflicting imported memos. Complete replacement is
also available and requires an explicit confirmation. Backup files are handled
locally and are not uploaded.

The card catalogue:

- Sorts by the full printed card number: prefecture code, municipality code,
  then normalized series and numeric suffix (for example, `00-101-A001`,
  `00-102-A001`, `00-102-B001`, then `01-100-A001`). Malformed identifiers are
  shown last.
- Uses a virtual scrolling window so only the visible rows plus a small
  overscan buffer are mounted. This keeps DOM and decoded-image work bounded
  even when the nationwide catalogue contains more than one thousand cards.
- Can be narrowed with side-by-side prefecture and publication-series dropdowns.
- Combines prefecture and publication-series selections with AND matching, and
  normalizes zero-padded variants such as `第02弾` and `第2弾` to the same series.
- Keeps the full publication-series option list stable and sorts it numerically,
  independent of the selected prefecture.
- Shows all issue months found in `issuedOn` beside each publication series,
  deduplicated and sorted chronologically. Multiple months in one year use a
  compact label such as `第26弾（2025年7・11・12月）`.
- Lists the prefecture dropdown in the official 47-prefecture order, independent
  of nationwide card IDs that start with `00`.
- Shows the number of visible and collected cards for the current selection.
- Shows an empty-state message when no card matches the current selection.
- Toggles collected/uncollected state when a card is tapped without resetting
  the catalogue scroll position.
- Shows `画像なし` if an image URL is unavailable or an image fails to load.
- Supports Left/Right/Home/End keyboard navigation between tabs and moves focus
  to the active tab. Each card exposes its current collection state through
  `aria-pressed`.

Memo discoverability:

- Location list shows a `メモあり` badge.
- Memo text is included in search.
- Memo list items can jump to the relevant location.

The main search-result list also uses a virtual scrolling window. Filtering,
sorting, and viewport changes update its bounded visible window rather than
mounting the complete nationwide result set. A card-catalogue collection toggle
updates the affected card and counters without rebuilding unrelated map and
detail views.

## 10. Update Request Specification

Users can request data updates without logging in.

The detail screen opens Google Forms using a prefilled URL configured in:

```text
data/update-form-config.json
```

Configured prefilled fields:

| App key | Form entry |
| --- | --- |
| `locationId` | `entry.1850722437` |
| `cardName` | `entry.582690237` |
| `prefecture` | `entry.707806178` |
| `municipality` | `entry.1253844542` |
| `place` | `entry.1358103102` |
| `address` | `entry.283107822` |
| `sourceUrl` | `entry.1987575133` |
| `facilityUrl` | `entry.750393850` |
| `stockUrl` | `entry.398493335` |
| `conditionUrl` | `entry.2032106482` |

Google Form URL:

```text
https://docs.google.com/forms/d/e/1FAIpQLSdgNissX9z2haE7cHQZ6BkbtLtlzmqW-x9kxCh1tLVab5TI2w/viewform
```

If the form config is missing, the app shows a toast instead of opening the form.

## 11. Data Model

### 11.1 Location

Primary file:

```text
data/locations.json
```

Important fields:

| Field | Meaning |
| --- | --- |
| `id` | Stable location identifier |
| `legacyIds` | Previous identifiers used for localStorage migration |
| `cardName` | Card display name |
| `officialDesignNames` | Official design/topic names used by source pages, when available |
| `prefecture` | Prefecture |
| `municipality` | Municipality |
| `place` | Distribution place |
| `address` | Distribution address |
| `lat` | Latitude |
| `lng` | Longitude |
| `hours` | Distribution hours |
| `closed` | Closed days |
| `condition` | Distribution condition |
| `stock` | Stock text |
| `status` | Distribution status |
| `distributionStartsOn` | Confirmed or scheduled distribution start date (`YYYY-MM-DD`), separate from the GKP issue date |
| `sourceUrl` | Main source URL |
| `sourceType` | Discovery/ownership policy: `gkp_prefecture_page` or reviewed `official_public_body_page` |
| `facilityUrl` | Distribution place URL |
| `stockUrl` | Stock confirmation URL |
| `conditionUrl` | Distribution condition URL |
| `hasEnglishVersion` | Whether an authoritative source indicates an English version is available |
| `englishVersionStatus` | English version status: `available`, `out_of_stock`, `event_only`, or `unknown` |
| `englishVersionNote` | Source note for the English version, when available |
| `englishVersionUrl` | English version confirmation URL, when available |
| `englishVersionDistributionPlaces` | English-version-only distribution places, when they differ from the regular card distribution places |
| `imageUrl` | Card image URL |
| `series` | Card series |
| `issuedOn` | Issue date |
| `coordinateAccuracy` | Coordinate accuracy |
| `plusCode` | Plus Code |
| `updatedAt` | Data update date |

Supported distribution statuses are `配布中`, `配布開始前`, `休止中`, and
`要確認`. A `配布開始前` record must have `distributionStartsOn` and remains
visible on the map with a distinct marker. Reaching a reviewed start date
deterministically updates the generated record, but publication still requires
PR review. This local transition is not a new GKP observation: `status` is
derived state, and `distributionStartsOn` remains separate from the GKP issue
date.

Distribution places may additionally define `startsOn`, `endsOn`,
`distributionMode` (`regular`, `launch_event`, `limited`, or `fallback`), and
`availabilityNote`. These fields keep launch events, lottery-only windows, and
regular distribution locations separate without hiding the card before launch.
The default detail and navigation target is the first place active on the
current Asia/Tokyo date, with inclusive start/end dates. If none is active, the
earliest upcoming place is selected; if all are expired, the most recently
expired place is selected. An explicit valid user selection remains selected.

When GKP has listed a card, location IDs are generated from its card image filename.

```text
16-205-A-01.jpg -> 16-205-a-01
```

An official public-body page may establish a card before GKP lists it. Such a
record uses `sourceType: "official_public_body_page"`, keeps that reviewed page
in `sourceUrl`, and derives the same ID format from the municipality code and
the card code printed in official text or on the official card image. Do not
invent an ID when the exact card cannot be identified. The GKP importer retains
official-first records and, when a matching GKP row appears later, only fills
missing catalogue metadata; reviewed official distribution facts remain
authoritative. A conflicting later GKP ID fails import for manual printed-code
review instead of automatically renaming the official-first record.

For existing `gkp_prefecture_page` records, the importer also preserves reviewed
distribution, source-link, English-version, and geocode fields. The compact
fingerprints in `data/gkp-review-baseline.json` represent the last explicitly
accepted GKP observation. Only fields changed from that baseline are emitted as
before/GKP review candidates, so historical reviewed differences are not
reopened every week. If a row disappears, the existing record is retained and a
`gkpListing` candidate is emitted instead of deleting the card. New GKP cards are
still imported normally. Catalogue metadata (`imageUrl`, `series`, and
`issuedOn`) remains automatically reconcilable because it identifies the
published card rather than asserting a current distribution fact.

The baseline is committed state and is required during ordinary imports. A
missing file fails the import instead of silently accepting all current GKP
values. `GKP_REVIEW_BASELINE_BOOTSTRAP=1` permits initialization only for a
deliberate baseline rebuild, whose generated diff must be reviewed and committed.

After every displayed candidate is explicitly adopted or rejected,
`npm run acknowledge:gkp-review -- --all-reviewed` advances its fingerprints.
A partial review passes only reviewed card IDs instead. Records converted to
`official_public_body_page` are removed from the GKP baseline. Unresolved
candidates must not be acknowledged. When the candidate list is empty, the
same command still removes any official-source baseline residue without
requiring reviewed IDs.

Older row-position-based IDs are kept in `legacyIds`. On first load, the app
migrates local collection and memo data from legacy IDs to current stable IDs.

### 11.2 Coordinate Accuracy

Known values:

- `address`
- `prefecture_approx`

Additional category logic distinguishes:

- Normal address geocode
- Approximate coordinate
- Distribution stopped with known address
- Distribution stopped with unknown address
- Geocode failed

Uncertain coordinates are visually separated and distributed around the
prefecture center to avoid stacking all uncertain points in one place.

### 11.3 Update Requests

Imported update request summaries are stored in:

```text
data/update-requests.json
```

The app uses this file to show update request counts per location.

### 11.4 Update History

`data/update-history.json` stores up to 24 update batches and 200 changed cards
per batch. Each card entry identifies changed user-facing fields and keeps
compact before/after values. Timestamp-only and internal geocoding metadata
and nested link-only changes are excluded. Distribution-place schedules and
availability notes are included. Values are compared before they are bounded;
long bounded values keep a full-value digest so distinct changes cannot become
identical after truncation. Status, stock, distribution-place,
address/coordinate, and hours changes are classified so the site can emphasize
suspensions, resumptions, and other important updates.

The top-bar `更新履歴` button opens the newest three batches. Users can expand
field-level before/after values, load older batches, and jump from an existing
card's history entry to its current detail view. Removed cards remain readable
but do not offer a detail jump.

## 12. Data Update Pipeline

Manual scripts:

```bash
npm run import:gkp
npm run geocode
npm run normalize:links
npm run update:history -- --before .tmp/locations-before-update.json
npm run update:codes
npm run sync:geocode-review-cache
npm run import:forms
npm run validate:data
npm run test:e2e
npm run audit:geocode-precision:changed
npm run audit:geocode-review:issues
npm run audit:geocode-candidates
npm run audit:geocode-candidates:changed
npm run audit:geocode-candidates:issues
npm run report:geocode-candidates
npm run audit:geocode-official-evidence
npm run prepare:geocode-approvals
npm run apply:geocode-candidates
npm run audit:geocode-nominatim-coverage
npm test
npm run generate:icons
```

Workflow:

```text
.github/workflows/data-update.yml
```

Schedule:

```text
0 18 * * 0
```

The workflow snapshots `data/locations.json` before importing, then generates
the history batch from the reviewed output before validation and PR creation.

This is weekly at 18:00 UTC. The workflow can also be run manually with
`workflow_dispatch`.

Pipeline steps:

1. Import GKP catalogue data and retain reviewed official-first records that GKP has not listed yet
2. Verify card image codes
3. Normalize source links
4. Geocode locations
5. Restore target-scoped manually reviewed geocodes from the cache
6. Generate Plus Codes
7. Import Google Form responses
8. Validate generated data, including prefecture/coordinate consistency and known address-corruption warnings
9. Audit objective geocode errors
10. Generate the PR summary, including every GKP candidate ID and changed field
11. Synchronize complete GKP before/candidate values to the persistent review issue
12. Create or update a pull request
13. Synchronize full GKP, changed-target, and objective-issue rows to PR comments

The persistent GKP issue is synchronized even when candidate review produces no
data change and therefore no update PR. An empty candidate run closes the open
issue, and a later candidate run reopens the same issue. Candidate details remain
available in synchronized comments rather than requiring the reviewer to inspect
`.tmp` JSON files.

### 12.1 Geocode Review Scope

An ordinary geocoder result is not treated as a defect merely because it lacks an
independent manual review. The scheduled workflow has no recurring all-unreviewed
backlog and no seven-way review shard. This avoids hiding actionable errors in a
large list of coordinates with no specific failure signal.

Changed or newly imported top-level and nested geocode targets are shown
immediately in the update PR. Independently, the workflow reports objective
conditions such as a missing or invalid coordinate, a geocoder error, an
out-of-prefecture coordinate, missing geocode input, or a known address-input
corruption. These conditions are reported regardless of prior manual review.

A suspended card whose distribution place is unpublished is exempt from missing
query/title warnings while its address is empty and its place is empty or only a
suspension notice. Its retained coordinate is approximate, not an asserted
distribution pin. A later status, place, address, or coordinate change is still
shown by the changed-target review.

The historical address-shortening logic remains only as manually invoked
diagnostic output. It cannot exclude or approve a target and is not part of the
scheduled workflow.

### 12.2 Manual Candidate Review

The scheduled workflow does not call public search APIs or Nominatim. It reports
the exact target, current address, coordinates, movement, map links, reasons, and
official URLs in PR comments. Candidate enrichment is run manually:

```bash
npm run audit:geocode-candidates:changed
npm run audit:geocode-candidates:issues
npm run report:geocode-candidates
npm run audit:geocode-official-evidence
```

The enrichment report keeps Places, official-page maps, official search results,
and Nominatim separate. No script selects the longest address or a highest-scored
candidate automatically. Search snippets and map listings are discovery or
coordinate evidence, not proof of card identity. An opened government or public
water/sewer authority page is primary evidence and can be the first source for a
new record without a GKP row. The reviewer must still match the prefecture,
municipality, card code/series or readable printed code, and exact distribution
place.

Nominatim is rate-limited to at least 1.1 seconds between requests, has a manual
request cap, and can never be an apply source. An official embedded coordinate is
usable only when its page context binds it to the exact distribution facility.
Places coordinates require the exact facility to be matched to a card-level
official source.

### 12.3 Approval And Persistence

Adoption decisions are explicit JSON input to `prepare:geocode-approvals`; search
results are never converted into approvals automatically. Every adopted row must
include:

- exact card and target ID
- approved latitude and longitude
- official card/distribution URL present in the generated candidates
- coordinate source: `serper-places`, `official-embedded-map`, or `manual-coordinate`
- human-readable coordinate evidence
- valid review date and decision notes
- unchanged target snapshot hash

Run `DRY_RUN=1 npm run apply:geocode-candidates` before the real apply. The apply
script rejects stale rows, Nominatim, unmatched generated coordinates, missing
evidence, and coordinates outside the expected prefecture. Applied titles contain
`手動補正`, and `sync:geocode-review-cache` stores the result under the exact card
and distribution target. A shared address cache entry cannot leak one facility's
manual coordinate into another target.

After data edits, run `sync:geocode-review-cache`, `update:codes`,
`validate:data`, `npm test`, and `scripts/summarize-location-diff.js`. The PR body
stays compact; full before/after addresses, coordinates, movement, map links,
official sources, and newly applied review evidence are synchronized as bounded,
idempotent PR comments. When a review section exceeds the comment byte budget,
each continuation repeats the section heading. A table continuation also repeats
its header and delimiter so every synchronized comment renders as a valid,
independently readable Markdown table.

The workflow does not directly push generated data to `main`. Generated changes
are reviewed through a pull request.

## 13. Source Link Normalization

`scripts/normalize-source-links.js` extracts link fields from GKP HTML by row.
It assigns those links directly only to newly imported records. For an existing
`gkp_prefecture_page` record, changed facility, stock URL, or stock text becomes
a review candidate. It does not replace the source or reviewed facts of
`official_public_body_page` records.

Rules:

- New record: distribution place column link -> `facilityUrl`
- New record: stock status column link -> `stockUrl`
- New record: stock status column text -> `stock`
- New record without a stock link: `stockUrl` falls back to the GKP prefecture page
- Existing record: differences in those fields are reported without being applied
- `conditionUrl` remains the main source URL unless manually verified
- Official-first public-body records keep their reviewed `sourceUrl`, place,
  schedule, condition, and stock even before GKP listing
- A later matching GKP row may fill missing image, series, or issue date, but
  cannot demote the official source or infer a distribution start from an issue
  date

Known verified override:

- Kanazawa Central Tourist Information Center has manually verified source,
  facility, stock, and condition URLs.

The normalization command prints current GKP row, stock-link, fallback,
preserved official-first, and review-candidate counts in the Action log. The PR
body summarizes candidate IDs and changed fields within GitHub's body limit;
synchronized PR comments and the open `[自動更新] GKP要確認候補` issue contain
every candidate and the complete before/GKP values. Any truncated body summary
states its omitted count. Candidate-only runs therefore remain visible even when
no data PR is created. Do not hard-code those moving catalogue counts in this
specification.

## 14. Deployment

Workflow:

```text
.github/workflows/pages.yml
```

Deployment flow:

1. Push to `main` or manual dispatch
2. Create `dist`
3. Copy static files into `dist`
4. Upload Pages artifact
5. Deploy to GitHub Pages

Published files:

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `robots.txt`
- `sitemap.xml`
- `icons/`
- `LICENSE`
- `NOTICE.md`
- `CNAME`
- `data/locations.json`
- `data/update-history.json`
- `data/update-form-config.json`
- `data/update-requests.json`

Importer baselines, geocode caches, and municipality reference data stay in the
repository but are not copied into the Pages artifact.

Pull request automation runs data validation, Node.js tests, a Chromium browser
smoke test, and CodeQL JavaScript/TypeScript analysis. CodeQL also runs on main
pushes and weekly. Actions are pinned to immutable commit SHAs, and Dependabot
checks both GitHub Actions and npm dependencies weekly.

Pages configuration:

- Source: GitHub Actions
- Custom domain: `mhcard-map.com`
- HTTPS: enabled

## 15. Metadata

The HTML head includes:

- Title
- Description
- Keywords
- Robots
- Theme color
- Canonical URL
- OGP metadata
- Twitter Card metadata
- Web App Manifest
- App install icon
- iOS Apple Touch Icon PNG
- MapLibre CDN version pinning with SRI

Icon source of truth:

- `icons/mhcard-icon.svg` is the master logo.
- PNG install icons are generated from the SVG master.
- `npm run generate:icons` regenerates:
  - `icons/apple-touch-icon.png`
  - `icons/icon-192.png`
  - `icons/icon-512.png`

Canonical URL:

```text
https://mhcard-map.com/
```

Startup geolocation:

- The app automatically centers on the current location only when browser
  geolocation permission is already granted.
- Otherwise it starts at the fallback map center and waits for the current
  location button.

## 16. License And Notices

Code license:

```text
MIT
```

Important exclusions:

- Card data
- Facility data
- Map data
- Card images
- Source-site text
- Other third-party materials

These are not covered by the MIT license unless explicitly stated by their
respective rights holders. See `NOTICE.md`.

## 17. Known Constraints

- Collection and memo data are browser-local only.
- There is no account sync.
- Google Forms cannot fully hide or lock prefilled fields.
- User-submitted update requests require review before data changes.
- Some coordinates are approximate.
- Some stock rows have no stock URL and fall back to the GKP prefecture page.
- External URLs may change or become unavailable.
- External links from scraped data are restricted to `http:` and `https:`.
- Collection state can be transferred manually with JSON backup and restore,
  but there is no automatic cloud backup or conflict resolution between devices.
- Optional update-history, update-request, and form-configuration resources may
  be temporarily unavailable; the map remains usable, while only the related
  optional feature is disabled for that session.
- The browser smoke suite covers the critical mobile collection flow, not every
  browser, assistive-technology, or external-map-provider combination.

## 18. Current Completion Status

Completed:

- Login removal
- Local collection and memo storage
- MapLibre map
- Current location button
- Mobile tab layout
- List-to-map focus
- Popup-tap-to-detail navigation
- Card image display in popup/detail
- Google Forms prefilled update request link
- GitHub Pages deployment workflow
- Data update pull request workflow
- Virtualized nationwide search and card-catalogue lists
- Non-blocking optional-data loading and transactional collection storage
- Pull request validation, browser smoke tests, and CodeQL analysis
- Weekly GitHub Actions and npm dependency checks through Dependabot
- Runtime-only data packaging for the Pages artifact
- Stock URL normalization from GKP stock column
- Custom domain configuration for `mhcard-map.com`
- Site metadata
- MIT license and third-party notice

No open high-priority manual setup remains in this specification.
