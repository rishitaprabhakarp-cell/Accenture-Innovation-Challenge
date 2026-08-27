"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, Download, FileText, TrendingUp, Shield, Users, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, Trash2 } from "lucide-react";
import { AuditEntry, DashboardStats } from "@/lib/types";
import { actionLabel, actionColor, formatScore, timeAgo, truncate, riskVectorLabel, checkerLabel } from "@/lib/utils";

function StatCard({ label, value, sub, delta }: { label: string; value: string | number; sub?: string; delta?: string }) {
  return (
    <div className="card p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>{label}</p>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{value}</span>
        {delta && <span className="text-xs font-bold mb-0.5 text-emerald-600 flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />{delta}</span>}
      </div>
      {/* Mini spark */}
      <div className="flex items-end gap-0.5 mt-2 h-5">
        {[2, 3, 2, 4, 5, 3, 6, 4, 7, 5, 6, 8].map((v, i) => (
          <div key={i} className="flex-1 rounded-sm" style={{ height: `${v * 10}%`, background: "var(--border-strong)" }} />
        ))}
      </div>
      {sub && <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>{sub}</p>}
    </div>
  );
}

function AuditRow({ entry, onFeedback }: { entry: AuditEntry; onFeedback: (id: string, fb: "correct" | "incorrect") => void }) {
  const [expanded, setExpanded] = useState(false);
  const color = actionColor(entry.action);
  const riskVec = riskVectorLabel(entry);
  const vecColor = riskVec === "PII_LEAK_DETECT" ? "#dc2626" : riskVec === "BIAS_DETECTED" ? "#7c3aed" : riskVec === "HALLUCINATION" ? "#d97706" : "#6b7280";

  return (
    <>
      <tr
        className="table-row-hover cursor-pointer"
        style={{ borderBottom: "1px solid var(--border)" }}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3.5 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex items-center gap-1">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            {new Date(entry.timestamp).toISOString().replace("T", " ").slice(0, -5)}
          </div>
        </td>
        <td className="px-4 py-3.5">
          <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{truncate(entry.useCaseLabel, 16)}...</div>
          <div className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>TRC-{entry.id.slice(0, 6).toUpperCase()}-{entry.id.slice(6, 10).toUpperCase()}</div>
        </td>
        <td className="px-4 py-3.5">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded"
            style={{ background: `${vecColor}10`, color: vecColor }}
          >
            {riskVec}
          </span>
        </td>
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div className="h-full rounded-full" style={{ width: `${entry.compositeScore * 100}%`, background: color }} />
            </div>
            <span className="text-xs font-bold" style={{ color }}>{formatScore(entry.compositeScore)}</span>
          </div>
        </td>
        <td className="px-4 py-3.5">
          <span className={`badge badge-${entry.action}`}>{actionLabel(entry.action)}</span>
          {entry.feedback === "incorrect" && (
            <span className="ml-1.5 badge badge-overridden" style={{ fontSize: 9 }}>OVERRIDDEN</span>
          )}
        </td>
        <td className="px-4 py-3.5 text-xs" style={{ color: "var(--text-muted)" }}>
          {entry.feedback ? (
            <span style={{ color: entry.feedback === "correct" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
              {entry.feedback === "correct" ? "✓ Policy Engine" : "✗ Human Override"}
            </span>
          ) : (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => onFeedback(entry.id, "correct")} className="p-1 rounded hover:bg-emerald-50">
                <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />
              </button>
              <button onClick={() => onFeedback(entry.id, "incorrect")} className="p-1 rounded hover:bg-red-50">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
              </button>
            </div>
          )}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: "var(--surface-2)" }}>
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Prompt</p>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{entry.prompt}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Response</p>
                  <p className="text-xs rounded-md p-2.5 whitespace-pre-wrap" style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {entry.editedResponse ?? entry.response}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Checker Scores</p>
                  <div className="space-y-1.5">
                    {entry.checkerResults.map((r) => (
                      <div key={r.checker} className="flex items-center justify-between px-2.5 py-1.5 rounded-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{checkerLabel(r.checker)}</span>
                        <span className="text-xs font-bold" style={{ color: r.triggered ? actionColor("block") : "#16a34a" }}>{formatScore(r.score)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Decision Reason</p>
                  <p className="text-xs rounded-md p-2.5" style={{ background: "var(--surface)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                    {entry.actionReason}
                  </p>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditTrailPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    const [entriesRes, statsRes] = await Promise.all([
      fetch("/api/audit?limit=100"),
      fetch("/api/audit?mode=stats"),
    ]);
    const eData = await entriesRes.json();
    const sData = await statsRes.json();
    setEntries(eData.entries ?? []);
    setStats(sData);
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  async function sendFeedback(id: string, fb: "correct" | "incorrect") {
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entryId: id, feedback: fb }) });
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, feedback: fb } : e));
  }

  async function clearAll() {
    if (!confirm("Clear all audit entries?")) return;
    await fetch("/api/audit", { method: "DELETE" });
    setEntries([]);
    setStats(null);
  }

  const filtered = entries.filter((e) =>
    !search || e.prompt.toLowerCase().includes(search.toLowerCase()) || e.useCaseLabel.toLowerCase().includes(search.toLowerCase()) || e.id.includes(search)
  );

  return (
    <div className="p-6 max-w-screen-2xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>System Audit Trail</h1>
          <p className="text-xs mt-1 max-w-2xl" style={{ color: "var(--text-muted)" }}>
            Verifiable log of all automated policy decisions, human-in-the-loop interventions, and model behavior anomalies across production environments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <Download className="w-3.5 h-3.5" />
            EXPORT CSV
          </button>
          <button className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-md text-white" style={{ background: "#111827" }}>
            <FileText className="w-3.5 h-3.5" />
            GENERATE REPORT
          </button>
          <button onClick={clearAll} className="p-2 rounded-md hover:bg-red-50 transition-colors">
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Decisions (24h)" value={stats?.total.toLocaleString() ?? "0"} delta="+12%" />
        <StatCard label="Auto-Blocked" value={stats?.blocked.toLocaleString() ?? "0"} delta="↑4.2%" sub="High confidence blocks" />
        <StatCard label="Manual Reviews" value={stats?.flagged.toLocaleString() ?? "0"} sub="-2.1% vs prior period" />
        <div className="card p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Chain of Custody Status</p>
          <div className="flex items-center gap-1.5 mb-3">
            <Shield className="w-4 h-4" style={{ color: "var(--text-primary)" }} />
            <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Verified</span>
          </div>
          <div className="space-y-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
            <div className="flex justify-between"><span>LAST HASH:</span><span className="font-mono">a8f9…3b21</span></div>
            <div className="flex justify-between"><span>BLOCK HEIGHT:</span><span className="font-mono">{entries.length.toLocaleString()}</span></div>
          </div>
        </div>
      </div>

      {/* Search + table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 flex-1 max-w-md px-3 py-2 rounded-md" style={{ border: "1px solid var(--border)", background: "var(--surface-2)" }}>
            <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trace IDs, user prompts, or reviewer notes..."
              className="flex-1 text-xs bg-transparent outline-none"
              style={{ color: "var(--text-primary)" }}
            />
          </div>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            Showing 1–{Math.min(filtered.length, 25)} of {filtered.length.toLocaleString()} records
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16" style={{ color: "var(--text-muted)" }}>Loading…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--border)" }}>
                  {["Timestamp (UTC)", "Use Case & Trace ID", "Risk Vector", "Confidence", "Decision", "Actor"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)", fontSize: "10px" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>No entries found</td></tr>
                ) : (
                  filtered.slice(0, 25).map((entry) => (
                    <AuditRow key={entry.id} entry={entry} onFeedback={sendFeedback} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 25 && (
          <div className="px-4 py-3 flex items-center justify-between text-xs" style={{ borderTop: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <span>Showing 1–25 of {filtered.length} records &nbsp;|&nbsp; Rows per page: 25 ▾</span>
            <div className="flex items-center gap-1">
              {["|<", "<", "1", "2", "3", "...", `${Math.ceil(filtered.length / 25)}`, ">", ">|"].map((p, i) => (
                <button key={i} className="w-6 h-6 text-xs rounded flex items-center justify-center" style={{ background: p === "1" ? "#111827" : "transparent", color: p === "1" ? "white" : "var(--text-muted)" }}>{p}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
