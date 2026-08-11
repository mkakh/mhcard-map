# 運用備忘録

この文書は現在の運用経路と定期確認事項をまとめる。製品仕様は
`SPEC.md`、データ変更時の必須手順と情報源の優先順位は`AGENTS.md`を
正とし、この文書へ重複させない。

## 現在の構成

- 公開先: GitHub Pages（`https://mhcard-map.com/`）
- 公開契機: `main`へのpush、またはPages workflowの手動実行
- ユーザーデータ: `localStorage.mhc_collections`へ端末内保存
- 更新要求: ログイン不要のGoogle Form
- 配布場所データ: リポジトリのJSONをPull Requestでレビュー
- 定期更新: 毎週日曜18:00 UTCと手動実行
- 自動更新の出力: `automation/location-data-update`ブランチのPull Request

ユーザーアカウント、疑似ログイン、サーバー側DB、自動的な端末間同期は
使用しない。取得状況とメモの移行はJSONバックアップ／復元で行う。

## Pull Requestの確認

通常のPull Requestでは次を成功させてからマージする。

- `Validate location data`
- `Run tests`
- `Browser smoke test`
- `Analyze JavaScript and TypeScript`（CodeQL）

GitHubの`main`ルールでは、Pull Requestと上記チェックを必須にする。Pagesは
`main`をそのまま公開するため、チェック失敗を管理者判断で迂回しない。

自動更新Pull Requestでは、さらに以下を確認する。

- GKP候補のカードID・変更項目と同期コメント
- 配布場所と座標のbefore/after、移動距離、根拠URL
- 大量差分、画像コード不一致、ジオコード失敗
- `data/update-history.json`に生成された利用者向け更新履歴
- 継続Issueに残った未解決のGKP・検証候補

データを手作業で変更する場合は、この要約ではなく`AGENTS.md`の
「Manual location-data changes」を最初から最後まで実施する。

## GitHub Actionsと依存関係

- Workflow内の外部Actionは、バージョンコメント付きの完全なcommit SHAで
  固定する。タグへ戻さない。
- DependabotがGitHub Actionsとnpmを週次確認する。更新PRでも通常の全CIを
  通し、Actionのリリースノートと権限変更を確認する。
- CodeQLはPull Request、`main`へのpush、週次スケジュールで実行する。
- `Update Location Data`は書込権限を持つため、権限を増やさず、60分の
  タイムアウトを維持する。
- Workflowや公開対象を変えたら`actionlint`と`npm test`を実行する。

## Pages公開物

Pages artifactへ含めるデータは、ブラウザが実行時に読む次の4ファイルだけ。

- `data/locations.json`
- `data/update-history.json`
- `data/update-form-config.json`
- `data/update-requests.json`

`data/geocode-cache.json`、`data/gkp-review-baseline.json`、
`data/municipality-codes.json`などの更新処理用ファイルは公開物へコピーしない。
リポジトリ自体は公開されているため、これは秘密情報対策ではなく、配信境界と
artifact容量を明確にするための区分である。

## 外部設定の定期確認

コードだけでは保証できないため、次をGitHubと各サービスの設定画面で確認する。

- PagesのsourceがGitHub Actions、custom domainが`mhcard-map.com`、HTTPSが有効
- `main`ルールでPull RequestとCIチェックが必須
- Actions secret `GOOGLE_FORM_RESPONSES_CSV_URL`が利用可能
- Google Formのentry IDと`data/update-form-config.json`が一致
- Secret scanning、push protection、code scanningが有効
- 独自ドメインのDNSと証明書に警告がない

フォーム、Sheet、DNS、GitHubのrepository settingsを変更した場合は、変更日と
確認結果を該当IssueまたはPull Requestへ記録する。この文書へ一時的な障害や
個別カードの調査メモを蓄積しない。

## 障害時の切り分け

- 地図が表示されない: `locations.json`取得、JSON検証、ブラウザconsoleを確認
- 更新履歴だけ表示されない: `update-history.json`取得を確認。地図本体とは分離
- 更新要求だけ開けない: form configとGoogle Form公開設定を確認
- 定期更新が失敗: 失敗step、同期された検証Issue、GKP候補Issueを先に確認
- Pagesが失敗: artifact作成、4つのruntime JSON、CNAME、deploy environmentを確認
- 端末保存が失敗: 容量・プライベートモード・ブラウザ設定を確認し、利用者へ
  未保存であることが表示されることを確認
