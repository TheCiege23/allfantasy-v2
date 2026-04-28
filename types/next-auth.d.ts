import "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      /** True when user has linked Spotify (auth_accounts row). */
      spotifyAccount?: boolean
    }
  }

  interface User {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    spotifyAccount?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    sub?: string
  }
}
