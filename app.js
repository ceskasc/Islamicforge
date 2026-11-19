import { qiblaBearing, nextPrayer, formatCountdown, zakatEstimate, PRAYERS } from "./math.js";

const $ = id => document.getElementById(id);
const language = { value: safeGet("if-lang") === "en" ? "en" : "tr" };
const txt = (tr, en) => language.value === "tr" ? tr : en;
const KEYS = ["home", "prayer", "qibla", "tasbih", "hijri", "zakat"];
const TITLES = {
  home: ["GENEL BAKIŞ", "OVERVIEW"],
  prayer: ["NAMAZ VAKİTLERİ", "PRAYER TIMES"],
  qibla: ["KIBLE BULUCU", "QIBLA FINDER"],
  tasbih: ["DİJİTAL TESBİH", "DIGITAL TASBIH"],
  hijri: ["HİCRİ TAKVİM", "HIJRI CALENDAR"],
  zakat: ["ZEKÂT HESAPLAMA", "ZAKAT CALCULATOR"]
};
const CITIES = [
  { id: "istanbul", name: "İstanbul", lat: 41.0082, lon: 28.9784 },
  { id: "ankara", name: "Ankara", lat: 39.9334, lon: 32.8597 },
  { id: "izmir", name: "İzmir", lat: 38.4237, lon: 27.1428 },
  { id: "cesme", name: "Çeşme", lat: 38.3235, lon: 26.3030 },
  { id: "bursa", name: "Bursa", lat: 40.1885, lon: 29.0610 },
  { id: "konya", name: "Konya", lat: 37.8714, lon: 32.4846 },
  { id: "antalya", name: "Antalya", lat: 36.8969, lon: 30.7133 },
  { id: "adana", name: "Adana", lat: 37.0000, lon: 35.3213 },
  { id: "gaziantep", name: "Gaziantep", lat: 37.0662, lon: 37.3833 },
  { id: "kayseri", name: "Kayseri", lat: 38.7225, lon: 35.4875 },
  { id: "trabzon", name: "Trabzon", lat: 41.0027, lon: 39.7168 },
  { id: "diyarbakir", name: "Diyarbakır", lat: 37.9144, lon: 40.2306 }
];
const PRAYER_LABELS = {
  Fajr: ["İmsak", "Fajr"], Sunrise: ["Güneş", "Sunrise"], Dhuhr: ["Öğle", "Dhuhr"],
  Asr: ["İkindi", "Asr"], Maghrib: ["Akşam", "Maghrib"], Isha: ["Yatsı", "Isha"]
};
const HIJRI_MONTHS = [
  ["Muharrem", "Muharram"], ["Safer", "Safar"], ["Rebiülevvel", "Rabi al-Awwal"],
  ["Rebiülahir", "Rabi al-Thani"], ["Cemaziyelevvel", "Jumada al-Ula"],
  ["Cemaziyelahir", "Jumada al-Akhirah"], ["Recep", "Rajab"], ["Şaban", "Shaban"],
  ["Ramazan", "Ramadan"], ["Şevval", "Shawwal"], ["Zilkade", "Dhu al-Qadah"],
  ["Zilhicce", "Dhu al-Hijjah"]
];
const state = {
  city: CITIES.find(c => c.id === safeGet("if-city")) || CITIES[0],
  location: null,
  timings: null,
  tomorrowFajr: null,
  timezone: "Europe/Istanbul",
  date: null,
  prayerTimer: null,
  bearing: null,
  heading: null,
  gps: false,
  conversion: "gtoh",
  tasbih: loadTasbih()
};
state.location = { ...state.city };
const money = value => new Intl.NumberFormat(language.value === "tr" ? "tr-TR" : "en-US", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(value);
let toastTimer;
let loadSequence = 0;

function safeGet(key) { try { return localStorage.getItem(key); } catch { return null; } }
function safeSet(key, value) { try { localStorage.setItem(key, value); } catch { /* private mode */ } }
function notify(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 4300);
}
function pad(value) { return String(value).padStart(2, "0"); }
function localInputDate(date) { return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-"); }
function dateForZone(zone, offset = 0) {
  const f = new Intl.DateTimeFormat("en-GB", { timeZone: zone, day: "2-digit", month: "2-digit", year: "numeric" });
  const parts = f.formatToParts(new Date());
  const get = type => Number(parts.find(p => p.type === type).value);
  const d = new Date(Date.UTC(get("year"), get("month") - 1, get("day") + offset, 12));
  return pad(d.getUTCDate()) + "-" + pad(d.getUTCMonth() + 1) + "-" + d.getUTCFullYear();
}
function secondsForZone(zone) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const n = type => Number(parts.find(p => p.type === type).value);
  return n("hour") * 3600 + n("minute") * 60 + n("second");
}
function openPage(page) {
  const selected = KEYS.includes(page) ? page : "home";
  KEYS.forEach(key => $(key).classList.toggle("active", key === selected));
  document.querySelectorAll("[data-page]").forEach(el => {
    const active = el.dataset.page === selected && (el.classList.contains("nav-link") || el.closest(".mobile-nav"));
    el.classList.toggle("active", Boolean(active));
    if (active) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
  });
  $("breadcrumb").textContent = TITLES[selected][language.value === "tr" ? 0 : 1];
  document.title = "IslamicForge — " + TITLES[selected][language.value === "tr" ? 0 : 1];
  if (selected === "prayer" && !state.timings) loadPrayer();
  if (selected === "qibla") updateBearing();
  window.scrollTo({ top: 0, behavior: "instant" });
}
function navigate(page) { if (!KEYS.includes(page)) return; history.pushState(null, "", "#" + page); openPage(page); }
document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => navigate(button.dataset.page)));
$("logo-link").addEventListener("click", event => { event.preventDefault(); navigate("home"); });
window.addEventListener("popstate", () => openPage(location.hash.slice(1)));
window.addEventListener("hashchange", () => openPage(location.hash.slice(1)));

