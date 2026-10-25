const { parseCsv } = require("./food-csv.service");

const movementColumns = [
  "id", "nama", "kelompok", "pendukung", "alat", "tempat", "set", "reps",
  "satuan", "istirahat_detik", "tips", "alternatif_rumah"
];
const scheduleColumns = [
  "urutan_hari", "hari", "fokus", "durasi_menit", "versi", "no", "id_latihan",
  "nama", "kelompok", "set", "reps", "satuan", "istirahat_detik", "catatan_hari"
];
const warmupColumns = ["tahap", "no", "nama", "durasi"];
const supportedLocations = new Set(["gym", "rumah", "keduanya"]);

function readRows(content, expectedColumns, label) {
  const rows = parseCsv(content);
  if (!rows.length || rows[0].length !== expectedColumns.length ||
      expectedColumns.some((column, index) => rows[0][index].trim() !== column)) {
    throw new Error(`Header ${label} tidak sesuai. Kolom yang diperlukan: ${expectedColumns.join(", ")}`);
  }
  return rows.slice(1).map((values, index) => {
    if (values.length !== expectedColumns.length) {
      throw new Error(`Baris ${index + 2} pada ${label} memiliki jumlah kolom yang tidak sesuai.`);
    }
    return Object.fromEntries(expectedColumns.map((column, columnIndex) => [column, values[columnIndex].trim()]));
  });
}

function parseDuration(value, label) {
  const match = /^(\d+)(?:-(\d+))?$/.exec(value);
  if (!match) throw new Error(`Durasi ${label} tidak valid.`);
  const minimum = Number(match[1]);
  const maximum = Number(match[2] || match[1]);
  if (maximum < minimum || maximum > 1440) throw new Error(`Durasi ${label} di luar batas.`);
  return { minimum, maximum };
}

