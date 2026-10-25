const test = require("node:test");
const assert = require("node:assert/strict");
const { parseFoodCsv } = require("../src/services/food-csv.service");

test("parses Indonesian nutrition fields and serving portions", () => {
  const csv = [
    "id,nama,kategori,porsi_umum,berat_porsi_g,kalori_kkal_per100g,protein_g_per100g,lemak_g_per100g,karbohidrat_g_per100g,serat_g_per100g",
    '1,"Nasi, putih",Makanan Pokok,"1 piring",150,130,2.7,0.3,28,0.4'
  ].join("\r\n");
  assert.deepEqual(parseFoodCsv(csv), [{
    id: "1",
    name: "Nasi, putih",
    category: "Makanan Pokok",
    servingName: "1 piring (150 g)",
    servingGrams: 150,
    calories: 130,
    protein: 2.7,
    fat: 0.3,
    carbs: 28,
    fiber: 0.4
  }]);
});

test("rejects malformed headers, repeated names, and invalid nutrition values", () => {
  const header = "id,nama,kategori,porsi_umum,berat_porsi_g,kalori_kkal_per100g,protein_g_per100g,lemak_g_per100g,karbohidrat_g_per100g,serat_g_per100g";
  assert.throws(() => parseFoodCsv("id,name\n1,rice"), /Header CSV tidak sesuai/);
  assert.throws(
    () => parseFoodCsv(`${header}\n1,Tempe,Lauk,1 potong,25,193,20,10,7,2\n2,tempe,Lauk,1 potong,25,193,20,10,7,2`),
    /duplikat/
  );
  assert.throws(
    () => parseFoodCsv(`${header}\n1,Tempe,Lauk,1 potong,25,193,20,10,101,2`),
    /di luar batas/
  );
});
