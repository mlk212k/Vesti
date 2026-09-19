// Squelette affiché pendant le rendu serveur d'une page. Il reprend la forme
// des écrans (un grand panneau, une rangée de tuiles, une liste) pour que le
// contenu ne fasse pas sauter la mise en page en arrivant.
export default function Loading() {
  return (
    <div className="apparition space-y-6" aria-busy="true" aria-label="Chargement">
      <div className="space-y-2">
        <div className="squelette h-3 w-24" />
        <div className="squelette h-9 w-56" />
      </div>

      <div className="squelette h-64 w-full rounded-[26px]" />

      <div className="grid grid-cols-3 gap-3">
        <div className="squelette h-24" />
        <div className="squelette h-24" />
        <div className="squelette h-24" />
      </div>

      <div className="space-y-2">
        <div className="squelette h-16 w-full" />
        <div className="squelette h-16 w-full" />
        <div className="squelette h-16 w-full" />
      </div>
    </div>
  );
}
