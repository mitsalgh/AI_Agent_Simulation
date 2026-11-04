
import { CONFIG, getEngineSettings, saveEngineSettings } from "./config.js";
import { AGENTS } from "./agents.js";
import {
  companyData,
  addActivity,
  addProduct,
  addContent,
  approveContent,
  rejectContent,
  submitOwnerCommand,
  startTask,
  completeTask,
  failTask,
  addSale,
  updateStrategy,
  getAgentState,
  setAgentStatus
} from "./company.js";

import { SimulationEngine } from "./engines/simulation.engine.js";
import { RemoteEngine } from "./engines/remote.engine.js";
import { VirtualOffice } from "./office/office3d.js";

const $ = id => document.getElementById(id);

let engineSettings = getEngineSettings();
let engine = createEngine(engineSettings);
let office = null;

function createEngine(settings) {
  if (settings.mode === "simulation") {
    return new SimulationEngine();
  }

  return new RemoteEngine({
    name: settings.mode,
    endpoint: settings.endpoint
  });
}

function money(value) {
  return "Rp" + Number(value || 0).toLocaleString("id-ID");
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

function setButtonLoading(button, loading, text = "Memproses...") {
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.originalText || "Simpan";
  }
}

const pageNames = {
  overview: ["Overview", "Monitor aktivitas perusahaan virtual kamu."],
  office: ["Virtual Office", "Kantor 3D dan aktivitas AI Agent."],
  agents: ["AI Agents", "Struktur organisasi perusahaan virtual."],
  tasks: ["Task Management", "Kelola pekerjaan seluruh agent."],
  products: ["Products", "Kelola produk digital perusahaan."],
  content: ["Threads Content", "Kelola konten pemasaran organik."],
  strategy: ["Business Strategy", "Atur arah bisnis perusahaan."],
  finance: ["Finance", "Monitor pendapatan dan transaksi."],
  engine: ["AI Engine", "Konfigurasi mesin AI perusahaan."],
  integrations: ["Integrations", "Hubungkan layanan eksternal."],
  activity: ["Activity Log", "Riwayat aktivitas perusahaan."]
};

function navigate(viewName) {
  if (!pageNames[viewName]) return;

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === `${viewName}View`);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.view === viewName
    );
  });

  $("pageTitle").textContent = pageNames[viewName][0];
  $("pageSubtitle").textContent = pageNames[viewName][1];

  if (viewName === "office") {
    initializeOffice();
  }
}

function initializeOffice() {
  if (office) {
    office.resize();
    return;
  }

  const container = $("officeScene");

  try {
    office = new VirtualOffice(container);
    office.onSelect = agent => {
      const state = getAgentState(agent.id);

      $("officeAgentDetails").innerHTML = `
        <strong>${escapeHTML(agent.name)}</strong> ·
        ${escapeHTML(agent.role)}<br>
        Status: ${escapeHTML(state.status)}<br>
        Pekerjaan: ${escapeHTML(state.currentTask)}
      `;
    };
  } catch (error) {
    console.error(error);
    container.textContent =
      "Tidak dapat memuat kantor 3D. Periksa dukungan WebGL browser.";
  }
}

function renderOverview() {
  $("companyName").textContent = companyData.company.name;
  $("companyMission").textContent = companyData.company.mission;

  $("totalAgents").textContent = AGENTS.length;
  $("activeTasks").textContent = companyData.tasks.filter(
    task => ["Pending", "Working"].includes(task.status)
  ).length;

  $("totalProducts").textContent = companyData.products.length;
  $("totalRevenue").textContent = money(companyData.finance.revenue);

  $("overviewAgents").innerHTML = AGENTS.map(agent => {
    const state = getAgentState(agent.id);
    return `
      <div class="agent-mini">
        <div>
          <strong>${agent.icon} ${escapeHTML(agent.name)}</strong>
          <small>${escapeHTML(state.currentTask)}</small>
        </div>
        <span class="status-pill ${state.status.toLowerCase()}">
          ${escapeHTML(state.status)}
        </span>
      </div>
    `;
  }).join("");

  $("overviewActivities").innerHTML =
    companyData.activities.slice(0, 6).map(activity => `
      <div class="activity-row">
        <p>${escapeHTML(activity.message)}</p>
        <small>${new Date(activity.date).toLocaleString("id-ID")}</small>
      </div>
    `).join("") || "<p>Belum ada aktivitas.</p>";
}

