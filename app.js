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
    mapcode: "5 012 345*67",
    mapcodeStatus: "登録済み",
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
    mapcode: "8 706 122*41",
    mapcodeStatus: "登録済み",
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
    mapcode: "",
    mapcodeStatus: "未登録",
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
    mapcode: "1 345 782*03",
    mapcodeStatus: "登録済み",
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
    mapcode: "7 527 020*11",
    mapcodeStatus: "登録済み",
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
    mapcode: "13 318 212*54",
    mapcodeStatus: "登録済み",
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
    mapcode: "9 670 451*80",
    mapcodeStatus: "登録済み",
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
    mapcode: "",
    mapcodeStatus: "未登録",
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
  user: "mhc_user",
  collections: "mhc_collections",
  requests: "mhc_update_requests"
};

let selectedId = locations[0].id;
let currentUser = loadJson(storageKeys.user, null);
let collections = loadJson(storageKeys.collections, {});
let updateRequests = loadJson(storageKeys.requests, []);
let userPosition = null;
let map = null;
let mapReady = false;
let shouldFocusSelected = true;

const elements = {
  searchInput: document.querySelector("#searchInput"),
  prefectureFilter: document.querySelector("#prefectureFilter"),
  collectionFilter: document.querySelector("#collectionFilter"),
  statusFilter: document.querySelector("#statusFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  locationList: document.querySelector("#locationList"),
  mapCanvas: document.querySelector("#mapCanvas"),
  detailContent: document.querySelector("#detailContent"),
  totalCount: document.querySelector("#totalCount"),
  collectedCount: document.querySelector("#collectedCount"),
  requestCount: document.querySelector("#requestCount"),
  loginButton: document.querySelector("#loginButton"),
  loginDialog: document.querySelector("#loginDialog"),
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  closeLoginDialog: document.querySelector("#closeLoginDialog"),
  requestDialog: document.querySelector("#requestDialog"),
  requestForm: document.querySelector("#requestForm"),
  requestLocationId: document.querySelector("#requestLocationId"),
  requestType: document.querySelector("#requestType"),
  requestMessage: document.querySelector("#requestMessage"),
  referenceUrl: document.querySelector("#referenceUrl"),
  closeRequestDialog: document.querySelector("#closeRequestDialog"),
  myPageButton: document.querySelector("#myPageButton"),
  myPageDialog: document.querySelector("#myPageDialog"),
  myPageContent: document.querySelector("#myPageContent"),
  closeMyPageDialog: document.querySelector("#closeMyPageDialog"),
  locateButton: document.querySelector("#locateButton")
};

init();

async function init() {
  locations = await loadLocations();
  selectedId = locations[0]?.id ?? "";
  fillPrefectures();
  bindEvents();
  initMap();
  renderAll();
}

function bindEvents() {
  [
    elements.searchInput,
    elements.prefectureFilter,
    elements.collectionFilter,
    elements.statusFilter,
    elements.sortSelect
  ].forEach((element) => element.addEventListener("input", renderAll));

  elements.loginButton.addEventListener("click", handleLoginButton);
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.closeLoginDialog.addEventListener("click", () => elements.loginDialog.close());
  elements.requestForm.addEventListener("submit", handleUpdateRequest);
  elements.closeRequestDialog.addEventListener("click", () => elements.requestDialog.close());
  elements.myPageButton.addEventListener("click", openMyPage);
  elements.closeMyPageDialog.addEventListener("click", () => elements.myPageDialog.close());
  elements.locateButton.addEventListener("click", locateUser);
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
    const response = await fetch("./data/locations.json", { cache: "no-store" });
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

function renderAll() {
  updateLoginState();
  const filtered = getFilteredLocations();
  if (!filtered.some((location) => location.id === selectedId)) {
    selectedId = filtered[0]?.id ?? locations[0].id;
  }

  renderList(filtered);
  renderMap(filtered);
  renderDetail();
  renderSummary(filtered);
}

function getFilteredLocations() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const prefecture = elements.prefectureFilter.value;
  const collectionFilter = elements.collectionFilter.value;
  const status = elements.statusFilter.value;

  return locations
    .filter((location) => {
      const haystack = [
        location.cardName,
        location.prefecture,
        location.municipality,
        location.place,
        location.address,
        location.mapcode
      ].join(" ").toLowerCase();
      const collection = collections[location.id];
      const collected = Boolean(collection?.collected);
      return (
        (!query || haystack.includes(query)) &&
        (prefecture === "all" || location.prefecture === prefecture) &&
        (status === "all" || location.status === status) &&
        (collectionFilter === "all" ||
          (collectionFilter === "collected" && collected) ||
          (collectionFilter === "uncollected" && !collected))
      );
    })
    .sort(sortLocations);
}

function sortLocations(a, b) {
  if (elements.sortSelect.value === "updated") {
    return b.updatedAt.localeCompare(a.updatedAt);
  }

  if (elements.sortSelect.value === "distance" && userPosition) {
    return distanceFromUser(a) - distanceFromUser(b);
  }

  return `${a.prefecture}${a.municipality}`.localeCompare(`${b.prefecture}${b.municipality}`, "ja");
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
    button.addEventListener("click", () => {
      selectedId = location.id;
      renderAll();
    });

    button.innerHTML = `
      <h3>${escapeHtml(location.cardName)}</h3>
      <p>${escapeHtml(location.place)}</p>
      <p>${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)}</p>
      <div class="badge-row">
        ${renderStatusBadge(location)}
        ${collections[location.id]?.collected ? '<span class="badge collected">取得済み</span>' : '<span class="badge">未取得</span>'}
        <span class="badge">${escapeHtml(location.mapcodeStatus)}</span>
      </div>
    `;
    elements.locationList.append(button);
  });
}

