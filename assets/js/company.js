
import { AGENTS } from "./agents.js";
import { getOrCreateData, saveData } from "./storage.js";

export const companyData = getOrCreateData();

function persist() {
  saveData(companyData);
}

function id(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getCompanyData() {
  return companyData;
}

export function getAgent(agentId) {
  return AGENTS.find(agent => agent.id === agentId);
}

export function getAgentState(agentId) {
  if (!companyData.agentStates[agentId]) {
    companyData.agentStates[agentId] = {
      status: "Idle",
      activity: "Menunggu pekerjaan",
      currentTask: "",
      result: ""
    };
    persist();
  }
  return companyData.agentStates[agentId];
}

export function setAgentState(agentId, changes) {
  const previous = getAgentState(agentId);
  companyData.agentStates[agentId] = { ...previous, ...changes };
  persist();
}

export function addActivity(message, type = "info") {
  companyData.activities.unshift({
    id: id("activity"),
    message,
    type,
    date: new Date().toISOString()
  });

  companyData.activities = companyData.activities.slice(0, 150);
  persist();
}

export function createTask({
  agentId,
  title,
  description,
  source = "CEO",
  stage = "execution"
}) {
  const agent = getAgent(agentId);
  if (!agent) throw new Error("Agent tidak ditemukan.");

  const task = {
    id: id("task"),
    agentId,
    agentName: agent.name,
    title,
    description,
    source,
    stage,
    status: "Pending",
    result: null,
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  companyData.tasks.unshift(task);
  persist();
  addActivity(`${agent.name} menerima tugas: ${title}`, "task");
  return task;
}

export function updateTask(taskId, changes) {
  const task = companyData.tasks.find(item => item.id === taskId);
  if (!task) throw new Error("Task tidak ditemukan.");

  Object.assign(task, changes);
  persist();
  return task;
}

export function addProduct(product) {
  const item = {
    id: id("product"),
    name: product.name,
    description: product.description,
    price: Number(product.price || 0),
    lynkUrl: product.lynkUrl || "",
    status: product.status || "Draft",
    createdAt: new Date().toISOString()
  };

  companyData.products.unshift(item);
  persist();
  addActivity(`Produk ditambahkan: ${item.name}`, "product");
  return item;
}

export function addContent(content) {
  const item = {
    id: id("content"),
    title: content.title,
    body: content.body,
    status: "Pending Approval",
    createdAt: new Date().toISOString()
  };

  companyData.contents.unshift(item);
  persist();
  addActivity(`Konten menunggu persetujuan: ${item.title}`, "content");
  return item;
}

export function approveContent(contentId) {
  const item = companyData.contents.find(x => x.id === contentId);
  if (!item) throw new Error("Konten tidak ditemukan.");

  item.status = "Approved";
  persist();
  addActivity(`Owner menyetujui konten: ${item.title}`);
  return item;
}

export function rejectContent(contentId) {
  const item = companyData.contents.find(x => x.id === contentId);
  if (!item) throw new Error("Konten tidak ditemukan.");

  item.status = "Rejected";
  persist();
  addActivity(`Owner menolak konten: ${item.title}`);
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
    id: id("sale"),
    productName,
    amount: value,
    date: new Date().toISOString(),
    source: "manual"
  };

  companyData.sales.unshift(sale);
  companyData.finance.revenue += value;
  persist();
  addActivity(`Penjualan dicatat: ${productName} — Rp${value.toLocaleString("id-ID")}`);
  return sale;
}

export function setBusinessSimulation(changes) {
  companyData.businessSimulation = {
    ...(companyData.businessSimulation || {
      phase: "Belum dimulai",
      progress: 0,
      currentRun: null,
      lastReport: null
    }),
    ...changes
  };
  persist();
}

export function initializeAgentStates() {
  for (const agent of AGENTS) {
    getAgentState(agent.id);
  }
}

initializeAgentStates();
