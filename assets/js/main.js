
import { AGENTS } from "./agents.js";

import {
  companyData,
  addActivity,
  addProduct,
  addContent,
  approveContent,
  rejectContent,
  createTask,
  updateTask,
  setAgentState,
  getAgentState,
  setBusinessSimulation,
  addSale,
  updateStrategy
} from "./company.js";

import { VirtualOffice } from "./office/office3d.js";

import {
  createBusinessPlan,
  generateAgentResult,
  generateCEOReport
} from "./simulation/business.simulator.js";

let office = null;
let simulationRunning = false;
let selectedAgentId = null;

const $ = (id) => document.getElementById(id);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatRupiah(value) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function toast(message) {
  const element = $("toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("show");

  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    element.classList.remove("show");
  }, 3000);
}

function setAgentActivity(
  agentId,
  status,
  activity,
  currentTask = "",
  destination = "work"
) {
  setAgentState(agentId, {
    status,
    activity,
    currentTask
  });

  office?.setAgentActivity(
    agentId,
    status,
    activity,
    destination
  );

  renderOverview();
  renderAgents();
}

function navigate(viewName) {
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });

  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.view === viewName
    );
  });

  const titles = {
    overview: ["Dashboard", "Ringkasan aktivitas perusahaan"],
    office: ["Virtual Office", "Pantau aktivitas seluruh agent"],
    agents: ["AI Agents", "Tim digital company"],
    tasks: ["Task Management", "Daftar pekerjaan perusahaan"],
    products: ["Products", "Produk digital perusahaan"],
    content: ["Content Studio", "Draft konten pemasaran"],
    finance: ["Finance", "Ringkasan keuangan"],
    strategy: ["Business Strategy", "Strategi dan target bisnis"]
  };

  const title = titles[viewName];

  if (title) {
    if ($("pageTitle")) $("pageTitle").textContent = title[0];
    if ($("pageSubtitle")) $("pageSubtitle").textContent = title[1];
  }

  if (viewName === "office") {
    requestAnimationFrame(() => office?.resize());
  }
}

function initializeOffice() {
  if (office) return office;

  const container = $("officeScene");
  if (!container) {
    console.error("Elemen #officeScene tidak ditemukan.");
    return null;
  }

  try {
    office = new VirtualOffice(container);
    return office;
  } catch (error) {
    console.error("Gagal membuat virtual office:", error);
    toast("Virtual office gagal dibuka. Periksa dukungan WebGL.");
    return null;
  }
}

function renderOverview() {
  const activeAgents = AGENTS.filter((agent) => {
    const state = getAgentState(agent.id);
    return ["Working", "Walking", "Meeting"].includes(state.status);
  }).length;

  const activeTasks = companyData.tasks.filter((task) => {
    return ["Pending", "In Progress"].includes(task.status);
  }).length;

  if ($("totalAgents")) $("totalAgents").textContent = AGENTS.length;
  if ($("activeTasks")) $("activeTasks").textContent = activeTasks;
  if ($("totalProducts")) $("totalProducts").textContent = companyData.products.length;
  if ($("totalRevenue")) {
    $("totalRevenue").textContent = formatRupiah(companyData.finance.revenue);
  }

  if ($("overviewAgents")) {
    $("overviewAgents").innerHTML = AGENTS.map((agent) => {
      const state = getAgentState(agent.id);

      return `
        <div class="agent-summary">
          <strong>${escapeHTML(agent.name)}</strong>
          <span>${escapeHTML(agent.role || agent.department || "")}</span>
          <small>${escapeHTML(state.status)} — ${escapeHTML(state.activity)}</small>
        </div>
      `;
    }).join("");
  }

  if ($("overviewActivities")) {
    $("overviewActivities").innerHTML = companyData.activities
      .slice(0, 8)
      .map((item) => `
        <div class="activity-item">
          <span>${escapeHTML(item.message)}</span>
          <small>${new Date(item.createdAt).toLocaleString("id-ID")}</small>
        </div>
      `).join("");
  }

  const progress = companyData.businessSimulation.progress || 0;

  if ($("businessProgress")) {
    $("businessProgress").style.width = `${progress}%`;
    $("businessProgress").textContent = `${progress}%`;
  }

  if ($("activeAgents")) {
    $("activeAgents").textContent = activeAgents;
  }
}

