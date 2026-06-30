let locations = [
  {
    id: "tokyo-fuchu-001",
    cardName: "府中市 A001",
    prefecture: "東京都",
    municipality: "府中市",
    place: "府中市観光情報センター",
    address: "東京都府中市宮町3-1",
    lat: 35.6689,
    lng: 139.4776,
    x: 63,
    y: 52,
    hours: "9:00-17:00",
    closed: "年末年始",
    condition: "1人1枚。簡単なアンケートあり",
    stock: "あり",
    status: "配布中",
    sourceUrl: "https://example.jp/fuchu",
    updatedAt: "2026-06-25"
  },
  {
    id: "kanagawa-yokohama-001",
    cardName: "横浜市 B002",
    prefecture: "神奈川県",
    municipality: "横浜市",
    place: "横浜市役所 市民情報センター",
    address: "神奈川県横浜市中区本町6-50-10",
    lat: 35.4503,
    lng: 139.6337,
    x: 62,
    y: 58,
    hours: "10:00-16:30",
    closed: "土日祝",
    condition: "窓口で希望者へ配布",
    stock: "僅少",
    status: "要確認",
    sourceUrl: "https://example.jp/yokohama",
    updatedAt: "2026-06-28"
  },
  {
    id: "saitama-kawagoe-001",
    cardName: "川越市 C003",
    prefecture: "埼玉県",
    municipality: "川越市",
    place: "川越まつり会館",
    address: "埼玉県川越市元町2-1-10",
    lat: 35.9251,
    lng: 139.4858,
    x: 60,
    y: 47,
    hours: "9:30-18:00",
    closed: "第2・第4水曜",
    condition: "入館者に配布",
    stock: "あり",
    status: "配布中",
    sourceUrl: "https://example.jp/kawagoe",
    updatedAt: "2026-06-20"
  },
  {
    id: "osaka-osaka-001",
    cardName: "大阪市 D004",
    prefecture: "大阪府",
    municipality: "大阪市",
    place: "大阪市下水道科学館",
    address: "大阪府大阪市此花区高見1-2-53",
    lat: 34.6965,
    lng: 135.4549,
    x: 43,
    y: 66,
    hours: "9:30-17:00",
    closed: "水曜",
    condition: "来館者に配布",
    stock: "あり",
    status: "配布中",
    sourceUrl: "https://example.jp/osaka",
    updatedAt: "2026-06-22"
  },
  {
    id: "kyoto-kyoto-001",
    cardName: "京都市 E005",
    prefecture: "京都府",
    municipality: "京都市",
    place: "京都市上下水道局総合庁舎",
    address: "京都府京都市南区東九条東山王町12",
    lat: 34.9858,
    lng: 135.7588,
    x: 45,
    y: 61,
    hours: "8:30-17:15",
    closed: "土日祝",
    condition: "窓口で希望者へ配布",
    stock: "不明",
    status: "休止中",
    sourceUrl: "https://example.jp/kyoto",
    updatedAt: "2026-06-18"
  },
  {
    id: "fukuoka-fukuoka-001",
    cardName: "福岡市 F006",
    prefecture: "福岡県",
    municipality: "福岡市",
    place: "福岡市情報プラザ",
    address: "福岡県福岡市中央区天神1-8-1",
    lat: 33.5902,
    lng: 130.4017,
    x: 27,
    y: 78,
    hours: "9:00-20:00",
    closed: "年末年始",
    condition: "1人1枚",
    stock: "あり",
    status: "配布中",
    sourceUrl: "https://example.jp/fukuoka",
    updatedAt: "2026-06-26"
  },
  {
    id: "hokkaido-sapporo-001",
    cardName: "札幌市 G007",
    prefecture: "北海道",
    municipality: "札幌市",
    place: "札幌市下水道科学館",
    address: "北海道札幌市北区麻生町8",
    lat: 43.1097,
    lng: 141.3391,
    x: 75,
    y: 17,
    hours: "9:30-17:00",
    closed: "月曜",
    condition: "来館者に配布",
    stock: "あり",
    status: "配布中",
    sourceUrl: "https://example.jp/sapporo",
    updatedAt: "2026-06-24"
  },
  {
    id: "miyagi-sendai-001",
    cardName: "仙台市 H008",
    prefecture: "宮城県",
    municipality: "仙台市",
    place: "仙台市観光情報センター",
    address: "宮城県仙台市青葉区中央1-1-1",
    lat: 38.2608,
    lng: 140.8814,
    x: 69,
    y: 36,
    hours: "8:30-19:00",
    closed: "なし",
    condition: "希望者に配布",
    stock: "不明",
    status: "要確認",
    sourceUrl: "https://example.jp/sendai",
    updatedAt: "2026-06-21"
  }
];

const storageKeys = {
  collections: "mhc_collections"
};

let selectedId = locations[0].id;
let hoveredId = "";
let listHoverSuspended = false;
let collections = loadJson(storageKeys.collections, {});
let updateRequests = [];
let updateFormConfig = null;
let userPosition = null;
let map = null;
let mapReady = false;
let activePopup = null;
let printMapObjectUrl = "";
let shouldFocusSelected = false;
let searchRenderTimer = 0;
let currentFilteredLocations = [];

const searchDebounceMs = 150;
const appVersion = "__APP_VERSION__";

const fallbackMapView = {
  center: [139.7671, 35.6812],
  zoom: 10
};

const mapStyleUrl = "https://api.maptiler.com/maps/jp-gsi-standard/style.json?key=7NtXoZQuzmH1mXvStgFj";

