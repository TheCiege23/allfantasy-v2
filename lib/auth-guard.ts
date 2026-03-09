import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface VerifiedUserProfile {
  userId: string;
  displayName: string | null;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  emailVerifiedAt: Date | null;
  ageConfirmedAt: Date | null;
  profileComplete: boolean;
}

type SessionUser = {
  id?: string;
  email?: string | null;
};

type SessionResult = {
  user?: SessionUser;
} | null;

export function isUserVerified(
  emailVerified: Date | null | undefined,
  phoneVerifiedAt: Date | null | undefined
): boolean {
  return Boolean(emailVerified || phoneVerifiedAt);
}

export function isAgeConfirmed(profile: VerifiedUserProfile | null): boolean {
  return Boolean(profile?.ageConfirmedAt);
}

export function isFullyOnboarded(
  emailVerified: Date | null | undefined,
  profile: VerifiedUserProfile | null
): boolean {
  if (!profile) return false;

  return (
    isUserVerified(emailVerified, profile.phoneVerifiedAt) &&
    isAgeConfirmed(profile) &&
    profile.profileComplete
  );
}

async function getAuthenticatedSession(): Promise<SessionResult> {
  return (await getServerSession(authOptions)) as SessionResult;
}

async function getOrCreateUserProfile(
  userId: string
): Promise<VerifiedUserProfile | null> {
  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
      select: {
        userId: true,
        displayName: true,
        phone: true,
        phoneVerifiedAt: true,
        emailVerifiedAt: true,
        ageConfirmedAt: true,
        profileComplete: true,
      },
    });

    return profile;
  } catch (error) {
    console.error("[auth-guard] Failed to get or create user profile:", error);
    return null;
  }
}

async function getUserEmailVerification(userId: string): Promise<Date | null> {
  try {
    const user = await prisma.appUser.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    });

    return user?.emailVerified ?? null;
  } catch (error) {
    console.error("[auth-guard] Failed to fetch app user verification:", error);
    return null;
  }
}

export async function getSessionAndProfile(): Promise<{
  userId: string | null;
  email: string | null;
  emailVerified: Date | null;
  profile: VerifiedUserProfile | null;
}> {
  const session = await getAuthenticatedSession();
  const userId = session?.user?.id ?? null;
  const email = session?.user?.email ?? null;

  if (!userId) {
    return {
      userId: null,
      email: null,
      emailVerified: null,
      profile: null,
    };
  }

  const [emailVerified, profile] = await Promise.all([
    getUserEmailVerification(userId),
    getOrCreateUserProfile(userId),
  ]);

  return {
    userId,
    email,
    emailVerified,
    profile,
  };
}

export async function requireVerifiedUser(): Promise<
  | { ok: true; userId: string; profile: VerifiedUserProfile }
  | { ok: false; response: NextResponse }
> {
  const session = await getAuthenticatedSession();
  const userId = session?.user?.id ?? null;

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 }
      ),
    };
  }

  const [emailVerified, profile] = await Promise.all([
    getUserEmailVerification(userId),
    getOrCreateUserProfile(userId),
  ]);

  if (!profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "INTERNAL_ERROR" },
        { status: 500 }
      ),
    };
  }

  if (!isAgeConfirmed(profile)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "AGE_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  if (!isUserVerified(emailVerified, profile.phoneVerifiedAt)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "VERIFICATION_REQUIRED" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    userId,
    profile,
  };
}