function renderAgents() {
  const container = $("agentGrid");
  if (!container) return;

  container.innerHTML = AGENTS.map((agent) => {
    const state = getAgentState(agent.id);

    return `
      <article class="agent-card">
        <h3>${escapeHTML(agent.icon || "🤖")} ${escapeHTML(agent.name)}</h3>
        <p>${escapeHTML(agent.role || agent.department || "")}</p>
        <p><strong>Status:</strong> ${escapeHTML(state.status)}</p>
        <p>${escapeHTML(state.activity)}</p>
        <p>${escapeHTML(state.currentTask || "Tidak ada tugas")}</p>
        <button data-agent-detail="${escapeHTML(agent.id)}">Detail</button>
      </article>
    `;
  }).join("");
}

function renderTasks() {
  const container = $("taskList");
  if (!container) return;

  container.innerHTML = companyData.tasks.map((task) => {
    const agent = AGENTS.find((item) => item.id === task.agentId);

    return `
      <article class="task-card">
        <h3>${escapeHTML(task.title)}</h3>
        <p>${escapeHTML(task.description)}</p>
        <small>Agent: ${escapeHTML(agent?.name || task.agentId)}</small>
        <p>Status: ${escapeHTML(task.status)}</p>
        <progress value="${Number(task.progress) || 0}" max="100"></progress>
        <small>${Number(task.progress) || 0}%</small>
        ${task.result ? `<p>${escapeHTML(task.result)}</p>` : ""}
      </article>
    `;
  }).join("");
}

function renderProducts() {
  const container = $("productList");
  if (!container) return;

  container.innerHTML = companyData.products.map((product) => `
    <article class="product-card">
      <h3>${escapeHTML(product.name)}</h3>
      <p>${escapeHTML(product.description)}</p>
      <strong>${formatRupiah(product.price)}</strong>
      <p>Status: ${escapeHTML(product.status)}</p>
      ${product.url
        ? `<a href="${escapeHTML(product.url)}" target="_blank" rel="noopener">Buka link produk</a>`
        : ""}
    </article>
  `).join("");
}

function renderContents() {
  const container = $("contentList");
  if (!container) return;

  container.innerHTML = companyData.contents.map((content) => `
    <article class="content-card">
      <h3>${escapeHTML(content.title)}</h3>
      <p>${escapeHTML(content.body)}</p>
      <small>${escapeHTML(content.platform)} · ${escapeHTML(content.status)}</small>
      ${
        content.status === "Pending Approval"
          ? `
            <button data-approve="${escapeHTML(content.id)}">Approve</button>
            <button data-reject="${escapeHTML(content.id)}">Reject</button>
          `
          : ""
      }
    </article>
  `).join("");
}

function renderFinance() {
  const revenue = companyData.finance.revenue || 0;
  const expenses = companyData.finance.expenses || 0;

  if ($("financeSummary")) {
    $("financeSummary").innerHTML = `
      <p>Total revenue tercatat: <strong>${formatRupiah(revenue)}</strong></p>
      <p>Total pengeluaran tercatat: <strong>${formatRupiah(expenses)}</strong></p>
      <p>Selisih: <strong>${formatRupiah(revenue - expenses)}</strong></p>
      <small>Angka ini berasal dari pencatatan manual, bukan transaksi Lynk.id otomatis.</small>
    `;
  }

  if ($("salesList")) {
    $("salesList").innerHTML = companyData.sales.map((sale) => `
      <div class="sale-item">
        ${formatRupiah(sale.amount)}
        <small>${escapeHTML(sale.note || "")}</small>
      </div>
    `).join("");
  }
}

