import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/listings/[id] - Fetch single listing with images
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        images: {
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
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(listing);
  } catch (error) {
    console.error("Error fetching listing:", error);
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 }
    );
  }
}

// PUT /api/listings/[id] - Update listing (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if listing exists and user is owner
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (existingListing.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own listings" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      price,
      category,
      city,
      lat,
      lng,
      isActive,
      deleteImageIds,
    } = body;

    // Build update data
    const updateData: {
      title?: string;
      description?: string;
      price?: number;
      category?: string;
      city?: string;
      lat?: number | null;
      lng?: number | null;
      isActive?: boolean;
    } = {};

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (category !== undefined) updateData.category = category;
    if (city !== undefined) updateData.city = city;
    if (lat !== undefined) updateData.lat = lat ? parseFloat(lat) : null;
    if (lng !== undefined) updateData.lng = lng ? parseFloat(lng) : null;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update listing and delete specified images in transaction
    const listing = await prisma.$transaction(async (tx: typeof prisma) => {
      // Delete specified images
      if (deleteImageIds && Array.isArray(deleteImageIds) && deleteImageIds.length > 0) {
        await tx.image.deleteMany({
          where: {
            id: { in: deleteImageIds },
            listingId: id,
          },
        });
      }

      // Update the listing
      const updated = await tx.listing.update({
        where: { id },
        data: updateData,
        include: {
          images: {
            select: {
              id: true,
              filename: true,
              mime: true,
            },
          },
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      listing,
    });
  } catch (error) {
    console.error("Error updating listing:", error);
    return NextResponse.json(
      { error: "Failed to update listing" },
      { status: 500 }
    );
  }
}

// DELETE /api/listings/[id] - Delete listing (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if listing exists and user is owner
    const existingListing = await prisma.listing.findUnique({
      where: { id },
    });

    if (!existingListing) {
      return NextResponse.json(
        { error: "Listing not found" },
        { status: 404 }
      );
    }

    if (existingListing.ownerId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own listings" },
        { status: 403 }
      );
    }

    // Delete listing (images will be cascade deleted if configured)
    await prisma.listing.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting listing:", error);
    return NextResponse.json(
      { error: "Failed to delete listing" },
      { status: 500 }
    );
  }
}
