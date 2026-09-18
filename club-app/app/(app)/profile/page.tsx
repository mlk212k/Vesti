import { AvatarUploader } from "@/components/avatar-uploader";
import { NotificationOptIn } from "@/components/notification-opt-in";
import { requireUser } from "@/lib/auth";
import { CATEGORIES, categoryLabel } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/format";
import { updateProfileAction } from "./actions";

export default async function ProfilePage() {
  const me = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, jersey_number, position, phone, category, avatar_url")
    .eq("id", me.id)
    .single();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mon profil</h1>
        <p className="text-sm text-muted">
          Rôle&nbsp;: <span className="text-foreground">{roleLabel(me.role)}</span>
          {profile?.category && (
            <>
              {" · "}
              Catégorie&nbsp;:{" "}
              <span className="text-foreground">
                {categoryLabel(profile.category)}
              </span>
            </>
          )}
        </p>
      </header>

      <AvatarUploader
        userId={me.id}
        fullName={profile?.full_name ?? me.full_name}
        currentAvatarUrl={profile?.avatar_url ?? null}
      />

      <NotificationOptIn />

      <form action={updateProfileAction} className="clay grid gap-3 p-4">
        <label className="space-y-1">
          <span className="text-xs text-muted">Nom complet</span>
          <input
            required
            name="full_name"
            defaultValue={profile?.full_name ?? me.full_name}
            className="clay-creux w-full px-3 py-2.5"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Catégorie</span>
          <select
            name="category"
            defaultValue={profile?.category ?? ""}
            className="clay-creux w-full px-3 py-2.5"
          >
            <option value="">—</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Numéro de maillot</span>
          <input
            type="number"
            min={0}
            max={99}
            name="jersey_number"
            defaultValue={profile?.jersey_number ?? ""}
            className="clay-creux w-full px-3 py-2.5"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Poste</span>
          <input
            name="position"
            placeholder="Gardien, ailier, …"
            defaultValue={profile?.position ?? ""}
            className="clay-creux w-full px-3 py-2.5"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted">Téléphone</span>
          <input
            name="phone"
            defaultValue={profile?.phone ?? ""}
            className="clay-creux w-full px-3 py-2.5"
          />
        </label>
        <div>
          <button
            type="submit"
            className="clay-accent clay-presse px-5 py-2.5 font-medium"
          >
            Enregistrer
          </button>
        </div>
      </form>

      <form action="/logout" method="post" className="pt-2">
        <button
          type="submit"
          className="clay-creux clay-presse w-full px-4 py-2.5 text-sm text-muted"
        >
          Déconnexion
        </button>
      </form>
    </div>
  );
}
