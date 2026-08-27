"use client";

import { useEffect, useState } from "react";
import { Plus, History, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { PolicyConfig, UseCaseId } from "@/lib/types";

const USE_CASE_META: Record<UseCaseId, {
  title: string;
  subtitle: string;
  risk: "HIGH" | "MED" | "LOW";
  policies: Array<{ label: string; enabled: boolean }>;
  defaultAction: string;
}> = {
  "customer-support": {
    title: "Customer Support Agent",
    subtitle: "Public-facing chatbot handling L1 support queries.",
    risk: "HIGH",
    defaultAction: "BLOCK",
    policies: [
      { label: "PII Masking", enabled: true },
      { label: "Toxicity Filter", enabled: true },
      { label: "Prompt Injection", enabled: true },
      { label: "Topic Restriction", enabled: false },
    ],
  },
  "internal-knowledge": {
    title: "Internal KB Assistant",
    subtitle: "Employee-facing tool for querying company policies.",
    risk: "MED",
    defaultAction: "FLAG & REVIEW",
    policies: [
      { label: "PII Masking", enabled: true },
      { label: "Hallucination Check", enabled: true },
      { label: "Toxicity Filter", enabled: false },
    ],
  },
  "decision-support": {
    title: "Decision Support Tool",
    subtitle: "Regulated workflow for lending and insurance decisions.",
    risk: "HIGH",
    defaultAction: "BLOCK",
    policies: [
      { label: "Bias Detection", enabled: true },
      { label: "PII Masking", enabled: true },
      { label: "Hallucination Check", enabled: true },
      { label: "Regulatory Check", enabled: true },
    ],
  },
};

function RiskBadge({ risk }: { risk: "HIGH" | "MED" | "LOW" }) {
  if (risk === "HIGH") return <span className="risk-high"><AlertTriangle className="w-3 h-3" />HIGH RISK</span>;
  if (risk === "MED") return <span className="risk-med"><Circle className="w-3 h-3" />MED RISK</span>;
  return <span className="risk-low">LOW RISK</span>;
}

function UseCaseCard({ policy }: { policy: PolicyConfig }) {
  const meta = USE_CASE_META[policy.useCaseId];
  if (!meta) return null;

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{meta.title}</h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{meta.subtitle}</p>
        </div>
        <RiskBadge risk={meta.risk} />
      </div>

      <div className="grid grid-cols-2 gap-4 my-4 py-4" style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Latency Budget</p>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              &lt; {policy.latencyBudgetMs >= 1000 ? `${(policy.latencyBudgetMs / 1000).toFixed(1)}s` : `${policy.latencyBudgetMs}ms`}
            </span>
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-faint)" }}>Default Action</p>
          <span
            className="text-xs font-bold"
            style={{ color: meta.defaultAction === "BLOCK" ? "#dc2626" : "#d97706" }}
          >
            {meta.defaultAction}
          </span>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-faint)" }}>Enabled Policies</p>
        <div className="flex flex-wrap gap-1.5">
          {meta.policies.map((p) => (
            <span
              key={p.label}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full"
              style={{
                background: p.enabled ? "#f0fdf4" : "var(--surface-2)",
                color: p.enabled ? "#15803d" : "var(--text-faint)",
                border: `1px solid ${p.enabled ? "#bbf7d0" : "var(--border)"}`,
              }}
            >
              {p.enabled ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function UseCasesPage() {
  const [policies, setPolicies] = useState<PolicyConfig[]>([]);
  const [tab, setTab] = useState<"active" | "deployed">("active");

  useEffect(() => {
    fetch("/api/policy").then((r) => r.json()).then((d) => setPolicies(Object.values(d)));
  }, []);

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Use Cases & Policy Configuration</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Define risk boundaries and compliance checks per deployment context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-md" style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <History className="w-3.5 h-3.5" />
            VERSION HISTORY
          </button>
          <button className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-md text-white" style={{ background: "#111827" }}>
            <Plus className="w-3.5 h-3.5" />
            NEW USE CASE
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {(["active", "deployed"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pb-3 text-xs font-bold uppercase tracking-widest transition-colors"
            style={{
              color: tab === t ? "var(--text-primary)" : "var(--text-faint)",
              borderBottom: tab === t ? "2px solid #111827" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {t === "active" ? "Active" : "Deployed Contexts"}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <UseCaseCard key={policy.useCaseId} policy={policy} />
        ))}
        {/* Add context card */}
        <button
          className="card p-5 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-shadow cursor-pointer min-h-[220px]"
          style={{ borderStyle: "dashed", borderColor: "var(--border-strong)" }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: "2px dashed var(--border-strong)" }}>
            <Plus className="w-5 h-5" style={{ color: "var(--text-faint)" }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Add Context</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Configure a new deployment context and apply policies.</p>
          </div>
        </button>
      </div>
    </div>
  );
}