const elements = {
  searchInput: document.querySelector("#searchInput"),
  prefectureFilter: document.querySelector("#prefectureFilter"),
  collectionFilter: document.querySelector("#collectionFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  viewportFilterToggle: document.querySelector("#viewportFilterToggle"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  locationList: document.querySelector("#locationList"),
  mapCanvas: document.querySelector("#mapCanvas"),
  detailContent: document.querySelector("#detailContent"),
  totalCount: document.querySelector("#totalCount"),
  collectedCount: document.querySelector("#collectedCount"),
  requestCount: document.querySelector("#requestCount"),
  myPageButton: document.querySelector("#myPageButton"),
  myPageDialog: document.querySelector("#myPageDialog"),
  myPageContent: document.querySelector("#myPageContent"),
  closeMyPageDialog: document.querySelector("#closeMyPageDialog"),
  locateButton: document.querySelector("#locateButton"),
  printMapButton: document.querySelector("#printMapButton"),
  printMapImage: document.querySelector("#printMapImage"),
  printMapPopup: document.querySelector("#printMapPopup"),
  mobileTabButtons: document.querySelectorAll(".mobile-tab")
};

init();

async function init() {
  locations = await loadLocations();
  updateRequests = await loadUpdateRequests();
  updateFormConfig = await loadUpdateFormConfig();
  selectedId = locations[0]?.id ?? "";
  migrateCollectionKeys();
  fillPrefectures();
  bindEvents();
  switchMobilePanel("map");
  initMap();
  renderAll();
}

function bindEvents() {
  elements.searchInput.addEventListener("input", renderAllAfterSearchInput);

  [
    elements.prefectureFilter,
    elements.collectionFilter,
    elements.statusFilter,
    elements.sortSelect,
    elements.viewportFilterToggle
  ].forEach((element) => element.addEventListener("input", renderAll));

  elements.resetFiltersButton.addEventListener("click", resetFilters);
  elements.myPageButton.addEventListener("click", openMyPage);
  elements.closeMyPageDialog.addEventListener("click", () => elements.myPageDialog.close());
  elements.locateButton.addEventListener("click", locateUser);
  elements.printMapButton.addEventListener("click", printMap);
  elements.mobileTabButtons.forEach((button) => {
    button.addEventListener("click", () => switchMobilePanel(button.dataset.mobilePanel));
  });
  window.addEventListener("resize", () => {
    resizeMapSoon();
  });
  window.addEventListener("orientationchange", resizeMapAfterOrientationChange);
  window.addEventListener("beforeprint", resizeMapForPrint);
  window.addEventListener("afterprint", resizeMapAfterPrint);
}

function renderAllAfterSearchInput() {
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(renderAll, searchDebounceMs);
}

function fillPrefectures() {
  elements.prefectureFilter.querySelectorAll("option:not([value='all'])").forEach((option) => option.remove());
  const prefectures = [...new Set(locations.map((location) => location.prefecture))].sort();
  prefectures.forEach((prefecture) => {
    const option = document.createElement("option");
    option.value = prefecture;
    option.textContent = prefecture;
    elements.prefectureFilter.append(option);
  });
}

async function loadLocations() {
  try {
    const response = await fetch(versionedAssetUrl("./data/locations.json"), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const realLocations = await response.json();
    if (!Array.isArray(realLocations) || realLocations.length === 0) {
      throw new Error("locations data is empty");
    }
    showToast(`GKP実データ ${realLocations.length}件を読み込みました`);
    return realLocations;
  } catch (error) {
    console.warn("Falling back to bundled sample data:", error);
    showToast("実データを読み込めないためサンプルを表示しています");
    return locations;
  }
}

async function loadUpdateFormConfig() {
  try {
    const response = await fetch(versionedAssetUrl("./data/update-form-config.json"), { cache: "no-store" });
    if (!response.ok) return null;
    const config = await response.json();
    return config?.formUrl ? config : null;
  } catch (error) {
    console.info("Update request form is not configured:", error);
    return null;
  }
}

async function loadUpdateRequests() {
  try {
    const response = await fetch(versionedAssetUrl("./data/update-requests.json"), { cache: "no-store" });
    if (!response.ok) return [];
    const requests = await response.json();
    return Array.isArray(requests) ? requests : [];
  } catch (error) {
    console.info("Update requests data is not available:", error);
    return [];
  }
}

function versionedAssetUrl(path) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}v=${encodeURIComponent(appVersion)}`;
}

function renderAll() {
  if (searchRenderTimer) {
    window.clearTimeout(searchRenderTimer);
    searchRenderTimer = 0;
  }

  const filtered = getFilteredLocations();
  currentFilteredLocations = filtered;
  if (!filtered.some((location) => location.id === selectedId)) {
    selectedId = filtered[0]?.id ?? "";
  }

  renderList(filtered);
  renderMap(filtered);
  renderDetail();
  renderSummary(filtered);
}

function selectedOrHighlightedExpression() {
  return ["any", ["==", ["get", "selected"], true], ["==", ["get", "highlighted"], true]];
}

function getFilteredLocations() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const prefecture = elements.prefectureFilter.value;
  const collectionFilter = elements.collectionFilter.value;
  const status = elements.statusFilter.value;

  return locations
    .filter((location) => {
      const collection = collections[location.id];
      const haystack = [
        location.cardName,
        location.prefecture,
        location.municipality,
        displayPlace(location),
        location.place,
        location.address,
        location.plusCode,
        cardNumber(location),
        collection?.memo
      ].join(" ").toLowerCase();
      const collected = Boolean(collection?.collected);
      return (
        (!query || haystack.includes(query)) &&
        (prefecture === "all" || location.prefecture === prefecture) &&
        (status === "all" || location.status === status) &&
        isInsideActiveViewport(location) &&
        (collectionFilter === "all" ||
          (collectionFilter === "collected" && collected) ||
          (collectionFilter === "uncollected" && !collected))
      );
    })
    .sort(sortLocations);
}

function resetFilters() {
  clearFilters();
  elements.sortSelect.value = userPosition ? "distance" : "prefecture";
  renderAll();
  resetMapToCurrentLocation();
}

function clearFilters() {
  elements.searchInput.value = "";
  elements.prefectureFilter.value = "all";
  elements.collectionFilter.value = "all";
  elements.statusFilter.value = "all";
  elements.viewportFilterToggle.checked = false;
}

function isInsideActiveViewport(location) {
  if (!elements.viewportFilterToggle.checked || !mapReady || !map) return true;
  return map.getBounds().contains([location.lng, location.lat]);
}

function sortLocations(a, b) {
  if (elements.sortSelect.value === "updated") {
    return b.updatedAt.localeCompare(a.updatedAt);
  }

  if (elements.sortSelect.value === "cardNumber") {
    return compareCardNumber(a, b);
  }

  if (elements.sortSelect.value === "distance" && userPosition) {
    return distanceFromUser(a) - distanceFromUser(b);
  }

  return (
    prefectureCode(a).localeCompare(prefectureCode(b)) ||
    a.municipality.localeCompare(b.municipality, "ja") ||
    a.cardName.localeCompare(b.cardName, "ja")
  );
}

function prefectureCode(location) {
  return location.id.split("-")[0] || "99";
}

function cardNumber(location) {
  const id = String(location.id ?? "");
  const match = id.match(/^(\d{2})-(\d{3})-(.+)$/);
  if (!match) return id;
  const suffix = normalizeCardNumberSuffix(match[3]);
  return `${match[1]}-${match[2]}-${suffix}`;
}

function normalizeCardNumberSuffix(value) {
  const suffix = String(value ?? "").toUpperCase();
  const match = suffix.match(/^([A-Z])-?(\d{1,3})(.*)$/);
  if (!match) return suffix.replace(/-/g, "");
  return `${match[1]}${match[2].padStart(3, "0")}${match[3]}`;
}

function compareCardNumber(a, b) {
  return (
    cardNumber(a).localeCompare(cardNumber(b), "en", { numeric: true, sensitivity: "base" }) ||
    a.cardName.localeCompare(b.cardName, "ja")
  );
}

function renderList(filtered) {
  elements.locationList.replaceChildren();

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "条件に一致する配布場所がありません。";
    elements.locationList.append(empty);
    return;
  }

  filtered.forEach((location) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `location-card ${location.id === selectedId ? "active" : ""}`;
    button.addEventListener("click", () => selectListLocation(location.id));
    button.addEventListener("mouseenter", () => setHoveredLocation(location.id));
    button.addEventListener("mousemove", () => resumeListHover(location.id));
    button.addEventListener("mouseleave", () => setHoveredLocation(""));

    button.innerHTML = `
      <h3>${escapeHtml(location.cardName)}</h3>
      <p>${escapeHtml(displayPlace(location))}</p>
      <p>${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)}</p>
      <div class="badge-row">
        ${renderStatusBadge(location)}
        ${collections[location.id]?.collected ? '<span class="badge collected">取得済み</span>' : '<span class="badge">未取得</span>'}
        ${collections[location.id]?.memo ? '<span class="badge memo">メモあり</span>' : ""}
        ${renderCoordinateBadge(location)}
      </div>
    `;
    elements.locationList.append(button);
  });
}

function renderMap(filtered) {
  if (!mapReady) return;

  updateLocationSource(filtered);

  const currentSource = map.getSource("current-location");
  if (currentSource) currentSource.setData(toCurrentLocationFeatureCollection());

  if (shouldFocusSelected) {
    const selected = locations.find((location) => location.id === selectedId);
    if (selected) {
      map.easeTo({
        center: [selected.lng, selected.lat],
        zoom: selectedFocusZoom(selected),
        duration: 450
      });
    }
    shouldFocusSelected = false;
  }
}

function selectedFocusZoom(location) {
  if (isApproximateLocation(location)) return Math.min(Math.max(map.getZoom(), 6), 7);
  return Math.max(map.getZoom(), 13);
}

function selectListLocation(locationId, options = {}) {
  const location = locations.find((item) => item.id === locationId);
  if (!location) return;

  if (options.clearFilters) clearFilters();
  selectedId = location.id;
  clearHoveredLocation();
  listHoverSuspended = true;
  shouldFocusSelected = true;
  renderAll();
  switchMobilePanel("map");
  showLocationPopup(location);
}

function setHoveredLocation(locationId) {
  if (listHoverSuspended) return;
  if (hoveredId === locationId) return;
  hoveredId = locationId;
  updateLocationSource();
}

function resumeListHover(locationId) {
  if (!listHoverSuspended) return;
  listHoverSuspended = false;
  setHoveredLocation(locationId);
}

function clearHoveredLocation() {
  if (!hoveredId) return;
  hoveredId = "";
  updateLocationSource();
}

function updateLocationSource(filtered = currentFilteredLocations) {
  if (!mapReady) return;
  const source = map.getSource("locations");
  if (source) source.setData(toLocationFeatureCollection(filtered));
}

function renderDetail() {
  const location = locations.find((item) => item.id === selectedId);
  if (!location) {
    elements.detailContent.innerHTML = '<div class="empty-state">配布場所を選択してください。</div>';
    return;
  }

  const collection = collections[location.id] ?? {};
  const plusCode = location.plusCode || "未生成";
  const coordinatesText = `${location.lat}, ${location.lng}`;
  const locationIds = new Set([location.id, ...(location.legacyIds ?? [])]);
  const requestsForLocation = updateRequests.filter((request) => locationIds.has(request.locationId));
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}`;
  const sourceUrl = location.sourceUrl || "";
  const facilityUrl = location.facilityUrl || "";
  const conditionUrl = location.conditionUrl || sourceUrl;
  const stockUrl = location.stockUrl || facilityUrl || sourceUrl;
  const safeSourceUrl = safeExternalUrl(sourceUrl);

  elements.detailContent.innerHTML = `
    <section class="detail-head">
      ${renderCardImage(location, "detail")}
      <div class="badge-row">
        ${renderStatusBadge(location)}
        ${collection.collected ? '<span class="badge collected">取得済み</span>' : '<span class="badge">未取得</span>'}
        ${renderCoordinateBadge(location)}
      </div>
      <h2>${escapeHtml(location.cardName)}</h2>
      <p>${escapeHtml(displayPlace(location))}</p>
      <div class="detail-actions">
        <button id="toggleCollected" class="primary-button" type="button">${collection.collected ? "未取得に戻す" : "取得済みにする"}</button>
        <button id="openRequest" class="ghost-button" type="button">更新要求</button>
        <a class="ghost-button link-button" href="${googleUrl}" target="_blank" rel="noreferrer">Google Map</a>
        ${safeSourceUrl ? `<a class="ghost-button link-button" href="${escapeAttribute(safeSourceUrl)}" target="_blank" rel="noreferrer">配布情報元</a>` : '<button class="ghost-button" type="button" disabled>配布情報元なし</button>'}
      </div>
    </section>

    <table class="info-table">
      <tr><th>自治体</th><td>${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)}</td></tr>
      <tr><th>カード番号</th><td>${escapeHtml(cardNumber(location))}</td></tr>
      <tr><th>配布場所</th><td>${renderExternalLinkedValue(displayPlace(location), facilityUrl)}</td></tr>
      ${renderInfoCodeRow("Plus Code", plusCode, plusCode !== "未生成", "copyPlusCode", "Google Maps")}
      ${renderInfoCodeRow("緯度経度", coordinatesText, true, "copyCoordinates")}
      ${renderInfoCodeRow("住所", location.address || "未登録", Boolean(location.address), "copyAddress")}
      ${renderMapPositionRows(location)}
      <tr><th>配布状況</th><td>${renderSourceLinkedValue(location.status, sourceUrl)}</td></tr>
      <tr><th>配布時間</th><td>${escapeHtml(location.hours)}</td></tr>
      <tr><th>休館日</th><td>${escapeHtml(location.closed)}</td></tr>
      <tr><th>配布条件</th><td>${renderSourceLinkedValue(location.condition, conditionUrl)}</td></tr>
      <tr><th>在庫</th><td>${renderSourceLinkedValue(location.stock, stockUrl)}</td></tr>
      <tr><th>最終更新</th><td>${escapeHtml(location.updatedAt)}</td></tr>
      <tr><th>更新要求</th><td>${requestsForLocation.length}件</td></tr>
    </table>

    <div class="memo-box">
      <label>
        取得日
        <input id="collectedOn" type="date" value="${collection.collectedOn ?? ""}">
      </label>
      <label>
        メモ
        <textarea id="memoInput" rows="4" placeholder="駐車場、配布窓口、訪問時のメモ">${escapeHtml(collection.memo ?? "")}</textarea>
      </label>
      <button id="saveMemo" class="ghost-button" type="button">メモ保存</button>
    </div>
  `;

  document.querySelector("#toggleCollected").addEventListener("click", () => toggleCollected(location.id));
  document.querySelector("#openRequest").addEventListener("click", () => openRequestDialog(location.id));
  bindCopyButton("copyPlusCode", location.plusCode, "Plus Codeをコピーしました");
  bindCopyButton("copyCoordinates", coordinatesText, "緯度経度をコピーしました");
  bindCopyButton("copyAddress", location.address, "住所をコピーしました");
  document.querySelector("#saveMemo").addEventListener("click", () => saveMemo(location.id));
}

