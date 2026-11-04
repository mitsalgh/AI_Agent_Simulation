
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

// ======================================================
// GLOBAL STATE
// ======================================================

let office = null;
let simulationRunning = false;

const $ = (id) => document.getElementById(id);

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getElement(...ids) {
  for (const id of ids) {
    const element = $(id);
    if (element) return element;
  }

  return null;
}

function setText(ids, value) {
  const element = Array.isArray(ids)
    ? getElement(...ids)
    : $(ids);

  if (element) {
    element.textContent = value ?? "";
  }
}

function setHTML(ids, value) {
  const element = Array.isArray(ids)
    ? getElement(...ids)
    : $(ids);

  if (element) {
    element.innerHTML = value ?? "";
  }
}

function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

// ======================================================
// OFFICE INITIALIZATION
// ======================================================

function initializeOffice() {
  if (office) return;

  try {
    office = new VirtualOffice();

    if (typeof office.init === "function") {
      office.init();
    }

    console.log("Virtual Office berhasil diinisialisasi.");
  } catch (error) {
    console.error("Gagal menginisialisasi Virtual Office:", error);
    office = null;
  }
}

// ======================================================
// AGENT ACTIVITY
// ======================================================

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

  if (office?.setAgentActivity) {
    office.setAgentActivity(
      agentId,
      status,
      activity,
      destination
    );
  }

  renderAgents();
}

// ======================================================
// RENDER AGENTS
// ======================================================

function renderAgents() {
  const container = getElement(
    "agentsContainer",
    "agentList",
    "agentsList"
  );

  if (!container) return;

  container.innerHTML = "";

  AGENTS.forEach((agent) => {
    const state = getAgentState(agent.id) || {};

    const card = document.createElement("div");
    card.className = "agent-card";

    card.innerHTML = `
      <div class="agent-card-header">
        <span>${agent.icon || "🤖"}</span>
        <strong>${agent.name}</strong>
      </div>

      <div class="agent-role">
        ${agent.role || agent.department || "AI Agent"}
      </div>

      <div class="agent-status">
        Status: ${state.status || "Idle"}
      </div>

      <div class="agent-activity">
        ${state.activity || "Menunggu perintah"}
      </div>
    `;

    container.appendChild(card);
  });
}

// ======================================================
// RENDER PRODUCTS
// ======================================================

function renderProducts() {
  const container = getElement(
    "productsContainer",
    "productList",
    "productsList"
  );

  if (!container) return;

  const products = companyData.products || [];

  if (products.length === 0) {
    container.innerHTML = "<p>Belum ada produk.</p>";
    return;
  }

  container.innerHTML = products.map((product) => `
    <div class="product-card">
      <h3>${product.name || product.title || "Produk Digital"}</h3>
      <p>${product.description || "Belum ada deskripsi."}</p>
      <strong>${formatRupiah(product.price || 0)}</strong>
      <p>Status: ${product.status || "Draft"}</p>
    </div>
  `).join("");
}

// ======================================================
// RENDER CONTENT
// ======================================================

function renderContents() {
  const container = getElement(
    "contentsContainer",
    "contentList",
    "contentsList"
  );

  if (!container) return;

  const contents = companyData.contents || [];

  if (contents.length === 0) {
    container.innerHTML = "<p>Belum ada konten.</p>";
    return;
  }

  container.innerHTML = contents.map((content) => `
    <div class="content-card">
      <h3>${content.title || "Konten Threads"}</h3>
      <p>${content.body || content.text || ""}</p>
      <p>Status: ${content.status || "Draft"}</p>
    </div>
  `).join("");
}

// ======================================================
// RENDER DASHBOARD
// ======================================================

function renderDashboard() {
  setText(
    ["companyName", "dashboardCompanyName"],
    companyData.company?.name || "AI Digital Company"
  );

  setText(
    ["totalProducts", "productCount"],
    (companyData.products || []).length
  );

  setText(
    ["totalContents", "contentCount"],
    (companyData.contents || []).length
  );

  const revenue = companyData.finance?.revenue || 0;

  setText(
    ["totalRevenue", "revenueValue"],
    formatRupiah(revenue)
  );

  renderAgents();
  renderProducts();
  renderContents();
}

// ======================================================
// SIMULATION STATUS
// ======================================================

function updateSimulationStatus(phase, progress) {
  setBusinessSimulation({
    phase,
    progress,
    currentRun: companyData.businessSimulation?.currentRun || null,
    lastReport: companyData.businessSimulation?.lastReport || null
  });

  setText(
    ["simulationStatus", "simulationPhase", "businessStatus"],
    phase
  );

  const progressBar = getElement(
    "simulationProgress",
    "progressBar"
  );

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  setText(
    ["progressText", "simulationProgressText"],
    `${progress}%`
  );
}

// ======================================================
// REPORT DISPLAY
// ======================================================

function showReport(report) {
  const reportText =
    typeof report === "string"
      ? report
      : JSON.stringify(report, null, 2);

  const reportContainer = getElement(
    "officeAgentDetails",
    "ceoReport",
    "reportContainer",
    "simulationReport"
  );

  if (reportContainer) {
    reportContainer.textContent = reportText;
  }

  const reportModal = $("reportModal");

  if (reportModal) {
    reportModal.classList.add("active");
  }

  console.log("Laporan CEO:", report);
}

