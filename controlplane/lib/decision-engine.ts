import { CheckerResult, PolicyConfig, RiskAction, AuditEntry, UseCaseId } from "./types";
import { getUseCase } from "./use-cases";

export interface DecisionOutput {
  compositeScore: number;
  action: RiskAction;
  actionReason: string;
  overlappingRisks: string[];
  editedResponse?: string;
}

// Detect overlapping risk categories (e.g., hallucination + PII simultaneously triggered)
function detectOverlappingRisks(results: CheckerResult[]): string[] {
  const triggered = results.filter((r) => r.triggered && r.score > 0.20);
  const names = triggered.map((r) => r.checker);
  const overlaps: string[] = [];

  if (names.includes("hallucination") && names.includes("pii")) {
    overlaps.push("hallucination+privacy — fabricated detail about a person");
  }
  if (names.includes("bias") && names.includes("pii")) {
    overlaps.push("bias+privacy — discriminatory use of personal data");
  }
  if (names.includes("bias") && names.includes("hallucination")) {
    overlaps.push("bias+hallucination — fabricated statistics used for discriminatory inference");
  }
  if (names.length >= 3) {
    overlaps.push("triple-overlap: PII + hallucination + bias all triggered");
  }

  return overlaps;
}

// Apply policy weights to get composite score
function computeCompositeScore(
  results: CheckerResult[],
  policy: PolicyConfig
): number {
  const byChecker = Object.fromEntries(results.map((r) => [r.checker, r.score]));
  const { pii, hallucination, bias } = policy.weights;

  const weighted =
    (byChecker["pii"] ?? 0) * pii +
    (byChecker["hallucination"] ?? 0) * hallucination +
    (byChecker["bias"] ?? 0) * bias;

  // Overlap amplification: if 2+ checkers trigger, apply a 15% amplifier
  const triggeredCount = results.filter((r) => r.triggered && r.score > 0.20).length;
  const amplifier = triggeredCount >= 2 ? 1.15 : 1.0;

  return Math.min(weighted * amplifier, 1.0);
}

// Map composite score to tiered action using policy thresholds
function mapToAction(score: number, policy: PolicyConfig): RiskAction {
  const { allow, edit, flag } = policy.thresholds;
  if (score < allow) return "allow";
  if (score < edit) return "edit";
  if (score < flag) return "flag";
  return "block";
}

// Generate a human-readable reason for the action
function buildActionReason(
  action: RiskAction,
  score: number,
  results: CheckerResult[],
  overlaps: string[]
): string {
  const triggered = results.filter((r) => r.triggered && r.score > 0.15);

  if (action === "allow") {
    return `Composite risk score ${(score * 100).toFixed(0)}% is within acceptable range. No significant risk flags triggered.`;
  }

  const reasons = triggered.map((r) => {
    const pct = (r.score * 100).toFixed(0);
    const names: Record<string, string> = {
      pii: "PII/privacy risk",
      hallucination: "hallucination/grounding risk",
      bias: "bias/fairness risk",
    };
    return `${names[r.checker] ?? r.checker} (${pct}%)`;
  });

  const baseReason = `Composite score ${(score * 100).toFixed(0)}% triggered by: ${reasons.join(", ")}.`;

  if (overlaps.length > 0) {
    return `${baseReason} Overlapping risks detected: ${overlaps.join("; ")}.`;
  }

  const actionDesc: Record<RiskAction, string> = {
    allow: "",
    edit: " Response has been flagged for automated editing before delivery.",
    flag: " Response held for human review before delivery.",
    block: " Response blocked. Must not be delivered to end user.",
  };

  return baseReason + (actionDesc[action] ?? "");
}

// Produce an "edited" version of a response by redacting detected PII
function generateEditedResponse(
  response: string,
  results: CheckerResult[]
): string | undefined {
  const piiResult = results.find((r) => r.checker === "pii");
  if (!piiResult || !piiResult.triggered) return undefined;

  let edited = response;

  // Redact SSNs
  edited = edited.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[SSN REDACTED]");
  // Redact credit card numbers
  edited = edited.replace(
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g,
    "[CARD REDACTED]"
  );
  // Redact emails
  edited = edited.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    "[EMAIL REDACTED]"
  );
  // Redact phone numbers
  edited = edited.replace(
    /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    "[PHONE REDACTED]"
  );
  // Redact DOB patterns
  edited = edited.replace(
    /\b(?:DOB|date of birth|born on|birth date)[:\s]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/gi,
    "[DOB REDACTED]"
  );
  // Redact salary
  edited = edited.replace(
    /\b(?:salary|base salary)[:\s]+\$[\d,]+\b/gi,
    "[SALARY REDACTED]"
  );
  // Redact bonus
  edited = edited.replace(
    /\b(?:bonus|projected bonus)[:\s]+\$[\d,]+\b/gi,
    "[COMPENSATION REDACTED]"
  );

  return edited !== response ? edited : undefined;
}

export function runDecisionEngine(
  results: CheckerResult[],
  policy: PolicyConfig
): DecisionOutput {
  const compositeScore = computeCompositeScore(results, policy);
  const action = mapToAction(compositeScore, policy);
  const overlappingRisks = detectOverlappingRisks(results);
  const actionReason = buildActionReason(action, compositeScore, results, overlappingRisks);

  let editedResponse: string | undefined;
  // For "edit" actions, try to auto-redact PII
  if (action === "edit") {
    // We need the response — pass it separately; handled at call site
  }

  return { compositeScore, action, actionReason, overlappingRisks, editedResponse };
}

export function applyEdit(response: string, results: CheckerResult[]): string | undefined {
  return generateEditedResponse(response, results);
}

export function buildAuditEntry(params: {
  useCaseId: UseCaseId;
  prompt: string;
  response: string;
  checkerResults: CheckerResult[];
  decision: DecisionOutput;
  pipelineLatencyMs: number;
  editedResponse?: string;
}): Omit<AuditEntry, "id" | "timestamp"> {
  const uc = getUseCase(params.useCaseId);
  return {
    useCaseId: params.useCaseId,
    useCaseLabel: uc?.label ?? params.useCaseId,
    prompt: params.prompt,
    response: params.response,
    checkerResults: params.checkerResults,
    compositeScore: params.decision.compositeScore,
    action: params.decision.action,
    actionReason: params.decision.actionReason,
    editedResponse: params.editedResponse,
    pipelineLatencyMs: params.pipelineLatencyMs,
    overlappingRisks: params.decision.overlappingRisks,
  };
}