function renderInfoCodeRow(label, value, copyable, copyId, hint = "") {
  const hintText = hint ? ` <span class="inline-hint">${escapeHtml(hint)}</span>` : "";
  const valueControl = copyable
    ? `<button id="${copyId}" class="inline-copy" type="button">${escapeHtml(value)}</button>${hintText}`
    : `<span class="inline-disabled">${escapeHtml(value)}</span>${hintText}`;

  return `<tr><th>${escapeHtml(label)}</th><td>${valueControl}</td></tr>`;
}

function renderSourceLinkedValue(value, sourceUrl) {
  return renderExternalLinkedValue(value, sourceUrl);
}

function renderExternalLinkedValue(value, url) {
  if (!value) return "";
  const safeUrl = safeExternalUrl(url);
  if (!safeUrl) return escapeHtml(value);
  return `<a class="inline-source-link" href="${escapeAttribute(safeUrl)}" target="_blank" rel="noreferrer">${escapeHtml(value)}</a>`;
}

function displayPlace(location) {
  return location.place || location.address || `${location.prefecture} ${location.municipality}（配布場所未確認）`;
}

function bindCopyButton(id, value, message) {
  const button = document.querySelector(`#${id}`);
  if (!button || !value) return;
  button.addEventListener("click", () => copyText(value, message));
}

