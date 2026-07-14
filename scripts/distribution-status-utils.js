export const UPCOMING_STATUS = "配布開始前";

export function normalizeDistributionDate(value) {
  const match = String(value ?? "").trim().match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (!match) return "";

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return "";

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function statusForDistributionStart({ startsOn, today, stopped = false }) {
  if (stopped) return "休止中";
  const startDate = normalizeDistributionDate(startsOn);
  const currentDate = normalizeDistributionDate(today);
  return startDate && currentDate && startDate > currentDate ? UPCOMING_STATUS : "配布中";
}
