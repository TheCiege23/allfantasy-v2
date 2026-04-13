/**
 * app/api/commissioner/leagues/[leagueId]/league-settings/route.ts
 * Global league settings endpoint (GET/PUT)
 * Returns complete settings profile for display/edit
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import {
  UnifiedLeagueSettingsService,
  LeagueSettingsPermissionsService,
} from '@/lib/league-settings-engine';
import type {
  GetLeagueSettingsResponse,
  UpdateLeagueSettingsRequest,
  UpdateLeagueSettingsResponse,
} from '@/lib/league-settings-engine/LeagueSettingsEngineTypes';

// TODO: Implement actual database calls via Prisma
// This is a skeleton implementation

export async function GET(req: NextRequest, { params }: { params: { leagueId: string } }): Promise<NextResponse> {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leagueId = params.leagueId;
    const userId = session.user.id;

    // TODO: Fetch from DB
    // const league = await prisma.league.findUnique({
    //   where: { id: leagueId },
    //   include: { settings: true, coOwners: true, members: true, subscription: true },
    // });

    // if (!league) {
    //   return NextResponse.json({ error: 'League not found' }, { status: 404 });
    // }

    // Get user permissions
    const userPermissions = LeagueSettingsPermissionsService.checkUserPermissions(
      userId,
      leagueId,
      'commissionerId' /* TODO: get from league */,
      [] /* TODO: get coOwnerIds from league */,
      false /* TODO: check subscription */,
    );

    // Get settings
    const settings = await UnifiedLeagueSettingsService.getLeagueSettings(leagueId);

    // Build response
    const response: GetLeagueSettingsResponse = {
      leagueId,
      settings,
      canEdit: userPermissions.isCommissioner,
      userRole: userPermissions.role,
      userPermissions,
      validationWarnings: [],
      subscriptionStatus: {
        isPremium: false, // TODO: check actual subscription
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
    const session = await getServerSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const leagueId = params.leagueId;
    const userId = session.user.id;
    const body: UpdateLeagueSettingsRequest = await req.json();

    // Get user permissions
    const userPermissions = LeagueSettingsPermissionsService.checkUserPermissions(
      userId,
      leagueId,
      'commissionerId' /* TODO */,
      [] /* TODO */,
      false /* TODO */,
    );

    // Update settings
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