function renderSummary(filtered) {
  elements.totalCount.textContent = String(filtered.length);
  elements.collectedCount.textContent = String(Object.values(collections).filter((item) => item.collected).length);
  elements.requestCount.textContent = String(updateRequests.length);
}

function renderStatusBadge(location) {
  if (location.status === "休止中") {
    return '<span class="badge paused">休止中</span>';
  }

  if (location.status === "要確認") {
    return '<span class="badge review">要確認</span>';
  }

  return '<span class="badge">配布中</span>';
}

function pinClass(location) {
  const coordinateClass = coordinateCategory(location);
  if (coordinateClass !== "address") return coordinateClass;
  if (location.status === "休止中") return "paused";
  if (location.status === "要確認") return "review";
  if (collections[location.id]?.collected) return "collected";
  return "uncollected";
}

function isApproximateLocation(location) {
  return location.coordinateAccuracy !== "address";
}

function coordinateCategory(location) {
  if (location.status === "休止中" && location.address) return "stopped-known";
  if (location.status === "休止中" && !location.address) return "stopped-unknown";
  if (location.geocodeError) return "geocode-failed";
  if (location.coordinateAccuracy !== "address") return "approximate";
  return "address";
}

function renderCoordinateBadge(location) {
  const category = coordinateCategory(location);
  if (category === "address") return "";

  const labels = {
    "stopped-known": "中止・住所既知",
    "stopped-unknown": "中止・住所不明",
    "geocode-failed": "住所検索失敗",
    approximate: "座標未確定"
  };

  return `<span class="badge ${category}">${labels[category]}</span>`;
}

function renderMapPositionRows(location) {
  return mapPositionRows(location)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");
}

function mapPositionRows(location) {
  if (location.coordinateAccuracy === "address") {
    const position = location.status === "休止中" ? "住所から推定（配布中止）" : "住所から推定";
    return [
      ["地図位置", position],
      ["検索結果住所", location.geocodeTitle || location.geocodeQuery || "住所検索結果あり"]
    ];
  }

  if (location.status === "休止中" && !location.address) {
    return [
      ["地図位置", "都道府県内の仮位置"],
      ["理由", "配布中止・住所不明"]
    ];
  }

  if (location.status === "休止中" && location.address) {
    return [
      ["地図位置", "都道府県内の仮位置"],
      ["理由", `配布中止・住所検索失敗 (${location.geocodeError || "未検索"})`],
      ["抽出住所", location.address]
    ];
  }

  if (location.geocodeError) {
    return [
      ["地図位置", "都道府県内の仮位置"],
      ["理由", `住所検索に失敗 (${location.geocodeError})`],
      ["抽出住所", location.address]
    ];
  }

  return [
    ["地図位置", "都道府県内の仮位置"],
    ["理由", "住所不明"]
  ];
}

