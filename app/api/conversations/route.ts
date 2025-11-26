import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET /api/conversations - List all conversations for current user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        listing: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            images: {
              take: 1,
              select: {
                id: true,
                filename: true,
              },
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST /api/conversations - Create or get existing conversation
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listingId } = await req.json();

    if (!listingId) {
      return NextResponse.json(
        { error: "listingId is required" },
        { status: 400 }
      );
    }

    // Get the listing with owner info
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        owner: {
          select: {
            id: true,
            role: true,
          },
        },
      },
    });

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    // Prevent seller from messaging themselves
    if (listing.ownerId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot start a conversation with your own listing" },
        { status: 403 }
      );
    }

    // Check if conversation already exists between these users for this listing
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        listingId: listingId,
        participants: {
          every: {
            userId: {
              in: [session.user.id, listing.ownerId],
            },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    // Check if conversation has both participants
    if (
      existingConversation &&
      existingConversation.participants.length === 2
    ) {
      return NextResponse.json({
        conversation: existingConversation,
        isNew: false,
      });
    }

    // Create new conversation with both participants
    const conversation = await prisma.conversation.create({
      data: {
        listingId: listingId,
        participants: {
          create: [
            { userId: session.user.id },
            { userId: listing.ownerId },
          ],
        },
      },
      include: {
        listing: {
          include: {
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            images: {
              take: 1,
            },
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ conversation, isNew: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Failed to create conversation" },
      { status: 500 }
    );
  }
}
