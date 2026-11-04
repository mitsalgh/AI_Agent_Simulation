
import { BaseEngine } from "./engine.js";
import {
  createBusinessPlan,
  generateAgentResult,
  generateCEOReport
} from "../simulation/business.simulator.js";

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class SimulationEngine extends BaseEngine {
  constructor() {
    super("simulation");
    this.plan = null;
    this.results = {};
  }

  async runCEO(command, context = {}) {
    await wait(1200);

    this.plan = createBusinessPlan(command);
    this.results = {};

    return {
      engine: this.name,
      type: "simulation",
      summary: `CEO membuat rencana bisnis untuk ${this.plan.targetMarket}.`,
      plan: this.plan,
      decision: "CEO akan membagi pekerjaan kepada departemen yang relevan.",
      limitations: "Skenario ini menggunakan asumsi simulasi."
    };
  }

  async runTask(task, context = {}) {
    const duration = {
      ceo: 1000,
      research: 2200,
      product: 2200,
      qa: 1600,
      content: 2000,
      sales: 1600,
      finance: 1800
    }[task.agentId] || 1200;

    await wait(duration);

    const plan = context.plan || this.plan ||
      createBusinessPlan(task.description);

    const result = generateAgentResult(
      task.agentId,
      plan,
      task.description
    );

    this.results[task.agentId] = result;

    return {
      engine: this.name,
      type: "simulation",
      taskId: task.id,
      agentId: task.agentId,
      result,
      limitations: "Hasil berdasarkan aturan dan asumsi simulasi, bukan data pasar aktual."
    };
  }

  createFinalReport(plan = this.plan) {
    return generateCEOReport(plan, this.results);
  }

  async healthCheck() {
    return {
      ok: true,
      engine: this.name,
      message: "Simulation Engine siap."
    };
  }
}
