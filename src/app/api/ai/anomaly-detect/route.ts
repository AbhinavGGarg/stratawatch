import { NextResponse } from "next/server";
import { runAIIntelligenceSnapshot } from "@/lib/ai/intelligence-engine";
import { toAIEngineInput, type IntelligenceRequestBody } from "@/lib/ai/request-context";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as IntelligenceRequestBody;
    const input = toAIEngineInput(body);

    if (!input) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const snapshot = await runAIIntelligenceSnapshot(input);

    return NextResponse.json(
      {
        generatedAt: snapshot.generatedAt,
        region: snapshot.region,
        fusedSignals: snapshot.fusedSignals,
        anomalyHotspots: snapshot.anomalyHotspots,
        socialSignals: snapshot.socialSignals,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to run anomaly detection",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
