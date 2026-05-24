/**
 * app/api/commissioner/leagues/[leagueId]/league-settings/route.ts
 * Global league settings endpoint (GET/PUT)
 * Returns complete settings profile for display/edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { EntitlementResolver } from '@/lib/subscription/EntitlementResolver';
import { isActiveOrGraceStatus } from '@/lib/subscription/feature-access';
import {
  UnifiedLeagueSettingsService,
  LeagueSettingsPermissionsService,
} from '@/lib/league-settings-engine';
import type {
  GetLeagueSettingsResponse,
  UpdateLeagueSettingsRequest,
  UpdateLeagueSettingsResponse,
} from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { leagueId: string } }): Promise<NextResponse> {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string; email?: string | null }
    } | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leagueId = params.leagueId;
    const userId = session.user.id;

    const [league, coOwnerTeams] = await Promise.all([
      prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } }),
      prisma.leagueTeam.findMany({
        where: { leagueId, isCoCommissioner: true },
        select: { claimedByUserId: true },
      }),
    ])

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const coOwnerIds = coOwnerTeams
      .map((t) => t.claimedByUserId)
      .filter((id): id is string => id !== null)

    const entitlementSnapshot = await new EntitlementResolver().resolveSnapshot(userId, session.user.email)
    const isPremiumSubscriber = isActiveOrGraceStatus(entitlementSnapshot.status)

    const userPermissions = LeagueSettingsPermissionsService.checkUserPermissions(
      userId,
      leagueId,
      league.userId,
      coOwnerIds,
      isPremiumSubscriber,
    );

    const settings = await UnifiedLeagueSettingsService.getLeagueSettings(leagueId);

    const response: GetLeagueSettingsResponse = {
      leagueId,
      settings,
      canEdit: userPermissions.isCommissioner,
      userRole: userPermissions.role,
      userPermissions,
      validationWarnings: [],
      subscriptionStatus: {
        isPremium: isPremiumSubscriber,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /league-settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { leagueId: string } }): Promise<NextResponse> {
  try {
    const session = (await getServerSession(authOptions as never)) as {
      user?: { id?: string; email?: string | null }
    } | null

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leagueId = params.leagueId;
    const userId = session.user.id;
    const body: UpdateLeagueSettingsRequest = await req.json();

    const [league, coOwnerTeams] = await Promise.all([
      prisma.league.findUnique({ where: { id: leagueId }, select: { userId: true } }),
      prisma.leagueTeam.findMany({
        where: { leagueId, isCoCommissioner: true },
        select: { claimedByUserId: true },
      }),
    ])

    if (!league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 });
    }

    const coOwnerIds = coOwnerTeams
      .map((t) => t.claimedByUserId)
      .filter((id): id is string => id !== null)

    const entitlementSnapshot = await new EntitlementResolver().resolveSnapshot(userId, session.user.email)
    const isPremiumSubscriber = isActiveOrGraceStatus(entitlementSnapshot.status)

    const userPermissions = LeagueSettingsPermissionsService.checkUserPermissions(
      userId,
      leagueId,
      league.userId,
      coOwnerIds,
      isPremiumSubscriber,
    );

    const result = await UnifiedLeagueSettingsService.updateLeagueSettings(
      leagueId,
      body.page,
      body.data,
      userId,
      userPermissions,
      { validateOnly: body.validateOnly },
    );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          validation: result.validation,
          message: result.error,
        },
        { status: 400 },
      );
    }

    const response: UpdateLeagueSettingsResponse = {
      success: true,
      settings: result.settings,
      validation: result.validation,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[PUT /league-settings]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
