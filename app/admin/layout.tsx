import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

/**
 * Garde du back-office.
 *
 * `notFound()` plutôt qu'une redirection ou un 403 : un visiteur non autorisé
 * ne doit même pas apprendre que cette section existe.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    notFound();
  }

  return <div className="flex min-h-dvh flex-1 flex-col">{children}</div>;
}
