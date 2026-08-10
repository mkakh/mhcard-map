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

  function compareLocations(a, b) {
    const aKey = seriesSortKey(a);
    const bKey = seriesSortKey(b);
    const invalidOrder = Number(aKey.startsWith("~")) - Number(bKey.startsWith("~"));
    return (
      invalidOrder ||
      idCollator.compare(aKey, bKey) ||
      idCollator.compare(String(a?.id ?? ""), String(b?.id ?? "")) ||
      nameCollator.compare(String(a?.cardName ?? ""), String(b?.cardName ?? ""))
    );
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
    compareLocations,
    orderedPrefectures,
    seriesSortKey
  });
})();
