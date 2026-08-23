import { createFileRoute } from "@tanstack/react-router";
import { ProductionLab } from "@/components/production-lab";
export const Route = createFileRoute("/_authenticated/storyboard")({
  component: () => <ProductionLab mode="storyboard" />,
});
