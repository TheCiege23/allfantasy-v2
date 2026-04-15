import { notFound } from "next/navigation"
import EngagementNotificationRoutingHarnessClient from "./EngagementNotificationRoutingHarnessClient"

export default async function E2EEngagementNotificationRoutingPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return <EngagementNotificationRoutingHarnessClient />
}
