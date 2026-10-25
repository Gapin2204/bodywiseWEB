const api = window.bodywiseApi;
const mainCard = document.querySelector(".assessment-main");
const stats = document.querySelector(".assessment-stats");
const infoList = document.querySelector(".assessment-hero .info-list");
const energyList = document.querySelector(".app-grid-3 .section-card .info-list");
const goalOptions = document.querySelector(".goal-options");
let assessment = null;

document.title = "BODYWISE — Asesmen";
document.querySelector(".page-header .eyebrow").textContent = "ASESMEN TUBUH";
document.querySelector(".page-header h1").textContent = "Kenali kondisi tubuhmu.";
document.querySelector(".page-header p").textContent = "BMI, BMR, dan TDEE adalah estimasi, bukan diagnosis atau pengganti saran tenaga kesehatan.";
document.querySelector(".page-header .btn").textContent = "+ Catat asesmen";
mainCard.querySelector(".eyebrow").textContent = "PROFIL SAAT INI";
mainCard.querySelector("h2").textContent = "Pahami titik awal sebelum menentukan tujuan.";
document.querySelector(".assessment-hero .section-title h2").textContent = "Informasi tubuh";
document.querySelector(".assessment-hero .section-title p").textContent = "Asesmen terakhir";
document.querySelectorAll(".goal-option").forEach((option, index) => {
  const labels = [
    ["Turunkan berat badan", "Turunkan berat secara bertahap dan sehat."],
    ["Pertahankan berat", "Jaga kondisi tubuh tetap stabil."],
    ["Tingkatkan massa", "Bangun massa otot dan kekuatan tubuh."]
  ][index];
  option.querySelector("b").textContent = labels[0];
  option.querySelector("small").textContent = labels[1];
});
document.querySelectorAll(".app-grid-3 .section-title h2").forEach((heading, index) => {
  heading.textContent = ["Kebutuhan energi", "Status BMI", "Langkah berikutnya"][index];
});
document.querySelector(".app-grid-3 .muted").textContent = "Gunakan estimasi ini sebagai titik awal dan konsultasikan kebutuhan khusus dengan tenaga kesehatan.";
document.querySelector(".app-grid-3 .btn").textContent = "Buka program nutrisi →";
stats.replaceChildren();
infoList.replaceChildren();
energyList.replaceChildren();

function addStat(value, label) {
  const item = document.createElement("div");
  const strong = document.createElement("b");
  strong.textContent = value;
  const small = document.createElement("small");
  small.textContent = label;
  item.append(strong, small);
  stats.append(item);
}

function addInfo(list, label, value) {
  const row = document.createElement("div");
  row.className = "info-row";
  const key = document.createElement("span");
  key.textContent = label;
  const val = document.createElement("b");
  val.textContent = value;
  row.append(key, val);
  list.append(row);
}

function bmiStatus(bmi) {
  return bmi < 18.5 ? "Berat kurang" : bmi < 25 ? "Rentang normal" : bmi < 30 ? "Berat berlebih" : "Obesitas";
}

