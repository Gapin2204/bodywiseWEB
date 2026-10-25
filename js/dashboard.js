const api = window.bodywiseApi;
const date = api.today();
const dateLabel = document.querySelector("#dashboardDate");
const greeting = document.querySelector("#dashboardGreeting");
const habitInputs = [...document.querySelectorAll(".habit input")];
const habitKeys = ["waterCompleted", "workoutCompleted", "foodLogged", "sleepCompleted"];
const weightCard = document.querySelector(".stats-grid .stat-card");
const calorieCard = document.querySelector(".stats-grid .stat-card:nth-child(2)");
const nutritionCard = document.querySelector(".dash-grid .dashboard-card:nth-child(2)");
const workoutCard = document.querySelector(".dash-grid .dashboard-card:nth-child(3)");
const targetCard = document.querySelector(".dash-grid .dashboard-card:last-child");

dateLabel.textContent = api.formatDate(date).toLocaleUpperCase("id-ID");
weightCard.querySelector("strong").textContent = "— kg";
weightCard.querySelector("small").textContent = "Belum ada catatan";
calorieCard.querySelector("strong").textContent = "— kkal";
calorieCard.querySelector("small").textContent = "Belum ada catatan";
nutritionCard.querySelector(".metric strong").textContent = "— kkal";
nutritionCard.querySelector(".metric .habit-progress i").style.width = "0%";
nutritionCard.querySelectorAll(".macro-labels span").forEach((item, index) => {
  item.textContent = ["Protein — g", "Karbo — g", "Lemak — g"][index];
});
workoutCard.querySelector(".exercise-list").replaceChildren();
targetCard.querySelectorAll(".reminder").forEach(item => item.remove());
targetCard.querySelector(".card-heading-row .eyebrow").textContent = "TUJUAN";
targetCard.querySelector(".card-heading-row h2").textContent = "Target aktif";

function showNoTarget(message) {
  const row = document.createElement("div");
  row.className = "reminder";
  const text = document.createElement("div");
  const title = document.createElement("b");
  title.textContent = message;
  text.append(title);
  row.append(text);
  targetCard.append(row);
}

function updateHabitSummary() {
  const count = habitInputs.filter(input => input.checked).length;
  const percentage = habitInputs.length ? Math.round(count / habitInputs.length * 100) : 0;
  const badge = habitInputs[0]?.closest(".dashboard-card")?.querySelector(".green-tag");
  const progress = document.querySelector(".circle-progress");
  if (badge) badge.textContent = `${count}/${habitInputs.length}`;
  if (progress) {
    progress.querySelector("strong").textContent = `${percentage}%`;
    progress.setAttribute("aria-label", `Progres harian ${percentage} persen`);
  }
}

habitInputs.forEach((input, index) => {
  input.addEventListener("change", async () => {
    const value = input.checked;
    input.closest(".habit").classList.toggle("done", value);
    input.closest(".habit").querySelector("i").textContent = value ? "✓" : "○";
    updateHabitSummary();
    try {
      await api.put(`/habits/${date}`, { [habitKeys[index]]: value });
    } catch (error) {
      input.checked = !value;
      input.closest(".habit").classList.toggle("done", !value);
      input.closest(".habit").querySelector("i").textContent = value ? "○" : "✓";
      updateHabitSummary();
      api.toast(error.message, "error");
    }
  });
});

