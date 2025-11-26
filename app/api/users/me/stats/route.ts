import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/users/me/stats - Get current user's statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Get counts in parallel
    const [listingsCount, favoritesCount] = await Promise.all([
      prisma.listing.count({
        where: {
          ownerId: userId,
          isActive: true,
        },
      }),
      prisma.favorite.count({
        where: {
          userId,
        },
      }),
    ]);

    // For now, conversationsCount is 0 (can be implemented later)
    const conversationsCount = 0;

    return NextResponse.json({
      listingsCount,
      favoritesCount,
      conversationsCount,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