// ======================================================
// CREATE PRODUCT FROM SIMULATION
// ======================================================

function saveSimulationProduct(plan) {
  const productName =
    plan.productName ||
    plan.product?.name ||
    plan.name ||
    "Produk Digital Baru";

  const description =
    plan.description ||
    plan.product?.description ||
    "Produk digital yang dirancang oleh tim AI.";

  const price =
    Number(plan.price || plan.product?.price || 49000);

  addProduct({
    name: productName,
    title: productName,
    description,
    price,
    status: "Draft",
    source: "AI Simulation",
    createdAt: new Date().toISOString()
  });
}

// ======================================================
// CREATE CONTENT FROM SIMULATION
// ======================================================

function saveSimulationContent(plan, results) {
  const contentText =
    plan.threadsContent ||
    plan.content ||
    results
      .map((result) => {
        if (typeof result === "string") return result;

        return result?.summary || result?.report || "";
      })
      .filter(Boolean)
      .join("\n\n");

  if (!contentText) return;

  addContent({
    title: `Draft Threads - ${plan.productName || "Produk Digital"}`,
    body: contentText,
    text: contentText,
    platform: "Threads",
    status: "Draft",
    approved: false,
    createdAt: new Date().toISOString()
  });
}

// ======================================================
// RUN ONE AGENT TASK
// ======================================================

async function runAgentTask(agent, plan, command, index, total) {
  const taskTitle =
    `${agent.name} mengerjakan bagian ${agent.role || agent.department || "tugas"}`;

  setAgentActivity(
    agent.id,
    "Walking",
    "Menuju meja kerja",
    taskTitle,
    "work"
  );

  await sleep(1200);

  setAgentActivity(
    agent.id,
    "Working",
    "Sedang menjalankan tugas",
    taskTitle,
    "work"
  );

  let result;

  try {
    result = await generateAgentResult(
      agent.id,
      plan,
      command
    );
  } catch (error) {
    console.error(`Error pada agent ${agent.id}:`, error);

    result = {
      agent: agent.name,
      summary: "Tugas belum berhasil diselesaikan.",
      error: error.message
    };
  }

  await sleep(700);

  setAgentActivity(
    agent.id,
    "Idle",
    "Tugas selesai",
    "",
    "work"
  );

  const progress = Math.round(
    ((index + 1) / total) * 80
  );

  updateSimulationStatus(
    `${agent.name} telah menyelesaikan tugas`,
    progress
  );

  return result;
}

// ======================================================
// MAIN BUSINESS SIMULATION
// ======================================================

async function runBusinessSimulation(command) {
  if (simulationRunning) {
    alert("Simulasi sedang berjalan. Tunggu sampai selesai.");
    return;
  }

  if (!command || !command.trim()) {
    alert("Masukkan perintah bisnis terlebih dahulu.");
    return;
  }

  simulationRunning = true;

  const cleanCommand = command.trim();
  const runId = Date.now().toString();

  try {
    initializeOffice();

    updateSimulationStatus("CEO sedang menganalisis perintah", 5);

    addActivity({
      type: "simulation",
      message: `Perintah baru: ${cleanCommand}`,
      createdAt: new Date().toISOString()
    });

    // CEO menuju ruang meeting
    setAgentActivity(
      "ceo",
      "Walking",
      "Menuju ruang meeting",
      "Menganalisis perintah pemilik",
      "meeting"
    );

    await sleep(2200);

    // Semua agent dipanggil ke meeting
    if (office?.sendToMeeting) {
      office.sendToMeeting();
    }

    AGENTS.forEach((agent) => {
      setAgentState(agent.id, {
        status: "Meeting",
        activity: "Mengikuti briefing CEO",
        currentTask: "Briefing perusahaan"
      });
    });

    renderAgents();

    updateSimulationStatus("CEO memberikan briefing kepada tim", 12);

    await sleep(1500);

    // CEO membuat rencana bisnis
    setAgentActivity(
      "ceo",
      "Working",
      "Menyusun strategi perusahaan",
      "Membuat business plan",
      "work"
    );

    updateSimulationStatus("CEO menyusun rencana bisnis", 18);

    const plan = await createBusinessPlan(cleanCommand);

    console.log("Business Plan:", plan);

    if (!plan) {
      throw new Error("Business plan tidak berhasil dibuat.");
    }

    // CEO membagikan tugas kepada tim
    setAgentActivity(
      "ceo",
      "Working",
      "Membagikan tugas kepada seluruh divisi",
      "Distribusi tugas"
    );

    updateSimulationStatus("CEO membagikan tugas kepada tim", 20);

    await sleep(1000);

    // Jalankan semua agent selain CEO
    const team = AGENTS.filter(
      (agent) => agent.id !== "ceo"
    );

    const results = [];

    for (let i = 0; i < team.length; i++) {
      const agent = team[i];

      const result = await runAgentTask(
        agent,
        plan,
        cleanCommand,
        i,
        team.length
      );

      results.push(result);
    }

    // CEO mengevaluasi hasil
    setAgentActivity(
      "ceo",
      "Working",
      "Menganalisis hasil kerja seluruh divisi",
      "Evaluasi hasil kerja"
    );

    updateSimulationStatus("CEO mengevaluasi hasil kerja tim", 88);

    await sleep(1200);

    const report = await generateCEOReport(
      plan,
      results
    );

    // Simpan hasil simulasi sebagai draft
    saveSimulationProduct(plan);
    saveSimulationContent(plan, results);

    updateStrategy({
      market:
        plan.market ||
        plan.targetMarket ||
        "Belum ditentukan",

      plan:
        plan.strategy ||
        plan.description ||
        cleanCommand,

      target:
        Number(plan.target || plan.salesTarget || 0)
    });

    // Simpan laporan
    setBusinessSimulation({
      phase: "Simulasi selesai",
      progress: 100,
      currentRun: runId,
      lastReport: report
    });

    updateSimulationStatus("Simulasi selesai", 100);

    setAgentActivity(
      "ceo",
      "Idle",
      "Menunggu perintah berikutnya",
      ""
    );

    AGENTS
      .filter((agent) => agent.id !== "ceo")
      .forEach((agent) => {
        setAgentActivity(
          agent.id,
          "Idle",
          "Menunggu tugas berikutnya",
          ""
        );
      });

    renderDashboard();
    showReport(report);

    alert(
      "Simulasi perusahaan berhasil diselesaikan. Hasil produk dan konten tersimpan sebagai draft."
    );

  } catch (error) {
    console.error("Business simulation error:", error);

    updateSimulationStatus(
      "Terjadi kesalahan saat menjalankan simulasi",
      0
    );

    setAgentActivity(
      "ceo",
      "Idle",
      "Simulasi mengalami kesalahan",
      ""
    );

    alert(
      `Simulasi gagal dijalankan:\n${error.message}`
    );

  } finally {
    simulationRunning = false;

    const button = getElement(
      "runCommandBtn",
      "runBusinessBtn",
      "submitCommandBtn",
      "sendCommandBtn"
    );

    if (button) {
      button.disabled = false;
      button.textContent = "Beri Perintah";
    }
  }
}

