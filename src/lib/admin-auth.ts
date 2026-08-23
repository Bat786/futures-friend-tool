import type { User } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "zeeshad91@gmail.com";

export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === ADMIN_EMAIL;
}

export function isAdminUser(user: Pick<User, "email"> | null | undefined): boolean {
  return isAdminEmail(user?.email);
}
