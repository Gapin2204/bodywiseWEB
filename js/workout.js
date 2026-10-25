const api = window.bodywiseApi;
document.title = "BODYWISE — Latihan";
const header = document.querySelector(".page-header");
const workoutList = document.querySelector(".workout-list");
const card = document.querySelector(".section-card");
const metrics = document.querySelectorAll(".app-grid-3 .metric");
const weekdays = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const today = api.today();
const todayDate = new Date(`${today}T00:00:00`);
const mondayOffset = (todayDate.getDay() + 6) % 7;
const weekStart = new Date(todayDate);
weekStart.setDate(weekStart.getDate() - mondayOffset);
const days = weekdays.map((label, index) => {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + index);
  const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { label, date: value };
});
let selectedDate = today;
let exercises = [];
let programData = null;
let programRequestId = 0;

header.querySelector(".eyebrow").textContent = "WORKOUT";
header.querySelector("h1").textContent = "Bergerak dengan tujuan.";
header.querySelector("p").textContent = "Catat sesi latihan dan metrik yang sesuai dengan setiap gerakan.";
header.querySelector(".btn").textContent = "+ Catat latihan";
document.querySelector(".section-title .eyebrow").textContent = "CATATAN MINGGU INI";
document.querySelector(".section-title h2").textContent = "Pilih tanggal";
document.querySelector(".section-title p").textContent = "Sesi yang tersimpan pada akunmu.";
document.querySelector(".tag.green-tag").textContent = "Dari katalog latihan";
metrics[0].querySelector(".metric-label").textContent = "SESI MINGGU INI";
metrics[0].querySelector("small").textContent = "Sesi selesai tercatat";
metrics[1].querySelector(".metric-label").textContent = "DURASI MINGGU INI";
metrics[1].querySelector("small").textContent = "Durasi tercatat";
metrics[2].querySelector(".metric-label").textContent = "HARI AKTIF";
metrics[2].querySelector("small").textContent = "Hari dengan sesi selesai";

const tabs = document.createElement("div");
tabs.className = "day-tabs";
days.forEach(day => {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "day-tab";
  button.dataset.date = day.date;
  button.textContent = day.label;
  button.setAttribute("aria-label", api.formatDate(day.date));
  tabs.append(button);
});
card.prepend(tabs);

const programSection = document.createElement("section");
programSection.className = "section-card workout-program-card";
programSection.innerHTML = `
  <div class="section-title">
    <div><span class="eyebrow">PROGRAM 4 MINGGU</span><h2>Rencana latihan mingguan</h2><p></p></div>
    <label class="workout-location">Lokasi latihan
      <select aria-label="Pilih lokasi latihan"><option value="rumah">Rumah</option><option value="gym">Gym</option></select>
    </label>
  </div>
  <div class="workout-program-context" role="status">Memuat program latihan…</div>
  <div class="workout-week-grid"></div>
  <article class="workout-program-detail"></article>
  <p class="workout-safety"></p>`;
header.after(programSection);
const locationSelect = programSection.querySelector(".workout-location select");
const programContext = programSection.querySelector(".workout-program-context");
const weekGrid = programSection.querySelector(".workout-week-grid");
const programDetail = programSection.querySelector(".workout-program-detail");

const dialog = document.createElement("dialog");
dialog.className = "nutrition-dialog workout-entry-dialog";
dialog.innerHTML = `
  <form id="workoutForm">
    <h2>Catat sesi latihan</h2>
    <p>Gunakan repetisi/beban untuk latihan kekuatan atau durasi/jarak untuk kardio.</p>
    <label>Nama sesi<input name="name" maxlength="120" required></label>
    <label>Tanggal dan waktu<input name="startedAt" type="datetime-local" required></label>
    <label>Durasi keseluruhan (menit)<input name="durationMinutes" type="number" min="1" max="1440"></label>
    <label>Latihan<select name="exerciseId" required><option value="">Pilih latihan</option></select></label>
    <label>Jumlah set<input name="setCount" type="number" min="1" max="50" value="3"></label>
    <div class="workout-strength-fields">
      <label>Repetisi per set<input name="reps" type="number" min="1" max="1000"></label>
      <label>Beban (kg)<input name="weightKg" type="number" min="0" max="2000" step="0.1"></label>
    </div>
    <div class="workout-cardio-fields">
      <label>Durasi aktivitas (detik)<input name="durationSeconds" type="number" min="1" max="86400"></label>
      <label>Jarak (meter)<input name="distanceM" type="number" min="0" max="1000000" step="0.1"></label>
    </div>
    <label>Catatan<input name="notes" maxlength="255"></label>
    <div class="dialog-actions"><button class="outline-btn" type="button" data-close>Batalkan</button><button class="btn" type="submit">Simpan latihan</button></div>
  </form>`;
