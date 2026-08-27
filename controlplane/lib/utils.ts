import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { RiskAction } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function actionBadgeClass(action: RiskAction): string {
  const map: Record<RiskAction, string> = {
    allow: "badge badge-allow",
    edit: "badge badge-edit",
    flag: "badge badge-flag",
    block: "badge badge-blocked",
  };
  return map[action];
}

export function actionLabel(action: RiskAction): string {
  const map: Record<RiskAction, string> = {
    allow: "Passed",
    edit: "Edited",
    flag: "Flagged",
    block: "Blocked",
  };
  return map[action];
}

export function actionColor(action: RiskAction): string {
  const map: Record<RiskAction, string> = {
    allow: "#16a34a",
    edit: "#64748b",
    flag: "#d97706",
    block: "#dc2626",
  };
  return map[action];
}

export function scoreColor(score: number): string {
  if (score < 0.25) return "#16a34a";
  if (score < 0.55) return "#d97706";
  if (score < 0.75) return "#ea580c";
  return "#dc2626";
}

export function formatScore(score: number): string {
  return `${(score * 100).toFixed(0)}%`;
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 10) return "Just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(isoString).toLocaleDateString();
}

export function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "…";
}

export function riskLabel(score: number): "HIGH" | "MED" | "LOW" {
  if (score >= 0.65) return "HIGH";
  if (score >= 0.35) return "MED";
  return "LOW";
}

export function checkerLabel(key: string): string {
  const map: Record<string, string> = {
    pii: "PII Detection",
    hallucination: "Hallucination",
    bias: "Bias / Fairness",
  };
  return map[key] ?? key;
}

export function riskVectorLabel(entry: { checkerResults: Array<{ checker: string; triggered: boolean; score: number }> }): string {
  const top = entry.checkerResults
    .filter((r) => r.triggered)
    .sort((a, b) => b.score - a.score)[0];
  if (!top) return "—";
  const map: Record<string, string> = {
    pii: "PII_LEAK_DETECT",
    hallucination: "HALLUCINATION",
    bias: "BIAS_DETECTED",
  };
  return map[top.checker] ?? top.checker.toUpperCase();
}
