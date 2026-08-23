import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio-page";
export const Route = createFileRoute("/_authenticated/website-lab")({
  component: () => <StudioPage module="website-lab" />,
});
