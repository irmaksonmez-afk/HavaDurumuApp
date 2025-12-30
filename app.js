// ====== AYAR ======
const API_KEY = "870d0453507404e18e3f2a87f1dda483"; // <-- buraya key yaz
// ===================

const els = {
  unitToggle: document.getElementById("unitToggle"),
  cityInput: document.getElementById("cityInput"),
  clearBtn: document.getElementById("clearBtn"),
  searchBtn: document.getElementById("searchBtn"),
  toast: document.getElementById("toast"),

  placeTitle: document.getElementById("placeTitle"),
  placeMeta: document.getElementById("placeMeta"),

  wxIcon: document.getElementById("wxIcon"),
  wxEmoji: document.querySelector("#wxIcon .emoji"),

  tempValue: document.getElementById("tempValue"),
  tempUnit: document.getElementById("tempUnit"),
  descText: document.getElementById("descText"),

  feelsValue: document.getElementById("feelsValue"),
  feelsUnit: document.getElementById("feelsUnit"),

  minValue: document.getElementById("minValue"),
  minUnit: document.getElementById("minUnit"),

  maxValue: document.getElementById("maxValue"),
  maxUnit: document.getElementById("maxUnit"),

  humValue: document.getElementById("humValue"),
  windValue: document.getElementById("windValue"),
  rainValue: document.getElementById("rainValue"),
  pressValue: document.getElementById("pressValue"),

  humBadge: document.getElementById("humBadge"),
  windBadge: document.getElementById("windBadge"),
  rainBadge: document.getElementById("rainBadge"),
  minMaxBadge: document.getElementById("minMaxBadge"),
};

let unit = "metric"; // metric => °C, imperial => °F
let lastCity = "";

// --- yardımcılar ---
function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function round(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "--";
  return Math.round(n);
}

function kmhFromMs(ms) {
  // OpenWeatherMap: wind.speed (m/s)
  if (typeof ms !== "number" || Number.isNaN(ms)) return "--";
  return Math.round(ms * 3.6);
}

function unitSymbol() {
  return unit === "metric" ? "°C" : "°F";
}

function setUnitUI() {
  const isC = unit === "metric";
  els.unitToggle.classList.toggle("is-c", isC);
  els.unitToggle.classList.toggle("is-f", !isC);

  const sym = unitSymbol();
  els.tempUnit.textContent = sym;
  els.feelsUnit.textContent = sym;
  els.minUnit.textContent = sym;
  els.maxUnit.textContent = sym;
}

function weatherEmoji(main, description) {
  const d = (description || "").toLowerCase();
  const m = (main || "").toLowerCase();

  if (m.includes("thunder")) return "⛈️";
  if (m.includes("drizzle")) return "🌦️";
  if (m.includes("rain")) return "🌧️";
  if (m.includes("snow")) return "🌨️";
  if (m.includes("mist") || m.includes("fog") || m.includes("haze")) return "🌫️";
  if (m.includes("cloud")) {
    if (d.includes("few")) return "🌤️";
    return "☁️";
  }
  if (m.includes("clear")) return "☀️";
  return "⛅";
}

function trDesc(main, description) {
  // Basit TR çeviri hissi (birebir şart değil ama görüntüye çok yaklaştırır)
  const d = (description || "").toLowerCase();

  const map = [
    ["clear sky", "açık"],
    ["few clouds", "az bulutlu"],
    ["scattered clouds", "parçalı bulutlu"],
    ["broken clouds", "çok bulutlu"],
    ["overcast clouds", "kapalı"],
    ["light rain", "hafif yağmur"],
    ["moderate rain", "yağmur"],
    ["heavy intensity rain", "şiddetli yağmur"],
    ["shower rain", "sağanak"],
    ["thunderstorm", "gök gürültülü"],
    ["mist", "sisli"],
    ["fog", "sisli"],
    ["haze", "puslu"],
    ["snow", "karlı"],
  ];

  for (const [k, v] of map) {
    if (d.includes(k)) return v;
  }

  // fallback
  if (main) return main.toLowerCase();
  return "—";
}

function formatLocalTime(dtUnixSeconds, timezoneOffsetSeconds, locale = "tr-TR") {
  // OWM timezone offset: seconds from UTC
  const utcMs = dtUnixSeconds * 1000;
  const localMs = utcMs + timezoneOffsetSeconds * 1000;

  const fmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return fmt.format(new Date(localMs));
}

