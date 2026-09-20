export function Alerte({
  children,
  ton = "danger",
}: {
  children: React.ReactNode;
  ton?: "danger" | "succes" | "info";
}) {
  const styles = {
    danger: "border-[rgba(255,49,49,0.4)] bg-[rgba(255,49,49,0.08)] text-[#ff8a8a]",
    succes:
      "border-[rgba(204,255,0,0.4)] bg-[rgba(204,255,0,0.08)] text-lime",
    info: "border-[rgba(34,223,255,0.35)] bg-[rgba(34,223,255,0.07)] text-nfc",
  }[ton];

  return (
    <p
      className={`apparition rounded-[6px] border px-3.5 py-2.5 text-sm ${styles}`}
      role={ton === "danger" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
