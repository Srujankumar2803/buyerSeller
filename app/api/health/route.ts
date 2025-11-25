import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const usersCount = await prisma.user.count();
    const listingsCount = await prisma.listing.count();
    const imagesCount = await prisma.image.count();

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        usersCount,
        listingsCount,
        imagesCount,
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'Database connection failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
