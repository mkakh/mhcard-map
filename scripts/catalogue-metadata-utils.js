export function normalizePublicationSeries(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^第\s*([0-9０-９]+)\s*弾$/);
  if (!match) return null;

  const digits = match[1].replace(/[０-９]/g, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0)
  );
  const number = Number(digits);
  if (!Number.isSafeInteger(number) || number <= 0) return null;
  return `第${String(number).padStart(2, "0")}弾`;
}

export function normalizeImportedPublicationSeries(value) {
  return normalizePublicationSeries(value) ?? value;
}

export function isCanonicalPublicationSeries(value) {
  const text = String(value ?? "");
  const normalized = normalizePublicationSeries(text);
  return normalized !== null && normalized === text;
}

export function catalogueMetadataValidationErrors(location) {
  const errors = [];
  if (
    location?.series !== undefined
    && location.series !== ""
    && !isCanonicalPublicationSeries(location.series)
  ) {
    errors.push("series must use canonical 第NN弾 format with a positive integer");
  }
  if (
    location?.issuedOn !== undefined
    && location.issuedOn !== ""
    && !isRealCalendarDate(location.issuedOn, "/")
  ) {
    errors.push("issuedOn must be a real YYYY/MM/DD date");
  }
  return errors;
}

export function isRealCalendarDate(value, separator) {
  const escapedSeparator = separator === "/" ? "\\/" : "-";
  const match = String(value ?? "").match(
    new RegExp(`^(\\d{4})${escapedSeparator}(\\d{2})${escapedSeparator}(\\d{2})$`)
  );
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year <= 0 || month < 1 || month > 12 || day < 1) return false;

  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}
