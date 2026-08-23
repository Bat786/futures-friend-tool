import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/components/studio-page";
export const Route = createFileRoute("/_authenticated/content")({
  component: () => <StudioPage module="content" />,
});