function renderMap(filtered) {
  if (!mapReady) return;

  const source = map.getSource("locations");
  if (source) source.setData(toLocationFeatureCollection(filtered));

  const currentSource = map.getSource("current-location");
  if (currentSource) currentSource.setData(toCurrentLocationFeatureCollection());

  if (shouldFocusSelected) {
    const selected = locations.find((location) => location.id === selectedId);
    if (selected) {
      map.easeTo({
        center: [selected.lng, selected.lat],
        zoom: Math.max(map.getZoom(), 8),
        duration: 450
      });
    }
    shouldFocusSelected = false;
  }
}

function renderDetail() {
  const location = locations.find((item) => item.id === selectedId);
  if (!location) {
    elements.detailContent.innerHTML = '<div class="empty-state">配布場所を選択してください。</div>';
    return;
  }

  const collection = collections[location.id] ?? {};
  const mapcode = location.mapcode || "未登録";
  const requestsForLocation = updateRequests.filter((request) => request.locationId === location.id);
  const googleUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${location.lat},${location.lng}`)}`;
  const appleUrl = `https://maps.apple.com/?ll=${location.lat},${location.lng}&q=${encodeURIComponent(location.place)}`;

  elements.detailContent.innerHTML = `
    <section class="detail-head">
      <div class="badge-row">
        ${renderStatusBadge(location)}
        ${collection.collected ? '<span class="badge collected">取得済み</span>' : '<span class="badge">未取得</span>'}
      </div>
      <h2>${escapeHtml(location.cardName)}</h2>
      <p>${escapeHtml(location.place)}</p>
      <div class="detail-actions">
        <button id="toggleCollected" class="primary-button" type="button">${collection.collected ? "未取得に戻す" : "取得済みにする"}</button>
        <button id="openRequest" class="ghost-button" type="button">更新要求</button>
        <button id="copyMapcode" class="ghost-button" type="button">マップコードコピー</button>
        <button id="copyAddress" class="ghost-button" type="button">住所コピー</button>
      </div>
    </section>

    <table class="info-table">
      <tr><th>自治体</th><td>${escapeHtml(location.prefecture)} ${escapeHtml(location.municipality)}</td></tr>
      <tr><th>住所</th><td>${escapeHtml(location.address)}</td></tr>
      <tr><th>緯度経度</th><td>${location.lat}, ${location.lng}</td></tr>
      <tr><th>マップコード</th><td>${escapeHtml(mapcode)} (${escapeHtml(location.mapcodeStatus)})</td></tr>
      <tr><th>配布時間</th><td>${escapeHtml(location.hours)}</td></tr>
      <tr><th>休館日</th><td>${escapeHtml(location.closed)}</td></tr>
      <tr><th>配布条件</th><td>${escapeHtml(location.condition)}</td></tr>
      <tr><th>在庫</th><td>${escapeHtml(location.stock)}</td></tr>
      <tr><th>最終更新</th><td>${escapeHtml(location.updatedAt)}</td></tr>
      <tr><th>ナビ</th><td><a href="${googleUrl}" target="_blank" rel="noreferrer">Google Maps</a> / <a href="${appleUrl}" target="_blank" rel="noreferrer">Apple Maps</a></td></tr>
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
  document.querySelector("#copyMapcode").addEventListener("click", () => copyText(location.mapcode || "未登録", "マップコードをコピーしました"));
  document.querySelector("#copyAddress").addEventListener("click", () => copyText(location.address, "住所をコピーしました"));
  document.querySelector("#saveMemo").addEventListener("click", () => saveMemo(location.id));
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
  if (location.status === "休止中") return "paused";
  if (location.status === "要確認") return "review";
  if (collections[location.id]?.collected) return "collected";
  return "uncollected";
}

function initMap() {
  if (!window.maplibregl) {
    elements.mapCanvas.innerHTML = '<div class="empty-state">地図ライブラリを読み込めませんでした。</div>';
    return;
  }

  map = new maplibregl.Map({
    container: "mapCanvas",
    style: {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution: "© OpenStreetMap contributors"
        }
      },
      layers: [
        {
          id: "osm",
          type: "raster",
          source: "osm"
        }
      ]
    },
    center: [138.2529, 36.2048],
    zoom: 4.4,
    minZoom: 3.4,
    maxZoom: 18
  });

  map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), "bottom-right");

  map.on("load", () => {
    mapReady = true;
    addLocationLayers();
    addCurrentLocationLayer();
    renderAll();
  });
}

function addLocationLayers() {
  map.addSource("locations", {
    type: "geojson",
    data: toLocationFeatureCollection(getFilteredLocations()),
    cluster: true,
    clusterMaxZoom: 10,
    clusterRadius: 46
  });

  map.addLayer({
    id: "clusters",
    type: "circle",
    source: "locations",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ["step", ["get", "point_count"], "#4d8bc8", 20, "#2f75b5", 80, "#1d5f99"],
      "circle-radius": ["step", ["get", "point_count"], 19, 20, 25, 80, 32],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 3
    }
  });

  map.addLayer({
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

  map.addLayer({
    id: "selected-location-halo",
    type: "circle",
    source: "locations",
    filter: ["all", ["!", ["has", "point_count"]], ["==", ["get", "selected"], true]],
    paint: {
      "circle-color": "#ffffff",
      "circle-radius": 18,
      "circle-opacity": 0.85,
      "circle-stroke-color": "#172018",
      "circle-stroke-width": 2
    }
  });

  map.addLayer({
    id: "unclustered-locations",
    type: "circle",
    source: "locations",
    filter: ["!", ["has", "point_count"]],
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
        "#c5522f"
      ],
      "circle-radius": ["case", ["==", ["get", "selected"], true], 10, 7],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2
    }
  });

  map.on("click", "clusters", async (event) => {
    const features = map.queryRenderedFeatures(event.point, { layers: ["clusters"] });
    const clusterId = features[0].properties.cluster_id;
    const zoom = await map.getSource("locations").getClusterExpansionZoom(clusterId);
    map.easeTo({
      center: features[0].geometry.coordinates,
      zoom
    });
  });

  map.on("click", "unclustered-locations", (event) => {
    const feature = event.features[0];
    selectedId = feature.properties.id;
    shouldFocusSelected = false;
    renderAll();
    showMapPopup(feature);
  });

  ["clusters", "unclustered-locations"].forEach((layerId) => {
    map.on("mouseenter", layerId, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
    });
  });
}

function addCurrentLocationLayer() {
  map.addSource("current-location", {
    type: "geojson",
    data: toCurrentLocationFeatureCollection()
  });

  map.addLayer({
    id: "current-location-accuracy",
    type: "circle",
    source: "current-location",
    paint: {
      "circle-color": "#1e63b6",
      "circle-radius": 19,
      "circle-opacity": 0.18
    }
  });

  map.addLayer({
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
        place: location.place,
        municipality: `${location.prefecture} ${location.municipality}`,
        status: location.status,
        collected: Boolean(collections[location.id]?.collected),
        selected: location.id === selectedId,
        visualState: pinClass(location)
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
  new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 12 })
    .setLngLat(feature.geometry.coordinates)
    .setHTML(`
      <p class="map-popup-title">${escapeHtml(feature.properties.cardName)}</p>
      <p class="map-popup-subtitle">${escapeHtml(feature.properties.place)}</p>
    `)
    .addTo(map);
}

function toggleCollected(locationId) {
  if (!requireLogin()) return;
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
  if (!requireLogin()) return;
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

function handleLoginButton() {
  if (currentUser) {
    currentUser = null;
    saveJson(storageKeys.user, null);
    updateLoginState();
    showToast("ログアウトしました");
    return;
  }
  elements.loginDialog.showModal();
}

function handleLogin(event) {
  event.preventDefault();
  currentUser = {
    email: elements.emailInput.value.trim(),
    loginAt: new Date().toISOString()
  };
  saveJson(storageKeys.user, currentUser);
  elements.loginDialog.close();
  elements.loginForm.reset();
  renderAll();
  showToast("ログインしました");
}

function updateLoginState() {
  elements.loginButton.textContent = currentUser ? "ログアウト" : "ログイン";
}

function requireLogin() {
  if (currentUser) return true;
  elements.loginDialog.showModal();
  showToast("ログインが必要です");
  return false;
}

function openRequestDialog(locationId) {
  if (!requireLogin()) return;
  elements.requestLocationId.value = locationId;
  elements.requestDialog.showModal();
}

function handleUpdateRequest(event) {
  event.preventDefault();
  const locationId = elements.requestLocationId.value;
  updateRequests.unshift({
    id: crypto.randomUUID(),
    locationId,
    userEmail: currentUser?.email ?? "",
    type: elements.requestType.value,
    referenceUrl: elements.referenceUrl.value.trim(),
    message: elements.requestMessage.value.trim(),
    status: "未確認",
    createdAt: new Date().toISOString()
  });
  saveJson(storageKeys.requests, updateRequests);
  elements.requestDialog.close();
  elements.requestForm.reset();
  renderAll();
  showToast("更新要求を送信しました");
}

function openMyPage() {
  if (!requireLogin()) return;
  const collectedLocations = locations.filter((location) => collections[location.id]?.collected);
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
      <div class="progress-card"><strong>${Math.round((collectedLocations.length / locations.length) * 100)}%</strong><span>達成率</span></div>
    </div>
    <table class="info-table">
      ${Object.entries(byPrefecture)
        .map(([prefecture, value]) => `<tr><th>${escapeHtml(prefecture)}</th><td>${value.collected}/${value.total}</td></tr>`)
        .join("")}
    </table>
    <table class="info-table">
      <tr><th>更新要求</th><td>${updateRequests.length}件</td></tr>
      <tr><th>ログイン</th><td>${escapeHtml(currentUser.email)}</td></tr>
    </table>
  `;
  elements.myPageDialog.showModal();
}

function locateUser() {
  if (!navigator.geolocation) {
    showToast("現在地取得に対応していません");
    return;
  }

  elements.locateButton.textContent = "取得中...";
  elements.locateButton.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      userPosition = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      elements.sortSelect.value = "distance";
      const nearest = [...locations].sort((a, b) => distanceFromUser(a) - distanceFromUser(b))[0];
      if (nearest) selectedId = nearest.id;
      elements.locateButton.classList.add("active");
      elements.locateButton.textContent = "現在地表示中";
      elements.locateButton.disabled = false;
      shouldFocusSelected = false;
      if (mapReady) {
        map.easeTo({
          center: [userPosition.lng, userPosition.lat],
          zoom: 11,
          duration: 650
        });
      }
      renderAll();
      showToast("現在地を表示し、最寄り順に並べ替えました");
    },
    () => {
      elements.locateButton.textContent = "現在地";
      elements.locateButton.disabled = false;
      showToast("現在地を取得できませんでした");
    },
    { enableHighAccuracy: false, timeout: 8000 }
  );
}

function distanceFromUser(location) {
  if (!userPosition) return Number.POSITIVE_INFINITY;
  const latDiff = location.lat - userPosition.lat;
  const lngDiff = location.lng - userPosition.lng;
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
