import type { ReactNode } from "react"
import ProductShellLayout from "@/components/navigation/ProductShellLayout"

export default function TournamentBracketLayout({ children }: { children: ReactNode }) {
  return <ProductShellLayout>{children}</ProductShellLayout>
}
