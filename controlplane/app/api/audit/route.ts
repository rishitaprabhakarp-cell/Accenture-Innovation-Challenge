import { NextRequest, NextResponse } from "next/server";
import { getAuditEntries, getDashboardStats, clearAuditStore } from "@/lib/audit-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode") ?? "entries";

  if (mode === "stats") {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  }

  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const useCaseId = searchParams.get("useCaseId") ?? undefined;
  const action = searchParams.get("action") ?? undefined;

  const entries = await getAuditEntries({ limit, offset, useCaseId, action });
  return NextResponse.json({ entries, total: entries.length });
}

export async function DELETE() {
  await clearAuditStore();
  return NextResponse.json({ ok: true, message: "Audit store cleared" });
}
