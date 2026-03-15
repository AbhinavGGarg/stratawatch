import { REGION_CATALOG } from "@/lib/region-catalog";
import type { RegionState, RiskBand, Signal, SignalType } from "@/lib/types";

const signalTypeWeight: Record<SignalType, number> = {
  shipping_congestion: 0.82,
  extreme_weather: 0.78,
  news_sentiment_spike: 0.8,
  infrastructure_disruption: 0.9,
};

const clamp = (value: number, min = 0, max = 1): number => Math.max(min, Math.min(max, value));

const getRiskBand = (risk: number): RiskBand => {
  if (risk >= 0.8) return "critical";
  if (risk >= 0.62) return "high";
  if (risk >= 0.36) return "medium";
  return "low";
};

const average = (numbers: number[]): number => {
  if (numbers.length === 0) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};

const groupByRegion = (signals: Signal[]): Map<string, Signal[]> => {
  const regionSignals = new Map<string, Signal[]>();

  for (const signal of signals) {
    const current = regionSignals.get(signal.regionId) ?? [];
    current.push(signal);
    regionSignals.set(signal.regionId, current);
  }

  return regionSignals;
};

const topDrivers = (signals: Signal[]): SignalType[] => {
  const weighted = new Map<SignalType, number>();

  for (const signal of signals) {
    const next = (weighted.get(signal.type) ?? 0) + signal.severity * signalTypeWeight[signal.type];
    weighted.set(signal.type, next);
  }

  return [...weighted.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([type]) => type);
};

const recentSignalDensity = (signals: Signal[], now: Date): number => {
  const horizonMs = 1000 * 60 * 60 * 24;
  const decayWindowMs = 1000 * 60 * 60 * 3;

  const weightedCount = signals.reduce((sum, signal) => {
    const ageMs = now.getTime() - new Date(signal.timestamp).getTime();
    if (ageMs < 0 || ageMs > horizonMs) {
      return sum;
    }

    const decay = Math.exp(-ageMs / decayWindowMs);
    return sum + decay;
  }, 0);

  return clamp(weightedCount / 5.5);
};

export const createInitialRegionState = (): RegionState[] => {
  const now = new Date().toISOString();

  return REGION_CATALOG.map((region) => {
    const baseRisk = clamp(0.16 + Math.random() * 0.22);

    return {
      ...region,
      risk: baseRisk,
      riskBand: getRiskBand(baseRisk),
      drivers: [],
      recentEvents: [],
      riskHistory: [{ timestamp: now, risk: baseRisk }],
    };
  });
};

export const recalculateRisk = (
  previousRegions: RegionState[],
  allSignals: Signal[],
  now = new Date(),
): RegionState[] => {
  const currentByRegion = groupByRegion(allSignals);
  const previousByRegion = new Map(previousRegions.map((region) => [region.id, region]));

  return previousRegions.map((region) => {
    const currentSignals = currentByRegion.get(region.id) ?? [];
    const neighborRisk = average(
      region.neighbors.map((neighborId) => previousByRegion.get(neighborId)?.risk ?? region.risk),
    );
    const density = recentSignalDensity(currentSignals, now);
    const severity = average(currentSignals.map((signal) => signal.severity));
    const signalPressure = average(currentSignals.map((signal) => signalTypeWeight[signal.type]));
    const eventPressure = clamp(region.recentEvents.length / 6);

    const rawRisk =
      density * 0.34 +
      severity * 0.28 +
      neighborRisk * 0.21 +
      eventPressure * 0.08 +
      signalPressure * 0.09;

    const previousRisk = previousByRegion.get(region.id)?.risk ?? region.risk;
    const smoothedRisk = clamp(previousRisk * 0.45 + rawRisk * 0.55);
    const historyPoint = { timestamp: now.toISOString(), risk: smoothedRisk };

    return {
      ...region,
      risk: smoothedRisk,
      riskBand: getRiskBand(smoothedRisk),
      drivers: topDrivers(currentSignals),
      riskHistory: [...region.riskHistory, historyPoint].slice(-18),
    };
  });
};

export const buildRiskEscalationEvents = (
  previousRegions: RegionState[],
  nextRegions: RegionState[],
): Array<{ regionId: string; message: string; level: "warning" | "critical" }> => {
  const previousLookup = new Map(previousRegions.map((region) => [region.id, region]));
  const events: Array<{ regionId: string; message: string; level: "warning" | "critical" }> = [];

  for (const region of nextRegions) {
    const previous = previousLookup.get(region.id);
    if (!previous) {
      continue;
    }

    const crossedHigh = previous.risk < 0.62 && region.risk >= 0.62;
    const crossedCritical = previous.risk < 0.8 && region.risk >= 0.8;

    if (crossedCritical) {
      events.push({
        regionId: region.id,
        message: `${region.name} escalated to critical civilian risk`,
        level: "critical",
      });
      continue;
    }

    if (crossedHigh) {
      events.push({
        regionId: region.id,
        message: `${region.name} moved into elevated civilian risk`,
        level: "warning",
      });
    }
  }

  return events;
};

export const appendRegionEvent = (
  regions: RegionState[],
  regionId: string,
  message: string,
): RegionState[] =>
  regions.map((region) => {
    if (region.id !== regionId) {
      return region;
    }

    const dedupedRecentEvents = [message, ...region.recentEvents.filter((event) => event !== message)].slice(0, 6);

    return {
      ...region,
      recentEvents: dedupedRecentEvents,
    };
  });
