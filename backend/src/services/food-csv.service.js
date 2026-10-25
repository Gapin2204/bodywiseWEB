const columns = [
  "id",
  "nama",
  "kategori",
  "porsi_umum",
  "berat_porsi_g",
  "kalori_kkal_per100g",
  "protein_g_per100g",
  "lemak_g_per100g",
  "karbohidrat_g_per100g",
  "serat_g_per100g"
];

function parseCsv(content) {
  const text = content.replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error("CSV memiliki tanda kutip yang tidak berpasangan.");
  row.push(field);
  if (row.some(value => value.trim())) rows.push(row);
  return rows;
}

function parseFoodCsv(content) {
  const rows = parseCsv(content);
  if (!rows.length) throw new Error("CSV kosong.");
  const headers = rows[0].map(value => value.trim());
  if (headers.length !== columns.length || columns.some((column, index) => headers[index] !== column)) {
    throw new Error(`Header CSV tidak sesuai. Kolom yang diperlukan: ${columns.join(", ")}`);
  }

  const seenIds = new Set();
  const seenNames = new Set();
  return rows.slice(1).map((values, index) => {
    const line = index + 2;
    if (values.length !== columns.length) throw new Error(`Baris ${line} memiliki jumlah kolom yang tidak sesuai.`);
    const row = Object.fromEntries(columns.map((column, columnIndex) => [column, values[columnIndex].trim()]));
    const requiredText = ["id", "nama", "kategori", "porsi_umum"];
    if (requiredText.some(column => !row[column])) throw new Error(`Baris ${line} memiliki kolom teks yang kosong.`);
    if (row.nama.length > 120 || row.kategori.length > 80 || `${row.porsi_umum} (${row.berat_porsi_g} g)`.length > 80) {
      throw new Error(`Baris ${line} memiliki nama, kategori, atau porsi yang terlalu panjang.`);
    }
    if (!/^\d+$/.test(row.id) || seenIds.has(row.id)) throw new Error(`ID CSV pada baris ${line} tidak valid atau duplikat.`);
    seenIds.add(row.id);
    const normalizedName = row.nama.toLocaleLowerCase("id");
    if (seenNames.has(normalizedName)) throw new Error(`Nama makanan duplikat pada baris ${line}: ${row.nama}.`);
    seenNames.add(normalizedName);

    const numeric = {};
    for (const column of columns.slice(4)) {
      if (!/^\d+(?:\.\d+)?$/.test(row[column])) throw new Error(`Angka ${column} pada baris ${line} tidak valid.`);
      numeric[column] = Number(row[column]);
      const max = column === "berat_porsi_g" ? 5000 : column === "kalori_kkal_per100g" ? 1000 : 100;
      if (numeric[column] > max || (column === "berat_porsi_g" && numeric[column] < 1)) {
        throw new Error(`Angka ${column} pada baris ${line} di luar batas yang diizinkan.`);
      }
    }

    return {
      id: row.id,
      name: row.nama,
      category: row.kategori,
      servingName: `${row.porsi_umum} (${numeric.berat_porsi_g} g)`,
      servingGrams: numeric.berat_porsi_g,
      calories: numeric.kalori_kkal_per100g,
      protein: numeric.protein_g_per100g,
      fat: numeric.lemak_g_per100g,
      carbs: numeric.karbohidrat_g_per100g,
      fiber: numeric.serat_g_per100g
    };
  });
}

module.exports = { parseCsv, parseFoodCsv };
