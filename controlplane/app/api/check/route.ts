import { NextRequest, NextResponse } from "next/server";
import { runPiiChecker } from "@/lib/checkers/pii";
import { runHallucinationChecker } from "@/lib/checkers/hallucination";
import { runBiasChecker } from "@/lib/checkers/bias";
import { runDecisionEngine, applyEdit, buildAuditEntry } from "@/lib/decision-engine";
import { getPolicy } from "@/lib/policy";
import { addAuditEntry } from "@/lib/audit-store";
import { UseCaseId, CheckerResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { useCaseId, prompt, response, sourceDocs = [] } = body as {
    useCaseId: UseCaseId;
    prompt: string;
    response: string;
    sourceDocs: string[];
  };

  if (!useCaseId || !prompt || !response) {
    return NextResponse.json(
      { error: "useCaseId, prompt, and response are required" },
      { status: 400 }
    );
  }

  const policy = getPolicy(useCaseId);
  const pipelineStart = Date.now();

  // Run all checkers in parallel (respecting latency budget)
  const checkerPromises: Promise<CheckerResult>[] = [];

  if (!policy.skipCheckers.includes("pii")) {
    checkerPromises.push(runPiiChecker(response, sourceDocs));
  }
  if (!policy.skipCheckers.includes("hallucination")) {
    checkerPromises.push(runHallucinationChecker(response, sourceDocs));
  }
  if (!policy.skipCheckers.includes("bias")) {
    checkerPromises.push(runBiasChecker(response, sourceDocs));
  }

  const checkerResults = await Promise.all(checkerPromises);
  const pipelineLatencyMs = Date.now() - pipelineStart;

  const decision = runDecisionEngine(checkerResults, policy);

  let editedResponse: string | undefined;
  if (decision.action === "edit") {
    editedResponse = applyEdit(response, checkerResults);
  }

  const auditBase = buildAuditEntry({
    useCaseId,
    prompt,
    response,
    checkerResults,
    decision,
    pipelineLatencyMs,
    editedResponse,
  });

  const entry = await addAuditEntry(auditBase);

  return NextResponse.json({
    entryId: entry.id,
    action: decision.action,
    compositeScore: decision.compositeScore,
    actionReason: decision.actionReason,
    checkerResults,
    overlappingRisks: decision.overlappingRisks,
    editedResponse,
    pipelineLatencyMs,
    latencyBudgetMs: policy.latencyBudgetMs,
    withinBudget: pipelineLatencyMs <= policy.latencyBudgetMs,
  });
}