function updateLanguage() {
  document.documentElement.lang = language.value;
  document.querySelectorAll("[data-tr][data-en]").forEach(element => { element.textContent = element.dataset[language.value]; });
  $("language-button").textContent = language.value === "tr" ? "EN" : "TR";
  $("today-label").textContent = new Intl.DateTimeFormat(language.value === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  openPage(location.hash.slice(1));
  updateMonths(); renderTasbih(); updateBearing();
  if (state.timings) { renderPrayer(); updateCountdown(); }
}
$("language-button").addEventListener("click", () => { language.value = language.value === "tr" ? "en" : "tr"; safeSet("if-lang", language.value); updateLanguage(); });
function applyTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  $("theme-button").innerHTML = dark ? '<svg><use href="#sun"></use></svg>' : '<svg><use href="#moon"></use></svg>';
  $("theme-button").setAttribute("aria-label", dark ? "Light mode" : "Dark mode");
  document.querySelector('meta[name="theme-color"]').content = dark ? "#101722" : "#f5f3ed";
}
if (safeGet("if-theme") === "dark" || (!safeGet("if-theme") && window.matchMedia && matchMedia("(prefers-color-scheme:dark)").matches)) document.documentElement.dataset.theme = "dark";
applyTheme();
$("theme-button").addEventListener("click", () => {
  document.documentElement.dataset.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  safeSet("if-theme", document.documentElement.dataset.theme); applyTheme();
});

