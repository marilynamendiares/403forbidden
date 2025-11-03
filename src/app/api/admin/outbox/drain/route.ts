import { drainOutbox } from "@/server/notify/queue";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const res = await drainOutbox({ limit: 200 });
    return NextResponse.json(res);
  } catch (err) {
    console.error("[outbox] drain error", err);
    return NextResponse.json({ error: "failed to drain outbox" }, { status: 500 });
  }
}
