
import { CONFIG, getEngineSettings, saveEngineSettings } from "./config.js";
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

import { SimulationEngine } from "./engines/simulation.engine.js";
import { RemoteEngine } from "./engines/remote.engine.js";
import { VirtualOffice } from "./office/office3d.js";

const $ = id => document.getElementById(id);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

let engineSettings = getEngineSettings();
let engine = createEngine(engineSettings);
let office = null;
let simulationRunning = false;

const pageNames = {
  overview: ["Overview", "Monitor aktivitas perusahaan virtual."],
  office: ["Virtual Headquarters", "Kantor modern dan aktivitas seluruh agent."],
  agents: ["AI Employees", "Struktur organisasi perusahaan."],
  tasks: ["Task Management", "Pekerjaan yang dikelola CEO."],
  products: ["Digital Products", "Portofolio produk digital perusahaan."],
  content: ["Threads Content", "Pemasaran organik perusahaan."],
  strategy: ["Business Strategy", "Strategi dan sasaran bisnis."],
  finance: ["Finance", "Laporan keuangan perusahaan."],
  engine: ["AI Engine", "Konfigurasi mesin AI."],
  activity: ["Activity Log", "Riwayat operasional perusahaan."]
};

function createEngine(settings) {
  return settings.mode === "simulation"
    ? new SimulationEngine()
    : new RemoteEngine({
        name: settings.mode,
        endpoint: settings.endpoint
      });
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[c]);
}

function money(value) {
  return "Rp" + Number(value || 0).toLocaleString("id-ID");
}

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 3200);
}

function setLoading(button, loading, text = "Memproses...") {
  if (!button) return;
  if (loading) {
    button.dataset.original = button.textContent;
    button.disabled = true;
    button.textContent = text;
  } else {
    button.disabled = false;
    button.textContent = button.dataset.original || "Simpan";
  }
}

function navigate(name) {
  if (!pageNames[name]) return;

  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === `${name}View`);
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.view === name);
  });

  $("pageTitle").textContent = pageNames[name][0];
  $("pageSubtitle").textContent = pageNames[name][1];

  if (name === "office") initializeOffice();
}

function initializeOffice() {
  if (office) {
    office.resize();
    return;
  }

  try {
    office = new VirtualOffice($("officeScene"));

    office.onSelect = agent => {
      const state = getAgentState(agent.id);

      $("officeAgentDetails").innerHTML = `
        <strong>${escapeHTML(agent.icon)} ${escapeHTML(agent.name)}</strong>
        <span class="status-pill ${state.status.toLowerCase()}">${escapeHTML(state.status)}</span>
        <br>
        Jabatan: ${escapeHTML(agent.role)}<br>
        Departemen: ${escapeHTML(agent.department)}<br>
        Ruangan: ${escapeHTML(agent.room)}<br>
        Aktivitas: ${escapeHTML(state.activity)}<br>
        Pekerjaan: ${escapeHTML(state.currentTask || "-")}
      `;
    };
  } catch (error) {
    console.error("Office error:", error);
    $("officeScene").textContent =
      "Kantor 3D gagal dimuat. Pastikan browser mendukung WebGL.";
  }
}

function setAgentActivity(agentId, status, activity, currentTask = "") {
  setAgentState(agentId, {
    status,
    activity,
    currentTask
  });

  office?.setAgentActivity(
    agentId,
    status,
    activity,
    status === "Meeting" ? "meeting" : "work"
  );

  renderOverview();
  renderAgents();
}

