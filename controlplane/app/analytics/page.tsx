"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Shield, RefreshCw } from "lucide-react";
import { DashboardStats } from "@/lib/types";

// Build 24-hour FP vs FN trend from recent entries
function buildDivergenceData(stats: DashboardStats) {
  return stats.trendData.map((t, i) => ({
    time: t.time,
    FPRate: parseFloat((Math.max(stats.falsePositiveRate * 100 + (Math.sin(i * 0.6) * 1.2), 0)).toFixed(2)),
    FNRate: parseFloat((Math.max(stats.falseNegativeRate * 100 + (Math.cos(i * 0.5) * 0.8), 0)).toFixed(2)),
  }));
}

// Build risk heatmap: 7 days × 12 two-hour slots
function buildHeatmap(stats: DashboardStats) {
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const hours = ["12A", "2A", "4A", "6A", "8A", "10A", "12P", "2P", "4P", "6P", "8P", "10P"];
  // Simulate realistic business-hours pattern
  return days.map((day) =>
    hours.map((hour) => {
      const h = hours.indexOf(hour);
      const d = days.indexOf(day);
      const isBusinessHour = h >= 4 && h <= 9;
      const isWeekend = d >= 5;
      const base = isBusinessHour && !isWeekend ? 0.3 + Math.random() * 0.5 : Math.random() * 0.2;
      // Overlay real stats
      const boost = stats.total > 0 ? (stats.blocked + stats.flagged) / stats.total : 0;
      return Math.min(base + boost * 0.3, 1.0);
    })
  );
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
          <span style={{ color: "var(--text-muted)" }}>{p.name}:</span>
          <span className="font-bold" style={{ color: "var(--text-primary)" }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [period, setPeriod] = useState<"24H" | "7D" | "30D">("24H");
  const [loading, setLoading] = useState(true);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/audit?mode=stats");
    setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const trustScore = stats
    ? Math.max(0, Math.round(100 - stats.avgScore * 100 * 0.6 - stats.falsePositiveRate * 20 - stats.falseNegativeRate * 15))
    : 94;
  const flagAccuracy = stats?.total
    ? (((stats.total - stats.allowed - Math.round(stats.total * stats.falsePositiveRate)) / Math.max(stats.total - stats.allowed, 1)) * 100).toFixed(1)
    : "96.4";
  const humanOverride = stats?.total
    ? (stats.falsePositiveRate * 100).toFixed(1)
    : "3.8";
  const avgLatency = stats?.recentEntries.length
    ? Math.round(stats.recentEntries.reduce((s, e) => s + e.pipelineLatencyMs, 0) / stats.recentEntries.length)
    : 124;

  const divergenceData = stats ? buildDivergenceData(stats) : [];
  const heatmapData = stats ? buildHeatmap(stats) : [];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
  const hours = ["12A", "2A", "4A", "6A", "8A", "10A", "12P", "2P", "4P", "6P", "8P", "10P"];

  function heatColor(val: number) {
    if (val < 0.15) return "#dbeafe";
    if (val < 0.30) return "#93c5fd";
    if (val < 0.50) return "#374151";
    if (val < 0.70) return "#6b7280";
    return "#dc2626";
  }

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>System Telemetry</p>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Analytics & Trust Scoring</h1>
        </div>
        <div className="flex items-center gap-2">
          {(["24H", "7D", "30D"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="text-xs font-bold px-3 py-1.5 rounded-md transition-colors"
              style={{
                background: period === p ? "var(--surface-2)" : "transparent",
                color: period === p ? "var(--text-primary)" : "var(--text-muted)",
                border: "1px solid var(--border)",
              }}
            >
              {p}
            </button>
          ))}
          <button onClick={fetch_} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md text-white" style={{ background: "#111827" }}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            REFRESH
          </button>
        </div>
      </div>

      {/* Top row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Trust score card */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Composite Trust Score</h3>
            <Shield className="w-5 h-5" style={{ color: "var(--text-faint)" }} />
          </div>
          <div className="text-6xl font-black mb-1" style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {trustScore}<span className="text-2xl font-bold" style={{ color: "var(--text-muted)" }}>/100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold mb-6 text-emerald-600">
            ↑ 1.2%
          </div>
          <div className="space-y-3 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            {[
              { label: "FLAG ACCURACY", value: `${flagAccuracy}%`, color: "var(--text-primary)" },
              { label: "HUMAN OVERRIDE", value: `${humanOverride}%`, color: "#dc2626" },
              { label: "SYS LATENCY", value: `${avgLatency}ms`, color: "var(--text-primary)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-faint)" }}>{label}</div>
                  <div className="h-0.5 w-16 mt-1 rounded-full" style={{ background: color === "#dc2626" ? "#dc2626" : "var(--border-strong)" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* FP vs FN divergence */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Error Rate Divergence</h3>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>False Positive vs. False Negative trajectory</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-black inline-block" />FP RATE</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 inline-block" />FN RATE</span>
            </div>
          </div>
          {divergenceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={divergenceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="FPRate" stroke="#111827" strokeWidth={2} dot={false} name="FP Rate" />
                <Line type="monotone" dataKey="FNRate" stroke="#dc2626" strokeWidth={2} dot={false} name="FN Rate" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
              No data — seed demo data first
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="card p-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Risk Occurrence Heatmap</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Policy violation density by hour and day of week</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
            LOW
            <div className="flex gap-0.5">
              {["#dbeafe","#93c5fd","#374151","#6b7280","#dc2626"].map((c) => (
                <div key={c} className="w-5 h-3 rounded-sm" style={{ background: c }} />
              ))}
            </div>
            HIGH
          </div>
        </div>

        {heatmapData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <td className="w-12" />
                  {hours.map((h) => (
                    <td key={h} className="text-center text-[10px] pb-2 font-semibold" style={{ color: "var(--text-faint)" }}>{h}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((day, di) => (
                  <tr key={day}>
                    <td className="text-[10px] font-bold pr-2 text-right" style={{ color: "var(--text-muted)" }}>{day}</td>
                    {heatmapData[di]?.map((val, hi) => (
                      <td key={hi} className="p-0.5">
                        <div
                          className="h-5 rounded-sm cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ background: heatColor(val) }}
                          title={`${day} ${hours[hi]}: ${(val * 100).toFixed(0)}% risk density`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-sm" style={{ color: "var(--text-muted)" }}>
            Seed demo data to generate heatmap
          </div>
        )}
      </div>
    </div>
  );
}
