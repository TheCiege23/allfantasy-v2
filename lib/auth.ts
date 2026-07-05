import type { NextAuthOptions, Profile } from "next-auth";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import SpotifyProvider from "next-auth/providers/spotify";
import FacebookProvider from "next-auth/providers/facebook";
import DiscordProvider from "next-auth/providers/discord";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resolveUnifiedAuthIdentity } from "@/lib/auth/AuthIdentityResolver";
import { linkSocialAccountToAppUser } from "@/lib/auth/SocialAccountLinkingService";
import { ensureSharedAccountProfile } from "@/lib/auth/SharedAccountBootstrapService";
import { lookupSleeperUser } from "@/lib/sleeper/user-lookup";
import { getTierFromXP, getXPRemainingToNextTier } from "@/lib/xp-progression/TierResolver";
import { resolveAuthSecret } from "@/lib/auth/resolve-auth-secret";
import { isPostOAuthRedirectPreservedPath } from "@/lib/auth/postOAuthRedirectPolicy";
import { canonicalizeProductRoute } from "@/lib/routing/canonicalizeProductRoute";

/** Only used while `next build` evaluates API routes; never used at runtime on Vercel if env is set. */
const BUILD_TIME_AUTH_SECRET_PLACEHOLDER =
  "build-only-placeholder-nextauth-secret-min-32-chars!!";

function getAuthSecret(): string {
  const secret = resolveAuthSecret();

  if (secret) {
    return secret;
  }

  // During `next build`, Next imports route modules to collect page data; CI may not inject secrets.
  // Production/preview runtime must still set NEXTAUTH_SECRET or AUTH_SECRET in the Vercel project.
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) {
    return BUILD_TIME_AUTH_SECRET_PLACEHOLDER;
  }

  throw new Error(
    "NEXTAUTH_SECRET (or AUTH_SECRET) is not set. Add it to your local environment and Vercel project settings."
  );
}

function buildSleeperAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  return `https://sleepercdn.com/avatars/${avatar}`;
}

function isDevAuthBypassEnabled(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.DEV_AUTH_BYPASS_ENABLED?.trim() === "true";
}

/** NextAuth sometimes omits `user.email` in the signIn callback; OAuth `profile` still has it. */
function resolveOAuthEmailFromCallback(
  user: { email?: string | null },
  profile?: Profile | null
): string | undefined {
  const fromUser =
    typeof user.email === "string" && user.email.includes("@") ? user.email.trim() : undefined;
  const fromProfile =
    profile &&
    typeof profile.email === "string" &&
    profile.email.includes("@")
      ? profile.email.trim()
      : undefined;
  return fromUser ?? fromProfile;
}

function getDevAuthProfile() {
  return {
    id: process.env.DEV_AUTH_BYPASS_USER_ID?.trim() || "local-dev-user",
    email: process.env.DEV_AUTH_BYPASS_EMAIL?.trim() || "local-dev@allfantasy.local",
    username: process.env.DEV_AUTH_BYPASS_USERNAME?.trim() || "local_dev_user",
    displayName: process.env.DEV_AUTH_BYPASS_NAME?.trim() || "Local Dev User",
  };
}

async function ensureDevAuthUser() {
  const profile = getDevAuthProfile();
  let user = await prisma.appUser.findFirst({
    where: {
      OR: [
        { id: profile.id },
        { email: { equals: profile.email, mode: "insensitive" } },
        { username: profile.username },
      ],
    },
  });

  if (!user) {
    user = await prisma.appUser.create({
      data: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        displayName: profile.displayName,
        emailVerified: new Date(),
      },
    });
  } else {
    user = await prisma.appUser.update({
      where: { id: user.id },
      data: {
        email: profile.email,
        username: profile.username,
        displayName: profile.displayName,
        emailVerified: user.emailVerified ?? new Date(),
      },
    });
  }

  await ensureSharedAccountProfile({
    userId: user.id,
    displayName: profile.displayName,
  });

  await prisma.managerXPProfile.upsert({
    where: { managerId: user.id },
    create: {
      managerId: user.id,
      totalXP: 0,
      currentTier: getTierFromXP(0),
      xpToNextTier: getXPRemainingToNextTier(0),
    },
    update: {},
  });

  return user;
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
      try {
        const rawLogin = credentials?.login;
        const rawPassword = credentials?.password;

        if (!rawLogin || !rawPassword) {
          return null;
        }

        const login = rawLogin.trim();
        const password = rawPassword;

        const user = await resolveUnifiedAuthIdentity(login);

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
          username: user.username,
          image: user.avatarUrl,
        };
      } catch (err: unknown) {
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

      const sleeperLookup = await lookupSleeperUser(sleeperUsername);

      if (sleeperLookup.status === "unavailable") {
        throw new Error("SLEEPER_LOOKUP_UNAVAILABLE");
      }

      if (sleeperLookup.status !== "found") {
        return null;
      }

      const sleeperUser = sleeperLookup.user;
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

      await ensureSharedAccountProfile({
        userId: user.id,
        displayName: user.displayName ?? displayName ?? user.username ?? null,
      });

      return {
        id: user.id,
        email: user.email,
        name: user.displayName || user.username || user.email,
        image: user.avatarUrl,
      };
    },
  }),
];

