import { REGION_LOOKUP } from "@/lib/region-catalog";
import type { Signal, SignalType } from "@/lib/types";

const weightedRegions = [
  "suez_corridor",
  "east_med",
  "gulf_aden",
  "persian_gulf",
  "strait_malacca",
  "south_china_sea",
  "us_gulf",
  "panama_canal",
  "north_sea",
  "north_atlantic",
  "west_africa_ports",
];

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const randomBetween = (min: number, max: number): number => min + Math.random() * (max - min);

const pickSignalType = (): SignalType => {
  const roll = Math.random();
  if (roll < 0.32) return "shipping_congestion";
  if (roll < 0.56) return "extreme_weather";
  if (roll < 0.8) return "news_sentiment_spike";
  return "infrastructure_disruption";
};

const pickRegionId = (candidateIds: string[]): string => {
  const hotspotBoost = Math.random() < 0.6;
  if (hotspotBoost) {
    const pool = weightedRegions.filter((id) => candidateIds.includes(id));
    if (pool.length > 0) {
      return pool[Math.floor(Math.random() * pool.length)];
    }
  }

  return candidateIds[Math.floor(Math.random() * candidateIds.length)];
};

const jitterLocation = (lng: number, lat: number): [number, number] => [
  clamp(lng + randomBetween(-2.4, 2.4), -179.9, 179.9),
  clamp(lat + randomBetween(-1.6, 1.6), -85, 85),
];

export const generateSignalBurst = (
  candidateRegionIds: string[],
  count = 6,
  now = new Date(),
): Signal[] => {
  const burstSize = Math.max(2, count + Math.floor(Math.random() * 3) - 1);

  return Array.from({ length: burstSize }, (_, index) => {
    const regionId = pickRegionId(candidateRegionIds);
    const region = REGION_LOOKUP.get(regionId);

    if (!region) {
      throw new Error(`Missing region for id ${regionId}`);
    }

    const type = pickSignalType();
    const severityBias = type === "infrastructure_disruption" ? 0.6 : 0.45;
    const severity = clamp(randomBetween(severityBias, 1));
    const [lng, lat] = jitterLocation(region.center[0], region.center[1]);

    return {
      id: `${now.getTime()}-${index}-${Math.random().toString(16).slice(2, 8)}`,
      type,
      severity,
      location: [lng, lat],
      timestamp: now.toISOString(),
      regionId,
    };
  });
};

const signalEventTemplates: Record<SignalType, string[]> = {
  shipping_congestion: [
    "Shipping congestion increased",
    "Maritime queue length rose",
    "Port throughput degraded",
  ],
  extreme_weather: [
    "Weather anomaly detected",
    "Storm intensity elevated",
    "Severe weather watch expanded",
  ],
  news_sentiment_spike: [
    "Negative news sentiment accelerated",
    "Media volatility spike detected",
    "Public sentiment turned sharply negative",
  ],
  infrastructure_disruption: [
    "Infrastructure outage reported",
    "Critical facility disruption detected",
    "Network reliability dropped",
  ],
};

export const signalToActivityText = (signal: Signal, regionName: string): string => {
  const options = signalEventTemplates[signal.type];
  const prefix = options[Math.floor(Math.random() * options.length)] ?? "Anomaly detected";
  return `${prefix} in ${regionName}`;
};

export const formatSignalType = (type: SignalType): string =>
  type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
