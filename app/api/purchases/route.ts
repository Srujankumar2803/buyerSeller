import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all orders for the current user
    const orders = await prisma.order.findMany({
      where: {
        buyerId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get listing details for each order
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const listing = await prisma.listing.findUnique({
          where: { id: order.listingId },
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          },
        });

        return {
          ...order,
          listing,
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithDetails,
    });
  } catch (error) {
    console.error("Error fetching purchase history:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase history" },
      { status: 500 }
    );
  }
}