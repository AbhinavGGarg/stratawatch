"use client";

import { create } from "zustand";
import { SITE_SEED } from "@/mock-data/site-seed";
import type { ActivityFeedItem, BuildingSimulationResult, PanelState, ScaleLevel, ScenarioType, Site } from "@/types/command-types";

interface CommandStoreState {
  panel: PanelState;
  sites: Site[];
  selectedSite: Site | null;
  selectedBuildingId: string | null;
  latestSimulation: BuildingSimulationResult | null;
  opsFeed: ActivityFeedItem[];
  setScale: (scale: ScaleLevel) => void;
  setRegion: (regionId: string | null) => void;
  setSite: (siteId: string | null) => void;
  setBuilding: (buildingId: string | null) => void;
  setScenario: (scenario: ScenarioType | null) => void;
  pushOpsFeed: (items: ActivityFeedItem[]) => void;
  setSimulation: (result: BuildingSimulationResult | null) => void;
  setDemoMode: (enabled: boolean) => void;
}

const initialPanel: PanelState = {
  leftRailOpen: true,
  rightRailOpen: true,
  bottomTrayOpen: true,
  activeScale: "global",
  activeRegionId: null,
  activeSiteId: null,
  activeBuildingId: null,
  activeScenario: null,
  demoModeEnabled: false,
};

export const useCommandStore = create<CommandStoreState>((set, get) => ({
  panel: initialPanel,
  sites: SITE_SEED,
  selectedSite: null,
  selectedBuildingId: null,
  latestSimulation: null,
  opsFeed: [],
  setScale: (scale) =>
    set((state) => ({
      panel: {
        ...state.panel,
        activeScale: scale,
      },
    })),
  setRegion: (regionId) =>
    set((state) => ({
      panel: {
        ...state.panel,
        activeRegionId: regionId,
      },
    })),
  setSite: (siteId) => {
    const site = get().sites.find((entry) => entry.id === siteId) ?? null;

    set((state) => ({
      selectedSite: site,
      selectedBuildingId: site?.buildings[0]?.id ?? null,
      panel: {
        ...state.panel,
        activeScale: site ? "site" : state.panel.activeScale,
        activeSiteId: site?.id ?? null,
        activeBuildingId: site?.buildings[0]?.id ?? null,
      },
    }));
  },
  setBuilding: (buildingId) =>
    set((state) => ({
      selectedBuildingId: buildingId,
      panel: {
        ...state.panel,
        activeScale: buildingId ? "building" : state.panel.activeScale,
        activeBuildingId: buildingId,
      },
    })),
  setScenario: (scenario) =>
    set((state) => ({
      panel: {
        ...state.panel,
        activeScenario: scenario,
      },
    })),
  pushOpsFeed: (items) =>
    set((state) => ({
      opsFeed: [...items, ...state.opsFeed]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 120),
    })),
  setSimulation: (result) => set({ latestSimulation: result }),
  setDemoMode: (enabled) =>
    set((state) => ({
      panel: {
        ...state.panel,
        demoModeEnabled: enabled,
      },
    })),
}));
