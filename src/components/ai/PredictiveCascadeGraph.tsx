"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import { useIsClient } from "@/hooks/use-is-client";
import type { PredictedCascadeEdge, PredictedCascadeNode } from "@/lib/ai/types";

interface PredictiveCascadeGraphProps {
  nodes: PredictedCascadeNode[];
  edges: PredictedCascadeEdge[];
}

interface ForceGraphNode extends PredictedCascadeNode {
  x?: number;
  y?: number;
}

interface ForceGraphLink extends PredictedCascadeEdge {
  source: string;
  target: string;
}

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as ComponentType<Record<string, unknown>>;

const nodeColor = (probability: number): string => {
  if (probability >= 0.72) return "#ef4444";
  if (probability >= 0.56) return "#f97316";
  if (probability >= 0.38) return "#facc15";
  return "#22c55e";
};

export function PredictiveCascadeGraph({ nodes, edges }: PredictiveCascadeGraphProps) {
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

  const graphData = useMemo(
    () => ({
      nodes,
      links: edges,
    }),
    [edges, nodes],
  );

  return (
    <div ref={containerRef} className="h-[270px] overflow-hidden rounded-xl border border-white/10 bg-black/35">
      {isClient ? (
        <ForceGraph2D
          width={graphSize.width}
          height={graphSize.height}
          graphData={graphData as { nodes: ForceGraphNode[]; links: ForceGraphLink[] }}
          backgroundColor="rgba(0,0,0,0)"
          nodeRelSize={6}
          cooldownTicks={90}
          d3VelocityDecay={0.2}
          enableNodeDrag={false}
          linkColor={(link: { probability?: number }) =>
            (link.probability ?? 0) > 0.5 ? "rgba(249,115,22,0.65)" : "rgba(161,161,170,0.28)"
          }
          linkWidth={(link: { probability?: number }) => 0.8 + (link.probability ?? 0) * 2.6}
          linkDirectionalParticles={(link: { probability?: number }) => {
            const probability = link.probability ?? 0;
            return probability > 0.65 ? 5 : probability > 0.45 ? 3 : probability > 0.25 ? 1 : 0;
          }}
          linkDirectionalParticleSpeed={(link: { probability?: number }) => 0.004 + (link.probability ?? 0) * 0.007}
          linkDirectionalParticleWidth={2}
          linkDirectionalParticleColor={() => "#fb923c"}
          nodeCanvasObject={(node: unknown, context: CanvasRenderingContext2D, globalScale: number) => {
            const typedNode = node as ForceGraphNode;
            const fontSize = 10 / globalScale;
            const radius = 5 + typedNode.failureProbability * 3.6;
            const pulse = 1 + Math.sin(Date.now() / 250 + typedNode.failureProbability * 2.4) * 0.12;

            context.beginPath();
            context.arc(typedNode.x ?? 0, typedNode.y ?? 0, radius * pulse, 0, 2 * Math.PI, false);
            context.fillStyle = `${nodeColor(typedNode.failureProbability)}44`;
            context.fill();

            context.beginPath();
            context.arc(typedNode.x ?? 0, typedNode.y ?? 0, radius, 0, 2 * Math.PI, false);
            context.fillStyle = nodeColor(typedNode.failureProbability);
            context.fill();

            context.font = `${fontSize}px ui-sans-serif`;
            context.textAlign = "center";
            context.textBaseline = "top";
            context.fillStyle = "rgba(244,244,245,0.92)";
            context.fillText(typedNode.label, typedNode.x ?? 0, (typedNode.y ?? 0) + radius + 3);
          }}
        />
      ) : null}
    </div>
  );
}
