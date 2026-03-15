import { NextResponse } from "next/server";
import { runAIIntelligenceSnapshot } from "@/lib/ai/intelligence-engine";
import { toAIEngineInput, type IntelligenceRequestBody } from "@/lib/ai/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IntelligenceRequestBody;
    const input = toAIEngineInput(body);
    if (!input) {
      return NextResponse.json({ error: "Missing regions payload" }, { status: 400 });
    }

    const snapshot = await runAIIntelligenceSnapshot(input);

    return NextResponse.json(
      {
        snapshot,
        meta: {
          mode: input.demoMode ? "demo" : "live",
          signalsProcessed: input.signals.length,
          regionCount: input.allRegions.length,
          generatedAt: new Date().toISOString(),
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to generate AI intelligence snapshot",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
