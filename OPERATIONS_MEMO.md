# 運用備忘録

## 採用方針

- ログインは廃止する。
- 取得済み、取得日、メモはログインなしでブラウザの `localStorage` に保存する。
- UI文言は「ログイン」ではなく「この端末に保存」「保存データ」へ寄せる。
- 更新要求はログイン不要にする。
- 更新要求の一次受付は Google Forms を使う。
- Google Forms の回答は Google Sheets に集約する。
- GitHub Actions で定期的にデータ更新とフォーム回答取り込みを行う。
- 自動反映ではなく、自動PRを作成して管理者が承認・マージする。
- 公開は GitHub Pages を第一候補にする。
- 独自ドメイン `mhcard-map.com` は GitHub Pages の CNAME で利用する。
- さくらサーバーは将来のAPI/DB用途として温存し、初期公開では必須にしない。

## データ保存

現状のローカル保存先:

- 取得済み、取得日、メモ: `localStorage.mhc_collections`
- 疑似ログイン状態: `localStorage.mhc_user`

今後:

- `mhc_user` は廃止する。
- `mhc_collections` は継続利用する。
- 更新要求はローカル保存せず、Google Formsへ送信する。

## 自動更新

想定コマンド:

```bash
npm run import:gkp
npm run geocode
npm run normalize:links
npm run update:codes
```

GitHub Actions の方針:

- 週1回の定期実行から開始する。
- 手動実行 `workflow_dispatch` も用意する。
- 差分がある場合は直接pushではなくPRを作成する。
- GKP HTML構造変更、ジオコード失敗、大量差分がある場合はPR上で確認する。

## Google Forms 更新要求

フォームに持たせる項目:

- location id
- cardName
- prefecture
- municipality
- place
- address
- sourceUrl
- facilityUrl
- request type
- message
- referenceUrl

詳細画面の「更新要求」ボタンからGoogle Formを開き、URLパラメータで可能な項目を事前入力する。

半自動反映:

1. Google Forms回答がSheetsに保存される。
2. GitHub ActionsがSheetsをCSVまたはAPIで取得する。
3. 取り込みスクリプトが未処理回答を `data/update-requests.json` に保存する。
4. 反映候補を `data/locations.json` に適用する。
5. ActionsがPRを作成する。
6. 管理者が差分を確認してマージする。

初期は「回答取り込みPR」までを優先し、完全な自動反映は後回しにする。

## 公開

初期公開:

- GitHub Pages
- public repository
- 独自ドメインは `mhcard-map.com` をCNAME設定
- 画像は外部URL参照のまま
- データは `data/locations.json` を静的配信

費用:

- GitHub Pages: public repoなら無料
- GitHub Actions: public repoなら無料
- Google Forms / Sheets: 無料枠
- さくらサーバー: 初期公開では不要

## 次手順

1. ログインUIと疑似ログイン処理を削除する。
2. 取得済み、取得日、メモをログインなしで保存できるようにする。
3. マイページを「保存データ」画面へ変更する。
4. 更新要求ダイアログをGoogle Forms外部リンク方式へ変更する。
5. Google Formを作成し、entry IDを設定ファイルへ反映する。
6. GitHub Pages用のActionsを追加する。
7. 自動データ更新用Actionsを追加する。
8. Google Sheets取り込みスクリプトを追加する。
9. 取り込み結果をPR化するActionsを追加する。
10. SPEC.mdをログイン廃止、Google Forms、GitHub Pages運用に合わせて更新する。

## 実施済み

- ログインUIと疑似ログイン処理を削除。
- 取得済み、取得日、メモをログインなしで `localStorage.mhc_collections` に保存。
- マイページを「保存データ」画面へ変更。
- 更新要求ダイアログをGoogle Forms外部リンク方式へ変更。
- Google Forms設定ファイル `data/update-form-config.json` を追加。
- GitHub Pages用Actionsを追加。
- 自動データ更新用Actionsを追加。
- Google Sheets CSV取り込みスクリプト `scripts/import-form-requests.js` を追加。
- 取り込み結果をPR化するActionsを追加。
- GitHub Pages用 `CNAME` を追加。

## 手動で残る作業

- GitHub Pagesをリポジトリ設定で有効化する。
- `mhcard-map.com` のDNSをGitHub Pagesへ向ける。
- Google Formを作成する。
- Google Formのentry IDを `data/update-form-config.json` に設定する。
- Google SheetsのCSV URLをActions secret `GOOGLE_FORM_RESPONSES_CSV_URL` に設定する。
- SPEC.mdを最終運用仕様として整理する。
