import { NextResponse } from "next/server";
import { REGION_CATALOG } from "@/lib/region-catalog";
import { generateSignalBurst } from "@/lib/signal-generator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const countParam = Number(searchParams.get("count") ?? "6");
  const count = Number.isFinite(countParam) ? Math.max(2, Math.min(10, countParam)) : 6;

  const signals = generateSignalBurst(
    REGION_CATALOG.map((region) => region.id),
    count,
    new Date(),
  );

  return NextResponse.json(
    {
      generatedAt: new Date().toISOString(),
      signals,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
