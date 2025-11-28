import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, approve } = await request.json();

    if (!orderId || typeof approve !== "boolean") {
      return NextResponse.json(
        { error: "Order ID and approval status are required" },
        { status: 400 }
      );
    }

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify the seller
    if (order.sellerId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to verify this order" },
        { status: 403 }
      );
    }

    // Only allow verification of pending orders
    if (order.status !== "verification_pending") {
      return NextResponse.json(
        { error: "Order is not pending verification" },
        { status: 400 }
      );
    }

    // Update order status based on approval
    const newStatus = approve ? "completed" : "failed";
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: approve 
        ? "Payment verified and order completed successfully!"
        : "Payment rejected. Order marked as failed.",
    });
  } catch (error) {
    console.error("Error processing payment verification:", error);
    return NextResponse.json(
      { error: "Failed to process payment verification" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch orders pending verification (for sellers)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get orders pending verification for this seller
    const pendingOrders = await prisma.order.findMany({
      where: {
        sellerId: session.user.id,
        status: "verification_pending",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get listing details for each order
    const ordersWithDetails = await Promise.all(
      pendingOrders.map(async (order) => {
        const listing = await prisma.listing.findUnique({
          where: { id: order.listingId },
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          },
        });

        // Get buyer details
        const buyer = await prisma.user.findUnique({
          where: { id: order.buyerId },
          select: {
            name: true,
            email: true,
          },
        });

        return {
          ...order,
          listing,
          buyer,
        };
      })
    );

    return NextResponse.json({
      success: true,
      orders: ordersWithDetails,
    });
  } catch (error) {
    console.error("Error fetching pending orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch pending orders" },
      { status: 500 }
    );
  }
}