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
- すべてのズーム率で各配布場所を個別の点として表示
- GKP検索ページから生成した実データ1291件の表示
- キーワード検索
- 都道府県、取得状態、配布状態フィルター
- 配布開始前カードと初回イベント・通常配布予定地の事前表示
- 現在地から近い順の並び替え
- 配布場所詳細
- Plus Code、緯度経度、Google Mapsリンク
- Google Maps、Apple Mapsリンク
- ログインなしの端末内保存
- 取得済みチェック
- 取得状況・取得日・メモのJSONバックアップ／復元
- 画像付きカードリスト（カード番号順、都道府県絞り込み、取得状態の直接切り替え）
- 取得日、メモ保存
- Google Forms連携による情報更新要求
- 取得状況の集計

## データ保存

現在はプロトタイプのため、取得済み情報とメモはブラウザの `localStorage` に保存します。
更新要求は `data/update-form-config.json` にGoogle Formsを設定すると外部フォームへ送信できます。

今後、APIとDBを追加する場合は `app.js` の保存処理を置き換えます。

## 実データ

配布場所データは `data/locations.json` から読み込みます。

現在のJSONはGKPの都道府県別検索ページをカタログ基盤として生成し、官公庁・公的機関の公式ページから先に確認できた監査済みレコードも保持できます。GKP掲載は新規カード追加の必須条件ではありません。

```bash
npm run import:gkp
```

インポートスクリプトは `.tmp/gkp/pref-XX.html` の取得済みHTMLを読み取り、存在しない場合はGKPの都道府県別検索ページを取得してから `data/locations.json` を生成します。`sourceType: "official_public_body_page"` のレコードはGKP未掲載でも削除せず、後からGKPに掲載された場合も公式ページの配布情報を優先します。既存のGKP由来レコードも配布情報を直接上書き・削除せず、コミット済みの `data/gkp-review-baseline.json` から変わったGKP項目だけをPRコメントと継続Issueの要確認候補として表示します。基準ファイルが欠けている通常実行は失敗し、新規カードは従来どおり自動取込の対象です。

住所ジオコーディングは以下で実行します。

```bash
npm run geocode
```

ジオコーディング結果は `data/geocode-cache.json` にキャッシュします。住所単位で成功したレコードは `coordinateAccuracy: "address"` になります。

住所が抽出できない、または住所検索に失敗したレコードは都道府県重心を基準に分散配置し、`coordinateAccuracy: "prefecture_approx"` のまま残します。

## 地図

地図表示には MapLibre GL JS を使用しています。

地図タイル、MapLibre本体、クラスタ数表示用フォントはネットワーク経由で読み込みます。