function initCities() {
  const select = $("city");
  CITIES.forEach(city => { const option = new Option(city.name, city.id); select.add(option); });
  select.value = state.city.id;
  select.addEventListener("change", () => {
    const city = CITIES.find(c => c.id === select.value);
    if (!city) return;
    state.city = city; state.location = { ...city }; state.gps = false;
    state.timezone = "Europe/Istanbul"; safeSet("if-city", city.id);
    state.timings = null; loadPrayer(); updateBearing();
  });
}
function requestPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error(txt("Tarayıcı konum özelliğini desteklemiyor.", "Geolocation is not supported."))); return; }
    navigator.geolocation.getCurrentPosition(
      position => resolve({ id: "gps", name: txt("Mevcut konum", "Current location"), lat: position.coords.latitude, lon: position.coords.longitude }),
      error => reject(new Error(error.code === 1 ? txt("Konum izni verilmedi.", "Location permission was denied.") : txt("Konum alınamadı. Şehir seçmeyi dene.", "Location unavailable. Try selecting a city."))),
      { enableHighAccuracy: true, timeout: 13000, maximumAge: 60000 }
    );
  });
}
async function useGPS() {
  try {
    const location = await requestPosition();
    state.location = location; state.gps = true;
    state.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const select = $("city");
    if (!select.querySelector('option[value="gps"]')) select.add(new Option(txt("Mevcut konum (GPS)", "Current location (GPS)"), "gps"));
    select.value = "gps"; await loadPrayer(); updateBearing();
    notify(txt("Konum alındı.", "Location acquired."));
  } catch (error) { notify(error.message); }
}
$("gps").addEventListener("click", useGPS);
$("qibla-gps").addEventListener("click", useGPS);
async function requestJSON(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 13000);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const json = await response.json();
    if (json.code !== 200 || !json.data) throw new Error("Invalid API response");
    return json.data;
  } finally { clearTimeout(timeout); }
}
function timingsURL(date) {
  const location = state.location;
  const url = new URL("https://api.aladhan.com/v1/timings/" + date);
  url.searchParams.set("latitude", String(location.lat));
  url.searchParams.set("longitude", String(location.lon));
  url.searchParams.set("method", "13");
  url.searchParams.set("school", "0");
  url.searchParams.set("calendarMethod", "DIYANET");
  return url.toString();
}
async function loadPrayer() {
  const requestId = ++loadSequence;
  state.timings = null; state.tomorrowFajr = null;
  $("prayer-list").textContent = txt("Vakitler yükleniyor…", "Loading prayer times…");
  $("next-prayer").textContent = "—"; $("prayer-countdown").textContent = "--:--:--";
  $("selected-place").textContent = state.location.name;
  const date = dateForZone(state.timezone);
  const nextDay = dateForZone(state.timezone, 1);
  try {
    const [today, tomorrow] = await Promise.all([requestJSON(timingsURL(date)), requestJSON(timingsURL(nextDay)).catch(() => null)]);
    if (requestId !== loadSequence) return;
    if (!today.timings || !PRAYERS.every(key => /^\d{1,2}:\d{2}/.test(String(today.timings[key] || "")))) throw new Error("Invalid timings");
    state.timings = today.timings;
    state.tomorrowFajr = tomorrow?.timings?.Fajr || null;
    state.date = today.date?.readable || date;
    if (today.meta?.timezone) state.timezone = today.meta.timezone;
    $("prayer-date").textContent = date;
    renderPrayer(); updateCountdown();
    if (state.prayerTimer) clearInterval(state.prayerTimer);
    state.prayerTimer = setInterval(() => {
      if (dateForZone(state.timezone) !== date) { clearInterval(state.prayerTimer); state.prayerTimer = null; loadPrayer(); }
      else updateCountdown();
    }, 1000);
  } catch (error) {
    if (requestId !== loadSequence) return;
    $("prayer-list").textContent = txt("Vakitler alınamadı. Bağlantını kontrol et veya başka şehir seç.", "Unable to load times. Check your connection or select another city.");
    notify(txt("Namaz vakti servisine ulaşılamıyor.", "Prayer-time service unavailable."));
  }
}
function renderPrayer() {
  if (!state.timings) return;
  const next = nextPrayer(secondsForZone(state.timezone), state.timings, state.tomorrowFajr);
  const list = $("prayer-list"); list.replaceChildren();
  for (const key of ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"]) {
    const row = document.createElement("div"); row.className = "prayer-row";
    if (next?.key === key && !next.tomorrow) row.classList.add("highlight");
    const label = document.createElement("span");
    label.textContent = PRAYER_LABELS[key][language.value === "tr" ? 0 : 1];
    const time = document.createElement("b");
    time.textContent = String(state.timings[key] || "—").slice(0, 5);
    row.append(label, time); list.append(row);
  }
}
function updateCountdown() {
  if (!state.timings) return;
  const next = nextPrayer(secondsForZone(state.timezone), state.timings, state.tomorrowFajr);
  $("next-prayer").textContent = next ? PRAYER_LABELS[next.key][language.value === "tr" ? 0 : 1] + (next.tomorrow ? txt(" (yarın)", " (tomorrow)") : "") : "—";
  $("prayer-countdown").textContent = next ? formatCountdown(next.seconds) : "--:--:--";
}

