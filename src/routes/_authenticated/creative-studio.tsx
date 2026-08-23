import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio-page";
export const Route = createFileRoute("/_authenticated/creative-studio")({
  component: () => <StudioPage module="creative-studio" />,
});
