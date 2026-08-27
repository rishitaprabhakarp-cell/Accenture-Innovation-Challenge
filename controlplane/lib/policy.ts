import { PolicyConfig, UseCaseId } from "./types";

const DEFAULT_POLICIES: Record<UseCaseId, PolicyConfig> = {
  "customer-support": {
    useCaseId: "customer-support",
    label: "Customer Support AI",
    description: "Customer-facing chatbot with strict latency and brand-safety requirements",
    latencyBudgetMs: 300,
    riskTolerance: "low",
    thresholds: {
      allow: 0.25,
      edit: 0.50,
      flag: 0.70,
      // block above 0.70
    },
    weights: {
      pii: 0.50,        // highest weight — brand / legal liability
      hallucination: 0.30,
      bias: 0.20,
    },
    skipCheckers: [],
  },
  "internal-knowledge": {
    useCaseId: "internal-knowledge",
    label: "Internal Knowledge Assistant",
    description: "Employee copilot with higher latency tolerance and data governance focus",
    latencyBudgetMs: 1500,
    riskTolerance: "medium",
    thresholds: {
      allow: 0.30,
      edit: 0.55,
      flag: 0.72,
    },
    weights: {
      pii: 0.35,
      hallucination: 0.40,  // highest weight — factual accuracy in internal tools
      bias: 0.25,
    },
    skipCheckers: [],
  },
  "decision-support": {
    useCaseId: "decision-support",
    label: "Decision Support Tool",
    description: "Regulated workflow with maximum caution, full audit trail, human-in-loop for flags",
    latencyBudgetMs: 5000,
    riskTolerance: "low",
    thresholds: {
      allow: 0.20,
      edit: 0.40,
      flag: 0.55,
      // block above 0.55 — extremely conservative
    },
    weights: {
      pii: 0.35,
      hallucination: 0.35,
      bias: 0.30,           // regulatory bias risk is critical in lending/insurance
    },
    skipCheckers: [],
  },
};

// Global mutable policy store (server-side singleton)
let policyStore: Record<UseCaseId, PolicyConfig> = { ...DEFAULT_POLICIES };

export function getPolicy(useCaseId: UseCaseId): PolicyConfig {
  return policyStore[useCaseId] ?? DEFAULT_POLICIES[useCaseId];
}

export function getAllPolicies(): Record<UseCaseId, PolicyConfig> {
  return policyStore;
}

export function updatePolicy(useCaseId: UseCaseId, update: Partial<PolicyConfig>): PolicyConfig {
  policyStore[useCaseId] = { ...policyStore[useCaseId], ...update };
  return policyStore[useCaseId];
}

export function resetPolicy(useCaseId: UseCaseId): PolicyConfig {
  policyStore[useCaseId] = { ...DEFAULT_POLICIES[useCaseId] };
  return policyStore[useCaseId];
}

export function resetAllPolicies() {
  policyStore = { ...DEFAULT_POLICIES };
}
