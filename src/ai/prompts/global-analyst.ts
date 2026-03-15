import type { AnomalyHotspot } from "@/lib/ai/types";
import type { RegionState } from "@/lib/types";

export const createGlobalAnalystPrompt = (
  region: RegionState,
  anomalies: AnomalyHotspot[],
): string => {
  const anomalyLine =
    anomalies.length > 0
      ? anomalies
          .slice(0, 3)
          .map((item) => `${item.regionName} (${Math.round(item.anomalyScore * 100)}% anomaly)`)
          .join(", ")
      : "no major anomaly clusters";

  return [
    "Generate a concise crisis analyst briefing for StrataWatch.",
    `Selected region: ${region.name}.`,
    `Current risk score: ${Math.round(region.risk * 100)}%.`,
    `Top anomaly clusters: ${anomalyLine}.`,
    "Output format:",
    "1) Two-sentence executive summary.",
    "2) Three likely downstream effects.",
    "3) Three monitor-now items.",
    "Tone: operational, concise, no marketing language.",
  ].join(" ");
};
