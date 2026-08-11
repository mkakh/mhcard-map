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
let selectedPlaceId = "";
let hoveredId = "";
let listHoverSuspended = false;
let collections = loadJson(storageKeys.collections, {});
let updateRequests = [];
let updateHistory = { version: 1, updates: [] };
let updateFormConfig = null;
let updateFormConfigLoaded = false;
let userPosition = null;
let map = null;
let mapReady = false;
let activePopup = null;
let printMapObjectUrl = "";
let shouldFocusSelected = false;
let searchRenderTimer = 0;
let currentFilteredLocations = [];
let locationListVirtualizer = null;
let locationListRenderFrame = 0;
let myPageTab = "summary";
let cardCatalogPrefecture = "all";
let cardCatalogSeries = "all";
let cardCatalogVirtualizer = null;
let cardCatalogRenderFrame = 0;
let updateHistoryBatchLimit = 3;

const searchDebounceMs = 150;
const locationListRowGap = 8;
const locationListOverscanRows = 3;
const cardCatalogOverscanRows = 4;
const appVersion = "__APP_VERSION__";

const fallbackMapView = {
  center: [139.7671, 35.6812],
  zoom: 10
};

const mapStyle = {
  version: 8,
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  sources: {
    "gsi-standard": {
      type: "raster",
      tiles: ["https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png"],
      tileSize: 256,
      minzoom: 2,
      maxzoom: 18,
      attribution: '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noreferrer">国土地理院</a>'
    }
  },
  layers: [
    {
      id: "gsi-standard",
      type: "raster",
      source: "gsi-standard",
      minzoom: 2,
      maxzoom: 19
    }
  ]
};

