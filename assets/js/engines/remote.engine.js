
import { BaseEngine } from "./engine.js";

export class RemoteEngine extends BaseEngine {
  constructor({ name = "remote", endpoint = "" } = {}) {
    super(name);
    this.endpoint = endpoint.replace(/\/+$/, "");
  }

  async request(path, body = {}) {
    if (!this.endpoint) {
      throw new Error("Backend API URL belum diatur.");
    }

    const response = await fetch(`${this.endpoint}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...body,
        client: "ai-company-dashboard",
        contractVersion: "1.0"
      })
    });

    if (!response.ok) {
      throw new Error(`Backend error: HTTP ${response.status}`);
    }

    return response.json();
  }

  async runCEO(command, context = {}) {
    return this.request("/api/company/ceo", {
      command,
      context
    });
  }

  async runTask(task, context = {}) {
    return this.request("/api/company/agent/run", {
      task,
      context
    });
  }

  async healthCheck() {
    if (!this.endpoint) {
      return {
        ok: false,
        engine: this.name,
        message: "Backend URL belum diatur."
      };
    }

    try {
      const response = await fetch(`${this.endpoint}/api/health`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      return await response.json();
    } catch (error) {
      return {
        ok: false,
        engine: this.name,
        message: error.message
      };
    }
  }
}
