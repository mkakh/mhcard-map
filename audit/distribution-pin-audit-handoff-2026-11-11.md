# 配布pin監査の停止・再開記録（2026-11-11 JST）

ユーザー指示で、個別pin監査 automation 4eacb996-e3a4-4ef6-803f-289acea1a29a と期限報告 3e30a189-d597-401f-9c26-8473a3596e81 を無効化（削除せず）。他の更新も含む3日ごとの公式データ更新 3844c747-23bc-40fc-8e53-15e9eba66d3d は継続。

公開台帳 audit/distribution-pin-ledger-2026-10.jsonl は1911地点キー: corrected 1366、confirmed 312、unresolved 233、pending 0。未裁定は完了扱いにしない。各キーの根拠は台帳に保存。

公開待ち6キーの内訳: 最新mainにデータが公開済みだった三春町A・鹿沼市A・桐生市B休日の3キーは本番JSON全レコード一致を確認。旧監査枝にあった旭川市A管理本館と苫小牧市A本体・平日計3キーは、古い枝を丸ごとmergeせず最新mainへ対象だけ移植しPR #219で公開。旭川の旧配布時間を市公式の9:00～17:00へ同時訂正。PR #219 merge 6cbe114c69a3265df5edde4692605eb57e793f28、Pages run 43003768770成功。本番JSONで全5カード一致。台帳6行に公開証跡を追加。施設代表点であり入口実測ではない。

更新ログの所在:
- audit/distribution-pin-ledger-2026-10.jsonl: 1911キーの根拠・採否・公開記録。
- audit/distribution-pin-automation-runs-2026-11-11.jsonl: schedulerで停止時に保持されていた310件の全run（2026-11-04 19:18から11-11 19:00 JST）。結果・要約・失敗・配信だけを保存。保持期間以前は含まれない。
- https://github.com/mkakh/mhcard-map/issues/114 とGitHub PR/Actions・Git履歴: 保持期間前を含む継続記録。
- 旧作業木 /home/openclaw/workspaces/mhcard-map-pin-audit-continuation-v3、枝 audit/distribution-pins-continuation-20261109、HEAD ecdd178 は参照用に保全。1891キーの古い母数なので再公開・一括mergeしない。

再開時: 明示的な再開依頼の後にだけジョブ状態とwriterを確認。最新origin/mainから隔離枝を作り、旧枝からは対象別根拠のみ持ち込む。カード別公式資料で未裁定を照合し、施設変更時のみSerper Placesを再検索。同じ敷地内の別棟というだけでは同名Serper施設代表点を却下しない。元データsnapshot・差分・テスト・CI・Pages・本番JSON・台帳を別々に検証する。