function initMap() {
  if (!window.maplibregl) {
    elements.mapCanvas.innerHTML = '<div class="empty-state">地図ライブラリを読み込めませんでした。</div>';
    return;
  }

  map = new maplibregl.Map({
    container: "mapCanvas",
    style: mapStyleUrl,
    center: fallbackMapView.center,
    zoom: fallbackMapView.zoom,
    minZoom: 3.4,
    maxZoom: 18
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");
  map.on("moveend", handleMapMoveEnd);

  map.on("load", () => {
    mapReady = true;
    map.resize();
    addLocationLayers(map);
    addCurrentLocationLayer(map);
    renderAll();
    locateUserOnStartup();
  });
}

function handleMapMoveEnd() {
  if (!elements.viewportFilterToggle.checked) return;
  renderAll();
}

function addLocationLayers(targetMap = map, bindInteractions = true) {
  targetMap.addSource("locations", {
    type: "geojson",
    data: toLocationFeatureCollection(getFilteredLocations()),
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 46,
    clusterProperties: {
      hasApproximate: ["max", ["case", ["get", "hasApproximate"], 1, 0]],
      hasStoppedUnknown: ["max", ["case", ["get", "hasStoppedUnknown"], 1, 0]],
      hasStoppedKnown: ["max", ["case", ["get", "hasStoppedKnown"], 1, 0]],
      hasGeocodeFailed: ["max", ["case", ["get", "hasGeocodeFailed"], 1, 0]]
    }
  });

  targetMap.addLayer({
    id: "clusters",
    type: "circle",
    source: "locations",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": [
        "case",
        ["==", ["get", "hasGeocodeFailed"], 1],
        "#7b7486",
        ["==", ["get", "hasStoppedUnknown"], 1],
        "#8b9298",
        ["==", ["get", "hasStoppedKnown"], 1],
        "#6f7d86",
        ["==", ["get", "hasApproximate"], 1],
        "#737373",
        ["step", ["get", "point_count"], "#4d8bc8", 20, "#2f75b5", 80, "#1d5f99"]
      ],
      "circle-radius": ["step", ["get", "point_count"], 19, 20, 25, 80, 32],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3
    }
  });

  targetMap.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "locations",
    filter: ["has", "point_count"],
    layout: {
      "text-field": "{point_count_abbreviated}",
      "text-size": 12,
      "text-font": ["Noto Sans Regular"]
    },
    paint: {
      "text-color": "#ffffff"
    }
  });

  targetMap.addLayer({
    id: "selected-location-halo",
    type: "circle",
    source: "locations",
    filter: ["all", ["!", ["has", "point_count"]], selectedOrHighlightedExpression(), ["!", ["in", ["get", "visualState"], ["literal", markerShapeStates()]]]],
    paint: {
      "circle-color": "#ffffff",
      "circle-radius": 18,
      "circle-opacity": 0.85,
      "circle-stroke-color": "#172018",
      "circle-stroke-width": 2
    }
  });

  targetMap.addLayer({
    id: "unclustered-locations",
    type: "circle",
    source: "locations",
    filter: ["all", ["!", ["has", "point_count"]], ["!", ["in", ["get", "visualState"], ["literal", markerShapeStates()]]]],
    paint: {
      "circle-color": [
        "match",
        ["get", "visualState"],
        "collected",
        "#1f7a4d",
        "paused",
        "#b68421",
        "review",
        "#6f5aa8",
        "stopped-known",
        "#6f7d86",
        "stopped-unknown",
        "#8b9298",
        "geocode-failed",
        "#7b7486",
        "approximate",
        "#737373",
        "#c5522f"
      ],
      "circle-radius": ["case", selectedOrHighlightedExpression(), 10, 7],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": [
        "match",
        ["get", "visualState"],
        ["stopped-known", "stopped-unknown", "geocode-failed", "approximate"],
        3,
        2
      ],
      "circle-stroke-opacity": [
        "match",
        ["get", "visualState"],
        ["stopped-known", "stopped-unknown", "geocode-failed", "approximate"],
        0.72,
        1
      ]
    }
  });

  targetMap.addLayer({
    id: "selected-shaped-location-halo",
    type: "circle",
    source: "locations",
    filter: ["all", ["!", ["has", "point_count"]], selectedOrHighlightedExpression(), ["in", ["get", "visualState"], ["literal", markerShapeStates()]]],
    paint: {
      "circle-color": "#ffffff",
      "circle-radius": 18,
      "circle-opacity": 0.88,
      "circle-stroke-color": "#172018",
      "circle-stroke-width": 2
    }
  });

  targetMap.addLayer({
    id: "shaped-locations",
    type: "symbol",
    source: "locations",
    filter: ["all", ["!", ["has", "point_count"]], ["in", ["get", "visualState"], ["literal", markerShapeStates()]]],
    layout: {
      "text-field": ["match", ["get", "visualState"], "stopped-known", "×", "stopped-unknown", "?", "geocode-failed", "!", "?"],
      "text-size": ["case", selectedOrHighlightedExpression(), 24, 19],
      "text-allow-overlap": true,
      "text-ignore-placement": true
    },
    paint: {
      "text-color": [
        "match",
        ["get", "visualState"],
        "stopped-known",
        "#6f7d86",
        "stopped-unknown",
        "#8b9298",
        "geocode-failed",
        "#7b7486",
        "#737373"
      ],
      "text-halo-color": "#ffffff",
      "text-halo-width": 2
    }
  });

  targetMap.addLayer({
    id: "location-hit-area",
    type: "circle",
    source: "locations",
    filter: ["all", ["!", ["has", "point_count"]]],
    paint: {
      "circle-color": "#000000",
      "circle-radius": ["case", selectedOrHighlightedExpression(), 28, 22],
      "circle-opacity": 0.01
    }
  });

  if (!bindInteractions) return;

  targetMap.on("click", "clusters", async (event) => {
    const features = targetMap.queryRenderedFeatures(event.point, { layers: ["clusters"] });
    const clusterId = features[0].properties.cluster_id;
    const zoom = await targetMap.getSource("locations").getClusterExpansionZoom(clusterId);
    targetMap.easeTo({
      center: features[0].geometry.coordinates,
      zoom
    });
  });

  targetMap.on("click", "location-hit-area", (event) => {
    selectMapFeature(event.features[0]);
  });

  ["clusters", "unclustered-locations", "shaped-locations", "location-hit-area"].forEach((layerId) => {
    targetMap.on("mouseenter", layerId, () => {
      targetMap.getCanvas().style.cursor = "pointer";
    });
    targetMap.on("mouseleave", layerId, () => {
      targetMap.getCanvas().style.cursor = "";
    });
  });
}

function markerShapeStates() {
  return ["stopped-known", "stopped-unknown", "geocode-failed"];
}

function selectMapFeature(feature) {
  selectedId = feature.properties.id;
  shouldFocusSelected = false;
  renderAll();
  showMapPopup(feature);
}

