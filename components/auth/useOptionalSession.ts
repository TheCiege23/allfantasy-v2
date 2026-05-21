"use client"

import { useSession } from "next-auth/react"

type OptionalSessionResult = ReturnType<typeof useSession>

const unauthenticatedSession: OptionalSessionResult = {
  data: null,
  status: "unauthenticated",
  update: async () => null,
}

export function useOptionalSession(): OptionalSessionResult {
  try {
    return useSession() ?? unauthenticatedSession
  } catch {
    return unauthenticatedSession
  }
}
