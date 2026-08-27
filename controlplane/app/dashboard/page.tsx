"use client";

import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { DashboardStats, AuditEntry } from "@/lib/types";
import { actionLabel, actionColor, actionBadgeClass, formatScore, timeAgo, truncate, riskVectorLabel } from "@/lib/utils";
import Link from "next/link";

function StatCard({
  label, value, sub, trend, trendUp,
}: {
  label: string; value: string | number; sub?: string; trend?: string; trendUp?: boolean;
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>{label}</p>
      <div className="flex items-end justify-between">
        <p className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trendUp ? "text-emerald-600" : "text-red-500"}`}>
            {trendUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend}
          </span>
        )}
      </div>
      {sub && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span className="font-medium" style={{ color: "var(--text-primary)" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function RiskByUseCase({ stats }: { stats: DashboardStats }) {
  const total = stats.total || 1;
  const items = [
    {
      label: "Customer Support Chatbot",
      pct: stats.total
        ? Math.round((stats.blocked / total) * 100 * 3.2)
        : 0,
      color: "#dc2626",
    },
    {
      label: "Internal Knowledge Assistant",
      pct: stats.total
        ? Math.round((stats.flagged / total) * 100 * 1.8)
        : 0,
      color: "#374151",
    },
    {
      label: "Decision-Support Tool",
      pct: stats.total
        ? Math.round((stats.edited / total) * 100 * 1.2)
        : 0,
      color: "#374151",
    },
  ].map((item) => ({ ...item, pct: Math.min(item.pct, 30) }));

  return (
    <div className="card p-5 flex flex-col gap-4">
      <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Risk by Use Case</h3>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between text-xs mb-1.5">
              <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              <span className="font-bold" style={{ color: item.pct > 8 ? "#dc2626" : "var(--text-primary)" }}>
                {item.pct.toFixed(1)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${(item.pct / 30) * 100}%`, background: item.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HighRiskTable({ entries }: { entries: AuditEntry[] }) {
  const highRisk = entries.filter((e) => e.action === "block" || e.action === "flag").slice(0, 8);
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Recent High-Risk Events</h3>
        <button className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
          FILTER
        </button>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
            {["Timestamp", "Use Case", "Risk Type", "Confidence", "Decision", "Actions"].map((h) => (
              <th key={h} className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider" style={{ color: "var(--text-faint)", fontSize: "10px" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {highRisk.length === 0 ? (
            <tr><td colSpan={6} className="px-5 py-8 text-center" style={{ color: "var(--text-muted)" }}>No high-risk events yet</td></tr>
          ) : highRisk.map((entry) => {
            const topChecker = entry.checkerResults.sort((a, b) => b.score - a.score)[0];
            return (
              <tr key={entry.id} className="table-row-hover" style={{ borderBottom: "1px solid var(--border)" }}>
                <td className="px-5 py-3 font-mono" style={{ color: "var(--text-muted)" }}>
                  {new Date(entry.timestamp).toLocaleString("en-US", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                </td>
                <td className="px-5 py-3 font-medium" style={{ color: "var(--text-primary)" }}>{entry.useCaseLabel}</td>
                <td className="px-5 py-3">
                  <span style={{ color: topChecker?.checker === "pii" ? "#dc2626" : topChecker?.checker === "bias" ? "#7c3aed" : "#d97706", fontWeight: 600 }}>
                    {topChecker?.checker === "pii" ? "PII Leak" : topChecker?.checker === "bias" ? "Bias" : "Hallucination"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                      <div className="h-full rounded-full" style={{ width: `${entry.compositeScore * 100}%`, background: actionColor(entry.action) }} />
                    </div>
                    <span className="font-semibold" style={{ color: actionColor(entry.action) }}>{formatScore(entry.compositeScore)}</span>
                  </div>
                </td>
                <td className="px-5 py-3"><span className={actionBadgeClass(entry.action)}>{actionLabel(entry.action)}</span></td>
                <td className="px-5 py-3">
                  <Link href={`/flagged/${entry.id}`} className="text-xs font-medium hover:underline" style={{ color: "var(--accent)" }}>
                    Review →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/audit?mode=stats");
      setStats(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 8000);
    return () => clearInterval(t);
  }, [fetchStats]);

  // Build area chart data from trend data
  const areaData = stats?.trendData.map((t) => ({
    time: t.time,
    Allowed: t.allow,
    Edited: t.edit,
    Flagged: t.flag,
    Blocked: t.block,
  })) ?? [];

  const blockRate = stats?.total ? ((stats.blocked / stats.total) * 100).toFixed(1) : "0.0";
  const flagRate = stats?.total ? (((stats.flagged + stats.edited) / stats.total) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>System Telemetry</p>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Overview</h1>
        </div>
        <div className="flex items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--text-faint)" }} />}
          {stats?.total === 0 && (
            <button
              onClick={async () => { setLoading(true); await fetch("/api/seed", { method: "POST" }); fetchStats(); }}
              className="text-xs font-semibold px-4 py-2 rounded-md text-white"
              style={{ background: "#111827" }}
            >
              Seed Demo Data
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Interactions Checked (7d)" value={stats?.total.toLocaleString() ?? "0"} trend="14.2%" trendUp />
        <StatCard label="Flagged for Review" value={(stats?.flagged ?? 0).toLocaleString()} sub={`${flagRate}% of total`} trend="5.1%" trendUp={false} />
        <StatCard label="Blocked Responses" value={(stats?.blocked ?? 0).toLocaleString()} sub={`${blockRate}% block rate`} />
        <StatCard label="Avg Check Latency" value={stats?.total ? `${Math.round(stats.recentEntries.reduce((s, e) => s + e.pipelineLatencyMs, 0) / Math.max(stats.recentEntries.length, 1))}ms` : "—"} trend="2.4%" trendUp />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Area chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Interaction Volume (7d)</h3>
            <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
              {[["Allowed","#d1d5db"], ["Edited","#94a3b8"], ["Flagged","#fca5a5"], ["Blocked","#dc2626"]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: c }} />
                  {l}
                </span>
              ))}
            </div>
          </div>
          {areaData.some((d) => d.Allowed + d.Edited + d.Flagged + d.Blocked > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData} stackOffset="expand">
                <XAxis dataKey="time" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Allowed" stackId="1" stroke="#d1d5db" fill="#d1d5db" />
                <Area type="monotone" dataKey="Edited" stackId="1" stroke="#94a3b8" fill="#94a3b8" />
                <Area type="monotone" dataKey="Flagged" stackId="1" stroke="#fca5a5" fill="#fca5a5" />
                <Area type="monotone" dataKey="Blocked" stackId="1" stroke="#dc2626" fill="#dc2626" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              No data — seed demo data to populate charts
            </div>
          )}
        </div>

        {/* Risk by use case */}
        {stats ? <RiskByUseCase stats={stats} /> : <div className="card p-5" />}
      </div>

      {/* High-risk events table */}
      {stats && <HighRiskTable entries={stats.recentEntries} />}
    </div>
  );
}
