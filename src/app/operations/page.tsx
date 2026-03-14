import type { Metadata } from "next";
import { OperationsPageClient } from "@/components/operations/OperationsPageClient";

export const metadata: Metadata = {
  title: "StrataWatch | Operations",
  description:
    "Multi-scale operational intelligence: global disruption monitoring fused with site and building-level simulation.",
};

export default function OperationsPage() {
  return <OperationsPageClient />;
}
