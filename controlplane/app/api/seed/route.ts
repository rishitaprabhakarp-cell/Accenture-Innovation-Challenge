import { NextResponse } from "next/server";
import { USE_CASES } from "@/lib/use-cases";
import { getPolicy } from "@/lib/policy";
import { runPiiChecker } from "@/lib/checkers/pii";
import { runHallucinationChecker } from "@/lib/checkers/hallucination";
import { runBiasChecker } from "@/lib/checkers/bias";
import { runDecisionEngine, applyEdit, buildAuditEntry } from "@/lib/decision-engine";
import { addAuditEntry, clearAuditStore } from "@/lib/audit-store";

export async function POST() {
  await clearAuditStore();

  const results = [];
  for (const uc of USE_CASES) {
    for (const sample of uc.samples) {
      const policy = getPolicy(uc.id);
      const [piiResult, halResult, biasResult] = await Promise.all([
        runPiiChecker(sample.response, sample.sourceDocs),
        runHallucinationChecker(sample.response, sample.sourceDocs),
        runBiasChecker(sample.response, sample.sourceDocs),
      ]);
      const checkerResults = [piiResult, halResult, biasResult];
      const decision = runDecisionEngine(checkerResults, policy);
      const editedResponse =
        decision.action === "edit" ? applyEdit(sample.response, checkerResults) : undefined;

      const entry = await addAuditEntry(
        buildAuditEntry({
          useCaseId: uc.id,
          prompt: sample.prompt,
          response: sample.response,
          checkerResults,
          decision,
          pipelineLatencyMs: Math.floor(Math.random() * 180) + 40,
          editedResponse,
        })
      );
      results.push({ id: entry.id, action: entry.action, score: entry.compositeScore });
    }
  }

  return NextResponse.json({ seeded: results.length, results });
}