// ======================================================
// COMMAND BUTTON CONNECTION
// ======================================================

function bindCommandButton() {
  const commandInput = getElement(
    "commandInput",
    "businessCommand",
    "command",
    "userCommand",
    "instructionInput"
  );

  const commandButton = getElement(
    "runCommandBtn",
    "runBusinessBtn",
    "submitCommandBtn",
    "sendCommandBtn",
    "giveCommandBtn"
  );

  if (!commandButton) {
    console.error(
      "Tombol perintah tidak ditemukan. Periksa ID tombol di index.html."
    );
  } else {
    commandButton.addEventListener("click", async (event) => {
      event.preventDefault();

      if (simulationRunning) return;

      const command = commandInput?.value?.trim() || "";

      if (!command) {
        alert("Silakan tulis perintah bisnis terlebih dahulu.");
        commandInput?.focus();
        return;
      }

      commandButton.disabled = true;
      commandButton.textContent = "Menjalankan...";

      await runBusinessSimulation(command);

      if (commandInput) {
        commandInput.value = "";
      }
    });
  }

  // Tekan Enter untuk menjalankan perintah
  if (commandInput) {
    commandInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        commandButton?.click();
      }
    });
  }

  console.log("Command button handler siap.");
}

// ======================================================
// NAVIGATION
// ======================================================

function bindNavigation() {
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const page = button.dataset.page;

      document.querySelectorAll(".page").forEach((item) => {
        item.classList.remove("active");
      });

      document.querySelectorAll("[data-page]").forEach((item) => {
        item.classList.remove("active");
      });

      const target = $(`${page}Page`) || $(page);

      target?.classList.add("active");
      button.classList.add("active");

      if (page === "office") {
        initializeOffice();
      }
    });
  });
}

// ======================================================
// OTHER BUTTONS
// ======================================================

function bindOtherButtons() {
  $("resetCameraBtn")?.addEventListener("click", () => {
    office?.resetCamera?.();
  });

  $("approveContentBtn")?.addEventListener("click", () => {
    const contentId = $("approveContentBtn").dataset.contentId;

    if (contentId) {
      approveContent(contentId);
      renderDashboard();
    }
  });

  $("rejectContentBtn")?.addEventListener("click", () => {
    const contentId = $("rejectContentBtn").dataset.contentId;

    if (contentId) {
      rejectContent(contentId);
      renderDashboard();
    }
  });

  $("closeReportBtn")?.addEventListener("click", () => {
    $("reportModal")?.classList.remove("active");
  });
}

// ======================================================
// APPLICATION INITIALIZATION
// ======================================================

function initializeApp() {
  console.log("AI Digital Company starting...");

  bindCommandButton();
  bindNavigation();
  bindOtherButtons();

  renderDashboard();

  console.log("AI Digital Company siap menerima perintah.");
}

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initializeApp,
    { once: true }
  );
} else {
  initializeApp();
}
