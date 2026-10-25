const test = require("node:test");
const assert = require("node:assert/strict");
const { parseWorkoutProgram, parseDuration } = require("../src/services/workout-program.service");

const movementHeader = "id,nama,kelompok,pendukung,alat,tempat,set,reps,satuan,istirahat_detik,tips,alternatif_rumah";
const scheduleHeader = "urutan_hari,hari,fokus,durasi_menit,versi,no,id_latihan,nama,kelompok,set,reps,satuan,istirahat_detik,catatan_hari";
const warmupHeader = "tahap,no,nama,durasi";
const program = {
  meta: { nama_program: "Program", level: "Pemula", durasi_sesi_menit: "45-60", frekuensi: "6 hari", catatan_keselamatan: "Mulai perlahan." },
  jadwal_harian: [
    { hari: "Senin", urutan: 1, fokus: "Dada", durasi_menit: "45-60", versi_gym: ["push"], versi_rumah: ["push"], catatan: "" },
    ...["Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"].map((hari, index) => ({
      hari, urutan: index + 2, fokus: "Kardio", durasi_menit: "30-40", versi_gym: ["push"], versi_rumah: ["push"], catatan: ""
    })),
    { hari: "Minggu", urutan: 7, fokus: "Istirahat", durasi_menit: "0", versi_gym: [], versi_rumah: [], catatan: "" }
  ],
  latihan: [{ id: "push" }],
  progres_4_minggu: [1, 2, 3, 4].map(minggu => ({ minggu, fokus: "Teknik", panduan: "Jaga teknik." }))
};
const movementCsv = `${movementHeader}\npush,Push Up,Dada,Trisep,Tanpa alat,keduanya,3,10-12,rep,60,Jaga teknik.,Push-up lutut`;
const scheduleRows = program.jadwal_harian.slice(0, 6).flatMap(day =>
  ["gym", "rumah"].map(versi =>
    `${day.urutan},${day.hari},${day.fokus},${day.durasi_menit},${versi},1,push,Push Up,Dada,3,10-12,rep,60,`
  )
);
const scheduleCsv = `${scheduleHeader}\n${scheduleRows.join("\n")}`;
const warmupCsv = `${warmupHeader}\npemanasan,1,Jalan cepat,5 menit\npendinginan,1,Peregangan,20 detik`;

test("validates and normalizes the weekly gym/home program", () => {
  const parsed = parseWorkoutProgram(JSON.stringify(program), scheduleCsv, movementCsv, warmupCsv);
  assert.equal(parsed.days.length, 7);
  assert.equal(parsed.days[0].movements.gym[0].nama, "Push Up");
  assert.equal(parsed.days[5].movements.rumah[0].restSeconds, 60);
  assert.equal(parsed.days[6].isRest, true);
  assert.equal(parsed.progression.length, 4);
});

test("rejects schedule references that do not match JSON or exercise details", () => {
  const mismatched = scheduleCsv.replace("Senin,Dada,45-60,gym", "Senin,Dada,45-60,rumah");
  assert.throws(() => parseWorkoutProgram(JSON.stringify(program), mismatched, movementCsv, warmupCsv), /tidak cocok/);
  assert.throws(() => parseWorkoutProgram(JSON.stringify(program), scheduleCsv.replace("3,10-12,rep", "4,10-12,rep"), movementCsv, warmupCsv), /berbeda/);
  assert.throws(() => parseWorkoutProgram(JSON.stringify(program), scheduleCsv.replaceAll("Dada,45-60", "Bahu,45-60"), movementCsv, warmupCsv), /Metadata jadwal/);
});

test("rejects malformed duration ranges", () => {
  assert.deepEqual(parseDuration("45-60", "Senin"), { minimum: 45, maximum: 60 });
  assert.throws(() => parseDuration("60-45", "Senin"), /di luar batas/);
});
