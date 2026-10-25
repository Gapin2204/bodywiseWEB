const requiredColumns = {
  users: ["id", "name", "email", "health_focus", "password_hash"],
  user_profiles: ["user_id", "birth_date", "sex", "height_cm", "activity_level"],
  body_assessments: ["id", "user_id", "assessed_at", "age_years", "sex", "height_cm", "weight_kg", "activity_level", "bmi", "bmr_kcal", "tdee_kcal"],
  weight_goals: ["id", "user_id", "goal_type", "target_weight_kg", "start_weight_kg", "start_date", "target_date", "status", "created_at"],
  food_catalog: ["id", "name", "brand", "category", "calories_per_100g", "protein_g_per_100g", "carbs_g_per_100g", "fat_g_per_100g", "fiber_g_per_100g", "nutrition_verified", "source_note"],
  food_aliases: ["id", "food_id", "alias"],
  food_portions: ["id", "food_id", "serving_name", "serving_grams", "is_default"],
  food_logs: ["id", "user_id", "food_id", "food_name", "meal_type", "quantity_g", "calories", "protein_g", "carbs_g", "fat_g", "fiber_g", "logged_at"],
  exercises: ["id", "name", "category", "tracking_type", "description"],
  workout_programs: ["id", "slug", "name", "level", "duration_weeks", "session_duration", "frequency", "safety_notes"],
  workout_program_days: ["id", "program_id", "day_number", "day_name", "focus", "duration_min", "duration_max", "notes", "is_rest"],
  workout_program_movements: ["id", "program_day_id", "exercise_id", "location", "sequence_number", "muscle_group", "supporting_muscles", "equipment", "sets", "reps", "rep_unit", "rest_seconds", "tips", "home_alternative"],
  workout_program_progression: ["program_id", "week_number", "focus", "guidance"],
  workout_program_warmups: ["id", "program_id", "phase", "sequence_number", "name", "duration"],
  user_workout_preferences: ["user_id", "program_id", "location", "start_date"],
  workout_sessions: ["id", "user_id", "name", "started_at", "duration_minutes", "status", "notes"],
  workout_sets: ["id", "workout_session_id", "exercise_id", "set_number", "reps", "weight_kg", "duration_seconds", "distance_m", "notes"],
  weight_logs: ["id", "user_id", "weight_kg", "logged_on", "notes", "created_at"],
  daily_habits: ["user_id", "habit_date", "water_completed", "workout_completed", "food_logged", "sleep_completed"],
  chat_conversations: ["id", "user_id", "title", "created_at", "updated_at"],
  chat_messages: ["id", "conversation_id", "role", "content", "created_at"]
};

async function verifySchema(pool) {
  const [rows] = await pool.query(
    `SELECT TABLE_NAME, COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()`
  );
  const actual = new Map();
  for (const row of rows) {
    if (!actual.has(row.TABLE_NAME)) actual.set(row.TABLE_NAME, new Set());
    actual.get(row.TABLE_NAME).add(row.COLUMN_NAME);
  }

  const missing = [];
  for (const [table, columns] of Object.entries(requiredColumns)) {
    for (const column of columns) {
      if (!actual.get(table)?.has(column)) missing.push(`${table}.${column}`);
    }
  }
  if (missing.length) {
    throw new Error(
      `Database schema mismatch; missing ${missing.join(", ")}. ` +
      "Run backend/sql/migrations/001_create_bodywise_app_database.sql, backend/sql/schema.sql, backend/sql/migrations/002_food_nutrition_catalog.sql, backend/sql/migrations/003_food_csv_catalog_fields.sql, and backend/sql/migrations/004_workout_program.sql, then set DB_NAME=bodywise_app."
    );
  }
}

module.exports = { verifySchema };
