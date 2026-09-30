/**
 * Limiteur de débit en mémoire (fenêtre glissante, par clé).
 * Suffisant sur une instance ; sur un hébergement multi-instances, le
 * remplacer par un stockage partagé (Upstash Redis, Vercel KV…).
 */
const fenetres = new Map<string, number[]>()

export function autoriser(cle: string, max: number, fenetreMs: number): boolean {
  const maintenant = Date.now()
  const liste = (fenetres.get(cle) ?? []).filter((t) => maintenant - t < fenetreMs)
  if (liste.length >= max) {
    fenetres.set(cle, liste)
    return false
  }
  liste.push(maintenant)
  fenetres.set(cle, liste)
  if (fenetres.size > 5000) {
    for (const [k, v] of fenetres)
      if (v.every((t) => maintenant - t >= fenetreMs)) fenetres.delete(k)
  }
  return true
}
