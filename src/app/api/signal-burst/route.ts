import { NextResponse } from "next/server";
import { REGION_CATALOG } from "@/lib/region-catalog";
import { fetchLiveSignals } from "@/lib/live-signal-sources";
import { generateSignalBurst } from "@/lib/signal-generator";
import type { Signal } from "@/lib/types";

export const dynamic = "force-dynamic";

const LIVE_CACHE_TTL_MS = 1000 * 60 * 10;
let liveSignalCache: Signal[] = [];
let liveSignalFetchedAt = 0;

const getCachedLiveSignals = async (): Promise<Signal[]> => {
  const now = Date.now();
  const isExpired = now - liveSignalFetchedAt > LIVE_CACHE_TTL_MS;

  if (!isExpired && liveSignalCache.length > 0) {
    return liveSignalCache;
  }

  const liveSignals = await fetchLiveSignals();
  liveSignalCache = liveSignals;
  liveSignalFetchedAt = now;
  return liveSignals;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countParam = Number(searchParams.get("count") ?? "6");
  const count = Number.isFinite(countParam) ? Math.max(2, Math.min(10, countParam)) : 6;

  const simulatedSignals = generateSignalBurst(
    REGION_CATALOG.map((region) => region.id),
    count,
    new Date(),
  );
  const liveSignals = await getCachedLiveSignals();
  const sampledLiveSignals = liveSignals.slice(0, 8);
  const signals = [...sampledLiveSignals, ...simulatedSignals];

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      signals,
      sourceMix: {
        live: sampledLiveSignals.length,
        simulated: simulatedSignals.length,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
