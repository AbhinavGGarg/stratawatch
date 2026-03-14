import type { RegionState } from "@/lib/types";

const sectorMap: Record<string, string[]> = {
  shipping_congestion: ["logistics", "fuel distribution", "retail supply"],
  extreme_weather: ["transport", "power", "water"],
  news_sentiment_spike: ["public coordination", "market confidence"],
  infrastructure_disruption: ["healthcare", "telecom", "mobility"],
};

const label = (value: string): string => value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export interface RegionBriefing {
  executiveBrief: string;
  technicalAssessment: string[];
  watchlist: string[];
  scenarioOutlook: string[];
  uncertainty: string;
}

export const createFallbackRegionBriefing = (region: RegionState): RegionBriefing => {
  const topDrivers = region.drivers.map((driver) => label(driver));
  const sectors = [...new Set(region.drivers.flatMap((driver) => sectorMap[driver] ?? []))];

  const trend = region.risk >= 0.7 ? "rising" : region.risk >= 0.45 ? "elevated" : "stable";

  return {
    executiveBrief:
      `${region.name} remains ${trend} at ${Math.round(region.risk * 100)}% composite risk, driven by ` +
      `${topDrivers.length > 0 ? topDrivers.join(", ") : "background signal pressure"}.`,
    technicalAssessment: [
      `Top pressure sectors: ${sectors.length > 0 ? sectors.join(", ") : "mixed infrastructure dependencies"}.`,
      `Neighbor coupling indicates ${Math.round(region.risk * 72)}% propagation pressure into adjacent corridors.`,
      `Short-horizon volatility remains ${region.risk > 0.62 ? "elevated" : "contained"} under current signal density.`,
    ],
    watchlist: [
      "Monitor port + power node stress synchrony over next 90 minutes.",
      "Track healthcare and telecom secondary load conditions.",
      "Escalate if two or more high-confidence disruptions co-occur.",
    ],
    scenarioOutlook: [
      "Most likely near-term path: logistics delays with cascading response bottlenecks.",
      "Adverse path: coupled power and transport failures amplifying hospital load.",
    ],
    uncertainty: "Confidence is moderate; live feed completeness varies by source latency and regional coverage.",
  };
};
