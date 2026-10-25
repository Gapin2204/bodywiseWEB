const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = require("../src/config/database");
const { parseWorkoutProgram } = require("../src/services/workout-program.service");

function exerciseCategory(movement) {
  if (/kardio|jalan|sepeda/i.test(movement.muscleGroup)) return "cardio";
  if (/peregangan|mobilitas/i.test(movement.muscleGroup)) return "mobility";
  return movement.equipment && !/tanpa alat/i.test(movement.equipment) ? "strength" : "bodyweight";
}

function trackingType(unit) {
  return /detik|menit/i.test(unit) ? "duration" : "sets_reps";
}

async function importWorkoutProgram(jsonPath, schedulePath, movementPath, warmupPath) {
  const program = parseWorkoutProgram(
    fs.readFileSync(jsonPath, "utf8"),
    fs.readFileSync(schedulePath, "utf8"),
    fs.readFileSync(movementPath, "utf8"),
    fs.readFileSync(warmupPath, "utf8")
  );
  const connection = await pool.getConnection();
  let exerciseCount = 0;
  try {
    await connection.beginTransaction();
    const [programResult] = await connection.execute(
      `INSERT INTO workout_programs
         (slug, name, level, duration_weeks, session_duration, frequency, safety_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), name = VALUES(name), level = VALUES(level),
         duration_weeks = VALUES(duration_weeks), session_duration = VALUES(session_duration),
         frequency = VALUES(frequency), safety_notes = VALUES(safety_notes)`,
      ["program-latihan-pemula-4-minggu", program.name, program.level, program.durationWeeks,
        program.sessionDuration, program.frequency, program.safetyNotes]
    );
    const programId = programResult.insertId;
    await connection.execute("DELETE FROM workout_program_days WHERE program_id = ?", [programId]);
    await connection.execute("DELETE FROM workout_program_progression WHERE program_id = ?", [programId]);
    await connection.execute("DELETE FROM workout_program_warmups WHERE program_id = ?", [programId]);

    const movementExerciseIds = new Map();
    for (const movement of program.exerciseCatalog) {
      const type = trackingType(movement.unit);
      const [existing] = await connection.execute(
        "SELECT id, tracking_type FROM exercises WHERE name = ? LIMIT 1",
        [movement.name]
      );
      if (existing[0]) {
        if (existing[0].tracking_type !== type) {
          throw new Error(`Jenis pencatatan latihan "${movement.name}" berbeda dengan katalog latihan yang ada.`);
        }
        movementExerciseIds.set(movement.id, existing[0].id);
        continue;
      }
      const [result] = await connection.execute(
        `INSERT INTO exercises (name, category, tracking_type, description)
         VALUES (?, ?, ?, ?)`,
        [movement.name, exerciseCategory(movement), type, movement.tips.slice(0, 255) || null]
      );
      movementExerciseIds.set(movement.id, result.insertId);
      exerciseCount += 1;
    }

    for (const day of program.days) {
      const [dayResult] = await connection.execute(
        `INSERT INTO workout_program_days
           (program_id, day_number, day_name, focus, duration_min, duration_max, notes, is_rest)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [programId, day.dayNumber, day.name, day.focus, day.minimum, day.maximum, day.notes, day.isRest]
      );
      for (const location of ["gym", "rumah"]) {
        for (const movement of day.movements[location]) {
          await connection.execute(
            `INSERT INTO workout_program_movements
               (program_day_id, exercise_id, location, sequence_number, muscle_group, supporting_muscles,
                equipment, sets, reps, rep_unit, rest_seconds, tips, home_alternative)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [dayResult.insertId, movementExerciseIds.get(movement.id), location, movement.sequence,
              movement.kelompok, movement.pendukung, movement.alat, movement.sets, movement.reps,
              movement.unit, movement.restSeconds, movement.tips, movement.alternatif_rumah]
          );
        }
      }
    }
    for (const week of program.progression) {
      await connection.execute(
        `INSERT INTO workout_program_progression (program_id, week_number, focus, guidance)
         VALUES (?, ?, ?, ?)`,
        [programId, week.week, week.focus, week.guidance]
      );
    }
    for (const item of program.warmups) {
      await connection.execute(
        `INSERT INTO workout_program_warmups (program_id, phase, sequence_number, name, duration)
         VALUES (?, ?, ?, ?, ?)`,
        [programId, item.phase, item.sequence, item.name, item.duration]
      );
    }
    await connection.commit();
    return { days: program.days.length, movementVariants: [...movementExerciseIds.keys()].length, exercisesAdded: exerciseCount };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function main() {
  const [jsonPath, schedulePath, movementPath, warmupPath] = process.argv.slice(2);
  if (![jsonPath, schedulePath, movementPath, warmupPath].every(Boolean)) {
    throw new Error('Gunakan: npm run import-workout-program -- "C:\\path\\program.json" "C:\\path\\jadwal.csv" "C:\\path\\gerakan.csv" "C:\\path\\pemanasan.csv"');
  }
  const result = await importWorkoutProgram(...[jsonPath, schedulePath, movementPath, warmupPath].map(file => path.resolve(file)));
  console.log(
    `Impor program latihan selesai: ${result.days} hari, ${result.movementVariants} gerakan katalog, ` +
    `${result.exercisesAdded} latihan baru ditambahkan ke katalog.`
  );
}

main()
  .catch(error => {
    console.error(`Impor program latihan gagal: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

module.exports = { importWorkoutProgram };
