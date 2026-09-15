/**
 * Les tests des jauges d'inscription.
 *
 * ⚠️ Ce qu'ils protègent n'est pas un calcul, c'est une PROMESSE. L'écran de
 * récapitulatif annonce à quelqu'un « 576 € de vêtements jamais portés » à
 * partir de deux curseurs qu'il a déplacés en dix secondes. Ce chiffre n'est
 * défendable qu'à trois conditions, et chacune est une ligne de ce fichier :
 *
 *  - il arrondit vers le BAS, jamais vers le haut, parce qu'on ne gonfle pas
 *    dans son propre sens une estimation qu'on ne peut pas vérifier ;
 *  - il ne s'affiche pas quand il ne veut rien dire (zéro, ou une seule des
 *    deux réponses) ;
 *  - la comparaison au prix de l'abonnement disparaît quand elle nous
 *    désavantage, au lieu d'être retournée.
 *
 * Aucune de ces trois règles ne casse quoi que ce soit si on l'enlève : le
 * calcul continue de rendre un nombre. Elles ne tiennent donc que par ces
 * tests.
 */

import { describe, expect, it } from "vitest";
import { PLANS } from "./plans";
import {
  CLOTHING_BUDGET,
  EMPTY_HABITS,
  GAUGE_QUESTIONS,
  GAUGE_SCREENS,
  MORNING_MINUTES,
  STYLE_CONFIDENCE,
  habitsSchema,
  hoursPerYear,
  insightsFrom,
  questionFor,
  vestiEurPerYear,
  wasteComparison,
  wastedEurPerYear,
  type Habits,
} from "./habits";

function answered(patch: Partial<Habits>): Habits {
  return { ...EMPTY_HABITS, ...patch };
}

describe("le temps rendu à l'année", () => {
  it("20 minutes par matin font 121 heures par an", () => {
    // 20 × 365 = 7300 minutes = 121,67 heures.
    expect(hoursPerYear(20)).toBe(121);
  });

  /**
   * ⚠️ Le test qui compte. 121,67 arrondi à l'unité supérieure donnerait 122 —
   * deux chiffres de plus dans notre sens sur une donnée déclarée. La règle est
   * qu'en cas de doute on annonce le plus petit.
   */
  it("arrondit vers le bas, jamais vers le haut", () => {
    for (const minutes of [1, 7, 13, 20, 29, 44]) {
      expect(hoursPerYear(minutes)).toBeLessThanOrEqual((minutes * 365) / 60);
    }
  });

  it("zéro minute ne fabrique pas d'heures", () => {
    expect(hoursPerYear(0)).toBe(0);
  });
});

describe("l'argent qui dort dans le placard", () => {
  it("80 € par mois et 4 pièces portées sur 10 font 576 € par an", () => {
    // 80 × 12 = 960 € par an, dont 6/10 jamais portés.
    expect(wastedEurPerYear(80, 4)).toBe(576);
  });

  it("tout porter ne gaspille rien", () => {
    expect(wastedEurPerYear(300, 10)).toBe(0);
  });

  it("ne rien porter gaspille tout le budget", () => {
    expect(wastedEurPerYear(100, 0)).toBe(1200);
  });

  it("arrondit vers le bas", () => {
    // 35 × 12 × 0,7 = 294 exactement ; 35 × 12 × 0,3 = 126. On vérifie surtout
    // qu'aucune décimale ne remonte.
    for (const worn of [1, 3, 7, 9]) {
      expect(wastedEurPerYear(35, worn)).toBeLessThanOrEqual(35 * 12 * ((10 - worn) / 10));
    }
  });
});

describe("le prix affiché", () => {
  /**
   * ⚠️ Calculé depuis `PLANS`, pas écrit en dur. Un 108 figé dans le code
   * survivrait à une hausse de prix, et l'écran d'inscription annoncerait alors
   * un tarif qui n'existe plus — à des gens qu'on est justement en train de
   * convaincre.
   */
  it("suit le prix du plan Pro", () => {
    expect(vestiEurPerYear()).toBe(Math.round(PLANS.pro.priceEur * 12));
  });
});

