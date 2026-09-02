import { describe, expect, it } from "vitest";
import { effectivePlan } from "./plans";

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
