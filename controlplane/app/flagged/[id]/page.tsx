"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { AuditEntry } from "@/lib/types";
import { actionColor, formatScore, checkerLabel } from "@/lib/utils";

// Highlight PII-like tokens in text
function HighlightedText({ text, checkerResults }: { text: string; checkerResults: AuditEntry["checkerResults"] }) {
  const piiResult = checkerResults.find((r) => r.checker === "pii");
  const halResult = checkerResults.find((r) => r.checker === "hallucination");
  if (!piiResult?.triggered && !halResult?.triggered) {
    return <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>{text}</p>;
  }

  // Simple highlight: detect email, SSN, full names, numbers
  const parts: Array<{ text: string; highlight: "pii" | "hal" | null }> = [];
  const piiRegex = /(\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b|\b\d{3}-\d{2}-\d{4}\b|\b[A-Z][a-z]+\s+[A-Z][a-z]+\b(?=\s+\()|Jane\s+Doe|John\s+Smith|Patricia\s+Williams|\$[\d,.]+\s+(?:AI|product|revenue)[^\n.]*)/g;
  const halRegex = /(\b(?:120-day|January\s+1,?\s+\d{4}|automatic(?:ally)?\s+declin|5-year\s+re-application|20%\s+off|\$50M)\b[^.!?]*[.!?]?)/gi;

  let last = 0;
  const combined: Array<{ start: number; end: number; type: "pii" | "hal" }> = [];

  for (const m of text.matchAll(piiRegex)) {
    combined.push({ start: m.index!, end: m.index! + m[0].length, type: "pii" });
  }
  for (const m of text.matchAll(halRegex)) {
    combined.push({ start: m.index!, end: m.index! + m[0].length, type: "hal" });
  }
  combined.sort((a, b) => a.start - b.start);

  for (const { start, end, type } of combined) {
    if (start > last) parts.push({ text: text.slice(last, start), highlight: null });
    parts.push({ text: text.slice(start, end), highlight: type });
    last = end;
  }
  if (last < text.length) parts.push({ text: text.slice(last), highlight: null });

  return (
    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
      {parts.map((p, i) =>
        p.highlight ? (
          <mark
            key={i}
            style={{
              background: p.highlight === "pii" ? "#fee2e2" : "#fef9c3",
              color: p.highlight === "pii" ? "#991b1b" : "#92400e",
              borderRadius: 2,
              padding: "1px 2px",
            }}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

export default function FlaggedDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [entry, setEntry] = useState<AuditEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [feedbackSent, setFeedbackSent] = useState<"correct" | "incorrect" | null>(null);

  useEffect(() => {
    fetch(`/api/audit?limit=200`)
      .then((r) => r.json())
      .then((d) => {
        const found = (d.entries ?? []).find((e: AuditEntry) => e.id === id);
        setEntry(found ?? null);
        if (found?.feedback) setFeedbackSent(found.feedback);
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function sendFeedback(fb: "correct" | "incorrect") {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entryId: id, feedback: fb, note }),
    });
    setFeedbackSent(fb);
  }

  if (loading) return <div className="flex items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>Loading…</div>;
  if (!entry) return <div className="p-8" style={{ color: "var(--text-muted)" }}>Interaction not found.</div>;

  const isHigh = entry.compositeScore >= 0.65;
  const color = actionColor(entry.action);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 flex items-center gap-4" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-xs font-medium hover:underline" style={{ color: "var(--text-muted)" }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Flagged Queue
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-screen-lg mx-auto">
          {/* Title row */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                Interaction ID:{" "}
                <span style={{ color: "#ea580c" }}>0x{entry.id.slice(0, 8).toUpperCase()}</span>
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Model: GPT-4-Enterprise &nbsp;·&nbsp; Timestamp: {new Date(entry.timestamp).toISOString()}
              </p>
            </div>
            <span
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md"
              style={{ background: isHigh ? "#fef2f2" : "#fffbeb", color: isHigh ? "#dc2626" : "#b45309", border: `1.5px solid ${isHigh ? "#fecaca" : "#fde68a"}` }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              {isHigh ? "HIGH RISK BLOCK" : "MEDIUM RISK FLAG"}
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: prompt + response */}
            <div className="lg:col-span-2 space-y-4">
              {/* Prompt */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>👤</div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>User Prompt</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{entry.prompt}</p>
              </div>

              {/* Response */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>🤖</div>
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>AI Response</span>
                </div>
                <HighlightedText text={entry.response} checkerResults={entry.checkerResults} />
              </div>
            </div>

            {/* Right: policy breakdown */}
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Policy Breakdown</span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {entry.checkerResults.map((r) => {
                    const status = r.score >= 0.5 ? "FAILED" : r.score >= 0.2 ? "WARNING" : "PASSED";
                    const statusColor = status === "FAILED" ? "#dc2626" : status === "WARNING" ? "#d97706" : "#16a34a";
                    const statusBg = status === "FAILED" ? "#fef2f2" : status === "WARNING" ? "#fffbeb" : "#f0fdf4";
                    const detail = r.details.find((d) => !d.startsWith("No ") && !d.startsWith("All ")) ?? r.details[0];
                    return (
                      <div key={r.checker} className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{checkerLabel(r.checker)}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: statusBg, color: statusColor }}>{status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                            <div className="h-full rounded-full" style={{ width: `${r.score * 100}%`, background: statusColor }} />
                          </div>
                          <span className="text-xs font-bold flex-shrink-0" style={{ color: statusColor }}>{formatScore(r.score)}</span>
                        </div>
                        {detail && (
                          <p className="text-[11px] rounded-md p-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>{detail}</p>
                        )}
                        <button className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>VIEW POLICY</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reviewer notes */}
              <div className="card p-4">
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Reviewer Notes</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter justification or audit notes..."
                  rows={3}
                  className="w-full text-xs rounded-md p-2.5 resize-none outline-none"
                  style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "var(--surface-2)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="px-6 py-4 flex items-center gap-4"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        {/* Composite score */}
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{
              border: `3px solid ${color}`,
              color,
            }}
          >
            {Math.round(entry.compositeScore * 100)}
          </div>
          <div>
            <div className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>COMPOSITE RISK</div>
            <div className="text-xs font-bold" style={{ color }}>
              {entry.compositeScore >= 0.75 ? "CRITICAL" : entry.compositeScore >= 0.55 ? "HIGH" : "MEDIUM"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            ✏ EDIT RESPONSE
          </button>
          <button className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            ↑ ESCALATE
          </button>
          {feedbackSent ? (
            <span className="text-xs font-semibold px-4 py-2 rounded-md" style={{ background: "#f0fdf4", color: "#16a34a" }}>
              ✓ {feedbackSent === "correct" ? "Confirmed" : "Overridden"}
            </span>
          ) : (
            <>
              <button
                onClick={() => sendFeedback("correct")}
                className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-md text-white"
                style={{ background: "#dc2626" }}
              >
                <XCircle className="w-3.5 h-3.5" />
                CONFIRM BLOCK
              </button>
              <button
                onClick={() => sendFeedback("incorrect")}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-md"
                style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                APPROVE & RELEASE
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
