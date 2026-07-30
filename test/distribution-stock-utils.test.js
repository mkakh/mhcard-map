import test from "node:test";
import assert from "node:assert/strict";
import { isCurrentDistributionStopped } from "../scripts/distribution-stock-utils.js";

test("detects a current distribution suspension", () => {
  assert.equal(
    isCurrentDistributionStopped("こちらからご確認ください ※現在、在庫切れのため配布を一時中止しています"),
    true
  );
  assert.equal(
    isCurrentDistributionStopped("在庫切れとなりましたので、配布を一時中止させていただきます"),
    true
  );
  assert.equal(
    isCurrentDistributionStopped("令和8年熊本地震の影響により、配布を一時休止します"),
    true
  );
  assert.equal(isCurrentDistributionStopped("在庫切れのため配布を停止しております"), true);
});

test("does not treat a future conditional suspension as current", () => {
  assert.equal(
    isCurrentDistributionStopped(
      "現在、在庫数が少ないため、カードが無くなった場合は配布を一時中止します。新たに納入した場合はお知らせします"
    ),
    false
  );
  assert.equal(isCurrentDistributionStopped("在庫がなくなり次第、配布終了します"), false);
  assert.equal(isCurrentDistributionStopped("配布を一時休止する場合があります"), false);
});