function renderAgents() {
  $("agentGrid").innerHTML = AGENTS.map(agent => {
    const state = getAgentState(agent.id);

    return `
      <article class="panel agent-card">
        <div class="agent-symbol">${agent.icon}</div>
        <h3>${escapeHTML(agent.name)}</h3>
        <small>${escapeHTML(agent.role)}</small>
        <p>${escapeHTML(agent.description)}</p>
        <span class="status-pill ${state.status.toLowerCase()}">
          ${escapeHTML(state.status)}
        </span>
        <p><strong>Current task:</strong><br>${escapeHTML(state.currentTask)}</p>
      </article>
    `;
  }).join("");
}

function renderTasks() {
  $("taskList").innerHTML = companyData.tasks.map(task => `
    <div class="task-row">
      <div>
        <h3>${escapeHTML(task.title)}</h3>
        <p>${escapeHTML(task.agentName)} · ${escapeHTML(task.description)}</p>
        <p>Status: ${escapeHTML(task.status)}</p>
        ${task.result ? `<p>Hasil: ${escapeHTML(task.result)}</p>` : ""}
      </div>
      <div class="task-actions">
        ${["Pending", "Working"].includes(task.status) ? `
          <button class="primary-button small-button"
            data-run-task="${task.id}">
            Jalankan
          </button>
        ` : ""}
      </div>
    </div>
  `).join("") || '<div class="panel">Belum ada pekerjaan.</div>';
}

function renderProducts() {
  $("productList").innerHTML = companyData.products.map(product => `
    <article class="product-card">
      <h3>${escapeHTML(product.name)}</h3>
      <p>${escapeHTML(product.description)}</p>
      <div class="product-price">${money(product.price)}</div>
      <span class="status-pill">${escapeHTML(product.status)}</span>
      ${product.lynkUrl
        ? `<a href="${escapeHTML(product.lynkUrl)}" target="_blank" rel="noopener noreferrer">Buka link Lynk.id ↗</a>`
        : '<small>Link toko belum ditambahkan.</small>'}
    </article>
  `).join("") || '<div class="panel">Belum ada produk.</div>';
}

function renderContents() {
  $("contentList").innerHTML = companyData.contents.map(item => `
    <div class="content-row">
      <div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.body)}</p>
        <p>Status: ${escapeHTML(item.status)}</p>
      </div>
      <div class="task-actions">
        ${item.status === "Pending Approval" ? `
          <button class="primary-button small-button"
            data-approve="${item.id}">Setujui</button>
          <button class="secondary-button small-button"
            data-reject="${item.id}">Tolak</button>
        ` : ""}
      </div>
    </div>
  `).join("") || '<div class="panel">Belum ada konten.</div>';
}

function renderStrategy() {
  $("strategyMarket").value = companyData.strategy.market;
  $("strategyPlan").value = companyData.strategy.plan;
  $("strategyTarget").value = companyData.strategy.target;
}

function renderFinance() {
  const finance = companyData.finance;

  $("financeSummary").innerHTML = `
    <div class="stat-card">
      <span>Total Revenue</span><strong>${money(finance.revenue)}</strong>
    </div>
    <div class="stat-card">
      <span>Total Expenses</span><strong>${money(finance.expenses)}</strong>
    </div>
    <div class="stat-card">
      <span>Profit</span><strong>${money(finance.revenue - finance.expenses)}</strong>
    </div>
    <div class="stat-card">
      <span>Recorded Sales</span><strong>${companyData.sales.length}</strong>
    </div>
  `;

  $("salesList").innerHTML = companyData.sales.map(sale => `
    <div class="task-row">
      <div>
        <h3>${escapeHTML(sale.productName)}</h3>
        <p>${new Date(sale.date).toLocaleString("id-ID")}</p>
      </div>
      <strong>${money(sale.amount)}</strong>
    </div>
  `).join("") || '<div class="panel">Belum ada penjualan.</div>';
}

