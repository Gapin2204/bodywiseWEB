const api = window.bodywiseApi;
const goalForm = document.getElementById("goalForm");
const goalSuccess = document.getElementById("goalSuccess");
const successSummary = document.getElementById("successSummary");
const targetInput = document.getElementById("targetWeight");
let latestAssessment = null;
let activeGoal = null;

document.querySelector(".goal-intro .eyebrow").textContent = "TUJUAN";
document.querySelector(".goal-intro h1").textContent = "Tentukan tujuanmu.";
document.querySelector(".goal-intro p").textContent = "Pilih arah dan target yang realistis untukmu. Tidak ada data contoh yang akan disimpan.";
targetInput.value = "";
targetInput.placeholder = "Masukkan target";

async function loadGoal() {
  try {
    const [{ profile }, { goals }] = await Promise.all([api.get("/profile"), api.get("/goals")]);
    latestAssessment = profile.latestAssessment;
    activeGoal = goals.find(goal => goal.status === "active") || null;
    if (activeGoal) {
      goalForm.querySelector(`input[name="goal"][value="${activeGoal.goal_type}"]`).checked = true;
      targetInput.value = activeGoal.target_weight_kg;
      const startDate = new Date(`${activeGoal.start_date}T00:00:00`);
      const targetDate = new Date(`${activeGoal.target_date}T00:00:00`);
      const weeks = Math.max(1, Math.round((targetDate - startDate) / (7 * 24 * 60 * 60 * 1000)));
      const option = [...goalForm.elements.goalDuration.options].find(item => Number(item.value) === weeks);
      if (option) option.selected = true;
    }
  } catch (error) {
    api.toast(error.message, "error");
  }
}

goalForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!goalForm.reportValidity()) return;
  const data = new FormData(goalForm);
  const startDate = api.today();
  const weeks = Number(data.get("goalDuration"));
  const end = new Date(`${startDate}T00:00:00`);
  end.setDate(end.getDate() + weeks * 7);
  const targetDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
  try {
    await api.post("/goals", {
      goalType: data.get("goal"),
      targetWeightKg: Number(data.get("targetWeight")),
      startWeightKg: latestAssessment ? Number(latestAssessment.weight_kg) : undefined,
      startDate,
      targetDate
    });
    const goalNames = { lose: "menurunkan berat badan", maintain: "mempertahankan berat", gain: "meningkatkan berat badan" };
    successSummary.textContent = `Fokusmu: ${goalNames[data.get("goal")]}, target ${Number(data.get("targetWeight"))} kg dalam ${weeks} minggu.`;
    goalSuccess.querySelector(".btn").href = "nutrition.html";
    goalSuccess.querySelector(".btn").textContent = "Lihat rekomendasi nutrisi →";
    goalSuccess.hidden = false;
    goalSuccess.querySelector("a").focus();
  } catch (error) {
    api.toast(error.message, "error");
  }
});

goalSuccess.addEventListener("click", event => {
  if (event.target === goalSuccess) goalSuccess.hidden = true;
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !goalSuccess.hidden) goalSuccess.hidden = true;
});
loadGoal();
