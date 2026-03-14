"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useIsClient } from "@/hooks/use-is-client";
import type { RegionState } from "@/lib/types";

interface RiskTrendChartProps {
  region: RegionState | null;
}

const toData = (region: RegionState | null) =>
  (region?.riskHistory ?? []).map((point) => ({
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    risk: Number((point.risk * 100).toFixed(1)),
  }));

export function RiskTrendChart({ region }: RiskTrendChartProps) {
  const isClient = useIsClient();
  const data = toData(region);

  if (!isClient) {
    return <div className="h-28 rounded-xl border border-white/10 bg-black/35 p-2" />;
  }

  return (
    <div className="h-28 rounded-xl border border-white/10 bg-black/35 p-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
          <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#a1a1aa" }} tickLine={false} axisLine={false} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "#a1a1aa" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value}%`, "Risk"]}
            contentStyle={{
              backgroundColor: "#09090b",
              borderColor: "rgba(255,255,255,0.15)",
              borderRadius: "10px",
              fontSize: "12px",
            }}
          />
          <Line type="monotone" dataKey="risk" stroke="#f97316" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
