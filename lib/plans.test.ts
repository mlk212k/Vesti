import { describe, expect, it } from "vitest";
import { effectivePlan, hasFeature, planOf, PLANS, wardrobeLimit } from "./plans";

/**
 * `effectivePlan` double `effective_plan()` en SQL (migration 0010). Le SQL
 * reste l'autorité — c'est lui qui décide du quota —, mais les deux doivent
 * répondre pareil, sinon l'écran annonce un plan que la base refuse d'appliquer.
 * Les mêmes cas sont couverts côté base dans supabase/tests/03_style.sql.
 */
const DANS_6_MOIS = new Date(Date.now() + 180 * 86_400_000).toISOString();
const HIER = new Date(Date.now() - 86_400_000).toISOString();

describe("effectivePlan", () => {
  it("garde le plan payé quand il n'y a pas de cadeau", () => {
    expect(effectivePlan("free", null, null)).toBe("free");
    expect(effectivePlan("pro", null, null)).toBe("pro");
  });

  it("applique le cadeau tant qu'il est valide", () => {
    expect(effectivePlan("free", "styliste", DANS_6_MOIS)).toBe("styliste");
  });

  it("retombe sur le plan payé quand le cadeau a expiré", () => {
    expect(effectivePlan("free", "styliste", HIER)).toBe("free");
  });

  it("ne rétrograde jamais un abonné payant", () => {
    expect(effectivePlan("styliste", "pro", DANS_6_MOIS)).toBe("styliste");
  });

  it("ignore un cadeau à moitié renseigné", () => {
    // Une date sans plan, ou un plan sans date, ne prouve rien : dans les deux
    // cas on s'en tient au plan payé plutôt que d'offrir sur une intuition.
    expect(effectivePlan("free", "styliste", null)).toBe("free");
    expect(effectivePlan("free", null, DANS_6_MOIS)).toBe("free");
  });
});

describe("planOf", () => {
  it("suit le cadeau, pas la colonne que pilote Stripe", () => {
    // Le cas qui a réellement échoué : un plan offert accordé, une colonne
    // `plan` restée sur « free », et l'app qui affichait Découverte tout en
    // refusant le dressing et les conseils d'achat.
    const offert = {
      plan: "free",
      gift_plan: "styliste",
      gift_plan_until: DANS_6_MOIS,
    } as const;

    expect(planOf(offert)).toBe("styliste");
    expect(hasFeature(planOf(offert), "dressing")).toBe(true);
    expect(hasFeature(planOf(offert), "shopping")).toBe(true);
  });

  it("retombe sur free sans profil", () => {
    expect(planOf(null)).toBe("free");
    expect(planOf(undefined)).toBe("free");
  });

  it("tolère une colonne plan vide", () => {
    expect(planOf({ plan: null, gift_plan: null, gift_plan_until: null })).toBe("free");
  });
});

describe("wardrobeLimit", () => {
  it("laisse les plans payants sans limite", () => {
    expect(wardrobeLimit("pro")).toBeNull();
    expect(wardrobeLimit("styliste")).toBeNull();
  });

  it("donne au plan Découverte de quoi remplir ses analyses offertes", () => {
    // 3 analyses × 4 pièces par tenue. Le chiffre importe moins que le lien :
    // c'est ce que produisent les analyses du plan, pas un nombre choisi.
    expect(wardrobeLimit("free")).toBe(PLANS.free.analysesPerMonth * 4);
  });

  it("suit l'offre si elle change", () => {
    // ⚠️ Le vrai contrat de cette fonction. Une limite écrite en dur resterait
    // figée le jour où l'offre passe de 3 à 5 analyses, et plus personne ne
    // saurait d'où sortait le chiffre. Ce test devient rouge si quelqu'un la
    // remplace par une constante.
    const limite = wardrobeLimit("free");
    expect(limite).not.toBeNull();
    expect(limite! % PLANS.free.analysesPerMonth).toBe(0);
    expect(limite!).toBeGreaterThan(PLANS.free.analysesPerMonth);
  });

  it("ne rend jamais zéro : une garde-robe vide ne se vend pas", () => {
    // Le cadenas ne marche que si l'on a vu ce qu'il enferme. À zéro pièce,
    // l'onglet redeviendrait le mur de paiement qu'on vient d'enlever.
    expect(wardrobeLimit("free")).toBeGreaterThan(0);
  });
});
