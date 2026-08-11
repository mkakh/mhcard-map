(() => {
  const idCollator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
  const nameCollator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });
  const prefectureOrder = [
    "北海道",
    "青森県",
    "岩手県",
    "宮城県",
    "秋田県",
    "山形県",
    "福島県",
    "茨城県",
    "栃木県",
    "群馬県",
    "埼玉県",
    "千葉県",
    "東京都",
    "神奈川県",
    "新潟県",
    "富山県",
    "石川県",
    "福井県",
    "山梨県",
    "長野県",
    "岐阜県",
    "静岡県",
    "愛知県",
    "三重県",
    "滋賀県",
    "京都府",
    "大阪府",
    "兵庫県",
    "奈良県",
    "和歌山県",
    "鳥取県",
    "島根県",
    "岡山県",
    "広島県",
    "山口県",
    "徳島県",
    "香川県",
    "愛媛県",
    "高知県",
    "福岡県",
    "佐賀県",
    "長崎県",
    "熊本県",
    "大分県",
    "宮崎県",
    "鹿児島県",
    "沖縄県"
  ];
  const prefectureOrderByName = new Map(prefectureOrder.map((prefecture, index) => [prefecture, index]));

  function seriesSortKey(location) {
    const id = String(location?.id ?? "");
    const suffix = id.match(/^\d{2}-\d{3}-(.+)$/)?.[1] ?? id;
    const compact = suffix.toUpperCase().replaceAll("-", "");
    const match = compact.match(/^([A-Z])(\d{1,3})(.*)$/);
    if (!match) return `~${compact}`;
    return `${match[1]}${match[2].padStart(3, "0")}${match[3]}`;
  }

  function fullCardNumberSortKey(location) {
    const id = String(location?.id ?? "");
    const match = id.match(/^(\d{2})-(\d{3})-(.+)$/);
    if (!match) return `~${id.toUpperCase().replaceAll("-", "")}`;
    const suffix = seriesSortKey(location);
    if (suffix.startsWith("~")) return `~${id.toUpperCase().replaceAll("-", "")}`;
    return `${match[1]}-${match[2]}-${suffix}`;
  }

  function publicationSeriesNumber(value) {
    const normalized = String(value ?? "")
      .trim()
      .replace(/[０-９]/g, (digit) => String.fromCharCode(digit.charCodeAt(0) - 0xfee0));
    const match = normalized.match(/^(?:第0*([0-9]+)弾|0*([0-9]+))$/);
    if (!match) return null;
    const number = Number(match[1] ?? match[2]);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
  }

  function orderedPublicationSeries(items) {
    return [
      ...new Set(
        items
          .map((item) => publicationSeriesNumber(item?.series))
          .filter((number) => number !== null)
      )
    ].sort((a, b) => a - b);
  }

  function publicationIssueMonthKey(value) {
    const match = String(value ?? "").trim().match(/^(\d{4})[/-](\d{2})[/-](\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      return null;
    }
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
  }

  function formatPublicationIssueMonths(monthKeys) {
    const groups = new Map();
    [...new Set(monthKeys)]
      .filter((key) => /^\d{4}-(?:0[1-9]|1[0-2])$/.test(key))
      .sort()
      .forEach((key) => {
        const [year, month] = key.split("-");
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(Number(month));
      });
    return [...groups]
      .map(([year, months]) => `${year}年${months.join("・")}月`)
      .join("・");
  }

  function publicationSeriesOptions(items) {
    const monthsBySeries = new Map(orderedPublicationSeries(items).map((number) => [number, new Set()]));
    items.forEach((item) => {
      const number = publicationSeriesNumber(item?.series);
      const monthKey = publicationIssueMonthKey(item?.issuedOn);
      if (number !== null && monthKey) monthsBySeries.get(number)?.add(monthKey);
    });
    return [...monthsBySeries].map(([number, months]) => {
      const issuedMonths = [...months].sort();
      const monthLabel = formatPublicationIssueMonths(issuedMonths);
      return {
        number,
        value: String(number),
        issuedMonths,
        label: `第${number}弾${monthLabel ? `（${monthLabel}）` : ""}`
      };
    });
  }

  function filterCatalogLocations(items, { prefecture = "all", series = "all" } = {}) {
    const selectedSeries = series === "all" ? null : publicationSeriesNumber(series);
    if (series !== "all" && selectedSeries === null) return [];
    return items.filter(
      (item) =>
        (prefecture === "all" || item?.prefecture === prefecture) &&
        (selectedSeries === null || publicationSeriesNumber(item?.series) === selectedSeries)
    );
  }

  function compareLocations(a, b) {
    const aKey = fullCardNumberSortKey(a);
    const bKey = fullCardNumberSortKey(b);
    const invalidOrder = Number(aKey.startsWith("~")) - Number(bKey.startsWith("~"));
    return (
      invalidOrder ||
      idCollator.compare(aKey, bKey) ||
      idCollator.compare(String(a?.id ?? ""), String(b?.id ?? "")) ||
      nameCollator.compare(String(a?.cardName ?? ""), String(b?.cardName ?? ""))
    );
  }

  function comparePrefectureNames(a, b) {
    const aName = String(a ?? "");
    const bName = String(b ?? "");
    const aIndex = prefectureOrderByName.get(aName) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = prefectureOrderByName.get(bName) ?? Number.MAX_SAFE_INTEGER;
    return aIndex - bIndex || nameCollator.compare(aName, bName);
  }

  function comparePrefectureLocations(a, b) {
    return (
      comparePrefectureNames(a?.prefecture, b?.prefecture) ||
      nameCollator.compare(String(a?.municipality ?? ""), String(b?.municipality ?? "")) ||
      nameCollator.compare(String(a?.cardName ?? ""), String(b?.cardName ?? ""))
    );
  }

  function calculateVirtualWindow({
    itemCount,
    columns,
    rowHeight,
    rowGap,
    viewportStart,
    viewportHeight,
    overscanRows
  }) {
    const safeItemCount = Math.max(0, Math.floor(Number(itemCount) || 0));
    const safeColumns = Math.max(1, Math.floor(Number(columns) || 0));
    if (!safeItemCount) {
      return { rowCount: 0, startIndex: 0, endIndex: 0, offsetTop: 0, totalHeight: 0 };
    }

    const safeRowHeight = Math.max(1, Number(rowHeight) || 0);
    const safeRowGap = Math.max(0, Number(rowGap) || 0);
    const safeViewportHeight = Math.max(0, Number(viewportHeight) || 0);
    const safeOverscanRows = Math.max(0, Math.floor(Number(overscanRows) || 0));
    const rowCount = Math.ceil(safeItemCount / safeColumns);
    const stride = safeRowHeight + safeRowGap;
    const totalHeight = rowCount * safeRowHeight + Math.max(0, rowCount - 1) * safeRowGap;
    const maxViewportStart = Math.max(0, totalHeight - safeViewportHeight);
    const safeViewportStart = Math.min(maxViewportStart, Math.max(0, Number(viewportStart) || 0));
    const firstVisibleRow = Math.min(rowCount - 1, Math.floor(safeViewportStart / stride));
    const visibleRowEnd = Math.min(
      rowCount,
      Math.max(firstVisibleRow + 1, Math.ceil((safeViewportStart + safeViewportHeight) / stride))
    );
    const startRow = Math.max(0, firstVisibleRow - safeOverscanRows);
    const endRow = Math.min(rowCount, visibleRowEnd + safeOverscanRows);

    return {
      rowCount,
      startIndex: startRow * safeColumns,
      endIndex: Math.min(safeItemCount, endRow * safeColumns),
      offsetTop: startRow * stride,
      totalHeight
    };
  }

  function estimateVirtualRowHeight({ availableWidth, columns, rowGap }) {
    const safeColumns = Math.max(1, Math.floor(Number(columns) || 0));
    const safeRowGap = Math.max(0, Number(rowGap) || 0);
    const measuredWidth = Number(availableWidth);
    const fallbackWidth = safeColumns <= 2 ? 280 : 720;
    const safeWidth = Number.isFinite(measuredWidth) && measuredWidth > 0 ? measuredWidth : fallbackWidth;
    const cardWidth = Math.max(1, (safeWidth - safeRowGap * Math.max(0, safeColumns - 1)) / safeColumns);
    return Math.max(240, Math.ceil(cardWidth * 1.38 + 106));
  }

  function orderedPrefectures(items) {
    const prefectures = [...new Set(items.map((item) => String(item?.prefecture ?? "")).filter(Boolean))];
    return prefectures.sort(comparePrefectureNames);
  }

  globalThis.MhcardCatalog = Object.freeze({
    calculateVirtualWindow,
    compareLocations,
    comparePrefectureLocations,
    estimateVirtualRowHeight,
    filterCatalogLocations,
    formatPublicationIssueMonths,
    fullCardNumberSortKey,
    orderedPublicationSeries,
    orderedPrefectures,
    publicationIssueMonthKey,
    publicationSeriesNumber,
    publicationSeriesOptions,
    seriesSortKey
  });
})();
