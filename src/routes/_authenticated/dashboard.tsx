import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio-page";
export const Route = createFileRoute("/_authenticated/dashboard")({
  component: () => <StudioPage module="dashboard" />,
});
