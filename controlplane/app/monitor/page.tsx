"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Pause, Play, Download, Loader2, CheckCircle2, Ban, AlertTriangle, Clock } from "lucide-react";
import { AuditEntry, RiskAction, UseCaseId } from "@/lib/types";
import { actionLabel, actionColor, timeAgo, truncate, checkerLabel, formatScore } from "@/lib/utils";
import { USE_CASES } from "@/lib/use-cases";
import Link from "next/link";

const STATUS_CONFIG: Record<RiskAction, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  allow:  { label: "Passed",  icon: CheckCircle2, color: "#16a34a", bg: "#f0fdf4" },
  edit:   { label: "Edited",  icon: CheckCircle2, color: "#64748b", bg: "#f8fafc" },
  flag:   { label: "Flagged (Queued)", icon: AlertTriangle, color: "#b45309", bg: "#fffbeb" },
  block:  { label: "Blocked", icon: Ban, color: "#dc2626", bg: "#fef2f2" },
};

const USE_CASE_LABELS: Record<string, string> = {
  "customer-support": "Customer Support Bot",
  "internal-knowledge": "Internal Knowledge Search",
  "decision-support": "Decision Support Tool",
};

function EventCard({ entry }: { entry: AuditEntry }) {
  const cfg = STATUS_CONFIG[entry.action];
  const Icon = cfg.icon;
  const triggeredCheckers = entry.checkerResults.filter((r) => r.triggered);
  const passedCheckers = entry.checkerResults.filter((r) => !r.triggered);

  return (
    <div
      className="card slide-in overflow-hidden"
      style={{ borderLeft: `3px solid ${cfg.color}` }}
    >
      {/* Card header */}
      <div className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
          style={{ background: "#111827", color: "#9ca3af" }}
        >
          {USE_CASE_LABELS[entry.useCaseId] ?? entry.useCaseLabel}
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
          ID: req_{entry.id.slice(0, 6)}
        </span>
        <Clock className="w-3 h-3 ml-1" style={{ color: "var(--text-faint)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(entry.timestamp)}</span>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md"
            style={{ background: cfg.bg, color: cfg.color }}
          >
            <Icon className="w-3 h-3" />
            {cfg.label.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>Prompt</p>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>"{truncate(entry.prompt, 120)}"</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-faint)" }}>
            {entry.action === "block" ? "Response Withheld" : "Generated Response"}
          </p>
          {entry.action === "block" ? (
            <p className="text-sm font-bold" style={{ color: "#dc2626" }}>RESPONSE WITHHELD</p>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{truncate(entry.editedResponse ?? entry.response, 120)}</p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 flex items-center gap-3 flex-wrap" style={{ borderTop: "1px solid var(--border)", background: "var(--surface-2)" }}>
        {triggeredCheckers.length > 0 ? (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
              {entry.action === "block" ? "Violations:" : "Warnings:"}
            </span>
            {triggeredCheckers.map((r) => (
              <span
                key={r.checker}
                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: entry.action === "block" ? "#fef2f2" : "#fffbeb",
                  color: entry.action === "block" ? "#dc2626" : "#b45309",
                  border: `1px solid ${entry.action === "block" ? "#fecaca" : "#fde68a"}`,
                }}
              >
                {entry.action !== "allow" && <AlertTriangle className="w-3 h-3" />}
                {checkerLabel(r.checker)} ({formatScore(r.score)})
              </span>
            ))}
          </>
        ) : (
          <>
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>Evaluations:</span>
            {passedCheckers.map((r) => (
              <span key={r.checker} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
                <CheckCircle2 className="w-3 h-3" />
                {checkerLabel(r.checker)} (Passed)
              </span>
            ))}
          </>
        )}
        {entry.action === "flag" && (
          <div className="ml-auto flex items-center gap-3">
            <button className="text-xs font-semibold" style={{ color: "#16a34a" }}>Approve Override</button>
            <button className="text-xs font-semibold" style={{ color: "#dc2626" }}>Reject</button>
          </div>
        )}
        {(entry.action === "block" || entry.action === "flag") && (
          <Link href={`/flagged/${entry.id}`} className="ml-auto text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>
            View Detail →
          </Link>
        )}
      </div>
    </div>
  );
}

export default function MonitorPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [paused, setPaused] = useState(false);
  const [useCaseFilter, setUseCaseFilter] = useState<string>("");
  const [actionFilters, setActionFilters] = useState({ allow: true, flag: true, block: true });
  const [thresholdFilter, setThresholdFilter] = useState(0);
  const [avgLatency, setAvgLatency] = useState(0);
  const [counts, setCounts] = useState({ passed: 0, flagged: 0, blocked: 0, checking: 0 });
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const fetch_ = useCallback(async () => {
    const params = new URLSearchParams({ limit: "40" });
    if (useCaseFilter) params.set("useCaseId", useCaseFilter);
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    const all: AuditEntry[] = data.entries ?? [];
    setEntries(all);
    setAvgLatency(all.length ? Math.round(all.reduce((s, e) => s + e.pipelineLatencyMs, 0) / all.length) : 0);
    setCounts({
      passed: all.filter((e) => e.action === "allow").length,
      flagged: all.filter((e) => e.action === "flag").length,
      blocked: all.filter((e) => e.action === "block").length,
      checking: 0,
    });
  }, [useCaseFilter]);

  useEffect(() => {
    fetch_();
    const t = setInterval(() => { if (!pausedRef.current) fetch_(); }, 4000);
    return () => clearInterval(t);
  }, [fetch_]);

  const filteredEntries = entries.filter((e) => {
    if (!actionFilters.allow && e.action === "allow") return false;
    if (!actionFilters.flag && (e.action === "flag" || e.action === "edit")) return false;
    if (!actionFilters.block && e.action === "block") return false;
    if (e.compositeScore * 100 < thresholdFilter) return false;
    return true;
  });

  const toggleAction = (key: keyof typeof actionFilters) =>
    setActionFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex h-full overflow-hidden">
      {/* Main feed */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Live Monitor</h1>
          <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse" />
            STREAMING
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setPaused(!paused)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: paused ? "#fef2f2" : "var(--surface)" }}
            >
              {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              {paused ? "RESUME FEED" : "PAUSE FEED"}
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md text-white" style={{ background: "#111827" }}>
              <Download className="w-3.5 h-3.5" />
              EXPORT CSV
            </button>
          </div>
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="w-8 h-8 animate-spin mb-3 opacity-30" />
              <p className="text-sm">No events — go to the Simulator to generate checks</p>
            </div>
          ) : (
            filteredEntries.map((entry) => <EventCard key={entry.id} entry={entry} />)
          )}
          {filteredEntries.length > 0 && (
            <button className="w-full py-3 text-xs font-semibold" style={{ color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8 }}>
              LOAD MORE PAST EVENTS
            </button>
          )}
        </div>
      </div>

      {/* Filter sidebar */}
      <div className="w-64 flex-shrink-0 overflow-y-auto" style={{ borderLeft: "1px solid var(--border)", background: "var(--surface)" }}>
        <div className="px-4 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Filters</span>
            <button className="text-xs" style={{ color: "var(--accent)" }} onClick={() => { setUseCaseFilter(""); setActionFilters({ allow: true, flag: true, block: true }); setThresholdFilter(0); }}>Reset</button>
          </div>
        </div>

        <div className="px-4 py-4 space-y-5">
          {/* Use case */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Use Case</p>
            <select
              value={useCaseFilter}
              onChange={(e) => setUseCaseFilter(e.target.value)}
              className="w-full text-xs rounded-md px-2.5 py-2 outline-none"
              style={{ border: "1px solid var(--border)", color: "var(--text-primary)", background: "var(--surface-2)" }}
            >
              <option value="">All Use Cases</option>
              {USE_CASES.map((uc) => <option key={uc.id} value={uc.id}>{uc.label}</option>)}
            </select>
          </div>

          {/* Decision status */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Decision Status</p>
            <div className="space-y-2.5">
              {([
                ["allow", "Passed", counts.passed],
                ["flag", "Flagged", counts.flagged],
                ["block", "Blocked", counts.blocked],
              ] as [keyof typeof actionFilters, string, number][]).map(([key, label, count]) => (
                <label key={key} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={actionFilters[key]}
                      onChange={() => toggleAction(key)}
                      className="w-3.5 h-3.5 accent-indigo-600"
                    />
                    <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>{label}</span>
                  </div>
                  <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>{count.toLocaleString()}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Risk evaluators */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Risk Evaluators</p>
            <div className="flex flex-wrap gap-1.5">
              {[["PII Detection", true], ["Tone / Sentiment", false], ["Hallucination", false], ["Confidentiality", true], ["Bias / Fairness", false]].map(([label, active]) => (
                <span
                  key={label as string}
                  className="text-xs px-2.5 py-1 rounded-full cursor-pointer font-medium"
                  style={{
                    background: active ? "#111827" : "var(--surface-2)",
                    color: active ? "white" : "var(--text-muted)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {label as string}
                </span>
              ))}
            </div>
          </div>

          {/* Confidence threshold */}
          <div>
            <div className="flex justify-between mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Confidence Threshold</p>
              <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>≥ {thresholdFilter}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={thresholdFilter}
              onChange={(e) => setThresholdFilter(parseInt(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* System status */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: "#111827" }}>
            <p className="text-xs font-bold text-white">System Status</p>
            <div>
              <div className="flex justify-between text-[10px] mb-1" style={{ color: "#9ca3af" }}>
                <span>Latency</span>
                <span>{avgLatency}ms avg</span>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "#374151" }}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min((avgLatency / 500) * 100, 100)}%` }} />
              </div>
            </div>
            <p className="text-[10px]" style={{ color: "#6b7280" }}>
              Processing ~{Math.max(entries.length * 3, 100)} events/min across 4 regions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