if (isDevAuthBypassEnabled()) {
  providers.unshift(
    CredentialsProvider({
      id: "dev-bypass",
      name: "Local Dev Access",
      credentials: {},
      async authorize() {
        const user = await ensureDevAuthUser();
        return {
          id: user.id,
          email: user.email,
          name: user.displayName || user.username || user.email,
          image: user.avatarUrl,
        };
      },
    })
  );
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const appleClientId = process.env.APPLE_CLIENT_ID;
const appleClientSecret = process.env.APPLE_CLIENT_SECRET;

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      // Callback URL is always `${NEXTAUTH_URL}/api/auth/callback/google` — must match
      // "Authorized redirect URIs" in Google Cloud Console (same origin as NEXTAUTH_URL).
    })
  );
}

if (appleClientId && appleClientSecret) {
  providers.push(
    AppleProvider({
      clientId: appleClientId,
      clientSecret: appleClientSecret,
    })
  );
}

const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
const spotifyClientSecret = process.env.SPOTIFY_CLIENT_SECRET;

if (spotifyClientId && spotifyClientSecret) {
  providers.push(
    SpotifyProvider({
      clientId: spotifyClientId,
      clientSecret: spotifyClientSecret,
      allowDangerousEmailAccountLinking: true,
    })
  );
}

const facebookClientId = process.env.FACEBOOK_CLIENT_ID;
const facebookClientSecret = process.env.FACEBOOK_CLIENT_SECRET;

if (facebookClientId && facebookClientSecret) {
  providers.push(
    FacebookProvider({
      clientId: facebookClientId,
      clientSecret: facebookClientSecret,
      // Callback URL: https://www.allfantasy.ai/api/auth/callback/facebook
      // Must be registered as a Valid OAuth Redirect URI in the Meta app dashboard.
      authorization: {
        url: "https://www.facebook.com/v17.0/dialog/oauth",
        params: {
          scope: "email,public_profile",
          // NOTE: auth_type=rerequest was removed. It triggered Facebook's GDPR
          // delegated-consent flow (flow=gdp, source=gdp_delegated) which issues an
          // authorization code WITHOUT the email scope even when the user has a
          // verified email and grants the permission on the consent screen. The
          // standard OAuth dialog (no auth_type override) correctly includes the
          // email scope in the returned access token.
        },
      },
      // openid-client's client.userinfo() does NOT forward `params` as URL query
      // parameters to the Facebook Graph API — Graph falls back to id,name only.
      // Use a direct fetch so ?fields= is explicitly included in the request.
      userinfo: {
        url: "https://graph.facebook.com/me",
        params: { fields: "id,name,email,picture" },
        async request({ tokens }: { tokens: { access_token?: string } }) {
          // Do NOT use URLSearchParams — it encodes commas as %2C.
          // Facebook Graph API treats "id%2Cname%2Cemail%2Cpicture" as a
          // single unknown field name and returns only the default {id, name};
          // email is never present in the response regardless of token scope.
          const graphUrl =
            `https://graph.facebook.com/me?fields=id,name,email,picture` +
            `&access_token=${encodeURIComponent(tokens.access_token ?? "")}`;
          const res = await fetch(graphUrl);
          const data = (await res.json()) as Record<string, unknown>;
          // Facebook Graph API can return HTTP 200 with an error body
          // (e.g. OAuthException code 190/466 — token was invalidated).
          // A plain `!res.ok` check misses this; inspect the body too.
          const fbError = (data as {
            error?: { message?: string; code?: number; error_subcode?: number }
          }).error;
          if (!res.ok || fbError) {
            const msg = fbError
              ? `Facebook Graph API OAuthException ${fbError.code ?? "?"}/${fbError.error_subcode ?? "?"}`
              : `Facebook Graph API HTTP ${res.status}`;
            console.error("[facebook-userinfo] error:", msg);
            throw new Error(msg);
          }
          console.log("[facebook-userinfo]", {
            hasId: !!data.id,
            hasEmail: !!data.email,
            hasPicture: !!data.picture,
            // responseKeys lets us see exactly which fields Facebook returned
            // so we can distinguish "email absent" vs "email present but falsy"
            responseKeys: Object.keys(data),
          });
          return data;
        },
      },
      // Safe profile mapper — picture is absent if user denied the permission.
      profile(profile: {
        id: string;
        name?: string;
        email?: string;
        picture?: { data?: { url?: string } };
      }) {
        return {
          id: profile.id,
          name: profile.name ?? null,
          email: profile.email ?? null,
          image: profile.picture?.data?.url ?? null,
        };
      },
    })
  );
}

