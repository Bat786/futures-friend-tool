import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LAYOUT_PRESETS, normalizeLayout, type SavedLayout } from "./workspace-layouts";

const layoutSchema = z.object({
  columns: z
    .array(z.object({ id: z.string().min(1), panels: z.array(z.string()) }))
    .min(1),
});

export const listLayouts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workspace_layouts")
      .select("id, name, panels, is_default, updated_at")
      .eq("user_id", context.userId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    // First visit: seed the starter presets so the workspace is usable at once.
    if (!data || data.length === 0) {
      const rows = LAYOUT_PRESETS.map((p, i) => ({
        user_id: context.userId,
        name: p.name,
        panels: p.panels as unknown as Record<string, unknown>,
        is_default: i === 0,
      }));
      const seeded = await context.supabase
        .from("workspace_layouts")
        .insert(rows)
        .select("id, name, panels, is_default, updated_at");
      if (seeded.error) throw new Error(seeded.error.message);
      return {
        layouts: (seeded.data ?? []).map((r) => ({
          ...r,
          panels: normalizeLayout(r.panels),
        })) as SavedLayout[],
      };
    }

    return {
      layouts: data.map((r) => ({ ...r, panels: normalizeLayout(r.panels) })) as SavedLayout[],
    };
  });

export const saveLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().min(1).max(60),
        panels: layoutSchema,
        isDefault: z.boolean().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    if (data.isDefault) {
      await context.supabase
        .from("workspace_layouts")
        .update({ is_default: false })
        .eq("user_id", context.userId);
    }

    const row = {
      user_id: context.userId,
      name: data.name,
      panels: data.panels as unknown as Record<string, unknown>,
      is_default: data.isDefault,
    };

    const { data: saved, error } = data.id
      ? await context.supabase
          .from("workspace_layouts")
          .update(row)
          .eq("id", data.id)
          .eq("user_id", context.userId)
          .select("id, name, panels, is_default, updated_at")
          .single()
      : await context.supabase
          .from("workspace_layouts")
          .upsert(row, { onConflict: "user_id,name" })
          .select("id, name, panels, is_default, updated_at")
          .single();

    if (error) throw new Error(error.message);
    return { layout: { ...saved, panels: normalizeLayout(saved.panels) } as SavedLayout };
  });

export const deleteLayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("workspace_layouts")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });