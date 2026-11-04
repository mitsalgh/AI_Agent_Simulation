
export const CONFIG = {
  APP_NAME: "AI Digital Company",
  STORAGE_KEY: "mitsal_ai_company_v2",

  COMPANY: {
    name: "Mitsal Digital Company",
    owner: "Company Owner",
    mission: "Membangun dan menjual produk digital melalui pemasaran organik."
  },

  ENGINE: {
    mode: "simulation",
    endpoint: ""
  },

  RULES: {
    requireContentApproval: true,
    allowAutomaticPublishing: false,
    allowUnsolicitedMessages: false
  }
};

export function getEngineSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(CONFIG.STORAGE_KEY + "_engine")
    );

    return {
      mode: saved?.mode || CONFIG.ENGINE.mode,
      endpoint: saved?.endpoint || CONFIG.ENGINE.endpoint
    };
  } catch {
    return { ...CONFIG.ENGINE };
  }
}

export function saveEngineSettings(settings) {
  localStorage.setItem(
    CONFIG.STORAGE_KEY + "_engine",
    JSON.stringify(settings)
  );
}
