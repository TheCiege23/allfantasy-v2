import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveLoginToUser } from "@/lib/auth/login-identifier-resolver";

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

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    id: "credentials",
    name: "Password",
    credentials: {
      login: { label: "Email, username, or phone", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      // #region agent log
      const _log = (msg: string, data: Record<string, unknown>, hypothesisId: string) => {
        fetch('http://127.0.0.1:7282/ingest/0e682c6b-2c70-4f59-8e9a-ec784a2ad7bb', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fff6ba' }, body: JSON.stringify({ sessionId: 'fff6ba', location: 'lib/auth.ts:authorize', message: msg, data, hypothesisId, timestamp: Date.now() }) }).catch(() => {});
      };
      // #endregion
      try {
        const rawLogin = credentials?.login;
        const rawPassword = credentials?.password;

        if (!rawLogin || !rawPassword) {
          // #region agent log
          _log('authorize missing credentials', { hasLogin: !!rawLogin, hasPassword: !!rawPassword }, 'H2');
          // #endregion
          return null;
        }

        const login = rawLogin.trim();
        const password = rawPassword;
        // #region agent log
        _log('authorize start', { loginLen: login.length }, 'H1');
        // #endregion

        let user;
        try {
          user = await resolveLoginToUser(login);
        } catch (resolveErr: unknown) {
          // #region agent log
          _log('resolveLoginToUser threw', { errMsg: resolveErr instanceof Error ? resolveErr.message : String(resolveErr) }, 'H4');
          // #endregion
          throw resolveErr;
        }

        // #region agent log
        _log('after resolveLoginToUser', { hasUser: !!user, userId: user?.id ?? null }, 'H2');
        // #endregion
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
        // #region agent log
        _log('password check', { isValidPassword }, 'H3');
        // #endregion

        if (!isValidPassword) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username || user.email,
          image: user.avatarUrl,
        };
      } catch (err: unknown) {
        // #region agent log
        _log('authorize threw', { errMsg: err instanceof Error ? err.message : String(err) }, 'H1');
        // #endregion
        throw err;
      }
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
];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    })
  );
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
  providers,
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