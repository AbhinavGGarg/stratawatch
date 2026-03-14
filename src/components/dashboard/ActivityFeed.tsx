"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CircleAlert, Radar } from "lucide-react";
import type { ActivityEvent } from "@/lib/types";

interface ActivityFeedProps {
  events: ActivityEvent[];
}

const levelConfig = {
  info: {
    icon: Radar,
    textColor: "text-zinc-300",
    dot: "bg-emerald-400",
  },
  warning: {
    icon: CircleAlert,
    textColor: "text-amber-300",
    dot: "bg-amber-400",
  },
  critical: {
    icon: AlertTriangle,
    textColor: "text-red-300",
    dot: "bg-red-500",
  },
} as const;

const timeLabel = (isoString: string): string =>
  new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4 shadow-xl shadow-black/30 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">Activity Feed</h3>
        <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-300">
          Live
        </span>
      </div>

      <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <p className="text-xs text-zinc-500">Awaiting incoming signals...</p>
        ) : (
          events.map((event, index) => {
            const config = levelConfig[event.level];
            const Icon = config.icon;

            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.3 }}
                className="rounded-xl border border-white/5 bg-black/20 p-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 size-1.5 rounded-full ${config.dot}`} />
                  <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${config.textColor}`} />
                  <div>
                    <p className={`text-xs leading-relaxed ${config.textColor}`}>{event.message}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      {timeLabel(event.timestamp)}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
