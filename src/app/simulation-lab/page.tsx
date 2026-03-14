import type { Metadata } from "next";
import { OperationsPageClient } from "@/components/operations/OperationsPageClient";

export const metadata: Metadata = {
  title: "StrataWatch | Simulation Lab",
  description:
    "Deterministic simulated command-center mode for rehearsal, scenario testing, and resilient demos.",
};

export default function SimulationLabPage() {
  return <OperationsPageClient dataMode="simulated" />;
}
