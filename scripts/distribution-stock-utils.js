export function isCurrentDistributionStopped(...values) {
  const sentences = values
    .flatMap((value) => String(value ?? "").split(/[。\n]/))
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  return sentences.some((sentence) => {
    if (isConditionalStopNotice(sentence)) return false;
    return /配布終了|配布を一時(?:中止|休止)|配布(?:休止|を停止)|一時中止|休止中|中止しています/.test(sentence);
  });
}

function isConditionalStopNotice(sentence) {
  return /(?:なくなり|無くなり|在庫切れになり)次第/.test(sentence)
    || /(?:場合|際|とき).{0,30}(?:中止|休止)/.test(sentence)
    || /(?:中止|休止)する(?:場合|可能性|ことがあり)/.test(sentence);
}
