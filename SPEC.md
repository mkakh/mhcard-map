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
styles.css
data/locations.json
data/update-form-config.json
data/update-requests.json
scripts/import-gkp-data.js
scripts/geocode-locations.js
scripts/normalize-source-links.js
scripts/update-location-codes.js
scripts/import-form-requests.js
.github/workflows/pages.yml
.github/workflows/data-update.yml
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
- `data/update-form-config.json` configures the Google Form prefill URL.
- `data/update-requests.json` stores imported update request summaries.

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

Map rendering uses MapLibre GL JS with the MapTiler `jp-gsi-standard` style.

Features:

- Marker clustering
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
- `memo`

Storage rules:

- Data stays on the user's browser/device.
- Data is not uploaded.
- Data is not synced across devices.
- Clearing browser storage removes collection data.

The `取得数・メモ` dialog shows:

- Collected count
- Uncollected count
- Completion rate
- Prefecture-level counts
- Saved memo count
- Memo list

Memo discoverability:

- Location list shows a `メモあり` badge.
- Memo text is included in search.
- Memo list items can jump to the relevant location.

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
| `sourceUrl` | Main source URL |
| `facilityUrl` | Distribution place URL |
| `stockUrl` | Stock confirmation URL |
| `conditionUrl` | Distribution condition URL |
| `hasEnglishVersion` | Whether the GKP source indicates an English version is available |
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

Location IDs are generated from the GKP card image filename.

```text
16-205-A-01.jpg -> 16-205-a-01
```

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

## 12. Data Update Pipeline

Manual scripts:

```bash
npm run import:gkp
npm run geocode
npm run normalize:links
npm run update:codes
npm run import:forms
npm run validate:data
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

This is weekly at 18:00 UTC. The workflow can also be run manually with
`workflow_dispatch`.

Pipeline steps:

1. Import GKP data
2. Geocode locations
3. Normalize source links
4. Generate Plus Codes
5. Import Google Form responses
6. Validate generated data
7. Create a pull request

The workflow does not directly push generated data to `main`. Generated changes
are reviewed through a pull request.

## 13. Source Link Normalization

`scripts/normalize-source-links.js` extracts link fields from GKP HTML by row.

Rules:

- Distribution place column link -> `facilityUrl`
- Stock status column link -> `stockUrl`
- Stock status column text -> `stock`
- If no stock link exists, `stockUrl` falls back to the GKP prefecture page
- `conditionUrl` remains the main source URL unless manually verified

Known verified override:

- Kanazawa Central Tourist Information Center has manually verified source,
  facility, stock, and condition URLs.

Current verification result after normalization:

- GKP rows matched: 1265
- Rows with stock link: 1153
- `stockUrl` mismatches against GKP stock-link column: 0
- Rows without stock link: 112

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
- `icons/`
- `LICENSE`
- `NOTICE.md`
- `CNAME`
- `data/`

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
- Current imported data has a single `updatedAt` value, so updated-date sorting
  may not visibly change order until future updates create date differences.
- `要確認` remains a supported status filter, but the current imported dataset
  may contain no matching records.

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
- Stock URL normalization from GKP stock column
- Custom domain configuration for `mhcard-map.com`
- Site metadata
- MIT license and third-party notice

No open high-priority manual setup remains in this specification.