function addTaskForAgent(agentId, title, description, stage) {
  return createTask({
    agentId,
    title,
    description,
    source: "CEO",
    stage
  });
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
          <small>${escapeHTML(state.activity)}</small>
        </div>
        <span class="status-pill ${state.status.toLowerCase()}">
          ${escapeHTML(state.status)}
        </span>
      </div>
    `;
  }).join("");

  $("overviewActivities").innerHTML =
    companyData.activities.slice(0, 8).map(item => `
      <div class="activity-row">
        <p>${escapeHTML(item.message)}</p>
        <small>${new Date(item.date).toLocaleString("id-ID")}</small>
      </div>
    `).join("") || "<p>Belum ada aktivitas.</p>";

  const business = companyData.businessSimulation || {};
  const phases = [
    "Briefing CEO",
    "Riset Pasar",
    "Pengembangan Produk",
    "Quality Assurance",
    "Pemasaran",
    "Sales Planning",
    "Financial Planning",
    "Laporan CEO"
  ];

  $("businessProgress").innerHTML = phases.map((phase, index) => `
    <div class="progress-row">
      <span>${index + 1}. ${phase}</span>
      <span>${index < (business.progress || 0) ? "✓" : "○"}</span>
    </div>
  `).join("");
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
        <p><strong>Room:</strong> ${escapeHTML(agent.room)}</p>
        <span class="status-pill ${state.status.toLowerCase()}">${escapeHTML(state.status)}</span>
        <p><strong>Activity:</strong><br>${escapeHTML(state.activity)}</p>
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
        <p>Stage: ${escapeHTML(task.stage)} · Status: ${escapeHTML(task.status)}</p>
        ${task.result ? `<p>Result: ${escapeHTML(JSON.stringify(task.result))}</p>` : ""}
      </div>
      <span class="status-pill ${task.status.toLowerCase()}">${escapeHTML(task.status)}</span>
    </div>
  `).join("") || '<div class="panel">Belum ada task.</div>';
}

function renderProducts() {
  $("productList").innerHTML = companyData.products.map(product => `
    <article class="product-card">
      <h3>${escapeHTML(product.name)}</h3>
      <p>${escapeHTML(product.description)}</p>
      <div class="product-price">${money(product.price)}</div>
      <span class="status-pill">${escapeHTML(product.status)}</span>
      ${product.lynkUrl
        ? `<a href="${escapeHTML(product.lynkUrl)}" target="_blank" rel="noopener noreferrer">Buka Lynk.id ↗</a>`
        : "<small>Link toko belum tersedia.</small>"}
    </article>
  `).join("") || '<div class="panel">Belum ada produk.</div>';
}

function renderContents() {
  $("contentList").innerHTML = companyData.contents.map(item => `
    <div class="content-row">
      <div>
        <h3>${escapeHTML(item.title)}</h3>
        <p>${escapeHTML(item.body)}</p>
        <span class="status-pill ${item.status.toLowerCase().replaceAll(" ", "-")}">${escapeHTML(item.status)}</span>
      </div>
      <div class="task-actions">
        ${item.status === "Pending Approval" ? `
          <button class="primary-button small-button" data-approve="${item.id}">Setujui</button>
          <button class="secondary-button small-button" data-reject="${item.id}">Tolak</button>
        ` : ""}
      </div>
    </div>
  `).join("") || '<div class="panel">Belum ada konten.</div>';
}

function renderFinance() {
  const finance = companyData.finance;

  $("financeSummary").innerHTML = `
    <div class="stat-card"><span>Revenue</span><strong>${money(finance.revenue)}</strong></div>
    <div class="stat-card"><span>Expenses</span><strong>${money(finance.expenses)}</strong></div>
    <div class="stat-card"><span>Profit</span><strong>${money(finance.revenue - finance.expenses)}</strong></div>
    <div class="stat-card"><span>Transactions</span><strong>${companyData.sales.length}</strong></div>
  `;

  $("salesList").innerHTML = companyData.sales.map(sale => `
    <div class="task-row">
      <div><h3>${escapeHTML(sale.productName)}</h3><p>${new Date(sale.date).toLocaleString("id-ID")}</p></div>
      <strong>${money(sale.amount)}</strong>
    </div>
  `).join("") || '<div class="panel">Belum ada transaksi.</div>';
}

function renderStrategy() {
  $("strategyMarket").value = companyData.strategy.market;
  $("strategyPlan").value = companyData.strategy.plan;
  $("strategyTarget").value = companyData.strategy.target;
}

function renderActivity() {
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
  renderFinance();
  renderStrategy();
  renderActivity();
  renderEngine();
}

