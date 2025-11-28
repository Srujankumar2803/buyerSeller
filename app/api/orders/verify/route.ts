import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const CASHFREE_BASE_URL = "https://api.cashfree.com/pg";
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID!;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, cashfreeOrderId } = await request.json();

    if (!orderId || !cashfreeOrderId) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Verify payment status with Cashfree
    const statusResponse = await fetch(`${CASHFREE_BASE_URL}/orders/${cashfreeOrderId}`, {
      method: "GET",
      headers: {
        "x-client-id": CASHFREE_APP_ID,
        "x-client-secret": CASHFREE_SECRET_KEY,
        "x-api-version": "2023-08-01",
      },
    });

    const paymentStatus = await statusResponse.json();

    if (!statusResponse.ok) {
      return NextResponse.json(
        { error: "Failed to verify payment status" },
        { status: 400 }
      );
    }

    // Check payment status
    if (paymentStatus.order_status === "PAID") {
      // Payment is valid - update order
      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "paid",
          razorpayPaymentId: paymentStatus.cf_order_id || cashfreeOrderId,
        },
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        message: "Payment verified successfully",
      });
    } else {
      // Update order status to failed
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: "failed",
          razorpayPaymentId: cashfreeOrderId,
        },
      });

      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}
