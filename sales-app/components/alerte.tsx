/**
 * Un message d'alerte.
 *
 * La DA n'a qu'une couleur d'accent : un message d'erreur ne peut donc pas
 * être rouge. Il est traité comme le reste — par la MATIÈRE. Le message est
 * posé dans un creux sombre, et une seule arête, à gauche, s'allume en
 * braise quand quelque chose ne va pas. Un succès n'allume rien : on ne
 * félicite pas quelqu'un d'avoir cliqué.
 */
export function Alerte({
  children,
  ton = "danger",
}: {
  children: React.ReactNode;
  ton?: "danger" | "succes" | "info";
}) {
  const arete =
    ton === "danger"
      ? "shadow-[inset_2px_0_0_0_var(--braise)]"
      : "shadow-[inset_2px_0_0_0_var(--trait-fort)]";

  return (
    <p
      className={`apparition rounded-[var(--r)] bg-black/30 px-4 py-3 text-sm ${
        ton === "danger" ? "text-os" : "text-dim"
      } ${arete}`}
      role={ton === "danger" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
