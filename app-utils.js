(() => {
  function calendarDateInJapan(date = new Date()) {
    const value = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(value.valueOf())) throw new TypeError("Invalid date");
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(value);
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  }

  // Cabinet Office holidays: https://www8.cao.go.jp/chosei/shukujitsu/gaiyou.html
  const holidayDates = new Set([
    "2026-11-03", "2026-11-23", "2027-01-01", "2027-01-11",
    "2027-02-11", "2027-02-23", "2027-03-21", "2027-03-22",
    "2027-04-29", "2027-05-03", "2027-05-04", "2027-05-05",
    "2027-07-19", "2027-08-11", "2027-09-20", "2027-09-23",
    "2027-10-11", "2027-11-03", "2027-11-23"
  ]);

  function matchesDistributionDay(days, today) {
    if (days !== "平日" && days !== "土日祝日") return true;
    const weekday = new Date(today + "T00:00:00Z").getUTCDay();
    if (!today.startsWith("2026-") && !today.startsWith("2027-")) {
      if (weekday === 0 || weekday === 6) return days === "土日祝日";
      return false; // Unpublished future holidays: no guessed current desk pin.
    }
    const holiday = weekday === 0 || weekday === 6 || holidayDates.has(today);
    return days === "土日祝日" ? holiday : !holiday;
  }

  function activeDistributionPlaces(places, today = calendarDateInJapan()) {
    if (!Array.isArray(places) || !isIsoDate(today)) return Array.isArray(places) ? places : [];
    return places.filter((place) => {
      const startsOn = normalizedBound(place?.startsOn);
      const endsOn = normalizedBound(place?.endsOn);
      return (!startsOn || startsOn <= today) && (!endsOn || today <= endsOn)
        && matchesDistributionDay(place?.days, today);
    });
  }

  function selectPrimaryDistributionPlace(places, today = calendarDateInJapan()) {
    if (!Array.isArray(places) || places.length === 0) return null;
    if (!isIsoDate(today)) return places[0];

    const eligible = activeDistributionPlaces(places, today);
    const active = eligible[0];
    if (active) return active;
    if (places.some((place) => {
      const startsOn = normalizedBound(place?.startsOn);
      const endsOn = normalizedBound(place?.endsOn);
      return (place?.days === "平日" || place?.days === "土日祝日")
        && (!startsOn || startsOn <= today) && (!endsOn || today <= endsOn);
    })) return null;

    const upcoming = places.reduce((current, place) => {
      const startsOn = normalizedBound(place?.startsOn);
      if (!startsOn || startsOn <= today) return current;
      if (!current || startsOn < current.startsOn) return { place, startsOn };
      return current;
    }, null);
    if (upcoming) return upcoming.place;

    const expired = places.reduce((current, place) => {
      const endsOn = normalizedBound(place?.endsOn);
      if (!endsOn || endsOn >= today) return current;
      if (!current || endsOn > current.endsOn) return { place, endsOn };
      return current;
    }, null);
    return expired?.place ?? places[0];
  }

  function normalizedBound(value) {
    const text = String(value ?? "");
    return isIsoDate(text) ? text : "";
  }

  function isIsoDate(value) {
    const match = String(value ?? "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return false;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    return date.getUTCFullYear() === Number(match[1])
      && date.getUTCMonth() === Number(match[2]) - 1
      && date.getUTCDate() === Number(match[3]);
  }

  function placeCoordinateCategory(location, place) {
    if (location?.status === "休止中" && place?.address) return "stopped-known";
    if (location?.status === "休止中" && !place?.address) return "stopped-unknown";
    if (place?.geocodeError) return "geocode-failed";
    if (place?.coordinateAccuracy !== "address") return "approximate";
    return "address";
  }

  globalThis.MhcardAppUtils = Object.freeze({
    calendarDateInJapan,
    activeDistributionPlaces,
    selectPrimaryDistributionPlace,
    placeCoordinateCategory
  });
})();