document.body.append(dialog);
const form = dialog.querySelector("#workoutForm");
const strengthFields = dialog.querySelector(".workout-strength-fields");
const cardioFields = dialog.querySelector(".workout-cardio-fields");

function buildTimestamp(date) {
  const now = new Date();
  const suffix = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return `${date}T${suffix}`;
}

function addProgramList(container, title, items, format) {
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = `${title} (${items.length})`;
  const list = document.createElement("ul");
  for (const item of items) {
    const row = document.createElement("li");
    row.textContent = format(item);
    list.append(row);
  }
  details.append(summary, list);
  container.append(details);
}

function renderProgram(data, requestId) {
  programData = data;
  locationSelect.value = data.preference.location;
  const goalNames = { lose: "menurunkan berat", maintain: "mempertahankan berat", gain: "meningkatkan berat" };
  const activeGoal = data.activeGoal
    ? `Tujuan aktif: ${goalNames[data.activeGoal.goal_type] || data.activeGoal.goal_type}.`
    : "Atur tujuan pada halaman asesmen untuk melihat target nutrisi yang disesuaikan.";
  programSection.querySelector(".section-title p").textContent =
    `${data.program.name} · ${data.program.level} · ${data.program.frequency}`;
  programContext.textContent = `Minggu ${data.weekNumber} — ${data.progression?.focus || "Adaptasi dan teknik"}. ${data.progression?.guidance || ""} ${activeGoal}`;
  weekGrid.replaceChildren();
  for (const day of data.days) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workout-week-day";
    button.dataset.dayNumber = day.day_number;
    const name = document.createElement("b");
    name.textContent = day.day_name;
    const focus = document.createElement("span");
    focus.textContent = day.focus;
    const duration = document.createElement("small");
    duration.textContent = Number(day.duration_max) === 0
      ? "Istirahat"
      : `${day.duration_min}–${day.duration_max} menit`;
    button.append(name, focus, duration);
    if (Number(day.day_number) === Number(data.selectedDay?.day_number)) button.classList.add("active");
    weekGrid.append(button);
  }

  programDetail.replaceChildren();
  const heading = document.createElement("h3");
  const day = data.selectedDay;
  if (!day) {
    heading.textContent = "Jadwal untuk tanggal ini tidak tersedia.";
    programDetail.append(heading);
    return;
  }
  heading.textContent = `${day.day_name}: ${day.focus}`;
  const note = document.createElement("p");
  note.textContent = day.notes || (day.is_rest ? "Hari istirahat." : "");
  programDetail.append(heading, note);
  if (day.is_rest) {
    const rest = document.createElement("p");
    rest.textContent = "Istirahat total sesuai jadwal program.";
    programDetail.append(rest);
  } else {
    const list = document.createElement("ol");
    for (const movement of day.movements) {
      const item = document.createElement("li");
      const detail = document.createElement("div");
      const name = document.createElement("b");
      name.textContent = movement.exercise_name;
      const prescription = document.createElement("small");
      prescription.textContent = `${movement.sets} set · ${movement.reps} ${movement.rep_unit} · istirahat ${movement.rest_seconds} dtk${movement.equipment ? ` · ${movement.equipment}` : ""}`;
      const tip = document.createElement("p");
      tip.textContent = movement.tips;
      detail.append(name, prescription, tip);
      const record = document.createElement("button");
      record.type = "button";
      record.className = "outline-btn workout-record-movement";
      record.dataset.exerciseId = movement.exercise_id;
      record.textContent = "Catat";
      item.append(detail, record);
      list.append(item);
    }
    programDetail.append(list);
  }

  addProgramList(programDetail, "Pemanasan", data.warmups.pemanasan, item => `${item.name} · ${item.duration}`);
  addProgramList(programDetail, "Pendinginan", data.warmups.pendinginan, item => `${item.name} · ${item.duration}`);
  const safety = programSection.querySelector(".workout-safety");
  safety.textContent = data.program.safety_notes;
  api.get(`/dashboard?date=${encodeURIComponent(data.date)}`).then(({ dashboard }) => {
    if (requestId !== programRequestId || selectedDate !== data.date) return;
    const nutrition = dashboard.nutrition;
    const consumed = Math.round(nutrition.calories).toLocaleString("id-ID");
    const target = nutrition.calorieTarget == null
      ? "target kalori belum tersedia"
      : `target ${Math.round(nutrition.calorieTarget).toLocaleString("id-ID")} kkal`;
    const context = document.createElement("span");
    context.textContent = `Asupan tercatat hari ini: ${consumed} kkal · ${target}. Jadwal latihan tetap mengikuti program dan tidak diubah untuk mengompensasi makanan.`;
    programContext.append(document.createElement("br"), context);
  }).catch(error => api.toast(error.message, "error"));
}

