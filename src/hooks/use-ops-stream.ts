"use client";

import { useEffect } from "react";
import { DEMO_MODE_SCRIPT } from "@/mock-data/demo-mode";
import { useCommandStore } from "@/store/command-store";
import type { ActivityFeedItem } from "@/types/command-types";

const parseOpsEvent = (payload: string): ActivityFeedItem[] => {
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => typeof item === "object" && item !== null) as ActivityFeedItem[];
  } catch {
    return [];
  }
};

export const useOpsStream = (enabled: boolean) => {
  const pushOpsFeed = useCommandStore((state) => state.pushOpsFeed);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const source = new EventSource("/api/ops/stream");

    source.onmessage = (event) => {
      const items = parseOpsEvent(event.data);
      if (items.length > 0) {
        pushOpsFeed(items);
      }
    };

    source.onerror = () => {
      // Fallback to deterministic local script if SSE is unavailable.
      pushOpsFeed(DEMO_MODE_SCRIPT.slice(0, 2));
      source.close();
    };

    return () => {
      source.close();
    };
  }, [enabled, pushOpsFeed]);
};
