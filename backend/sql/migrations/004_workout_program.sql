USE bodywise_app;

CREATE TABLE IF NOT EXISTS workout_programs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug VARCHAR(100) NOT NULL,
  name VARCHAR(120) NOT NULL,
  level VARCHAR(40) NOT NULL,
  duration_weeks TINYINT UNSIGNED NOT NULL,
  session_duration VARCHAR(20) NOT NULL,
  frequency VARCHAR(160) NOT NULL,
  safety_notes VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workout_program_slug (slug)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_program_days (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_id BIGINT UNSIGNED NOT NULL,
  day_number TINYINT UNSIGNED NOT NULL,
  day_name VARCHAR(20) NOT NULL,
  focus VARCHAR(120) NOT NULL,
  duration_min SMALLINT UNSIGNED NOT NULL,
  duration_max SMALLINT UNSIGNED NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  is_rest BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workout_program_day (program_id, day_number),
  CONSTRAINT fk_workout_program_days_program FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE CASCADE,
  CONSTRAINT chk_workout_program_day_number CHECK (day_number BETWEEN 1 AND 7),
  CONSTRAINT chk_workout_program_duration CHECK (duration_max >= duration_min)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_program_movements (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_day_id BIGINT UNSIGNED NOT NULL,
  exercise_id BIGINT UNSIGNED NOT NULL,
  location ENUM('gym', 'rumah') NOT NULL,
  sequence_number TINYINT UNSIGNED NOT NULL,
  muscle_group VARCHAR(80) NOT NULL,
  supporting_muscles VARCHAR(160) NOT NULL DEFAULT '',
  equipment VARCHAR(160) NOT NULL DEFAULT '',
  sets SMALLINT UNSIGNED NOT NULL,
  reps VARCHAR(40) NOT NULL,
  rep_unit VARCHAR(40) NOT NULL,
  rest_seconds SMALLINT UNSIGNED NOT NULL,
  tips VARCHAR(500) NOT NULL DEFAULT '',
  home_alternative VARCHAR(160) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  UNIQUE KEY uq_workout_program_movement (program_day_id, location, sequence_number),
  KEY idx_program_movement_exercise (exercise_id),
  CONSTRAINT fk_program_movement_day FOREIGN KEY (program_day_id) REFERENCES workout_program_days (id) ON DELETE CASCADE,
  CONSTRAINT fk_program_movement_exercise FOREIGN KEY (exercise_id) REFERENCES exercises (id),
  CONSTRAINT chk_program_movement_sequence CHECK (sequence_number BETWEEN 1 AND 30),
  CONSTRAINT chk_program_movement_sets CHECK (sets BETWEEN 1 AND 50)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_program_progression (
  program_id BIGINT UNSIGNED NOT NULL,
  week_number TINYINT UNSIGNED NOT NULL,
  focus VARCHAR(120) NOT NULL,
  guidance VARCHAR(500) NOT NULL,
  PRIMARY KEY (program_id, week_number),
  CONSTRAINT fk_workout_progression_program FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE CASCADE,
  CONSTRAINT chk_workout_progression_week CHECK (week_number BETWEEN 1 AND 4)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS workout_program_warmups (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_id BIGINT UNSIGNED NOT NULL,
  phase ENUM('pemanasan', 'pendinginan') NOT NULL,
  sequence_number TINYINT UNSIGNED NOT NULL,
  name VARCHAR(160) NOT NULL,
  duration VARCHAR(80) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_workout_program_warmup (program_id, phase, sequence_number),
  CONSTRAINT fk_workout_warmups_program FOREIGN KEY (program_id) REFERENCES workout_programs (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_workout_preferences (
  user_id BIGINT UNSIGNED NOT NULL,
  program_id BIGINT UNSIGNED NOT NULL,
  location ENUM('gym', 'rumah') NOT NULL DEFAULT 'rumah',
  start_date DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  KEY idx_workout_preferences_program (program_id),
  CONSTRAINT fk_workout_preferences_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_workout_preferences_program FOREIGN KEY (program_id) REFERENCES workout_programs (id)
) ENGINE=InnoDB;
