// Pure calculations, intentionally independent of the DOM and any API.
const KAABA_LAT = 21.422487;
const KAABA_LON = 39.826206;
const radians = value => value * Math.PI / 180;
const degrees = value => value * 180 / Math.PI;

export function qiblaBearing(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new RangeError("Invalid coordinates");
  const a = radians(latitude);
  const b = radians(KAABA_LAT);
  const d = radians(KAABA_LON - longitude);
  const y = Math.sin(d);
  const x = Math.cos(a) * Math.tan(b) - Math.sin(a) * Math.cos(d);
  // Bearing is undefined exactly at the Kaaba.
  if (Math.abs(latitude - KAABA_LAT) < 1e-8 && Math.abs(longitude - KAABA_LON) < 1e-8) return null;
  return (degrees(Math.atan2(y, x)) + 360) % 360;
}

export function parseTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ""));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? hour * 3600 + minute * 60 : null;
}

export const PRAYERS = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];

export function nextPrayer(currentSecond, timings, tomorrowFajr) {
  if (!Number.isFinite(currentSecond) || currentSecond < 0 || currentSecond >= 86400) return null;
  for (const key of PRAYERS) {
    const at = parseTime(timings?.[key]);
    if (at !== null && at > currentSecond) return { key, seconds: at - currentSecond, time: timings[key] };
  }
  const tomorrow = parseTime(tomorrowFajr);
  if (tomorrow !== null) return { key: "Fajr", seconds: 86400 - currentSecond + tomorrow, time: tomorrowFajr, tomorrow: true };
  return null;
}

export function formatCountdown(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const parts = [Math.floor(safe / 3600), Math.floor(safe / 60) % 60, safe % 60];
  return parts.map(value => String(value).padStart(2, "0")).join(":");
}

export function zakatEstimate(data) {
  const cash = Number(data.cash);
  const gold = Number(data.gold);
  const goldPrice = Number(data.goldPrice);
  const other = Number(data.other);
  const debt = Number(data.debt);
  const nisab = Number(data.nisab);
  if (![cash, gold, goldPrice, other, debt, nisab].every(v => Number.isFinite(v) && v >= 0)) throw new RangeError("Nonnegative finite values required");
  if (nisab <= 0) throw new RangeError("Nisab must be provided");
  const assets = cash + gold * goldPrice + other;
  const net = Math.max(0, assets - debt);
  const eligible = net >= nisab && Boolean(data.year);
  return { assets, net, eligible, amount: eligible ? Math.round((net * 0.025 + Number.EPSILON) * 100) / 100 : 0 };
}
