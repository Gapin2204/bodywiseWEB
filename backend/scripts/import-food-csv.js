const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const pool = require("../src/config/database");
const { parseFoodCsv } = require("../src/services/food-csv.service");

async function importFoodCsv(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const foods = parseFoodCsv(content);
  const connection = await pool.getConnection();
  let imported = 0;
  let existing = 0;
  let portionsAdded = 0;

  try {
    await connection.beginTransaction();
    for (const food of foods) {
      const [matches] = await connection.execute(
        "SELECT id FROM food_catalog WHERE LOWER(name) = LOWER(?) LIMIT 1",
        [food.name]
      );
      let foodId = matches[0]?.id;
      if (foodId) {
        existing += 1;
      } else {
        const [result] = await connection.execute(
          `INSERT INTO food_catalog
            (name, category, calories_per_100g, protein_g_per_100g, carbs_g_per_100g,
             fat_g_per_100g, fiber_g_per_100g, nutrition_verified, source_note)
           VALUES (?, ?, ?, ?, ?, ?, ?, FALSE, ?)`,
          [
            food.name,
            food.category,
            food.calories,
            food.protein,
            food.carbs,
            food.fat,
            food.fiber,
            `Sumber: database_makanan_indonesia_v2.csv; nilai per 100 g; belum diverifikasi.`
          ]
        );
        foodId = result.insertId;
        imported += 1;
      }

      const [defaultPortions] = await connection.execute(
        "SELECT id FROM food_portions WHERE food_id = ? AND is_default = TRUE LIMIT 1",
        [foodId]
      );
      if (!defaultPortions.length) {
        await connection.execute(
          `INSERT INTO food_portions (food_id, serving_name, serving_grams, is_default)
           VALUES (?, ?, ?, TRUE)
           ON DUPLICATE KEY UPDATE is_default = TRUE`,
          [foodId, food.servingName, food.servingGrams]
        );
        portionsAdded += 1;
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { rows: foods.length, imported, existing, portionsAdded };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) throw new Error('Gunakan: npm run import-foods -- "C:\\path\\database_makanan.csv"');
  const resolvedPath = path.resolve(filePath);
  const result = await importFoodCsv(resolvedPath);
  console.log(
    `Impor katalog makanan selesai: ${result.rows} baris dibaca, ${result.imported} makanan ditambahkan, ` +
    `${result.existing} makanan lama dipertahankan, ${result.portionsAdded} porsi ditambahkan.`
  );
}

main()
  .catch(error => {
    console.error(`Impor katalog makanan gagal: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

module.exports = { importFoodCsv };