function addCurrentLocationLayer(targetMap = map) {
  targetMap.addSource("current-location", {
    type: "geojson",
    data: toCurrentLocationFeatureCollection()
  });

  targetMap.addLayer({
    id: "current-location-accuracy",
    type: "circle",
    source: "current-location",
    paint: {
      "circle-color": "#1e63b6",
      "circle-radius": 19,
      "circle-opacity": 0.18
    }
  });

  targetMap.addLayer({
    id: "current-location-point",
    type: "circle",
    source: "current-location",
    paint: {
      "circle-color": "#1e63b6",
      "circle-radius": 7,
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3
    }
  });
}

function toLocationFeatureCollection(items) {
  return {
    type: "FeatureCollection",
    features: items.map((location) => ({
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [location.lng, location.lat]
      },
      properties: {
        id: location.id,
        cardName: location.cardName,
        place: displayPlace(location),
        imageUrl: location.imageUrl || "",
        municipality: `${location.prefecture} ${location.municipality}`,
        status: location.status,
        coordinateAccuracy: location.coordinateAccuracy || "prefecture_approx",
        collected: Boolean(collections[location.id]?.collected),
        selected: location.id === selectedId,
        highlighted: location.id === hoveredId,
        visualState: pinClass(location),
        hasApproximate: isApproximateLocation(location),
        hasStoppedUnknown: coordinateCategory(location) === "stopped-unknown",
        hasStoppedKnown: coordinateCategory(location) === "stopped-known",
        hasGeocodeFailed: coordinateCategory(location) === "geocode-failed"
      }
    }))
  };
}

function toCurrentLocationFeatureCollection() {
  return {
    type: "FeatureCollection",
    features: userPosition
      ? [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [userPosition.lng, userPosition.lat]
            },
            properties: {}
          }
        ]
      : []
  };
}

function showMapPopup(feature) {
  showManagedPopup({
    locationId: feature.properties.id,
    coordinates: feature.geometry.coordinates,
    imageUrl: feature.properties.imageUrl,
    cardName: feature.properties.cardName,
    place: feature.properties.place
  });
}

function showLocationPopup(location) {
  if (!mapReady) return;

  showManagedPopup({
    locationId: location.id,
    coordinates: [location.lng, location.lat],
    imageUrl: location.imageUrl || "",
    cardName: location.cardName,
    place: displayPlace(location)
  });
}

function showManagedPopup({ locationId, coordinates, imageUrl, cardName, place }) {
  if (!mapReady) return;

  activePopup?.remove();
  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 12 })
    .setLngLat(coordinates)
    .setHTML(`
      <button class="map-popup-card" type="button" data-popup-location="${escapeAttribute(locationId)}">
        ${renderPopupImage(imageUrl || "", cardName)}
        <span class="map-popup-title">${escapeHtml(cardName)}</span>
        <span class="map-popup-subtitle">${escapeHtml(place)}</span>
      </button>
    `)
    .addTo(map);
  activePopup = popup;
  popup.getElement().querySelector("[data-popup-location]")?.addEventListener("click", () => {
    selectedId = locationId;
    renderAll();
    switchMobilePanel("detail");
  });
  popup.on("close", () => {
    if (activePopup === popup) activePopup = null;
  });
}

function renderCardImage(location, variant) {
  if (!location.imageUrl) return "";

  return `
    <figure class="card-image ${variant}">
      <img src="${escapeAttribute(location.imageUrl)}" alt="${escapeAttribute(`${location.cardName} カード画像`)}" loading="lazy">
    </figure>
  `;
}

function renderPopupImage(imageUrl, cardName) {
  if (!imageUrl) return "";

  return `
    <img class="map-popup-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(`${cardName} カード画像`)}" loading="lazy">
  `;
}

function renderPrintPopupImage(imageUrl, cardName) {
  if (!imageUrl) return "";

  return `
    <img class="map-popup-image" src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(`${cardName} card image`)}" loading="eager">
  `;
}

function toggleCollected(locationId) {
  const current = collections[locationId] ?? {};
  collections[locationId] = {
    ...current,
    collected: !current.collected,
    collectedOn: current.collectedOn || new Date().toISOString().slice(0, 10)
  };
  saveJson(storageKeys.collections, collections);
  renderAll();
}

function saveMemo(locationId) {
  collections[locationId] = {
    ...(collections[locationId] ?? {}),
    collected: Boolean(collections[locationId]?.collected),
    collectedOn: document.querySelector("#collectedOn").value,
    memo: document.querySelector("#memoInput").value.trim()
  };
  saveJson(storageKeys.collections, collections);
  showToast("メモを保存しました");
  renderAll();
}

function openRequestDialog(locationId) {
  const location = locations.find((item) => item.id === locationId);
  const url = buildUpdateRequestUrl(location);
  if (!url) {
    showToast("更新要求フォームが未設定です。data/update-form-config.json にGoogle Formを設定してください");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function buildUpdateRequestUrl(location) {
  if (!location || !updateFormConfig?.formUrl) return "";

  const url = new URL(updateFormConfig.formUrl);
  const entries = updateFormConfig.entries ?? {};
  const values = {
    locationId: location.id,
    cardName: location.cardName,
    prefecture: location.prefecture,
    municipality: location.municipality,
    place: location.place,
    address: location.address,
    sourceUrl: location.sourceUrl,
    facilityUrl: location.facilityUrl,
    stockUrl: location.stockUrl,
    conditionUrl: location.conditionUrl
  };

  Object.entries(entries).forEach(([key, entryId]) => {
    if (!entryId || values[key] == null) return;
    url.searchParams.set(entryId, values[key]);
  });

  return url.toString();
}

function openMyPage() {
  const collectedLocations = locations.filter((location) => collections[location.id]?.collected);
  const memoLocations = locations.filter((location) => collections[location.id]?.memo);
  const progressPercent = locations.length ? Math.round((collectedLocations.length / locations.length) * 100) : 0;
  const byPrefecture = locations.reduce((acc, location) => {
    acc[location.prefecture] ??= { total: 0, collected: 0 };
    acc[location.prefecture].total += 1;
    if (collections[location.id]?.collected) acc[location.prefecture].collected += 1;
    return acc;
  }, {});

  elements.myPageContent.innerHTML = `
    <div class="progress-grid">
      <div class="progress-card"><strong>${collectedLocations.length}</strong><span>取得済み</span></div>
      <div class="progress-card"><strong>${locations.length - collectedLocations.length}</strong><span>未取得</span></div>
      <div class="progress-card"><strong>${progressPercent}%</strong><span>達成率</span></div>
    </div>
    <table class="info-table">
      ${Object.entries(byPrefecture)
        .map(([prefecture, value]) => `<tr><th>${escapeHtml(prefecture)}</th><td>${value.collected}/${value.total}</td></tr>`)
        .join("")}
    </table>
    <table class="info-table">
      <tr><th>保存済みメモ</th><td>${Object.values(collections).filter((item) => item.memo).length}件</td></tr>
      <tr><th>保存先</th><td>この端末のブラウザ</td></tr>
    </table>
    <section class="memo-list">
      <h3>メモあり</h3>
      ${
        memoLocations.length
          ? memoLocations
              .map(
                (location) => `
                  <button class="memo-list-item" type="button" data-memo-location="${escapeAttribute(location.id)}">
                    <strong>${escapeHtml(location.cardName)}</strong>
                    <span>${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)} / ${escapeHtml(displayPlace(location))}</span>
                    <small>${escapeHtml(collections[location.id].memo)}</small>
                  </button>
                `
              )
              .join("")
          : '<p class="inline-hint">保存済みメモはありません。</p>'
      }
    </section>
  `;
  elements.myPageContent.querySelectorAll("[data-memo-location]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.myPageDialog.close();
      selectListLocation(button.dataset.memoLocation, { clearFilters: true });
      switchMobilePanel("detail");
    });
  });
  elements.myPageDialog.showModal();
}

