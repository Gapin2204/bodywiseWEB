const api = window.bodywiseApi;
document.title = "BODYWISE — Nutrisi";
const date = api.today();
const header = document.querySelector(".page-header");
const section = document.querySelector(".app-grid-2 .section-card:first-child");
const metricCards = [...document.querySelectorAll(".app-grid-3 .metric")];
const targetCard = document.createElement("section");
targetCard.className = "nutrition-target-card";
targetCard.innerHTML = `<div><span class="eyebrow">TARGET HARIAN</span><strong>Memuat estimasi…</strong><p>Target kalori adalah perkiraan awal berdasarkan asesmen dan tujuan.</p></div><a class="outline-btn" href="assessment.html">Lengkapi asesmen</a>`;
header.after(targetCard);
const mealRecommendations = document.createElement("section");
mealRecommendations.className = "section-card nutrition-recommendations";
mealRecommendations.innerHTML = `<div class="section-title"><div><span class="eyebrow">PILIHAN MAKANAN</span><h2>Ide menu dari katalog</h2><p>3 kali makan + 1 camilan · pilih item yang sesuai, bukan seluruh daftar.</p></div></div><div class="meal-plan-grid" role="status">Memuat pilihan makanan…</div><p class="nutrition-recommendation-note"></p>`;
targetCard.after(mealRecommendations);

header.querySelector(".eyebrow").textContent = "NUTRISI";
header.querySelector("h1").textContent = "Nutrisi seimbang.";
header.querySelector("p").textContent = "Pilih makanan dan porsinya untuk menghitung kalori serta makronutrien otomatis.";
header.querySelector(".btn").textContent = "+ Tambah makanan";
const dateInput = document.createElement("input");
dateInput.type = "date";
dateInput.id = "nutritionDate";
dateInput.value = date;
dateInput.setAttribute("aria-label", "Pilih tanggal catatan makanan");
dateInput.style.cssText = "border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;color:inherit";
header.append(dateInput);

document.querySelectorAll(".app-grid-3 .metric-label").forEach((label, index) => {
  label.textContent = ["KALORI", "PROTEIN", "AIR"][index];
});
metricCards[0].querySelector("strong").textContent = "— kkal";
metricCards[0].querySelector("small:last-child").textContent = "Belum ada catatan";
metricCards[1].querySelector("strong").textContent = "— g";
metricCards[1].querySelector("small:last-child").textContent = "Belum ada catatan";
metricCards[2].querySelector("strong").textContent = "—";
metricCards[2].querySelector("small:last-child").textContent = "Pencatatan air belum tersedia";
section.querySelector(".section-title h2").textContent = "Makan hari ini";
section.querySelector(".section-title p").textContent = api.formatDate(date);
section.querySelectorAll(".food-log").forEach(row => row.remove());
section.querySelectorAll(".food-empty").forEach(row => row.remove());
document.querySelectorAll(".app-grid-2 .section-title")[1].querySelector("h2").textContent = "Makronutrien";
document.querySelectorAll(".app-grid-2 .section-title")[1].querySelector("p").textContent = "Total dari catatan makanan tanggal terpilih.";
document.querySelectorAll(".macro-labels span").forEach((label, index) => {
  label.textContent = [`Protein — g`, `Karbohidrat — g`, `Lemak — g`][index];
});
const macroBars = document.querySelector(".macro-bars");
const fiberBar = document.createElement("div");
fiberBar.className = "macro-bar fiber";
fiberBar.innerHTML = "<i style=\"width:0%\"></i>";
macroBars.append(fiberBar);
const fiberLabel = document.createElement("span");
fiberLabel.textContent = "Serat — g";
document.querySelector(".macro-labels").append(fiberLabel);
const foodLog = document.createElement("div");
foodLog.className = "food-log-list";
section.append(foodLog);

