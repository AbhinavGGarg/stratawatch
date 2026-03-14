"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { simulateCascade, getNetworkTemplate } from "@/lib/cascade-engine";
import { REGION_CATALOG, REGION_LOOKUP } from "@/lib/region-catalog";
import { formatSignalType, generateSignalBurst, signalToActivityText } from "@/lib/signal-generator";
import {
  appendRegionEvent,
  buildRiskEscalationEvents,
  createInitialRegionState,
  recalculateRisk,
} from "@/lib/risk-engine";
import type { ActivityEvent, CascadeResult, RegionState, Signal } from "@/lib/types";

const ACTIVE_SIGNAL_WINDOW_MS = 1000 * 60 * 60 * 6;

const asTimestamp = (isoString: string): number => new Date(isoString).getTime();

const nowIso = (): string => new Date().toISOString();

const makeActivity = (
  message: string,
  level: ActivityEvent["level"],
  regionId?: string,
): ActivityEvent => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
  timestamp: nowIso(),
  level,
  message,
  regionId,
});

const sanitizeSignals = (signals: Signal[]): Signal[] => {
  const threshold = Date.now() - ACTIVE_SIGNAL_WINDOW_MS;
  const deduped = new Map<string, Signal>();

  for (const signal of signals) {
    if (asTimestamp(signal.timestamp) < threshold) {
      continue;
    }

    deduped.set(signal.id, signal);
  }

  return [...deduped.values()].sort(
    (left, right) => asTimestamp(right.timestamp) - asTimestamp(left.timestamp),
  );
};

export const useStratawatch = () => {
  const [regions, setRegions] = useState<RegionState[]>(() => createInitialRegionState());
  const [signals, setSignals] = useState<Signal[]>([]);
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(REGION_CATALOG[0]?.id ?? null);
  const [cascadesByRegion, setCascadesByRegion] = useState<Record<string, CascadeResult>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(nowIso());

  const regionsRef = useRef(regions);
  const signalsRef = useRef(signals);

  useEffect(() => {
    regionsRef.current = regions;
  }, [regions]);

  useEffect(() => {
    signalsRef.current = signals;
  }, [signals]);

  const ingestSignalBurst = useCallback((incomingSignals: Signal[]) => {
    const mergedSignals = sanitizeSignals([...signalsRef.current, ...incomingSignals]);
    signalsRef.current = mergedSignals;
    setSignals(mergedSignals);

    let nextRegions = recalculateRisk(regionsRef.current, mergedSignals, new Date());

    for (const signal of incomingSignals) {
      const regionName = REGION_LOOKUP.get(signal.regionId)?.name ?? "Unknown region";
      const eventText = signalToActivityText(signal, regionName);
      nextRegions = appendRegionEvent(nextRegions, signal.regionId, eventText);
    }

    const escalations = buildRiskEscalationEvents(regionsRef.current, nextRegions);

    regionsRef.current = nextRegions;
    setRegions(nextRegions);

    const signalEvents = incomingSignals.map((signal) => {
      const regionName = REGION_LOOKUP.get(signal.regionId)?.name ?? "Unknown region";
      return makeActivity(signalToActivityText(signal, regionName), signal.severity > 0.78 ? "warning" : "info", signal.regionId);
    });

    const escalationEvents = escalations.map((escalation) =>
      makeActivity(escalation.message, escalation.level, escalation.regionId),
    );

    setActivityFeed((previous) => [...escalationEvents, ...signalEvents, ...previous].slice(0, 40));
    setLastUpdated(nowIso());

    if (!selectedRegionId && nextRegions.length > 0) {
      const highestRisk = [...nextRegions].sort((left, right) => right.risk - left.risk)[0];
      setSelectedRegionId(highestRisk?.id ?? null);
    }
  }, [selectedRegionId]);

  useEffect(() => {
    let cancelled = false;

    const fetchBurst = async () => {
      try {
        const response = await fetch("/api/signal-burst?count=5", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch burst (${response.status})`);
        }

        const payload = (await response.json()) as { signals: Signal[] };
        if (!cancelled) {
          ingestSignalBurst(payload.signals);
        }
      } catch {
        if (!cancelled) {
          const fallbackSignals = generateSignalBurst(REGION_CATALOG.map((region) => region.id), 5);
          ingestSignalBurst(fallbackSignals);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchBurst();
    const intervalId = window.setInterval(fetchBurst, 5500);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [ingestSignalBurst]);

  const selectedRegion = useMemo(
    () => regions.find((region) => region.id === selectedRegionId) ?? null,
    [regions, selectedRegionId],
  );

  const selectedRegionSignals = useMemo(
    () =>
      signals
        .filter((signal) => signal.regionId === selectedRegionId)
        .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
        .slice(0, 8),
    [signals, selectedRegionId],
  );

  const stats = useMemo(() => {
    const activeSignals = signals.filter(
      (signal) => Date.now() - new Date(signal.timestamp).getTime() < ACTIVE_SIGNAL_WINDOW_MS,
    ).length;
    const highRiskZones = regions.filter((region) => region.risk >= 0.62).length;

    return {
      activeSignals,
      highRiskZones,
      systemsMonitored: getNetworkTemplate().nodes.length,
    };
  }, [regions, signals]);

  const triggerDisruption = () => {
    if (!selectedRegion) {
      return;
    }

    const cascade = simulateCascade(selectedRegion.id, selectedRegion.risk);
    setCascadesByRegion((previous) => ({ ...previous, [selectedRegion.id]: cascade }));

    const failedCount = cascade.snapshots[cascade.snapshots.length - 1]?.failedCount ?? 0;
    setActivityFeed((previous) =>
      [
        makeActivity(
          `Cascade simulation triggered in ${selectedRegion.name}: ${failedCount} systems failed by minute 30`,
          failedCount > 6 ? "critical" : "warning",
          selectedRegion.id,
        ),
        ...previous,
      ].slice(0, 40),
    );
  };

  const cascadeResult = selectedRegionId ? cascadesByRegion[selectedRegionId] ?? null : null;

  return {
    regions,
    signals,
    selectedRegion,
    selectedRegionSignals,
    selectedRegionId,
    setSelectedRegionId,
    stats,
    isLoading,
    activityFeed,
    triggerDisruption,
    cascadeResult,
    lastUpdated,
    networkTemplate: getNetworkTemplate(),
    formatSignalType,
  };
};
