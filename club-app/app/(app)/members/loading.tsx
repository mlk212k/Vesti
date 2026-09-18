export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="clay-skeleton h-7 w-32" />
        <div className="clay-skeleton h-4 w-40" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="clay-skeleton h-16" />
        ))}
      </div>
    </div>
  );
}
