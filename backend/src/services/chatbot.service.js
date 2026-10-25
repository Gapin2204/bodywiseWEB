const { getDashboard } = require("./dashboard.service");

const inScope = /\b(bodywise|dashboard|kalori|nutrisi|protein|karbohidrat|lemak|makanan|olahraga|workout|latihan|gym|kebiasaan|berat badan|bmi|bmr|tdee|hidrasi|air minum|tidur|kesehatan|sehat|progres|progress|aktivitas)\b/i;
const personalQuestion = /\b(?:catatan|data|progres|progress|aktivitas|asupan|kalori|berat|workout|latihan|kebiasaan)\s+(?:saya|aku|ku|hari ini|minggu ini)\b|\b(?:saya|aku)\s+(?:sudah|belum|mencatat|melakukan|menyelesaikan|makan|latihan|berolahraga|punya catatan|punya data)\b|\bberapa\s+(?:kalori|berat|latihan|sesi|progres)\b.{0,20}\b(?:saya|aku|hari ini)\b|\bringkasan\b.{0,20}\b(?:hari ini|saya|aku)\b/i;
const urgentSymptoms = /\b(nyeri dada|sesak napas|pingsan|perdarahan|stroke|overdosis|bunuh diri|ingin mengakhiri hidup)\b/i;

async function answerMessage(userId, message) {
  if (urgentSymptoms.test(message)) {
    return "Keluhan seperti ini dapat memerlukan pertolongan segera. Hubungi layanan darurat setempat atau tenaga kesehatan sekarang; chatbot ini tidak dapat menilai keadaan darurat.";
  }
  if (!inScope.test(message)) {
    return "Maaf, saya hanya dapat membantu tentang penggunaan BODYWISE, nutrisi, olahraga, kebiasaan sehat, dan kesehatan umum.";
  }
  if (personalQuestion.test(message)) {
    const summary = await getDashboard(userId, undefined);
    const nutrition = summary.nutrition.entries
      ? `${summary.nutrition.calories} kkal, protein ${summary.nutrition.proteinG} g, karbohidrat ${summary.nutrition.carbsG} g, dan lemak ${summary.nutrition.fatG} g`
      : "belum ada catatan makanan";
    const workouts = summary.workout.completedSessions
      ? `${summary.workout.completedSessions} sesi selesai (${summary.workout.durationMinutes} menit)`
      : "belum ada sesi workout selesai";
    const weight = summary.weight.latestKg === null
      ? "belum ada catatan berat badan"
      : `${summary.weight.latestKg} kg pada ${summary.weight.loggedOn}`;
    return `Ringkasan BODYWISE hari ini: asupan ${nutrition}; workout ${workouts}; berat terakhir ${weight}. Ini hanya ringkasan catatan yang tersedia, bukan penilaian medis.`;
  }
  if (/\b(bmi|bmr|tdee)\b/i.test(message)) {
    return "BMI adalah perbandingan berat dan tinggi, sedangkan BMR dan TDEE merupakan perkiraan energi berdasarkan rumus. Di BODYWISE, hasil asesmen memakai estimasi Mifflin–St Jeor untuk BMR dan faktor aktivitas untuk TDEE; nilainya bukan diagnosis atau pengganti saran tenaga kesehatan.";
  }
  if (/\b(kalori|protein|karbohidrat|lemak|nutrisi|makanan)\b/i.test(message)) {
    return "Pencatatan BODYWISE menghitung nilai nutrisi berdasarkan gram yang dicatat dan nilai per 100 gram. Angka nutrisi dapat berbeda menurut bahan dan cara pengolahan; gunakan label produk atau sumber tepercaya untuk data yang lebih tepat.";
  }
  if (/\b(workout|olahraga|latihan|gym)\b/i.test(message)) {
    return "BODYWISE dapat membantu mencatat sesi latihan, set, repetisi, beban, durasi, atau jarak sesuai jenis gerakannya. Mulailah pada tingkat yang nyaman dan hentikan aktivitas bila terasa tidak aman.";
  }
  if (/\b(dashboard|fitur|kebiasaan|progres|berat badan|hidrasi|tidur|sehat|kesehatan)\b/i.test(message)) {
    return "Dashboard BODYWISE merangkum asupan, workout, kebiasaan, berat terakhir, dan target yang tercatat. Catat data secara berkala untuk melihat ringkasan yang lebih lengkap. Untuk keluhan atau keputusan medis, konsultasikan dengan tenaga kesehatan.";
  }
  return "Saya dapat membantu menjelaskan fitur BODYWISE, nutrisi, olahraga, dan kebiasaan sehat secara umum. Saya tidak memberikan diagnosis atau menjamin hasil kesehatan.";
}

module.exports = { answerMessage };
