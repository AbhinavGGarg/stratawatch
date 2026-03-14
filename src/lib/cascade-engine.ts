import type { CascadeResult, CascadeSnapshot, NodeStatus, SystemLink, SystemNode } from "@/lib/types";

const timelineSteps: Array<0 | 5 | 15 | 30> = [0, 5, 15, 30];

const nodeTemplate: SystemNode[] = [
  { id: "port_delta", label: "Port Delta", type: "port", criticality: 0.88 },
  { id: "port_nova", label: "Port Nova", type: "port", criticality: 0.82 },
  { id: "grid_alpha", label: "Grid Alpha", type: "power", criticality: 0.9 },
  { id: "grid_beta", label: "Grid Beta", type: "power", criticality: 0.76 },
  { id: "hospital_01", label: "Hospital 01", type: "hospital", criticality: 0.74 },
  { id: "hospital_02", label: "Hospital 02", type: "hospital", criticality: 0.72 },
  { id: "transit_hub_n", label: "Transit Hub North", type: "transport", criticality: 0.8 },
  { id: "transit_hub_s", label: "Transit Hub South", type: "transport", criticality: 0.78 },
  { id: "dc_core", label: "Data Center Core", type: "data", criticality: 0.92 },
  { id: "dc_backup", label: "Data Center Backup", type: "data", criticality: 0.75 },
  { id: "rail_freight", label: "Rail Freight", type: "transport", criticality: 0.7 },
  { id: "fuel_terminal", label: "Fuel Terminal", type: "port", criticality: 0.84 },
  { id: "substation_w", label: "Substation West", type: "power", criticality: 0.72 },
  { id: "substation_e", label: "Substation East", type: "power", criticality: 0.74 },
  { id: "air_bridge", label: "Air Bridge", type: "transport", criticality: 0.69 },
  { id: "telemetry_gate", label: "Telemetry Gate", type: "data", criticality: 0.68 },
];

const linkTemplate: SystemLink[] = [
  { source: "port_delta", target: "rail_freight", weight: 0.88 },
  { source: "port_nova", target: "rail_freight", weight: 0.8 },
  { source: "fuel_terminal", target: "grid_alpha", weight: 0.74 },
  { source: "grid_alpha", target: "transit_hub_n", weight: 0.83 },
  { source: "grid_alpha", target: "dc_core", weight: 0.91 },
  { source: "grid_beta", target: "dc_backup", weight: 0.76 },
  { source: "grid_beta", target: "hospital_02", weight: 0.65 },
  { source: "substation_w", target: "hospital_01", weight: 0.78 },
  { source: "substation_e", target: "hospital_02", weight: 0.8 },
  { source: "dc_core", target: "telemetry_gate", weight: 0.86 },
  { source: "dc_backup", target: "telemetry_gate", weight: 0.64 },
  { source: "transit_hub_n", target: "air_bridge", weight: 0.69 },
  { source: "transit_hub_s", target: "air_bridge", weight: 0.61 },
  { source: "rail_freight", target: "transit_hub_s", weight: 0.7 },
  { source: "telemetry_gate", target: "port_delta", weight: 0.56 },
  { source: "telemetry_gate", target: "port_nova", weight: 0.52 },
  { source: "fuel_terminal", target: "transit_hub_n", weight: 0.66 },
  { source: "port_delta", target: "grid_beta", weight: 0.58 },
];

const mulberry32 = (seed: number): (() => number) => {
  let t = seed;

  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), t | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const countByStatus = (statusMap: Record<string, NodeStatus>): { failed: number; stressed: number } => {
  const statuses = Object.values(statusMap);
  return {
    failed: statuses.filter((status) => status === "failed").length,
    stressed: statuses.filter((status) => status === "stressed").length,
  };
};

const selectTriggerNodes = (risk: number, random: () => number): string[] => {
  const triggerCount = risk >= 0.8 ? 3 : risk >= 0.55 ? 2 : 1;
  const weighted = [...nodeTemplate]
    .sort((left, right) => right.criticality - left.criticality)
    .slice(0, 8);

  const selected: string[] = [];
  while (selected.length < triggerCount) {
    const candidate = weighted[Math.floor(random() * weighted.length)]?.id;
    if (candidate && !selected.includes(candidate)) {
      selected.push(candidate);
    }
  }

  return selected;
};

const propagateFailures = (
  previousStatus: Record<string, NodeStatus>,
  steps: number,
  risk: number,
  random: () => number,
): Record<string, NodeStatus> => {
  const nextStatus: Record<string, NodeStatus> = { ...previousStatus };

  for (let i = 0; i < steps; i += 1) {
    for (const link of linkTemplate) {
      const sourceStatus = nextStatus[link.source];
      const targetStatus = nextStatus[link.target];

      if (targetStatus === "failed") {
        continue;
      }

      const baseProbability = link.weight * (0.23 + risk * 0.67);

      if (sourceStatus === "failed") {
        const failRoll = random();
        if (failRoll < baseProbability) {
          nextStatus[link.target] = "failed";
          continue;
        }

        if (targetStatus === "healthy" && failRoll < baseProbability + 0.22) {
          nextStatus[link.target] = "stressed";
        }
      }

      if (sourceStatus === "stressed" && targetStatus === "healthy") {
        if (random() < baseProbability * 0.38) {
          nextStatus[link.target] = "stressed";
        }
      }
    }

    for (const node of nodeTemplate) {
      if (nextStatus[node.id] === "stressed" && random() < 0.07 + risk * 0.1) {
        nextStatus[node.id] = "failed";
      }
    }
  }

  return nextStatus;
};

export const getNetworkTemplate = (): { nodes: SystemNode[]; links: SystemLink[] } => ({
  nodes: nodeTemplate,
  links: linkTemplate,
});

export const simulateCascade = (regionId: string, regionRisk: number): CascadeResult => {
  const seed =
    Math.floor(regionRisk * 100000) +
    [...regionId].reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 3), 0) +
    Date.now();
  const random = mulberry32(seed);

  const triggerNodes = selectTriggerNodes(regionRisk, random);
  let statusMap = Object.fromEntries(nodeTemplate.map((node) => [node.id, "healthy" as NodeStatus]));

  for (const nodeId of triggerNodes) {
    statusMap[nodeId] = "failed";
  }

  const snapshots: CascadeSnapshot[] = [];

  for (const minute of timelineSteps) {
    if (minute > 0) {
      const iterations = minute === 5 ? 2 : minute === 15 ? 4 : 5;
      statusMap = propagateFailures(statusMap, iterations, regionRisk, random);
    }

    const counts = countByStatus(statusMap);
    snapshots.push({
      minute,
      nodeStatus: { ...statusMap },
      failedCount: counts.failed,
      stressedCount: counts.stressed,
    });
  }

  const finalSnapshot = snapshots[snapshots.length - 1];
  const failedNodes = Object.entries(finalSnapshot.nodeStatus)
    .filter(([, status]) => status === "failed")
    .map(([nodeId]) => nodeId);

  return {
    regionId,
    startedAt: new Date().toISOString(),
    triggerNodes,
    snapshots,
    failedNodes,
  };
};
