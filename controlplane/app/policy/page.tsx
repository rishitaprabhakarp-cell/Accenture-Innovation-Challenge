"use client";

import { useEffect, useState } from "react";
import { Save, RotateCcw, Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { PolicyConfig, UseCaseId } from "@/lib/types";
import { cn } from "@/lib/utils";

const RISK_LABELS: Record<string, { label: string; color: string }> = {
  low:    { label: "Low Tolerance (strict)",   color: "#dc2626" },
  medium: { label: "Medium Tolerance",          color: "#d97706" },
  high:   { label: "High Tolerance (permissive)", color: "#16a34a" },
};

function PolicyCard({ policy, onSave, onReset }: {
  policy: PolicyConfig;
  onSave: (p: PolicyConfig) => Promise<void>;
  onReset: (id: UseCaseId) => Promise<void>;
}) {
  const [local, setLocal] = useState(policy);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setLocal(policy); }, [policy]);

  const totalWeight = Object.values(local.weights).reduce((s, v) => s + v, 0);
  const weightsValid = Math.abs(totalWeight - 1.0) < 0.01;
  const thresholdValid = local.thresholds.allow < local.thresholds.edit && local.thresholds.edit < local.thresholds.flag;
  const isValid = weightsValid && thresholdValid;

  async function handleSave() {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="card p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{local.label}</h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{local.description}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => onReset(local.useCaseId)} className="text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5" style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
          <button onClick={handleSave} disabled={!isValid || saving} className="text-xs font-bold px-4 py-1.5 rounded-md flex items-center gap-1.5 text-white disabled:opacity-50" style={{ background: "#111827" }}>
            {saved ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Saved</> : <><Save className="w-3.5 h-3.5" />{saving ? "Saving…" : "Save"}</>}
          </button>
        </div>
      </div>

      {/* Latency */}
      <div>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--text-secondary)" }}>
          Latency Budget: <span style={{ color: "var(--accent)" }}>{local.latencyBudgetMs >= 1000 ? `${(local.latencyBudgetMs / 1000).toFixed(1)}s` : `${local.latencyBudgetMs}ms`}</span>
        </label>
        <input type="range" min={100} max={10000} step={100} value={local.latencyBudgetMs} onChange={(e) => setLocal((p) => ({ ...p, latencyBudgetMs: +e.target.value }))} className="w-full accent-indigo-600" />
        <div className="flex justify-between text-[10px] mt-1" style={{ color: "var(--text-faint)" }}><span>100ms</span><span>10s</span></div>
      </div>

      {/* Risk tolerance */}
      <div>
        <label className="text-xs font-bold block mb-2" style={{ color: "var(--text-secondary)" }}>Risk Tolerance</label>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((rt) => {
            const { label, color } = RISK_LABELS[rt];
            return (
              <button key={rt} onClick={() => setLocal((p) => ({ ...p, riskTolerance: rt }))}
                className="flex-1 py-2 rounded-md text-xs font-semibold transition-colors"
                style={local.riskTolerance === rt ? { background: `${color}15`, color, border: `1px solid ${color}40` } : { background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Tiered Thresholds</label>
          {!thresholdValid && <span className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="w-3 h-3" />allow &lt; edit &lt; flag required</span>}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {(["allow", "edit", "flag"] as const).map((tier, i) => {
            const colors = ["#16a34a", "#d97706", "#ea580c"];
            return (
              <div key={tier}>
                <label className="text-xs font-semibold block mb-1" style={{ color: colors[i] }}>
                  {tier === "allow" ? "Allow max" : tier === "edit" ? "Edit max" : "Flag max"}: {Math.round(local.thresholds[tier] * 100)}%
                </label>
                <input type="range" min={0} max={100} step={5} value={Math.round(local.thresholds[tier] * 100)} onChange={(e) => setLocal((p) => ({ ...p, thresholds: { ...p.thresholds, [tier]: +e.target.value / 100 } }))} className="w-full" style={{ accentColor: colors[i] }} />
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[11px] px-3 py-2 rounded-md flex items-center gap-2" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
          <Info className="w-3.5 h-3.5 flex-shrink-0" />
          Score ≥ {Math.round(local.thresholds.flag * 100)}% → <b style={{ color: "#dc2626" }}>Block</b>
        </div>
      </div>

      {/* Weights */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-bold" style={{ color: "var(--text-secondary)" }}>Checker Weights</label>
          <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold", weightsValid ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600")}>
            Sum: {(totalWeight * 100).toFixed(0)}% {weightsValid ? "✓" : "(must = 100%)"}
          </span>
        </div>
        {(["pii", "hallucination", "bias"] as const).map((c) => {
          const colors: Record<string, string> = { pii: "#dc2626", hallucination: "#d97706", bias: "#7c3aed" };
          const labels: Record<string, string> = { pii: "PII / Privacy", hallucination: "Hallucination", bias: "Bias & Fairness" };
          return (
            <div key={c} className="mb-3">
              <label className="text-xs font-semibold block mb-1" style={{ color: colors[c] }}>
                {labels[c]}: {Math.round(local.weights[c] * 100)}%
              </label>
              <input type="range" min={0} max={100} step={5} value={Math.round(local.weights[c] * 100)} onChange={(e) => setLocal((p) => ({ ...p, weights: { ...p.weights, [c]: +e.target.value / 100 } }))} className="w-full" style={{ accentColor: colors[c] }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PolicyPage() {
  const [policies, setPolicies] = useState<PolicyConfig[]>([]);

  useEffect(() => {
    fetch("/api/policy").then((r) => r.json()).then((d) => setPolicies(Object.values(d)));
  }, []);

  async function handleSave(p: PolicyConfig) {
    await fetch("/api/policy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
  }

  async function handleReset(id: UseCaseId) {
    const res = await fetch(`/api/policy?useCaseId=${id}`, { method: "DELETE" });
    const d = await res.json();
    setPolicies((prev) => prev.map((p) => p.useCaseId === id ? d : p));
  }

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Policy Configuration</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Configure risk thresholds, checker weights, and latency budgets per use case. Changes take effect immediately.
        </p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {policies.map((p) => <PolicyCard key={p.useCaseId} policy={p} onSave={handleSave} onReset={handleReset} />)}
      </div>
    </div>
  );
}
