import AppHeader from "@/components/AppHeader";

export default function PageLoading({ kind }: { kind: "dashboard" | "essay" }) {
  const dashboard = kind === "dashboard";
  return (
    <div className="min-h-screen">
      <AppHeader />
      <main
        aria-busy="true"
        className="mx-auto max-w-[68rem] px-6 py-10 sm:py-14"
      >
        <p role="status" className="mb-6 text-sm text-muted">
          {dashboard ? "Loading your essays…" : "Opening your essay…"}
        </p>
        <div aria-hidden="true" className="space-y-4 motion-safe:animate-pulse">
          <div className="h-10 w-56 rounded-xl bg-line" />
          {dashboard ? [0, 1, 2].map((row) => (
            <div key={row} className="h-24 rounded-2xl border border-line bg-white" />
          )) : (
            <div className="space-y-6 rounded-2xl border border-line bg-white p-8">
              {[0, 1, 2, 3, 4, 5].map((line) => (
                <div key={line} className="h-4 w-4/5 rounded bg-line last:w-1/2" />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
