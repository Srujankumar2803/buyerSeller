import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get order from database
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: {
          select: {
            title: true,
            price: true,
            images: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify the buyer
    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to check this order" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        createdAt: order.createdAt,
        listing: order.listing,
      },
    });
  } catch (error) {
    console.error("Error checking order status:", error);
    return NextResponse.json(
      { error: "Failed to check order status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // This endpoint will be called when user confirms they made the payment
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "verification_pending",
        razorpayPaymentId: `upi_confirmed_${Date.now()}`,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Payment confirmation received. Please wait for seller verification.",
    });
  } catch (error) {
    console.error("Error confirming payment:", error);
    return NextResponse.json(
      { error: "Failed to confirm payment" },
      { status: 500 }
    );
  }
}