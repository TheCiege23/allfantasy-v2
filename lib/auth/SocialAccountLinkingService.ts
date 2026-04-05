import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { ensureSharedAccountProfile } from "@/lib/auth/SharedAccountBootstrapService";
import { hasProfanityInUsername } from "@/lib/signup/UsernameProfanityGuard";
import { getTierFromXP, getXPRemainingToNextTier } from "@/lib/xp-progression/TierResolver";

const OAUTH_PLACEHOLDER_BCRYPT_ROUNDS = 10;

/** Unusable for credentials login; satisfies any code paths that expect a set password hash. */
async function hashOAuthOnlyPlaceholder(): Promise<string> {
  return bcrypt.hash(randomBytes(32).toString("hex"), OAUTH_PLACEHOLDER_BCRYPT_ROUNDS);
}

export type SocialAccountProvider = "google" | "apple";

type LinkedSocialAuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: Date | null;
};

type LinkSocialAccountInput = {
  provider: SocialAccountProvider;
  providerAccountId: string;
  type?: string | null;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  refreshToken?: string | null;
  accessToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
  scope?: string | null;
  idToken?: string | null;
  sessionState?: string | null;
};

function normalizeEmailAddress(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueConstraintError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

function sanitizeUsernameFragment(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildUsernameBase(email: string, name?: string | null): string {
  const emailLocalPart = sanitizeUsernameFragment(email.split("@")[0] ?? "");
  const preferred = sanitizeUsernameFragment(name);
  const candidate = preferred.length >= 3 ? preferred : emailLocalPart;
  const safeCandidate = candidate.length >= 3 ? candidate : "user";
  const truncated = safeCandidate.slice(0, 24);

  if (hasProfanityInUsername(truncated)) {
    return "user";
  }

  return truncated;
}

async function reserveUniqueUsername(base: string): Promise<string> {
  const normalizedBase = sanitizeUsernameFragment(base) || "user";
  const initial = normalizedBase.slice(0, 30);

  if (initial.length >= 3 && !hasProfanityInUsername(initial)) {
    const existing = await prisma.appUser.findFirst({
      where: { username: initial },
      select: { id: true },
    });
    if (!existing) {
      return initial;
    }
  }

  for (let attempt = 1; attempt <= 500; attempt += 1) {
    const suffix = `_${attempt}`;
    const stem = normalizedBase.slice(0, Math.max(3, 30 - suffix.length));
    const candidate = `${stem}${suffix}`;
    if (candidate.length < 3 || hasProfanityInUsername(candidate)) {
      continue;
    }
    const existing = await prisma.appUser.findFirst({
      where: { username: candidate },
      select: { id: true },
    });
    if (!existing) {
      return candidate;
    }
  }

  return `user_${Date.now().toString().slice(-6)}`;
}

async function ensureXpProfile(userId: string): Promise<void> {
  await prisma.managerXPProfile.upsert({
    where: { managerId: userId },
    create: {
      managerId: userId,
      totalXP: 0,
      currentTier: getTierFromXP(0),
      xpToNextTier: getXPRemainingToNextTier(0),
    },
    update: {},
  });
}

export async function linkSocialAccountToAppUser(
  input: LinkSocialAccountInput
): Promise<LinkedSocialAuthUser> {
  const providerAccountId = input.providerAccountId.trim();
  if (!providerAccountId) {
    throw new Error("SOCIAL_PROVIDER_ACCOUNT_MISSING");
  }

  const normalizedEmail =
    typeof input.email === "string" && input.email.trim().includes("@")
      ? normalizeEmailAddress(input.email)
      : null;

  const existingAccount = await prisma.authAccount.findFirst({
    where: {
      provider: input.provider,
      providerAccountId,
    },
    select: {
      id: true,
      userId: true,
    },
  });

  let user =
    existingAccount?.userId
      ? await prisma.appUser.findUnique({
          where: { id: existingAccount.userId },
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            emailVerified: true,
          },
        })
      : null;

  if (!user && normalizedEmail) {
    user = await prisma.appUser.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });
  }

  if (!user && !normalizedEmail) {
    throw new Error("SOCIAL_PROVIDER_EMAIL_MISSING");
  }

  if (!user && normalizedEmail) {
    const displayNameBase = input.name?.trim() || "";
    const select = {
      id: true,
      email: true,
      username: true,
      displayName: true,
      avatarUrl: true,
      emailVerified: true,
    } as const;

    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts && !user; attempt += 1) {
      const username = await reserveUniqueUsername(
        attempt === 1
          ? buildUsernameBase(normalizedEmail, input.name)
          : `${buildUsernameBase(normalizedEmail, input.name)}_${attempt}`
      );
      const passwordHash = await hashOAuthOnlyPlaceholder();

      try {
        user = await prisma.appUser.create({
          data: {
            email: normalizedEmail,
            username,
            displayName: displayNameBase || username,
            avatarUrl: input.image?.trim() || null,
            emailVerified: new Date(),
            passwordHash,
          },
          select,
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        user = await prisma.appUser.findFirst({
          where: {
            email: { equals: normalizedEmail, mode: "insensitive" },
          },
          select,
        });

        if (!user) {
          // Likely a rare username race: retry with a different reserved username.
          continue;
        }
      }
    }
  }

  const userUpdates: {
    email?: string;
    displayName?: string;
    avatarUrl?: string | null;
    emailVerified?: Date;
  } = {};

  if (user && normalizedEmail && user.email.toLowerCase() !== normalizedEmail) {
    const conflictingEmailOwner = await prisma.appUser.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: "insensitive" },
        NOT: { id: user.id },
      },
      select: { id: true },
    });

    if (!conflictingEmailOwner) {
      userUpdates.email = normalizedEmail;
    }
  }

  if (user && !user.emailVerified && normalizedEmail) {
    userUpdates.emailVerified = new Date();
  }

  if (user && !user.displayName && input.name?.trim()) {
    userUpdates.displayName = input.name.trim();
  }

  if (user && !user.avatarUrl && input.image?.trim()) {
    userUpdates.avatarUrl = input.image.trim();
  }

  if (user && Object.keys(userUpdates).length > 0) {
    user = await prisma.appUser.update({
      where: { id: user.id },
      data: userUpdates,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        emailVerified: true,
      },
    });
  }

  if (!user) {
    throw new Error("SOCIAL_ACCOUNT_LINK_FAILED");
  }

  const accountPayload = {
    userId: user.id,
    type: input.type?.trim() || "oauth",
    provider: input.provider,
    providerAccountId,
    refresh_token: input.refreshToken?.trim() || null,
    access_token: input.accessToken?.trim() || null,
    expires_at: typeof input.expiresAt === "number" ? input.expiresAt : null,
    token_type: input.tokenType?.trim() || null,
    scope: input.scope?.trim() || null,
    id_token: input.idToken?.trim() || null,
    session_state: input.sessionState?.trim() || null,
  };

  if (existingAccount?.id) {
    await prisma.authAccount.update({
      where: { id: existingAccount.id },
      data: accountPayload,
    });
  } else {
    try {
      await prisma.authAccount.create({
        data: accountPayload,
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }

      const concurrentAccount = await prisma.authAccount.findFirst({
        where: {
          provider: input.provider,
          providerAccountId,
        },
        select: { id: true },
      });

      if (!concurrentAccount) {
        throw error;
      }

      await prisma.authAccount.update({
        where: { id: concurrentAccount.id },
        data: accountPayload,
      });
    }
  }

  await ensureSharedAccountProfile({
    userId: user.id,
    displayName: user.displayName,
  });
  await ensureXpProfile(user.id);

  return user;
}
