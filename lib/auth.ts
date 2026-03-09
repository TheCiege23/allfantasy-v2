import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

function getAuthSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "NEXTAUTH_SECRET is not set. Add it to your local environment and Vercel project settings."
    );
  }

  return secret;
}

function buildSleeperAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/${avatar}`;
}

async function fetchSleeperUser(username: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(
      `https://api.sleeper.app/v1/user/${encodeURIComponent(username)}`,
      {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      user_id?: string;
      display_name?: string;
      avatar?: string | null;
    };

    if (!data?.user_id) {
      return null;
    }

    return data;
  } catch (error) {
    console.error("[auth] Sleeper lookup failed:", error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/auth/error",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Password",
      credentials: {
        login: { label: "Email or Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawLogin = credentials?.login;
        const rawPassword = credentials?.password;

        if (!rawLogin || !rawPassword) {
          return null;
        }

        const login = rawLogin.trim().toLowerCase();
        const password = rawPassword;

        const user = await prisma.appUser.findFirst({
          where: {
            OR: [{ email: login }, { username: login }],
          },
        });

        if (!user) {
          return null;
        }

        if (!user.passwordHash) {
          const isSleeperOnlyAccount =
            typeof user.email === "string" &&
            user.email.endsWith("@sleeper.allfantasy.ai");

          if (isSleeperOnlyAccount) {
            throw new Error("SLEEPER_ONLY_ACCOUNT");
          }

          throw new Error("PASSWORD_NOT_SET");
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username || user.email,
          image: user.avatarUrl,
        };
      },
    }),
    CredentialsProvider({
      id: "sleeper",
      name: "Sleeper",
      credentials: {
        sleeperUsername: { label: "Sleeper Username", type: "text" },
      },
      async authorize(credentials) {
        const rawUsername = credentials?.sleeperUsername;

        if (!rawUsername) {
          return null;
        }

        const sleeperUsername = rawUsername.trim();

        if (!sleeperUsername) {
          return null;
        }

        const sleeperUser = await fetchSleeperUser(sleeperUsername);

        if (!sleeperUser?.user_id) {
          return null;
        }

        const sleeperUserId = sleeperUser.user_id;
        const displayName = sleeperUser.display_name?.trim() || sleeperUsername;
        const avatarUrl = buildSleeperAvatarUrl(sleeperUser.avatar);

        let user = await prisma.appUser.findFirst({
          where: {
            username: `sleeper_${sleeperUserId}`,
          },
        });

        if (!user) {
          user = await prisma.appUser.create({
            data: {
              email: `${sleeperUserId}@sleeper.allfantasy.ai`,
              username: `sleeper_${sleeperUserId}`,
              displayName,
              avatarUrl,
            },
          });
        } else {
          const needsUpdate =
            user.displayName !== displayName || user.avatarUrl !== avatarUrl;

          if (needsUpdate) {
            user = await prisma.appUser.update({
              where: { id: user.id },
              data: {
                displayName,
                avatarUrl,
              },
            });
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username || user.email,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name;
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image;

        (session.user as { id?: string }).id =
          typeof token.id === "string" ? token.id : undefined;
      }

      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;

      try {
        await prisma.userProfile.upsert({
          where: { userId: user.id },
          update: {},
          create: { userId: user.id },
        });
      } catch (error) {
        console.error("[auth] signIn event error:", error);
      }
    },
  },
};