function parseWorkoutProgram(jsonContent, scheduleContent, movementContent, warmupContent) {
  let source;
  try {
    source = JSON.parse(jsonContent);
  } catch {
    throw new Error("File JSON program latihan tidak valid.");
  }
  if (!source || typeof source !== "object" || !source.meta ||
      typeof source.meta.nama_program !== "string" ||
      !Array.isArray(source.jadwal_harian) || !Array.isArray(source.latihan) ||
      !Array.isArray(source.progres_4_minggu) || source.progres_4_minggu.length !== 4) {
    throw new Error("Struktur JSON harus berisi metadata, jadwal, gerakan, dan progres 4 minggu.");
  }

  const movementRows = readRows(movementContent, movementColumns, "CSV gerakan");
  const scheduleRows = readRows(scheduleContent, scheduleColumns, "CSV jadwal");
  const warmupRows = readRows(warmupContent, warmupColumns, "CSV pemanasan/pendinginan");
  const movementsById = new Map();
  for (const row of movementRows) {
    if (!row.id || movementsById.has(row.id)) throw new Error(`ID gerakan kosong atau duplikat: ${row.id}.`);
    if (!supportedLocations.has(row.tempat)) throw new Error(`Lokasi gerakan ${row.id} tidak dikenal.`);
    if (!/^\d+$/.test(row.set) || Number(row.set) < 1 || !/^\d+$/.test(row.istirahat_detik)) {
      throw new Error(`Set atau waktu istirahat gerakan ${row.id} tidak valid.`);
    }
    if (!row.nama || !row.reps || !row.satuan || !row.kelompok) {
      throw new Error(`Detail gerakan ${row.id} belum lengkap.`);
    }
    movementsById.set(row.id, row);
  }

  const sourceMovements = new Map();
  for (const movement of source.latihan) {
    if (!movement.id || sourceMovements.has(movement.id)) throw new Error(`ID gerakan JSON kosong atau duplikat: ${movement.id}.`);
    sourceMovements.set(movement.id, movement);
  }
  if (sourceMovements.size !== movementsById.size ||
      [...sourceMovements.keys()].some(id => !movementsById.has(id))) {
    throw new Error("Daftar gerakan pada JSON dan CSV tidak cocok.");
  }

  const scheduleByKey = new Map();
  for (const row of scheduleRows) {
    const dayNumber = Number(row.urutan_hari);
    if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 7) {
      throw new Error(`Urutan hari pada CSV jadwal tidak valid: ${row.urutan_hari}.`);
    }
    const sourceDay = source.jadwal_harian[dayNumber - 1];
    if (!sourceDay || row.hari !== sourceDay.hari || row.fokus !== sourceDay.fokus ||
        row.durasi_menit !== sourceDay.durasi_menit || row.catatan_hari !== sourceDay.catatan) {
      throw new Error(`Metadata jadwal hari ${row.hari} pada JSON dan CSV tidak cocok.`);
    }
    if (!row.id_latihan) continue;
    const location = row.versi;
    const movement = movementsById.get(row.id_latihan);
    if (!["gym", "rumah"].includes(location) || !movement) {
      throw new Error(`Versi atau ID gerakan pada jadwal hari ${row.hari} tidak valid.`);
    }
    // Bodyweight movements can be done at a gym, but gym-only equipment cannot be used at home.
    if (location === "rumah" && movement.tempat === "gym") {
      throw new Error(`Lokasi gerakan ${row.id_latihan} tidak cocok dengan jadwal ${location}.`);
    }
    if (movement.nama !== row.nama || movement.set !== row.set || movement.reps !== row.reps ||
        movement.satuan !== row.satuan || movement.istirahat_detik !== row.istirahat_detik) {
      throw new Error(`Detail gerakan ${row.id_latihan} berbeda antara CSV jadwal dan CSV gerakan.`);
    }
    const key = `${dayNumber}:${location}`;
    if (!scheduleByKey.has(key)) scheduleByKey.set(key, []);
    scheduleByKey.get(key).push(row);
  }

  const days = source.jadwal_harian.map((day, index) => {
    const dayNumber = Number(day.urutan);
    if (dayNumber !== index + 1 || !day.hari || !day.fokus) {
      throw new Error(`Jadwal hari ke-${index + 1} tidak valid atau tidak berurutan.`);
    }
    const duration = parseDuration(day.durasi_menit, day.hari);
    const daySchedule = { dayNumber, name: day.hari, focus: day.fokus, ...duration, notes: day.catatan || "", isRest: dayNumber === 7, movements: {} };
    for (const location of ["gym", "rumah"]) {
      const sourceIds = day[`versi_${location}`] || [];
      if (!Array.isArray(sourceIds)) throw new Error(`Daftar gerakan ${day.hari} versi ${location} tidak valid.`);
      const rows = (scheduleByKey.get(`${dayNumber}:${location}`) || []).sort((a, b) => Number(a.no) - Number(b.no));
      if (dayNumber === 7) {
        if (sourceIds.length || rows.length) throw new Error("Hari Minggu harus menjadi hari istirahat.");
        daySchedule.movements[location] = [];
        continue;
      }
      if (sourceIds.length !== rows.length ||
          sourceIds.some((id, movementIndex) => id !== rows[movementIndex].id_latihan)) {
        throw new Error(`Jadwal ${day.hari} versi ${location} pada JSON dan CSV tidak cocok.`);
      }
      daySchedule.movements[location] = rows.map((row, movementIndex) => {
        const movement = movementsById.get(row.id_latihan);
        if (Number(row.no) !== movementIndex + 1) throw new Error(`Urutan gerakan ${day.hari} versi ${location} tidak valid.`);
        return {
          ...movement,
          sequence: movementIndex + 1,
          sets: Number(row.set),
          reps: row.reps,
          unit: row.satuan,
          restSeconds: Number(row.istirahat_detik)
        };
      });
    }
    return daySchedule;
  });

  if (days.length !== 7 || scheduleByKey.size !== 12) {
    throw new Error("Jadwal harus berisi 6 hari latihan/kardio dengan versi gym dan rumah, serta 1 hari istirahat.");
  }
  if (warmupRows.length === 0 || warmupRows.some(row =>
    !["pemanasan", "pendinginan"].includes(row.tahap) || !/^[1-9]\d*$/.test(row.no) || !row.nama || !row.durasi
  )) {
    throw new Error("Daftar pemanasan/pendinginan tidak lengkap atau tidak valid.");
  }
  const warmupSequences = new Set();
  for (const row of warmupRows) {
    const key = `${row.tahap}:${row.no}`;
    if (warmupSequences.has(key)) throw new Error(`Urutan ${row.tahap} duplikat: ${row.no}.`);
    warmupSequences.add(key);
  }
  if (source.progres_4_minggu.some((week, index) =>
    Number(week.minggu) !== index + 1 || !week.fokus || !week.panduan
  )) {
    throw new Error("Progres harus berisi minggu 1–4 dengan fokus dan panduan.");
  }

  return {
    name: source.meta.nama_program,
    level: source.meta.level,
    durationWeeks: source.progres_4_minggu.length,
    sessionDuration: source.meta.durasi_sesi_menit,
    frequency: source.meta.frekuensi,
    safetyNotes: source.meta.catatan_keselamatan,
    days,
    exerciseCatalog: [...movementsById.values()].map(movement => ({
      id: movement.id,
      name: movement.nama,
      muscleGroup: movement.kelompok,
      supportingMuscles: movement.pendukung,
      equipment: movement.alat,
      location: movement.tempat,
      sets: Number(movement.set),
      reps: movement.reps,
      unit: movement.satuan,
      restSeconds: Number(movement.istirahat_detik),
      tips: movement.tips,
      homeAlternative: movement.alternatif_rumah
    })),
    progression: source.progres_4_minggu.map(week => ({
      week: Number(week.minggu),
      focus: week.fokus,
      guidance: week.panduan
    })),
    warmups: warmupRows.map(row => ({
      phase: row.tahap,
      sequence: Number(row.no),
      name: row.nama,
      duration: row.durasi
    }))
  };
}

module.exports = { parseWorkoutProgram, parseDuration };