function renderActivities() {
  $("activityList").innerHTML = companyData.activities.map(item => `
    <div class="activity-row">
      <p>${escapeHTML(item.message)}</p>
      <small>${new Date(item.date).toLocaleString("id-ID")}</small>
    </div>
  `).join("") || '<div class="panel">Belum ada aktivitas.</div>';
}

function renderEngine() {
  $("engineSelect").value = engineSettings.mode;
  $("apiEndpoint").value = engineSettings.endpoint;
  $("remoteSettings").classList.toggle(
    "hidden",
    engineSettings.mode === "simulation"
  );

  $("engineStatus").textContent =
    engineSettings.mode === "simulation"
      ? "Simulation Engine"
      : `${engineSettings.mode} Engine`;
}

function renderAll() {
  renderOverview();
  renderAgents();
  renderTasks();
  renderProducts();
  renderContents();
  renderStrategy();
  renderFinance();
  renderActivities();
  renderEngine();
}

async function runTask(taskId, button) {
  const task = companyData.tasks.find(item => item.id === taskId);
  if (!task) return;

  try {
    if (button) setButtonLoading(button, true, "Menjalankan...");

    startTask(taskId);
    renderAll();

    const result = await engine.runTask(task, {
      company: companyData.company,
      strategy: companyData.strategy
    });

    completeTask(taskId, JSON.stringify(result, null, 2));
    showToast("Pekerjaan selesai.");
  } catch (error) {
    failTask(taskId, error.message);
    showToast(`Pekerjaan gagal: ${error.message}`);
  } finally {
    renderAll();
    if (button) setButtonLoading(button, false);
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.view));
  });

  document.querySelectorAll("[data-goto]").forEach(button => {
    button.addEventListener("click", () => navigate(button.dataset.goto));
  });

  $("openCommand").addEventListener("click", () => {
    $("commandModal").classList.remove("hidden");
    $("ownerCommand").focus();
  });

  $("closeCommand").addEventListener("click", () => {
    $("commandModal").classList.add("hidden");
  });

  $("commandModal").addEventListener("click", event => {
    if (event.target === $("commandModal")) {
      $("commandModal").classList.add("hidden");
    }
  });

  $("commandForm").addEventListener("submit", async event => {
    event.preventDefault();

    const button = $("submitCommand");
    const command = $("ownerCommand").value.trim();
    if (!command) return;

    try {
      setButtonLoading(button, true, "CEO memproses...");

      const result = await engine.runCEO(command, {
        company: companyData.company,
        strategy: companyData.strategy
      });

      submitOwnerCommand(command);
      addActivity(`CEO memberikan respons: ${result.summary || "Perintah diterima."}`);

      $("ownerCommand").value = "";
      $("commandModal").classList.add("hidden");
      renderAll();
      showToast("Perintah diterima. Task berhasil dibuat.");
    } catch (error) {
      showToast(`Gagal mengirim perintah: ${error.message}`);
    } finally {
      setButtonLoading(button, false);
    }
  });

  $("taskList").addEventListener("click", event => {
    const button = event.target.closest("[data-run-task]");
    if (button) runTask(button.dataset.runTask, button);
  });

  $("openProductForm").addEventListener("click", () => {
    $("productForm").classList.remove("hidden");
  });

  $("cancelProduct").addEventListener("click", () => {
    $("productForm").classList.add("hidden");
  });

  $("productForm").addEventListener("submit", event => {
    event.preventDefault();

    try {
      const url = $("productUrl").value.trim();

      if (url && !/^https:\/\/(www\.)?lynk\.id\//i.test(url)) {
        throw new Error("Gunakan link HTTPS Lynk.id yang valid.");
      }

      addProduct({
        name: $("productName").value,
        description: $("productDescription").value,
        price: $("productPrice").value,
        lynkUrl: url
      });

      event.target.reset();
      event.target.classList.add("hidden");
      renderAll();
      showToast("Produk berhasil ditambahkan.");
    } catch (error) {
      showToast(error.message);
    }
  });

  $("openContentForm").addEventListener("click", () => {
    $("contentForm").classList.remove("hidden");
  });

  $("cancelContent").addEventListener("click", () => {
    $("contentForm").classList.add("hidden");
  });

  $("contentForm").addEventListener("submit", event => {
    event.preventDefault();

    addContent({
      title: $("contentTitle").value,
      body: $("contentBody").value
    });

    event.target.reset();
    event.target.classList.add("hidden");
    renderAll();
    showToast("Konten disimpan dan menunggu persetujuan.");
  });

  $("contentList").addEventListener("click", event => {
    const approve = event.target.closest("[data-approve]");
    const reject = event.target.closest("[data-reject]");

    try {
      if (approve) {
        approveContent(approve.dataset.approve);
        showToast("Konten disetujui.");
      }

      if (reject) {
        rejectContent(reject.dataset.reject);
        showToast("Konten ditolak.");
      }

      renderAll();
    } catch (error) {
      showToast(error.message);
    }
  });

  $("strategyForm").addEventListener("submit", event => {
    event.preventDefault();

    updateStrategy({
      market: $("strategyMarket").value,
      plan: $("strategyPlan").value,
      target: $("strategyTarget").value
    });

    showToast("Strategi bisnis disimpan.");
  });

  $("saleForm").addEventListener("submit", event => {
    event.preventDefault();

    try {
      addSale($("saleProduct").value, $("saleAmount").value);
      event.target.reset();
      renderAll();
      showToast("Penjualan berhasil dicatat.");
    } catch (error) {
      showToast(error.message);
    }
  });

  $("engineSelect").addEventListener("change", event => {
    $("remoteSettings").classList.toggle(
      "hidden",
      event.target.value === "simulation"
    );
  });

  $("saveEngine").addEventListener("click", () => {
    const mode = $("engineSelect").value;
    const endpoint = $("apiEndpoint").value.trim();

    if (mode !== "simulation" && !endpoint) {
      showToast("Backend API URL harus diisi.");
      return;
    }

    if (mode !== "simulation" && !/^https:\/\//i.test(endpoint)) {
      showToast("Backend URL harus menggunakan HTTPS.");
      return;
    }

    engineSettings = { mode, endpoint };
    saveEngineSettings(engineSettings);
    engine = createEngine(engineSettings);
    renderEngine();
    showToast("Konfigurasi engine disimpan.");
  });

  $("testEngine").addEventListener("click", async () => {
    const settings = {
      mode: $("engineSelect").value,
      endpoint: $("apiEndpoint").value.trim()
    };

    const testEngine = createEngine(settings);
    const result = await testEngine.healthCheck();

    $("engineMessage").textContent = result.message ||
      (result.ok ? "Backend siap." : "Backend belum siap.");

    showToast(result.ok ? "Engine siap." : "Engine belum terhubung.");
  });

  $("resetCamera").addEventListener("click", () => {
    office?.resetCamera();
  });
}

function initialize() {
  bindEvents();
  renderAll();

  // Pulihkan status agent berdasarkan pekerjaan yang masih aktif.
  for (const agent of AGENTS) {
    const active = companyData.tasks.find(task =>
      task.agentId === agent.id &&
      ["Pending", "Working"].includes(task.status)
    );

    if (active) {
      setAgentStatus(
        agent.id,
        active.status === "Working" ? "Working" : "Idle",
        active.title
      );
    }
  }

  renderAll();
  navigate("overview");

  console.log("AI Company initialized.");
  console.log("Current engine:", engineSettings.mode);
}

initialize();

// API lokal untuk pengembangan dan pengujian melalui console browser.
window.AICompany = {
  getData: () => companyData,
  getAgents: () => AGENTS,
  getEngine: () => engineSettings.mode,
  addActivity,
  runTask
};