async function fetchWeatherByCity(city) {
  if (!API_KEY || API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
    showToast("API key eklemelisin (app.js).");
    throw new Error("Missing API key");
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?q=${encodeURIComponent(city)}` +
    `&appid=${encodeURIComponent(API_KEY)}` +
    `&units=${unit}`; // metric / imperial

  const res = await fetch(url);
  if (!res.ok) {
    let msg = "Şehir bulunamadı.";
    try {
      const data = await res.json();
      if (data && data.message) msg = data.message;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

function render(data) {
  const name = data?.name ?? "—";
  const country = data?.sys?.country ?? "";
  const coord = data?.coord ? `${data.coord.lat?.toFixed?.(2) ?? data.coord.lat}, ${data.coord.lon?.toFixed?.(2) ?? data.coord.lon}` : "--, --";

  const localTime = (data?.dt && typeof data?.timezone === "number")
    ? formatLocalTime(data.dt, data.timezone)
    : "--:--";

  els.placeTitle.textContent = `${name}${country ? ", " + country : ""}`;
  els.placeMeta.textContent = `${country ? "Türkiye" : ""}${country ? " • " : ""}${localTime} • ${coord}`;

  const temp = data?.main?.temp;
  const feels = data?.main?.feels_like;
  const tmin = data?.main?.temp_min;
  const tmax = data?.main?.temp_max;

  els.tempValue.textContent = round(temp);
  els.feelsValue.textContent = round(feels);
  els.minValue.textContent = round(tmin);
  els.maxValue.textContent = round(tmax);

  const main = data?.weather?.[0]?.main ?? "";
  const desc = data?.weather?.[0]?.description ?? "";
  const tr = trDesc(main, desc);

  els.descText.textContent = tr;

  els.wxEmoji.textContent = weatherEmoji(main, desc);

  const hum = data?.main?.humidity ?? "--";
  const windKmh = kmhFromMs(data?.wind?.speed);
  const press = data?.main?.pressure ?? "--";

  // Yağış: OWM bazen rain["1h"] / rain["3h"] verir
  const rain1h = data?.rain?.["1h"];
  const rain3h = data?.rain?.["3h"];
  const rain = (typeof rain1h === "number") ? rain1h : (typeof rain3h === "number" ? rain3h : 0);

  els.humValue.textContent = hum;
  els.windValue.textContent = windKmh;
  els.pressValue.textContent = press;
  els.rainValue.textContent = (typeof rain === "number") ? rain.toFixed(0) : "0";

  // alt rozetler
  els.humBadge.textContent = `${hum}%`;
  els.windBadge.textContent = `${windKmh} km/sa`;
  els.rainBadge.textContent = `${(typeof rain === "number") ? rain.toFixed(0) : 0} mm`;
  els.minMaxBadge.textContent = `${round(tmin)}${unitSymbol()} / ${round(tmax)}${unitSymbol()}`;
}

async function runSearch(city) {
  const q = (city || "").trim();
  if (!q) {
    showToast("Şehir adı yaz.");
    return;
  }

  els.searchBtn.disabled = true;
  els.searchBtn.style.opacity = "0.85";
  els.searchBtn.style.cursor = "wait";

  try {
    const data = await fetchWeatherByCity(q);
    lastCity = q;
    render(data);
  } catch (err) {
    showToast(err?.message || "Bir hata oluştu.");
  } finally {
    els.searchBtn.disabled = false;
    els.searchBtn.style.opacity = "1";
    els.searchBtn.style.cursor = "pointer";
  }
}

// --- eventler ---
els.searchBtn.addEventListener("click", () => runSearch(els.cityInput.value));

els.cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") runSearch(els.cityInput.value);
});

els.clearBtn.addEventListener("click", () => {
  els.cityInput.value = "";
  els.cityInput.focus();
});

els.unitToggle.addEventListener("click", async () => {
  unit = (unit === "metric") ? "imperial" : "metric";
  setUnitUI();
  showToast(unit === "metric" ? "Santigrat (°C)" : "Fahrenheit (°F)");

  // Son aranan şehir varsa birimi doğru min/max vs için yeniden çek
  if (lastCity) {
    await runSearch(lastCity);
  }
});

// ilk UI
setUnitUI();

// demo: ekran görüntüsündeki gibi başlangıç
els.cityInput.value = "edirne";
runSearch("edirne");
