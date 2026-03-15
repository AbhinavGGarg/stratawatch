import type { Metadata } from "next";
import { AIIntelligencePageClient } from "@/components/ai/AIIntelligencePageClient";

export const metadata: Metadata = {
  title: "StrataWatch | AI Intelligence",
  description:
    "Advanced AI/ML layer for anomaly detection, predictive cascades, risk forecasting, and building-level decision support.",
};

export default function AIIntelligencePage() {
  return <AIIntelligencePageClient />;
}