describe("ce que le récapitulatif accepte de dire", () => {
  it("sans aucune réponse, il n'a rien à dire", () => {
    expect(insightsFrom(EMPTY_HABITS)).toEqual([]);
  });

  /**
   * Quelqu'un qui répond honnêtement « zéro minute » n'a pas le problème qu'on
   * décrit. Lui annoncer « 0 h devant ton armoire » comme une révélation le
   * ferait fermer l'app, à juste titre.
   */
  it("une réponse à zéro ne produit pas de ligne", () => {
    const insights = insightsFrom(
      answered({ morning_minutes: 0, outfit_changes_per_week: 0, clothing_budget_eur: 0 })
    );
    expect(insights).toEqual([]);
  });

  it("le temps déclaré donne une ligne qui rappelle sa provenance", () => {
    const [line] = insightsFrom(answered({ morning_minutes: 20 }));
    expect(line.value).toBe("121 h");
    // ⚠️ Sans cette mention, un grand nombre posé sur l'écran se lit comme une
    // mesure relevée sur le dos de la personne.
    expect(line.source).toContain("20 min");
  });

  it("les grands nombres sont espacés à la française", () => {
    const [line] = insightsFrom(answered({ outfit_changes_per_week: 7 }));
    // 7 × 52 = 364 — on force plus grand pour voir le séparateur.
    expect(line.value).toBe("364");
    const [big] = insightsFrom(answered({ clothing_budget_eur: 300, worn_out_of_ten: 0 }));
    expect(big.value).toMatch(/3\s?600 €/);
  });

  describe("la ligne du gaspillage exige les DEUX réponses", () => {
    it("le budget seul ne dit rien d'un gaspillage", () => {
      const keys = insightsFrom(answered({ clothing_budget_eur: 80 })).map((i) => i.key);
      expect(keys).not.toContain("waste");
    });

    it("la proportion seule ne donne pas d'euros", () => {
      const keys = insightsFrom(answered({ worn_out_of_ten: 4 })).map((i) => i.key);
      expect(keys).not.toContain("waste");
    });

    it("les deux ensemble donnent le chiffre, et disent d'où il sort", () => {
      const line = insightsFrom(
        answered({ clothing_budget_eur: 80, worn_out_of_ten: 4 })
      ).find((i) => i.key === "waste");

      expect(line?.value).toBe("576 €");
      expect(line?.source).toContain("80 €");
      expect(line?.source).toContain("4");
    });
  });
});

