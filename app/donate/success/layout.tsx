/** Force dynamic so this route is not prerendered (avoids ECONNREFUSED and useSearchParams during build). */
export const dynamic = "force-dynamic"

export default function DonateSuccessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
