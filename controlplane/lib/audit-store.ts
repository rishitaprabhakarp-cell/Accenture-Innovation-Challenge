import { createClient } from "@supabase/supabase-js";
import { AuditEntry, DashboardStats, TrendPoint } from "./types";

// Server-side Supabase client (uses publishable key — safe for server routes)
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing");
  return createClient(url, key);
}

// Map snake_case DB row → camelCase AuditEntry
function rowToEntry(row: Record<string, unknown>): AuditEntry {
  return {
    id: row.id as string,
    timestamp: row.created_at as string,
    useCaseId: row.use_case_id as AuditEntry["useCaseId"],
    useCaseLabel: row.use_case_label as string,
    prompt: row.prompt as string,
    response: row.response as string,
    checkerResults: row.checker_results as AuditEntry["checkerResults"],
    compositeScore: row.composite_score as number,
    action: row.action as AuditEntry["action"],
    actionReason: row.action_reason as string,
    editedResponse: (row.edited_response as string | null) ?? undefined,
    pipelineLatencyMs: row.pipeline_latency_ms as number,
    overlappingRisks: (row.overlapping_risks as string[]) ?? [],
    feedback: (row.feedback as AuditEntry["feedback"]) ?? undefined,
    feedbackNote: (row.feedback_note as string | null) ?? undefined,
  };
}

export async function addAuditEntry(
  entry: Omit<AuditEntry, "id" | "timestamp">
): Promise<AuditEntry> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("audit_entries")
    .insert({
      use_case_id: entry.useCaseId,
      use_case_label: entry.useCaseLabel,
      prompt: entry.prompt,
      response: entry.response,
      checker_results: entry.checkerResults,
      composite_score: entry.compositeScore,
      action: entry.action,
      action_reason: entry.actionReason,
      edited_response: entry.editedResponse ?? null,
      pipeline_latency_ms: entry.pipelineLatencyMs,
      overlapping_risks: entry.overlappingRisks,
    })
    .select()
    .single();

  if (error) throw new Error(`addAuditEntry: ${error.message}`);
  return rowToEntry(data);
}

export async function getAuditEntries(options?: {
  limit?: number;
  offset?: number;
  useCaseId?: string;
  action?: string;
}): Promise<AuditEntry[]> {
  const supabase = getSupabase();
  let query = supabase
    .from("audit_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(options?.limit ?? 50);

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1
    );
  }
  if (options?.useCaseId) {
    query = query.eq("use_case_id", options.useCaseId);
  }
  if (options?.action) {
    query = query.eq("action", options.action);
  }

  const { data, error } = await query;
  if (error) throw new Error(`getAuditEntries: ${error.message}`);
  return (data ?? []).map(rowToEntry);
}

export async function getAuditEntry(id: string): Promise<AuditEntry | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("audit_entries")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return rowToEntry(data);
}

export async function updateFeedback(
  id: string,
  feedback: "correct" | "incorrect",
  note?: string
): Promise<AuditEntry | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("audit_entries")
    .update({ feedback, feedback_note: note ?? null })
    .eq("id", id)
    .select()
    .single();
  if (error) return null;
  return rowToEntry(data);
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = getSupabase();

  // Fetch recent 500 entries to compute all stats client-side
  // (avoids needing multiple round-trips or complex SQL aggregates via SDK)
  const { data: rows, error } = await supabase
    .from("audit_entries")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !rows) {
    return emptyStats();
  }

  const store = rows.map(rowToEntry);
  const total = store.length;
  if (total === 0) return emptyStats();

  const allowed = store.filter((e) => e.action === "allow").length;
  const edited = store.filter((e) => e.action === "edit").length;
  const flagged = store.filter((e) => e.action === "flag").length;
  const blocked = store.filter((e) => e.action === "block").length;
  const avgScore = store.reduce((s, e) => s + e.compositeScore, 0) / total;

  const withFeedback = store.filter((e) => e.feedback);
  const falsePositives = withFeedback.filter(
    (e) => e.feedback === "incorrect" && e.action !== "allow"
  ).length;
  const falseNegatives = withFeedback.filter(
    (e) => e.feedback === "incorrect" && e.action === "allow"
  ).length;
  const falsePositiveRate =
    withFeedback.length > 0 ? falsePositives / withFeedback.length : 0;
  const falseNegativeRate =
    withFeedback.length > 0 ? falseNegatives / withFeedback.length : 0;

  const piiHits = store.filter((e) =>
    e.checkerResults.some((r) => r.checker === "pii" && r.triggered)
  ).length;
  const hallucinationHits = store.filter((e) =>
    e.checkerResults.some((r) => r.checker === "hallucination" && r.triggered)
  ).length;
  const biasHits = store.filter((e) =>
    e.checkerResults.some((r) => r.checker === "bias" && r.triggered)
  ).length;
  const overlappingRisks = store.filter(
    (e) => e.overlappingRisks.length > 0
  ).length;

  const now = Date.now();
  const bucketMs = 10 * 60 * 1000;
  const trendData: TrendPoint[] = Array.from({ length: 12 }, (_, i) => {
    const bucketStart = now - (11 - i) * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const bucket = store.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      return t >= bucketStart && t < bucketEnd;
    });
    return {
      time: new Date(bucketStart).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      allow: bucket.filter((e) => e.action === "allow").length,
      edit: bucket.filter((e) => e.action === "edit").length,
      flag: bucket.filter((e) => e.action === "flag").length,
      block: bucket.filter((e) => e.action === "block").length,
      avgScore: bucket.length
        ? bucket.reduce((s, e) => s + e.compositeScore, 0) / bucket.length
        : 0,
    };
  });

  return {
    total,
    allowed,
    edited,
    flagged,
    blocked,
    avgScore,
    falsePositiveRate,
    falseNegativeRate,
    piiHits,
    hallucinationHits,
    biasHits,
    overlappingRisks,
    recentEntries: store.slice(0, 20),
    trendData,
  };
}

export async function clearAuditStore(): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("audit_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
}

function emptyStats(): DashboardStats {
  return {
    total: 0,
    allowed: 0,
    edited: 0,
    flagged: 0,
    blocked: 0,
    avgScore: 0,
    falsePositiveRate: 0,
    falseNegativeRate: 0,
    piiHits: 0,
    hallucinationHits: 0,
    biasHits: 0,
    overlappingRisks: 0,
    recentEntries: [],
    trendData: [],
  };
}