function updateBearing() {
  const where = state.location;
  $("bearing-place").textContent = where.name;
  try { state.bearing = qiblaBearing(where.lat, where.lon); } catch { state.bearing = null; }
  $("bearing").textContent = state.bearing === null ? "—" : state.bearing.toFixed(1) + "°";
  turnNeedle();
}
function turnNeedle() {
  $("needle").style.transform = "rotate(" + ((state.bearing ?? 0) - (state.heading ?? 0)) + "deg)";
}
function onOrientation(event) {
  let heading = null;
  if (Number.isFinite(event.webkitCompassHeading)) heading = event.webkitCompassHeading;
  else if (event.absolute === true && Number.isFinite(event.alpha)) heading = (360 - event.alpha + 360) % 360;
  if (heading === null) return;
  state.heading = heading; turnNeedle();
  $("sensor-state").textContent = txt("Sensör etkin · kalibrasyonu kontrol et.", "Sensor active · check calibration.");
}
$("sensor").addEventListener("click", async () => {
  if (!window.DeviceOrientationEvent) { notify(txt("Cihazda pusula sensörü bulunamadı.", "Compass sensor not supported.")); return; }
  try {
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      const result = await DeviceOrientationEvent.requestPermission();
      if (result !== "granted") throw new Error(txt("Sensör izni verilmedi.", "Sensor permission denied."));
    }
    window.addEventListener("deviceorientationabsolute", onOrientation, true);
    window.addEventListener("deviceorientation", onOrientation, true);
    $("sensor-state").textContent = txt("Sensör verisi bekleniyor…", "Waiting for sensor data…");
    setTimeout(() => { if (state.heading === null) $("sensor-state").textContent = txt("Kuzey referansı gösteriliyor; cihaz mutlak pusula verisi sağlamadı.", "North reference shown; no absolute heading available."); }, 3500);
  } catch (error) { notify(error.message); }
});

