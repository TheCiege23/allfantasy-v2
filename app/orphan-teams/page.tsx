import OrphanTeamsClient from "./OrphanTeamsClient"

export const metadata = {
  title: "Orphan Team Marketplace | AllFantasy",
  description: "Adopt orphan teams across supported sports with commissioner approval flow.",
}

export default function OrphanTeamsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <OrphanTeamsClient />
    </main>
  )
}

