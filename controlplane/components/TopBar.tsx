"use client";

import { Bell, HelpCircle, ChevronDown, Database } from "lucide-react";

export default function TopBar({ title }: { title?: string }) {
  return (
    <div
      className="h-12 flex items-center justify-between px-6 flex-shrink-0"
      style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
    >
      {/* Environment selector */}
      <button
        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors hover:bg-[var(--surface-2)]"
        style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
      >
        <Database className="w-3.5 h-3.5" />
        PRODUCTION
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {title && (
        <span className="text-xs font-medium absolute left-1/2 -translate-x-1/2" style={{ color: "var(--text-muted)" }}>
          {title}
        </span>
      )}

      {/* Right side */}
      <div className="flex items-center gap-3">
        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors" style={{ color: "var(--text-muted)" }}>
          <Bell className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[var(--surface-2)] transition-colors" style={{ color: "var(--text-muted)" }}>
          <HelpCircle className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 pl-2" style={{ borderLeft: "1px solid var(--border)" }}>
          <div className="text-right">
            <div className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Chief Risk Officer</div>
            <div className="text-[10px] font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>ADMIN</div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#374151" }}>
            CR
          </div>
        </div>
      </div>
    </div>
  );
}
