import { formatSignalType } from "@/lib/signal-generator";
import type { RegionState } from "@/lib/types";

const toPercent = (value: number): string => `${Math.round(value * 100)}%`;

const riskDescriptor = (risk: number): string => {
  if (risk >= 0.8) return "critical";
  if (risk >= 0.62) return "elevated";
  if (risk >= 0.36) return "watch";
  return "stable";
};

export const generateBriefingText = (region: RegionState | null): string => {
  if (!region) {
    return "Select a region to view a localized early-warning safety brief.";
  }

  const drivers =
    region.drivers.length > 0
      ? region.drivers.map((driver) => formatSignalType(driver).toLowerCase()).join(" and ")
      : "low-signal background noise";

  const neighborPressure = Math.round(region.risk * 0.7 * 100);

  return `Regional civilian risk is ${riskDescriptor(region.risk)} (${toPercent(region.risk)}) driven by ${drivers}. Neighboring zones show ${neighborPressure}% spillover pressure, suggesting possible disruption to movement, essential services, and local safety conditions.`;
};
