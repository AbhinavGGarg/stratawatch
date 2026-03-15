"use client";

import { motion } from "framer-motion";
import { BriefingPanel } from "@/components/dashboard/BriefingPanel";
import { MapPanel } from "@/components/dashboard/MapPanel";
import { SignalsPanel } from "@/components/dashboard/SignalsPanel";
import type { DataMode } from "@/hooks/use-stratawatch";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { useStratawatch } from "@/hooks/use-stratawatch";

export type DashboardView = "overview" | "signals" | "risk-map";

interface StrataWatchDashboardProps {
  view: DashboardView;
  dataMode?: DataMode;
}

export function StrataWatchDashboard({ view, dataMode = "live" }: StrataWatchDashboardProps) {
  const {
    regions,
    signals,
    selectedRegion,
    selectedRegionId,
    setSelectedRegionId,
    selectedRegionSignals,
    stats,
    isLoading,
    activityFeed,
    lastUpdated,
    formatSignalType,
  } = useStratawatch(dataMode);

  const renderCenterPanel = () => {
    if (view === "signals") {
      return (
        <div className="grid h-full min-h-0 grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
          <MapPanel
            regions={regions}
            selectedRegionId={selectedRegionId}
            onSelectRegion={setSelectedRegionId}
            isLoading={isLoading}
          />
          <SignalsPanel signals={signals} regions={regions} formatSignalType={formatSignalType} />
        </div>
      );
    }

    return (
      <MapPanel
        regions={regions}
        selectedRegionId={selectedRegionId}
        onSelectRegion={setSelectedRegionId}
        isLoading={isLoading}
      />
    );
  };

  const usesBriefingPanel = view === "overview" || view === "risk-map";
  const gridColumnsClass = usesBriefingPanel
    ? "xl:grid-cols-[310px_minmax(0,1fr)_400px]"
    : "xl:grid-cols-[310px_minmax(0,1fr)]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),transparent_48%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.12),transparent_44%),#0b0b0f] px-3 py-3 md:px-4 md:py-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px] opacity-35" />

      <div className={`relative z-10 grid min-h-[calc(100vh-1.5rem)] grid-cols-1 gap-3 ${gridColumnsClass}`}>
        <motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35 }}>
          <Sidebar stats={stats} activityFeed={activityFeed} lastUpdated={lastUpdated} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="min-h-[56vh] xl:min-h-0"
        >
          {renderCenterPanel()}
        </motion.div>

        {usesBriefingPanel && (
          <motion.div initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
            <BriefingPanel
              selectedRegion={selectedRegion}
              signals={selectedRegionSignals}
              formatSignalType={formatSignalType}
            />
          </motion.div>
        )}
      </div>
    </main>
  );
}
