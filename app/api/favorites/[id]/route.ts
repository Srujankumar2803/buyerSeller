import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// DELETE /api/favorites/[id] - Remove favorite by id or listingId
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = params;
    const { searchParams } = new URL(request.url);
    const listingId = searchParams.get("listingId");

    let favorite;

    // If listingId is provided in query params, delete by listingId
    if (listingId) {
      favorite = await prisma.favorite.findUnique({
        where: {
          userId_listingId: {
            userId: session.user.id,
            listingId,
          },
        },
      });

      if (!favorite) {
        return NextResponse.json(
          { error: "Favorite not found" },
          { status: 404 }
        );
      }

      await prisma.favorite.delete({
        where: {
          userId_listingId: {
            userId: session.user.id,
            listingId,
          },
        },
      });
    } else {
      // Delete by favorite id
      favorite = await prisma.favorite.findUnique({
        where: { id },
      });

      if (!favorite) {
        return NextResponse.json(
          { error: "Favorite not found" },
          { status: 404 }
        );
      }

      // Ensure the favorite belongs to the current user
      if (favorite.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        );
      }

      await prisma.favorite.delete({
        where: { id },
      });
    }

    return NextResponse.json({ message: "Favorite removed successfully" });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return NextResponse.json(
      { error: "Failed to delete favorite" },
      { status: 500 }
    );
  }
}
