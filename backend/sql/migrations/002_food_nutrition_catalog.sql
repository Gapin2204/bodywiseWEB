USE bodywise_app;

CREATE TABLE IF NOT EXISTS food_aliases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  food_id BIGINT UNSIGNED NOT NULL,
  alias VARCHAR(120) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_food_alias (alias),
  KEY idx_food_alias_food (food_id),
  CONSTRAINT fk_food_alias_food FOREIGN KEY (food_id) REFERENCES food_catalog (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS food_portions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  food_id BIGINT UNSIGNED NOT NULL,
  serving_name VARCHAR(80) NOT NULL,
  serving_grams DECIMAL(7,2) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (id),
  UNIQUE KEY uq_food_portion (food_id, serving_name),
  KEY idx_food_portion_default (food_id, is_default),
  CONSTRAINT fk_food_portion_food FOREIGN KEY (food_id) REFERENCES food_catalog (id) ON DELETE CASCADE,
  CONSTRAINT chk_food_portion_grams CHECK (serving_grams BETWEEN 1 AND 5000)
) ENGINE=InnoDB;

INSERT INTO food_catalog
  (name, brand, calories_per_100g, protein_g_per_100g, carbs_g_per_100g, fat_g_per_100g, nutrition_verified, source_note)
SELECT seed.name, seed.brand, seed.calories, seed.protein, seed.carbs, seed.fat, FALSE,
  'Perkiraan nilai generik per 100 g; dapat berbeda menurut varietas, merek, dan cara memasak.'
FROM (
  SELECT 'Nasi putih matang' AS name, NULL AS brand, 130.00 AS calories, 2.69 AS protein, 28.17 AS carbs, 0.28 AS fat
  UNION ALL SELECT 'Nasi merah matang', NULL, 123.00, 2.74, 25.58, 0.97
  UNION ALL SELECT 'Telur ayam utuh', NULL, 143.00, 12.56, 0.72, 9.51
  UNION ALL SELECT 'Dada ayam matang', NULL, 165.00, 31.02, 0.00, 3.57
  UNION ALL SELECT 'Daging sapi matang', NULL, 217.00, 26.10, 0.00, 11.80
  UNION ALL SELECT 'Tempe', NULL, 193.00, 20.29, 7.64, 10.80
  UNION ALL SELECT 'Tahu putih', NULL, 76.00, 8.08, 1.87, 4.78
  UNION ALL SELECT 'Pisang', NULL, 89.00, 1.09, 22.84, 0.33
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM food_catalog existing WHERE existing.name = seed.name);

INSERT INTO food_aliases (food_id, alias)
SELECT f.id, aliases.alias
FROM (
  SELECT 'Nasi putih matang' AS food_name, 'nasi' AS alias UNION ALL
  SELECT 'Nasi putih matang', 'nasi putih' UNION ALL
  SELECT 'Nasi putih matang', 'beras putih matang' UNION ALL
  SELECT 'Nasi merah matang', 'nasi merah' UNION ALL
  SELECT 'Nasi merah matang', 'beras merah matang' UNION ALL
  SELECT 'Telur ayam utuh', 'telur' UNION ALL
  SELECT 'Telur ayam utuh', 'telor' UNION ALL
  SELECT 'Telur ayam utuh', 'telur ayam' UNION ALL
  SELECT 'Telur ayam utuh', 'telor ayam' UNION ALL
  SELECT 'Dada ayam matang', 'ayam' UNION ALL
  SELECT 'Dada ayam matang', 'dada ayam' UNION ALL
  SELECT 'Dada ayam matang', 'ayam tanpa kulit' UNION ALL
  SELECT 'Daging sapi matang', 'sapi' UNION ALL
  SELECT 'Daging sapi matang', 'daging sapi' UNION ALL
  SELECT 'Tempe', 'tempeh' UNION ALL
  SELECT 'Tahu putih', 'tahu' UNION ALL
  SELECT 'Tahu putih', 'tofu' UNION ALL
  SELECT 'Pisang', 'banana'
) AS aliases
JOIN food_catalog f ON f.name = aliases.food_name
WHERE NOT EXISTS (SELECT 1 FROM food_aliases existing WHERE existing.alias = aliases.alias);

INSERT INTO food_portions (food_id, serving_name, serving_grams, is_default)
SELECT f.id, portions.serving_name, portions.serving_grams, TRUE
FROM (
  SELECT 'Nasi putih matang' AS food_name, '1 centong (100 g)' AS serving_name, 100.00 AS serving_grams UNION ALL
  SELECT 'Nasi merah matang', '1 centong (100 g)', 100.00 UNION ALL
  SELECT 'Telur ayam utuh', '1 butir (50 g)', 50.00 UNION ALL
  SELECT 'Dada ayam matang', '1 potong (100 g)', 100.00 UNION ALL
  SELECT 'Daging sapi matang', '1 porsi (100 g)', 100.00 UNION ALL
  SELECT 'Tempe', '1 potong (25 g)', 25.00 UNION ALL
  SELECT 'Tahu putih', '1 potong (50 g)', 50.00 UNION ALL
  SELECT 'Pisang', '1 buah sedang (118 g)', 118.00
) AS portions
JOIN food_catalog f ON f.name = portions.food_name
WHERE NOT EXISTS (
  SELECT 1 FROM food_portions existing
  WHERE existing.food_id = f.id AND existing.serving_name = portions.serving_name
);
