import type { Metadata } from "next";
import { OperationsPageClient } from "@/components/operations/OperationsPageClient";

export const metadata: Metadata = {
  title: "StrataWatch | Command Center",
  description:
    "Unified command center for global disruption intelligence, cascade simulation, and building-level tactical response.",
};

export default function CommandCenterPage() {
  return <OperationsPageClient />;
}