function switchMobilePanel(panel) {
  if (!panel) return;

  document.body.dataset.mobilePanel = panel;
  elements.mobileTabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mobilePanel === panel);
    button.setAttribute("aria-selected", String(button.dataset.mobilePanel === panel));
  });

  if (panel === "map" && mapReady) {
    resizeMapAfterLayoutChange();
  }
}

function resizeMapSoon() {
  if (!mapReady) return;
  window.requestAnimationFrame(() => {
    map.resize();
    updateLocationSource();
  });
}

function resizeMapAfterLayoutChange() {
  [0, 120, 320].forEach((delay) => {
    window.setTimeout(resizeMapSoon, delay);
  });
}

function resizeMapAfterOrientationChange() {
  [0, 120, 320, 700].forEach((delay) => {
    window.setTimeout(resizeMapSoon, delay);
  });
}

async function printMap() {
  if (!mapReady) {
    showToast("地図の読み込み完了後に印刷してください");
    return;
  }

  elements.printMapButton.disabled = true;

  try {
    await preparePrintMapImage();
    resizeMapForPrint();
    window.setTimeout(() => window.print(), 80);
  } catch (error) {
    console.error(error);
    cleanupPrintMapImage();
    showToast("印刷用地図を作成できませんでした。地図の読み込み後に再試行してください");
  } finally {
    window.setTimeout(() => {
      elements.printMapButton.disabled = false;
    }, 1000);
  }
}

function resizeMapForPrint() {
  document.body.classList.add("printing-map");
  [0, 80, 180, 300].forEach((delay) => {
    window.setTimeout(resizeMapSoon, delay);
  });
}

function resizeMapAfterPrint() {
  document.body.classList.remove("printing-map");
  cleanupPrintMapImage();
  [0, 120, 320].forEach((delay) => {
    window.setTimeout(resizeMapSoon, delay);
  });
}

async function preparePrintMapImage() {
  cleanupPrintMapImage();

  const renderer = ensurePrintMapRenderer();
  renderer.replaceChildren();

  const printMap = new maplibregl.Map({
    container: renderer,
    style: mapStyleUrl,
    center: map.getCenter().toArray(),
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
    interactive: false,
    attributionControl: false,
    fadeDuration: 0,
    canvasContextAttributes: {
      preserveDrawingBuffer: true,
      antialias: true
    }
  });

  try {
    await waitForMapEvent(printMap, "load", 10000);
    addLocationLayers(printMap, false);
    addCurrentLocationLayer(printMap);
    printMap.resize();
    printMap.triggerRepaint();
    await waitForMapIdle(printMap, 10000);
    await waitForAnimationFrames(2);
    printMapObjectUrl = await canvasToObjectUrl(printMap.getCanvas());
    elements.printMapImage.src = printMapObjectUrl;
    renderPrintMapPopup(printMap);
    await waitForImage(elements.printMapImage);
    await waitForImages(elements.printMapPopup);
  } finally {
    printMap.remove();
    renderer.remove();
  }
}

function renderPrintMapPopup(targetMap) {
  if (!activePopup) {
    clearPrintMapPopup();
    return;
  }

  const location = locations.find((item) => item.id === selectedId);
  if (!location || !Number.isFinite(location.lng) || !Number.isFinite(location.lat)) {
    clearPrintMapPopup();
    return;
  }

  if (!targetMap.getBounds().contains([location.lng, location.lat])) {
    clearPrintMapPopup();
    return;
  }

  const point = targetMap.project([location.lng, location.lat]);
  const mapWidth = targetMap.getContainer().clientWidth;
  const mapHeight = targetMap.getContainer().clientHeight;
  const popupWidth = 220;
  const popupHeight = location.imageUrl ? 205 : 78;
  const horizontalPadding = 12;
  const verticalPadding = 12;
  const markerGap = 18;
  const left = clamp(point.x, popupWidth / 2 + horizontalPadding, mapWidth - popupWidth / 2 - horizontalPadding);
  const top = clamp(point.y - markerGap, popupHeight + verticalPadding, mapHeight - verticalPadding);

  elements.printMapPopup.style.setProperty("--popup-left", `${(left / mapWidth) * 100}%`);
  elements.printMapPopup.style.setProperty("--popup-top", `${(top / mapHeight) * 100}%`);
  elements.printMapPopup.innerHTML = `
    <div class="print-popup-card">
      ${renderPrintPopupImage(location.imageUrl || "", location.cardName)}
      <span class="map-popup-title">${escapeHtml(location.cardName)}</span>
      <span class="map-popup-subtitle">${escapeHtml(displayPlace(location))}</span>
    </div>
  `;
}

