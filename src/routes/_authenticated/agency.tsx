import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio-page";
export const Route = createFileRoute("/_authenticated/agency")({
  component: () => <StudioPage module="agency" />,
});
