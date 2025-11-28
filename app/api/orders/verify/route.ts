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

    const { orderId, transactionId, paymentScreenshot } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
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

    // Verify the buyer
    if (order.buyerId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized to verify this order" },
        { status: 403 }
      );
    }

    // For UPI payments, mark as verification pending (manual verification by seller)
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: "verification_pending", // Will be manually verified by seller
        razorpayPaymentId: transactionId || `upi_${Date.now()}`,
      },
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: "Payment submitted for verification. Seller will confirm receipt.",
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