const dialog = document.createElement("dialog");
dialog.className = "nutrition-dialog";
dialog.innerHTML = `
  <form id="foodForm">
    <h2>Tambah makanan</h2>
    <p>Pilih makanan yang cocok. Nilai katalog adalah perkiraan umum dan dapat berbeda menurut merek serta cara memasak.</p>
    <label>Cari makanan<input name="search" type="search" maxlength="80" placeholder="Contoh: nasi, telor, dada ayam"></label>
    <label>Hasil katalog<select name="foodId"><option value="">Pilih makanan atau masukkan nilai manual</option></select></label>
    <p class="nutrition-source" role="status">Pilih makanan dari katalog agar nilai gizi terisi otomatis.</p>
    <label>Nama makanan<input name="foodName" type="text" maxlength="120" required></label>
    <label>Waktu makan<select name="mealType"><option value="breakfast">Sarapan</option><option value="lunch">Makan siang</option><option value="snack">Camilan</option><option value="dinner">Makan malam</option><option value="other">Lainnya</option></select></label>
    <label>Jumlah<input name="quantity" type="number" min="1" max="5000" step="0.1" value="100" required></label>
    <label>Satuan<select name="quantityUnit"><option value="gram">Gram</option></select></label>
    <fieldset class="nutrition-fields"><legend>Nilai per 100 gram</legend>
      <label>Kalori (kkal)<input name="caloriesPer100g" type="number" min="0" max="1000" step="0.1" required></label>
      <label>Protein (g)<input name="proteinGPer100g" type="number" min="0" max="100" step="0.1" required></label>
      <label>Karbohidrat (g)<input name="carbsGPer100g" type="number" min="0" max="100" step="0.1" required></label>
      <label>Lemak (g)<input name="fatGPer100g" type="number" min="0" max="100" step="0.1" required></label>
      <label>Serat (g, opsional)<input name="fiberGPer100g" type="number" min="0" max="100" step="0.1"></label>
    </fieldset>
    <output class="nutrition-preview" aria-live="polite">Pilih makanan dan jumlah untuk melihat perkiraan nutrisi.</output>
    <div class="dialog-actions"><button class="outline-btn" type="button" data-close>Batalkan</button><button class="btn" type="submit">Simpan</button></div>
  </form>`;
document.body.append(dialog);
const form = dialog.querySelector("#foodForm");
let catalog = [];

function setManualMode(manual) {
  for (const field of ["foodName", "caloriesPer100g", "proteinGPer100g", "carbsGPer100g", "fatGPer100g", "fiberGPer100g"]) {
    form.elements[field].readOnly = !manual;
    form.elements[field].required = manual && field !== "fiberGPer100g";
  }
  form.elements.search.disabled = false;
  dialog.querySelector(".nutrition-fields").hidden = !manual;
}

function getQuantityGrams() {
  const quantity = Number(form.elements.quantity.value);
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  const selected = catalog.find(food => String(food.id) === form.elements.foodId.value);
  return Number((quantity * (form.elements.quantityUnit.value === "portion" ? Number(selected?.serving_grams || 0) : 1)).toFixed(2));
}

function updatePreview() {
  const preview = dialog.querySelector(".nutrition-preview");
  const grams = getQuantityGrams();
  const values = ["caloriesPer100g", "proteinGPer100g", "carbsGPer100g", "fatGPer100g"]
    .map(field => Number(form.elements[field].value));
  const fields = ["caloriesPer100g", "proteinGPer100g", "carbsGPer100g", "fatGPer100g"];
  if (!grams || values.some((value, index) => form.elements[fields[index]].value === "" || !Number.isFinite(value))) {
    preview.textContent = "Pilih makanan dan jumlah untuk melihat perkiraan nutrisi.";
    return;
  }
  const [calories, protein, carbs, fat] = values.map(value => (value * grams / 100).toFixed(1));
  const fiber = (Number(form.elements.fiberGPer100g.value || 0) * grams / 100).toFixed(1);
  preview.textContent = `Perkiraan untuk ${grams} g: ${calories} kkal · Protein ${protein} g · Karbohidrat ${carbs} g · Lemak ${fat} g · Serat ${fiber} g`;
}

