
import { CONFIG } from "./config.js";

const KEY = CONFIG.STORAGE_KEY;

export function loadData() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Gagal membaca data perusahaan:", error);
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Gagal menyimpan data perusahaan:", error);
    return false;
  }
}

export function createInitialData() {
  return {
    company: {
      name: CONFIG.COMPANY.name,
      owner: CONFIG.COMPANY.owner,
      mission: CONFIG.COMPANY.mission
    },
    tasks: [],
    products: [],
    contents: [],
    sales: [],
    strategy: {
      market: "Belum ditentukan",
      plan: "Belum ada strategi bisnis.",
      target: 0
    },
    finance: {
      revenue: 0,
      expenses: 0
    },
    activities: [],
    agentStates: {}
  };
}

export function getOrCreateData() {
  return loadData() || createInitialData();
}
