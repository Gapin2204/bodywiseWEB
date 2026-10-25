const api = window.bodywiseApi;
document.title = "BODYWISE — Progres";
const header = document.querySelector(".page-header");
const metrics = document.querySelectorAll(".app-grid-3 .metric");
const chart = document.querySelector(".chart-placeholder");
const dialog = document.createElement("dialog");
dialog.className = "nutrition-dialog";
dialog.innerHTML = `<form id="weightForm"><h2>Catat berat badan</h2><p>Catatan ini tersimpan pada akunmu.</p><label>Berat badan (kg)<input name="weightKg" type="number" min="30" max="300" step="0.1" required></label><label>Tanggal<input name="loggedOn" type="date" required></label><label>Catatan (opsional)<input name="notes" type="text" maxlength="255"></label><div class="dialog-actions"><button class="outline-btn" type="button" data-close>Batalkan</button><button class="btn" type="submit">Simpan catatan</button></div></form>`;
document.body.append(dialog);
const form = dialog.querySelector("#weightForm");
form.elements.loggedOn.value = api.today();

header.querySelector(".eyebrow").textContent = "PROGRES";
header.querySelector("h1").textContent = "Lihat perubahanmu.";
header.querySelector("p").textContent = "Amati tren dari catatan yang kamu simpan.";
header.querySelector(".btn").textContent = "+ Catat berat badan";
metrics[0].querySelector(".metric-label").textContent = "BERAT TERAKHIR";
metrics[1].querySelector(".metric-label").textContent = "PERUBAHAN";
metrics[2].querySelector(".metric-label").textContent = "KEBIASAAN HARI INI";
document.querySelectorAll(".app-grid-2 .section-card")[0].querySelector("h2").textContent = "Tren berat badan";
document.querySelectorAll(".app-grid-2 .section-card")[1].querySelector("h2").textContent = "Ukuran tubuh lainnya";
document.querySelectorAll(".app-grid-2 .section-card")[1].querySelector(".section-title p").textContent = "Pengukuran tambahan belum tersedia.";
document.querySelectorAll(".app-grid-2 .section-card:nth-child(2) .info-row b").forEach(item => { item.textContent = "—"; });
document.querySelector(".chart-legend span").textContent = "BERAT BADAN";
chart.replaceChildren();

function displayDate(value) {
  return api.formatDate(String(value).slice(0, 10), { day: "numeric", month: "short" });
}

function renderChart(entries) {
  chart.replaceChildren();
  const grid = document.createElement("div");
  grid.className = "chart-grid";
  chart.append(grid);
  if (entries.length < 2) {
    const empty = document.createElement("p");
    empty.className = "progress-empty-state";
    empty.textContent = entries.length ? "Tambahkan catatan berat lainnya untuk melihat tren." : "Belum ada catatan berat badan.";
    chart.append(empty);
    return;
  }
  const ordered = [...entries].reverse();
  const weights = ordered.map(item => Number(item.weight_kg));
  const low = Math.min(...weights);
  const range = Math.max(...weights) - low || 1;
  const points = weights.map((weight, index) => `${index / (weights.length - 1) * 420},${132 - (weight - low) / range * 104}`).join(" ");
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 420 150");
  svg.setAttribute("preserveAspectRatio", "none");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", points);
  line.setAttribute("fill", "none");
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "4");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("stroke-linejoin", "round");
  svg.append(line);
  chart.append(svg);
  const labels = document.createElement("div");
  labels.className = "progress-chart-labels";
  const first = document.createElement("span");
  first.textContent = displayDate(ordered[0].logged_on);
  const last = document.createElement("span");
  last.textContent = displayDate(ordered.at(-1).logged_on);
  labels.append(first, last);
  chart.append(labels);
}

async function loadProgress() {
  try {
    const [{ weightLogs }, summary, { dashboard }] = await Promise.all([
      api.get("/progress/weight?limit=200"),
      api.get(`/progress/summary?date=${encodeURIComponent(api.today())}`),
      api.get(`/dashboard?date=${encodeURIComponent(api.today())}`)
    ]);
    const latestMetric = metrics[0];
    latestMetric.querySelector("strong").textContent = summary.latest ? `${summary.latest.weightKg} kg` : "— kg";
    latestMetric.querySelector("small").textContent = summary.latest ? `Catatan terakhir · ${displayDate(summary.latest.loggedOn)}` : "Belum ada catatan";
    metrics[1].querySelector("strong").textContent = summary.changeKg === null ? "—" : `${summary.changeKg > 0 ? "+" : ""}${summary.changeKg} kg`;
    metrics[1].querySelector("small").textContent = summary.changeKg === null ? "Belum ada catatan sebelumnya" : `Dibandingkan dengan ${displayDate(summary.previous.loggedOn)}`;
    const done = dashboard.habits.completedCount;
    metrics[2].querySelector("strong").textContent = `${Math.round(done / dashboard.habits.total * 100)}%`;
    metrics[2].querySelector("small").textContent = `${done} kebiasaan selesai hari ini`;

    const legend = document.querySelector(".chart-legend strong");
    legend.textContent = weightLogs.length > 1
      ? `${weightLogs.at(-1).weight_kg} kg → ${weightLogs[0].weight_kg} kg`
      : "Belum cukup catatan untuk melihat tren";
    renderChart(weightLogs);

    const review = document.querySelector("main > .section-card:last-of-type");
    if (review) {
      const reviewMetrics = review.querySelectorAll(".metric");
      reviewMetrics[0].querySelector(".metric-label").textContent = "KEBIASAAN";
      reviewMetrics[0].querySelector("strong").textContent = `${done}/${dashboard.habits.total}`;
      reviewMetrics[0].querySelector("small").textContent = "Selesai hari ini";
      reviewMetrics[1].querySelector(".metric-label").textContent = "CATATAN";
      reviewMetrics[1].querySelector("strong").textContent = String(weightLogs.length);
      reviewMetrics[1].querySelector("small").textContent = "Pengukuran tersimpan";
      reviewMetrics[2].querySelector(".metric-label").textContent = "TREN";
      reviewMetrics[2].querySelector("strong").textContent = summary.changeKg === null ? "Menunggu" : "Tercatat";
      reviewMetrics[2].querySelector("small").textContent = "Perbandingan berdasarkan tanggal catatan";
    }
  } catch (error) {
    api.toast(error.message, "error");
  }
}

header.querySelector(".btn").addEventListener("click", () => {
  form.reset();
  form.elements.loggedOn.value = api.today();
  dialog.showModal();
});
dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  try {
    await api.post("/progress/weight", {
      weightKg: Number(data.get("weightKg")),
      loggedOn: data.get("loggedOn"),
      notes: String(data.get("notes") || "").trim() || undefined
    });
    dialog.close();
    api.toast("Catatan berat badan disimpan.");
    await loadProgress();
  } catch (error) {
    api.toast(error.message, "error");
  }
});

loadProgress();