async function loadProgram(date) {
  const requestId = ++programRequestId;
  try {
    const data = await api.get(`/workout-program?date=${encodeURIComponent(date)}`);
    if (requestId !== programRequestId) return;
    renderProgram(data, requestId);
  } catch (error) {
    if (requestId !== programRequestId) return;
    programData = null;
    programContext.textContent = error.message;
    programDetail.replaceChildren();
    api.toast(error.message, "error");
  }
}

async function loadCatalog() {
  const { exercises: items } = await api.get("/exercises?limit=100");
  exercises = items;
  const select = form.elements.exerciseId;
  items.forEach(item => select.add(new Option(`${item.name} · ${item.category}`, item.id)));
}

function updateTrackingFields() {
  const exercise = exercises.find(item => String(item.id) === form.elements.exerciseId.value);
  const strength = !exercise || exercise.tracking_type === "sets_reps";
  strengthFields.hidden = !strength;
  cardioFields.hidden = strength;
  form.elements.setCount.closest("label").hidden = !strength;
  form.elements.reps.required = strength;
  form.elements.weightKg.required = false;
  form.elements.durationSeconds.required = !strength;
}

async function loadDay(date) {
  selectedDate = date;
  tabs.querySelectorAll(".day-tab").forEach(button => {
    const active = button.dataset.date === date;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector(".section-title h2").textContent = `Latihan ${api.formatDate(date, { weekday: "long", day: "numeric", month: "long" })}`;
  await loadProgram(date);
  try {
    const { workoutSessions } = await api.get(`/workout-sessions?date=${encodeURIComponent(date)}`);
    workoutList.replaceChildren();
    if (!workoutSessions.length) {
      const empty = document.createElement("div");
      empty.className = "empty-workout";
      empty.textContent = "Belum ada sesi latihan pada tanggal ini.";
      workoutList.append(empty);
    }
    for (const session of workoutSessions) {
      const row = document.createElement("div");
      row.className = "workout-item";
      const details = document.createElement("div");
      const name = document.createElement("b");
      name.textContent = session.name;
      const sub = document.createElement("small");
      sub.textContent = `${session.status === "completed" ? "Selesai" : session.status === "planned" ? "Direncanakan" : "Dibatalkan"}${session.duration_minutes ? ` · ${session.duration_minutes} menit` : ""}`;
      details.append(name, sub);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "edit-workout";
      remove.dataset.delete = session.id;
      remove.textContent = "Hapus";
      row.append(details, remove);
      workoutList.append(row);
    }
  } catch (error) {
    workoutList.replaceChildren();
    api.toast(error.message, "error");
  }
}

async function loadWeekSummary() {
  try {
    const results = await Promise.all(days.map(day => api.get(`/workout-sessions?date=${encodeURIComponent(day.date)}`)));
    const sessions = results.flatMap(result => result.workoutSessions);
    const completed = sessions.filter(session => session.status === "completed");
    metrics[0].querySelector("strong").textContent = String(completed.length);
    metrics[1].querySelector("strong").textContent = `${completed.reduce((sum, session) => sum + Number(session.duration_minutes || 0), 0)} mnt`;
    metrics[2].querySelector("strong").textContent = String(new Set(completed.map(session => String(session.started_at).slice(0, 10))).size);
  } catch (error) {
    api.toast(error.message, "error");
  }
}

function openDialog() {
  form.reset();
  form.elements.startedAt.value = buildTimestamp(selectedDate);
  form.elements.exerciseId.value = "";
  updateTrackingFields();
  dialog.showModal();
}

header.querySelector(".btn").addEventListener("click", openDialog);
tabs.addEventListener("click", event => {
  const button = event.target.closest(".day-tab");
  if (button) loadDay(button.dataset.date);
});
locationSelect.addEventListener("change", async () => {
  const location = locationSelect.value;
  try {
    await api.put("/workout-program/preference", { location });
    await loadProgram(selectedDate);
  } catch (error) {
    locationSelect.value = programData?.preference.location || "rumah";
    api.toast(error.message, "error");
  }
});
weekGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-day-number]");
  if (!button) return;
  const day = days[Number(button.dataset.dayNumber) - 1];
  if (day) loadDay(day.date);
});
programDetail.addEventListener("click", event => {
  const button = event.target.closest(".workout-record-movement");
  if (!button || !programData?.selectedDay) return;
  const movement = programData.selectedDay.movements.find(item => String(item.exercise_id) === button.dataset.exerciseId);
  if (!movement) return;
  openDialog();
  form.elements.name.value = movement.exercise_name;
  form.elements.exerciseId.value = String(movement.exercise_id);
  updateTrackingFields();
  form.elements.setCount.value = movement.sets;
  const repetitionCount = Number.parseInt(movement.reps, 10);
  if (form.elements.reps && repetitionCount) form.elements.reps.value = repetitionCount;
  if (movement.rep_unit.includes("detik")) form.elements.durationSeconds.value = repetitionCount;
  if (movement.rep_unit.includes("menit")) form.elements.durationSeconds.value = repetitionCount * 60;
});
form.elements.exerciseId.addEventListener("change", updateTrackingFields);
dialog.querySelector("[data-close]").addEventListener("click", () => dialog.close());
workoutList.addEventListener("click", async event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  try {
    await api.delete(`/workout-sessions/${button.dataset.delete}`);
    api.toast("Sesi latihan dihapus.");
    await Promise.all([loadDay(selectedDate), loadWeekSummary()]);
  } catch (error) {
    api.toast(error.message, "error");
  }
});
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const exercise = exercises.find(item => String(item.id) === data.get("exerciseId"));
  if (!exercise) {
    api.toast("Pilih latihan dari katalog.", "error");
    return;
  }
  const setCount = exercise.tracking_type === "sets_reps" ? Number(data.get("setCount")) : 1;
  const set = { exerciseId: Number(exercise.id) };
  if (data.get("reps")) set.reps = Number(data.get("reps"));
  if (data.get("weightKg")) set.weightKg = Number(data.get("weightKg"));
  if (data.get("durationSeconds")) set.durationSeconds = Number(data.get("durationSeconds"));
  if (data.get("distanceM")) set.distanceM = Number(data.get("distanceM"));
  const startedAt = String(data.get("startedAt"));
  try {
    await api.post("/workout-sessions", {
      name: String(data.get("name")).trim(),
      startedAt: `${startedAt.replace("T", " ")}:00`,
      durationMinutes: data.get("durationMinutes") ? Number(data.get("durationMinutes")) : null,
      status: "completed",
      notes: String(data.get("notes") || "").trim() || null,
      sets: Array.from({ length: setCount }, (_, index) => ({ ...set, setNumber: index + 1 }))
    });
    dialog.close();
    api.toast("Sesi latihan disimpan.");
    await Promise.all([loadDay(selectedDate), loadWeekSummary()]);
  } catch (error) {
    api.toast(error.message, "error");
  }
});

loadCatalog().then(() => {
  updateTrackingFields();
  return Promise.all([loadDay(today), loadWeekSummary()]);
}).catch(error => api.toast(error.message, "error"));
