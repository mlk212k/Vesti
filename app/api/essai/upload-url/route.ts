import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { OUTFITS_BUCKET } from "@/lib/supabase/storage";
import {
  ANON_TRIAL_COOKIE,
  ANON_TRIAL_COOKIE_MAX_AGE,
  MAX_TRIALS_PER_DAY,
  MAX_TRIALS_PER_IP_PER_DAY,
  buildAnonPath,
  clientIp,
  hashIp,
  trialRefusalMessage,
  type TrialRefusal,
} from "@/lib/anon-trial";

const bodySchema = z.object({
  extension: z.string().min(2).max(5),
});

/**
 * Réserve un essai gratuit et rend de quoi envoyer la photo.
 *
 * ⚠️ LA RÉSERVATION A LIEU ICI, avant l'envoi de la photo, et c'est délibéré.
 * On pourrait attendre l'appel au modèle — le moment où l'argent se dépense
 * vraiment — mais alors quelqu'un qui a dépassé les plafonds téléverserait
 * 3 Mo sur un réseau mobile pour s'entendre refuser ensuite. La place est prise
 * d'abord ; une réservation qui n'aboutit pas laisse une ligne sans verdict,
 * ce qui compte dans le plafond du jour. C'est le bon sens de l'erreur : mieux
 * vaut offrir un essai de moins que d'en payer un de trop.
 *
 * L'URL d'envoi est signée par la clé de service et non par la session du
 * visiteur — il n'en a pas. C'est donc le serveur qui décide du chemin, et le
 * client ne peut pas écrire ailleurs que dans le dossier de son essai.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const jar = await cookies();

  // ⚠️ Un jeton déjà posé ne donne PAS droit à un nouvel essai : on en crée un
  // nouveau à chaque demande, et c'est le SQL qui refuse si les plafonds sont
  // atteints. Faire confiance au cookie pour dire « celui-ci a déjà eu le
  // sien » reviendrait à laisser le visiteur décider, en l'effaçant.
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reserve_anon_trial", {
    p_ip_hash: hashIp(clientIp(request)),
    p_max_per_day: MAX_TRIALS_PER_DAY,
    p_max_per_ip_per_day: MAX_TRIALS_PER_IP_PER_DAY,
  });

  if (error) {
    return NextResponse.json({ error: "trial_unavailable" }, { status: 503 });
  }

  const row = (data as { trial_id: string | null; refusal: string | null }[] | null)?.[0];

  if (!row?.trial_id) {
    const refusal = (row?.refusal ?? "daily_cap") as TrialRefusal;
    return NextResponse.json(
      { error: refusal, message: trialRefusalMessage(refusal) },
      { status: 429 }
    );
  }

  const path = buildAnonPath(row.trial_id, parsed.data.extension.toLowerCase());
  const signed = await admin.storage.from(OUTFITS_BUCKET).createSignedUploadUrl(path);

  if (signed.error || !signed.data) {
    return NextResponse.json({ error: "upload_url_failed" }, { status: 500 });
  }

  // Le jeton part en cookie httpOnly : c'est lui qui permettra, après
  // l'inscription, de retrouver l'essai pour le rattacher au compte. Lisible
  // par le client, il serait falsifiable — et réclamer l'essai d'un autre
  // reviendrait à s'attribuer son verdict.
  jar.set(ANON_TRIAL_COOKIE, row.trial_id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ANON_TRIAL_COOKIE_MAX_AGE,
    path: "/",
  });

  return NextResponse.json({
    path,
    token: signed.data.token,
    signedUrl: signed.data.signedUrl,
  });
}