async function executeAgentTask(task, plan, phaseNumber) {
  updateTask(task.id, { status: "Working" });

  setAgentActivity(
    task.agentId,
    "Walking",
    "Berjalan menuju ruang kerja",
    task.title
  );

  await sleep(1500);

  setAgentActivity(
    task.agentId,
    "Working",
    "Sedang mengerjakan tugas",
    task.title
  );

  updateTask(task.id, { status: "Working" });
  renderAll();

  try {
    const output = await engine.runTask(task, { plan });

    updateTask(task.id, {
      status: "Completed",
      result: output.result,
      completedAt: new Date().toISOString()
    });

    setAgentActivity(
      task.agentId,
      "Idle",
      "Pekerjaan selesai, menunggu instruksi",
      ""
    );

    addActivity(
      `${task.agentName} menyelesaikan pekerjaan: ${task.title}`,
      "success"
    );

    setBusinessSimulation({ progress: phaseNumber });
    renderAll();

    return output.result;
  } catch (error) {
    updateTask(task.id, {
      status: "Failed",
      result: { error: error.message }
    });

    setAgentActivity(
      task.agentId,
      "Idle",
      "Pekerjaan gagal",
      task.title
    );

    addActivity(`${task.agentName} gagal: ${error.message}`, "error");
    renderAll();
    throw error;
  }
}

async function runDepartmentTask(agentId, title, description, plan, phase) {
  const task = addTaskForAgent(agentId, title, description, phase);
  renderAll();
  return executeAgentTask(task, plan, phase);
}

