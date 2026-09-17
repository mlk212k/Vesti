import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/format";
import { updateProfileAction } from "./actions";

export default async function ProfilePage() {
  const me = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, jersey_number, position, phone")
    .eq("id", me.id)
    .single();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mon profil</h1>
        <p className="text-sm text-muted">
          Rôle&nbsp;: <span className="text-foreground">{roleLabel(me.role)}</span>
        </p>
      </header>

      <form
        action={updateProfileAction}
        className="grid gap-3 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2"
      >
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Nom complet</span>
          <input
            required
            name="full_name"
            defaultValue={profile?.full_name ?? me.full_name}
            className="w-full rounded border border-border bg-surface-2 px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Numéro de maillot</span>
          <input
            type="number"
            min={0}
            max={99}
            name="jersey_number"
            defaultValue={profile?.jersey_number ?? ""}
            className="w-full rounded border border-border bg-surface-2 px-3 py-2"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Poste</span>
          <input
            name="position"
            placeholder="Gardien, ailier, …"
            defaultValue={profile?.position ?? ""}
            className="w-full rounded border border-border bg-surface-2 px-3 py-2"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs text-muted">Téléphone</span>
          <input
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className="w-full rounded border border-border bg-surface-2 px-3 py-2"
          />
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded bg-accent px-4 py-2 font-medium text-black hover:bg-accent-strong"
          >
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
