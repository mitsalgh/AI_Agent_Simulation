
export class BaseEngine {
  constructor(name) {
    this.name = name;
  }

  async runTask(task, context = {}) {
    throw new Error(`${this.name} belum mengimplementasikan runTask().`);
  }

  async runCEO(command, context = {}) {
    throw new Error(`${this.name} belum mengimplementasikan runCEO().`);
  }

  async healthCheck() {
    return {
      ok: false,
      engine: this.name,
      message: "Health check belum tersedia."
    };
  }
}