function loadTasbih() {
  try {
    const saved = JSON.parse(safeGet("if-tasbih") || "{}");
    return {
      total: Number.isSafeInteger(saved.total) && saved.total >= 0 ? saved.total : 0,
      target: [0, 33, 99, 100].includes(saved.target) ? saved.target : 33,
      vibrate: typeof saved.vibrate === "boolean" ? saved.vibrate : true
    };
  } catch { return { total: 0, target: 33, vibrate: true }; }
}
function renderTasbih() {
  const { total, target, vibrate } = state.tasbih;
  $("target").value = String(target); $("vibration").checked = vibrate;
  $("count").textContent = total.toLocaleString(language.value === "tr" ? "tr-TR" : "en-US");
  $("rounds").textContent = target ? Math.floor(total / target).toLocaleString() : "—";
  $("total").textContent = total.toLocaleString();
  const progress = target ? total % target || (total > 0 ? target : 0) : 0;
  $("count-progress").textContent = target ? progress + " / " + target : txt("Serbest sayım", "Free counting");
  $("counter-ring").style.setProperty("--angle", target ? (progress / target * 360) + "deg" : "0deg");
}
function saveTasbih() { safeSet("if-tasbih", JSON.stringify(state.tasbih)); }
function incrementTasbih() {
  if (state.tasbih.total >= Number.MAX_SAFE_INTEGER) return;
  state.tasbih.total++;
  if (state.tasbih.vibrate && typeof navigator.vibrate === "function") navigator.vibrate(15);
  saveTasbih(); renderTasbih();
}
$("increment").addEventListener("click", incrementTasbih);
$("target").addEventListener("change", event => { state.tasbih.target = Number(event.target.value); saveTasbih(); renderTasbih(); });
$("vibration").addEventListener("change", event => { state.tasbih.vibrate = event.target.checked; saveTasbih(); });
$("reset").addEventListener("click", () => {
  if (!window.confirm(txt("Sayaç sıfırlansın mı?", "Reset the counter?"))) return;
  state.tasbih.total = 0; saveTasbih(); renderTasbih();
});
window.addEventListener("keydown", event => {
  if (event.code !== "Space" || !$("tasbih").classList.contains("active")) return;
  if (event.repeat || /^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
  event.preventDefault(); incrementTasbih();
});

HIJRI_MONTHS.forEach((names, i) => { const opt = new Option(names[0], i + 1); $("h-month").add(opt); });
function updateMonths() {
  Array.from($("h-month").options).forEach((option, i) => { option.textContent = HIJRI_MONTHS[i][language.value === "tr" ? 0 : 1]; });
}
function conversionMode(mode) {
  state.conversion = mode;
  $("gtoh").classList.toggle("selected", mode === "gtoh"); $("htog").classList.toggle("selected", mode === "htog");
  $("gtoh").setAttribute("aria-pressed", String(mode === "gtoh")); $("htog").setAttribute("aria-pressed", String(mode === "htog"));
  $("gregorian-fields").hidden = mode !== "gtoh"; $("hijri-fields").hidden = mode !== "htog";
  $("converted").textContent = "—"; $("convert-detail").textContent = "";
}
$("gtoh").addEventListener("click", () => conversionMode("gtoh"));
$("htog").addEventListener("click", () => conversionMode("htog"));
$("greg-date").value = localInputDate(new Date());
function formatGregorian(dateString) {
  const bits = dateString.split("-");
  if (bits.length !== 3) return dateString;
  const date = new Date(Date.UTC(Number(bits[2]), Number(bits[1]) - 1, Number(bits[0]), 12));
  return new Intl.DateTimeFormat(language.value === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}
async function convertDate() {
  let route;
  if (state.conversion === "gtoh") {
    const date = $("greg-date").value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { notify(txt("Geçerli bir tarih seç.", "Select a valid date.")); return; }
    const parts = date.split("-");
    route = "gToH/" + parts[2] + "-" + parts[1] + "-" + parts[0];
  } else {
    const day = Number($("h-day").value), month = Number($("h-month").value), year = Number($("h-year").value);
    if (!Number.isInteger(day) || day < 1 || day > 30 || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1300 || year > 1600) { notify(txt("Geçerli bir Hicri tarih gir.", "Enter a valid Hijri date.")); return; }
    route = "hToG/" + pad(day) + "-" + pad(month) + "-" + year;
  }
  const button = $("convert"); button.disabled = true; $("converted").textContent = "…";
  try {
    const data = await requestJSON("https://api.aladhan.com/v1/" + route + "?calendarMethod=DIYANET");
    if (state.conversion === "gtoh") {
      const h = data.hijri;
      if (!h || !h.month) throw new Error("Invalid response");
      const number = Number(h.month.number);
      $("converted").textContent = h.day + " " + (HIJRI_MONTHS[number - 1]?.[language.value === "tr" ? 0 : 1] || h.month.en) + " " + h.year;
      $("convert-detail").textContent = txt("Hicri tarih · AlAdhan API", "Hijri date · AlAdhan API");
      $("h-day").value = h.day; $("h-month").value = String(number); $("h-year").value = h.year;
    } else {
      if (!data.gregorian?.date) throw new Error("Invalid response");
      $("converted").textContent = formatGregorian(data.gregorian.date);
      $("convert-detail").textContent = txt("Miladi tarih · AlAdhan API", "Gregorian date · AlAdhan API");
      const p = data.gregorian.date.split("-");
      $("greg-date").value = p[2] + "-" + p[1] + "-" + p[0];
    }
  } catch {
    $("converted").textContent = "—";
    $("convert-detail").textContent = txt("Dönüşüm servisine ulaşılamadı. Tarihi kontrol edip yeniden dene.", "Conversion service unavailable. Check your date and retry.");
  } finally { button.disabled = false; }
}
$("convert").addEventListener("click", convertDate);

$("zakat-form").addEventListener("submit", event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  try {
    const result = zakatEstimate({
      cash: form.get("cash"), gold: form.get("gold"), goldPrice: form.get("goldPrice"),
      other: form.get("other"), debt: form.get("debt"), nisab: form.get("nisab"), year: form.has("year")
    });
    $("zakat-assets").textContent = money(result.assets);
    $("zakat-net").textContent = money(result.net);
    $("zakat-amount").textContent = money(result.amount);
    $("zakat-status").textContent = result.eligible
      ? txt("Girdiğin şartlara göre yaklaşık %2,5 hesaplandı.", "Estimated at 2.5% under your entered conditions.")
      : txt("Girilen bilgilere göre nisap veya kamerî yıl koşulu sağlanmıyor.", "The entered nisab or lunar-year condition is not met.");
  } catch {
    notify(txt("Tüm tutarları doğru ve pozitif/ sıfır değerlerle gir; nisap sıfırdan büyük olmalı.", "Check inputs: nonnegative values and a positive nisab required."));
  }
});

$("year").textContent = String(new Date().getFullYear());
initCities();
updateLanguage();
updateMonths();
renderTasbih();
updateBearing();
