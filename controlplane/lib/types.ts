export type UseCaseId = "customer-support" | "internal-knowledge" | "decision-support";

export type RiskAction = "allow" | "edit" | "flag" | "block";

export type CheckerName = "pii" | "hallucination" | "bias";

export interface CheckerResult {
  checker: CheckerName;
  score: number; // 0–1, higher = more risk
  triggered: boolean;
  details: string[];
  latencyMs: number;
}

export interface PolicyConfig {
  useCaseId: UseCaseId;
  label: string;
  description: string;
  latencyBudgetMs: number;
  riskTolerance: "low" | "medium" | "high";
  thresholds: {
    allow: number;  // score < this → allow
    edit: number;   // score < this → edit
    flag: number;   // score < this → flag
    // score >= flag threshold → block
  };
  weights: {
    pii: number;
    hallucination: number;
    bias: number;
  };
  skipCheckers: CheckerName[];
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  useCaseId: UseCaseId;
  useCaseLabel: string;
  prompt: string;
  response: string;
  checkerResults: CheckerResult[];
  compositeScore: number;
  action: RiskAction;
  actionReason: string;
  editedResponse?: string;
  pipelineLatencyMs: number;
  feedback?: "correct" | "incorrect";
  feedbackNote?: string;
  overlappingRisks: string[]; // e.g., ["hallucination+privacy"]
}

export interface UseCase {
  id: UseCaseId;
  label: string;
  icon: string;
  description: string;
  samples: SampleInteraction[];
}

export interface SampleInteraction {
  id: string;
  label: string;
  prompt: string;
  response: string;
  sourceDocs: string[];
  expectedAction: RiskAction;
  riskNotes: string;
}

export interface DashboardStats {
  total: number;
  allowed: number;
  edited: number;
  flagged: number;
  blocked: number;
  avgScore: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  piiHits: number;
  hallucinationHits: number;
  biasHits: number;
  overlappingRisks: number;
  recentEntries: AuditEntry[];
  trendData: TrendPoint[];
}

export interface TrendPoint {
  time: string;
  allow: number;
  edit: number;
  flag: number;
  block: number;
  avgScore: number;
}
