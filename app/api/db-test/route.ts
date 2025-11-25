import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Fetch a sample of listings with their images and owner info
    const listings = await prisma.listing.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        images: {
          take: 1,
          select: {
            id: true,
            filename: true,
            mime: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarImage: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      count: listings.length,
      listings: listings.map(listing => ({
        ...listing,
        imageId: listing.images[0]?.id,
        images: undefined, // Remove the full images array from response
      })),
    });
  } catch (error) {
    console.error('DB test error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch listings',
        details: error instanceof Error ? error.message : 'Unknown error',
        listings: [],
      },
      { status: 500 }
    );
  }
}
