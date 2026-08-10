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

  function selectPrimaryDistributionPlace(places, today = calendarDateInJapan()) {
    if (!Array.isArray(places) || places.length === 0) return null;
    if (!isIsoDate(today)) return places[0];

    const active = places.find((place) => {
      const startsOn = normalizedBound(place?.startsOn);
      const endsOn = normalizedBound(place?.endsOn);
      return (!startsOn || startsOn <= today) && (!endsOn || today <= endsOn);
    });
    if (active) return active;

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

  globalThis.MhcardAppUtils = Object.freeze({
    calendarDateInJapan,
    selectPrimaryDistributionPlace
  });
})();
