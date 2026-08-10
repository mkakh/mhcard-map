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
    return prefectures.sort((a, b) => {
      const aIndex = prefectureOrderByName.get(a) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = prefectureOrderByName.get(b) ?? Number.MAX_SAFE_INTEGER;
      return aIndex - bIndex || nameCollator.compare(a, b);
    });
  }

  globalThis.MhcardCatalog = Object.freeze({
    calculateVirtualWindow,
    compareLocations,
    estimateVirtualRowHeight,
    fullCardNumberSortKey,
    orderedPrefectures,
    seriesSortKey
  });
})();
