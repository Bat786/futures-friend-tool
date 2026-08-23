import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio-page";
export const Route = createFileRoute("/_authenticated/campaigns")({
  component: () => <StudioPage module="campaigns" />,
});