function renderStrategy() {
  const strategy = companyData.strategy;

  if ($("strategyMarket")) $("strategyMarket").textContent = strategy.market;
  if ($("strategyPlan")) $("strategyPlan").textContent = strategy.plan;
  if ($("strategyTarget")) $("strategyTarget").textContent = strategy.target;
}

function renderActivities() {
  const container = $("activityList");
  if (!container) return;

  container.innerHTML = companyData.activities.map((item) => `
    <div class="activity-item">
      <p>${escapeHTML(item.message)}</p>
      <small>${new Date(item.createdAt).toLocaleString("id-ID")}</small>
    </div>
  `).join("");
}

function renderAll() {
  renderOverview();
  renderAgents();
  renderTasks();
  renderProducts();
  renderContents();
  renderFinance();
  renderStrategy();
  renderActivities();
}

function showAgentDetails(agentId) {
  const agent = AGENTS.find((item) => item.id === agentId);
  if (!agent) return;

  const state = getAgentState(agentId);
  selectedAgentId = agentId;

  const container = $("officeAgentDetails");
  if (!container) return;

  container.innerHTML = `
    <h3>${escapeHTML(agent.name)}</h3>
    <p>${escapeHTML(agent.role || agent.department || "")}</p>
    <p>Status: ${escapeHTML(state.status)}</p>
    <p>Aktivitas: ${escapeHTML(state.activity)}</p>
    <p>Tugas: ${escapeHTML(state.currentTask || "-")}</p>
  `;
}

async function runAgentTask(agent, plan, command) {
  const task = createTask({
    title: `${agent.name}: ${plan.productName || "Analisis bisnis"}`,
    description: command,
    agentId: agent.id,
    priority: "High"
  });

  updateTask(task.id, {
    status: "In Progress",
    progress: 10
  });

  setAgentActivity(
    agent.id,
    "Walking",
    "Menuju meja kerja",
    task.title,
    "work"
  );

  await wait(1200);

  setAgentActivity(
    agent.id,
    "Working",
    "Sedang mengerjakan tugas",
    task.title,
    "work"
  );

  await wait(1800);

  const result = generateAgentResult(agent.id, plan, command);

  updateTask(task.id, {
    status: "Completed",
    progress: 100,
    result: result.summary || result.result || "Tugas selesai."
  });

  setAgentActivity(
    agent.id,
    "Idle",
    "Menunggu tugas berikutnya",
    ""
  );

  addActivity(
    `${agent.name} menyelesaikan tugas: ${result.summary || result.result || "Selesai"}`,
    agent.id,
    "completed"
  );

  renderTasks();
  return result;
}