const elements = {
  searchInput: document.querySelector("#searchInput"),
  prefectureFilter: document.querySelector("#prefectureFilter"),
  collectionFilter: document.querySelector("#collectionFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  viewportFilterToggle: document.querySelector("#viewportFilterToggle"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  sidebar: document.querySelector(".sidebar"),
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
  updateHistoryButton: document.querySelector("#updateHistoryButton"),
  updateHistoryDialog: document.querySelector("#updateHistoryDialog"),
  updateHistoryContent: document.querySelector("#updateHistoryContent"),
  closeUpdateHistoryDialog: document.querySelector("#closeUpdateHistoryDialog"),
  locateButton: document.querySelector("#locateButton"),
  printMapButton: document.querySelector("#printMapButton"),
  printMapImage: document.querySelector("#printMapImage"),
  printMapPopup: document.querySelector("#printMapPopup"),
  mobileTabButtons: document.querySelectorAll(".mobile-tab")
};

init();

async function init() {
  const locationsPromise = loadLocations();
  const requestsPromise = loadUpdateRequests().then((value) => {
    updateRequests = value;
    renderSummary(currentFilteredLocations);
  });
  const historyPromise = loadUpdateHistory().then((value) => {
    updateHistory = value;
    if (elements.updateHistoryDialog.open) renderUpdateHistory();
  });
  const formConfigPromise = loadUpdateFormConfig().then((value) => {
    updateFormConfig = value;
  }).finally(() => {
    updateFormConfigLoaded = true;
    updateRequestButtonState();
  });

  locations = await locationsPromise;
  selectedId = locations[0]?.id ?? "";
  migrateCollectionKeys();
  fillPrefectures();
  bindEvents();
  startLocationListVirtualizer();
  switchMobilePanel("map");
  initMap();
  renderAll();

  void Promise.all([requestsPromise, historyPromise, formConfigPromise]);
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
  elements.locationList.addEventListener("click", handleLocationListClick);
  elements.locationList.addEventListener("keydown", handleLocationListKeydown);
  elements.locationList.addEventListener("pointerover", handleLocationListPointerOver);
  elements.locationList.addEventListener("pointerout", handleLocationListPointerOut);
  elements.myPageButton.addEventListener("click", openMyPage);
  elements.closeMyPageDialog.addEventListener("click", () => elements.myPageDialog.close());
  elements.myPageDialog.addEventListener("close", disposeCardCatalogVirtualizer);
  elements.myPageContent.addEventListener("click", handleCardCatalogClick);
  elements.myPageContent.addEventListener("error", handleCardCatalogImageError, true);
  elements.updateHistoryButton.addEventListener("click", openUpdateHistory);
  elements.closeUpdateHistoryDialog.addEventListener("click", () => elements.updateHistoryDialog.close());
  elements.updateHistoryContent.addEventListener("click", handleUpdateHistoryClick);
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

async function loadUpdateHistory() {
  try {
    const response = await fetch(versionedAssetUrl("./data/update-history.json"), { cache: "no-store" });
    if (!response.ok) return { version: 1, updates: [] };
    const history = await response.json();
    return Array.isArray(history?.updates) ? history : { version: 1, updates: [] };
  } catch (error) {
    console.info("Update history is not available:", error);
    return { version: 1, updates: [] };
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
    selectedPlaceId = "";
  }
  const selectedLocation = locations.find((location) => location.id === selectedId);
  if (selectedLocation && !allDistributionPlaces(selectedLocation).some((place) => place.id === selectedPlaceId)) {
    selectedPlaceId = primaryDistributionPlace(selectedLocation).id;
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
        officialDesignNamesText(location),
        location.prefecture,
        location.municipality,
        displayPlace(location),
        location.place,
        location.address,
        allDistributionPlaces(location).map((place) => [place.name, place.address, place.days, place.hours].join(" ")).join(" "),
        englishVersionSearchText(location),
        location.plusCode,
        cardNumber(location),
        Object.values(placeMemos(collection)).join(" ")
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
  return allDistributionPlaces(location).some((place) => map.getBounds().contains([place.lng, place.lat]));
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
  if (filtered.length === 0) {
    locationListVirtualizer.items = [];
    locationListVirtualizer.startIndex = -1;
    locationListVirtualizer.endIndex = -1;
    elements.locationList.replaceChildren();
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "条件に一致する配布場所がありません。";
    elements.locationList.append(empty);
    return;
  }

  const itemsChanged = locationListVirtualizer.items.length !== filtered.length
    || locationListVirtualizer.items.some((location, index) => location.id !== filtered[index]?.id);
  if (itemsChanged && locationListVirtualizer.items.length) {
    elements.sidebar.scrollTop = Math.min(elements.sidebar.scrollTop, elements.locationList.offsetTop);
  }
  locationListVirtualizer.items = filtered;
  if (itemsChanged) {
    locationListVirtualizer.startIndex = -1;
    locationListVirtualizer.endIndex = -1;
  }
  renderLocationListVirtualWindow({ force: true });
}

function startLocationListVirtualizer() {
  const scheduleRender = () => {
    if (locationListRenderFrame) return;
    locationListRenderFrame = window.requestAnimationFrame(() => {
      locationListRenderFrame = 0;
      renderLocationListVirtualWindow();
    });
  };
  locationListVirtualizer = {
    items: [],
    startIndex: -1,
    endIndex: -1,
    scheduleRender,
    resizeObserver: null
  };
  elements.sidebar.addEventListener("scroll", scheduleRender, { passive: true });
  if ("ResizeObserver" in window) {
    locationListVirtualizer.resizeObserver = new ResizeObserver(scheduleRender);
    locationListVirtualizer.resizeObserver.observe(elements.sidebar);
  } else {
    window.addEventListener("resize", scheduleRender);
  }
}

function renderLocationListVirtualWindow({ force = false } = {}) {
  const virtualizer = locationListVirtualizer;
  if (!virtualizer) return;
  const itemCount = virtualizer.items.length;
  if (!itemCount) return;

  const listTop = elements.locationList.offsetTop + 12;
  const viewportHeight = elements.sidebar.clientHeight || window.innerHeight || 600;
  const rowHeight = getLocationListRowHeight();
  const stride = rowHeight + locationListRowGap;
  const totalHeight = itemCount * stride - locationListRowGap;
  const viewportStart = Math.min(
    Math.max(0, totalHeight - viewportHeight),
    Math.max(0, elements.sidebar.scrollTop - listTop)
  );
  const firstVisible = Math.floor(viewportStart / stride);
  const visibleRows = Math.ceil(viewportHeight / stride) + 1;
  const startIndex = Math.max(0, firstVisible - locationListOverscanRows);
  const endIndex = Math.min(itemCount, firstVisible + visibleRows + locationListOverscanRows);
  elements.locationList.style.setProperty("--location-list-total-height", `${totalHeight}px`);
  if (!force && startIndex === virtualizer.startIndex && endIndex === virtualizer.endIndex) return;
  const focusedLocationId = document.activeElement?.closest?.("[data-location-list-id]")?.dataset.locationListId ?? "";
  virtualizer.startIndex = startIndex;
  virtualizer.endIndex = endIndex;
  elements.locationList.innerHTML = `
    <div class="location-list-virtual-space" style="height:${totalHeight}px">
      <div class="location-list-window" style="transform:translateY(${startIndex * stride}px)">
        ${virtualizer.items.slice(startIndex, endIndex).map((location, index) => renderLocationListCard(location, startIndex + index, itemCount)).join("")}
      </div>
    </div>
  `;
  if (focusedLocationId) findRenderedLocationButton(focusedLocationId)?.focus({ preventScroll: true });
}

function renderLocationListCard(location, index, total) {
  return `
    <div
      class="location-list-item"
      role="listitem"
      aria-posinset="${index + 1}"
      aria-setsize="${total}"
    >
      <button
        type="button"
        class="location-card${location.id === selectedId ? " active" : ""}"
        data-location-list-id="${escapeAttribute(location.id)}"
        ${location.id === selectedId ? 'aria-current="true"' : ""}
      >
        <h3>${escapeHtml(location.cardName)}</h3>
        <p>${escapeHtml(displayPlace(location))}</p>
        <p>${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)}</p>
        <div class="badge-row">
          ${renderStatusBadge(location)}
          ${renderEnglishVersionBadge(location)}
          ${collections[location.id]?.collected ? '<span class="badge collected">取得済み</span>' : '<span class="badge">未取得</span>'}
          ${Object.keys(placeMemos(collections[location.id])).length > 0 ? '<span class="badge memo">メモあり</span>' : ""}
          ${renderCoordinateBadge(location, primaryDistributionPlace(location))}
        </div>
      </button>
    </div>
  `;
}

function handleLocationListClick(event) {
  const button = event.target.closest("[data-location-list-id]");
  if (button) selectListLocation(button.dataset.locationListId);
}

function handleLocationListKeydown(event) {
  if (!locationListVirtualizer || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const button = event.target.closest("[data-location-list-id]");
  if (!button) return;
  const currentIndex = locationListVirtualizer.items.findIndex((location) => location.id === button.dataset.locationListId);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;
  if (event.key === "ArrowDown") nextIndex = Math.min(locationListVirtualizer.items.length - 1, currentIndex + 1);
  if (event.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = locationListVirtualizer.items.length - 1;
  if (nextIndex === currentIndex) return;

  event.preventDefault();
  focusLocationListIndex(nextIndex);
}

function focusLocationListIndex(index) {
  const virtualizer = locationListVirtualizer;
  const location = virtualizer?.items[index];
  if (!location) return;
  const rowHeight = getLocationListRowHeight();
  const stride = rowHeight + locationListRowGap;
  const listTop = elements.locationList.offsetTop + 12;
  const itemTop = listTop + index * stride;
  const itemBottom = itemTop + rowHeight;
  const viewportTop = elements.sidebar.scrollTop;
  const viewportBottom = viewportTop + elements.sidebar.clientHeight;

  if (itemTop < viewportTop) elements.sidebar.scrollTop = itemTop;
  else if (itemBottom > viewportBottom) elements.sidebar.scrollTop = itemBottom - elements.sidebar.clientHeight;
  renderLocationListVirtualWindow({ force: true });
  findRenderedLocationButton(location.id)?.focus({ preventScroll: true });
}

function getLocationListRowHeight() {
  const value = Number.parseFloat(getComputedStyle(elements.locationList).getPropertyValue("--location-list-row-height"));
  return Number.isFinite(value) && value > 0 ? value : 204;
}

function findRenderedLocationButton(locationId) {
  return [...elements.locationList.querySelectorAll("[data-location-list-id]")]
    .find((button) => button.dataset.locationListId === locationId);
}

function handleLocationListPointerOver(event) {
  const button = event.target.closest("[data-location-list-id]");
  if (!button || button.contains(event.relatedTarget)) return;
  if (listHoverSuspended) resumeListHover(button.dataset.locationListId);
  else setHoveredLocation(button.dataset.locationListId);
}

function handleLocationListPointerOut(event) {
  const button = event.target.closest("[data-location-list-id]");
  if (!button || button.contains(event.relatedTarget)) return;
  setHoveredLocation("");
}

function renderMap(filtered) {
  if (!mapReady) return;

  updateLocationSource(filtered);

  const currentSource = map.getSource("current-location");
  if (currentSource) currentSource.setData(toCurrentLocationFeatureCollection());

  if (shouldFocusSelected) {
    const selected = locations.find((location) => location.id === selectedId);
    if (selected) {
      const place = selectedDistributionPlace(selected);
      map.easeTo({
        center: [place.lng, place.lat],
        zoom: selectedFocusZoom(selected, place),
        duration: 450
      });
    }
    shouldFocusSelected = false;
  }
}

function selectedFocusZoom(location, place = selectedDistributionPlace(location)) {
  if (isApproximatePlace(location, place)) return Math.min(Math.max(map.getZoom(), 6), 7);
  return Math.max(map.getZoom(), 13);
}

function selectListLocation(locationId, options = {}) {
  const location = locations.find((item) => item.id === locationId);
  if (!location) return;

  if (options.clearFilters) clearFilters();
  selectedId = location.id;
  selectedPlaceId = primaryDistributionPlace(location).id;
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
  const places = allDistributionPlaces(location);
  const selectedPlace = selectedDistributionPlace(location);
  const plusCode = selectedPlace.plusCode || "未生成";
  const selectedAddress = selectedPlace.address || location.address || "未登録";
  const coordinatesText = `${selectedPlace.lat}, ${selectedPlace.lng}`;
  const locationIds = new Set([location.id, ...(location.legacyIds ?? [])]);
  const requestsForLocation = updateRequests.filter((request) => locationIds.has(request.locationId));
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedPlace.lat},${selectedPlace.lng}`)}`;
  const sourceUrl = location.sourceUrl || "";
  const facilityUrl = selectedPlace.url || location.facilityUrl || "";
  const conditionUrl = location.conditionUrl || sourceUrl;
  const stockUrl = location.stockUrl || facilityUrl || sourceUrl;
  const safeSourceUrl = safeExternalUrl(sourceUrl);

  elements.detailContent.innerHTML = `
    <section class="detail-head">
      ${renderCardImage(location, "detail")}
      <div class="badge-row">
        ${renderStatusBadge(location)}
        ${collection.collected ? '<span class="badge collected">取得済み</span>' : '<span class="badge">未取得</span>'}
        ${renderCoordinateBadge(location, selectedPlace)}
      </div>
      <h2>${escapeHtml(location.cardName)}</h2>
      <p>${escapeHtml(selectedPlace.name)}</p>
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
      <tr><th>英語版</th><td>${renderEnglishVersionValue(location)}</td></tr>
      <tr><th>配布場所</th><td>${renderExternalLinkedValue(selectedPlace.name, facilityUrl)}</td></tr>
      ${renderInfoCodeRow("Plus Code", plusCode, plusCode !== "未生成", "copyPlusCode", "Google Maps")}
      ${renderInfoCodeRow("緯度経度", coordinatesText, true, "copyCoordinates")}
      ${renderInfoCodeRow("住所", selectedAddress, selectedAddress !== "未登録", "copyAddress")}
      ${renderMapPositionRows(location, selectedPlace)}
      <tr><th>配布状況</th><td>${renderSourceLinkedValue(location.status, sourceUrl)}</td></tr>
      ${renderDistributionScheduleRows(location, selectedPlace)}
      <tr><th>配布時間</th><td>${escapeHtml(selectedPlace.hours || location.hours || "未登録")}</td></tr>
      <tr><th>休館日</th><td>${escapeHtml(selectedPlace.closed || location.closed || "未登録")}</td></tr>
      <tr><th>配布条件</th><td>${renderSourceLinkedValue(location.condition, conditionUrl)}</td></tr>
      <tr><th>在庫</th><td>${renderSourceLinkedValue(location.stock, stockUrl)}</td></tr>
      <tr><th>最終更新</th><td>${escapeHtml(location.updatedAt)}</td></tr>
      <tr><th>更新要求</th><td>${requestsForLocation.length}件</td></tr>
    </table>

    ${renderDistributionPlaces(location, places, collection)}

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

  document.querySelector("#memoInput")?.closest("label")?.remove();
  updateRequestButtonState();
  document.querySelector("#toggleCollected").addEventListener("click", () => toggleCollected(location.id));
  document.querySelector("#openRequest").addEventListener("click", () => openRequestDialog(location.id));
  bindCopyButton("copyPlusCode", selectedPlace.plusCode, "Plus Codeをコピーしました");
  bindCopyButton("copyCoordinates", coordinatesText, "緯度経度をコピーしました");
  bindCopyButton("copyAddress", selectedAddress !== "未登録" ? selectedAddress : "", "住所をコピーしました");
  elements.detailContent.querySelectorAll("[data-place-select]").forEach((placeElement) => {
    placeElement.addEventListener("click", () => {
      selectedPlaceId = placeElement.dataset.placeSelect;
      shouldFocusSelected = true;
      renderAll();
      showLocationPopup(location);
    });
    placeElement.addEventListener("keydown", (event) => {
      if (event.target !== placeElement) return;
      if (!["Enter", " "].includes(event.key)) return;
      event.preventDefault();
      placeElement.click();
    });
  });
  elements.detailContent.querySelectorAll("[data-place-action]").forEach((element) => {
    element.addEventListener("click", (event) => event.stopPropagation());
  });
  document.querySelector("#saveMemo").addEventListener("click", () => saveMemo(location.id));
}

function updateRequestButtonState() {
  const button = document.querySelector("#openRequest");
  if (!button) return;
  const available = updateFormConfigLoaded && Boolean(updateFormConfig?.formUrl);
  button.disabled = !available;
  button.textContent = updateFormConfigLoaded
    ? (available ? "更新要求" : "更新要求フォーム未設定")
    : "更新要求フォームを確認中";
}

function renderDistributionPlaces(location, places, collection) {
  const memos = placeMemos(collection);
  return `
    <section class="distribution-places">
      <h3>配布場所</h3>
      ${places
        .map((place) => {
          const mode = distributionModeLabel(place.distributionMode);
          const schedule = distributionPlaceScheduleText(place);
          return `
            <article class="distribution-place ${place.id === selectedPlaceId ? "active" : ""}" data-place-select="${escapeAttribute(place.id)}" tabindex="0" role="button">
              <div class="distribution-place-head">
                <div>
                  <strong>${escapeHtml(place.name)}</strong>
                  ${mode ? `<span>${escapeHtml(mode)}</span>` : ""}
                  ${schedule ? `<span>${escapeHtml(schedule)}</span>` : ""}
                  ${place.availabilityNote ? `<span>${escapeHtml(place.availabilityNote)}</span>` : ""}
                  <span>${escapeHtml([place.days, place.hours].filter(Boolean).join(" "))}</span>
                  ${place.closed ? `<span>${escapeHtml(place.closed)}</span>` : ""}
                  ${place.address ? `<span>${escapeHtml(place.address)}</span>` : ""}
                  ${place.plusCode ? `<span>${escapeHtml(place.plusCode)}</span>` : ""}
                </div>
              </div>
              <label data-place-action>
                場所メモ
                <textarea data-place-action data-place-memo="${escapeAttribute(place.id)}" rows="3" placeholder="駐車場、入口、訪問時の注意">${escapeHtml(memos[place.id] ?? "")}</textarea>
              </label>
            </article>
          `;
        })
        .join("")}
    </section>
  `;
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

function renderEnglishVersionValue(location) {
  if (!location.hasEnglishVersion) return "記載なし";
  const label = englishVersionLabel(location);
  const note = location.englishVersionNote ? `${label}（${location.englishVersionNote}）` : label;
  const places = englishVersionDistributionPlaces(location);
  const placeText = places.length > 0
    ? ` 配布場所: ${places.map((place) => [place.name, place.hours].filter(Boolean).join(" ")).join(" / ")}`
    : "";
  return renderExternalLinkedValue(`${note}${placeText}`, location.englishVersionUrl || location.stockUrl || location.sourceUrl);
}

function renderEnglishVersionBadge(location) {
  return location.hasEnglishVersion ? `<span class="badge">${escapeHtml(englishVersionLabel(location))}</span>` : "";
}

function englishVersionSearchText(location) {
  const places = englishVersionDistributionPlaces(location)
    .map((place) => [place.name, place.address, place.days, place.hours].join(" "))
    .join(" ");
  return location.hasEnglishVersion
    ? ["英語版", "English", englishVersionLabel(location), location.englishVersionNote, places].filter(Boolean).join(" ")
    : "";
}

function englishVersionLabel(location) {
  if (location.englishVersionStatus === "out_of_stock") return "英語版（在庫なし）";
  if (location.englishVersionStatus === "event_only") return "英語版（イベント配布）";
  return "英語版あり";
}

function officialDesignNamesText(location) {
  return Array.isArray(location.officialDesignNames) ? location.officialDesignNames.join(" ") : "";
}

function displayPlace(location) {
  return location.place || location.address || `${location.prefecture} ${location.municipality}（配布場所未確認）`;
}

function distributionPlaces(location) {
  const sourcePlaces = Array.isArray(location.distributionPlaces) && location.distributionPlaces.length > 0
    ? location.distributionPlaces
    : [
        {
          id: "primary",
          name: displayPlace(location),
          address: location.address || "",
          lat: location.lat,
          lng: location.lng,
          plusCode: location.plusCode || "",
          days: "",
          hours: location.hours || "",
          closed: location.closed || "",
          url: location.facilityUrl || "",
          coordinateAccuracy: location.coordinateAccuracy,
          geocodeQuery: location.geocodeQuery,
          geocodeTitle: location.geocodeTitle,
          geocodeError: location.geocodeError
        }
      ];

  return sourcePlaces
    .map((place, index) => ({
      id: String(place.id || `place-${index + 1}`),
      name: place.name || place.place || location.place || displayPlace(location),
      address: place.address || "",
      lat: Number(place.lat),
      lng: Number(place.lng),
      plusCode: place.plusCode || "",
      days: place.days || "",
      hours: place.hours || "",
      closed: place.closed || "",
      startsOn: place.startsOn || "",
      endsOn: place.endsOn || "",
      distributionMode: place.distributionMode || "",
      availabilityNote: place.availabilityNote || "",
      url: place.url || place.facilityUrl || location.facilityUrl || "",
      coordinateAccuracy: place.coordinateAccuracy || location.coordinateAccuracy,
      geocodeQuery: place.geocodeQuery || "",
      geocodeTitle: place.geocodeTitle || "",
      geocodeError: place.geocodeError || ""
    }))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

function englishVersionDistributionPlaces(location) {
  if (!Array.isArray(location.englishVersionDistributionPlaces)) return [];
  return normalizeDistributionPlaces(location.englishVersionDistributionPlaces, location);
}

function allDistributionPlaces(location) {
  return [...distributionPlaces(location), ...englishVersionDistributionPlaces(location)];
}

function normalizeDistributionPlaces(sourcePlaces, location) {
  return sourcePlaces
    .map((place, index) => ({
      id: String(place.id || `place-${index + 1}`),
      name: place.name || place.place || location.place || displayPlace(location),
      address: place.address || "",
      lat: Number(place.lat),
      lng: Number(place.lng),
      plusCode: place.plusCode || "",
      days: place.days || "",
      hours: place.hours || "",
      closed: place.closed || "",
      url: place.url || place.facilityUrl || location.facilityUrl || "",
      coordinateAccuracy: place.coordinateAccuracy || location.coordinateAccuracy,
      geocodeQuery: place.geocodeQuery || "",
      geocodeTitle: place.geocodeTitle || "",
      geocodeError: place.geocodeError || ""
    }))
    .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lng));
}

function primaryDistributionPlace(location) {
  return globalThis.MhcardAppUtils.selectPrimaryDistributionPlace(distributionPlaces(location)) ?? {
    id: "primary",
    name: displayPlace(location),
    address: location.address || "",
    lat: location.lat,
    lng: location.lng,
    plusCode: location.plusCode || "",
    days: "",
    hours: location.hours || "",
    closed: location.closed || "",
    startsOn: "",
    endsOn: "",
    distributionMode: "",
    availabilityNote: "",
    url: location.facilityUrl || "",
    coordinateAccuracy: location.coordinateAccuracy
  };
}

function selectedDistributionPlace(location) {
  const places = allDistributionPlaces(location);
  return places.find((place) => place.id === selectedPlaceId) ?? places[0] ?? primaryDistributionPlace(location);
}

function placeFeatureId(cardId, placeId) {
  return `${cardId}::${placeId}`;
}

function placeMemos(collection) {
  return collection?.placeMemos && typeof collection.placeMemos === "object" ? collection.placeMemos : {};
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
  if (location.status === "配布開始前") {
    const startsOn = formatShortDate(location.distributionStartsOn);
    return `<span class="badge upcoming">配布開始前${startsOn ? ` ${escapeHtml(startsOn)}` : ""}</span>`;
  }

  if (location.status === "休止中") {
    return '<span class="badge paused">休止中</span>';
  }

  if (location.status === "要確認") {
    return '<span class="badge review">要確認</span>';
  }

  return '<span class="badge">配布中</span>';
}

function pinClass(location, place = primaryDistributionPlace(location)) {
  const coordinateClass = placeCoordinateCategory(location, place);
  if (coordinateClass !== "address") return coordinateClass;
  if (location.status === "休止中") return "paused";
  if (location.status === "配布開始前") return "upcoming";
  if (location.status === "要確認") return "review";
  if (collections[location.id]?.collected) return "collected";
  return "uncollected";
}

function isApproximateLocation(location) {
  return location.coordinateAccuracy !== "address";
}

function isApproximatePlace(location, place) {
  return placeCoordinateCategory(location, place) !== "address";
}

function coordinateCategory(location) {
  if (location.status === "休止中" && location.address) return "stopped-known";
  if (location.status === "休止中" && !location.address) return "stopped-unknown";
  if (location.geocodeError) return "geocode-failed";
  if (location.coordinateAccuracy !== "address") return "approximate";
  return "address";
}

function placeCoordinateCategory(location, place) {
  return globalThis.MhcardAppUtils.placeCoordinateCategory(location, place);
}

function renderCoordinateBadge(location, place = primaryDistributionPlace(location)) {
  const category = placeCoordinateCategory(location, place);
  if (category === "address") return "";

  const labels = {
    "stopped-known": "中止・住所既知",
    "stopped-unknown": "中止・住所不明",
    "geocode-failed": "住所検索失敗",
    approximate: "座標未確定"
  };

  return `<span class="badge ${category}">${labels[category]}</span>`;
}

function renderMapPositionRows(location, place = primaryDistributionPlace(location)) {
  return mapPositionRows(location, place)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");
}

function mapPositionRows(location, place = primaryDistributionPlace(location)) {
  if (place.coordinateAccuracy === "address") {
    const position = location.status === "休止中"
      ? "住所から推定（配布中止）"
      : location.status === "配布開始前"
        ? "住所から推定（配布開始前）"
        : "住所から推定";
    return [
      ["地図位置", position],
      ["検索結果住所", place.geocodeTitle || place.geocodeQuery || "住所検索結果あり"]
    ];
  }

  if (location.status === "休止中" && !place.address) {
    return [
      ["地図位置", "都道府県内の仮位置"],
      ["理由", "配布中止・住所不明"]
    ];
  }

  if (location.status === "休止中" && place.address) {
    return [
      ["地図位置", "都道府県内の仮位置"],
      ["理由", `配布中止・住所検索失敗 (${place.geocodeError || "未検索"})`],
      ["抽出住所", place.address]
    ];
  }

  if (place.geocodeError) {
    return [
      ["地図位置", "都道府県内の仮位置"],
      ["理由", `住所検索に失敗 (${place.geocodeError})`],
      ["抽出住所", place.address]
    ];
  }

  return [
    ["地図位置", "都道府県内の仮位置"],
    ["理由", "住所不明"]
  ];
}

function renderDistributionScheduleRows(location, place) {
  const rows = [];
  if (location.distributionStartsOn) {
    const suffix = location.status === "配布開始前" ? "（予定）" : "";
    rows.push(["配布開始", `${formatLongDate(location.distributionStartsOn)}${suffix}`]);
  }
  const mode = distributionModeLabel(place.distributionMode);
  if (mode) rows.push(["窓口区分", mode]);
  const period = distributionPlaceScheduleText(place);
  if (period) rows.push(["窓口有効期間", period]);
  if (place.availabilityNote) rows.push(["窓口注意", place.availabilityNote]);
  return rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`).join("");
}

function distributionModeLabel(mode) {
  return {
    regular: "通常配布",
    launch_event: "初回イベント",
    limited: "限定配布",
    fallback: "代替窓口"
  }[mode] ?? "";
}

function distributionPlaceScheduleText(place) {
  if (!place.startsOn && !place.endsOn) return "";
  if (place.startsOn && place.endsOn && place.startsOn === place.endsOn) {
    return formatLongDate(place.startsOn);
  }
  if (place.startsOn && place.endsOn) {
    return `${formatLongDate(place.startsOn)}～${formatLongDate(place.endsOn)}`;
  }
  if (place.startsOn) return `${formatLongDate(place.startsOn)}から`;
  return `${formatLongDate(place.endsOn)}まで`;
}

function formatLongDate(value) {
  const parts = isoDateParts(value);
  return parts ? `${parts.year}年${parts.month}月${parts.day}日` : String(value ?? "");
}

function formatShortDate(value) {
  const parts = isoDateParts(value);
  return parts ? `${parts.month}/${parts.day}` : "";
}

function isoDateParts(value) {
  const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function initMap() {
  if (!window.maplibregl) {
    elements.mapCanvas.innerHTML = '<div class="empty-state">地図ライブラリを読み込めませんでした。</div>';
    return;
  }

  map = new maplibregl.Map({
    container: "mapCanvas",
    style: mapStyle,
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
    data: toLocationFeatureCollection(getFilteredLocations())
  });

  targetMap.addLayer({
    id: "selected-location-halo",
    type: "circle",
    source: "locations",
    filter: ["all", selectedOrHighlightedExpression(), ["!", ["in", ["get", "visualState"], ["literal", markerShapeStates()]]]],
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
    filter: ["!", ["in", ["get", "visualState"], ["literal", markerShapeStates()]]],
    paint: {
      "circle-color": [
        "match",
        ["get", "visualState"],
        "collected",
        "#1f7a4d",
        "paused",
        "#b68421",
        "upcoming",
        "#b83272",
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
    filter: ["all", selectedOrHighlightedExpression(), ["in", ["get", "visualState"], ["literal", markerShapeStates()]]],
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
    filter: ["in", ["get", "visualState"], ["literal", markerShapeStates()]],
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
    paint: {
      "circle-color": "#000000",
      "circle-radius": ["case", selectedOrHighlightedExpression(), 28, 22],
      "circle-opacity": 0.01
    }
  });

  if (!bindInteractions) return;

  targetMap.on("click", "location-hit-area", (event) => {
    selectMapFeature(event.features[0]);
  });

  ["unclustered-locations", "shaped-locations", "location-hit-area"].forEach((layerId) => {
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
  selectedId = feature.properties.cardId || feature.properties.id;
  selectedPlaceId = feature.properties.placeId || "";
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
    features: items.flatMap((location) =>
      allDistributionPlaces(location).map((place) => {
        const category = placeCoordinateCategory(location, place);
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [place.lng, place.lat]
          },
          properties: {
            id: location.id,
            cardId: location.id,
            placeId: place.id,
            featureId: placeFeatureId(location.id, place.id),
            cardName: location.cardName,
            place: place.name,
            days: place.days || "",
            hours: place.hours || "",
            startsOn: place.startsOn || "",
            endsOn: place.endsOn || "",
            distributionMode: place.distributionMode || "",
            availabilityNote: place.availabilityNote || "",
            distributionStartsOn: location.distributionStartsOn || "",
            imageUrl: location.imageUrl || "",
            municipality: `${location.prefecture} ${location.municipality}`,
            status: location.status,
            coordinateAccuracy: place.coordinateAccuracy || location.coordinateAccuracy || "prefecture_approx",
            collected: Boolean(collections[location.id]?.collected),
            selected: location.id === selectedId && place.id === selectedPlaceId,
            highlighted: location.id === hoveredId,
            visualState: pinClass(location, place),
            hasApproximate: isApproximatePlace(location, place),
            hasStoppedUnknown: category === "stopped-unknown",
            hasStoppedKnown: category === "stopped-known",
            hasGeocodeFailed: category === "geocode-failed"
          }
        };
      })
    )
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
    locationId: feature.properties.cardId || feature.properties.id,
    placeId: feature.properties.placeId || "",
    coordinates: feature.geometry.coordinates,
    imageUrl: feature.properties.imageUrl,
    cardName: feature.properties.cardName,
    place: feature.properties.place,
    days: feature.properties.days,
    hours: feature.properties.hours,
    status: feature.properties.status,
    distributionStartsOn: feature.properties.distributionStartsOn,
    startsOn: feature.properties.startsOn,
    endsOn: feature.properties.endsOn,
    distributionMode: feature.properties.distributionMode,
    availabilityNote: feature.properties.availabilityNote
  });
}

function showLocationPopup(location) {
  if (!mapReady) return;
  const place = selectedDistributionPlace(location);

  showManagedPopup({
    locationId: location.id,
    placeId: place.id,
    coordinates: [place.lng, place.lat],
    imageUrl: location.imageUrl || "",
    cardName: location.cardName,
    place: place.name,
    days: place.days,
    hours: place.hours,
    status: location.status,
    distributionStartsOn: location.distributionStartsOn,
    startsOn: place.startsOn,
    endsOn: place.endsOn,
    distributionMode: place.distributionMode,
    availabilityNote: place.availabilityNote
  });
}

function showManagedPopup({
  locationId,
  placeId,
  coordinates,
  imageUrl,
  cardName,
  place,
  days,
  hours,
  status,
  distributionStartsOn,
  startsOn,
  endsOn,
  distributionMode,
  availabilityNote
}) {
  if (!mapReady) return;

  activePopup?.remove();
  const schedule = distributionPlaceScheduleText({ startsOn, endsOn });
  const statusText = status === "配布開始前"
    ? `配布開始前 ${formatLongDate(distributionStartsOn)}`
    : status;
  const mode = distributionModeLabel(distributionMode);
  const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 12 })
    .setLngLat(coordinates)
    .setHTML(`
      <button class="map-popup-card" type="button" data-popup-location="${escapeAttribute(locationId)}">
        ${renderPopupImage(imageUrl || "", cardName)}
        <span class="map-popup-title">${escapeHtml(cardName)}</span>
        <span class="map-popup-subtitle">${escapeHtml(place)}</span>
        ${statusText ? `<span class="map-popup-subtitle">${escapeHtml(statusText)}</span>` : ""}
        ${mode || schedule ? `<span class="map-popup-subtitle">${escapeHtml([mode, schedule].filter(Boolean).join(" "))}</span>` : ""}
        ${availabilityNote ? `<span class="map-popup-subtitle">${escapeHtml(availabilityNote)}</span>` : ""}
        ${days || hours ? `<span class="map-popup-subtitle">${escapeHtml([days, hours].filter(Boolean).join(" "))}</span>` : ""}
      </button>
    `)
    .addTo(map);
  activePopup = popup;
  popup.getElement().querySelector("[data-popup-location]")?.addEventListener("click", () => {
    selectedId = locationId;
    selectedPlaceId = placeId || "";
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
  const nextCollections = {
    ...collections,
    [locationId]: {
      ...current,
      collected: !current.collected,
      collectedOn: current.collectedOn || globalThis.MhcardAppUtils.calendarDateInJapan()
    }
  };
  try {
    saveJson(storageKeys.collections, nextCollections);
  } catch (error) {
    console.warn("Could not save collection state:", error);
    showToast("取得状態を保存できませんでした。ブラウザの保存容量や設定を確認してください");
    return false;
  }

  collections = nextCollections;
  if (elements.collectionFilter.value !== "all") {
    renderAll();
  } else {
    renderLocationListVirtualWindow({ force: true });
    updateLocationSource();
    if (selectedId === locationId) renderDetail();
    renderSummary(currentFilteredLocations);
  }
  return true;
}

function saveMemo(locationId) {
  const placeMemosValue = {};
  document.querySelectorAll("[data-place-memo]").forEach((textarea) => {
    const value = textarea.value.trim();
    if (value) placeMemosValue[textarea.dataset.placeMemo] = value;
  });

  const nextLocationCollection = {
    ...(collections[locationId] ?? {}),
    collected: Boolean(collections[locationId]?.collected),
    collectedOn: document.querySelector("#collectedOn").value,
    placeMemos: placeMemosValue
  };
  delete nextLocationCollection.memo;
  const nextCollections = { ...collections, [locationId]: nextLocationCollection };
  try {
    saveJson(storageKeys.collections, nextCollections);
  } catch (error) {
    console.warn("Could not save memo:", error);
    showToast("メモを保存できませんでした。ブラウザの保存容量や設定を確認してください");
    return;
  }
  collections = nextCollections;
  showToast("メモを保存しました");
  renderAll();
}

function openRequestDialog(locationId) {
  if (!updateFormConfigLoaded) {
    showToast("更新要求フォームを確認しています");
    return;
  }
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

function openUpdateHistory() {
  updateHistoryBatchLimit = 3;
  renderUpdateHistory();
  elements.updateHistoryDialog.showModal();
}

function renderUpdateHistory() {
  const updates = updateHistory.updates ?? [];
  const visibleUpdates = updates.slice(0, updateHistoryBatchLimit);
  elements.updateHistoryContent.innerHTML = updates.length
    ? `
      <p class="update-history-lead">配布状態、在庫、配布場所、時間など、利用者向け情報の変更を新しい順に表示します。</p>
      <div class="update-history-list">
        ${visibleUpdates.map(renderUpdateHistoryBatch).join("")}
      </div>
      ${visibleUpdates.length < updates.length
        ? `<button class="ghost-button update-history-more" type="button" data-update-history-more>さらに表示（残り${updates.length - visibleUpdates.length}回）</button>`
        : ""}
    `
    : '<p class="empty-state">表示できる更新履歴はまだありません。</p>';
}

function renderUpdateHistoryBatch(update) {
  return `
    <section class="update-history-batch" aria-labelledby="history-${escapeAttribute(update.id)}">
      <header>
        <div>
          <h3 id="history-${escapeAttribute(update.id)}">${escapeHtml(formatHistoryDate(update.date))}</h3>
          <p>${escapeHtml(update.source)}</p>
        </div>
        <span>${update.totalChanges}件</span>
      </header>
      <div class="update-history-changes">
        ${update.changes.map(renderUpdateHistoryChange).join("")}
      </div>
      ${update.omittedChanges > 0 ? `<p class="inline-hint">ほか${update.omittedChanges}件の変更は省略されています。</p>` : ""}
    </section>
  `;
}

function renderUpdateHistoryChange(change) {
  const locationExists = locations.some((location) => location.id === change.locationId);
  const headingContent = `
    <span class="update-history-badge ${escapeAttribute(change.importance)}">${escapeHtml(historyImportanceLabel(change))}</span>
    <span class="update-history-card-name">${escapeHtml(change.cardName)}</span>
    <strong>${escapeHtml(change.headline)}</strong>
    <small>${escapeHtml([change.prefecture, change.municipality].filter(Boolean).join(" "))}</small>
  `;
  return `
    <article class="update-history-change ${escapeAttribute(change.importance)}">
      ${locationExists
        ? `<button class="update-history-change-heading" type="button" data-history-location="${escapeAttribute(change.locationId)}" aria-label="${escapeAttribute(`${change.cardName}の詳細を開く`)}">${headingContent}</button>`
        : `<div class="update-history-change-heading">${headingContent}</div>`}
      <details>
        <summary>変更内容（${change.fields.length}項目）</summary>
        <dl class="update-history-fields">
          ${change.fields.map(renderUpdateHistoryField).join("")}
        </dl>
      </details>
    </article>
  `;
}

function renderUpdateHistoryField(field) {
  return `
    <div class="update-history-field">
      <dt>${escapeHtml(field.label)}</dt>
      <dd>
        <span><small>変更前</small>${escapeHtml(field.before ?? "—")}</span>
        <span><small>変更後</small>${escapeHtml(field.after ?? "—")}</span>
      </dd>
    </div>
  `;
}

function handleUpdateHistoryClick(event) {
  if (event.target.closest("[data-update-history-more]")) {
    updateHistoryBatchLimit += 3;
    renderUpdateHistory();
    return;
  }
  const locationButton = event.target.closest("[data-history-location]");
  if (!locationButton) return;
  elements.updateHistoryDialog.close();
  selectListLocation(locationButton.dataset.historyLocation, { clearFilters: true });
  switchMobilePanel("detail");
}

function formatHistoryDate(value) {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}年${Number(match[2])}月${Number(match[3])}日` : String(value);
}

function historyImportanceLabel(change) {
  if (change.changeType === "added") return "追加";
  if (change.changeType === "removed") return "削除";
  if (change.importance === "critical") return "重要";
  if (change.importance === "high") return "変更";
  return "更新";
}

function openMyPage() {
  elements.myPageDialog.showModal();
  renderMyPage();
}

function renderMyPage({ focusTab = false } = {}) {
  disposeCardCatalogVirtualizer();
  const summarySelected = myPageTab === "summary";
  const catalogSelected = myPageTab === "catalog";
  const backupSelected = myPageTab === "backup";
  elements.myPageContent.innerHTML = `
    <div class="my-page-tabs" role="tablist" aria-label="取得状況メニュー">
      <button
        id="myPageSummaryTab"
        class="my-page-tab${summarySelected ? " active" : ""}"
        type="button"
        role="tab"
        aria-selected="${summarySelected}"
        aria-controls="myPageSummaryPanel"
        tabindex="${summarySelected ? "0" : "-1"}"
        data-my-page-tab="summary"
      >概要・メモ</button>
      <button
        id="myPageCatalogTab"
        class="my-page-tab${catalogSelected ? " active" : ""}"
        type="button"
        role="tab"
        aria-selected="${catalogSelected}"
        aria-controls="myPageCatalogPanel"
        tabindex="${catalogSelected ? "0" : "-1"}"
        data-my-page-tab="catalog"
      >カードリスト</button>
      <button
        id="myPageBackupTab"
        class="my-page-tab${backupSelected ? " active" : ""}"
        type="button"
        role="tab"
        aria-selected="${backupSelected}"
        aria-controls="myPageBackupPanel"
        tabindex="${backupSelected ? "0" : "-1"}"
        data-my-page-tab="backup"
      >バックアップ</button>
    </div>
    ${summarySelected ? renderMyPageSummaryPanel() : catalogSelected ? renderCardCatalogPanel() : renderCollectionBackupPanel()}
  `;
  bindMyPageEvents();
  if (catalogSelected) startCardCatalogVirtualizer();
  if (focusTab) {
    elements.myPageContent.querySelector(`[data-my-page-tab="${myPageTab}"]`)?.focus();
  }
}

function activateMyPageTab(tab) {
  if (!["summary", "catalog", "backup"].includes(tab) || tab === myPageTab) return;
  myPageTab = tab;
  renderMyPage({ focusTab: true });
}

function handleMyPageTabKeydown(event) {
  const tabs = ["summary", "catalog", "backup"];
  const currentIndex = tabs.indexOf(event.currentTarget.dataset.myPageTab);
  let nextIndex = currentIndex;

  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === currentIndex) return;

  event.preventDefault();
  activateMyPageTab(tabs[nextIndex]);
}

function renderMyPageSummaryPanel() {
  const collectedLocations = locations.filter((location) => collections[location.id]?.collected);
  const memoLocations = locations.filter((location) => Object.keys(placeMemos(collections[location.id])).length > 0);
  const progressPercent = locations.length ? Math.round((collectedLocations.length / locations.length) * 100) : 0;
  const byPrefecture = locations.reduce((acc, location) => {
    acc[location.prefecture] ??= { total: 0, collected: 0 };
    acc[location.prefecture].total += 1;
    if (collections[location.id]?.collected) acc[location.prefecture].collected += 1;
    return acc;
  }, {});

  return `
    <section id="myPageSummaryPanel" class="my-page-panel" role="tabpanel" aria-labelledby="myPageSummaryTab">
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
      <tr><th>保存済みメモ</th><td>${Object.values(collections).filter((item) => Object.keys(placeMemos(item)).length > 0).length}件</td></tr>
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
                    <small>${escapeHtml(Object.values(placeMemos(collections[location.id])).join(" / "))}</small>
                  </button>
                `
              )
              .join("")
          : '<p class="inline-hint">保存済みメモはありません。</p>'
      }
    </section>
    </section>
  `;
}

function cardCatalogPrefectures() {
  return globalThis.MhcardCatalog.orderedPrefectures(locations);
}

function cardCatalogPublicationSeriesOptions() {
  return globalThis.MhcardCatalog.publicationSeriesOptions(locations);
}

function cardCatalogLocations() {
  return globalThis.MhcardCatalog
    .filterCatalogLocations(locations, { prefecture: cardCatalogPrefecture, series: cardCatalogSeries })
    .slice()
    .sort(globalThis.MhcardCatalog.compareLocations);
}

function renderCardCatalogPanel() {
  const cards = cardCatalogLocations();
  const initialCards = cards.slice(0, 18);
  const collectedCount = cards.filter((location) => collections[location.id]?.collected).length;
  const prefectureOptions = cardCatalogPrefectures()
    .map(
      (prefecture) =>
        `<option value="${escapeAttribute(prefecture)}"${prefecture === cardCatalogPrefecture ? " selected" : ""}>${escapeHtml(prefecture)}</option>`
    )
    .join("");
  const seriesOptions = cardCatalogPublicationSeriesOptions()
    .map(
      (option) =>
        `<option value="${option.value}"${option.value === cardCatalogSeries ? " selected" : ""}>${escapeHtml(option.label)}</option>`
    )
    .join("");

  return `
    <section id="myPageCatalogPanel" class="my-page-panel" role="tabpanel" aria-labelledby="myPageCatalogTab">
      <div class="card-catalog-toolbar">
        <div class="card-catalog-filters">
          <label class="card-catalog-filter" for="cardCatalogPrefecture">
            都道府県
            <select id="cardCatalogPrefecture">
              <option value="all"${cardCatalogPrefecture === "all" ? " selected" : ""}>すべて</option>
              ${prefectureOptions}
            </select>
          </label>
          <label class="card-catalog-filter" for="cardCatalogSeries">
            発行弾
            <select id="cardCatalogSeries">
              <option value="all"${cardCatalogSeries === "all" ? " selected" : ""}>すべて</option>
              ${seriesOptions}
            </select>
          </label>
        </div>
        <p class="card-catalog-counts" aria-live="polite">
          <span id="cardCatalogVisibleCount">${cards.length}</span>枚中
          <strong id="cardCatalogCollectedCount">${collectedCount}</strong>枚取得済み
        </p>
      </div>
      ${
        cards.length
          ? `<div id="cardCatalogVirtualSpace" class="card-catalog-virtual-space">
              <div id="cardCatalogGrid" class="card-catalog-grid" role="list" aria-label="マンホールカード一覧">
                ${initialCards.map((location, index) => renderCardCatalogCard(location, index, cards.length)).join("")}
              </div>
            </div>`
          : '<p class="empty-state">該当するカードはありません。</p>'
      }
    </section>
  `;
}

function renderCollectionBackupPanel() {
  const savedCount = Object.keys(collections).length;
  return `
    <section id="myPageBackupPanel" class="my-page-panel collection-backup-panel" role="tabpanel" aria-labelledby="myPageBackupTab">
      <section class="collection-backup-card">
        <h3>バックアップを保存</h3>
        <p>取得済み状態、取得日、配布場所ごとのメモをJSONファイルに保存します。</p>
        <p class="inline-hint">この端末に保存されているデータ: ${savedCount}件</p>
        <button class="primary-button" type="button" data-export-collections>JSONをダウンロード</button>
      </section>
      <section class="collection-backup-card">
        <h3>バックアップから復元</h3>
        <label class="collection-backup-file" for="collectionBackupFile">
          JSONファイル
          <input id="collectionBackupFile" type="file" accept="application/json,.json">
        </label>
        <fieldset class="collection-import-modes">
          <legend>復元方法</legend>
          <label>
            <input type="radio" name="collectionImportMode" value="merge" checked>
            <span><strong>安全にマージ</strong><small>現在のデータを優先して残し、不足分を追加します</small></span>
          </label>
          <label>
            <input type="radio" name="collectionImportMode" value="replace">
            <span><strong>完全に置き換え</strong><small>現在の取得状況とメモを削除して、ファイルの内容に置き換えます</small></span>
          </label>
        </fieldset>
        <button class="primary-button" type="button" data-import-collections>内容を確認して復元</button>
        <p id="collectionImportStatus" class="inline-hint" role="status" aria-live="polite"></p>
      </section>
      <p class="collection-backup-note">バックアップはこの端末内で処理され、外部へ送信されません。</p>
    </section>
  `;
}

function renderCardCatalogCard(location, index, total) {
  const collected = Boolean(collections[location.id]?.collected);
  const imageUrl = safeExternalUrl(location.imageUrl);
  const image = imageUrl
    ? `<img src="${escapeAttribute(imageUrl)}" alt="${escapeAttribute(`${location.cardName} カード画像`)}" loading="lazy" decoding="async">`
    : "";

  return `
    <div
      class="card-catalog-item"
      role="listitem"
      aria-posinset="${index + 1}"
      aria-setsize="${total}"
    >
      <button
        class="card-catalog-card"
        type="button"
        aria-pressed="${collected}"
        aria-label="${escapeAttribute(`${location.cardName}を${collected ? "未取得" : "取得済み"}にする`)}"
        data-card-catalog-toggle="${escapeAttribute(location.id)}"
      >
        <span class="card-catalog-image${imageUrl ? "" : " image-missing"}">
          ${image}
          <span class="card-catalog-image-placeholder">画像なし</span>
        </span>
        <span class="card-catalog-content">
          <span class="card-catalog-number">${escapeHtml(cardNumber(location))}</span>
          <strong class="card-catalog-name">${escapeHtml(location.cardName)}</strong>
          <span class="card-catalog-location">${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)}</span>
          <span class="card-catalog-state">${collected ? "取得済み" : "未取得"}</span>
        </span>
      </button>
    </div>
  `;
}

function bindMyPageEvents() {
  elements.myPageContent.querySelectorAll("[data-my-page-tab]").forEach((button) => {
    button.addEventListener("click", () => activateMyPageTab(button.dataset.myPageTab));
    button.addEventListener("keydown", handleMyPageTabKeydown);
  });

  elements.myPageContent.querySelectorAll("[data-memo-location]").forEach((button) => {
    button.addEventListener("click", () => {
      elements.myPageDialog.close();
      selectListLocation(button.dataset.memoLocation, { clearFilters: true });
      switchMobilePanel("detail");
    });
  });

  elements.myPageContent.querySelector("#cardCatalogPrefecture")?.addEventListener("change", (event) => {
    cardCatalogPrefecture = event.currentTarget.value;
    renderMyPage();
    elements.myPageContent.querySelector("#cardCatalogPrefecture")?.focus();
  });

  elements.myPageContent.querySelector("#cardCatalogSeries")?.addEventListener("change", (event) => {
    cardCatalogSeries = event.currentTarget.value;
    renderMyPage();
    elements.myPageContent.querySelector("#cardCatalogSeries")?.focus();
  });

  elements.myPageContent.querySelector("[data-export-collections]")?.addEventListener("click", exportCollections);
  elements.myPageContent.querySelector("[data-import-collections]")?.addEventListener("click", importCollections);

}

function exportCollections() {
  try {
    const backup = globalThis.MhcardCollectionBackup.createBackup(collections);
    const blob = new Blob([`${JSON.stringify(backup, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mhcard-map-collections-${globalThis.MhcardAppUtils.calendarDateInJapan()}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("バックアップを保存しました");
  } catch (error) {
    console.error("Could not export collection backup:", error);
    showToast("バックアップを保存できませんでした");
  }
}

async function importCollections() {
  const input = elements.myPageContent.querySelector("#collectionBackupFile");
  const status = elements.myPageContent.querySelector("#collectionImportStatus");
  const file = input?.files?.[0];
  if (!file) {
    if (status) status.textContent = "JSONファイルを選んでください。";
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    if (status) status.textContent = "ファイルが大きすぎます（上限5MB）。";
    return;
  }

  try {
    const backup = globalThis.MhcardCollectionBackup.parseBackupText(await file.text());
    const mode = elements.myPageContent.querySelector('input[name="collectionImportMode"]:checked')?.value ?? "merge";
    const count = Object.keys(backup.collections).length;
    const message = mode === "replace"
      ? `現在の取得状況とメモを削除し、バックアップの${count}件に完全置換します。続けますか？`
      : `バックアップの${count}件を現在のデータへ安全にマージします。続けますか？`;
    if (!window.confirm(message)) {
      if (status) status.textContent = "復元をキャンセルしました。";
      return;
    }

    const importedCollections = mode === "replace"
      ? backup.collections
      : globalThis.MhcardCollectionBackup.mergeCollections(collections, backup.collections);
    try {
      const nextCollections = buildMigratedCollections(importedCollections);
      saveJson(storageKeys.collections, nextCollections);
      collections = nextCollections;
      renderAll();
      renderMyPage();
      showToast(`${count}件のバックアップを復元しました`);
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.warn("Could not import collection backup:", error);
    if (status) status.textContent = `復元できませんでした: ${error.message}`;
  }
}

function handleCardCatalogClick(event) {
  const button = event.target.closest("[data-card-catalog-toggle]");
  if (!button || !elements.myPageContent.contains(button)) return;
  const location = locations.find((item) => item.id === button.dataset.cardCatalogToggle);
  if (!location) return;
  if (!toggleCollected(location.id)) return;
  updateCardCatalogTile(button, location);
  updateCardCatalogCounts();
}

function handleCardCatalogImageError(event) {
  if (!event.target.matches(".card-catalog-image img")) return;
  event.target.closest(".card-catalog-image")?.classList.add("image-missing");
}

function startCardCatalogVirtualizer() {
  const panel = elements.myPageContent.querySelector("#myPageCatalogPanel");
  const space = elements.myPageContent.querySelector("#cardCatalogVirtualSpace");
  const grid = elements.myPageContent.querySelector("#cardCatalogGrid");
  if (!panel || !space || !grid) return;

  cardCatalogVirtualizer = {
    cards: cardCatalogLocations(),
    panel,
    space,
    grid,
    columns: 1,
    rowHeight: 1,
    rowGap: 0,
    startIndex: -1,
    endIndex: -1,
    visibleAnchorIndex: 0,
    lastScrollTop: panel.scrollTop,
    width: 0,
    hasMeasured: false,
    measurementAttempts: 0,
    measurementFrame: 0,
    resizeObserver: null,
    windowResizeHandler: null
  };

  const scheduleRender = () => {
    if (cardCatalogRenderFrame) return;
    cardCatalogRenderFrame = window.requestAnimationFrame(() => {
      cardCatalogRenderFrame = 0;
      renderCardCatalogVirtualWindow();
    });
  };
  cardCatalogVirtualizer.scheduleRender = scheduleRender;
  cardCatalogVirtualizer.scrollHandler = scheduleRender;
  panel.addEventListener("scroll", scheduleRender, { passive: true });

  const handleResize = () => resizeCardCatalogVirtualizer();
  if ("ResizeObserver" in window) {
    cardCatalogVirtualizer.resizeObserver = new ResizeObserver(handleResize);
    cardCatalogVirtualizer.resizeObserver.observe(panel);
  } else {
    cardCatalogVirtualizer.windowResizeHandler = handleResize;
    window.addEventListener("resize", handleResize);
  }

  scheduleCardCatalogMeasurement(cardCatalogVirtualizer, { preserveAnchor: false });
}

function disposeCardCatalogVirtualizer() {
  if (cardCatalogRenderFrame) {
    window.cancelAnimationFrame(cardCatalogRenderFrame);
    cardCatalogRenderFrame = 0;
  }
  if (!cardCatalogVirtualizer) return;
  if (cardCatalogVirtualizer.measurementFrame) {
    window.cancelAnimationFrame(cardCatalogVirtualizer.measurementFrame);
  }
  cardCatalogVirtualizer.panel.removeEventListener("scroll", cardCatalogVirtualizer.scrollHandler);
  cardCatalogVirtualizer.resizeObserver?.disconnect();
  if (cardCatalogVirtualizer.windowResizeHandler) {
    window.removeEventListener("resize", cardCatalogVirtualizer.windowResizeHandler);
  }
  cardCatalogVirtualizer = null;
}

function scheduleCardCatalogMeasurement(virtualizer, { preserveAnchor } = {}) {
  if (virtualizer.measurementFrame) return;
  virtualizer.measurementFrame = window.requestAnimationFrame(() => {
    virtualizer.measurementFrame = 0;
    if (cardCatalogVirtualizer !== virtualizer || !virtualizer.grid.isConnected) return;
    resizeCardCatalogVirtualizer({ force: true, preserveAnchor });
  });
}

function resizeCardCatalogVirtualizer({ force = false, preserveAnchor = !force } = {}) {
  const virtualizer = cardCatalogVirtualizer;
  if (!virtualizer?.grid.isConnected) return;
  const width = virtualizer.panel.getBoundingClientRect().width;
  if (!force && virtualizer.hasMeasured && width > 0 && Math.abs(width - virtualizer.width) < 1) {
    renderCardCatalogVirtualWindow();
    return;
  }

  const hadMeasured = virtualizer.hasMeasured;
  const anchorIndex = virtualizer.visibleAnchorIndex;
  virtualizer.grid.style.removeProperty("--card-catalog-row-height");
  const styles = getComputedStyle(virtualizer.grid);
  const measuredTracks = styles.gridTemplateColumns.split(" ").filter((track) => track && track !== "none");
  const columns = measuredTracks.length || (window.matchMedia("(max-width: 760px)").matches ? 2 : 3);
  const measuredRowHeight = virtualizer.grid.firstElementChild?.getBoundingClientRect().height ?? 0;
  const rowGap = Number.parseFloat(styles.rowGap) || 0;
  let rowHeight = measuredRowHeight;

  if (width <= 0 || measuredRowHeight <= 0) {
    if (virtualizer.measurementAttempts < 1) {
      virtualizer.measurementAttempts += 1;
      scheduleCardCatalogMeasurement(virtualizer, { preserveAnchor });
      return;
    }
    rowHeight = globalThis.MhcardCatalog.estimateVirtualRowHeight({
      availableWidth: width,
      columns,
      rowGap
    });
  } else {
    virtualizer.measurementAttempts = 0;
  }

  virtualizer.width = width;
  virtualizer.columns = columns;
  virtualizer.rowHeight = rowHeight;
  virtualizer.rowGap = Math.max(0, rowGap);
  virtualizer.hasMeasured = true;
  virtualizer.startIndex = -1;
  virtualizer.endIndex = -1;
  virtualizer.grid.style.setProperty("--card-catalog-row-height", `${rowHeight}px`);
  if (preserveAnchor && hadMeasured) {
    const anchorRow = Math.floor(anchorIndex / columns);
    virtualizer.panel.scrollTop = virtualizer.space.offsetTop + anchorRow * (virtualizer.rowHeight + rowGap);
  }
  renderCardCatalogVirtualWindow();
}

function renderCardCatalogVirtualWindow() {
  const virtualizer = cardCatalogVirtualizer;
  if (!virtualizer?.grid.isConnected) return;
  const viewportStart = Math.max(0, virtualizer.panel.scrollTop - virtualizer.space.offsetTop);
  if (Math.abs(virtualizer.panel.scrollTop - virtualizer.lastScrollTop) >= 1) {
    virtualizer.visibleAnchorIndex =
      Math.floor(viewportStart / (virtualizer.rowHeight + virtualizer.rowGap)) * virtualizer.columns;
    virtualizer.lastScrollTop = virtualizer.panel.scrollTop;
  }
  const windowState = globalThis.MhcardCatalog.calculateVirtualWindow({
    itemCount: virtualizer.cards.length,
    columns: virtualizer.columns,
    rowHeight: virtualizer.rowHeight,
    rowGap: virtualizer.rowGap,
    viewportStart,
    viewportHeight: virtualizer.panel.clientHeight,
    overscanRows: cardCatalogOverscanRows
  });
  virtualizer.space.style.height = `${windowState.totalHeight}px`;
  if (windowState.startIndex === virtualizer.startIndex && windowState.endIndex === virtualizer.endIndex) return;

  virtualizer.startIndex = windowState.startIndex;
  virtualizer.endIndex = windowState.endIndex;
  virtualizer.grid.style.transform = `translateY(${windowState.offsetTop}px)`;
  virtualizer.grid.innerHTML = virtualizer.cards
    .slice(windowState.startIndex, windowState.endIndex)
    .map((location, index) => renderCardCatalogCard(location, windowState.startIndex + index, virtualizer.cards.length))
    .join("");
}

function updateCardCatalogTile(button, location) {
  const collected = Boolean(collections[location.id]?.collected);
  button.setAttribute("aria-pressed", String(collected));
  button.setAttribute("aria-label", `${location.cardName}を${collected ? "未取得" : "取得済み"}にする`);
  const state = button.querySelector(".card-catalog-state");
  if (state) state.textContent = collected ? "取得済み" : "未取得";
}

function updateCardCatalogCounts() {
  const cards = cardCatalogLocations();
  const collectedCount = cards.filter((location) => collections[location.id]?.collected).length;
  const visibleCount = elements.myPageContent.querySelector("#cardCatalogVisibleCount");
  const collected = elements.myPageContent.querySelector("#cardCatalogCollectedCount");
  if (visibleCount) visibleCount.textContent = String(cards.length);
  if (collected) collected.textContent = String(collectedCount);
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
  if (panel === "list") locationListVirtualizer?.scheduleRender();
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
    style: mapStyle,
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
  const place = location ? selectedDistributionPlace(location) : null;
  if (!location || !place || !Number.isFinite(place.lng) || !Number.isFinite(place.lat)) {
    clearPrintMapPopup();
    return;
  }

  if (!targetMap.getBounds().contains([place.lng, place.lat])) {
    clearPrintMapPopup();
    return;
  }

  const point = targetMap.project([place.lng, place.lat]);
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
      <span class="map-popup-subtitle">${escapeHtml(place.name)}</span>
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
  return Math.min(
    ...allDistributionPlaces(location).map((place) => {
      const latDiff = place.lat - userPosition.lat;
      const averageLat = ((place.lat + userPosition.lat) / 2) * (Math.PI / 180);
      const lngDiff = (place.lng - userPosition.lng) * Math.cos(averageLat);
      return Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    })
  );
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
  const nextCollections = buildMigratedCollections(collections);
  if (nextCollections === collections) return;
  try {
    saveJson(storageKeys.collections, nextCollections);
    collections = nextCollections;
  } catch (error) {
    console.warn("Could not persist migrated collection data; continuing with the previous data:", error);
  }
}

function buildMigratedCollections(sourceCollections) {
  let nextCollections = sourceCollections;
  let changed = false;

  const writableCollections = () => {
    if (!changed) {
      nextCollections = Object.fromEntries(
        Object.entries(sourceCollections).map(([id, value]) => [id, value && typeof value === "object" ? { ...value } : value])
      );
      changed = true;
    }
    return nextCollections;
  };

  locations.forEach((location) => {
    (location.legacyIds ?? []).forEach((legacyId) => {
      if (!legacyId || legacyId === location.id || !nextCollections[legacyId]) return;
      const target = writableCollections();
      target[location.id] = {
        ...target[legacyId],
        ...(target[location.id] ?? {})
      };
      delete target[legacyId];
    });

    const collection = nextCollections[location.id];
    if (collection?.memo) {
      const target = writableCollections();
      const nextCollection = { ...target[location.id] };
      const primaryPlaceId = primaryDistributionPlace(location).id;
      nextCollection.placeMemos = {
        [primaryPlaceId]: nextCollection.memo,
        ...placeMemos(nextCollection)
      };
      delete nextCollection.memo;
      target[location.id] = nextCollection;
    }
  });

  return changed ? nextCollections : sourceCollections;
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