function selectFood(selected) {
  const source = dialog.querySelector(".nutrition-source");
  if (!selected) {
    setManualMode(true);
    form.elements.foodName.value = form.elements.search.value.trim();
    form.elements.quantityUnit.replaceChildren(new Option("Gram", "gram"));
    source.textContent = "Makanan belum dipilih dari katalog. Masukkan nilai gizi dari label atau sumber tepercaya.";
    updatePreview();
    return;
  }
  setManualMode(false);
  form.elements.foodName.value = selected.name;
  form.elements.caloriesPer100g.value = selected.calories_per_100g;
  form.elements.proteinGPer100g.value = selected.protein_g_per_100g;
  form.elements.carbsGPer100g.value = selected.carbs_g_per_100g;
  form.elements.fatGPer100g.value = selected.fat_g_per_100g;
  form.elements.fiberGPer100g.value = selected.fiber_g_per_100g || 0;
  const unit = form.elements.quantityUnit;
  unit.replaceChildren(new Option("Gram", "gram"));
  if (Number(selected.serving_grams) > 0 && selected.serving_name) {
    unit.add(new Option(selected.serving_name, "portion"));
  }
  source.textContent = selected.nutrition_verified
    ? `Nilai katalog terverifikasi${selected.source_note ? ` · ${selected.source_note}` : ""}`
    : `Nilai perkiraan${selected.source_note ? ` · ${selected.source_note}` : ""}`;
  updatePreview();
}

function renderEntries(items) {
  foodLog.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "food-empty";
    empty.textContent = "Belum ada makanan yang dicatat pada tanggal ini.";
    foodLog.append(empty);
    return;
  }
  const icons = { breakfast: "☀", lunch: "◉", snack: "◇", dinner: "○", other: "◒" };
  for (const item of items) {
    const row = document.createElement("div");
    row.className = "food-log";
    const icon = document.createElement("span");
    icon.className = "food-icon";
    icon.textContent = icons[item.meal_type] || "◉";
    const description = document.createElement("div");
    const name = document.createElement("b");
    name.textContent = item.food_name;
    const details = document.createElement("small");
    details.textContent = `${item.quantity_g} g · P ${item.protein_g} g · K ${item.carbs_g} g · L ${item.fat_g} g · Serat ${item.fiber_g || 0} g`;
    description.append(name, details);
    const calories = document.createElement("span");
    calories.className = "food-cal";
    calories.textContent = `${Math.round(item.calories).toLocaleString("id-ID")} kkal`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "food-delete";
    remove.dataset.id = item.id;
    remove.setAttribute("aria-label", `Hapus catatan ${item.food_name}`);
    remove.textContent = "×";
    row.append(icon, description, calories, remove);
    foodLog.append(row);
  }
}

function renderRecommendations(data) {
  const grid = mealRecommendations.querySelector(".meal-plan-grid");
  grid.replaceChildren();
  for (const meal of data.meals) {
    const card = document.createElement("article");
    card.className = "meal-plan-card";
    const heading = document.createElement("h3");
    heading.textContent = meal.label;
    card.append(heading);
    for (const group of meal.groups) {
      const groupHeading = document.createElement("h4");
      groupHeading.textContent = group.label;
      card.append(groupHeading);
      if (!group.foods.length) {
        const empty = document.createElement("small");
        empty.textContent = "Belum ada pilihan yang memenuhi filter di kategori ini.";
        card.append(empty);
        continue;
      }
      for (const food of group.foods) {
        const option = document.createElement("div");
        option.className = "meal-food-option";
        const details = document.createElement("div");
        const name = document.createElement("b");
        name.textContent = food.name;
        const nutrition = document.createElement("small");
        nutrition.textContent = `${food.category} · ${Math.round(food.calories_per_100g)} kkal · lemak ${Number(food.fat_g_per_100g).toFixed(1)} g / 100 g`;
        const serving = document.createElement("small");
        serving.textContent = `Porsi katalog: ${food.serving_name || "100 g"}${food.nutrition_verified ? "" : " · perkiraan"}`;
        details.append(name, nutrition, serving);
        const add = document.createElement("button");
        add.type = "button";
        add.className = "outline-btn meal-food-add";
        add.dataset.foodId = food.id;
        add.dataset.mealType = meal.mealType;
        add.dataset.quantityG = Number(food.serving_grams) > 0 ? food.serving_grams : 100;
        add.textContent = "Catat porsi";
        option.append(details, add);
        card.append(option);
      }
    }
    grid.append(card);
  }
  mealRecommendations.querySelector(".nutrition-recommendation-note").textContent = data.selectionNote;
}

