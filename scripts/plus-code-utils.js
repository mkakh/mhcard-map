const codeAlphabet = "23456789CFGHJMPQRVWX";
const pairResolutions = [20, 1, 0.05, 0.0025, 0.000125];

export function encodePlusCode(lat, lng) {
  let adjustedLat = clipLatitude(lat);
  const adjustedLng = normalizeLongitude(lng);

  if (adjustedLat === 90) {
    adjustedLat -= pairResolutions[pairResolutions.length - 1];
  }

  let latValue = adjustedLat + 90;
  let lngValue = adjustedLng + 180;
  let code = "";

  for (const resolution of pairResolutions) {
    const latDigit = Math.floor(latValue / resolution);
    const lngDigit = Math.floor(lngValue / resolution);
    code += codeAlphabet[latDigit] + codeAlphabet[lngDigit];
    latValue -= latDigit * resolution;
    lngValue -= lngDigit * resolution;
  }

  return `${code.slice(0, 8)}+${code.slice(8)}`;
}

function clipLatitude(lat) {
  return Math.min(90, Math.max(-90, Number(lat)));
}

function normalizeLongitude(lng) {
  let normalized = Number(lng);
  while (normalized < -180) normalized += 360;
  while (normalized >= 180) normalized -= 360;
  return normalized;
}
