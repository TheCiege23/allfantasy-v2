import { getServerSession } from 'next-auth';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

function isFavoritesTableMissing(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2021') return true;
    const msg = String(error.message || '').toLowerCase();
    if (msg.includes('user_music_favorites') && msg.includes('does not exist')) return true;
  }
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const favorites = await prisma.userMusicFavorite.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        trackId: true,
        trackName: true,
        artistName: true,
        trackImage: true,
        createdAt: true,
      },
    });

    const mapped = favorites.map((fav) => ({
      id: fav.trackId,
      name: fav.trackName,
      artist: fav.artistName,
      image: fav.trackImage,
      addedAt: fav.createdAt.toLocaleDateString(),
    }));

    return new Response(JSON.stringify({ favorites: mapped }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (isFavoritesTableMissing(error)) {
      return new Response(JSON.stringify({ favorites: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    console.error('Error fetching favorites:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch favorites',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { trackId, name, artist, image } = await request.json();

    if (!trackId || !name || !artist) {
      return new Response(
        JSON.stringify({ error: 'trackId, name, and artist are required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const favorite = await prisma.userMusicFavorite.create({
      data: {
        userId: session.user.id,
        trackId,
        trackName: name,
        artistName: artist,
        trackImage: image || null,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        favorite: {
          id: favorite.trackId,
          name: favorite.trackName,
          artist: favorite.artistName,
          image: favorite.trackImage,
        },
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    if (isFavoritesTableMissing(error)) {
      return new Response(
        JSON.stringify({
          error: 'Favorites storage is not ready',
          code: 'MIGRATION_PENDING',
          message: 'Run: npx prisma migrate deploy (or migrate dev) to add user_music_favorites.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.error('Error adding favorite:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to add favorite',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { trackId } = await request.json();

    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await prisma.userMusicFavorite.deleteMany({
      where: {
        userId: session.user.id,
        trackId,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Favorite removed',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    if (isFavoritesTableMissing(error)) {
      return new Response(
        JSON.stringify({
          error: 'Favorites storage is not ready',
          code: 'MIGRATION_PENDING',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    console.error('Error removing favorite:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to remove favorite',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
