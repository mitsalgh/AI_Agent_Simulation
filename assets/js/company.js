
import { CONFIG } from "./config.js";
import { getOrCreateData, saveData } from "./storage.js";
import { AGENTS } from "./agents.js";

export const companyData = getOrCreateData();

// Normalisasi data LocalStorage versi lama
companyData.company ||= CONFIG.COMPANY || {
  name: "Mitsal Digital Company",
  owner: "Owner",
  mission: "Membangun dan menjual produk digital."
};

companyData.tasks ||= [];
companyData.products ||= [];
companyData.contents ||= [];
companyData.sales ||= [];
companyData.activities ||= [];
companyData.agentStates ||= {};

companyData.finance ||= {
  revenue: 0,
  expenses: 0
};

companyData.strategy ||= {
  market: "Belum ditentukan",
  plan: "Belum ada strategi.",
  target: 0
};

companyData.businessSimulation ||= {
  phase: "Belum dimulai",
  progress: 0,
  currentRun: null,
  lastReport: null
};

// Pastikan struktur data lama lengkap
companyData.finance.revenue ??= 0;
companyData.finance.expenses ??= 0;

companyData.businessSimulation.phase ||= "Belum dimulai";
companyData.businessSimulation.progress ??= 0;
companyData.businessSimulation.currentRun ??= null;
companyData.businessSimulation.lastReport ??= null;

AGENTS.forEach((agent) => {
  companyData.agentStates[agent.id] ||= {
    status: "Idle",
    activity: "Menunggu perintah",
    currentTask: "",
    progress: 0
  };
});

saveData(companyData);

function persist() {
  saveData(companyData);
}

export function getCompanyData() {
  return companyData;
}

export function getAgent(agentId) {
  return AGENTS.find((agent) => agent.id === agentId);
}

export function getAgentState(agentId) {
  return companyData.agentStates[agentId] || {
    status: "Idle",
    activity: "Menunggu perintah",
    currentTask: "",
    progress: 0
  };
}

export function setAgentState(agentId, updates = {}) {
  const previous = getAgentState(agentId);

  companyData.agentStates[agentId] = {
    ...previous,
    ...updates,
    updatedAt: new Date().toISOString()
  };

  persist();
  return companyData.agentStates[agentId];
}

export function initializeAgentStates() {
  AGENTS.forEach((agent) => {
    companyData.agentStates[agent.id] ||= {
      status: "Idle",
      activity: "Menunggu perintah",
      currentTask: "",
      progress: 0
    };
  });

  persist();
}

export function addActivity(message, agentId = "system", type = "info") {
  const activity = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    agentId,
    message,
    type,
    createdAt: new Date().toISOString()
  };

  companyData.activities.unshift(activity);
  companyData.activities = companyData.activities.slice(0, 150);

  persist();
  return activity;
}

export function createTask({
  title,
  description = "",
  agentId = "ceo",
  priority = "Normal"
}) {
  const task = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    title,
    description,
    agentId,
    priority,
    status: "Pending",
    progress: 0,
    result: "",
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  companyData.tasks.unshift(task);
  persist();

  addActivity(`Tugas baru dibuat: ${title}`, agentId, "task");
  return task;
}

export function updateTask(taskId, updates = {}) {
  const task = companyData.tasks.find((item) => item.id === taskId);
  if (!task) return null;

  Object.assign(task, updates);

  if (updates.status === "Completed") {
    task.progress = 100;
    task.completedAt = new Date().toISOString();
  }

  persist();
  return task;
}

export function addProduct(product) {
  const item = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    name: product.name || "Produk baru",
    description: product.description || "",
    price: Number(product.price) || 0,
    url: product.url || "",
    status: product.status || "Draft",
    createdAt: new Date().toISOString()
  };

  companyData.products.unshift(item);
  persist();

  addActivity(`Produk dibuat: ${item.name}`, "product", "product");
  return item;
}

export function addContent(content) {
  const item = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    title: content.title || "Konten baru",
    body: content.body || "",
    platform: content.platform || "Threads",
    status: "Pending Approval",
    createdAt: new Date().toISOString(),
    approvedAt: null
  };

  companyData.contents.unshift(item);
  persist();

  addActivity(`Draft konten dibuat: ${item.title}`, "content", "content");
  return item;
}

export function approveContent(contentId) {
  const item = companyData.contents.find((content) => content.id === contentId);
  if (!item) return null;

  item.status = "Approved";
  item.approvedAt = new Date().toISOString();

  persist();
  addActivity(`Konten disetujui: ${item.title}`, "owner", "approval");

  return item;
}

export function rejectContent(contentId) {
  const item = companyData.contents.find((content) => content.id === contentId);
  if (!item) return null;

  item.status = "Rejected";
  persist();

  addActivity(`Konten ditolak: ${item.title}`, "owner", "approval");
  return item;
}

export function updateStrategy(strategy = {}) {
  companyData.strategy = {
    ...companyData.strategy,
    ...strategy
  };

  persist();
  return companyData.strategy;
}

export function addSale({
  productId,
  amount,
  note = ""
}) {
  const sale = {
    id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
    productId,
    amount: Number(amount) || 0,
    note,
    createdAt: new Date().toISOString()
  };

  companyData.sales.unshift(sale);
  companyData.finance.revenue += sale.amount;

  persist();
  addActivity(`Penjualan manual dicatat: Rp${sale.amount.toLocaleString("id-ID")}`, "sales", "sale");

  return sale;
}

export function setBusinessSimulation(updates = {}) {
  companyData.businessSimulation = {
    ...companyData.businessSimulation,
    ...updates
  };

  persist();
  return companyData.businessSimulation;
}