async function loadDashboard() {
  try {
    const [{ dashboard }, { user }, sessions] = await Promise.all([
      api.get(`/dashboard?date=${encodeURIComponent(date)}`),
      api.get("/auth/me"),
      api.get(`/workout-sessions?date=${encodeURIComponent(date)}`)
    ]);
    const greetingName = user.name?.trim() || "teman";
    const hour = new Date().getHours();
    const salutation = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : hour < 18 ? "Selamat sore" : "Selamat malam";
    greeting.textContent = `${salutation}, ${greetingName}!`;

    const weight = dashboard.weight;
    weightCard.querySelector("strong").textContent = weight.latestKg === null ? "— kg" : `${weight.latestKg} kg`;
    weightCard.querySelector("small").textContent = weight.loggedOn ? `Catatan ${api.formatDate(weight.loggedOn, { day: "numeric", month: "short" })}` : "Belum ada catatan";

    const nutrition = dashboard.nutrition;
    const calories = Math.round(nutrition.calories).toLocaleString("id-ID");
    calorieCard.querySelector("strong").textContent = nutrition.entries ? `${calories} kkal` : "— kkal";
    calorieCard.querySelector("small").textContent = nutrition.entries ? "Asupan tercatat hari ini" : "Belum ada catatan";
    const target = nutrition.calorieTarget;
    const value = nutritionCard.querySelector(".metric strong");
    value.replaceChildren(document.createTextNode(nutrition.entries ? `${calories} ` : "— "));
    const targetText = document.createElement("small");
    targetText.textContent = target ? `/ ${Math.round(target).toLocaleString("id-ID")} kkal` : "kkal · target belum tersedia";
    value.append(targetText);
    const calorieProgress = target ? Math.min(100, nutrition.calories / target * 100) : 0;
    nutritionCard.querySelector(".metric .habit-progress i").style.width = `${calorieProgress}%`;
    nutritionCard.querySelectorAll(".macro-labels span").forEach((item, index) => {
      const labels = [`Protein ${Math.round(nutrition.proteinG)} g`, `Karbo ${Math.round(nutrition.carbsG)} g`, `Lemak ${Math.round(nutrition.fatG)} g`];
      item.textContent = nutrition.entries ? labels[index] : ["Protein — g", "Karbo — g", "Lemak — g"][index];
    });

    const habits = dashboard.habits;
    habitInputs.forEach((input, index) => {
      input.checked = Boolean(habits[["water_completed", "workout_completed", "food_logged", "sleep_completed"][index]]);
      input.closest(".habit").classList.toggle("done", input.checked);
      input.closest(".habit").querySelector("i").textContent = input.checked ? "✓" : "○";
    });
    updateHabitSummary();

    const list = workoutCard.querySelector(".exercise-list");
    list.replaceChildren();
    const completedSessions = sessions.workoutSessions.filter(session => session.status === "completed");
    if (completedSessions.length) {
      completedSessions.slice(0, 3).forEach((session, index) => {
        const row = document.createElement("div");
        const number = document.createElement("span");
        number.textContent = String(index + 1).padStart(2, "0");
        const name = document.createElement("b");
        name.textContent = session.name;
        const detail = document.createElement("small");
        detail.textContent = session.duration_minutes ? `${session.duration_minutes} menit` : "Sesi selesai";
        row.append(number, name, detail);
        list.append(row);
      });
      workoutCard.querySelector(".card-heading-row .tag").textContent = `${dashboard.workout.durationMinutes} menit`;
    } else {
      const empty = document.createElement("div");
      empty.className = "empty-workout";
      empty.textContent = "Belum ada sesi latihan hari ini.";
      list.append(empty);
      workoutCard.querySelector(".card-heading-row .tag").textContent = "Belum dicatat";
    }

    if (dashboard.activeGoal) {
      const goalNames = { lose: "Menurunkan berat badan", maintain: "Mempertahankan berat", gain: "Meningkatkan berat badan" };
      const row = document.createElement("div");
      row.className = "reminder";
      const content = document.createElement("div");
      const name = document.createElement("b");
      name.textContent = goalNames[dashboard.activeGoal.goal_type] || "Tujuan aktif";
      const detail = document.createElement("small");
      detail.textContent = `Target ${dashboard.activeGoal.target_weight_kg} kg · ${api.formatDate(dashboard.activeGoal.target_date, { day: "numeric", month: "short", year: "numeric" })}`;
      content.append(name, detail);
      row.append(content);
      targetCard.append(row);
    } else {
      showNoTarget("Belum ada target aktif");
    }
  } catch (error) {
    if (error.status !== 401) api.toast(error.message, "error");
    showNoTarget("Ringkasan belum dapat dimuat");
  }
}

loadDashboard();