describe("la comparaison au prix de l'abonnement", () => {
  /**
   * ⚠️ LE test de ce fichier.
   *
   * « Tu gaspilles 60 € par an » suivi de « l'abonnement coûte 108 € » est un
   * argument contre nous. La tentation permanente sera de garder la ligne quand
   * même en la tournant autrement. `wasteComparison` doit rendre `null` : on
   * n'affiche la comparaison que lorsqu'elle est vraie.
   */
  it("disparaît quand le gaspillage déclaré est inférieur au prix", () => {
    // 10 € par mois, 9 pièces sur 10 portées → 12 € par an.
    expect(wasteComparison(answered({ clothing_budget_eur: 10, worn_out_of_ten: 9 }))).toBeNull();
  });

  it("apparaît quand le gaspillage dépasse le prix", () => {
    const result = wasteComparison(answered({ clothing_budget_eur: 80, worn_out_of_ten: 4 }));
    expect(result).not.toBeNull();
    expect(result?.wasted).toBe(576);
    expect(result?.yearly).toBe(vestiEurPerYear());
    expect(result?.ratio).toBe(5); // 576 / 108 = 5,33 → 5, arrondi vers le bas.
  });

  /**
   * ⚠️ Le seuil d'affichage se mesure sur le prix ANNUEL, alors que l'écran
   * MET EN AVANT le mensuel. Le confondre ferait tomber la barre de 108 € à
   * 9 € : presque tout le monde la franchirait, et une barre que tout le monde
   * franchit ne protège plus de rien.
   */
  it("se compare à l'année, même si elle met en avant le mois", () => {
    const result = wasteComparison(answered({ clothing_budget_eur: 80, worn_out_of_ten: 4 }));
    expect(result?.monthly).toBe(PLANS.pro.priceEur);
    expect(result?.monthly).toBeLessThan(result!.yearly);

    // 30 € par mois, 9 sur 10 portés → 36 € gaspillés : au-dessus du prix
    // mensuel, en dessous du prix annuel. C'est le cas qui distingue les deux.
    expect(wasteComparison(answered({ clothing_budget_eur: 30, worn_out_of_ten: 9 }))).toBeNull();
  });

  it("n'existe pas sans réponse", () => {
    expect(wasteComparison(EMPTY_HABITS)).toBeNull();
  });

  it("n'existe pas quand tout est porté", () => {
    expect(
      wasteComparison(answered({ clothing_budget_eur: 300, worn_out_of_ten: 10 }))
    ).toBeNull();
  });
});

describe("les questions et leurs écrans", () => {
  /**
   * ⚠️ `GAUGE_SCREENS` et `GAUGE_QUESTIONS` sont deux listes qu'on peut éditer
   * séparément. Ajouter une question sans la placer sur un écran la rendrait
   * simplement invisible — une colonne en base que personne ne remplit jamais,
   * et aucune erreur nulle part.
   */
  it("chaque question est posée une fois et une seule", () => {
    const onScreens = GAUGE_SCREENS.flat();
    expect([...onScreens].sort()).toEqual(GAUGE_QUESTIONS.map((q) => q.key).sort());
  });

  it("la position de départ de chaque curseur est dans ses bornes", () => {
    for (const question of GAUGE_QUESTIONS) {
      expect(question.start).toBeGreaterThanOrEqual(question.bounds.min);
      expect(question.start).toBeLessThanOrEqual(question.bounds.max);
    }
  });

  it("chaque clé d'écran a bien une question", () => {
    for (const key of GAUGE_SCREENS.flat()) {
      expect(questionFor(key).key).toBe(key);
    }
  });
});

describe("la validation, miroir des contraintes CHECK de la base", () => {
  /**
   * ⚠️ Ces bornes ne sont pas un confort : `0022_habits.sql` pose les mêmes en
   * CHECK. Une valeur qui passe ici mais pas là-bas devient un rejet Postgres
   * au milieu d'une inscription.
   */
  it("accepte des réponses vides", () => {
    expect(habitsSchema.safeParse(EMPTY_HABITS).success).toBe(true);
  });

  it("refuse au-dessus du plafond", () => {
    const tooLong = answered({ morning_minutes: MORNING_MINUTES.max + 1 });
    expect(habitsSchema.safeParse(tooLong).success).toBe(false);
  });

  it("refuse en dessous du plancher", () => {
    // La confiance part de 1, pas de 0 : « 0 sur 10 » n'est pas une note.
    const tooLow = answered({ style_confidence: STYLE_CONFIDENCE.min - 1 });
    expect(habitsSchema.safeParse(tooLow).success).toBe(false);
  });

  it("refuse les décimales", () => {
    const fractional = answered({ clothing_budget_eur: 42.5 });
    expect(habitsSchema.safeParse(fractional).success).toBe(false);
  });

  it("accepte les bornes elles-mêmes", () => {
    const edges = answered({
      morning_minutes: MORNING_MINUTES.max,
      clothing_budget_eur: CLOTHING_BUDGET.max,
      style_confidence: STYLE_CONFIDENCE.min,
    });
    expect(habitsSchema.safeParse(edges).success).toBe(true);
  });
});
