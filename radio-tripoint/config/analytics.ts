/**
 * Mesure d'audience : AUCUNE installée. Pour en ajouter une, renseigner
 * `script` ci-dessous : le bandeau de consentement apparaîtra alors
 * automatiquement, et le script ne sera chargé qu'après accord explicite.
 * (Une solution exemptée de consentement, type Matomo configuré selon la
 * CNIL, peut se passer du bandeau : laisser `exigeConsentement: false`.)
 */
export const analytics = {
  nom: null as string | null, // ex. "Matomo"
  script: null as string | null, // URL du script de mesure
  exigeConsentement: true,
}

export const mesureActive = analytics.script !== null
