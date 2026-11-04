
export const CONFIG = {
  APP_NAME: "AI Digital Company",
  MODE: "simulation",

  STORAGE_KEY: "ai_digital_company_v1",

  COMPANY: {
    name: "Mitsal Digital Company",
    owner: "Owner",
    mission: "Membangun dan menjual produk digital melalui pemasaran organik."
  },

  INTEGRATIONS: {
    ai: {
      provider: "simulation",
      endpoint: "",
      enabled: false
    },

    threads: {
      endpoint: "",
      enabled: false,
      approvalRequired: true
    },

    lynk: {
      storeUrl: "",
      enabled: false
    },

    telegram: {
      endpoint: "",
      enabled: false
    },

    whatsapp: {
      endpoint: "",
      enabled: false
    }
  }
};
