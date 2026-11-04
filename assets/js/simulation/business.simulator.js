
function includesAny(text, words) {
  return words.some(word => text.includes(word));
}

function money(value) {
  return "Rp" + Number(value).toLocaleString("id-ID");
}

export function createBusinessPlan(command) {
  const text = command.toLowerCase();

  const targetMarket = includesAny(text, [
    "kantor", "pekerja", "karyawan", "office"
  ])
    ? "Pekerja kantoran dan profesional"
    : includesAny(text, ["mahasiswa", "pelajar", "sekolah"])
      ? "Mahasiswa dan pelajar"
      : includesAny(text, ["umkm", "usaha", "bisnis", "jualan"])
        ? "Pemilik UMKM dan pelaku usaha kecil"
        : "Pengguna digital Indonesia";

  const productType = includesAny(text, [
    "excel", "spreadsheet", "template", "keuangan"
  ])
    ? "Template digital praktis"
    : includesAny(text, ["ebook", "buku", "panduan", "belajar"])
      ? "E-book dan panduan digital"
      : includesAny(text, ["desain", "canva", "konten"])
        ? "Paket template desain dan konten"
        : "Toolkit digital untuk menyelesaikan masalah pelanggan";

  const price = 49000;
  const estimatedCost = 5000;
  const estimatedMargin = price - estimatedCost;

  return {
    targetMarket,
    productType,
    suggestedName: `Starter ${productType}`,
    price,
    estimatedCost,
    estimatedMargin,
    marketingChannel: "Threads organic content",
    command,
    assumptions: [
      "Harga adalah asumsi simulasi.",
      "Biaya adalah asumsi pembuatan dan operasional per unit.",
      "Permintaan pasar belum divalidasi dengan data aktual.",
      "Tidak ada penjualan nyata yang terjadi."
    ]
  };
}

export function generateAgentResult(agentId, plan, command) {
  switch (agentId) {
    case "research":
      return {
        title: "Market Research Report",
        summary: `Target awal: ${plan.targetMarket}.`,
        findings: [
          "Identifikasi masalah yang sering dialami target pasar.",
          "Cari alternatif solusi yang sudah digunakan pelanggan.",
          "Uji apakah pelanggan bersedia membayar untuk solusi.",
          "Bandingkan produk kompetitor dan celah manfaatnya."
        ],
        recommendation:
          "Lakukan validasi melalui wawancara dan respons audiens sebelum produksi massal."
      };

    case "product":
      return {
        title: "Digital Product Proposal",
        summary: `Konsep produk: ${plan.suggestedName}.`,
        features: [
          "Produk mudah digunakan oleh pemula.",
          "Panduan penggunaan disertakan.",
          "Template dapat langsung diterapkan.",
          "Materi diperiksa sebelum dipasarkan."
        ],
        recommendation:
          "Buat MVP terlebih dahulu sebelum menambah fitur."
      };

    case "qa":
      return {
        title: "Quality Assurance Report",
        summary: "Pemeriksaan awal konsep produk.",
        checks: [
          "Kesesuaian dengan kebutuhan target pasar.",
          "Kelengkapan isi dan instruksi.",
          "Kemudahan penggunaan.",
          "Pemeriksaan kesalahan dan konsistensi."
        ],
        recommendation:
          "Produk harus melewati pengujian pengguna sebelum dinyatakan siap dijual."
      };

    case "content":
      return {
        title: "Organic Threads Content Plan",
        summary: "Rencana pemasaran edukatif.",
        posts: [
          `Masalah yang sering dialami ${plan.targetMarket}.`,
          `Cara sederhana mengatasi masalah tersebut menggunakan ${plan.productType}.`,
          "Cerita proses pembuatan solusi dan pelajaran yang diperoleh.",
          "Tips praktis yang bisa digunakan audiens tanpa harus membeli produk."
        ],
        recommendation:
          "Bangun kepercayaan melalui konten bermanfaat. Hindari spam dan promosi berlebihan."
      };

    case "sales":
      return {
        title: "Customer & Sales Plan",
        summary: "Rencana pengalaman pelanggan.",
        actions: [
          "Siapkan informasi produk yang transparan.",
          "Jelaskan manfaat dan batasan produk.",
          "Jawab pertanyaan pelanggan dengan informatif.",
          "Catat keberatan pelanggan sebagai masukan pengembangan."
        ],
        recommendation:
          "Jangan mengirim pesan promosi tanpa izin pelanggan."
      };

    case "finance":
      return {
        title: "Financial Feasibility",
        summary: "Estimasi keuangan awal.",
        price: plan.price,
        estimatedCost: plan.estimatedCost,
        estimatedMargin: plan.estimatedMargin,
        marginPercentage: Math.round(
          plan.estimatedMargin / plan.price * 100
        ),
        recommendation:
          "Validasi biaya aktual, biaya platform, pajak, dan biaya pemasaran sebelum menentukan harga final."
      };

    default:
      return {
        title: "CEO Management Report",
        summary: "CEO mengoordinasikan hasil seluruh departemen.",
        targetMarket: plan.targetMarket,
        productType: plan.productType,
        recommendation: "Lanjutkan validasi produk sebelum peluncuran."
      };
  }
}

export function generateCEOReport(plan, results) {
  const completed = Object.keys(results).length;

  return {
    title: "CEO Business Decision",
    summary: `Tim telah menyelesaikan ${completed} laporan simulasi.`,
    market: plan.targetMarket,
    product: plan.suggestedName,
    proposedPrice: money(plan.price),
    estimatedMargin: money(plan.estimatedMargin),
    decision:
      "Lanjutkan ke tahap pembuatan MVP dan validasi pelanggan. Jangan menganggap proyeksi sebagai pendapatan nyata.",
    nextSteps: [
      "Buat produk versi awal.",
      "Lakukan pengujian internal.",
      "Minta masukan calon pengguna.",
      "Siapkan halaman penjualan Lynk.id.",
      "Publikasikan konten setelah disetujui Owner."
    ]
  };
}
