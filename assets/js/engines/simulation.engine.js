
import { BaseEngine } from "./engine.js";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class SimulationEngine extends BaseEngine {
  constructor() {
    super("simulation");
  }

  async runCEO(command, context = {}) {
    await wait(700);

    return {
      engine: this.name,
      type: "simulation",
      summary: `CEO menerima perintah: "${command}"`,
      decision: "Perintah diterima dan dibagi menjadi beberapa pekerjaan.",
      limitations: "Ini hasil simulasi, bukan analisis AI sungguhan."
    };
  }

  async runTask(task, context = {}) {
    await wait(900);

    const templates = {
      ceo: [
        "Prioritas perusahaan perlu dimulai dari validasi masalah pelanggan.",
        "CEO merekomendasikan riset pasar sebelum membuat produk.",
        "Pekerjaan dibagi berdasarkan fungsi masing-masing departemen."
      ],
      research: [
        "Simulasi riset: identifikasi masalah pelanggan, pesaing, dan kebutuhan pasar.",
        "Simulasi riset: bandingkan alternatif solusi dan potensi permintaan.",
        "Simulasi riset: susun hipotesis target pasar untuk divalidasi."
      ],
      product: [
        "Simulasi produk: buat konsep, daftar fitur, dan struktur produk digital.",
        "Simulasi produk: susun outline, manfaat, dan format produk.",
        "Simulasi produk: siapkan rancangan produk untuk diperiksa QA."
      ],
      qa: [
        "Simulasi QA: periksa kelengkapan, konsistensi, dan kemudahan penggunaan.",
        "Simulasi QA: susun daftar pemeriksaan kualitas produk.",
        "Simulasi QA: hasil pemeriksaan perlu divalidasi oleh Owner."
      ],
      content: [
        "Simulasi konten: buat konten edukatif yang menjawab masalah audiens.",
        "Simulasi konten: susun cerita, tips, dan pengalaman yang relevan.",
        "Simulasi konten: hindari spam, klaim berlebihan, dan promosi agresif."
      ],
      sales: [
        "Simulasi penjualan: evaluasi pertanyaan pelanggan dan hambatan pembelian.",
        "Simulasi penjualan: susun pendekatan layanan pelanggan yang informatif."
      ],
      finance: [
        "Simulasi keuangan: hitung estimasi biaya, harga, dan margin.",
        "Simulasi keuangan: susun proyeksi pendapatan berdasarkan asumsi."
      ]
    };

    const choices = templates[task.agentId] || [
      "Pekerjaan diproses oleh Simulation Engine."
    ];

    const result = choices[
      Math.floor(Math.random() * choices.length)
    ];

    return {
      engine: this.name,
      type: "simulation",
      taskId: task.id,
      agentId: task.agentId,
      result,
      inputSummary: task.description,
      limitations: "Hasil ini hanya simulasi dan belum divalidasi dengan data pasar."
    };
  }

  async healthCheck() {
    return {
      ok: true,
      engine: this.name,
      message: "Simulation Engine siap digunakan."
    };
  }
}
