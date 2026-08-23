import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { BrokerVaultProvider } from "@/lib/broker-vault";
import { isAdminUser } from "@/lib/admin-auth";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    if (!isAdminUser(data.user)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth", search: { denied: "1" } });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <BrokerVaultProvider>
      <Outlet />
    </BrokerVaultProvider>
  );
}