async function loadFoods(search = "") {
  const requestId = ++loadFoods.requestId;
  const result = await api.get(`/foods?search=${encodeURIComponent(search)}`);
  if (requestId !== loadFoods.requestId) return;
  catalog = result.foods;
  const select = form.elements.foodId;
  select.replaceChildren(new Option("Pilih makanan atau masukkan nilai manual", ""));
  catalog.forEach(food => {
    const category = food.category ? ` · ${food.category}` : "";
    const portion = food.serving_name ? ` · ${food.serving_name}` : "";
    select.add(new Option(`${food.name}${category}${portion}${food.nutrition_verified ? "" : " · perkiraan"}`, food.id));
  });
  const exact = catalog.find(food => food.name.toLocaleLowerCase("id") === search.toLocaleLowerCase("id"));
  if (exact) {
    select.value = String(exact.id);
    selectFood(exact);
  } else if (catalog.length === 1 && search) {
    select.value = String(catalog[0].id);
    selectFood(catalog[0]);
  }
}

async function loadLogs() {
  const selectedDate = dateInput.value || api.today();
  section.querySelector(".section-title p").textContent = api.formatDate(selectedDate);
  try {
    const [foodData, dashboardData, recommendationData] = await Promise.all([
      api.get(`/food-logs?date=${encodeURIComponent(selectedDate)}`),
      api.get(`/dashboard?date=${encodeURIComponent(selectedDate)}`).catch(error => {
        api.toast(error.message, "error");
        return null;
      }),
      api.get(`/nutrition-recommendations?date=${encodeURIComponent(selectedDate)}`).catch(error => {
        mealRecommendations.querySelector(".meal-plan-grid").textContent = error.message;
        api.toast(error.message, "error");
        return null;
      })
    ]);
    const { foodLogs } = foodData;
    const nutrition = dashboardData?.dashboard?.nutrition;
    if (recommendationData) renderRecommendations(recommendationData.recommendations);
    const target = nutrition?.calorieTarget;
    if (target == null) {
      targetCard.querySelector("strong").textContent = "Asesmen diperlukan";
      targetCard.querySelector("p").textContent = "Catat asesmen dan tujuan untuk melihat estimasi target kalori harian.";
      targetCard.querySelector("a").hidden = false;
    } else {
      targetCard.querySelector("strong").textContent = `${Math.round(target).toLocaleString("id-ID")} kkal`;
      targetCard.querySelector("p").textContent = `${nutrition.calorieTargetNote} BMR/TDEE dan target bukan diagnosis atau saran medis.`;
      targetCard.querySelector("a").hidden = true;
    }
    renderEntries(foodLogs);
    const totals = foodLogs.reduce((result, item) => ({
      calories: result.calories + Number(item.calories),
      protein: result.protein + Number(item.protein_g),
      carbs: result.carbs + Number(item.carbs_g),
      fat: result.fat + Number(item.fat_g),
      fiber: result.fiber + Number(item.fiber_g || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    metricCards[0].querySelector("strong").textContent = foodLogs.length ? `${Math.round(totals.calories).toLocaleString("id-ID")} kkal` : "— kkal";
    metricCards[0].querySelector("small:last-child").textContent = foodLogs.length
      ? `${foodLogs.length} catatan · target ${target == null ? "belum tersedia" : `${Math.round(target).toLocaleString("id-ID")} kkal`}`
      : target == null ? "Belum ada catatan" : `Target ${Math.round(target).toLocaleString("id-ID")} kkal`;
    metricCards[1].querySelector("strong").textContent = foodLogs.length ? `${totals.protein.toFixed(1)} g` : "— g";
    metricCards[1].querySelector("small:last-child").textContent = foodLogs.length ? "Total protein tercatat" : "Belum ada catatan";
    document.querySelectorAll(".macro-labels span").forEach((label, index) => {
      label.textContent = [
        `Protein ${totals.protein.toFixed(1)} g`,
        `Karbohidrat ${totals.carbs.toFixed(1)} g`,
        `Lemak ${totals.fat.toFixed(1)} g`,
        `Serat ${totals.fiber.toFixed(1)} g`
      ][index];
    });
    const total = totals.protein + totals.carbs + totals.fat + totals.fiber;
    document.querySelectorAll(".macro-bar i").forEach((bar, index) => {
      const grams = [totals.protein, totals.carbs, totals.fat, totals.fiber][index];
      bar.style.width = total ? `${grams / total * 100}%` : "0%";
    });
  } catch (error) {
    renderEntries([]);
    api.toast(error.message, "error");
  }
}

function openDialog() {
  form.reset();
  form.elements.quantity.value = "100";
  form.elements.foodId.replaceChildren(new Option("Pilih makanan atau masukkan nilai manual", ""));
  form.elements.foodName.value = "";
  setManualMode(false);
  dialog.querySelector(".nutrition-source").textContent = "Pilih makanan dari katalog agar nilai gizi terisi otomatis.";
  form.elements.quantityUnit.replaceChildren(new Option("Gram", "gram"));
  updatePreview();
  loadFoods().catch(error => api.toast(error.message, "error"));
  dialog.showModal();
}

header.querySelector(".btn").addEventListener("click", openDialog);
document.querySelector(".metric.yellow-metric .btn")?.addEventListener("click", openDialog);
dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
form.elements.search.addEventListener("input", event => {
  form.elements.foodId.value = "";
  form.elements.quantity.value = "100";
  for (const field of ["caloriesPer100g", "proteinGPer100g", "carbsGPer100g", "fatGPer100g", "fiberGPer100g"]) {
    form.elements[field].value = "";
  }
  selectFood(null);
  loadFoods(event.target.value.trim()).catch(error => api.toast(error.message, "error"));
});
loadFoods.requestId = 0;
form.elements.foodId.addEventListener("change", () => {
  const selected = catalog.find(food => String(food.id) === form.elements.foodId.value);
  selectFood(selected);
});
form.elements.quantity.addEventListener("input", updatePreview);
form.elements.quantityUnit.addEventListener("change", () => {
  if (form.elements.quantityUnit.value === "portion") form.elements.quantity.value = "1";
  updatePreview();
});
for (const field of ["caloriesPer100g", "proteinGPer100g", "carbsGPer100g", "fatGPer100g", "fiberGPer100g"]) {
  form.elements[field].addEventListener("input", updatePreview);
}
foodLog.addEventListener("click", async event => {
  const button = event.target.closest(".food-delete");
  if (!button) return;
  try {
    await api.delete(`/food-logs/${button.dataset.id}`);
    api.toast("Catatan makanan dihapus.");
    await loadLogs();
  } catch (error) {
    api.toast(error.message, "error");
  }
});
mealRecommendations.addEventListener("click", async event => {
  const button = event.target.closest(".meal-food-add");
  if (!button) return;
  try {
    await api.post("/food-logs", {
      foodId: Number(button.dataset.foodId),
      mealType: button.dataset.mealType,
      quantityG: Number(button.dataset.quantityG)
    });
    api.toast("Porsi rekomendasi dicatat.");
    await loadLogs();
  } catch (error) {
    api.toast(error.message, "error");
  }
});
dateInput.addEventListener("change", loadLogs);
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const foodId = String(data.get("foodId") || "");
  const quantityG = getQuantityGrams();
  if (quantityG < 1 || quantityG > 5000) {
    api.toast("Jumlah makanan harus setara dengan 1–5.000 gram.", "error");
    return;
  }
  const payload = {
    foodName: String(data.get("foodName")).trim(),
    mealType: data.get("mealType"),
    quantityG
  };
  if (foodId) payload.foodId = Number(foodId);
  else {
    payload.caloriesPer100g = Number(data.get("caloriesPer100g"));
    payload.proteinGPer100g = Number(data.get("proteinGPer100g"));
    payload.carbsGPer100g = Number(data.get("carbsGPer100g"));
    payload.fatGPer100g = Number(data.get("fatGPer100g"));
    payload.fiberGPer100g = Number(data.get("fiberGPer100g") || 0);
  }
  try {
    await api.post("/food-logs", payload);
    dialog.close();
    api.toast("Catatan makanan disimpan.");
    await loadLogs();
  } catch (error) {
    api.toast(error.message, "error");
  }
});

loadLogs();
