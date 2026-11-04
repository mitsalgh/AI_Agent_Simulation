
import { AGENTS } from "./agents.js";
import { getOrCreateData, saveData } from "./storage.js";

export const companyData = getOrCreateData();

function persist() {
  saveData(companyData);
}

function makeId(prefix = "item") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function addActivity(message) {
  companyData.activities.unshift({
    id: makeId("activity"),
    message,
    date: new Date().toISOString()
  });

  companyData.activities = companyData.activities.slice(0, 100);
  persist();
}

export function getCompanyData() {
  return companyData;
}

export function getAgent(agentId) {
  return AGENTS.find(agent => agent.id === agentId);
}

export function getAgentState(agentId) {
  return companyData.agentStates[agentId] || {
    status: "Idle",
    currentTask: "Menunggu pekerjaan"
  };
}

export function createTask({
  agentId,
  title,
  description,
  source = "owner"
}) {
  const agent = getAgent(agentId);
  if (!agent) throw new Error("Agent tidak ditemukan.");

  const task = {
    id: makeId("task"),
    agentId,
    agentName: agent.name,
    title,
    description,
    source,
    status: "Pending",
    result: "",
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  companyData.tasks.unshift(task);
  persist();
  addActivity(`${agent.name} menerima pekerjaan: ${title}`);

  return task;
}

export function assignTask(agentId, title, description) {
  return createTask({ agentId, title, description });
}

export function setAgentStatus(agentId, status, currentTask = "") {
  companyData.agentStates[agentId] = {
    status,
    currentTask: currentTask || "Menunggu pekerjaan"
  };
  persist();
}

export function startTask(taskId) {
  const task = companyData.tasks.find(item => item.id === taskId);
  if (!task) throw new Error("Task tidak ditemukan.");

  task.status = "Working";
  setAgentStatus(task.agentId, "Working", task.title);
  persist();
  addActivity(`${task.agentName} mulai mengerjakan: ${task.title}`);

  return task;
}

export function completeTask(taskId, result) {
  const task = companyData.tasks.find(item => item.id === taskId);
  if (!task) throw new Error("Task tidak ditemukan.");

  task.status = "Completed";
  task.result = result || "Pekerjaan selesai.";
  task.completedAt = new Date().toISOString();

  const hasOtherWork = companyData.tasks.some(item =>
    item.agentId === task.agentId &&
    item.id !== taskId &&
    ["Pending", "Working"].includes(item.status)
  );

  if (!hasOtherWork) {
    setAgentStatus(task.agentId, "Idle", "Menunggu pekerjaan");
  }

  persist();
  addActivity(`${task.agentName} menyelesaikan: ${task.title}`);

  return task;
}

export function failTask(taskId, errorMessage) {
  const task = companyData.tasks.find(item => item.id === taskId);
  if (!task) return null;

  task.status = "Failed";
  task.result = errorMessage || "Pekerjaan gagal.";
  task.completedAt = new Date().toISOString();

  setAgentStatus(task.agentId, "Idle", "Menunggu pekerjaan");
  persist();
  addActivity(`${task.agentName} gagal menyelesaikan: ${task.title}`);

  return task;
}

export function submitOwnerCommand(command) {
  const text = String(command || "").trim();
  if (!text) throw new Error("Perintah tidak boleh kosong.");

  const jobs = [
    {
      agentId: "ceo",
      title: "Analisis dan koordinasi perintah Owner",
      description: text
    },
    {
      agentId: "research",
      title: "Riset pasar berdasarkan perintah Owner",
      description: text
    },
    {
      agentId: "product",
      title: "Identifikasi peluang produk digital",
      description: text
    },
    {
      agentId: "content",
      title: "Rencana konten pemasaran organik",
      description: text
    },
    {
      agentId: "finance",
      title: "Analisis kelayakan finansial",
      description: text
    }
  ];

  const tasks = jobs.map(job => createTask({
    ...job,
    source: "owner-command"
  }));

  addActivity("Owner memberikan perintah baru kepada perusahaan.");
  return tasks;
}

export function addProduct(product) {
  const item = {
    id: makeId("product"),
    name: product.name.trim(),
    description: product.description.trim(),
    price: Number(product.price),
    lynkUrl: product.lynkUrl || "",
    status: "Draft",
    createdAt: new Date().toISOString()
  };

  companyData.products.unshift(item);
  persist();
  addActivity(`Produk baru ditambahkan: ${item.name}`);
  return item;
}

export function addContent(content) {
  const item = {
    id: makeId("content"),
    title: content.title.trim(),
    body: content.body.trim(),
    status: "Pending Approval",
    createdAt: new Date().toISOString(),
    publishedAt: null
  };

  companyData.contents.unshift(item);
  persist();
  addActivity(`Konten baru menunggu persetujuan: ${item.title}`);
  return item;
}

export function approveContent(contentId) {
  const item = companyData.contents.find(x => x.id === contentId);
  if (!item) throw new Error("Konten tidak ditemukan.");

  item.status = "Approved";
  persist();
  addActivity(`Konten disetujui Owner: ${item.title}`);
  return item;
}

export function rejectContent(contentId) {
  const item = companyData.contents.find(x => x.id === contentId);
  if (!item) throw new Error("Konten tidak ditemukan.");

  item.status = "Rejected";
  persist();
  addActivity(`Konten ditolak Owner: ${item.title}`);
  return item;
}

export function updateStrategy(strategy) {
  companyData.strategy = {
    market: strategy.market,
    plan: strategy.plan,
    target: Number(strategy.target || 0)
  };

  persist();
  addActivity("Strategi bisnis diperbarui.");
}

export function addSale(productName, amount) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Nominal penjualan tidak valid.");
  }

  const sale = {
    id: makeId("sale"),
    productName,
    amount: value,
    date: new Date().toISOString()
  };

  companyData.sales.unshift(sale);
  companyData.finance.revenue += value;
  persist();
  addActivity(`Penjualan dicatat: ${productName} — Rp${value.toLocaleString("id-ID")}`);

  return sale;
}
