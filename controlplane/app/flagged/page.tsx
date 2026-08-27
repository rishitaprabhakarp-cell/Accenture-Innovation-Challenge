"use client";

import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, Ban, Clock, Filter } from "lucide-react";
import { AuditEntry } from "@/lib/types";
import { actionLabel, actionColor, formatScore, timeAgo, truncate, checkerLabel } from "@/lib/utils";
import Link from "next/link";

export default function FlaggedQueuePage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "flag" | "block">("all");

  const fetch_ = useCallback(async () => {
    const res = await fetch("/api/audit?limit=100");
    const data = await res.json();
    setEntries((data.entries ?? []).filter((e: AuditEntry) => e.action === "flag" || e.action === "block"));
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const shown = entries.filter((e) => filter === "all" || e.action === filter);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Flagged Queue</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Responses flagged or blocked for human review — {shown.length} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          {(["all", "flag", "block"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-xs font-semibold px-3 py-1.5 rounded-md capitalize transition-colors"
              style={{
                background: filter === f ? "#111827" : "var(--surface)",
                color: filter === f ? "white" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {f === "all" ? "All" : f === "flag" ? "Flagged" : "Blocked"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20" style={{ color: "var(--text-muted)" }}>Loading…</div>
      ) : shown.length === 0 ? (
        <div className="card p-16 text-center" style={{ color: "var(--text-muted)" }}>
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No items in queue — run checks in the simulator first</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                {["Timestamp (UTC)", "Use Case & Trace ID", "Risk Vector", "Confidence", "Decision", "Actor"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)", fontSize: "10px" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((entry) => {
                const topChecker = [...entry.checkerResults].sort((a, b) => b.score - a.score)[0];
                const riskVector = topChecker?.checker === "pii" ? "PII_LEAK_DETECT" : topChecker?.checker === "bias" ? "BIAS_DETECTED" : "HALLUCINATION";
                return (
                  <tr
                    key={entry.id}
                    className="table-row-hover cursor-pointer"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <td className="px-5 py-3.5 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(entry.timestamp).toISOString().replace("T", " ").slice(0, 19)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{truncate(entry.useCaseLabel, 18)}...</div>
                      <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>TRC-{entry.id.slice(0, 6).toUpperCase()}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded"
                        style={{
                          background: topChecker?.checker === "pii" ? "#fef2f2" : topChecker?.checker === "bias" ? "#f5f3ff" : "#fffbeb",
                          color: topChecker?.checker === "pii" ? "#dc2626" : topChecker?.checker === "bias" ? "#7c3aed" : "#b45309",
                        }}
                      >
                        {riskVector}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full" style={{ width: `${entry.compositeScore * 100}%`, background: actionColor(entry.action) }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: actionColor(entry.action) }}>{formatScore(entry.compositeScore)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge badge-${entry.action}`}>{actionLabel(entry.action)}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/flagged/${entry.id}`}
                        className="text-xs font-semibold hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        Review →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