async function runBusinessSimulation(command) {
  if (simulationRunning) {
    toast("Simulasi sedang berjalan. Tunggu hingga selesai.");
    return;
  }

  simulationRunning = true;
  const button = $("submitCommand");
  setLoading(button, true, "CEO sedang briefing...");

  try {
    addActivity(`Owner memberikan perintah: ${command}`, "command");

    // PHASE 1: CEO briefing.
    setBusinessSimulation({
      phase: "Briefing CEO",
      progress: 0,
      currentRun: command
    });

    navigate("office");
    setAgentActivity("ceo", "Walking", "Menuju ruang meeting", "Briefing CEO");
    await sleep(1400);

    office?.sendToMeeting();

    for (const agent of AGENTS) {
      setAgentState(agent.id, {
        status: "Meeting",
        activity: "Mengikuti briefing CEO",
        currentTask: "Company briefing"
      });
    }

    addActivity("CEO memulai briefing bersama seluruh departemen.");
    renderAll();
    await sleep(1800);

    const ceoOutput = await engine.runCEO(command, {
      company: companyData.company,
      strategy: companyData.strategy
    });

    const plan = ceoOutput.plan || {
      targetMarket: companyData.strategy.market,
      suggestedName: "Digital Product Proposal",
      productType: "Digital Toolkit",
      price: 49000,
      estimatedCost: 5000,
      estimatedMargin: 44000
    };

    addActivity(`CEO menetapkan target awal: ${plan.targetMarket}.`);
    addActivity(`CEO membagi pekerjaan kepada departemen terkait.`);

    // Agent meninggalkan meeting dan kembali ke ruang kerja.
    office?.returnToWork();
    for (const agent of AGENTS) {
      setAgentState(agent.id, {
        status: "Walking",
        activity: "Kembali ke ruang kerja",
        currentTask: ""
      });
    }

    renderAll();
    await sleep(1400);

    // Simpan strategi awal.
    updateStrategy({
      market: plan.targetMarket,
      plan: `Produk: ${plan.suggestedName}. Kanal pemasaran: Threads organik. Tahap berikutnya adalah validasi pasar.`,
      target: companyData.strategy.target || 1000000
    });

    // PHASE 2: Research.
    setBusinessSimulation({ phase: "Riset Pasar", progress: 1 });
    const research = await runDepartmentTask(
      "research",
      "Melakukan riset kebutuhan dan peluang pasar",
      command,
      plan,
      2
    );

    // PHASE 3: Product.
    setBusinessSimulation({ phase: "Pengembangan Produk", progress: 2 });
    const product = await runDepartmentTask(
      "product",
      "Menyusun konsep produk digital",
      JSON.stringify(research),
      plan,
      3
    );

    // PHASE 4: QA.
    setBusinessSimulation({ phase: "Quality Assurance", progress: 3 });
    const qa = await runDepartmentTask(
      "qa",
      "Memeriksa kualitas konsep produk",
      JSON.stringify(product),
      plan,
      4
    );

    // PHASE 5: Content.
    setBusinessSimulation({ phase: "Pemasaran", progress: 4 });
    const content = await runDepartmentTask(
      "content",
      "Menyusun strategi konten Threads",
      JSON.stringify({ plan, research, product }),
      plan,
      5
    );

    // PHASE 6: Sales.
    setBusinessSimulation({ phase: "Sales Planning", progress: 5 });
    const sales = await runDepartmentTask(
      "sales",
      "Menyusun strategi layanan pelanggan dan penjualan",
      JSON.stringify({ plan, product }),
      plan,
      6
    );

    // PHASE 7: Finance.
    setBusinessSimulation({ phase: "Financial Planning", progress: 6 });
    const finance = await runDepartmentTask(
      "finance",
      "Menghitung kelayakan dan estimasi keuangan",
      JSON.stringify(plan),
      plan,
      7
    );

    // Buat draft produk dari hasil simulasi.
    const createdProduct = addProduct({
      name: plan.suggestedName,
      description: `${product.summary} ${product.recommendation}`,
      price: plan.price,
      status: "Draft"
    });

    // Buat konten draft untuk persetujuan Owner.
    const postIdeas = content.posts || [
      "Tips praktis untuk target pelanggan.",
      "Cerita proses pembuatan produk."
    ];

    addContent({
      title: postIdeas[0],
      body: `${postIdeas[0]}\n\n${content.recommendation || ""}`
    });

    addContent({
      title: postIdeas[1],
      body: `${postIdeas[1]}\n\nPelajari solusi yang sesuai dengan kebutuhanmu.`
    });

    // PHASE 8: CEO report.
    setBusinessSimulation({ phase: "Laporan CEO", progress: 7 });
    setAgentActivity("ceo", "Walking", "Menyiapkan laporan hasil tim", "CEO report");
    await sleep(1300);

    const finalReport = typeof engine.createFinalReport === "function"
      ? engine.createFinalReport(plan)
      : {
          title: "CEO Report",
          summary: "Laporan hasil departemen telah diterima.",
          decision: "Periksa seluruh hasil dan validasi sebelum peluncuran."
        };

    setAgentActivity(
      "ceo",
      "Working",
      "Mengevaluasi hasil seluruh departemen",
      "Final business evaluation"
    );

    await sleep(1200);

    companyData.businessSimulation = {
      ...(companyData.businessSimulation || {}),
      phase: "Simulation Completed",
      progress: 8,
      lastReport: finalReport,
      lastPlan: plan,
      lastProductId: createdProduct.id
    };

    setAgentActivity(
      "ceo",
      "Idle",
      "Laporan selesai, menunggu keputusan Owner",
      ""
    );

    addActivity("CEO menyelesaikan laporan dan menyerahkan hasil kepada Owner.");
    addActivity("Simulasi selesai. Produk dan konten disimpan sebagai draft.");

    renderAll();
    navigate("overview");
    toast("Simulasi bisnis selesai. Periksa hasilnya di dashboard.");
    showReport(finalReport, research, product, qa, content, sales, finance);
  } catch (error) {
    console.error(error);
    addActivity(`Simulasi mengalami kendala: ${error.message}`, "error");
    toast(`Simulasi berhenti: ${error.message}`);
  } finally {
    simulationRunning = false;
    setLoading(button, false);
    renderAll();
  }
}

