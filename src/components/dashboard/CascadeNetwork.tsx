"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIsClient } from "@/hooks/use-is-client";
import type { CascadeResult, NodeStatus, SystemLink, SystemNode } from "@/lib/types";

interface CascadeNetworkProps {
  result: CascadeResult | null;
  nodes: SystemNode[];
  links: SystemLink[];
}

interface ForceGraphNode {
  id: string;
  label: string;
  type: string;
  status: NodeStatus;
  x?: number;
  y?: number;
}

interface ForceGraphLink {
  source: string;
  target: string;
  weight: number;
}

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as ComponentType<Record<string, unknown>>;

const statusColor = {
  healthy: "#22c55e",
  stressed: "#f97316",
  failed: "#ef4444",
} as const;

const statusGlow = {
  healthy: "rgba(34,197,94,0.22)",
  stressed: "rgba(249,115,22,0.24)",
  failed: "rgba(239,68,68,0.34)",
} as const;

const timelineLabels = [0, 5, 15, 30];

export function CascadeNetwork({ result, nodes, links }: CascadeNetworkProps) {
  const [selectedMinute, setSelectedMinute] = useState<0 | 5 | 15 | 30>(30);
  const isClient = useIsClient();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [graphSize, setGraphSize] = useState({ width: 480, height: 260 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setGraphSize({
        width: Math.max(280, Math.floor(entry.contentRect.width)),
        height: Math.max(220, Math.floor(entry.contentRect.height)),
      });
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const selectedSnapshot = useMemo(
    () => result?.snapshots.find((snapshot) => snapshot.minute === selectedMinute) ?? null,
    [result, selectedMinute],
  );

  const graphData = useMemo(() => {
    const statusMap = selectedSnapshot?.nodeStatus ?? {};

    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        label: node.label,
        type: node.type,
        status: statusMap[node.id] ?? "healthy",
      })),
      links,
    };
  }, [links, nodes, selectedSnapshot]);

  const chartData = useMemo(
    () =>
      result?.snapshots.map((snapshot) => ({
        minute: `Minute ${snapshot.minute}`,
        failed: snapshot.failedCount,
        stressed: snapshot.stressedCount,
      })) ?? [],
    [result],
  );

  const metrics = useMemo(() => {
    if (!selectedSnapshot) {
      return { failed: 0, stressed: 0 };
    }

    return {
      failed: selectedSnapshot.failedCount,
      stressed: selectedSnapshot.stressedCount,
    };
  }, [selectedSnapshot]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {timelineLabels.map((minute) => (
          <button
            key={minute}
            type="button"
            onClick={() => setSelectedMinute(minute as 0 | 5 | 15 | 30)}
            className={`rounded-lg border px-2.5 py-1 text-xs transition ${
              selectedMinute === minute
                ? "border-orange-400/60 bg-orange-400/20 text-orange-200"
                : "border-white/10 bg-black/30 text-zinc-400 hover:bg-white/10"
            }`}
          >
            Minute {minute}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-red-200">
          <p className="text-[10px] uppercase tracking-wide text-red-300/80">Failed Nodes</p>
          <p className="mt-1 text-lg font-semibold">{metrics.failed}</p>
        </div>
        <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-orange-200">
          <p className="text-[10px] uppercase tracking-wide text-orange-300/80">Stressed Nodes</p>
          <p className="mt-1 text-lg font-semibold">{metrics.stressed}</p>
        </div>
      </div>

      <div ref={containerRef} className="h-[260px] overflow-hidden rounded-xl border border-white/10 bg-black/40">
        {isClient ? (
          <ForceGraph2D
            width={graphSize.width}
            height={graphSize.height}
            graphData={graphData as { nodes: ForceGraphNode[]; links: ForceGraphLink[] }}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={6}
            cooldownTicks={80}
            d3VelocityDecay={0.18}
            enableNodeDrag={false}
            linkColor={() => "rgba(161,161,170,0.35)"}
            linkWidth={(link: { weight?: number }) => 0.5 + (link.weight ?? 0.5) * 1.25}
            linkDirectionalParticles={(link: { source?: string | number }) => {
              const sourceNode = graphData.nodes.find((node) => node.id === String(link.source ?? ""));
              return sourceNode?.status === "failed" ? 3 : 0;
            }}
            linkDirectionalParticleSpeed={0.005}
            linkDirectionalParticleWidth={2}
            linkDirectionalParticleColor={() => "#f97316"}
            nodeCanvasObject={(node: unknown, context: CanvasRenderingContext2D, globalScale: number) => {
              const typedNode = node as ForceGraphNode;
              const label = typedNode.label;
              const fontSize = 11 / globalScale;
              const radius = typedNode.status === "failed" ? 6.8 : typedNode.status === "stressed" ? 6 : 5.4;
              const pulse = typedNode.status === "failed" ? 1 + Math.sin(Date.now() / 220) * 0.15 : 1;

              context.beginPath();
              context.arc(typedNode.x ?? 0, typedNode.y ?? 0, radius * pulse, 0, 2 * Math.PI, false);
              context.fillStyle = statusGlow[typedNode.status];
              context.fill();

              context.beginPath();
              context.arc(typedNode.x ?? 0, typedNode.y ?? 0, radius, 0, 2 * Math.PI, false);
              context.fillStyle = statusColor[typedNode.status];
              context.fill();

              context.font = `${fontSize}px ui-sans-serif`;
              context.textAlign = "center";
              context.textBaseline = "top";
              context.fillStyle = "rgba(244,244,245,0.92)";
              context.fillText(label, typedNode.x ?? 0, (typedNode.y ?? 0) + radius + 2);
            }}
          />
        ) : null}
      </div>

      <div className="h-36 rounded-xl border border-white/10 bg-black/35 p-2">
        {isClient ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(161,161,170,0.15)" vertical={false} />
              <XAxis dataKey="minute" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  borderColor: "rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  fontSize: "12px",
                }}
              />
              <Area type="monotone" dataKey="stressed" stroke="#f97316" fill="#f9731633" />
              <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="#ef44444d" />
            </AreaChart>
          </ResponsiveContainer>
        ) : null}
      </div>
    </div>
  );
}
