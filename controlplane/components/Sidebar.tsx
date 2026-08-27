"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Activity,
  Flag,
  Layers,
  Shield,
  Clock,
  BarChart2,
  Settings,
} from "lucide-react";
// Shield kept for potential nav use
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/monitor", label: "Live Monitor", icon: Activity },
  { href: "/flagged", label: "Flagged Queue", icon: Flag },
  { href: "/usecases", label: "Use Cases", icon: Layers },
  { href: "/policy", label: "Policies", icon: Shield },
  { href: "/audit", label: "Audit Trail", icon: Clock },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col h-screen sticky top-0 select-none"
      style={{ background: "var(--sidebar-bg)" }}
    >
      {/* Logo */}
      <div className="px-4 py-4 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
        <Image src="/logo.png" alt="ControlPlane.ai" width={28} height={28} className="rounded flex-shrink-0" />
        <div className="leading-tight">
          <span className="text-white font-bold text-sm tracking-tight">ControlPlane</span>
          <span className="text-xs font-semibold" style={{ color: "#818cf8" }}>.ai</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-100",
                active
                  ? "bg-[#1f2937] text-white"
                  : "text-[#9ca3af] hover:text-white hover:bg-[#1f2937]"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 pulse" />
          <span>System operational</span>
        </div>
      </div>
    </aside>
  );
}
