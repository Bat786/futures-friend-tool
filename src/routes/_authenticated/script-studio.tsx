import { createFileRoute } from "@tanstack/react-router";
import { ProductionLab } from "@/components/production-lab";
export const Route = createFileRoute("/_authenticated/script-studio")({
  component: () => <ProductionLab mode="scripts" />,
});