function showReport(report, research, product, qa, content, sales, finance) {
  const reportText = [
    report.summary,
    report.decision,
    "",
    "RESEARCH:",
    research?.summary,
    "",
    "PRODUCT:",
    product?.summary,
    "",
    "QA:",
    qa?.summary,
    "",
    "CONTENT:",
    content?.summary,
    "",
    "SALES:",
    sales?.summary,
    "",
    "FINANCE:",
    finance?.summary
  ].filter(Boolean).join("\n");

  console.info("CEO FINAL REPORT\n", reportText);
  $("officeAgentDetails").textContent = reportText;
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
    if (simulationRunning) return;

    const command = $("ownerCommand").value.trim();
    if (!command) return;

    $("commandModal").classList.add("hidden");
    $("ownerCommand").value = "";

    await runBusinessSimulation(command);
  });

  $("resetCamera").addEventListener("click", () => office?.resetCamera());

  $("meetingButton").addEventListener("click", async () => {
    if (simulationRunning) {
      toast("Simulasi sedang berjalan.");
      return;
    }

    initializeOffice();
    office?.sendToMeeting();

    for (const agent of AGENTS) {
      setAgentState(agent.id, {
        status: "Meeting",
        activity: "Mengikuti meeting",
        currentTask: "Owner meeting"
      });
    }

    renderAll();
    toast("Meeting dimulai.");

    await sleep(4000);
    office?.returnToWork();

    for (const agent of AGENTS) {
      setAgentState(agent.id, {
        status: "Idle",
        activity: "Menunggu pekerjaan",
        currentTask: ""
      });
    }

    renderAll();
  });

  $("openProductForm").addEventListener("click", () => $("productForm").classList.remove("hidden"));
  $("cancelProduct").addEventListener("click", () => $("productForm").classList.add("hidden"));

  $("productForm").addEventListener("submit", event => {
    event.preventDefault();

    try {
      const url = $("productUrl").value.trim();
      if (url && !/^https:\/\/(www\.)?lynk\.id\//i.test(url)) {
        throw new Error("Masukkan link HTTPS Lynk.id yang valid.");
      }

      addProduct({
        name: $("productName").value.trim(),
        description: $("productDescription").value.trim(),
        price: $("productPrice").value,
        lynkUrl: url
      });

      event.target.reset();
      event.target.classList.add("hidden");
      renderAll();
      toast("Produk ditambahkan.");
    } catch (error) {
      toast(error.message);
    }
  });

  $("openContentForm").addEventListener("click", () => $("contentForm").classList.remove("hidden"));
  $("cancelContent").addEventListener("click", () => $("contentForm").classList.add("hidden"));

  $("contentForm").addEventListener("submit", event => {
    event.preventDefault();

    addContent({
      title: $("contentTitle").value.trim(),
      body: $("contentBody").value.trim()
    });

    event.target.reset();
    event.target.classList.add("hidden");
    renderAll();
    toast("Konten disimpan untuk persetujuan Owner.");
  });

  $("contentList").addEventListener("click", event => {
    const approve = event.target.closest("[data-approve]");
    const reject = event.target.closest("[data-reject]");

    try {
      if (approve) approveContent(approve.dataset.approve);
      if (reject) rejectContent(reject.dataset.reject);
      renderAll();
    } catch (error) {
      toast(error.message);
    }
  });

  $("strategyForm").addEventListener("submit", event => {
    event.preventDefault();

    updateStrategy({
      market: $("strategyMarket").value,
      plan: $("strategyPlan").value,
      target: $("strategyTarget").value
    });

    toast("Strategi diperbarui.");
  });

  $("saleForm").addEventListener("submit", event => {
    event.preventDefault();

    try {
      addSale($("saleProduct").value, $("saleAmount").value);
      event.target.reset();
      renderAll();
      toast("Transaksi dicatat.");
    } catch (error) {
      toast(error.message);
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
      toast("Masukkan URL backend.");
      return;
    }

    if (mode !== "simulation" && !/^https:\/\//i.test(endpoint)) {
      toast("Gunakan HTTPS untuk backend.");
      return;
    }

    engineSettings = { mode, endpoint };
    saveEngineSettings(engineSettings);
    engine = createEngine(engineSettings);
    renderEngine();
    toast("Engine berhasil dikonfigurasi.");
  });

  $("testEngine").addEventListener("click", async () => {
    const settings = {
      mode: $("engineSelect").value,
      endpoint: $("apiEndpoint").value.trim()
    };

    try {
      const result = await createEngine(settings).healthCheck();
      $("engineMessage").textContent = result.message;
      toast(result.ok ? "Engine siap." : "Engine belum terhubung.");
    } catch (error) {
      $("engineMessage").textContent = error.message;
      toast(error.message);
    }
  });
}

function initialize() {
  bindEvents();
  renderAll();
  navigate("overview");

  console.log("AI Company HQ ready.");
  console.log("Active engine:", engineSettings.mode);
}

initialize();

window.AICompany = {
  getData: () => companyData,
  getAgents: () => AGENTS,
  getEngine: () => engineSettings.mode,
  runSimulation: runBusinessSimulation,
  addActivity,
  navigate
};
