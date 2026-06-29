# マンホールカードマップ

マンホールカード収集者向けの地図サイトMVPです。

## 起動

```bash
npm run dev
```

起動後、ブラウザで以下を開きます。

```text
http://localhost:4173
```

## 現在の実装範囲

- 配布場所の地図ピン表示
- MapLibre GL JSによる実地図表示
- GeoJSON sourceによる地点描画
- 地点クラスタリング
- GKP検索ページから生成した実データ1265件の表示
- キーワード検索
- 都道府県、取得状態、配布状態フィルター
- 現在地から近い順の並び替え
- 配布場所詳細
- Plus Code、緯度経度、Google Mapsリンク
- Google Maps、Apple Mapsリンク
- ローカルログイン
- 取得済みチェック
- 取得日、メモ保存
- 情報更新要求の送信
- 取得状況の集計

## データ保存

現在はプロトタイプのため、ログイン、取得済み情報、メモ、更新要求はブラウザの `localStorage` に保存します。

今後、APIとDBを追加する場合は `app.js` の保存処理を置き換えます。

## 実データ

配布場所データは `data/locations.json` から読み込みます。

現在のJSONはGKPの都道府県別検索ページから生成しています。

```bash
npm run import:gkp
```

インポートスクリプトは `.tmp/gkp/pref-XX.html` の取得済みHTMLを読み取り、存在しない場合はGKPの都道府県別検索ページを取得してから `data/locations.json` を生成します。

住所ジオコーディングは以下で実行します。

```bash
npm run geocode
```

ジオコーディング結果は `data/geocode-cache.json` にキャッシュします。住所単位で成功したレコードは `coordinateAccuracy: "address"` になります。

住所が抽出できない、または住所検索に失敗したレコードは都道府県重心を基準に分散配置し、`coordinateAccuracy: "prefecture_approx"` のまま残します。

## 地図

地図表示には MapLibre GL JS を使用しています。

地図タイル、MapLibre本体、クラスタ数表示用フォントはネットワーク経由で読み込みます。
