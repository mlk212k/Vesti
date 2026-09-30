/** Transition de page légère : un fondu à chaque navigation. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="fondu">{children}</div>
}
