import NCAABracketCard from "@/components/dashboard/NCAABracketCard"
import WebAppCard from "@/components/dashboard/WebAppCard"
import LegacyCard from "@/components/dashboard/LegacyCard"

type Props = {
  poolCount: number
  entryCount: number
}

export default function ProductLauncherCards({ poolCount, entryCount }: Props) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <NCAABracketCard poolCount={poolCount} entryCount={entryCount} />
      <WebAppCard />
      <LegacyCard />
    </section>
  )
}
