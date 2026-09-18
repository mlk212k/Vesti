export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <div className="clay-skeleton h-7 w-48" />
        <div className="clay-skeleton h-4 w-64" />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="clay-skeleton h-20" />
        <div className="clay-skeleton h-20" />
        <div className="clay-skeleton h-20" />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="clay-skeleton h-5 w-36" />
          <div className="clay-skeleton h-16" />
          <div className="clay-skeleton h-16" />
        </div>
        <div className="space-y-2">
          <div className="clay-skeleton h-5 w-36" />
          <div className="clay-skeleton h-16" />
          <div className="clay-skeleton h-16" />
        </div>
      </section>
    </div>
  );
}