async function runBusinessSimulation(command) {
  if (simulationRunning) {
    toast("Simulasi sedang berjalan. Tunggu sampai selesai.");
    return;
  }

  simulationRunning = true;
  navigate("office");
  initializeOffice();

  const runId = `RUN-${Date.now()}`;

  setBusinessSimulation({
    phase: "CEO Briefing",
    progress: 0,
    currentRun: runId
  });

  addActivity(`Owner memberikan perintah: ${command}`, "owner", "command");

  try {
    // CEO berjalan menuju meeting
    setAgentActivity(
      "ceo",
      "Walking",
      "Menuju ruang meeting",
      "Briefing CEO",
      "meeting"
    );

    await wait(2200);

    // Semua agent berpindah ke posisi meeting yang berbeda
    office?.sendToMeeting();

    AGENTS.forEach((agent) => {
      setAgentState(agent.id, {
        status: "Meeting",
        activity: "Mengikuti briefing CEO",
        currentTask: "Briefing perusahaan"
      });
    });

    renderAll();
    await wait(1800);

    const plan = createBusinessPlan(command);

    addActivity(
      `CEO menetapkan rencana bisnis untuk ${plan.productName || "produk baru"}.`,
      "ceo",
      "strategy"
    );

    const workAgents = AGENTS.filter((agent) => agent.id !== "ceo");
    const results = [];

    // CEO membagikan pekerjaan
    for (let index = 0; index < workAgents.length; index++) {
      const agent = workAgents[index];

      setAgentActivity(
        agent.id,
        "Walking",
        "Menuju area kerja",
        "Menerima tugas dari CEO",
        "work"
      );
    }

    setAgentActivity(
      "ceo",
      "Working",
      "Membagikan tugas kepada seluruh agent",
      "Koordinasi perusahaan"
    );

    await wait(1800);

    // Agent menjalankan tugas secara berurutan
    for (let index = 0; index < workAgents.length; index++) {
      const agent = workAgents[index];

      const progress = Math.round(
        ((index + 1) / workAgents.length) * 85
      );

      setBusinessSimulation({
        phase: `Pekerjaan ${agent.name}`,
        progress
      });

      const result = await runAgentTask(agent, plan, command);
      results.push({
        agentId: agent.id,
        ...result
      });
    }

    // CEO menyusun laporan
    setAgentActivity(
      "ceo",
      "Working",
      "Menganalisis laporan seluruh departemen",
      "Final business report"
    );

    setBusinessSimulation({
      phase: "CEO Final Report",
      progress: 95
    });

    await wait(1800);

    const report = generateCEOReport(plan, results);

    // Simpan draft produk, bukan produk yang sudah terjual
    if (plan.productName) {
      addProduct({
        name: plan.productName,
        description: plan.productDescription || "Draft produk hasil simulasi.",
        price: plan.price || 0,
        status: "Draft"
      });
    }

    // Buat draft konten yang harus disetujui Owner
    if (plan.productName) {
      addContent({
        title: `Konten pengenalan ${plan.productName}`,
        body: `Kami sedang menyiapkan ${plan.productName}. Produk ini dirancang untuk membantu ${plan.targetMarket || "pengguna"} menyelesaikan masalah yang relevan. Menurut kamu, fitur apa yang paling penting?`,
        platform: "Threads"
      });

      addContent({
        title: `Konten edukasi ${plan.productName}`,
        body: `Sebelum memilih produk digital, penting untuk memahami masalah yang ingin diselesaikan. Kami sedang mengembangkan ${plan.productName} dengan pendekatan yang praktis dan mudah digunakan.`,
        platform: "Threads"
      });
    }

    updateStrategy({
      market: plan.targetMarket || "Belum ditentukan",
      plan: report.summary || "Strategi hasil simulasi.",
      target: plan.target || 0
    });

    setBusinessSimulation({
      phase: "Selesai",
      progress: 100,
      currentRun: runId,
      lastReport: report
    });

    setAgentActivity(
      "ceo",
      "Idle",
      "Menunggu perintah Owner",
      ""
    );

    workAgents.forEach((agent) => {
      setAgentState(agent.id, {
        status: "Idle",
        activity: "Menunggu tugas berikutnya",
        currentTask: ""
      });
    });

    addActivity("CEO menyelesaikan laporan simulasi bisnis.", "ceo", "report");

    renderAll();
    showReport(report);

    toast("Simulasi bisnis selesai.");
  } catch (error) {
    console.error("Simulation error:", error);

    addActivity(
      `Simulasi gagal: ${error.message}`,
      "system",
      "error"
    );

    setBusinessSimulation({
      phase: "Terjadi kesalahan",
      currentRun: runId
    });

    toast(`Simulasi gagal: ${error.message}`);
  } finally {
    simulationRunning = false;
    renderAll();
  }
}

function showReport(report) {
  const container = $("officeAgentDetails");
  if (!container) return;

  const summary = report.summary || report.result || "Laporan simulasi selesai.";

  container.innerHTML = `
    <h3>Laporan CEO</h3>
    <p>${escapeHTML(summary)}</p>
    <small>Ini adalah hasil simulasi berbasis aturan, bukan hasil riset pasar aktual.</small>
  `;
}

function openCommandModal() {
  $("commandModal")?.classList.add("open");
  $("ownerCommand")?.focus();
}

