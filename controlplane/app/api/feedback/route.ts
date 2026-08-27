import { NextRequest, NextResponse } from "next/server";
import { updateFeedback } from "@/lib/audit-store";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { entryId, feedback, note } = body as {
    entryId: string;
    feedback: "correct" | "incorrect";
    note?: string;
  };

  if (!entryId || !feedback) {
    return NextResponse.json(
      { error: "entryId and feedback are required" },
      { status: 400 }
    );
  }

  const updated = await updateFeedback(entryId, feedback, note);
  if (!updated) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, entry: updated });
}
