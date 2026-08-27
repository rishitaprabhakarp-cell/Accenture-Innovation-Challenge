import { NextRequest, NextResponse } from "next/server";
import { getAllPolicies, updatePolicy, resetPolicy, resetAllPolicies } from "@/lib/policy";
import { UseCaseId } from "@/lib/types";

export async function GET() {
  const policies = getAllPolicies();
  return NextResponse.json(policies);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { useCaseId, ...update } = body as { useCaseId: UseCaseId; [key: string]: unknown };

  if (!useCaseId) {
    return NextResponse.json({ error: "useCaseId required" }, { status: 400 });
  }

  const updated = updatePolicy(useCaseId, update);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const useCaseId = searchParams.get("useCaseId") as UseCaseId | null;

  if (useCaseId) {
    const reset = resetPolicy(useCaseId);
    return NextResponse.json(reset);
  }

  resetAllPolicies();
  return NextResponse.json({ ok: true, message: "All policies reset to defaults" });
}