function closeCommandModal() {
  $("commandModal")?.classList.remove("open");
}

function bindEvents() {
  document.querySelectorAll(".nav-item[data-view]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.view));
  });

  document.querySelectorAll("[data-goto]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.goto));
  });

  $("openCommand")?.addEventListener("click", openCommandModal);
  $("closeCommand")?.addEventListener("click", closeCommandModal);

  $("commandForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const command = $("ownerCommand")?.value.trim();
    if (!command) {
      toast("Masukkan perintah terlebih dahulu.");
      return;
    }

    closeCommandModal();
    $("ownerCommand").value = "";

    await runBusinessSimulation(command);
  });

  $("meetingButton")?.addEventListener("click", () => {
    if (!office) return;

    office.sendToMeeting();

    AGENTS.forEach((agent) => {
      setAgentState(agent.id, {
        status: "Meeting",
        activity: "Mengikuti meeting",
        currentTask: "Meeting Owner"
      });
    });

    renderAll();
  });

  $("resetCamera")?.addEventListener("click", () => office?.resetCamera());

  $("openProductForm")?.addEventListener("click", () => {
    $("productForm")?.classList.add("open");
  });

  $("cancelProduct")?.addEventListener("click", () => {
    $("productForm")?.classList.remove("open");
  });

  $("productForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    addProduct({
      name: $("productName")?.value,
      description: $("productDescription")?.value,
      price: $("productPrice")?.value,
      url: $("productUrl")?.value
    });

    event.target.reset();
    $("productForm")?.classList.remove("open");
    renderAll();
    toast("Produk berhasil disimpan sebagai draft.");
  });

  $("openContentForm")?.addEventListener("click", () => {
    $("contentForm")?.classList.add("open");
  });

  $("cancelContent")?.addEventListener("click", () => {
    $("contentForm")?.classList.remove("open");
  });

  $("contentForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    addContent({
      title: $("contentTitle")?.value,
      body: $("contentBody")?.value,
      platform: "Threads"
    });

    event.target.reset();
    $("contentForm")?.classList.remove("open");
    renderAll();
    toast("Draft konten berhasil dibuat.");
  });

  $("strategyForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    updateStrategy({
      market: $("strategyMarketInput")?.value || companyData.strategy.market,
      plan: $("strategyPlanInput")?.value || companyData.strategy.plan,
      target: Number($("strategyTargetInput")?.value) || 0
    });

    renderAll();
    toast("Strategi berhasil disimpan.");
  });

  $("saleForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    addSale({
      productId: $("saleProduct")?.value || "",
      amount: $("saleAmount")?.value,
      note: "Pencatatan manual oleh Owner"
    });

    event.target.reset();
    renderAll();
    toast("Penjualan manual berhasil dicatat.");
  });

  $("agentGrid")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-agent-detail]");
    if (!button) return;

    showAgentDetails(button.dataset.agentDetail);
  });

  $("contentList")?.addEventListener("click", (event) => {
    const approveButton = event.target.closest("[data-approve]");
    const rejectButton = event.target.closest("[data-reject]");

    if (approveButton) {
      approveContent(approveButton.dataset.approve);
      renderAll();
      toast("Konten disetujui. Belum dipublikasikan.");
    }

    if (rejectButton) {
      rejectContent(rejectButton.dataset.reject);
      renderAll();
      toast("Konten ditolak.");
    }
  });

  window.addEventListener("beforeunload", () => {
    office?.destroy();
  });
}

function initialize() {
  bindEvents();
  renderAll();
  initializeOffice();

  if ($("companyName")) {
    $("companyName").textContent = companyData.company.name;
  }

  if ($("companyMission")) {
    $("companyMission").textContent = companyData.company.mission;
  }

  window.AICompany = {
    getData: () => companyData,
    getAgents: () => AGENTS,
    runSimulation: runBusinessSimulation,
    addActivity,
    navigate
  };

  navigate("overview");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