function clearPrintMapPopup() {
  if (!elements.printMapPopup) return;
  elements.printMapPopup.innerHTML = "";
  elements.printMapPopup.removeAttribute("style");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function ensurePrintMapRenderer() {
  const renderer = document.createElement("div");
  renderer.className = "print-map-renderer";
  document.body.append(renderer);
  return renderer;
}

function waitForMapEvent(targetMap, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error(`Timed out waiting for map ${eventName}`));
    }, timeoutMs);

    targetMap.once(eventName, () => {
      window.clearTimeout(timeout);
      resolve();
    });
  });
}

function waitForMapIdle(targetMap, timeoutMs) {
  return new Promise((resolve) => {
    if (targetMap.loaded()) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(resolve, timeoutMs);
    targetMap.once("idle", () => {
      window.clearTimeout(timeout);
      resolve();
    });
  });
}

function waitForAnimationFrames(count) {
  return new Promise((resolve) => {
    const step = (remaining) => {
      if (remaining <= 0) {
        resolve();
        return;
      }
      window.requestAnimationFrame(() => step(remaining - 1));
    };
    step(count);
  });
}

function waitForImage(image) {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  if (image.decode) {
    return image.decode().catch(() => undefined);
  }

  return new Promise((resolve) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener("error", resolve, { once: true });
  });
}

function waitForImages(container) {
  if (!container) return Promise.resolve();
  const images = Array.from(container.querySelectorAll("img"));
  return Promise.all(images.map(waitForImage));
}

function canvasToObjectUrl(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Map canvas could not be exported"));
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}

function cleanupPrintMapImage() {
  if (printMapObjectUrl) {
    URL.revokeObjectURL(printMapObjectUrl);
    printMapObjectUrl = "";
  }

  if (elements.printMapImage) {
    elements.printMapImage.removeAttribute("src");
  }

  clearPrintMapPopup();
}

function locateUser() {
  if (!navigator.geolocation) {
    focusFallbackMapView();
    showToast("現在地取得に対応していません");
    return;
  }

  elements.locateButton.textContent = "取得中...";
  elements.locateButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      applyUserPosition(position, { zoom: 11, duration: 650 });
      showToast("現在地を表示し、最寄り順に並べ替えました");
    },
    () => {
      elements.locateButton.textContent = "現在地";
      elements.locateButton.disabled = false;
      focusFallbackMapView();
      showToast("現在地を取得できませんでした。東京中心で表示します");
    },
    { enableHighAccuracy: false, timeout: 8000 }
  );
}

function locateUserOnStartup() {
  if (!navigator.geolocation) {
    focusFallbackMapView();
    return;
  }

  if (!navigator.permissions?.query) {
    focusFallbackMapView();
    return;
  }

  navigator.permissions
    .query({ name: "geolocation" })
    .then((permission) => {
      if (permission.state === "granted") requestStartupLocation();
      else focusFallbackMapView();
    })
    .catch(focusFallbackMapView);
}

function requestStartupLocation() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      applyUserPosition(position, { zoom: 10, duration: 0 });
      showToast("現在地を初期表示しました");
    },
    () => {
      elements.locateButton.textContent = "現在地";
      elements.locateButton.disabled = false;
      focusFallbackMapView();
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
  );
}

function resetMapToCurrentLocation() {
  if (userPosition) {
    elements.sortSelect.value = "distance";
    applyStoredUserPosition({ zoom: 10, duration: 450 });
    showToast("フィルターをリセットし、現在地中心に戻しました");
    return;
  }

  if (!navigator.geolocation) {
    focusFallbackMapView();
    showToast("フィルターをリセットしました。東京中心で表示します");
    return;
  }

  elements.locateButton.textContent = "取得中...";
  elements.locateButton.disabled = true;
  navigator.geolocation.getCurrentPosition(
    (position) => {
      applyUserPosition(position, { zoom: 10, duration: 450 });
      showToast("フィルターをリセットし、現在地中心に戻しました");
    },
    () => {
      elements.locateButton.textContent = "現在地";
      elements.locateButton.disabled = false;
      focusFallbackMapView();
      showToast("フィルターをリセットしました。現在地取得に失敗したため東京中心で表示します");
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
  );
}

function applyStoredUserPosition(options = {}) {
  elements.sortSelect.value = "distance";
  const nearest = [...locations].sort((a, b) => distanceFromUser(a) - distanceFromUser(b))[0];
  if (nearest) selectedId = nearest.id;
  elements.locateButton.classList.add("active");
  elements.locateButton.textContent = "現在地";
  elements.locateButton.disabled = false;
  shouldFocusSelected = false;

  if (mapReady) {
    map.easeTo({
      center: [userPosition.lng, userPosition.lat],
      zoom: options.zoom ?? 10,
      duration: options.duration ?? 450
    });
  }

  renderAll();
}

function focusFallbackMapView() {
  elements.sortSelect.value = "prefecture";
  selectedId = getFilteredLocations()[0]?.id ?? locations[0]?.id ?? "";
  elements.locateButton.classList.remove("active");
  elements.locateButton.textContent = "現在地";
  elements.locateButton.disabled = false;
  shouldFocusSelected = false;

  if (mapReady) {
    map.easeTo({
      center: fallbackMapView.center,
      zoom: fallbackMapView.zoom,
      duration: 450
    });
  }

  renderAll();
}

function applyUserPosition(position, options = {}) {
  userPosition = {
    lat: position.coords.latitude,
    lng: position.coords.longitude
  };
  elements.sortSelect.value = "distance";
  applyStoredUserPosition(options);
}

function distanceFromUser(location) {
  if (!userPosition) return Number.POSITIVE_INFINITY;
  const latDiff = location.lat - userPosition.lat;
  const averageLat = ((location.lat + userPosition.lat) / 2) * (Math.PI / 180);
  const lngDiff = (location.lng - userPosition.lng) * Math.cos(averageLat);
  return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast("コピーできませんでした");
  }
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function loadJson(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  if (value === null) {
    localStorage.removeItem(key);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}

function migrateCollectionKeys() {
  let changed = false;

  locations.forEach((location) => {
    (location.legacyIds ?? []).forEach((legacyId) => {
      if (!legacyId || legacyId === location.id || !collections[legacyId]) return;
      collections[location.id] = {
        ...collections[legacyId],
        ...(collections[location.id] ?? {})
      };
      delete collections[legacyId];
      changed = true;
    });
  });

  if (changed) saveJson(storageKeys.collections, collections);
}

function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(String(value).trim(), window.location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}
