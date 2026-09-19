export function Alerte({
  children,
  ton = "danger",
}: {
  children: React.ReactNode;
  ton?: "danger" | "succes" | "info";
}) {
  const styles = {
    danger: "border-[rgba(255,59,59,0.35)] bg-[rgba(255,59,59,0.08)] text-[#ff9b9b]",
    succes:
      "border-[rgba(46,230,168,0.35)] bg-[rgba(46,230,168,0.08)] text-[#7ef0cb]",
    info: "border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.08)] text-[#c4b5fd]",
  }[ton];

  return (
    <p
      className={`apparition rounded-xl border px-3.5 py-2.5 text-sm ${styles}`}
      role={ton === "danger" ? "alert" : "status"}
    >
      {children}
    </p>
  );
}