// This app already has a separate Discord OAuth flow for account/bot integration
// (lib/discord/constants.ts, /api/auth/discord/callback, /api/discord/bot-callback)
// with its own registered redirect URIs. Deliberately NOT reusing that client id
// here — NextAuth login needs its own explicit DISCORD_CLIENT_ID/SECRET, and
// https://www.allfantasy.ai/api/auth/callback/discord (+ the localhost equivalent)
// must be added as an ADDITIONAL redirect URI on whichever Discord app is used for
// login, so the two flows never collide.
const discordClientId = process.env.DISCORD_CLIENT_ID;
const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;

if (discordClientId && discordClientSecret) {
  providers.push(
    DiscordProvider({
      clientId: discordClientId,
      clientSecret: discordClientSecret,
      // Default authorization scope is already "identify+email".
    })
  );
}

/** NextAuth reads `NEXTAUTH_URL` from the environment for OAuth redirects (set in Vercel to your canonical origin). */
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
  logger: {
    error(code, metadata) {
      const inner = (metadata as { error?: Error } | null | undefined)?.error
      console.error(
        `[nextauth-error] ${code}`,
        inner ? `${inner.name}: ${inner.message}` : JSON.stringify(metadata)
      )
    },
    warn(code) {
      console.warn(`[nextauth-warn] ${code}`)
    },
    debug() {/* suppress in prod */},
  },
  providers,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) {
        return true;
      }

      if (account.provider === "google" || account.provider === "apple" || account.provider === "spotify" || account.provider === "facebook" || account.provider === "discord") {
        const runSocialLink = async (): Promise<true> => {
          const oauthEmail = resolveOAuthEmailFromCallback(user, profile);
          if (oauthEmail) {
            user.email = oauthEmail;
          }

          // Facebook may not return an email if the user hasn't granted permission
          // or has no confirmed email on their account. Fail early with a clear error.
          if (account.provider === "facebook" && !oauthEmail) {
            throw new Error("FACEBOOK_EMAIL_MISSING");
          }

          // Discord accounts normally carry a verified email, but guard the same way
          // in case a user somehow reaches this callback without one.
          if (account.provider === "discord" && !oauthEmail) {
            throw new Error("DISCORD_EMAIL_MISSING");
          }

          const provider: "google" | "apple" | "spotify" | "facebook" | "discord" =
            account.provider === "google"
              ? "google"
              : account.provider === "apple"
                ? "apple"
                : account.provider === "facebook"
                  ? "facebook"
                  : account.provider === "discord"
                    ? "discord"
                    : "spotify";
          const linkedUser = await linkSocialAccountToAppUser({
            provider,
            providerAccountId: account.providerAccountId,
            type: account.type,
            email: oauthEmail ?? user.email,
            name: user.name,
            image: user.image,
            refreshToken: account.refresh_token,
            accessToken: account.access_token,
            expiresAt: account.expires_at,
            tokenType: account.token_type,
            scope: account.scope,
            idToken: account.id_token,
            sessionState:
              typeof account.session_state === "string" ? account.session_state : null,
          });

          (user as { id?: string }).id = linkedUser.id;
          user.email = linkedUser.email;
          user.name = linkedUser.displayName || linkedUser.username || linkedUser.email;
          user.image = linkedUser.avatarUrl;
          // Propagate DB username so the JWT callback can stamp token.username
          // (without this, token.username is always null for OAuth users)
          ;(user as { username?: string | null }).username = linkedUser.username ?? null

          return true;
        };

        if (account.provider === "google") {
          console.log("[google-signin] profile email:", profile?.email);
          try {
            return await runSocialLink();
          } catch (err) {
            console.error("[google-signin] FATAL:", err);
            return "/auth/error?error=SOCIAL_ACCOUNT_LINK_FAILED";
          }
        }

        if (account.provider === "facebook") {
          const _fbp = profile as Record<string, unknown> | null | undefined;
          console.log("[facebook-signin]", {
            provider: "facebook",
            hasId: !!_fbp?.id,
            hasEmail: !!_fbp?.email,
            hasPicture: !!_fbp?.picture,
            // grantedScope is what Facebook placed in the token response;
            // if email scope is absent here the token cannot access the email field
            grantedScope: account.scope ?? null,
          });
          try {
            return await runSocialLink();
          } catch (err) {
            console.error("[facebook-signin] FATAL:", err);
            const errMsg = err instanceof Error ? err.message : "";
            if (errMsg === "FACEBOOK_EMAIL_MISSING") {
              return "/auth/error?error=FACEBOOK_EMAIL_MISSING";
            }
            return "/auth/error?error=SOCIAL_ACCOUNT_LINK_FAILED";
          }
        }

        if (account.provider === "discord") {
          try {
            return await runSocialLink();
          } catch (err) {
            console.error("[discord-signin] FATAL:", err);
            const errMsg = err instanceof Error ? err.message : "";
            if (errMsg === "DISCORD_EMAIL_MISSING") {
              return "/auth/error?error=DISCORD_EMAIL_MISSING";
            }
            return "/auth/error?error=SOCIAL_ACCOUNT_LINK_FAILED";
          }
        }

        try {
          return await runSocialLink();
        } catch (error) {
          console.error("[auth] social account linking error:", error);
          return "/auth/error?error=SOCIAL_ACCOUNT_LINK_FAILED";
        }
      }

      return true;
    },
    async jwt({ token, user, trigger, session: updatePayload }) {
      try {
        // Handle useSession().update({ username }) from the choose-username flow.
        // This re-stamps the cookie so the middleware gate sees the new username
        // immediately — no sign-out/sign-in cycle required.
        if (trigger === "update") {
          const payload = updatePayload as Record<string, unknown> | null | undefined
          if (typeof payload?.username === "string") {
            token.username = payload.username || null
          } else if (token.id) {
            // Fallback: re-read from DB for stale tokens that had no username at login
            const fresh = await prisma.appUser
              .findUnique({
                where: { id: token.id as string },
                select: { username: true },
              })
              .catch(() => null)
            if (fresh?.username) token.username = fresh.username
          }
          return token
        }

        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.username = (user as { username?: string | null }).username ?? null;
          token.picture = user.image;
        }

        return token;
      } catch (err) {
        // Never let an exception here propagate — NextAuth catches any jwt callback
        // throw and re-raises it as OAuthCallbackError, breaking OAuth sign-in.
        console.error("[auth] jwt callback error:", err)
        return token
      }
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.name =
          typeof token.name === "string" ? token.name : session.user.name;
        session.user.username =
          typeof token.username === "string" ? token.username : null;
        session.user.image =
          typeof token.picture === "string" ? token.picture : session.user.image;

        const userId = typeof token.id === "string" ? token.id : undefined;
        if (userId) {
          session.user.id = userId;
        }

        let spotifyLinked = false;
        if (userId && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
          try {
            const spotify = await prisma.authAccount.findFirst({
              where: { userId, provider: "spotify" },
              select: { id: true },
            });
            spotifyLinked = Boolean(spotify?.id);
            if (!spotifyLinked) {
              const profileSpotify = await prisma.userProfile.findUnique({
                where: { userId },
                select: { spotifyConnectedAt: true },
              });
              spotifyLinked = Boolean(profileSpotify?.spotifyConnectedAt);
            }
          } catch {
            spotifyLinked = false;
          }
        }
        session.user.spotifyAccount = spotifyLinked;
      }

      return session;
    },
    /**
     * After OAuth (e.g. Google), always land on the app dashboard so users are not
     * dropped back on `/login` when `url` resolves incorrectly for the deployment.
     * (NEXTAUTH_URL must match the site origin for OAuth callbacks.)
     */
    async redirect({ url, baseUrl }) {
      const base = baseUrl.replace(/\/$/, "");
      if (!url) {
        return `${base}/dashboard`;
      }

      // Extract pathname + query from full URLs (handles www vs non-www mismatches).
      let pathAndQuery = "/";
      try {
        const parsed = new URL(url, base);
        pathAndQuery = parsed.pathname + parsed.search;
      } catch {
        pathAndQuery = url.startsWith("/") ? url : `/${url}`;
      }

      pathAndQuery = canonicalizeProductRoute(pathAndQuery);

      // After OAuth, NextAuth may resolve `callbackUrl` to `/login` or `/`; send users into the app.
      const pathname = pathAndQuery.split("?")[0] || "/";
      if (isPostOAuthRedirectPreservedPath(pathname)) {
        return `${base}${pathAndQuery}`;
      }
      if (pathname === "/login" || pathname === "/") {
        return `${base}/dashboard`;
      }

      return `${base}${pathAndQuery}`;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id) return;

      try {
        await ensureSharedAccountProfile({
          userId: user.id,
          displayName: user.name ?? null,
        });
      } catch (error) {
        console.error("[auth] signIn event error:", error);
      }
    },
  },
};