function renderAssessment(item) {
  assessment = item;
  if (!item) {
    mainCard.querySelector("h2").textContent = "Belum ada asesmen. Catat data tubuh untuk melihat estimasi.";
    mainCard.querySelector(".assessment-stats").textContent = "Data akan ditampilkan setelah asesmen tersimpan.";
    infoList.textContent = "Belum ada informasi tubuh.";
    energyList.textContent = "Belum tersedia";
    document.querySelector(".score strong").textContent = "—";
    document.querySelector(".score small").textContent = "Belum ada asesmen";
    return;
  }
  const bmi = Number(item.bmi);
  mainCard.querySelector("h2").textContent = "Estimasi kondisi tubuh berdasarkan asesmen terakhir.";
  stats.replaceChildren();
  addStat(bmi.toFixed(1), `BMI · ${bmiStatus(bmi)}`);
  addStat(item.bmr_kcal == null ? "—" : Math.round(item.bmr_kcal).toLocaleString("id-ID"), "BMR · kkal/hari");
  addStat(item.tdee_kcal == null ? "—" : Math.round(item.tdee_kcal).toLocaleString("id-ID"), "TDEE · kkal/hari");
  infoList.replaceChildren();
  addInfo(infoList, "Usia", `${item.age_years} tahun`);
  addInfo(infoList, "Jenis kelamin", item.sex === "male" ? "Pria" : item.sex === "female" ? "Wanita" : "Tidak disebutkan");
  addInfo(infoList, "Tinggi badan", `${item.height_cm} cm`);
  addInfo(infoList, "Berat badan", `${item.weight_kg} kg`);
  addInfo(infoList, "Aktivitas", item.activity_level.replace("_", " "));
  energyList.replaceChildren();
  addInfo(energyList, "BMR", item.bmr_kcal == null ? "Tidak tersedia" : `${Math.round(item.bmr_kcal).toLocaleString("id-ID")} kkal`);
  addInfo(energyList, "TDEE", item.tdee_kcal == null ? "Tidak tersedia" : `${Math.round(item.tdee_kcal).toLocaleString("id-ID")} kkal`);
  addInfo(energyList, "Rumus", "Mifflin–St Jeor");
  document.querySelector(".score strong").textContent = bmi.toFixed(1);
  document.querySelector(".score small").textContent = bmiStatus(bmi);
}

function openEditor() {
  const panel = document.createElement("div");
  panel.className = "edit-panel";
  const existing = assessment || {};
  panel.innerHTML = `<form><div class="modal-head"><div><h2>Catat asesmen</h2><p>Perkiraan energi bukan diagnosis atau pengganti saran tenaga kesehatan.</p></div><button type="button" class="close-modal" aria-label="Tutup">×</button></div><div class="edit-grid"><label>Usia<input name="ageYears" type="number" min="13" max="100" value="${existing.age_years || ""}" required></label><label>Jenis kelamin untuk rumus<select name="sex" required><option value="">Pilih</option><option value="male">Pria</option><option value="female">Wanita</option><option value="other">Lainnya</option><option value="prefer_not_to_say">Tidak ingin menyebutkan</option></select></label><label>Tinggi badan (cm)<input name="heightCm" type="number" min="100" max="250" step="0.1" value="${existing.height_cm || ""}" required></label><label>Berat badan (kg)<input name="weightKg" type="number" min="30" max="300" step="0.1" value="${existing.weight_kg || ""}" required></label><label>Tingkat aktivitas<select name="activityLevel" required><option value="">Pilih</option><option value="sedentary">Minim bergerak</option><option value="light">Sedikit aktif</option><option value="moderate">Cukup aktif</option><option value="very_active">Sangat aktif</option></select></label></div><div class="form-actions"><button type="button" class="outline-btn">Batal</button><button class="btn" type="submit">Simpan asesmen</button></div></form>`;
  const form = panel.querySelector("form");
  if (existing.sex) form.elements.sex.value = existing.sex;
  if (existing.activity_level) form.elements.activityLevel.value = existing.activity_level;
  const close = () => panel.remove();
  panel.querySelector(".outline-btn").addEventListener("click", close);
  panel.querySelector(".close-modal").addEventListener("click", close);
  panel.addEventListener("click", event => { if (event.target === panel) close(); });
  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    try {
      await api.post("/assessments", {
        ageYears: Number(data.get("ageYears")),
        sex: data.get("sex"),
        heightCm: Number(data.get("heightCm")),
        weightKg: Number(data.get("weightKg")),
        activityLevel: data.get("activityLevel")
      });
      window.location.assign("goal.html");
    } catch (error) {
      api.toast(error.message, "error");
    }
  });
  document.body.append(panel);
  form.elements.ageYears.focus();
}

async function loadAssessment() {
  try {
    const { assessments } = await api.get("/assessments?limit=1");
    renderAssessment(assessments[0] || null);
  } catch (error) {
    api.toast(error.message, "error");
  }
}

document.querySelector(".page-header .btn").addEventListener("click", openEditor);
const goalLink = document.createElement("a");
goalLink.className = "btn";
goalLink.href = "goal.html";
goalLink.textContent = "Lanjut atur tujuan →";
goalOptions.after(goalLink);
loadAssessment();
